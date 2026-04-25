import {
  getLocalizedError,
  formatErrorResponse,
  translateError,
  errorMessages,
} from '../../../src/utils/localizedErrors';

describe('localizedErrors', () => {
  describe('errorMessages', () => {
    it('contiene los códigos de error principales', () => {
      expect(errorMessages).toHaveProperty('AUTH_REQUIRED');
      expect(errorMessages).toHaveProperty('AUTH_INVALID_TOKEN');
      expect(errorMessages).toHaveProperty('AUTH_INVALID_CREDENTIALS');
      expect(errorMessages).toHaveProperty('VALIDATION_REQUIRED');
      expect(errorMessages).toHaveProperty('RESOURCE_NOT_FOUND');
      expect(errorMessages).toHaveProperty('SERVER_ERROR');
    });

    it('cada error tiene code, message y userMessage', () => {
      Object.values(errorMessages).forEach((err) => {
        expect(err).toHaveProperty('code');
        expect(err).toHaveProperty('message');
        expect(err).toHaveProperty('userMessage');
        expect(err.code).toBeTruthy();
        expect(err.message).toBeTruthy();
        expect(err.userMessage).toBeTruthy();
      });
    });
  });

  describe('getLocalizedError', () => {
    it('retorna el error correcto para un código conocido', () => {
      const err = getLocalizedError('AUTH_REQUIRED');
      expect(err.code).toBe('AUTH_REQUIRED');
      expect(err.message).toBe('Authentication required');
    });

    it('retorna SERVER_ERROR para código desconocido', () => {
      const err = getLocalizedError('NONEXISTENT_CODE');
      expect(err.code).toBe('SERVER_ERROR');
    });

    it('incluye field cuando se proporciona', () => {
      const err = getLocalizedError('VALIDATION_REQUIRED', 'email');
      expect(err.field).toBe('email');
    });

    it('modifica userMessage al incluir field', () => {
      const err = getLocalizedError('VALIDATION_REQUIRED', 'email');
      expect(err.userMessage).toContain('email');
    });

    it('retorna sugerencias cuando el error las tiene', () => {
      const err = getLocalizedError('AUTH_REQUIRED');
      expect(Array.isArray(err.suggestions)).toBe(true);
      expect(err.suggestions!.length).toBeGreaterThan(0);
    });

    it('no modifica el objeto original de errorMessages', () => {
      const original = errorMessages.RESOURCE_NOT_FOUND.userMessage;
      getLocalizedError('RESOURCE_NOT_FOUND', 'someField');
      expect(errorMessages.RESOURCE_NOT_FOUND.userMessage).toBe(original);
    });
  });

  describe('formatErrorResponse', () => {
    it('retorna objeto con success: false', () => {
      const response = formatErrorResponse('AUTH_REQUIRED');
      expect(response.success).toBe(false);
    });

    it('incluye code y message en error', () => {
      const response = formatErrorResponse('RESOURCE_NOT_FOUND');
      expect(response.error.code).toBe('RESOURCE_NOT_FOUND');
      expect(response.error.message).toBeDefined();
      expect(response.error.userMessage).toBeDefined();
    });

    it('incluye field cuando se proporciona', () => {
      const response = formatErrorResponse('VALIDATION_REQUIRED', 'patientId');
      expect(response.error.field).toBe('patientId');
    });

    it('incluye technicalDetails cuando se proporciona', () => {
      const details = { stack: 'Error at line 42' };
      const response = formatErrorResponse('SERVER_ERROR', undefined, details);
      expect(response.error.technicalDetails).toEqual(details);
    });

    it('no incluye technicalDetails cuando no se proporciona', () => {
      const response = formatErrorResponse('SERVER_ERROR');
      expect(response.error).not.toHaveProperty('technicalDetails');
    });

    it('incluye suggestions cuando el error las tiene', () => {
      const response = formatErrorResponse('AUTH_INVALID_CREDENTIALS');
      expect(response.error.suggestions).toBeDefined();
      expect(Array.isArray(response.error.suggestions)).toBe(true);
    });

    it('maneja código desconocido usando SERVER_ERROR', () => {
      const response = formatErrorResponse('UNKNOWN_CODE_XYZ');
      expect(response.error.code).toBe('SERVER_ERROR');
      expect(response.success).toBe(false);
    });
  });

  describe('translateError', () => {
    it('retorna el userMessage del error para código conocido', () => {
      const msg = translateError('AUTH_REQUIRED');
      expect(msg).toBe(errorMessages.AUTH_REQUIRED.userMessage);
    });

    it('retorna el userMessage de SERVER_ERROR para código desconocido', () => {
      const msg = translateError('NO_EXISTE');
      expect(msg).toBe(errorMessages.SERVER_ERROR.userMessage);
    });

    it('acepta locale como segundo parámetro (actualmente retorna español)', () => {
      const msg = translateError('VALIDATION_REQUIRED', 'es');
      expect(msg).toBe(errorMessages.VALIDATION_REQUIRED.userMessage);
    });

    it('retorna texto no vacío siempre', () => {
      const msg = translateError('CUALQUIER_CODIGO');
      expect(msg).toBeTruthy();
      expect(msg.length).toBeGreaterThan(0);
    });
  });
});