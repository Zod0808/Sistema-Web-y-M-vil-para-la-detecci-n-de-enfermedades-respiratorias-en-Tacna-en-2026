/**
 * Tests for i18nService
 */

import { t, setLanguage, getCurrentLanguage, SUPPORTED_LANGUAGES } from '../i18nService';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('i18nService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    // Reset to default language
    setLanguage('es');
  });

  describe('SUPPORTED_LANGUAGES', () => {
    it('should export supported languages', () => {
      expect(SUPPORTED_LANGUAGES).toBeDefined();
      expect(SUPPORTED_LANGUAGES.es).toBe('Español');
      expect(SUPPORTED_LANGUAGES.en).toBe('English');
      expect(SUPPORTED_LANGUAGES.pt).toBe('Português');
      expect(SUPPORTED_LANGUAGES.fr).toBe('Français');
      expect(SUPPORTED_LANGUAGES.qu).toBe('Runa Simi');
    });
  });

  describe('getCurrentLanguage', () => {
    it('should return default language (es) when no language is set', () => {
      localStorageMock.getItem.mockReturnValue(null);
      const lang = getCurrentLanguage();
      expect(lang).toBe('es');
    });

    it('should return saved language from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('en');
      const lang = getCurrentLanguage();
      expect(lang).toBe('en');
    });

    it('should return es for invalid language', () => {
      localStorageMock.getItem.mockReturnValue('invalid');
      const lang = getCurrentLanguage();
      expect(lang).toBe('es');
    });
  });

  describe('setLanguage', () => {
    it('should set language and save to localStorage', () => {
      setLanguage('en');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('app-language', 'en');
    });

    it('should dispatch languageChanged event', () => {
      const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
      setLanguage('en');
      
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'languageChanged',
          detail: { language: 'en' }
        })
      );
      
      dispatchEventSpy.mockRestore();
    });

    it('should not set invalid language', () => {
      const originalLang = getCurrentLanguage();
      setLanguage('invalid');
      expect(getCurrentLanguage()).toBe(originalLang);
    });
  });

  describe('t (translation function)', () => {
    it('should translate simple keys', () => {
      expect(t('common.save')).toBe('Guardar');
      expect(t('common.cancel')).toBe('Cancelar');
    });

    it('should translate nested keys', () => {
      expect(t('home.welcome')).toBe('Bienvenido a RespiCare');
      expect(t('home.subtitle')).toBeDefined();
    });

    it('should return key when translation not found', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key');
    });

    it('should handle empty key', () => {
      expect(t('')).toBe('');
    });

    it('should translate in different languages', () => {
      setLanguage('es');
      expect(t('common.save')).toBe('Guardar');
      
      setLanguage('en');
      expect(t('common.save')).toBe('Save');
    });

    it('should handle deep nested keys', () => {
      expect(t('chatbot.greeting')).toBeDefined();
      expect(typeof t('chatbot.greeting')).toBe('string');
    });

    it('should return key for invalid nested path', () => {
      expect(t('common.invalid.nested.key')).toBe('common.invalid.nested.key');
    });
  });

  describe('Language persistence', () => {
    it('should persist language across page reloads', () => {
      setLanguage('en');
      localStorageMock.getItem.mockReturnValue('en');
      expect(getCurrentLanguage()).toBe('en');
    });

    it('should load language from localStorage on initialization', () => {
      localStorageMock.getItem.mockReturnValue('pt');
      const lang = getCurrentLanguage();
      expect(lang).toBe('pt');
    });
  });

  describe('Event handling', () => {
    it('should allow components to listen to language changes', () => {
      const handler = jest.fn();
      window.addEventListener('languageChanged', handler);
      
      setLanguage('en');
      
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'languageChanged',
          detail: { language: 'en' }
        })
      );
      
      window.removeEventListener('languageChanged', handler);
    });
  });

  describe('Edge cases', () => {
    it('should handle null localStorage gracefully', () => {
      const originalLocalStorage = global.localStorage;
      delete global.localStorage;
      
      expect(() => {
        getCurrentLanguage();
      }).not.toThrow();
      
      global.localStorage = originalLocalStorage;
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => {
        getCurrentLanguage();
      }).not.toThrow();
    });

    it('should handle setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => {
        setLanguage('en');
      }).not.toThrow();
    });
  });
});

