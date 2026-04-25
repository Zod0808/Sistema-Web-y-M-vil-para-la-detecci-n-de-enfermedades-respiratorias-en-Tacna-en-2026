/**
 * Prescription Routes
 * Endpoints REST para gestión de prescripciones médicas
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middleware/auth';
import { requireRole, requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { ApiResponse, AuthenticatedRequest } from '../types';
import prescriptionService from '../services/prescriptionService';

const router = Router();

router.use(auth);

const medicationValidation = [
  body('medications')
    .isArray({ min: 1, max: 20 })
    .withMessage('Debe incluir entre 1 y 20 medicamentos'),
  body('medications.*.name').isString().notEmpty().withMessage('El nombre del medicamento es obligatorio'),
  body('medications.*.dosage').isString().notEmpty().withMessage('La dosificación es obligatoria'),
  body('medications.*.frequencyPerDay')
    .isInt({ min: 1, max: 12 })
    .withMessage('La frecuencia por día debe estar entre 1 y 12'),
  body('medications.*.durationDays')
    .isInt({ min: 1, max: 365 })
    .withMessage('La duración debe estar entre 1 y 365 días'),
  body('medications.*.instructions').optional().isString().isLength({ max: 1000 }),
  body('medications.*.notes').optional().isString().isLength({ max: 1000 }),
  body('medications.*.reminderTimes').optional().isArray({ max: 10 }),
  body('medications.*.reminderTimes.*')
    .optional()
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('Los recordatorios deben tener formato HH:MM'),
];

const patientContextValidation = [
  body('patientContext').optional().isObject(),
  body('patientContext.age').optional().isInt({ min: 0, max: 120 }),
  body('patientContext.weightKg').optional().isFloat({ min: 0, max: 400 }),
  body('patientContext.allergies').optional().isArray({ max: 20 }),
];

router.post(
  '/',
  requireRole('doctor'), // Solo doctores pueden crear prescripciones
  [
    body('patientId').isString().notEmpty().withMessage('El paciente es obligatorio'),
    body('doctorId').isString().notEmpty().withMessage('El doctor es obligatorio'),
    body('diagnosis').optional().isString().isLength({ max: 2000 }),
    body('observations').optional().isString().isLength({ max: 4000 }),
    ...medicationValidation,
    ...patientContextValidation,
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user?.role === 'doctor' && req.body.doctorId !== req.user._id) {
      throw new AppError('No puede crear prescripciones para otros doctores', 403);
    }

    const prescription = await prescriptionService.createPrescription({
      patientId: req.body.patientId,
      doctorId: req.body.doctorId,
      createdBy: req.user!._id,
      diagnosis: req.body.diagnosis,
      observations: req.body.observations,
      medications: req.body.medications,
      patientContext: req.body.patientContext,
      metadata: req.body.metadata,
    });

    const response: ApiResponse = {
      success: true,
      message: 'Prescripción creada correctamente',
      data: prescription,
    };
    res.status(201).json(response);
  })
);

router.get(
  '/',
  [query('patientId').optional().isString(), query('doctorId').optional().isString()],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user?.role === 'patient') {
      const prescriptions = await prescriptionService.getPatientHistory(req.user._id);
      return res.status(200).json({
        success: true,
        message: 'Historial de prescripciones obtenido',
        data: prescriptions,
      } satisfies ApiResponse);
    }

    if (req.user?.role === 'doctor') {
      const prescriptions = await prescriptionService.getDoctorPrescriptions(req.user._id);
      return res.status(200).json({
        success: true,
        message: 'Prescripciones del doctor obtenidas',
        data: prescriptions,
      } satisfies ApiResponse);
    }

    const patientId = req.query.patientId ? String(req.query.patientId) : undefined;
    const doctorId = req.query.doctorId ? String(req.query.doctorId) : undefined;

    const data = patientId
      ? await prescriptionService.getPatientHistory(patientId)
      : doctorId
      ? await prescriptionService.getDoctorPrescriptions(doctorId)
      : [];

    res.status(200).json({
      success: true,
      message: 'Prescripciones obtenidas',
      data,
    } satisfies ApiResponse);
  })
);

router.get(
  '/:prescriptionId',
  [param('prescriptionId').isMongoId().withMessage('ID de prescripción inválido')],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const prescription = await prescriptionService.getPrescriptionById(req.params.prescriptionId);
    if (!prescription) {
      throw new AppError('La prescripción no existe', 404);
    }

    if (req.user?.role === 'patient' && prescription.patientId !== req.user._id) {
      throw new AppError('No tiene acceso a esta prescripción', 403);
    }
    if (req.user?.role === 'doctor' && prescription.doctorId !== req.user._id) {
      throw new AppError('No tiene acceso a esta prescripción', 403);
    }

    res.status(200).json({
      success: true,
      message: 'Prescripción obtenida correctamente',
      data: prescription,
    } satisfies ApiResponse);
  })
);

router.patch(
  '/:prescriptionId/status',
  authorize('doctor', 'admin'),
  [
    param('prescriptionId').isMongoId(),
    body('status').isIn(['draft', 'pending_validation', 'active', 'completed', 'cancelled', 'rejected']),
    body('notes').optional().isString(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const prescription = await prescriptionService.updateStatus(req.params.prescriptionId, req.body.status, {
      validatedBy: req.user?._id,
      notes: req.body.notes,
    });

    res.status(200).json({
      success: true,
      message: 'Estado actualizado correctamente',
      data: prescription,
    } satisfies ApiResponse);
  })
);

router.post(
  '/:prescriptionId/medications',
  authorize('doctor', 'admin'),
  [
    param('prescriptionId').isMongoId(),
    body('medication').isObject().withMessage('Debe enviar un medicamento'),
    body('medication.name').isString().notEmpty(),
    body('medication.dosage').isString().notEmpty(),
    body('medication.frequencyPerDay').isInt({ min: 1, max: 12 }),
    body('medication.durationDays').isInt({ min: 1, max: 365 }),
    body('patientContext').optional().isObject(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const prescription = await prescriptionService.appendMedication(
      req.params.prescriptionId,
      req.body.medication,
      req.body.patientContext
    );

    res.status(200).json({
      success: true,
      message: 'Medicamento agregado correctamente',
      data: prescription,
    } satisfies ApiResponse);
  })
);

export default router;

