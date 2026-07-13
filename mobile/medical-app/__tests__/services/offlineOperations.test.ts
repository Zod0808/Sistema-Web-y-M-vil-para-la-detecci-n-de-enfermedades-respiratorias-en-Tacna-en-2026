jest.mock('@/lib/services/sqliteDatabase', () => ({
  sqliteDatabase: {
    deleteOldCompleted: jest.fn().mockResolvedValue(undefined),
    getAllOperations: jest.fn().mockResolvedValue([]),
    upsertOperation: jest.fn().mockResolvedValue(undefined),
    deleteOperation: jest.fn().mockResolvedValue(undefined),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    deleteCompleted: jest.fn().mockResolvedValue(undefined),
    deleteAll: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('@/lib/api/services/medicalHistoryService', () => ({
  medicalHistoryService: { create: jest.fn(), update: jest.fn() },
}))
jest.mock('@/lib/api/services/appointmentService', () => ({
  appointmentService: { create: jest.fn(), cancel: jest.fn(), reschedule: jest.fn(), update: jest.fn() },
}))
jest.mock('@/lib/api/services/alertService', () => ({
  alertService: { acknowledge: jest.fn() },
}))
jest.mock('@/lib/api/services/prescriptionService', () => ({
  prescriptionService: { create: jest.fn() },
}))
jest.mock('@/lib/api/services/referralService', () => ({
  referralService: { create: jest.fn() },
}))
jest.mock('@/lib/api/services/emergencyService', () => ({
  emergencyService: { create: jest.fn() },
}))

import {
  createMedicalHistoryOffline,
  updateMedicalHistoryOffline,
  createAppointmentOffline,
  cancelAppointmentOffline,
  rescheduleAppointmentOffline,
  updateAppointmentOffline,
  acknowledgeAlertOffline,
  createPrescriptionOffline,
  createReferralOffline,
  createEmergencyOffline,
} from '@/lib/services/offlineOperations'
import { offlineQueue } from '@/lib/services/offlineQueue'
import { medicalHistoryService } from '@/lib/api/services/medicalHistoryService'
import { appointmentService } from '@/lib/api/services/appointmentService'
import { alertService } from '@/lib/api/services/alertService'
import { prescriptionService } from '@/lib/api/services/prescriptionService'
import { referralService } from '@/lib/api/services/referralService'
import { emergencyService } from '@/lib/api/services/emergencyService'

const networkErr = () => Object.assign(new Error('offline'), { status: 0 })

describe('offlineOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    offlineQueue.clearAll()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  describe('createMedicalHistoryOffline', () => {
    it('online → calls the service and returns its id', async () => {
      ;(medicalHistoryService.create as jest.Mock).mockResolvedValueOnce({ _id: 'mh-1' })
      const r = await createMedicalHistoryOffline({} as any, true)
      expect(r).toEqual({ id: 'mh-1', isOffline: false })
    })

    it('offline → enqueues and returns the op id', async () => {
      const r = await createMedicalHistoryOffline({} as any, false)
      expect(r.isOffline).toBe(true)
      expect(medicalHistoryService.create).not.toHaveBeenCalled()
      expect(offlineQueue.getPendingCount()).toBe(1)
    })

    it('online but service throws a network error → falls back to queue', async () => {
      ;(medicalHistoryService.create as jest.Mock).mockRejectedValueOnce(networkErr())
      const r = await createMedicalHistoryOffline({} as any, true)
      expect(r.isOffline).toBe(true)
      expect(offlineQueue.getPendingCount()).toBe(1)
    })

    it('online but service throws a non-network error → rethrows', async () => {
      ;(medicalHistoryService.create as jest.Mock).mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))
      await expect(createMedicalHistoryOffline({} as any, true)).rejects.toThrow('boom')
    })
  })

  describe('updateMedicalHistoryOffline', () => {
    it('online success', async () => {
      ;(medicalHistoryService.update as jest.Mock).mockResolvedValueOnce(undefined)
      expect(await updateMedicalHistoryOffline('id', {}, true)).toEqual({ success: true, isOffline: false })
    })
    it('offline → queued', async () => {
      const r = await updateMedicalHistoryOffline('id', {}, false)
      expect(r).toEqual({ success: true, isOffline: true })
      expect(offlineQueue.getPendingCount()).toBe(1)
    })
    it('online network error → queued', async () => {
      ;(medicalHistoryService.update as jest.Mock).mockRejectedValueOnce(networkErr())
      const r = await updateMedicalHistoryOffline('id', {}, true)
      expect(r.isOffline).toBe(true)
    })
  })

  describe('appointment wrappers', () => {
    it('createAppointmentOffline: online → service, offline → queue', async () => {
      ;(appointmentService.create as jest.Mock).mockResolvedValueOnce({ _id: 'apt-1' })
      expect(await createAppointmentOffline({} as any, true)).toEqual({ id: 'apt-1', isOffline: false })
      const r = await createAppointmentOffline({} as any, false)
      expect(r.isOffline).toBe(true)
    })

    it('cancelAppointmentOffline: forwards reason to service or queue', async () => {
      ;(appointmentService.cancel as jest.Mock).mockResolvedValueOnce(undefined)
      await cancelAppointmentOffline('a', 'no vengo', true)
      expect(appointmentService.cancel).toHaveBeenCalledWith('a', 'no vengo')
      await cancelAppointmentOffline('b', 'no', false)
      expect(offlineQueue.getPendingCount()).toBe(1)
    })

    it('rescheduleAppointmentOffline: online network error fallback', async () => {
      ;(appointmentService.reschedule as jest.Mock).mockRejectedValueOnce(networkErr())
      const r = await rescheduleAppointmentOffline('a', '2027-01-01', 30, true)
      expect(r.isOffline).toBe(true)
    })

    it('updateAppointmentOffline: offline branch queues without hitting service', async () => {
      await updateAppointmentOffline('a', { doctorId: 'x' }, false)
      expect(appointmentService.update).not.toHaveBeenCalled()
      expect(offlineQueue.getPendingCount()).toBe(1)
    })
  })

  describe('other wrappers', () => {
    it('acknowledgeAlertOffline', async () => {
      ;(alertService.acknowledge as jest.Mock).mockResolvedValueOnce(undefined)
      expect(await acknowledgeAlertOffline('a1', true)).toEqual({ success: true, isOffline: false })
      expect(await acknowledgeAlertOffline('a2', false)).toEqual({ success: true, isOffline: true })
    })

    it('createPrescriptionOffline', async () => {
      ;(prescriptionService.create as jest.Mock).mockResolvedValueOnce({ _id: 'rx-1' })
      expect(await createPrescriptionOffline({} as any, true)).toEqual({ id: 'rx-1', isOffline: false })
      expect((await createPrescriptionOffline({} as any, false)).isOffline).toBe(true)
    })

    it('createReferralOffline', async () => {
      ;(referralService.create as jest.Mock).mockResolvedValueOnce({ _id: 'rf-1' })
      expect(await createReferralOffline({} as any, true)).toEqual({ id: 'rf-1', isOffline: false })
    })

    it('createEmergencyOffline: rethrows non-network errors', async () => {
      ;(emergencyService.create as jest.Mock).mockRejectedValueOnce(Object.assign(new Error('5xx'), { status: 500 }))
      await expect(createEmergencyOffline({} as any, true)).rejects.toThrow('5xx')
    })
  })
})
