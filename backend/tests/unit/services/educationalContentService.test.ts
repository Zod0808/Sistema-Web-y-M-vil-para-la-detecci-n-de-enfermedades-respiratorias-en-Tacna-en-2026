jest.mock('../../../src/models/EducationalContent', () => ({
  __esModule: true,
  default: {
    findRelevantFor: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('../../../src/models/EducationalContentView', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock('../../../src/models/MedicalHistory', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

import educationalContentService from '../../../src/services/educationalContentService';
import EducationalContentModel from '../../../src/models/EducationalContent';
import EducationalContentViewModel from '../../../src/models/EducationalContentView';
import MedicalHistoryModel from '../../../src/models/MedicalHistory';

const mockSort = (resolvedValue: any) => ({
  sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(resolvedValue) }),
});

describe('educationalContentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPersonalizedContent', () => {
    it('lanza error si no hay userId', async () => {
      await expect(educationalContentService.getPersonalizedContent('')).rejects.toThrow(
        'El usuario es obligatorio'
      );
    });

    it('usa perfil vacío cuando el paciente no tiene historial (CU-007, flujo alterno 3a)', async () => {
      (MedicalHistoryModel.findOne as jest.Mock).mockReturnValue(mockSort(null));
      (EducationalContentModel.findRelevantFor as jest.Mock).mockResolvedValue([{ title: 'General' }]);

      const result = await educationalContentService.getPersonalizedContent('user-1');

      expect(EducationalContentModel.findRelevantFor).toHaveBeenCalledWith({ conditions: [] });
      expect(result).toEqual([{ title: 'General' }]);
    });

    it('construye el perfil (condiciones + edad) a partir del historial más reciente', async () => {
      (MedicalHistoryModel.findOne as jest.Mock).mockReturnValue(
        mockSort({
          diagnosis: 'Asma',
          age: 34,
          symptoms: [{ name: 'tos' }, { name: 'sibilancias' }],
        })
      );
      (EducationalContentModel.findRelevantFor as jest.Mock).mockResolvedValue([]);

      await educationalContentService.getPersonalizedContent('user-1');

      expect(MedicalHistoryModel.findOne).toHaveBeenCalledWith({ patientId: 'user-1' });
      expect(EducationalContentModel.findRelevantFor).toHaveBeenCalledWith({
        conditions: ['Asma', 'tos', 'sibilancias'],
        age: 34,
      });
    });
  });

  describe('getContentById', () => {
    it('lanza 404 si el contenido no existe o está inactivo', async () => {
      (EducationalContentModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(educationalContentService.getContentById('content-1', 'user-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('incrementa vistas y registra la consulta en el historial de actividad', async () => {
      const incrementViewCount = jest.fn().mockResolvedValue(undefined);
      const content = { _id: 'content-1', incrementViewCount };
      (EducationalContentModel.findOne as jest.Mock).mockResolvedValue(content);

      const result = await educationalContentService.getContentById('content-1', 'user-1');

      expect(incrementViewCount).toHaveBeenCalled();
      expect(EducationalContentViewModel.create).toHaveBeenCalledWith({
        userId: 'user-1',
        contentId: 'content-1',
      });
      expect(result).toBe(content);
    });
  });

  describe('gestión de contenido (CRUD)', () => {
    it('createContent delega en el modelo', async () => {
      const payload = { title: 't', summary: 's', content: 'c', category: 'general' as const };
      (EducationalContentModel.create as jest.Mock).mockResolvedValue({ ...payload, _id: '1' });

      const result = await educationalContentService.createContent(payload);

      expect(EducationalContentModel.create).toHaveBeenCalledWith(payload);
      expect(result).toMatchObject(payload);
    });

    it('updateContent lanza 404 si no existe', async () => {
      (EducationalContentModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await expect(educationalContentService.updateContent('missing', { title: 'x' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('deleteContent lanza 404 si no existe', async () => {
      (EducationalContentModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(educationalContentService.deleteContent('missing')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
