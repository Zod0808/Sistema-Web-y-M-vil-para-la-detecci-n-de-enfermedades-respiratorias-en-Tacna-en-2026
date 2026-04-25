/**
 * Unit tests for Authentication Controller
 */

import request from 'supertest';
import appInstance from '../../../src/index';

const app = appInstance.app;
import { testUtils } from '../../setup';
import User, { UserDocument } from '../../../src/models/User';
import jwt from 'jsonwebtoken';

describe('Auth Controller', () => {
  beforeEach(async () => {
    await testUtils.cleanTestData();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = testUtils.generateTestUser({
        email: 'register-success@test.com'
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
      expect(response.body.data.token).toBeDefined();
    });

    it('should not register user with existing email', async () => {
      const userData = testUtils.generateTestUser({
        email: 'duplicate@test.com'
      });
      
      // Create first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to create user with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('El usuario ya existe con este email');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Datos de entrada inválidos');
    });

    it('should validate email format', async () => {
      const userData = testUtils.generateTestUser({ email: 'invalid-email' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should validate password strength', async () => {
      const userData = testUtils.generateTestUser({ password: 'weakpass' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('La contraseña debe');
    });

    it('should return 500 when JWT secrets are missing', async () => {
      const originalJwtSecret = process.env.JWT_SECRET;
      const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;

      const userData = testUtils.generateTestUser({
        email: 'missing-secret@test.com'
      });

      try {
        delete process.env.JWT_SECRET;
        delete process.env.JWT_REFRESH_SECRET;

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(500);

        expect(response.body.success).toBe(false);
      } finally {
        process.env.JWT_SECRET = originalJwtSecret;
        process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
      }
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const userData = testUtils.generateTestUser({
        email: 'login@test.com'
      });
      
      await User.create({
        ...userData,
        isEmailVerified: true
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should not login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Credenciales inválidas');
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Credenciales inválidas');
    });

    it('should block login for inactive accounts', async () => {
      const userData = testUtils.generateTestUser({ email: 'inactive@example.com' });

      await User.create({
        ...userData,
        isActive: false
      });

      const loginData = {
        email: 'inactive@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('La cuenta está desactivada');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Datos de entrada inválidos');
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const userData = testUtils.generateTestUser();
      const user = await User.create({
        ...userData,
        isEmailVerified: true
      });

      userId = user._id.toString();

      // Generate refresh token using JWT_REFRESH_SECRET
      refreshToken = jwt.sign(
        { userId: userId },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '30d' }
      );
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should not refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Refresh token inválido');
    });

    it('should not refresh with expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '-1s' }
      );

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Refresh token inválido');
    });

    it('should not refresh when user is inactive', async () => {
      await User.updateOne({ _id: userId }, { isActive: false });

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Refresh token inválido');
    });

    it('should return 401 when user no longer exists', async () => {
      await User.deleteOne({ _id: userId });

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Refresh token inválido');
    });

    it('should require refresh token in body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 if signing secret is missing during refresh', async () => {
      const originalJwtSecret = process.env.JWT_SECRET;
      const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;

      try {
        delete process.env.JWT_SECRET;
        delete process.env.JWT_REFRESH_SECRET;

        const response = await request(app)
          .post('/api/v1/auth/refresh-token')
          .send({ refreshToken })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Refresh token inválido');
      } finally {
        process.env.JWT_SECRET = originalJwtSecret;
        process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
      }
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const userData = testUtils.generateTestUser();
      
      const createdUser = await User.create({
        ...userData,
        isEmailVerified: true
      });

      authToken = testUtils.generateTestToken({
        userId: createdUser._id.toString(),
        role: createdUser.role,
        email: createdUser.email
      });
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Sesión cerrada');
    });

    it('should not logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
    });

    it('should not logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token inválido');
    });
  });



  describe('POST /api/v1/auth/logout', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'logout@test.com',
        password: 'Password123!',
        role: 'patient',
        isActive: true
      }) as UserDocument;
      userId = user._id.toString();
      userToken = testUtils.generateTestToken({ userId, role: 'patient', email: user.email });
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Sesión cerrada');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'profile@test.com',
        password: 'password123',
        role: 'patient',
        isActive: true
      }) as UserDocument;
      userId = user._id.toString();
      userToken = testUtils.generateTestToken({ userId, role: 'patient' });
    });

    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('profile@test.com');
      expect(response.body.data.password).toBeUndefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should return 401 when user no longer exists', async () => {
      await User.deleteOne({ _id: userId });

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token inválido - Usuario no encontrado');
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'update@test.com',
        password: 'password123',
        role: 'patient',
        isActive: true
      }) as UserDocument;
      userId = user._id.toString();
      userToken = testUtils.generateTestToken({ userId, role: 'patient' });
    });

    it('should update profile successfully', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v1/auth/profile')
        .send({ name: 'Updated Name' })
        .expect(401);
    });

    it('should return 401 when trying to update a missing user', async () => {
      await User.deleteOne({ _id: userId });

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Another Name' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token inválido - Usuario no encontrado');
    });
  });

  describe('PUT /api/v1/auth/change-password', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'password@test.com',
        password: 'oldpassword123',
        role: 'patient',
        isActive: true
      }) as UserDocument;
      userId = user._id.toString();
      userToken = testUtils.generateTestToken({ userId, role: 'patient' });
    });

    it('should change password successfully', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Contraseña cambiada');

      const updatedUser = await User.findById(userId).select('+password');
      expect(updatedUser).toBeTruthy();
      const matchesNewPassword = await updatedUser!.comparePassword('NewPassword123!');
      expect(matchesNewPassword).toBe(true);
    });

    it('should reject change password with incorrect current password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v1/auth/change-password')
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'NewPassword123!'
        })
        .expect(401);
    });

    it('should return 401 when user does not exist', async () => {
      await User.deleteOne({ _id: userId });

      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'NewPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token inválido - Usuario no encontrado');
    });
  });

  describe('PUT /api/v1/auth/deactivate', () => {
    let userToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'deactivate@test.com',
        password: 'password123',
        role: 'patient',
        isActive: true
      }) as UserDocument;
      userId = user._id.toString();
      userToken = testUtils.generateTestToken({ userId, role: 'patient' });
    });

    it('should deactivate account successfully', async () => {
      const response = await request(app)
        .put('/api/v1/auth/deactivate')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cuenta desactivada');

      // Verify user is deactivated
      const user = await User.findById(userId);
      expect(user?.isActive).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/v1/auth/deactivate')
        .expect(401);
    });

    it('should return 401 if the account was already removed', async () => {
      await User.deleteOne({ _id: userId });

      const response = await request(app)
        .put('/api/v1/auth/deactivate')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token inválido - Usuario no encontrado');
    });
  });

  describe('GET /api/v1/auth/stats', () => {
    let adminToken: string;

    beforeEach(async () => {
      const admin = await User.create({
        name: 'Test Admin',
        email: 'adminstats@test.com',
        password: 'password123',
        role: 'admin',
        isActive: true
      }) as UserDocument;
      adminToken = testUtils.generateTestToken({ userId: admin._id.toString(), role: 'admin' });
    });

    it('should get user stats (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/auth/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/auth/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
    });

    it('should reject access from non-admin users', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'user@test.com',
        password: 'password123',
        role: 'patient',
        isActive: true
      }) as UserDocument;
      const userToken = testUtils.generateTestToken({ userId: user._id.toString(), role: 'patient' });

      await request(app)
        .get('/api/v1/auth/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/auth/users', () => {
    let adminToken: string;

    beforeEach(async () => {
      const admin = await User.create({
        name: 'Test Admin',
        email: 'adminusers@test.com',
        password: 'password123',
        role: 'admin',
        isActive: true
      }) as UserDocument;
      adminToken = testUtils.generateTestToken({ userId: admin._id.toString(), role: 'admin' });
    });

    it('should get users list (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/auth/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should reject access from non-admin users', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'user2@test.com',
        password: 'password123',
        role: 'patient',
        isActive: true
      }) as UserDocument;
      const userToken = testUtils.generateTestToken({ userId: user._id.toString(), role: 'patient' });

      await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/auth/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Token de acceso requerido');
    });
  });
});
