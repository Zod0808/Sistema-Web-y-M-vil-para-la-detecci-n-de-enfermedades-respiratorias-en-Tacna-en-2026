import mongoose from 'mongoose';

jest.mock('../../../src/utils/encryption', () => ({
  applyFieldEncryption: (_schema: any, _fields: any[]) => {},
}));

import WearableData from '../../../src/models/WearableData';

const buildWearableData = (overrides: Partial<Record<string, any>> = {}) => ({
  patientId: new mongoose.Types.ObjectId(),
  timestamp: new Date(),
  source: 'manual' as const,
  ...overrides,
});

describe('WearableData model', () => {
  beforeEach(async () => {
    await WearableData.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('validación', () => {
    it('crea WearableData con campos requeridos', async () => {
      const data = await WearableData.create(buildWearableData());

      expect(data._id).toBeDefined();
      expect(data.source).toBe('manual');
      expect(data.timestamp).toBeDefined();
    });

    it('falla sin patientId', async () => {
      await expect(
        WearableData.create(buildWearableData({ patientId: undefined }))
      ).rejects.toThrow();
    });

    it('falla sin timestamp', async () => {
      await expect(
        WearableData.create(buildWearableData({ timestamp: undefined }))
      ).rejects.toThrow();
    });

    it('falla sin source', async () => {
      await expect(
        WearableData.create(buildWearableData({ source: undefined }))
      ).rejects.toThrow();
    });

    it('falla con source inválido', async () => {
      await expect(
        WearableData.create(buildWearableData({ source: 'fitbit' }))
      ).rejects.toThrow();
    });

    it('acepta source apple_health', async () => {
      const data = await WearableData.create(buildWearableData({ source: 'apple_health' }));
      expect(data.source).toBe('apple_health');
    });

    it('acepta source google_fit', async () => {
      const data = await WearableData.create(buildWearableData({ source: 'google_fit' }));
      expect(data.source).toBe('google_fit');
    });
  });

  describe('validación de rangos numéricos', () => {
    it('rechaza heartRate mayor a 300', async () => {
      await expect(
        WearableData.create(buildWearableData({ heartRate: 301 }))
      ).rejects.toThrow();
    });

    it('rechaza heartRate negativo', async () => {
      await expect(
        WearableData.create(buildWearableData({ heartRate: -1 }))
      ).rejects.toThrow();
    });

    it('acepta heartRate en rango válido', async () => {
      const data = await WearableData.create(buildWearableData({ heartRate: 75 }));
      expect(data.heartRate).toBe(75);
    });

    it('rechaza oxygenSaturation mayor a 100', async () => {
      await expect(
        WearableData.create(buildWearableData({ oxygenSaturation: 101 }))
      ).rejects.toThrow();
    });

    it('acepta oxygenSaturation en rango válido', async () => {
      const data = await WearableData.create(buildWearableData({ oxygenSaturation: 98 }));
      expect(data.oxygenSaturation).toBe(98);
    });

    it('rechaza respiratoryRate mayor a 100', async () => {
      await expect(
        WearableData.create(buildWearableData({ respiratoryRate: 101 }))
      ).rejects.toThrow();
    });

    it('acepta respiratoryRate en rango válido', async () => {
      const data = await WearableData.create(buildWearableData({ respiratoryRate: 16 }));
      expect(data.respiratoryRate).toBe(16);
    });

    it('rechaza sleepHours mayor a 24', async () => {
      await expect(
        WearableData.create(buildWearableData({ sleepHours: 25 }))
      ).rejects.toThrow();
    });

    it('acepta sleepHours en rango válido', async () => {
      const data = await WearableData.create(buildWearableData({ sleepHours: 8 }));
      expect(data.sleepHours).toBe(8);
    });

    it('acepta steps positivos', async () => {
      const data = await WearableData.create(buildWearableData({ steps: 10000 }));
      expect(data.steps).toBe(10000);
    });

    it('rechaza steps negativos', async () => {
      await expect(
        WearableData.create(buildWearableData({ steps: -1 }))
      ).rejects.toThrow();
    });

    it('acepta distance positiva', async () => {
      const data = await WearableData.create(buildWearableData({ distance: 5000 }));
      expect(data.distance).toBe(5000);
    });
  });

  describe('datos opcionales', () => {
    it('permite crear registro sin métricas', async () => {
      const data = await WearableData.create(buildWearableData());

      expect(data.heartRate).toBeUndefined();
      expect(data.oxygenSaturation).toBeUndefined();
      expect(data.steps).toBeUndefined();
    });

    it('incluye syncedAt por defecto', async () => {
      const before = new Date();
      const data = await WearableData.create(buildWearableData());
      const after = new Date();

      expect(data.syncedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(data.syncedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('permite registro completo con todas las métricas', async () => {
      const data = await WearableData.create(
        buildWearableData({
          heartRate: 70,
          oxygenSaturation: 97,
          steps: 8000,
          distance: 6400,
          respiratoryRate: 14,
          sleepHours: 7.5,
        })
      );

      expect(data.heartRate).toBe(70);
      expect(data.oxygenSaturation).toBe(97);
      expect(data.steps).toBe(8000);
      expect(data.distance).toBe(6400);
      expect(data.respiratoryRate).toBe(14);
      expect(data.sleepHours).toBe(7.5);
    });
  });

  describe('consultas', () => {
    it('busca por patientId', async () => {
      const patientId = new mongoose.Types.ObjectId();
      await WearableData.create(buildWearableData({ patientId }));
      await WearableData.create(buildWearableData({ patientId }));
      await WearableData.create(buildWearableData());

      const results = await WearableData.find({ patientId });

      expect(results).toHaveLength(2);
    });

    it('ordena por timestamp descendente', async () => {
      const patientId = new mongoose.Types.ObjectId();
      await WearableData.create(buildWearableData({ patientId, timestamp: new Date('2026-01-01') }));
      await WearableData.create(buildWearableData({ patientId, timestamp: new Date('2026-04-01') }));

      const results = await WearableData.find({ patientId }).sort({ timestamp: -1 });

      expect(results[0].timestamp.getUTCMonth()).toBe(3); // April UTC
    });
  });
});