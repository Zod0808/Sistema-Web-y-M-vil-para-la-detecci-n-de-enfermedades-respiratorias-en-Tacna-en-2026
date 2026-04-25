/**
 * useNetworkStatus
 * ═══════════════════════════════════════════════════════════════════
 * Detecta el estado de conexión a internet usando:
 *  - @capacitor/network (nativo) → confiable en Android/iOS
 *  - window.online/offline events (fallback para web)
 *
 * Por qué reemplazar window.online:
 *  En WebView Android los eventos online/offline pueden no dispararse
 *  correctamente en transiciones 4G→3G→WiFi. @capacitor/network usa
 *  la API nativa ConnectivityManager de Android.
 *
 * Retorna:
 *  { isOnline, connectionType }
 *  connectionType: 'wifi' | '4g' | '3g' | '2g' | 'none' | 'unknown'
 */

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

export type ConnectionType = 'wifi' | '4g' | '3g' | '2g' | 'none' | 'unknown'

interface NetworkState {
  isOnline: boolean
  connectionType: ConnectionType
}

const isNative = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()

export function useNetworkStatus(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  })

  const setOnlineStatus = useAppStore((s) => s.setOnlineStatus)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let mounted = true

    function updateState(online: boolean, type: ConnectionType = 'unknown') {
      if (!mounted) return
      setState({ isOnline: online, connectionType: type })
      setOnlineStatus(online)
    }

    async function initNative() {
      try {
        const { Network } = await import('@capacitor/network')

        // Leer estado actual al montar
        const status = await Network.getStatus()
        updateState(status.connected, status.connectionType as ConnectionType)

        // Suscribirse a cambios
        const listener = await Network.addListener('networkStatusChange', (status) => {
          updateState(status.connected, status.connectionType as ConnectionType)
        })

        cleanupRef.current = () => listener.remove()
      } catch {
        // @capacitor/network no disponible — caer al fallback web
        initWeb()
      }
    }

    function initWeb() {
      const handleOnline = () => updateState(true)
      const handleOffline = () => updateState(false)

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      // Estado inicial
      updateState(navigator.onLine)

      cleanupRef.current = () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }

    if (isNative()) {
      initNative()
    } else {
      initWeb()
    }

    return () => {
      mounted = false
      cleanupRef.current?.()
    }
  }, [setOnlineStatus])

  return state
}