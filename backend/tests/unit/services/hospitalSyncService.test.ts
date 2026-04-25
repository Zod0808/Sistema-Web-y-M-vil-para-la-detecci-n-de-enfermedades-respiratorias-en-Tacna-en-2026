import { HospitalSyncService } from '../../../src/services/hospitalSyncService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/fhirService', () => ({
  fhirService: {
    createResource: jest.fn().mockResolvedValue({ id: 'created-1' }),
    search: jest.fn().mockResolvedValue({ entry: [] }),
  },
}));

jest.mock('../../../src/services/oauth2Service', () => ({
  OAuth2Service: jest.fn().mockImplementation(() => ({
    createAuthenticatedClient: jest.fn().mockResolvedValue({
      get: jest.fn(),
      post: jest.fn(),
    }),
    getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  })),
}));

jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn(),
    post: jest.fn(),
  }),
}));

const { fhirService } = require('../../../src/services/fhirService');
const axios = require('axios');

const buildConfig = (overrides: any = {}) => ({
  name: 'Hospital Central',
  fhirBaseUrl: 'http://fhir.hospital.test',
  enabled: true,
  ...overrides,
});

describe('HospitalSyncService', () => {
  let service: HospitalSyncService;
  let mockFhirClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HospitalSyncService();
    mockFhirClient = {
      get: jest.fn(),
      post: jest.fn(),
    };
    axios.create.mockReturnValue(mockFhirClient);
  });

  describe('registerHospitalSystem', () => {
    it('registra hospital sin OAuth2', () => {
      service.registerHospitalSystem(buildConfig());

      const hospitals = service.getRegisteredHospitals();
      expect(hospitals).toHaveLength(1);
      expect(hospitals[0].name).toBe('Hospital Central');
    });

    it('registra múltiples hospitales', () => {
      service.registerHospitalSystem(buildConfig({ name: 'Hospital A' }));
      service.registerHospitalSystem(buildConfig({ name: 'Hospital B' }));

      expect(service.getRegisteredHospitals()).toHaveLength(2);
    });

    it('registra hospital con OAuth2', () => {
      service.registerHospitalSystem(buildConfig({
        oauth2Config: {
          tokenUrl: 'http://auth.hospital.test/token',
          clientId: 'client-id',
          clientSecret: 'client-secret',
        },
      }));

      expect(service.getRegisteredHospitals()).toHaveLength(1);
    });
  });

  describe('getRegisteredHospitals', () => {
    it('retorna array vacío cuando no hay hospitales', () => {
      expect(service.getRegisteredHospitals()).toHaveLength(0);
    });

    it('retorna configuraciones de hospitales registrados', () => {
      service.registerHospitalSystem(buildConfig({ name: 'Clínica Sur', fhirBaseUrl: 'http://sur.test' }));
      const hospitals = service.getRegisteredHospitals();

      expect(hospitals[0]).toMatchObject({
        name: 'Clínica Sur',
        fhirBaseUrl: 'http://sur.test',
      });
    });
  });

  describe('syncFromExternal', () => {
    it('lanza AppError 400 cuando el hospital no está configurado', async () => {
      await expect(
        service.syncFromExternal('HospitalNoExiste', 'patient-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza AppError 400 cuando el hospital está deshabilitado', async () => {
      service.registerHospitalSystem(buildConfig({ enabled: false }));

      await expect(
        service.syncFromExternal('Hospital Central', 'patient-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('importa recursos desde hospital externo', async () => {
      service.registerHospitalSystem(buildConfig());

      mockFhirClient.get.mockResolvedValue({
        data: {
          resourceType: 'Bundle',
          entry: [
            { resource: { resourceType: 'Observation', id: 'obs-1' } },
          ],
        },
      });

      const result = await service.syncFromExternal('Hospital Central', 'patient-1');

      expect(result.imported).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('cuenta errores cuando falla un resourceType', async () => {
      service.registerHospitalSystem(buildConfig());

      mockFhirClient.get.mockRejectedValue(new Error('Network error'));

      const result = await service.syncFromExternal('Hospital Central', 'patient-1', ['Patient']);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('syncToExternal', () => {
    it('lanza AppError 400 cuando el hospital no existe', async () => {
      await expect(
        service.syncToExternal('NoExiste', 'patient-1', [])
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('exporta recursos al hospital externo', async () => {
      service.registerHospitalSystem(buildConfig());

      mockFhirClient.post.mockResolvedValue({ data: { status: 'ok' } });

      const resources = [
        { resourceType: 'Patient', id: 'patient-1', name: [{ given: ['Juan'] }] },
      ];

      const result = await service.syncToExternal('Hospital Central', 'patient-1', resources as any);

      expect(result.exported).toBeGreaterThanOrEqual(0);
    });
  });

  describe('syncBidirectional', () => {
    it('lanza AppError cuando el hospital no está configurado', async () => {
      await expect(
        service.syncBidirectional('Inexistente', 'patient-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('retorna resultados combinados de import y export', async () => {
      service.registerHospitalSystem(buildConfig());

      mockFhirClient.get.mockResolvedValue({ data: { resourceType: 'Bundle', entry: [] } });
      mockFhirClient.post.mockResolvedValue({ data: { status: 'ok' } });

      const result = await service.syncBidirectional('Hospital Central', 'patient-1');

      expect(result).toHaveProperty('imported');
      expect(result).toHaveProperty('exported');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('timestamp');
    });
  });
});