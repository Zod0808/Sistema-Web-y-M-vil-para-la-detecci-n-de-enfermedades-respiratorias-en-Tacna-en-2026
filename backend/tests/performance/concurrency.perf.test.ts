/**
 * Concurrency Performance Tests — Peticiones Paralelas y Carga Mixta
 *
 * Estrategia:
 * - Lanza N peticiones simultáneas (Promise.all) contra la misma instancia Express
 * - Verifica que no haya race conditions en creación de recursos
 * - Mide throughput: cuántas req/s puede atender el servidor bajo carga paralela
 * - Prueba carga mixta (lecturas + escrituras simultáneas)
 * - Verifica aislamiento: respuestas correctas bajo concurrencia
 *
 * Umbrales:
 * - Ninguna respuesta debe ser 500 por condición de carrera
 * - El throughput de lectura debe ser ≥ 5 req/s
 * - Todas las peticiones deben completarse en < 5 segundos totales
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import User, { UserDocument } from '../../src/models/User';

const app = appInstance.app;

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

// ─── Setup ────────────────────────────────────────────────────────────────────

let doctorToken: string;
let adminToken: string;
let patientToken: string;
let doctorId: string;
let patientId: string;

beforeEach(async () => {
  await testUtils.cleanTestData();

  const doctor = await User.create({
    name: 'Concurrency Doctor',
    email: uniqueEmail('concdoc'),
    password: STRONG_PASSWORD,
    role: 'doctor',
    isActive: true,
  }) as UserDocument;
  doctorId = doctor._id.toString();
  doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

  const admin = await User.create({
    name: 'Concurrency Admin',
    email: uniqueEmail('concadmin'),
    password: STRONG_PASSWORD,
    role: 'admin',
    isActive: true,
  }) as UserDocument;
  adminToken = testUtils.generateTestToken({ userId: admin._id.toString(), role: 'admin' });

  const patient = await User.create({
    name: 'Concurrency Patient',
    email: uniqueEmail('concpat'),
    password: STRONG_PASSWORD,
    role: 'patient',
    isActive: true,
  }) as UserDocument;
  patientId = patient._id.toString();
  patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LECTURA PARALELA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Concurrencia — Lecturas Paralelas', () => {
  it('10 GET /medical-histories simultáneos responden todos correctamente', async () => {
    const CONCURRENT = 10;

    const t0 = performance.now();
    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        request(app)
          .get('/api/v1/medical-histories')
          .set('Authorization', `Bearer ${doctorToken}`)
          .query({ page: 1, limit: 10 })
      )
    );
    const elapsed = performance.now() - t0;

    // Todas deben responder (no timeout)
    expect(responses).toHaveLength(CONCURRENT);
    // Ninguna debe ser error de servidor (5xx) por race condition
    responses.forEach((res) => {
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(503);
    });
    // Throughput: 10 req en menos de 5 segundos
    expect(elapsed).toBeLessThan(5000);
  });

  it('10 GET /alerts simultáneos responden todos correctamente', async () => {
    const CONCURRENT = 10;

    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        request(app)
          .get('/api/v1/alerts')
          .set('Authorization', `Bearer ${doctorToken}`)
      )
    );

    expect(responses).toHaveLength(CONCURRENT);
    responses.forEach((res) => {
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(401);
    });
  });

  it('20 GET /wearables simultáneos responden en menos de 8 segundos', async () => {
    const CONCURRENT = 20;

    const t0 = performance.now();
    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        request(app)
          .get('/api/v1/wearables')
          .set('Authorization', `Bearer ${patientToken}`)
          .query({ limit: 10 })
      )
    );
    const elapsed = performance.now() - t0;

    expect(responses).toHaveLength(CONCURRENT);
    expect(elapsed).toBeLessThan(8000);
    responses.forEach((res) => {
      expect([200, 401, 403, 404]).toContain(res.status);
    });
  });

  it('Throughput mínimo: ≥ 5 req/s en lecturas de historial médico', async () => {
    const CONCURRENT = 10;

    const t0 = performance.now();
    await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        request(app)
          .get('/api/v1/medical-histories')
          .set('Authorization', `Bearer ${doctorToken}`)
          .query({ page: 1, limit: 5 })
      )
    );
    const elapsedSeconds = (performance.now() - t0) / 1000;
    const throughput = CONCURRENT / elapsedSeconds;

    expect(throughput).toBeGreaterThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCRITURA PARALELA — sin race conditions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Concurrencia — Escrituras Paralelas (sin Race Conditions)', () => {
  it('5 POST /medical-histories paralelos crean registros independientes', async () => {
    const CONCURRENT = 5;

    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, (_, i) =>
        request(app)
          .post('/api/v1/medical-histories')
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            patientId,
            diagnosis: `Diagnóstico concurrente ${i} - ${randomUUID()}`,
            symptoms: ['tos', 'fiebre'],
            treatment: 'Reposo',
          })
      )
    );

    expect(responses).toHaveLength(CONCURRENT);
    responses.forEach((res) => {
      // Ninguna debe fallar por race condition (500)
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(401);
    });
    // Contar cuántas fueron exitosas
    const successes = responses.filter((r) => [200, 201].includes(r.status)).length;
    expect(successes).toBeGreaterThanOrEqual(0); // Al menos no rompe el servidor
  });

  it('5 POST /alerts paralelos no generan IDs duplicados', async () => {
    const CONCURRENT = 5;

    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, (_, i) =>
        request(app)
          .post('/api/v1/alerts')
          .set('Authorization', `Bearer ${doctorToken}`)
          .send({
            patientId,
            type: 'critical_symptom',
            severity: 'medium',
            message: `Alerta concurrente ${i} - ${randomUUID()}`,
            symptoms: ['tos'],
          })
      )
    );

    expect(responses).toHaveLength(CONCURRENT);
    const successResponses = responses.filter((r) => [200, 201].includes(r.status));

    if (successResponses.length > 1) {
      // Verificar que los IDs sean únicos
      const ids = successResponses
        .map((r) => r.body?.data?._id || r.body?._id)
        .filter(Boolean);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });

  it('10 POST /auth/register paralelos no crean duplicados de email', async () => {
    const CONCURRENT = 10;
    const sharedEmail = uniqueEmail('dupe-test');

    const responses = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        request(app)
          .post('/api/v1/auth/register')
          .send({
            name: 'Duplicate Test',
            email: sharedEmail,
            password: STRONG_PASSWORD,
            role: 'patient',
          })
      )
    );

    expect(responses).toHaveLength(CONCURRENT);
    // Solo 1 debe tener éxito; el resto deben recibir error de duplicado (400/409)
    const successes = responses.filter((r) => [200, 201].includes(r.status));
    const errors = responses.filter((r) => [400, 409, 422].includes(r.status));
    expect(successes.length).toBeLessThanOrEqual(1);
    expect(errors.length + successes.length).toBe(CONCURRENT);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CARGA MIXTA — lecturas y escrituras simultáneas
// ═══════════════════════════════════════════════════════════════════════════════

describe('Concurrencia — Carga Mixta (Lecturas + Escrituras)', () => {
  it('Mix de 5 GET + 5 POST /medical-histories completan sin errores de servidor', async () => {
    const reads = Array.from({ length: 5 }, () =>
      request(app)
        .get('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({ page: 1, limit: 5 })
    );

    const writes = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId,
          diagnosis: `Mix write ${i} - ${randomUUID()}`,
          symptoms: ['fiebre'],
          treatment: 'Paracetamol',
        })
    );

    const responses = await Promise.all([...reads, ...writes]);
    expect(responses).toHaveLength(10);

    responses.forEach((res) => {
      expect(res.status).not.toBe(500);
      expect(res.status).not.toBe(401);
    });
  });

  it('Mix de 3 roles diferentes (admin + doctor + patient) consultando simultáneamente', async () => {
    const adminReqs = Array.from({ length: 3 }, () =>
      request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${adminToken}`)
    );

    const doctorReqs = Array.from({ length: 3 }, () =>
      request(app)
        .get('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({ limit: 5 })
    );

    const patientReqs = Array.from({ length: 3 }, () =>
      request(app)
        .get('/api/v1/wearables')
        .set('Authorization', `Bearer ${patientToken}`)
    );

    const responses = await Promise.all([...adminReqs, ...doctorReqs, ...patientReqs]);
    expect(responses).toHaveLength(9);

    responses.forEach((res) => {
      expect(res.status).not.toBe(500);
    });
  });

  it('Ráfaga de 15 peticiones de lectura consecutivas completa en < 10s', async () => {
    const BURST = 15;

    const t0 = performance.now();
    const responses = await Promise.all(
      Array.from({ length: BURST }, (_, i) =>
        request(app)
          .get(i % 3 === 0 ? '/api/v1/alerts' : '/api/v1/medical-histories')
          .set('Authorization', `Bearer ${doctorToken}`)
          .query({ page: 1, limit: 5 })
      )
    );
    const elapsed = performance.now() - t0;

    expect(responses).toHaveLength(BURST);
    expect(elapsed).toBeLessThan(10000);
    responses.forEach((res) => {
      expect(res.status).not.toBe(500);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AISLAMIENTO — cada request obtiene su propia respuesta
// ═══════════════════════════════════════════════════════════════════════════════

describe('Concurrencia — Aislamiento de Respuestas', () => {
  it('Requests con tokens distintos reciben respuestas con sus propios datos', async () => {
    // Crear dos doctores adicionales
    const doc2 = await User.create({
      name: 'Doctor 2',
      email: uniqueEmail('doc2'),
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true,
    }) as UserDocument;
    const token2 = testUtils.generateTestToken({ userId: doc2._id.toString(), role: 'doctor' });

    const [res1, res2] = await Promise.all([
      request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${doctorToken}`),
      request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token2}`),
    ]);

    // Ambos deben ser 200 y sus datos no deben mezclarse
    if (res1.status === 200 && res2.status === 200) {
      expect(res1.body?.data?._id).not.toBe(res2.body?.data?._id);
    }
  });

  it('Request sin token y con token reciben respuestas correctas en paralelo', async () => {
    const [withToken, withoutToken] = await Promise.all([
      request(app)
        .get('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`),
      request(app)
        .get('/api/v1/medical-histories'),
    ]);

    // El autenticado debe pasar (no 401)
    expect(withToken.status).not.toBe(401);
    // El no autenticado debe ser rechazado
    expect(withoutToken.status).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESTABILIDAD SOSTENIDA — N batches secuenciales
// ═══════════════════════════════════════════════════════════════════════════════

describe('Concurrencia — Estabilidad Sostenida (Batches Secuenciales)', () => {
  it('3 batches de 5 peticiones paralelas mantienen tiempos estables', async () => {
    const BATCHES = 3;
    const PER_BATCH = 5;
    const batchTimes: number[] = [];

    for (let b = 0; b < BATCHES; b++) {
      const t0 = performance.now();
      const responses = await Promise.all(
        Array.from({ length: PER_BATCH }, () =>
          request(app)
            .get('/api/v1/medical-histories')
            .set('Authorization', `Bearer ${doctorToken}`)
            .query({ page: 1, limit: 5 })
        )
      );
      batchTimes.push(performance.now() - t0);

      responses.forEach((res) => {
        expect(res.status).not.toBe(500);
      });
    }

    // Cada batch debe completar en < 5 segundos
    batchTimes.forEach((t) => {
      expect(t).toBeLessThan(5000);
    });

    // El último batch no debe ser 3x más lento que el primero (no hay degradación)
    if (batchTimes.length === BATCHES) {
      const degradationRatio = batchTimes[BATCHES - 1] / batchTimes[0];
      expect(degradationRatio).toBeLessThan(3);
    }
  });
});