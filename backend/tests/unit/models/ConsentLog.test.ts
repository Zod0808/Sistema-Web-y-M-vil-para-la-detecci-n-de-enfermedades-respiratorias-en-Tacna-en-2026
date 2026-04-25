import mongoose from 'mongoose';
import ConsentLog from '../../../src/models/ConsentLog';

const buildConsentData = (overrides: Partial<Record<string, any>> = {}) => ({
  userId: `user-${Math.random().toString(16).slice(2)}`,
  consents: [
    { id: 'terms_v1', accepted: true, timestamp: new Date() },
    { id: 'privacy_v1', accepted: true, timestamp: new Date() },
  ],
  version: '1.0',
  timestamp: new Date(),
  ...overrides,
});

describe('ConsentLog model', () => {
  beforeEach(async () => {
    await ConsentLog.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('validación', () => {
    it('crea ConsentLog con campos requeridos', async () => {
      const log = await ConsentLog.create(buildConsentData());

      expect(log._id).toBeDefined();
      expect(log.userId).toBeDefined();
      expect(log.consents).toHaveLength(2);
      expect(log.version).toBe('1.0');
    });

    it('falla sin userId', async () => {
      await expect(
        ConsentLog.create(buildConsentData({ userId: undefined }))
      ).rejects.toThrow();
    });

    it('usa versión por defecto 1.0', async () => {
      const data = buildConsentData();
      delete data.version;
      const log = await ConsentLog.create(data);

      expect(log.version).toBe('1.0');
    });

    it('falla cuando revokedReason supera 500 caracteres', async () => {
      await expect(
        ConsentLog.create(buildConsentData({ revokedReason: 'x'.repeat(501) }))
      ).rejects.toThrow();
    });

    it('permite revokedReason de 500 caracteres exactos', async () => {
      const log = await ConsentLog.create(buildConsentData({ revokedReason: 'x'.repeat(500) }));

      expect(log.revokedReason).toHaveLength(500);
    });

    it('permite campos opcionales: ipAddress, userAgent, revokedAt', async () => {
      const revokedAt = new Date();
      const log = await ConsentLog.create(
        buildConsentData({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          revokedAt,
          revokedReason: 'El usuario solicitó eliminación',
        })
      );

      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.userAgent).toBe('Mozilla/5.0');
      expect(log.revokedAt).toEqual(revokedAt);
    });
  });

  describe('statics.getLatestConsent', () => {
    it('retorna el consentimiento más reciente del usuario', async () => {
      const userId = 'user-static-1';
      const older = new Date(Date.now() - 10000);
      const newer = new Date();

      await ConsentLog.create(buildConsentData({ userId, timestamp: older }));
      await ConsentLog.create(buildConsentData({ userId, timestamp: newer }));

      const latest = await ConsentLog.getLatestConsent(userId);

      expect(latest).not.toBeNull();
      expect(latest!.timestamp.getTime()).toBeCloseTo(newer.getTime(), -2);
    });

    it('retorna null cuando no hay consentimiento activo', async () => {
      const latest = await ConsentLog.getLatestConsent('nonexistent-user');

      expect(latest).toBeNull();
    });

    it('excluye consentimientos revocados', async () => {
      const userId = 'user-revoked-1';
      await ConsentLog.create(buildConsentData({ userId, revokedAt: new Date() }));

      const latest = await ConsentLog.getLatestConsent(userId);

      expect(latest).toBeNull();
    });
  });

  describe('statics.revokeConsent', () => {
    it('revoca todos los consentimientos activos del usuario', async () => {
      const userId = 'user-revoke-2';
      await ConsentLog.create(buildConsentData({ userId }));
      await ConsentLog.create(buildConsentData({ userId }));

      await ConsentLog.revokeConsent(userId, 'Solicitud del usuario');

      const logs = await ConsentLog.find({ userId, revokedAt: { $exists: true } });
      expect(logs).toHaveLength(2);
      expect(logs[0].revokedReason).toBe('Solicitud del usuario');
    });

    it('usa razón por defecto cuando no se proporciona', async () => {
      const userId = 'user-revoke-3';
      await ConsentLog.create(buildConsentData({ userId }));

      await ConsentLog.revokeConsent(userId);

      const log = await ConsentLog.findOne({ userId, revokedAt: { $exists: true } });
      expect(log!.revokedReason).toBe('Revocado por el usuario');
    });

    it('no afecta consentimientos ya revocados', async () => {
      const userId = 'user-revoke-4';
      const alreadyRevoked = new Date(Date.now() - 5000);
      await ConsentLog.create(buildConsentData({ userId, revokedAt: alreadyRevoked }));

      await ConsentLog.revokeConsent(userId, 'Nueva revocación');

      const log = await ConsentLog.findOne({ userId });
      // Ya estaba revocado, la fecha no debe haber cambiado
      expect(log!.revokedAt!.getTime()).toBeCloseTo(alreadyRevoked.getTime(), -2);
    });
  });
});