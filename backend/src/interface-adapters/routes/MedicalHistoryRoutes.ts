// Rutas de Historial Médico - Capa de Interfaz
import { Router } from 'express';
import { DependencyContainer } from '../../infrastructure/container/DependencyContainer';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
const container = DependencyContainer.getInstance();
const medicalHistoryController = container.getMedicalHistoryController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD básicas
router.post('/', asyncHandler(medicalHistoryController.createMedicalHistory.bind(medicalHistoryController)));
router.get('/:id', asyncHandler(medicalHistoryController.getMedicalHistory.bind(medicalHistoryController)));

// Rutas de consulta específicas
router.get('/patient/:patientId', asyncHandler(medicalHistoryController.getMedicalHistoriesByPatient.bind(medicalHistoryController)));
router.get('/doctor/:doctorId', asyncHandler(medicalHistoryController.getMedicalHistoriesByDoctor.bind(medicalHistoryController)));

// Rutas administrativas
router.get('/', asyncHandler(medicalHistoryController.getAllMedicalHistories.bind(medicalHistoryController)));
router.get('/search', asyncHandler(medicalHistoryController.searchMedicalHistories.bind(medicalHistoryController)));
router.get('/urgent/cases', asyncHandler(medicalHistoryController.getUrgentCases.bind(medicalHistoryController)));
router.get('/sync/pending', asyncHandler(medicalHistoryController.getPendingSyncRecords.bind(medicalHistoryController)));
router.get('/statistics', asyncHandler(medicalHistoryController.getStatistics.bind(medicalHistoryController)));

// Rutas de sincronización
router.put('/:id/sync', asyncHandler(medicalHistoryController.syncMedicalHistory.bind(medicalHistoryController)));

export default router;
