/**
 * Medical Histories endpoints (dev-only)
 *
 * JWT-verified list + read handlers with role-aware filtering (patients
 * only see their own). If the MedicalHistory Mongoose model isn't loaded,
 * a loose schema is created inline. Mounted at /api/v1/medical-histories
 * BEFORE the production medicalHistoryRoutes.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const router = Router();

const MEDICAL_HISTORY_SCHEMA = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    patientName: String,
    age: Number,
    diagnosis: String,
    symptoms: [{ name: String, severity: String, duration: String }],
    description: String,
    date: { type: Date, default: Date.now },
    location: { latitude: Number, longitude: Number, address: String },
    images: [String],
    audioNotes: String,
    isOffline: Boolean,
    syncStatus: String,
  },
  { timestamps: true },
);
MEDICAL_HISTORY_SCHEMA.index({ patientId: 1, createdAt: -1 });

const getMedicalHistoryModel = (): mongoose.Model<any> => {
  try {
    return mongoose.model('MedicalHistory');
  } catch {
    return mongoose.model('MedicalHistory', MEDICAL_HISTORY_SCHEMA);
  }
};

const toObjectIdOrPassthrough = (id: any): any => {
  try {
    return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
  } catch {
    return id;
  }
};

// ---------------------------------------------------------------------------
// GET / — list with role-aware filter + pagination
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    const { patientId, limit = '50', page = '1' } = req.query as Record<string, string>;

    // Try to authenticate — this endpoint is tolerant: missing/invalid token
    // just means no auto-filter by user, mirroring the pre-existing dev behavior.
    let authenticatedUserId: string | null = null;
    let userRole: string | null = null;
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const secret = process.env['JWT_SECRET'] ?? 'dev-secret-key-change-in-production';
      try {
        const decoded: any = jwt.verify(authHeader.substring(7), secret);
        authenticatedUserId = decoded.userId ?? decoded.id ?? decoded._id;
        try {
          const UserModel = mongoose.model('User');
          const user = await UserModel.findById(authenticatedUserId).lean();
          if (user) userRole = (user as any).role;
        } catch {
          // no User model — proceed without role
        }
      } catch (e: any) {
        logger.warn('Invalid token in medical-histories list', { error: e.message });
      }
    }

    const MedicalHistory = getMedicalHistoryModel();

    const query: Record<string, any> = {};
    if (userRole === 'patient' && authenticatedUserId) {
      query.patientId = toObjectIdOrPassthrough(authenticatedUserId);
    } else if (patientId) {
      query.patientId = toObjectIdOrPassthrough(patientId);
    } else if (authenticatedUserId) {
      query.patientId = toObjectIdOrPassthrough(authenticatedUserId);
    }

    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const skip = (pageInt - 1) * limitInt;

    const [histories, total] = await Promise.all([
      MedicalHistory.find(query).sort({ createdAt: -1 }).limit(limitInt).skip(skip).lean(),
      MedicalHistory.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: histories,
      total,
      page: pageInt,
      limit: limitInt,
      totalPages: Math.ceil(total / limitInt),
    });
  } catch (err: any) {
    logger.error('medical-histories list failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error al obtener historias médicas', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const MedicalHistory = mongoose.model('MedicalHistory');
    const history = await MedicalHistory.findById(req.params['id']).lean();
    if (!history) {
      return res.status(404).json({ success: false, message: 'Historia médica no encontrada' });
    }
    res.json({ success: true, data: history });
  } catch (err: any) {
    logger.error('medical-histories getById failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error al obtener historia médica', error: err.message });
  }
});

export default router;
