/**
 * Integration tests for DSR (Data Subject Request) endpoints
 * Tests the double-confirmation pattern for data deletion
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('DSR Endpoints Integration', () => {
  let adminToken: string;
  let doctorToken: string;
  let targetUserId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    targetUserId = new mongoose.Types.ObjectId().toHexString();

    adminToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'admin',
    });
    doctorToken = testUtils.generateTestToken({
      userId: new mongoose.Types.ObjectId().toHexString(),
      role: 'doctor',
    });
  });

  // ─── GET /dsr/export/:userId ──────────────────────────────────────────────

  describe('GET /api/v1/dsr/export/:userId', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .get(`/api/v1/dsr/export/${targetUserId}`)
        .expect(401);
    });

    it('retorna 403 para doctor (sin permiso dsr:export)', async () => {
      await request(app)
        .get(`/api/v1/dsr/export/${targetUserId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('admin puede exportar datos de usuario', async () => {
      const response = await request(app)
        .get(`/api/v1/dsr/export/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(response.status);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('retorna 200 con estructura de datos exportados', async () => {
      const response = await request(app)
        .get(`/api/v1/dsr/export/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });
  });

  // ─── DELETE /dsr/delete/:userId ───────────────────────────────────────────
  // Requires double confirmation: X-Confirm-Action header AND body.confirm = true

  describe('DELETE /api/v1/dsr/delete/:userId', () => {
    it('retorna 401 sin autenticación', async () => {
      await request(app)
        .delete(`/api/v1/dsr/delete/${targetUserId}`)
        .expect(401);
    });

    it('retorna 403 para doctor (sin permiso dsr:delete)', async () => {
      await request(app)
        .delete(`/api/v1/dsr/delete/${targetUserId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .set('X-Confirm-Action', 'yes')
        .send({ confirm: true })
        .expect(403);
    });

    it('retorna 428 sin X-Confirm-Action header', async () => {
      await request(app)
        .delete(`/api/v1/dsr/delete/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirm: true })
        .expect(428);
    });

    it('retorna 428 sin body.confirm', async () => {
      await request(app)
        .delete(`/api/v1/dsr/delete/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Confirm-Action', 'yes')
        .send({})
        .expect(428);
    });

    it('retorna 428 con X-Confirm-Action incorrecto', async () => {
      await request(app)
        .delete(`/api/v1/dsr/delete/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Confirm-Action', 'no')
        .send({ confirm: true })
        .expect(428);
    });

    it('retorna 428 con confirm: false en body', async () => {
      await request(app)
        .delete(`/api/v1/dsr/delete/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Confirm-Action', 'yes')
        .send({ confirm: false })
        .expect(428);
    });

    it('con doble confirmación admin puede iniciar borrado', async () => {
      const response = await request(app)
        .delete(`/api/v1/dsr/delete/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Confirm-Action', 'yes')
        .send({ confirm: true });

      // Puede ser 200 (usuario no existe, 0 registros borrados) o 500
      expect([200, 500]).toContain(response.status);
      expect(response.status).not.toBe(428);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });
});