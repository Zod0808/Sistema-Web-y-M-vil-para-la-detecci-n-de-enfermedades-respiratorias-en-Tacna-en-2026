import { SMSService, SMSMessage } from '../../../src/services/smsService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/smsRateLimiter', () => ({
  smsRateLimiter: {
    checkLimit: jest.fn().mockResolvedValue({ allowed: true }),
    recordUsage: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../../src/services/smsMetricsService', () => ({
  smsMetricsService: {
    recordSent: jest.fn().mockResolvedValue(undefined),
    recordFailed: jest.fn().mockResolvedValue(undefined),
  },
}));

const { smsRateLimiter } = require('../../../src/services/smsRateLimiter');
const { smsMetricsService } = require('../../../src/services/smsMetricsService');

const buildMessage = (overrides: Partial<SMSMessage> = {}): SMSMessage => ({
  to: '+51987654321',
  message: 'Mensaje de prueba para el test',
  ...overrides,
});

describe('SMSService', () => {
  let service: SMSService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SMSService({ provider: 'mock', enabled: true });
  });

  describe('constructor', () => {
    it('inicializa con provider mock por defecto', () => {
      const s = new SMSService();
      expect(s).toBeDefined();
    });

    it('inicializa con configuración personalizada', () => {
      const s = new SMSService({ provider: 'mock', enabled: true, rateLimitPerMinute: 30 });
      expect(s).toBeDefined();
    });
  });

  describe('sendSMS - validación de número de teléfono', () => {
    it('lanza error con número inválido (sin prefijo +)', async () => {
      const msg = buildMessage({ to: '987654321' });
      await expect(service.sendSMS(msg)).rejects.toThrow(/inválido/i);
    });

    it('lanza error con número vacío', async () => {
      const msg = buildMessage({ to: '' });
      await expect(service.sendSMS(msg)).rejects.toThrow();
    });

    it('lanza error con número demasiado corto', async () => {
      const msg = buildMessage({ to: '+51123' });
      await expect(service.sendSMS(msg)).rejects.toThrow();
    });

    it('acepta número E.164 válido', async () => {
      const msg = buildMessage({ to: '+51987654321' });
      const result = await service.sendSMS(msg);
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('sendSMS - validación del mensaje', () => {
    it('lanza error cuando el mensaje excede 1600 caracteres', async () => {
      const msg = buildMessage({ message: 'A'.repeat(1601) });
      await expect(service.sendSMS(msg)).rejects.toThrow('1600');
    });

    it('acepta mensaje exactamente de 1600 caracteres', async () => {
      const msg = buildMessage({ message: 'A'.repeat(1600) });
      const result = await service.sendSMS(msg);
      expect(result).toBeDefined();
    });
  });

  describe('sendSMS - servicio deshabilitado', () => {
    it('retorna success:false cuando el servicio está deshabilitado', async () => {
      const disabledService = new SMSService({ enabled: false });
      const msg = buildMessage();

      const result = await disabledService.sendSMS(msg);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS service is disabled');
    });
  });

  describe('sendSMS - rate limiting', () => {
    it('retorna error cuando se supera el rate limit', async () => {
      smsRateLimiter.checkLimit.mockResolvedValue({ allowed: false, reason: 'Límite por minuto alcanzado' });

      const msg = buildMessage();
      await expect(service.sendSMS(msg)).rejects.toThrow(/límite|limit/i);
    });

    it('registra el uso cuando el SMS se envía correctamente', async () => {
      smsRateLimiter.checkLimit.mockResolvedValue({ allowed: true });

      await service.sendSMS(buildMessage());

      expect(smsRateLimiter.recordUsage).toHaveBeenCalled();
    });
  });

  describe('sendSMS - modo mock', () => {
    it('retorna respuesta simulada en modo mock', async () => {
      const result = await service.sendSMS(buildMessage());

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('messageId');
    });

    it('registra métricas tras envío exitoso', async () => {
      await service.sendSMS(buildMessage());

      expect(smsMetricsService.recordSent).toHaveBeenCalled();
    });
  });

  describe('sendBulkSMS', () => {
    it('envía SMS a múltiples destinatarios', async () => {
      const recipients = ['+51987654321', '+51976543210'];
      const results = await service.sendBulkSMS(recipients, 'Mensaje masivo de prueba');

      expect(results.length).toBe(2);
      expect(results.every(r => r !== undefined)).toBe(true);
    });

    it('continúa enviando aunque algún envío falle', async () => {
      smsRateLimiter.checkLimit
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false, reason: 'Límite alcanzado' });

      const recipients = ['+51987654321', '+51976543210'];
      // No debe lanzar error aunque un envío falle
      await expect(service.sendBulkSMS(recipients, 'Mensaje')).resolves.toBeDefined();
    });
  });

  describe('getStats', () => {
    it('retorna estadísticas del servicio', () => {
      const stats = service.getStats();
      expect(stats).toHaveProperty('provider');
      expect(stats).toHaveProperty('enabled');
    });
  });
});