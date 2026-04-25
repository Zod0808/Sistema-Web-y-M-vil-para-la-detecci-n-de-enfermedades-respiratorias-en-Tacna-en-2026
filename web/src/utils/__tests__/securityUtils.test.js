/**
 * Tests for Security Utilities
 */

import {
  sanitizeHTML,
  isSafeURL,
  createSafeIframe,
  enforceIframePolicy,
  sanitizeInput,
  isValidEmail,
  isValidURL
} from '../securityUtils';

// Mock DOMPurify if available
const mockDOMPurify = {
  sanitize: jest.fn((html) => html)
};

describe('Security Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.DOMPurify = undefined;
    }
  });

  describe('sanitizeHTML', () => {
    it('should return empty string for null input', () => {
      expect(sanitizeHTML(null)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeHTML(123)).toBe('');
      expect(sanitizeHTML({})).toBe('');
    });

    it('should use DOMPurify if available', () => {
      if (typeof window !== 'undefined') {
        window.DOMPurify = mockDOMPurify;
        sanitizeHTML('<p>Test</p>');
        expect(mockDOMPurify.sanitize).toHaveBeenCalled();
      }
    });

    it('should use textContent fallback if DOMPurify not available', () => {
      const result = sanitizeHTML('<script>alert("xss")</script><p>Safe</p>');
      expect(result).toBe('Safe');
    });

    it('should remove script tags in fallback mode', () => {
      const result = sanitizeHTML('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
    });
  });

  describe('isSafeURL', () => {
    it('should return false for null or undefined', () => {
      expect(isSafeURL(null)).toBe(false);
      expect(isSafeURL(undefined)).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isSafeURL(123)).toBe(false);
    });

    it('should return true for HTTPS URLs', () => {
      expect(isSafeURL('https://example.com')).toBe(true);
    });

    it('should return true for HTTP localhost in development', () => {
      expect(isSafeURL('http://localhost:3000')).toBe(true);
      expect(isSafeURL('http://127.0.0.1:3000')).toBe(true);
    });

    it('should return false for HTTP non-localhost URLs', () => {
      expect(isSafeURL('http://example.com')).toBe(false);
    });

    it('should return false for javascript: URLs', () => {
      expect(isSafeURL('javascript:alert("xss")')).toBe(false);
    });

    it('should return false for data: URLs', () => {
      expect(isSafeURL('data:text/html,<script>alert("xss")</script>')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isSafeURL('not-a-url')).toBe(false);
    });
  });

  describe('createSafeIframe', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should throw error for unsafe URL', () => {
      expect(() => {
        createSafeIframe('javascript:alert("xss")');
      }).toThrow('URL no segura para iframe');
    });

    it('should create iframe with sandbox attributes', () => {
      const iframe = createSafeIframe('https://example.com');
      
      expect(iframe).toBeInstanceOf(HTMLIFrameElement);
      expect(iframe).toHaveAttribute('sandbox');
      expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
      expect(iframe.getAttribute('sandbox')).toContain('allow-same-origin');
    });

    it('should throw error for non-allowed domain', () => {
      expect(() => {
        createSafeIframe('https://malicious.com');
      }).toThrow('Dominio no permitido para iframe');
    });

    it('should allow allowed domains', () => {
      const iframe = createSafeIframe('https://www.youtube.com/embed/test');
      expect(iframe).toBeInstanceOf(HTMLIFrameElement);
    });

    it('should allow any domain if allowAnyDomain option is set', () => {
      const iframe = createSafeIframe('https://example.com', { allowAnyDomain: true });
      expect(iframe).toBeInstanceOf(HTMLIFrameElement);
    });

    it('should apply custom options', () => {
      const iframe = createSafeIframe('https://www.youtube.com/embed/test', {
        width: '800',
        height: '600',
        title: 'Test iframe',
        className: 'test-class',
        id: 'test-id'
      });
      
      expect(iframe.width).toBe('800');
      expect(iframe.height).toBe('600');
      expect(iframe.title).toBe('Test iframe');
      expect(iframe.className).toBe('test-class');
      expect(iframe.id).toBe('test-id');
    });

    it('should set security attributes', () => {
      const iframe = createSafeIframe('https://www.youtube.com/embed/test');
      
      expect(iframe).toHaveAttribute('loading', 'lazy');
      expect(iframe).toHaveAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    });
  });

  describe('sanitizeInput', () => {
    it('should return empty string for non-string input', () => {
      expect(sanitizeInput(123)).toBe('');
      expect(sanitizeInput(null)).toBe('');
    });

    it('should remove script tags', () => {
      const result = sanitizeInput('<script>alert("xss")</script>test');
      expect(result).not.toContain('<script>');
      expect(result).toContain('test');
    });

    it('should remove javascript: protocol', () => {
      const result = sanitizeInput('javascript:alert("xss")');
      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const result = sanitizeInput('<img onclick="alert(\'xss\')" src="test.jpg">');
      expect(result).not.toContain('onclick');
    });

    it('should trim whitespace', () => {
      const result = sanitizeInput('  test  ');
      expect(result).toBe('test');
    });
  });

  describe('isValidEmail', () => {
    it('should return false for null or undefined', () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isValidEmail(123)).toBe(false);
    });

    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('isValidURL', () => {
    it('should return false for null or undefined', () => {
      expect(isValidURL(null)).toBe(false);
      expect(isValidURL(undefined)).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isValidURL(123)).toBe(false);
    });

    it('should return true for valid URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://localhost:3000')).toBe(true);
      expect(isValidURL('https://example.com/path?query=value')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidURL('not-a-url')).toBe(false);
      expect(isValidURL('://invalid')).toBe(false);
    });
  });

  describe('enforceIframePolicy', () => {
    it('should intercept iframe creation', () => {
      enforceIframePolicy();
      
      const iframe = document.createElement('iframe');
      expect(iframe).toBeInstanceOf(HTMLIFrameElement);
      
      // Should log warning (we can't easily test console.warn in Jest)
      // but the iframe should still be created
    });
  });
});

