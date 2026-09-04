/**
 * Integration tests for AI Analysis Review endpoints (RF-007: Panel del doctor)
 *
 * Cierra el gap documentado en Documentation/pruebas/Catalogo_de_Pruebas_RespiCare.xlsx (CP-007):
 * aiAnalysisReviewRoutes.ts no contaba con ninguna prueba de integración.
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import AIAnalysisModel from '../../src/models/AIAnalysis';
import UserModel from '../../src/models/User';
import { testUtils } from '../setup';

const buildAnalysisData = (overrides: Partial<Record<string, any>> = {}) => ({
  medicalHistoryId: `history-${Math.random().toString(16).slice(2)}`,
  patientId: new mongoose.Types.ObjectId().toHexString(),
  symptoms: [
    { name: 'tos', severity: 'moderate', duration: '3 días', description: 'Tos persistente' },
  ],
  possibleDiagnoses: [
    { condition: 'Neumonía leve', probability: 68, recommendations: ['Reposo', 'Control en 48h'] },
  ],
  urgency: 'high',
  confidence: 74,
  ...overrides,
});

describe('AI Analysis Review Endpoints Integration', () => {
  let doctorId: string;
  let doctorToken: string;
  let adminToken: string;

  beforeEach(async () => {
    const doctor = await UserModel.create({
      name: 'Dra. Ana Pérez',
      email: `doctor-${Date.now()}@respicare.com`,
      password: 'Password123!',
      role: 'doctor',
    });
    doctorId = (doctor._id as any).toString();
    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

    const admin = await UserModel.create({
      name: 'Admin RespiCare',
      email: `admin-${Date.now()}@respicare.com`,
      password: 'Password123!',
      role: 'admin',
    });
    adminToken = testUtils.generateTestToken({ userId: (admin._id as any).toString(), role: 'admin' });
  });

  describe('GET /api/v1/ai-analysis/pending', () => {
    it('lista los análisis pendientes de revisión para un médico', async () => {
      await AIAnalysisModel.create(buildAnalysisData());
      await AIAnalysisModel.create(buildAnalysisData({ urgency: 'critical' }));

      const response = await request(app)
        .get('/api/v1/ai-analysis/pending')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('rechaza el acceso de un paciente al listado de pendientes', async () => {
      await request(app)
        .get('/api/v1/ai-analysis/pending')
        .set(
          'Authorization',
          `Bearer ${testUtils.generateTestToken({
            userId: new mongoose.Types.ObjectId().toHexString(),
            role: 'patient',
          })}`
        )
        .expect(403);
    });
  });

  describe('GET /api/v1/ai-analysis/:id', () => {
    it('permite al paciente dueño consultar su propio análisis', async () => {
      const patientToken = testUtils.generateTestToken({ userId: 'patient-owner', role: 'patient' });
      const analysis = await AIAnalysisModel.create(buildAnalysisData({ patientId: 'patient-owner' }));

      const response = await request(app)
        .get(`/api/v1/ai-analysis/${analysis._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.data._id).toBe(String(analysis._id));
    });

    it('rechaza a un paciente que intenta consultar el análisis de otro paciente', async () => {
      const patientToken = testUtils.generateTestToken({ userId: 'patient-intruder', role: 'patient' });
      const analysis = await AIAnalysisModel.create(buildAnalysisData({ patientId: 'patient-owner' }));

      await request(app)
        .get(`/api/v1/ai-analysis/${analysis._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/ai-analysis/:id/review', () => {
    it('permite a un médico aprobar una predicción con firma electrónica', async () => {
      const analysis = await AIAnalysisModel.create(buildAnalysisData());

      const response = await request(app)
        .post(`/api/v1/ai-analysis/${analysis._id}/review`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          decision: 'approved',
          comments: 'Diagnóstico confirmado',
          signature: { signatureData: 'firma-base64', signatureMethod: 'digital' },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.review.status).toBe('approved');
      expect(response.body.data.review.doctorId).toBe(doctorId);

      const persisted = await AIAnalysisModel.findById(analysis._id);
      expect(persisted?.review?.status).toBe('approved');
      expect(persisted?.review?.signature.signatureMethod).toBe('digital');
    });

    it('permite a un médico ajustar diagnóstico y urgencia', async () => {
      const analysis = await AIAnalysisModel.create(buildAnalysisData());

      const response = await request(app)
        .post(`/api/v1/ai-analysis/${analysis._id}/review`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          decision: 'adjusted',
          adjustedDiagnosis: 'Bronquitis aguda',
          adjustedUrgency: 'medium',
          signature: { signatureData: 'firma-base64', signatureMethod: 'typed' },
        })
        .expect(200);

      expect(response.body.data.review.status).toBe('adjusted');
      expect(response.body.data.review.adjustedDiagnosis).toBe('Bronquitis aguda');
      expect(response.body.data.review.adjustedUrgency).toBe('medium');
    });

    it('rechaza un ajuste sin diagnóstico ni urgencia ajustada', async () => {
      const analysis = await AIAnalysisModel.create(buildAnalysisData());

      await request(app)
        .post(`/api/v1/ai-analysis/${analysis._id}/review`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          decision: 'adjusted',
          signature: { signatureData: 'firma-base64', signatureMethod: 'typed' },
        })
        .expect(400);
    });

    it('rechaza la revisión sin firma electrónica', async () => {
      const analysis = await AIAnalysisModel.create(buildAnalysisData());

      await request(app)
        .post(`/api/v1/ai-analysis/${analysis._id}/review`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ decision: 'approved' })
        .expect(400);
    });

    it('impide revisar dos veces el mismo análisis', async () => {
      const analysis = await AIAnalysisModel.create(buildAnalysisData());
      const signature = { signatureData: 'firma-base64', signatureMethod: 'digital' as const };

      await request(app)
        .post(`/api/v1/ai-analysis/${analysis._id}/review`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ decision: 'approved', signature })
        .expect(200);

      await request(app)
        .post(`/api/v1/ai-analysis/${analysis._id}/review`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ decision: 'rejected', signature })
        .expect(400);
    });

    it('permite a un admin rechazar una predicción', async () => {
      const analysis = await AIAnalysisModel.create(buildAnalysisData());

      const response = await request(app)
        .post(`/api/v1/ai-analysis/${analysis._id}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'rejected',
          comments: 'No corresponde al cuadro clínico',
          signature: { signatureData: 'firma-base64', signatureMethod: 'click_to_sign' },
        })
        .expect(200);

      expect(response.body.data.review.status).toBe('rejected');
    });

    it('rechaza el acceso de un paciente a la revisión', async () => {
      const analysis = await AIAnalysisModel.create(buildAnalysisData());
      const patientToken = testUtils.generateTestToken({
        userId: new mongoose.Types.ObjectId().toHexString(),
        role: 'patient',
      });

      await request(app)
        .post(`/api/v1/ai-analysis/${analysis._id}/review`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          decision: 'approved',
          signature: { signatureData: 'firma-base64', signatureMethod: 'digital' },
        })
        .expect(403);
    });
  });
});
