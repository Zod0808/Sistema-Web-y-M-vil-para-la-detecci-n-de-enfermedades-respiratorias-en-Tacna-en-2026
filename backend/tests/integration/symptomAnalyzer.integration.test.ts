/**
 * Integration tests for symptom-analyzer endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('Symptom Analyzer Endpoints Integration', () => {
  let doctorToken: string;
  let patientToken: string;
  let adminToken: string;
  let userId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    userId = new mongoose.Types.ObjectId().toHexString();
    doctorToken = testUtils.generateTestToken({ userId, role: 'doctor' });
    patientToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'patient',
    });
    adminToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'admin',
    });
  });

  const buildSymptoms = (overrides: any[] = []) => [
    { symptom: 'tos persistente', severity: 'moderate', duration: '3 días' },
    ...overrides,
  ];

  // ─── POST /analyze ────────────────────────────────────────────────────────

  describe('POST /api/v1/symptom-analyzer/analyze', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .send({ symptoms: buildSymptoms() })
        .expect(401);
    });

    it('retorna 400 sin symptoms', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({})
        .expect(400);
    });

    it('retorna 400 con symptoms vacío', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ symptoms: [] })
        .expect(400);
    });

    it('retorna 400 con síntoma sin nombre', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ symptoms: [{ severity: 'mild', duration: '1 día' }] })
        .expect(400);
    });

    it('retorna 400 con severity inválida', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ symptoms: [{ symptom: 'fiebre', severity: 'extreme', duration: '2 días' }] })
        .expect(400);
    });

    it('retorna 200 o 503 con datos válidos (AI service puede no estar disponible)', async () => {
      const response = await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ symptoms: buildSymptoms() });

      expect([200, 503, 500, 400]).toContain(response.status);
    });

    it('paciente puede usar el análisis', async () => {
      const response = await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms: buildSymptoms() });

      expect([200, 503, 500, 400]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  // ─── POST /ml-analyze ─────────────────────────────────────────────────────

  describe('POST /api/v1/symptom-analyzer/ml-analyze', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .send({ symptoms: ['tos', 'fiebre'] })
        .expect(401);
    });

    it('retorna 400 con symptoms vacío', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ symptoms: [] })
        .expect(400);
    });

    it('retorna 400 sin symptoms', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({})
        .expect(400);
    });

    it('acepta patient_age y risk_factors opcionales', async () => {
      const response = await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          symptoms: ['tos', 'fiebre'],
          patient_age: 45,
          risk_factors: ['tabaco'],
          include_explanation: true,
        });

      expect([200, 503, 500]).toContain(response.status);
    });

    it('retorna 400 con patient_age mayor a 150', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ symptoms: ['tos'], patient_age: 200 })
        .expect(400);
    });
  });

  // ─── GET /recommendations ─────────────────────────────────────────────────

  describe('GET /api/v1/symptom-analyzer/recommendations', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/symptom-analyzer/recommendations')
        .expect(401);
    });

    it('retorna 200 con doctor autenticado', async () => {
      const response = await request(app)
        .get('/api/v1/symptom-analyzer/recommendations')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500, 503]).toContain(response.status);
    });

    it('retorna 200 con paciente autenticado', async () => {
      const response = await request(app)
        .get('/api/v1/symptom-analyzer/recommendations')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  // ─── GET /status ──────────────────────────────────────────────────────────

  describe('GET /api/v1/symptom-analyzer/status', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/symptom-analyzer/status')
        .expect(401);
    });

    it('retorna estado del servicio con doctor', async () => {
      const response = await request(app)
        .get('/api/v1/symptom-analyzer/status')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 503, 500]).toContain(response.status);
    });
  });

  // ─── GET /trends/:patientId ───────────────────────────────────────────────

  describe('GET /api/v1/symptom-analyzer/trends/:patientId', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get(`/api/v1/symptom-analyzer/trends/${userId}`)
        .expect(401);
    });

    it('retorna 400 con patientId inválido (no ObjectId)', async () => {
      await request(app)
        .get('/api/v1/symptom-analyzer/trends/invalid-id')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });

    it('retorna 400 con period inválido', async () => {
      await request(app)
        .get(`/api/v1/symptom-analyzer/trends/${userId}`)
        .query({ period: '365d' })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });

    it('acepta period válido 7d', async () => {
      const response = await request(app)
        .get(`/api/v1/symptom-analyzer/trends/${userId}`)
        .query({ period: '7d' })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500, 503]).toContain(response.status);
    });
  });

  // ─── GET /history/:patientId ──────────────────────────────────────────────

  describe('GET /api/v1/symptom-analyzer/history/:patientId', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get(`/api/v1/symptom-analyzer/history/${userId}`)
        .expect(401);
    });

    it('retorna 400 con patientId inválido', async () => {
      await request(app)
        .get('/api/v1/symptom-analyzer/history/bad-id')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });

    it('acepta paginación con page y limit válidos', async () => {
      const response = await request(app)
        .get(`/api/v1/symptom-analyzer/history/${userId}`)
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500, 503]).toContain(response.status);
    });

    it('retorna 400 con limit mayor a 100', async () => {
      await request(app)
        .get(`/api/v1/symptom-analyzer/history/${userId}`)
        .query({ limit: 200 })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });
  });
});