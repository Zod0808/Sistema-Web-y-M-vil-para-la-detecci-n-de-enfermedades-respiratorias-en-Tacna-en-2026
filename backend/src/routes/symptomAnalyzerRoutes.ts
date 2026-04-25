/**
 * Symptom Analyzer Routes
 * Routes for symptom analysis and AI integration
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  analyzeSymptoms,
  analyzeSymptomsML,
  getSymptomTrends,
  getGeneralRecommendations,
  getAIServiceStatus,
  getSymptomAnalysisHistory,
  getSymptomStatistics
} from '../controllers/symptomAnalyzerController';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Apply authentication to all routes
router.use(auth);

// Symptom analysis validation
const symptomAnalysisValidation = [
  body('symptoms')
    .isArray({ min: 1 })
    .withMessage('Se requiere al menos un síntoma'),
  body('symptoms.*.symptom')
    .notEmpty()
    .withMessage('El nombre del síntoma es obligatorio')
    .isLength({ max: 100 })
    .withMessage('El nombre del síntoma no puede exceder 100 caracteres'),
  body('symptoms.*.severity')
    .isIn(['mild', 'moderate', 'severe'])
    .withMessage('La severidad debe ser mild, moderate o severe'),
  body('symptoms.*.duration')
    .notEmpty()
    .withMessage('La duración del síntoma es obligatoria')
    .isLength({ max: 50 })
    .withMessage('La duración no puede exceder 50 caracteres'),
  body('context')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El contexto no puede exceder 500 caracteres'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Los metadatos deben ser un objeto')
];

// Patient ID validation
const patientIdValidation = [
  param('patientId')
    .isMongoId()
    .withMessage('ID de paciente inválido')
];

// Period validation
const periodValidation = [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d'])
    .withMessage('El período debe ser 7d, 30d o 90d')
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
 * @route   POST /api/v1/symptom-analyzer/analyze
 * @desc    Analyze symptoms with AI (Legacy endpoint)
 * @access  Private (Patient, Doctor, Admin)
 */
router.post('/analyze', symptomAnalysisValidation, validate, analyzeSymptoms);

// ML Analysis validation (simpler format - just array of strings)
const mlAnalysisValidation = [
  body('symptoms')
    .isArray({ min: 1 })
    .withMessage('Se requiere al menos un síntoma'),
  body('symptoms.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Cada síntoma debe ser una cadena de texto válida')
    .isLength({ max: 200 })
    .withMessage('Cada síntoma no puede exceder 200 caracteres'),
  body('patient_age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('La edad debe ser un número entre 0 y 150'),
  body('risk_factors')
    .optional()
    .isArray()
    .withMessage('Los factores de riesgo deben ser un array'),
  body('risk_factors.*')
    .optional()
    .isString()
    .withMessage('Cada factor de riesgo debe ser una cadena de texto'),
  body('include_explanation')
    .optional()
    .isBoolean()
    .withMessage('include_explanation debe ser un booleano'),
  body('apply_personalization')
    .optional()
    .isBoolean()
    .withMessage('apply_personalization debe ser un booleano')
];

/**
 * @route   POST /api/v1/symptom-analyzer/ml-analyze
 * @desc    Analyze symptoms with ML models (Ensemble + SHAP + Personalization)
 * @access  Private (Patient, Doctor, Admin)
 */
router.post('/ml-analyze', mlAnalysisValidation, validate, analyzeSymptomsML);

/**
 * @route   GET /api/v1/symptom-analyzer/trends/:patientId
 * @desc    Get symptom trends for a patient
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/trends/:patientId', 
  patientIdValidation, 
  periodValidation, 
  validate, 
  getSymptomTrends
);

/**
 * @route   GET /api/v1/symptom-analyzer/recommendations
 * @desc    Get general symptom recommendations
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/recommendations', getGeneralRecommendations);

/**
 * @route   GET /api/v1/symptom-analyzer/status
 * @desc    Get AI service status
 * @access  Private (Doctor, Admin)
 */
router.get('/status', getAIServiceStatus);

/**
 * @route   GET /api/v1/symptom-analyzer/history/:patientId
 * @desc    Get symptom analysis history for a patient
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/history/:patientId', 
  patientIdValidation, 
  paginationValidation, 
  validate, 
  getSymptomAnalysisHistory
);

/**
 * @route   GET /api/v1/symptom-analyzer/statistics/:patientId
 * @desc    Get symptom statistics for a patient
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/statistics/:patientId', 
  patientIdValidation, 
  periodValidation, 
  validate, 
  getSymptomStatistics
);

export default router;
