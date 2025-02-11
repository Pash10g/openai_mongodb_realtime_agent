"use client"

import { memo } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DebugInfo {
  type: string
  input: any
  output?: any
  error?: string
  timestamp: number
}

interface DebugPanelProps {
  isOpen: boolean
  onClose: () => void
  debugInfo: DebugInfo[]
}

export const DebugPanel = memo(function DebugPanel({ isOpen, onClose, debugInfo }: DebugPanelProps) {
  return (
    <div
      className={cn(
        "fixed left-4 bottom-24 w-96 h-96 bg-background border border-border rounded-lg shadow-lg",
        "transition-all duration-300 ease-in-out transform",
        isOpen ? "translate-y-0 opacity-100 visible" : "translate-y-8 opacity-0 invisible",
      )}
    >
      <div className="absolute inset-0 flex flex-col rounded-lg overflow-hidden">
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold">Debug Information</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close debug panel</span>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {debugInfo.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No debug information available</p>
          ) : (
            debugInfo.map((info, index) => (
              <div
                key={info.timestamp}
                className={cn(
                  "p-3 bg-muted rounded-lg transform transition-all duration-300",
                  "hover:shadow-md hover:-translate-y-0.5",
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{info.type}</h4>
                  <span className="text-xs text-muted-foreground">{new Date(info.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Input:</h5>
                    <pre className="text-xs whitespace-pre-wrap overflow-x-auto bg-background p-2 rounded">
                      {JSON.stringify(info.input, null, 2)}
                    </pre>
                  </div>
                  {info.output && (
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-1">Output:</h5>
                      <pre className="text-xs whitespace-pre-wrap overflow-x-auto bg-background p-2 rounded">
                        {JSON.stringify(info.output, null, 2)}
                      </pre>
                    </div>
                  )}
                  {info.error && (
                    <div>
                      <h5 className="text-xs font-medium text-destructive mb-1">Error:</h5>
                      <pre className="text-xs whitespace-pre-wrap overflow-x-auto bg-background/50 p-2 rounded border border-destructive/20 text-destructive">
                        {info.error}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
})

