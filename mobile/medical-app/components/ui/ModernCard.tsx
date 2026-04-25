"use client"

import type * as React from "react"

export function ModernCard({
  className = "",
  children,
  onClick,
  onPress,
  variant = "default",
}: {
  className?: string
  children: React.ReactNode
  onClick?: () => void
  onPress?: () => void
  variant?: "default" | "glass" | "gradient"
}) {
  const variants = {
    default: "bg-card dark:bg-slate-900 border border-border/50 shadow-sm hover:shadow-md transition-all duration-300",
    glass: "bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm",
    gradient: "bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/10",
  }

  const handlePress = onPress || onClick

  return (
    <div
      onClick={handlePress}
      className={`rounded-[calc(var(--radius)+4px)] text-card-foreground relative overflow-hidden ${variants[variant]} ${handlePress ? "cursor-pointer active:scale-[0.98] active:opacity-80" : ""} ${className}`}
    >
      {children}
    </div>
  )
}
