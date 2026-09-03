/**
 * Educational Content Routes
 * Módulo educativo (RF-011, CU-007: Consultar información educativa)
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createContent,
  deleteContent,
  getContentById,
  getPersonalizedContent,
  listContent,
  updateContent,
} from '../controllers/educationalContentController';
import { auth, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

const EDUCATIONAL_CATEGORIES = ['asma', 'epoc', 'covid19', 'influenza', 'neumonia', 'prevencion', 'general'];

const contentValidation = [
  body('title').isString().notEmpty().withMessage('El título es obligatorio'),
  body('summary').isString().notEmpty().withMessage('El resumen es obligatorio'),
  body('content').isString().notEmpty().withMessage('El contenido es obligatorio'),
  body('category').isIn(EDUCATIONAL_CATEGORIES).withMessage('Categoría inválida'),
  body('targetConditions').optional().isArray(),
  body('targetConditions.*').optional().isString(),
  body('targetAgeRange').optional().isObject(),
  body('targetAgeRange.min').optional().isInt({ min: 0, max: 150 }),
  body('targetAgeRange.max').optional().isInt({ min: 0, max: 150 }),
  body('tags').optional().isArray(),
  body('imageUrl').optional().isString(),
];

const updateContentValidation = [
  body('title').optional().isString().notEmpty(),
  body('summary').optional().isString().notEmpty(),
  body('content').optional().isString().notEmpty(),
  body('category').optional().isIn(EDUCATIONAL_CATEGORIES).withMessage('Categoría inválida'),
  body('targetConditions').optional().isArray(),
  body('targetConditions.*').optional().isString(),
  body('targetAgeRange').optional().isObject(),
  body('targetAgeRange.min').optional().isInt({ min: 0, max: 150 }),
  body('targetAgeRange.max').optional().isInt({ min: 0, max: 150 }),
  body('tags').optional().isArray(),
  body('imageUrl').optional().isString(),
  body('isActive').optional().isBoolean(),
];

const listValidation = [
  query('category').optional().isIn(EDUCATIONAL_CATEGORIES).withMessage('Categoría inválida'),
  query('isActive').optional().isBoolean(),
];

const idValidation = [param('id').isMongoId().withMessage('El identificador del contenido es inválido')];

router.use(auth);

// GET /api/v1/educational-content -> contenido personalizado según perfil/historial del paciente autenticado
router.get('/', getPersonalizedContent);

// Gestión de contenido (roles clínicos/administrativos)
router.get('/manage', authorize('doctor', 'admin'), listValidation, validate, listContent);
router.post('/', authorize('doctor', 'admin'), contentValidation, validate, createContent);
router.patch('/:id', authorize('doctor', 'admin'), idValidation, updateContentValidation, validate, updateContent);
router.delete('/:id', authorize('admin'), idValidation, validate, deleteContent);

// Detalle de contenido: registra la consulta en el historial de actividad del usuario (CU-007)
router.get('/:id', idValidation, validate, getContentById);

export default router;
