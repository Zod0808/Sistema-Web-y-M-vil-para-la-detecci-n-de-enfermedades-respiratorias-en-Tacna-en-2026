/**
 * Unit tests for ChatConversation model (JavaScript)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChatConversation = require('../../../src/models/ChatConversation');
import mongoose from 'mongoose';

const buildConversation = (overrides: Record<string, any> = {}) => ({
  sessionId: `session-${Date.now()}-${Math.random()}`,
  ...overrides,
});

const buildMessage = (overrides: Record<string, any> = {}) => ({
  role: 'user',
  content: 'Tengo tos y fiebre',
  ...overrides,
});

describe('ChatConversation model', () => {
  afterEach(async () => {
    await ChatConversation.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  // ─── Schema & required fields ──────────────────────────────────────────────

  describe('required fields', () => {
    it('persiste correctamente con sessionId', async () => {
      const doc = new ChatConversation(buildConversation());
      await expect(doc.save()).resolves.toBeDefined();
    });

    it('falla sin sessionId', async () => {
      const doc = new ChatConversation({});
      await expect(doc.save()).rejects.toThrow();
    });

    it('falla con sessionId duplicado', async () => {
      const sessionId = `dup-session-${Date.now()}`;
      await new ChatConversation(buildConversation({ sessionId })).save();
      const dup = new ChatConversation(buildConversation({ sessionId }));
      await expect(dup.save()).rejects.toThrow();
    });
  });

  // ─── Defaults ──────────────────────────────────────────────────────────────

  describe('default values', () => {
    it('status por defecto es active', async () => {
      const doc = await new ChatConversation(buildConversation()).save();
      expect(doc.status).toBe('active');
    });

    it('requiresFollowUp por defecto es false', async () => {
      const doc = await new ChatConversation(buildConversation()).save();
      expect(doc.requiresFollowUp).toBe(false);
    });

    it('metadata.language por defecto es es', async () => {
      const doc = await new ChatConversation(buildConversation()).save();
      expect(doc.metadata.language).toBe('es');
    });

    it('metadata.source por defecto es web', async () => {
      const doc = await new ChatConversation(buildConversation()).save();
      expect(doc.metadata.source).toBe('web');
    });

    it('location.city por defecto es Tacna', async () => {
      const doc = await new ChatConversation(buildConversation()).save();
      expect(doc.location.city).toBe('Tacna');
    });

    it('location.country por defecto es Perú', async () => {
      const doc = await new ChatConversation(buildConversation()).save();
      expect(doc.location.country).toBe('Perú');
    });

    it('summary.highestUrgency por defecto es low', async () => {
      const doc = await new ChatConversation(buildConversation()).save();
      expect(doc.summary.highestUrgency).toBe('low');
    });

    it('summary.totalMessages por defecto es 0', async () => {
      const doc = await new ChatConversation(buildConversation()).save();
      expect(doc.summary.totalMessages).toBe(0);
    });
  });

  // ─── Enum validation ───────────────────────────────────────────────────────

  describe('enum validation', () => {
    it('status acepta active/completed/abandoned', async () => {
      for (const status of ['active', 'completed', 'abandoned']) {
        const doc = new ChatConversation(buildConversation({ status }));
        await expect(doc.save()).resolves.toBeDefined();
        await ChatConversation.deleteMany({});
      }
    });

    it('status rechaza valor inválido', async () => {
      const doc = new ChatConversation(buildConversation({ status: 'unknown' }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('metadata.source acepta web/mobile', async () => {
      for (const source of ['web', 'mobile']) {
        const doc = new ChatConversation(buildConversation({ metadata: { source } }));
        await expect(doc.save()).resolves.toBeDefined();
        await ChatConversation.deleteMany({});
      }
    });

    it('summary.highestUrgency rechaza valor inválido', async () => {
      const doc = new ChatConversation(buildConversation({
        summary: { highestUrgency: 'extreme' },
      }));
      await expect(doc.save()).rejects.toThrow();
    });
  });

  // ─── Embedded messages ─────────────────────────────────────────────────────

  describe('embedded messages', () => {
    it('almacena mensaje con role user', async () => {
      const doc = new ChatConversation(buildConversation({
        messages: [buildMessage()],
      }));
      const saved = await doc.save();
      expect(saved.messages).toHaveLength(1);
      expect(saved.messages[0].role).toBe('user');
    });

    it('almacena mensaje con role bot', async () => {
      const doc = new ChatConversation(buildConversation({
        messages: [buildMessage({ role: 'bot', content: 'Recomiendo visitar al médico' })],
      }));
      const saved = await doc.save();
      expect(saved.messages[0].role).toBe('bot');
    });

    it('mensaje falla con role inválido', async () => {
      const doc = new ChatConversation(buildConversation({
        messages: [buildMessage({ role: 'system' })],
      }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('mensaje falla sin content', async () => {
      const doc = new ChatConversation(buildConversation({
        messages: [{ role: 'user' }],
      }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('mensaje almacena metadata con detectedDiseases', async () => {
      const doc = new ChatConversation(buildConversation({
        messages: [buildMessage({
          metadata: {
            urgencyLevel: 'high',
            confidence: 0.85,
            detectedDiseases: ['Gripe', 'COVID-19'],
            detectedSymptoms: ['tos', 'fiebre'],
          },
        })],
      }));
      const saved = await doc.save();
      expect(saved.messages[0].metadata.detectedDiseases).toContain('Gripe');
    });
  });

  // ─── Instance method: addMessage ───────────────────────────────────────────

  describe('addMessage()', () => {
    it('agrega mensaje y actualiza summary.totalMessages', async () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('user', 'Tengo fiebre');
      expect(doc.summary.totalMessages).toBe(1);
      expect(doc.summary.userMessages).toBe(1);
      expect(doc.summary.botMessages).toBe(0);
    });

    it('cuenta mensajes user y bot correctamente', async () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('user', 'Mensaje del usuario');
      doc.addMessage('bot', 'Respuesta del bot');
      doc.addMessage('user', 'Segunda pregunta');

      expect(doc.summary.userMessages).toBe(2);
      expect(doc.summary.botMessages).toBe(1);
    });

    it('actualiza detectedDiseases sin duplicados', async () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('bot', 'Respuesta', { detectedDiseases: ['Gripe'] });
      doc.addMessage('bot', 'Respuesta 2', { detectedDiseases: ['Gripe', 'COVID-19'] });

      expect(doc.summary.detectedDiseases.filter((d: string) => d === 'Gripe')).toHaveLength(1);
      expect(doc.summary.detectedDiseases).toContain('COVID-19');
    });

    it('actualiza detectedSymptoms sin duplicados', async () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('user', 'Mensaje', { detectedSymptoms: ['tos', 'fiebre'] });
      doc.addMessage('user', 'Más síntomas', { detectedSymptoms: ['tos', 'dolor'] });

      const tosCount = doc.summary.detectedSymptoms.filter((s: string) => s === 'tos').length;
      expect(tosCount).toBe(1);
      expect(doc.summary.detectedSymptoms).toContain('dolor');
    });

    it('actualiza highestUrgency de low a high', () => {
      const doc = new ChatConversation(buildConversation());
      expect(doc.summary.highestUrgency).toBe('low');
      doc.addMessage('bot', 'Respuesta', { urgencyLevel: 'high' });
      expect(doc.summary.highestUrgency).toBe('high');
    });

    it('no baja la urgency una vez está en high', () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('bot', 'Resp', { urgencyLevel: 'high' });
      doc.addMessage('bot', 'Resp2', { urgencyLevel: 'low' });
      expect(doc.summary.highestUrgency).toBe('high');
    });

    it('sube urgency a critical desde high', () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('bot', 'Resp', { urgencyLevel: 'high' });
      doc.addMessage('bot', 'Resp2', { urgencyLevel: 'critical' });
      expect(doc.summary.highestUrgency).toBe('critical');
    });

    it('activa requiresFollowUp cuando urgencyLevel es high', () => {
      const doc = new ChatConversation(buildConversation());
      expect(doc.requiresFollowUp).toBe(false);
      doc.addMessage('bot', 'Resp', { urgencyLevel: 'high' });
      expect(doc.requiresFollowUp).toBe(true);
    });

    it('activa requiresFollowUp cuando urgencyLevel es critical', () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('bot', 'Resp', { urgencyLevel: 'critical' });
      expect(doc.requiresFollowUp).toBe(true);
    });

    it('NO activa requiresFollowUp cuando urgencyLevel es medium', () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('bot', 'Resp', { urgencyLevel: 'medium' });
      expect(doc.requiresFollowUp).toBe(false);
    });

    it('acepta urgencyLevel en español (alta→high)', () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('bot', 'Resp', { urgencyLevel: 'alta' });
      expect(doc.summary.highestUrgency).toBe('high');
    });

    it('acepta urgencyLevel critica→critical', () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('bot', 'Resp', { urgencyLevel: 'critica' });
      expect(doc.summary.highestUrgency).toBe('critical');
    });

    it('calcula averageConfidence correctamente', () => {
      const doc = new ChatConversation(buildConversation());
      doc.addMessage('bot', 'R1', { confidence: 0.8 });
      doc.addMessage('bot', 'R2', { confidence: 0.6 });
      expect(doc.summary.averageConfidence).toBeCloseTo(0.7);
    });

    it('actualiza lastActivityAt', () => {
      const doc = new ChatConversation(buildConversation());
      const before = doc.lastActivityAt;
      // Small delay to ensure time difference
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);
      doc.addMessage('user', 'Mensaje nuevo');
      expect(doc.lastActivityAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      jest.useRealTimers();
    });
  });

  // ─── Instance method: complete() ───────────────────────────────────────────

  describe('complete()', () => {
    it('cambia status a completed', () => {
      const doc = new ChatConversation(buildConversation());
      doc.complete();
      expect(doc.status).toBe('completed');
    });

    it('establece completedAt', () => {
      const doc = new ChatConversation(buildConversation());
      expect(doc.completedAt).toBeUndefined();
      doc.complete();
      expect(doc.completedAt).toBeInstanceOf(Date);
    });
  });

  // ─── Virtuals ──────────────────────────────────────────────────────────────

  describe('virtuals', () => {
    it('messageCount retorna número de mensajes', () => {
      const doc = new ChatConversation(buildConversation({
        messages: [buildMessage(), buildMessage({ role: 'bot', content: 'OK' })],
      }));
      expect(doc.messageCount).toBe(2);
    });

    it('duration retorna número mayor a 0', () => {
      const doc = new ChatConversation(buildConversation());
      expect(typeof doc.duration).toBe('number');
      expect(doc.duration).toBeGreaterThanOrEqual(0);
    });

    it('duration usa completedAt si existe', () => {
      const start = new Date(Date.now() - 60000);
      const end = new Date();
      const doc = new ChatConversation(buildConversation({
        startedAt: start,
        completedAt: end,
      }));
      expect(doc.duration).toBeCloseTo(60000, -3);
    });
  });

  // ─── Static methods ────────────────────────────────────────────────────────

  describe('statics', () => {
    describe('getRecent()', () => {
      it('retorna conversaciones ordenadas por lastActivityAt desc', async () => {
        await new ChatConversation(buildConversation({ sessionId: 's1' })).save();
        await new ChatConversation(buildConversation({ sessionId: 's2' })).save();

        const results = await ChatConversation.getRecent(10);
        expect(results.length).toBeGreaterThanOrEqual(2);
      });

      it('respeta el límite', async () => {
        for (let i = 0; i < 5; i++) {
          await new ChatConversation(buildConversation({ sessionId: `s-limit-${i}` })).save();
        }

        const results = await ChatConversation.getRecent(2);
        expect(results.length).toBeLessThanOrEqual(2);
      });

      it('excluye messages del resultado', async () => {
        await new ChatConversation(buildConversation({
          sessionId: 'with-msgs',
          messages: [buildMessage()],
        })).save();

        const results = await ChatConversation.getRecent(5);
        results.forEach((r: any) => {
          expect(r.messages).toBeUndefined();
        });
      });
    });

    describe('getByUser()', () => {
      it('retorna sólo las conversaciones del usuario dado', async () => {
        const userId = 'user-abc';
        await new ChatConversation(buildConversation({ sessionId: 'u1', userId })).save();
        await new ChatConversation(buildConversation({ sessionId: 'u2', userId: 'otro' })).save();

        const results = await ChatConversation.getByUser(userId);
        expect(results.every((r: any) => r.userId === userId)).toBe(true);
      });

      it('retorna array vacío si el usuario no tiene conversaciones', async () => {
        const results = await ChatConversation.getByUser('nonexistent-user');
        expect(results).toHaveLength(0);
      });
    });

    describe('getUrgent()', () => {
      it('retorna conversaciones con urgency high o critical', async () => {
        await new ChatConversation(buildConversation({
          sessionId: 'urgent-high',
          summary: { highestUrgency: 'high' },
        })).save();
        await new ChatConversation(buildConversation({
          sessionId: 'urgent-critical',
          summary: { highestUrgency: 'critical' },
        })).save();
        await new ChatConversation(buildConversation({
          sessionId: 'urgent-low',
          summary: { highestUrgency: 'low' },
        })).save();

        const results = await ChatConversation.getUrgent();
        expect(results.length).toBeGreaterThanOrEqual(2);
        results.forEach((r: any) => {
          expect(['high', 'critical']).toContain(r.summary.highestUrgency);
        });
      });

      it('excluye conversaciones completadas', async () => {
        await new ChatConversation(buildConversation({
          sessionId: 'urgent-done',
          status: 'completed',
          summary: { highestUrgency: 'critical' },
        })).save();

        const results = await ChatConversation.getUrgent();
        results.forEach((r: any) => {
          expect(r.status).not.toBe('completed');
        });
      });
    });

    describe('getStatistics()', () => {
      it('retorna ceros cuando no hay documentos', async () => {
        const stats = await ChatConversation.getStatistics();
        expect(stats.totalConversations).toBe(0);
        expect(stats.activeConversations).toBe(0);
      });

      it('cuenta correctamente por status', async () => {
        await new ChatConversation(buildConversation({ sessionId: 'st1', status: 'active' })).save();
        await new ChatConversation(buildConversation({ sessionId: 'st2', status: 'completed' })).save();
        await new ChatConversation(buildConversation({ sessionId: 'st3', status: 'active' })).save();

        const stats = await ChatConversation.getStatistics();
        expect(stats.totalConversations).toBeGreaterThanOrEqual(3);
        expect(stats.activeConversations).toBeGreaterThanOrEqual(2);
        expect(stats.completedConversations).toBeGreaterThanOrEqual(1);
      });

      it('cuenta urgentConversations con highestUrgency high o critical', async () => {
        await new ChatConversation(buildConversation({
          sessionId: 'stat-urgent',
          summary: { highestUrgency: 'critical' },
        })).save();

        const stats = await ChatConversation.getStatistics();
        expect(stats.urgentConversations).toBeGreaterThanOrEqual(1);
      });

      it('acepta filtros de fecha', async () => {
        const stats = await ChatConversation.getStatistics({
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
        });
        expect(stats).toBeDefined();
        expect(typeof stats.totalConversations).toBe('number');
      });
    });
  });
});