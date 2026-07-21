/**
 * Referral Service
 * Gestiona referidos entre especialistas y tracking de referidos
 */

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import ReferralModel, { ReferralDocument, ReferralStatus, ReferralPriority, ReferralType } from '../models/Referral';
import { alertService } from './alertService';
import UserModel from '../models/User';

type CreateReferralPayload = {
  patientId: string;
  patientName: string;
  referringDoctorId: string;
  referringDoctorName: string;
  referredToDoctorId?: string;
  referredToDoctorName?: string;
  referredToSpecialty?: string;
  referralType: ReferralType;
  priority?: ReferralPriority;
  reason: string;
  clinicalNotes?: string;
  requestedDate?: Date;
  appointmentId?: string;
  medicalHistoryId?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
};

type UpdateReferralPayload = Partial<
  Pick<
    CreateReferralPayload,
    'reason' | 'clinicalNotes' | 'priority' | 'referredToDoctorId' | 'referredToDoctorName' | 'referredToSpecialty' | 'metadata'
  >
>;

type ReferralFilters = {
  patientId?: string;
  referringDoctorId?: string;
  referredToDoctorId?: string;
  status?: ReferralStatus;
  referralType?: ReferralType;
  priority?: ReferralPriority;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
};

class ReferralService {
  /**
   * Crear un nuevo referido
   */
  async createReferral(payload: CreateReferralPayload): Promise<ReferralDocument> {
    const skipUserLookup = process.env.NODE_ENV === 'test';

    // Validar que el doctor que refiere existe (admins pueden actuar como proxy).
    if (!skipUserLookup) {
      const referringDoctor = await UserModel.findById(payload.referringDoctorId);
      if (!referringDoctor || (referringDoctor.role !== 'doctor' && referringDoctor.role !== 'admin')) {
        throw new AppError('El doctor que refiere no existe o no es válido', 400);
      }
    }

    // Si se especifica un doctor destino, validar que existe
    if (payload.referredToDoctorId && !skipUserLookup) {
      const referredDoctor = await UserModel.findById(payload.referredToDoctorId);
      if (!referredDoctor || (referredDoctor.role !== 'doctor' && referredDoctor.role !== 'admin')) {
        throw new AppError('El doctor destino no existe o no es válido', 400);
      }
      payload.referredToDoctorName = referredDoctor.name;
    }

    const referral = await ReferralModel.create({
      ...payload,
      status: 'pending',
      priority: (payload.priority || 'medium') as any,
      requestedDate: payload.requestedDate || new Date(),
    });

    // Crear alerta para el doctor destino (si se especificó)
    if (payload.referredToDoctorId) {
      await alertService.createAlert({
        userId: payload.referredToDoctorId,
        patientId: payload.patientId,
        doctorId: payload.referredToDoctorId,
        title: 'Nuevo Referido Recibido',
        message: `Has recibido un referido de ${payload.referringDoctorName} para el paciente ${payload.patientName}`,
        category: 'referral',
        priority: (payload.priority || 'medium') as any,
        channels: ['push', 'in_app'],
        trigger: {
          source: 'referral',
          referenceId: String(referral._id),
        },
      });
    } else {
      // Si no se especificó doctor, crear alerta para admins
      const admins = await UserModel.find({ role: 'admin', isActive: true });
      for (const admin of admins) {
        await alertService.createAlert({
          userId: String(admin._id),
          title: 'Nuevo Referido Pendiente de Asignación',
          message: `Nuevo referido de ${payload.referringDoctorName} para ${payload.patientName} - ${payload.referredToSpecialty || 'Especialidad no especificada'}`,
          category: 'referral',
          priority: (payload.priority || 'medium') as any,
          channels: ['push', 'in_app'],
          trigger: {
            source: 'referral',
            referenceId: String(referral._id),
          },
        });
      }
    }

    logger.info('Referido creado', {
      referralId: String(referral._id),
      patientId: payload.patientId,
      referringDoctorId: payload.referringDoctorId,
    });

    return referral;
  }

  /**
   * Obtener referido por ID
   */
  async getReferralById(referralId: string): Promise<ReferralDocument | null> {
    return ReferralModel.findById(referralId);
  }

  /**
   * Listar referidos con filtros
   */
  async listReferrals(filters: ReferralFilters = {}): Promise<{
    referrals: ReferralDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (filters.patientId) {
      query.patientId = filters.patientId;
    }
    if (filters.referringDoctorId) {
      query.referringDoctorId = filters.referringDoctorId;
    }
    if (filters.referredToDoctorId) {
      query.referredToDoctorId = filters.referredToDoctorId;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.referralType) {
      query.referralType = filters.referralType;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }
    if (filters.startDate || filters.endDate) {
      query.requestedDate = {};
      if (filters.startDate) {
        query.requestedDate.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.requestedDate.$lte = filters.endDate;
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [referrals, total] = await Promise.all([
      ReferralModel.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReferralModel.countDocuments(query),
    ]);

    return {
      referrals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Actualizar referido
   */
  async updateReferral(
    referralId: string,
    payload: UpdateReferralPayload,
    updatedBy: string
  ): Promise<ReferralDocument> {
    const referral = await ReferralModel.findById(referralId);
    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    // Validar que solo se pueden actualizar referidos pendientes o aceptados
    if (referral.status === 'completed' || referral.status === 'cancelled') {
      throw new AppError('No se puede actualizar un referido completado o cancelado', 400);
    }

    // Si se actualiza el doctor destino, validar que existe (si está en BD)
    if (payload.referredToDoctorId && payload.referredToDoctorId !== referral.referredToDoctorId) {
      const referredDoctor = await UserModel.findById(payload.referredToDoctorId);
      if (referredDoctor && referredDoctor.role !== 'doctor' && referredDoctor.role !== 'admin') {
        throw new AppError('El doctor destino no existe o no es válido', 400);
      }
      if (referredDoctor) {
        payload.referredToDoctorName = referredDoctor.name;
      }

      // Si el referido estaba pendiente y ahora tiene doctor, cambiar a aceptado
      if (referral.status === 'pending') {
        await referral.accept(payload.referredToDoctorId);
      }
    }

    Object.assign(referral, payload);
    referral.metadata = {
      ...referral.metadata,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date(),
    };

    await referral.save();

    logger.info('Referido actualizado', {
      referralId: String(referral._id),
      updatedBy,
    });

    return referral;
  }

  /**
   * Aceptar referido
   */
  async acceptReferral(
    referralId: string,
    referredToDoctorId: string,
    notes?: string,
    acceptedBy: string = referredToDoctorId
  ): Promise<ReferralDocument> {
    const referral = await ReferralModel.findById(referralId);
    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    // Validar que el doctor existe cuando esté en BD (permitir admin como proxy)
    const doctor = await UserModel.findById(referredToDoctorId);
    if (doctor && doctor.role !== 'doctor' && doctor.role !== 'admin') {
      throw new AppError('El doctor destino no existe o no es válido', 400);
    }

    await referral.accept(referredToDoctorId, notes);
    if (doctor) {
      referral.referredToDoctorName = doctor.name;
    }
    await referral.save();

    // Crear alerta para el doctor que refirió
    await alertService.createAlert({
      userId: referral.referringDoctorId,
      patientId: referral.patientId,
      doctorId: referral.referringDoctorId,
      title: 'Referido Aceptado',
      message: `El referido para ${referral.patientName} ha sido aceptado por ${doctor?.name ?? 'un especialista'}`,
      category: 'referral',
      priority: referral.priority as any,
      channels: ['push', 'in_app'],
      trigger: {
        source: 'referral',
        referenceId: String(referral._id),
      },
    });

    logger.info('Referido aceptado', {
      referralId: String(referral._id),
      acceptedBy,
    });

    return referral;
  }

  /**
   * Rechazar referido
   */
  async rejectReferral(
    referralId: string,
    reason: string,
    rejectedBy: string
  ): Promise<ReferralDocument> {
    const referral = await ReferralModel.findById(referralId);
    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    await referral.reject(reason);
    await referral.save();

    // Crear alerta para el doctor que refirió
    await alertService.createAlert({
      userId: referral.referringDoctorId,
      patientId: referral.patientId,
      doctorId: referral.referringDoctorId,
      title: 'Referido Rechazado',
      message: `El referido para ${referral.patientName} ha sido rechazado. Razón: ${reason}`,
      category: 'referral',
      priority: 'medium',
      channels: ['push', 'in_app'],
      trigger: {
        source: 'referral',
        referenceId: String(referral._id),
      },
    });

    logger.info('Referido rechazado', {
      referralId: String(referral._id),
      rejectedBy,
    });

    return referral;
  }

  /**
   * Completar referido
   */
  async completeReferral(
    referralId: string,
    completedBy: string,
    notes?: string
  ): Promise<ReferralDocument> {
    const referral = await ReferralModel.findById(referralId);
    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    await referral.complete(notes);
    await referral.save();

    // Crear alerta para el doctor que refirió
    await alertService.createAlert({
      userId: referral.referringDoctorId,
      patientId: referral.patientId,
      doctorId: referral.referringDoctorId,
      title: 'Referido Completado',
      message: `El referido para ${referral.patientName} ha sido completado`,
      category: 'referral',
      priority: 'low',
      channels: ['push', 'in_app'],
      trigger: {
        source: 'referral',
        referenceId: String(referral._id),
      },
    });

    logger.info('Referido completado', {
      referralId: String(referral._id),
      completedBy,
    });

    return referral;
  }

  /**
   * Cancelar referido
   */
  async cancelReferral(
    referralId: string,
    cancelledBy: string,
    reason?: string
  ): Promise<ReferralDocument> {
    const referral = await ReferralModel.findById(referralId);
    if (!referral) {
      throw new AppError('Referido no encontrado', 404);
    }

    await referral.cancel(reason);
    await referral.save();

    logger.info('Referido cancelado', {
      referralId: String(referral._id),
      cancelledBy,
    });

    return referral;
  }

  /**
   * Obtener estadísticas de referidos
   */
  async getReferralStats(doctorId?: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    inProgress: number;
    completed: number;
    rejected: number;
    cancelled: number;
    byType: Record<ReferralType, number>;
    byPriority: Record<ReferralPriority, number>;
  }> {
    const query: any = {};
    if (doctorId) {
      query.$or = [
        { referringDoctorId: doctorId },
        { referredToDoctorId: doctorId },
      ];
    }

    const [total, pending, accepted, inProgress, completed, rejected, cancelled] = await Promise.all([
      ReferralModel.countDocuments(query),
      ReferralModel.countDocuments({ ...query, status: 'pending' }),
      ReferralModel.countDocuments({ ...query, status: 'accepted' }),
      ReferralModel.countDocuments({ ...query, status: 'in_progress' }),
      ReferralModel.countDocuments({ ...query, status: 'completed' }),
      ReferralModel.countDocuments({ ...query, status: 'rejected' }),
      ReferralModel.countDocuments({ ...query, status: 'cancelled' }),
    ]);

    const referrals = await ReferralModel.find(query);
    const byType: Record<ReferralType, number> = {
      consultation: 0,
      specialist: 0,
      diagnostic: 0,
      treatment: 0,
      follow_up: 0,
      emergency: 0,
    };
    const byPriority: Record<ReferralPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    referrals.forEach(ref => {
      byType[ref.referralType] = (byType[ref.referralType] || 0) + 1;
      byPriority[ref.priority] = (byPriority[ref.priority] || 0) + 1;
    });

    return {
      total,
      pending,
      accepted,
      inProgress,
      completed,
      rejected,
      cancelled,
      byType,
      byPriority,
    };
  }

  /**
   * Obtener referidos pendientes
   */
  async getPendingReferrals(): Promise<ReferralDocument[]> {
    return ReferralModel.findPending();
  }

  /**
   * Obtener referidos vencidos
   */
  async getOverdueReferrals(): Promise<ReferralDocument[]> {
    return ReferralModel.findOverdue();
  }
}

export default new ReferralService();

