import { Types } from 'mongoose';
import * as controller from '../../../src/controllers/alertController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: {
    createCriticalSymptomAlert: jest.fn(),
    scheduleMedicationReminder: jest.fn(),
    scheduleFollowUpAlert: jest.fn(),
    notifyDoctorForCriticalCase: jest.fn(),
    acknowledgeAlert: jest.fn(),
    getAlertsForUser: jest.fn(),
    getDashboardSummary: jest.fn(),
    processPendingAlerts: jest.fn(),
  },
}));

jest.mock('../../../src/services/notificationService', () => ({
  notificationService: {
    processScheduledQueue: jest.fn(),
  },
}));

jest.mock('../../../src/services/alertMonitoringService', () => ({
  __esModule: true,
  default: {
    getSnapshot: jest.fn(),
  },
}));

const { alertService } = require('../../../src/services/alertService');
const { notificationService } = require('../../../src/services/notificationService');
const alertMonitoringService = require('../../../src/services/alertMonitoringService').default;

const buildReq = (overrides: Partial<any> = {}): any => ({
  user: { _id: new Types.ObjectId().toHexString(), role: 'doctor' },
  body: {},
  params: {},
  query: {},
  ...overrides,
});

const buildRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as any;
};

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

const runHandler = async (handler: any, req: any, res = buildRes(), next = jest.fn()) => {
  await handler(req, res, next);
  await flushMicrotasks();
  return { res, next };
};

const expectStatusError = (next: jest.Mock, code: number) => {
  expect(next).toHaveBeenCalled();
  const arg = next.mock.calls[0]?.[0];
  expect(arg).toBeInstanceOf(Error);
  expect(arg.statusCode).toBe(code);
};

describe('alertController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createCriticalSymptomAlert', () => {
    it('201 delegando al servicio con doctorId inferido del usuario', async () => {
      const alert = { _id: 'a1', status: 'pending' };
      alertService.createCriticalSymptomAlert.mockResolvedValue(alert);

      const req = buildReq({
        body: { userId: 'u1', symptomName: 'tos', severity: 'high' },
      });
      const { res } = await runHandler(controller.createCriticalSymptomAlert, req);

      expect(alertService.createCriticalSymptomAlert).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: req.user._id, userId: 'u1' }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('propaga error del servicio', async () => {
      alertService.createCriticalSymptomAlert.mockRejectedValue(new Error('boom'));
      const { next } = await runHandler(
        controller.createCriticalSymptomAlert,
        buildReq({ body: {} }),
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('scheduleMedicationReminder', () => {
    it('201 programa recordatorio con scheduleTime válido', async () => {
      alertService.scheduleMedicationReminder.mockResolvedValue({ _id: 'a1' });
      const { res } = await runHandler(
        controller.scheduleMedicationReminder,
        buildReq({
          body: {
            userId: 'p1',
            medicationName: 'Ibuprofeno',
            dosage: '200mg',
            scheduleTime: new Date().toISOString(),
          },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('400 cuando falta scheduleTime', async () => {
      const { next } = await runHandler(
        controller.scheduleMedicationReminder,
        buildReq({ body: {} }),
      );
      expectStatusError(next, 400);
    });

    it('400 cuando scheduleTime es inválido', async () => {
      const { next } = await runHandler(
        controller.scheduleMedicationReminder,
        buildReq({ body: { scheduleTime: 'not-a-date' } }),
      );
      expectStatusError(next, 400);
    });
  });

  describe('scheduleFollowUpAlert', () => {
    it('201 con followUpDate válido', async () => {
      alertService.scheduleFollowUpAlert.mockResolvedValue({ _id: 'a1' });
      const { res } = await runHandler(
        controller.scheduleFollowUpAlert,
        buildReq({
          body: { userId: 'p1', followUpDate: new Date().toISOString(), reason: 'checkup' },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('400 cuando falta followUpDate', async () => {
      const { next } = await runHandler(
        controller.scheduleFollowUpAlert,
        buildReq({ body: {} }),
      );
      expectStatusError(next, 400);
    });
  });

  describe('notifyDoctorForCriticalCase', () => {
    it('201 con alerta creada', async () => {
      alertService.notifyDoctorForCriticalCase.mockResolvedValue({ _id: 'a1' });
      const { res } = await runHandler(
        controller.notifyDoctorForCriticalCase,
        buildReq({
          body: {
            doctorId: 'd1',
            patientId: 'p1',
            summary: 'Caso crítico',
            urgency: 'high',
          },
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('acknowledgeAlert', () => {
    it('200 al reconocer una alerta con ObjectId válido', async () => {
      const alertId = new Types.ObjectId().toHexString();
      alertService.acknowledgeAlert.mockResolvedValue({ _id: alertId, status: 'acknowledged' });
      const { res } = await runHandler(
        controller.acknowledgeAlert,
        buildReq({ params: { alertId } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(alertService.acknowledgeAlert).toHaveBeenCalled();
    });

    it('401 sin usuario autenticado', async () => {
      const { next } = await runHandler(
        controller.acknowledgeAlert,
        buildReq({ user: null, params: { alertId: new Types.ObjectId().toHexString() } }),
      );
      expectStatusError(next, 401);
    });

    it('400 con alertId inválido', async () => {
      const { next } = await runHandler(
        controller.acknowledgeAlert,
        buildReq({ params: { alertId: 'not-an-object-id' } }),
      );
      expectStatusError(next, 400);
    });
  });

  describe('getUserAlerts', () => {
    it('200 usa userId del usuario autenticado (paciente)', async () => {
      const req = buildReq({
        user: { _id: 'patient-1', role: 'patient' },
      });
      alertService.getAlertsForUser.mockResolvedValue([{ _id: 'a1' }]);

      const { res } = await runHandler(controller.getUserAlerts, req);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(alertService.getAlertsForUser).toHaveBeenCalledWith(
        'patient-1',
        expect.any(Object),
      );
    });

    it('admin puede consultar alertas de otro userId', async () => {
      const req = buildReq({
        user: { _id: 'admin-1', role: 'admin' },
        query: { userId: 'target-1' },
      });
      alertService.getAlertsForUser.mockResolvedValue([]);

      await runHandler(controller.getUserAlerts, req);

      expect(alertService.getAlertsForUser).toHaveBeenCalledWith(
        'target-1',
        expect.any(Object),
      );
    });

    it('doctor puede consultar por patientId', async () => {
      const req = buildReq({
        user: { _id: 'doc-1', role: 'doctor' },
        query: { patientId: 'p1' },
      });
      alertService.getAlertsForUser.mockResolvedValue([]);

      await runHandler(controller.getUserAlerts, req);

      expect(alertService.getAlertsForUser).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ patientId: 'p1' }),
      );
    });

    it('aplica filtros status/category/priority como arrays', async () => {
      const req = buildReq({
        query: {
          status: ['pending', 'delivered'],
          category: 'symptom',
          priority: ['high'],
          doctorId: 'd1',
        },
      });
      alertService.getAlertsForUser.mockResolvedValue([]);

      await runHandler(controller.getUserAlerts, req);

      const filters = alertService.getAlertsForUser.mock.calls[0][1];
      expect(filters.status).toEqual(['pending', 'delivered']);
      expect(filters.category).toEqual(['symptom']);
      expect(filters.priority).toEqual(['high']);
      expect(filters.doctorId).toBe('d1');
    });

    it('parsea from/to como Date', async () => {
      alertService.getAlertsForUser.mockResolvedValue([]);
      await runHandler(
        controller.getUserAlerts,
        buildReq({ query: { from: '2026-01-01', to: '2026-04-01' } }),
      );
      const filters = alertService.getAlertsForUser.mock.calls[0][1];
      expect(filters.from).toBeInstanceOf(Date);
      expect(filters.to).toBeInstanceOf(Date);
    });

    it('400 cuando from es una fecha inválida', async () => {
      const { next } = await runHandler(
        controller.getUserAlerts,
        buildReq({ query: { from: 'invalid' } }),
      );
      expectStatusError(next, 400);
    });

    it('401 sin usuario autenticado', async () => {
      const { next } = await runHandler(
        controller.getUserAlerts,
        buildReq({ user: null }),
      );
      expectStatusError(next, 401);
    });
  });

  describe('getAlertDashboardSummary', () => {
    it('200 con el resumen del servicio', async () => {
      alertService.getDashboardSummary.mockResolvedValue({ total: 10 });
      const { res } = await runHandler(controller.getAlertDashboardSummary, buildReq());
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getAlertMonitoringMetrics', () => {
    it('200 con snapshot de monitoreo', async () => {
      alertMonitoringService.getSnapshot.mockResolvedValue({ queue: {}, alerts: {}, recentFailures: [] });
      const { res } = await runHandler(controller.getAlertMonitoringMetrics, buildReq());
      expect(res.status).toHaveBeenCalledWith(200);
      expect(alertMonitoringService.getSnapshot).toHaveBeenCalled();
    });
  });

  describe('processAlertsNow', () => {
    it('200 con conteos procesados', async () => {
      notificationService.processScheduledQueue.mockResolvedValue(2);
      alertService.processPendingAlerts.mockResolvedValue({ processed: 3, delivered: 3, failed: 0 });

      const res = buildRes();
      const json = jest.fn();
      res.status = jest.fn().mockReturnValue({ json });

      await controller.processAlertsNow(buildReq(), res, jest.fn());
      await flushMicrotasks();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            scheduledProcessed: 2,
            pendingResult: expect.objectContaining({ processed: 3 }),
          }),
        }),
      );
    });
  });
});
