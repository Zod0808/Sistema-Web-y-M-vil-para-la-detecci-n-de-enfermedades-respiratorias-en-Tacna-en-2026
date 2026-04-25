/**
 * Integration tests for referral endpoints
 * Tests the full lifecycle: create → accept → complete
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';
import Referral from '../../src/models/Referral';

describe('Referral Endpoints Integration', () => {
  let doctorToken: string;
  let doctorId: string;
  let adminToken: string;
  let adminId: string;
  let patientToken: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    doctorId = new mongoose.Types.ObjectId().toHexString();
    adminId = new mongoose.Types.ObjectId().toHexString();
    patientId = new mongoose.Types.ObjectId().toHexString();

    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });
    adminToken = testUtils.generateTestToken({ userId: adminId, role: 'admin' });
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
  });

  const buildReferralPayload = (overrides: any = {}) => ({
    patientId: new mongoose.Types.ObjectId().toHexString(),
    patientName: 'Pedro García',
    referringDoctorId: adminId, // admin creates without restriction
    referringDoctorName: 'Dr. López',
    referralType: 'specialist',
    reason: 'Evaluación cardiológica por disnea progresiva',
    priority: 'high',
    ...overrides,
  });

  describe('POST /api/v1/referrals — crear referido', () => {
    it('crea un referido con éxito (admin)', async () => {
      const response = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildReferralPayload())
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        referralType: 'specialist',
        status: 'pending',
      });
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/referrals')
        .send(buildReferralPayload())
        .expect(401);
    });

    it('retorna 403 para pacientes', async () => {
      await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(buildReferralPayload())
        .expect(403);
    });

    it('retorna 400 sin reason', async () => {
      const payload = buildReferralPayload();
      delete payload.reason;

      await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(400);
    });

    it('retorna 400 con referralType inválido', async () => {
      await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildReferralPayload({ referralType: 'invalid_type' }))
        .expect(400);
    });
  });

  describe('GET /api/v1/referrals — listar referidos', () => {
    it('retorna lista de referidos para doctor', async () => {
      const response = await request(app)
        .get('/api/v1/referrals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('retorna lista de referidos para admin', async () => {
      const response = await request(app)
        .get('/api/v1/referrals')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna lista para paciente (solo sus propios referidos)', async () => {
      const response = await request(app)
        .get('/api/v1/referrals')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Ciclo completo: crear → aceptar → completar', () => {
    it('ciclo completo de referido con admin', async () => {
      // Step 1: Create
      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildReferralPayload())
        .expect(201);

      const referralId = createRes.body.data._id;
      expect(createRes.body.data.status).toBe('pending');

      // Step 2: Accept
      const acceptRes = await request(app)
        .post(`/api/v1/referrals/${referralId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ referredToDoctorId: adminId, notes: 'Cita programada para el martes' })
        .expect(200);

      expect(acceptRes.body.data.status).toBe('accepted');

      // Step 3: Complete
      const completeRes = await request(app)
        .post(`/api/v1/referrals/${referralId}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Paciente evaluado, sin hallazgos significativos' })
        .expect(200);

      expect(completeRes.body.data.status).toBe('completed');
    });
  });

  describe('POST /api/v1/referrals/:id/reject', () => {
    it('rechaza referido con razón', async () => {
      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildReferralPayload())
        .expect(201);

      const referralId = createRes.body.data._id;

      const rejectRes = await request(app)
        .post(`/api/v1/referrals/${referralId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'No disponible en la especialidad solicitada' })
        .expect(200);

      expect(rejectRes.body.data.status).toBe('rejected');
    });

    it('retorna 400 sin reason al rechazar', async () => {
      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildReferralPayload())
        .expect(201);

      await request(app)
        .post(`/api/v1/referrals/${createRes.body.data._id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/referrals/stats/summary', () => {
    it('retorna estadísticas para admin', async () => {
      const response = await request(app)
        .get('/api/v1/referrals/stats/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 403 para pacientes', async () => {
      await request(app)
        .get('/api/v1/referrals/stats/summary')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/referrals/pending/list', () => {
    it('retorna referidos pendientes', async () => {
      // Create a referral first
      await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildReferralPayload())
        .expect(201);

      const response = await request(app)
        .get('/api/v1/referrals/pending/list')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});