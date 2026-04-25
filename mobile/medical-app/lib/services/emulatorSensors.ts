"use client"

/**
 * EmulatorSensors — lee sensores virtuales del emulador Android via el
 * endpoint de sincronización del backend, y permite inyectar escenarios
 * predefinidos (reposo, ejercicio, alerta SpO2) desde la UI.
 *
 * En un dispositivo físico o smartwatch real se reemplazaría por:
 *   - Health Connect API (Android 14+)
 *   - Samsung Health SDK
 *   - Garmin Connect IQ
 */

export interface SensorReading {
  heartRate: number
  steps: number
  spO2: number
  lastSync: string
  provider: string
  scenario?: 'rest' | 'active' | 'exercise' | 'alert_spo2'
}

export type Scenario = 'rest' | 'active' | 'exercise' | 'alert_spo2'

const SCENARIOS: Record<Scenario, Omit<SensorReading, 'lastSync' | 'steps'>> = {
  rest: {
    heartRate: 62,
    spO2: 98,
    provider: 'Android Virtual Sensor',
    scenario: 'rest',
  },
  active: {
    heartRate: 88,
    spO2: 97,
    provider: 'Android Virtual Sensor',
    scenario: 'active',
  },
  exercise: {
    heartRate: 145,
    spO2: 96,
    provider: 'Android Virtual Sensor',
    scenario: 'exercise',
  },
  alert_spo2: {
    heartRate: 105,
    spO2: 88,
    provider: 'Android Virtual Sensor',
    scenario: 'alert_spo2',
  },
}

// Ornstein-Uhlenbeck: deriva realista con reversión a la media
function ornsteinUhlenbeck(
  current: number,
  mean: number,
  theta = 0.3,
  sigma = 1.5
): number {
  const noise = (Math.random() - 0.5) * 2 * sigma
  return current + theta * (mean - current) + noise
}

export class EmulatorSensorService {
  private currentReading: SensorReading | null = null
  private targetScenario: Scenario = 'active'
  private accumulatedSteps = 0
  private listeners: Set<(r: SensorReading) => void> = new Set()

  /** Inicializa con una lectura base del backend */
  init(base: Partial<SensorReading>): void {
    this.accumulatedSteps = base.steps ?? 4000
    this.currentReading = {
      heartRate: base.heartRate ?? 78,
      steps: this.accumulatedSteps,
      spO2: base.spO2 ?? 97,
      lastSync: base.lastSync ?? new Date().toISOString(),
      provider: base.provider ?? 'Android Virtual Sensor',
    }
  }

  /** Aplica un escenario predefinido (simulando cambio de actividad) */
  applyScenario(scenario: Scenario): SensorReading {
    this.targetScenario = scenario
    const s = SCENARIOS[scenario]
    this.currentReading = {
      ...s,
      steps: this.accumulatedSteps,
      lastSync: new Date().toISOString(),
    }
    this.notifyListeners()
    return this.currentReading
  }

  /** Genera la siguiente lectura con drift fisiológico realista */
  tick(): SensorReading {
    const target = SCENARIOS[this.targetScenario]
    const prev = this.currentReading ?? SCENARIOS.active as any

    // Frecuencia cardíaca: media-reversión suave ±2 BPM por tick
    const hr = Math.round(
      Math.max(45, Math.min(200,
        ornsteinUhlenbeck(prev.heartRate, target.heartRate, 0.25, 1.8)
      ))
    )

    // SpO2: muy estable, solo ±1%
    const spo2 = Math.round(
      Math.max(80, Math.min(100,
        ornsteinUhlenbeck(prev.spO2, target.spO2, 0.4, 0.4)
      ))
    )

    // Pasos: incrementan según el escenario
    const stepsPerTick =
      this.targetScenario === 'rest'     ? Math.random() * 1 :
      this.targetScenario === 'active'   ? Math.random() * 10 + 5 :
      this.targetScenario === 'exercise' ? Math.random() * 20 + 15 :
      Math.random() * 3

    this.accumulatedSteps = Math.round(this.accumulatedSteps + stepsPerTick)

    this.currentReading = {
      heartRate: hr,
      steps: this.accumulatedSteps,
      spO2: spo2,
      lastSync: new Date().toISOString(),
      provider: 'Android Virtual Sensor',
      scenario: this.targetScenario,
    }

    this.notifyListeners()
    return this.currentReading
  }

  subscribe(cb: (r: SensorReading) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notifyListeners(): void {
    if (!this.currentReading) return
    this.listeners.forEach(cb => cb(this.currentReading!))
  }

  get current(): SensorReading | null {
    return this.currentReading
  }
}

export const emulatorSensors = new EmulatorSensorService()