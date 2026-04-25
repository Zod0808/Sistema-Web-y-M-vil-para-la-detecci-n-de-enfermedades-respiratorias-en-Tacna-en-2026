"use client"

import { useEffect } from "react"
import { useOfflineSync } from "@/hooks/useOfflineSync"

/**
 * Provider para manejar sincronización offline automática
 * Se ejecuta en segundo plano y sincroniza cuando vuelve la conexión
 */
export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { syncNow } = useOfflineSync()

  useEffect(() => {
    // Sincronizar automáticamente cuando la página se carga y hay conexión
    const syncOnLoad = async () => {
      if (navigator.onLine) {
        // Esperar un poco para asegurar que todo está cargado
        setTimeout(() => {
          syncNow()
        }, 2000)
      }
    }

    syncOnLoad()

    // También sincronizar cuando vuelve la conexión
    const handleOnline = () => {
      setTimeout(() => {
        syncNow()
      }, 1000)
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [syncNow])

  return <>{children}</>
}

