import { Response } from 'express';
import MedicalHistory from '../models/MedicalHistory';
import AIAnalysis from '../models/AIAnalysis';
import { ApiResponse, SearchQuery, AuthenticatedRequest } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import {
  CACHE_NAMESPACES,
  buildCacheKey,
  deleteCachedValue,
  getCachedValue,
  invalidateCacheByPattern,
  setCachedValue,
  TEN_MINUTES,
  FIVE_MINUTES
} from '../services/cacheService';

// Crear nueva historia médica
export const createMedicalHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const medicalHistoryData = {
    ...req.body,
    doctorId: req.user?._id
  };

  const medicalHistory = await MedicalHistory.create(medicalHistoryData);

  logger.info(`Historia médica creada: ${medicalHistory.patientName}`, { 
    medicalHistoryId: medicalHistory._id,
    doctorId: req.user?._id 
  });

  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORIES}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORIES}:anonymous:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_STATS}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_DIAGNOSES}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_AGE_STATS}:${req.user?._id ?? '*'}:*`);

  const response: ApiResponse = {
    success: true,
    message: 'Historia médica creada exitosamente',
    data: medicalHistory
  };

  res.status(201).json(response);
});

// Obtener historias médicas con filtros y paginación
export const getMedicalHistories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    sort = 'date', 
    order = 'desc',
    patientId,
    syncStatus,
    isOffline,
    startDate,
    endDate
  } = req.query as SearchQuery;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const sanitizedLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * sanitizedLimit;
  const sortOrder = order === 'asc' ? 1 : -1;

  // Construir filtros
  const filters: any = {};

  // Filtrar según rol: paciente ve sus propias historias, doctor las suyas, admin todas
  if (req.user?.role === 'patient') {
    filters.patientId = req.user?._id?.toString();
  } else if (req.user?.role !== 'admin') {
    filters.doctorId = req.user?._id;
  }

  if (patientId) {
    filters.patientId = patientId;
  }

  if (syncStatus) {
    filters.syncStatus = syncStatus;
  }

  let normalizedIsOffline: boolean | undefined;

  if (isOffline !== undefined) {
    normalizedIsOffline = typeof isOffline === 'string'
      ? isOffline === 'true'
      : Boolean(isOffline);
    filters.isOffline = normalizedIsOffline;
  }

  if (startDate && endDate) {
    filters.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  let searchProjection: Record<string, unknown> | undefined;
  const sortQuery: Record<string, any> = {};

  const allowedSortFields = new Set([
    'date',
    'createdAt',
    'updatedAt',
    'patientName',
    'age',
    'syncStatus'
  ]);

  const selectedSortField = allowedSortFields.has(String(sort)) ? String(sort) : 'date';
  sortQuery[selectedSortField] = sortOrder;

  if (search) {
    const MAX_SEARCH_LENGTH = 100;
    const normalizedSearch = search.trim().slice(0, MAX_SEARCH_LENGTH);
    if (normalizedSearch.length >= 3) {
      filters.$text = { $search: normalizedSearch };
      searchProjection = { score: { $meta: 'textScore' } };
      sortQuery.score = { $meta: 'textScore' };
    } else if (normalizedSearch.length > 0) {
      // Escapar metacaracteres regex para prevenir ReDoS
      const escaped = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filters.$or = [
        { patientName: { $regex: escaped, $options: 'i' } },
        { diagnosis: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } }
      ];
    }
  }

  const cacheKey = buildCacheKey(
    CACHE_NAMESPACES.MEDICAL_HISTORIES,
    req.user?._id?.toString() ?? 'anonymous',
    {
      page: pageNumber,
      limit: sanitizedLimit,
      sort: selectedSortField,
      order: sortOrder,
      search: search ? search.trim() : null,
      patientId: patientId ?? null,
      syncStatus: syncStatus ?? null,
      isOffline: normalizedIsOffline ?? null,
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      doctorId: req.user?.role !== 'admin' ? req.user?._id : 'all'
    }
  );

  const cachedResponse = await getCachedValue<ApiResponse>(cacheKey);
  if (cachedResponse) {
    res.setHeader('X-Cache-Status', 'HIT');
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json(cachedResponse);
  }

  const [medicalHistories, total] = await Promise.all([
    MedicalHistory.find(filters, searchProjection)
      .sort(sortQuery)
      .skip(skip)
      .limit(sanitizedLimit)
      .populate('doctorId', 'name email role')
      .lean({ virtuals: true }),
    MedicalHistory.countDocuments(filters)
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Historias médicas obtenidas exitosamente',
    data: medicalHistories,
    pagination: {
      page: pageNumber,
      limit: sanitizedLimit,
      total,
      pages: Math.ceil(total / sanitizedLimit)
    }
  };

  await setCachedValue(cacheKey, response, FIVE_MINUTES);
  res.setHeader('X-Cache-Status', 'MISS');
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.status(200).json(response);
});

// Obtener historia médica por ID
export const getMedicalHistoryById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const cacheKey = `${CACHE_NAMESPACES.MEDICAL_HISTORY}:${id}`;
  const cachedHistory = await getCachedValue<ApiResponse>(cacheKey);
  if (cachedHistory) {
    res.setHeader('X-Cache-Status', 'HIT');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.status(200).json(cachedHistory);
  }

  const medicalHistory = await MedicalHistory.findById(id).lean({ virtuals: true });
  if (!medicalHistory) {
    throw new AppError('Historia médica no encontrada', 404);
  }

  // Verificar permisos (solo el doctor que la creó o admin)
  // .toString() necesario: doctorId es ObjectId, req.user._id puede ser string u ObjectId
  if (req.user?.role !== 'admin' && medicalHistory.doctorId?.toString() !== req.user?._id?.toString()) {
    throw new AppError('No tienes permisos para ver esta historia médica', 403);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Historia médica obtenida exitosamente',
    data: medicalHistory
  };

  await setCachedValue(cacheKey, response, FIVE_MINUTES);
  res.setHeader('X-Cache-Status', 'MISS');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.status(200).json(response);
});

// Actualizar historia médica
export const updateMedicalHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const medicalHistory = await MedicalHistory.findById(id).lean();
  if (!medicalHistory) {
    throw new AppError('Historia médica no encontrada', 404);
  }

  // Verificar permisos
  if (req.user?.role !== 'admin' && medicalHistory.doctorId !== req.user?._id) {
    throw new AppError('No tienes permisos para actualizar esta historia médica', 403);
  }

  const updatedMedicalHistory = await MedicalHistory.findByIdAndUpdate(
    id,
    { ...req.body, syncStatus: 'pending' },
    { new: true, runValidators: true }
  );

  logger.info(`Historia médica actualizada: ${id}`, { 
    medicalHistoryId: id,
    doctorId: req.user?._id 
  });

  const response: ApiResponse = {
    success: true,
    message: 'Historia médica actualizada exitosamente',
    data: updatedMedicalHistory
  };

  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORIES}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORIES}:anonymous:*`);
  await deleteCachedValue(`${CACHE_NAMESPACES.MEDICAL_HISTORY}:${id}`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_STATS}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_DIAGNOSES}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_AGE_STATS}:${req.user?._id ?? '*'}:*`);
  res.status(200).json(response);
});

// Eliminar historia médica
export const deleteMedicalHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const medicalHistory = await MedicalHistory.findById(id).lean();
  if (!medicalHistory) {
    throw new AppError('Historia médica no encontrada', 404);
  }

  // Verificar permisos
  if (req.user?.role !== 'admin' && medicalHistory.doctorId !== req.user?._id) {
    throw new AppError('No tienes permisos para eliminar esta historia médica', 403);
  }

  await MedicalHistory.findByIdAndDelete(id);

  // Eliminar análisis de IA relacionados
  await AIAnalysis.deleteMany({ medicalHistoryId: id });

  logger.info(`Historia médica eliminada: ${id}`, { 
    medicalHistoryId: id,
    doctorId: req.user?._id 
  });

  const response: ApiResponse = {
    success: true,
    message: 'Historia médica eliminada exitosamente'
  };

  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORIES}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORIES}:anonymous:*`);
  await deleteCachedValue(`${CACHE_NAMESPACES.MEDICAL_HISTORY}:${id}`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_STATS}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_DIAGNOSES}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_AGE_STATS}:${req.user?._id ?? '*'}:*`);
  res.status(200).json(response);
});

// Sincronizar historias médicas offline
export const syncOfflineHistories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { histories } = req.body;

  if (!Array.isArray(histories)) {
    throw new AppError('Las historias médicas deben ser un array', 400);
  }

  const syncedHistories = [];
  const errors = [];

  for (const historyData of histories) {
    try {
      const medicalHistory = await MedicalHistory.create({
        ...historyData,
        doctorId: req.user?._id,
        syncStatus: 'synced',
        isOffline: false
      });
      syncedHistories.push(medicalHistory);
    } catch (error) {
      errors.push({
        data: historyData,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  logger.info(`Sincronización completada: ${syncedHistories.length} exitosas, ${errors.length} errores`, {
    doctorId: req.user?._id,
    synced: syncedHistories.length,
    errors: errors.length
  });

  const response: ApiResponse = {
    success: true,
    message: `Sincronización completada: ${syncedHistories.length} historias sincronizadas`,
    data: {
      synced: syncedHistories,
      errors
    }
  };

  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORIES}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORIES}:anonymous:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_STATS}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_DIAGNOSES}:${req.user?._id ?? '*'}:*`);
  await invalidateCacheByPattern(`${CACHE_NAMESPACES.MEDICAL_HISTORY_AGE_STATS}:${req.user?._id ?? '*'}:*`);
  res.status(200).json(response);
});

// Obtener estadísticas de historias médicas
export const getMedicalHistoryStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const cacheKey = buildCacheKey(
    CACHE_NAMESPACES.MEDICAL_HISTORY_STATS,
    req.user?._id?.toString() ?? 'global',
    { scope: 'stats' }
  );

  const cachedStats = await getCachedValue<ApiResponse>(cacheKey);
  if (cachedStats) {
    res.setHeader('X-Cache-Status', 'HIT');
    res.setHeader('Cache-Control', 'private, max-age=600');
    return res.status(200).json(cachedStats);
  }

  const stats = await MedicalHistory.getStats();

  const response: ApiResponse = {
    success: true,
    message: 'Estadísticas obtenidas exitosamente',
    data: stats
  };

  await setCachedValue(cacheKey, response, TEN_MINUTES);
  res.setHeader('X-Cache-Status', 'MISS');
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.status(200).json(response);
});

// Obtener diagnósticos más comunes
export const getTopDiagnoses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);

  const cacheKey = buildCacheKey(
    CACHE_NAMESPACES.MEDICAL_HISTORY_DIAGNOSES,
    req.user?._id?.toString() ?? 'global',
    { limit }
  );

  const cachedDiagnoses = await getCachedValue<ApiResponse>(cacheKey);
  if (cachedDiagnoses) {
    res.setHeader('X-Cache-Status', 'HIT');
    res.setHeader('Cache-Control', 'private, max-age=600');
    return res.status(200).json(cachedDiagnoses);
  }

  const diagnoses = await MedicalHistory.getTopDiagnoses(limit);

  const response: ApiResponse = {
    success: true,
    message: 'Diagnósticos más comunes obtenidos exitosamente',
    data: diagnoses
  };

  await setCachedValue(cacheKey, response, TEN_MINUTES);
  res.setHeader('X-Cache-Status', 'MISS');
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.status(200).json(response);
});

// Obtener estadísticas por edad
export const getAgeStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const cacheKey = buildCacheKey(
    CACHE_NAMESPACES.MEDICAL_HISTORY_AGE_STATS,
    req.user?._id?.toString() ?? 'global',
    { scope: 'ageStats' }
  );

  const cachedAgeStats = await getCachedValue<ApiResponse>(cacheKey);
  if (cachedAgeStats) {
    res.setHeader('X-Cache-Status', 'HIT');
    res.setHeader('Cache-Control', 'private, max-age=600');
    return res.status(200).json(cachedAgeStats);
  }

  const ageStats = await MedicalHistory.getAgeStats();

  const response: ApiResponse = {
    success: true,
    message: 'Estadísticas por edad obtenidas exitosamente',
    data: ageStats
  };

  await setCachedValue(cacheKey, response, TEN_MINUTES);
  res.setHeader('X-Cache-Status', 'MISS');
  res.setHeader('Cache-Control', 'private, max-age=600');
  res.status(200).json(response);
});

// Buscar historias médicas por ubicación
export const getMedicalHistoriesByLocation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { latitude, longitude, radius = 10 } = req.query;

  if (!latitude || !longitude) {
    throw new AppError('Latitud y longitud son requeridas', 400);
  }

  const histories = await MedicalHistory.findByLocation(
    Number(latitude),
    Number(longitude),
    Number(radius)
  );

  const response: ApiResponse = {
    success: true,
    message: 'Historias médicas por ubicación obtenidas exitosamente',
    data: histories
  };

  res.status(200).json(response);
});

// Obtener historias médicas por rango de fechas
export const getMedicalHistoriesByDateRange = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new AppError('Fecha de inicio y fecha de fin son requeridas', 400);
  }

  const histories = await MedicalHistory.findByDateRange(
    new Date(startDate as string),
    new Date(endDate as string)
  );

  const response: ApiResponse = {
    success: true,
    message: 'Historias médicas por rango de fechas obtenidas exitosamente',
    data: histories
  };

  res.status(200).json(response);
});

// Exportar historias médicas
export const exportMedicalHistories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { format = 'json', startDate, endDate } = req.query;

  let histories;
  if (startDate && endDate) {
    histories = await MedicalHistory.findByDateRange(
      new Date(startDate as string),
      new Date(endDate as string)
    );
  } else {
    histories = await MedicalHistory.find().sort({ date: -1 });
  }

  if (format === 'csv') {
    // Convertir a CSV
    const csv = convertToCSV(histories);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=medical-histories.csv');
    res.send(csv);
  } else {
    const response: ApiResponse = {
      success: true,
      message: 'Historias médicas exportadas exitosamente',
      data: histories
    };
    res.status(200).json(response);
  }
});

// Función auxiliar para convertir a CSV
const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';

  const headers = [
    'ID',
    'Paciente',
    'Edad',
    'Diagnóstico',
    'Fecha',
    'Síntomas',
    'Ubicación',
    'Estado de Sincronización'
  ];

  const rows = data.map(history => [
    history._id,
    history.patientName,
    history.age,
    history.diagnosis,
    history.date.toISOString(),
    history.symptoms.map((s: any) => s.name).join('; '),
    history.location ? `${history.location.latitude}, ${history.location.longitude}` : '',
    history.syncStatus
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};
