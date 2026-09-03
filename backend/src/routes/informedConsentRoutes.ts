/**
 * Informed Consent Routes
 * Gestiona consentimientos informados médicos y firmas electrónicas
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { auth, authorize } from '../middleware/auth';
import { requireRole, requirePermission } from '../middleware/rbac';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { parsePagination } from '../utils/pagination';
import consentService from '../services/consentService';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { AppError } from '../utils/AppError';

const router = Router();

router.use(auth);

const consentValidation = [
  body('patientId').isString().notEmpty().withMessage('El paciente es obligatorio'),
  body('patientName').isString().notEmpty().withMessage('El nombre del paciente es obligatorio'),
  body('doctorId').isString().notEmpty().withMessage('El doctor es obligatorio'),
  body('doctorName').isString().notEmpty().withMessage('El nombre del doctor es obligatorio'),
  body('consentType')
    .isIn(['procedure', 'treatment', 'surgery', 'research', 'data_sharing', 'photography', 'video_recording', 'other'])
    .withMessage('Tipo de consentimiento inválido'),
  body('title').isString().notEmpty().isLength({ max: 200 }).withMessage('El título es obligatorio (máx 200 caracteres)'),
  body('description').isString().notEmpty().isLength({ max: 5000 }).withMessage('La descripción es obligatoria (máx 5000 caracteres)'),
  body('procedureDetails').optional().isString().isLength({ max: 10000 }),
  body('risks').optional().isArray(),
  body('benefits').optional().isArray(),
  body('alternatives').optional().isArray(),
  body('expiresAt').optional().isISO8601(),
  body('appointmentId').optional().isString(),
  body('medicalHistoryId').optional().isString(),
];

// Crear consentimiento
router.post(
  '/',
  authorize('doctor', 'admin'),
  consentValidation,
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user?.role === 'doctor' && req.body.doctorId !== req.user._id) {
      throw new AppError('No puede crear consentimientos para otros doctores', 403);
    }

    const consent = await consentService.createConsent({
      ...req.body,
      doctorId: req.body.doctorId || req.user!._id.toString(),
      doctorName: req.body.doctorName || req.user!.name,
    });

    res.status(201).json({
      success: true,
      data: consent,
      message: 'Consentimiento creado exitosamente',
    } as ApiResponse);
  })
);

// Listar consentimientos
router.get(
  '/',
  authorize('doctor', 'admin', 'patient'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filters: any = {};

    // Filtros según rol
    if (req.user?.role === 'patient') {
      filters.patientId = req.user._id.toString();
    } else if (req.user?.role === 'doctor') {
      filters.doctorId = req.user._id.toString();
    }

    // Filtros opcionales
    if (req.query.patientId) {
      filters.patientId = req.query.patientId as string;
    }
    if (req.query.doctorId) {
      filters.doctorId = req.query.doctorId as string;
    }
    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.consentType) {
      filters.consentType = req.query.consentType;
    }
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    const { page, limit } = parsePagination(req.query);

    const result = await consentService.listConsents({
      ...filters,
      page,
      limit,
    });

    res.json({
      success: true,
      data: result.consents,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    } as unknown as ApiResponse);
  })
);

// Obtener consentimiento por ID
router.get(
  '/:id',
  authorize('doctor', 'admin', 'patient'),
  param('id').isMongoId().withMessage('ID de consentimiento inválido'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const consent = await consentService.getConsentById(req.params.id);

    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    // Verificar permisos
    if (req.user?.role === 'patient' && consent.patientId !== req.user._id.toString()) {
      throw new AppError('No tiene acceso a este consentimiento', 403);
    }
    if (
      req.user?.role === 'doctor' &&
      consent.doctorId !== req.user._id.toString() &&
      !req.user.permissions?.includes('manage_all_consents')
    ) {
      throw new AppError('No tiene acceso a este consentimiento', 403);
    }

    res.json({
      success: true,
      data: consent,
    } as ApiResponse);
  })
);

// Actualizar consentimiento
router.patch(
  '/:id',
  authorize('doctor', 'admin'),
  param('id').isMongoId().withMessage('ID de consentimiento inválido'),
  body('title').optional().isString().isLength({ max: 200 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('procedureDetails').optional().isString().isLength({ max: 10000 }),
  body('risks').optional().isArray(),
  body('benefits').optional().isArray(),
  body('alternatives').optional().isArray(),
  body('expiresAt').optional().isISO8601(),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const consent = await consentService.getConsentById(req.params.id);

    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    // Verificar permisos
    if (
      req.user?.role === 'doctor' &&
      consent.doctorId !== req.user._id.toString() &&
      !req.user.permissions?.includes('manage_all_consents')
    ) {
      throw new AppError('No tiene permisos para actualizar este consentimiento', 403);
    }

    const updated = await consentService.updateConsent(
      req.params.id,
      req.body,
      req.user!._id.toString()
    );

    res.json({
      success: true,
      data: updated,
      message: 'Consentimiento actualizado exitosamente',
    } as ApiResponse);
  })
);

// Presentar consentimiento al paciente
router.post(
  '/:id/present',
  authorize('doctor', 'admin'),
  param('id').isMongoId().withMessage('ID de consentimiento inválido'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const consent = await consentService.presentConsent(
      req.params.id,
      req.user!._id.toString()
    );

    res.json({
      success: true,
      data: consent,
      message: 'Consentimiento presentado al paciente',
    } as ApiResponse);
  })
);

// Agregar firma electrónica
router.post(
  '/:id/sign',
  authorize('doctor', 'admin', 'patient'),
  param('id').isMongoId().withMessage('ID de consentimiento inválido'),
  body('signerId').isString().notEmpty().withMessage('El ID del firmante es obligatorio'),
  body('signerName').isString().notEmpty().withMessage('El nombre del firmante es obligatorio'),
  body('signerRole')
    .isIn(['patient', 'doctor', 'witness', 'guardian'])
    .withMessage('Rol del firmante inválido'),
  body('signatureData').isString().notEmpty().withMessage('Los datos de firma son obligatorios'),
  body('signatureMethod')
    .isIn(['digital', 'biometric', 'click_to_sign', 'typed'])
    .withMessage('Método de firma inválido'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const consent = await consentService.getConsentById(req.params.id);

    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    // Verificar que el firmante es el usuario autenticado o tiene permisos
    if (req.body.signerRole === 'patient' && req.body.signerId !== req.user!._id.toString()) {
      throw new AppError('Solo puede firmar como paciente su propio consentimiento', 403);
    }

    const signed = await consentService.addSignature(
      req.params.id,
      {
        signerId: req.body.signerId,
        signerName: req.body.signerName,
        signerRole: req.body.signerRole,
        signatureData: req.body.signatureData,
        signatureMethod: req.body.signatureMethod,
        certificateHash: req.body.certificateHash,
      },
      {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      }
    );

    res.json({
      success: true,
      data: signed,
      message: 'Firma agregada exitosamente',
    } as ApiResponse);
  })
);

// Revocar consentimiento
router.post(
  '/:id/revoke',
  authorize('doctor', 'admin', 'patient'),
  param('id').isMongoId().withMessage('ID de consentimiento inválido'),
  body('reason').isString().notEmpty().isLength({ max: 1000 }).withMessage('La razón de revocación es obligatoria'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const consent = await consentService.getConsentById(req.params.id);

    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    // Verificar permisos
    if (
      req.user?.role === 'patient' &&
      consent.patientId !== req.user._id.toString()
    ) {
      throw new AppError('Solo puede revocar sus propios consentimientos', 403);
    }
    if (
      req.user?.role === 'doctor' &&
      consent.doctorId !== req.user._id.toString() &&
      !req.user.permissions?.includes('manage_all_consents')
    ) {
      throw new AppError('No tiene permisos para revocar este consentimiento', 403);
    }

    const revoked = await consentService.revokeConsent(
      req.params.id,
      req.body.reason,
      req.user!._id.toString()
    );

    res.json({
      success: true,
      data: revoked,
      message: 'Consentimiento revocado',
    } as ApiResponse);
  })
);

// Verificar firma
router.get(
  '/:id/verify-signature',
  authorize('doctor', 'admin'),
  param('id').isMongoId().withMessage('ID de consentimiento inválido'),
  query('hash').isString().notEmpty().withMessage('El hash de firma es obligatorio'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await consentService.verifySignature(
      req.params.id,
      req.query.hash as string
    );

    res.json({
      success: true,
      data: result,
    } as ApiResponse);
  })
);

// Generar PDF del consentimiento
router.get(
  '/:id/pdf',
  authorize('doctor', 'admin', 'patient'),
  param('id').isMongoId().withMessage('ID de consentimiento inválido'),
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const consent = await consentService.getConsentById(req.params.id);

    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    // Verificar permisos
    if (req.user?.role === 'patient' && consent.patientId !== req.user._id.toString()) {
      throw new AppError('No tiene acceso a este consentimiento', 403);
    }

    const pdf = await consentService.generateConsentPDF(req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="consentimiento-${consent._id}.pdf"`);
    res.send(pdf);
  })
);

// Obtener estadísticas
router.get(
  '/stats/summary',
  authorize('doctor', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doctorId = req.user?.role === 'doctor' ? req.user._id.toString() : undefined;
    const stats = await consentService.getConsentStats(doctorId);

    res.json({
      success: true,
      data: stats,
    } as ApiResponse);
  })
);

// Obtener consentimientos pendientes de firma
router.get(
  '/pending/list',
  authorize('doctor', 'admin', 'patient'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const patientId = req.user?.role === 'patient' ? req.user._id.toString() : undefined;
    const consents = await consentService.getPendingSignatures(patientId);

    res.json({
      success: true,
      data: consents,
    } as ApiResponse);
  })
);

// Obtener consentimientos expirados
router.get(
  '/expired/list',
  authorize('doctor', 'admin'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const consents = await consentService.getExpiredConsents();

    res.json({
      success: true,
      data: consents,
    } as ApiResponse);
  })
);

export default router;

