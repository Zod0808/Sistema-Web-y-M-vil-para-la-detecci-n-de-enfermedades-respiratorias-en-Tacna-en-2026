/**
 * Automatic Report Controller
 * Controla las peticiones relacionadas con reportes automáticos
 */

import { Response } from 'express';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { automaticReportService } from '../services/automaticReportService';
import AutomaticReport, { ReportType } from '../models/AutomaticReport';
import fs from 'fs';
import path from 'path';

/**
 * @route   GET /api/v1/reports/automatic
 * @desc    Obtiene todos los reportes automáticos
 * @access  Private (Admin, Doctor)
 */
export const getAllReports = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type, status, limit = 20, page = 1 } = req.query;

  const query: any = {};
  if (type) {
    query.reportType = type;
  }
  if (status) {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    AutomaticReport.find(query)
      .sort({ 'period.startDate': -1 })
      .skip(skip)
      .limit(Number(limit))
      .exec(),
    AutomaticReport.countDocuments(query),
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Reportes automáticos obtenidos exitosamente',
    data: {
      reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    },
  };

  res.status(200).json(response);
});

/**
 * @route   GET /api/v1/reports/automatic/:id
 * @desc    Obtiene un reporte automático por ID
 * @access  Private (Admin, Doctor)
 */
export const getReportById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const report = await AutomaticReport.findById(id);
  if (!report) {
    throw new AppError('Reporte no encontrado', 404);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Reporte automático obtenido exitosamente',
    data: report,
  };

  res.status(200).json(response);
});

/**
 * @route   GET /api/v1/reports/automatic/latest/:type
 * @desc    Obtiene el último reporte de un tipo específico
 * @access  Private (Admin, Doctor)
 */
export const getLatestReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params;

  if (!['daily', 'weekly', 'monthly'].includes(type)) {
    throw new AppError('Tipo de reporte no válido', 400);
  }

  const report = await automaticReportService.getLatestReport(type as ReportType);

  const response: ApiResponse = {
    success: true,
    message: 'Último reporte obtenido exitosamente',
    data: report || null,
  };

  res.status(200).json(response);
});

/**
 * @route   POST /api/v1/reports/automatic/generate
 * @desc    Genera un reporte automático manualmente
 * @access  Private (Admin only)
 */
export const generateReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    throw new AppError('Acceso denegado. Se requieren permisos de administrador', 403);
  }

  const { reportType, startDate, endDate, includeAnomalies = true, autoExport = false, exportFormat = 'pdf' } = req.body;

  if (!reportType || !['daily', 'weekly', 'monthly'].includes(reportType)) {
    throw new AppError('Tipo de reporte no válido', 400);
  }

  let period;
  if (startDate && endDate) {
    period = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    };
  } else {
    // Generar período basado en el tipo de reporte
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);

    switch (reportType) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    period = { startDate, endDate };
  }

  const report = await automaticReportService.generateReport({
    reportType: reportType as ReportType,
    period,
    includeAnomalies,
    autoExport,
    exportFormat,
  });

  const response: ApiResponse = {
    success: true,
    message: 'Reporte generado exitosamente',
    data: report,
  };

  res.status(201).json(response);
});

/**
 * @route   POST /api/v1/reports/automatic/:id/export
 * @desc    Exporta un reporte a un formato específico
 * @access  Private (Admin, Doctor)
 */
export const exportReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { format = 'pdf' } = req.body;

  if (!['pdf', 'csv', 'json'].includes(format)) {
    throw new AppError('Formato de exportación no válido', 400);
  }

  const filePath = await automaticReportService.exportReport(id, format as 'pdf' | 'csv' | 'json');

  if (!fs.existsSync(filePath)) {
    throw new AppError('Archivo de reporte no encontrado', 404);
  }

  const fileName = path.basename(filePath);
  res.download(filePath, fileName, (err) => {
    if (err) {
      logger.error('Error descargando reporte', { error: err });
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error descargando el reporte',
        });
      }
    }
  });
});

/**
 * @route   GET /api/v1/reports/automatic/stats
 * @desc    Obtiene estadísticas de reportes automáticos
 * @access  Private (Admin only)
 */
export const getReportStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    throw new AppError('Acceso denegado. Se requieren permisos de administrador', 403);
  }

  const stats = await automaticReportService.getReportStats();

  const response: ApiResponse = {
    success: true,
    message: 'Estadísticas de reportes obtenidas exitosamente',
    data: stats,
  };

  res.status(200).json(response);
});

/**
 * @route   GET /api/v1/reports/automatic/:type/list
 * @desc    Obtiene reportes por tipo
 * @access  Private (Admin, Doctor)
 */
export const getReportsByType = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { type } = req.params;
  const { limit = 10 } = req.query;

  if (!['daily', 'weekly', 'monthly'].includes(type)) {
    throw new AppError('Tipo de reporte no válido', 400);
  }

  const reports = await automaticReportService.getReportsByType(type as ReportType, Number(limit));

  const response: ApiResponse = {
    success: true,
    message: 'Reportes obtenidos exitosamente',
    data: reports,
  };

  res.status(200).json(response);
});

