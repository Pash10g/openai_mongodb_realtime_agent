import dynamic from "next/dynamic"
import { Typography } from "@/components/ui/typography"

const AICallButton = dynamic(() => import("../components/AICallButton"), { ssr: false })

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <Typography variant="h1">Smile Bright Dental AI Assistant</Typography>
      <div className="mt-8 space-y-4">
        <Typography variant="h2">How to use:</Typography>
        <ol className="list-decimal list-inside space-y-2">
          <li>Click the phone button in the bottom right corner to start a call.</li>
          <li>Speak clearly to the AI assistant to book or inquire about appointments.</li>
          <li>The AI can find available slots and book appointments for you.</li>
          <li>You can ask about services, operating hours, or any dental-related questions.</li>
          <li>Click the end call button when you're finished. You can start a new call at any time.</li>
        </ol>
      </div>
      <AICallButton />
    </main>
  )
}

