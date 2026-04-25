import { Router } from 'express';
import {
  importLaboratoryResults,
  importLaboratoryFromHl7,
  syncLaboratoryResults,
  searchDrug,
  checkDrugInteractions,
  getDrugDosage,
  searchGenericDrugs,
  checkContraindications,
} from '../controllers/integrationController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * Rutas de integraciones externas
 * Requiere autenticación y permisos específicos
 */

// Rutas de laboratorio
router.post(
  '/laboratory/import',
  authenticate,
  requirePermission('integrations:manage'),
  importLaboratoryResults,
);

router.post(
  '/laboratory/hl7',
  authenticate,
  requirePermission('integrations:manage'),
  importLaboratoryFromHl7,
);

router.post(
  '/laboratory/sync',
  authenticate,
  requirePermission('integrations:manage'),
  syncLaboratoryResults,
);

// Rutas de medicamentos
router.get(
  '/drugs/search',
  authenticate,
  requirePermission('fhir:read'),
  searchDrug,
);

router.post(
  '/drugs/interactions',
  authenticate,
  requirePermission('fhir:read'),
  checkDrugInteractions,
);

router.get(
  '/drugs/dosage',
  authenticate,
  requirePermission('fhir:read'),
  getDrugDosage,
);

router.get(
  '/drugs/generics',
  authenticate,
  requirePermission('fhir:read'),
  searchGenericDrugs,
);

router.post(
  '/drugs/contraindications',
  authenticate,
  requirePermission('fhir:read'),
  checkContraindications,
);

export default router;

