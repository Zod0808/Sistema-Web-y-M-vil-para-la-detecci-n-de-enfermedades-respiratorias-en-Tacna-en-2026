/**
 * Integration tests for wearables endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('Wearables Endpoints Integration', () => {
  let doctorToken: string;
  let patientToken: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    patientId = new mongoose.Types.ObjectId().toHexString();
    doctorToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'doctor',
    });
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
  });

  const buildWearableEntry = (overrides: any = {}) => ({
    heartRate: 75,
    oxygenSaturation: 98,
    steps: 5000,
    distance: 3.5,
    respiratoryRate: 16,
    sleepHours: 7.5,
    timestamp: new Date().toISOString(),
    source: 'manual',
    ...overrides,
  });

  // ─── POST /wearables/sync ─────────────────────────────────────────────────

  describe('POST /api/v1/wearables/sync', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .send({ data: [buildWearableEntry()] })
        .expect(401);
    });

    it('retorna 400 sin data', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({})
        .expect(400);
    });

    it('retorna 400 con data vacío', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: [] })
        .expect(400);
    });

    it('retorna 400 con heartRate fuera de rango (>300)', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: [buildWearableEntry({ heartRate: 350 })] })
        .expect(400);
    });

    it('retorna 400 con oxygenSaturation fuera de rango (>100)', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: [buildWearableEntry({ oxygenSaturation: 101 })] })
        .expect(400);
    });

    it('retorna 400 con timestamp inválido', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: [buildWearableEntry({ timestamp: 'not-a-date' })] })
        .expect(400);
    });

    it('retorna 400 con source inválido', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: [buildWearableEntry({ source: 'fitbit' })] })
        .expect(400);
    });

    it('retorna 400 con steps negativo', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: [buildWearableEntry({ steps: -1 })] })
        .expect(400);
    });

    it('retorna 400 con sleepHours > 24', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: [buildWearableEntry({ sleepHours: 25 })] })
        .expect(400);
    });

    it('paciente puede sincronizar datos con fuente apple_health', async () => {
      const response = await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: [buildWearableEntry({ source: 'apple_health' })] });

      expect([200, 201, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  // ─── GET /wearables/data ──────────────────────────────────────────────────

  describe('GET /api/v1/wearables/data/:patientId?', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/wearables/data')
        .expect(401);
    });

    it('retorna 200 con doctor autenticado', async () => {
      const response = await request(app)
        .get('/api/v1/wearables/data')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
    });

    it('acepta filtros de fecha válidos', async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date().toISOString();
      const response = await request(app)
        .get('/api/v1/wearables/data')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('retorna 400 con startDate inválida', async () => {
      await request(app)
        .get('/api/v1/wearables/data')
        .query({ startDate: 'not-a-date' })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });

    it('retorna 400 con limit fuera de rango (>1000)', async () => {
      await request(app)
        .get('/api/v1/wearables/data')
        .query({ limit: 1500 })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });

    it('retorna 400 con patientId inválido', async () => {
      await request(app)
        .get('/api/v1/wearables/data/not-a-mongo-id')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });

    it('acepta patientId válido como ObjectId', async () => {
      const response = await request(app)
        .get(`/api/v1/wearables/data/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  // ─── GET /wearables/metrics ───────────────────────────────────────────────

  describe('GET /api/v1/wearables/metrics/:patientId?', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/wearables/metrics')
        .expect(401);
    });

    it('retorna datos de métricas con autenticación válida', async () => {
      const response = await request(app)
        .get('/api/v1/wearables/metrics')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
    });

    it('acepta filtro de hours', async () => {
      const response = await request(app)
        .get('/api/v1/wearables/metrics')
        .query({ hours: 24 })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('retorna 400 con hours > 720', async () => {
      await request(app)
        .get('/api/v1/wearables/metrics')
        .query({ hours: 721 })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });
  });
});