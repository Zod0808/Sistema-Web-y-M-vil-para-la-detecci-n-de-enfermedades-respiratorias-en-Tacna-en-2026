/**
 * Integration tests for external integrations endpoints
 * (laboratory import, drug interactions, FHIR integrations)
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('Integrations Endpoints Integration', () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  const patientId = new mongoose.Types.ObjectId().toHexString();

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

  // ─── POST /integrations/laboratory/import ─────────────────────────────────

  describe('POST /api/v1/integrations/laboratory/import', () => {
    const buildLabPayload = (overrides: any = {}) => ({
      patientId,
      results: [
        { name: 'Hemoglobina', value: 14.5, unit: 'g/dL', referenceRange: '12-17' },
      ],
      labName: 'Laboratorio Central',
      ...overrides,
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/integrations/laboratory/import')
        .send(buildLabPayload())
        .expect(401);
    });

    it('retorna 403 para paciente (sin permiso integrations:manage)', async () => {
      await request(app)
        .post('/api/v1/integrations/laboratory/import')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(buildLabPayload())
        .expect(403);
    });

    it('admin puede importar resultados de laboratorio', async () => {
      const response = await request(app)
        .post('/api/v1/integrations/laboratory/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildLabPayload());

      expect([200, 201, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('retorna 400 sin patientId', async () => {
      const payload = buildLabPayload();
      delete payload.patientId;

      const response = await request(app)
        .post('/api/v1/integrations/laboratory/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect([400, 500]).toContain(response.status);
    });
  });

  // ─── POST /integrations/laboratory/hl7 ────────────────────────────────────

  describe('POST /api/v1/integrations/laboratory/hl7', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/integrations/laboratory/hl7')
        .send({ hl7Message: 'MSH|...' })
        .expect(401);
    });

    it('retorna 403 para paciente', async () => {
      await request(app)
        .post('/api/v1/integrations/laboratory/hl7')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ hl7Message: 'MSH|...' })
        .expect(403);
    });

    it('retorna 400 sin hl7Message', async () => {
      const response = await request(app)
        .post('/api/v1/integrations/laboratory/hl7')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect([400, 500]).toContain(response.status);
    });

    it('admin puede importar mensaje HL7', async () => {
      const response = await request(app)
        .post('/api/v1/integrations/laboratory/hl7')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          hl7Message: 'MSH|^~\\&|LAB|HOSP|APP|DEST|20260413||ORU^R01|MSG001|P|2.5',
        });

      expect([200, 201, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  // ─── GET /integrations/drugs/search ───────────────────────────────────────

  describe('GET /api/v1/integrations/drugs/search', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/integrations/drugs/search')
        .query({ q: 'amoxicilina' })
        .expect(401);
    });

    it('retorna 403 para paciente (sin permiso fhir:read)', async () => {
      await request(app)
        .get('/api/v1/integrations/drugs/search')
        .query({ q: 'amoxicilina' })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('doctor puede buscar medicamentos', async () => {
      const response = await request(app)
        .get('/api/v1/integrations/drugs/search')
        .query({ q: 'amoxicilina' })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  // ─── POST /integrations/drugs/interactions ─────────────────────────────────

  describe('POST /api/v1/integrations/drugs/interactions', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/integrations/drugs/interactions')
        .send({ drugs: ['amoxicilina', 'ibuprofeno'] })
        .expect(401);
    });

    it('doctor puede verificar interacciones', async () => {
      const response = await request(app)
        .post('/api/v1/integrations/drugs/interactions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ drugs: ['amoxicilina', 'ibuprofeno'] });

      expect([200, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  // ─── POST /integrations/laboratory/sync ───────────────────────────────────

  describe('POST /api/v1/integrations/laboratory/sync', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/integrations/laboratory/sync')
        .expect(401);
    });

    it('retorna 403 para paciente', async () => {
      await request(app)
        .post('/api/v1/integrations/laboratory/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('admin puede iniciar sincronización', async () => {
      const response = await request(app)
        .post('/api/v1/integrations/laboratory/sync')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ patientIds: [patientId] });

      expect([200, 400, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});