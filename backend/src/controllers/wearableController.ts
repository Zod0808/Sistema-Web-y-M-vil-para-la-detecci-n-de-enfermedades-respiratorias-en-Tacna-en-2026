/**
 * Wearable Controller
 * Controlador para manejar datos de wearables
 */

import { Response } from 'express';
import WearableData from '../models/WearableData';
import { ApiResponse, AuthenticatedRequest } from '../types';

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
    }

    res.status(201).json({
      success: true,
      message: `${savedData.length} registros sincronizados exitosamente`,
      data: { count: savedData.length, data: savedData }
    } as ApiResponse);
  } catch (error: any) {
    console.error('Error syncing wearable data:', error);
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
    const patientId = req.params.patientId || req.user?._id;
    const { startDate, endDate, limit = 100 } = req.query;

    if (!patientId) {
      res.status(400).json(
        {
          success: false,
          message: 'ID de paciente requerido',
          error: 'Datos de entrada inválidos'
        } as ApiResponse
      );
      return;
    }

    // Verificar permisos (solo puede ver sus propios datos a menos que sea doctor/admin)
    if (req.user?._id !== patientId && req.user?.role !== 'doctor' && req.user?.role !== 'admin') {
      res.status(403).json(
        {
          success: false,
          message: 'No tienes permisos para ver estos datos',
          error: 'Acceso denegado'
        } as ApiResponse
      );
      return;
    }

    const query: any = { patientId };

    // Filtrar por rango de fechas
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate as string);
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
    console.error('Error getting wearable data:', error);
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
    const patientId = req.params.patientId || req.user?._id;
    const { hours = 24 } = req.query;

    if (!patientId) {
      res.status(400).json(
        {
          success: false,
          message: 'ID de paciente requerido',
          error: 'Datos de entrada inválidos'
        } as ApiResponse
      );
      return;
    }

    // Verificar permisos
    if (req.user?._id !== patientId && req.user?.role !== 'doctor' && req.user?.role !== 'admin') {
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

    const data = await WearableData.find({
      patientId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 }).lean();

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
    console.error('Error getting wearable metrics:', error);
    res.status(500).json(
      {
        success: false,
        message: 'Error al obtener métricas de wearables',
        error: error.message
      } as ApiResponse
    );
  }
};

