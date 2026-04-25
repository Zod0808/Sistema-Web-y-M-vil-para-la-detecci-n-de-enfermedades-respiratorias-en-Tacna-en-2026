import { Request, Response } from 'express';
import MedicalHistory from '../models/MedicalHistory';
import AppointmentModel from '../models/Appointment';
import PrescriptionModel from '../models/Prescription';
import AlertModel from '../models/Alert';
import AIAnalysis from '../models/AIAnalysis';
import { WearableData } from '../models/WearableData';
import User from '../models/User';
import { anonymizeForAnalytics } from '../utils/anonymization';

function hasDoubleConfirmation(req: Request): boolean {
  const headerConfirm = (req.get('X-Confirm-Action') || '').toLowerCase() === 'yes';
  const bodyConfirm = (req.body?.confirm === true) || (String(req.query?.confirm || '').toLowerCase() === 'yes');
  return headerConfirm && bodyConfirm;
}

export async function exportUserData(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const includeRaw = String(req.query.includeRaw || 'false').toLowerCase() === 'true';

    const [user, histories, appointments, prescriptions, alerts, analyses, wearables] = await Promise.all([
      User.findById(userId).lean(),
      MedicalHistory.find({ patientId: userId }).lean(),
      AppointmentModel.find({ patientId: userId }).lean(),
      PrescriptionModel.find({ patientId: userId }).lean(),
      AlertModel.find({ patientId: userId }).lean(),
      AIAnalysis.find({ medicalHistoryId: { $in: (await MedicalHistory.find({ patientId: userId }).select('_id').lean()).map(d => d._id?.toString()) } }).lean(),
      WearableData.find({ patientId: userId }).lean()
    ]);

    const dataset = {
      user: includeRaw ? user : user ? anonymizeForAnalytics(user as any) : null,
      medicalHistories: includeRaw ? histories : histories.map(anonymizeForAnalytics),
      appointments: includeRaw ? appointments : appointments.map(anonymizeForAnalytics),
      prescriptions: includeRaw ? prescriptions : prescriptions.map(anonymizeForAnalytics),
      alerts: includeRaw ? alerts : alerts.map(anonymizeForAnalytics),
      analyses: includeRaw ? analyses : analyses.map(anonymizeForAnalytics),
      wearables: includeRaw ? wearables : wearables.map(anonymizeForAnalytics),
      generatedAt: new Date().toISOString()
    };

    res.status(200).json({ success: true, data: dataset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exportando datos del usuario', error: String(error) });
  }
}

export async function deleteUserData(req: Request, res: Response) {
  try {
    if (!hasDoubleConfirmation(req)) {
      return res.status(428).json({
        success: false,
        message: 'Confirmación doble requerida: header X-Confirm-Action: yes y confirm=true|?confirm=yes'
      });
    }
    const { userId } = req.params;

    // Soft-delete de usuario y borrado de datos vinculados
    const [user] = await Promise.all([
      User.findByIdAndUpdate(userId, { isActive: false, name: 'REDACTED', avatar: null }, { new: true }),
    ]);

    const [histories, appointments, prescriptions, alerts, analyses, wearables] = await Promise.all([
      MedicalHistory.deleteMany({ patientId: userId }),
      AppointmentModel.deleteMany({ patientId: userId }),
      PrescriptionModel.deleteMany({ patientId: userId }),
      AlertModel.deleteMany({ patientId: userId }),
      AIAnalysis.deleteMany({}), // Nota: vinculadas por medicalHistoryId ya eliminadas arriba
      WearableData.deleteMany({ patientId: userId })
    ]);

    res.status(200).json({
      success: true,
      message: 'Datos del usuario programados/eliminados',
      result: {
        userSoftDeleted: !!user,
        deleted: {
          medicalHistories: histories.deletedCount,
          appointments: appointments.deletedCount,
          prescriptions: prescriptions.deletedCount,
          alerts: alerts.deletedCount,
          analyses: analyses.deletedCount,
          wearables: wearables.deletedCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error eliminando datos del usuario', error: String(error) });
  }
}


