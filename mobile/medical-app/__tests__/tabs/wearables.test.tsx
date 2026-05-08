import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { WearablesView } from '@/components/tabs/wearables'
import { wearableService } from '@/lib/api/services/wearableService'

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/lib/services/useVitalsSource', () => ({
  useVitalsSource: () => ({
    metrics: {
      heartRate: 72,
      spO2: 97,
      steps: 4000,
      lastSync: '2026-05-06T10:00:00.000Z',
      provider: 'Emulador',
    },
    source: 'emulator' as const,
    bleStatus: 'disconnected' as const,
    isLive: false,
    hcAvailable: false,
    startLive: jest.fn(),
    stopLive: jest.fn(),
    connectBle: jest.fn().mockResolvedValue(undefined),
    disconnectBle: jest.fn().mockResolvedValue(undefined),
    applyScenario: jest.fn(),
  }),
}))

jest.mock('@/lib/services/wearableWebSocket', () => ({
  wearableWs: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    onStatus: jest.fn(() => jest.fn()),
    onAlert: jest.fn(() => jest.fn()),
  },
}))

jest.mock('@/lib/api/services/wearableService', () => ({
  wearableService: {
    getHistory: jest.fn().mockResolvedValue([]),
    getMetrics: jest.fn().mockResolvedValue({
      heartRate: 72,
      spO2: 97,
      steps: 4000,
      dataPoints: 5,
    }),
    syncMetrics: jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (s: any) => any) =>
    selector({ user: { id: 'patient-1', name: 'Paciente Test' } }),
}))

jest.mock('@/lib/services/emulatorSensors', () => ({
  emulatorSensors: {
    init: jest.fn(),
    current: null,
    applyScenario: jest.fn(() => ({ heartRate: 88, spO2: 97, steps: 5000 })),
  },
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}))

// ── Helpers ────────────────────────────────────────────────────────────────

const mockT = { wearables: { title: 'Wearables' } } as any

function renderView(overrides: Partial<React.ComponentProps<typeof WearablesView>> = {}) {
  return render(
    <WearablesView
      t={mockT}
      isLoading={false}
      setIsLoading={jest.fn()}
      {...overrides}
    />,
  )
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('WearablesView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the component title without crashing', async () => {
    renderView()
    expect(await screen.findByText('Wearables')).toBeInTheDocument()
  })

  it('shows "Pausado" status when sensor is not live', async () => {
    renderView()
    expect(await screen.findByText('Pausado')).toBeInTheDocument()
  })

  it('renders all four sensor scenarios', async () => {
    renderView()
    expect(await screen.findByText('Reposo')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Ejercicio')).toBeInTheDocument()
    expect(screen.getByText('Alerta')).toBeInTheDocument()
  })

  it('shows BLE connect button when wearable is disconnected', async () => {
    renderView()
    expect(await screen.findByText(/Conectar wearable BLE/i)).toBeInTheDocument()
  })

  it('calls syncMetrics when the sync button is clicked', async () => {
    renderView()
    const syncBtn = await screen.findByText(/Sincronizar/i)
    fireEvent.click(syncBtn)
    await waitFor(() => {
      expect(wearableService.syncMetrics).toHaveBeenCalledTimes(1)
    })
  })

  it('displays the current heart rate value', async () => {
    renderView()
    const hrValues = await screen.findAllByText('72')
    expect(hrValues.length).toBeGreaterThan(0)
  })

  it('loads metrics and history on mount', async () => {
    renderView()
    await waitFor(() => {
      expect(wearableService.getMetrics).toHaveBeenCalledTimes(1)
      expect(wearableService.getHistory).toHaveBeenCalledTimes(1)
    })
  })
})
