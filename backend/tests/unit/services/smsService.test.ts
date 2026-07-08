import { SMSService, SMSMessage } from '../../../src/services/smsService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/smsRateLimiter', () => ({
  smsRateLimiter: {
    checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
    checkBurstLimit: jest.fn().mockResolvedValue(true),
    getRateLimitStats: jest.fn().mockResolvedValue({ minute: 0, hour: 0, day: 0 }),
  },
}));

jest.mock('../../../src/services/smsMetricsService', () => ({
  smsMetricsService: {
    recordSMS: jest.fn().mockResolvedValue(undefined),
  },
}));

const twilioCreate = jest.fn();
const twilioFetch = jest.fn();
jest.mock('twilio', () => {
  const messagesFn: any = (_id: string) => ({ fetch: twilioFetch });
  messagesFn.create = twilioCreate;
  return jest.fn(() => ({ messages: messagesFn }));
});

const snsPublish = jest.fn();
jest.mock('aws-sdk', () => ({
  SNS: jest.fn().mockImplementation(() => ({ publish: snsPublish })),
}));

const messagebirdCreate = jest.fn();
jest.mock('messagebird', () => jest.fn(() => ({
  messages: { create: messagebirdCreate },
})));

const redisGet = jest.fn();
jest.mock('../../../src/config/redisClient', () => ({
  getRedisClient: jest.fn(() => ({ get: redisGet })),
}));

const { smsRateLimiter } = require('../../../src/services/smsRateLimiter');
const { smsMetricsService } = require('../../../src/services/smsMetricsService');
const { getRedisClient } = require('../../../src/config/redisClient');

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

    it('lanza error cuando el número empieza con 0 después del +', async () => {
      const msg = buildMessage({ to: '+0987654321' });
      await expect(service.sendSMS(msg)).rejects.toThrow(/inválido/i);
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
    it('lanza error 429 cuando se supera el rate limit', async () => {
      smsRateLimiter.checkRateLimit.mockResolvedValue({ allowed: false, retryAfter: 30 });

      const msg = buildMessage();
      await expect(service.sendSMS(msg)).rejects.toThrow(/Rate limit/i);
    });

    it('lanza error 429 cuando se supera el burst limit', async () => {
      smsRateLimiter.checkRateLimit.mockResolvedValue({ allowed: true });
      smsRateLimiter.checkBurstLimit.mockResolvedValue(false);

      await expect(service.sendSMS(buildMessage())).rejects.toThrow(/Burst limit/i);
    });

    it('registra métricas cuando el SMS se envía correctamente', async () => {
      smsRateLimiter.checkRateLimit.mockResolvedValue({ allowed: true });
      smsRateLimiter.checkBurstLimit.mockResolvedValue(true);

      await service.sendSMS(buildMessage());

      expect(smsMetricsService.recordSMS).toHaveBeenCalledWith(
        'mock',
        expect.any(String),
        'sent',
        expect.anything()
      );
    });
  });

  describe('sendSMS - modo mock', () => {
    it('retorna respuesta simulada en modo mock', async () => {
      const result = await service.sendSMS(buildMessage());

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('messageId');
    });
  });

  describe('formatPhoneNumber', () => {
    it('agrega prefijo de país a números locales', () => {
      expect(service.formatPhoneNumber('987654321')).toMatch(/^\+/);
    });

    it('respeta números que ya tienen prefijo internacional', () => {
      expect(service.formatPhoneNumber('+51987654321')).toBe('+51987654321');
    });
  });

  describe('sendBulkSMS', () => {
    it('envía SMS a múltiples destinatarios', async () => {
      const messages: SMSMessage[] = [
        buildMessage({ to: '+51987654321' }),
        buildMessage({ to: '+51976543210' }),
      ];
      const results = await service.sendBulkSMS(messages);

      expect(results.length).toBe(2);
      expect(results.every(r => r !== undefined)).toBe(true);
    });

    it('continúa procesando aunque algún envío falle', async () => {
      smsRateLimiter.checkRateLimit
        .mockResolvedValueOnce({ allowed: true })
        .mockResolvedValueOnce({ allowed: false, retryAfter: 10 });

      const messages: SMSMessage[] = [
        buildMessage({ to: '+51987654321' }),
        buildMessage({ to: '+51976543210' }),
      ];
      await expect(service.sendBulkSMS(messages)).resolves.toBeDefined();
    });
  });

  describe('metadatos del servicio', () => {
    it('getProvider retorna el proveedor configurado', () => {
      expect(service.getProvider()).toBe('mock');
    });

    it('isAvailable refleja el estado habilitado', () => {
      expect(service.isAvailable()).toBe(true);
      expect(new SMSService({ enabled: false }).isAvailable()).toBe(false);
    });

    it('getRateLimitStats delega al smsRateLimiter', async () => {
      const stats = await service.getRateLimitStats();
      expect(smsRateLimiter.getRateLimitStats).toHaveBeenCalledWith('mock');
      expect(stats).toEqual({ minute: 0, hour: 0, day: 0 });
    });
  });

  describe('inicialización de proveedores', () => {
    it('Twilio: cae a mock cuando faltan credenciales', () => {
      const s = new SMSService({ provider: 'twilio', enabled: true });
      expect(s.getProvider()).toBe('mock');
      expect(s.isAvailable()).toBe(true);
    });

    it('Twilio: inicializa cliente cuando hay credenciales', () => {
      const s = new SMSService({
        provider: 'twilio',
        enabled: true,
        twilioAccountSid: 'AC123',
        twilioAuthToken: 'token',
        twilioPhoneNumber: '+15555550000',
      });
      expect(s.getProvider()).toBe('twilio');
      expect(s.isAvailable()).toBe(true);
    });

    it('AWS SNS: cae a mock cuando faltan credenciales', () => {
      const s = new SMSService({ provider: 'aws_sns', enabled: true });
      expect(s.getProvider()).toBe('mock');
    });

    it('AWS SNS: inicializa cliente cuando hay credenciales', () => {
      const s = new SMSService({
        provider: 'aws_sns',
        enabled: true,
        awsSnsRegion: 'us-east-1',
        awsSnsAccessKeyId: 'AKIA',
        awsSnsSecretAccessKey: 'secret',
      });
      expect(s.getProvider()).toBe('aws_sns');
      expect(s.isAvailable()).toBe(true);
    });

    it('MessageBird: cae a mock cuando faltan credenciales', () => {
      const s = new SMSService({ provider: 'messagebird', enabled: true });
      expect(s.getProvider()).toBe('mock');
    });

    it('MessageBird: inicializa cliente cuando hay credenciales', () => {
      const s = new SMSService({
        provider: 'messagebird',
        enabled: true,
        messagebirdApiKey: 'key-123',
        messagebirdOriginator: 'RespiCare',
      });
      expect(s.getProvider()).toBe('messagebird');
      expect(s.isAvailable()).toBe(true);
    });

    it('isAvailable retorna false para proveedor sin cliente inicializado', () => {
      const s = new SMSService({ provider: 'none' as any, enabled: true });
      expect(s.isAvailable()).toBe(false);
    });
  });

  describe('sendSMS - proveedores no-mock', () => {
    it('provider "none" retorna success:false sin lanzar error', async () => {
      const s = new SMSService({ provider: 'none' as any, enabled: true });
      const result = await s.sendSMS(buildMessage());
      expect(result).toEqual({
        success: false,
        error: 'SMS provider not configured',
      });
    });

    it('provider desconocido lanza AppError con status 500', async () => {
      const s = new SMSService({ provider: 'unknown' as any, enabled: true });
      await expect(s.sendSMS(buildMessage())).rejects.toThrow(/Proveedor SMS desconocido/);
    });

    it('registra métrica "failed" cuando el envío falla', async () => {
      const s = new SMSService({
        provider: 'twilio',
        enabled: true,
        twilioAccountSid: 'AC123',
        twilioAuthToken: 'token',
        twilioPhoneNumber: '+15555550000',
      });
      twilioCreate.mockRejectedValueOnce(new Error('boom'));

      await expect(s.sendSMS(buildMessage())).rejects.toThrow(/Error al enviar SMS/);
      expect(smsMetricsService.recordSMS).toHaveBeenCalledWith(
        'twilio',
        expect.stringMatching(/^failed-/),
        'failed',
        0,
      );
    });
  });

  describe('sendViaTwilio', () => {
    const buildTwilioService = () =>
      new SMSService({
        provider: 'twilio',
        enabled: true,
        twilioAccountSid: 'AC123',
        twilioAuthToken: 'token',
        twilioPhoneNumber: '+15555550000',
      });

    it('envía SMS con Twilio y retorna sid/status', async () => {
      twilioCreate.mockResolvedValueOnce({ sid: 'SM123', status: 'queued' });

      const result = await buildTwilioService().sendSMS(buildMessage());

      expect(twilioCreate).toHaveBeenCalledWith({
        body: 'Mensaje de prueba para el test',
        from: '+15555550000',
        to: '+51987654321',
      });
      expect(result).toMatchObject({
        success: true,
        messageId: 'SM123',
        status: 'queued',
        cost: 0.0075,
      });
    });

    it('usa el "from" del mensaje si viene explícito', async () => {
      twilioCreate.mockResolvedValueOnce({ sid: 'SM999', status: 'sent' });

      await buildTwilioService().sendSMS(
        buildMessage({ from: '+15550001111' }),
      );

      expect(twilioCreate).toHaveBeenCalledWith(
        expect.objectContaining({ from: '+15550001111' }),
      );
    });

    it('lanza 429 cuando Twilio devuelve código 20429', async () => {
      const err: any = new Error('Twilio rate limit');
      err.code = 20429;
      twilioCreate.mockRejectedValueOnce(err);

      await expect(buildTwilioService().sendSMS(buildMessage())).rejects.toThrow(
        /Rate limit de Twilio/,
      );
    });

    it('hace fallback a mock cuando Twilio devuelve código 20003 (auth)', async () => {
      const err: any = new Error('Authenticate failed');
      err.code = 20003;
      twilioCreate.mockRejectedValueOnce(err);

      const result = await buildTwilioService().sendSMS(buildMessage());

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^SMS-/);
    });

    it('hace fallback a mock cuando Twilio devuelve código 21211 (número inválido)', async () => {
      const err: any = new Error('Invalid To phone number');
      err.code = 21211;
      twilioCreate.mockRejectedValueOnce(err);

      const result = await buildTwilioService().sendSMS(buildMessage());

      expect(result.success).toBe(true);
    });
  });

  describe('sendViaAWSSNS', () => {
    const buildSnsService = () =>
      new SMSService({
        provider: 'aws_sns',
        enabled: true,
        awsSnsRegion: 'us-east-1',
        awsSnsAccessKeyId: 'AKIA',
        awsSnsSecretAccessKey: 'secret',
      });

    it('envía SMS con AWS SNS y retorna MessageId', async () => {
      snsPublish.mockReturnValueOnce({
        promise: () => Promise.resolve({ MessageId: 'aws-msg-1' }),
      });

      const result = await buildSnsService().sendSMS(buildMessage());

      expect(snsPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: 'Mensaje de prueba para el test',
          PhoneNumber: '+51987654321',
        }),
      );
      expect(result).toMatchObject({
        success: true,
        messageId: 'aws-msg-1',
        cost: 0.00645,
      });
    });

    it('lanza 429 cuando AWS SNS devuelve Throttling', async () => {
      const err: any = new Error('Rate exceeded');
      err.code = 'Throttling';
      snsPublish.mockReturnValueOnce({
        promise: () => Promise.reject(err),
      });

      await expect(buildSnsService().sendSMS(buildMessage())).rejects.toThrow(
        /Rate limit de AWS SNS/,
      );
    });

    it('propaga otros errores de AWS SNS envueltos en AppError', async () => {
      snsPublish.mockReturnValueOnce({
        promise: () => Promise.reject(new Error('service unavailable')),
      });

      await expect(buildSnsService().sendSMS(buildMessage())).rejects.toThrow(
        /service unavailable/,
      );
    });
  });

  describe('sendViaMessageBird', () => {
    const buildMbService = () =>
      new SMSService({
        provider: 'messagebird',
        enabled: true,
        messagebirdApiKey: 'key-123',
        messagebirdOriginator: 'RespiCare',
      });

    it('envía SMS con MessageBird (callback exitoso)', async () => {
      messagebirdCreate.mockImplementationOnce((_params: any, cb: any) => {
        cb(null, { id: 'mb-1' });
      });

      const result = await buildMbService().sendSMS(buildMessage());

      expect(messagebirdCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          originator: 'RespiCare',
          recipients: ['+51987654321'],
        }),
        expect.any(Function),
      );
      expect(result).toMatchObject({ success: true, messageId: 'mb-1', cost: 0.005 });
    });

    it('propaga error cuando el callback de MessageBird falla', async () => {
      messagebirdCreate.mockImplementationOnce((_params: any, cb: any) => {
        cb(new Error('mb boom'));
      });

      await expect(buildMbService().sendSMS(buildMessage())).rejects.toThrow(/mb boom/);
    });
  });

  describe('sendEmergencySMS', () => {
    it('envía SMS con formato de emergencia incluyendo campos opcionales', async () => {
      const result = await service.sendEmergencySMS('+51987654321', {
        type: 'Crisis respiratoria',
        location: 'Av. Bolognesi 123',
        patientName: 'Juan Pérez',
        description: 'Dificultad severa',
      });

      expect(result).toHaveProperty('success');
      expect(smsMetricsService.recordSMS).toHaveBeenCalled();
    });

    it('formatea el número local antes de enviar', async () => {
      const spy = jest.spyOn(service, 'sendSMS');

      await service.sendEmergencySMS('987654321', {
        type: 'Ataque',
        location: 'Lugar X',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ to: expect.stringMatching(/^\+/) }),
      );
    });
  });

  describe('getMessageStatus', () => {
    it('consulta Twilio y retorna el estado del mensaje', async () => {
      const twilioService = new SMSService({
        provider: 'twilio',
        enabled: true,
        twilioAccountSid: 'AC1',
        twilioAuthToken: 'token',
        twilioPhoneNumber: '+15555550000',
      });
      twilioFetch.mockResolvedValueOnce({ status: 'delivered' });

      const status = await twilioService.getMessageStatus('SM123');

      expect(status).toEqual({ status: 'delivered' });
    });

    it('retorna status:"unknown" cuando Twilio falla', async () => {
      const twilioService = new SMSService({
        provider: 'twilio',
        enabled: true,
        twilioAccountSid: 'AC1',
        twilioAuthToken: 'token',
        twilioPhoneNumber: '+15555550000',
      });
      twilioFetch.mockRejectedValueOnce(new Error('not found'));

      const status = await twilioService.getMessageStatus('SM_bad');

      expect(status).toMatchObject({ status: 'unknown', error: 'not found' });
    });

    it('para proveedores no-Twilio, obtiene el estado desde Redis', async () => {
      redisGet.mockResolvedValueOnce(JSON.stringify({ status: 'sent' }));

      const status = await service.getMessageStatus('SMS-999');

      expect(getRedisClient).toHaveBeenCalled();
      expect(status).toEqual({ status: 'sent' });
    });

    it('retorna null cuando no hay entrada en Redis', async () => {
      redisGet.mockResolvedValueOnce(null);
      const status = await service.getMessageStatus('SMS-missing');
      expect(status).toBeNull();
    });

    it('retorna null cuando Redis no está disponible', async () => {
      (getRedisClient as jest.Mock).mockReturnValueOnce(null);
      const status = await service.getMessageStatus('SMS-x');
      expect(status).toBeNull();
    });
  });

  describe('formatPhoneNumber - variantes', () => {
    it('elimina espacios, guiones y paréntesis', () => {
      expect(service.formatPhoneNumber('(987) 654-321')).toBe('+51987654321');
    });

    it('elimina el 0 inicial de números locales', () => {
      expect(service.formatPhoneNumber('0987654321')).toBe('+51987654321');
    });

    it('respeta el countryCode personalizado', () => {
      expect(service.formatPhoneNumber('612345678', '+34')).toBe('+34612345678');
    });
  });
});