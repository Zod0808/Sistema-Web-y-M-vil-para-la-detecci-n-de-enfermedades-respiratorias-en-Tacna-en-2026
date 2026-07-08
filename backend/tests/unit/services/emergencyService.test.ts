import { EmergencyService, EmergencyRequest } from '../../../src/services/emergencyService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/ambulanceService', () => ({
  ambulanceService: { dispatchAmbulance: jest.fn() },
}));

jest.mock('../../../src/services/hospitalCommunicationService', () => ({
  hospitalCommunicationService: { notifyHospitals: jest.fn() },
}));

const axiosPost = jest.fn();
const axiosGet = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({ post: axiosPost, get: axiosGet })),
  },
  create: jest.fn(() => ({ post: axiosPost, get: axiosGet })),
}));

jest.mock('../../../src/services/smsService', () => ({
  smsService: {
    sendEmergencySMS: jest.fn().mockResolvedValue({ success: true }),
  },
}));

const { ambulanceService } = require('../../../src/services/ambulanceService');
const { hospitalCommunicationService } = require('../../../src/services/hospitalCommunicationService');

const buildEmergencyRequest = (overrides: Partial<EmergencyRequest> = {}): EmergencyRequest => ({
  userId: 'user-1',
  patientName: 'Juan Pérez',
  emergencyType: 'respiratory_crisis',
  severity: 'high',
  description: 'Crisis respiratoria severa, dificultad para respirar',
  location: {
    latitude: -18.0066,
    longitude: -70.2462,
    address: 'Av. Bolognesi 123, Tacna',
    district: 'Tacna',
  },
  symptoms: ['disnea', 'cianosis'],
  ...overrides,
});

describe('EmergencyService', () => {
  let service: EmergencyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmergencyService({ enabled: true });
    ambulanceService.dispatchAmbulance.mockResolvedValue({ ambulanceId: 'amb-1' });
    hospitalCommunicationService.notifyHospitals.mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('inicializa con configuración por defecto', () => {
      const s = new EmergencyService();
      expect(s).toBeDefined();
    });

    it('inicializa con configuración parcial', () => {
      const s = new EmergencyService({ autoAlertEnabled: false });
      expect(s).toBeDefined();
    });
  });

  describe('createEmergency', () => {
    it('lanza error cuando el servicio está deshabilitado', async () => {
      const disabledService = new EmergencyService({ enabled: false });
      const req = buildEmergencyRequest();

      await expect(disabledService.createEmergency(req)).rejects.toThrow(
        'Servicio de emergencias no está habilitado'
      );
    });

    it('lanza error con coordenadas GPS inválidas (latitud fuera de rango)', async () => {
      const req = buildEmergencyRequest({
        location: { latitude: 91, longitude: -70 },
      });

      await expect(service.createEmergency(req)).rejects.toThrow();
    });

    it('lanza error con coordenadas GPS inválidas (longitud fuera de rango)', async () => {
      const req = buildEmergencyRequest({
        location: { latitude: -18, longitude: 181 },
      });

      await expect(service.createEmergency(req)).rejects.toThrow();
    });

    it('crea emergencia en modo simulado cuando no hay cliente HTTP', async () => {
      const req = buildEmergencyRequest();
      const result = await service.createEmergency(req);

      expect(result).toBeDefined();
      expect(result.emergencyId).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('despacha ambulancia automáticamente', async () => {
      const req = buildEmergencyRequest();
      await service.createEmergency(req);

      expect(ambulanceService.dispatchAmbulance).toHaveBeenCalledWith(req);
    });

    it('notifica a hospitales', async () => {
      const req = buildEmergencyRequest();
      await service.createEmergency(req);

      expect(hospitalCommunicationService.notifyHospitals).toHaveBeenCalledWith(req);
    });

    it('continúa aunque falle el despacho de ambulancia', async () => {
      ambulanceService.dispatchAmbulance.mockRejectedValue(new Error('Sin ambulancias disponibles'));
      const req = buildEmergencyRequest();

      const result = await service.createEmergency(req);
      expect(result).toBeDefined();
    });

    it('continúa aunque falle la notificación a hospitales', async () => {
      hospitalCommunicationService.notifyHospitals.mockRejectedValue(new Error('Hospitales no disponibles'));
      const req = buildEmergencyRequest();

      const result = await service.createEmergency(req);
      expect(result).toBeDefined();
    });

    it('guarda la emergencia activa en el mapa interno', async () => {
      const req = buildEmergencyRequest();
      const result = await service.createEmergency(req);

      const status = await service.getEmergencyStatus(result.emergencyId);
      expect(status).toBeDefined();
      expect(status!.emergencyId).toBe(result.emergencyId);
    });
  });

  describe('getEmergencyStatus', () => {
    it('retorna null para emergencias que no existen', async () => {
      const status = await service.getEmergencyStatus('nonexistent-id');
      expect(status).toBeNull();
    });

    it('retorna el estado de una emergencia activa', async () => {
      const req = buildEmergencyRequest();
      const created = await service.createEmergency(req);

      const status = await service.getEmergencyStatus(created.emergencyId);
      expect(status).not.toBeNull();
      expect(status!.emergencyId).toBe(created.emergencyId);
    });
  });

  describe('cancelEmergency', () => {
    it('cancela una emergencia activa y actualiza el estado a "cancelled"', async () => {
      const req = buildEmergencyRequest();
      const created = await service.createEmergency(req);

      const result = await service.cancelEmergency(created.emergencyId, 'falsa alarma');
      expect(result).toBe(true);

      const status = await service.getEmergencyStatus(created.emergencyId);
      expect(status?.status).toBe('cancelled');
    });

    it('retorna true de forma idempotente cuando la emergencia no existe', async () => {
      await expect(service.cancelEmergency('nonexistent')).resolves.toBe(true);
    });
  });

  describe('getActiveEmergencies (por usuario)', () => {
    it('retorna solo emergencias del userId dado', async () => {
      await service.createEmergency(buildEmergencyRequest({ userId: 'user-a' }));
      await service.createEmergency(buildEmergencyRequest({ userId: 'user-b' }));

      const forA = service.getActiveEmergencies('user-a');
      expect(forA.length).toBeGreaterThan(0);
      expect(forA.every((e) => e.metadata?.userId === 'user-a')).toBe(true);
    });

    it('retorna array vacío para un usuario sin emergencias', () => {
      expect(service.getActiveEmergencies('nadie')).toEqual([]);
    });
  });

  describe('detectEmergencyFromSymptoms', () => {
    const location = { latitude: -18, longitude: -70, address: 'Tacna' };

    it('crea emergencia cuando detecta síntomas críticos (disnea+cianosis)', async () => {
      const result = await service.detectEmergencyFromSymptoms(
        'user-1',
        'patient-1',
        ['disnea', 'cianosis'],
        undefined,
        location as any,
      );
      expect(result).toBeDefined();
    });

    it('retorna null cuando los síntomas no ameritan emergencia crítica', async () => {
      const result = await service.detectEmergencyFromSymptoms(
        'user-1',
        'patient-1',
        ['tos leve'],
        undefined,
        location as any,
      );
      expect(result).toBeNull();
    });
  });

  describe('validateLocation - branches', () => {
    it('lanza 400 cuando faltan coordenadas', async () => {
      const req = buildEmergencyRequest({ location: { address: 'x' } as any });
      await expect(service.createEmergency(req)).rejects.toThrow();
    });

    it('lanza 400 cuando las coordenadas no son números', async () => {
      const req = buildEmergencyRequest({
        location: { latitude: '18' as any, longitude: '-70' as any },
      });
      await expect(service.createEmergency(req)).rejects.toThrow();
    });
  });

  describe('HTTP client (cuando apiUrl y apiKey están configurados)', () => {
    let httpService: EmergencyService;

    beforeEach(() => {
      axiosPost.mockReset();
      axiosGet.mockReset();
      httpService = new EmergencyService({
        enabled: true,
        apiUrl: 'https://emergency-api.test',
        apiKey: 'test-key',
      });
    });

    it('dispatchToEmergencyService: envía la solicitud y mapea la respuesta', async () => {
      axiosPost.mockResolvedValueOnce({
        data: {
          id: 'EMG-999',
          status: 'dispatched',
          estimatedArrival: '2026-07-04T10:00:00Z',
          serviceProvider: 'SAMU',
          trackingUrl: 'https://track/999',
          metadata: { source: 'ext' },
        },
      });

      const result = await httpService.createEmergency(buildEmergencyRequest());

      expect(axiosPost).toHaveBeenCalledWith('/emergencies', expect.any(Object));
      expect(result).toMatchObject({
        emergencyId: 'EMG-999',
        status: 'dispatched',
        serviceProvider: 'SAMU',
      });
      expect(result.estimatedArrival).toBeInstanceOf(Date);
    });

    it('dispatchToEmergencyService: usa emergencyId cuando no hay id', async () => {
      axiosPost.mockResolvedValueOnce({
        data: { emergencyId: 'EMG-alt', metadata: {} },
      });
      const result = await httpService.createEmergency(buildEmergencyRequest());
      expect(result.emergencyId).toBe('EMG-alt');
    });

    it('getEmergencyStatus: consulta al servicio externo cuando no está en cache', async () => {
      axiosGet.mockResolvedValueOnce({
        data: { emergencyId: 'EMG-remote', status: 'in_progress' },
      });
      const status = await httpService.getEmergencyStatus('EMG-remote');
      expect(status).toEqual({ emergencyId: 'EMG-remote', status: 'in_progress' });
    });

    it('getEmergencyStatus: retorna null cuando el servicio externo falla', async () => {
      axiosGet.mockRejectedValueOnce(new Error('502'));
      await expect(httpService.getEmergencyStatus('EMG-x')).resolves.toBeNull();
    });

    it('cancelEmergency: llama al endpoint de cancelación externo', async () => {
      axiosPost.mockResolvedValueOnce({ data: {} });
      const result = await httpService.cancelEmergency('EMG-x', 'motivo');
      expect(axiosPost).toHaveBeenCalledWith('/emergencies/EMG-x/cancel', { reason: 'motivo' });
      expect(result).toBe(true);
    });

    it('cancelEmergency: retorna false cuando el POST falla', async () => {
      axiosPost.mockRejectedValueOnce(new Error('502'));
      await expect(httpService.cancelEmergency('EMG-x')).resolves.toBe(false);
    });

    it('createEmergency: envuelve error inesperado en AppError 500', async () => {
      axiosPost.mockRejectedValueOnce(new Error('remote error'));
      await expect(httpService.createEmergency(buildEmergencyRequest())).rejects.toThrow(
        /Error al crear emergencia/,
      );
    });
  });

  describe('notifyEmergencyContact', () => {
    it('envía SMS a los contactos configurados', async () => {
      const { smsService } = require('../../../src/services/smsService');
      const s = new EmergencyService({
        enabled: true,
        emergencyContacts: [{ name: 'Familia', phone: '+51987654321', relationship: 'family' } as any],
      });
      await s.createEmergency(buildEmergencyRequest());
      expect(smsService.sendEmergencySMS).toHaveBeenCalledWith(
        '+51987654321',
        expect.any(Object),
      );
    });

    it('atrapa error de SMS sin bloquear la creación', async () => {
      const { smsService } = require('../../../src/services/smsService');
      smsService.sendEmergencySMS.mockRejectedValueOnce(new Error('sms down'));
      const s = new EmergencyService({
        enabled: true,
        emergencyContacts: [{ name: 'X', phone: '+51987654321', relationship: 'other' } as any],
      });
      await expect(s.createEmergency(buildEmergencyRequest())).resolves.toBeDefined();
    });
  });
});