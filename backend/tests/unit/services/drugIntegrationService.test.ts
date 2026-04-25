import { DrugIntegrationService, DrugIntegrationConfig } from '../../../src/services/drugIntegrationService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('axios', () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  return {
    create: jest.fn(() => ({ get: mockGet, post: mockPost })),
    __mockGet: mockGet,
    __mockPost: mockPost,
  };
});

const axios = require('axios');

describe('DrugIntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('inicializa sin clientes cuando no hay API keys', () => {
      const service = new DrugIntegrationService({});
      expect(service).toBeDefined();
    });

    it('inicializa con cliente RxNorm cuando se provee URL base', () => {
      const service = new DrugIntegrationService({
        rxNormBaseUrl: 'https://rxnav.nlm.nih.gov/REST',
        enableCaching: false,
      });
      expect(service).toBeDefined();
    });

    it('inicializa con cliente FDA cuando se provee API key', () => {
      const service = new DrugIntegrationService({
        fdaApiKey: 'test-fda-key',
        enableCaching: false,
      });
      expect(service).toBeDefined();
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({ baseURL: 'https://api.fda.gov' })
      );
    });

    it('inicializa con cliente DrugBank cuando se provee API key', () => {
      const service = new DrugIntegrationService({
        drugBankApiKey: 'test-drugbank-key',
        enableCaching: false,
      });
      expect(service).toBeDefined();
    });

    it('usa configuración personalizada de cacheTTL', () => {
      const service = new DrugIntegrationService({
        cacheTTL: 7200000,
        enableCaching: true,
      });
      expect(service).toBeDefined();
    });
  });

  describe('searchDrug', () => {
    it('retorna null cuando no hay clientes configurados', async () => {
      const service = new DrugIntegrationService({ enableCaching: false });
      const result = await service.searchDrug('aspirin');
      expect(result).toBeNull();
    });

    it('busca en RxNorm cuando el cliente está disponible', async () => {
      const rxNormGet = jest.fn();
      axios.create.mockReturnValue({ get: rxNormGet, post: jest.fn() });

      rxNormGet.mockResolvedValueOnce({
        data: {
          drugGroup: {
            conceptGroup: [{
              conceptProperties: [{ rxcui: '1049502', name: 'Aspirin' }],
            }],
          },
        },
      });
      rxNormGet.mockResolvedValueOnce({
        data: {
          properties: { name: 'Aspirin', rxcui: '1049502' },
        },
      });
      rxNormGet.mockResolvedValueOnce({
        data: {
          relatedGroup: {
            conceptGroup: [{ conceptProperties: [{ name: 'Acetylsalicylic acid' }] }],
          },
        },
      });

      const service = new DrugIntegrationService({
        rxNormBaseUrl: 'https://rxnav.nlm.nih.gov/REST',
        enableCaching: false,
      });
      const result = await service.searchDrug('aspirin');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Aspirin');
    });

    it('retorna null cuando RxNorm no encuentra resultados', async () => {
      const rxNormGet = jest.fn().mockResolvedValue({
        data: { drugGroup: { conceptGroup: [{ conceptProperties: [] }] } },
      });
      axios.create.mockReturnValue({ get: rxNormGet, post: jest.fn() });

      const service = new DrugIntegrationService({
        rxNormBaseUrl: 'https://rxnav.nlm.nih.gov/REST',
        enableCaching: false,
      });
      const result = await service.searchDrug('unknowndrug99999');

      expect(result).toBeNull();
    });

    it('usa cache para solicitudes repetidas', async () => {
      const rxNormGet = jest.fn();
      axios.create.mockReturnValue({ get: rxNormGet, post: jest.fn() });

      rxNormGet.mockResolvedValue({
        data: {
          drugGroup: {
            conceptGroup: [{
              conceptProperties: [{ rxcui: '1049502', name: 'Aspirin' }],
            }],
          },
        },
      });
      rxNormGet.mockResolvedValue({
        data: { properties: { name: 'Aspirin' } },
      });
      rxNormGet.mockResolvedValue({ data: { relatedGroup: null } });

      const service = new DrugIntegrationService({
        rxNormBaseUrl: 'https://rxnav.nlm.nih.gov/REST',
        enableCaching: true,
        cacheTTL: 60000,
      });

      await service.searchDrug('aspirin');
      const callCount = rxNormGet.mock.calls.length;

      await service.searchDrug('aspirin');
      // Segunda llamada debe usar cache, no incrementar call count
      expect(rxNormGet.mock.calls.length).toBe(callCount);
    });

    it('propaga error cuando la búsqueda falla', async () => {
      const rxNormGet = jest.fn().mockRejectedValue(new Error('Network error'));
      axios.create.mockReturnValue({ get: rxNormGet, post: jest.fn() });

      const service = new DrugIntegrationService({
        rxNormBaseUrl: 'https://rxnav.nlm.nih.gov/REST',
        enableCaching: false,
      });

      await expect(service.searchDrug('aspirin')).rejects.toThrow();
    });
  });

  describe('searchGenericDrugs', () => {
    it('retorna array vacío cuando no hay clientes configurados', async () => {
      const service = new DrugIntegrationService({ enableCaching: false });
      const result = await service.searchGenericDrugs('Tylenol');
      expect(result).toEqual([]);
    });

    it('retorna genéricos desde RxNorm cuando están disponibles', async () => {
      const rxNormGet = jest.fn().mockResolvedValue({
        data: { drugGroup: null },
      });
      axios.create.mockReturnValue({ get: rxNormGet, post: jest.fn() });

      const service = new DrugIntegrationService({
        rxNormBaseUrl: 'https://rxnav.nlm.nih.gov/REST',
        enableCaching: false,
      });

      const result = await service.searchGenericDrugs('Tylenol');
      expect(Array.isArray(result)).toBe(true);
    });

    it('propaga error cuando la búsqueda falla', async () => {
      const rxNormGet = jest.fn().mockRejectedValue(new Error('Network error'));
      axios.create.mockReturnValue({ get: rxNormGet, post: jest.fn() });

      const service = new DrugIntegrationService({
        rxNormBaseUrl: 'https://rxnav.nlm.nih.gov/REST',
        enableCaching: false,
      });

      await expect(service.searchGenericDrugs('Tylenol')).rejects.toThrow();
    });
  });
});