/**
 * Alert Routes
 * Rutas para la gestión avanzada de alertas y notificaciones
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import {
  acknowledgeAlert,
  createCriticalSymptomAlert,
  getAlertDashboardSummary,
  getAlertMonitoringMetrics,
  getUserAlerts,
  notifyDoctorForCriticalCase,
  processAlertsNow,
  scheduleFollowUpAlert,
  scheduleMedicationReminder,
} from '../controllers/alertController';
import { auth, authenticate, authorize, authorizeInternalOrRoles, INTERNAL_REQUEST_HEADER } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { config } from '../config/config';

const router = Router();

const allowedInternalTokens = config.security.internalTokens ?? [];
const criticalRoles = config.security.criticalAlertRoles ?? ['doctor', 'admin'];

const extractInternalToken = (req: Request): string | undefined => {
  const header = req.headers[INTERNAL_REQUEST_HEADER] ?? req.headers[INTERNAL_REQUEST_HEADER.toLowerCase()];
  if (!header) {
    return undefined;
  }
  return Array.isArray(header) ? header[0] : header;
};

const authOrInternal = (req: Request, res: Response, next: NextFunction) => {
  const token = extractInternalToken(req);
  if (token && allowedInternalTokens.includes(token)) {
    return next();
  }
  return authenticate(req as any, res, next);
};

const criticalSymptomValidation = [
  body('userId').isString().notEmpty().withMessage('userId es requerido'),
  body('symptomName').isString().notEmpty().withMessage('symptomName es requerido'),
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('severity debe ser low, medium, high o critical'),
  body('patientName').optional().isString(),
  body('patientId').optional().isString(),
  body('doctorId').optional().isString(),
  body('analysisId').optional().isString(),
];

const medicationReminderValidation = [
  body('userId').isString().notEmpty().withMessage('userId es requerido'),
  body('medicationName').isString().notEmpty().withMessage('medicationName es requerido'),
  body('dosage').isString().notEmpty().withMessage('dosage es requerido'),
  body('scheduleTime').isISO8601().withMessage('scheduleTime debe ser una fecha válida'),
  body('repeatIntervalMinutes').optional().isInt({ min: 5, max: 10080 }),
  body('instructions').optional().isString(),
  body('patientId').optional().isString(),
  body('doctorId').optional().isString(),
];

const followUpValidation = [
  body('userId').isString().notEmpty().withMessage('userId es requerido'),
  body('followUpDate').isISO8601().withMessage('followUpDate debe ser una fecha válida'),
  body('reason').isString().notEmpty().withMessage('reason es requerido'),
  body('patientId').optional().isString(),
  body('doctorId').optional().isString(),
  body('preferredChannel').optional().isArray(),
  body('preferredChannel.*')
    .optional()
    .isIn(['in_app', 'push', 'email', 'sms'])
    .withMessage('Los canales deben ser in_app, push, email o sms'),
];

const doctorNotificationValidation = [
  body('doctorId').isString().notEmpty().withMessage('doctorId es requerido'),
  body('patientId').isString().notEmpty().withMessage('patientId es requerido'),
  body('summary').isString().notEmpty().withMessage('summary es requerido'),
  body('urgency')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('urgency debe ser low, medium, high o critical'),
  body('triggeredBy')
    .isIn(['symptom_analysis', 'medication_schedule', 'follow_up_rule', 'manual', 'system', 'doctor_portal'])
    .withMessage('triggeredBy no es válido'),
];

const acknowledgeValidation = [param('alertId').isMongoId().withMessage('alertId inválido')];

const queryValidation = [
  query('status')
    .optional()
    .custom((value) => {
      const values = Array.isArray(value) ? value : [value];
      const allowed = ['pending', 'scheduled', 'sent', 'delivered', 'failed', 'acknowledged', 'expired'];
      if (!values.every((item) => allowed.includes(item))) {
        throw new Error('status inválido');
      }
      return true;
    }),
  query('category')
    .optional()
    .custom((value) => {
      const values = Array.isArray(value) ? value : [value];
      const allowed = ['critical_symptom', 'medication_reminder', 'follow_up', 'doctor_notification', 'system'];
      if (!values.every((item) => allowed.includes(item))) {
        throw new Error('category inválida');
      }
      return true;
    }),
  query('priority')
    .optional()
    .custom((value) => {
      const values = Array.isArray(value) ? value : [value];
      const allowed = ['low', 'medium', 'high', 'critical'];
      if (!values.every((item) => allowed.includes(item))) {
        throw new Error('priority inválida');
      }
      return true;
    }),
  query('doctorId').optional().isString(),
  query('userId').optional().isString(),
  query('patientId').optional().isString(),
  query('from').optional().isISO8601().withMessage('from debe ser fecha válida'),
  query('to').optional().isISO8601().withMessage('to debe ser fecha válida'),
];

router.post(
  '/critical-symptom',
  authOrInternal,
  authorizeInternalOrRoles(criticalRoles, allowedInternalTokens),
  criticalSymptomValidation,
  validate,
  createCriticalSymptomAlert
);
router.post(
  '/medication-reminders',
  auth,
  authorize('doctor', 'patient', 'admin'),
  medicationReminderValidation,
  validate,
  scheduleMedicationReminder
);
router.post('/follow-up', auth, authorize('doctor', 'admin'), followUpValidation, validate, scheduleFollowUpAlert);
router.post(
  '/doctor-notifications',
  authOrInternal,
  authorizeInternalOrRoles(['doctor', 'admin'], allowedInternalTokens),
  doctorNotificationValidation,
  validate,
  notifyDoctorForCriticalCase
);

// Ruta de prueba para verificar que las rutas están registradas (sin autenticación)
router.get('/test', (_req, res) => {
  res.json({ success: true, message: 'Alert routes are working' });
});

// IMPORTANTE: Las rutas GET específicas deben ir ANTES de las rutas con parámetros
router.get('/dashboard/summary', auth, authorize('admin'), getAlertDashboardSummary);
router.get('/monitoring', auth, authorize('admin'), getAlertMonitoringMetrics);
router.get('/', auth, queryValidation, validate, getUserAlerts);

// Rutas POST específicas
router.post('/admin/process', auth, authorize('admin'), processAlertsNow);

// Rutas con parámetros deben ir al final
router.post('/:alertId/acknowledge', auth, authorize('patient', 'doctor', 'admin'), acknowledgeValidation, validate, acknowledgeAlert);

export default router;

