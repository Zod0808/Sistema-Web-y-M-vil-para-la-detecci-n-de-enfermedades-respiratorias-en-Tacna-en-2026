import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types';
import { laboratoryIntegrationService } from '../services/laboratoryIntegrationService';
import { drugIntegrationService } from '../services/drugIntegrationService';
import { requirePermission } from '../middleware/rbac';
import { logger } from '../utils/logger';

/**
 * Controlador para integraciones externas
 * Maneja integraciones con laboratorios, APIs de medicamentos, etc.
 */

/**
 * POST /api/v1/integrations/laboratory/import
 * Importar resultados de laboratorio
 */
export const importLaboratoryResults = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { patientId, startDate, endDate } = req.body;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const results = await laboratoryIntegrationService.importResults(
        patientId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );

      logger.info(`Resultados de laboratorio importados`, {
        userId: req.user?._id,
        patientId,
        count: results.length,
      });

      res.status(200).json({
        success: true,
        message: `${results.length} resultados importados exitosamente`,
        data: results,
      });
    } catch (error: any) {
      logger.error(`Error al importar resultados: ${error.message}`, {
        userId: req.user?._id,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/integrations/laboratory/hl7
 * Importar resultado desde mensaje HL7
 */
export const importLaboratoryFromHl7 = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { hl7Message } = req.body;

    if (!hl7Message) {
      throw new AppError('hl7Message es requerido', 400);
    }

    try {
      const result = await laboratoryIntegrationService.importFromHl7(hl7Message);

      if (!result) {
        throw new AppError('No se pudo parsear el mensaje HL7', 400);
      }

      logger.info(`Resultado de laboratorio importado desde HL7`, {
        userId: req.user?._id,
        patientId: result.patientId,
      });

      res.status(200).json({
        success: true,
        message: 'Resultado importado exitosamente',
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error al importar desde HL7: ${error.message}`, {
        userId: req.user?._id,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/integrations/laboratory/sync
 * Sincronizar resultados bidireccionalmente
 */
export const syncLaboratoryResults = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { patientId } = req.body;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const result = await laboratoryIntegrationService.syncResults(patientId);

      logger.info(`Sincronización de laboratorio completada`, {
        userId: req.user?._id,
        patientId,
        imported: result.imported,
        exported: result.exported,
      });

      res.status(200).json({
        success: true,
        message: 'Sincronización completada',
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error en sincronización: ${error.message}`, {
        userId: req.user?._id,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/integrations/drugs/search
 * Buscar información de medicamento
 */
export const searchDrug = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
      throw new AppError('name es requerido', 400);
    }

    try {
      const drugInfo = await drugIntegrationService.searchDrug(name);

      if (!drugInfo) {
        throw new AppError(`Medicamento "${name}" no encontrado`, 404);
      }

      res.status(200).json({
        success: true,
        data: drugInfo,
      });
    } catch (error: any) {
      logger.error(`Error al buscar medicamento: ${error.message}`, {
        userId: req.user?._id,
        drugName: name,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/integrations/drugs/interactions
 * Verificar interacciones entre medicamentos
 */
export const checkDrugInteractions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { drugs } = req.body;

    if (!Array.isArray(drugs) || drugs.length < 2) {
      throw new AppError('Se requieren al menos 2 medicamentos', 400);
    }

    try {
      const interactions = await drugIntegrationService.checkInteractions(drugs);

      logger.info(`Interacciones verificadas`, {
        userId: req.user?._id,
        drugCount: drugs.length,
        interactionCount: interactions.length,
      });

      res.status(200).json({
        success: true,
        data: interactions,
        meta: {
          drugsChecked: drugs.length,
          interactionsFound: interactions.length,
        },
      });
    } catch (error: any) {
      logger.error(`Error al verificar interacciones: ${error.message}`, {
        userId: req.user?._id,
        drugs,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/integrations/drugs/dosage
 * Obtener dosificación recomendada
 */
export const getDrugDosage = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { name, condition, age, weight } = req.query;

    if (!name || typeof name !== 'string') {
      throw new AppError('name es requerido', 400);
    }

    try {
      const dosage = await drugIntegrationService.getDosage(
        name,
        condition as string | undefined,
        age ? parseInt(age as string) : undefined,
        weight ? parseFloat(weight as string) : undefined,
      );

      if (!dosage) {
        throw new AppError(`Dosificación no disponible para "${name}"`, 404);
      }

      res.status(200).json({
        success: true,
        data: dosage,
      });
    } catch (error: any) {
      logger.error(`Error al obtener dosificación: ${error.message}`, {
        userId: req.user?._id,
        drugName: name,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/integrations/drugs/generics
 * Buscar medicamentos genéricos por nombre de marca
 */
export const searchGenericDrugs = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { brandName } = req.query;

    if (!brandName || typeof brandName !== 'string') {
      throw new AppError('brandName es requerido', 400);
    }

    try {
      const genericDrugs = await drugIntegrationService.searchGenericDrugs(brandName);

      logger.info(`Búsqueda de genéricos realizada`, {
        userId: req.user?._id,
        brandName,
        count: genericDrugs.length,
      });

      res.status(200).json({
        success: true,
        data: genericDrugs,
        meta: {
          brandName,
          genericCount: genericDrugs.length,
        },
      });
    } catch (error: any) {
      logger.error(`Error al buscar genéricos: ${error.message}`, {
        userId: req.user?._id,
        brandName,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/integrations/drugs/contraindications
 * Verificar contraindicaciones para un medicamento
 */
export const checkContraindications = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { drugName, patientContext } = req.body;

    if (!drugName || typeof drugName !== 'string') {
      throw new AppError('drugName es requerido', 400);
    }

    if (!patientContext || typeof patientContext !== 'object') {
      throw new AppError('patientContext es requerido', 400);
    }

    try {
      const result = await drugIntegrationService.checkContraindications(drugName, patientContext);

      logger.info(`Contraindicaciones verificadas`, {
        userId: req.user?._id,
        drugName,
        contraindicated: result.contraindicated,
        alertsCount: result.alerts.length,
      });

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          drugName,
          contraindicated: result.contraindicated,
          alertsCount: result.alerts.length,
          errorAlerts: result.alerts.filter((a) => a.severity === 'error').length,
          warningAlerts: result.alerts.filter((a) => a.severity === 'warning').length,
        },
      });
    } catch (error: any) {
      logger.error(`Error al verificar contraindicaciones: ${error.message}`, {
        userId: req.user?._id,
        drugName,
        error: error.message,
      });
      throw error;
    }
  },
);

