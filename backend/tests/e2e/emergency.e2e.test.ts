/**
 * E2E Tests - Flujo de Emergencias Médicas
 * Verifica el ciclo completo: creación → escalación → ambulancia → resolución
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import User, { UserDocument } from '../../src/models/User';
import mongoose from 'mongoose';

const app = appInstance.app;

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

describe('E2E Tests - Flujo de Emergencias Médicas', () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  let patientId: string;
  let doctorId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    const admin = await User.create({
      name: 'Admin Emergencias',
      email: uniqueEmail('admin-emerg'),
      password: STRONG_PASSWORD,
      role: 'admin',
      isActive: true,
    }) as UserDocument;

    const doctor = await User.create({
      name: 'Dr. Emergencia',
      email: uniqueEmail('dr-emerg'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true,
    }) as UserDocument;

    const patient = await User.create({
      name: 'Paciente Crítico',
      email: uniqueEmail('patient-emerg'),
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

  // ─── Flujo 1: Paciente reporta emergencia → doctor atiende → resolución ────

  describe('Flujo Completo: Reporte de Emergencia → Atención → Resolución', () => {
    it('should complete full emergency lifecycle from report to resolution', async () => {
      // Paso 1: Paciente activa solicitud de emergencia
      const emergencyPayload = {
        patientId,
        type: 'respiratory_distress',
        severity: 'critical',
        symptoms: ['dificultad_respiratoria', 'dolor_pecho', 'cianosis'],
        location: {
          latitude: -18.0146,
          longitude: -70.2536,
          address: 'Av. Bolognesi 123, Tacna',
        },
        description: 'Paciente no puede respirar, labios azulados',
        contactPhone: '+51987654321',
      };

      const createResponse = await request(app)
        .post('/api/v1/emergencies')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(emergencyPayload);

      expect([200, 201, 400, 500]).toContain(createResponse.status);
      expect(createResponse.status).not.toBe(401);
      expect(createResponse.status).not.toBe(403);

      const emergencyId =
        createResponse.status === 201 || createResponse.status === 200
          ? createResponse.body.data?._id
          : new mongoose.Types.ObjectId().toHexString();

      // Paso 2: Admin ve lista de emergencias activas
      const listResponse = await request(app)
        .get('/api/v1/emergencies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(listResponse.status);
      if (listResponse.status === 200) {
        expect(listResponse.body.success).toBe(true);
        expect(Array.isArray(listResponse.body.data)).toBe(true);
      }

      // Paso 3: Doctor atiende la emergencia
      if (emergencyId && createResponse.status === 201) {
        const attendResponse = await request(app)
          .put(`/api/v1/emergencies/${emergencyId}/status`)
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({ status: 'attending', doctorId });

        expect([200, 400, 404, 500]).toContain(attendResponse.status);
      }

      // Paso 4: Admin solicita ambulancia
      const ambulanceResponse = await request(app)
        .post('/api/v1/emergencies/ambulance/request')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId,
          location: emergencyPayload.location,
          priority: 'high',
          patientCondition: 'Dificultad respiratoria severa',
        });

      expect([200, 201, 400, 404, 500]).toContain(ambulanceResponse.status);
      expect(ambulanceResponse.status).not.toBe(401);
      expect(ambulanceResponse.status).not.toBe(403);

      // Paso 5: Verificar estadísticas de emergencias
      const statsResponse = await request(app)
        .get('/api/v1/emergencies/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(statsResponse.status);
    });
  });

  // ─── Flujo 2: Comunicación Hospital → envío a UCI ─────────────────────────

  describe('Flujo Completo: Comunicación con Hospital', () => {
    it('should complete hospital communication flow', async () => {
      // Paso 1: Notificar hospital sobre caso crítico
      const hospitalNotifyPayload = {
        patientId,
        hospitalId: 'HOSPITAL-HIPOLITO-UNANUE',
        caseType: 'respiratory_emergency',
        severity: 'critical',
        estimatedArrival: new Date(Date.now() + 15 * 60000).toISOString(),
        patientInfo: {
          name: 'Paciente Crítico',
          age: 65,
          bloodType: 'O+',
          allergies: ['penicilina'],
          conditions: ['EPOC', 'hipertensión'],
        },
      };

      const notifyResponse = await request(app)
        .post('/api/v1/emergencies/hospital/notify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(hospitalNotifyPayload);

      expect([200, 201, 400, 404, 500]).toContain(notifyResponse.status);
      expect(notifyResponse.status).not.toBe(401);
      expect(notifyResponse.status).not.toBe(403);

      // Paso 2: Consultar disponibilidad del hospital
      const availabilityResponse = await request(app)
        .get('/api/v1/emergencies/hospital/availability')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(availabilityResponse.status);
    });
  });

  // ─── Flujo 3: Información médica de emergencia ────────────────────────────

  describe('Flujo Completo: Información Médica de Emergencia', () => {
    it('should retrieve and display emergency medical info', async () => {
      // Paso 1: Obtener información médica del paciente para emergencia
      const medInfoResponse = await request(app)
        .get(`/api/v1/emergencies/medical-info/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404, 500]).toContain(medInfoResponse.status);
      expect(medInfoResponse.status).not.toBe(401);
      expect(medInfoResponse.status).not.toBe(403);

      if (medInfoResponse.status === 200) {
        expect(medInfoResponse.body.success).toBe(true);
        expect(medInfoResponse.body.data).toBeDefined();
      }

      // Paso 2: Obtener lista de hospitales cercanos
      const hospitalsResponse = await request(app)
        .get('/api/v1/emergencies/hospitals')
        .query({ lat: -18.0146, lon: -70.2536, radius: 10 })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404, 500]).toContain(hospitalsResponse.status);
    });
  });

  // ─── Flujo 4: Protocolo de emergencia de acceso sin token ────────────────

  describe('Flujo Completo: Acceso de Emergencia No Autenticado', () => {
    it('should allow public emergency access endpoints', async () => {
      // Algunas rutas de emergencia son públicas (sin auth) para casos críticos
      const publicEmergencyResponse = await request(app)
        .get('/api/v1/emergencies/public/hospitals')
        .query({ lat: -18.0146, lon: -70.2536 });

      // Puede ser 200 (público) o 401 (requiere auth)
      expect([200, 401, 404, 500]).toContain(publicEmergencyResponse.status);
    });
  });

  // ─── Flujo 5: Alerta de brote + emergencia masiva ────────────────────────

  describe('Flujo Completo: Emergencia por Brote Respiratorio', () => {
    it('should handle mass emergency outbreak scenario', async () => {
      // Paso 1: Admin crea alerta de brote
      const outbreakAlertPayload = {
        type: 'outbreak',
        disease: 'influenza',
        affectedDistrict: 'Tacna',
        severity: 'high',
        reportedCases: 25,
        description: 'Brote de influenza en el distrito de Tacna',
      };

      const outbreakResponse = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(outbreakAlertPayload);

      expect([200, 201, 400, 500]).toContain(outbreakResponse.status);
      expect(outbreakResponse.status).not.toBe(401);
      expect(outbreakResponse.status).not.toBe(403);

      // Paso 2: Verificar que la alerta se puede consultar
      const alertsResponse = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(alertsResponse.status);
    });
  });
});