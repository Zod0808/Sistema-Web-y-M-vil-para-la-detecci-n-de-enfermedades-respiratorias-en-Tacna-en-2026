import { AmbulanceService } from '../../../src/services/ambulanceService';
import { EmergencyRequest } from '../../../src/services/emergencyService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
  })),
}));

const buildEmergencyRequest = (overrides: Partial<EmergencyRequest> = {}): EmergencyRequest => ({
  userId: 'user-1',
  patientName: 'María López',
  emergencyType: 'respiratory_crisis',
  severity: 'critical',
  description: 'Paro respiratorio inminente',
  location: {
    latitude: -18.0066,
    longitude: -70.2462,
    address: 'Av. Bolognesi 123, Tacna',
    district: 'Tacna',
  },
  ...overrides,
});

describe('AmbulanceService', () => {
  let service: AmbulanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AmbulanceService({ enabled: true, provider: 'simulated' });
  });

  describe('constructor', () => {
    it('inicializa con valores por defecto', () => {
      const s = new AmbulanceService();
      expect(s).toBeDefined();
    });

    it('inicializa en modo simulado sin cliente HTTP', () => {
      const s = new AmbulanceService({ enabled: true, provider: 'simulated' });
      expect(s).toBeDefined();
    });
  });

  describe('dispatchAmbulance', () => {
    it('lanza error cuando el servicio está deshabilitado', async () => {
      const disabled = new AmbulanceService({ enabled: false });
      await expect(disabled.dispatchAmbulance(buildEmergencyRequest())).rejects.toThrow(
        'Servicio de ambulancias no está habilitado'
      );
    });

    it('despacha ambulancia en modo simulado', async () => {
      const req = buildEmergencyRequest();
      const result = await service.dispatchAmbulance(req);

      expect(result).toBeDefined();
      expect(result.ambulanceId).toBeDefined();
      expect(result.status).toBe('dispatched');
    });

    it('incluye tiempo estimado de llegada', async () => {
      const result = await service.dispatchAmbulance(buildEmergencyRequest());
      expect(result.estimatedArrival).toBeDefined();
    });

    it('incluye información del vehículo', async () => {
      const result = await service.dispatchAmbulance(buildEmergencyRequest());
      expect(result.vehicle).toBeDefined();
    });

    it('registra el despacho activo internamente', async () => {
      const result = await service.dispatchAmbulance(buildEmergencyRequest());

      const tracked = await service.getDispatchStatus(result.ambulanceId);
      expect(tracked).not.toBeNull();
    });

    it('asigna vehículo de cuidados críticos para emergencias críticas', async () => {
      const req = buildEmergencyRequest({ severity: 'critical' });
      const result = await service.dispatchAmbulance(req);

      expect(result.vehicle?.type).toBe('critical_care');
    });

    it('asigna vehículo avanzado para emergencias altas', async () => {
      const req = buildEmergencyRequest({ severity: 'high' });
      const result = await service.dispatchAmbulance(req);

      expect(['advanced', 'critical_care']).toContain(result.vehicle?.type);
    });
  });

  describe('getDispatchStatus', () => {
    it('retorna null para ambulancias no rastreadas', async () => {
      const result = await service.getDispatchStatus('unknown-id');
      expect(result).toBeNull();
    });

    it('retorna estado de ambulancia activa', async () => {
      const dispatch = await service.dispatchAmbulance(buildEmergencyRequest());
      const status = await service.getDispatchStatus(dispatch.ambulanceId);

      expect(status).not.toBeNull();
      expect(status!.ambulanceId).toBe(dispatch.ambulanceId);
    });
  });

  describe('updateDispatchStatus', () => {
    it('actualiza el estado de un despacho activo', async () => {
      const dispatch = await service.dispatchAmbulance(buildEmergencyRequest());

      const updated = await service.updateDispatchStatus({
        ambulanceId: dispatch.ambulanceId,
        status: 'in_transit',
        location: { latitude: -18.01, longitude: -70.25 },
      });

      expect(updated.status).toBe('in_transit');
    });

    it('lanza error al actualizar ambulancia no rastreada', async () => {
      await expect(service.updateDispatchStatus({
        ambulanceId: 'nonexistent',
        status: 'in_transit',
      })).rejects.toThrow();
    });
  });

  describe('cancelDispatch', () => {
    it('cancela un despacho activo', async () => {
      const dispatch = await service.dispatchAmbulance(buildEmergencyRequest());
      const result = await service.cancelDispatch(dispatch.ambulanceId, 'Falsa alarma');

      expect(result.status).toBe('cancelled');
    });

    it('lanza error al cancelar ambulancia inexistente', async () => {
      await expect(service.cancelDispatch('nonexistent')).rejects.toThrow();
    });
  });
});