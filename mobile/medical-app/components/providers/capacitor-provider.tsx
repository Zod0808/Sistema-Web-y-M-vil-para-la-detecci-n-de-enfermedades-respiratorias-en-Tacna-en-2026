'use client'

/**
 * CapacitorProvider
 *
 * Provider raíz que inicializa todos los servicios nativos de Capacitor
 * al arrancar la app. Debe ser el primer provider en el árbol.
 *
 * Responsabilidades:
 *  - Botón "Atrás" Android (useCapacitorApp)
 *  - Deep links
 *  - Ciclo de vida (resume / pause)
 *  - Status Bar (color y estilo)
 *  - Splash Screen (ocultar cuando la app está lista)
 */

import { useEffect, useState } from 'react'
import { useCapacitorApp } from '@/hooks/useCapacitorApp'
import { recoverTokensFromNativeStorage } from '@/lib/api/config'
import { useAppStore } from '@/store/useAppStore'

const isNative = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()

function CapacitorInit() {
  // Inicializar back button + deep links + ciclo de vida
  useCapacitorApp()

  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    if (!isNative()) return

    async function initNativeServices() {
      // ── Recuperar sesión desde SharedPreferences si localStorage fue limpiado ──
      try {
        const recovered = await recoverTokensFromNativeStorage()
        if (recovered) {
          // Restaurar usuario en el store desde localStorage (ya re-hidratado)
          const { getUser } = await import('@/lib/api/config')
          const savedUser = getUser()
          if (savedUser) setUser(savedUser)
        }
      } catch {
        // Silenciar — la app continúa sin sesión restaurada
      }

      // ── Status Bar ────────────────────────────────────────────────────
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')

        // Fondo oscuro para coincidir con el tema de la app
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: '#0f172a' }) // slate-900

        // Edge-to-edge: el WebView se extiende bajo la barra de estado
        // Necesario en Android 15+ (obligatorio) y recomendado desde Android 11
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.show()
      } catch {
        // StatusBar no disponible fuera de native
      }

      // ── Splash Screen ─────────────────────────────────────────────────
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        // Ocultar el splash después de que React haya renderizado
        // Usamos un pequeño delay para evitar flash de contenido sin estilos
        await new Promise((resolve) => setTimeout(resolve, 300))
        await SplashScreen.hide({ fadeOutDuration: 300 })
      } catch {
        // SplashScreen no disponible fuera de native
      }

      // ── Keyboard ─────────────────────────────────────────────────────
      try {
        const { Keyboard } = await import('@capacitor/keyboard')
        // Evitar que el teclado empuje el contenido — el layout usa adjustResize
        await Keyboard.setAccessoryBarVisible({ isVisible: true })
      } catch {
        // Keyboard no disponible fuera de native
      }
    }

    initNativeServices()
  }, [])

  return null
}

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      {mounted && <CapacitorInit />}
      {children}
    </>
  )
}