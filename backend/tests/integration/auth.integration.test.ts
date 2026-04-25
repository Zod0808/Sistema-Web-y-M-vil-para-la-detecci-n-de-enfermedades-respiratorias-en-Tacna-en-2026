import request from 'supertest';
import jwt from 'jsonwebtoken';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import User, { UserDocument } from '../../src/models/User';

const app = appInstance.app;

describe('Auth Controller Integration', () => {
  const basePassword = 'Password123!';

  let patient: UserDocument;
  let patientToken: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    patient = await User.create({
      name: 'Integration Patient',
      email: 'integration-patient@test.com',
      password: basePassword,
      role: 'patient',
      isActive: true,
      isEmailVerified: true
    }) as UserDocument;

    patientToken = testUtils.generateTestToken({
      userId: patient._id.toString(),
      role: 'patient',
      email: patient.email
    });
  });

  describe('Login & Refresh token', () => {
    it('permite iniciar sesión y refrescar tokens válidos', async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: patient.email,
          password: basePassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.refreshToken).toBeDefined();

      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: loginResponse.body.data.refreshToken })
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.token).toBeDefined();
      expect(refreshResponse.body.data.refreshToken).toBeDefined();
    });

    it('rechaza login con contraseña incorrecta y refresh token expirado', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: patient.email,
          password: 'WrongPassword!123'
        })
        .expect(401);

      const expiredRefreshToken = jwt.sign(
        { userId: patient._id.toString() },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '-1s' }
      );

      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: expiredRefreshToken })
        .expect(401);

      expect(refreshResponse.body.success).toBe(false);
      expect(refreshResponse.body.message).toContain('Refresh token inválido');
    });
  });

  describe('Gestión del perfil y contraseñas', () => {
    it('actualiza contraseña y evita login cuando la cuenta se desactiva', async () => {
      const changePasswordResponse = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          currentPassword: basePassword,
          newPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(changePasswordResponse.body.success).toBe(true);

      const loginWithNewPassword = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: patient.email,
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(loginWithNewPassword.body.success).toBe(true);

      await request(app)
        .put('/api/v1/auth/deactivate')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: patient.email,
          password: 'NewPassword123!'
        })
        .expect(401);
    });
  });

  describe('Rutas protegidas y roles', () => {
    it('valida acceso a rutas de administrador', async () => {
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin-integration@test.com',
        password: basePassword,
        role: 'admin',
        isActive: true,
        isEmailVerified: true
      }) as UserDocument;

      const adminToken = testUtils.generateTestToken({
        userId: admin._id.toString(),
        role: 'admin',
        email: admin.email
      });

      const statsResponse = await request(app)
        .get('/api/v1/auth/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);

      await request(app)
        .get('/api/v1/auth/stats')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      await request(app)
        .get('/api/v1/auth/users')
        .expect(401);

      const usersResponse = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body.success).toBe(true);
      expect(Array.isArray(usersResponse.body.data)).toBe(true);
    });
  });
});


