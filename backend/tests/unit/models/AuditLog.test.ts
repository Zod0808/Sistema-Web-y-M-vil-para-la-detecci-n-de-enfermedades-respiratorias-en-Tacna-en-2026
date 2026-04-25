import mongoose from 'mongoose';
import { AuditLog } from '../../../src/models/AuditLog';

const buildAuditLogData = (overrides: Partial<Record<string, any>> = {}) => ({
  method: 'POST',
  route: '/api/v1/patients',
  statusCode: 201,
  ip: '127.0.0.1',
  ...overrides,
});

describe('AuditLog model', () => {
  beforeEach(async () => {
    await AuditLog.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('validación', () => {
    it('crea AuditLog con campos requeridos', async () => {
      const log = await AuditLog.create(buildAuditLogData());

      expect(log._id).toBeDefined();
      expect(log.method).toBe('POST');
      expect(log.route).toBe('/api/v1/patients');
      expect(log.statusCode).toBe(201);
      expect(log.ip).toBe('127.0.0.1');
    });

    it('falla sin method', async () => {
      await expect(
        AuditLog.create(buildAuditLogData({ method: undefined }))
      ).rejects.toThrow();
    });

    it('falla sin route', async () => {
      await expect(
        AuditLog.create(buildAuditLogData({ route: undefined }))
      ).rejects.toThrow();
    });

    it('falla sin statusCode', async () => {
      await expect(
        AuditLog.create(buildAuditLogData({ statusCode: undefined }))
      ).rejects.toThrow();
    });

    it('falla sin ip', async () => {
      await expect(
        AuditLog.create(buildAuditLogData({ ip: undefined }))
      ).rejects.toThrow();
    });

    it('permite campos opcionales', async () => {
      const log = await AuditLog.create(
        buildAuditLogData({
          userId: 'user-123',
          userAgent: 'Mozilla/5.0',
          payloadHash: 'a'.repeat(64),
          redactedPayload: { email: '[REDACTED]' },
        })
      );

      expect(log.userId).toBe('user-123');
      expect(log.userAgent).toBe('Mozilla/5.0');
      expect(log.payloadHash).toBe('a'.repeat(64));
      expect(log.redactedPayload).toEqual({ email: '[REDACTED]' });
    });

    it('asigna createdAt por defecto', async () => {
      const before = new Date();
      const log = await AuditLog.create(buildAuditLogData());
      const after = new Date();

      expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(log.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('consultas', () => {
    it('permite buscar por userId', async () => {
      await AuditLog.create(buildAuditLogData({ userId: 'user-A' }));
      await AuditLog.create(buildAuditLogData({ userId: 'user-A' }));
      await AuditLog.create(buildAuditLogData({ userId: 'user-B' }));

      const logs = await AuditLog.find({ userId: 'user-A' });

      expect(logs).toHaveLength(2);
    });

    it('permite buscar por route', async () => {
      await AuditLog.create(buildAuditLogData({ route: '/api/v1/auth/login' }));
      await AuditLog.create(buildAuditLogData({ route: '/api/v1/patients' }));

      const logs = await AuditLog.find({ route: '/api/v1/auth/login' });

      expect(logs).toHaveLength(1);
    });

    it('permite buscar por statusCode', async () => {
      await AuditLog.create(buildAuditLogData({ statusCode: 200 }));
      await AuditLog.create(buildAuditLogData({ statusCode: 500 }));
      await AuditLog.create(buildAuditLogData({ statusCode: 500 }));

      const errorLogs = await AuditLog.find({ statusCode: 500 });

      expect(errorLogs).toHaveLength(2);
    });

    it('ordena por createdAt descendente', async () => {
      await AuditLog.create(buildAuditLogData({ method: 'GET' }));
      await new Promise(r => setTimeout(r, 10));
      await AuditLog.create(buildAuditLogData({ method: 'POST' }));

      const logs = await AuditLog.find({}).sort({ createdAt: -1 });

      expect(logs[0].method).toBe('POST');
      expect(logs[1].method).toBe('GET');
    });
  });
});