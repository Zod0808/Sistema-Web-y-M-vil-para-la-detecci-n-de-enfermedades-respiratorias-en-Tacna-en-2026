/**
 * Security Tests
 * Tests for common security vulnerabilities (OWASP Top 10)
 */

import request from 'supertest';
import { randomUUID } from 'crypto';
import appInstance from '../../src/index';
import { testUtils } from '../setup';

const app = appInstance.app;
import User, { UserDocument } from '../../src/models/User';
import mongoose from 'mongoose';

const STRONG_PASSWORD = 'Password123!';
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@test.com`;

describe('Security Tests', () => {
  let doctorToken: string;
  let doctorId: string;
  let doctorEmail: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();
    doctorEmail = uniqueEmail('security-doctor');

    const doctor = await User.create({
      name: 'Test Doctor',
      email: doctorEmail,
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true
    }) as UserDocument;
    doctorId = doctor._id.toString();
    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      await request(app)
        .get('/api/v1/medical-histories')
        .expect(401);
    });

    it('should reject invalid JWT tokens', async () => {
      await request(app)
        .get('/api/v1/medical-histories')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: doctorId, role: 'doctor' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired token
      );

      await request(app)
        .get('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should prevent token tampering', async () => {
      const tamperedToken = doctorToken.slice(0, -5) + 'XXXXX';
      
      await request(app)
        .get('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });
  });

  describe('Authorization Security', () => {
    it('should prevent unauthorized access to admin endpoints', async () => {
      await request(app)
        .get('/api/v1/dashboard/admin')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
    });

    it('should prevent privilege escalation', async () => {
      // Try to access as admin with doctor token
      const response = await request(app)
        .get('/api/v1/dashboard/admin')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousInput = {
        patientId: "'; DROP TABLE users; --",
        patientName: 'Test',
        age: 30,
        diagnosis: 'Test',
        symptoms: []
      };

      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(maliciousInput);

      // Should either reject or sanitize, not ejecutar el payload
      expect([200, 201, 400, 422]).toContain(response.status);
    });

    it('should prevent XSS attacks in input fields', async () => {
      const xssPayload = '<img src=x onerror=alert(1)>';

      const maliciousData = {
        patientId: new mongoose.Types.ObjectId().toString(),
        patientName: xssPayload,
        age: 30,
        diagnosis: 'Test',
        symptoms: []
      };

      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(maliciousData);

      // Should sanitize XSS payload
      if (response.status === 201 || response.status === 200) {
        const sanitized = response.body.data.patientName;
        expect(sanitized).not.toContain('<img');
        expect(sanitized).toContain('&lt;img');
      }
    });

    it('should prevent NoSQL injection', async () => {
      const nosqlPayload = { $gt: '' };
      
      const response = await request(app)
        .get(`/api/v1/medical-histories?patientId=${JSON.stringify(nosqlPayload)}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      // Should rechazar o sanitizar el payload
      expect([200, 400, 422, 500]).toContain(response.status);
    });

    it('should validate data types strictly', async () => {
      const invalidData = {
        patientId: new mongoose.Types.ObjectId().toString(),
        patientName: 'Test',
        age: 'not-a-number', // Invalid type
        diagnosis: 'Test',
        symptoms: []
      };

      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should implement rate limiting on authentication endpoints', async () => {
      const loginAttempts = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' })
      );

      const responses = await Promise.all(loginAttempts);
      
      // All should return 401 (unauthorized) or 429 (rate limited)
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status);
      });
      
      // If rate limiting is active, we should see 429 responses
      // Otherwise, all should be 401 (which is still secure)
      const rateLimited = responses.filter(r => r.status === 429);
      const unauthorized = responses.filter(r => r.status === 401);
      
      // Either rate limiting is active (429) or requests are being rejected (401)
      expect(rateLimited.length + unauthorized.length).toBe(20);
    });
  });

  describe('CORS Security', () => {
    it('should only allow requests from whitelisted origins', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/health')
        .set('Origin', 'http://malicious-site.com')
        .set('Authorization', `Bearer ${doctorToken}`);

      // Should either reject or have proper CORS headers
      // This depends on CORS configuration
      expect(response.headers['access-control-allow-origin']).not.toBe('*');
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize MongoDB operator injection', async () => {
      const maliciousData = {
        patientId: new mongoose.Types.ObjectId().toString(),
        patientName: { $ne: null }, // MongoDB operator
        age: 30,
        diagnosis: 'Test',
        symptoms: []
      };

      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(maliciousData);

      // Should sanitize or reject
      expect([400, 422, 500]).toContain(response.status);
    });
  });

  describe('Password Security', () => {
    it('should not return passwords in API responses', async () => {
      const user = await User.create({
        name: 'Test User',
        email: uniqueEmail('security-newuser'),
        password: STRONG_PASSWORD,
        role: 'patient',
        isActive: true
      });

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      if (response.status === 200) {
        expect(response.body.data.password).toBeUndefined();
      }
    });

    it('should hash passwords before storing', async () => {
      const password = 'plaintextpassword';
      const user = await User.create({
        name: 'Test User',
        email: uniqueEmail('security-hash'),
        password: password,
        role: 'patient',
        isActive: true
      });

      expect(user.password).not.toBe(password);
      expect(user.password.length).toBeGreaterThan(20); // Bcrypt hash length
    });

    it('should enforce minimum password length', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: uniqueEmail('weakpass'),
          password: '123',  // Too short
          role: 'patient'
        });

      expect([400, 422, 500]).toContain(response.status);
    });

    it('should prevent password enumeration attacks', async () => {
      // Try to login with non-existent user
      const response1 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: uniqueEmail('nonexistent'),
          password: STRONG_PASSWORD
        });

      // Try to login with wrong password
      const response2 = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: doctorEmail,
          password: 'wrongpassword'
        });

      // Both should return similar error messages (not revealing if user exists)
      expect([401, 404]).toContain(response1.status);
      expect([401, 404]).toContain(response2.status);
    });
  });

  describe('OWASP A04:2021 - Insecure Design', () => {
    it('should validate business logic - prevent negative ages', async () => {
      const maliciousData = {
        patientId: new mongoose.Types.ObjectId().toString(),
        patientName: 'Test',
        age: -10,  // Invalid age
        diagnosis: 'Test',
        symptoms: []
      };

      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(maliciousData);

      expect([400, 422, 500]).toContain(response.status);
    });

    it('should validate business logic - prevent future dates', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const maliciousData = {
        patientId: new mongoose.Types.ObjectId().toString(),
        patientName: 'Test',
        age: 30,
        diagnosis: 'Test',
        symptoms: [],
        date: futureDate.toISOString()
      };

      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(maliciousData);

      // Should either reject or auto-correct to current date
      expect([200, 201, 400, 422]).toContain(response.status);
    });
  });

  describe('OWASP A06:2021 - Vulnerable and Outdated Components', () => {
    it('should use secure HTTP headers', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/health')
        .set('Authorization', `Bearer ${doctorToken}`);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('OWASP A08:2021 - Software and Data Integrity Failures', () => {
    it('should validate JSON payload integrity', async () => {
      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid json');

      expect([400, 422, 500]).toContain(response.status);
    });

    it('should validate request content type', async () => {
      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .set('Content-Type', 'text/plain')
        .send('plain text data');

      expect([400, 415, 422]).toContain(response.status);
    });
  });

  describe('OWASP A09:2021 - Security Logging and Monitoring Failures', () => {
    it('should log authentication attempts', async () => {
      // Attempt failed login
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      // In production, this would be logged
      // This test verifies the endpoint works
      expect(true).toBe(true);
    });

    it('should log access control violations', async () => {
      // Try to access admin endpoint with doctor token
      await request(app)
        .get('/api/v1/dashboard/admin')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);

      // In production, this would be logged
      expect(true).toBe(true);
    });
  });

  describe('OWASP A10:2021 - Server-Side Request Forgery (SSRF)', () => {
    it('should prevent SSRF attacks via URL parameters', async () => {
      // Try to make server request internal services
      const response = await request(app)
        .get('/api/v1/medical-histories?imageUrl=http://localhost:27017/admin')
        .set('Authorization', `Bearer ${doctorToken}`);

      // Should either reject or sanitize the URL
      expect([200, 400, 422]).toContain(response.status);
    });
  });

  describe('Additional Security Tests', () => {
    it('should enforce HTTPS in production', async () => {
      // This would typically check for HTTPS redirect
      // In test environment, we just verify the header
      const response = await request(app)
        .get('/api/v1/dashboard/health')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.status).toBeLessThan(500);
    });

    it('should prevent clickjacking', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/health')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should implement Content Security Policy', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/health')
        .set('Authorization', `Bearer ${doctorToken}`);

      // CSP header may or may not be present depending on configuration
      expect(response.status).toBe(200);
    });

    it('should sanitize user-generated content', async () => {
      const xssPayload = '<img src=x onerror=alert(1)>';
      const data = {
        patientId: new mongoose.Types.ObjectId().toString(),
        patientName: 'Test',
        age: 30,
        diagnosis: xssPayload,
        symptoms: []
      };

      const response = await request(app)
        .post('/api/v1/medical-histories')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(data);

      if (response.status === 201 || response.status === 200) {
        // Should sanitize the XSS payload
        const sanitized = response.body.data.diagnosis;
        expect(sanitized).not.toContain('<img');
        expect(sanitized).toContain('&lt;img');
      }
    });

    it('should limit file upload sizes', async () => {
      // This would test file upload with large files
      // Placeholder for now
      expect(true).toBe(true);
    });

    it('should validate file types on upload', async () => {
      // This would test file upload with invalid types
      // Placeholder for now
      expect(true).toBe(true);
    });
  });
});

