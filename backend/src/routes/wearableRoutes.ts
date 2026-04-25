/**
 * Wearable Routes
 * Rutas para datos de wearables (HealthKit/Google Fit)
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  syncWearableData,
  getWearableData,
  getWearableMetrics
} from '../controllers/wearableController';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Todas las rutas requieren autenticación
router.use(auth);

// Validación para sincronización
const syncValidation = [
  body('data')
    .isArray({ min: 1 })
    .withMessage('Se requiere un array de datos'),
  body('data.*.heartRate')
    .optional()
    .isFloat({ min: 0, max: 300 })
    .withMessage('El ritmo cardíaco debe estar entre 0 y 300 bpm'),
  body('data.*.oxygenSaturation')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('La oxigenación debe estar entre 0 y 100%'),
  body('data.*.steps')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Los pasos deben ser un número entero positivo'),
  body('data.*.distance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La distancia debe ser un número positivo'),
  body('data.*.respiratoryRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('La frecuencia respiratoria debe estar entre 0 y 100 resp/min'),
  body('data.*.sleepHours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Las horas de sueño deben estar entre 0 y 24'),
  body('data.*.timestamp')
    .isISO8601()
    .withMessage('El timestamp debe ser una fecha válida'),
  body('data.*.source')
    .optional()
    .isIn(['apple_health', 'google_fit', 'manual', 'android_sensor'])
    .withMessage('La fuente debe ser apple_health, google_fit, manual o android_sensor')
];

// Validación de parámetros
const patientIdValidation = [
  param('patientId')
    .optional()
    .isMongoId()
    .withMessage('ID de paciente inválido')
];

// Validación de queries
const queryValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate debe ser una fecha válida'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate debe ser una fecha válida'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('El límite debe ser un número entre 1 y 1000'),
  query('hours')
    .optional()
    .isInt({ min: 1, max: 720 })
    .withMessage('Las horas deben estar entre 1 y 720 (30 días)')
];

/**
 * @route   POST /api/v1/wearables/sync
 * @desc    Sincronizar datos de wearables
 * @access  Private (Patient, Doctor, Admin)
 */
router.post('/sync', syncValidation, validate, syncWearableData);

/**
 * @route   GET /api/v1/wearables/data/:patientId?
 * @desc    Obtener datos de wearables de un paciente
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/data/:patientId?', patientIdValidation, queryValidation, validate, getWearableData);

/**
 * @route   GET /api/v1/wearables/metrics/:patientId?
 * @desc    Obtener métricas agregadas de wearables
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/metrics/:patientId?', patientIdValidation, queryValidation, validate, getWearableMetrics);

export default router;

