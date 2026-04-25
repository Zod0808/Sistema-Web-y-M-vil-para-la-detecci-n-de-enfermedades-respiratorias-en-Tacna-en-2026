import mongoose from 'mongoose';
import AIAnalysis from '../../../src/models/AIAnalysis';

const buildAnalysisData = (overrides: Partial<Record<string, any>> = {}) => ({
  medicalHistoryId: `history-${Math.random().toString(16).slice(2)}`,
  symptoms: [
    {
      name: 'tos',
      severity: 'moderate',
      duration: '3 días',
      description: 'Tos persistente'
    }
  ],
  possibleDiagnoses: [
    {
      condition: 'Influenza',
      probability: 72,
      recommendations: ['Reposo', 'Hidratación']
    },
    {
      condition: 'Resfriado común',
      probability: 40,
      recommendations: ['Vitamina C']
    }
  ],
  urgency: 'high',
  confidence: 78,
  timestamp: new Date('2024-02-01T10:00:00.000Z'),
  ...overrides
});

describe('AIAnalysis model', () => {
  beforeEach(async () => {
    await AIAnalysis.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  it('calcula virtuales correctamente', async () => {
    const analysis = await AIAnalysis.create(
      buildAnalysisData({
        urgency: 'critical',
        confidence: 92,
        possibleDiagnoses: [
          {
            condition: 'Neumonía',
            probability: 95,
            recommendations: ['Hospitalización']
          },
          {
            condition: 'Bronquitis',
            probability: 75,
            recommendations: ['Antibióticos']
          }
        ]
      })
    );

    const reloaded = await AIAnalysis.findById(analysis._id);
    expect(reloaded?.urgencyText).toBe('Crítica');
    expect(reloaded?.confidenceText).toBe('Muy Alta');
    expect(reloaded?.topDiagnosis?.condition).toBe('Neumonía');

    const json = reloaded?.toJSON();
    expect(json).not.toHaveProperty('__v');
    expect(json).toHaveProperty('topDiagnosis');
  });

  it('getStats devuelve agregados de confianza y urgencia', async () => {
    await AIAnalysis.create([
      buildAnalysisData({ urgency: 'critical', confidence: 95 }),
      buildAnalysisData({ urgency: 'high', confidence: 80 }),
      buildAnalysisData({ urgency: 'medium', confidence: 55 }),
      buildAnalysisData({ urgency: 'low', confidence: 25 })
    ]);

    const stats = await AIAnalysis.getStats();

    expect(stats.total).toBe(4);
    expect(stats.highConfidence).toBe(2);
    expect(stats.critical).toBe(1);
    expect(stats.high).toBe(1);
    expect(stats.medium).toBe(1);
    expect(stats.low).toBe(1);
    expect(stats.avgConfidence).toBeGreaterThan(50);
  });

  it('getTopDiagnoses agrupa y ordena diagnósticos', async () => {
    await AIAnalysis.create([
      buildAnalysisData({
        possibleDiagnoses: [
          { condition: 'Asma', probability: 60, recommendations: ['Inhalador'] },
          { condition: 'Influenza', probability: 80, recommendations: ['Reposo'] }
        ]
      }),
      buildAnalysisData({
        possibleDiagnoses: [
          { condition: 'Asma', probability: 70, recommendations: ['Control médico'] }
        ]
      }),
      buildAnalysisData({
        possibleDiagnoses: [
          { condition: 'Neumonía', probability: 90, recommendations: ['Antibióticos'] }
        ]
      })
    ]);

    const diagnoses = await AIAnalysis.getTopDiagnoses(2);

    expect(diagnoses).toHaveLength(2);
    expect(diagnoses[0]._id).toBe('Asma');
    expect(diagnoses[0].count).toBe(2);
    expect(diagnoses[0].avgProbability).toBeCloseTo(65);
    expect(diagnoses[0].maxProbability).toBe(70);
  });

  it('valida límites de síntomas y diagnósticos', async () => {
    await expect(
      AIAnalysis.create(
        buildAnalysisData({
          symptoms: []
        })
      )
    ).rejects.toThrow('Debe haber entre 1 y 50 síntomas');

    await expect(
      AIAnalysis.create(
        buildAnalysisData({
          possibleDiagnoses: []
        })
      )
    ).rejects.toThrow('Debe haber entre 1 y 10 diagnósticos posibles');

    await expect(
      AIAnalysis.create(
        buildAnalysisData({
          possibleDiagnoses: [
            {
              condition: 'Diagnóstico inválido',
              probability: 150,
              recommendations: ['Observación']
            }
          ]
        })
      )
    ).rejects.toThrow('La probabilidad no puede exceder 100');
  });

  it('findByMedicalHistory y findByUrgency retornan registros ordenados', async () => {
    const medicalHistoryId = 'history-shared';
    await AIAnalysis.create([
      buildAnalysisData({
        medicalHistoryId,
        urgency: 'critical',
        confidence: 88,
        timestamp: new Date('2024-03-02T10:00:00Z')
      }),
      buildAnalysisData({
        medicalHistoryId,
        urgency: 'critical',
        confidence: 92,
        timestamp: new Date('2024-03-03T10:00:00Z')
      }),
      buildAnalysisData({
        medicalHistoryId: 'other-history',
        urgency: 'high',
        confidence: 60
      })
    ]);

    const byHistory = await AIAnalysis.findByMedicalHistory(medicalHistoryId);
    expect(byHistory).toHaveLength(2);
    expect(byHistory[0].timestamp.getTime()).toBeGreaterThan(byHistory[1].timestamp.getTime());

    const byUrgency = await AIAnalysis.findByUrgency('critical');
    expect(byUrgency).toHaveLength(2);
    expect(byUrgency[0].confidence).toBeGreaterThanOrEqual(byUrgency[1].confidence);
  });

  it('findByConfidenceRange retorna valores dentro del rango solicitado', async () => {
    await AIAnalysis.create([
      buildAnalysisData({ confidence: 90 }),
      buildAnalysisData({ confidence: 65 }),
      buildAnalysisData({ confidence: 30 })
    ]);

    const results = await AIAnalysis.findByConfidenceRange(60, 95);
    expect(results).toHaveLength(2);
    expect(results.every(({ confidence }) => confidence >= 60 && confidence <= 95)).toBe(true);
  });

  it('getAnalysisByPeriod agrupa resultados por día', async () => {
    await AIAnalysis.create([
      buildAnalysisData({ timestamp: new Date('2024-04-01T10:00:00Z') }),
      buildAnalysisData({ timestamp: new Date('2024-04-01T18:00:00Z') }),
      buildAnalysisData({ timestamp: new Date('2024-04-03T12:00:00Z') })
    ]);

    const analyses = await AIAnalysis.getAnalysisByPeriod(
      new Date('2024-04-01T00:00:00Z'),
      new Date('2024-04-05T23:59:59Z')
    );

    expect(analyses.length).toBe(2);
    const firstDay = analyses.find(item => item._id.day === 1);
    expect(firstDay?.count).toBe(2);
    const thirdDay = analyses.find(item => item._id.day === 3);
    expect(thirdDay?.count).toBe(1);
  });

  it('getTopRecommendations agrupa y ordena recomendaciones populares', async () => {
    await AIAnalysis.create([
      buildAnalysisData({
        possibleDiagnoses: [
          {
            condition: 'Bronquitis',
            probability: 80,
            recommendations: ['Reposo', 'Hidratación']
          }
        ]
      }),
      buildAnalysisData({
        possibleDiagnoses: [
          {
            condition: 'Neumonía',
            probability: 85,
            recommendations: ['Reposo', 'Antibióticos']
          }
        ]
      }),
      buildAnalysisData({
        possibleDiagnoses: [
          {
            condition: 'Asma',
            probability: 65,
            recommendations: ['Inhalador', 'Reposo']
          }
        ]
      })
    ]);

    const recommendations = await AIAnalysis.getTopRecommendations(3);
    const topRecommendation = recommendations.find(rec => rec._id === 'Reposo');
    expect(topRecommendation?.count).toBe(3);
  });
});
