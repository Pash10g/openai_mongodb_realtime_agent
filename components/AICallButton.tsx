"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Phone, X, Mic, MicOff, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DebugPanel } from "@/components/DebugPanel"
import useWebRTCAudioSession from "../hooks/useWebRTCAudioSession"
import { tools, toolFunctions, type ToolFunction } from "@/lib/tools"

export default function AICallButton() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const conversationRef = useRef<HTMLDivElement>(null)
  const [isDebugOpen, setIsDebugOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any[]>([])

  const {
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
  } = useWebRTCAudioSession("alloy", tools)

  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const createRingTone = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const audioContext = audioContextRef.current

    const oscillator = audioContext.createOscillator()
    oscillatorRef.current = oscillator

    const gainNode = audioContext.createGain()
    gainNodeRef.current = gainNode

    oscillator.type = "sine"
    oscillator.frequency.value = 440
    gainNode.gain.value = 0

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.start()

    const ringDuration = 2000
    const silenceDuration = 4000
    let time = audioContext.currentTime

    const scheduleRing = () => {
      gainNode.gain.setValueAtTime(0, time)
      gainNode.gain.linearRampToValueAtTime(0.2, time + 0.1)
      oscillator.frequency.setValueAtTime(440, time)
      oscillator.frequency.setValueAtTime(480, time + 0.1)
      gainNode.gain.setValueAtTime(0.2, time + 0.8)
      gainNode.gain.linearRampToValueAtTime(0, time + 1)
      time += ringDuration / 1000
    }

    for (let i = 0; i < 3; i++) {
      scheduleRing()
    }

    intervalRef.current = setInterval(() => {
      time = audioContext.currentTime
      for (let i = 0; i < 3; i++) {
        scheduleRing()
      }
    }, silenceDuration)
  }, [])

  const stopRingTone = useCallback(() => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop()
      oscillatorRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect()
    }
  }, [])

  // Register tools
  useEffect(() => {
    const registerTool = (name: string, fn: ToolFunction) => {
      registerFunction(name, async (args: any) => {
        try {
          const result = await fn(args)
          setDebugInfo((prev) => [...prev, { type: name, input: args, output: result, timestamp: Date.now() }])
          return result
        } catch (error) {
          console.error(`Error in ${name}:`, error)
          setDebugInfo((prev) => [
            ...prev,
            {
              type: name,
              input: args,
              error: error instanceof Error ? error.message : "Unknown error",
              timestamp: Date.now(),
            },
          ])
          return { error: error instanceof Error ? error.message : "Unknown error" }
        }
      })
    }

    Object.entries(toolFunctions).forEach(([name, fn]) => registerTool(name, fn))
  }, [registerFunction])

  const handleStartStop = useCallback(async () => {
    if (!isSessionActive) {
      setIsConnecting(true)
      createRingTone()
      try {
        await startSession()
      } finally {
        setIsConnecting(false)
        stopRingTone()
      }
    } else {
      stopSession()
    }
  }, [isSessionActive, startSession, stopSession, createRingTone, stopRingTone])

  useEffect(() => {
    return () => {
      stopRingTone()
    }
  }, [stopRingTone])

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight
    }
  }, [conversationRef]) // Updated dependency

  const toggleCall = () => {
    if (!isCallActive) {
      setIsCallActive(true)
      handleStartStop()
    } else {
      setIsCallActive(false)
      stopSession()
    }
  }

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev)
  }

  return (
    <>
      <DebugPanel isOpen={isDebugOpen} onClose={() => setIsDebugOpen(false)} debugInfo={debugInfo} />

      <Button
        className="fixed bottom-4 right-4 rounded-full w-16 h-16 shadow-lg z-50 flex items-center justify-center"
        onClick={isChatOpen ? toggleCall : toggleChat}
        variant={isSessionActive ? "destructive" : "default"}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <span className="animate-spin">⏳</span>
        ) : isCallActive ? (
          <X size={24} />
        ) : isChatOpen ? (
          <Phone size={24} />
        ) : (
          <Phone size={24} />
        )}
      </Button>

      {isChatOpen && (
        <div className="fixed bottom-24 right-4 w-96 h-[70vh] bg-background border border-border rounded-lg shadow-lg p-4 z-40 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">AI Assistant</h3>
            <div className="flex items-center gap-2">
              {isSessionActive ? (
                <Mic className="h-4 w-4 text-green-500" />
              ) : (
                <MicOff className="h-4 w-4 text-gray-500" />
              )}
              <div
                ref={audioIndicatorRef}
                className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                  currentVolume > 0.1 ? "bg-green-500" : "bg-gray-300"
                }`}
              />
              <span className="text-sm text-muted-foreground">{status}</span>
              <Button variant="ghost" size="sm" className="ml-2" onClick={() => setIsDebugOpen(!isDebugOpen)}>
                {isDebugOpen ? "Hide Debug" : "Show Debug"}
              </Button>
              <Button variant="ghost" size="sm" onClick={toggleChat} aria-label="Close chat">
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div ref={conversationRef} className="flex-grow overflow-y-auto mb-4 space-y-2 border rounded-lg p-2">
            {conversation.length > 0 ? (
              conversation
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map((msg, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-lg ${
                      msg.role === "assistant" ? "bg-primary/10 ml-4" : "bg-secondary/10 mr-4"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-sm font-medium">{msg.role === "assistant" ? "AI Assistant" : "You"}</div>
                      <div className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <div className="text-sm">{msg.text}</div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No conversation history</p>
            )}
          </div>

          <Button
            onClick={toggleCall}
            className="w-full"
            variant={isSessionActive ? "destructive" : "default"}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : isSessionActive ? "End Call" : "Start New Call"}
          </Button>
        </div>
      )}
    </>
  )
}

