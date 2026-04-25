/**
 * Servicio de Telemedicina Completo
 * 
 * Integración completa con proveedores de video (Jitsi, Zoom, etc.)
 * Incluye: sala de espera virtual, compartir pantalla, grabación de sesiones
 */

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/config'

export type VideoProvider = 'jitsi' | 'zoom' | 'custom'
export type CallStatus = 'scheduled' | 'waiting' | 'active' | 'ended' | 'cancelled'
export type RecordingStatus = 'not_started' | 'recording' | 'paused' | 'stopped' | 'processing'

export interface TelemedicineCall {
  id: string
  appointmentId: string
  patientId: string
  doctorId: string
  status: CallStatus
  scheduledAt?: string
  startedAt?: string
  endedAt?: string
  roomId: string
  roomName: string
  token?: string
  provider: VideoProvider
  waitingRoomEnabled: boolean
  screenSharingEnabled: boolean
  recordingEnabled: boolean
  recordingStatus?: RecordingStatus
  recordingUrl?: string
  metadata?: Record<string, any>
}

export interface TelemedicineCallOptions {
  appointmentId: string
  doctorId: string
  patientId: string
  scheduledAt?: string
  provider?: VideoProvider
  waitingRoomEnabled?: boolean
  screenSharingEnabled?: boolean
  recordingEnabled?: boolean
  notes?: string
}

export interface WaitingRoomParticipant {
  id: string
  name: string
  role: 'patient' | 'doctor'
  joinedAt: string
  isReady: boolean
}

export interface ScreenShareOptions {
  enabled: boolean
  participantId: string
  streamId?: string
}

export interface RecordingOptions {
  enabled: boolean
  quality?: 'low' | 'medium' | 'high'
  includeAudio?: boolean
  includeVideo?: boolean
}

class TelemedicineService {
  private currentCall: TelemedicineCall | null = null
  private waitingRoomParticipants: WaitingRoomParticipant[] = []
  private screenShareActive: ScreenShareOptions | null = null
  private recordingActive: RecordingOptions | null = null

  // Configuración de proveedores
  private readonly providers = {
    jitsi: {
      baseUrl: process.env.NEXT_PUBLIC_JITSI_SERVER_URL || 'https://meet.jit.si',
      appName: 'RespiCare',
    },
    zoom: {
      baseUrl: process.env.NEXT_PUBLIC_ZOOM_SERVER_URL || 'https://zoom.us',
      apiKey: process.env.NEXT_PUBLIC_ZOOM_API_KEY,
    },
    custom: {
      baseUrl: process.env.NEXT_PUBLIC_CUSTOM_VIDEO_SERVER_URL,
    },
  }

  /**
   * Solicita permisos necesarios (cámara y micrófono)
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        // Detener el stream inmediatamente, solo verificamos permisos
        stream.getTracks().forEach(track => track.stop())
        return true
      }
      return false
    } catch (error) {
      console.error('Error requesting permissions:', error)
      return false
    }
  }

  /**
   * Crea una nueva llamada de telemedicina
   */
  async createCall(options: TelemedicineCallOptions): Promise<TelemedicineCall | null> {
    try {
      const response = await apiClient.post<any>('/api/v1/telemedicine/calls', {
        ...options,
        provider: options.provider || 'jitsi',
        waitingRoomEnabled: options.waitingRoomEnabled ?? true,
        screenSharingEnabled: options.screenSharingEnabled ?? true,
        recordingEnabled: options.recordingEnabled ?? false,
      })

      if (response.data?.success && response.data?.data) {
        this.currentCall = response.data.data as TelemedicineCall
        return this.currentCall
      }

      return null
    } catch (error: any) {
      console.error('Error creating telemedicine call:', error)
      return null
    }
  }

  /**
   * Inicia una llamada existente
   */
  async startCall(callId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<any>(`/api/v1/telemedicine/calls/${callId}/start`)
      if (response.data?.success && response.data?.data) {
        this.currentCall = response.data.data as TelemedicineCall
        return true
      }
      return false
    } catch (error) {
      console.error('Error starting call:', error)
      return false
    }
  }

  /**
   * Finaliza una llamada
   */
  async endCall(callId: string): Promise<boolean> {
    try {
      // Detener grabación si está activa
      if (this.recordingActive?.enabled) {
        await this.stopRecording(callId)
      }

      const response = await apiClient.post<any>(`/api/v1/telemedicine/calls/${callId}/end`)
      if (response.data?.success) {
        if (this.currentCall?.id === callId) {
          this.currentCall = null
          this.waitingRoomParticipants = []
          this.screenShareActive = null
          this.recordingActive = null
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error ending call:', error)
      return false
    }
  }

  /**
   * Obtiene el token de acceso para la videollamada
   */
  async getCallToken(callId: string): Promise<string | null> {
    try {
      const response = await apiClient.get<any>(`/api/v1/telemedicine/calls/${callId}/token`)
      if (response.data?.success && response.data?.data?.token) {
        return response.data.data.token as string
      }
      return null
    } catch (error) {
      console.error('Error getting call token:', error)
      return null
    }
  }

  /**
   * Obtiene la URL de la videollamada según el proveedor
   */
  getCallUrl(call: TelemedicineCall, userRole: 'patient' | 'doctor'): string {
    const { provider, roomName, token } = call
    const config = this.providers[provider]

    switch (provider) {
      case 'jitsi':
        const jitsiUrl = `${config.baseUrl}/${encodeURIComponent(roomName)}`
        const params = new URLSearchParams()
        if (token) params.append('jwt', token)
        params.append('userInfo.displayName', userRole === 'doctor' ? 'Doctor' : 'Paciente')
        params.append('config.startWithVideoMuted', 'false')
        params.append('config.startWithAudioMuted', 'false')
        params.append('config.enableWelcomePage', call.waitingRoomEnabled ? 'true' : 'false')
        params.append('config.enableScreenSharing', call.screenSharingEnabled ? 'true' : 'false')
        params.append('config.enableRecording', call.recordingEnabled ? 'true' : 'false')
        return `${jitsiUrl}?${params.toString()}`

      case 'zoom':
        // Integración con Zoom SDK requeriría configuración adicional
        return `${config.baseUrl}/join?room=${roomName}&token=${token || ''}`

      case 'custom':
        return `${config.baseUrl}/room/${roomName}?token=${token || ''}`

      default:
        return ''
    }
  }

  /**
   * Abre la videollamada en nueva ventana
   */
  async joinCall(call: TelemedicineCall, userRole: 'patient' | 'doctor'): Promise<boolean> {
    try {
      const url = this.getCallUrl(call, userRole)
      if (!url) {
        console.error('No se pudo generar la URL de la llamada')
        return false
      }

      // Abrir en nueva ventana
      window.open(url, '_blank', 'noopener,noreferrer')
      return true
    } catch (error) {
      console.error('Error joining call:', error)
      return false
    }
  }

  /**
   * Sala de Espera Virtual
   */

  /**
   * Entra a la sala de espera
   */
  async joinWaitingRoom(
    callId: string,
    participant: Omit<WaitingRoomParticipant, 'joinedAt'>
  ): Promise<boolean> {
    try {
      const response = await apiClient.post<any>(
        `/api/v1/telemedicine/calls/${callId}/waiting-room/join`,
        participant
      )
      if (response.data?.success && response.data?.data) {
        this.waitingRoomParticipants = response.data.data.participants || []
        return true
      }
      return false
    } catch (error) {
      console.error('Error joining waiting room:', error)
      return false
    }
  }

  /**
   * Obtiene los participantes en la sala de espera
   */
  async getWaitingRoomParticipants(callId: string): Promise<WaitingRoomParticipant[]> {
    try {
      const response = await apiClient.get<any>(
        `/api/v1/telemedicine/calls/${callId}/waiting-room/participants`
      )
      if (response.data?.success && response.data?.data) {
        this.waitingRoomParticipants = response.data.data.participants || []
        return this.waitingRoomParticipants
      }
      return []
    } catch (error) {
      console.error('Error getting waiting room participants:', error)
      return []
    }
  }

  /**
   * Admite un participante desde la sala de espera (solo doctor)
   */
  async admitParticipant(callId: string, participantId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<any>(
        `/api/v1/telemedicine/calls/${callId}/waiting-room/admit`,
        { participantId }
      )
      if (response.data?.success) {
        // Actualizar lista de participantes
        await this.getWaitingRoomParticipants(callId)
        return true
      }
      return false
    } catch (error) {
      console.error('Error admitting participant:', error)
      return false
    }
  }

  /**
   * Marca al participante como listo en la sala de espera
   */
  async markReady(callId: string, participantId: string, isReady: boolean): Promise<boolean> {
    try {
      const response = await apiClient.post<any>(
        `/api/v1/telemedicine/calls/${callId}/waiting-room/ready`,
        { participantId, isReady }
      )
      if (response.data?.success) {
        // Actualizar estado local
        const participant = this.waitingRoomParticipants.find((p) => p.id === participantId)
        if (participant) {
          participant.isReady = isReady
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error marking ready:', error)
      return false
    }
  }

  /**
   * Compartir Pantalla
   */

  /**
   * Inicia el compartir de pantalla
   */
  async startScreenShare(callId: string, participantId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<any>(
        `/api/v1/telemedicine/calls/${callId}/screen-share/start`,
        { participantId }
      )
      if (response.data?.success && response.data?.data) {
        this.screenShareActive = {
          enabled: true,
          participantId,
          streamId: response.data.data.streamId,
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error starting screen share:', error)
      return false
    }
  }

  /**
   * Detiene el compartir de pantalla
   */
  async stopScreenShare(callId: string, participantId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<any>(
        `/api/v1/telemedicine/calls/${callId}/screen-share/stop`,
        { participantId }
      )
      if (response.data?.success) {
        this.screenShareActive = null
        return true
      }
      return false
    } catch (error) {
      console.error('Error stopping screen share:', error)
      return false
    }
  }

  /**
   * Obtiene el estado del compartir de pantalla
   */
  getScreenShareStatus(): ScreenShareOptions | null {
    return this.screenShareActive
  }

  /**
   * Grabación de Sesiones
   */

  /**
   * Inicia la grabación de la sesión
   */
  async startRecording(callId: string, options: RecordingOptions): Promise<boolean> {
    try {
      const response = await apiClient.post<any>(
        `/api/v1/telemedicine/calls/${callId}/recording/start`,
        options
      )
      if (response.data?.success) {
        this.recordingActive = { ...options, enabled: true }
        // Actualizar estado de la llamada
        if (this.currentCall?.id === callId) {
          this.currentCall.recordingStatus = 'recording'
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error starting recording:', error)
      return false
    }
  }

  /**
   * Pausa la grabación
   */
  async pauseRecording(callId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<any>(`/api/v1/telemedicine/calls/${callId}/recording/pause`)
      if (response.data?.success) {
        if (this.currentCall?.id === callId) {
          this.currentCall.recordingStatus = 'paused'
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error pausing recording:', error)
      return false
    }
  }

  /**
   * Reanuda la grabación
   */
  async resumeRecording(callId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<any>(`/api/v1/telemedicine/calls/${callId}/recording/resume`)
      if (response.data?.success) {
        if (this.currentCall?.id === callId) {
          this.currentCall.recordingStatus = 'recording'
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error resuming recording:', error)
      return false
    }
  }

  /**
   * Detiene la grabación
   */
  async stopRecording(callId: string): Promise<string | null> {
    try {
      const response = await apiClient.post<any>(`/api/v1/telemedicine/calls/${callId}/recording/stop`)
      if (response.data?.success && response.data?.data) {
        this.recordingActive = null
        const recordingUrl = response.data.data.recordingUrl
        if (this.currentCall?.id === callId) {
          this.currentCall.recordingStatus = 'stopped'
          this.currentCall.recordingUrl = recordingUrl
        }
        return recordingUrl
      }
      return null
    } catch (error) {
      console.error('Error stopping recording:', error)
      return null
    }
  }

  /**
   * Obtiene el estado de la grabación
   */
  getRecordingStatus(): RecordingStatus | null {
    return this.currentCall?.recordingStatus || null
  }

  /**
   * Obtiene la URL de la grabación
   */
  getRecordingUrl(callId: string): string | null {
    if (this.currentCall?.id === callId) {
      return this.currentCall.recordingUrl || null
    }
    return null
  }

  /**
   * Utilidades
   */

  /**
   * Obtiene las llamadas del paciente
   */
  async getPatientCalls(patientId: string): Promise<TelemedicineCall[]> {
    try {
      const response = await apiClient.get<any>(`/api/v1/telemedicine/calls?patientId=${patientId}`)
      if (response.data?.success && response.data?.data) {
        return response.data.data as TelemedicineCall[]
      }
      return []
    } catch (error) {
      console.error('Error getting patient calls:', error)
      return []
    }
  }

  /**
   * Obtiene las llamadas del doctor
   */
  async getDoctorCalls(doctorId: string): Promise<TelemedicineCall[]> {
    try {
      const response = await apiClient.get<any>(`/api/v1/telemedicine/calls?doctorId=${doctorId}`)
      if (response.data?.success && response.data?.data) {
        return response.data.data as TelemedicineCall[]
      }
      return []
    } catch (error) {
      console.error('Error getting doctor calls:', error)
      return []
    }
  }

  /**
   * Obtiene la llamada actual
   */
  getCurrentCall(): TelemedicineCall | null {
    return this.currentCall
  }

  /**
   * Verifica si hay una llamada activa
   */
  hasActiveCall(): boolean {
    return this.currentCall !== null && this.currentCall.status === 'active'
  }

  /**
   * Verifica si hay una llamada en sala de espera
   */
  hasWaitingCall(): boolean {
    return this.currentCall !== null && this.currentCall.status === 'waiting'
  }

}

// Instancia singleton
export const telemedicineService = new TelemedicineService()

