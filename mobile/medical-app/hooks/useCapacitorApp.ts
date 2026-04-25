/**
 * useCapacitorApp
 *
 * Hook central que inicializa todos los listeners nativos de Capacitor:
 *  - Botón "Atrás" de Android (evita cierre accidental)
 *  - Deep links (respicare:// y https://respicare.app)
 *  - Estado de la app (foreground / background)
 *
 * Uso: montar una sola vez en el provider raíz (CapacitorProvider).
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Capacitor se importa dinámicamente para evitar errores en SSR/export estático
const isNative = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()

export function useCapacitorApp() {
  const router = useRouter()
  const cleanupRef = useRef<Array<() => void>>([])

  useEffect(() => {
    if (!isNative()) return

    let mounted = true

    async function init() {
      try {
        const { App } = await import('@capacitor/app')

        // ── 1. Botón "Atrás" de Android ─────────────────────────────────
        // Sin este listener, el botón "Atrás" cierra la app desde cualquier pantalla.
        const backListener = await App.addListener('backButton', ({ canGoBack }) => {
          if (!mounted) return

          if (canGoBack) {
            // Si el historial web permite retroceder, navega normalmente
            window.history.back()
          } else {
            // Estamos en la pantalla raíz — cerrar la app
            App.exitApp()
          }
        })

        // ── 2. Deep Links ────────────────────────────────────────────────
        // Maneja respicare://dashboard, respicare://emergency, etc.
        const deepLinkListener = await App.addListener('appUrlOpen', ({ url }) => {
          if (!mounted) return

          try {
            // Esquema personalizado: respicare://ruta
            if (url.startsWith('respicare://')) {
              const path = url.replace('respicare:/', '')
              router.push(path || '/')
              return
            }

            // HTTPS: https://respicare.app/ruta
            const parsed = new URL(url)
            if (parsed.hostname === 'respicare.app') {
              router.push(parsed.pathname + parsed.search)
            }
          } catch {
            // URL malformada — ignorar
          }
        })

        // ── 3. Ciclo de vida de la app ────────────────────────────────────
        const resumeListener = await App.addListener('resume', () => {
          if (!mounted) return
          // Disparar evento personalizado para que otros hooks reaccionen
          window.dispatchEvent(new CustomEvent('app:resume'))
        })

        const pauseListener = await App.addListener('pause', () => {
          if (!mounted) return
          window.dispatchEvent(new CustomEvent('app:pause'))
        })

        cleanupRef.current.push(
          () => backListener.remove(),
          () => deepLinkListener.remove(),
          () => resumeListener.remove(),
          () => pauseListener.remove(),
        )
      } catch (err) {
        // En web/SSR @capacitor/app no está disponible — no es un error
        if (process.env.NODE_ENV === 'development') {
          console.debug('[useCapacitorApp] Not running in native context:', err)
        }
      }
    }

    init()

    return () => {
      mounted = false
      cleanupRef.current.forEach((fn) => fn())
      cleanupRef.current = []
    }
  }, [router])
}