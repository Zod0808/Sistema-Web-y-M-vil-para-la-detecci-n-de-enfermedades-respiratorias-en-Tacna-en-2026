/**
 * @jest-environment jsdom
 *
 * Complementa offline-sync-integration.test.ts cubriendo las 3 funciones
 * y branches de error/fallback no ejercitados allí.
 */

jest.mock('../../medical-app/lib/api/services/prescriptionService', () => ({
  prescriptionService: { create: jest.fn() },
}));
jest.mock('../../medical-app/lib/api/services/referralService', () => ({
  referralService: { create: jest.fn() },
}));
jest.mock('../../medical-app/lib/api/services/emergencyService', () => ({
  emergencyService: { create: jest.fn() },
}));
jest.mock('../../medical-app/lib/api/services/medicalHistoryService', () => ({
  medicalHistoryService: { create: jest.fn(), update: jest.fn() },
}));
jest.mock('../../medical-app/lib/api/services/appointmentService', () => ({
  appointmentService: {
    create: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    reschedule: jest.fn(),
  },
}));
jest.mock('../../medical-app/lib/api/services/alertService', () => ({
  alertService: { acknowledge: jest.fn() },
}));

// Mock del queue: capturamos las llamadas para verificar el enqueue
const enqueueMock = jest.fn().mockReturnValue('offline-op-id');
jest.mock('../../medical-app/lib/services/offlineQueue', () => ({
  offlineQueue: { enqueue: (...args: any[]) => enqueueMock(...args) },
}));

import {
  createPrescriptionOffline,
  createReferralOffline,
  createEmergencyOffline,
  createMedicalHistoryOffline,
  updateMedicalHistoryOffline,
  cancelAppointmentOffline,
  rescheduleAppointmentOffline,
  acknowledgeAlertOffline,
  updateAppointmentOffline,
} from '../../medical-app/lib/services/offlineOperations';

const { prescriptionService } = require('../../medical-app/lib/api/services/prescriptionService');
const { referralService } = require('../../medical-app/lib/api/services/referralService');
const { emergencyService } = require('../../medical-app/lib/api/services/emergencyService');
const { medicalHistoryService } = require('../../medical-app/lib/api/services/medicalHistoryService');
const { appointmentService } = require('../../medical-app/lib/api/services/appointmentService');
const { alertService } = require('../../medical-app/lib/api/services/alertService');

const setOnline = (online: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    value: online,
    configurable: true,
    writable: true,
  });
};

describe('offlineOperations - funciones y branches faltantes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setOnline(true);
  });

  describe('createPrescriptionOffline', () => {
    it('online: llama a prescriptionService.create y retorna id', async () => {
      prescriptionService.create.mockResolvedValueOnce({ _id: 'rx-1' });
      const result = await createPrescriptionOffline({ patientId: 'p1' } as any, true);
      expect(result).toEqual({ id: 'rx-1', isOffline: false });
    });

    it('offline directo: encola sin llamar al servicio', async () => {
      const result = await createPrescriptionOffline({ patientId: 'p1' } as any, false);
      expect(prescriptionService.create).not.toHaveBeenCalled();
      expect(enqueueMock).toHaveBeenCalledWith('create_prescription', { patientId: 'p1' });
      expect(result.isOffline).toBe(true);
    });

    it('online pero servicio falla con status=0 → cae a queue', async () => {
      prescriptionService.create.mockRejectedValueOnce({ status: 0 });
      const result = await createPrescriptionOffline({ patientId: 'p1' } as any, true);
      expect(enqueueMock).toHaveBeenCalled();
      expect(result.isOffline).toBe(true);
    });

    it('online pero servicio falla con navigator offline → cae a queue', async () => {
      setOnline(false);
      prescriptionService.create.mockRejectedValueOnce({ status: 500 });
      const result = await createPrescriptionOffline({ patientId: 'p1' } as any, true);
      expect(enqueueMock).toHaveBeenCalled();
      expect(result.isOffline).toBe(true);
    });

    it('online y servicio falla con error no-red → propaga', async () => {
      prescriptionService.create.mockRejectedValueOnce({ status: 400, message: 'bad' });
      await expect(
        createPrescriptionOffline({ patientId: 'p1' } as any, true),
      ).rejects.toEqual({ status: 400, message: 'bad' });
    });
  });

  describe('createReferralOffline', () => {
    it('online: llama a referralService.create', async () => {
      referralService.create.mockResolvedValueOnce({ _id: 'ref-1' });
      const result = await createReferralOffline({ patientId: 'p1' } as any, true);
      expect(result).toEqual({ id: 'ref-1', isOffline: false });
    });

    it('offline directo: encola create_referral', async () => {
      const result = await createReferralOffline({ patientId: 'p1' } as any, false);
      expect(enqueueMock).toHaveBeenCalledWith('create_referral', { patientId: 'p1' });
      expect(result.isOffline).toBe(true);
    });

    it('online + error red: encola', async () => {
      referralService.create.mockRejectedValueOnce({ status: 0 });
      const result = await createReferralOffline({ patientId: 'p1' } as any, true);
      expect(result.isOffline).toBe(true);
    });

    it('propaga error no-red', async () => {
      referralService.create.mockRejectedValueOnce({ status: 422 });
      await expect(
        createReferralOffline({} as any, true),
      ).rejects.toEqual({ status: 422 });
    });
  });

  describe('createEmergencyOffline', () => {
    it('online: llama a emergencyService.create', async () => {
      emergencyService.create.mockResolvedValueOnce({ _id: 'emg-1' });
      const result = await createEmergencyOffline({ patientId: 'p1' } as any, true);
      expect(result).toEqual({ id: 'emg-1', isOffline: false });
    });

    it('offline directo: encola create_emergency', async () => {
      const result = await createEmergencyOffline({ patientId: 'p1' } as any, false);
      expect(enqueueMock).toHaveBeenCalledWith('create_emergency', { patientId: 'p1' });
      expect(result.isOffline).toBe(true);
    });

    it('online + red caída: encola', async () => {
      emergencyService.create.mockRejectedValueOnce({ status: 0 });
      const result = await createEmergencyOffline({} as any, true);
      expect(result.isOffline).toBe(true);
    });

    it('propaga error no-red', async () => {
      emergencyService.create.mockRejectedValueOnce({ status: 500 });
      setOnline(true);
      await expect(createEmergencyOffline({} as any, true)).rejects.toEqual({ status: 500 });
    });
  });

  describe('rama "propaga error no-red" en el resto de operaciones', () => {
    it('createMedicalHistoryOffline propaga error no-red', async () => {
      medicalHistoryService.create.mockRejectedValueOnce({ status: 500 });
      await expect(
        createMedicalHistoryOffline({} as any, true),
      ).rejects.toEqual({ status: 500 });
    });

    it('updateMedicalHistoryOffline propaga error no-red', async () => {
      medicalHistoryService.update.mockRejectedValueOnce({ status: 400 });
      await expect(
        updateMedicalHistoryOffline('id', {} as any, true),
      ).rejects.toEqual({ status: 400 });
    });

    it('cancelAppointmentOffline propaga error no-red', async () => {
      appointmentService.cancel.mockRejectedValueOnce({ status: 500 });
      await expect(
        cancelAppointmentOffline('id', 'motivo', true),
      ).rejects.toEqual({ status: 500 });
    });

    it('rescheduleAppointmentOffline propaga error no-red', async () => {
      appointmentService.reschedule.mockRejectedValueOnce({ status: 500 });
      await expect(
        rescheduleAppointmentOffline('id', '2026-08-01', 30, true),
      ).rejects.toEqual({ status: 500 });
    });

    it('acknowledgeAlertOffline propaga error no-red', async () => {
      alertService.acknowledge.mockRejectedValueOnce({ status: 500 });
      await expect(acknowledgeAlertOffline('a1', true)).rejects.toEqual({ status: 500 });
    });

    it('updateAppointmentOffline propaga error no-red', async () => {
      appointmentService.update.mockRejectedValueOnce({ status: 500 });
      await expect(
        updateAppointmentOffline('id', {}, true),
      ).rejects.toEqual({ status: 500 });
    });
  });
});
