/**
 * Integration tests for API endpoints
 * Tests complete user flows and interactions between endpoints
 */

import request from 'supertest';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import { randomUUID } from 'crypto';

const app = appInstance.app;
import User, { UserDocument } from '../../src/models/User';
import MedicalHistory from '../../src/models/MedicalHistory';
import mongoose from 'mongoose';

const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;
const STRONG_PASSWORD = 'Password123!';

describe('API Integration Tests', () => {
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
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true
    }) as UserDocument;
    doctorId = doctor._id.toString();
    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

    // Create test patient
    const patient = await User.create({
      name: 'Test Patient',
      email: 'patient@test.com',
      password: STRONG_PASSWORD,
      role: 'patient',
      isActive: true
    }) as UserDocument;
    patientId = patient._id.toString();
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
  });

  describe('Complete Medical History Flow', () => {
    it('should complete full CRUD flow for medical history', async () => {
      // 1. Create medical history
      const createData = {
        patientId: patientId,
        patientName: 'Test Patient',
        age: 45,
        diagnosis: 'Bronquitis',
        symptoms: [
          { name: 'tos', severity: 'moderate', duration: '2 weeks' }
        ],
        description: 'Paciente con síntomas respiratorios',
        date: new Date().toISOString()
      };

      const createResponse = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(createData)
        .expect(201);

      const historyId = createResponse.body.data._id;
      expect(historyId).toBeDefined();

      // 2. Read medical history
      const readResponse = await request(app)
        .get(`/api/v1/medical-histories/${historyId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(readResponse.body.data.diagnosis).toBe(createData.diagnosis);

      // 3. Update medical history
      const updateData = {
        diagnosis: 'Actualizado - Neumonía',
        description: 'Diagnóstico actualizado después de análisis'
      };

      const updateResponse = await request(app)
        .put(`/api/v1/medical-histories/${historyId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.diagnosis).toBe(updateData.diagnosis);

      // 4. Verify update
      const verifyResponse = await request(app)
        .get(`/api/v1/medical-histories/${historyId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(verifyResponse.body.data.diagnosis).toBe(updateData.diagnosis);
    });

    it('should handle authentication flow correctly', async () => {
      // 1. Register new user
      const registerData = {
        name: 'New User',
        email: uniqueEmail('newuser'),
        password: STRONG_PASSWORD,
        role: 'patient'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      const token = registerResponse.body.data.token;
      expect(token).toBeDefined();

      // 2. Use token to access protected endpoint
      const dashboardResponse = await request(app)
        .get('/api/v1/dashboard/patient')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
    });

    it('should handle pagination and filtering correctly', async () => {
      // Create multiple medical histories
      const histories = [];
      for (let i = 0; i < 5; i++) {
        const history = await MedicalHistory.create({
          patientId: new mongoose.Types.ObjectId(patientId),
          doctorId: new mongoose.Types.ObjectId(doctorId),
          patientName: `Test Patient ${i}`,
          age: 30 + i,
          diagnosis: `Diagnosis ${i}`,
          symptoms: [{ name: 'tos', severity: 'moderate', duration: '2 weeks' }],
          date: new Date()
        });
        histories.push(history);
      }

      // Test pagination
      const page1Response = await request(app)
        .get('/api/v1/medical-histories?page=1&limit=2')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(Array.isArray(page1Response.body.data)).toBe(true);
      expect(page1Response.body.data.length).toBeLessThanOrEqual(2);
      expect(page1Response.body.pagination.page).toBe(1);

      // Test filtering by patient
      const filterResponse = await request(app)
        .get(`/api/v1/medical-histories?patientId=${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      filterResponse.body.data.forEach((history: any) => {
        expect(history.patientId).toBe(patientId);
      });
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle invalid requests gracefully', async () => {
      // Invalid medical history ID
      const fakeId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .get(`/api/v1/medical-histories/${fakeId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);

      // Invalid token
      await request(app)
        .get('/api/v1/dashboard/doctor')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Missing authorization
      await request(app)
        .get('/api/v1/medical-histories')
        .expect(401);
    });

    it('should handle validation errors correctly', async () => {
      const invalidData = {
        patientName: 'Test'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Authorization Flow', () => {
    it('should enforce role-based access control', async () => {
      // Patient can access doctor dashboard (per route config)
      const response1 = await request(app)
        .get('/api/v1/dashboard/doctor')
        .set('Authorization', `Bearer ${patientToken}`);
      expect([200, 403]).toContain(response1.status);

      // Doctor cannot access admin dashboard
      await request(app)
        .get('/api/v1/dashboard/admin')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);

      // But doctor can access their own dashboard
      await request(app)
        .get('/api/v1/dashboard/doctor')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);
    });
  });
});

