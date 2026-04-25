/**
 * File Upload Routes
 * Routes for file uploads and management
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  uploadMedicalFiles,
  getFileInfo,
  deleteFile,
  getUploadStats,
  cleanupOldFiles
} from '../controllers/fileUploadController';
import { uploadFiles } from '../services/fileUploadService';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { validate } from '../middleware/validation';

const router = Router();

// Apply authentication to all routes
router.use(auth);

// File path validation
const filePathValidation = [
  param('filePath')
    .notEmpty()
    .withMessage('Ruta de archivo requerida')
    .matches(/^\/uploads\/(images|audio)\/[a-zA-Z0-9\-\.]+$/)
    .withMessage('Ruta de archivo inválida')
];

// Cleanup validation
const cleanupValidation = [
  body('daysOld')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('El número de días debe estar entre 1 y 365')
];

/**
 * @route   POST /api/v1/upload/medical-files
 * @desc    Upload medical files (images and audio)
 * @access  Private (Patient, Doctor, Admin)
 */
router.post('/medical-files', uploadFiles, uploadMedicalFiles);

/**
 * @route   GET /api/v1/upload/file-info/:filePath
 * @desc    Get file information
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/file-info/:filePath', filePathValidation, validate, getFileInfo);

/**
 * @route   GET /api/v1/upload/stats
 * @desc    Get upload statistics
 * @access  Private (Admin only)
 */
router.get('/stats', requireRole('admin'), getUploadStats);

/**
 * @route   DELETE /api/v1/upload/file/:filePath
 * @desc    Delete file
 * @access  Private (Patient, Doctor, Admin)
 */
router.delete('/file/:filePath', filePathValidation, validate, deleteFile);

/**
 * @route   GET /api/v1/upload/stats
 * @desc    Get upload statistics
 * @access  Private (Admin only)
 */
router.get('/stats', getUploadStats);

/**
 * @route   POST /api/v1/upload/cleanup
 * @desc    Clean up old files
 * @access  Private (Admin only)
 */
router.post('/cleanup', cleanupValidation, validate, cleanupOldFiles);

export default router;
