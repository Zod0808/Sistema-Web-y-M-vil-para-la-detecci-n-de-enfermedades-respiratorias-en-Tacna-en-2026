/**
 * Integration tests for SMS endpoints (metrics and webhooks)
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('SMS Endpoints Integration', () => {
  let adminToken: string;
  let doctorToken: string;

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
  });

  describe('GET /api/v1/sms/metrics — métricas de SMS', () => {
    it('retorna métricas para admin', async () => {
      const response = await request(app)
        .get('/api/v1/sms/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 403 para doctor', async () => {
      await request(app)
        .get('/api/v1/sms/metrics')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/sms/metrics')
        .expect(401);
    });

    it('acepta filtro por proveedor', async () => {
      const response = await request(app)
        .get('/api/v1/sms/metrics')
        .query({ provider: 'twilio' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/sms/metrics/costs — costos de SMS', () => {
    it('retorna costos para admin', async () => {
      const response = await request(app)
        .get('/api/v1/sms/metrics/costs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('acepta filtro por fecha y proveedor', async () => {
      const response = await request(app)
        .get('/api/v1/sms/metrics/costs')
        .query({
          startDate: '2026-01-01',
          endDate: '2026-04-01',
          provider: 'twilio',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 403 para doctor', async () => {
      await request(app)
        .get('/api/v1/sms/metrics/costs')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/sms/metrics/rate-limit — rate limit stats', () => {
    it('retorna estadísticas de rate limiting para admin', async () => {
      const response = await request(app)
        .get('/api/v1/sms/metrics/rate-limit')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 403 para doctor', async () => {
      await request(app)
        .get('/api/v1/sms/metrics/rate-limit')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });
  });
});