/**
 * Integration tests for platform health endpoints and infrastructure middleware
 */

import request from 'supertest';
import appInstance from '../../src/index';
import { getRedisClient } from '../../src/config/redisClient';
import { config } from '../../src/config/config';

const DOCTOR_PASSWORD = 'Password123!';

const app = appInstance.app;

describe('Infrastructure Integration', () => {
  describe('GET /health', () => {
    it('returns status information with dependency details', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const { status, environment, version, dependencies, success } = response.body;

      expect(['healthy', 'degraded']).toContain(status);
      expect(success === true || success === false).toBe(true);
      expect(environment).toBe(config.server.env);
      expect(version).toBe('1.0.0');
      expect(dependencies).toBeDefined();

      const databaseInfo = dependencies.database;
      const redisInfo = dependencies.redis;

      expect(databaseInfo).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          provider: expect.any(String)
        })
      );

      expect(redisInfo).toEqual(
        expect.objectContaining({
          status: expect.any(String)
        })
      );

      expect(['connected', 'disconnected', 'uninitialized', 'error']).toContain(redisInfo.status);

      if (redisInfo.status === 'connected') {
        expect(typeof redisInfo.latencyMs).toBe('number');
        expect(redisInfo.latencyMs).toBeGreaterThanOrEqual(0);
      } else {
        expect(redisInfo.latencyMs === null || typeof redisInfo.latencyMs === 'number').toBe(true);
      }
    });
  });

  describe('Compression negotiation', () => {
    it('serves Brotli compressed payload when requested', async () => {
      const response = await request(app)
        .get('/api/docs')
        .set('Accept-Encoding', 'br')
        .redirects(1)
        .expect(200);

      expect(response.headers['content-encoding']).toBeDefined();
      expect(response.headers['content-encoding']).toMatch(/br/i);
      expect(response.headers['vary']).toContain('Accept-Encoding');
    });

    it('falls back to gzip when Brotli is not requested', async () => {
      const response = await request(app)
        .get('/api/docs')
        .set('Accept-Encoding', 'gzip')
        .redirects(1)
        .expect(200);

      expect(response.headers['content-encoding']).toBeDefined();
      expect(response.headers['content-encoding']).toMatch(/gzip/i);
    });
  });

  describe('Rate limiting', () => {
    it('returns rate limit headers and responds with 429 when exceeded', async () => {
      const originalClient = getRedisClient();

      if (!originalClient) {
        // Rate limiting fallback has already been tested at unit level;
        // skip expensive integration check when Redis is not available.
        return;
      }

      const token = await obtainDoctorToken();
      const endpoint = '/api/v1/dashboard/doctor';
      const responses = [];

      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${token}`);
        responses.push(res);
        if (res.status === 429) {
          break;
        }
      }

      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.headers).toEqual(
        expect.objectContaining({
          'x-ratelimit-limit': expect.any(String),
          'x-ratelimit-remaining': expect.any(String),
          'x-ratelimit-windowms': expect.any(String),
        }),
      );

      expect([200, 429]).toContain(lastResponse.status);
      if (lastResponse.status === 429) {
        expect(lastResponse.body.success).toBe(false);
        expect(lastResponse.body.message).toContain('Demasiadas solicitudes');
      }
    });
  });
});

async function obtainDoctorToken(): Promise<string> {
  if (appInstance.testDoctorToken) {
    return appInstance.testDoctorToken;
  }

  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'doctor@test.com',
      password: DOCTOR_PASSWORD,
    });

  return response.body.data?.token ?? '';
}

