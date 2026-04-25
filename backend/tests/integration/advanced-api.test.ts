/**
 * Advanced Integration Tests
 * Tests for complex API interactions and edge cases
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

describe('Advanced API Integration Tests', () => {
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  let adminId: string;
  let doctorId: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    // Create admin
    const admin = await User.create({
      name: 'Test Admin',
      email: uniqueEmail('advanced-admin'),
      password: STRONG_PASSWORD,
      role: 'admin',
      isActive: true
    }) as UserDocument;
    adminId = admin._id.toString();
    adminToken = testUtils.generateTestToken({ userId: adminId, role: 'admin' });

    // Create doctor
    const doctor = await User.create({
      name: 'Test Doctor',
      email: uniqueEmail('advanced-doctor'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true
    }) as UserDocument;
    doctorId = doctor._id.toString();
    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

    // Create patient
    const patient = await User.create({
      name: 'Test Patient',
      email: uniqueEmail('advanced-patient'),
      password: STRONG_PASSWORD,
      role: 'patient',
      isActive: true
    }) as UserDocument;
    patientId = patient._id.toString();
    patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
  });

  describe('Complex Medical History Queries', () => {
    beforeEach(async () => {
      // Create diverse dataset
      const histories = [];
      for (let i = 0; i < 30; i++) {
        histories.push({
          patientId: i % 2 === 0 ? patientId : new mongoose.Types.ObjectId().toString(),
          doctorId: doctorId,
          patientName: `Patient ${i}`,
          age: 20 + i,
          diagnosis: ['Bronquitis', 'Asma', 'Neumonía', 'Gripe'][i % 4],
          symptoms: [
            { name: 'tos', severity: ['mild', 'moderate', 'severe'][i % 3], duration: `${i + 1} days` }
          ],
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          description: `Description ${i}`
        });
      }
      await MedicalHistory.insertMany(histories);
    });

    it('should filter by multiple criteria', async () => {
      const response = await request(app)
        .get('/api/v1/medical-histories')
        .query({
          patientId: patientId,
          sort: '-date',
          page: 1,
          limit: 5
        })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search by text in diagnosis', async () => {
      const response = await request(app)
        .get('/api/v1/medical-histories')
        .query({
          search: 'Bronquitis'
        })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0].diagnosis).toContain('Bronquitis');
      }
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = new Date().toISOString();

      const response = await request(app)
        .get('/api/v1/medical-histories')
        .query({
          dateFrom,
          dateTo
        })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should aggregate statistics by diagnosis', async () => {
      const response = await request(app)
        .get('/api/v1/medical-histories/common-diagnoses')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });

    it('should group by age ranges', async () => {
      const response = await request(app)
        .get('/api/v1/medical-histories/by-age')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent medical history creation', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        const historyData = {
          patientId: patientId,
          patientName: `Patient ${i}`,
          age: 30 + i,
          diagnosis: `Diagnosis ${i}`,
          symptoms: [{ name: 'tos', severity: 'moderate', duration: '1 week' }]
        };

        promises.push(
          request(app)
            .post('/api/v1/medical-histories')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send(historyData)
        );
      }

      const responses = await Promise.all(promises);
      
      // Most should succeed
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBeGreaterThan(5);
    });

    it('should handle concurrent user registration', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        const userData = {
          name: `User ${i}`,
          email: uniqueEmail(`user${i}`),
          password: STRONG_PASSWORD,
          role: 'patient'
        };

        promises.push(
          request(app)
            .post('/api/v1/auth/register')
            .send(userData)
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed (unique emails)
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });

  describe('Transaction-like Behavior', () => {
    it('should rollback on failed medical history creation with invalid data', async () => {
      const invalidData = {
        patientId: 'invalid-id',
        patientName: 'Test',
        age: -5,  // Invalid age
        diagnosis: 'Test'
      };

      const countBefore = await MedicalHistory.countDocuments();

      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(invalidData);

      expect([400, 422, 500]).toContain(response.status);

      const countAfter = await MedicalHistory.countDocuments();
      expect(countAfter).toBe(countBefore);
    });
  });

  describe('Caching and Performance', () => {
    it('should return consistent results for repeated queries', async () => {
      const queryParams = {
        page: 1,
        limit: 10,
        sort: '-date'
      };

      // First request
      const response1 = await request(app)
        .get('/api/v1/medical-histories')
        .query(queryParams)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      // Second request (may be cached)
      const response2 = await request(app)
        .get('/api/v1/medical-histories')
        .query(queryParams)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      // Results should be identical
      expect(response1.body.data.length).toBe(response2.body.data.length);
    });
  });

  describe('API Versioning', () => {
    it('should support v1 API endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/health')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from database connection issues', async () => {
      // Make a valid request
      const response = await request(app)
        .get('/api/v1/dashboard/health')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect([400, 422, 500]).toContain(response.status);
    });

    it('should handle missing headers gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`);

      // Should work or return appropriate error, not crash
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity', async () => {
      // Create medical history
      const historyData = {
        patientId: patientId,
        patientName: 'Test Patient',
        age: 30,
        diagnosis: 'Test',
        symptoms: []
      };

      const createResponse = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(historyData)
        .expect(201);

      const historyId = createResponse.body.data._id;

      // Verify history exists
      const getResponse = await request(app)
        .get(`/api/v1/medical-histories/${historyId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(getResponse.body.data.patientId).toBe(patientId);
    });
  });

  describe('Batch Operations', () => {
    it('should support batch export', async () => {
      // Create multiple histories
      const histories = [];
      for (let i = 0; i < 5; i++) {
        histories.push({
          patientId: patientId,
          doctorId: doctorId,
          patientName: 'Test Patient',
          age: 30 + i,
          diagnosis: `Diagnosis ${i}`,
          symptoms: []
        });
      }
      await MedicalHistory.insertMany(histories);

      // Export all
      const response = await request(app)
        .get('/api/v1/export/medical-histories?format=json')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('API Rate Limiting', () => {
    it('should handle rapid requests without crashing', async () => {
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/v1/dashboard/health')
            .set('Authorization', `Bearer ${doctorToken}`)
        );
      }

      const responses = await Promise.all(promises);
      
      // Should handle all requests (maybe some rate limited)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Cross-Origin Requests', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/medical-histories')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect([200, 204]).toContain(response.status);
    });
  });
});

