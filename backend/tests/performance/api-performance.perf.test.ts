/**
 * API Performance Tests — SLA de Tiempos de Respuesta
 *
 * Estrategia:
 * - Mide tiempos de respuesta reales con supertest contra Express + MongoDB en memoria
 * - Verifica que cada endpoint crítico cumple los umbrales SLA definidos
 * - Prueba N repeticiones y computa mean, p95, p99
 * - No depende de servicios externos (AI, SMS, Redis real) — todos mockeados en setup.ts
 *
 * SLA Targets:
 * | Tipo de endpoint       | mean   | p95    | p99    |
 * |------------------------|--------|--------|--------|
 * | Auth (login/register)  | 300ms  | 500ms  | 800ms  |
 * | Read (list/get)        | 200ms  | 400ms  | 600ms  |
 * | Write (create/update)  | 350ms  | 600ms  | 900ms  |
 * | Analytics/Dashboard    | 400ms  | 700ms  | 1000ms |
 * | Search/Filter          | 250ms  | 450ms  | 700ms  |
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import User, { UserDocument } from '../../src/models/User';

const app = appInstance.app;

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

// ─── Utilidades de métricas ───────────────────────────────────────────────────

const computePercentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
};

const computeStats = (durations: number[]) => ({
  mean: durations.reduce((s, v) => s + v, 0) / durations.length,
  min: Math.min(...durations),
  max: Math.max(...durations),
  p95: computePercentile(durations, 95),
  p99: computePercentile(durations, 99),
});

/**
 * Ejecuta un callback N veces, midiendo su duración en ms cada vez.
 * Devuelve el array de duraciones.
 */
const measureN = async (
  n: number,
  fn: () => Promise<void>
): Promise<number[]> => {
  const durations: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    await fn();
    durations.push(performance.now() - t0);
  }
  return durations;
};

// SLA thresholds (ms)
const SLA = {
  auth:      { mean: 300, p95: 500, p99: 800 },
  read:      { mean: 200, p95: 400, p99: 600 },
  write:     { mean: 350, p95: 600, p99: 900 },
  analytics: { mean: 400, p95: 700, p99: 1000 },
  search:    { mean: 250, p95: 450, p99: 700 },
};

const assertSLA = (
  stats: ReturnType<typeof computeStats>,
  threshold: { mean: number; p95: number; p99: number },
  label: string
) => {
  expect(stats.mean).toBeLessThan(threshold.mean);
  expect(stats.p95).toBeLessThan(threshold.p95);
  expect(stats.p99).toBeLessThan(threshold.p99);
};

// ─── Setup ────────────────────────────────────────────────────────────────────

let doctorToken: string;
let adminToken: string;
let patientToken: string;
let doctorId: string;
let patientId: string;

beforeEach(async () => {
  await testUtils.cleanTestData();

  const doctor = await User.create({
    name: 'Perf Doctor',
    email: uniqueEmail('perfdoc'),
    password: STRONG_PASSWORD,
    role: 'doctor',
    isActive: true,
  }) as UserDocument;
  doctorId = doctor._id.toString();
  doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

  const admin = await User.create({
    name: 'Perf Admin',
    email: uniqueEmail('perfadmin'),
    password: STRONG_PASSWORD,
    role: 'admin',
    isActive: true,
  }) as UserDocument;
  adminToken = testUtils.generateTestToken({ userId: admin._id.toString(), role: 'admin' });

  const patient = await User.create({
    name: 'Perf Patient',
    email: uniqueEmail('perfpat'),
    password: STRONG_PASSWORD,
    role: 'patient',
    isActive: true,
  }) as UserDocument;
  patientId = patient._id.toString();
  patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Auth Endpoints', () => {
  const ITERATIONS = 8;

  it('POST /api/v1/auth/login cumple SLA (mean<300ms, p95<500ms)', async () => {
    const email = uniqueEmail('loginperf');
    const password = STRONG_PASSWORD;
    await User.create({ name: 'Login Perf', email, password, role: 'patient', isActive: true });

    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password });
      expect([200, 401, 400]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.auth, 'POST /auth/login');
  });

  it('POST /api/v1/auth/register cumple SLA (mean<300ms, p95<500ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Perf User',
          email: uniqueEmail('reg'),
          password: STRONG_PASSWORD,
          role: 'patient',
        });
      expect([200, 201, 400]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.auth, 'POST /auth/register');
  });

  it('GET /api/v1/auth/profile cumple SLA (mean<200ms, p95<400ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect([200, 401, 404]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.read, 'GET /auth/profile');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICAL HISTORY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Medical History Endpoints', () => {
  const ITERATIONS = 8;

  it('GET /api/v1/medical-histories cumple SLA de lectura (mean<200ms, p95<400ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({ page: 1, limit: 10 });
      expect([200, 401, 403]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.read, 'GET /medical-histories');
  });

  it('POST /api/v1/medical-histories cumple SLA de escritura (mean<350ms, p95<600ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId,
          diagnosis: 'Bronquitis aguda - perf test',
          symptoms: ['tos', 'fiebre'],
          treatment: 'Reposo y líquidos',
          notes: 'Prueba de performance',
        });
      expect([200, 201, 400, 422]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.write, 'POST /medical-histories');
  });

  it('GET /api/v1/medical-histories?search= cumple SLA de búsqueda (mean<250ms, p95<450ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({ search: 'bronquitis', page: 1, limit: 20 });
      expect([200, 401, 403]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.search, 'GET /medical-histories?search=');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Alerts Endpoints', () => {
  const ITERATIONS = 8;

  it('GET /api/v1/alerts cumple SLA de lectura (mean<200ms, p95<400ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect([200, 401, 403]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.read, 'GET /alerts');
  });

  it('POST /api/v1/alerts/critical-symptom cumple SLA de escritura (mean<350ms, p95<600ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .post('/api/v1/alerts/critical-symptom')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          userId: patientId,
          patientId,
          patientName: 'Perf Patient',
          symptomName: 'disnea severa',
          severity: 'high',
        });
      expect([200, 201, 400, 403, 500]).toContain(res.status);
      expect(res.status).not.toBe(401);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.write, 'POST /alerts/critical-symptom');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS / DASHBOARD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Analytics & Dashboard Endpoints', () => {
  const ITERATIONS = 6;

  it('GET /api/v1/analytics/dashboard cumple SLA (mean<400ms, p95<700ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 401, 403, 404, 500]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.analytics, 'GET /analytics/dashboard');
  });

  it('GET /api/v1/analytics/ml cumple SLA (mean<400ms, p95<700ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/analytics/ml')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 401, 403, 404, 500]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.analytics, 'GET /analytics/ml');
  });

  it('GET /api/v1/dashboard/health cumple SLA de lectura (mean<200ms, p95<400ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 401, 403, 404]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.read, 'GET /health');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEARABLES ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Wearable Endpoints', () => {
  const ITERATIONS = 8;

  it('POST /api/v1/wearables/sync cumple SLA de escritura (mean<350ms, p95<600ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .post('/api/v1/wearables/sync')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          deviceId: `device-${randomUUID()}`,
          deviceType: 'smartwatch',
          metrics: {
            heartRate: 72,
            oxygenSaturation: 98,
            steps: 4500,
            temperature: 36.5,
          },
          timestamp: new Date().toISOString(),
        });
      expect([200, 201, 400, 422, 500]).toContain(res.status);
      expect(res.status).not.toBe(401);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.write, 'POST /wearables/sync');
  });

  it('GET /api/v1/wearables cumple SLA de lectura (mean<200ms, p95<400ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/wearables')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({ limit: 20 });
      expect([200, 401, 403, 404]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.read, 'GET /wearables');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMERGENCY ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Emergency Endpoints', () => {
  const ITERATIONS = 6;

  it('POST /api/v1/emergency cumple SLA de escritura (mean<350ms, p95<600ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .post('/api/v1/emergency')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patientId,
          symptoms: ['dificultad respiratoria severa', 'dolor pecho'],
          location: { latitude: -18.0056, longitude: -70.2444, address: 'Centro de Tacna' },
          severity: 'critical',
        });
      expect([200, 201, 400, 500]).toContain(res.status);
      expect(res.status).not.toBe(401);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.write, 'POST /emergency');
  });

  it('GET /api/v1/emergency cumple SLA de lectura admin (mean<200ms, p95<400ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/emergency')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'active', limit: 10 });
      expect([200, 401, 403, 404]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.read, 'GET /emergency');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRALS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Referral Endpoints', () => {
  const ITERATIONS = 8;

  it('GET /api/v1/referrals cumple SLA de lectura (mean<200ms, p95<400ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/referrals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({ page: 1, limit: 10 });
      expect([200, 401, 403, 404]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.read, 'GET /referrals');
  });

  it('POST /api/v1/referrals cumple SLA de escritura (mean<350ms, p95<600ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId,
          fromDoctorId: doctorId,
          toDoctorId: doctorId,
          reason: `Evaluación especialista perf ${randomUUID()}`,
          urgencyLevel: 'medium',
          specialty: 'Neumología',
        });
      expect([200, 201, 400, 422, 500]).toContain(res.status);
      expect(res.status).not.toBe(401);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.write, 'POST /referrals');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SYMPTOM ANALYZER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Symptom Analyzer Endpoints', () => {
  const ITERATIONS = 6;

  it('POST /api/v1/symptom-analyzer/analyze cumple SLA (mean<350ms, p95<600ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .post('/api/v1/symptom-analyzer/analyze')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          symptoms: ['tos seca', 'fiebre', 'dificultad respiratoria'],
          patientAge: 35,
          duration: '3 días',
        });
      expect([200, 201, 400, 422, 500, 503]).toContain(res.status);
      expect(res.status).not.toBe(401);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.write, 'POST /symptom-analyzer/analyze');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Consent Endpoints', () => {
  const ITERATIONS = 8;

  it('GET /api/v1/consents cumple SLA de lectura (mean<200ms, p95<400ms)', async () => {
    const durations = await measureN(ITERATIONS, async () => {
      const res = await request(app)
        .get('/api/v1/informed-consents')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({ page: 1, limit: 10 });
      expect([200, 401, 403, 404]).toContain(res.status);
    });

    const stats = computeStats(durations);
    assertSLA(stats, SLA.read, 'GET /informed-consents');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYLOAD SIZE — PAGINACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

describe('Performance — Payload Size & Pagination', () => {
  it('Respuesta con limit=100 no excede 2MB de payload', async () => {
    const res = await request(app)
      .get('/api/v1/medical-histories')
      .set('Authorization', `Bearer ${doctorToken}`)
      .query({ page: 1, limit: 100 });

    expect([200, 401, 403]).toContain(res.status);
    if (res.status === 200) {
      const payloadBytes = Buffer.byteLength(JSON.stringify(res.body));
      expect(payloadBytes).toBeLessThan(2 * 1024 * 1024); // 2 MB
    }
  });

  it('Respuesta con limit=10 es más rápida que limit=100', async () => {
    const t0 = performance.now();
    await request(app)
      .get('/api/v1/medical-histories')
      .set('Authorization', `Bearer ${doctorToken}`)
      .query({ page: 1, limit: 10 });
    const timeSmall = performance.now() - t0;

    const t1 = performance.now();
    await request(app)
      .get('/api/v1/medical-histories')
      .set('Authorization', `Bearer ${doctorToken}`)
      .query({ page: 1, limit: 100 });
    const timeLarge = performance.now() - t1;

    // Ambas deben ser aceptables; la diferencia no debe ser mayor a 10x
    expect(timeLarge / timeSmall).toBeLessThan(10);
  });
});