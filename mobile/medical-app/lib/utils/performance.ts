/**
 * Utilidades de optimización de rendimiento
 */

/**
 * Debounce function - Retrasa la ejecución de una función
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function - Limita la ejecución de una función
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Lazy load images
 */
export function lazyLoadImage(imageElement: HTMLImageElement, src: string) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        imageElement.src = src
        observer.unobserve(imageElement)
      }
    })
  })

  observer.observe(imageElement)
}

/**
 * Memoización simple
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)
    }

    const result = fn(...args)
    cache.set(key, result)
    return result
  }) as T
}

/**
 * Batch operations - Agrupa operaciones para ejecutarlas juntas
 */
export class BatchProcessor<T> {
  private queue: T[] = []
  private timeout: NodeJS.Timeout | null = null
  private readonly batchSize: number
  private readonly delay: number
  private readonly processor: (items: T[]) => Promise<void>

  constructor(
    processor: (items: T[]) => Promise<void>,
    batchSize: number = 10,
    delay: number = 1000
  ) {
    this.processor = processor
    this.batchSize = batchSize
    this.delay = delay
  }

  add(item: T): void {
    this.queue.push(item)

    if (this.queue.length >= this.batchSize) {
      this.flush()
    } else if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), this.delay)
    }
  }

  async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    if (this.queue.length === 0) {
      return
    }

    const items = [...this.queue]
    this.queue = []

    try {
      await this.processor(items)
    } catch (error) {
      console.error('Error en batch processing:', error)
      // Re-agregar items al inicio de la cola en caso de error
      this.queue.unshift(...items)
    }
  }

  async forceFlush(): Promise<void> {
    await this.flush()
  }
}

/**
 * Image optimization - Redimensionar y comprimir imágenes
 */
export async function optimizeImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calcular nuevas dimensiones manteniendo aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al crear blob'))
              return
            }

            const optimizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })

            resolve(optimizedFile)
          },
          file.type,
          quality
        )
      }

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Virtual scrolling helper - Calcula qué items deben renderizarse
 */
export function getVisibleItems<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number
): { start: number; end: number; visibleItems: T[] } {
  const buffer = 5 // Items adicionales arriba y abajo para smooth scroll
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const visibleCount = Math.ceil(containerHeight / itemHeight) + buffer * 2
  const end = Math.min(items.length, start + visibleCount)

  return {
    start,
    end,
    visibleItems: items.slice(start, end)
  }
}

