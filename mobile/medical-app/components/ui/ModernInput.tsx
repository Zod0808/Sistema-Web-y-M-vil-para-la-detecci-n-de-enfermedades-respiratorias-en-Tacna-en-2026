"use client"

import * as React from "react"
import type { ReactNode } from "react"

export const ModernInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    icon?: ReactNode
    onChangeText?: (text: string) => void
  }
>(({ className = "", icon, onChangeText, onChange, ...props }, ref) => {
  return (
    <div className="relative w-full">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>}
      <input
        ref={ref}
        className={`flex h-14 w-full rounded-[var(--radius)] border border-input bg-background/50 px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${icon ? "pl-12" : ""} ${className}`}
        onChange={(e) => {
          if (onChangeText) onChangeText(e.target.value)
          if (onChange) onChange(e)
        }}
        {...props}
      />
    </div>
  )
})
ModernInput.displayName = "ModernInput"
