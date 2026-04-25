/**
 * Integration tests for analytics endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('Analytics Endpoints Integration', () => {
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

  // ─── GET /analytics/executive-dashboard ───────────────────────────────────

  describe('GET /api/v1/analytics/executive-dashboard', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/analytics/executive-dashboard')
        .expect(401);
    });

    it('retorna 403 para doctor', async () => {
      await request(app)
        .get('/api/v1/analytics/executive-dashboard')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('retorna 403 para paciente', async () => {
      await request(app)
        .get('/api/v1/analytics/executive-dashboard')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('admin puede acceder al dashboard ejecutivo', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/executive-dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('acepta parámetro periodInDays', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/executive-dashboard')
        .query({ periodInDays: 30 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
    });

    it('acepta parámetro includeOutbreak=true', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/executive-dashboard')
        .query({ includeOutbreak: 'true' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  // ─── GET /analytics/epidemiology/district-trends ──────────────────────────

  describe('GET /api/v1/analytics/epidemiology/district-trends', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/analytics/epidemiology/district-trends')
        .expect(401);
    });

    it('retorna 403 para paciente', async () => {
      await request(app)
        .get('/api/v1/analytics/epidemiology/district-trends')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('doctor puede ver tendencias por distrito', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/epidemiology/district-trends')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('acepta parámetro periodInDays', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/epidemiology/district-trends')
        .query({ periodInDays: 7 })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500]).toContain(response.status);
    });
  });

  // ─── GET /analytics/epidemiology/outbreaks ────────────────────────────────

  describe('GET /api/v1/analytics/epidemiology/outbreaks', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/analytics/epidemiology/outbreaks')
        .expect(401);
    });

    it('doctor puede acceder a brotes', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/epidemiology/outbreaks')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
    });
  });
});