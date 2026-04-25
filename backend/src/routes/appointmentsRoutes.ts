/**
 * Appointment Routes
 * Gestiona CRUD y operaciones avanzadas de citas médicas
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middleware/auth';
import { requireRole, requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import appointmentService from '../services/appointmentService';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { AppError } from '../utils/AppError';

const router = Router();

router.use(auth);

const appointmentValidation = [
  body('patientId').isString().notEmpty().withMessage('El paciente es obligatorio'),
  body('doctorId').isString().notEmpty().withMessage('El doctor es obligatorio'),
  body('scheduledAt').isISO8601().withMessage('La fecha programada debe ser válida'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 15, max: 240 })
    .withMessage('La duración debe estar entre 15 y 240 minutos'),
  body('reason').optional().isString().isLength({ max: 240 }),
  body('notes').optional().isString().isLength({ max: 2000 }),
  body('location')
    .optional()
    .isObject()
    .withMessage('La ubicación debe ser un objeto'),
  body('reminderMinutesBefore')
    .optional()
    .isInt({ min: 5, max: 24 * 60 })
    .withMessage('El recordatorio debe estar entre 5 y 1440 minutos'),
];

router.post(
  '/',
  authorize('doctor', 'admin', 'patient'),
  appointmentValidation,
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user?.role === 'patient' && req.body.patientId !== req.user._id) {
      throw new AppError('No puede crear citas para otros pacientes', 403);
    }
    if (req.user?.role === 'doctor' && req.body.doctorId !== req.user._id) {
      throw new AppError('No puede crear citas para otros doctores', 403);
    }

    const payload = {
      patientId: req.body.patientId,
      doctorId: req.body.doctorId,
      createdBy: req.user!._id,
      scheduledAt: new Date(req.body.scheduledAt),
      durationMinutes: req.body.durationMinutes,
      reason: req.body.reason,
      notes: req.body.notes,
      location: req.body.location,
      reminderMinutesBefore: req.body.reminderMinutesBefore,
      tags: req.body.tags,
      metadata: req.body.metadata,
    };

    const appointment = await appointmentService.createAppointment(payload);
    const response: ApiResponse = {
      success: true,
      message: 'Cita creada exitosamente',
      data: appointment,
    };

    res.status(201).json(response);
  })
);

router.get(
  '/',
  [
    query('doctorId').optional().isString(),
    query('patientId').optional().isString(),
    query('status').optional().isString(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    const status = req.query.status ? String(req.query.status).split(',') : undefined;
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    let doctorId: string | undefined = req.query.doctorId ? String(req.query.doctorId) : undefined;
    let patientId: string | undefined = req.query.patientId ? String(req.query.patientId) : undefined;

    if (user.role === 'patient') {
      patientId = user._id;
      doctorId = undefined;
    } else if (user.role === 'doctor') {
      doctorId = user._id;
    }

    const data = await appointmentService.listAppointments({
      doctorId,
      patientId,
      status: status as any,
      from,
      to,
    });

    const response: ApiResponse = {
      success: true,
      message: 'Citas obtenidas correctamente',
      data,
    };
    res.status(200).json(response);
  })
);

router.get(
  '/me/upcoming',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      throw new AppError('No autenticado', 401);
    }

    const data = await appointmentService.listAppointments({
      patientId: req.user.role === 'patient' ? req.user._id : undefined,
      doctorId: req.user.role === 'doctor' ? req.user._id : undefined,
      from: new Date(),
    });

    const response: ApiResponse = {
      success: true,
      message: 'Próximas citas obtenidas correctamente',
      data,
    };
    res.status(200).json(response);
  })
);

router.get(
  '/doctor/:doctorId/availability',
  authorize('doctor', 'admin'),
  [
    param('doctorId').isString().notEmpty(),
    query('start').isISO8601().withMessage('start es requerido y debe ser fecha válida'),
    query('end').isISO8601().withMessage('end es requerido y debe ser fecha válida'),
    query('slotMinutes').optional().isInt({ min: 15, max: 240 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    if (req.user?.role === 'doctor' && req.params.doctorId !== req.user._id) {
      throw new AppError('No puede consultar disponibilidad de otros doctores', 403);
    }

    const slots = await appointmentService.getDoctorAvailability(String(req.params.doctorId), {
      start: new Date(String(req.query.start)),
      end: new Date(String(req.query.end)),
      slotMinutes: req.query.slotMinutes ? Number(req.query.slotMinutes) : undefined,
    });

    const response: ApiResponse = {
      success: true,
      message: 'Disponibilidad obtenida correctamente',
      data: slots,
    };
    res.status(200).json(response);
  })
);

router.get(
  '/:appointmentId',
  [param('appointmentId').isMongoId().withMessage('ID de cita inválido')],
  validate,
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.getAppointmentById(req.params.appointmentId);
    if (!appointment) {
      throw new AppError('La cita médica no existe', 404);
    }
    if (req.user?.role === 'patient' && appointment.patientId !== req.user._id) {
      throw new AppError('No tiene acceso a esta cita', 403);
    }
    if (req.user?.role === 'doctor' && appointment.doctorId !== req.user._id) {
      throw new AppError('No tiene acceso a esta cita', 403);
    }
    const response: ApiResponse = {
      success: true,
      message: 'Cita obtenida correctamente',
      data: appointment,
    };
    res.status(200).json(response);
  })
);

router.put(
  '/:appointmentId',
  authorize('doctor', 'admin'),
  [
    param('appointmentId').isMongoId(),
    body('durationMinutes').optional().isInt({ min: 15, max: 240 }),
    body('reason').optional().isString(),
    body('notes').optional().isString(),
    body('location').optional().isObject(),
    body('reminderMinutesBefore').optional().isInt({ min: 5, max: 24 * 60 }),
    body('tags').optional().isArray(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.updateAppointment(req.params.appointmentId, req.body);
    const response: ApiResponse = {
      success: true,
      message: 'Cita actualizada correctamente',
      data: appointment,
    };
    res.status(200).json(response);
  })
);

router.patch(
  '/:appointmentId/cancel',
  authorize('doctor', 'admin'),
  [param('appointmentId').isMongoId(), body('reason').optional().isString()],
  validate,
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.cancelAppointment(req.params.appointmentId, req.body.reason);
    const response: ApiResponse = {
      success: true,
      message: 'Cita cancelada correctamente',
      data: appointment,
    };
    res.status(200).json(response);
  })
);

router.patch(
  '/:appointmentId/reschedule',
  authorize('doctor', 'admin'),
  [
    param('appointmentId').isMongoId(),
    body('scheduledAt').isISO8601().withMessage('La nueva fecha es obligatoria'),
    body('durationMinutes').optional().isInt({ min: 15, max: 240 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.rescheduleAppointment(req.params.appointmentId, {
      scheduledAt: new Date(req.body.scheduledAt),
      durationMinutes: req.body.durationMinutes,
      metadata: req.body.metadata,
    });

    const response: ApiResponse = {
      success: true,
      message: 'Cita reprogramada correctamente',
      data: appointment,
    };
    res.status(200).json(response);
  })
);

router.patch(
  '/:appointmentId/complete',
  authorize('doctor', 'admin'),
  [param('appointmentId').isMongoId(), body('notes').optional().isString()],
  validate,
  asyncHandler(async (req, res) => {
    const appointment = await appointmentService.completeAppointment(req.params.appointmentId, req.body.notes);
    const response: ApiResponse = {
      success: true,
      message: 'Cita marcada como completada',
      data: appointment,
    };
    res.status(200).json(response);
  })
);

export default router;

