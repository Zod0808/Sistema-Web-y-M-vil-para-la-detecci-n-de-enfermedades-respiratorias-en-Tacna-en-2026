/**
 * Integration tests for appointment endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('Appointment Endpoints Integration', () => {
  let adminToken: string;
  let adminId: string;
  let doctorToken: string;
  let doctorId: string;
  let patientToken: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    adminId = new mongoose.Types.ObjectId().toHexString();
    doctorId = new mongoose.Types.ObjectId().toHexString();
    patientId = new mongoose.Types.ObjectId().toHexString();

    adminToken = testUtils.generateTestToken({ userId: adminId, role: 'admin' });
    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
  });

  const buildPayload = (overrides: any = {}) => ({
    patientId: patientId,
    doctorId: adminId, // admin can set any doctorId
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
    durationMinutes: 30,
    reason: 'Consulta de seguimiento respiratorio',
    ...overrides,
  });

  describe('POST /api/v1/appointments — crear cita', () => {
    it('crea cita correctamente con admin', async () => {
      const response = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildPayload())
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('scheduled');
    });

    it('retorna 400 con durationMinutes fuera de rango', async () => {
      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildPayload({ durationMinutes: 5 }))
        .expect(400);
    });

    it('retorna 400 sin patientId', async () => {
      const payload = buildPayload();
      delete payload.patientId;

      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(400);
    });

    it('retorna 400 con fecha inválida', async () => {
      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildPayload({ scheduledAt: 'not-a-date' }))
        .expect(400);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/appointments')
        .send(buildPayload())
        .expect(401);
    });

    it('paciente no puede crear cita para otro paciente', async () => {
      const otherPatientId = new mongoose.Types.ObjectId().toHexString();
      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(buildPayload({ patientId: otherPatientId, doctorId: patientId }))
        .expect(403);
    });
  });

  describe('GET /api/v1/appointments — listar citas', () => {
    it('retorna lista de citas para admin', async () => {
      const response = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('permite filtrar por status', async () => {
      const response = await request(app)
        .get('/api/v1/appointments')
        .query({ status: 'scheduled' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/appointments')
        .expect(401);
    });
  });

  describe('Ciclo completo: crear → cancelar', () => {
    it('crea y cancela una cita', async () => {
      const createRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildPayload())
        .expect(201);

      const appointmentId = createRes.body.data._id;

      const cancelRes = await request(app)
        .post(`/api/v1/appointments/${appointmentId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Paciente canceló por viaje' })
        .expect(200);

      expect(cancelRes.body.data.status).toBe('cancelled');
    });
  });

  describe('GET /api/v1/appointments/doctor/:doctorId/availability', () => {
    it('retorna disponibilidad del doctor', async () => {
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get(`/api/v1/appointments/doctor/${adminId}/availability`)
        .query({ start, end, slotMinutes: 30 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('retorna 400 con slotMinutes inválido', async () => {
      const start = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();

      await request(app)
        .get(`/api/v1/appointments/doctor/${adminId}/availability`)
        .query({ start, end, slotMinutes: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});