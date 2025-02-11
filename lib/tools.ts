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
  findFreeAppointment: async ({ date }) => {
   

  const response = await fetch(`/api/appointments?date=${date}`);
  if (!response.ok) {
    throw new Error('Failed to fetch appointments');
  }
  const appointments = await response.json();
  return appointments;
  },
}

*/
export const toolFunctions: Record<string, ToolFunction> = {
}

