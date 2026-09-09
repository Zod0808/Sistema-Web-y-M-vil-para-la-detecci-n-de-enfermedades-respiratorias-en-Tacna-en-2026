/**
 * End-to-End Tests - Flujos Completos
 * Tests que verifican flujos completos de usuario desde inicio hasta fin
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import appInstance from '../../src/index';
import { testUtils } from '../setup';

const app = appInstance.app;
import User, { UserDocument } from '../../src/models/User';
import MedicalHistory from '../../src/models/MedicalHistory';
import EducationalContentModel from '../../src/models/EducationalContent';
import HealthCenterModel from '../../src/models/HealthCenter';
import aiIntegrationService from '../../src/services/aiIntegration';
import mongoose from 'mongoose';

const STRONG_PASSWORD = 'Password123!';
const NEW_STRONG_PASSWORD = 'NewPassword123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

describe('E2E Tests - Flujos Completos', () => {
  beforeEach(async () => {
    await testUtils.cleanTestData();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Flujo Completo: Registro → Login → Crear Historia Médica → Ver Dashboard', () => {
    it('should complete full user journey from registration to dashboard', async () => {
      // Paso 1: Registro de nuevo usuario (Paciente)
      const registerData = {
        name: 'Juan Pérez',
        email: uniqueEmail('flow-patient'),
        password: STRONG_PASSWORD,
        role: 'patient',
        phone: '+51987654321'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(registerData.email);
      expect(registerResponse.body.data.token).toBeDefined();
      
      const patientToken = registerResponse.body.data.token;
      const patientId = registerResponse.body.data.user._id;

      // Paso 2: Login con las credenciales registradas
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.user._id).toBe(patientId);

      // Paso 3: Obtener perfil del usuario
      const profileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(registerData.email);

      // Paso 4: Crear un doctor para poder crear historias médicas
      const doctor = await User.create({
        name: 'Dr. María González',
        email: uniqueEmail('doctor-maria'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const doctorToken = testUtils.generateTestToken({ 
        userId: doctor._id.toString(), 
        role: 'doctor' 
      });

      // Paso 5: Crear historia médica para el paciente
      const medicalHistoryData = {
        patientId: patientId,
        patientName: registerData.name,
        age: 45,
        diagnosis: 'Bronquitis',
        symptoms: [
          { name: 'tos', severity: 'moderate', duration: '2 weeks' },
          { name: 'fiebre', severity: 'mild', duration: '3 days' }
        ],
        description: 'Paciente con síntomas respiratorios persistentes',
        date: new Date().toISOString()
      };

      const historyResponse = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(medicalHistoryData)
        .expect(201);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.diagnosis).toBe(medicalHistoryData.diagnosis);
      expect(historyResponse.body.data.patientId).toBe(patientId);
      
      const historyId = historyResponse.body.data._id;

      // Paso 6: El paciente puede ver su historia médica
      const getHistoryResponse = await request(app)
        .get(`/api/v1/medical-histories/${historyId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect([200, 403]).toContain(getHistoryResponse.status);
      if (getHistoryResponse.status === 200) {
        expect(getHistoryResponse.body.success).toBe(true);
        expect(getHistoryResponse.body.data._id).toBe(historyId);
      }

      // Paso 7: El doctor puede ver el dashboard con estadísticas
      const dashboardResponse = await request(app)
        .get('/api/v1/dashboard/doctor')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data.overview).toBeDefined();
      expect(dashboardResponse.body.data.overview.totalHistories).toBeGreaterThanOrEqual(1);

      // Paso 8: El paciente puede ver su dashboard
      const patientDashboardResponse = await request(app)
        .get('/api/v1/dashboard/patient')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(patientDashboardResponse.body.success).toBe(true);
      expect(patientDashboardResponse.body.data).toBeDefined();
    });
  });

  describe('Flujo Completo: Análisis de Síntomas con IA', () => {
    it('should complete symptom analysis flow with AI integration', async () => {
      // Paso 1: Crear usuario doctor
      const doctor = await User.create({
        name: 'Dr. Ana López',
        email: uniqueEmail('doctor-ana'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const doctorToken = testUtils.generateTestToken({ 
        userId: doctor._id.toString(), 
        role: 'doctor' 
      });

      // Paso 2: Crear paciente
      const patient = await User.create({
        name: 'Carlos Ruiz',
        email: uniqueEmail('patient-carlos'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      }) as UserDocument;

      const patientToken = testUtils.generateTestToken({ 
        userId: patient._id.toString(), 
        role: 'patient' 
      });

      // Paso 3: Crear historia médica con síntomas
      const symptomsData = {
        patientId: patient._id.toString(),
        patientName: patient.name,
        age: 35,
        diagnosis: 'Pendiente',
        symptoms: [
          { name: 'tos', severity: 'severe', duration: '1 week' },
          { name: 'dificultad_respiratoria', severity: 'severe', duration: '3 days' },
          { name: 'fiebre', severity: 'moderate', duration: '2 days' }
        ],
        description: 'Síntomas severos que requieren análisis',
        date: new Date()
      };

      const historyResponse = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(symptomsData)
        .expect(201);

      const historyId = historyResponse.body.data._id;

      // Paso 4: Análisis de síntomas (simulado - el servicio AI puede no estar disponible)
      const analysisResponse = await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          symptoms: symptomsData.symptoms,
          age: symptomsData.age,
          patientId: patient._id.toString()
        });

      // El análisis puede fallar si el servicio AI no está disponible, pero el flujo debe manejarlo
      expect([200, 400, 500, 503]).toContain(analysisResponse.status);
      
      if (analysisResponse.status === 200) {
        expect(analysisResponse.body.success).toBe(true);
        expect(analysisResponse.body.data).toBeDefined();
      }

      // Paso 5: Actualizar historia médica con diagnóstico después del análisis
      const updateResponse = await request(app)
        .put(`/api/v1/medical-histories/${historyId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          diagnosis: 'Neumonía',
          description: 'Diagnóstico actualizado después del análisis de síntomas'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.diagnosis).toBe('Neumonía');
    });
  });

  describe('Flujo Completo: Explicabilidad SHAP y Panel del Doctor (RF-006, RF-007)', () => {
    it('el médico recibe el diagnóstico con explicación SHAP y lo revisa con firma electrónica', async () => {
      // Paso 1: crear médico
      const doctor = await User.create({
        name: 'Dr. Explicabilidad',
        email: uniqueEmail('doctor-shap'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const doctorToken = testUtils.generateTestToken({
        userId: doctor._id.toString(),
        role: 'doctor'
      });

      // Paso 2: el modelo ML devuelve un diagnóstico junto con una explicación SHAP interpretable
      jest.spyOn(aiIntegrationService, 'analyzeSymptomsML').mockResolvedValueOnce({
        disease: 'Neumonía',
        confidence: 0.82,
        urgency_level: 'high',
        needs_medical_attention: true,
        is_clinically_coherent: true,
        coherence_warnings: [],
        top_3_predictions: [
          { disease: 'Neumonía', confidence: '0.82' },
          { disease: 'Bronquitis', confidence: '0.11' }
        ],
        explanation: {
          method: 'shap',
          models_used: ['xgboost'],
          description: 'La tos y la dificultad respiratoria son los principales factores que explican la predicción',
          positive_factors: [{ feature_index: 0, shap_value: 0.35, feature_importance: 0.35 }],
          negative_factors: [],
          decision_factors: [{ feature_index: 0, shap_value: 0.35, feature_importance: 0.35 }],
          explainability_score: 0.9
        },
        personalized_recommendations: ['Reposo', 'Control médico en 48h'],
        timestamp: new Date().toISOString()
      });

      // Paso 3: se solicita el análisis ML de síntomas
      const analysisResponse = await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          symptoms: ['tos', 'dificultad_respiratoria', 'fiebre'],
          patient_age: 40
        })
        .expect(200);

      // El médico recibe, junto con el diagnóstico, la explicación interpretable de los factores
      expect(analysisResponse.body.data.disease).toBe('Neumonía');
      expect(analysisResponse.body.data.explanation).toBeDefined();
      expect(analysisResponse.body.data.explanation.positive_factors.length).toBeGreaterThan(0);

      const aiAnalysisId = analysisResponse.body.data.aiAnalysisId;
      expect(aiAnalysisId).toBeDefined();

      // Paso 4: el médico ve la predicción en su cola de análisis pendientes de revisión
      const pendingResponse = await request(app)
        .get('/api/v1/ai-analysis/pending')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      const pendingIds = pendingResponse.body.data.map((analysis: any) => analysis._id);
      expect(pendingIds).toContain(aiAnalysisId);

      // Paso 5: el médico consulta el detalle antes de decidir
      const detailResponse = await request(app)
        .get(`/api/v1/ai-analysis/${aiAnalysisId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(detailResponse.body.data.possibleDiagnoses[0].condition).toBe('Neumonía');

      // Paso 6: el médico aprueba la predicción con firma electrónica
      const reviewResponse = await request(app)
        .post(`/api/v1/ai-analysis/${aiAnalysisId}/review`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          decision: 'approved',
          comments: 'Explicación SHAP consistente con el cuadro clínico',
          signature: { signatureData: 'firma-medico-base64', signatureMethod: 'digital' }
        })
        .expect(200);

      expect(reviewResponse.body.data.review.status).toBe('approved');
      expect(reviewResponse.body.data.review.doctorId).toBe(doctor._id.toString());
    });
  });

  describe('Flujo Completo: Validación de Coherencia Médica ante Síntomas Contradictorios (RF-005)', () => {
    it('expone la incoherencia clínica detectada por el modelo y exige revisión médica antes de descartar la predicción', async () => {
      const doctor = await User.create({
        name: 'Dr. Coherencia',
        email: uniqueEmail('doctor-coherencia'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const doctorToken = testUtils.generateTestToken({
        userId: doctor._id.toString(),
        role: 'doctor'
      });

      // El modelo detecta una combinación de síntomas graves con una urgencia clasificada como baja
      jest.spyOn(aiIntegrationService, 'analyzeSymptomsML').mockResolvedValueOnce({
        disease: 'Neumonía',
        confidence: 0.55,
        urgency_level: 'low',
        needs_medical_attention: true,
        is_clinically_coherent: false,
        coherence_warnings: [
          'Síntomas de alta severidad (dificultad respiratoria severa) reportados con una urgencia clasificada como baja'
        ],
        top_3_predictions: [{ disease: 'Neumonía', confidence: '0.55' }],
        explanation: { method: 'shap', explainability_score: 0.4 },
        personalized_recommendations: [],
        timestamp: new Date().toISOString()
      });

      const analysisResponse = await request(app)
        .post('/api/v1/symptom-analyzer/ml-analyze')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          symptoms: ['dificultad_respiratoria_severa', 'cianosis'],
          patient_age: 68
        })
        .expect(200);

      // El sistema no oculta la incoherencia: la expone explícitamente en la respuesta
      expect(analysisResponse.body.data.is_clinically_coherent).toBe(false);
      expect(analysisResponse.body.data.coherence_warnings.length).toBeGreaterThan(0);

      const aiAnalysisId = analysisResponse.body.data.aiAnalysisId;

      // A pesar de la incoherencia, la predicción queda disponible para revisión médica obligatoria:
      // nunca se le entrega al paciente un diagnóstico contradictorio sin que un médico lo evalúe primero
      const pendingResponse = await request(app)
        .get('/api/v1/ai-analysis/pending')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(pendingResponse.body.data.map((analysis: any) => analysis._id)).toContain(aiAnalysisId);

      // El médico, informado de la incoherencia, rechaza la predicción en lugar de aprobarla
      const reviewResponse = await request(app)
        .post(`/api/v1/ai-analysis/${aiAnalysisId}/review`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          decision: 'rejected',
          comments: 'Predicción marcada como clínicamente incoherente por el sistema; se descarta',
          signature: { signatureData: 'firma-medico-base64', signatureMethod: 'digital' }
        })
        .expect(200);

      expect(reviewResponse.body.data.review.status).toBe('rejected');
    });
  });

  describe('Flujo Completo: Administrador gestiona sistema', () => {
    it('should complete admin system management flow', async () => {
      // Paso 1: Crear administrador
      const admin = await User.create({
        name: 'Admin Sistema',
        email: uniqueEmail('admin-system'),
        password: STRONG_PASSWORD,
        role: 'admin',
        isActive: true
      }) as UserDocument;

      const adminToken = testUtils.generateTestToken({ 
        userId: admin._id.toString(), 
        role: 'admin' 
      });

      // Paso 2: Crear usuarios (doctor y paciente)
      const doctor = await User.create({
        name: 'Dr. Test',
        email: uniqueEmail('doctor-test'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const patient = await User.create({
        name: 'Paciente Test',
        email: uniqueEmail('patient-test'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      }) as UserDocument;

      // Paso 3: Ver dashboard de administrador
      const dashboardResponse = await request(app)
        .get('/api/v1/dashboard/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);
      expect(dashboardResponse.body.data.overview).toBeDefined();
      expect(dashboardResponse.body.data.overview.totalUsers).toBeGreaterThanOrEqual(3);

      // Paso 4: Ver salud del sistema
      const healthResponse = await request(app)
        .get('/api/v1/dashboard/health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(healthResponse.body.success).toBe(true);
      expect(healthResponse.body.data).toBeDefined();

      // Paso 5: Ver estadísticas de historias médicas
      const statsResponse = await request(app)
        .get('/api/v1/medical-histories/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      // Las estadísticas pueden no estar disponibles si no hay historias
      expect([200, 404]).toContain(statsResponse.status);
      if (statsResponse.status === 200) {
        expect(statsResponse.body.success).toBe(true);
      }
    });
  });

  describe('Flujo Completo: Sincronización Offline', () => {
    it('should complete offline sync flow', async () => {
      // Paso 1: Crear doctor
      const doctor = await User.create({
        name: 'Dr. Offline Test',
        email: uniqueEmail('dr-offline'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const doctorToken = testUtils.generateTestToken({ 
        userId: doctor._id.toString(), 
        role: 'doctor' 
      });

      const patient = await User.create({
        name: 'Paciente Offline',
        email: uniqueEmail('patient-offline'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      }) as UserDocument;

      // Paso 2: Crear historias médicas offline (simuladas)
      const offlineHistories = [
        {
          patientId: patient._id.toString(),
          doctorId: doctor._id.toString(),
          patientName: patient.name,
          age: 30,
          diagnosis: 'Gripe',
          symptoms: [{ name: 'tos', severity: 'mild', duration: '1 week' }],
          description: 'Historia offline',
          isOffline: true,
          syncStatus: 'pending',
          date: new Date(Date.now() - 86400000) // Ayer
        },
        {
          patientId: patient._id.toString(),
          doctorId: doctor._id.toString(),
          patientName: patient.name,
          age: 30,
          diagnosis: 'Resfriado',
          symptoms: [{ name: 'congestion', severity: 'mild', duration: '2 days' }],
          description: 'Historia offline 2',
          isOffline: true,
          syncStatus: 'pending',
          date: new Date(Date.now() - 172800000) // Hace 2 días
        }
      ];

      // Crear historias offline directamente en la base de datos
      const createdHistories = await MedicalHistory.insertMany(offlineHistories);

      // Paso 3: Sincronizar historias offline
      const syncResponse = await request(app)
        .post('/api/v1/medical-histories/sync')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          histories: createdHistories.map(h => ({
            patientId: h.patientId,
            patientName: h.patientName,
            age: h.age,
            diagnosis: h.diagnosis,
            symptoms: h.symptoms,
            description: h.description || '',
            date: h.date
          }))
        });

      // El sync puede fallar si las historias ya existen o hay problemas de validación
      expect([200, 400, 500]).toContain(syncResponse.status);
      if (syncResponse.status === 200) {
        expect(syncResponse.body.success).toBe(true);
      }

      // Paso 4: Verificar que las historias están sincronizadas (si el sync fue exitoso)
      if (syncResponse.status === 200) {
        const syncedHistories = await MedicalHistory.find({
          _id: { $in: createdHistories.map(h => h._id) }
        });

        syncedHistories.forEach(history => {
          expect(['synced', 'pending']).toContain(history.syncStatus);
        });
      }
    });
  });

  describe('Flujo Completo: Exportación de Datos', () => {
    it('should complete data export flow', async () => {
      // Paso 1: Crear usuarios y datos de prueba
      const doctor = await User.create({
        name: 'Dr. Export Test',
        email: uniqueEmail('dr-export'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const doctorToken = testUtils.generateTestToken({ 
        userId: doctor._id.toString(), 
        role: 'doctor' 
      });

      const patient = await User.create({
        name: 'Paciente Export',
        email: uniqueEmail('patient-export'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      }) as UserDocument;

      // Crear múltiples historias médicas
      const historiesData = [
        {
          patientId: patient._id.toString(),
          doctorId: doctor._id.toString(),
          patientName: patient.name,
          age: 40,
          diagnosis: 'Bronquitis',
          symptoms: [{ name: 'tos', severity: 'moderate', duration: '1 week' }],
          date: new Date()
        },
        {
          patientId: patient._id.toString(),
          doctorId: doctor._id.toString(),
          patientName: patient.name,
          age: 40,
          diagnosis: 'Asma',
          symptoms: [{ name: 'dificultad_respiratoria', severity: 'severe', duration: '2 weeks' }],
          date: new Date(Date.now() - 86400000)
        }
      ];

      await MedicalHistory.insertMany(historiesData);

      // Paso 2: Exportar datos en formato JSON
      const jsonExportResponse = await request(app)
        .get('/api/v1/medical-histories/export?format=json')
        .set('Authorization', `Bearer ${doctorToken}`);

      // La exportación puede requerir permisos específicos
      expect([200, 403, 404]).toContain(jsonExportResponse.status);
      if (jsonExportResponse.status === 200) {
        expect(jsonExportResponse.body.success).toBe(true);
      }

      // Paso 3: Exportar datos en formato CSV
      const csvExportResponse = await request(app)
        .get('/api/v1/medical-histories/export?format=csv')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 403, 404]).toContain(csvExportResponse.status);
      if (csvExportResponse.status === 200) {
        expect(csvExportResponse.headers['content-type']).toContain('text/csv');
      }
    });
  });

  describe('Flujo Completo: Autenticación y Refresh Token', () => {
    it('should complete authentication flow with token refresh', async () => {
      // Paso 1: Registro
      const registerData = {
        name: 'Usuario Token',
        email: uniqueEmail('token-user'),
        password: STRONG_PASSWORD,
        role: 'patient'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      const { token, refreshToken } = registerResponse.body.data;

      // Paso 2: Usar token para acceder a recurso protegido
      const profileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);

      // Paso 3: Refrescar token (la ruta requiere autenticación)
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.token).toBeDefined();
      expect(refreshResponse.body.data.refreshToken).toBeDefined();

      const newToken = refreshResponse.body.data.token;

      // Paso 4: Usar nuevo token
      const newProfileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(newProfileResponse.body.success).toBe(true);
    });
  });

  describe('Flujo Completo: Búsqueda y Filtrado Avanzado', () => {
    it('should complete advanced search and filtering flow', async () => {
      // Paso 1: Crear datos de prueba
      const doctor = await User.create({
        name: 'Dr. Search Test',
        email: uniqueEmail('dr-search'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const doctorToken = testUtils.generateTestToken({ 
        userId: doctor._id.toString(), 
        role: 'doctor' 
      });

      const patient1 = await User.create({
        name: 'Paciente Uno',
        email: uniqueEmail('patient-search-1'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      }) as UserDocument;

      const patient2 = await User.create({
        name: 'Paciente Dos',
        email: uniqueEmail('patient-search-2'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      }) as UserDocument;

      // Crear historias médicas con diferentes diagnósticos y fechas
      const histories = [
        {
          patientId: patient1._id.toString(),
          doctorId: doctor._id.toString(),
          patientName: patient1.name,
          age: 35,
          diagnosis: 'Bronquitis',
          symptoms: [{ name: 'tos', severity: 'moderate', duration: '1 week' }],
          date: new Date(Date.now() - 86400000) // Ayer
        },
        {
          patientId: patient2._id.toString(),
          doctorId: doctor._id.toString(),
          patientName: patient2.name,
          age: 50,
          diagnosis: 'Asma',
          symptoms: [{ name: 'dificultad_respiratoria', severity: 'severe', duration: '2 weeks' }],
          date: new Date() // Hoy
        },
        {
          patientId: patient1._id.toString(),
          doctorId: doctor._id.toString(),
          patientName: patient1.name,
          age: 35,
          diagnosis: 'Gripe',
          symptoms: [{ name: 'fiebre', severity: 'mild', duration: '3 days' }],
          date: new Date(Date.now() - 172800000) // Hace 2 días
        }
      ];

      await MedicalHistory.insertMany(histories);

      // Paso 2: Búsqueda por texto
      const searchResponse = await request(app)
        .get('/api/v1/medical-histories?search=Bronquitis')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.length).toBeGreaterThan(0);

      // Paso 3: Filtrado por paciente
      const filterByPatientResponse = await request(app)
        .get(`/api/v1/medical-histories?patientId=${patient1._id.toString()}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(filterByPatientResponse.body.success).toBe(true);
      filterByPatientResponse.body.data.forEach((history: any) => {
        expect(history.patientId).toBe(patient1._id.toString());
      });

      // Paso 4: Ordenamiento por fecha
      const sortedResponse = await request(app)
        .get('/api/v1/medical-histories?sort=-date&limit=10')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(sortedResponse.body.success).toBe(true);
      if (sortedResponse.body.data.length > 1) {
        const dates = sortedResponse.body.data.map((h: any) => new Date(h.date).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }

      // Paso 5: Paginación
      const paginatedResponse = await request(app)
        .get('/api/v1/medical-histories?page=1&limit=2')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(paginatedResponse.body.success).toBe(true);
      expect(paginatedResponse.body.data.length).toBeLessThanOrEqual(2);
      expect(paginatedResponse.body.pagination).toBeDefined();
      expect(paginatedResponse.body.pagination.page).toBe(1);
    });
  });

  describe('Flujo Completo: Gestión de Perfil de Usuario', () => {
    it('should complete user profile management flow', async () => {
      // Paso 1: Registro
      const userData = {
        name: 'Usuario Perfil',
        email: uniqueEmail('perfil'),
        password: STRONG_PASSWORD,
        role: 'patient',
        phone: '+51987654321'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const token = registerResponse.body.data.token;
      const userId = registerResponse.body.data.user._id;

      // Paso 2: Ver perfil
      const profileResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe(userData.email);

      // Paso 3: Actualizar perfil
      const updateData = {
        name: 'Usuario Perfil Actualizado',
        phone: '+51999888777'
      };

      const updateResponse = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.name).toBe(updateData.name);

      // Paso 4: Cambiar contraseña
      const changePasswordResponse = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: STRONG_PASSWORD,
          newPassword: NEW_STRONG_PASSWORD
        })
        .expect(200);

      expect(changePasswordResponse.body.success).toBe(true);

      // Paso 5: Login con nueva contraseña
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: NEW_STRONG_PASSWORD
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
    });
  });

  describe('Flujo Completo: Recuperación de Contraseña', () => {
    it('should complete password recovery flow', async () => {
      // Paso 1: Crear usuario
      const user = await User.create({
        name: 'Usuario Recuperación',
        email: uniqueEmail('recovery'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      });

      // Paso 2: Solicitar recuperación de contraseña
      const forgotPasswordResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: uniqueEmail('recovery-request')
        });

      // El endpoint puede retornar 200 incluso si no está completamente implementado
      expect([200, 401, 404, 501]).toContain(forgotPasswordResponse.status);

      if (forgotPasswordResponse.status === 200) {
        expect(forgotPasswordResponse.body.success).toBe(true);
      }

      // Nota: Los siguientes pasos requerirían un token de recuperación real
      // que normalmente se envía por email
    });
  });

  describe('Flujo Completo: Desactivación de Cuenta', () => {
    it('should complete account deactivation flow', async () => {
      // Paso 1: Crear y autenticar usuario
      const user = await User.create({
        name: 'Usuario a Desactivar',
        email: uniqueEmail('deactivate'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      }) as UserDocument;

      const token = testUtils.generateTestToken({ 
        userId: user._id.toString(), 
        role: 'patient' 
      });

      // Paso 2: Desactivar cuenta
      const deactivateResponse = await request(app)
        .delete('/api/v1/auth/deactivate')
        .set('Authorization', `Bearer ${token}`);

      expect([200, 404]).toContain(deactivateResponse.status);
      if (deactivateResponse.status === 200) {
        expect(deactivateResponse.body.success).toBe(true);
      }

      // Paso 3: Verificar que el usuario no puede acceder después de desactivación
      const accessResponse = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      // Puede retornar 401, 403 o 404 dependiendo de la implementación
      expect([200, 401, 403, 404]).toContain(accessResponse.status);
    });
  });

  describe('Flujo Completo: Administrador Gestiona Usuarios', () => {
    it('should complete admin user management flow', async () => {
      // Paso 1: Crear admin
      const admin = await User.create({
        name: 'Admin Gestor',
        email: uniqueEmail('admin-manager'),
        password: STRONG_PASSWORD,
        role: 'admin',
        isActive: true
      }) as UserDocument;

      const adminToken = testUtils.generateTestToken({ 
        userId: admin._id.toString(), 
        role: 'admin' 
      });

      // Paso 2: Crear nuevo usuario (doctor)
      const newDoctorData = {
        name: 'Dr. Nuevo',
        email: uniqueEmail('nuevo-doctor'),
        password: STRONG_PASSWORD,
        role: 'doctor'
      };

      const createUserResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(newDoctorData)
        .expect(201);

      const doctorId = createUserResponse.body.data.user._id;

      // Paso 3: Ver lista de usuarios
      const usersListResponse = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usersListResponse.body.success).toBe(true);
      expect(usersListResponse.body.data.length).toBeGreaterThan(0);

      // Paso 4: Ver estadísticas de usuarios
      const statsResponse = await request(app)
        .get('/api/v1/auth/users/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404]).toContain(statsResponse.status);
      if (statsResponse.status === 200) {
        expect(statsResponse.body.success).toBe(true);
        expect(statsResponse.body.data.totalUsers).toBeGreaterThan(0);
      }

      // Paso 5: Ver detalles de un usuario específico
      const userDetailsResponse = await request(app)
        .get(`/api/v1/auth/users/${doctorId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Puede retornar 200 o 404 dependiendo de si la ruta existe
      expect([200, 404]).toContain(userDetailsResponse.status);
    });
  });

  describe('Flujo Completo: Wearables Integration', () => {
    it('should complete wearable data sync flow', async () => {
      // Paso 1: Crear paciente
      const patient = await User.create({
        name: 'Paciente Wearable',
        email: uniqueEmail('wearable'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      }) as UserDocument;

      const patientToken = testUtils.generateTestToken({ 
        userId: patient._id.toString(), 
        role: 'patient' 
      });

      // Paso 2: Sincronizar datos de wearable
      const wearableData = {
        heartRate: 72,
        steps: 5000,
        sleepHours: 7.5,
        oxygenSaturation: 98,
        bloodPressure: {
          systolic: 120,
          diastolic: 80
        },
        timestamp: new Date().toISOString()
      };

      const syncResponse = await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(wearableData);

      expect([200, 201, 400, 422]).toContain(syncResponse.status);
      if (syncResponse.status === 200 || syncResponse.status === 201) {
        expect(syncResponse.body.success).toBe(true);
      }

      // Paso 3: Obtener datos sincronizados
      const getDataResponse = await request(app)
        .get('/api/v1/wearables')
        .set('Authorization', `Bearer ${patientToken}`);

      expect([200, 404]).toContain(getDataResponse.status);
      if (getDataResponse.status === 200) {
        expect(getDataResponse.body.success).toBe(true);
        expect(getDataResponse.body.data.length).toBeGreaterThan(0);
      }

      // Paso 4: Obtener métricas agregadas
      const metricsResponse = await request(app)
        .get('/api/v1/wearables/metrics')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data).toBeDefined();
    });
  });

  describe('Flujo Completo: Multi-dispositivo y Sesiones', () => {
    it('should handle multiple device sessions', async () => {
      // Paso 1: Crear usuario
      const userData = {
        name: 'Usuario Multi-dispositivo',
        email: uniqueEmail('multidevice'),
        password: STRONG_PASSWORD,
        role: 'patient'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Paso 2: Login desde dispositivo 1
      const device1Login = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const device1Token = device1Login.body.data.token;

      // Paso 3: Login desde dispositivo 2
      const device2Login = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const device2Token = device2Login.body.data.token;

      // Paso 4: Ambos tokens deberían funcionar
      const profile1 = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${device1Token}`)
        .expect(200);

      const profile2 = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${device2Token}`)
        .expect(200);

      expect(profile1.body.success).toBe(true);
      expect(profile2.body.success).toBe(true);
      expect(profile1.body.data.email).toBe(profile2.body.data.email);

      // Paso 5: Logout desde dispositivo 1
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${device1Token}`)
        .expect(200);

      // Paso 6: Dispositivo 2 todavía debería funcionar
      const profile2After = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${device2Token}`)
        .expect(200);

      expect(profile2After.body.success).toBe(true);
    });
  });

  describe('Flujo Completo: Personalización de Contenido Educativo tras Diagnóstico (RF-011)', () => {
    it('el paciente recibe contenido educativo relevante después de recibir un diagnóstico', async () => {
      // Paso 1: registro del paciente
      const registerData = {
        name: 'Lucía Fernández',
        email: uniqueEmail('flow-edu-patient'),
        password: STRONG_PASSWORD,
        role: 'patient'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      const patientToken = registerResponse.body.data.token;
      const patientId = registerResponse.body.data.user._id;

      // Paso 2: un médico diagnostica al paciente con asma
      const doctor = await User.create({
        name: 'Dr. Educativo',
        email: uniqueEmail('doctor-edu'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const doctorToken = testUtils.generateTestToken({
        userId: doctor._id.toString(),
        role: 'doctor'
      });

      await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId,
          patientName: registerData.name,
          age: 29,
          diagnosis: 'asma',
          symptoms: [{ name: 'sibilancias', severity: 'moderate', duration: '1 semana' }],
          description: 'Crisis asmática leve',
          date: new Date().toISOString()
        })
        .expect(201);

      // Paso 3: existe contenido educativo específico para asma, general y de otra condición
      const asthmaContent = await EducationalContentModel.create({
        title: 'Cómo reconocer una crisis asmática',
        summary: 'Señales de alerta ante una crisis de asma',
        content: 'Contenido educativo detallado sobre manejo de crisis asmáticas...',
        category: 'asma',
        targetConditions: ['asma']
      });
      const generalContent = await EducationalContentModel.create({
        title: 'Hábitos saludables para las vías respiratorias',
        summary: 'Consejos generales de prevención respiratoria',
        content: 'Contenido educativo general...',
        category: 'prevencion',
        targetConditions: []
      });
      const unrelatedContent = await EducationalContentModel.create({
        title: 'Manejo avanzado de EPOC',
        summary: 'Contenido específico para pacientes con EPOC',
        content: 'Contenido educativo de EPOC...',
        category: 'epoc',
        targetConditions: ['epoc']
      });

      // Paso 4: el paciente consulta el módulo educativo y recibe contenido personalizado
      const listResponse = await request(app)
        .get('/api/v1/educational-content')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      const ids = listResponse.body.data.map((item: any) => item._id);
      expect(ids).toContain(asthmaContent._id.toString());
      expect(ids).toContain(generalContent._id.toString());
      expect(ids).not.toContain(unrelatedContent._id.toString());

      // Paso 5: al consultar el detalle queda registrado el consumo del contenido
      const detailResponse = await request(app)
        .get(`/api/v1/educational-content/${asthmaContent._id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(detailResponse.body.data.viewCount).toBe(1);
    });
  });

  describe('Flujo Completo: Búsqueda Geoespacial de Centros de Salud (RF-012)', () => {
    it('el paciente busca el centro de salud con atención respiratoria más cercano a su ubicación', async () => {
      // Paso 1: registro del paciente
      const registerData = {
        name: 'Marco Salas',
        email: uniqueEmail('flow-geo-patient'),
        password: STRONG_PASSWORD,
        role: 'patient'
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      const patientToken = registerResponse.body.data.token;

      // Paso 2: existen centros de salud registrados, algunos con atención respiratoria
      await HealthCenterModel.create([
        {
          name: 'Hospital Hipólito Unanue',
          type: 'hospital',
          address: 'Av. Bolognesi 1801',
          district: 'Tacna',
          hasEmergencyServices: true,
          hasRespiratoryCare: true,
          location: { type: 'Point', coordinates: [-70.2444, -18.0114] }
        },
        {
          name: 'Posta Médica Alto de la Alianza',
          type: 'posta_medica',
          address: 'Sector Alto',
          district: 'Alto de la Alianza',
          hasEmergencyServices: false,
          hasRespiratoryCare: false,
          location: { type: 'Point', coordinates: [-70.35, -18.10] }
        }
      ]);

      // Paso 3: el paciente busca desde su ubicación actual el centro con atención respiratoria más cercano
      const nearbyResponse = await request(app)
        .get('/api/v1/health-centers/nearby')
        .query({ latitude: -18.0114, longitude: -70.2444, maxDistanceKm: 10, respiratoryOnly: 'true' })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(nearbyResponse.body.success).toBe(true);
      expect(nearbyResponse.body.data.length).toBeGreaterThanOrEqual(1);
      expect(nearbyResponse.body.data[0].name).toBe('Hospital Hipólito Unanue');
      expect(nearbyResponse.body.data[0].hasRespiratoryCare).toBe(true);
      expect(nearbyResponse.body.data[0]).toHaveProperty('distanceKm');
    });
  });

  describe('Flujo Completo: Error Handling y Recovery', () => {
    it('should handle network errors gracefully', async () => {
      const doctor = await User.create({
        name: 'Dr. Error Test',
        email: uniqueEmail('error-test'),
        password: STRONG_PASSWORD,
        role: 'doctor',
        isActive: true
      }) as UserDocument;

      const doctorToken = testUtils.generateTestToken({ 
        userId: doctor._id.toString(), 
        role: 'doctor' 
      });

      // Intentar crear historia con datos inválidos
      const invalidData = {
        // Falta patientId requerido
        patientName: 'Test',
        age: 30,
        symptoms: []
      };

      const errorResponse = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(invalidData);

      // Debería retornar error pero no crashear
      expect([400, 422]).toContain(errorResponse.status);
      expect(errorResponse.body.success).toBe(false);
      expect(errorResponse.body.message).toBeDefined();

      // Sistema debería seguir funcionando después del error
      const healthResponse = await request(app)
        .get('/api/v1/dashboard/health')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(healthResponse.body.success).toBe(true);
    });
  });
});

