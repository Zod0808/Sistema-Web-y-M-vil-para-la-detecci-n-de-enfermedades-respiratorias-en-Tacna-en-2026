/**
 * Integration tests for prescription endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('Prescription Endpoints Integration', () => {
  let doctorToken: string;
  let doctorId: string;
  let patientToken: string;
  let patientId: string;
  let adminToken: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    doctorId = new mongoose.Types.ObjectId().toHexString();
    patientId = new mongoose.Types.ObjectId().toHexString();

    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
    adminToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'admin',
    });
  });

  const buildPrescriptionPayload = (overrides: any = {}) => ({
    patientId: patientId,
    doctorId: doctorId,
    diagnosis: 'Neumonía bacteriana leve',
    medications: [
      {
        name: 'Amoxicilina',
        dosage: '500mg',
        frequencyPerDay: 3,
        durationDays: 7,
        instructions: 'Tomar con alimentos',
      },
    ],
    ...overrides,
  });

  describe('POST /api/v1/prescriptions — crear prescripción', () => {
    it('doctor crea prescripción correctamente', async () => {
      const response = await request(app)
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildPrescriptionPayload())
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        patientId: patientId,
        doctorId: doctorId,
        status: expect.any(String),
      });
    });

    it('retorna 403 para paciente (solo doctores pueden crear)', async () => {
      await request(app)
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(buildPrescriptionPayload())
        .expect(403);
    });

    it('retorna 400 sin medications', async () => {
      const payload = buildPrescriptionPayload();
      delete payload.medications;

      await request(app)
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload)
        .expect(400);
    });

    it('retorna 400 con medications vacío', async () => {
      await request(app)
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildPrescriptionPayload({ medications: [] }))
        .expect(400);
    });

    it('retorna 400 con frequencyPerDay inválida', async () => {
      await request(app)
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildPrescriptionPayload({
          medications: [{ name: 'Med', dosage: '10mg', frequencyPerDay: 15, durationDays: 7 }],
        }))
        .expect(400);
    });

    it('retorna 400 con durationDays fuera de rango', async () => {
      await request(app)
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildPrescriptionPayload({
          medications: [{ name: 'Med', dosage: '10mg', frequencyPerDay: 1, durationDays: 400 }],
        }))
        .expect(400);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/prescriptions')
        .send(buildPrescriptionPayload())
        .expect(401);
    });
  });

  describe('GET /api/v1/prescriptions — listar prescripciones', () => {
    it('doctor puede listar prescripciones', async () => {
      const response = await request(app)
        .get('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('paciente puede ver sus propias prescripciones', async () => {
      const response = await request(app)
        .get('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/prescriptions')
        .expect(401);
    });
  });

  describe('GET /api/v1/prescriptions/:id — obtener prescripción', () => {
    it('retorna 404 para ID inexistente', async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();

      await request(app)
        .get(`/api/v1/prescriptions/${fakeId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);
    });

    it('retorna prescripción existente', async () => {
      const createRes = await request(app)
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildPrescriptionPayload())
        .expect(201);

      const prescriptionId = createRes.body.data._id;

      const response = await request(app)
        .get(`/api/v1/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(prescriptionId);
    });
  });
});