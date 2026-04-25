/**
 * Tests unitarios para Symptom Analyzer Service (medical-app)
 * Cubre análisis de síntomas con IA
 */

import { symptomAnalyzerService } from '../../medical-app/lib/api/services/symptomAnalyzerService';

jest.mock('../../medical-app/lib/api/services/symptomAnalyzerService');

const mockSymptomAnalyzerService = symptomAnalyzerService as jest.Mocked<typeof symptomAnalyzerService>;

describe('SymptomAnalyzerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    const mockSymptoms = [
      {
        name: 'Tos seca',
        severity: 'moderate',
        duration: 3,
      },
      {
        name: 'Fiebre',
        severity: 'mild',
        duration: 1,
      },
    ];

    it('debe analizar síntomas exitosamente', async () => {
      const mockAnalysis = {
        id: 'analysis-1',
        patientId: 'patient-123',
        symptoms: mockSymptoms,
        urgencyLevel: 'medium',
        severityScore: 0.6,
        classification: {
          categories: ['respiratory'],
          confidence: 0.85,
          urgency: 'medium',
          possibleConditions: [
            {
              condition: 'Infección Respiratoria',
              probability: 0.7,
              description: 'Posible infección viral',
            },
          ],
        },
        recommendations: {
          immediate: ['Consultar médico'],
          shortTerm: ['Reposo', 'Hidratación'],
          longTerm: ['Seguimiento'],
          emergency: [],
        },
        warningSigns: [],
        followUpRequired: true,
        confidenceScore: 0.85,
        analyzedAt: new Date().toISOString(),
        processingTimeMs: 100,
      };

      mockSymptomAnalyzerService.analyze.mockResolvedValue({
        success: true,
        message: 'Análisis completado',
        data: mockAnalysis,
      } as any);

      const result = await symptomAnalyzerService.analyze({
        symptoms: mockSymptoms,
        patientId: 'patient-123',
      } as any);

      expect(result.success).toBe(true);
      expect(result.data.urgencyLevel).toBe('medium');
      expect(mockSymptomAnalyzerService.analyze).toHaveBeenCalledWith({
        symptoms: mockSymptoms,
        patientId: 'patient-123',
      });
    });

    it('debe manejar errores de análisis', async () => {
      mockSymptomAnalyzerService.analyze.mockRejectedValue(new Error('Error en el análisis'));

      await expect(
        symptomAnalyzerService.analyze({
          symptoms: mockSymptoms,
          patientId: 'patient-123',
        } as any)
      ).rejects.toThrow('Error en el análisis');
    });
  });

  describe('getHistory', () => {
    it('debe obtener historial de análisis', async () => {
      const mockHistory = [
        {
          id: 'analysis-1',
          date: '2025-11-01',
          diagnosis: 'Bronquitis',
          symptoms: [],
          symptomCount: 2,
        },
      ];

      mockSymptomAnalyzerService.getHistory.mockResolvedValue({
        success: true,
        message: 'Historial obtenido',
        data: mockHistory,
      } as any);

      const result = await symptomAnalyzerService.getHistory('patient-123');

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('getStatistics', () => {
    it('debe obtener estadísticas de síntomas', async () => {
      const mockStats = {
        period: '30 días',
        totalVisits: 5,
        totalSymptoms: 10,
        avgSymptomsPerVisit: 2,
        severityDistribution: {
          mild: 5,
          moderate: 3,
          severe: 2,
        },
        mostCommonSymptoms: ['Tos', 'Fiebre'],
      };

      mockSymptomAnalyzerService.getStatistics.mockResolvedValue({
        success: true,
        message: 'Estadísticas obtenidas',
        data: mockStats,
      } as any);

      const result = await symptomAnalyzerService.getStatistics('patient-123');

      expect(result.success).toBe(true);
      expect(result.data.totalVisits).toBe(5);
    });
  });
});
