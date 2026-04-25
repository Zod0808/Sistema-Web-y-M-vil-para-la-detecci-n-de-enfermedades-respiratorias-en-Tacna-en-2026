/**
 * Integration tests for laboratory endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';
import LabResult from '../../src/models/LabResult';

describe('Laboratory Endpoints Integration', () => {
  let doctorToken: string;
  let adminToken: string;
  let patientToken: string;
  let patientId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    patientId = new mongoose.Types.ObjectId();

    doctorToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'doctor',
    });
    adminToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'admin',
    });
    patientToken = testUtils.generateTestToken({
      userId: patientId.toHexString(),
      role: 'patient',
    });
  });

  describe('GET /api/v1/lab/results', () => {
    it('retorna resultados de laboratorio con autenticación de doctor', async () => {
      const response = await request(app)
        .get('/api/v1/lab/results')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/lab/results')
        .expect(401);
    });

    it('permite filtrar por patientId', async () => {
      const response = await request(app)
        .get('/api/v1/lab/results')
        .query({ patientId: patientId.toHexString() })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 400 con patientId inválido', async () => {
      await request(app)
        .get('/api/v1/lab/results')
        .query({ patientId: 'invalid-id' })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });
  });

  describe('POST /api/v1/lab/results/import', () => {
    const validResult = () => ({
      patientId: new mongoose.Types.ObjectId().toHexString(),
      testName: 'Hemograma completo',
      category: 'hematology',
      status: 'completed',
    });

    it('importa resultados de laboratorio correctamente', async () => {
      const response = await request(app)
        .post('/api/v1/lab/results/import')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ results: [validResult()] })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('retorna 400 cuando results está vacío', async () => {
      await request(app)
        .post('/api/v1/lab/results/import')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ results: [] })
        .expect(400);
    });

    it('retorna 400 sin campo results', async () => {
      await request(app)
        .post('/api/v1/lab/results/import')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({})
        .expect(400);
    });

    it('retorna 401 sin token', async () => {
      await request(app)
        .post('/api/v1/lab/results/import')
        .send({ results: [validResult()] })
        .expect(401);
    });
  });

  describe('GET /api/v1/lab/patients/:patientId/history', () => {
    it('retorna historial de laboratorio del paciente', async () => {
      const response = await request(app)
        .get(`/api/v1/lab/patients/${patientId.toHexString()}/history`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 400 con patientId inválido', async () => {
      await request(app)
        .get('/api/v1/lab/patients/invalid-id/history')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });
  });

  describe('GET /api/v1/lab/results/abnormal', () => {
    it('retorna resultados anormales', async () => {
      const response = await request(app)
        .get('/api/v1/lab/results/abnormal')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/lab/results/critical', () => {
    it('retorna resultados críticos (solo admin)', async () => {
      const response = await request(app)
        .get('/api/v1/lab/results/critical')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});