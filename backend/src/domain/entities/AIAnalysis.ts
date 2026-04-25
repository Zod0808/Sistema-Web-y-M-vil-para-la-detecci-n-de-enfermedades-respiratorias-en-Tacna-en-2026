// Entidad de Análisis de IA - Capa de Dominio
import { Symptom } from '../value-objects/Symptom';

export interface AIAnalysis {
  id: string;
  medicalHistoryId: string;
  symptoms: Symptom[];
  analysisResult: string;
  confidence: number;
  recommendations: string[];
  riskLevel: RiskLevel;
  createdAt: Date;
  updatedAt: Date;
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class AIAnalysisEntity {
  constructor(
    public readonly id: string,
    public readonly medicalHistoryId: string,
    public readonly symptoms: Symptom[],
    public readonly analysisResult: string,
    public readonly confidence: number,
    public readonly recommendations: string[],
    public readonly riskLevel: RiskLevel,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('El ID del análisis es obligatorio');
    }

    if (!this.medicalHistoryId || this.medicalHistoryId.trim().length === 0) {
      throw new Error('El ID del historial médico es obligatorio');
    }

    if (!this.analysisResult || this.analysisResult.trim().length === 0) {
      throw new Error('El resultado del análisis es obligatorio');
    }

    if (this.confidence < 0 || this.confidence > 1) {
      throw new Error('La confianza debe estar entre 0 y 1');
    }

    if (this.symptoms.length === 0) {
      throw new Error('Debe haber al menos un síntoma para el análisis');
    }

    if (this.recommendations.length === 0) {
      throw new Error('Debe haber al menos una recomendación');
    }
  }

  // Métodos de negocio
  public isHighRisk(): boolean {
    return this.riskLevel === RiskLevel.HIGH || this.riskLevel === RiskLevel.CRITICAL;
  }

  public isLowConfidence(): boolean {
    return this.confidence < 0.7;
  }

  public needsHumanReview(): boolean {
    return this.isHighRisk() || this.isLowConfidence();
  }

  public isCritical(): boolean {
    return this.riskLevel === RiskLevel.CRITICAL;
  }

  public getSeverityScore(): number {
    return this.symptoms.reduce((score, symptom) => {
      switch (symptom.severity) {
        case 'mild':
          return score + 1;
        case 'moderate':
          return score + 2;
        case 'severe':
          return score + 3;
        default:
          return score;
      }
    }, 0);
  }

  public addRecommendation(recommendation: string): AIAnalysisEntity {
    if (this.recommendations.length >= 10) {
      throw new Error('No se pueden agregar más de 10 recomendaciones');
    }

    return new AIAnalysisEntity(
      this.id,
      this.medicalHistoryId,
      this.symptoms,
      this.analysisResult,
      this.confidence,
      [...this.recommendations, recommendation],
      this.riskLevel,
      this.createdAt,
      new Date()
    );
  }

  public updateConfidence(newConfidence: number): AIAnalysisEntity {
    if (newConfidence < 0 || newConfidence > 1) {
      throw new Error('La confianza debe estar entre 0 y 1');
    }

    return new AIAnalysisEntity(
      this.id,
      this.medicalHistoryId,
      this.symptoms,
      this.analysisResult,
      newConfidence,
      this.recommendations,
      this.riskLevel,
      this.createdAt,
      new Date()
    );
  }

  public updateRiskLevel(newRiskLevel: RiskLevel): AIAnalysisEntity {
    return new AIAnalysisEntity(
      this.id,
      this.medicalHistoryId,
      this.symptoms,
      this.analysisResult,
      this.confidence,
      this.recommendations,
      newRiskLevel,
      this.createdAt,
      new Date()
    );
  }

  // Validaciones de negocio
  public validateConfidence(): boolean {
    return this.confidence >= 0 && this.confidence <= 1;
  }

  public validateRecommendations(): boolean {
    return this.recommendations.length > 0 && this.recommendations.length <= 10;
  }

  public validateAnalysisResult(): boolean {
    return this.analysisResult.trim().length > 0 && this.analysisResult.length <= 1000;
  }

  public isValid(): boolean {
    return this.validateConfidence() && 
           this.validateRecommendations() && 
           this.validateAnalysisResult() &&
           this.symptoms.length > 0;
  }

  public getSummary(): string {
    return `Análisis de ${this.symptoms.length} síntomas - Riesgo: ${this.riskLevel} - Confianza: ${Math.round(this.confidence * 100)}%`;
  }
}
