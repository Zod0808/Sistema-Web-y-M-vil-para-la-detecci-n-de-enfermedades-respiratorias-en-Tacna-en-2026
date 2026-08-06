/**
 * Integration tests for consent endpoints
 * Tests consent registration (GDPR) and informed consent lifecycle
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../../src/index';
import { testUtils } from '../setup';
import ConsentLog from '../../src/models/ConsentLog';
import User from '../../src/models/User';

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

describe('Consent Endpoints Integration', () => {
  let doctorToken: string;
  let doctorId: string;
  let adminToken: string;
  let adminId: string;
  let patientToken: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    const doctor = await User.create({
      name: 'Consent Doctor',
      email: uniqueEmail('consentdoc'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true,
    });
    doctorId = doctor._id.toString();
    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

    const admin = await User.create({
      name: 'Consent Admin',
      email: uniqueEmail('consentadmin'),
      password: STRONG_PASSWORD,
      role: 'admin',
      isActive: true,
    });
    adminId = admin._id.toString();
    adminToken = testUtils.generateTestToken({ userId: adminId, role: 'admin' });

    const patient = await User.create({
      name: 'Consent Patient',
      email: uniqueEmail('consentpat'),
      password: STRONG_PASSWORD,
      role: 'patient',
      isActive: true,
    });
    patientId = patient._id.toString();
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
  });

  describe('POST /api/v1/consent — registrar consentimiento GDPR', () => {
    const buildConsentPayload = () => ({
      consents: [
        { id: 'terms_v1', accepted: true, timestamp: new Date().toISOString() },
        { id: 'privacy_v1', accepted: true, timestamp: new Date().toISOString() },
      ],
      version: '1.0',
    });

    it('registra consentimiento correctamente para paciente autenticado', async () => {
      const response = await request(app)
        .post('/api/v1/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(buildConsentPayload())
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();

      // Verify persisted in DB
      const log = await ConsentLog.findById(response.body.data.id);
      expect(log).not.toBeNull();
      expect(log!.userId).toBe(patientId);
      expect(log!.consents).toHaveLength(2);
    });

    it('registra consentimiento para doctor', async () => {
      const response = await request(app)
        .post('/api/v1/consent')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(buildConsentPayload())
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('retorna 400 sin campo consents', async () => {
      await request(app)
        .post('/api/v1/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ version: '1.0' })
        .expect(400);
    });

    it('retorna 400 cuando consents no es array', async () => {
      await request(app)
        .post('/api/v1/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ consents: 'not-an-array' })
        .expect(400);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/consent')
        .send(buildConsentPayload())
        .expect(401);
    });
  });

  describe('GET /api/v1/consent/:userId — obtener consentimiento del usuario', () => {
    it('retorna consentimiento activo del usuario', async () => {
      // First create a consent
      await request(app)
        .post('/api/v1/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          consents: [{ id: 'terms_v1', accepted: true, timestamp: new Date().toISOString() }],
        })
        .expect(201);

      const response = await request(app)
        .get(`/api/v1/consent/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get(`/api/v1/consent/${patientId}`)
        .expect(401);
    });
  });

  describe('Informed Consent (POST /api/v1/informed-consent)', () => {
    const buildInformedConsentPayload = () => ({
      patientId,
      patientName: 'Ana Torres',
      doctorId: adminId,
      doctorName: 'Dr. González',
      consentType: 'procedure',
      title: 'Consentimiento para broncoscopía',
      description: 'Se explican los riesgos y beneficios del procedimiento',
      risks: ['Hemorragia leve', 'Infección'],
      benefits: ['Diagnóstico definitivo'],
    });

    it('crea consentimiento informado (admin)', async () => {
      const response = await request(app)
        .post('/api/v1/informed-consent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildInformedConsentPayload())
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });

    it('retorna 403 para paciente', async () => {
      await request(app)
        .post('/api/v1/informed-consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(buildInformedConsentPayload())
        .expect(403);
    });

    it('retorna 400 con consentType inválido', async () => {
      await request(app)
        .post('/api/v1/informed-consent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...buildInformedConsentPayload(), consentType: 'invalid' })
        .expect(400);
    });

    it('retorna 400 sin title', async () => {
      const payload = buildInformedConsentPayload();
      delete (payload as any).title;

      await request(app)
        .post('/api/v1/informed-consent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(400);
    });
  });
});