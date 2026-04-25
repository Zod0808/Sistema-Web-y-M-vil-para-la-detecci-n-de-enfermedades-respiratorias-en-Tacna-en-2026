/**
 * Integration tests for alert endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import AlertModel from '../../src/models/Alert';
import { testUtils } from '../setup';
import { INTERNAL_REQUEST_HEADER } from '../../src/middleware/auth';
import alertMonitoringService from '../../src/services/alertMonitoringService';

describe('Alert Endpoints Integration', () => {
  let authToken: string;
  let adminToken: string;
  const internalToken = process.env.INTERNAL_SERVICE_TOKENS?.split(',')[0] || 'internal-test-token';

  beforeEach(() => {
    authToken = testUtils.generateTestToken({ userId: new mongoose.Types.ObjectId().toHexString(), role: 'doctor' });
    adminToken = testUtils.generateTestToken({ userId: new mongoose.Types.ObjectId().toHexString(), role: 'admin' });
  });

  describe('POST /api/v1/alerts/critical-symptom', () => {
    it('crea alerta crítica y la persiste', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/critical-symptom')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: new mongoose.Types.ObjectId().toHexString(),
          symptomName: 'tos',
          severity: 'high',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      const alertId = response.body.data._id;
      const alert = await AlertModel.findById(alertId).lean();
      expect(alert).toBeTruthy();
      expect(alert?.category).toBe('critical_symptom');
      expect(alert?.priority).toBe('high');
    });

    it('rechaza roles no permitidos', async () => {
      const patientToken = testUtils.generateTestToken({
        userId: new mongoose.Types.ObjectId().toHexString(),
        role: 'patient',
      });

      await request(app)
        .post('/api/v1/alerts/critical-symptom')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          userId: new mongoose.Types.ObjectId().toHexString(),
          symptomName: 'tos',
          severity: 'high',
        })
        .expect(403);
    });

    it('permite solicitudes internas sin JWT', async () => {
      const response = await request(app)
        .post('/api/v1/alerts/critical-symptom')
        .set(INTERNAL_REQUEST_HEADER, internalToken)
        .send({
          userId: new mongoose.Types.ObjectId().toHexString(),
          symptomName: 'broncoespasmo',
          severity: 'critical',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/alerts/medication-reminders', () => {
    it('programa un recordatorio y lo marca como scheduled', async () => {
      const scheduleTime = new Date(Date.now() + 60 * 1000).toISOString();
      const response = await request(app)
        .post('/api/v1/alerts/medication-reminders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: new mongoose.Types.ObjectId().toHexString(),
          medicationName: 'Ibuprofeno',
          dosage: '200mg',
          scheduleTime,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      const alert = await AlertModel.findById(response.body.data._id).lean();
      expect(alert?.status).toBe('scheduled');
      expect(alert?.category).toBe('medication_reminder');
      expect(alert?.scheduledAt?.toISOString()).toBe(scheduleTime);
    });
  });

  describe('GET /api/v1/alerts', () => {
    it('retorna alertas del usuario autenticado', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString();
      authToken = testUtils.generateTestToken({ userId, role: 'patient' });

      await AlertModel.create({
        userId,
        title: 'test',
        message: 'test message',
        category: 'system',
        channels: ['in_app'],
        priority: 'medium',
        status: 'pending',
      });

      const response = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('system');
    });

    it('permite a admin filtrar por usuario y prioridad', async () => {
      const targetId = new mongoose.Types.ObjectId().toHexString();
      await AlertModel.create({
        userId: targetId,
        title: 'critical',
        message: 'critical alert',
        category: 'doctor_notification',
        channels: ['push'],
        priority: 'critical',
        status: 'pending',
      });

      const response = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: targetId, priority: ['critical'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].priority).toBe('critical');
    });
  });

  describe('POST /api/v1/alerts/:alertId/acknowledge', () => {
    it('marca la alerta como reconocida', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString();
      const alert = await AlertModel.create({
        userId,
        title: 'test',
        message: 'test',
        category: 'system',
        channels: ['in_app'],
        priority: 'medium',
        status: 'pending',
      });

      const token = testUtils.generateTestToken({ userId, role: 'patient' });

      const response = await request(app)
        .post(`/api/v1/alerts/${alert._id}/acknowledge`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const updated = await AlertModel.findById(alert._id);
      expect(updated?.status).toBe('acknowledged');
      expect(updated?.acknowledgedAt).toBeTruthy();
    });
  });

  describe('GET /api/v1/alerts/dashboard/summary', () => {
    it('requiere rol admin', async () => {
      await request(app)
        .get('/api/v1/alerts/dashboard/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('retorna resumen de alertas con admin', async () => {
      await AlertModel.create({
        userId: new mongoose.Types.ObjectId().toHexString(),
        title: 'critical',
        message: 'msg',
        category: 'critical_symptom',
        channels: ['push'],
        priority: 'critical',
        status: 'pending',
      });

      const response = await request(app)
        .get('/api/v1/alerts/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('byStatus');
    });
  });

  describe('GET /api/v1/alerts/monitoring', () => {
    it('requiere rol admin', async () => {
      await request(app)
        .get('/api/v1/alerts/monitoring')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('devuelve snapshot usando datos reales', async () => {
      const snapshotSpy = jest.spyOn(alertMonitoringService, 'getSnapshot');

      await AlertModel.create({
        userId: new mongoose.Types.ObjectId().toHexString(),
        title: 'Pendiente monitoreo',
        message: 'Verificar respiración',
        category: 'critical_symptom',
        channels: ['push'],
        priority: 'critical',
        status: 'pending',
      });

      const response = await request(app)
        .get('/api/v1/alerts/monitoring')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('queue');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('recentFailures');
      expect(snapshotSpy).toHaveBeenCalledTimes(1);
    });
  });
});

