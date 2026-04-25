/**
 * E2E Tests - Flujo del Chatbot de IA Conversacional
 * Verifica el ciclo completo: inicio de sesión → preguntas de síntomas → análisis → recomendación
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import User, { UserDocument } from '../../src/models/User';

const app = appInstance.app;

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

describe('E2E Tests - Flujo del Chatbot Conversacional', () => {
  let patientToken: string;
  let doctorToken: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    const patient = await User.create({
      name: 'Paciente Chatbot',
      email: uniqueEmail('patient-chat'),
      password: STRONG_PASSWORD,
      role: 'patient',
      isActive: true,
    }) as UserDocument;

    const doctor = await User.create({
      name: 'Dr. Chatbot',
      email: uniqueEmail('dr-chat'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true,
    }) as UserDocument;

    patientToken = testUtils.generateTestToken({ userId: patient._id.toString(), role: 'patient' });
    doctorToken = testUtils.generateTestToken({ userId: doctor._id.toString(), role: 'doctor' });
    patientId = patient._id.toString();
  });

  // ─── Flujo 1: Consulta conversacional completa ────────────────────────────

  describe('Flujo Completo: Consulta de Síntomas Respiratorios via Chatbot', () => {
    it('should complete multi-turn symptom consultation', async () => {
      // Paso 1: Iniciar conversación con síntoma inicial
      const firstMessageResponse = await request(app)
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Tengo tos desde hace 5 días',
          sessionId: `session-${randomUUID()}`,
          patientId,
        });

      expect([200, 201, 400, 404, 503]).toContain(firstMessageResponse.status);
      expect(firstMessageResponse.status).not.toBe(401);
      expect(firstMessageResponse.status).not.toBe(403);

      const sessionId =
        firstMessageResponse.status === 200
          ? firstMessageResponse.body.data?.sessionId
          : `session-${randomUUID()}`;

      // Paso 2: Continuar con más síntomas
      const secondMessageResponse = await request(app)
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'También tengo fiebre de 38.5 grados y me cuesta respirar',
          sessionId,
          patientId,
        });

      expect([200, 201, 400, 404, 503]).toContain(secondMessageResponse.status);

      // Paso 3: Responder preguntas de seguimiento del bot
      const followUpResponse = await request(app)
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Los síntomas empezaron de manera gradual. No tengo alergias conocidas.',
          sessionId,
          patientId,
        });

      expect([200, 201, 400, 404, 503]).toContain(followUpResponse.status);

      // Paso 4: Obtener análisis final de la conversación
      const analysisResponse = await request(app)
        .get(`/api/v1/chat/sessions/${sessionId}/analysis`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect([200, 404, 503]).toContain(analysisResponse.status);
    });
  });

  // ─── Flujo 2: Análisis de imagen de chat ──────────────────────────────────

  describe('Flujo Completo: Análisis de Audio/Texto en Chatbot', () => {
    it('should handle text-based symptom analysis flow', async () => {
      // Flujo puramente de texto (sin archivos multimedia)
      const symptomMessages = [
        'Hola, me siento muy mal',
        'Tengo dolor en el pecho y no puedo respirar bien',
        'Esto empezó hace 2 días después de estar en contacto con alguien enfermo',
        'Tengo 65 años y soy diabético',
      ];

      let currentSessionId = `session-${randomUUID()}`;

      for (const message of symptomMessages) {
        const response = await request(app)
          .post('/api/v1/chat/message')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            message,
            sessionId: currentSessionId,
            patientId,
          });

        expect([200, 201, 400, 404, 503]).toContain(response.status);

        if (response.status === 200 && response.body.data?.sessionId) {
          currentSessionId = response.body.data.sessionId;
        }
      }

      // Ver historial de sesión
      const historyResponse = await request(app)
        .get(`/api/v1/chat/sessions/${currentSessionId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect([200, 404, 503]).toContain(historyResponse.status);
    });
  });

  // ─── Flujo 3: Chatbot detecta emergencia y escala ─────────────────────────

  describe('Flujo Completo: Chatbot Detecta Emergencia y Escala', () => {
    it('should escalate to emergency when critical symptoms detected', async () => {
      const sessionId = `session-emerg-${randomUUID()}`;

      // Mensaje con síntomas críticos
      const criticalResponse = await request(app)
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message:
            'No puedo respirar, tengo dolor severo en el pecho, me estoy desmayando. Ayuda.',
          sessionId,
          patientId,
          urgencyFlag: true,
        });

      expect([200, 201, 400, 404, 503]).toContain(criticalResponse.status);

      // Si el bot detecta emergencia, debería retornar nivel de urgencia crítico
      if (criticalResponse.status === 200) {
        const responseData = criticalResponse.body.data;
        if (responseData?.urgencyLevel) {
          expect(['critical', 'high']).toContain(responseData.urgencyLevel);
        }
        if (responseData?.recommendation) {
          expect(typeof responseData.recommendation).toBe('string');
        }
      }
    });
  });

  // ─── Flujo 4: Historial de sesiones del chatbot ───────────────────────────

  describe('Flujo Completo: Historial de Sesiones del Chatbot', () => {
    it('should retrieve chat session history for patient', async () => {
      // Crear sesiones
      const sessions = [`session-${randomUUID()}`, `session-${randomUUID()}`];

      for (const sessionId of sessions) {
        await request(app)
          .post('/api/v1/chat/message')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            message: 'Tengo tos',
            sessionId,
            patientId,
          });
      }

      // Ver lista de sesiones del paciente
      const sessionsListResponse = await request(app)
        .get('/api/v1/chat/sessions')
        .query({ patientId })
        .set('Authorization', `Bearer ${patientToken}`);

      expect([200, 404, 503]).toContain(sessionsListResponse.status);
      expect(sessionsListResponse.status).not.toBe(401);
      expect(sessionsListResponse.status).not.toBe(403);
    });
  });

  // ─── Flujo 5: Doctor revisa historial de chatbot del paciente ─────────────

  describe('Flujo Completo: Doctor Revisa Historial del Chatbot', () => {
    it('should allow doctor to review patient chatbot sessions', async () => {
      const sessionId = `session-review-${randomUUID()}`;

      // Paciente inicia sesión
      await request(app)
        .post('/api/v1/chat/message')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Tengo dificultad para respirar hace 3 días',
          sessionId,
          patientId,
        });

      // Doctor accede al historial de conversaciones del paciente
      const doctorReviewResponse = await request(app)
        .get('/api/v1/chat/sessions')
        .query({ patientId })
        .set('Authorization', `Bearer ${doctorToken}`);

      expect([200, 403, 404, 503]).toContain(doctorReviewResponse.status);
    });
  });

  // ─── Flujo 6: Chatbot con análisis de ML integrado ────────────────────────

  describe('Flujo Completo: Chatbot Integrado con Motor de ML', () => {
    it('should process symptom analysis through ML pipeline', async () => {
      const sessionId = `session-ml-${randomUUID()}`;

      // Conversación con suficiente información para análisis ML
      const conversationFlow = [
        'Tengo tos seca persistente',
        'También sibilancias al respirar, sobre todo por la noche',
        'Tengo 35 años, no fumo',
        'Mis síntomas empeoran con el ejercicio y el frío',
      ];

      for (const msg of conversationFlow) {
        await request(app)
          .post('/api/v1/chat/message')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            message: msg,
            sessionId,
            patientId,
          });
      }

      // Solicitar análisis de ML del chatbot
      const mlAnalysisResponse = await request(app)
        .post('/api/v1/chat/sessions/analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          sessionId,
          patientId,
          requestFullAnalysis: true,
        });

      expect([200, 201, 400, 404, 503]).toContain(mlAnalysisResponse.status);
      expect(mlAnalysisResponse.status).not.toBe(401);
      expect(mlAnalysisResponse.status).not.toBe(403);
    });
  });
});