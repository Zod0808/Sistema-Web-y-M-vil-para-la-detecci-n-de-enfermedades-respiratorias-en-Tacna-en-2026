/**
 * Appointments endpoints (dev-only)
 *
 * JWT-verified list + upcoming + availability generator. Falls back to
 * SAMPLE_APPOINTMENTS if the Mongoose model isn't loaded. Mounted at
 * /api/v1/appointments BEFORE the production appointmentsRoutes.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const router = Router();

interface SampleAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  reason: string;
  notes?: string;
}

const SAMPLE_APPOINTMENTS: SampleAppointment[] = [
  {
    id: 'apt-001',
    patientId: 'patient-456',
    doctorId: 'doctor-123',
    scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    status: 'scheduled',
    reason: 'Consulta de control',
    notes: 'Paciente con historial de asma leve',
  },
  {
    id: 'apt-002',
    patientId: 'patient-789',
    doctorId: 'doctor-123',
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 30,
    status: 'scheduled',
    reason: 'Evaluación de tos persistente',
  },
  {
    id: 'apt-003',
    patientId: 'patient-123',
    doctorId: 'doctor-999',
    scheduledAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 45,
    status: 'completed',
    reason: 'Control post tratamiento',
  },
];

const normalizeArrayParam = (value: unknown): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.flatMap((item) => String(item).split(','));
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const requireBearer = (req: Request, res: Response): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token requerido' });
    return null;
  }
  const secret = process.env['JWT_SECRET'] ?? 'dev-secret-key-change-in-production';
  try {
    const decoded: any = jwt.verify(authHeader.substring(7), secret);
    const userId = decoded.userId ?? decoded.id ?? decoded._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'No se pudo identificar al usuario' });
      return null;
    }
    return userId;
  } catch (e: any) {
    res.status(401).json({ success: false, message: 'Token inválido', error: e.message });
    return null;
  }
};

// ---------------------------------------------------------------------------
// GET / — list appointments with role-based filtering
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  const userId = requireBearer(req, res);
  if (!userId) return;

  let userRole: string | null = null;
  try {
    const UserModel = (mongoose.models as any).User;
    if (UserModel && userId) {
      const u = await UserModel.findById(userId).select('role');
      if (u) userRole = u.role;
    }
  } catch {
    // ignore — proceed without role enforcement
  }

  const { status, from, to } = req.query as Record<string, string>;
  let { doctorId, patientId } = req.query as Record<string, string | undefined>;

  if (userRole === 'patient') {
    patientId = userId;
    doctorId = undefined;
  } else if (userRole === 'doctor') {
    doctorId = userId;
  }

  try {
    const Appointment = (mongoose.models as any).Appointment;
    if (!Appointment) {
      return res.json({ success: true, message: 'Listado de citas', data: [] });
    }

    const query: Record<string, any> = {};
    if (patientId) query.patientId = String(patientId);
    if (doctorId) query.doctorId = String(doctorId);

    const statusFilter = normalizeArrayParam(status);
    if (statusFilter && statusFilter.length > 0) query.status = { $in: statusFilter };

    if (from || to) {
      query.scheduledAt = {};
      if (from) query.scheduledAt.$gte = new Date(String(from));
      if (to) query.scheduledAt.$lte = new Date(String(to));
    }

    const results = await Appointment.find(query).sort({ scheduledAt: 1 }).limit(200).lean();
    res.json({ success: true, message: 'Listado de citas', data: results });
  } catch (err: any) {
    logger.error('appointments list failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error al obtener citas', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /me/upcoming — logged-in user's upcoming scheduled appointments
// ---------------------------------------------------------------------------
router.get('/me/upcoming', async (req: Request, res: Response) => {
  const userId = requireBearer(req, res);
  if (!userId) return;

  try {
    let Appointment: mongoose.Model<any> | null = null;
    try {
      Appointment = mongoose.model('Appointment');
    } catch {
      // Fallback: sample data
      const now = new Date();
      const mock = SAMPLE_APPOINTMENTS
        .filter(
          (a) =>
            a.patientId === String(userId) &&
            (a.status === 'scheduled' || a.status === 'rescheduled') &&
            new Date(a.scheduledAt) >= now,
        )
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      return res.json({ success: true, data: mock });
    }

    const now = new Date();
    const upcoming = await Appointment!
      .find({
        patientId: userId,
        status: { $in: ['scheduled', 'rescheduled'] },
        scheduledAt: { $gte: now },
      })
      .sort({ scheduledAt: 1 })
      .limit(10)
      .lean();

    res.json({ success: true, data: upcoming });
  } catch (err: any) {
    logger.error('appointments upcoming failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error al obtener citas próximas', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /doctor/:doctorId/availability — 30-min slots (mock)
// ---------------------------------------------------------------------------
interface AvailabilityInput {
  doctorId: string;
  start: string;
  end: string;
  slotMinutes?: number;
}

const buildAvailabilitySlots = ({ doctorId, start, end, slotMinutes = 30 }: AvailabilityInput) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const slots: Array<{ start: string; end: string; available: boolean }> = [];

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return slots;

  const busySlots = SAMPLE_APPOINTMENTS
    .filter((a) => a.doctorId === doctorId && a.status !== 'cancelled')
    .map((a) => {
      const s = new Date(a.scheduledAt);
      const e = new Date(s.getTime() + a.durationMinutes * 60 * 1000);
      return { start: s, end: e };
    });

  for (
    let cursor = new Date(startDate);
    cursor < endDate;
    cursor = new Date(cursor.getTime() + slotMinutes * 60 * 1000)
  ) {
    const slotEnd = new Date(cursor.getTime() + slotMinutes * 60 * 1000);
    if (slotEnd > endDate) break;
    const overlap = busySlots.some((b) => cursor < b.end && slotEnd > b.start);
    slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString(), available: !overlap });
  }
  return slots;
};

router.get('/doctor/:doctorId/availability', (req: Request, res: Response) => {
  const doctorId = req.params['doctorId']!;
  const { start, end, slotMinutes } = req.query as Record<string, string>;

  if (!start || !end) {
    return res.status(400).json({ success: false, message: 'Los parámetros start y end son obligatorios' });
  }
  const slots = buildAvailabilitySlots({
    doctorId,
    start,
    end,
    slotMinutes: slotMinutes ? Number(slotMinutes) : 30,
  });
  res.json({ success: true, message: 'Disponibilidad generada (mock)', data: slots });
});

export default router;
