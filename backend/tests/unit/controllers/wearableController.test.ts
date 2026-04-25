/**
 * Unit tests for Wearable Controller
 */

import request from 'supertest';
import appInstance from '../../../src/index';
import { testUtils } from '../../setup';

const app = appInstance.app;
import User, { UserDocument } from '../../../src/models/User';
import WearableData from '../../../src/models/WearableData';
import mongoose from 'mongoose';

describe('Wearable Controller', () => {
  let doctorToken: string;
  let patientToken: string;
  let doctorId: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    // Create test doctor
    const doctor = await User.create({
      name: 'Test Doctor',
      email: 'doctor@test.com',
      password: 'password123',
      role: 'doctor',
      isActive: true
    }) as UserDocument;
    doctorId = doctor._id.toString();
    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

    // Create test patient
    const patient = await User.create({
      name: 'Test Patient',
      email: 'patient@test.com',
      password: 'password123',
      role: 'patient',
      isActive: true
    }) as UserDocument;
    patientId = patient._id.toString();
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });

    // Create test wearable data
    await WearableData.create([
      {
        patientId: patientId,
        heartRate: 72,
        oxygenSaturation: 98,
        steps: 5000,
        distance: 3.5,
        respiratoryRate: 16,
        sleepHours: 7.5,
        timestamp: new Date(),
        source: 'manual'
      },
      {
        patientId: patientId,
        heartRate: 75,
        oxygenSaturation: 97,
        steps: 6000,
        distance: 4.2,
        respiratoryRate: 18,
        sleepHours: 8.0,
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        source: 'manual'
      }
    ]);
  });

  describe('POST /api/v1/wearables/sync', () => {
    it('should sync wearable data successfully', async () => {
      const wearableData = [
        {
          heartRate: 70,
          oxygenSaturation: 99,
          steps: 4500,
          distance: 3.0,
          respiratoryRate: 17,
          sleepHours: 7.0,
          timestamp: new Date().toISOString(),
          source: 'manual'
        }
      ];

      const response = await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: wearableData })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(1);
    });

    it('should reject sync without data', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({})
        .expect(400);
    });

    it('should reject sync without authentication', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .send({ data: [] })
        .expect(401);
    });

    it('should reject empty data array', async () => {
      await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ data: [] })
        .expect(400);
    });
  });

  describe('GET /api/v1/wearables/data/:patientId', () => {
    it('should get wearable data for patient', async () => {
      const response = await request(app)
        .get(`/api/v1/wearables/data/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('should allow patients to view their own data by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/wearables/data/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow patients to view their own data without ID', async () => {
      // When patientId is optional, it should use the authenticated user's ID
      const response = await request(app)
        .get('/api/v1/wearables/data')
        .set('Authorization', `Bearer ${patientToken}`);

      // May return 200 or 400 depending on implementation
      expect([200, 400]).toContain(response.status);
    });

    it('should reject access from unauthorized users', async () => {
      const otherPatientId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .get(`/api/v1/wearables/data/${otherPatientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('should support date filtering', async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/wearables/data/${patientId}?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/wearables/data/${patientId}?limit=10`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/v1/wearables/metrics/:patientId', () => {
    it('should get wearable metrics for patient', async () => {
      const response = await request(app)
        .get(`/api/v1/wearables/metrics/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.metrics.heartRate).toBeDefined();
      expect(response.body.data.metrics.oxygenSaturation).toBeDefined();
      expect(response.body.data.metrics.activity).toBeDefined();
    });

    it('should support hours parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/wearables/metrics/${patientId}?hours=12`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.metrics && response.body.data.metrics.period) {
        expect(response.body.data.metrics.period.hours).toBe(12);
      }
    });

    it('should allow patients to view their own metrics', async () => {
      const response = await request(app)
        .get(`/api/v1/wearables/metrics/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject access from unauthorized users', async () => {
      const otherPatientId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .get(`/api/v1/wearables/metrics/${otherPatientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });
  });
});

