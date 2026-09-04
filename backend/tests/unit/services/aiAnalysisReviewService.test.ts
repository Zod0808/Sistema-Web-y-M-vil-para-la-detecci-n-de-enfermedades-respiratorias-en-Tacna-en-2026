/**
 * Unit tests for AIAnalysisReviewService (RF-007: Panel del doctor)
 *
 * Cierra el gap documentado en Documentation/pruebas/Catalogo_de_Pruebas_RespiCare.xlsx (CP-007):
 * previamente solo existía AIAnalysis.test.ts (modelo), sin prueba del servicio de revisión.
 */

import { aiAnalysisReviewService } from '../../../src/services/aiAnalysisReviewService';
import AIAnalysisModel from '../../../src/models/AIAnalysis';
import UserModel from '../../../src/models/User';
import { alertService } from '../../../src/services/alertService';

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: {
    createAlert: jest.fn(),
  },
}));

jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('../../../src/models/AIAnalysis', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
  },
}));

const buildDoctor = (overrides: Partial<any> = {}) => ({
  _id: 'doctor-1',
  name: 'Dra. Ana Pérez',
  role: 'doctor',
  ...overrides,
});

const buildAnalysis = (overrides: Partial<any> = {}) => ({
  _id: 'analysis-1',
  patientId: 'patient-1',
  urgency: 'high',
  review: undefined as any,
  approve: jest.fn().mockResolvedValue(undefined),
  reject: jest.fn().mockResolvedValue(undefined),
  adjust: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('aiAnalysisReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listPendingReview', () => {
    it('lista análisis pendientes con paginación por defecto', async () => {
      const analyses = [buildAnalysis()];
      const sort = jest.fn().mockReturnThis();
      const skip = jest.fn().mockReturnThis();
      const limit = jest.fn().mockResolvedValue(analyses);
      (AIAnalysisModel.find as jest.Mock).mockReturnValue({ sort, skip, limit });
      (AIAnalysisModel.countDocuments as jest.Mock).mockResolvedValue(1);

      const result = await aiAnalysisReviewService.listPendingReview();

      expect(AIAnalysisModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [{ review: { $exists: false } }, { 'review.status': 'pending' }],
        })
      );
      expect(skip).toHaveBeenCalledWith(0);
      expect(limit).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        analyses,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('aplica filtros de patientId y urgency, y calcula el skip según la página', async () => {
      const sort = jest.fn().mockReturnThis();
      const skip = jest.fn().mockReturnThis();
      const limit = jest.fn().mockResolvedValue([]);
      (AIAnalysisModel.find as jest.Mock).mockReturnValue({ sort, skip, limit });
      (AIAnalysisModel.countDocuments as jest.Mock).mockResolvedValue(0);

      await aiAnalysisReviewService.listPendingReview({
        patientId: 'patient-9',
        urgency: 'critical',
        page: 3,
        limit: 5,
      });

      expect(AIAnalysisModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'patient-9', urgency: 'critical' })
      );
      expect(skip).toHaveBeenCalledWith(10); // (page 3 - 1) * limit 5
      expect(limit).toHaveBeenCalledWith(5);
    });
  });

  describe('getById', () => {
    it('retorna el análisis cuando existe', async () => {
      const analysis = buildAnalysis();
      (AIAnalysisModel.findById as jest.Mock).mockResolvedValue(analysis);

      const result = await aiAnalysisReviewService.getById('analysis-1');

      expect(result).toBe(analysis);
    });

    it('lanza AppError 404 cuando el análisis no existe', async () => {
      (AIAnalysisModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(aiAnalysisReviewService.getById('missing')).rejects.toMatchObject({
        message: 'Análisis de IA no encontrado',
        statusCode: 404,
      });
    });
  });

  describe('reviewPrediction', () => {
    const signature = { signatureData: 'firma-base64', signatureMethod: 'digital' as const };

    it('lanza AppError 400 si el médico no existe', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        aiAnalysisReviewService.reviewPrediction('analysis-1', 'approved', 'doctor-x', undefined, signature)
      ).rejects.toMatchObject({
        message: 'El médico revisor no existe o no es válido',
        statusCode: 400,
      });
      expect(AIAnalysisModel.findById).not.toHaveBeenCalled();
    });

    it('lanza AppError 400 si el usuario revisor no tiene rol doctor ni admin', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(buildDoctor({ role: 'patient' }));

      await expect(
        aiAnalysisReviewService.reviewPrediction('analysis-1', 'approved', 'patient-1', undefined, signature)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza AppError 404 si el análisis no existe', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(buildDoctor());
      (AIAnalysisModel.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        aiAnalysisReviewService.reviewPrediction('missing', 'approved', 'doctor-1', undefined, signature)
      ).rejects.toMatchObject({
        message: 'Análisis de IA no encontrado',
        statusCode: 404,
      });
    });

    it('lanza AppError 400 si el análisis ya fue revisado', async () => {
      (UserModel.findById as jest.Mock).mockResolvedValue(buildDoctor());
      const analysis = buildAnalysis({ review: { status: 'approved' } });
      (AIAnalysisModel.findById as jest.Mock).mockResolvedValue(analysis);

      await expect(
        aiAnalysisReviewService.reviewPrediction('analysis-1', 'rejected', 'doctor-1', undefined, signature)
      ).rejects.toMatchObject({
        message: 'Este análisis de IA ya fue revisado',
        statusCode: 400,
      });
    });

    it('aprueba una predicción, dispara alerta al paciente y registra el log', async () => {
      const doctor = buildDoctor();
      const analysis = buildAnalysis();
      (UserModel.findById as jest.Mock).mockResolvedValue(doctor);
      (AIAnalysisModel.findById as jest.Mock).mockResolvedValue(analysis);
      (alertService.createAlert as jest.Mock).mockResolvedValue(undefined);

      const result = await aiAnalysisReviewService.reviewPrediction(
        'analysis-1',
        'approved',
        'doctor-1',
        'Se confirma el diagnóstico',
        signature
      );

      expect(analysis.approve).toHaveBeenCalledWith(
        'doctor-1',
        doctor.name,
        'Se confirma el diagnóstico',
        signature
      );
      expect(analysis.reject).not.toHaveBeenCalled();
      expect(analysis.adjust).not.toHaveBeenCalled();
      expect(alertService.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: analysis.patientId,
          patientId: analysis.patientId,
          doctorId: 'doctor-1',
          category: 'ai_analysis',
          priority: analysis.urgency,
          trigger: expect.objectContaining({
            source: 'ai_analysis_review',
            referenceId: String(analysis._id),
          }),
        })
      );
      expect(result).toBe(analysis);
    });

    it('rechaza una predicción y no permite doble revisión', async () => {
      const doctor = buildDoctor();
      const analysis = buildAnalysis();
      (UserModel.findById as jest.Mock).mockResolvedValue(doctor);
      (AIAnalysisModel.findById as jest.Mock).mockResolvedValue(analysis);

      await aiAnalysisReviewService.reviewPrediction(
        'analysis-1',
        'rejected',
        'doctor-1',
        'No coincide con el cuadro clínico',
        signature
      );

      expect(analysis.reject).toHaveBeenCalledWith(
        'doctor-1',
        doctor.name,
        'No coincide con el cuadro clínico',
        signature
      );
      expect(analysis.approve).not.toHaveBeenCalled();
    });

    it('ajusta una predicción con diagnóstico/urgencia corregidos por el médico', async () => {
      const doctor = buildDoctor();
      const analysis = buildAnalysis();
      (UserModel.findById as jest.Mock).mockResolvedValue(doctor);
      (AIAnalysisModel.findById as jest.Mock).mockResolvedValue(analysis);

      await aiAnalysisReviewService.reviewPrediction(
        'analysis-1',
        'adjusted',
        'doctor-1',
        'Ajuste de severidad',
        signature,
        { adjustedDiagnosis: 'Neumonía leve', adjustedUrgency: 'medium' }
      );

      expect(analysis.adjust).toHaveBeenCalledWith(
        'doctor-1',
        doctor.name,
        { adjustedDiagnosis: 'Neumonía leve', adjustedUrgency: 'medium', comments: 'Ajuste de severidad' },
        signature
      );
    });

    it('permite que un usuario con rol admin revise la predicción', async () => {
      const admin = buildDoctor({ role: 'admin', name: 'Admin RespiCare' });
      const analysis = buildAnalysis();
      (UserModel.findById as jest.Mock).mockResolvedValue(admin);
      (AIAnalysisModel.findById as jest.Mock).mockResolvedValue(analysis);

      await aiAnalysisReviewService.reviewPrediction('analysis-1', 'approved', 'admin-1', undefined, signature);

      expect(analysis.approve).toHaveBeenCalledWith('admin-1', admin.name, undefined, signature);
    });

    it('no crea alerta si el análisis no tiene patientId asociado', async () => {
      const doctor = buildDoctor();
      const analysis = buildAnalysis({ patientId: undefined });
      (UserModel.findById as jest.Mock).mockResolvedValue(doctor);
      (AIAnalysisModel.findById as jest.Mock).mockResolvedValue(analysis);

      await aiAnalysisReviewService.reviewPrediction('analysis-1', 'approved', 'doctor-1', undefined, signature);

      expect(alertService.createAlert).not.toHaveBeenCalled();
    });
  });
});
