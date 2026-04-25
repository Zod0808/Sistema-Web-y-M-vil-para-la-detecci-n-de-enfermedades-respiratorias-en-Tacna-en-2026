/**
 * SMS Routes
 * Rutas para gestión de SMS y métricas
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole as authorize } from '../middleware/rbac';
import {
  getSMSMetrics,
  getSMSCosts,
  getRateLimitStats,
} from '../controllers/smsMetricsController';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Métricas de SMS (solo admin)
router.get('/metrics', authorize('admin'), getSMSMetrics);
router.get('/metrics/costs', authorize('admin'), getSMSCosts);
router.get('/metrics/rate-limit', authorize('admin'), getRateLimitStats);

export default router;

