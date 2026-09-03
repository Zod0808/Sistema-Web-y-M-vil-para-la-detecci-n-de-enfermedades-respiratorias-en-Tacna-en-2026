import mongoose from 'mongoose';
import EducationalContentModel from '../../../src/models/EducationalContent';

const buildContentData = (overrides: Partial<Record<string, any>> = {}) => ({
  title: 'Contenido de prueba',
  summary: 'Resumen de prueba',
  content: 'Cuerpo del contenido educativo de prueba',
  category: 'asma',
  ...overrides,
});

describe('EducationalContent model', () => {
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones de campos requeridos', () => {
    it('crea contenido válido con valores por defecto', async () => {
      const content = await EducationalContentModel.create(buildContentData());

      expect(content._id).toBeDefined();
      expect(content.isActive).toBe(true);
      expect(content.viewCount).toBe(0);
      expect(content.targetConditions).toEqual([]);
    });

    it('falla sin título', async () => {
      const data = buildContentData({ title: undefined });
      await expect(EducationalContentModel.create(data)).rejects.toThrow();
    });

    it('falla con categoría inválida', async () => {
      const data = buildContentData({ category: 'no-existe' });
      await expect(EducationalContentModel.create(data)).rejects.toThrow();
    });

    it('normaliza targetConditions a minúsculas', async () => {
      const content = await EducationalContentModel.create(
        buildContentData({ targetConditions: ['ASMA', 'Tos Crónica'] })
      );

      expect(content.targetConditions).toEqual(['asma', 'tos crónica']);
    });
  });

  describe('incrementViewCount', () => {
    it('incrementa el contador de vistas', async () => {
      const content = await EducationalContentModel.create(buildContentData());
      await content.incrementViewCount();

      expect(content.viewCount).toBe(1);

      const reloaded = await EducationalContentModel.findById(content._id);
      expect(reloaded?.viewCount).toBe(1);
    });
  });

  describe('findRelevantFor', () => {
    beforeEach(async () => {
      await EducationalContentModel.deleteMany({});
      await EducationalContentModel.create([
        buildContentData({ title: 'General', targetConditions: [] }),
        buildContentData({ title: 'Asma', category: 'asma', targetConditions: ['asma'] }),
        buildContentData({
          title: 'EPOC mayores',
          category: 'epoc',
          targetConditions: ['epoc'],
          targetAgeRange: { min: 40 },
        }),
        buildContentData({
          title: 'Inactivo',
          category: 'asma',
          targetConditions: ['asma'],
          isActive: false,
        }),
      ]);
    });

    it('retorna solo contenido general cuando no hay condiciones (sin historial, flujo alterno 3a)', async () => {
      const results = await EducationalContentModel.findRelevantFor({ conditions: [] });
      const titles = results.map((item) => item.title);

      expect(titles).toContain('General');
      expect(titles).not.toContain('Asma');
      expect(titles).not.toContain('EPOC mayores');
    });

    it('retorna contenido general + el relacionado a las condiciones del paciente', async () => {
      const results = await EducationalContentModel.findRelevantFor({ conditions: ['asma'] });
      const titles = results.map((item) => item.title);

      expect(titles).toEqual(expect.arrayContaining(['General', 'Asma']));
      expect(titles).not.toContain('EPOC mayores');
    });

    it('excluye contenido cuyo rango de edad no aplica', async () => {
      const results = await EducationalContentModel.findRelevantFor({ conditions: ['epoc'], age: 25 });
      const titles = results.map((item) => item.title);

      expect(titles).not.toContain('EPOC mayores');
    });

    it('incluye contenido con rango de edad aplicable', async () => {
      const results = await EducationalContentModel.findRelevantFor({ conditions: ['epoc'], age: 55 });
      const titles = results.map((item) => item.title);

      expect(titles).toContain('EPOC mayores');
    });

    it('nunca retorna contenido inactivo', async () => {
      const results = await EducationalContentModel.findRelevantFor({ conditions: ['asma'] });
      const titles = results.map((item) => item.title);

      expect(titles).not.toContain('Inactivo');
    });
  });
});
