import {
  debounce,
  throttle,
  memoize,
  BatchProcessor,
  getVisibleItems,
  optimizeImage,
  lazyLoadImage,
} from '@/lib/utils/performance'

describe('performance utils', () => {
  describe('debounce', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('collapses repeated calls into one after wait', () => {
      const fn = jest.fn()
      const d = debounce(fn, 100)
      d('a'); d('b'); d('c')
      expect(fn).not.toHaveBeenCalled()
      jest.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('c')
    })

    it('fires again once the debounce window resets', () => {
      const fn = jest.fn()
      const d = debounce(fn, 50)
      d(1)
      jest.advanceTimersByTime(50)
      d(2)
      jest.advanceTimersByTime(50)
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('throttle', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('fires the leading call immediately and drops calls inside the window', () => {
      const fn = jest.fn()
      const t = throttle(fn, 100)
      t('a'); t('b'); t('c')
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('a')
    })

    it('re-arms after the throttle window ends', () => {
      const fn = jest.fn()
      const t = throttle(fn, 100)
      t('a')
      jest.advanceTimersByTime(100)
      t('b')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('memoize', () => {
    it('caches result by JSON-stringified args', () => {
      const raw = jest.fn((a: number, b: number) => a + b)
      const m = memoize(raw)
      expect(m(1, 2)).toBe(3)
      expect(m(1, 2)).toBe(3)
      expect(m(2, 3)).toBe(5)
      expect(raw).toHaveBeenCalledTimes(2)
    })
  })

  describe('getVisibleItems', () => {
    const items = Array.from({ length: 200 }, (_, i) => i)

    it('returns a window that starts before scrollTop by the buffer', () => {
      const r = getVisibleItems(items, 500, 50, 1000)
      // scrollTop=1000/50=20, buffer=5 → start=15
      expect(r.start).toBe(15)
      expect(r.visibleItems.length).toBe(r.end - r.start)
    })

    it('never returns a negative start', () => {
      const r = getVisibleItems(items, 500, 50, 0)
      expect(r.start).toBe(0)
    })

    it('caps end at items.length', () => {
      const r = getVisibleItems(items, 500, 50, 99999)
      expect(r.end).toBeLessThanOrEqual(items.length)
    })
  })

  describe('BatchProcessor', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('flushes automatically when batch size is reached', async () => {
      const processor = jest.fn().mockResolvedValue(undefined)
      const bp = new BatchProcessor<number>(processor, 3, 1000)
      bp.add(1); bp.add(2); bp.add(3)
      // Yield so the microtask started by flush() runs
      await Promise.resolve()
      expect(processor).toHaveBeenCalledWith([1, 2, 3])
    })

    it('flushes on delay when batch size is not reached', async () => {
      const processor = jest.fn().mockResolvedValue(undefined)
      const bp = new BatchProcessor<number>(processor, 10, 500)
      bp.add(1)
      expect(processor).not.toHaveBeenCalled()
      jest.advanceTimersByTime(500)
      await Promise.resolve()
      expect(processor).toHaveBeenCalledWith([1])
    })

    it('forceFlush is a no-op when queue is empty', async () => {
      const processor = jest.fn().mockResolvedValue(undefined)
      const bp = new BatchProcessor<number>(processor)
      await bp.forceFlush()
      expect(processor).not.toHaveBeenCalled()
    })

    it('re-queues items on processor failure', async () => {
      const processor = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
      const bp = new BatchProcessor<number>(processor, 2, 500)
      bp.add(1); bp.add(2)
      await Promise.resolve(); await Promise.resolve()
      await bp.forceFlush()
      expect(processor).toHaveBeenCalledTimes(2)
    })
  })

  describe('lazyLoadImage', () => {
    it('sets src when the image intersects the viewport', () => {
      const callbacks: Array<(entries: any[]) => void> = []
      const observe = jest.fn()
      const unobserve = jest.fn()
      // @ts-ignore
      global.IntersectionObserver = jest.fn((cb: any) => {
        callbacks.push(cb)
        return { observe, unobserve, disconnect: jest.fn() }
      })
      const img = { src: '' } as HTMLImageElement
      lazyLoadImage(img, 'https://x/y.png')
      expect(observe).toHaveBeenCalledWith(img)
      callbacks[0]([{ isIntersecting: true, target: img }])
      expect(img.src).toBe('https://x/y.png')
      expect(unobserve).toHaveBeenCalledWith(img)
    })
  })

  describe('optimizeImage', () => {
    // Shared helpers for the canvas/Image plumbing
    const installCanvasMock = (opts: { toBlob?: (cb: (b: Blob | null) => void, ...rest: any[]) => void; getContext?: any } = {}) => {
      const drawImage = jest.fn()
      const toBlob = opts.toBlob ?? ((cb: (b: Blob | null) => void) => cb(new Blob(['x'], { type: 'image/png' })))
      const getContext = opts.getContext ?? (() => ({ drawImage }))
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') return { width: 0, height: 0, getContext, toBlob } as any
        return document.createElement(tag)
      })
      return { drawImage }
    }

    const installFileReader = (variant: 'ok' | 'err') => {
      class FR {
        onload: any
        onerror: any
        readAsDataURL() {
          if (variant === 'ok') setTimeout(() => this.onload?.({ target: { result: 'data:img,x' } }), 0)
          else setTimeout(() => this.onerror?.(new Error('read')), 0)
        }
      }
      // @ts-ignore
      global.FileReader = FR
    }

    const installImage = (variant: 'ok' | 'err', width = 2000, height = 1000) => {
      class Img {
        onload: any
        onerror: any
        width = width
        height = height
        set src(_v: string) {
          if (variant === 'ok') setTimeout(() => this.onload?.(), 0)
          else setTimeout(() => this.onerror?.(), 0)
        }
      }
      // @ts-ignore
      global.Image = Img
    }

    afterEach(() => jest.restoreAllMocks())

    it('rejects when the FileReader emits an error', async () => {
      installFileReader('err')
      const f = new File([new Uint8Array([1, 2])], 'a.png', { type: 'image/png' })
      await expect(optimizeImage(f)).rejects.toThrow('Error al leer el archivo')
    })

    it('rejects when the Image fails to decode', async () => {
      installFileReader('ok'); installImage('err')
      installCanvasMock()
      const f = new File([new Uint8Array([1, 2])], 'a.png', { type: 'image/png' })
      await expect(optimizeImage(f)).rejects.toThrow('Error al cargar la imagen')
    })

    it('resolves with a downscaled File when the source is larger than the caps', async () => {
      installFileReader('ok'); installImage('ok', 4000, 2000)
      const { drawImage } = installCanvasMock()
      const f = new File([new Uint8Array([1, 2])], 'big.png', { type: 'image/png' })
      const out = await optimizeImage(f, 1000, 1000, 0.9)
      expect(out).toBeInstanceOf(File)
      expect(out.name).toBe('big.png')
      expect(drawImage).toHaveBeenCalled()
    })

    it('rejects when the canvas has no 2D context', async () => {
      installFileReader('ok'); installImage('ok')
      installCanvasMock({ getContext: () => null })
      const f = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
      await expect(optimizeImage(f)).rejects.toThrow('contexto del canvas')
    })

    it('rejects when toBlob yields null', async () => {
      installFileReader('ok'); installImage('ok')
      installCanvasMock({ toBlob: (cb: (b: Blob | null) => void) => cb(null) })
      const f = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })
      await expect(optimizeImage(f)).rejects.toThrow('Error al crear blob')
    })
  })
})
