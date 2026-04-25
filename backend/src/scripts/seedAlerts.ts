/**
 * Seed script for alert dashboard data
 * Genera alertas de ejemplo para alimentar el dashboard y las métricas de monitoreo
 */

import mongoose from 'mongoose';
import AlertModel from '../models/Alert';
import User from '../models/User';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const SEED_TAG = 'alert-dashboard';

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.database.mongodb, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('✅ Conectado a MongoDB para seeding de alertas');
  } catch (error) {
    logger.error('❌ No se pudo conectar a MongoDB', { error });
    process.exit(1);
  }
};

const getReferenceUsers = async () => {
  const [doctor, patient, admin] = await Promise.all([
    User.findOne({ role: 'doctor' }).lean(),
    User.findOne({ role: 'patient' }).lean(),
    User.findOne({ role: 'admin' }).lean(),
  ]);

  const fallbackDoctorId = new mongoose.Types.ObjectId().toHexString();
  const fallbackPatientId = new mongoose.Types.ObjectId().toHexString();

  return {
    doctorId: doctor?._id?.toString() ?? fallbackDoctorId,
    patientId: patient?._id?.toString() ?? fallbackPatientId,
    adminId: admin?._id?.toString() ?? fallbackDoctorId,
  };
};

const buildSampleAlerts = (reference: { doctorId: string; patientId?: string; adminId: string }) => {
  const now = new Date();

  return [
    {
      userId: reference.doctorId,
      doctorId: reference.doctorId,
      patientId: reference.patientId,
      title: '🚨 Paciente con saturación crítica',
      message: 'Saturación registró 85% en las últimas mediciones. Se requiere atención inmediata.',
      category: 'critical_symptom' as const,
      channels: ['push', 'in_app'],
      priority: 'critical' as const,
      status: 'pending' as const,
      trigger: {
        source: 'symptom_analysis' as const,
        metadata: { spo2: 85, heartRate: 112 },
      },
      metadata: {
        seed: SEED_TAG,
        source: 'seedScript',
      },
    },
    {
      userId: reference.patientId ?? reference.doctorId,
      doctorId: reference.doctorId,
      patientId: reference.patientId,
      title: '💊 Recordatorio: Terapia con inhalador',
      message: 'Aplicar 2 puff del inhalador de rescate cada 8 horas.',
      category: 'medication_reminder' as const,
      channels: ['push'],
      priority: 'medium' as const,
      status: 'scheduled' as const,
      scheduledAt: new Date(now.getTime() + 30 * 60 * 1000),
      trigger: {
        source: 'medication_schedule' as const,
      },
      metadata: {
        seed: SEED_TAG,
        medication: 'Salbutamol',
      },
    },
    {
      userId: reference.doctorId,
      doctorId: reference.doctorId,
      patientId: reference.patientId,
      title: '🩺 Seguimiento programado',
      message: 'Control telefónico pactado para mañana a las 09:00.',
      category: 'follow_up' as const,
      channels: ['email', 'in_app'],
      priority: 'low' as const,
      status: 'scheduled' as const,
      scheduledAt: new Date(now.getTime() + 20 * 60 * 60 * 1000),
      trigger: {
        source: 'follow_up_rule' as const,
      },
      metadata: {
        seed: SEED_TAG,
        reason: 'Evaluación post tratamiento',
      },
    },
    {
      userId: reference.adminId,
      title: 'ℹ️ Resumen diario de alertas',
      message: 'Se registraron 12 alertas en las últimas 24h, 3 de ellas críticas.',
      category: 'system' as const,
      channels: ['in_app'],
      priority: 'medium' as const,
      status: 'delivered' as const,
      dispatchedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      trigger: {
        source: 'system' as const,
      },
      metadata: {
        seed: SEED_TAG,
        deliveredAt: now.toISOString(),
      },
    },
    {
      userId: reference.doctorId,
      doctorId: reference.doctorId,
      patientId: reference.patientId,
      title: '⚠️ Fallo en canal push',
      message: 'No fue posible entregar la alerta al dispositivo móvil.',
      category: 'doctor_notification' as const,
      channels: ['push'],
      priority: 'high' as const,
      status: 'failed' as const,
      lastError: 'Expo push token inválido',
      retries: 2,
      trigger: {
        source: 'doctor_portal' as const,
      },
      metadata: {
        seed: SEED_TAG,
        incidentId: 'INC-2025-ALERT-01',
      },
    },
  ];
};

const seedAlerts = async () => {
  await connectDatabase();

  try {
    logger.info('🌱 Iniciando seeding de alertas para dashboard...');

    const reference = await getReferenceUsers();
    const sampleAlerts = buildSampleAlerts(reference);

    const removed = await AlertModel.deleteMany({ 'metadata.seed': SEED_TAG });
    if (removed.deletedCount) {
      logger.info(`🧹 Eliminadas ${removed.deletedCount} alertas previas del seed`);
    }

    const inserted = await AlertModel.insertMany(sampleAlerts);
    logger.info(`✅ ${inserted.length} alertas generadas para el dashboard de monitoreo`);

    const statusBreakdown = await AlertModel.aggregate([
      { $match: { 'metadata.seed': SEED_TAG } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    logger.info('📊 Distribución de estados:', statusBreakdown);
  } catch (error) {
    logger.error('❌ Error generando datos de alertas', { error });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('🔌 Conexión a MongoDB cerrada');
  }
};

if (require.main === module) {
  seedAlerts()
    .then(() => {
      logger.info('🎉 Seeding de alertas completado');
      process.exit(0);
    })
    .catch(() => {
      logger.error('💥 Falló el seeding de alertas');
      process.exit(1);
    });
}

export default seedAlerts;

