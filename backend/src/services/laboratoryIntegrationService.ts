import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { fhirService, FhirResource } from './fhirService';
import { mapHl7ToFhirObservation } from '../utils/hl7Parser';

/**
 * Servicio de integración con sistemas de laboratorio (LIMS)
 * Soporta importación de resultados de laboratorio y alertas por valores anormales
 */

export interface LaboratoryResult {
  patientId: string;
  testName: string;
  testCode: string;
  value: string | number;
  unit: string;
  referenceRange?: string;
  status: 'normal' | 'abnormal' | 'critical';
  date: Date;
  laboratoryId?: string;
  notes?: string;
}

export interface LaboratoryIntegrationConfig {
  baseUrl?: string;
  apiKey?: string;
  format?: 'fhir' | 'hl7' | 'json';
  enableAlerts?: boolean;
  alertThreshold?: 'normal' | 'abnormal' | 'critical';
}

export class LaboratoryIntegrationService {
  private client: AxiosInstance | null = null;
  private config: LaboratoryIntegrationConfig;

  constructor(config: LaboratoryIntegrationConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.LABORATORY_API_URL,
      apiKey: config.apiKey || process.env.LABORATORY_API_KEY,
      format: config.format || 'fhir',
      enableAlerts: config.enableAlerts ?? true,
      alertThreshold: config.alertThreshold || 'abnormal',
    };

    if (this.config.baseUrl) {
      this.client = axios.create({
        baseURL: this.config.baseUrl,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
        },
        timeout: 30000,
      });
    }
  }

  /**
   * Importar resultados de laboratorio desde sistema externo
   */
  async importResults(
    patientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LaboratoryResult[]> {
    if (!this.client) {
      throw new AppError('Servicio de laboratorio no configurado', 500);
    }

    try {
      const params: Record<string, string> = {
        patientId,
      };

      if (startDate) {
        params.startDate = startDate.toISOString();
      }
      if (endDate) {
        params.endDate = endDate.toISOString();
      }

      const response = await this.client.get('/results', { params });

      const results = this.parseResults(response.data, patientId);

      // Convertir a FHIR Observations si el formato es FHIR
      if (this.config.format === 'fhir') {
        await this.saveAsFhirObservations(results);
      }

      // Guardar resultados en base de datos usando labService
      try {
        const { labService } = await import('./labService');
        for (const result of results) {
          try {
            await labService.saveResult(result);
          } catch (error: any) {
            logger.warn(`Error al guardar resultado: ${error.message}`, {
              patientId,
              testCode: result.testCode,
            });
          }
        }
      } catch (error: any) {
        logger.warn(`Error al importar labService: ${error.message}`);
      }

      // Generar alertas si está habilitado
      if (this.config.enableAlerts) {
        await this.checkForAlerts(results);
      }

      logger.info(`Resultados de laboratorio importados para paciente ${patientId}`, {
        patientId,
        count: results.length,
      });

      return results;
    } catch (error: any) {
      logger.error(`Error al importar resultados de laboratorio: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw new AppError(
        `Error al importar resultados de laboratorio: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Importar resultado desde mensaje HL7
   */
  async importFromHl7(hl7Message: string): Promise<LaboratoryResult | null> {
    try {
      const observation = mapHl7ToFhirObservation(hl7Message) as any;
      if (!observation) {
        return null;
      }

      // Convertir Observation a LaboratoryResult
      const result: LaboratoryResult = {
        patientId: observation.subject?.reference?.replace('Patient/', '') || '',
        testName: observation.code?.text || 'Test desconocido',
        testCode: observation.code?.coding?.[0]?.code || '',
        value: observation.valueString || observation.valueQuantity?.value || '',
        unit: observation.valueQuantity?.unit || '',
        status: 'normal', // Se determinará según referenceRange
        date: observation.effectiveDateTime
          ? new Date(observation.effectiveDateTime)
          : new Date(),
      };

      // Determinar status según valor
      result.status = this.determineStatus(result);

      // Guardar como FHIR Observation
      await fhirService.createResource(observation);

      // Guardar en base de datos usando labService
      try {
        const { labService } = await import('./labService');
        await labService.saveResult(result);
      } catch (error: any) {
        logger.warn(`Error al guardar resultado desde HL7: ${error.message}`);
      }

      // Generar alerta si es necesario
      if (this.config.enableAlerts && this.shouldAlert(result)) {
        await this.generateAlert(result);
      }

      return result;
    } catch (error: any) {
      logger.error(`Error al importar desde HL7: ${error.message}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Sincronizar resultados bidireccionalmente
   */
  async syncResults(patientId: string): Promise<{ imported: number; exported: number }> {
    try {
      // Importar desde sistema externo
      const imported = await this.importResults(patientId);

      // Exportar resultados locales al sistema externo (si aplica)
      const exported = await this.exportResults(patientId);

      return {
        imported: imported.length,
        exported: exported.length,
      };
    } catch (error: any) {
      logger.error(`Error en sincronización bidireccional: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Exportar resultados al sistema externo
   */
  private async exportResults(patientId: string): Promise<FhirResource[]> {
    try {
      // Buscar Observations del paciente
      const bundle = await fhirService.search('Observation', {
        subject: `Patient/${patientId}`,
        category: 'laboratory',
      });

      if (!bundle.entry || bundle.entry.length === 0) {
        return [];
      }

      const observations = bundle.entry.map((entry) => entry.resource);

      // Exportar al sistema externo si está configurado
      if (this.client) {
        await this.client.post('/results/import', {
          patientId,
          observations,
        });
      }

      return observations;
    } catch (error: any) {
      logger.error(`Error al exportar resultados: ${error.message}`, {
        patientId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Parsear resultados según formato
   */
  private parseResults(data: any, patientId: string): LaboratoryResult[] {
    if (this.config.format === 'fhir') {
      return this.parseFhirResults(data, patientId);
    } else if (this.config.format === 'hl7') {
      return this.parseHl7Results(data, patientId);
    } else {
      return this.parseJsonResults(data, patientId);
    }
  }

  private parseFhirResults(data: any, patientId: string): LaboratoryResult[] {
    if (data.resourceType === 'Bundle' && data.entry) {
      return data.entry
        .map((entry: any) => {
          const obs = entry.resource;
          if (obs.resourceType === 'Observation') {
            return {
              patientId,
              testName: obs.code?.text || 'Test desconocido',
              testCode: obs.code?.coding?.[0]?.code || '',
              value: obs.valueQuantity?.value || obs.valueString || '',
              unit: obs.valueQuantity?.unit || '',
              referenceRange: obs.referenceRange?.[0]?.text,
              status: this.determineStatusFromFhir(obs),
              date: obs.effectiveDateTime ? new Date(obs.effectiveDateTime) : new Date(),
            } as LaboratoryResult;
          }
          return null;
        })
        .filter((r: LaboratoryResult | null) => r !== null) as LaboratoryResult[];
    }
    return [];
  }

  private parseHl7Results(data: any, patientId: string): LaboratoryResult[] {
    // Implementación simplificada - en producción usar parser HL7 completo
    return [];
  }

  private parseJsonResults(data: any, patientId: string): LaboratoryResult[] {
    if (Array.isArray(data)) {
      return data.map((item) => ({
        patientId,
        testName: item.testName || item.name,
        testCode: item.testCode || item.code,
        value: item.value,
        unit: item.unit,
        referenceRange: item.referenceRange,
        status: item.status || 'normal',
        date: item.date ? new Date(item.date) : new Date(),
        laboratoryId: item.laboratoryId,
        notes: item.notes,
      })) as LaboratoryResult[];
    }
    return [];
  }

  /**
   * Guardar resultados como FHIR Observations
   */
  private async saveAsFhirObservations(results: LaboratoryResult[]): Promise<void> {
    for (const result of results) {
      const observation: FhirResource = {
        resourceType: 'Observation',
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'laboratory',
                display: 'Laboratory',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: result.testCode,
              display: result.testName,
            },
          ],
          text: result.testName,
        },
        subject: {
          reference: `Patient/${result.patientId}`,
        },
        effectiveDateTime: result.date.toISOString(),
        valueQuantity: {
          value: typeof result.value === 'number' ? result.value : parseFloat(result.value as string),
          unit: result.unit,
          system: 'http://unitsofmeasure.org',
          code: result.unit,
        },
        interpretation: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: result.status === 'normal' ? 'N' : result.status === 'abnormal' ? 'A' : 'C',
                display: result.status,
              },
            ],
          },
        ],
      };

      try {
        await fhirService.createResource(observation);
      } catch (error: any) {
        logger.error(`Error al guardar Observation: ${error.message}`, {
          patientId: result.patientId,
          testName: result.testName,
        });
      }
    }
  }

  /**
   * Determinar status según valor y referencia
   */
  private determineStatus(result: LaboratoryResult): 'normal' | 'abnormal' | 'critical' {
    if (!result.referenceRange) {
      return 'normal';
    }

    // Parsear rango de referencia
    const range = this.parseReferenceRange(result.referenceRange);
    if (!range) {
      return 'normal';
    }

    const numValue = typeof result.value === 'number' ? result.value : parseFloat(String(result.value));
    if (isNaN(numValue)) {
      return 'normal';
    }

    // Comparar con rango de referencia
    if (range.low !== undefined && numValue < range.low) {
      // Si está muy por debajo, es crítico
      return numValue < range.low * 0.5 ? 'critical' : 'abnormal';
    }

    if (range.high !== undefined && numValue > range.high) {
      // Si está muy por encima, es crítico
      return numValue > range.high * 1.5 ? 'critical' : 'abnormal';
    }

    return 'normal';
  }

  /**
   * Parsear rango de referencia desde string
   */
  private parseReferenceRange(range: string): { low?: number; high?: number; text?: string } | null {
    if (!range) return null;

    // Intentar parsear formato común: "10-20 mg/dL" o "10.0 - 20.0"
    const match = range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (match) {
      return {
        low: parseFloat(match[1]),
        high: parseFloat(match[2]),
        text: range,
      };
    }

    // Intentar parsear formato: "< 20" o "> 10"
    const lessThanMatch = range.match(/<\s*(\d+\.?\d*)/);
    if (lessThanMatch) {
      return {
        high: parseFloat(lessThanMatch[1]),
        text: range,
      };
    }

    const greaterThanMatch = range.match(/>\s*(\d+\.?\d*)/);
    if (greaterThanMatch) {
      return {
        low: parseFloat(greaterThanMatch[1]),
        text: range,
      };
    }

    return { text: range };
  }

  private determineStatusFromFhir(obs: any): 'normal' | 'abnormal' | 'critical' {
    const interpretation = obs.interpretation?.[0]?.coding?.[0]?.code;
    if (interpretation === 'N') return 'normal';
    if (interpretation === 'A') return 'abnormal';
    if (interpretation === 'C') return 'critical';
    return 'normal';
  }

  /**
   * Verificar si se debe generar alerta
   */
  private shouldAlert(result: LaboratoryResult): boolean {
    if (this.config.alertThreshold === 'normal') {
      return false;
    }
    if (this.config.alertThreshold === 'abnormal') {
      return result.status === 'abnormal' || result.status === 'critical';
    }
    if (this.config.alertThreshold === 'critical') {
      return result.status === 'critical';
    }
    return false;
  }

  /**
   * Verificar resultados y generar alertas
   */
  private async checkForAlerts(results: LaboratoryResult[]): Promise<void> {
    for (const result of results) {
      if (this.shouldAlert(result)) {
        await this.generateAlert(result);
      }
    }
  }

  /**
   * Generar alerta para resultado anormal
   */
  private async generateAlert(result: LaboratoryResult): Promise<void> {
    try {
      // Importar servicio de alertas dinámicamente para evitar dependencias circulares
      const { alertService } = await import('./alertService');

      await alertService.createAlert({
        patientId: result.patientId,
        category: 'laboratory',
        priority: result.status === 'critical' ? 'high' : 'medium',
        title: `Resultado de laboratorio ${result.status}`,
        message: `El resultado de ${result.testName} está ${result.status}: ${result.value} ${result.unit}`,
        metadata: {
          testName: result.testName,
          testCode: result.testCode,
          value: result.value,
          unit: result.unit,
          referenceRange: result.referenceRange,
          date: result.date.toISOString(),
        },
      });

      logger.info(`Alerta generada para resultado de laboratorio`, {
        patientId: result.patientId,
        testName: result.testName,
        status: result.status,
      });
    } catch (error: any) {
      logger.error(`Error al generar alerta: ${error.message}`, {
        patientId: result.patientId,
        error: error.message,
      });
    }
  }

  /**
   * Importar resultados automáticamente (para jobs programados)
   */
  async importResultsAutomatically(patientIds?: string[]): Promise<{
    total: number;
    success: number;
    errors: number;
  }> {
    const stats = {
      total: 0,
      success: 0,
      errors: 0,
    };

    try {
      // Si no se proporcionan patientIds, obtener todos los pacientes activos
      // En producción, esto debería venir de una consulta a la base de datos
      const patientsToSync = patientIds || [];

      if (patientsToSync.length === 0) {
        logger.warn('No hay pacientes para sincronizar');
        return stats;
      }

      for (const patientId of patientsToSync) {
        try {
          stats.total++;
          await this.importResults(patientId);
          stats.success++;
        } catch (error: any) {
          stats.errors++;
          logger.error(`Error al importar resultados para paciente ${patientId}: ${error.message}`);
        }
      }

      logger.info(`Importación automática completada`, {
        total: stats.total,
        success: stats.success,
        errors: stats.errors,
      });

      return stats;
    } catch (error: any) {
      logger.error(`Error en importación automática: ${error.message}`, {
        error: error.message,
      });
      throw error;
    }
  }
}

export const laboratoryIntegrationService = new LaboratoryIntegrationService();

