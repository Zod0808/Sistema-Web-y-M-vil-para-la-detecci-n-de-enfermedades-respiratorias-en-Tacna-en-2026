/**
 * Unit tests for Alert Controller
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  createCriticalSymptomAlert,
  scheduleMedicationReminder,
  getUserAlerts,
  processAlertsNow,
  getAlertMonitoringMetrics,
} from '../../../src/controllers/alertController';
import { alertService } from '../../../src/services/alertService';
import { notificationService } from '../../../src/services/notificationService';
import alertMonitoringService from '../../../src/services/alertMonitoringService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/services/alertService');
jest.mock('../../../src/services/notificationService');
jest.mock('../../../src/services/alertMonitoringService');

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createRequest = (options: Partial<Request & { user?: any }> = {}): Request & { user?: any } => ({
  body: {},
  params: {},
  query: {},
  user: {
    _id: new mongoose.Types.ObjectId().toHexString(),
    role: 'doctor',
  },
  ...options,
});

describe('Alert Controller - createCriticalSymptomAlert', () => {
  it('crea una alerta crítica usando el servicio', async () => {
    const mockAlert = { _id: 'alert-id', status: 'pending' };
    (alertService.createCriticalSymptomAlert as jest.Mock).mockResolvedValue(mockAlert);

    const req = createRequest({
      body: {
        userId: 'user-id',
        symptomName: 'tos',
        severity: 'high',
      },
    });
    const res = mockResponse();

    await createCriticalSymptomAlert(req, res);

    expect(alertService.createCriticalSymptomAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        symptomName: 'tos',
        severity: 'high',
        doctorId: req.user?._id,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockAlert,
      })
    );
  });
});

describe('Alert Controller - scheduleMedicationReminder', () => {
  it('lanza AppError si falta scheduleTime', async () => {
    const req = createRequest({
      body: {},
    });
    const res = mockResponse();

    await expect(scheduleMedicationReminder(req, res)).rejects.toBeInstanceOf(AppError);
  });

  it('programa un recordatorio de medicamento', async () => {
    const mockAlert = { _id: 'alert-id', status: 'scheduled' };
    (alertService.scheduleMedicationReminder as jest.Mock).mockResolvedValue(mockAlert);

    const req = createRequest({
      body: {
        userId: 'patient-id',
        medicationName: 'Ibuprofeno',
        dosage: '200mg',
        scheduleTime: new Date().toISOString(),
      },
    });
    const res = mockResponse();

    await scheduleMedicationReminder(req, res);

    expect(alertService.scheduleMedicationReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'patient-id',
        medicationName: 'Ibuprofeno',
        doctorId: req.user?._id,
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockAlert,
      })
    );
  });
});

describe('Alert Controller - getUserAlerts', () => {
  it('obtiene alertas del usuario autenticado cuando no es admin', async () => {
    const req = createRequest({
      user: {
        _id: 'patient-id',
        role: 'patient',
      },
    });
    const res = mockResponse();

    const mockAlerts = [{ _id: 'alert1' }];
    (alertService.getAlertsForUser as jest.Mock).mockResolvedValue(mockAlerts);

    await getUserAlerts(req, res);

    expect(alertService.getAlertsForUser).toHaveBeenCalledWith('patient-id', expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockAlerts,
      })
    );
  });

  it('permite a admin consultar alertas de otro usuario', async () => {
    const req = createRequest({
      user: { _id: 'admin-id', role: 'admin' },
      query: { userId: 'target-id', status: ['pending', 'delivered'] },
    });
    const res = mockResponse();
    const mockAlerts = [{ _id: 'alert1' }];

    (alertService.getAlertsForUser as jest.Mock).mockResolvedValue(mockAlerts);

    await getUserAlerts(req, res);

    expect(alertService.getAlertsForUser).toHaveBeenCalledWith(
      'target-id',
      expect.objectContaining({
        status: ['pending', 'delivered'],
      })
    );
  });
});

describe('Alert Controller - processAlertsNow', () => {
  it('procesa alertas programadas y pendientes', async () => {
    (notificationService.processScheduledQueue as jest.Mock).mockResolvedValue(2);
    (alertService.processPendingAlerts as jest.Mock).mockResolvedValue({
      processed: 3,
      delivered: 3,
      failed: 0,
    });

    const req = createRequest();
    const res = mockResponse();

    await processAlertsNow(req, res);

    expect(notificationService.processScheduledQueue).toHaveBeenCalled();
    expect(alertService.processPendingAlerts).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          scheduledProcessed: 2,
          pendingResult: expect.objectContaining({
            processed: 3,
          }),
        }),
      })
    );
  });
});

describe('Alert Controller - getAlertMonitoringMetrics', () => {
  it('retorna snapshot de monitoreo', async () => {
    const snapshot = {
      queue: { scheduledSize: 2, nextScheduledAt: new Date(), nextScheduledAlertId: 'a1', scheduledWithinHour: 1 },
      alerts: { pending: 1, scheduled: 1, failed: 0, deliveredToday: 3, failedLast24h: 0, criticalOpen: 0 },
      recentFailures: [],
    };
    (alertMonitoringService.getSnapshot as jest.Mock).mockResolvedValue(snapshot);

    const req = createRequest();
    const res = mockResponse();

    await getAlertMonitoringMetrics(req, res);

    expect(alertMonitoringService.getSnapshot).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: snapshot,
      })
    );
  });
});

