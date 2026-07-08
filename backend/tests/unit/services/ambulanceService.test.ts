import { AmbulanceService } from '../../../src/services/ambulanceService';
import { EmergencyRequest } from '../../../src/services/emergencyService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('axios', () => {
  const post = jest.fn();
  const get = jest.fn();
  const put = jest.fn();
  const create = jest.fn(() => ({ post, get, put }));
  return {
    __esModule: true,
    default: { create },
    create,
    __post: post,
    __get: get,
    __put: put,
    __create: create,
  };
});

const axiosMock = require('axios');
const axiosPost: jest.Mock = axiosMock.__post;
const axiosGet: jest.Mock = axiosMock.__get;
const axiosCreate: jest.Mock = axiosMock.__create;

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
    axiosPost.mockReset();
    axiosGet.mockReset();
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

    it('provider=external con HTTPS crea cliente HTTP', () => {
      axiosCreate.mockClear();
      const s = new AmbulanceService({
        enabled: true,
        provider: 'external',
        apiUrl: 'https://amb.test',
        apiKey: 'k',
      });
      expect(s).toBeDefined();
      expect(axiosCreate).toHaveBeenCalled();
    });

    it('provider=external con HTTP rechaza (no crea cliente)', () => {
      const s = new AmbulanceService({
        enabled: true,
        provider: 'external',
        apiUrl: 'http://amb.test', // NO https
        apiKey: 'k',
      });
      expect(s).toBeDefined();
      // No debe haber cliente
      expect((s as any).client).toBeNull();
    });

    it('provider=external con URL inválida no crea cliente', () => {
      const s = new AmbulanceService({
        enabled: true,
        provider: 'external',
        apiUrl: 'not-a-url',
        apiKey: 'k',
      });
      expect((s as any).client).toBeNull();
    });
  });

  describe('dispatchAmbulance', () => {
    it('lanza error cuando el servicio está deshabilitado', async () => {
      const disabled = new AmbulanceService({ enabled: false });
      await expect(disabled.dispatchAmbulance(buildEmergencyRequest())).rejects.toThrow(
        'Servicio de ambulancias no está habilitado',
      );
    });

    it('lanza error cuando autoDispatch está deshabilitado', async () => {
      const noAuto = new AmbulanceService({ enabled: true, autoDispatchEnabled: false });
      await expect(noAuto.dispatchAmbulance(buildEmergencyRequest())).rejects.toThrow(
        'Despacho automático',
      );
    });

    it('despacha ambulancia en modo simulado', async () => {
      const result = await service.dispatchAmbulance(buildEmergencyRequest());
      expect(result.ambulanceId).toBeDefined();
      expect(result.status).toBe('dispatched');
    });

    it('incluye tiempo estimado de llegada y vehículo', async () => {
      const result = await service.dispatchAmbulance(buildEmergencyRequest());
      expect(result.estimatedArrival).toBeInstanceOf(Date);
      expect(result.vehicle).toBeDefined();
    });

    it('registra el despacho activo internamente', async () => {
      const result = await service.dispatchAmbulance(buildEmergencyRequest());
      const tracked = await service.getAmbulanceStatus(result.ambulanceId);
      expect(tracked).not.toBeNull();
    });

    it('asigna vehículo de cuidados críticos para severidad critical', async () => {
      const result = await service.dispatchAmbulance(
        buildEmergencyRequest({ severity: 'critical' }),
      );
      expect(result.vehicle?.type).toBe('critical_care');
      expect(result.crew?.nurse).toBeDefined();
    });

    it('asigna vehículo avanzado para severidad high', async () => {
      const result = await service.dispatchAmbulance(
        buildEmergencyRequest({ severity: 'high' }),
      );
      expect(result.vehicle?.type).toBe('advanced');
      expect(result.crew?.nurse).toBeUndefined();
    });

    it('asigna vehículo básico para severidad medium', async () => {
      const result = await service.dispatchAmbulance(
        buildEmergencyRequest({ severity: 'medium' }),
      );
      expect(result.vehicle?.type).toBe('basic');
    });

    it('include equipamiento de crítico incluye ventilador', async () => {
      const result = await service.dispatchAmbulance(
        buildEmergencyRequest({ severity: 'critical' }),
      );
      expect(result.vehicle?.equipment).toEqual(expect.arrayContaining(['ventilador']));
    });

    it('include equipamiento avanzado incluye monitor cardíaco', async () => {
      const result = await service.dispatchAmbulance(
        buildEmergencyRequest({ severity: 'high' }),
      );
      expect(result.vehicle?.equipment).toEqual(expect.arrayContaining(['monitor cardíaco']));
    });
  });

  describe('getAmbulanceStatus', () => {
    it('retorna null para ambulancias no rastreadas', async () => {
      await expect(service.getAmbulanceStatus('unknown')).resolves.toBeNull();
    });

    it('retorna estado de ambulancia activa desde cache', async () => {
      const dispatch = await service.dispatchAmbulance(buildEmergencyRequest());
      const status = await service.getAmbulanceStatus(dispatch.ambulanceId);
      expect(status?.ambulanceId).toBe(dispatch.ambulanceId);
    });

    it('consulta al servicio externo cuando no está en cache', async () => {
      const httpService = new AmbulanceService({
        enabled: true,
        provider: 'external',
        apiUrl: 'https://amb.test',
        apiKey: 'k',
      });
      axiosGet.mockResolvedValueOnce({ data: { ambulanceId: 'REMOTE', status: 'in_transit' } });

      const status = await httpService.getAmbulanceStatus('REMOTE');
      expect(status).toEqual({ ambulanceId: 'REMOTE', status: 'in_transit' });
    });

    it('retorna null cuando el servicio externo falla', async () => {
      const httpService = new AmbulanceService({
        enabled: true,
        provider: 'external',
        apiUrl: 'https://amb.test',
        apiKey: 'k',
      });
      axiosGet.mockRejectedValueOnce(new Error('502'));
      await expect(httpService.getAmbulanceStatus('X')).resolves.toBeNull();
    });
  });

  describe('updateAmbulanceStatus', () => {
    it('actualiza el estado de un despacho activo', async () => {
      const dispatch = await service.dispatchAmbulance(buildEmergencyRequest());
      const updated = await service.updateAmbulanceStatus({
        ambulanceId: dispatch.ambulanceId,
        status: 'in_transit',
        location: { latitude: -18.01, longitude: -70.25 } as any,
        estimatedArrival: new Date(Date.now() + 10 * 60 * 1000),
        notes: 'Camino al lugar',
      });
      expect(updated?.status).toBe('in_transit');
      expect(updated?.currentLocation).toEqual({ latitude: -18.01, longitude: -70.25 });
      expect(updated?.metadata?.notes).toBe('Camino al lugar');
    });

    it('retorna null cuando la ambulancia no está rastreada', async () => {
      const result = await service.updateAmbulanceStatus({
        ambulanceId: 'nonexistent',
        status: 'in_transit',
      });
      expect(result).toBeNull();
    });
  });

  describe('cancelDispatch', () => {
    it('cancela un despacho activo y retorna true', async () => {
      const dispatch = await service.dispatchAmbulance(buildEmergencyRequest());
      const result = await service.cancelDispatch(dispatch.ambulanceId, 'Falsa alarma');
      expect(result).toBe(true);

      const status = await service.getAmbulanceStatus(dispatch.ambulanceId);
      expect(status?.status).toBe('cancelled');
    });

    it('retorna true de forma idempotente cuando la ambulancia no existe', async () => {
      await expect(service.cancelDispatch('nonexistent')).resolves.toBe(true);
    });

    it('llama al endpoint POST externo cuando hay cliente', async () => {
      const httpService = new AmbulanceService({
        enabled: true,
        provider: 'external',
        apiUrl: 'https://amb.test',
        apiKey: 'k',
      });
      axiosPost.mockResolvedValueOnce({ data: {} });

      const result = await httpService.cancelDispatch('AMB-x', 'motivo');
      expect(axiosPost).toHaveBeenCalledWith('/ambulances/AMB-x/cancel', { reason: 'motivo' });
      expect(result).toBe(true);
    });

    it('retorna false cuando el POST externo falla', async () => {
      const httpService = new AmbulanceService({
        enabled: true,
        provider: 'external',
        apiUrl: 'https://amb.test',
        apiKey: 'k',
      });
      axiosPost.mockRejectedValueOnce(new Error('502'));
      await expect(httpService.cancelDispatch('AMB-x')).resolves.toBe(false);
    });
  });

  describe('getActiveAmbulances', () => {
    it('retorna solo ambulancias activas de la emergencia dada', async () => {
      const d1 = await service.dispatchAmbulance(buildEmergencyRequest());
      const emergencyId = d1.emergencyId;
      // Manipular directamente para tests: forzar el mismo emergencyId
      (service as any).activeDispatches.get(d1.ambulanceId).emergencyId = emergencyId;

      const active = service.getActiveAmbulances(emergencyId);
      expect(active.length).toBeGreaterThan(0);
    });

    it('excluye ambulancias con status completed o cancelled', async () => {
      const d1 = await service.dispatchAmbulance(buildEmergencyRequest());
      await service.cancelDispatch(d1.ambulanceId);
      const active = service.getActiveAmbulances(d1.emergencyId);
      expect(active.find((a) => a.ambulanceId === d1.ambulanceId)).toBeUndefined();
    });
  });

  describe('dispatchToExternalService (provider=external)', () => {
    let httpService: AmbulanceService;

    beforeEach(() => {
      httpService = new AmbulanceService({
        enabled: true,
        provider: 'external',
        apiUrl: 'https://amb.test',
        apiKey: 'k',
      });
    });

    it('envía payload y mapea la respuesta externa', async () => {
      axiosPost.mockResolvedValueOnce({
        data: {
          ambulanceId: 'AMB-99',
          emergencyId: 'EMG-99',
          status: 'in_transit',
          estimatedArrival: '2026-07-04T12:00:00Z',
          crew: { driver: 'D', paramedic: 'P' },
          vehicle: { type: 'advanced', licensePlate: 'ABC-123', equipment: [] },
          trackingUrl: 'https://t/99',
          metadata: { extraField: 'x' },
        },
      });

      const result = await httpService.dispatchAmbulance(buildEmergencyRequest());
      expect(result.ambulanceId).toBe('AMB-99');
      expect(result.emergencyId).toBe('EMG-99');
      expect(result.status).toBe('in_transit');
      expect(result.estimatedArrival).toBeInstanceOf(Date);
      expect(result.metadata?.provider).toBe('external');
    });

    it('usa fallbacks cuando el response no incluye campos opcionales', async () => {
      axiosPost.mockResolvedValueOnce({
        data: { id: 'AMB-fallback' },
      });

      const result = await httpService.dispatchAmbulance(buildEmergencyRequest());
      expect(result.ambulanceId).toBe('AMB-fallback');
      expect(result.emergencyId).toMatch(/^EMG-/);
      expect(result.status).toBe('dispatched');
      expect(result.estimatedArrival).toBeInstanceOf(Date);
    });

    it('envuelve error del POST en AppError 500', async () => {
      axiosPost.mockRejectedValueOnce(new Error('remote error'));
      await expect(httpService.dispatchAmbulance(buildEmergencyRequest())).rejects.toThrow(
        /Error al despachar ambulancia/,
      );
    });

    it('calcula prioridad más alta cuando hay SpO2 bajo', async () => {
      axiosPost.mockResolvedValueOnce({ data: { id: 'AMB-x' } });
      await httpService.dispatchAmbulance(
        buildEmergencyRequest({
          severity: 'medium',
          vitalSigns: { oxygenSaturation: 85 } as any,
        }),
      );
      const [, payload] = axiosPost.mock.calls[0];
      expect(payload.priority).toBeGreaterThan(4);
    });

    it('calcula prioridad más alta cuando el HR está fuera de rango', async () => {
      axiosPost.mockResolvedValueOnce({ data: { id: 'AMB-y' } });
      await httpService.dispatchAmbulance(
        buildEmergencyRequest({
          severity: 'low',
          vitalSigns: { heartRate: 180 } as any,
        }),
      );
      const [, payload] = axiosPost.mock.calls[0];
      expect(payload.priority).toBeGreaterThanOrEqual(3);
    });

    it('la prioridad tiene tope 10', async () => {
      axiosPost.mockResolvedValueOnce({ data: { id: 'AMB-z' } });
      await httpService.dispatchAmbulance(
        buildEmergencyRequest({
          severity: 'critical',
          vitalSigns: { oxygenSaturation: 70, heartRate: 200 } as any,
        }),
      );
      const [, payload] = axiosPost.mock.calls[0];
      expect(payload.priority).toBe(10);
    });
  });
});
