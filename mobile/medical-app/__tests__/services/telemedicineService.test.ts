import { telemedicineService, TelemedicineCall } from '@/lib/services/telemedicineService'
import { apiClient } from '@/lib/api/client'

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}))

// Silence expected error logging
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterAll(() => {
  ;(console.error as jest.Mock).mockRestore()
})

// Reset the singleton's internal state between tests via endCall paths.
const resetService = () => {
  ;(telemedicineService as any).currentCall = null
  ;(telemedicineService as any).waitingRoomParticipants = []
  ;(telemedicineService as any).screenShareActive = null
  ;(telemedicineService as any).recordingActive = null
}

beforeEach(() => {
  jest.clearAllMocks()
  resetService()
})

const mockCall = (overrides: Partial<TelemedicineCall> = {}): TelemedicineCall => ({
  id: 'call-1',
  appointmentId: 'appt-1',
  patientId: 'p-1',
  doctorId: 'd-1',
  status: 'scheduled',
  roomId: 'room-1',
  roomName: 'consulta-x',
  provider: 'jitsi',
  waitingRoomEnabled: true,
  screenSharingEnabled: true,
  recordingEnabled: false,
  ...overrides,
})

describe('telemedicineService', () => {
  describe('requestPermissions', () => {
    it('returns true when mediaDevices grants permission', async () => {
      const stopMock = jest.fn()
      const streamMock = { getTracks: () => [{ stop: stopMock }, { stop: stopMock }] }
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn().mockResolvedValue(streamMock) },
        configurable: true,
      })
      await expect(telemedicineService.requestPermissions()).resolves.toBe(true)
      expect(stopMock).toHaveBeenCalledTimes(2)
    })

    it('returns false when getUserMedia rejects', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn().mockRejectedValue(new Error('denied')) },
        configurable: true,
      })
      await expect(telemedicineService.requestPermissions()).resolves.toBe(false)
    })
  })

  describe('createCall', () => {
    it('creates a call with defaults', async () => {
      const call = mockCall()
      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: call },
      })
      const result = await telemedicineService.createCall({
        appointmentId: 'a', doctorId: 'd', patientId: 'p',
      })
      expect(result).toEqual(call)
      expect(telemedicineService.getCurrentCall()).toEqual(call)
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/telemedicine/calls',
        expect.objectContaining({ provider: 'jitsi', waitingRoomEnabled: true }),
      )
    })

    it('respects explicit provider and options', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: mockCall({ provider: 'zoom', recordingEnabled: true }) },
      })
      await telemedicineService.createCall({
        appointmentId: 'a', doctorId: 'd', patientId: 'p',
        provider: 'zoom', recordingEnabled: true, waitingRoomEnabled: false, screenSharingEnabled: false,
      })
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          provider: 'zoom',
          waitingRoomEnabled: false,
          screenSharingEnabled: false,
          recordingEnabled: true,
        }),
      )
    })

    it('returns null on unsuccessful response', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValue({ data: { success: false } })
      const r = await telemedicineService.createCall({
        appointmentId: 'a', doctorId: 'd', patientId: 'p',
      })
      expect(r).toBeNull()
    })

    it('returns null on network error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('net'))
      const r = await telemedicineService.createCall({
        appointmentId: 'a', doctorId: 'd', patientId: 'p',
      })
      expect(r).toBeNull()
    })
  })

  describe('startCall / endCall', () => {
    it('startCall stores call and returns true', async () => {
      const call = mockCall({ status: 'active' })
      ;(apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true, data: call } })
      await expect(telemedicineService.startCall('call-1')).resolves.toBe(true)
      expect(telemedicineService.getCurrentCall()).toEqual(call)
      expect(telemedicineService.hasActiveCall()).toBe(true)
    })

    it('startCall returns false when response missing data', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } })
      await expect(telemedicineService.startCall('call-1')).resolves.toBe(false)
    })

    it('startCall returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('x'))
      await expect(telemedicineService.startCall('call-1')).resolves.toBe(false)
    })

    it('endCall clears state and returns true', async () => {
      // Seed: create then start
      ;(apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true, data: mockCall({ status: 'active' }) } })
      await telemedicineService.startCall('call-1')
      expect(telemedicineService.hasActiveCall()).toBe(true)

      ;(apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } })
      await expect(telemedicineService.endCall('call-1')).resolves.toBe(true)
      expect(telemedicineService.getCurrentCall()).toBeNull()
    })

    it('endCall stops recording first if active', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true, data: mockCall({ status: 'active' }) } })
      await telemedicineService.startCall('call-1')
      // Turn on recording
      ;(apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } })
      await telemedicineService.startRecording('call-1', { enabled: true })

      // stopRecording call (post) then endCall (post)
      ;(apiClient.post as jest.Mock)
        .mockResolvedValueOnce({ data: { success: true, data: { recordingUrl: 'http://rec/1' } } })
        .mockResolvedValueOnce({ data: { success: true } })
      await telemedicineService.endCall('call-1')
      // Expect stopRecording endpoint hit before end
      const urls = (apiClient.post as jest.Mock).mock.calls.map((c) => c[0])
      expect(urls.some((u) => u.includes('/recording/stop'))).toBe(true)
      expect(urls.some((u) => u.endsWith('/end'))).toBe(true)
    })

    it('endCall returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('boom'))
      await expect(telemedicineService.endCall('call-x')).resolves.toBe(false)
    })
  })

  describe('getCallToken', () => {
    it('returns token when present', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { token: 'jwt-abc' } },
      })
      await expect(telemedicineService.getCallToken('c1')).resolves.toBe('jwt-abc')
    })

    it('returns null when token missing', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true, data: {} } })
      await expect(telemedicineService.getCallToken('c1')).resolves.toBeNull()
    })

    it('returns null on error', async () => {
      ;(apiClient.get as jest.Mock).mockRejectedValue(new Error('x'))
      await expect(telemedicineService.getCallToken('c1')).resolves.toBeNull()
    })
  })

  describe('getCallUrl', () => {
    it('builds a jitsi URL with all params', () => {
      const url = telemedicineService.getCallUrl(mockCall({ token: 'JWT' }), 'doctor')
      expect(url).toContain('meet.jit.si')
      expect(url).toContain('consulta-x')
      expect(url).toContain('jwt=JWT')
      expect(url).toContain(encodeURIComponent('userInfo.displayName'))
      // doctor role → displayName=Doctor
      expect(decodeURIComponent(url)).toContain('displayName=Doctor')
    })

    it('builds jitsi URL for patient', () => {
      const url = telemedicineService.getCallUrl(mockCall(), 'patient')
      expect(decodeURIComponent(url)).toContain('displayName=Paciente')
    })

    it('builds zoom URL', () => {
      const url = telemedicineService.getCallUrl(
        mockCall({ provider: 'zoom', token: 'zk' }),
        'doctor',
      )
      expect(url).toMatch(/zoom\.us\/join\?room=consulta-x&token=zk/)
    })

    it('builds custom URL', () => {
      process.env.NEXT_PUBLIC_CUSTOM_VIDEO_SERVER_URL = 'https://vid.example'
      // Instantiate a new instance so it picks up the env var
      const { telemedicineService: fresh } = jest.requireActual(
        '@/lib/services/telemedicineService',
      )
      const url = fresh.getCallUrl(mockCall({ provider: 'custom', token: 'ct' }), 'doctor')
      expect(url).toContain('/room/consulta-x')
      expect(url).toContain('token=ct')
    })
  })

  describe('joinCall', () => {
    it('opens a window and returns true', async () => {
      const openMock = jest.fn()
      jest.spyOn(window, 'open').mockImplementation(openMock)
      await expect(telemedicineService.joinCall(mockCall(), 'doctor')).resolves.toBe(true)
      expect(openMock).toHaveBeenCalled()
    })

    it('returns false when window.open throws', async () => {
      jest.spyOn(window, 'open').mockImplementation(() => {
        throw new Error('blocked')
      })
      await expect(telemedicineService.joinCall(mockCall(), 'patient')).resolves.toBe(false)
    })
  })

  describe('Waiting room', () => {
    it('joinWaitingRoom stores participants and returns true', async () => {
      const participants = [{ id: 'p1', name: 'Ana', role: 'patient', joinedAt: 't', isReady: false }]
      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { participants } },
      })
      await expect(
        telemedicineService.joinWaitingRoom('c1', { id: 'p1', name: 'Ana', role: 'patient', isReady: false }),
      ).resolves.toBe(true)
    })

    it('joinWaitingRoom returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('x'))
      await expect(
        telemedicineService.joinWaitingRoom('c1', { id: 'p1', name: 'Ana', role: 'patient', isReady: false }),
      ).resolves.toBe(false)
    })

    it('getWaitingRoomParticipants returns list', async () => {
      const participants = [{ id: 'p1', name: 'A', role: 'patient', joinedAt: 't', isReady: false }]
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { participants } },
      })
      const r = await telemedicineService.getWaitingRoomParticipants('c1')
      expect(r).toEqual(participants)
    })

    it('getWaitingRoomParticipants returns [] on error', async () => {
      ;(apiClient.get as jest.Mock).mockRejectedValue(new Error('x'))
      const r = await telemedicineService.getWaitingRoomParticipants('c1')
      expect(r).toEqual([])
    })

    it('admitParticipant refreshes participants on success', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } })
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { participants: [] } },
      })
      await expect(telemedicineService.admitParticipant('c1', 'p1')).resolves.toBe(true)
      expect(apiClient.get).toHaveBeenCalled()
    })

    it('admitParticipant returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('x'))
      await expect(telemedicineService.admitParticipant('c1', 'p1')).resolves.toBe(false)
    })

    it('markReady updates local participant state', async () => {
      // Seed a participant
      const participants = [{ id: 'p1', name: 'A', role: 'patient', joinedAt: 't', isReady: false }]
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { participants } },
      })
      await telemedicineService.getWaitingRoomParticipants('c1')

      ;(apiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } })
      await expect(telemedicineService.markReady('c1', 'p1', true)).resolves.toBe(true)
    })

    it('markReady returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('x'))
      await expect(telemedicineService.markReady('c1', 'p1', true)).resolves.toBe(false)
    })
  })

  describe('Screen share', () => {
    it('startScreenShare sets state on success', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { streamId: 'stream-1' } },
      })
      await expect(telemedicineService.startScreenShare('c1', 'p1')).resolves.toBe(true)
      expect(telemedicineService.getScreenShareStatus()).toEqual({
        enabled: true, participantId: 'p1', streamId: 'stream-1',
      })
    })

    it('startScreenShare returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('x'))
      await expect(telemedicineService.startScreenShare('c1', 'p1')).resolves.toBe(false)
    })

    it('stopScreenShare clears state', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { streamId: 's' } },
      })
      await telemedicineService.startScreenShare('c1', 'p1')
      ;(apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } })
      await expect(telemedicineService.stopScreenShare('c1', 'p1')).resolves.toBe(true)
      expect(telemedicineService.getScreenShareStatus()).toBeNull()
    })

    it('stopScreenShare returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValue(new Error('x'))
      await expect(telemedicineService.stopScreenShare('c1', 'p1')).resolves.toBe(false)
    })
  })

  describe('Recording', () => {
    beforeEach(async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: mockCall({ status: 'active' }) },
      })
      await telemedicineService.startCall('call-1')
    })

    it('startRecording updates call recording status', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } })
      await expect(
        telemedicineService.startRecording('call-1', { enabled: true, quality: 'high' }),
      ).resolves.toBe(true)
      expect(telemedicineService.getRecordingStatus()).toBe('recording')
    })

    it('startRecording returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('x'))
      await expect(
        telemedicineService.startRecording('call-1', { enabled: true }),
      ).resolves.toBe(false)
    })

    it('pauseRecording flips status to paused', async () => {
      ;(apiClient.post as jest.Mock)
        .mockResolvedValueOnce({ data: { success: true } }) // start
        .mockResolvedValueOnce({ data: { success: true } }) // pause
      await telemedicineService.startRecording('call-1', { enabled: true })
      await expect(telemedicineService.pauseRecording('call-1')).resolves.toBe(true)
      expect(telemedicineService.getRecordingStatus()).toBe('paused')
    })

    it('pauseRecording returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('x'))
      await expect(telemedicineService.pauseRecording('call-1')).resolves.toBe(false)
    })

    it('resumeRecording flips status back to recording', async () => {
      ;(apiClient.post as jest.Mock)
        .mockResolvedValueOnce({ data: { success: true } }) // start
        .mockResolvedValueOnce({ data: { success: true } }) // pause
        .mockResolvedValueOnce({ data: { success: true } }) // resume
      await telemedicineService.startRecording('call-1', { enabled: true })
      await telemedicineService.pauseRecording('call-1')
      await expect(telemedicineService.resumeRecording('call-1')).resolves.toBe(true)
      expect(telemedicineService.getRecordingStatus()).toBe('recording')
    })

    it('resumeRecording returns false on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('x'))
      await expect(telemedicineService.resumeRecording('call-1')).resolves.toBe(false)
    })

    it('stopRecording returns URL and stores it', async () => {
      ;(apiClient.post as jest.Mock)
        .mockResolvedValueOnce({ data: { success: true } })
        .mockResolvedValueOnce({ data: { success: true, data: { recordingUrl: 'http://r/1' } } })
      await telemedicineService.startRecording('call-1', { enabled: true })
      const url = await telemedicineService.stopRecording('call-1')
      expect(url).toBe('http://r/1')
      expect(telemedicineService.getRecordingUrl('call-1')).toBe('http://r/1')
    })

    it('stopRecording returns null on error', async () => {
      ;(apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('x'))
      await expect(telemedicineService.stopRecording('call-1')).resolves.toBeNull()
    })

    it('getRecordingUrl returns null for other call ids', () => {
      expect(telemedicineService.getRecordingUrl('other')).toBeNull()
    })
  })

  describe('List helpers', () => {
    it('getPatientCalls returns call array', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [mockCall()] },
      })
      const r = await telemedicineService.getPatientCalls('p-1')
      expect(r).toHaveLength(1)
    })

    it('getPatientCalls returns [] on error', async () => {
      ;(apiClient.get as jest.Mock).mockRejectedValue(new Error('x'))
      const r = await telemedicineService.getPatientCalls('p-1')
      expect(r).toEqual([])
    })

    it('getDoctorCalls returns call array', async () => {
      ;(apiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [mockCall(), mockCall({ id: 'call-2' })] },
      })
      const r = await telemedicineService.getDoctorCalls('d-1')
      expect(r).toHaveLength(2)
    })

    it('getDoctorCalls returns [] on error', async () => {
      ;(apiClient.get as jest.Mock).mockRejectedValue(new Error('x'))
      const r = await telemedicineService.getDoctorCalls('d-1')
      expect(r).toEqual([])
    })
  })

  describe('State helpers', () => {
    it('getCurrentCall reflects null when no call', () => {
      expect(telemedicineService.getCurrentCall()).toBeNull()
      expect(telemedicineService.hasActiveCall()).toBe(false)
      expect(telemedicineService.hasWaitingCall()).toBe(false)
    })

    it('hasWaitingCall returns true when status is waiting', async () => {
      ;(apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: mockCall({ status: 'waiting' }) },
      })
      await telemedicineService.startCall('call-1')
      expect(telemedicineService.hasWaitingCall()).toBe(true)
    })
  })
})
