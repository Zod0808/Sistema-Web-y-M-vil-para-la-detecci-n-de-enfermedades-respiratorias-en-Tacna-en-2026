/**
 * Utilidades para operaciones offline
 * Wrappers para servicios que manejan automáticamente el modo offline
 */

import { offlineQueue } from './offlineQueue'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import type { CreateMedicalHistoryRequest } from '@/lib/api/services/medicalHistoryService'
import type { CreateAppointmentRequest } from '@/lib/api/services/appointmentService'
import type { CreatePrescriptionRequest } from '@/lib/api/services/prescriptionService'
import type { CreateReferralRequest } from '@/lib/api/services/referralService'
import type { CreateEmergencyRequest } from '@/lib/api/services/emergencyService'
import type { MedicalHistory, Appointment } from '@/lib/types'
import { medicalHistoryService } from '@/lib/api/services/medicalHistoryService'
import { appointmentService } from '@/lib/api/services/appointmentService'
import { alertService } from '@/lib/api/services/alertService'
import { prescriptionService } from '@/lib/api/services/prescriptionService'
import { referralService } from '@/lib/api/services/referralService'
import { emergencyService } from '@/lib/api/services/emergencyService'

/**
 * Crear historia médica (con soporte offline)
 */
export async function createMedicalHistoryOffline(
  data: CreateMedicalHistoryRequest,
  isOnline: boolean
): Promise<{ id: string; isOffline: boolean }> {
  if (isOnline) {
    try {
      const history = await medicalHistoryService.create(data)
      return { id: history._id, isOffline: false }
    } catch (error: any) {
      // Si falla, agregar a cola offline
      if (error.status === 0 || !navigator.onLine) {
        const operationId = offlineQueue.enqueue('create_medical_history', data)
        return { id: operationId, isOffline: true }
      }
      throw error
    }
  } else {
    // Agregar directamente a cola offline
    const operationId = offlineQueue.enqueue('create_medical_history', data)
    return { id: operationId, isOffline: true }
  }
}

/**
 * Actualizar historia médica (con soporte offline)
 */
export async function updateMedicalHistoryOffline(
  id: string,
  data: Partial<CreateMedicalHistoryRequest>,
  isOnline: boolean
): Promise<{ success: boolean; isOffline: boolean }> {
  if (isOnline) {
    try {
      await medicalHistoryService.update(id, data)
      return { success: true, isOffline: false }
    } catch (error: any) {
      if (error.status === 0 || !navigator.onLine) {
        offlineQueue.enqueue('update_medical_history', { id, data })
        return { success: true, isOffline: true }
      }
      throw error
    }
  } else {
    offlineQueue.enqueue('update_medical_history', { id, data })
    return { success: true, isOffline: true }
  }
}

/**
 * Crear cita (con soporte offline)
 */
export async function createAppointmentOffline(
  data: CreateAppointmentRequest,
  isOnline: boolean
): Promise<{ id: string; isOffline: boolean }> {
  if (isOnline) {
    try {
      const appointment = await appointmentService.create(data)
      return { id: appointment._id, isOffline: false }
    } catch (error: any) {
      if (error.status === 0 || !navigator.onLine) {
        const operationId = offlineQueue.enqueue('create_appointment', data)
        return { id: operationId, isOffline: true }
      }
      throw error
    }
  } else {
    const operationId = offlineQueue.enqueue('create_appointment', data)
    return { id: operationId, isOffline: true }
  }
}

/**
 * Cancelar cita (con soporte offline)
 */
export async function cancelAppointmentOffline(
  id: string,
  reason: string,
  isOnline: boolean
): Promise<{ success: boolean; isOffline: boolean }> {
  if (isOnline) {
    try {
      await appointmentService.cancel(id, reason)
      return { success: true, isOffline: false }
    } catch (error: any) {
      if (error.status === 0 || !navigator.onLine) {
        offlineQueue.enqueue('cancel_appointment', { id, reason })
        return { success: true, isOffline: true }
      }
      throw error
    }
  } else {
    offlineQueue.enqueue('cancel_appointment', { id, reason })
    return { success: true, isOffline: true }
  }
}

/**
 * Reprogramar cita (con soporte offline)
 */
export async function rescheduleAppointmentOffline(
  id: string,
  newDate: string,
  durationMinutes: number | undefined,
  isOnline: boolean
): Promise<{ success: boolean; isOffline: boolean }> {
  if (isOnline) {
    try {
      await appointmentService.reschedule(id, newDate, durationMinutes)
      return { success: true, isOffline: false }
    } catch (error: any) {
      if (error.status === 0 || !navigator.onLine) {
        offlineQueue.enqueue('reschedule_appointment', { id, newDate, durationMinutes })
        return { success: true, isOffline: true }
      }
      throw error
    }
  } else {
    offlineQueue.enqueue('reschedule_appointment', { id, newDate, durationMinutes })
    return { success: true, isOffline: true }
  }
}

/**
 * Reconocer alerta (con soporte offline)
 */
export async function acknowledgeAlertOffline(
  alertId: string,
  isOnline: boolean
): Promise<{ success: boolean; isOffline: boolean }> {
  if (isOnline) {
    try {
      await alertService.acknowledge(alertId)
      return { success: true, isOffline: false }
    } catch (error: any) {
      if (error.status === 0 || !navigator.onLine) {
        offlineQueue.enqueue('acknowledge_alert', { alertId })
        return { success: true, isOffline: true }
      }
      throw error
    }
  } else {
    offlineQueue.enqueue('acknowledge_alert', { alertId })
    return { success: true, isOffline: true }
  }
}

/**
 * Crear receta (con soporte offline)
 */
export async function createPrescriptionOffline(
  data: CreatePrescriptionRequest,
  isOnline: boolean
): Promise<{ id: string; isOffline: boolean }> {
  if (isOnline) {
    try {
      const prescription = await prescriptionService.create(data)
      return { id: prescription._id, isOffline: false }
    } catch (error: any) {
      if (error.status === 0 || !navigator.onLine) {
        const operationId = offlineQueue.enqueue('create_prescription', data)
        return { id: operationId, isOffline: true }
      }
      throw error
    }
  } else {
    const operationId = offlineQueue.enqueue('create_prescription', data)
    return { id: operationId, isOffline: true }
  }
}

/**
 * Crear referido médico (con soporte offline)
 */
export async function createReferralOffline(
  data: CreateReferralRequest,
  isOnline: boolean
): Promise<{ id: string; isOffline: boolean }> {
  if (isOnline) {
    try {
      const referral = await referralService.create(data)
      return { id: referral._id, isOffline: false }
    } catch (error: any) {
      if (error.status === 0 || !navigator.onLine) {
        const operationId = offlineQueue.enqueue('create_referral', data)
        return { id: operationId, isOffline: true }
      }
      throw error
    }
  } else {
    const operationId = offlineQueue.enqueue('create_referral', data)
    return { id: operationId, isOffline: true }
  }
}

/**
 * Crear emergencia (con soporte offline)
 * Nota: emergencias offline se envían en cuanto vuelve la conexión.
 */
export async function createEmergencyOffline(
  data: CreateEmergencyRequest,
  isOnline: boolean
): Promise<{ id: string; isOffline: boolean }> {
  if (isOnline) {
    try {
      const emergency = await emergencyService.create(data)
      return { id: emergency._id, isOffline: false }
    } catch (error: any) {
      if (error.status === 0 || !navigator.onLine) {
        const operationId = offlineQueue.enqueue('create_emergency', data)
        return { id: operationId, isOffline: true }
      }
      throw error
    }
  } else {
    const operationId = offlineQueue.enqueue('create_emergency', data)
    return { id: operationId, isOffline: true }
  }
}

/**
 * Actualizar cita (con soporte offline)
 */
export async function updateAppointmentOffline(
  id: string,
  data: Partial<CreateAppointmentRequest>,
  isOnline: boolean
): Promise<{ success: boolean; isOffline: boolean }> {
  if (isOnline) {
    try {
      await appointmentService.update(id, data)
      return { success: true, isOffline: false }
    } catch (error: any) {
      if (error.status === 0 || !navigator.onLine) {
        offlineQueue.enqueue('update_appointment', { id, data })
        return { success: true, isOffline: true }
      }
      throw error
    }
  } else {
    offlineQueue.enqueue('update_appointment', { id, data })
    return { success: true, isOffline: true }
  }
}

