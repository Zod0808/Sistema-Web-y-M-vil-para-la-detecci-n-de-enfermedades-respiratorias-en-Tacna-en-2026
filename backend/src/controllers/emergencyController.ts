/**
 * Emergency Controller
 * Gestiona los endpoints para emergencias médicas
 */

import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types';
import { emergencyService, EmergencyRequest } from '../services/emergencyService';
import { ambulanceService } from '../services/ambulanceService';
import { emergencyMedicalInfoService } from '../services/emergencyMedicalInfoService';
import { hospitalCommunicationService } from '../services/hospitalCommunicationService';
import { logger } from '../utils/logger';

/**
 * POST /api/v1/emergencies
 * Crear una solicitud de emergencia
 */
export const createEmergency = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      patientId,
      patientName,
      emergencyType,
      severity,
      description,
      location,
      symptoms,
      vitalSigns,
      contactInfo,
      metadata,
    } = req.body;

    // Validaciones básicas
    if (!emergencyType || !severity || !description || !location) {
      throw new AppError(
        'emergencyType, severity, description y location son requeridos',
        400
      );
    }

    if (!location.latitude || !location.longitude) {
      throw new AppError('Coordenadas GPS (latitude, longitude) son requeridas', 400);
    }

    const emergencyRequest: EmergencyRequest = {
      userId: req.user?._id?.toString() || req.body.userId,
      patientId: patientId || req.user?._id?.toString(),
      patientName: patientName || req.user?.name,
      emergencyType,
      severity,
      description,
      location: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        address: location.address,
        district: location.district,
        accuracy: location.accuracy,
      },
      symptoms,
      vitalSigns,
      contactInfo,
      metadata,
    };

    const emergency = await emergencyService.createEmergency(emergencyRequest);

    logger.info('Emergencia creada desde controlador', {
      emergencyId: emergency.emergencyId,
      userId: emergencyRequest.userId,
      type: emergencyType,
    });

    res.status(201).json({
      success: true,
      message: 'Emergencia creada exitosamente',
      data: emergency,
    });
  }
);

/**
 * GET /api/v1/emergencies/:emergencyId
 * Obtener estado de una emergencia
 */
export const getEmergencyStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { emergencyId } = req.params;

    if (!emergencyId) {
      throw new AppError('emergencyId es requerido', 400);
    }

    const status = await emergencyService.getEmergencyStatus(emergencyId);

    if (!status) {
      throw new AppError('Emergencia no encontrada', 404);
    }

    res.status(200).json({
      success: true,
      data: status,
    });
  }
);

/**
 * POST /api/v1/emergencies/:emergencyId/cancel
 * Cancelar una emergencia
 */
export const cancelEmergency = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { emergencyId } = req.params;
    const { reason } = req.body;

    if (!emergencyId) {
      throw new AppError('emergencyId es requerido', 400);
    }

    const cancelled = await emergencyService.cancelEmergency(emergencyId, reason);

    if (!cancelled) {
      throw new AppError('No se pudo cancelar la emergencia', 500);
    }

    res.status(200).json({
      success: true,
      message: 'Emergencia cancelada exitosamente',
    });
  }
);

/**
 * GET /api/v1/emergencies/active
 * Obtener emergencias activas del usuario
 */
export const getActiveEmergencies = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?._id?.toString();

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    const activeEmergencies = emergencyService.getActiveEmergencies(userId);

    res.status(200).json({
      success: true,
      data: {
        emergencies: activeEmergencies,
        count: activeEmergencies.length,
      },
    });
  }
);

/**
 * POST /api/v1/emergencies/detect
 * Detectar emergencia automáticamente desde síntomas
 */
export const detectEmergency = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { symptoms, vitalSigns, location } = req.body;
    const userId = req.user?._id?.toString();
    const patientId = req.body.patientId || userId;

    if (!userId) {
      throw new AppError('Usuario no autenticado', 401);
    }

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      throw new AppError('symptoms es requerido y debe ser un array', 400);
    }

    if (!location || !location.latitude || !location.longitude) {
      throw new AppError('location con coordenadas GPS es requerido', 400);
    }

    const emergency = await emergencyService.detectEmergencyFromSymptoms(
      userId,
      patientId || userId,
      symptoms,
      vitalSigns,
      {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        address: location.address,
        district: location.district,
        accuracy: location.accuracy,
      }
    );

    if (!emergency) {
      res.status(200).json({
        success: true,
        message: 'No se detectó emergencia crítica',
        data: { emergencyDetected: false },
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Emergencia detectada y creada automáticamente',
      data: {
        emergencyDetected: true,
        emergency,
      },
    });
  }
);

/**
 * GET /api/v1/emergencies/:emergencyId/ambulance
 * Obtener información de ambulancia despachada
 */
export const getAmbulanceInfo = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { emergencyId } = req.params;

    if (!emergencyId) {
      throw new AppError('emergencyId es requerido', 400);
    }

    // Buscar ambulancias activas para esta emergencia
    const ambulances = ambulanceService.getActiveAmbulances(emergencyId);

    if (ambulances.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No hay ambulancias despachadas para esta emergencia',
        data: { ambulances: [] },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        ambulances,
        count: ambulances.length,
      },
    });
  }
);

/**
 * GET /api/v1/emergencies/:emergencyId/medical-info
 * Obtener información médica de emergencia del paciente
 */
export const getEmergencyMedicalInfo = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { emergencyId } = req.params;
    const { patientId } = req.query;

    if (!patientId && !emergencyId) {
      throw new AppError('patientId o emergencyId es requerido', 400);
    }

    const targetPatientId = (patientId as string) || emergencyId;

    try {
      const medicalInfo = await emergencyMedicalInfoService.getEmergencyMedicalInfo(targetPatientId);

      res.status(200).json({
        success: true,
        data: medicalInfo,
      });
    } catch (error: any) {
      logger.error(`Error al obtener información médica: ${error.message}`, {
        patientId: targetPatientId,
        error: error.message,
      });
      throw error;
    }
  }
);

/**
 * GET /api/v1/emergencies/:emergencyId/medical-summary
 * Obtener resumen médico para servicios de emergencia
 */
export const getEmergencyMedicalSummary = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { emergencyId } = req.params;

    // Obtener información de la emergencia
    const emergency = await emergencyService.getEmergencyStatus(emergencyId);

    if (!emergency) {
      throw new AppError('Emergencia no encontrada', 404);
    }

    const patientId = emergency.metadata?.patientId as string;
    if (!patientId) {
      throw new AppError('No se pudo identificar al paciente de la emergencia', 400);
    }

    // Reconstruir EmergencyRequest desde la emergencia
    const emergencyRequest: EmergencyRequest = {
      userId: emergency.metadata?.userId as string || '',
      patientId,
      emergencyType: emergency.metadata?.emergencyType as EmergencyRequest['emergencyType'] || 'medical',
      severity: emergency.metadata?.severity as EmergencyRequest['severity'] || 'medium',
      description: emergency.metadata?.description as string || '',
      location: emergency.metadata?.location as EmergencyRequest['location'],
      symptoms: emergency.metadata?.symptoms as string[],
      vitalSigns: emergency.metadata?.vitalSigns as EmergencyRequest['vitalSigns'],
    };

    try {
      const summary = await emergencyMedicalInfoService.generateEmergencySummary(emergencyRequest);

      res.status(200).json({
        success: true,
        data: {
          summary,
          emergencyId,
          patientId,
        },
      });
    } catch (error: any) {
      logger.error(`Error al generar resumen médico: ${error.message}`, {
        emergencyId,
        patientId,
        error: error.message,
      });
      throw error;
    }
  }
);

/**
 * GET /api/v1/emergencies/:emergencyId/hospitals
 * Obtener información de hospitales notificados
 */
export const getHospitalNotifications = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { emergencyId } = req.params;

    if (!emergencyId) {
      throw new AppError('emergencyId es requerido', 400);
    }

    const notifications = hospitalCommunicationService.getHospitalNotifications(emergencyId);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
      },
    });
  }
);

/**
 * POST /api/v1/emergencies/:emergencyId/transfer-to-hospital
 * Transferir información del paciente a un hospital específico
 */
export const transferToHospital = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { emergencyId } = req.params;
    const { hospitalId, patientId } = req.body;

    if (!hospitalId) {
      throw new AppError('hospitalId es requerido', 400);
    }

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const success = await hospitalCommunicationService.transferPatientInfo(
        hospitalId,
        patientId,
        emergencyId
      );

      if (!success) {
        throw new AppError('No se pudo transferir la información al hospital', 500);
      }

      res.status(200).json({
        success: true,
        message: 'Información del paciente transferida exitosamente al hospital',
        data: {
          hospitalId,
          patientId,
          emergencyId,
        },
      });
    } catch (error: any) {
      logger.error(`Error al transferir información al hospital: ${error.message}`, {
        hospitalId,
        patientId,
        emergencyId,
        error: error.message,
      });
      throw error;
    }
  }
);

