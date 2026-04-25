import { Router } from 'express';
import {
  createMedicalHistory,
  getMedicalHistories,
  getMedicalHistoryById,
  updateMedicalHistory,
  deleteMedicalHistory,
  syncOfflineHistories,
  getMedicalHistoryStats,
  getTopDiagnoses,
  getAgeStats,
  getMedicalHistoriesByLocation,
  getMedicalHistoriesByDateRange,
  exportMedicalHistories
} from '../controllers/medicalHistoryController';
import { authenticate, authorize } from '../middleware/auth';
import { requireRole, requirePermission } from '../middleware/rbac';
import { validateRequest } from '../middleware/validation';
import { 
  createMedicalHistorySchema,
  updateMedicalHistorySchema,
  syncOfflineHistoriesSchema
} from '../validators/medicalHistoryValidators';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas CRUD básicas
router.post('/', 
  authorize('doctor', 'admin'), 
  validateRequest(createMedicalHistorySchema), 
  createMedicalHistory
);

// GET: Pacientes solo ven sus propias historias, médicos y admins ven todas
router.get('/', getMedicalHistories);
router.get('/stats', requireRole('doctor'), getMedicalHistoryStats);
router.get('/top-diagnoses', requireRole('doctor'), getTopDiagnoses);
router.get('/age-stats', requireRole('doctor'), getAgeStats);
router.get('/export', requirePermission('reports:export'), exportMedicalHistories);

// Rutas de búsqueda (solo médicos y admins)
router.get('/location', requireRole('doctor'), getMedicalHistoriesByLocation);
router.get('/date-range', requireRole('doctor'), getMedicalHistoriesByDateRange);

// Rutas por ID: Pacientes solo ven sus propias historias (validado en controller)
router.get('/:id', getMedicalHistoryById);
router.put('/:id', 
  authorize('doctor', 'admin'), 
  validateRequest(updateMedicalHistorySchema), 
  updateMedicalHistory
);
router.delete('/:id', 
  authorize('doctor', 'admin'), 
  deleteMedicalHistory
);

// Ruta especial para sincronización offline
router.post('/sync', 
  authorize('doctor', 'admin'), 
  validateRequest(syncOfflineHistoriesSchema), 
  syncOfflineHistories
);

export default router;
