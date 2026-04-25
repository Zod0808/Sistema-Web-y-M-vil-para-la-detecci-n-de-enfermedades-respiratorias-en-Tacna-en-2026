/**
 * useGeolocation
 * ═══════════════════════════════════════════════════════════════════
 * Hook de geolocalización nativa para emergencias médicas.
 *
 * Usa @capacitor/geolocation en native (GPS real del dispositivo) y
 * navigator.geolocation como fallback en web.
 *
 * Funciones principales:
 *  - getCurrentLocation()   Obtiene ubicación puntual (para envío en emergencias)
 *  - startWatching()        Seguimiento continuo (mientras dura la emergencia)
 *  - stopWatching()         Detiene el seguimiento
 *  - requestPermission()    Solicita permiso explícitamente
 */

import { useState, useCallback, useRef } from 'react'

export interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number
  altitude?: number | null
  speed?: number | null
  timestamp: number
}

export interface GeolocationState {
  location: GeoLocation | null
  error: string | null
  loading: boolean
  permissionGranted: boolean | null
}

const isNative = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 5_000,
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    permissionGranted: null,
  })

  const watchIdRef = useRef<string | null>(null)
  const webWatchIdRef = useRef<number | null>(null)

  // ── Solicitar permiso ───────────────────────────────────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative()) {
      // En web, el permiso se solicita automáticamente al llamar getCurrentPosition
      return 'geolocation' in navigator
    }

    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      const result = await Geolocation.requestPermissions({ permissions: ['location'] })
      const granted = result.location === 'granted'
      setState((prev) => ({ ...prev, permissionGranted: granted }))
      return granted
    } catch {
      setState((prev) => ({ ...prev, permissionGranted: false }))
      return false
    }
  }, [])

  // ── Obtener ubicación actual ────────────────────────────────────────────

  const getCurrentLocation = useCallback(async (): Promise<GeoLocation | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    if (isNative()) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation')

        // Verificar permiso antes de obtener posición
        const permission = await Geolocation.checkPermissions()
        if (permission.location !== 'granted') {
          const granted = await requestPermission()
          if (!granted) {
            setState((prev) => ({
              ...prev,
              loading: false,
              error: 'Permiso de ubicación denegado. Actívalo en Configuración.',
              permissionGranted: false,
            }))
            return null
          }
        }

        const position = await Geolocation.getCurrentPosition(DEFAULT_OPTIONS)
        const location: GeoLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          timestamp: position.timestamp,
        }

        setState((prev) => ({
          ...prev,
          location,
          loading: false,
          error: null,
          permissionGranted: true,
        }))
        return location
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al obtener ubicación'
        setState((prev) => ({ ...prev, loading: false, error: message }))
        return null
      }
    } else {
      // Fallback web — navigator.geolocation
      return new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Geolocalización no disponible en este dispositivo',
          }))
          resolve(null)
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location: GeoLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              timestamp: position.timestamp,
            }
            setState((prev) => ({
              ...prev,
              location,
              loading: false,
              error: null,
              permissionGranted: true,
            }))
            resolve(location)
          },
          (err) => {
            const messages: Record<number, string> = {
              1: 'Permiso de ubicación denegado',
              2: 'Ubicación no disponible',
              3: 'Tiempo de espera agotado',
            }
            const message = messages[err.code] ?? 'Error al obtener ubicación'
            setState((prev) => ({ ...prev, loading: false, error: message }))
            resolve(null)
          },
          DEFAULT_OPTIONS,
        )
      })
    }
  }, [requestPermission])

  // ── Seguimiento continuo ─────────────────────────────────────────────────

  const startWatching = useCallback(async () => {
    // Detener seguimiento previo si existe
    await stopWatching()

    if (isNative()) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation')
        watchIdRef.current = await Geolocation.watchPosition(
          DEFAULT_OPTIONS,
          (position, err) => {
            if (err || !position) {
              setState((prev) => ({
                ...prev,
                error: 'Error en seguimiento de ubicación',
              }))
              return
            }
            setState((prev) => ({
              ...prev,
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                speed: position.coords.speed,
                timestamp: position.timestamp,
              },
              error: null,
            }))
          },
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al iniciar seguimiento'
        setState((prev) => ({ ...prev, error: message }))
      }
    } else if ('geolocation' in navigator) {
      webWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setState((prev) => ({
            ...prev,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              speed: position.coords.speed,
              timestamp: position.timestamp,
            },
            error: null,
          }))
        },
        (err) => {
          setState((prev) => ({ ...prev, error: err.message }))
        },
        DEFAULT_OPTIONS,
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopWatching = useCallback(async () => {
    if (watchIdRef.current !== null && isNative()) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation')
        await Geolocation.clearWatch({ id: watchIdRef.current })
      } catch {
        // ignorar
      }
      watchIdRef.current = null
    }
    if (webWatchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(webWatchIdRef.current)
      webWatchIdRef.current = null
    }
  }, [])

  // ── Helper: URL para compartir ubicación en emergencia ─────────────────

  const getEmergencyLocationUrl = useCallback((): string | null => {
    if (!state.location) return null
    const { latitude, longitude } = state.location
    return `https://maps.google.com/?q=${latitude},${longitude}`
  }, [state.location])

  return {
    ...state,
    getCurrentLocation,
    startWatching,
    stopWatching,
    requestPermission,
    getEmergencyLocationUrl,
  }
}