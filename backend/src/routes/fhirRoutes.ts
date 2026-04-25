import { Router } from 'express';
import {
  getFhirResource,
  createFhirResource,
  searchFhirResources,
  patchFhirResource,
  processFhirBundle,
  parseHl7ToFhir,
  getCapabilities,
  validateFhirResourceEndpoint,
  validateFhirResourcesBatch,
  syncFromHospital,
  syncToHospital,
  syncBidirectional,
  getRegisteredHospitals,
} from '../controllers/fhirController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * Rutas FHIR RESTful
 * Implementa estándar HL7 FHIR R4 para interoperabilidad con sistemas externos
 * 
 * Requiere autenticación y permisos específicos según operación
 */

// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros
// para evitar que Express las capture incorrectamente

// Capabilities statement (metadata del servidor FHIR)
router.get('/capabilities', authenticate, requirePermission('fhir:read'), getCapabilities);

// Validación de recursos FHIR
router.post(
  '/validate',
  authenticate,
  requirePermission('fhir:read'),
  validateFhirResourceEndpoint,
);

router.post(
  '/validate/batch',
  authenticate,
  requirePermission('fhir:read'),
  validateFhirResourcesBatch,
);

// Sincronización con sistemas hospitalarios externos
router.get(
  '/sync/hospitals',
  authenticate,
  requirePermission('fhir:read'),
  getRegisteredHospitals,
);

router.post(
  '/sync/from/:hospitalName',
  authenticate,
  requirePermission('fhir:read'),
  syncFromHospital,
);

router.post(
  '/sync/to/:hospitalName',
  authenticate,
  requirePermission('fhir:create'),
  syncToHospital,
);

router.post(
  '/sync/bidirectional/:hospitalName',
  authenticate,
  requirePermission('fhir:create'),
  syncBidirectional,
);

// Bundle operations (transacciones y batches)
router.post(
  '/bundle',
  authenticate,
  requirePermission('fhir:create'),
  processFhirBundle,
);

// Conversión HL7 a FHIR (debe ir antes de /:resourceType)
router.post(
  '/hl7/parse',
  authenticate,
  requirePermission('fhir:create'),
  parseHl7ToFhir,
);

// Operaciones CRUD estándar FHIR (rutas con parámetros al final)
router.get(
  '/:resourceType/:id',
  authenticate,
  requirePermission('fhir:read'),
  getFhirResource,
);

router.post(
  '/:resourceType',
  authenticate,
  requirePermission('fhir:create'),
  createFhirResource,
);

router.get(
  '/:resourceType',
  authenticate,
  requirePermission('fhir:read'),
  searchFhirResources,
);

router.patch(
  '/:resourceType/:id',
  authenticate,
  requirePermission('fhir:update'),
  patchFhirResource,
);

export default router;

