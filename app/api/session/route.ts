import { NextResponse } from "next/server"

export const maxDuration = 300 // Increase timeout to 5 minutes for long-running connections

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(`OPENAI_API_KEY is not set`)
    }

    console.log("Creating new session...")
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        modalities: ["audio", "text"],
        instructions: `You are an AI assistant for a dental clinic called Smile Bright Dental. You can help with booking appointments and answering questions about dental services. 
                       Use the available tools when relevant to find free appointments and book appointments for patients.
                       After executing a tool, respond to the user sharing the function result or error. If anything is unclear or you must confirm details please always re-ask. Before you submit a booking verify the details with the user.`,
        tool_choice: "auto",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Session creation failed:", errorText)
      throw new Error(`API request failed with status ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log("Session created successfully")

    return NextResponse.json({
      ...data,
      sessionStartTime: Date.now(),
    })
  } catch (error) {
    console.error("Error in session creation:", error)
    return NextResponse.json(
      {
        error: "Failed to create session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

