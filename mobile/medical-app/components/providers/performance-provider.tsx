"use client"

import { useEffect } from "react"
import { offlineQueue } from "@/lib/services/offlineQueue"
import { imageCache } from "@/lib/utils/imageCache"

/**
 * Provider para optimizaciones de rendimiento
 * Limpia cache periódicamente y optimiza recursos
 */
export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Limpiar operaciones completadas antiguas cada hora
    const cleanupInterval = setInterval(() => {
      offlineQueue.clearCompleted()
      
      // Limpiar cache de imágenes expirado
      // (se hace automáticamente en imageCache, pero forzamos aquí)
      const stats = imageCache.getStats()
      if (stats.size > stats.maxSize * 0.8) {
        // Si el cache está al 80% de su capacidad, limpiar
        imageCache.clearCache()
      }
    }, 60 * 60 * 1000) // Cada hora

    // Preconnect a APIs comunes para mejorar velocidad
    const preconnectDomains = [
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    ]

    preconnectDomains.forEach(domain => {
      if (domain && typeof document !== 'undefined') {
        const link = document.createElement('link')
        link.rel = 'preconnect'
        link.href = domain
        document.head.appendChild(link)
      }
    })

    return () => {
      clearInterval(cleanupInterval)
    }
  }, [])

  return <>{children}</>
}

