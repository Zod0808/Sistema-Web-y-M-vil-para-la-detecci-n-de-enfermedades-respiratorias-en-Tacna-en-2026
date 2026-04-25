import alertService from '../../../src/services/alertService';
import { notificationService } from '../../../src/services/notificationService';
import AlertModel from '../../../src/models/Alert';
import {
  invalidateCacheByPattern,
  getCachedValue,
  setCachedValue,
  CACHE_NAMESPACES,
  TEN_MINUTES,
} from '../../../src/services/cacheService';

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/services/cacheService', () => ({
  invalidateCacheByPattern: jest.fn(),
  getCachedValue: jest.fn(),
  setCachedValue: jest.fn(),
  CACHE_NAMESPACES: {
    ALERTS: 'alerts',
    ALERT_SUMMARY: 'alertSummary',
  },
  TEN_MINUTES: 600,
}));

jest.mock('../../../src/services/notificationService', () => ({
  notificationService: {
    dispatchAlert: jest.fn(),
    queueAlert: jest.fn(),
    processPendingAlerts: jest.fn(),
  },
}));

jest.mock('../../../src/models/Alert', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    getDashboardMetrics: jest.fn(),
  },
}));

const buildAlertDocument = (overrides: Partial<any> = {}) => ({
  id: 'alert-123',
  userId: 'user-1',
  markAsAcknowledged: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('alertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCriticalSymptomAlert', () => {
    it('debería crear una alerta crítica y despacharla inmediatamente', async () => {
      const fakeAlert = buildAlertDocument();
      (AlertModel.create as jest.Mock).mockResolvedValue(fakeAlert);
      (notificationService.dispatchAlert as jest.Mock).mockResolvedValue({
        alertId: fakeAlert.id,
        status: 'delivered',
      });

      const result = await alertService.createCriticalSymptomAlert({
        userId: 'user-1',
        symptomName: 'Dificultad respiratoria',
        severity: 'critical',
        metadata: { score: 0.92 },
      });

      expect(AlertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          category: 'critical_symptom',
          priority: 'critical',
          status: 'pending',
          trigger: expect.objectContaining({
            source: 'symptom_analysis',
            metadata: expect.objectContaining({
              symptomName: 'Dificultad respiratoria',
              severity: 'critical',
            }),
          }),
        })
      );
      expect(notificationService.dispatchAlert).toHaveBeenCalledWith(fakeAlert);
      expect(invalidateCacheByPattern).toHaveBeenCalledWith(`${CACHE_NAMESPACES.ALERTS}:*`);
      expect(invalidateCacheByPattern).toHaveBeenCalledWith(
        `${CACHE_NAMESPACES.ALERT_SUMMARY}:*`
      );
      expect(result).toBe(fakeAlert);
    });
  });

  describe('scheduleMedicationReminder', () => {
    it('debería programar un recordatorio de medicamento y enviarlo a la cola', async () => {
      const scheduleTime = new Date(Date.now() + 60_000);
      const fakeAlert = buildAlertDocument({ scheduledAt: scheduleTime });
      (AlertModel.create as jest.Mock).mockResolvedValue(fakeAlert);

      const result = await alertService.scheduleMedicationReminder({
        userId: 'user-1',
        medicationName: 'Salbutamol',
        dosage: '2 inhalaciones',
        scheduleTime,
      });

      expect(AlertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'medication_reminder',
          status: 'scheduled',
          scheduledAt: scheduleTime,
        })
      );
      expect(notificationService.queueAlert).toHaveBeenCalledWith(fakeAlert, scheduleTime);
      expect(result).toBe(fakeAlert);
    });
  });

  describe('scheduleFollowUpAlert', () => {
    it('debería programar un seguimiento médico con canales preferidos', async () => {
      const followUpDate = new Date(Date.now() + 3600_000);
      const fakeAlert = buildAlertDocument({ scheduledAt: followUpDate });
      (AlertModel.create as jest.Mock).mockResolvedValue(fakeAlert);

      const result = await alertService.scheduleFollowUpAlert({
        userId: 'user-1',
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        followUpDate,
        reason: 'Control de tratamiento',
        preferredChannel: ['email'],
      });

      expect(AlertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'follow_up',
          channels: ['email'],
          status: 'scheduled',
          scheduledAt: followUpDate,
        })
      );
      expect(notificationService.queueAlert).toHaveBeenCalledWith(fakeAlert, followUpDate);
      expect(result).toBe(fakeAlert);
    });
  });

  describe('notifyDoctorForCriticalCase', () => {
    it('debería despachar inmediatamente cuando la urgencia es crítica', async () => {
      const fakeAlert = buildAlertDocument();
      (AlertModel.create as jest.Mock).mockResolvedValue(fakeAlert);

      await alertService.notifyDoctorForCriticalCase({
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        summary: 'Paciente con saturación baja',
        urgency: 'critical',
        triggeredBy: 'symptom_analysis',
      });

      expect(AlertModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'doctor_notification',
          priority: 'critical',
          status: 'pending',
        })
      );
      expect(notificationService.dispatchAlert).toHaveBeenCalledWith(fakeAlert);
    });

    it('debería despachar manualmente cuando la urgencia no es crítica', async () => {
      const fakeAlert = buildAlertDocument();
      (AlertModel.create as jest.Mock).mockResolvedValue(fakeAlert);

      await alertService.notifyDoctorForCriticalCase({
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        summary: 'Seguimiento de evolución',
        urgency: 'medium',
        triggeredBy: 'follow_up_rule',
      });

      expect(notificationService.dispatchAlert).toHaveBeenCalledWith(fakeAlert);
    });
  });

  describe('acknowledgeAlert', () => {
    it('debería marcar una alerta como reconocida y limpiar la caché', async () => {
      const fakeAlert = buildAlertDocument();
      (AlertModel.findById as jest.Mock).mockResolvedValue(fakeAlert);

      const result = await alertService.acknowledgeAlert(fakeAlert.id, fakeAlert.userId);

      expect(AlertModel.findById).toHaveBeenCalledWith(fakeAlert.id);
      expect(fakeAlert.markAsAcknowledged).toHaveBeenCalledTimes(1);
      expect(invalidateCacheByPattern).toHaveBeenCalledWith(
        `${CACHE_NAMESPACES.ALERTS}:${fakeAlert.userId}*`
      );
      expect(invalidateCacheByPattern).toHaveBeenCalledWith(
        `${CACHE_NAMESPACES.ALERT_SUMMARY}:*`
      );
      expect(result).toBe(fakeAlert);
    });
  });

  describe('getDashboardSummary', () => {
    it('debería devolver el resumen desde la caché cuando está disponible', async () => {
      const cachedSummary = { cached: true };
      (getCachedValue as jest.Mock).mockResolvedValueOnce(cachedSummary);

      const summary = await alertService.getDashboardSummary();

      expect(getCachedValue).toHaveBeenCalledWith(`${CACHE_NAMESPACES.ALERT_SUMMARY}:global`);
      expect(AlertModel.getDashboardMetrics).not.toHaveBeenCalled();
      expect(summary).toBe(cachedSummary);
    });

    it('debería consultar el modelo cuando no hay caché y almacenar el resultado', async () => {
      const generatedSummary = { byStatus: [], byCategory: [], byPriority: [] };
      (getCachedValue as jest.Mock).mockResolvedValueOnce(null);
      (AlertModel.getDashboardMetrics as jest.Mock).mockResolvedValueOnce(generatedSummary);

      const summary = await alertService.getDashboardSummary();

      expect(AlertModel.getDashboardMetrics).toHaveBeenCalledTimes(1);
      expect(setCachedValue).toHaveBeenCalledWith(
        `${CACHE_NAMESPACES.ALERT_SUMMARY}:global`,
        generatedSummary,
        TEN_MINUTES
      );
      expect(summary).toBe(generatedSummary);
    });
  });

  describe('processPendingAlerts', () => {
    it('debería delegar el procesamiento al notificationService', async () => {
      const expected = { processed: 3, delivered: 2, failed: 1 };
      (notificationService.processPendingAlerts as jest.Mock).mockResolvedValueOnce(expected);

      const result = await alertService.processPendingAlerts(25);

      expect(notificationService.processPendingAlerts).toHaveBeenCalledWith(25);
      expect(result).toBe(expected);
    });
  });
});

