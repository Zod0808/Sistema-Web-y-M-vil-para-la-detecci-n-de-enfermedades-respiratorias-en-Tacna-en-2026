"use client"

import React from "react"
import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

export const ModernButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "outline" | "icon" | "destructive" | "glass"
    size?: "default" | "sm" | "icon" | "lg"
    isLoading?: boolean
    children: ReactNode
    onPress?: () => void
  }
>(
  (
    { className = "", variant = "primary", size = "default", children, isLoading = false, onPress, onClick, ...props },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-[var(--radius)] font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer touch-manipulation select-none"

    const variants = {
      primary: "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      icon: "hover:bg-accent hover:text-accent-foreground rounded-full",
      destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-lg shadow-destructive/20",
      glass: "bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 shadow-lg",
    }

    const sizes = {
      default: "h-12 px-6 py-2 text-base",
      sm: "h-10 rounded-[calc(var(--radius)-4px)] px-4 text-sm",
      icon: "h-12 w-12",
      lg: "h-14 rounded-[var(--radius)] px-8 text-lg",
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        onClick={onPress || onClick}
        {...props}
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
        {children}
      </button>
    )
  },
)
ModernButton.displayName = "ModernButton"
