/**
 * notificationService
 * ═══════════════════════════════════════════════════════════════════
 * Servicio de notificaciones locales médicas usando @capacitor/local-notifications.
 *
 * Canales Android (requeridos en Android 8+):
 *  - alerts      : Alertas críticas (importancia URGENT)
 *  - reminders   : Recordatorios de medicación (importancia HIGH)
 *  - sync        : Sincronización offline (importancia DEFAULT)
 *
 * Funciones:
 *  - init()                    Solicita permisos + crea canales
 *  - scheduleReminder()        Recordatorio de medicación/cita
 *  - sendAlert()               Alerta inmediata (urgency critical/high)
 *  - cancelNotification()      Cancela una notificación por ID
 *  - cancelAll()               Cancela todas las notificaciones pendientes
 */

import type { LocalNotificationSchema } from '@capacitor/local-notifications'

const isNative = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()

// IDs de notificación — rango fijo por categoría para evitar colisiones
const ID_RANGE = {
  ALERTS: 1000,      // 1000–1999
  REMINDERS: 2000,   // 2000–2999
  SYNC: 3000,        // 3000–3999
}

let _nextAlertId = ID_RANGE.ALERTS
let _nextReminderId = ID_RANGE.REMINDERS
let _initialized = false

// ── Canales Android ──────────────────────────────────────────────────────

const CHANNELS = [
  {
    id: 'respicare-alerts',
    name: 'Alertas Médicas',
    description: 'Alertas críticas del sistema respiratorio',
    importance: 5 as const,   // IMPORTANCE_HIGH (notificación con sonido y heads-up)
    visibility: 1 as const,   // VISIBILITY_PUBLIC
    vibration: true,
    lights: true,
    lightColor: '#FF3B30',    // Rojo para alertas críticas
  },
  {
    id: 'respicare-reminders',
    name: 'Recordatorios',
    description: 'Recordatorios de medicación y citas médicas',
    importance: 4 as const,   // IMPORTANCE_DEFAULT
    visibility: 1 as const,
    vibration: true,
    lights: true,
    lightColor: '#34C759',    // Verde para recordatorios
  },
  {
    id: 'respicare-sync',
    name: 'Sincronización',
    description: 'Notificaciones de sincronización offline',
    importance: 2 as const,   // IMPORTANCE_LOW (sin sonido)
    visibility: 0 as const,   // VISIBILITY_PRIVATE
    vibration: false,
    lights: false,
  },
]

// ── Inicialización ───────────────────────────────────────────────────────

async function init(): Promise<boolean> {
  if (!isNative()) return false
  if (_initialized) return true

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // Solicitar permiso (Android 13+ requiere permiso explícito)
    const permission = await LocalNotifications.requestPermissions()
    if (permission.display !== 'granted') {
      console.warn('[notificationService] Permiso de notificaciones denegado.')
      return false
    }

    // Crear canales (Android 8+ / API 26+)
    for (const channel of CHANNELS) {
      await LocalNotifications.createChannel(channel)
    }

    // Listener para cuando el usuario toca una notificación
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const { notification } = action
      // Disparar evento para que los componentes puedan reaccionar
      window.dispatchEvent(
        new CustomEvent('notification:tapped', { detail: notification }),
      )
    })

    _initialized = true
    return true
  } catch (err) {
    console.error('[notificationService] Error al inicializar:', err)
    return false
  }
}

// ── Alerta inmediata ─────────────────────────────────────────────────────

export interface AlertOptions {
  title: string
  body: string
  /** 'critical' muestra heads-up + sonido. 'high' muestra heads-up. */
  urgency?: 'critical' | 'high' | 'medium'
  /** Datos extra para la acción al tocar */
  extra?: Record<string, unknown>
}

async function sendAlert(options: AlertOptions): Promise<number | null> {
  if (!isNative()) {
    // Fallback web: mostrar en consola (en producción usar toast)
    console.warn(`[ALERTA ${options.urgency?.toUpperCase() ?? 'MEDIUM'}] ${options.title}: ${options.body}`)
    return null
  }

  const ready = await init()
  if (!ready) return null

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const id = _nextAlertId++
    if (_nextAlertId >= ID_RANGE.REMINDERS) _nextAlertId = ID_RANGE.ALERTS

    const notification: LocalNotificationSchema = {
      id,
      title: options.title,
      body: options.body,
      channelId: 'respicare-alerts',
      smallIcon: 'ic_notification_alert',
      iconColor: options.urgency === 'critical' ? '#FF3B30' : '#FF9500',
      ongoing: options.urgency === 'critical', // Crítico no se descarta con deslizar
      autoCancel: options.urgency !== 'critical',
      extra: options.extra,
    }

    await LocalNotifications.schedule({ notifications: [notification] })
    return id
  } catch (err) {
    console.error('[notificationService] Error al enviar alerta:', err)
    return null
  }
}

// ── Recordatorio programado ──────────────────────────────────────────────

export interface ReminderOptions {
  title: string
  body: string
  /** Fecha y hora exacta para disparar el recordatorio */
  at: Date
  /** Si debe repetirse (requiere `every`) */
  repeats?: boolean
  every?: 'day' | 'week' | 'month' | 'hour' | 'minute'
  extra?: Record<string, unknown>
}

async function scheduleReminder(options: ReminderOptions): Promise<number | null> {
  if (!isNative()) return null

  const ready = await init()
  if (!ready) return null

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const id = _nextReminderId++
    if (_nextReminderId >= ID_RANGE.SYNC) _nextReminderId = ID_RANGE.REMINDERS

    const notification: LocalNotificationSchema = {
      id,
      title: options.title,
      body: options.body,
      channelId: 'respicare-reminders',
      smallIcon: 'ic_notification_reminder',
      iconColor: '#34C759',
      autoCancel: true,
      schedule: {
        at: options.at,
        repeats: options.repeats ?? false,
        every: options.every,
      },
      extra: options.extra,
    }

    await LocalNotifications.schedule({ notifications: [notification] })
    return id
  } catch (err) {
    console.error('[notificationService] Error al programar recordatorio:', err)
    return null
  }
}

// ── Recordatorios médicos predefinidos ───────────────────────────────────

async function scheduleMedicationReminder(
  medicationName: string,
  hour: number,
  minute: number,
): Promise<number | null> {
  const at = new Date()
  at.setHours(hour, minute, 0, 0)
  // Si ya pasó hoy, programar para mañana
  if (at <= new Date()) {
    at.setDate(at.getDate() + 1)
  }

  return scheduleReminder({
    title: '💊 Recordatorio de medicación',
    body: `Es hora de tomar ${medicationName}`,
    at,
    repeats: true,
    every: 'day',
    extra: { type: 'medication', name: medicationName },
  })
}

async function scheduleAppointmentReminder(
  doctorName: string,
  appointmentDate: Date,
  minutesBefore = 60,
): Promise<number | null> {
  const reminderTime = new Date(appointmentDate.getTime() - minutesBefore * 60 * 1000)

  return scheduleReminder({
    title: '📅 Cita médica próxima',
    body: `Tienes cita con ${doctorName} en ${minutesBefore} minutos`,
    at: reminderTime,
    extra: { type: 'appointment', doctor: doctorName },
  })
}

// ── Cancelar notificaciones ──────────────────────────────────────────────

async function cancelNotification(id: number): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id }] })
  } catch (err) {
    console.error('[notificationService] Error al cancelar notificación:', err)
  }
}

async function cancelAll(): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      })
    }
  } catch (err) {
    console.error('[notificationService] Error al cancelar todas las notificaciones:', err)
  }
}

// ── API pública ──────────────────────────────────────────────────────────

export const NotificationService = {
  init,
  sendAlert,
  scheduleReminder,
  scheduleMedicationReminder,
  scheduleAppointmentReminder,
  cancelNotification,
  cancelAll,
}