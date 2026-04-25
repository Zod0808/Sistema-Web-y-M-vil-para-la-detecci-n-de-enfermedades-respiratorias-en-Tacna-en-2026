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

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
  })),
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
    it('cancela una emergencia activa', async () => {
      const req = buildEmergencyRequest();
      const created = await service.createEmergency(req);

      const result = await service.cancelEmergency(created.emergencyId);
      expect(result.status).toBe('cancelled');
    });

    it('lanza error al cancelar una emergencia inexistente', async () => {
      await expect(service.cancelEmergency('nonexistent')).rejects.toThrow();
    });
  });
});