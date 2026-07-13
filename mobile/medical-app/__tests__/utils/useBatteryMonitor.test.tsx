import React from 'react'
import { render, act } from '@testing-library/react'
import { batteryMonitor, useBatteryMonitor } from '@/lib/utils/battery-monitor'

function Probe({ onRead }: { onRead: (r: ReturnType<typeof useBatteryMonitor>) => void }) {
  const r = useBatteryMonitor()
  React.useEffect(() => { onRead(r) })
  return null
}

describe('useBatteryMonitor hook', () => {
  beforeEach(() => {
    ;(batteryMonitor as any).batteryStatus = null
    ;(batteryMonitor as any).metrics = []
    ;(batteryMonitor as any).initialLevel = null
    ;(batteryMonitor as any).listeners = []
  })

  it('exposes the current status, stats, isLow flag and recommendations', () => {
    let last: any = null
    render(<Probe onRead={(r) => (last = r)} />)
    expect(last).toEqual(expect.objectContaining({
      batteryStatus: null,
      metrics: expect.any(Array),
      stats: expect.any(Object),
      isLow: false,
      recommendations: expect.any(Array),
    }))
  })

  it('re-renders when the singleton emits a status change', () => {
    let last: any = null
    render(<Probe onRead={(r) => (last = r)} />)
    act(() => {
      ;(batteryMonitor as any).updateBatteryStatus({
        level: 0.15, charging: false, chargingTime: null, dischargingTime: 60_000,
      })
    })
    expect(last.batteryStatus?.level).toBe(0.15)
    expect(last.isLow).toBe(true)
    expect(last.recommendations.length).toBeGreaterThan(0)
  })
})
