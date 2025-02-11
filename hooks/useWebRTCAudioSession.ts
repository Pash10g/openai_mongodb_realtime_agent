"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type React from "react"
import type { Tool } from "@/lib/tools"

interface Conversation {
  id: string
  role: "user" | "assistant"
  text: string
  timestamp: string
}

interface UseWebRTCAudioSessionReturn {
  status: string
  isSessionActive: boolean
  audioIndicatorRef: React.RefObject<HTMLDivElement | null>
  startSession: () => Promise<void>
  stopSession: () => void
  handleStartStopClick: () => void
  registerFunction: (name: string, fn: Function) => void
  currentVolume: number
  conversation: Conversation[]
  error: string | null
}

const RECONNECT_DELAY = 2000 // 2 seconds
const MAX_RECONNECT_ATTEMPTS = 3

export default function useWebRTCAudioSession(voice: string, tools: Tool[]): UseWebRTCAudioSessionReturn {
  const [status, setStatus] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const audioIndicatorRef = useRef<HTMLDivElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const [conversation, setConversation] = useState<Conversation[]>([])
  const functionRegistry = useRef<Record<string, Function>>({})
  const [currentVolume, setCurrentVolume] = useState(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeIntervalRef = useRef<number | null>(null)

  const cleanup = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
      dataChannelRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop())
      audioStreamRef.current = null
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current)
      volumeIntervalRef.current = null
    }
    analyserRef.current = null
  }, [])

  const handleError = useCallback(
    (error: Error, context: string) => {
      console.error(`Error in ${context}:`, error)
      setError(error.message)
      setStatus("Error occurred")
      cleanup()
      setIsSessionActive(false)
    },
    [cleanup],
  )

  const handleConnectionStateChange = useCallback(() => {
    if (!peerConnectionRef.current) return

    const state = peerConnectionRef.current.connectionState
    console.log("Connection state changed:", state)

    switch (state) {
      case "connected":
        setStatus("Connected")
        break
      case "disconnected":
      case "failed":
        setStatus("Connection lost")
        break
      case "closed":
        setStatus("Session ended")
        cleanup()
        break
    }
  }, [cleanup])

  async function getSessionData() {
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error(`Failed to get session data: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      return data
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)), "getSessionData")
      throw err
    }
  }

  const startSession = useCallback(async () => {
    try {
      // Clear previous conversation when starting a new session
      setConversation([])
      cleanup() // Clean up any existing session
      setError(null)
      setStatus("Requesting microphone access...")

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      audioStreamRef.current = stream

      setStatus("Fetching session data...")
      const sessionData = await getSessionData()

      setStatus("Establishing connection...")
      const pc = new RTCPeerConnection({
        iceServers: sessionData.ice_servers || [],
        iceCandidatePoolSize: 10,
      })

      peerConnectionRef.current = pc
      pc.onconnectionstatechange = handleConnectionStateChange
      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState)
      }

      // Add error handlers
      pc.onicecandidateerror = (event) => {
        console.error("ICE candidate error:", event)
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          console.log("ICE connection failed, attempting restart...")
          pc.restartIce()
        }
      }

      const audioEl = document.createElement("audio")
      audioEl.autoplay = true

      pc.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind)
        audioEl.srcObject = event.streams[0]
        audioEl.play().catch((e) => console.error("Error playing audio:", e))

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const source = audioCtx.createMediaStreamSource(event.streams[0])
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser

        volumeIntervalRef.current = window.setInterval(() => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
            analyserRef.current.getByteTimeDomainData(dataArray)
            const volume = Math.sqrt(
              dataArray.reduce((acc, val) => acc + Math.pow((val - 128) / 128, 2), 0) / dataArray.length,
            )
            setCurrentVolume(volume)
          }
        }, 100)
      }

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      const dataChannel = pc.createDataChannel("oai-events", {
        ordered: true,
      })
      dataChannelRef.current = dataChannel

      dataChannel.onopen = () => {
        console.log("Data channel opened")
        setStatus("Connected")
        dataChannel.send(
          JSON.stringify({
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              tools: tools || [],
              input_audio_transcription: {
                model: "whisper-1",
              },
            },
          }),
        )
      }

      dataChannel.onclose = () => {
        console.log("Data channel closed")
      }

      dataChannel.onerror = (error) => {
        console.error("Data channel error:", error)
        handleError(new Error("Data channel error"), "dataChannel")
      }
      dataChannel.onmessage = handleDataChannelMessage

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.client_secret.value}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      })

      if (!sdpResponse.ok) {
        throw new Error(`Failed to send offer: ${sdpResponse.status}`)
      }

      const answer = {
        type: "answer",
        sdp: await sdpResponse.text(),
      }
      await pc.setRemoteDescription(answer)

      setIsSessionActive(true)
      setStatus("Session established")
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(String(err)), "startSession")
    }
  }, [cleanup, handleConnectionStateChange, handleError, tools]) //getSessionData removed from dependencies

  const stopSession = useCallback(() => {
    setStatus("Stopping session...")
    cleanup()
    setIsSessionActive(false)
    setStatus("Session stopped")
    // Remove this line
    // setConversation([])
    setError(null)
  }, [cleanup])

  const handleStartStopClick = useCallback(() => {
    if (isSessionActive) {
      stopSession()
    } else {
      startSession()
    }
  }, [isSessionActive, startSession, stopSession])

  function registerFunction(name: string, fn: Function) {
    functionRegistry.current[name] = fn
  }

  async function handleDataChannelMessage(event: MessageEvent) {
    try {
      const msg = JSON.parse(event.data)
      console.log("Received message:", msg)

      switch (msg.type) {
        case "conversation.item.input_audio_transcription.completed":
          console.log("Transcription completed:", msg.transcript)
          setConversation((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "user",
              text: msg.transcript || "",
              timestamp: new Date().toISOString(),
            },
          ])
          break

        case "response.audio_transcript.delta":
          console.log("Received audio transcript delta:", msg.delta)
          setConversation((prev) => {
            const lastMsg = prev[prev.length - 1]
            if (lastMsg && lastMsg.role === "assistant") {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...lastMsg,
                text: lastMsg.text + msg.delta,
                timestamp: new Date().toISOString(), // Update timestamp for each delta
              }
              return updated
            } else {
              return [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: "assistant",
                  text: msg.delta,
                  timestamp: new Date().toISOString(),
                },
              ]
            }
          })
          break

        case "response.function_call_arguments.done":
          console.log("Function call arguments received:", msg.name, msg.arguments)
          const fn = functionRegistry.current[msg.name]
          if (fn) {
            const args = JSON.parse(msg.arguments)
            const result = await fn(args)

            console.log("Function result:", result)

            const response = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: msg.call_id,
                output: JSON.stringify(result),
              },
            }
            dataChannelRef.current?.send(JSON.stringify(response))

            setConversation((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: "assistant",
                text: `Function called: ${msg.name}\nArguments: ${msg.arguments}\nResult: ${JSON.stringify(result)}`,
                timestamp: new Date().toISOString(),
              },
            ])

            const responseCreate = {
              type: "response.create",
            }
            dataChannelRef.current?.send(JSON.stringify(responseCreate))
          }
          break

        default:
          console.log("Unhandled message type:", msg.type)
          break
      }
    } catch (error) {
      console.error("Error handling data channel message:", error)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    status,
    isSessionActive,
    audioIndicatorRef,
    startSession,
    stopSession,
    handleStartStopClick,
    registerFunction,
    conversation,
    currentVolume,
    error,
  }
}

export type { Tool }

