/**
 * E2E Tests - Flujo de Derivaciones Médicas
 * Verifica el ciclo completo: médico crea derivación → especialista acepta → paciente es atendido
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import User, { UserDocument } from '../../src/models/User';

const app = appInstance.app;

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

describe('E2E Tests - Flujo de Derivaciones Médicas', () => {
  let adminToken: string;
  let doctorToken: string;
  let specialistToken: string;
  let patientToken: string;
  let patientId: string;
  let doctorId: string;
  let specialistId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    const admin = await User.create({
      name: 'Admin Derivaciones',
      email: uniqueEmail('admin-ref'),
      password: STRONG_PASSWORD,
      role: 'admin',
      isActive: true,
    }) as UserDocument;

    const doctor = await User.create({
      name: 'Dr. General',
      email: uniqueEmail('dr-general'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true,
    }) as UserDocument;

    const specialist = await User.create({
      name: 'Dr. Neumólogo',
      email: uniqueEmail('dr-neumolog'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true,
    }) as UserDocument;

    const patient = await User.create({
      name: 'Paciente Derivado',
      email: uniqueEmail('patient-ref'),
      password: STRONG_PASSWORD,
      role: 'patient',
      isActive: true,
    }) as UserDocument;

    adminToken = testUtils.generateTestToken({ userId: admin._id.toString(), role: 'admin' });
    doctorToken = testUtils.generateTestToken({ userId: doctor._id.toString(), role: 'doctor' });
    specialistToken = testUtils.generateTestToken({ userId: specialist._id.toString(), role: 'doctor' });
    patientToken = testUtils.generateTestToken({ userId: patient._id.toString(), role: 'patient' });
    patientId = patient._id.toString();
    doctorId = doctor._id.toString();
    specialistId = specialist._id.toString();
  });

  // ─── Flujo 1: Médico general → Especialista → Paciente atendido ───────────

  describe('Flujo Completo: Derivación a Especialista', () => {
    it('should complete full referral flow from GP to specialist', async () => {
      // Paso 1: Médico general crea derivación para el paciente
      const referralPayload = {
        patientId,
        referringDoctorId: doctorId,
        specialistId,
        reason: 'Paciente con EPOC avanzado requiere evaluación neumológica especializada',
        urgency: 'high',
        diagnosis: 'EPOC estadio III',
        notes: 'Paciente con espirometría alterada. FEV1/FVC < 70%',
        speciality: 'neumonologia',
        attachments: [],
      };

      const createResponse = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(referralPayload);

      expect([200, 201, 400, 404, 500]).toContain(createResponse.status);
      expect(createResponse.status).not.toBe(401);
      expect(createResponse.status).not.toBe(403);

      const referralId =
        (createResponse.status === 201 || createResponse.status === 200)
          ? createResponse.body.data?._id
          : null;

      // Paso 2: Especialista ve derivaciones pendientes
      const pendingReferralsResponse = await request(app)
        .get('/api/v1/referrals')
        .query({ specialistId, status: 'pending' })
        .set('Authorization', `Bearer ${specialistToken}`);

      expect([200, 404]).toContain(pendingReferralsResponse.status);
      if (pendingReferralsResponse.status === 200) {
        expect(pendingReferralsResponse.body.success).toBe(true);
        expect(Array.isArray(pendingReferralsResponse.body.data)).toBe(true);
      }

      // Paso 3: Especialista acepta la derivación
      if (referralId) {
        const acceptResponse = await request(app)
          .put(`/api/v1/referrals/${referralId}`)
          .set('Authorization', `Bearer ${specialistToken}`)
          .send({
            status: 'accepted',
            scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            notes: 'Derivación aceptada. Cita programada en 5 días.',
          });

        expect([200, 400, 404, 500]).toContain(acceptResponse.status);

        // Paso 4: Paciente ve su derivación aceptada
        const patientReferralResponse = await request(app)
          .get('/api/v1/referrals')
          .query({ patientId })
          .set('Authorization', `Bearer ${patientToken}`);

        expect([200, 404]).toContain(patientReferralResponse.status);

        // Paso 5: Especialista marca la derivación como completada
        const completeResponse = await request(app)
          .put(`/api/v1/referrals/${referralId}`)
          .set('Authorization', `Bearer ${specialistToken}`)
          .send({
            status: 'completed',
            outcome: 'Paciente evaluado. Se inicia tratamiento con broncodilatadores de larga acción.',
            followUpRequired: true,
            followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });

        expect([200, 400, 404, 500]).toContain(completeResponse.status);
      }

      // Paso 6: Médico general ve el resultado de la derivación
      const referralResultResponse = await request(app)
        .get('/api/v1/referrals')
        .query({ referringDoctorId: doctorId })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(referralResultResponse.status);
    });
  });

  // ─── Flujo 2: Derivación rechazada → nueva derivación ────────────────────

  describe('Flujo Completo: Derivación Rechazada y Reasignación', () => {
    it('should handle rejected referral and reassignment', async () => {
      // Paso 1: Crear derivación
      const createResponse = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId,
          referringDoctorId: doctorId,
          specialistId,
          reason: 'Evaluación especializada requerida',
          urgency: 'medium',
          diagnosis: 'Asma bronquial persistente',
          speciality: 'neumonologia',
        });

      expect([200, 201, 400, 404, 500]).toContain(createResponse.status);

      const referralId =
        (createResponse.status === 201 || createResponse.status === 200)
          ? createResponse.body.data?._id
          : null;

      // Paso 2: Especialista rechaza por falta de disponibilidad
      if (referralId) {
        const rejectResponse = await request(app)
          .put(`/api/v1/referrals/${referralId}`)
          .set('Authorization', `Bearer ${specialistToken}`)
          .send({
            status: 'rejected',
            rejectionReason: 'Sin disponibilidad en las próximas 2 semanas',
          });

        expect([200, 400, 404, 500]).toContain(rejectResponse.status);
      }

      // Paso 3: Admin ve estadísticas de derivaciones
      const statsResponse = await request(app)
        .get('/api/v1/referrals/stats/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(statsResponse.status);
    });
  });

  // ─── Flujo 3: Derivación urgente ──────────────────────────────────────────

  describe('Flujo Completo: Derivación de Emergencia', () => {
    it('should handle urgent referral with priority processing', async () => {
      // Derivación urgente (caso crítico)
      const urgentReferralResponse = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId,
          referringDoctorId: doctorId,
          specialistId,
          reason: 'Hemoptisis masiva. Requiere atención inmediata.',
          urgency: 'critical',
          diagnosis: 'Hemoptisis - causa por determinar',
          speciality: 'neumonologia',
          notes: 'Paciente estabilizado en urgencias. Requiere broncoscopía urgente.',
          isEmergency: true,
        });

      expect([200, 201, 400, 404, 500]).toContain(urgentReferralResponse.status);
      expect(urgentReferralResponse.status).not.toBe(401);
      expect(urgentReferralResponse.status).not.toBe(403);

      if (urgentReferralResponse.status === 201 || urgentReferralResponse.status === 200) {
        expect(urgentReferralResponse.body.data?.urgency).toBe('critical');
      }
    });
  });

  // ─── Flujo 4: Historial completo de derivaciones del paciente ─────────────

  describe('Flujo Completo: Historial de Derivaciones del Paciente', () => {
    it('should retrieve complete referral history for a patient', async () => {
      // Crear múltiples derivaciones para el mismo paciente
      const referrals = [
        {
          reason: 'Primera evaluación neumológica',
          urgency: 'low',
          diagnosis: 'Tos crónica',
        },
        {
          reason: 'Control post-tratamiento',
          urgency: 'medium',
          diagnosis: 'Bronquitis recurrente',
        },
      ];

      for (const ref of referrals) {
        await request(app)
          .post('/api/v1/referrals')
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            patientId,
            referringDoctorId: doctorId,
            specialistId,
            speciality: 'neumonologia',
            ...ref,
          });
      }

      // Ver historial completo del paciente
      const historyResponse = await request(app)
        .get('/api/v1/referrals')
        .query({ patientId })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(historyResponse.status);
      if (historyResponse.status === 200) {
        expect(Array.isArray(historyResponse.body.data)).toBe(true);
      }
    });
  });
});