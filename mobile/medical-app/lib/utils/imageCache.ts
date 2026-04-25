/**
 * Cache de imágenes para mejorar rendimiento
 */

const CACHE_PREFIX = 'respicare_image_cache_'
const MAX_CACHE_SIZE = 50 * 1024 * 1024 // 50MB
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 días

interface CachedImage {
  url: string
  blob: string // base64
  timestamp: number
  size: number
}

class ImageCache {
  private cache: Map<string, CachedImage> = new Map()

  constructor() {
    this.loadCache()
    this.cleanExpired()
  }

  /**
   * Cargar cache desde localStorage
   */
  private loadCache(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX))
      
      for (const key of keys) {
        const cached = localStorage.getItem(key)
        if (cached) {
          const data: CachedImage = JSON.parse(cached)
          // Verificar si no ha expirado
          if (Date.now() - data.timestamp < CACHE_EXPIRY) {
            this.cache.set(key.replace(CACHE_PREFIX, ''), data)
          } else {
            localStorage.removeItem(key)
          }
        }
      }
    } catch (error) {
      console.error('Error cargando cache de imágenes:', error)
    }
  }

  /**
   * Guardar imagen en cache
   */
  async cacheImage(url: string): Promise<string> {
    // Si ya está en cache, retornar URL del cache
    if (this.cache.has(url)) {
      const cached = this.cache.get(url)!
      return cached.blob
    }

    try {
      // Descargar imagen
      const response = await fetch(url)
      const blob = await response.blob()
      
      // Convertir a base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })

      // Guardar en cache
      const cached: CachedImage = {
        url,
        blob: base64,
        timestamp: Date.now(),
        size: blob.size
      }

      // Verificar tamaño del cache antes de agregar
      if (this.getCacheSize() + cached.size > MAX_CACHE_SIZE) {
        this.evictOldest()
      }

      this.cache.set(url, cached)
      localStorage.setItem(`${CACHE_PREFIX}${url}`, JSON.stringify(cached))

      return base64
    } catch (error) {
      console.error('Error cacheando imagen:', error)
      return url // Retornar URL original si falla
    }
  }

  /**
   * Obtener imagen del cache
   */
  getCachedImage(url: string): string | null {
    const cached = this.cache.get(url)
    if (cached) {
      return cached.blob
    }
    return null
  }

  /**
   * Limpiar cache expirado
   */
  private cleanExpired(): void {
    const now = Date.now()
    const toRemove: string[] = []

    this.cache.forEach((cached, url) => {
      if (now - cached.timestamp > CACHE_EXPIRY) {
        toRemove.push(url)
      }
    })

    toRemove.forEach(url => {
      this.cache.delete(url)
      localStorage.removeItem(`${CACHE_PREFIX}${url}`)
    })
  }

  /**
   * Obtener tamaño total del cache
   */
  private getCacheSize(): number {
    let total = 0
    this.cache.forEach(cached => {
      total += cached.size
    })
    return total
  }

  /**
   * Eliminar las imágenes más antiguas
   */
  private evictOldest(): void {
    const sorted = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    )

    // Eliminar las 5 más antiguas
    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const [url] = sorted[i]
      this.cache.delete(url)
      localStorage.removeItem(`${CACHE_PREFIX}${url}`)
    }
  }

  /**
   * Limpiar todo el cache
   */
  clearCache(): void {
    this.cache.clear()
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_PREFIX))
      keys.forEach(key => localStorage.removeItem(key))
    }
  }

  /**
   * Obtener estadísticas del cache
   */
  getStats(): {
    count: number
    size: number
    maxSize: number
  } {
    return {
      count: this.cache.size,
      size: this.getCacheSize(),
      maxSize: MAX_CACHE_SIZE
    }
  }
}

export const imageCache = new ImageCache()

