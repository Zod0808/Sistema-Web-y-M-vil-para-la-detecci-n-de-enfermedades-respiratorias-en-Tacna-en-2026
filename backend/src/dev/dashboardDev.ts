/**
 * Dashboard endpoints (dev-only)
 *
 * Simple JWT-verified handlers used by the dev/demo frontend. Mounted at
 * `/api/v1/dashboard` BEFORE the production dashboardRoutes so its
 * `/patient` handler takes precedence in dev (Express matches in
 * registration order).
 *
 * The patient handler tolerates missing Mongoose models by creating a
 * loose schema on the fly — useful when the dev DB hasn't been seeded.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const router = Router();

const getOrCreateLooseModel = (name: string): mongoose.Model<any> => {
  try {
    return mongoose.model(name);
  } catch {
    const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
    return mongoose.model(name, schema);
  }
};

router.get('/patient', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }
    const token = authHeader.substring(7);
    const secret = process.env['JWT_SECRET'] ?? 'dev-secret-key-change-in-production';

    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e: any) {
      logger.warn('Invalid token in dashboard/patient', { error: e.message });
      return res.status(401).json({ success: false, message: 'Token de autenticación inválido' });
    }
    const authenticatedUserId = decoded.userId ?? decoded.id ?? decoded._id;
    if (!authenticatedUserId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    let userIdObj: mongoose.Types.ObjectId | string;
    try {
      userIdObj = typeof authenticatedUserId === 'string'
        ? new mongoose.Types.ObjectId(authenticatedUserId)
        : authenticatedUserId;
    } catch {
      userIdObj = authenticatedUserId;
    }

    const MedicalHistory = getOrCreateLooseModel('MedicalHistory');
    const Appointment = getOrCreateLooseModel('Appointment');
    const Alert = getOrCreateLooseModel('Alert');

    const patientIdVariants = [userIdObj, authenticatedUserId, String(authenticatedUserId)];

    const totalHistories = await MedicalHistory.countDocuments({
      $or: patientIdVariants.map((id) => ({ patientId: id })),
    }).catch(() => 0);

    const totalAppointments = await Appointment.countDocuments({
      $or: patientIdVariants.map((id) => ({ patientId: id })),
    }).catch(() => 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const upcomingAppointments = await Appointment.countDocuments({
      $and: [
        { $or: patientIdVariants.map((id) => ({ patientId: id })) },
        { status: { $in: ['scheduled', 'rescheduled'] } },
        { $or: [{ date: { $gte: now } }, { scheduledAt: { $gte: now } }] },
      ],
    }).catch(() => 0);

    const alertIdVariants = [
      ...patientIdVariants.map((id) => ({ userId: id })),
      ...patientIdVariants.map((id) => ({ patientId: id })),
    ];

    const activeAlerts = await Alert.countDocuments({
      $and: [
        { $or: alertIdVariants },
        {
          $or: [
            { acknowledged: false },
            { acknowledged: { $exists: false } },
            { status: { $ne: 'acknowledged' } },
          ],
        },
      ],
    }).catch(() => 0);

    res.json({
      success: true,
      data: {
        totalHistories,
        totalMedicalHistories: totalHistories,
        upcomingAppointments,
        totalAppointments,
        activeAlerts,
        totalAlerts: activeAlerts,
        recentActivity: [],
        healthScore: null,
        lastCheckup: null,
      },
    });
  } catch (err: any) {
    logger.error('dashboard/patient failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error al obtener datos del dashboard', error: err.message });
  }
});

router.get('/doctor', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { totalPatients: 0, todayAppointments: 0, pendingReports: 0, recentActivity: [] },
  });
});

router.get('/admin', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { totalUsers: 0, totalPatients: 0, totalDoctors: 0, systemHealth: 'operational' },
  });
});

export default router;
