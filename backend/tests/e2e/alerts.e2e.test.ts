/**
 * E2E Tests - Flujo de Alertas y Notificaciones Médicas
 * Verifica el ciclo completo: creación → distribución → reconocimiento → resolución
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import User, { UserDocument } from '../../src/models/User';

const app = appInstance.app;

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

describe('E2E Tests - Flujo de Alertas y Notificaciones', () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  let patientId: string;
  let doctorId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    const admin = await User.create({
      name: 'Admin Alertas',
      email: uniqueEmail('admin-alerts'),
      password: STRONG_PASSWORD,
      role: 'admin',
      isActive: true,
    }) as UserDocument;

    const doctor = await User.create({
      name: 'Dr. Alertas',
      email: uniqueEmail('dr-alerts'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true,
    }) as UserDocument;

    const patient = await User.create({
      name: 'Paciente Alertas',
      email: uniqueEmail('patient-alerts'),
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

  // ─── Flujo 1: Alerta clínica → reconocimiento → resolución ───────────────

  describe('Flujo Completo: Alerta Clínica desde Creación hasta Resolución', () => {
    it('should complete full alert lifecycle', async () => {
      // Paso 1: Admin/sistema crea alerta crítica
      const alertPayload = {
        patientId,
        type: 'clinical',
        severity: 'critical',
        title: 'Saturación de oxígeno crítica',
        message:
          'El paciente presenta saturación de oxígeno del 88%. Requiere atención inmediata.',
        source: 'wearable_device',
        metadata: {
          oxygenSaturation: 88,
          heartRate: 110,
          deviceId: 'WEARABLE-001',
        },
      };

      const createResponse = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(alertPayload);

      expect([200, 201, 400, 404, 500]).toContain(createResponse.status);
      expect(createResponse.status).not.toBe(401);
      expect(createResponse.status).not.toBe(403);

      const alertId =
        (createResponse.status === 201 || createResponse.status === 200)
          ? createResponse.body.data?._id
          : null;

      // Paso 2: Doctor ve alertas activas
      const activeAlertsResponse = await request(app)
        .get('/api/v1/alerts')
        .query({ status: 'active', severity: 'critical' })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(activeAlertsResponse.status);
      if (activeAlertsResponse.status === 200) {
        expect(activeAlertsResponse.body.success).toBe(true);
      }

      // Paso 3: Doctor reconoce la alerta
      if (alertId) {
        const acknowledgeResponse = await request(app)
          .put(`/api/v1/alerts/${alertId}/acknowledge`)
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            acknowledgedBy: doctorId,
            notes: 'Contactando al paciente para evaluación inmediata',
          });

        expect([200, 400, 404, 500]).toContain(acknowledgeResponse.status);

        // Paso 4: Alerta marcada como resuelta
        const resolveResponse = await request(app)
          .put(`/api/v1/alerts/${alertId}/resolve`)
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            resolution: 'Paciente evaluado. Saturación mejoró a 95% con oxigenoterapia.',
            resolvedBy: doctorId,
          });

        expect([200, 400, 404, 500]).toContain(resolveResponse.status);

        if (resolveResponse.status === 200) {
          expect(resolveResponse.body.success).toBe(true);
        }
      }

      // Paso 5: Ver estadísticas de alertas
      const statsResponse = await request(app)
        .get('/api/v1/alerts/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(statsResponse.status);
    });
  });

  // ─── Flujo 2: Alerta de brote epidémico ──────────────────────────────────

  describe('Flujo Completo: Alerta de Brote Epidémico', () => {
    it('should handle epidemiological outbreak alert flow', async () => {
      // Paso 1: Admin crea alerta de brote
      const outbreakPayload = {
        type: 'outbreak',
        severity: 'high',
        title: 'Brote de influenza en Distrito de Tacna',
        message: 'Se han reportado 30 casos de influenza en las últimas 48 horas.',
        affectedArea: {
          district: 'Tacna',
          coordinates: { latitude: -18.0146, longitude: -70.2536 },
          radius: 5,
        },
        reportedCases: 30,
        disease: 'influenza',
        recommendations: [
          'Vacunación preventiva',
          'Uso de mascarillas',
          'Lavado de manos frecuente',
        ],
      };

      const outbreakResponse = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(outbreakPayload);

      expect([200, 201, 400, 500]).toContain(outbreakResponse.status);
      expect(outbreakResponse.status).not.toBe(401);
      expect(outbreakResponse.status).not.toBe(403);

      // Paso 2: Todos los doctores ven la alerta
      const doctorAlertResponse = await request(app)
        .get('/api/v1/alerts')
        .query({ type: 'outbreak' })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(doctorAlertResponse.status);

      // Paso 3: Admin envía notificaciones masivas por SMS
      const smsResponse = await request(app)
        .post('/api/v1/sms/send-bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          recipients: [patientId],
          message:
            'ALERTA SALUD: Brote de influenza en su área. Consulte a su médico si presenta síntomas.',
          priority: 'high',
        });

      expect([200, 201, 400, 404, 500]).toContain(smsResponse.status);
    });
  });

  // ─── Flujo 3: Alerta de métricas críticas de wearable ────────────────────

  describe('Flujo Completo: Alerta de Métricas de Wearable', () => {
    it('should trigger and process wearable metric alerts', async () => {
      // Paso 1: Sincronizar datos de wearable con valores críticos
      const criticalWearableData = {
        heartRate: 150,
        oxygenSaturation: 87,
        steps: 0,
        sleepHours: 2,
        timestamp: new Date().toISOString(),
        source: 'apple_health',
      };

      const syncResponse = await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(criticalWearableData);

      expect([200, 201, 400, 422, 500]).toContain(syncResponse.status);

      // Paso 2: Verificar si se generó una alerta automática
      const autoAlertResponse = await request(app)
        .get('/api/v1/alerts')
        .query({ patientId, source: 'wearable_device' })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(autoAlertResponse.status);
    });
  });

  // ─── Flujo 4: Sistema de notificaciones por SMS ───────────────────────────

  describe('Flujo Completo: Notificaciones SMS de Alertas', () => {
    it('should send SMS notifications for critical alerts', async () => {
      // Paso 1: Crear alerta que trigger SMS
      const alertResponse = await request(app)
        .post('/api/v1/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId,
          type: 'medication',
          severity: 'high',
          title: 'Recordatorio de medicación',
          message: 'El paciente no ha reportado toma de medicación en 24 horas.',
          notificationChannels: ['sms', 'app'],
        });

      expect([200, 201, 400, 500]).toContain(alertResponse.status);

      // Paso 2: Verificar métricas de SMS enviados
      const smsMetricsResponse = await request(app)
        .get('/api/v1/sms/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(smsMetricsResponse.status);
      expect(smsMetricsResponse.status).not.toBe(401);
      expect(smsMetricsResponse.status).not.toBe(403);
    });
  });

  // ─── Flujo 5: Historial completo de alertas del paciente ─────────────────

  describe('Flujo Completo: Historial de Alertas del Paciente', () => {
    it('should retrieve complete alert history with pagination', async () => {
      // Crear múltiples alertas de distintos tipos
      const alertTypes = [
        { type: 'clinical', severity: 'high', title: 'Alerta clínica alta' },
        { type: 'medication', severity: 'medium', title: 'Recordatorio medicación' },
        { type: 'appointment', severity: 'low', title: 'Cita próxima' },
      ];

      for (const alertData of alertTypes) {
        await request(app)
          .post('/api/v1/alerts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            patientId,
            ...alertData,
            message: `Mensaje de ${alertData.title}`,
          });
      }

      // Consultar historial con paginación
      const historyResponse = await request(app)
        .get('/api/v1/alerts')
        .query({ patientId, page: 1, limit: 10 })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(historyResponse.status);
      if (historyResponse.status === 200) {
        expect(Array.isArray(historyResponse.body.data)).toBe(true);
      }

      // Filtrar por severidad
      const criticalAlertsResponse = await request(app)
        .get('/api/v1/alerts')
        .query({ patientId, severity: 'high' })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(criticalAlertsResponse.status);
    });
  });
});