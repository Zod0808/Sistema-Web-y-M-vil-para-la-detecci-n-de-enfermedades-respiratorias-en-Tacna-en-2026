/**
 * Emergency Routes
 * Rutas para gestión de emergencias médicas
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createEmergency,
  getEmergencyStatus,
  cancelEmergency,
  getActiveEmergencies,
  detectEmergency,
  getAmbulanceInfo,
  getEmergencyMedicalInfo,
  getEmergencyMedicalSummary,
  getHospitalNotifications,
  transferToHospital,
} from '../controllers/emergencyController';

const router = Router();

// Validaciones
const emergencyValidation = [
  body('emergencyType')
    .isIn(['medical', 'respiratory_crisis', 'accident', 'other'])
    .withMessage('emergencyType debe ser: medical, respiratory_crisis, accident u other'),
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('severity debe ser: low, medium, high o critical'),
  body('description')
    .isString()
    .notEmpty()
    .isLength({ min: 10, max: 1000 })
    .withMessage('description es requerido (10-1000 caracteres)'),
  body('location.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('location.latitude debe ser un número entre -90 y 90'),
  body('location.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('location.longitude debe ser un número entre -180 y 180'),
  body('location.address').optional().isString(),
  body('location.district').optional().isString(),
  body('symptoms').optional().isArray(),
  body('symptoms.*').optional().isString(),
  body('vitalSigns.heartRate').optional().isInt({ min: 0, max: 300 }),
  body('vitalSigns.oxygenSaturation').optional().isFloat({ min: 0, max: 100 }),
  body('vitalSigns.temperature').optional().isFloat({ min: 30, max: 45 }),
  body('vitalSigns.bloodPressure.systolic').optional().isInt({ min: 50, max: 250 }),
  body('vitalSigns.bloodPressure.diastolic').optional().isInt({ min: 30, max: 150 }),
  body('contactInfo.name').optional().isString(),
  body('contactInfo.phone').optional().isString(),
];

const detectEmergencyValidation = [
  body('symptoms')
    .isArray({ min: 1 })
    .withMessage('symptoms es requerido y debe ser un array con al menos un elemento'),
  body('symptoms.*').isString().withMessage('Cada síntoma debe ser un string'),
  body('location.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('location.latitude es requerido y debe ser un número entre -90 y 90'),
  body('location.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('location.longitude es requerido y debe ser un número entre -180 y 180'),
  body('vitalSigns').optional().isObject(),
];

// Rutas públicas (cualquier usuario autenticado puede crear emergencias)
router.post(
  '/',
  authenticate,
  emergencyValidation,
  validate,
  createEmergency
);

// Obtener emergencias activas del usuario
// IMPORTANTE: debe declararse antes de /:emergencyId para que Express no lo
// interprete como un parámetro dinámico.
router.get(
  '/active',
  authenticate,
  getActiveEmergencies
);

// Detectar emergencia automáticamente
router.post(
  '/detect',
  authenticate,
  detectEmergencyValidation,
  validate,
  detectEmergency
);

// Obtener estado de emergencia
router.get(
  '/:emergencyId',
  authenticate,
  getEmergencyStatus
);

// Cancelar emergencia
router.post(
  '/:emergencyId/cancel',
  authenticate,
  body('reason').optional().isString(),
  validate,
  cancelEmergency
);

// Obtener información de ambulancia (alias /ambulance-info por retrocompatibilidad)
router.get(
  '/:emergencyId/ambulance',
  authenticate,
  getAmbulanceInfo
);

router.get(
  '/:emergencyId/ambulance-info',
  authenticate,
  getAmbulanceInfo
);

// Obtener información médica de emergencia
router.get(
  '/:emergencyId/medical-info',
  authenticate,
  getEmergencyMedicalInfo
);

// Obtener resumen médico para servicios de emergencia
router.get(
  '/:emergencyId/medical-summary',
  authenticate,
  getEmergencyMedicalSummary
);

// Obtener información de hospitales notificados
router.get(
  '/:emergencyId/hospitals',
  authenticate,
  getHospitalNotifications
);

// Transferir información del paciente a un hospital
router.post(
  '/:emergencyId/transfer-to-hospital',
  authenticate,
  body('hospitalId').isString().notEmpty().withMessage('hospitalId es requerido'),
  body('patientId').isString().notEmpty().withMessage('patientId es requerido'),
  validate,
  transferToHospital
);

export default router;

