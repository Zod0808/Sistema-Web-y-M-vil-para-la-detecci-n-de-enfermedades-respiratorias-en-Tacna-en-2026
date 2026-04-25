/**
 * Automatic Report Routes
 * Rutas para gestión de reportes automáticos
 */

import { Router } from 'express';
import {
  getAllReports,
  getReportById,
  getLatestReport,
  generateReport,
  exportReport,
  getReportStats,
  getReportsByType,
} from '../controllers/automaticReportController';
import { auth } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbac';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(auth);

/**
 * @route   GET /api/v1/reports/automatic
 * @desc    Obtiene todos los reportes automáticos
 * @access  Private (Admin, Doctor)
 */
router.get('/', requirePermission('reports:read'), getAllReports);

/**
 * @route   GET /api/v1/reports/automatic/stats
 * @desc    Obtiene estadísticas de reportes automáticos
 * @access  Private (Admin only)
 */
router.get('/stats', requirePermission('reports:stats'), getReportStats);

/**
 * @route   GET /api/v1/reports/automatic/latest/:type
 * @desc    Obtiene el último reporte de un tipo específico
 * @access  Private (Admin, Doctor)
 */
router.get('/latest/:type', requirePermission('reports:read'), getLatestReport);

/**
 * @route   GET /api/v1/reports/automatic/:type/list
 * @desc    Obtiene reportes por tipo
 * @access  Private (Admin, Doctor)
 */
router.get('/:type/list', requirePermission('reports:read'), getReportsByType);

/**
 * @route   GET /api/v1/reports/automatic/:id
 * @desc    Obtiene un reporte automático por ID
 * @access  Private (Admin, Doctor)
 */
router.get('/:id', requirePermission('reports:read'), getReportById);

/**
 * @route   POST /api/v1/reports/automatic/generate
 * @desc    Genera un reporte automático manualmente
 * @access  Private (Admin only)
 */
router.post('/generate', requirePermission('reports:generate'), generateReport);

/**
 * @route   POST /api/v1/reports/automatic/:id/export
 * @desc    Exporta un reporte a un formato específico
 * @access  Private (Admin, Doctor)
 */
router.post('/:id/export', requirePermission('reports:export'), exportReport);

export default router;

