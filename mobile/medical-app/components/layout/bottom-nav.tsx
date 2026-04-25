"use client"

import { Home, Bot, HeartPulse, Calendar, User } from "lucide-react"
import type { ViewState } from "@/lib/translations"

interface BottomNavProps {
  currentView: ViewState
  setCurrentView: (view: ViewState) => void
  isEmergencyMode?: boolean
}

export function BottomNav({ currentView, setCurrentView, isEmergencyMode = false }: BottomNavProps) {
  // En modo emergencia, solo mostrar Chat
  if (isEmergencyMode) {
    return (
      <div className="w-full px-4 pb-2 pt-2 bg-background border-t border-border/50 dark:border-slate-700 flex-shrink-0">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-red-200 dark:border-red-800 flex justify-center items-center relative">
          <div className="px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400">
            Modo de Emergencia - Solo Chat
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 pb-2 pt-2 bg-background border-t border-border/50 dark:border-slate-700 flex-shrink-0">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] px-2 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 dark:border-white/5 flex justify-between items-center relative">
        {/* Nav Items */}
        <button
          onClick={() => setCurrentView("dashboard")}
          className={`p-3 rounded-full transition-all duration-300 ${currentView === "dashboard" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Home className="w-6 h-6" />
        </button>

        <button
          onClick={() => setCurrentView("chat")}
          className={`p-3 rounded-full transition-all duration-300 ${currentView === "chat" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Bot className="w-6 h-6" />
        </button>

        {/* Center Action Button */}
        <div className="relative -top-6">
          <button
            onClick={() => setCurrentView("wearables")}
            className={`w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-blue-600 text-white flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-background transition-transform duration-300 ${currentView === "wearables" ? "scale-110 ring-4 ring-primary/20" : "hover:scale-105"}`}
          >
            <HeartPulse className="w-7 h-7" />
          </button>
        </div>

        <button
          onClick={() => setCurrentView("history")}
          className={`p-3 rounded-full transition-all duration-300 ${currentView === "history" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Calendar className="w-6 h-6" />
        </button>

        <button
          onClick={() => setCurrentView("profile")}
          className={`p-3 rounded-full transition-all duration-300 ${currentView === "profile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <User className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
