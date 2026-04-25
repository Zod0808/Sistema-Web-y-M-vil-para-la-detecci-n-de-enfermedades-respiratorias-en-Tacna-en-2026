/**
 * Integration tests for alert scheduling and dispatch pipelines
 */

import mongoose from 'mongoose';
import alertService from '../../src/services/alertService';
import notificationService from '../../src/services/notificationService';
import AlertModel from '../../src/models/Alert';

const scheduledEntries: Array<{ score: number; value: string }> = [];

const redisClientStub = {
  zAdd: jest.fn(async (_key: string, entry: { score: number; value: string }) => {
    scheduledEntries.push(entry);
  }),
  zRangeByScore: jest.fn(async (_key: string, min: number, max: number, options?: any) => {
    const limit = options?.LIMIT?.count ?? scheduledEntries.length;
    return scheduledEntries
      .filter((entry) => entry.score >= min && entry.score <= max)
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map((entry) => entry.value);
  }),
  zRem: jest.fn(async (_key: string, values: string[] | string) => {
    const list = Array.isArray(values) ? values : [values];
    let removed = 0;
    for (const value of list) {
      const index = scheduledEntries.findIndex((entry) => entry.value === value);
      if (index !== -1) {
        scheduledEntries.splice(index, 1);
        removed += 1;
      }
    }
    return removed;
  }),
};

jest.mock('../../src/config/redisClient', () => ({
  getRedisClient: jest.fn(() => redisClientStub),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Alert scheduling and dispatch integration', () => {
  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(async () => {
    scheduledEntries.length = 0;
    redisClientStub.zAdd.mockClear();
    redisClientStub.zRangeByScore.mockClear();
    redisClientStub.zRem.mockClear();
    await AlertModel.deleteMany({});
  });

  afterAll(async () => {
    await AlertModel.deleteMany({});
  });

  it('programa un recordatorio de medicamento y lo despacha desde la cola programada', async () => {
    const userId = new mongoose.Types.ObjectId().toHexString();
    const scheduleTime = new Date(Date.now() - 5_000); // en el pasado para que esté vencido

    const reminder = await alertService.scheduleMedicationReminder({
      userId,
      medicationName: 'Ibuprofeno 200mg',
      dosage: '1 tableta',
      scheduleTime,
    });

    expect(reminder.status).toBe('scheduled');
    expect(redisClientStub.zAdd).toHaveBeenCalledWith('notifications:scheduled', {
      score: scheduleTime.getTime(),
      value: reminder.id,
    });
    expect(scheduledEntries).toHaveLength(1);

    const processed = await notificationService.processScheduledQueue();
    expect(processed).toBe(1);
    expect(redisClientStub.zRem).toHaveBeenCalledWith('notifications:scheduled', [reminder.id]);

    const updated = await AlertModel.findById(reminder.id).lean();
    expect(updated).toBeTruthy();
    expect(updated?.status).toBe('delivered');
    expect(updated?.dispatchedAt).toBeTruthy();
  });

  it('despacha alertas pendientes utilizando MongoDB como fuente', async () => {
    const alertDoc = await AlertModel.create({
      userId: new mongoose.Types.ObjectId().toHexString(),
      title: 'Seguimiento inmediato requerido',
      message: 'El paciente reportó empeoramiento de síntomas.',
      category: 'doctor_notification',
      channels: ['in_app'],
      priority: 'high',
      status: 'pending',
      trigger: {
        source: 'doctor_portal',
      },
      metadata: {
        patientId: 'patient-123',
      },
      scheduledAt: new Date(Date.now() - 10_000),
    });

    const result = await notificationService.processPendingAlerts(5);
    expect(result).toEqual({
      processed: 1,
      delivered: 1,
      failed: 0,
    });

    const refreshed = await AlertModel.findById(alertDoc.id).lean();
    expect(refreshed?.status).toBe('delivered');
    expect(refreshed?.dispatchedAt).toBeTruthy();
  });
});

