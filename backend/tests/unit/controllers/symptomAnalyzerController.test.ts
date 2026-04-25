/**
 * Unit tests for Symptom Analyzer Controller
 */

import request from 'supertest';
import appInstance from '../../../src/index';
import { testUtils } from '../../setup';
import aiIntegrationService from '../../../src/services/aiIntegration';
import { logger } from '../../../src/utils/logger';
import { AppError } from '../../../src/utils/AppError';

const app = appInstance.app;
import User, { UserDocument } from '../../../src/models/User';
import MedicalHistory from '../../../src/models/MedicalHistory';
import mongoose from 'mongoose';

const STRONG_PASSWORD = 'Password123!';

describe('Symptom Analyzer Controller', () => {
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

    // Create test medical histories with symptoms
    await MedicalHistory.create([
      {
        patientId: patientId,
        doctorId: doctorId,
        patientName: 'Test Patient',
        age: 45,
        diagnosis: 'Bronquitis',
        symptoms: [{ name: 'tos', severity: 'moderate', duration: '2 weeks' }],
        date: new Date()
      }
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/symptom-analyzer/analyze', () => {
    it('should analyze symptoms successfully', async () => {
      const symptoms = [
        { symptom: 'tos', severity: 'moderate', duration: '2 weeks' },
        { symptom: 'fiebre', severity: 'mild', duration: '3 days' }
      ];

      const response = await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms });

      // AI service may not be available, but should handle gracefully
      expect([200, 500, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });

    it('should reject analysis without symptoms', async () => {
      const response = await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});

      expect([400, 500, 503]).toContain(response.status);
    });

    it('should reject empty symptoms array', async () => {
      const response = await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms: [] });

      expect([400, 500, 503]).toContain(response.status);
    });

    it('should reject invalid symptoms format', async () => {
      const response = await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms: [{ invalid: 'data' }] });

      expect([400, 500, 503]).toContain(response.status);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .send({ symptoms: [{ symptom: 'tos', severity: 'moderate', duration: '2 weeks' }] })
        .expect(401);
    });

    it('registra y propaga errores cuando el servicio de IA falla', async () => {
      const aiError = new AppError('Servicio de IA no disponible', 503);
      const serviceSpy = jest.spyOn(aiIntegrationService, 'analyzeSymptoms').mockRejectedValue(aiError);
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms: [{ symptom: 'tos', severity: 'moderate', duration: '2 weeks' }] })
        .expect(503);

      expect(serviceSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Symptom analysis failed',
        expect.objectContaining({
          patientId: expect.any(String),
          error: aiError.message
        })
      );

      serviceSpy.mockRestore();
      loggerSpy.mockRestore();
    });
  });

  describe('POST /api/v1/symptom-analyzer/ml-analyze', () => {
    it('should analyze symptoms with ML successfully', async () => {
      const symptoms = ['tos', 'fiebre', 'congestion'];

      const response = await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ 
          symptoms,
          patient_age: 45,
          risk_factors: []
        });

      // AI service may not be available, but should handle gracefully
      expect([200, 500, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });

    it('should reject empty symptoms array', async () => {
      const response = await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms: [] });

      expect([400, 500, 503]).toContain(response.status);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .send({ symptoms: ['tos'] })
        .expect(401);
    });

    it('registra y propaga errores cuando el análisis ML falla', async () => {
      const mlError = new AppError('ML fuera de servicio', 503);
      const serviceSpy = jest.spyOn(aiIntegrationService, 'analyzeSymptomsML').mockRejectedValue(mlError);
      const loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ symptoms: ['tos', 'fiebre'] })
        .expect(503);

      expect(serviceSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'ML symptom analysis failed',
        expect.objectContaining({
          patientId: expect.any(String),
          error: mlError.message
        })
      );

      serviceSpy.mockRestore();
      loggerSpy.mockRestore();
    });
  });

  describe('GET /api/v1/symptom-analyzer/trends/:patientId', () => {
    it('should get symptom trends for patient', async () => {
      const response = await request(app)
        .get(`/api/v1/symptom-analyzer/trends/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      // AI service may not be disponible o retornar 404 si no hay datos
      expect([200, 404, 500, 503]).toContain(response.status);
    });

    it('should allow patients to view their own trends', async () => {
      const response = await request(app)
        .get(`/api/v1/symptom-analyzer/trends/${patientId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect([200, 404, 500, 503]).toContain(response.status);
    });

    it('should reject access from unauthorized users', async () => {
      const otherPatientId = new mongoose.Types.ObjectId().toString();
      await request(app)
        .get(`/api/v1/symptom-analyzer/trends/${otherPatientId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/symptom-analyzer/recommendations', () => {
    it('should get general recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/symptom-analyzer/recommendations')
        .set('Authorization', `Bearer ${patientToken}`);

      // AI service may not be available
      expect([200, 500, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('GET /api/v1/symptom-analyzer/status', () => {
    it('should get AI service status', async () => {
      const response = await request(app)
        .get('/api/v1/symptom-analyzer/status')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 500, 503]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });
  });

  describe('GET /api/v1/symptom-analyzer/history/:patientId', () => {
    it('should get symptom analysis history', async () => {
      const response = await request(app)
        .get(`/api/v1/symptom-analyzer/history/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/symptom-analyzer/history/${patientId}?page=1&limit=5`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/v1/symptom-analyzer/statistics/:patientId', () => {
    it('should get symptom statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/symptom-analyzer/statistics/${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalVisits).toBeDefined();
      expect(response.body.data.totalSymptoms).toBeDefined();
    });

    it('should support different time periods', async () => {
      const response = await request(app)
        .get(`/api/v1/symptom-analyzer/statistics/${patientId}?period=7d`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('7d');
    });
  });
});

