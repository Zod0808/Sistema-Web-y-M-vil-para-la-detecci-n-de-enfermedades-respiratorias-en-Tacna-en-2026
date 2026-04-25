import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types';
import { labService } from '../services/labService';
import { logger } from '../utils/logger';
import { requirePermission } from '../middleware/rbac';

/**
 * Controlador para gestión de resultados de laboratorio
 * Proporciona endpoints para visualización, historial y gestión
 */

/**
 * GET /api/v1/lab/results
 * Obtener resultados de laboratorio con filtros
 */
export const getLabResults = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      patientId,
      testCode,
      status,
      flagged,
      startDate,
      endDate,
      laboratoryId,
    } = req.query;

    try {
      const results = await labService.getResults({
        patientId: patientId as string | undefined,
        testCode: testCode as string | undefined,
        status: status as 'normal' | 'abnormal' | 'critical' | undefined,
        flagged: flagged === 'true' ? true : flagged === 'false' ? false : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        laboratoryId: laboratoryId as string | undefined,
      });

      logger.info(`Resultados de laboratorio obtenidos`, {
        userId: req.user?._id,
        count: results.length,
        filters: req.query,
      });

      res.status(200).json({
        success: true,
        data: results,
        meta: {
          count: results.length,
        },
      });
    } catch (error: any) {
      logger.error(`Error al obtener resultados: ${error.message}`, {
        userId: req.user?._id,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/lab/results/:patientId/history
 * Obtener historial de exámenes de un paciente
 */
export const getPatientHistory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const history = await labService.getPatientHistory(
        patientId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );

      logger.info(`Historial de laboratorio obtenido`, {
        userId: req.user?._id,
        patientId,
        count: history.length,
      });

      res.status(200).json({
        success: true,
        data: history,
        meta: {
          patientId,
          count: history.length,
        },
      });
    } catch (error: any) {
      logger.error(`Error al obtener historial: ${error.message}`, {
        userId: req.user?._id,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/lab/results/:patientId/abnormal
 * Obtener resultados anormales de un paciente
 */
export const getAbnormalResults = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const results = await labService.getAbnormalResults(
        patientId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );

      logger.info(`Resultados anormales obtenidos`, {
        userId: req.user?._id,
        patientId,
        count: results.length,
      });

      res.status(200).json({
        success: true,
        data: results,
        meta: {
          patientId,
          count: results.length,
          critical: results.filter((r) => r.status === 'critical').length,
          abnormal: results.filter((r) => r.status === 'abnormal').length,
        },
      });
    } catch (error: any) {
      logger.error(`Error al obtener resultados anormales: ${error.message}`, {
        userId: req.user?._id,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/lab/results/:patientId/critical
 * Obtener resultados críticos de un paciente
 */
export const getCriticalResults = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const results = await labService.getCriticalResults(
        patientId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );

      logger.info(`Resultados críticos obtenidos`, {
        userId: req.user?._id,
        patientId,
        count: results.length,
      });

      res.status(200).json({
        success: true,
        data: results,
        meta: {
          patientId,
          count: results.length,
        },
      });
    } catch (error: any) {
      logger.error(`Error al obtener resultados críticos: ${error.message}`, {
        userId: req.user?._id,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/lab/results/:patientId/latest/:testCode
 * Obtener último resultado de un examen específico
 */
export const getLatestResult = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { patientId, testCode } = req.params;

    if (!patientId || !testCode) {
      throw new AppError('patientId y testCode son requeridos', 400);
    }

    try {
      const result = await labService.getLatestResult(patientId, testCode);

      if (!result) {
        throw new AppError(`No se encontró resultado para ${testCode}`, 404);
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error al obtener último resultado: ${error.message}`, {
        userId: req.user?._id,
        patientId,
        testCode,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/lab/results/:patientId/summary
 * Obtener resumen de resultados de un paciente
 */
export const getPatientSummary = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const summary = await labService.getPatientSummary(
        patientId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      logger.error(`Error al obtener resumen: ${error.message}`, {
        userId: req.user?._id,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/lab/results/:resultId/review
 * Marcar resultado como revisado
 */
export const markAsReviewed = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { resultId } = req.params;

    if (!resultId) {
      throw new AppError('resultId es requerido', 400);
    }

    if (!req.user?._id) {
      throw new AppError('Usuario no autenticado', 401);
    }

    try {
      await labService.markAsReviewed(resultId, req.user._id.toString());

      logger.info(`Resultado marcado como revisado`, {
        userId: req.user._id,
        resultId,
      });

      res.status(200).json({
        success: true,
        message: 'Resultado marcado como revisado',
      });
    } catch (error: any) {
      logger.error(`Error al marcar como revisado: ${error.message}`, {
        userId: req.user?._id,
        resultId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/lab/results/:resultId/flag
 * Marcar resultado para revisión
 */
export const flagForReview = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { resultId } = req.params;
    const { reason } = req.body;

    if (!resultId) {
      throw new AppError('resultId es requerido', 400);
    }

    try {
      await labService.flagForReview(resultId, reason);

      logger.info(`Resultado marcado para revisión`, {
        userId: req.user?._id,
        resultId,
        reason,
      });

      res.status(200).json({
        success: true,
        message: 'Resultado marcado para revisión',
      });
    } catch (error: any) {
      logger.error(`Error al marcar para revisión: ${error.message}`, {
        userId: req.user?._id,
        resultId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/lab/results/import
 * Importar y guardar resultados automáticamente
 */
export const importAndSaveResults = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { patientId, startDate, endDate } = req.body;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const result = await labService.importAndSaveResults(
        patientId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );

      logger.info(`Importación automática completada`, {
        userId: req.user?._id,
        patientId,
        imported: result.imported,
        saved: result.saved,
        errors: result.errors,
      });

      res.status(200).json({
        success: true,
        message: 'Importación completada',
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error en importación automática: ${error.message}`, {
        userId: req.user?._id,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

