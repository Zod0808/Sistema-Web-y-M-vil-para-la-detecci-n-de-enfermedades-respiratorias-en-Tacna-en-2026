/**
 * Tests for CSP Enforcer Utilities
 */

import { initCSPEnforcement, validateScript } from '../cspEnforcer';

describe('CSP Enforcer Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window.eval and window.Function
    if (typeof window !== 'undefined') {
      window.eval = eval;
      window.Function = Function;
    }
  });

  describe('initCSPEnforcement', () => {
    it('should add securitypolicyviolation event listener', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      
      initCSPEnforcement();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'securitypolicyviolation',
        expect.any(Function)
      );
    });

    it('should log CSP violations', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      initCSPEnforcement();
      
      // Simulate CSP violation event
      const event = new Event('securitypolicyviolation');
      event.violatedDirective = 'script-src';
      event.blockedURI = 'http://malicious.com/script.js';
      event.sourceFile = 'http://example.com/page.html';
      event.lineNumber = 10;
      
      document.dispatchEvent(event);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'CSP Violation:',
        expect.objectContaining({
          violatedDirective: 'script-src',
          blockedURI: 'http://malicious.com/script.js'
        })
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should send CSP violation to analytics if available', () => {
      const mockAnalytics = {
        logEvent: jest.fn()
      };
      window.analyticsService = mockAnalytics;
      
      initCSPEnforcement();
      
      const event = new Event('securitypolicyviolation');
      event.violatedDirective = 'script-src';
      event.blockedURI = 'http://malicious.com/script.js';
      
      document.dispatchEvent(event);
      
      expect(mockAnalytics.logEvent).toHaveBeenCalledWith(
        'security.csp_violation',
        expect.objectContaining({
          directive: 'script-src',
          blockedURI: 'http://malicious.com/script.js'
        })
      );
      
      delete window.analyticsService;
    });

    it('should block eval() function', () => {
      initCSPEnforcement();
      
      expect(() => {
        window.eval('console.log("test")');
      }).toThrow('eval() no está permitido por razones de seguridad');
    });

    it('should block Function constructor', () => {
      initCSPEnforcement();
      
      expect(() => {
        new window.Function('return 1 + 1');
      }).toThrow('Function() constructor no está permitido por razones de seguridad');
    });
  });

  describe('validateScript', () => {
    it('should throw error for scripts with document.cookie', () => {
      expect(() => {
        validateScript('document.cookie = "test=value"');
      }).toThrow('Script contiene patrón peligroso');
    });

    it('should throw error for scripts with localStorage', () => {
      expect(() => {
        validateScript('localStorage.setItem("key", "value")');
      }).toThrow('Script contiene patrón peligroso');
    });

    it('should throw error for scripts with sessionStorage', () => {
      expect(() => {
        validateScript('sessionStorage.getItem("key")');
      }).toThrow('Script contiene patrón peligroso');
    });

    it('should throw error for scripts with XMLHttpRequest', () => {
      expect(() => {
        validateScript('new XMLHttpRequest()');
      }).toThrow('Script contiene patrón peligroso');
    });

    it('should throw error for scripts with fetch', () => {
      expect(() => {
        validateScript('fetch("/api/data")');
      }).toThrow('Script contiene patrón peligroso');
    });

    it('should throw error for scripts with eval', () => {
      expect(() => {
        validateScript('eval("code")');
      }).toThrow('Script contiene patrón peligroso');
    });

    it('should throw error for scripts with Function', () => {
      expect(() => {
        validateScript('Function("return 1")');
      }).toThrow('Script contiene patrón peligroso');
    });

    it('should throw error for scripts with script tags', () => {
      expect(() => {
        validateScript('<script>alert("xss")</script>');
      }).toThrow('Script contiene patrón peligroso');
    });

    it('should return true for safe scripts', () => {
      expect(validateScript('const x = 1 + 1;')).toBe(true);
      expect(validateScript('function add(a, b) { return a + b; }')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(() => {
        validateScript('DOCUMENT.COOKIE = "test"');
      }).toThrow('Script contiene patrón peligroso');
    });
  });
});

