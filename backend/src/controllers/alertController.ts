/**
 * Alert Controller
 * Gestiona la creación, consulta y administración de alertas y notificaciones
 */

import { Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import {
  ApiResponse,
  AlertStatus,
  AlertPriority,
  AlertCategory,
  AuthenticatedRequest,
} from '../types';
import { alertService } from '../services/alertService';
import { notificationService } from '../services/notificationService';
import alertMonitoringService from '../services/alertMonitoringService';
import { logger } from '../utils/logger';

const parseDate = (value: string | undefined, field: string): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`El campo ${field} debe ser una fecha válida`, 400);
  }
  return date;
};

export const createCriticalSymptomAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    userId,
    patientId,
    doctorId,
    patientName,
    symptomName,
    severity,
    analysisId,
    metadata,
  } = req.body;

  const alert = await alertService.createCriticalSymptomAlert({
    userId,
    patientId,
    doctorId: doctorId ?? req.user?._id,
    patientName,
    symptomName,
    severity,
    analysisId,
    metadata,
  });

  const response: ApiResponse = {
    success: true,
    message: 'Alerta crítica generada correctamente',
    data: alert,
  };

  res.status(201).json(response);
});

export const scheduleMedicationReminder = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    userId,
    patientId,
    doctorId,
    medicationName,
    dosage,
    scheduleTime,
    repeatIntervalMinutes,
    instructions,
  } = req.body;

  const scheduledAt = parseDate(scheduleTime, 'scheduleTime');
  if (!scheduledAt) {
    throw new AppError('El campo scheduleTime es obligatorio', 400);
  }

  const alert = await alertService.scheduleMedicationReminder({
    userId,
    patientId,
    doctorId: doctorId ?? req.user?._id,
    medicationName,
    dosage,
    scheduleTime: scheduledAt,
    repeatIntervalMinutes,
    instructions,
  });

  const response: ApiResponse = {
    success: true,
    message: 'Recordatorio de medicamento programado correctamente',
    data: alert,
  };

  res.status(201).json(response);
});

export const scheduleFollowUpAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    userId,
    patientId,
    doctorId,
    followUpDate,
    reason,
    preferredChannel,
  } = req.body;

  const followUpAt = parseDate(followUpDate, 'followUpDate');
  if (!followUpAt) {
    throw new AppError('El campo followUpDate es obligatorio', 400);
  }

  const alert = await alertService.scheduleFollowUpAlert({
    userId,
    patientId,
    doctorId: doctorId ?? req.user?._id,
    followUpDate: followUpAt,
    reason,
    preferredChannel,
  });

  const response: ApiResponse = {
    success: true,
    message: 'Seguimiento médico programado correctamente',
    data: alert,
  };

  res.status(201).json(response);
});

export const notifyDoctorForCriticalCase = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { doctorId, patientId, summary, urgency, triggeredBy, metadata } = req.body;

  const alert = await alertService.notifyDoctorForCriticalCase({
    doctorId,
    patientId,
    summary,
    urgency,
    triggeredBy,
    metadata,
  });

  const response: ApiResponse = {
    success: true,
    message: 'Notificación urgente enviada al médico',
    data: alert,
  };

  res.status(201).json(response);
});

export const acknowledgeAlert = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?._id) {
    throw new AppError('No autenticado', 401);
  }

  const { alertId } = req.params;

  if (!Types.ObjectId.isValid(alertId)) {
    throw new AppError('El identificador de la alerta es inválido', 400);
  }

  const alert = await alertService.acknowledgeAlert(alertId, req.user._id);

  const response: ApiResponse = {
    success: true,
    message: 'Alerta reconocida correctamente',
    data: alert,
  };

  res.status(200).json(response);
});

export const getUserAlerts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?._id) {
    throw new AppError('No autenticado', 401);
  }

  const {
    status,
    category,
    priority,
    doctorId,
    userId: queryUserId,
    patientId,
    from,
    to,
  } = req.query;

  const isAdmin = req.user.role === 'admin';
  const isDoctor = req.user.role === 'doctor';
  let targetUserId: string | Types.ObjectId = req.user._id;
  if (isAdmin && queryUserId) {
    targetUserId = String(queryUserId);
  } else if ((isDoctor || isAdmin) && patientId) {
    // Doctors can query alerts for their patients by patientId
    targetUserId = String(patientId);
  }

  const filters: {
    status?: AlertStatus[];
    category?: AlertCategory[];
    priority?: AlertPriority[];
    doctorId?: string;
    userId?: string;
    patientId?: string;
    from?: Date;
    to?: Date;
  } = {};

  if (status) {
    filters.status = Array.isArray(status) ? status.map(String) as AlertStatus[] : [String(status) as AlertStatus];
  }

  if (category) {
    filters.category = Array.isArray(category)
      ? category.map(String) as AlertCategory[]
      : [String(category) as AlertCategory];
  }

  if (priority) {
    filters.priority = Array.isArray(priority)
      ? priority.map(String) as AlertPriority[]
      : [String(priority) as AlertPriority];
  }

  if (doctorId) {
    filters.doctorId = String(doctorId);
  }

  if (patientId) {
    filters.patientId = String(patientId);
  }

  filters.userId = targetUserId;

  const fromDate = parseDate(typeof from === 'string' ? from : Array.isArray(from) ? String(from[0]) : undefined, 'from');
  const toDate = parseDate(typeof to === 'string' ? to : Array.isArray(to) ? String(to[0]) : undefined, 'to');

  if (fromDate) {
    filters.from = fromDate;
  }
  if (toDate) {
    filters.to = toDate;
  }

  const alerts = await alertService.getAlertsForUser(targetUserId, filters);

  const response: ApiResponse = {
    success: true,
    message: 'Alertas obtenidas correctamente',
    data: alerts,
  };

  res.status(200).json(response);
});

export const getAlertDashboardSummary = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const summary = await alertService.getDashboardSummary();

  const response: ApiResponse = {
    success: true,
    message: 'Resumen de alertas obtenido correctamente',
    data: summary,
  };

  res.status(200).json(response);
});

export const getAlertMonitoringMetrics = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const snapshot = await alertMonitoringService.getSnapshot();

  const response: ApiResponse = {
    success: true,
    message: 'Métricas de alertas obtenidas correctamente',
    data: snapshot,
  };

  res.status(200).json(response);
});

export const processAlertsNow = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const [scheduledProcessed, pendingResult] = await Promise.all([
    notificationService.processScheduledQueue(),
    alertService.processPendingAlerts(),
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Procesamiento manual de alertas ejecutado',
    data: {
      scheduledProcessed,
      pendingResult,
    },
  };

  res.status(200).json(response);
});

