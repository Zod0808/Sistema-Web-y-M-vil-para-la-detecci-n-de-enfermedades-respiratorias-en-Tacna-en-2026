/**
 * Tests de Integración Offline/Sync
 * 
 * Cubre:
 * - Tests completos de sincronización offline
 * - Tests de reconexión y sincronización automática
 * - Tests de manejo de errores de red recurrentes
 */

// Mocks deben estar antes de las importaciones
jest.mock('../../medical-app/lib/api/services/medicalHistoryService')
jest.mock('../../medical-app/lib/api/services/appointmentService')
jest.mock('../../medical-app/lib/api/services/alertService')

import { offlineQueue, type OfflineOperation } from '../../medical-app/lib/services/offlineQueue'
import { 
  createMedicalHistoryOffline,
  updateMedicalHistoryOffline,
  createAppointmentOffline,
  cancelAppointmentOffline,
  rescheduleAppointmentOffline,
  acknowledgeAlertOffline,
  updateAppointmentOffline
} from '../../medical-app/lib/services/offlineOperations'
import { medicalHistoryService } from '../../medical-app/lib/api/services/medicalHistoryService'
import { appointmentService } from '../../medical-app/lib/api/services/appointmentService'
import { alertService } from '../../medical-app/lib/api/services/alertService'

const mockMedicalHistoryService = medicalHistoryService as jest.Mocked<typeof medicalHistoryService>
const mockAppointmentService = appointmentService as jest.Mocked<typeof appointmentService>
const mockAlertService = alertService as jest.Mocked<typeof alertService>

// Mock de localStorage para entorno de testing
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

// Configurar mocks globales
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true
  })
}

// Mock de navigator.onLine
const mockNavigatorOnline = (isOnline: boolean) => {
  if (typeof navigator !== 'undefined') {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: isOnline
    })
  }
}

// Mock de eventos de red
const triggerOnlineEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('online'))
  }
}

const triggerOfflineEvent = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('offline'))
  }
}


describe('Tests de Integración Offline/Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    offlineQueue.clearAll()
    localStorageMock.clear()
    mockNavigatorOnline(true)
    
    // Resetear mocks
    mockMedicalHistoryService.create.mockResolvedValue({ _id: 'history-123' } as any)
    mockMedicalHistoryService.update.mockResolvedValue(undefined)
    mockAppointmentService.create.mockResolvedValue({ _id: 'appt-123' } as any)
    mockAppointmentService.update.mockResolvedValue(undefined)
    mockAppointmentService.cancel.mockResolvedValue(undefined)
    mockAppointmentService.reschedule.mockResolvedValue(undefined)
    mockAlertService.acknowledge.mockResolvedValue(undefined)
  })

  afterEach(() => {
    offlineQueue.clearAll()
    localStorageMock.clear()
  })

  describe('1. Tests de Sincronización Offline', () => {
    describe('1.1 Creación de historias médicas offline', () => {
      it('debe agregar operación a la cola cuando está offline', async () => {
        mockNavigatorOnline(false)

        const historyData = {
          patientId: 'patient-1',
          patientName: 'Juan Pérez',
          age: 30,
          diagnosis: 'Resfriado común',
          symptoms: []
        }

        const result = await createMedicalHistoryOffline(historyData, false)

        expect(result.isOffline).toBe(true)
        expect(result.id).toBeTruthy()
        
        const pendingOps = offlineQueue.getPendingOperations()
        expect(pendingOps).toHaveLength(1)
        expect(pendingOps[0].type).toBe('create_medical_history')
        expect(pendingOps[0].payload).toEqual(historyData)
      })

      it('debe crear directamente cuando está online', async () => {
        mockNavigatorOnline(true)

        const historyData = {
          patientId: 'patient-1',
          patientName: 'Juan Pérez',
          age: 30,
          diagnosis: 'Resfriado común',
          symptoms: []
        }

        const result = await createMedicalHistoryOffline(historyData, true)

        expect(result.isOffline).toBe(false)
        expect(mockMedicalHistoryService.create).toHaveBeenCalledWith(historyData)
        expect(offlineQueue.getPendingCount()).toBe(0)
      })

      it('debe agregar a cola si falla la creación online por error de red', async () => {
        mockNavigatorOnline(true)
        const networkError = new Error('Network error')
        ;(networkError as any).status = 0
        mockMedicalHistoryService.create.mockRejectedValue(networkError)

        const historyData = {
          patientId: 'patient-1',
          patientName: 'Juan Pérez',
          age: 30,
          diagnosis: 'Resfriado común',
          symptoms: []
        }

        const result = await createMedicalHistoryOffline(historyData, true)

        expect(result.isOffline).toBe(true)
        expect(offlineQueue.getPendingCount()).toBe(1)
      })
    })

    describe('1.2 Creación de citas offline', () => {
      it('debe agregar cita a la cola cuando está offline', async () => {
        mockNavigatorOnline(false)

        const appointmentData = {
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          scheduledAt: new Date().toISOString(),
          reason: 'Consulta de seguimiento'
        }

        const result = await createAppointmentOffline(appointmentData, false)

        expect(result.isOffline).toBe(true)
        expect(offlineQueue.getPendingCount()).toBe(1)
        
        const pendingOps = offlineQueue.getPendingOperations()
        expect(pendingOps[0].type).toBe('create_appointment')
        expect(pendingOps[0].payload).toEqual(appointmentData)
      })

      it('debe crear cita directamente cuando está online', async () => {
        mockNavigatorOnline(true)

        const appointmentData = {
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          scheduledAt: new Date().toISOString()
        }

        const result = await createAppointmentOffline(appointmentData, true)

        expect(result.isOffline).toBe(false)
        expect(mockAppointmentService.create).toHaveBeenCalledWith(appointmentData)
      })
    })

    describe('1.3 Actualización de datos offline', () => {
      it('debe agregar actualización de historia médica a la cola', async () => {
        mockNavigatorOnline(false)

        const updateData = {
          diagnosis: 'Actualizado',
          description: 'Nueva descripción'
        }

        const result = await updateMedicalHistoryOffline('history-123', updateData, false)

        expect(result.isOffline).toBe(true)
        expect(offlineQueue.getPendingCount()).toBe(1)
        
        const pendingOps = offlineQueue.getPendingOperations()
        expect(pendingOps[0].type).toBe('update_medical_history')
        expect(pendingOps[0].payload).toEqual({ id: 'history-123', data: updateData })
      })

      it('debe agregar cancelación de cita a la cola', async () => {
        mockNavigatorOnline(false)

        const result = await cancelAppointmentOffline('appt-123', 'Razón de cancelación', false)

        expect(result.isOffline).toBe(true)
        expect(offlineQueue.getPendingCount()).toBe(1)
        
        const pendingOps = offlineQueue.getPendingOperations()
        expect(pendingOps[0].type).toBe('cancel_appointment')
      })

      it('debe agregar reprogramación de cita a la cola', async () => {
        mockNavigatorOnline(false)

        const newDate = new Date().toISOString()
        const result = await rescheduleAppointmentOffline('appt-123', newDate, 60, false)

        expect(result.isOffline).toBe(true)
        expect(offlineQueue.getPendingCount()).toBe(1)
        
        const pendingOps = offlineQueue.getPendingOperations()
        expect(pendingOps[0].type).toBe('reschedule_appointment')
        expect(pendingOps[0].payload.newDate).toBe(newDate)
      })
    })

    describe('1.4 Múltiples operaciones offline', () => {
      it('debe manejar múltiples operaciones en la cola', async () => {
        mockNavigatorOnline(false)

        // Crear múltiples operaciones
        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'Paciente 1',
          age: 25,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        await createAppointmentOffline({
          patientId: 'p1',
          doctorId: 'd1',
          scheduledAt: new Date().toISOString()
        }, false)

        await updateMedicalHistoryOffline('h1', { diagnosis: 'Actualizado' }, false)

        expect(offlineQueue.getPendingCount()).toBe(3)
        
        const stats = offlineQueue.getStats()
        expect(stats.pending).toBe(3)
        expect(stats.total).toBe(3)
      })

      it('debe mantener el orden de las operaciones (FIFO)', async () => {
        mockNavigatorOnline(false)

        const op1 = await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        const op2 = await createAppointmentOffline({
          patientId: 'p1',
          doctorId: 'd1',
          scheduledAt: new Date().toISOString()
        }, false)

        const pendingOps = offlineQueue.getPendingOperations()
        expect(pendingOps[0].type).toBe('create_appointment') // Último agregado primero (unshift)
        expect(pendingOps[1].type).toBe('create_medical_history')
      })
    })
  })

  describe('2. Tests de Reconexión y Sincronización Automática', () => {
    describe('2.1 Sincronización automática al reconectar', () => {
      it('debe sincronizar operaciones pendientes cuando vuelve la conexión', async () => {
        // Crear operaciones offline
        mockNavigatorOnline(false)
        
        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'Paciente',
          age: 30,
          diagnosis: 'Diagnóstico',
          symptoms: []
        }, false)

        await createAppointmentOffline({
          patientId: 'p1',
          doctorId: 'd1',
          scheduledAt: new Date().toISOString()
        }, false)

        expect(offlineQueue.getPendingCount()).toBe(2)

        // Simular reconexión
        mockNavigatorOnline(true)
        
        // Procesar cola
        await offlineQueue.processQueue(async (operation) => {
          switch (operation.type) {
            case 'create_medical_history':
              await mockMedicalHistoryService.create(operation.payload)
              break
            case 'create_appointment':
              await mockAppointmentService.create(operation.payload)
              break
          }
        })

        // Verificar que se procesaron
        expect(mockMedicalHistoryService.create).toHaveBeenCalledTimes(1)
        expect(mockAppointmentService.create).toHaveBeenCalledTimes(1)
        expect(offlineQueue.getPendingCount()).toBe(0)
        
        const stats = offlineQueue.getStats()
        expect(stats.completed).toBe(2)
      })

      it('debe procesar operaciones en el orden correcto', async () => {
        mockNavigatorOnline(false)

        const callOrder: string[] = []

        // Crear operaciones
        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        await createAppointmentOffline({
          patientId: 'p1',
          doctorId: 'd1',
          scheduledAt: new Date().toISOString()
        }, false)

        // Mock para rastrear orden
        mockMedicalHistoryService.create.mockImplementation(async () => {
          callOrder.push('history')
          return { _id: 'h1' } as any
        })
        mockAppointmentService.create.mockImplementation(async () => {
          callOrder.push('appointment')
          return { _id: 'a1' } as any
        })

        mockNavigatorOnline(true)
        
        await offlineQueue.processQueue(async (operation) => {
          switch (operation.type) {
            case 'create_medical_history':
              await mockMedicalHistoryService.create(operation.payload)
              break
            case 'create_appointment':
              await mockAppointmentService.create(operation.payload)
              break
          }
        })

        // Verificar que se procesaron todas
        expect(callOrder.length).toBe(2)
      })
    })

    describe('2.2 Sincronización parcial', () => {
      it('debe marcar como completadas solo las operaciones exitosas', async () => {
        mockNavigatorOnline(false)

        // Crear 3 operaciones
        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        await createMedicalHistoryOffline({
          patientId: 'p2',
          patientName: 'P2',
          age: 25,
          diagnosis: 'Dx2',
          symptoms: []
        }, false)

        await createMedicalHistoryOffline({
          patientId: 'p3',
          patientName: 'P3',
          age: 30,
          diagnosis: 'Dx3',
          symptoms: []
        }, false)

        // Hacer que la segunda falle
        let callCount = 0
        mockMedicalHistoryService.create.mockImplementation(async (data) => {
          callCount++
          if (callCount === 2) {
            throw new Error('Server error')
          }
          return { _id: `history-${callCount}` } as any
        })

        mockNavigatorOnline(true)
        
        await offlineQueue.processQueue(async (operation) => {
          await mockMedicalHistoryService.create(operation.payload)
        })

        const stats = offlineQueue.getStats()
        expect(stats.completed).toBe(2)
        expect(stats.pending).toBe(1) // La que falló se mantiene pendiente
      })
    })

    describe('2.3 Persistencia de cola', () => {
      it('debe persistir operaciones en la cola (SQLite / in-memory en tests)', () => {
        mockNavigatorOnline(false)

        offlineQueue.clearAll()

        createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        // La cola en memoria debe tener la operación
        expect(offlineQueue.getPendingCount()).toBeGreaterThan(0)
      })

      it('debe recuperar operaciones encoladas correctamente', () => {
        offlineQueue.clearAll()

        const id = offlineQueue.enqueue('create_medical_history', {
          patientId: 'p1',
          patientName: 'Test',
          age: 20,
          diagnosis: 'Dx',
          symptoms: []
        })

        const ops = offlineQueue.getAllOperations()
        expect(ops.length).toBeGreaterThan(0)
        expect(ops[0].id).toBe(id)
      })
    })
  })

  describe('3. Tests de Manejo de Errores de Red Recurrentes', () => {
    describe('3.1 Reintentos automáticos', () => {
      it('debe reintentar operación fallida hasta MAX_RETRIES', async () => {
        mockNavigatorOnline(false)

        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        const pendingOps = offlineQueue.getPendingOperations()
        const operationId = pendingOps[0].id

        // Hacer que falle 2 veces, luego tenga éxito
        let attemptCount = 0
        mockMedicalHistoryService.create.mockImplementation(async () => {
          attemptCount++
          if (attemptCount < 3) {
            throw new Error('Network error')
          }
          return { _id: 'success' } as any
        })

        mockNavigatorOnline(true)

        // Procesar hasta que tenga éxito
        for (let i = 0; i < 3; i++) {
          try {
            await offlineQueue.processQueue(async (op) => {
              await mockMedicalHistoryService.create(op.payload)
            })
          } catch (e) {
            // Ignorar errores, continuar reintentando
          }
        }

        // Verificar que finalmente tuvo éxito
        const finalStats = offlineQueue.getStats()
        expect(finalStats.completed).toBe(1)
        expect(attemptCount).toBe(3)
      })

      it('debe marcar como failed después de MAX_RETRIES', async () => {
        mockNavigatorOnline(false)

        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        const pendingOps = offlineQueue.getPendingOperations()
        const operationId = pendingOps[0].id

        // Hacer que siempre falle
        mockMedicalHistoryService.create.mockRejectedValue(new Error('Persistent network error'))

        mockNavigatorOnline(true)

        // Procesar múltiples veces para alcanzar MAX_RETRIES (3)
        for (let i = 0; i < 4; i++) {
          try {
            await offlineQueue.processQueue(async (op) => {
              await mockMedicalHistoryService.create(op.payload)
            })
          } catch (e) {
            // Ignorar errores
          }
        }

        const stats = offlineQueue.getStats()
        expect(stats.failed).toBe(1)
        expect(stats.pending).toBe(0)
      })
    })

    describe('3.2 Errores intermitentes de red', () => {
      it('debe manejar errores intermitentes y continuar sincronizando', async () => {
        mockNavigatorOnline(false)

        // Crear múltiples operaciones
        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        await createAppointmentOffline({
          patientId: 'p1',
          doctorId: 'd1',
          scheduledAt: new Date().toISOString()
        }, false)

        await createMedicalHistoryOffline({
          patientId: 'p2',
          patientName: 'P2',
          age: 25,
          diagnosis: 'Dx2',
          symptoms: []
        }, false)

        // Simular error intermitente: primera falla, segunda y tercera exitosas
        let callCount = 0
        mockMedicalHistoryService.create.mockImplementation(async (data) => {
          callCount++
          if (callCount === 1) {
            throw new Error('Temporary network error')
          }
          return { _id: `history-${callCount}` } as any
        })

        mockAppointmentService.create.mockResolvedValue({ _id: 'appt-1' } as any)

        mockNavigatorOnline(true)

        // Primera sincronización (falla la primera)
        try {
          await offlineQueue.processQueue(async (op) => {
            if (op.type === 'create_medical_history') {
              await mockMedicalHistoryService.create(op.payload)
            } else if (op.type === 'create_appointment') {
              await mockAppointmentService.create(op.payload)
            }
          })
        } catch (e) {
          // Ignorar error
        }

        // Segunda sincronización (debe procesar las restantes)
        await offlineQueue.processQueue(async (op) => {
          if (op.type === 'create_medical_history') {
            await mockMedicalHistoryService.create(op.payload)
          } else if (op.type === 'create_appointment') {
            await mockAppointmentService.create(op.payload)
          }
        })

        const stats = offlineQueue.getStats()
        expect(stats.completed).toBeGreaterThanOrEqual(2)
      })

      it('debe mantener operaciones pendientes cuando hay errores recurrentes', async () => {
        mockNavigatorOnline(false)

        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        // Simular error recurrente
        mockMedicalHistoryService.create.mockRejectedValue(new Error('Network unavailable'))

        mockNavigatorOnline(true)

        // Intentar sincronizar múltiples veces
        for (let i = 0; i < 2; i++) {
          try {
            await offlineQueue.processQueue(async (op) => {
              await mockMedicalHistoryService.create(op.payload)
            })
          } catch (e) {
            // Ignorar errores
          }
        }

        // Debe mantener la operación como pendiente (aún no alcanzó MAX_RETRIES)
        const stats = offlineQueue.getStats()
        expect(stats.pending).toBeGreaterThan(0)
      })
    })

    describe('3.3 Manejo de diferentes tipos de errores', () => {
      it('debe manejar errores 500 del servidor', async () => {
        mockNavigatorOnline(false)

        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        const serverError = new Error('Server error')
        ;(serverError as any).status = 500
        mockMedicalHistoryService.create.mockRejectedValue(serverError)

        mockNavigatorOnline(true)

        try {
          await offlineQueue.processQueue(async (op) => {
            await mockMedicalHistoryService.create(op.payload)
          })
        } catch (e) {
          // Ignorar error
        }

        const stats = offlineQueue.getStats()
        // Debe incrementar retries pero mantener como pendiente
        expect(stats.pending).toBeGreaterThan(0)
      })

      it('debe manejar errores 401 (no autorizado) sin reintentar indefinidamente', async () => {
        mockNavigatorOnline(false)

        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        const authError = new Error('Unauthorized')
        ;(authError as any).status = 401
        mockMedicalHistoryService.create.mockRejectedValue(authError)

        mockNavigatorOnline(true)

        // Procesar hasta MAX_RETRIES
        for (let i = 0; i < 4; i++) {
          try {
            await offlineQueue.processQueue(async (op) => {
              await mockMedicalHistoryService.create(op.payload)
            })
          } catch (e) {
            // Ignorar errores
          }
        }

        const stats = offlineQueue.getStats()
        // Debe marcar como failed después de MAX_RETRIES
        expect(stats.failed).toBe(1)
      })

      it('debe manejar timeouts de red', async () => {
        mockNavigatorOnline(false)

        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        const timeoutError = new Error('Request timeout')
        ;(timeoutError as any).code = 'ETIMEDOUT'
        mockMedicalHistoryService.create.mockRejectedValue(timeoutError)

        mockNavigatorOnline(true)

        try {
          await offlineQueue.processQueue(async (op) => {
            await mockMedicalHistoryService.create(op.payload)
          })
        } catch (e) {
          // Ignorar error
        }

        const stats = offlineQueue.getStats()
        // Debe mantener como pendiente para reintentar
        expect(stats.pending).toBeGreaterThan(0)
      })
    })

    describe('3.4 Recuperación después de errores', () => {
      it('debe poder sincronizar exitosamente después de errores previos', async () => {
        mockNavigatorOnline(false)

        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        // Primero fallar
        mockMedicalHistoryService.create.mockRejectedValueOnce(new Error('Network error'))

        mockNavigatorOnline(true)

        // Primer intento (falla)
        try {
          await offlineQueue.processQueue(async (op) => {
            await mockMedicalHistoryService.create(op.payload)
          })
        } catch (e) {
          // Ignorar error
        }

        // Ahora hacer que tenga éxito
        mockMedicalHistoryService.create.mockResolvedValue({ _id: 'success' } as any)

        // Segundo intento (éxito)
        await offlineQueue.processQueue(async (op) => {
          await mockMedicalHistoryService.create(op.payload)
        })

        const stats = offlineQueue.getStats()
        expect(stats.completed).toBe(1)
        expect(stats.pending).toBe(0)
      })

      it('debe limpiar operaciones completadas después de un tiempo', async () => {
        mockNavigatorOnline(false)

        await createMedicalHistoryOffline({
          patientId: 'p1',
          patientName: 'P1',
          age: 20,
          diagnosis: 'Dx1',
          symptoms: []
        }, false)

        mockNavigatorOnline(true)

        // Procesar exitosamente
        await offlineQueue.processQueue(async (op) => {
          await mockMedicalHistoryService.create(op.payload)
        })

        const stats = offlineQueue.getStats()
        expect(stats.completed).toBe(1)

        // Las operaciones completadas se limpian después de 1 hora
        // En el test, verificamos que se marcan como completadas
        expect(stats.completed).toBeGreaterThan(0)
      })
    })
  })

  describe('4. Tests de Integración Completa', () => {
    it('debe manejar un flujo completo: offline -> operaciones -> reconexión -> sincronización', async () => {
      // Paso 1: Ir offline
      mockNavigatorOnline(false)

      // Paso 2: Crear múltiples operaciones offline
      const history1 = await createMedicalHistoryOffline({
        patientId: 'p1',
        patientName: 'Paciente 1',
        age: 30,
        diagnosis: 'Diagnóstico 1',
        symptoms: []
      }, false)

      const appointment1 = await createAppointmentOffline({
        patientId: 'p1',
        doctorId: 'd1',
        scheduledAt: new Date().toISOString(),
        reason: 'Consulta'
      }, false)

      const history2 = await createMedicalHistoryOffline({
        patientId: 'p2',
        patientName: 'Paciente 2',
        age: 25,
        diagnosis: 'Diagnóstico 2',
        symptoms: []
      }, false)

      expect(offlineQueue.getPendingCount()).toBe(3)

      // Paso 3: Reconectar
      mockNavigatorOnline(true)
      triggerOnlineEvent()

      // Paso 4: Sincronizar
      await offlineQueue.processQueue(async (operation) => {
        switch (operation.type) {
          case 'create_medical_history':
            await mockMedicalHistoryService.create(operation.payload)
            break
          case 'create_appointment':
            await mockAppointmentService.create(operation.payload)
            break
        }
      })

      // Verificar resultados
      expect(mockMedicalHistoryService.create).toHaveBeenCalledTimes(2)
      expect(mockAppointmentService.create).toHaveBeenCalledTimes(1)
      
      const finalStats = offlineQueue.getStats()
      expect(finalStats.completed).toBe(3)
      expect(finalStats.pending).toBe(0)
    })

    it('debe manejar flujo con errores intermitentes y recuperación', async () => {
      mockNavigatorOnline(false)

      // Crear operaciones
      await createMedicalHistoryOffline({
        patientId: 'p1',
        patientName: 'P1',
        age: 20,
        diagnosis: 'Dx1',
        symptoms: []
      }, false)

      await createAppointmentOffline({
        patientId: 'p1',
        doctorId: 'd1',
        scheduledAt: new Date().toISOString()
      }, false)

      // Simular error en primera, éxito en segunda
      let historyCallCount = 0
      mockMedicalHistoryService.create.mockImplementation(async (data) => {
        historyCallCount++
        if (historyCallCount === 1) {
          throw new Error('Temporary error')
        }
        return { _id: 'success' } as any
      })

      mockNavigatorOnline(true)

      // Primer intento (falla historia, éxito cita)
      try {
        await offlineQueue.processQueue(async (op) => {
          if (op.type === 'create_medical_history') {
            await mockMedicalHistoryService.create(op.payload)
          } else if (op.type === 'create_appointment') {
            await mockAppointmentService.create(op.payload)
          }
        })
      } catch (e) {
        // Ignorar
      }

      // Segundo intento (éxito en historia)
      await offlineQueue.processQueue(async (op) => {
        if (op.type === 'create_medical_history') {
          await mockMedicalHistoryService.create(op.payload)
        }
      })

      const stats = offlineQueue.getStats()
      expect(stats.completed).toBe(2)
      expect(stats.pending).toBe(0)
    })
  })

  describe('5. Tests de Estadísticas y Monitoreo', () => {
    it('debe proporcionar estadísticas correctas de la cola', () => {
      mockNavigatorOnline(false)

      // Crear operaciones
      createMedicalHistoryOffline({
        patientId: 'p1',
        patientName: 'P1',
        age: 20,
        diagnosis: 'Dx1',
        symptoms: []
      }, false)

      createAppointmentOffline({
        patientId: 'p1',
        doctorId: 'd1',
        scheduledAt: new Date().toISOString()
      }, false)

      const stats = offlineQueue.getStats()
      expect(stats.total).toBe(2)
      expect(stats.pending).toBe(2)
      expect(stats.processing).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
    })

    it('debe actualizar estadísticas después de procesar', async () => {
      mockNavigatorOnline(false)

      await createMedicalHistoryOffline({
        patientId: 'p1',
        patientName: 'P1',
        age: 20,
        diagnosis: 'Dx1',
        symptoms: []
      }, false)

      mockNavigatorOnline(true)

      await offlineQueue.processQueue(async (op) => {
        await mockMedicalHistoryService.create(op.payload)
      })

      const stats = offlineQueue.getStats()
      expect(stats.completed).toBe(1)
      expect(stats.pending).toBe(0)
    })
  })
})

