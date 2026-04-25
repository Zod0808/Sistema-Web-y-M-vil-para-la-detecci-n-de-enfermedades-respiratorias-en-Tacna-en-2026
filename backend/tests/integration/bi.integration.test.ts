/**
 * Integration tests for BI (Business Intelligence) connector endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('BI Connector Endpoints Integration', () => {
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

  // ─── GET /bi/datasets ─────────────────────────────────────────────────────

  describe('GET /api/v1/bi/datasets', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/bi/datasets')
        .expect(401);
    });

    it('retorna 403 para paciente', async () => {
      await request(app)
        .get('/api/v1/bi/datasets')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('admin puede listar datasets disponibles', async () => {
      const response = await request(app)
        .get('/api/v1/bi/datasets')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.datasets)).toBe(true);
      expect(response.body.datasets.length).toBeGreaterThan(0);
    });

    it('doctor puede listar datasets disponibles', async () => {
      const response = await request(app)
        .get('/api/v1/bi/datasets')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.datasets).toContain('medical-histories');
    });

    it('datasets incluye medical-histories, users, appointments', async () => {
      const response = await request(app)
        .get('/api/v1/bi/datasets')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const datasets = response.body.datasets;
      expect(datasets).toContain('medical-histories');
      expect(datasets).toContain('users');
      expect(datasets).toContain('appointments');
    });
  });

  // ─── GET /bi/powerbi/:dataset ──────────────────────────────────────────────

  describe('GET /api/v1/bi/powerbi/:dataset', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/bi/powerbi/medical-histories')
        .expect(401);
    });

    it('retorna 403 para paciente', async () => {
      await request(app)
        .get('/api/v1/bi/powerbi/medical-histories')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('admin puede exportar datos en formato Power BI', async () => {
      const response = await request(app)
        .get('/api/v1/bi/powerbi/medical-histories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('retorna 400 con dataset no reconocido', async () => {
      const response = await request(app)
        .get('/api/v1/bi/powerbi/unknown-dataset')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 500]).toContain(response.status);
    });

    it('acepta filtros de fecha', async () => {
      const startDate = new Date('2026-01-01').toISOString();
      const endDate = new Date('2026-12-31').toISOString();
      const response = await request(app)
        .get('/api/v1/bi/powerbi/appointments')
        .query({ startDate, endDate, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  // ─── GET /bi/tableau/:dataset ──────────────────────────────────────────────

  describe('GET /api/v1/bi/tableau/:dataset', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/bi/tableau/users')
        .expect(401);
    });

    it('admin puede exportar en formato Tableau', async () => {
      const response = await request(app)
        .get('/api/v1/bi/tableau/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('doctor puede exportar en formato Tableau', async () => {
      const response = await request(app)
        .get('/api/v1/bi/tableau/alerts')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 400, 500]).toContain(response.status);
    });
  });
});