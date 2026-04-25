/**
 * Tests for API Base Utilities
 */

import { BACKEND_BASE_URL, API_BASE, AI_BASE_URL, LEGACY_API_BASE } from '../apiBase';

// Mock environment variables
const originalEnv = process.env;

describe('API Base Utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REACT_APP_BACKEND_URL;
    delete process.env.REACT_APP_API_URL;
    delete process.env.REACT_APP_AI_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('BACKEND_BASE_URL', () => {
    it('should default to localhost:3001', () => {
      expect(BACKEND_BASE_URL).toBe('http://localhost:3001');
    });

    it('should use REACT_APP_BACKEND_URL if set', () => {
      process.env.REACT_APP_BACKEND_URL = 'http://example.com';
      jest.resetModules();
      const { BACKEND_BASE_URL } = require('../apiBase');
      expect(BACKEND_BASE_URL).toBe('http://example.com');
    });

    it('should use REACT_APP_API_URL if REACT_APP_BACKEND_URL is not set', () => {
      process.env.REACT_APP_API_URL = 'http://api.example.com';
      jest.resetModules();
      const { BACKEND_BASE_URL } = require('../apiBase');
      expect(BACKEND_BASE_URL).toBe('http://api.example.com');
    });

    it('should remove trailing slash', () => {
      process.env.REACT_APP_BACKEND_URL = 'http://example.com/';
      jest.resetModules();
      const { BACKEND_BASE_URL } = require('../apiBase');
      expect(BACKEND_BASE_URL).toBe('http://example.com');
    });
  });

  describe('API_BASE', () => {
    it('should default to localhost:3001/api/v1', () => {
      expect(API_BASE).toBe('http://localhost:3001/api/v1');
    });

    it('should append /api/v1 if backend URL does not include /api', () => {
      process.env.REACT_APP_BACKEND_URL = 'http://example.com';
      jest.resetModules();
      const { API_BASE } = require('../apiBase');
      expect(API_BASE).toBe('http://example.com/api/v1');
    });

    it('should append /v1 if backend URL ends with /api', () => {
      process.env.REACT_APP_BACKEND_URL = 'http://example.com/api';
      jest.resetModules();
      const { API_BASE } = require('../apiBase');
      expect(API_BASE).toBe('http://example.com/api/v1');
    });

    it('should not modify if backend URL already includes /api/v1', () => {
      process.env.REACT_APP_BACKEND_URL = 'http://example.com/api/v1';
      jest.resetModules();
      const { API_BASE } = require('../apiBase');
      expect(API_BASE).toBe('http://example.com/api/v1');
    });
  });

  describe('AI_BASE_URL', () => {
    it('should default to localhost:8000/api/v1', () => {
      expect(AI_BASE_URL).toBe('http://localhost:8000/api/v1');
    });

    it('should use REACT_APP_AI_URL if set', () => {
      process.env.REACT_APP_AI_URL = 'http://ai.example.com';
      jest.resetModules();
      const { AI_BASE_URL } = require('../apiBase');
      expect(AI_BASE_URL).toBe('http://ai.example.com/api/v1');
    });

    it('should append /api/v1 if AI URL does not include /api', () => {
      process.env.REACT_APP_AI_URL = 'http://ai.example.com';
      jest.resetModules();
      const { AI_BASE_URL } = require('../apiBase');
      expect(AI_BASE_URL).toBe('http://ai.example.com/api/v1');
    });

    it('should not modify if AI URL already includes /api/v1', () => {
      process.env.REACT_APP_AI_URL = 'http://ai.example.com/api/v1';
      jest.resetModules();
      const { AI_BASE_URL } = require('../apiBase');
      expect(AI_BASE_URL).toBe('http://ai.example.com/api/v1');
    });
  });

  describe('LEGACY_API_BASE', () => {
    it('should append /api to BACKEND_BASE_URL', () => {
      expect(LEGACY_API_BASE).toBe('http://localhost:3001/api');
    });
  });

  describe('Browser URL rewriting', () => {
    beforeEach(() => {
      // Mock window.location
      delete window.location;
      window.location = {
        hostname: 'localhost'
      };
    });

    it('should rewrite container hostnames to localhost in browser', () => {
      process.env.REACT_APP_BACKEND_URL = 'http://backend:3001';
      jest.resetModules();
      const { BACKEND_BASE_URL } = require('../apiBase');
      
      // In browser environment, should rewrite to localhost
      if (typeof window !== 'undefined') {
        expect(BACKEND_BASE_URL).toBe('http://localhost:3001');
      }
    });

    it('should not rewrite non-container hostnames', () => {
      process.env.REACT_APP_BACKEND_URL = 'http://example.com:3001';
      jest.resetModules();
      const { BACKEND_BASE_URL } = require('../apiBase');
      expect(BACKEND_BASE_URL).toBe('http://example.com:3001');
    });
  });
});

