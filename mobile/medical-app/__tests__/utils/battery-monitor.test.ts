import { batteryMonitor } from '@/lib/utils/battery-monitor'

// The singleton `batteryMonitor` is initialised at module-load time. Its
// getBattery() call is behind an optional chain (`navigator as any).getBattery?.()`)
// so in the jsdom env it never resolves — the monitor sits with `batteryStatus = null`
// and no listeners registered. We drive it through its public API by reaching
// into `updateBatteryStatus` via the exposed methods (`onBatteryChange` +
// `recordMetric` are triggered via the internal update).

describe('BatteryMonitor', () => {
  // Access private updateBatteryStatus via prototype casting so we can seed state.
  const seed = (over: Partial<{ level: number; charging: boolean; chargingTime: number | null; dischargingTime: number | null }> = {}) => {
    const battery = {
      level: 0.5,
      charging: false,
      chargingTime: null,
      dischargingTime: 3600 * 1000,
      ...over,
    }
    ;(batteryMonitor as any).updateBatteryStatus(battery)
  }

  beforeEach(() => {
    // Reset internal state between tests
    ;(batteryMonitor as any).batteryStatus = null
    ;(batteryMonitor as any).metrics = []
    ;(batteryMonitor as any).initialLevel = null
    ;(batteryMonitor as any).listeners = []
  })

  describe('getBatteryStatus', () => {
    it('returns null before any status is recorded', () => {
      expect(batteryMonitor.getBatteryStatus()).toBeNull()
    })

    it('returns the last known status once seeded', () => {
      seed({ level: 0.42, charging: true })
      const s = batteryMonitor.getBatteryStatus()
      expect(s?.level).toBe(0.42)
      expect(s?.charging).toBe(true)
    })
  })

  describe('getMetrics', () => {
    it('returns an empty array before any metric is recorded', () => {
      expect(batteryMonitor.getMetrics()).toEqual([])
    })

    it('returns a copy — mutating the result does not affect the monitor', () => {
      seed()
      const first = batteryMonitor.getMetrics()
      first.push({ initialLevel: 0, currentLevel: 0, consumptionRate: 0, estimatedTimeRemaining: null, isCharging: false, timestamp: 0 })
      expect(batteryMonitor.getMetrics().length).toBe(1)
    })

    it('caps history at 100 entries', () => {
      for (let i = 0; i < 110; i++) seed({ level: 1 - i * 0.005 })
      expect(batteryMonitor.getMetrics().length).toBe(100)
    })
  })

  describe('getConsumptionStats', () => {
    it('returns defaults when there is no status', () => {
      expect(batteryMonitor.getConsumptionStats()).toEqual({
        avgConsumptionRate: 0,
        currentLevel: 1,
        isCharging: false,
        estimatedTimeRemaining: null,
      })
    })

    it('reports current level and charging state from the seeded status', () => {
      seed({ level: 0.7, charging: true, dischargingTime: 60_000 })
      const s = batteryMonitor.getConsumptionStats()
      expect(s.currentLevel).toBe(0.7)
      expect(s.isCharging).toBe(true)
      expect(s.estimatedTimeRemaining).toBeCloseTo(1) // 60_000 / 60_000 = 1 min
    })
  })

  describe('isBatteryLow', () => {
    it('returns false when charging even at low level', () => {
      seed({ level: 0.05, charging: true })
      expect(batteryMonitor.isBatteryLow()).toBe(false)
    })

    it('returns true when below the threshold and unplugged', () => {
      seed({ level: 0.1, charging: false })
      expect(batteryMonitor.isBatteryLow(0.2)).toBe(true)
    })

    it('returns false when there is no status yet', () => {
      expect(batteryMonitor.isBatteryLow()).toBe(false)
    })
  })

  describe('getOptimizationRecommendations', () => {
    it('is empty without a status', () => {
      expect(batteryMonitor.getOptimizationRecommendations()).toEqual([])
    })

    it('recommends aggressive optimisations below 20%', () => {
      seed({ level: 0.1, charging: false })
      const r = batteryMonitor.getOptimizationRecommendations()
      expect(r.some(x => x.includes('muy baja'))).toBe(true)
      expect(r.some(x => x.includes('Cargar el dispositivo pronto'))).toBe(true)
    })

    it('recommends moderate optimisations between 20% and 50%', () => {
      seed({ level: 0.4, charging: false })
      const r = batteryMonitor.getOptimizationRecommendations()
      expect(r.some(x => x.includes('moderada'))).toBe(true)
    })

    it('returns nothing above 50% when charging', () => {
      seed({ level: 0.9, charging: true })
      expect(batteryMonitor.getOptimizationRecommendations()).toEqual([])
    })
  })

  describe('onBatteryChange', () => {
    it('fires the listener when the status updates and stops after cleanup', () => {
      const cb = jest.fn()
      const off = batteryMonitor.onBatteryChange(cb)
      seed({ level: 0.6 })
      expect(cb).toHaveBeenCalledTimes(1)
      off()
      seed({ level: 0.5 })
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('isolates listener errors', () => {
      const bad = jest.fn(() => { throw new Error('boom') })
      const good = jest.fn()
      batteryMonitor.onBatteryChange(bad)
      batteryMonitor.onBatteryChange(good)
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      seed()
      expect(good).toHaveBeenCalledTimes(1)
      spy.mockRestore()
    })
  })

  describe('estimateBatteryUsage + monitorResourceUsage', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('estimateBatteryUsage seeds a 100 % status and schedules the resource-usage timer', () => {
      ;(batteryMonitor as any).estimateBatteryUsage()
      const s = batteryMonitor.getBatteryStatus()
      expect(s?.level).toBe(1.0)
      expect(s?.charging).toBe(false)
    })

    it('monitorResourceUsage drains the battery level over time using memory as a proxy', () => {
      ;(batteryMonitor as any).estimateBatteryUsage()
      // Inject a fake window.performance.memory so calculateEstimatedConsumption
      // hits the memory branch (lines 145-152)
      const originalPerf = (window as any).performance
      Object.defineProperty(window, 'performance', {
        configurable: true,
        value: { memory: { usedJSHeapSize: 50_000_000, jsHeapSizeLimit: 100_000_000 } },
      })
      const before = batteryMonitor.getBatteryStatus()!.level
      jest.advanceTimersByTime(60_000) // one tick of the interval
      const after = batteryMonitor.getBatteryStatus()!.level
      expect(after).toBeLessThan(before)
      Object.defineProperty(window, 'performance', { configurable: true, value: originalPerf })
    })

    it('calculateEstimatedConsumption returns the base drain when memory info is unavailable', () => {
      const originalPerf = (window as any).performance
      Object.defineProperty(window, 'performance', { configurable: true, value: {} })
      const c = (batteryMonitor as any).calculateEstimatedConsumption()
      expect(c).toBeCloseTo(0.001)
      Object.defineProperty(window, 'performance', { configurable: true, value: originalPerf })
    })
  })

  describe('recordMetric details', () => {
    it('populates estimatedTimeRemaining in minutes from dischargingTime ms', () => {
      ;(batteryMonitor as any).updateBatteryStatus({
        level: 0.8, charging: false, chargingTime: null, dischargingTime: 120_000,
      })
      const m = batteryMonitor.getMetrics()[0]
      expect(m.estimatedTimeRemaining).toBeCloseTo(2) // 120_000 ms / 60_000 = 2 min
      expect(m.isCharging).toBe(false)
    })

    it('leaves estimatedTimeRemaining null when dischargingTime is null', () => {
      ;(batteryMonitor as any).updateBatteryStatus({
        level: 0.8, charging: true, chargingTime: 100, dischargingTime: null,
      })
      const m = batteryMonitor.getMetrics()[0]
      expect(m.estimatedTimeRemaining).toBeNull()
    })
  })
})
