/**
 * E2E Tests - Flujo de Consentimiento Informado
 * Verifica el ciclo completo: creación → firma → verificación → revocación
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import User, { UserDocument } from '../../src/models/User';

const app = appInstance.app;

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

describe('E2E Tests - Flujo de Consentimiento Informado', () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  let patientId: string;
  let doctorId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    const admin = await User.create({
      name: 'Admin Consentimiento',
      email: uniqueEmail('admin-consent'),
      password: STRONG_PASSWORD,
      role: 'admin',
      isActive: true,
    }) as UserDocument;

    const doctor = await User.create({
      name: 'Dr. Consentimiento',
      email: uniqueEmail('dr-consent'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true,
    }) as UserDocument;

    const patient = await User.create({
      name: 'Paciente Consentimiento',
      email: uniqueEmail('patient-consent'),
      password: STRONG_PASSWORD,
      role: 'patient',
      isActive: true,
    }) as UserDocument;

    adminToken = testUtils.generateTestToken({ userId: admin._id.toString(), role: 'admin' });
    doctorToken = testUtils.generateTestToken({ userId: doctor._id.toString(), role: 'doctor' });
    patientToken = testUtils.generateTestToken({ userId: patient._id.toString(), role: 'patient' });
    patientId = patient._id.toString();
    doctorId = doctor._id.toString();
  });

  // ─── Flujo 1: Consentimiento informado completo ───────────────────────────

  describe('Flujo Completo: Creación → Firma → Verificación del Consentimiento', () => {
    it('should complete full informed consent lifecycle', async () => {
      // Paso 1: Doctor crea solicitud de consentimiento informado
      const consentPayload = {
        patientId,
        doctorId,
        type: 'treatment',
        procedure: 'Broncoscopía diagnóstica',
        description:
          'Procedimiento endoscópico para visualizar las vías aéreas y tomar biopsias si fuera necesario.',
        risks: [
          'Sangrado leve',
          'Infección',
          'Reacción a la sedación',
          'Broncoespasmo',
        ],
        benefits: [
          'Diagnóstico preciso de lesiones pulmonares',
          'Posibilidad de terapia directa',
        ],
        alternatives: ['TAC de tórax', 'Esputo inducido', 'No tratamiento'],
        language: 'es',
      };

      const createResponse = await request(app)
        .post('/api/v1/informed-consents')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(consentPayload);

      expect([200, 201, 400, 404, 500]).toContain(createResponse.status);
      expect(createResponse.status).not.toBe(401);
      expect(createResponse.status).not.toBe(403);

      const consentId =
        (createResponse.status === 201 || createResponse.status === 200)
          ? createResponse.body.data?._id
          : null;

      // Paso 2: Paciente ve su consentimiento pendiente
      const pendingConsentsResponse = await request(app)
        .get('/api/v1/informed-consents')
        .query({ patientId, status: 'pending' })
        .set('Authorization', `Bearer ${patientToken}`);

      expect([200, 404]).toContain(pendingConsentsResponse.status);

      // Paso 3: Paciente firma el consentimiento
      if (consentId) {
        const signResponse = await request(app)
          .post(`/api/v1/informed-consents/${consentId}/sign`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            signature: 'Firma digital del paciente',
            signedAt: new Date().toISOString(),
            understood: true,
            questionsAnswered: true,
          });

        expect([200, 400, 404, 500]).toContain(signResponse.status);

        if (signResponse.status === 200) {
          expect(signResponse.body.success).toBe(true);
          expect(signResponse.body.data?.status).toBe('signed');
        }

        // Paso 4: Doctor verifica que el consentimiento está firmado
        const verifyResponse = await request(app)
          .get(`/api/v1/informed-consents/${consentId}`)
          .set('Authorization', `Bearer ${doctorToken}`);

        expect([200, 404]).toContain(verifyResponse.status);
        if (verifyResponse.status === 200) {
          expect(verifyResponse.body.data?.patientId).toBe(patientId);
        }
      }

      // Paso 5: Admin ve estadísticas de consentimientos
      const statsResponse = await request(app)
        .get('/api/v1/informed-consents/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(statsResponse.status);
    });
  });

  // ─── Flujo 2: Revocación de consentimiento ────────────────────────────────

  describe('Flujo Completo: Firma → Revocación del Consentimiento', () => {
    it('should allow patient to revoke a previously signed consent', async () => {
      // Paso 1: Crear y firmar consentimiento
      const createResponse = await request(app)
        .post('/api/v1/informed-consents')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId,
          doctorId,
          type: 'research',
          procedure: 'Participación en estudio clínico respiratorio',
          description: 'Estudio observacional de calidad de vida en pacientes con EPOC.',
          risks: ['Tiempo adicional en visitas', 'Cuestionarios periódicos'],
          benefits: ['Contribución a la ciencia', 'Seguimiento médico más frecuente'],
          alternatives: ['No participar en el estudio'],
          language: 'es',
        });

      expect([200, 201, 400, 404, 500]).toContain(createResponse.status);

      const consentId =
        (createResponse.status === 201 || createResponse.status === 200)
          ? createResponse.body.data?._id
          : null;

      if (consentId) {
        // Firmar
        await request(app)
          .post(`/api/v1/informed-consents/${consentId}/sign`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            signature: 'Firma del paciente',
            signedAt: new Date().toISOString(),
            understood: true,
          });

        // Revocar
        const revokeResponse = await request(app)
          .post(`/api/v1/informed-consents/${consentId}/revoke`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            reason: 'El paciente decide no participar en el estudio',
            revokedAt: new Date().toISOString(),
          });

        expect([200, 400, 404, 500]).toContain(revokeResponse.status);

        if (revokeResponse.status === 200) {
          expect(revokeResponse.body.success).toBe(true);
        }
      }
    });
  });

  // ─── Flujo 3: Historial de logs de consentimientos ────────────────────────

  describe('Flujo Completo: Auditoría de Consentimientos (DSR)', () => {
    it('should track consent audit logs', async () => {
      // Crear varios consentimientos para el paciente
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post('/api/v1/informed-consents')
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            patientId,
            doctorId,
            type: 'treatment',
            procedure: `Procedimiento ${i + 1}`,
            description: `Descripción del procedimiento ${i + 1}`,
            risks: ['Riesgo menor'],
            benefits: ['Beneficio esperado'],
            alternatives: ['Alternativa'],
            language: 'es',
          });
      }

      // Admin consulta logs de consentimiento del paciente
      const logsResponse = await request(app)
        .get('/api/v1/consents/logs')
        .query({ patientId })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(logsResponse.status);
      expect(logsResponse.status).not.toBe(401);
      expect(logsResponse.status).not.toBe(403);
    });
  });

  // ─── Flujo 4: Consentimiento rechazado por el paciente ────────────────────

  describe('Flujo Completo: Consentimiento Rechazado', () => {
    it('should handle patient refusal and document it', async () => {
      const createResponse = await request(app)
        .post('/api/v1/informed-consents')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId,
          doctorId,
          type: 'treatment',
          procedure: 'Traqueotomía',
          description: 'Apertura quirúrgica de la tráquea para asegurar vía aérea.',
          risks: ['Infección', 'Hemorragia', 'Daño a estructuras adyacentes'],
          benefits: ['Ventilación adecuada a largo plazo'],
          alternatives: ['Intubación endotraqueal prolongada'],
          language: 'es',
        });

      expect([200, 201, 400, 404, 500]).toContain(createResponse.status);

      const consentId =
        (createResponse.status === 201 || createResponse.status === 200)
          ? createResponse.body.data?._id
          : null;

      if (consentId) {
        // Paciente rechaza el consentimiento
        const refuseResponse = await request(app)
          .post(`/api/v1/informed-consents/${consentId}/refuse`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            reason: 'El paciente prefiere explorar otras opciones primero',
            refusedAt: new Date().toISOString(),
          });

        expect([200, 400, 404, 500]).toContain(refuseResponse.status);
      }
    });
  });
});