import drugInteractionService, { drugInteractionService as namedExport } from '../../../src/services/drugInteractionService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/config/config', () => ({
  config: {
    integrations: {
      drugInteractions: { url: 'http://drug-api.test', apiKey: 'test-key' },
    },
  },
}));

const mockPost = jest.fn();
jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({ post: mockPost }),
}));

const axios = require('axios');

describe('drugInteractionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the client so it's recreated with the mock
    (drugInteractionService as any).client = null;
  });

  describe('checkInteractions', () => {
    it('retorna interacciones detectadas por la API', async () => {
      mockPost.mockResolvedValue({
        data: {
          interactions: [
            {
              medicationA: 'Warfarina',
              medicationB: 'Aspirina',
              severity: 'high',
              description: 'Riesgo aumentado de sangrado',
              source: 'DrugBank',
            },
          ],
        },
      });

      const result = await drugInteractionService.checkInteractions({
        medications: [{ name: 'Warfarina' }, { name: 'Aspirina' }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].medicationA).toBe('Warfarina');
      expect(result[0].medicationB).toBe('Aspirina');
      expect(result[0].severity).toBe('high');
    });

    it('retorna [] cuando no hay interacciones', async () => {
      mockPost.mockResolvedValue({ data: { interactions: [] } });

      const result = await drugInteractionService.checkInteractions({
        medications: [{ name: 'Paracetamol' }],
      });

      expect(result).toEqual([]);
    });

    it('retorna [] cuando la respuesta no tiene el campo interactions', async () => {
      mockPost.mockResolvedValue({ data: {} });

      const result = await drugInteractionService.checkInteractions({
        medications: [{ name: 'Ibuprofeno' }],
      });

      expect(result).toEqual([]);
    });

    it('retorna [] cuando la API falla (fail-open)', async () => {
      mockPost.mockRejectedValue(new Error('API timeout'));

      const result = await drugInteractionService.checkInteractions({
        medications: [{ name: 'Metformina' }, { name: 'Insulina' }],
      });

      expect(result).toEqual([]);
    });

    it('usa valores por defecto para campos faltantes en interacciones', async () => {
      mockPost.mockResolvedValue({
        data: {
          interactions: [{ severity: undefined, description: 'Interacción desconocida' }],
        },
      });

      const result = await drugInteractionService.checkInteractions({
        medications: [{ name: 'MedA' }, { name: 'MedB' }],
      });

      expect(result[0].medicationA).toBe('desconocido');
      expect(result[0].medicationB).toBe('desconocido');
      expect(result[0].severity).toBe('moderate');
    });

    it('retorna [] cuando la URL no está configurada', async () => {
      const { config } = require('../../../src/config/config');
      const originalUrl = config.integrations.drugInteractions.url;
      config.integrations.drugInteractions.url = '';
      (drugInteractionService as any).client = null;
      (drugInteractionService as any).apiUrl = '';

      const result = await drugInteractionService.checkInteractions({
        medications: [{ name: 'MedA' }],
      });

      expect(result).toEqual([]);

      // Restore
      config.integrations.drugInteractions.url = originalUrl;
    });
  });

  describe('evaluateDosage', () => {
    it('retorna dosificación recomendada de la API', async () => {
      mockPost.mockResolvedValue({
        data: {
          recommended: '500mg cada 8h',
          rationale: 'Ajuste por función renal',
        },
      });

      const result = await drugInteractionService.evaluateDosage(
        { name: 'Amoxicilina', dosage: '500mg' },
        { renalImpairment: true }
      );

      expect(result.recommended).toBe('500mg cada 8h');
      expect(result.rationale).toBe('Ajuste por función renal');
    });

    it('retorna dosis original cuando la API falla', async () => {
      mockPost.mockRejectedValue(new Error('API error'));

      const result = await drugInteractionService.evaluateDosage(
        { name: 'Metformina', dosage: '850mg' }
      );

      expect(result.recommended).toBe('850mg');
      expect(result.rationale).toContain('original');
    });

    it('retorna dosis original cuando la respuesta no tiene recommended', async () => {
      mockPost.mockResolvedValue({ data: {} });

      const result = await drugInteractionService.evaluateDosage(
        { name: 'Atorvastatina', dosage: '20mg' }
      );

      expect(result.recommended).toBe('20mg');
    });

    it('asigna rationale por defecto cuando API no lo proporciona', async () => {
      mockPost.mockResolvedValue({
        data: { recommended: '40mg' },
      });

      const result = await drugInteractionService.evaluateDosage(
        { name: 'Atorvastatina', dosage: '20mg' }
      );

      expect(result.rationale).toBe('Recomendación de API externa');
    });
  });
});