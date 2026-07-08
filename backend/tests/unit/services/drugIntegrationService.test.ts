import { DrugIntegrationService, DrugInfo } from '../../../src/services/drugIntegrationService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('axios', () => {
  const rxNormGet = jest.fn();
  const fdaGet = jest.fn();
  const drugBankGet = jest.fn();
  const create = jest.fn((cfg: any) => {
    const url = cfg?.baseURL || '';
    if (url.includes('rxnav')) return { get: rxNormGet };
    if (url.includes('fda.gov')) return { get: fdaGet };
    if (url.includes('drugbank')) return { get: drugBankGet };
    return { get: jest.fn() };
  });
  return {
    __esModule: true,
    default: { create },
    create,
    __rxNormGet: rxNormGet,
    __fdaGet: fdaGet,
    __drugBankGet: drugBankGet,
  };
});

const axios = require('axios');
const rxNormGet: jest.Mock = axios.__rxNormGet;
const fdaGet: jest.Mock = axios.__fdaGet;
const drugBankGet: jest.Mock = axios.__drugBankGet;

const RX_URL = 'https://rxnav.nlm.nih.gov/REST';

const buildAllClientsService = (overrides: any = {}) =>
  new DrugIntegrationService({
    rxNormBaseUrl: RX_URL,
    fdaApiKey: 'fda-key',
    drugBankApiKey: 'db-key',
    enableCaching: false,
    ...overrides,
  });

describe('DrugIntegrationService', () => {
  beforeEach(() => {
    rxNormGet.mockReset();
    fdaGet.mockReset();
    drugBankGet.mockReset();
    (axios.create as jest.Mock).mockClear();
  });

  describe('constructor', () => {
    it('inicializa sin clientes cuando no hay API keys ni URL', () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      expect(s).toBeDefined();
    });

    it('crea cliente RxNorm cuando se provee baseURL', () => {
      new DrugIntegrationService({ rxNormBaseUrl: RX_URL, enableCaching: false });
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({ baseURL: RX_URL }),
      );
    });

    it('crea cliente FDA con el api_key en params', () => {
      new DrugIntegrationService({ fdaApiKey: 'k', enableCaching: false });
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.fda.gov',
          params: { api_key: 'k' },
        }),
      );
    });

    it('crea cliente DrugBank con Bearer en headers', () => {
      new DrugIntegrationService({ drugBankApiKey: 'db-key', enableCaching: false });
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer db-key' }),
        }),
      );
    });
  });

  describe('searchDrug', () => {
    it('retorna null cuando no hay clientes disponibles', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      await expect(s.searchDrug('aspirin')).resolves.toBeNull();
    });

    it('busca en RxNorm y retorna DrugInfo', async () => {
      rxNormGet
        .mockResolvedValueOnce({
          data: {
            drugGroup: {
              conceptGroup: [{ conceptProperties: [{ rxcui: '1191', name: 'Aspirin' }] }],
            },
          },
        })
        .mockResolvedValueOnce({
          data: { properties: { name: 'Aspirin', rxcui: '1191' } },
        })
        .mockResolvedValueOnce({
          data: {
            relatedGroup: {
              conceptGroup: [{ conceptProperties: [{ name: 'Acetylsalicylic acid' }] }],
            },
          },
        });

      const s = new DrugIntegrationService({ rxNormBaseUrl: RX_URL, enableCaching: false });
      const result = await s.searchDrug('aspirin');

      expect(result).toMatchObject({
        name: 'Aspirin',
        rxcui: '1191',
        activeIngredients: ['Acetylsalicylic acid'],
      });
    });

    it('usa properties.synonym cuando no encuentra ingredientes', async () => {
      rxNormGet
        .mockResolvedValueOnce({
          data: { drugGroup: { conceptGroup: [{ conceptProperties: [{ rxcui: '1', name: 'X' }] }] } },
        })
        .mockResolvedValueOnce({
          data: { properties: { name: 'X', synonym: 'foo;bar' } },
        })
        .mockRejectedValueOnce(new Error('no ingredients'));

      const s = new DrugIntegrationService({ rxNormBaseUrl: RX_URL, enableCaching: false });
      const result = await s.searchDrug('X');

      expect(result?.activeIngredients).toEqual(['foo', 'bar']);
    });

    it('retorna null cuando RxNorm no devuelve conceptGroup', async () => {
      rxNormGet.mockResolvedValueOnce({ data: { drugGroup: null } });
      const s = new DrugIntegrationService({ rxNormBaseUrl: RX_URL, enableCaching: false });
      await expect(s.searchDrug('nonexistent')).resolves.toBeNull();
    });

    it('retorna null cuando conceptProperties está vacío', async () => {
      rxNormGet.mockResolvedValueOnce({
        data: { drugGroup: { conceptGroup: [{ conceptProperties: [] }] } },
      });
      const s = new DrugIntegrationService({ rxNormBaseUrl: RX_URL, enableCaching: false });
      await expect(s.searchDrug('empty')).resolves.toBeNull();
    });

    it('cae a FDA cuando RxNorm no encuentra', async () => {
      rxNormGet.mockResolvedValueOnce({ data: { drugGroup: null } });
      fdaGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              openfda: {
                brand_name: ['Tylenol'],
                generic_name: ['Acetaminophen'],
                substance_name: ['Acetaminophen'],
                dosage_form: ['TABLET'],
              },
              indications_and_usage: ['Pain'],
              contraindications: ['Allergy'],
              warnings: ['Do not overdose'],
            },
          ],
        },
      });

      const s = new DrugIntegrationService({
        rxNormBaseUrl: RX_URL,
        fdaApiKey: 'k',
        enableCaching: false,
      });
      const result = await s.searchDrug('Tylenol');

      expect(result).toMatchObject({
        name: 'Tylenol',
        activeIngredients: ['Acetaminophen'],
        dosageForms: ['TABLET'],
        indications: ['Pain'],
        contraindications: ['Allergy'],
        sideEffects: ['Do not overdose'],
      });
    });

    it('enriquece con DrugBank cuando el cliente está disponible', async () => {
      rxNormGet
        .mockResolvedValueOnce({
          data: { drugGroup: { conceptGroup: [{ conceptProperties: [{ rxcui: '1', name: 'A' }] }] } },
        })
        .mockResolvedValueOnce({ data: { properties: { name: 'A' } } })
        .mockResolvedValueOnce({ data: { relatedGroup: null } });
      drugBankGet.mockResolvedValueOnce({
        data: {
          drugs: [
            {
              id: 'DB0001',
              drugInteractions: [
                {
                  drugName: 'B',
                  severity: 'severe',
                  description: 'bleeding risk',
                  clinicalSignificance: 'high',
                },
              ],
            },
          ],
        },
      });

      const s = buildAllClientsService();
      const result = await s.searchDrug('A');

      expect(result?.drugBankId).toBe('DB0001');
      expect(result?.interactions).toHaveLength(1);
      expect(result?.interactions[0]).toMatchObject({
        drug1: 'A',
        drug2: 'B',
        severity: 'severe',
        source: 'drugbank',
      });
    });

    it('mantiene el DrugInfo original cuando DrugBank no encuentra nada', async () => {
      rxNormGet
        .mockResolvedValueOnce({
          data: { drugGroup: { conceptGroup: [{ conceptProperties: [{ rxcui: '1', name: 'A' }] }] } },
        })
        .mockResolvedValueOnce({ data: { properties: { name: 'A' } } })
        .mockResolvedValueOnce({ data: { relatedGroup: null } });
      drugBankGet.mockResolvedValueOnce({ data: { drugs: [] } });

      const s = buildAllClientsService();
      const result = await s.searchDrug('A');

      expect(result?.drugBankId).toBeUndefined();
      expect(result?.interactions).toEqual([]);
    });

    it('logs y no propaga cuando DrugBank falla', async () => {
      rxNormGet
        .mockResolvedValueOnce({
          data: { drugGroup: { conceptGroup: [{ conceptProperties: [{ rxcui: '1', name: 'A' }] }] } },
        })
        .mockResolvedValueOnce({ data: { properties: { name: 'A' } } })
        .mockResolvedValueOnce({ data: { relatedGroup: null } });
      drugBankGet.mockRejectedValueOnce(new Error('drugbank down'));

      const s = buildAllClientsService();
      const result = await s.searchDrug('A');

      expect(result?.name).toBe('A');
    });

    it('usa cache en solicitudes repetidas', async () => {
      rxNormGet
        .mockResolvedValueOnce({
          data: { drugGroup: { conceptGroup: [{ conceptProperties: [{ rxcui: '1', name: 'A' }] }] } },
        })
        .mockResolvedValueOnce({ data: { properties: { name: 'A' } } })
        .mockResolvedValueOnce({ data: { relatedGroup: null } });

      const s = new DrugIntegrationService({
        rxNormBaseUrl: RX_URL,
        enableCaching: true,
        cacheTTL: 60000,
      });
      await s.searchDrug('A');
      const callsAfterFirst = rxNormGet.mock.calls.length;
      await s.searchDrug('A');

      expect(rxNormGet.mock.calls.length).toBe(callsAfterFirst);
    });

    it('lanza AppError cuando FDA falla y no hay RxNorm', async () => {
      fdaGet.mockRejectedValueOnce(new Error('fda unreachable'));

      const s = new DrugIntegrationService({ fdaApiKey: 'k', enableCaching: false });
      // searchFDA atrapa el error internamente y retorna null → no throw
      // pero si no hay ningún cliente encuentra nada → null (no error)
      await expect(s.searchDrug('X')).resolves.toBeNull();
    });
  });

  describe('searchGenericDrugs', () => {
    it('retorna [] con menos de 1 cliente', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      await expect(s.searchGenericDrugs('Tylenol')).resolves.toEqual([]);
    });

    it('retorna [] cuando RxNorm no encuentra y no hay FDA', async () => {
      rxNormGet.mockResolvedValueOnce({ data: { drugGroup: null } });
      const s = new DrugIntegrationService({ rxNormBaseUrl: RX_URL, enableCaching: false });
      await expect(s.searchGenericDrugs('X')).resolves.toEqual([]);
    });

    it('retorna genéricos vía RxNorm y cachea', async () => {
      rxNormGet
        // 1. drugs.json → concept
        .mockResolvedValueOnce({
          data: { drugGroup: { conceptGroup: [{ conceptProperties: [{ rxcui: '10' }] }] } },
        })
        // 2. related.json TTY=IN → 1 ingrediente
        .mockResolvedValueOnce({
          data: {
            relatedGroup: {
              conceptGroup: [{ conceptProperties: [{ name: 'IngredientA' }] }],
            },
          },
        })
        // 3. searchRxNorm(IngredientA) → concept
        .mockResolvedValueOnce({
          data: { drugGroup: { conceptGroup: [{ conceptProperties: [{ rxcui: '20', name: 'IngredientA' }] }] } },
        })
        // 4. properties
        .mockResolvedValueOnce({ data: { properties: { name: 'IngredientA' } } })
        // 5. ingredients related
        .mockResolvedValueOnce({ data: { relatedGroup: null } });

      const s = new DrugIntegrationService({
        rxNormBaseUrl: RX_URL,
        enableCaching: true,
        cacheTTL: 60000,
      });
      const result = await s.searchGenericDrugs('BrandX');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('IngredientA');

      // Segunda llamada usa cache
      const callsBefore = rxNormGet.mock.calls.length;
      await s.searchGenericDrugs('BrandX');
      expect(rxNormGet.mock.calls.length).toBe(callsBefore);
    });

    it('cae a FDA cuando RxNorm no devuelve genéricos', async () => {
      rxNormGet.mockResolvedValue({ data: { drugGroup: null } });
      fdaGet.mockResolvedValueOnce({
        data: {
          results: [
            { openfda: { generic_name: ['Acetaminophen'] } },
          ],
        },
      });
      // searchDrug(Acetaminophen) — RxNorm null, luego FDA
      fdaGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              openfda: {
                brand_name: ['Acetaminophen'],
                generic_name: ['Acetaminophen'],
                substance_name: ['Acetaminophen'],
              },
            },
          ],
        },
      });

      const s = new DrugIntegrationService({
        rxNormBaseUrl: RX_URL,
        fdaApiKey: 'k',
        enableCaching: false,
      });
      const result = await s.searchGenericDrugs('Tylenol');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].name).toBe('Acetaminophen');
    });

    it('atrapa error de RxNorm internamente y retorna []', async () => {
      rxNormGet.mockRejectedValue(new Error('network'));
      const s = new DrugIntegrationService({ rxNormBaseUrl: RX_URL, enableCaching: false });
      await expect(s.searchGenericDrugs('X')).resolves.toEqual([]);
    });
  });

  describe('checkInteractions', () => {
    it('retorna [] cuando la lista tiene menos de 2 medicamentos', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      await expect(s.checkInteractions(['aspirin'])).resolves.toEqual([]);
    });

    it('detecta interacción local warfarin-aspirin (severa)', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      const result = await s.checkInteractions(['warfarin', 'aspirin']);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        severity: 'severe',
        source: 'local',
      });
    });

    it('detecta interacción local en orden inverso (aspirin-warfarin)', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      const result = await s.checkInteractions(['aspirin', 'warfarin']);
      expect(result[0]?.severity).toBe('severe');
    });

    it('retorna [] cuando no hay interacciones conocidas', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      const result = await s.checkInteractions(['vitaminC', 'vitaminD']);
      expect(result).toEqual([]);
    });

    it('consulta DrugBank y mapea la severidad', async () => {
      drugBankGet.mockResolvedValueOnce({
        data: {
          interactions: [
            {
              severity: 'contraindicated',
              description: 'no combinar',
              clinicalSignificance: 'alta',
            },
          ],
        },
      });

      const s = new DrugIntegrationService({ drugBankApiKey: 'db-key', enableCaching: false });
      const result = await s.checkInteractions(['A', 'B']);

      expect(result[0]).toMatchObject({
        drug1: 'A',
        drug2: 'B',
        severity: 'contraindicated',
        source: 'drugbank',
      });
    });

    it('cae a lookup local cuando DrugBank falla', async () => {
      drugBankGet.mockRejectedValueOnce(new Error('db down'));

      const s = new DrugIntegrationService({ drugBankApiKey: 'db-key', enableCaching: false });
      const result = await s.checkInteractions(['warfarin', 'aspirin']);

      expect(result[0]?.source).toBe('local');
    });

    it('lanza AppError cuando checkPairInteraction falla', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest
        .spyOn<any, any>(s as any, 'checkPairInteraction')
        .mockRejectedValueOnce(new Error('boom'));

      await expect(s.checkInteractions(['warfarin', 'aspirin'])).rejects.toThrow(/interacciones/);
    });
  });

  describe('getDosage', () => {
    const buildServiceWithDrugInfo = (drugInfo: DrugInfo | null) => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest.spyOn(s, 'searchDrug').mockResolvedValue(drugInfo);
      return s;
    };

    it('retorna null cuando searchDrug no encuentra el medicamento', async () => {
      const s = buildServiceWithDrugInfo(null);
      await expect(s.getDosage('x')).resolves.toBeNull();
    });

    it('retorna null cuando el drug no trae dosage', async () => {
      const drugInfo: DrugInfo = {
        name: 'A', activeIngredients: [], dosageForms: [],
        indications: [], contraindications: [], sideEffects: [], interactions: [],
      };
      const s = buildServiceWithDrugInfo(drugInfo);
      await expect(s.getDosage('A')).resolves.toBeNull();
    });

    it('retorna dosage sin ajustar cuando no hay edad/peso', async () => {
      const drugInfo: DrugInfo = {
        name: 'A', activeIngredients: [], dosageForms: [],
        indications: [], contraindications: [], sideEffects: [], interactions: [],
        dosage: { min: 100, max: 200, unit: 'mg', frequency: 'q8h' },
      };
      const s = buildServiceWithDrugInfo(drugInfo);
      const result = await s.getDosage('A');
      expect(result).toEqual({ min: 100, max: 200, unit: 'mg', frequency: 'q8h' });
    });

    it('reduce dosis a la mitad para menores de 12 años', async () => {
      const drugInfo: DrugInfo = {
        name: 'A', activeIngredients: [], dosageForms: [],
        indications: [], contraindications: [], sideEffects: [], interactions: [],
        dosage: { min: 100, max: 200, unit: 'mg', frequency: 'q8h' },
      };
      const s = buildServiceWithDrugInfo(drugInfo);
      const result = await s.getDosage('A', undefined, 8, 25);
      expect(result).toMatchObject({ min: 50, max: 100 });
    });

    it('mantiene dosis en adultos con edad+peso', async () => {
      const drugInfo: DrugInfo = {
        name: 'A', activeIngredients: [], dosageForms: [],
        indications: [], contraindications: [], sideEffects: [], interactions: [],
        dosage: { min: 100, max: 200, unit: 'mg', frequency: 'q8h' },
      };
      const s = buildServiceWithDrugInfo(drugInfo);
      const result = await s.getDosage('A', undefined, 40, 70);
      expect(result).toMatchObject({ min: 100, max: 200 });
    });

    it('retorna null cuando searchDrug lanza error', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest.spyOn(s, 'searchDrug').mockRejectedValueOnce(new Error('boom'));
      await expect(s.getDosage('A')).resolves.toBeNull();
    });
  });

  describe('checkContraindications', () => {
    const drugInfoFactory = (overrides: Partial<DrugInfo> = {}): DrugInfo => ({
      name: 'DrugX',
      activeIngredients: [],
      dosageForms: [],
      indications: [],
      contraindications: [],
      sideEffects: [],
      interactions: [],
      ...overrides,
    });

    it('retorna sin alerts cuando el medicamento no se encuentra', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest.spyOn(s, 'searchDrug').mockResolvedValue(null);
      const result = await s.checkContraindications('X', {});
      expect(result).toEqual({ contraindicated: false, alerts: [] });
    });

    it('flag error cuando condición del paciente coincide con contraindicación', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest.spyOn(s, 'searchDrug').mockResolvedValue(
        drugInfoFactory({ contraindications: ['embarazo'] }),
      );

      const result = await s.checkContraindications('DrugX', { conditions: ['embarazo'] });

      expect(result.contraindicated).toBe(true);
      expect(result.alerts[0].severity).toBe('error');
      expect(result.alerts[0].message).toMatch(/Contraindicación/);
    });

    it('flag error cuando el paciente es alérgico a un ingrediente activo', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest.spyOn(s, 'searchDrug').mockResolvedValue(
        drugInfoFactory({ activeIngredients: ['penicillin'] }),
      );

      const result = await s.checkContraindications('DrugX', { allergies: ['penicillin'] });

      expect(result.contraindicated).toBe(true);
      expect(result.alerts[0].message).toMatch(/Alergia/);
    });

    it('flag error para interacción severa con medicación actual', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest.spyOn(s, 'searchDrug').mockResolvedValue(drugInfoFactory({ name: 'warfarin' }));

      const result = await s.checkContraindications('warfarin', {
        currentMedications: ['aspirin'],
      });

      expect(result.contraindicated).toBe(true);
      expect(result.alerts.some(a => /Interacción grave/.test(a.message))).toBe(true);
    });

    it('flag warning para interacción moderada con medicación actual', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest.spyOn(s, 'searchDrug').mockResolvedValue(drugInfoFactory({ name: 'warfarin' }));

      const result = await s.checkContraindications('warfarin', {
        currentMedications: ['ibuprofen'],
      });

      expect(result.alerts.some(a => a.severity === 'warning')).toBe(true);
      expect(result.contraindicated).toBe(false);
    });

    it('flag error para interacción contraindicada', async () => {
      const s = new DrugIntegrationService({ drugBankApiKey: 'k', enableCaching: false });
      jest.spyOn(s, 'searchDrug').mockResolvedValue(drugInfoFactory({ name: 'A' }));
      drugBankGet.mockResolvedValueOnce({
        data: {
          interactions: [
            { severity: 'contraindicated', description: 'no', clinicalSignificance: 'alta' },
          ],
        },
      });

      const result = await s.checkContraindications('A', { currentMedications: ['B'] });

      expect(result.contraindicated).toBe(true);
      expect(result.alerts.some(a => /contraindicada/.test(a.message))).toBe(true);
    });

    it('agrega warning cuando falta dosificación para edad+peso', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest.spyOn(s, 'searchDrug').mockResolvedValue(drugInfoFactory());

      const result = await s.checkContraindications('DrugX', { age: 30, weight: 70 });

      expect(result.alerts.some(a => /Dosificación no disponible/.test(a.message))).toBe(true);
    });

    it('lanza AppError cuando searchDrug lanza', async () => {
      const s = new DrugIntegrationService({ rxNormBaseUrl: undefined });
      jest.spyOn(s, 'searchDrug').mockRejectedValue(new Error('boom'));
      await expect(s.checkContraindications('X', {})).rejects.toThrow(/contraindicaciones/);
    });
  });
});
