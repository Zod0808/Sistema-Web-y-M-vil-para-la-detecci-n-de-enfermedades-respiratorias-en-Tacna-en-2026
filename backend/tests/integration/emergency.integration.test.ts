/**
 * Integration tests for emergency endpoints
 * Tests emergency dispatch and hospital notification flow
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('Emergency Endpoints Integration', () => {
  let authToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    authToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'patient',
    });
    adminToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'admin',
    });
  });

  const buildEmergencyPayload = (overrides: any = {}) => ({
    emergencyType: 'medical',
    severity: 'high',
    description: 'Dolor torácico severo con irradiación al brazo izquierdo',
    location: {
      latitude: -12.0464,
      longitude: -77.0428,
      address: 'Av. Principal 123, Lima',
      district: 'Miraflores',
    },
    symptoms: ['dolor torácico', 'disnea', 'sudoración'],
    vitalSigns: {
      heartRate: 110,
      oxygenSaturation: 94,
      bloodPressure: { systolic: 160, diastolic: 95 },
    },
    contactInfo: {
      name: 'María García',
      phone: '+51999123456',
    },
    ...overrides,
  });

  describe('POST /api/v1/emergency — crear emergencia', () => {
    it('crea emergencia con datos válidos', async () => {
      const response = await request(app)
        .post('/api/v1/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buildEmergencyPayload())
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        emergencyType: 'medical',
        severity: 'high',
        status: expect.any(String),
      });
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .post('/api/v1/emergency')
        .send(buildEmergencyPayload())
        .expect(401);
    });

    it('retorna 400 con emergencyType inválido', async () => {
      await request(app)
        .post('/api/v1/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buildEmergencyPayload({ emergencyType: 'unknown_type' }))
        .expect(400);
    });

    it('retorna 400 con severity inválido', async () => {
      await request(app)
        .post('/api/v1/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buildEmergencyPayload({ severity: 'extreme' }))
        .expect(400);
    });

    it('retorna 400 con description muy corta', async () => {
      await request(app)
        .post('/api/v1/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buildEmergencyPayload({ description: 'corta' }))
        .expect(400);
    });

    it('retorna 400 sin coordenadas de ubicación', async () => {
      await request(app)
        .post('/api/v1/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buildEmergencyPayload({ location: { address: 'Lima' } }))
        .expect(400);
    });

    it('acepta crisis respiratoria', async () => {
      const response = await request(app)
        .post('/api/v1/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buildEmergencyPayload({
          emergencyType: 'respiratory_crisis',
          description: 'Crisis asmática severa con sibilancias y cianosis',
          vitalSigns: {
            heartRate: 130,
            oxygenSaturation: 88,
            respiratoryRate: 35,
          },
        }))
        .expect(201);

      expect(response.body.data.emergencyType).toBe('respiratory_crisis');
    });
  });

  describe('POST /api/v1/emergency/detect — detectar emergencia desde síntomas', () => {
    it('detecta emergencia desde síntomas con ubicación', async () => {
      const response = await request(app)
        .post('/api/v1/emergency/detect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symptoms: ['disnea severa', 'dolor torácico', 'pérdida de conciencia'],
          location: { latitude: -12.0464, longitude: -77.0428 },
          vitalSigns: { oxygenSaturation: 85 },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('retorna 400 sin síntomas', async () => {
      await request(app)
        .post('/api/v1/emergency/detect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          location: { latitude: -12.0464, longitude: -77.0428 },
        })
        .expect(400);
    });

    it('retorna 400 sin ubicación', async () => {
      await request(app)
        .post('/api/v1/emergency/detect')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          symptoms: ['dolor torácico'],
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/emergency/active — emergencias activas', () => {
    it('retorna lista de emergencias activas para admin', async () => {
      const response = await request(app)
        .get('/api/v1/emergency/active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get('/api/v1/emergency/active')
        .expect(401);
    });
  });

  describe('GET /api/v1/emergency/:emergencyId — estado de emergencia', () => {
    it('retorna estado de emergencia existente', async () => {
      // Create first
      const createRes = await request(app)
        .post('/api/v1/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buildEmergencyPayload())
        .expect(201);

      const emergencyId = createRes.body.data._id || createRes.body.data.id;

      const response = await request(app)
        .get(`/api/v1/emergency/${emergencyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/emergency/:emergencyId/ambulance-info', () => {
    it('retorna información de ambulancia', async () => {
      const createRes = await request(app)
        .post('/api/v1/emergency')
        .set('Authorization', `Bearer ${authToken}`)
        .send(buildEmergencyPayload())
        .expect(201);

      const emergencyId = createRes.body.data._id || createRes.body.data.id;

      const response = await request(app)
        .get(`/api/v1/emergency/${emergencyId}/ambulance-info`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});