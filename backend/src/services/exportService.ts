/**
 * Export Service
 * Handles data export in various formats (JSON, CSV, PDF)
 */

import { Response } from 'express';
import { createObjectCsvWriter } from 'csv-writer';
import PDFDocument from 'pdfkit';
import MedicalHistory from '../models/MedicalHistory';
import User from '../models/User';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  dateFrom?: Date;
  dateTo?: Date;
  patientId?: string;
  doctorId?: string;
  includeImages?: boolean;
  includeAudio?: boolean;
}

export class ExportService {
  /**
   * Export medical histories
   */
  static async exportMedicalHistories(
    res: Response,
    options: ExportOptions
  ): Promise<void> {
    try {
      // Build query
      const query: any = {};
      
      if (options.patientId) {
        query.patientId = options.patientId;
      }
      
      if (options.doctorId) {
        query.doctorId = options.doctorId;
      }
      
      if (options.dateFrom || options.dateTo) {
        query.date = {};
        if (options.dateFrom) {
          query.date.$gte = options.dateFrom;
        }
        if (options.dateTo) {
          query.date.$lte = options.dateTo;
        }
      }

      // Get medical histories
      const medicalHistories = await MedicalHistory.find(query)
        .populate('patientId', 'name email')
        .populate('doctorId', 'name email')
        .sort({ date: -1 });

      if (medicalHistories.length === 0) {
        throw new AppError('No se encontraron historias médicas para exportar', 404);
      }

      // Export based on format
      switch (options.format) {
        case 'json':
          await this.exportToJSON(res, medicalHistories, options);
          break;
        case 'csv':
          await this.exportToCSV(res, medicalHistories, options);
          break;
        case 'pdf':
          await this.exportToPDF(res, medicalHistories, options);
          break;
        default:
          throw new AppError('Formato de exportación no válido', 400);
      }

      logger.info('Medical histories exported successfully', {
        format: options.format,
        count: medicalHistories.length,
        patientId: options.patientId,
        doctorId: options.doctorId
      });
    } catch (error: any) {
      logger.error('Medical histories export failed', error);
      throw error;
    }
  }

  /**
   * Export to JSON format
   */
  private static async exportToJSON(
    res: Response,
    medicalHistories: any[],
    options: ExportOptions
  ): Promise<void> {
    const exportData = {
      exportInfo: {
        format: 'JSON',
        exportedAt: new Date().toISOString(),
        totalRecords: medicalHistories.length,
        filters: {
          dateFrom: options.dateFrom?.toISOString(),
          dateTo: options.dateTo?.toISOString(),
          patientId: options.patientId,
          doctorId: options.doctorId
        }
      },
      medicalHistories: medicalHistories.map(history => ({
        id: history._id,
        patient: {
          id: history.patientId?._id,
          name: history.patientId?.name,
          email: history.patientId?.email
        },
        doctor: {
          id: history.doctorId?._id,
          name: history.doctorId?.name,
          email: history.doctorId?.email
        },
        patientName: history.patientName,
        age: history.age,
        diagnosis: history.diagnosis,
        symptoms: history.symptoms,
        description: history.description,
        date: history.date,
        location: history.location,
        images: options.includeImages ? history.images : undefined,
        audioNotes: options.includeAudio ? history.audioNotes : undefined,
        isOffline: history.isOffline,
        syncStatus: history.syncStatus,
        createdAt: history.createdAt,
        updatedAt: history.updatedAt
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="medical-histories-${Date.now()}.json"`);
    res.json(exportData);
  }

  /**
   * Export to CSV format
   */
  private static async exportToCSV(
    res: Response,
    medicalHistories: any[],
    options: ExportOptions
  ): Promise<void> {
    const csvData = medicalHistories.map(history => ({
      id: history._id,
      patient_name: history.patientName,
      patient_email: history.patientId?.email || '',
      doctor_name: history.doctorId?.name || '',
      doctor_email: history.doctorId?.email || '',
      age: history.age,
      diagnosis: history.diagnosis,
      symptoms: history.symptoms.map((s: any) => `${s.name} (${s.severity})`).join('; '),
      description: history.description || '',
      date: history.date.toISOString().split('T')[0],
      location_address: history.location?.address || '',
      location_latitude: history.location?.latitude || '',
      location_longitude: history.location?.longitude || '',
      images_count: history.images?.length || 0,
      has_audio: history.audioNotes ? 'Yes' : 'No',
      is_offline: history.isOffline ? 'Yes' : 'No',
      sync_status: history.syncStatus,
      created_at: history.createdAt.toISOString(),
      updated_at: history.updatedAt.toISOString()
    }));

    const csvWriter = createObjectCsvWriter({
      path: 'temp-export.csv',
      header: [
        { id: 'id', title: 'ID' },
        { id: 'patient_name', title: 'Paciente' },
        { id: 'patient_email', title: 'Email Paciente' },
        { id: 'doctor_name', title: 'Doctor' },
        { id: 'doctor_email', title: 'Email Doctor' },
        { id: 'age', title: 'Edad' },
        { id: 'diagnosis', title: 'Diagnóstico' },
        { id: 'symptoms', title: 'Síntomas' },
        { id: 'description', title: 'Descripción' },
        { id: 'date', title: 'Fecha' },
        { id: 'location_address', title: 'Dirección' },
        { id: 'location_latitude', title: 'Latitud' },
        { id: 'location_longitude', title: 'Longitud' },
        { id: 'images_count', title: 'Imágenes' },
        { id: 'has_audio', title: 'Audio' },
        { id: 'is_offline', title: 'Offline' },
        { id: 'sync_status', title: 'Estado Sincronización' },
        { id: 'created_at', title: 'Creado' },
        { id: 'updated_at', title: 'Actualizado' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    // Read the file and send it
    const fs = await import('fs/promises');
    const csvContent = await fs.readFile('temp-export.csv', 'utf-8');
    
    // Clean up temp file
    await fs.unlink('temp-export.csv');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="medical-histories-${Date.now()}.csv"`);
    res.send(csvContent);
  }

  /**
   * Export to PDF format
   */
  private static async exportToPDF(
    res: Response,
    medicalHistories: any[],
    options: ExportOptions
  ): Promise<void> {
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="medical-histories-${Date.now()}.pdf"`);

    doc.pipe(res);

    // Add header
    doc.fontSize(20).text('RespiCare - Historiales Médicos', 50, 50);
    doc.fontSize(12).text(`Exportado el: ${new Date().toLocaleDateString('es-ES')}`, 50, 80);
    doc.text(`Total de registros: ${medicalHistories.length}`, 50, 100);
    
    if (options.dateFrom || options.dateTo) {
      doc.text(`Período: ${options.dateFrom?.toLocaleDateString('es-ES') || 'Inicio'} - ${options.dateTo?.toLocaleDateString('es-ES') || 'Fin'}`, 50, 120);
    }

    let yPosition = 150;

    // Add medical histories
    medicalHistories.forEach((history, index) => {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(14).text(`Historia ${index + 1}`, 50, yPosition);
      yPosition += 20;

      doc.fontSize(10)
        .text(`Paciente: ${history.patientName}`, 50, yPosition)
        .text(`Doctor: ${history.doctorId?.name || 'N/A'}`, 300, yPosition);
      yPosition += 15;

      doc.text(`Edad: ${history.age} años`, 50, yPosition)
        .text(`Fecha: ${history.date.toLocaleDateString('es-ES')}`, 300, yPosition);
      yPosition += 15;

      doc.text(`Diagnóstico: ${history.diagnosis}`, 50, yPosition);
      yPosition += 15;

      if (history.symptoms && history.symptoms.length > 0) {
        doc.text('Síntomas:', 50, yPosition);
        yPosition += 15;
        
        history.symptoms.forEach((symptom: any) => {
          doc.text(`• ${symptom.name} (${symptom.severity}) - ${symptom.duration}`, 70, yPosition);
          yPosition += 12;
        });
      }

      if (history.description) {
        doc.text(`Descripción: ${history.description}`, 50, yPosition);
        yPosition += 15;
      }

      if (history.location?.address) {
        doc.text(`Ubicación: ${history.location.address}`, 50, yPosition);
        yPosition += 15;
      }

      yPosition += 20;
    });

    doc.end();
  }

  /**
   * Export user statistics
   */
  static async exportUserStats(res: Response): Promise<void> {
    try {
      const userStats = await User.getUserStats();
      const medicalStats = await MedicalHistory.getStats();
      const topDiagnoses = await MedicalHistory.getTopDiagnoses(10);
      const ageStats = await MedicalHistory.getAgeStats();

      const exportData = {
        exportInfo: {
          format: 'JSON',
          exportedAt: new Date().toISOString(),
          type: 'user_statistics'
        },
        statistics: {
          users: userStats,
          medicalHistories: medicalStats,
          topDiagnoses,
          ageDistribution: ageStats
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user-statistics-${Date.now()}.json"`);
      res.json(exportData);

      logger.info('User statistics exported successfully');
    } catch (error: any) {
      logger.error('User statistics export failed', error);
      throw error;
    }
  }

  /**
   * Get export formats
   */
  static getAvailableFormats(): string[] {
    return ['json', 'csv', 'pdf'];
  }

  /**
   * Validate export options
   */
  static validateExportOptions(options: ExportOptions): void {
    if (!options.format || !this.getAvailableFormats().includes(options.format)) {
      throw new AppError('Formato de exportación no válido', 400);
    }

    if (options.dateFrom && options.dateTo && options.dateFrom > options.dateTo) {
      throw new AppError('La fecha de inicio no puede ser posterior a la fecha de fin', 400);
    }

    if (options.dateFrom && options.dateFrom > new Date()) {
      throw new AppError('La fecha de inicio no puede ser futura', 400);
    }

    if (options.dateTo && options.dateTo > new Date()) {
      throw new AppError('La fecha de fin no puede ser futura', 400);
    }
  }
}
