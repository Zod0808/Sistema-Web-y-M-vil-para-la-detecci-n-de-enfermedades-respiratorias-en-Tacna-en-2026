"use client"

import { useEffect, useState } from "react"
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import { useOfflineSync } from "@/hooks/useOfflineSync"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { ModernButton } from "@/components/ui/ModernButton"
import { toast } from "sonner"

interface SyncIndicatorProps {
  className?: string
}

export function SyncIndicator({ className = "" }: SyncIndicatorProps) {
  const isOnline = useNetworkStatus()
  const { isSyncing, queueStats, syncNow, pendingCount } = useOfflineSync()
  const [showDetails, setShowDetails] = useState(false)

  if (!isOnline && pendingCount === 0) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium ${className}`}>
        <WifiOff className="w-3 h-3" />
        <span>Sin conexión</span>
      </div>
    )
  }

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium ${className}`}>
        <CheckCircle2 className="w-3 h-3" />
        <span>Sincronizado</span>
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            isSyncing
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
          }`}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Sincronizando...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" />
              <span>{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
            </>
          )}
        </button>

        {showDetails && !isSyncing && (
          <div className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 rounded-xl p-4 border border-border/50 dark:border-slate-700 shadow-lg z-50 min-w-[200px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium dark:text-white">Estado de Sincronización</span>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pendientes:</span>
                  <span className="font-medium dark:text-white">{queueStats.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Procesando:</span>
                  <span className="font-medium dark:text-white">{queueStats.processing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completadas:</span>
                  <span className="font-medium dark:text-white">{queueStats.completed}</span>
                </div>
                {queueStats.failed > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Fallidas:</span>
                    <span className="font-medium">{queueStats.failed}</span>
                  </div>
                )}
              </div>
              {isOnline && pendingCount > 0 && (
                <ModernButton
                  onClick={async () => {
                    await syncNow()
                    setShowDetails(false)
                  }}
                  size="sm"
                  className="w-full mt-2"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Sincronizar Ahora
                </ModernButton>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

