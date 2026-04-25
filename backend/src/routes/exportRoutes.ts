/**
 * Export Routes
 * Routes for data export functionality
 */

import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  exportMedicalHistories,
  exportUserStats,
  getExportFormats,
  getExportHistory
} from '../controllers/exportController';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Apply authentication to all routes
router.use(auth);

// Export medical histories validation
const exportMedicalHistoriesValidation = [
  body('format')
    .optional()
    .isIn(['json', 'csv', 'pdf'])
    .withMessage('El formato debe ser json, csv o pdf'),
  body('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('La fecha de inicio debe ser válida (ISO 8601)'),
  body('dateTo')
    .optional()
    .isISO8601()
    .withMessage('La fecha de fin debe ser válida (ISO 8601)'),
  body('patientId')
    .optional()
    .isMongoId()
    .withMessage('ID de paciente inválido'),
  body('doctorId')
    .optional()
    .isMongoId()
    .withMessage('ID de doctor inválido'),
  body('includeImages')
    .optional()
    .isBoolean()
    .withMessage('includeImages debe ser un booleano'),
  body('includeAudio')
    .optional()
    .isBoolean()
    .withMessage('includeAudio debe ser un booleano')
];

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100')
];

/**
 * @route   POST /api/v1/export/medical-histories
 * @desc    Export medical histories in various formats
 * @access  Private (Patient, Doctor, Admin)
 */
router.post('/medical-histories', exportMedicalHistoriesValidation, validate, exportMedicalHistories);

/**
 * @route   POST /api/v1/export/user-statistics
 * @desc    Export user statistics
 * @access  Private (Admin only)
 */
router.post('/user-statistics', exportUserStats);

/**
 * @route   GET /api/v1/export/formats
 * @desc    Get available export formats
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/formats', getExportFormats);

/**
 * @route   GET /api/v1/export/history
 * @desc    Get export history
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/history', paginationValidation, validate, getExportHistory);

export default router;
