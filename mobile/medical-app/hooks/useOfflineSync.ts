/**
 * Hook para manejar sincronización offline
 * Detecta cuando vuelve la conexión y sincroniza operaciones pendientes
 */

import { useEffect, useState } from 'react'
import { useNetworkStatus } from './useNetworkStatus'
import { useAppStore } from '@/store/useAppStore'
import { offlineQueue, type OfflineOperation } from '@/lib/services/offlineQueue'
import { medicalHistoryService } from '@/lib/api/services/medicalHistoryService'
import { appointmentService } from '@/lib/api/services/appointmentService'
import { alertService } from '@/lib/api/services/alertService'
import { fileUploadService } from '@/lib/api/services/fileUploadService'
import { prescriptionService } from '@/lib/api/services/prescriptionService'
import { referralService } from '@/lib/api/services/referralService'
import { emergencyService } from '@/lib/api/services/emergencyService'
import { chatService } from '@/lib/api/services/chatService'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/config'
import { toast } from 'sonner'

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus()
  const setPendingSync = useAppStore((state) => state.setPendingSync)
  const [isSyncing, setIsSyncing] = useState(false)
  const [queueStats, setQueueStats] = useState(offlineQueue.getStats())

  // Suscribirse a cambios en la cola
  useEffect(() => {
    const unsubscribe = offlineQueue.subscribe((operations) => {
      setQueueStats(offlineQueue.getStats())
    })

    return unsubscribe
  }, [])

  // Sincronizar cuando vuelve la conexión
  useEffect(() => {
    if (isOnline && !isSyncing) {
      const pendingCount = offlineQueue.getPendingCount()
      if (pendingCount > 0) {
        syncPendingOperations()
      }
    }
  }, [isOnline, isSyncing])

  /**
   * Procesador de operaciones offline
   */
  const processOperation = async (operation: OfflineOperation): Promise<void> => {
    switch (operation.type) {
      case 'create_medical_history':
        await medicalHistoryService.create(operation.payload)
        break

      case 'update_medical_history':
        await medicalHistoryService.update(operation.payload.id, operation.payload.data)
        break

      case 'create_appointment':
        await appointmentService.create(operation.payload)
        break

      case 'update_appointment':
        await appointmentService.update(operation.payload.id, operation.payload.data)
        break

      case 'cancel_appointment':
        await appointmentService.cancel(operation.payload.id, operation.payload.reason)
        break

      case 'reschedule_appointment':
        await appointmentService.reschedule(
          operation.payload.id,
          operation.payload.newDate,
          operation.payload.durationMinutes
        )
        break

      case 'acknowledge_alert':
        await alertService.acknowledge(operation.payload.alertId)
        break

      case 'upload_images':
        if (operation.payload.files && operation.payload.files.length > 0) {
          await fileUploadService.uploadImages(operation.payload.files)
        }
        break

      case 'upload_audio':
        if (operation.payload.file) {
          await fileUploadService.uploadAudio(operation.payload.file)
        }
        break

      case 'create_prescription':
        await prescriptionService.create(operation.payload)
        break

      case 'cancel_prescription':
        await prescriptionService.cancel(operation.payload.id)
        break

      case 'create_referral':
        await referralService.create(operation.payload)
        break

      case 'create_emergency':
        await emergencyService.create(operation.payload)
        break

      case 'create_lab_order':
        await apiClient.post(API_ENDPOINTS.lab.createOrder, operation.payload)
        break

      case 'create_chat_message':
        await chatService.sendMessage(
          operation.payload.sessionId,
          operation.payload.message,
        )
        break

      default:
        console.warn(`Tipo de operación desconocido: ${operation.type}`)
    }
  }

  /**
   * Sincronizar operaciones pendientes
   */
  const syncPendingOperations = async () => {
    const pendingCount = offlineQueue.getPendingCount()
    if (pendingCount === 0 || isSyncing) {
      return
    }

    setIsSyncing(true)
    setPendingSync(true)

    try {
      await offlineQueue.processQueue(processOperation)
      
      const stats = offlineQueue.getStats()
      if (stats.pending === 0) {
        toast.success('Sincronización completada')
      } else {
        toast.warning(`${stats.pending} operaciones pendientes de sincronizar`)
      }
    } catch (error: any) {
      console.error('Error en sincronización:', error)
      toast.error('Error al sincronizar operaciones offline')
    } finally {
      setIsSyncing(false)
      setPendingSync(false)
    }
  }

  /**
   * Sincronizar manualmente
   */
  const syncNow = async () => {
    if (!isOnline) {
      toast.error('No hay conexión a internet')
      return
    }
    await syncPendingOperations()
  }

  return {
    isSyncing,
    queueStats,
    syncNow,
    pendingCount: queueStats.pending
  }
}

