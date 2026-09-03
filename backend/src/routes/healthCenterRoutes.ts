/**
 * HealthCenter Routes
 * Búsqueda de centros de salud cercanos (RF-012)
 */

import { Router } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { healthCenterService } from '../services/healthCenterService';

const router = Router();

router.use(authenticate);

const nearbyValidation = [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('latitude es requerido y debe ser un número entre -90 y 90'),
  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('longitude es requerido y debe ser un número entre -180 y 180'),
  query('maxDistanceKm').optional().isFloat({ min: 0.1, max: 100 }),
  query('type').optional().isIn(['hospital', 'centro_salud', 'posta_medica', 'clinica']),
  query('respiratoryOnly').optional().isBoolean(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

// GET /api/v1/health-centers/nearby?latitude=&longitude=&maxDistanceKm=&type=&respiratoryOnly=&limit=
router.get(
  '/nearby',
  nearbyValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { latitude, longitude, maxDistanceKm, type, respiratoryOnly, limit } = req.query;

    const results = await healthCenterService.findNearby({
      latitude: Number(latitude),
      longitude: Number(longitude),
      maxDistanceKm: maxDistanceKm ? Number(maxDistanceKm) : undefined,
      type: type as any,
      respiratoryOnly: respiratoryOnly === 'true',
      limit: limit ? Number(limit) : undefined,
    });

    res.status(200).json({
      success: true,
      data: results,
      meta: { count: results.length },
    });
  })
);

export default router;
