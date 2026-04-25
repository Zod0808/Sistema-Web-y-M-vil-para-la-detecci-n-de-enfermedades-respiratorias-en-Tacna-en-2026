import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { fhirService, FhirResource, FhirBundle } from '../services/fhirService';
import { mapHl7ToFhirObservation, parseHl7Message, parseHl7Xml } from '../utils/hl7Parser';
import { hospitalSyncService } from '../services/hospitalSyncService';
import { validateFhirResource, validateFhirResources } from '../services/fhirValidator';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';
import { requirePermission } from '../middleware/rbac';

/**
 * Controlador para endpoints FHIR RESTful
 * Implementa operaciones CRUD y búsqueda según estándar HL7 FHIR R4
 */

/**
 * GET /api/v1/fhir/:resourceType/:id
 * Obtener un recurso FHIR específico
 */
export const getFhirResource = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { resourceType, id } = req.params;

    if (!resourceType || !id) {
      throw new AppError('resourceType e id son requeridos', 400);
    }

    // Validar resourceType según estándar FHIR
    const validResourceTypes = [
      'Patient',
      'Observation',
      'Condition',
      'Medication',
      'MedicationStatement',
      'Procedure',
      'DiagnosticReport',
      'Encounter',
      'AllergyIntolerance',
      'Immunization',
    ];

    if (!validResourceTypes.includes(resourceType)) {
      throw new AppError(`ResourceType ${resourceType} no es válido`, 400);
    }

    try {
      const resource = await fhirService.getResource<FhirResource>(resourceType, id);

      logger.info(`Recurso FHIR obtenido: ${resourceType}/${id}`, {
        userId: req.user?._id,
        resourceType,
        id,
      });

      res.status(200).json({
        success: true,
        data: resource,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new AppError(`Recurso ${resourceType}/${id} no encontrado`, 404);
      }
      throw error;
    }
  },
);

/**
 * POST /api/v1/fhir/:resourceType
 * Crear un nuevo recurso FHIR
 */
export const createFhirResource = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { resourceType } = req.params;
    const resource = req.body as FhirResource;

    if (!resourceType) {
      throw new AppError('resourceType es requerido', 400);
    }

    // Validar que el resourceType del body coincida con el de la URL
    if (resource.resourceType && resource.resourceType !== resourceType) {
      throw new AppError(
        `resourceType en body (${resource.resourceType}) no coincide con URL (${resourceType})`,
        400,
      );
    }

    // Asegurar resourceType
    resource.resourceType = resourceType;

    // Validar estructura básica FHIR
    if (!resource.resourceType) {
      throw new AppError('resourceType es requerido en el body', 400);
    }

    try {
      const createdResource = await fhirService.createResource<FhirResource>(resource);

      logger.info(`Recurso FHIR creado: ${resourceType}`, {
        userId: req.user?._id,
        resourceType,
        id: createdResource.id,
      });

      res.status(201).json({
        success: true,
        message: 'Recurso FHIR creado exitosamente',
        data: createdResource,
      });
    } catch (error: any) {
      logger.error(`Error al crear recurso FHIR: ${error.message}`, {
        userId: req.user?._id,
        resourceType,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/fhir/:resourceType
 * Buscar recursos FHIR con parámetros de búsqueda
 */
export const searchFhirResources = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { resourceType } = req.params;
    const searchParams = req.query as Record<string, string | number>;

    if (!resourceType) {
      throw new AppError('resourceType es requerido', 400);
    }

    try {
      const bundle = await fhirService.search<FhirBundle>(resourceType, searchParams);

      logger.info(`Búsqueda FHIR realizada: ${resourceType}`, {
        userId: req.user?._id,
        resourceType,
        params: searchParams,
        results: bundle.entry?.length || 0,
      });

      res.status(200).json({
        success: true,
        data: bundle,
        meta: {
          total: bundle.entry?.length || 0,
        },
      });
    } catch (error: any) {
      logger.error(`Error en búsqueda FHIR: ${error.message}`, {
        userId: req.user?._id,
        resourceType,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * PATCH /api/v1/fhir/:resourceType/:id
 * Actualizar parcialmente un recurso FHIR
 */
export const patchFhirResource = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { resourceType, id } = req.params;
    const patchOperations = req.body as Array<Record<string, unknown>>;

    if (!resourceType || !id) {
      throw new AppError('resourceType e id son requeridos', 400);
    }

    if (!Array.isArray(patchOperations)) {
      throw new AppError('patchOperations debe ser un array de operaciones JSON Patch', 400);
    }

    try {
      const updatedResource = await fhirService.patchResource<FhirResource>(
        resourceType,
        id,
        patchOperations,
      );

      logger.info(`Recurso FHIR actualizado: ${resourceType}/${id}`, {
        userId: req.user?._id,
        resourceType,
        id,
      });

      res.status(200).json({
        success: true,
        message: 'Recurso FHIR actualizado exitosamente',
        data: updatedResource,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new AppError(`Recurso ${resourceType}/${id} no encontrado`, 404);
      }
      throw error;
    }
  },
);

/**
 * POST /api/v1/fhir/bundle
 * Procesar un Bundle FHIR (transacción o batch)
 */
export const processFhirBundle = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const bundle = req.body as FhirBundle;

    if (!bundle || bundle.resourceType !== 'Bundle') {
      throw new AppError('Body debe ser un Bundle FHIR válido', 400);
    }

    if (!['transaction', 'batch'].includes(bundle.type)) {
      throw new AppError('Bundle type debe ser "transaction" o "batch"', 400);
    }

    try {
      const result = await fhirService.syncBundle(bundle);

      logger.info(`Bundle FHIR procesado: ${bundle.type}`, {
        userId: req.user?._id,
        type: bundle.type,
        entries: bundle.entry?.length || 0,
      });

      res.status(200).json({
        success: true,
        message: `Bundle ${bundle.type} procesado exitosamente`,
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error al procesar Bundle FHIR: ${error.message}`, {
        userId: req.user?._id,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/fhir/hl7/parse
 * Convertir mensaje HL7 v2 a recurso FHIR Observation
 */
export const parseHl7ToFhir = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { message, format } = req.body;

    if (!message) {
      throw new AppError('Mensaje HL7 es requerido', 400);
    }

    try {
      let observation = null;

      if (format === 'v3' || format === 'xml') {
        // Parsear HL7 v3 XML
        const parsed = await parseHl7Xml(message);
        // Convertir a Observation (implementación simplificada)
        observation = {
          resourceType: 'Observation',
          status: 'final',
          code: {
            text: 'Observación desde HL7 v3',
          },
          effectiveDateTime: new Date().toISOString(),
        };
      } else {
        // Parsear HL7 v2
        observation = mapHl7ToFhirObservation(message);
      }

      if (!observation) {
        throw new AppError('No se pudo convertir el mensaje HL7 a Observation', 400);
      }

      logger.info('Mensaje HL7 parseado a FHIR', {
        userId: req.user?._id,
        format: format || 'v2',
      });

      res.status(200).json({
        success: true,
        data: observation,
      });
    } catch (error: any) {
      logger.error(`Error al parsear HL7: ${error.message}`, {
        userId: req.user?._id,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/fhir/capabilities
 * Obtener capabilities statement (metadata del servidor FHIR)
 */
export const getCapabilities = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // Retornar capabilities básico del servidor FHIR
    const basicCapabilities: FhirResource = {
      resourceType: 'CapabilityStatement',
      status: 'active',
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['application/fhir+json', 'application/fhir+xml'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Patient',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
              ],
            },
            {
              type: 'Observation',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
              ],
            },
            {
              type: 'Condition',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
              ],
            },
            {
              type: 'Medication',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
              ],
            },
            {
              type: 'DiagnosticReport',
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
              ],
            },
          ],
        },
      ],
    };

    res.status(200).json({
      success: true,
      data: basicCapabilities,
    });
  },
);

/**
 * POST /api/v1/fhir/validate
 * Validar un recurso FHIR según estándares médicos
 */
export const validateFhirResourceEndpoint = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const resource = req.body as FhirResource;

    if (!resource || !resource.resourceType) {
      throw new AppError('Recurso FHIR válido es requerido en el body', 400);
    }

    const validationResult = validateFhirResource(resource);

    logger.info(`Validación FHIR realizada: ${resource.resourceType}`, {
      userId: req.user?._id,
      resourceType: resource.resourceType,
      valid: validationResult.valid,
      errors: validationResult.errors.length,
      warnings: validationResult.warnings.length,
    });

    res.status(200).json({
      success: true,
      data: validationResult,
    });
  },
);

/**
 * POST /api/v1/fhir/validate/batch
 * Validar múltiples recursos FHIR
 */
export const validateFhirResourcesBatch = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const resources = req.body as FhirResource[];

    if (!Array.isArray(resources) || resources.length === 0) {
      throw new AppError('Array de recursos FHIR es requerido en el body', 400);
    }

    const validationResult = validateFhirResources(resources);

    logger.info(`Validación FHIR batch realizada`, {
      userId: req.user?._id,
      count: resources.length,
      valid: validationResult.valid,
      errors: validationResult.errors.length,
      warnings: validationResult.warnings.length,
    });

    res.status(200).json({
      success: true,
      data: validationResult,
    });
  },
);

/**
 * POST /api/v1/fhir/sync/from/:hospitalName
 * Sincronizar historial clínico desde sistema hospitalario externo
 */
export const syncFromHospital = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { hospitalName } = req.params;
    const { patientId, resourceTypes } = req.body;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const result = await hospitalSyncService.syncFromExternal(
        hospitalName,
        patientId,
        resourceTypes,
      );

      logger.info(`Sincronización desde hospital completada`, {
        userId: req.user?._id,
        hospitalName,
        patientId,
        imported: result.imported,
        errors: result.errors.length,
      });

      res.status(200).json({
        success: true,
        message: `Sincronización desde ${hospitalName} completada`,
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error en sincronización desde hospital: ${error.message}`, {
        userId: req.user?._id,
        hospitalName,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/fhir/sync/to/:hospitalName
 * Sincronizar historial clínico hacia sistema hospitalario externo
 */
export const syncToHospital = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { hospitalName } = req.params;
    const { patientId, resources } = req.body;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    if (!Array.isArray(resources) || resources.length === 0) {
      throw new AppError('resources debe ser un array no vacío', 400);
    }

    try {
      const result = await hospitalSyncService.syncToExternal(hospitalName, patientId, resources);

      logger.info(`Sincronización hacia hospital completada`, {
        userId: req.user?._id,
        hospitalName,
        patientId,
        exported: result.exported,
        errors: result.errors.length,
      });

      res.status(200).json({
        success: true,
        message: `Sincronización hacia ${hospitalName} completada`,
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error en sincronización hacia hospital: ${error.message}`, {
        userId: req.user?._id,
        hospitalName,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * POST /api/v1/fhir/sync/bidirectional/:hospitalName
 * Sincronización bidireccional con sistema hospitalario externo
 */
export const syncBidirectional = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { hospitalName } = req.params;
    const { patientId, resourceTypes } = req.body;

    if (!patientId) {
      throw new AppError('patientId es requerido', 400);
    }

    try {
      const result = await hospitalSyncService.syncBidirectional(
        hospitalName,
        patientId,
        resourceTypes,
      );

      logger.info(`Sincronización bidireccional completada`, {
        userId: req.user?._id,
        hospitalName,
        patientId,
        imported: result.from.imported,
        exported: result.to.exported,
      });

      res.status(200).json({
        success: true,
        message: `Sincronización bidireccional con ${hospitalName} completada`,
        data: result,
      });
    } catch (error: any) {
      logger.error(`Error en sincronización bidireccional: ${error.message}`, {
        userId: req.user?._id,
        hospitalName,
        patientId,
        error: error.message,
      });
      throw error;
    }
  },
);

/**
 * GET /api/v1/fhir/sync/hospitals
 * Obtener lista de sistemas hospitalarios registrados
 */
export const getRegisteredHospitals = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const hospitals = hospitalSyncService.getRegisteredHospitals();

    res.status(200).json({
      success: true,
      data: hospitals,
    });
  },
);

