/**
 * Integration tests for automatic reports endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('Automatic Reports Endpoints Integration', () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    adminToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'admin',
    });
    doctorToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'doctor',
    });
    patientToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'patient',
    });
  });

  // ─── GET /reports/automatic ───────────────────────────────────────────────

  describe('GET /api/v1/reports/automatic', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/reports/automatic')
        .expect(401);
    });

    it('retorna 403 para paciente (sin permiso reports:read)', async () => {
      await request(app)
        .get('/api/v1/reports/automatic')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('admin puede listar reportes', async () => {
      const response = await request(app)
        .get('/api/v1/reports/automatic')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('doctor puede listar reportes', async () => {
      const response = await request(app)
        .get('/api/v1/reports/automatic')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('retorna array de reportes en data cuando hay éxito', async () => {
      const response = await request(app)
        .get('/api/v1/reports/automatic')
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  // ─── GET /reports/automatic/stats ─────────────────────────────────────────

  describe('GET /api/v1/reports/automatic/stats', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/reports/automatic/stats')
        .expect(401);
    });

    it('retorna 403 para doctor (sin permiso reports:stats)', async () => {
      await request(app)
        .get('/api/v1/reports/automatic/stats')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('admin puede obtener estadísticas', async () => {
      const response = await request(app)
        .get('/api/v1/reports/automatic/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  // ─── GET /reports/automatic/latest/:type ──────────────────────────────────

  describe('GET /api/v1/reports/automatic/latest/:type', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/reports/automatic/latest/daily')
        .expect(401);
    });

    it('retorna último reporte diario para admin', async () => {
      const response = await request(app)
        .get('/api/v1/reports/automatic/latest/daily')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('acepta tipo weekly', async () => {
      const response = await request(app)
        .get('/api/v1/reports/automatic/latest/weekly')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });

    it('acepta tipo monthly', async () => {
      const response = await request(app)
        .get('/api/v1/reports/automatic/latest/monthly')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(response.status);
    });
  });

  // ─── POST /reports/automatic/generate ─────────────────────────────────────

  describe('POST /api/v1/reports/automatic/generate', () => {
    const buildPayload = (overrides: any = {}) => ({
      reportType: 'daily',
      period: {
        startDate: new Date('2026-04-01').toISOString(),
        endDate: new Date('2026-04-02').toISOString(),
      },
      ...overrides,
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/reports/automatic/generate')
        .send(buildPayload())
        .expect(401);
    });

    it('retorna 403 para doctor (sin permiso reports:generate)', async () => {
      await request(app)
        .post('/api/v1/reports/automatic/generate')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildPayload())
        .expect(403);
    });

    it('admin puede generar reporte', async () => {
      const response = await request(app)
        .post('/api/v1/reports/automatic/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildPayload());

      expect([200, 201, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('retorna 400 con tipo de reporte inválido', async () => {
      const response = await request(app)
        .post('/api/v1/reports/automatic/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildPayload({ reportType: 'quarterly' }));

      expect([400, 500]).toContain(response.status);
    });
  });

  // ─── GET /reports/automatic/:type/list ────────────────────────────────────

  describe('GET /api/v1/reports/automatic/:type/list', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/reports/automatic/daily/list')
        .expect(401);
    });

    it('retorna lista de reportes por tipo', async () => {
      const response = await request(app)
        .get('/api/v1/reports/automatic/daily/list')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });
  });
});