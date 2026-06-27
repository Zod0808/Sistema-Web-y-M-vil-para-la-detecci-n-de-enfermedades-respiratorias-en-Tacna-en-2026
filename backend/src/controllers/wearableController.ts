/**
 * Wearable Controller
 * Controlador para manejar datos de wearables
 */

import { Response } from 'express';
import WearableData from '../models/WearableData';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { vitalsEmitter } from '../sockets/vitalsEmitter';
import { checkThresholdsAndAlert } from '../services/wearableAlertService';
import { logger } from '../utils/logger';

/**
 * Sincronizar datos de wearables
 */
export const syncWearableData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data } = req.body;
    const patientId = req.user?._id;

    if (!patientId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        error: 'Token de acceso requerido'
      } as ApiResponse);
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      res.status(400).json(
        {
          success: false,
          message: 'Se requiere un array de datos de wearables',
          error: 'Datos de entrada inválidos'
        } as ApiResponse
      );
      return;
    }

    // Validar y guardar datos
    const savedData = [];
    for (const item of data) {
      const wearableData = new WearableData({
        patientId,
        heartRate: item.heartRate,
        oxygenSaturation: item.oxygenSaturation,
        steps: item.steps,
        distance: item.distance,
        respiratoryRate: item.respiratoryRate,
        sleepHours: item.sleepHours,
        timestamp: new Date(item.timestamp),
        source: item.source || 'manual'
      });

      const saved = await wearableData.save();
      savedData.push(saved);

      // Broadcast en tiempo real al dashboard del médico
      vitalsEmitter.emit('vitals', {
        patientId: String(patientId),
        heartRate: item.heartRate,
        oxygenSaturation: item.oxygenSaturation,
        respiratoryRate: item.respiratoryRate,
        steps: item.steps,
        timestamp: saved.timestamp.toISOString(),
      });

      // Verificar umbrales y crear alertas en BD si se superan
      checkThresholdsAndAlert(String(patientId), {
        heartRate: item.heartRate,
        oxygenSaturation: item.oxygenSaturation,
        respiratoryRate: item.respiratoryRate,
        timestamp: saved.timestamp.toISOString(),
      }).catch(() => { /* non-blocking */ });
    }

    res.status(201).json({
      success: true,
      message: `${savedData.length} registros sincronizados exitosamente`,
      data: { count: savedData.length, data: savedData }
    } as ApiResponse);
  } catch (error: any) {
    logger.error('Error syncing wearable data', { error: error.message });
    res.status(500).json(
      {
        success: false,
        message: 'Error al sincronizar datos de wearables',
        error: error.message
      } as ApiResponse
    );
  }
};

/**
 * Obtener datos de wearables de un paciente
 */
export const getWearableData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isStaff = req.user?.role === 'doctor' || req.user?.role === 'admin';
    const requestedPatientId = req.params.patientId;

    // Sin patientId en la ruta: staff ve todos los pacientes, paciente ve los suyos
    const patientId = requestedPatientId || (!isStaff ? req.user?._id : undefined);
    const { startDate, endDate, limit = 100 } = req.query;

    if (!patientId && !isStaff) {
      res.status(400).json(
        {
          success: false,
          message: 'ID de paciente requerido',
          error: 'Datos de entrada inválidos'
        } as ApiResponse
      );
      return;
    }

    // Verificar permisos cuando se pide un paciente específico
    if (requestedPatientId && req.user?._id !== requestedPatientId && !isStaff) {
      res.status(403).json(
        {
          success: false,
          message: 'No tienes permisos para ver estos datos',
          error: 'Acceso denegado'
        } as ApiResponse
      );
      return;
    }

    // Si hay patientId (propio o específico) filtrar; si el staff no especificó, traer todo
    const query: any = patientId ? { patientId } : {};

    // Filtrar por rango de fechas — validar que sean fechas válidas antes de pasar a MongoDB
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          res.status(400).json({ success: false, message: 'startDate no es una fecha válida' } as ApiResponse);
          return;
        }
        query.timestamp.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          res.status(400).json({ success: false, message: 'endDate no es una fecha válida' } as ApiResponse);
          return;
        }
        query.timestamp.$lte = end;
      }
    }

    const data = await WearableData.find(query)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();

    res.status(200).json(
      {
        success: true,
        message: 'Datos de wearables obtenidos exitosamente',
        data: { data }
      } as ApiResponse
    );
  } catch (error: any) {
    logger.error('Error getting wearable data', { error: error.message });
    res.status(500).json(
      {
        success: false,
        message: 'Error al obtener datos de wearables',
        error: error.message
      } as ApiResponse
    );
  }
};

/**
 * Obtener métricas agregadas de wearables
 */
export const getWearableMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isStaff = req.user?.role === 'doctor' || req.user?.role === 'admin';
    const requestedPatientId = req.params.patientId;
    const patientId = requestedPatientId || (!isStaff ? req.user?._id : undefined);
    const { hours = 24 } = req.query;

    if (!patientId && !isStaff) {
      res.status(400).json(
        {
          success: false,
          message: 'ID de paciente requerido',
          error: 'Datos de entrada inválidos'
        } as ApiResponse
      );
      return;
    }

    if (requestedPatientId && req.user?._id !== requestedPatientId && !isStaff) {
      res.status(403).json(
        {
          success: false,
          message: 'No tienes permisos para ver estos datos',
          error: 'Acceso denegado'
        } as ApiResponse
      );
      return;
    }

    const startDate = new Date();
    startDate.setHours(startDate.getHours() - Number(hours));

    const findQuery: any = { timestamp: { $gte: startDate } };
    if (patientId) findQuery.patientId = patientId;

    const data = await WearableData.find(findQuery).sort({ timestamp: -1 }).lean();

    // Calcular métricas
    const heartRates = data.filter((d: any) => d.heartRate).map((d: any) => d.heartRate as number);
    const oxygenLevels = data.filter((d: any) => d.oxygenSaturation).map((d: any) => d.oxygenSaturation as number);
    const respiratoryRates = data.filter((d: any) => d.respiratoryRate).map((d: any) => d.respiratoryRate as number);
    
    const totalSteps = data.reduce((sum: number, d: any) => sum + (d.steps || 0), 0);
    const totalDistance = data.reduce((sum: number, d: any) => sum + (d.distance || 0), 0);

    const metrics = {
      heartRate: {
        current: heartRates[0] || 0,
        average: heartRates.length > 0 
          ? heartRates.reduce((a: number, b: number) => a + b, 0) / heartRates.length 
          : 0,
        min: heartRates.length > 0 ? Math.min(...heartRates) : 0,
        max: heartRates.length > 0 ? Math.max(...heartRates) : 0,
      },
      oxygenSaturation: {
        current: oxygenLevels[0] || 0,
        average: oxygenLevels.length > 0 
          ? oxygenLevels.reduce((a: number, b: number) => a + b, 0) / oxygenLevels.length 
          : 0,
        min: oxygenLevels.length > 0 ? Math.min(...oxygenLevels) : 0,
      },
      activity: {
        steps: totalSteps,
        distance: totalDistance,
      },
      respiratoryRate: {
        current: respiratoryRates[0] || 0,
        average: respiratoryRates.length > 0 
          ? respiratoryRates.reduce((a: number, b: number) => a + b, 0) / respiratoryRates.length 
          : 0,
      },
      period: {
        hours: Number(hours),
        startDate,
        endDate: new Date(),
        dataPoints: data.length
      }
    };

    res.status(200).json(
      {
        success: true,
        message: 'Métricas obtenidas exitosamente',
        data: { metrics }
      } as ApiResponse
    );
  } catch (error: any) {
    logger.error('Error getting wearable metrics', { error: error.message });
    res.status(500).json(
      {
        success: false,
        message: 'Error al obtener métricas de wearables',
        error: error.message
      } as ApiResponse
    );
  }
};

