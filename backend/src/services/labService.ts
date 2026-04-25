import { LabResult, LabResultDocument } from '../models/LabResult';
import { laboratoryIntegrationService, LaboratoryResult } from './laboratoryIntegrationService';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { alertService } from './alertService';

/**
 * Servicio completo de gestión de resultados de laboratorio
 * Proporciona funcionalidades de visualización, historial y alertas
 */

export interface LabResultFilter {
  patientId?: string;
  testCode?: string;
  status?: 'normal' | 'abnormal' | 'critical';
  flagged?: boolean;
  startDate?: Date;
  endDate?: Date;
  laboratoryId?: string;
}

export interface LabResultSummary {
  total: number;
  normal: number;
  abnormal: number;
  critical: number;
  flagged: number;
  byTestCode: Record<string, number>;
  latestDate?: Date;
}

export interface AbnormalValueAlert {
  result: LabResultDocument;
  severity: 'medium' | 'high';
  message: string;
  recommendation?: string;
}

export class LabService {
  /**
   * Guardar resultado de laboratorio
   */
  async saveResult(result: LaboratoryResult): Promise<LabResultDocument> {
    try {
      // Verificar si ya existe (por orderId o testCode + date)
      const existing = await LabResult.findOne({
        patientId: result.patientId,
        testCode: result.testCode,
        date: {
          $gte: new Date(result.date.getTime() - 60000), // 1 minuto de margen
          $lte: new Date(result.date.getTime() + 60000),
        },
      });

      if (existing) {
        // Actualizar resultado existente
        existing.value = result.value;
        existing.unit = result.unit;
        existing.status = result.status;
        existing.referenceRange = this.parseReferenceRange(result.referenceRange);
        if (result.notes) existing.notes = result.notes;
        await existing.save();
        return existing;
      }

      // Crear nuevo resultado
      const labResult = new LabResult({
        patientId: result.patientId,
        testName: result.testName,
        testCode: result.testCode,
        value: result.value,
        unit: result.unit,
        referenceRange: this.parseReferenceRange(result.referenceRange),
        status: result.status,
        date: result.date,
        laboratoryId: result.laboratoryId,
        notes: result.notes,
      });

      await labResult.save();

      // Generar alerta si es anormal o crítico
      if (labResult.isAbnormal()) {
        await this.generateAbnormalValueAlert(labResult);
      }

      logger.info(`Resultado de laboratorio guardado`, {
        patientId: result.patientId,
        testCode: result.testCode,
        status: result.status,
      });

      return labResult;
    } catch (error: any) {
      logger.error(`Error al guardar resultado de laboratorio: ${error.message}`, {
        patientId: result.patientId,
        error: error.message,
      });
      throw new AppError(`Error al guardar resultado: ${error.message}`, 500);
    }
  }

  /**
   * Obtener resultados de laboratorio con filtros
   */
  async getResults(filter: LabResultFilter): Promise<LabResultDocument[]> {
    try {
      const query: any = {};

      if (filter.patientId) {
        query.patientId = filter.patientId;
      }

      if (filter.testCode) {
        query.testCode = filter.testCode;
      }

      if (filter.status) {
        query.status = filter.status;
      }

      if (filter.flagged !== undefined) {
        query.flagged = filter.flagged;
      }

      if (filter.laboratoryId) {
        query.laboratoryId = filter.laboratoryId;
      }

      if (filter.startDate || filter.endDate) {
        query.date = {};
        if (filter.startDate) query.date.$gte = filter.startDate;
        if (filter.endDate) query.date.$lte = filter.endDate;
      }

      const results = await LabResult.find(query).sort({ date: -1 }).limit(1000);

      return results;
    } catch (error: any) {
      logger.error(`Error al obtener resultados: ${error.message}`, {
        filter,
        error: error.message,
      });
      throw new AppError(`Error al obtener resultados: ${error.message}`, 500);
    }
  }

  /**
   * Obtener historial de exámenes de un paciente
   */
  async getPatientHistory(
    patientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LabResultDocument[]> {
    try {
      return await LabResult.findByPatient(patientId, startDate, endDate);
    } catch (error: any) {
      logger.error(`Error al obtener historial: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw new AppError(`Error al obtener historial: ${error.message}`, 500);
    }
  }

  /**
   * Obtener resultados anormales de un paciente
   */
  async getAbnormalResults(
    patientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LabResultDocument[]> {
    try {
      return await LabResult.findAbnormal(patientId, startDate, endDate);
    } catch (error: any) {
      logger.error(`Error al obtener resultados anormales: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw new AppError(`Error al obtener resultados anormales: ${error.message}`, 500);
    }
  }

  /**
   * Obtener resultados críticos de un paciente
   */
  async getCriticalResults(
    patientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LabResultDocument[]> {
    try {
      return await LabResult.findCritical(patientId, startDate, endDate);
    } catch (error: any) {
      logger.error(`Error al obtener resultados críticos: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw new AppError(`Error al obtener resultados críticos: ${error.message}`, 500);
    }
  }

  /**
   * Obtener último resultado de un examen específico
   */
  async getLatestResult(patientId: string, testCode: string): Promise<LabResultDocument | null> {
    try {
      return await LabResult.getLatestByTestCode(patientId, testCode);
    } catch (error: any) {
      logger.error(`Error al obtener último resultado: ${error.message}`, {
        patientId,
        testCode,
        error: error.message,
      });
      throw new AppError(`Error al obtener último resultado: ${error.message}`, 500);
    }
  }

  /**
   * Obtener resumen de resultados de un paciente
   */
  async getPatientSummary(
    patientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<LabResultSummary> {
    try {
      const results = await LabResult.findByPatient(patientId, startDate, endDate);

      const summary: LabResultSummary = {
        total: results.length,
        normal: 0,
        abnormal: 0,
        critical: 0,
        flagged: 0,
        byTestCode: {},
      };

      for (const result of results) {
        if (result.status === 'normal') summary.normal++;
        else if (result.status === 'abnormal') summary.abnormal++;
        else if (result.status === 'critical') summary.critical++;

        if (result.flagged) summary.flagged++;

        summary.byTestCode[result.testCode] = (summary.byTestCode[result.testCode] || 0) + 1;

        if (!summary.latestDate || result.date > summary.latestDate) {
          summary.latestDate = result.date;
        }
      }

      return summary;
    } catch (error: any) {
      logger.error(`Error al obtener resumen: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw new AppError(`Error al obtener resumen: ${error.message}`, 500);
    }
  }

  /**
   * Marcar resultado como revisado
   */
  async markAsReviewed(resultId: string, doctorId: string): Promise<void> {
    try {
      const result = await LabResult.findById(resultId);
      if (!result) {
        throw new AppError('Resultado no encontrado', 404);
      }

      await result.markAsReviewed(doctorId);

      logger.info(`Resultado marcado como revisado`, {
        resultId,
        doctorId,
      });
    } catch (error: any) {
      logger.error(`Error al marcar como revisado: ${error.message}`, {
        resultId,
        doctorId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Marcar resultado para revisión
   */
  async flagForReview(resultId: string, reason?: string): Promise<void> {
    try {
      const result = await LabResult.findById(resultId);
      if (!result) {
        throw new AppError('Resultado no encontrado', 404);
      }

      await result.flagForReview(reason);

      logger.info(`Resultado marcado para revisión`, {
        resultId,
        reason,
      });
    } catch (error: any) {
      logger.error(`Error al marcar para revisión: ${error.message}`, {
        resultId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Importar y guardar resultados automáticamente
   */
  async importAndSaveResults(
    patientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ imported: number; saved: number; errors: number }> {
    try {
      const imported = await laboratoryIntegrationService.importResults(patientId, startDate, endDate);

      let saved = 0;
      let errors = 0;

      for (const result of imported) {
        try {
          await this.saveResult(result);
          saved++;
        } catch (error: any) {
          logger.error(`Error al guardar resultado importado: ${error.message}`, {
            patientId,
            testCode: result.testCode,
            error: error.message,
          });
          errors++;
        }
      }

      return {
        imported: imported.length,
        saved,
        errors,
      };
    } catch (error: any) {
      logger.error(`Error en importación automática: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw new AppError(`Error en importación: ${error.message}`, 500);
    }
  }

  /**
   * Generar alerta para valor anormal
   */
  private async generateAbnormalValueAlert(result: LabResultDocument): Promise<void> {
    try {
      const severity = result.status === 'critical' ? 'high' : 'medium';
      const recommendation = this.getRecommendation(result);

      await alertService.createAlert({
        patientId: result.patientId,
        category: 'laboratory',
        priority: severity as 'high' | 'medium',
        title: `Resultado de laboratorio ${result.status}: ${result.testName}`,
        message: `El resultado de ${result.testName} está ${result.status}: ${result.value} ${result.unit}`,
        metadata: {
          labResultId: result._id.toString(),
          testCode: result.testCode,
          testName: result.testName,
          value: result.value,
          unit: result.unit,
          referenceRange: result.referenceRange,
          date: result.date.toISOString(),
          recommendation,
        },
      });

      logger.info(`Alerta generada para resultado anormal`, {
        patientId: result.patientId,
        testCode: result.testCode,
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
   * Obtener recomendación basada en resultado anormal
   */
  private getRecommendation(result: LabResultDocument): string {
    // Recomendaciones básicas según tipo de examen
    // En producción, esto debería venir de una base de conocimiento médica
    const recommendations: Record<string, string> = {
      'critical': 'Se recomienda atención médica inmediata',
      'abnormal': 'Se recomienda consulta médica para evaluación',
    };

    return recommendations[result.status] || 'Revisar con médico';
  }

  /**
   * Parsear rango de referencia desde string
   */
  private parseReferenceRange(range?: string): { low?: number; high?: number; text?: string } | undefined {
    if (!range) return undefined;

    // Intentar parsear formato común: "10-20 mg/dL" o "10.0 - 20.0"
    const match = range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (match) {
      return {
        low: parseFloat(match[1]),
        high: parseFloat(match[2]),
        text: range,
      };
    }

    // Si no se puede parsear, guardar como texto
    return { text: range };
  }

  /**
   * Detectar valores anormales mejorado
   */
  async detectAbnormalValues(result: LabResultDocument): Promise<boolean> {
    if (!result.referenceRange) {
      return false;
    }

    const numValue = typeof result.value === 'number' ? result.value : parseFloat(String(result.value));

    if (isNaN(numValue)) {
      return false;
    }

    const { low, high } = result.referenceRange;

    if (low !== undefined && numValue < low) {
      result.status = numValue < low * 0.5 ? 'critical' : 'abnormal';
      return true;
    }

    if (high !== undefined && numValue > high) {
      result.status = numValue > high * 1.5 ? 'critical' : 'abnormal';
      return true;
    }

    result.status = 'normal';
    return false;
  }
}

export const labService = new LabService();

