/**
 * Export Controller
 * Handles data export functionality
 */

import { Response } from 'express';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ExportService, ExportOptions } from '../services/exportService';

// Export medical histories
export const exportMedicalHistories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { format, dateFrom, dateTo, patientId, doctorId, includeImages, includeAudio } = req.body;

  // Validate export options
  const options: ExportOptions = {
    format: format || 'json',
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    patientId,
    doctorId,
    includeImages: includeImages || false,
    includeAudio: includeAudio || false
  };

  ExportService.validateExportOptions(options);

  // Check permissions
  if (req.user?.role === 'patient' && patientId && patientId !== req.user._id) {
    throw new AppError('No tienes permisos para exportar datos de otros pacientes', 403);
  }

  if (req.user?.role === 'doctor' && doctorId && doctorId !== req.user._id) {
    throw new AppError('No tienes permisos para exportar datos de otros doctores', 403);
  }

  // Set default filters based on user role
  if (req.user?.role === 'patient') {
    options.patientId = req.user._id;
  } else if (req.user?.role === 'doctor') {
    options.doctorId = req.user._id;
  }

  try {
    await ExportService.exportMedicalHistories(res, options);
  } catch (error: any) {
    logger.error('Medical histories export failed', {
      userId: req.user?._id,
      options,
      error: error.message
    });
    throw error;
  }
});

// Export user statistics
export const exportUserStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Only admin can export user statistics
  if (req.user?.role !== 'admin') {
    throw new AppError('Acceso denegado. Se requieren permisos de administrador', 403);
  }

  try {
    await ExportService.exportUserStats(res);
  } catch (error: any) {
    logger.error('User statistics export failed', {
      userId: req.user._id,
      error: error.message
    });
    throw error;
  }
});

// Get available export formats
export const getExportFormats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const formats = ExportService.getAvailableFormats();

  const response: ApiResponse = {
    success: true,
    message: 'Formatos de exportación obtenidos exitosamente',
    data: {
      formats,
      descriptions: {
        json: 'Formato JSON - Estructurado y fácil de procesar',
        csv: 'Formato CSV - Compatible con Excel y hojas de cálculo',
        pdf: 'Formato PDF - Documento imprimible y profesional'
      }
    }
  };

  res.status(200).json(response);
});

// Get export history (placeholder for future implementation)
export const getExportHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // This would typically query a database table that stores export history
  // For now, return a placeholder response
  
  const response: ApiResponse = {
    success: true,
    message: 'Historial de exportaciones obtenido exitosamente',
    data: {
      exports: [],
      message: 'Funcionalidad de historial de exportaciones en desarrollo'
    }
  };

  res.status(200).json(response);
});
