"use client"

import { DarkModeToggle } from "./DarkModeToggle"
import { SmileIcon } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 items-center">
        <div className="flex items-center gap-2 font-bold">
          <SmileIcon className="h-6 w-6 text-blue-500" />
          <span className="hidden sm:inline-block">Smile Bright Dental Clinic</span>
          <span className="sm:hidden">Smile Bright</span>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <DarkModeToggle />
        </div>
      </div>
    </header>
  )
}

