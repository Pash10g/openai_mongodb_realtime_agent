export interface Tool {
  type: "function"
  name: string
  description: string
  parameters: {
    type: "object"
    properties: {
      [key: string]: {
        type: string
        description: string
      }
    }
    required: string[]
  }
}
/* Example : 
{
    type: "function",
    name: "findFreeAppointment",
    description: "Find the next available appointment slot",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The date to start searching from (YYYY-MM-DD)",
        },
      },
      required: ["date"],
    },
  }
*/
export const tools: Tool[] = [
  
]

export type ToolFunction = (args: any) => Promise<any>

/*
Example:

export const toolFunctions: Record<string, ToolFunction> = {
  findFreeAppointment: async ({ date }: { date: string }) => {
    try {
      const response = await fetch(`/api/appointments?date=${date}`)
      if (!response.ok) throw new Error("Failed to fetch appointments")
      const appointments = await response.json()
      const availableSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"].filter(
        (time) => !appointments.some((apt) => apt.time === time && apt.date === date),
      )
      return { availableSlots, date }
    } catch (error) {
      console.error("Error finding free appointments:", error)
      return { error: "Failed to find available appointments" }
    }
  },
}

*/
export const toolFunctions: Record<string, ToolFunction> = {
}

