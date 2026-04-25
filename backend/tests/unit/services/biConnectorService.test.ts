import { biConnectorService } from '../../../src/services/biConnectorService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const buildData = () => [
  { id: '1', patientName: 'Juan', age: 45, score: 0.85, date: new Date('2026-01-01'), password: 'secret', token: 'tok' },
  { id: '2', patientName: 'María', age: 38, score: 0.72, date: new Date('2026-02-01') },
];

describe('BIConnectorService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('exportForPowerBI', () => {
    it('exporta datos en formato JSON por defecto', async () => {
      const result = await biConnectorService.exportForPowerBI(buildData());

      expect(result.format).toBe('json');
      expect(result.data).toHaveLength(2);
    });

    it('exporta datos en formato OData', async () => {
      const result = await biConnectorService.exportForPowerBI(buildData(), { format: 'odata' });

      expect(result.format).toBe('odata');
    });

    it('incluye metadata por defecto', async () => {
      const result = await biConnectorService.exportForPowerBI(buildData());

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.recordCount).toBe(2);
      expect(result.metadata!.columns).toBeInstanceOf(Array);
      expect(result.metadata!.lastUpdated).toBeInstanceOf(Date);
    });

    it('omite metadata cuando includeMetadata=false', async () => {
      const result = await biConnectorService.exportForPowerBI(buildData(), { includeMetadata: false });

      expect(result.metadata).toBeUndefined();
    });

    it('elimina campos sensibles (password, token, secret)', async () => {
      const result = await biConnectorService.exportForPowerBI(buildData());

      result.data.forEach((item: any) => {
        expect(item.password).toBeUndefined();
        expect(item.token).toBeUndefined();
        expect(item.secret).toBeUndefined();
      });
    });

    it('convierte fechas a ISO string', async () => {
      const result = await biConnectorService.exportForPowerBI(buildData());

      expect(typeof result.data[0].date).toBe('string');
      expect(result.data[0].date).toMatch(/^\d{4}-/);
    });

    it('retorna datos vacíos cuando el input es array vacío', async () => {
      const result = await biConnectorService.exportForPowerBI([]);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('exportForTableau', () => {
    it('exporta datos en formato JSON por defecto', async () => {
      const result = await biConnectorService.exportForTableau(buildData());

      expect(result.format).toBe('json');
      expect(result.data).toHaveLength(2);
    });

    it('exporta datos en formato CSV', async () => {
      const result = await biConnectorService.exportForTableau(buildData(), { format: 'csv' });

      expect(result.format).toBe('csv');
    });

    it('incluye metadata por defecto', async () => {
      const result = await biConnectorService.exportForTableau(buildData());

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.recordCount).toBe(2);
    });

    it('elimina campos sensibles', async () => {
      const result = await biConnectorService.exportForTableau(buildData());

      result.data.forEach((item: any) => {
        expect(item.password).toBeUndefined();
        expect(item.token).toBeUndefined();
      });
    });
  });

  describe('exportGeneric', () => {
    it('exporta en formato JSON por defecto', async () => {
      const result = await biConnectorService.exportGeneric(buildData());

      expect(result.format).toBe('json');
      expect(result.data).toHaveLength(2);
    });

    it('exporta en formato CSV', async () => {
      const result = await biConnectorService.exportGeneric(buildData(), 'csv');

      expect(result.format).toBe('csv');
    });

    it('incluye metadata por defecto', async () => {
      const result = await biConnectorService.exportGeneric(buildData());

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.recordCount).toBe(2);
    });

    it('omite metadata cuando includeMetadata=false', async () => {
      const result = await biConnectorService.exportGeneric(buildData(), 'json', false);

      expect(result.metadata).toBeUndefined();
    });

    it('infiere tipos de columnas correctamente', async () => {
      const result = await biConnectorService.exportGeneric(buildData());

      const cols = result.metadata!.columns;
      const ageCol = cols.find((c: any) => c.name === 'age');
      const scoreCol = cols.find((c: any) => c.name === 'score');

      expect(ageCol?.type).toBe('integer');
      expect(scoreCol?.type).toBe('number');
    });
  });
});