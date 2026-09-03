/**
 * Referral Routes
 * Gestiona CRUD y operaciones de referidos entre especialistas
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middleware/auth';
import { requireRole, requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import referralService from '../services/referralService';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { AppError } from '../utils/AppError';

const router = Router();

router.use(auth);

const referralValidation = [
  body('patientId').isString().notEmpty().withMessage('El paciente es obligatorio'),
  body('patientName').isString().notEmpty().withMessage('El nombre del paciente es obligatorio'),
  body('referringDoctorId').isString().notEmpty().withMessage('El doctor que refiere es obligatorio'),
  body('referringDoctorName').isString().notEmpty().withMessage('El nombre del doctor que refiere es obligatorio'),
  body('referralType')
    .isIn(['consultation', 'specialist', 'diagnostic', 'treatment', 'follow_up', 'emergency'])
    .withMessage('Tipo de referido inválido'),
  body('reason').isString().notEmpty().isLength({ max: 1000 }).withMessage('La razón es obligatoria (máx 1000 caracteres)'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Prioridad inválida'),
  body('clinicalNotes').optional().isString().isLength({ max: 5000 }),
  body('referredToDoctorId').optional().isString(),
  body('referredToSpecialty').optional().isString(),
  body('requestedDate').optional().isISO8601(),
  body('appointmentId').optional().isString(),
  body('medicalHistoryId').optional().isString(),
];

// Crear referido
router.post(
  '/',
  authorize('doctor', 'admin'),
  referralValidation,
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user?.role === 'doctor' && req.body.referringDoctorId !== req.user._id) {
      throw new AppError('No puede crear referidos para otros doctores', 403);
    }

    const referral = await referralService.createReferral({
      ...req.body,
      referringDoctorId: req.body.referringDoctorId || req.user!._id.toString(),
      referringDoctorName: req.body.referringDoctorName || req.user!.name,
    });

    res.status(201).json({
      success: true,
      data: referral,
      message: 'Referido creado exitosamente',
    } as ApiResponse);
  })
);

// Listar referidos
router.get(
  '/',
  authorize('doctor', 'admin', 'patient'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {};

    // Filtros según rol
    if (req.user?.role === 'patient') {
      filters.patientId = req.user._id.toString();
    } else if (req.user?.role === 'doctor') {
      // Doctores ven sus referidos enviados y recibidos
      filters.$or = [
        { referringDoctorId: req.user._id.toString() },
        { referredToDoctorId: req.user._id.toString() },
      ];
    }

    // Filtros opcionales
    if (req.query.patientId) {
      filters.patientId = req.query.patientId as string;
    }
    if (req.query.referringDoctorId) {
      filters.referringDoctorId = req.query.referringDoctorId as string;
    }
    if (req.query.referredToDoctorId) {
      filters.referredToDoctorId = req.query.referredToDoctorId as string;
    }
    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.referralType) {
      filters.referralType = req.query.referralType;
    }
    if (req.query.priority) {
      filters.priority = req.query.priority;
    }
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    const { page, limit } = parsePagination(req.query);

    const result = await referralService.listReferrals({
      ...filters,
      page,
      limit,
    });

    res.json({
      success: true,
      message: 'Referidos obtenidos correctamente',
      data: result.referrals,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    } as unknown as ApiResponse);
  })
);

// Obtener referido por ID
router.get(
  '/:id',
  authorize('doctor', 'admin', 'patient'),
  param('id').isMongoId().withMessage('ID de referido inválido'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await referralService.getReferralById(req.params.id);

    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    // Verificar permisos
    if (req.user?.role === 'patient' && referral.patientId !== req.user._id.toString()) {
      throw new AppError('No tiene acceso a este referido', 403);
    }
    if (
      req.user?.role === 'doctor' &&
      referral.referringDoctorId !== req.user._id.toString() &&
      referral.referredToDoctorId !== req.user._id.toString()
    ) {
      throw new AppError('No tiene acceso a este referido', 403);
    }

    res.json({
      success: true,
      data: referral,
    } as ApiResponse);
  })
);

// Actualizar referido
router.patch(
  '/:id',
  authorize('doctor', 'admin'),
  param('id').isMongoId().withMessage('ID de referido inválido'),
  body('reason').optional().isString().isLength({ max: 1000 }),
  body('clinicalNotes').optional().isString().isLength({ max: 5000 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('referredToDoctorId').optional().isString(),
  body('referredToSpecialty').optional().isString(),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await referralService.getReferralById(req.params.id);

    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    // Verificar permisos
    if (
      req.user?.role === 'doctor' &&
      referral.referringDoctorId !== req.user._id.toString() &&
      !req.user.permissions?.includes('manage_all_referrals')
    ) {
      throw new AppError('No tiene permisos para actualizar este referido', 403);
    }

    const updated = await referralService.updateReferral(
      req.params.id,
      req.body,
      req.user!._id.toString()
    );

    res.json({
      success: true,
      data: updated,
      message: 'Referido actualizado exitosamente',
    } as ApiResponse);
  })
);

// Aceptar referido
router.post(
  '/:id/accept',
  authorize('doctor', 'admin'),
  param('id').isMongoId().withMessage('ID de referido inválido'),
  body('referredToDoctorId').isString().notEmpty().withMessage('El doctor destino es obligatorio'),
  body('notes').optional().isString().isLength({ max: 5000 }),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await referralService.getReferralById(req.params.id);

    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    // Verificar que el doctor puede aceptar
    if (
      req.user?.role === 'doctor' &&
      req.body.referredToDoctorId !== req.user._id.toString() &&
      !req.user.permissions?.includes('manage_all_referrals')
    ) {
      throw new AppError('Solo puede aceptar referidos asignados a usted', 403);
    }

    const accepted = await referralService.acceptReferral(
      req.params.id,
      req.body.referredToDoctorId,
      req.body.notes,
      req.user!._id.toString()
    );

    res.json({
      success: true,
      data: accepted,
      message: 'Referido aceptado exitosamente',
    } as ApiResponse);
  })
);

// Rechazar referido
router.post(
  '/:id/reject',
  authorize('doctor', 'admin'),
  param('id').isMongoId().withMessage('ID de referido inválido'),
  body('reason').isString().notEmpty().withMessage('La razón del rechazo es obligatoria'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await referralService.getReferralById(req.params.id);

    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    // Verificar que el doctor puede rechazar
    if (
      req.user?.role === 'doctor' &&
      referral.referredToDoctorId !== req.user._id.toString() &&
      !req.user.permissions?.includes('manage_all_referrals')
    ) {
      throw new AppError('Solo puede rechazar referidos asignados a usted', 403);
    }

    const rejected = await referralService.rejectReferral(
      req.params.id,
      req.body.reason,
      req.user!._id.toString()
    );

    res.json({
      success: true,
      data: rejected,
      message: 'Referido rechazado',
    } as ApiResponse);
  })
);

// Completar referido
router.post(
  '/:id/complete',
  authorize('doctor', 'admin'),
  param('id').isMongoId().withMessage('ID de referido inválido'),
  body('notes').optional().isString().isLength({ max: 5000 }),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await referralService.getReferralById(req.params.id);

    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    // Verificar que el doctor puede completar
    if (
      req.user?.role === 'doctor' &&
      referral.referredToDoctorId !== req.user._id.toString() &&
      !req.user.permissions?.includes('manage_all_referrals')
    ) {
      throw new AppError('Solo puede completar referidos asignados a usted', 403);
    }

    const completed = await referralService.completeReferral(
      req.params.id,
      req.body.notes,
      req.user!._id.toString()
    );

    res.json({
      success: true,
      data: completed,
      message: 'Referido completado exitosamente',
    } as ApiResponse);
  })
);

// Cancelar referido
router.post(
  '/:id/cancel',
  authorize('doctor', 'admin'),
  param('id').isMongoId().withMessage('ID de referido inválido'),
  body('reason').optional().isString().isLength({ max: 1000 }),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referral = await referralService.getReferralById(req.params.id);

    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    // Verificar permisos
    if (
      req.user?.role === 'doctor' &&
      referral.referringDoctorId !== req.user._id.toString() &&
      !req.user.permissions?.includes('manage_all_referrals')
    ) {
      throw new AppError('Solo puede cancelar sus propios referidos', 403);
    }

    const cancelled = await referralService.cancelReferral(
      req.params.id,
      req.body.reason,
      req.user!._id.toString()
    );

    res.json({
      success: true,
      data: cancelled,
      message: 'Referido cancelado',
    } as ApiResponse);
  })
);

// Obtener estadísticas
router.get(
  '/stats/summary',
  authorize('doctor', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doctorId = req.user?.role === 'doctor' ? req.user._id.toString() : undefined;
    const stats = await referralService.getReferralStats(doctorId);

    res.json({
      success: true,
      data: stats,
    } as ApiResponse);
  })
);

// Obtener referidos pendientes
router.get(
  '/pending/list',
  authorize('doctor', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referrals = await referralService.getPendingReferrals();

    res.json({
      success: true,
      data: referrals,
    } as ApiResponse);
  })
);

// Obtener referidos vencidos
router.get(
  '/overdue/list',
  authorize('doctor', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const referrals = await referralService.getOverdueReferrals();

    res.json({
      success: true,
      data: referrals,
    } as ApiResponse);
  })
);

export default router;

