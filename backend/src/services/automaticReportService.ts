/**
 * Automatic Report Service
 * Genera reportes automáticos diarios, semanales y mensuales
 */

import AutomaticReport, { AutomaticReportDocument, ReportType, ReportStatus } from '../models/AutomaticReport';
import MedicalHistory from '../models/MedicalHistory';
import Alert from '../models/Alert';
import Appointment from '../models/Appointment';
import User from '../models/User';
import AIAnalysis from '../models/AIAnalysis';
import { metricAlertService } from './metricAlertService';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const SymptomReportModel: any = require('../models/SymptomReport');

export interface GenerateReportOptions {
  reportType: ReportType;
  period: {
    startDate: Date;
    endDate: Date;
  };
  includeAnomalies?: boolean;
  autoExport?: boolean;
  exportFormat?: 'pdf' | 'csv' | 'json';
}

class AutomaticReportService {
  private readonly reportsDir = path.join(process.cwd(), 'reports', 'automatic');

  constructor() {
    this.initializeStorage();
  }

  private initializeStorage() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Genera un reporte automático
   */
  async generateReport(options: GenerateReportOptions): Promise<AutomaticReportDocument> {
    const { reportType, period, includeAnomalies = true, autoExport = false, exportFormat = 'pdf' } = options;

    logger.info(`Generando reporte ${reportType} para período ${period.startDate.toISOString()} - ${period.endDate.toISOString()}`);

    // Crear registro de reporte
    let report = new AutomaticReport({
      reportType,
      period,
      status: 'generating',
      generatedAt: new Date(),
    });

    try {
      // Obtener métricas actuales
      const currentMetrics = await metricAlertService.getCurrentMetrics(period);

      // Obtener diagnósticos top
      const topDiagnoses = await MedicalHistory.aggregate([
        {
          $match: {
            date: { $gte: period.startDate, $lte: period.endDate },
          },
        },
        {
          $group: {
            _id: '$diagnosis',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Obtener categorías de síntomas
      const symptomCategories = await SymptomReportModel.aggregate([
        {
          $match: {
            createdAt: { $gte: period.startDate, $lte: period.endDate },
          },
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
          },
        },
        {
          $sort: { total: -1 },
        },
      ]);

      // Obtener distribución por distrito
      const districtDistribution = await MedicalHistory.aggregate([
        {
          $match: {
            date: { $gte: period.startDate, $lte: period.endDate },
            location: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$location.district',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      // Calcular métricas de crecimiento comparando con período anterior
      const previousPeriod = this.getPreviousPeriod(period, reportType);
      const previousMetrics = await metricAlertService.getCurrentMetrics(previousPeriod);

      const growthMetrics = {
        patientsGrowth: this.calculateGrowth(currentMetrics.totalPatients, previousMetrics.totalPatients),
        historiesGrowth: this.calculateGrowth(
          currentMetrics.totalMedicalHistories,
          previousMetrics.totalMedicalHistories
        ),
        alertsGrowth: this.calculateGrowth(currentMetrics.totalAlerts, previousMetrics.totalAlerts),
      };

      // Detectar anomalías si está habilitado
      let anomalies: any[] = [];
      if (includeAnomalies) {
        anomalies = await metricAlertService.detectAnomalies(currentMetrics);
      }

      // Actualizar reporte con métricas
      report.metrics = {
        totalPatients: currentMetrics.totalPatients,
        totalDoctors: currentMetrics.totalDoctors,
        totalAdmins: currentMetrics.totalAdmins || 0,
        totalMedicalHistories: currentMetrics.totalMedicalHistories,
        totalAlerts: currentMetrics.totalAlerts,
        criticalAlerts: currentMetrics.criticalAlerts,
        totalAppointments: currentMetrics.totalAppointments,
        completedAppointments: currentMetrics.completedAppointments,
        aiAnalyses: currentMetrics.aiAnalyses,
        averageAIConfidence: currentMetrics.averageAIConfidence,
        topDiagnoses: topDiagnoses.map((item: any) => ({
          diagnosis: item._id || 'Desconocido',
          count: item.count || 0,
        })),
        symptomCategories: symptomCategories.map((item: any) => ({
          category: item._id || 'unknown',
          total: item.total || 0,
        })),
        districtDistribution: districtDistribution.map((item: any) => ({
          district: item._id || 'Desconocido',
          count: item.count || 0,
        })),
        growthMetrics,
      };

      if (anomalies.length > 0) {
        report.anomalies = anomalies;
      }

      report.status = 'completed';
      await report.save();

      // Exportar automáticamente si está habilitado
      if (autoExport) {
        await this.exportReport(report._id.toString(), exportFormat);
      }

      logger.info(`Reporte ${reportType} generado exitosamente: ${report._id}`);
      return report;
    } catch (error) {
      logger.error(`Error generando reporte ${reportType}`, { error });
      report.status = 'failed';
      await report.save();
      throw error;
    }
  }

  /**
   * Genera reporte diario
   */
  async generateDailyReport(): Promise<AutomaticReportDocument> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 1);

    return this.generateReport({
      reportType: 'daily',
      period: { startDate, endDate },
      includeAnomalies: true,
      autoExport: true,
      exportFormat: 'pdf',
    });
  }

  /**
   * Genera reporte semanal
   */
  async generateWeeklyReport(): Promise<AutomaticReportDocument> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    return this.generateReport({
      reportType: 'weekly',
      period: { startDate, endDate },
      includeAnomalies: true,
      autoExport: true,
      exportFormat: 'pdf',
    });
  }

  /**
   * Genera reporte mensual
   */
  async generateMonthlyReport(): Promise<AutomaticReportDocument> {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    return this.generateReport({
      reportType: 'monthly',
      period: { startDate, endDate },
      includeAnomalies: true,
      autoExport: true,
      exportFormat: 'pdf',
    });
  }

  /**
   * Exporta un reporte a un formato específico
   */
  async exportReport(reportId: string, format: 'pdf' | 'csv' | 'json'): Promise<string> {
    const report = await AutomaticReport.findById(reportId);
    if (!report) {
      throw new Error('Reporte no encontrado');
    }

    const fileName = `report_${report.reportType}_${report.period.startDate.toISOString().split('T')[0]}.${format}`;
    const filePath = path.join(this.reportsDir, fileName);

    try {
      let buffer: Buffer;

      switch (format) {
        case 'json':
          buffer = Buffer.from(JSON.stringify(report.toJSON(), null, 2));
          break;
        case 'csv':
          buffer = await this.generateCSV(report);
          break;
        case 'pdf':
          buffer = await this.generatePDF(report);
          break;
        default:
          throw new Error(`Formato de exportación no soportado: ${format}`);
      }

      fs.writeFileSync(filePath, buffer);

      report.filePath = filePath;
      report.exportedAt = new Date();
      report.exportFormat = format;
      report.status = 'exported';
      await report.save();

      logger.info(`Reporte exportado exitosamente: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Error exportando reporte ${reportId}`, { error });
      throw error;
    }
  }

  /**
   * Genera CSV del reporte
   */
  private async generateCSV(report: AutomaticReportDocument): Promise<Buffer> {
    const lines: string[] = [];
    lines.push('Métrica,Valor');
    lines.push(`Total Pacientes,${report.metrics.totalPatients}`);
    lines.push(`Total Doctores,${report.metrics.totalDoctors}`);
    lines.push(`Total Historias Médicas,${report.metrics.totalMedicalHistories}`);
    lines.push(`Total Alertas,${report.metrics.totalAlerts}`);
    lines.push(`Alertas Críticas,${report.metrics.criticalAlerts}`);
    lines.push(`Total Citas,${report.metrics.totalAppointments}`);
    lines.push(`Citas Completadas,${report.metrics.completedAppointments}`);
    lines.push(`Análisis IA,${report.metrics.aiAnalyses}`);
    lines.push(`Confianza Promedio IA,${report.metrics.averageAIConfidence}`);

    if (report.anomalies && report.anomalies.length > 0) {
      lines.push('');
      lines.push('Anomalías Detectadas');
      lines.push('Métrica,Valor,Severidad,Descripción');
      report.anomalies.forEach((anomaly) => {
        lines.push(`${anomaly.metric},${anomaly.value},${anomaly.severity},"${anomaly.description}"`);
      });
    }

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  /**
   * Genera PDF del reporte
   */
  private async generatePDF(report: AutomaticReportDocument): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Título
    doc.fontSize(20).text(`Reporte ${report.reportType.toUpperCase()}`, { align: 'center' });
    doc.moveDown();

    // Período
    doc.fontSize(12).text(
      `Período: ${report.period.startDate.toLocaleDateString()} - ${report.period.endDate.toLocaleDateString()}`,
      { align: 'center' }
    );
    doc.moveDown(2);

    // Métricas principales
    doc.fontSize(16).text('Métricas Principales', { underline: true });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Total Pacientes: ${report.metrics.totalPatients}`);
    doc.text(`Total Doctores: ${report.metrics.totalDoctors}`);
    doc.text(`Total Historias Médicas: ${report.metrics.totalMedicalHistories}`);
    doc.text(`Total Alertas: ${report.metrics.totalAlerts}`);
    doc.text(`Alertas Críticas: ${report.metrics.criticalAlerts}`);
    doc.text(`Total Citas: ${report.metrics.totalAppointments}`);
    doc.text(`Citas Completadas: ${report.metrics.completedAppointments}`);
    doc.text(`Análisis IA: ${report.metrics.aiAnalyses}`);
    doc.text(`Confianza Promedio IA: ${(report.metrics.averageAIConfidence * 100).toFixed(2)}%`);
    doc.moveDown();

    // Anomalías
    if (report.anomalies && report.anomalies.length > 0) {
      doc.fontSize(16).text('Anomalías Detectadas', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      report.anomalies.forEach((anomaly) => {
        doc.text(`${anomaly.metric}: ${anomaly.value} (${anomaly.severity})`);
        doc.text(`  ${anomaly.description}`, { indent: 20 });
        doc.moveDown(0.5);
      });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
    });
  }

  /**
   * Calcula el crecimiento porcentual
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  /**
   * Obtiene el período anterior basado en el tipo de reporte
   */
  private getPreviousPeriod(period: { startDate: Date; endDate: Date }, reportType: ReportType) {
    const duration = period.endDate.getTime() - period.startDate.getTime();
    return {
      startDate: new Date(period.startDate.getTime() - duration),
      endDate: new Date(period.startDate.getTime() - 1),
    };
  }

  /**
   * Obtiene reportes por tipo
   */
  async getReportsByType(type: ReportType, limit: number = 10): Promise<AutomaticReportDocument[]> {
    return AutomaticReport.findByType(type, limit);
  }

  /**
   * Obtiene el último reporte por tipo
   */
  async getLatestReport(type: ReportType): Promise<AutomaticReportDocument | null> {
    return AutomaticReport.findLatestByType(type);
  }

  /**
   * Obtiene estadísticas de reportes
   */
  async getReportStats() {
    return AutomaticReport.getReportStats();
  }
}

export const automaticReportService = new AutomaticReportService();
export default automaticReportService;

