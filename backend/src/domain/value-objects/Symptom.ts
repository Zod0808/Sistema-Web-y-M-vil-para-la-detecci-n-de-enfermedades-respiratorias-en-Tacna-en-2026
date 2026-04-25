// Value Object para Síntoma - Capa de Dominio
export interface Symptom {
  id?: string;
  name: string;
  severity: SymptomSeverity;
  duration: string;
  description?: string;
}

export enum SymptomSeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe'
}

export class SymptomValueObject {
  constructor(
    public readonly name: string,
    public readonly severity: SymptomSeverity,
    public readonly duration: string,
    public readonly description?: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('El nombre del síntoma es obligatorio');
    }

    if (this.name.length > 100) {
      throw new Error('El nombre del síntoma no puede exceder 100 caracteres');
    }

    if (!this.duration || this.duration.trim().length === 0) {
      throw new Error('La duración del síntoma es obligatoria');
    }

    if (this.description && this.description.length > 500) {
      throw new Error('La descripción no puede exceder 500 caracteres');
    }
  }

  public isSevere(): boolean {
    return this.severity === SymptomSeverity.SEVERE;
  }

  public isModerate(): boolean {
    return this.severity === SymptomSeverity.MODERATE;
  }

  public isMild(): boolean {
    return this.severity === SymptomSeverity.MILD;
  }

  public requiresImmediateAttention(): boolean {
    return this.isSevere() && this.duration.includes('hours') || this.duration.includes('minutos');
  }

  public getSeverityWeight(): number {
    switch (this.severity) {
      case SymptomSeverity.MILD:
        return 1;
      case SymptomSeverity.MODERATE:
        return 2;
      case SymptomSeverity.SEVERE:
        return 3;
      default:
        return 0;
    }
  }

  public equals(other: SymptomValueObject): boolean {
    return this.name === other.name && 
           this.severity === other.severity && 
           this.duration === other.duration;
  }

  public toString(): string {
    return `${this.name} (${this.severity}) - ${this.duration}`;
  }
}
