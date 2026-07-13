import { deviceMetrics, useDeviceMetrics } from '@/lib/utils/device-metrics'

describe('DeviceMetricsCollector', () => {
  beforeEach(() => {
    ;(deviceMetrics as any).metrics = []
    ;(deviceMetrics as any).observers = []
  })

  describe('getDeviceInfo', () => {
    it('reports the jsdom navigator + screen data', () => {
      const info = deviceMetrics.getDeviceInfo()
      expect(info.userAgent).toBe(navigator.userAgent)
      expect(info.screenWidth).toBe(window.screen.width)
      expect(info.devicePixelRatio).toBeGreaterThan(0)
    })
  })

  describe('getMetrics / getLatestMetrics', () => {
    it('returns null when nothing has been recorded', () => {
      expect(deviceMetrics.getLatestMetrics()).toBeNull()
      expect(deviceMetrics.getMetrics()).toEqual([])
    })

    it('returns a shallow copy — mutating does not corrupt internal state', () => {
      ;(deviceMetrics as any).recordMetric({ pageLoadTime: 100 })
      const copy = deviceMetrics.getMetrics()
      copy.push({ pageLoadTime: 999 } as any)
      expect(deviceMetrics.getMetrics().length).toBe(1)
    })

    it('caps the metric buffer at 100 entries', () => {
      for (let i = 0; i < 110; i++) (deviceMetrics as any).recordMetric({ pageLoadTime: i })
      expect(deviceMetrics.getMetrics().length).toBe(100)
    })

    it('updateMetric merges into the last entry', () => {
      ;(deviceMetrics as any).recordMetric({ pageLoadTime: 100 })
      ;(deviceMetrics as any).updateMetric({ largestContentfulPaint: 250 })
      const last = deviceMetrics.getLatestMetrics()
      expect(last?.pageLoadTime).toBe(100)
      expect(last?.largestContentfulPaint).toBe(250)
    })

    it('updateMetric on an empty buffer creates a new entry', () => {
      ;(deviceMetrics as any).updateMetric({ frameRate: 42 })
      expect(deviceMetrics.getLatestMetrics()?.frameRate).toBe(42)
    })
  })

  describe('getStats', () => {
    it('returns sane defaults when there are no metrics', () => {
      const s = deviceMetrics.getStats()
      expect(s.avgFrameRate).toBe(60)
      expect(s.avgPageLoadTime).toBe(0)
      expect(s.minFrameRate).toBe(60)
    })

    it('computes averages / extremes across recorded metrics', () => {
      ;(deviceMetrics as any).recordMetric({ pageLoadTime: 100, timeToInteractive: 50, frameRate: 60, memoryUsage: 1000 })
      ;(deviceMetrics as any).recordMetric({ pageLoadTime: 200, timeToInteractive: 150, frameRate: 30, memoryUsage: 3000 })
      const s = deviceMetrics.getStats()
      expect(s.avgPageLoadTime).toBe(150)
      expect(s.avgTimeToInteractive).toBe(100)
      expect(s.avgFrameRate).toBe(45)
      expect(s.avgMemoryUsage).toBe(2000)
      expect(s.minFrameRate).toBe(30)
      expect(s.maxMemoryUsage).toBe(3000)
    })
  })

  describe('exportMetrics', () => {
    it('produces valid JSON with the expected keys', () => {
      ;(deviceMetrics as any).recordMetric({ pageLoadTime: 100 })
      const out = deviceMetrics.exportMetrics()
      const parsed = JSON.parse(out)
      expect(parsed).toHaveProperty('deviceInfo')
      expect(parsed).toHaveProperty('metrics')
      expect(parsed).toHaveProperty('stats')
      expect(parsed).toHaveProperty('timestamp')
    })
  })

  describe('cleanup', () => {
    it('disconnects all observers and empties the internal list', () => {
      const disconnect = jest.fn()
      ;(deviceMetrics as any).observers.push({ disconnect })
      ;(deviceMetrics as any).observers.push({ disconnect })
      deviceMetrics.cleanup()
      expect(disconnect).toHaveBeenCalledTimes(2)
      expect((deviceMetrics as any).observers.length).toBe(0)
    })
  })

  describe('useDeviceMetrics', () => {
    it('returns latest metrics, device info and stats on the client', () => {
      ;(deviceMetrics as any).recordMetric({ pageLoadTime: 100 })
      const r = useDeviceMetrics()
      expect(r.metrics).not.toBeNull()
      expect(r.deviceInfo).not.toBeNull()
      expect(r.stats).not.toBeNull()
    })
  })

  describe('startCollection + PerformanceObserver-based measurements', () => {
    let observers: Array<{ cb: any; opts: any }> = []

    beforeEach(() => {
      observers = []
      class FakePO {
        cb: any
        constructor(cb: any) { this.cb = cb }
        observe(opts: any) { observers.push({ cb: this.cb, opts }) }
        disconnect = jest.fn()
      }
      // @ts-ignore
      global.PerformanceObserver = FakePO
    })

    it('measureLCP updates the last metric with the largest-contentful-paint value', () => {
      ;(deviceMetrics as any).measureLCP()
      const po = observers.find(o => o.opts.entryTypes[0] === 'largest-contentful-paint')
      expect(po).toBeTruthy()
      po!.cb({ getEntries: () => [{ renderTime: 1234 }] })
      expect(deviceMetrics.getLatestMetrics()?.largestContentfulPaint).toBe(1234)
    })

    it('measureLCP falls back to loadTime when renderTime is missing', () => {
      ;(deviceMetrics as any).measureLCP()
      const po = observers.find(o => o.opts.entryTypes[0] === 'largest-contentful-paint')!
      po.cb({ getEntries: () => [{ renderTime: 0, loadTime: 456 }] })
      expect(deviceMetrics.getLatestMetrics()?.largestContentfulPaint).toBe(456)
    })

    it('measureFID computes processingStart - startTime', () => {
      ;(deviceMetrics as any).measureFID()
      const po = observers.find(o => o.opts.entryTypes[0] === 'first-input')!
      po.cb({ getEntries: () => [{ processingStart: 300, startTime: 100 }] })
      expect(deviceMetrics.getLatestMetrics()?.firstInputDelay).toBe(200)
    })

    it('measureLCP swallows PerformanceObserver.observe throwing', () => {
      class Throw {
        constructor(_cb: any) {}
        observe() { throw new Error('not supported') }
        disconnect() {}
      }
      // @ts-ignore
      global.PerformanceObserver = Throw
      const spy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      expect(() => (deviceMetrics as any).measureLCP()).not.toThrow()
      expect(() => (deviceMetrics as any).measureFID()).not.toThrow()
      spy.mockRestore()
    })

    it('startCollection wires up all measurers without throwing', () => {
      // Provide navigation timing so measurePageLoad fires
      const nav = { loadEventEnd: 200, domInteractive: 150, domContentLoadedEventEnd: 120, fetchStart: 100 }
      const orig = performance.getEntriesByType
      ;(performance as any).getEntriesByType = jest.fn(() => [nav])
      expect(() => deviceMetrics.startCollection()).not.toThrow()
      window.dispatchEvent(new Event('load'))
      const last = deviceMetrics.getLatestMetrics()
      expect(last?.pageLoadTime).toBe(100)
      expect(last?.timeToInteractive).toBe(50)
      ;(performance as any).getEntriesByType = orig
    })
  })
})
