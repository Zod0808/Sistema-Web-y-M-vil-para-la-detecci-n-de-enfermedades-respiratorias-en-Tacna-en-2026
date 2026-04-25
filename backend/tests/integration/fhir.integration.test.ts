/**
 * Integration tests for FHIR endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('FHIR Endpoints Integration', () => {
  let doctorToken: string;
  let adminToken: string;
  let patientToken: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    doctorToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'doctor',
    });
    adminToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'admin',
    });
    patientToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'patient',
    });
  });

  describe('GET /api/v1/fhir/capabilities', () => {
    it('retorna capabilities statement con autenticación', async () => {
      const response = await request(app)
        .get('/api/v1/fhir/capabilities')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/fhir/capabilities')
        .expect(401);
    });
  });

  describe('POST /api/v1/fhir/:resourceType — crear recurso FHIR', () => {
    const buildPatientResource = () => ({
      resourceType: 'Patient',
      name: [{ given: ['Juan'], family: 'Pérez' }],
      gender: 'male',
      birthDate: '1985-06-15',
    });

    it('crea recurso Patient correctamente', async () => {
      const response = await request(app)
        .post('/api/v1/fhir/Patient')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildPatientResource())
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('retorna 400 para resourceType inválido', async () => {
      await request(app)
        .post('/api/v1/fhir/InvalidResource')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ resourceType: 'InvalidResource' })
        .expect(400);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/fhir/Patient')
        .send(buildPatientResource())
        .expect(401);
    });
  });

  describe('GET /api/v1/fhir/:resourceType/:id — obtener recurso FHIR', () => {
    it('retorna 400 para resourceType inválido', async () => {
      await request(app)
        .get('/api/v1/fhir/InvalidResource/some-id')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(400);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/fhir/Patient/some-id')
        .expect(401);
    });
  });

  describe('POST /api/v1/fhir/validate — validar recurso FHIR', () => {
    it('valida recurso FHIR con estructura correcta', async () => {
      const response = await request(app)
        .post('/api/v1/fhir/validate')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          resourceType: 'Patient',
          name: [{ given: ['Ana'] }],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valid');
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/fhir/validate')
        .send({ resourceType: 'Patient' })
        .expect(401);
    });
  });

  describe('GET /api/v1/fhir/sync/hospitals', () => {
    it('retorna lista de hospitales registrados', async () => {
      const response = await request(app)
        .get('/api/v1/fhir/sync/hospitals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/fhir/sync/hospitals')
        .expect(401);
    });
  });

  describe('POST /api/v1/fhir/parse-hl7 — parsear HL7', () => {
    it('retorna 400 sin mensaje HL7', async () => {
      await request(app)
        .post('/api/v1/fhir/parse-hl7')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({})
        .expect(400);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/fhir/parse-hl7')
        .send({ hl7Message: 'MSH|^~\\&|...' })
        .expect(401);
    });
  });
});