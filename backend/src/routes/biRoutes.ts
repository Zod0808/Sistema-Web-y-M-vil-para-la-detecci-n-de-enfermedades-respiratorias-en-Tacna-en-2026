/**
 * BI Routes
 * Exports real MongoDB data in Power BI / Tableau / generic formats.
 */

import { Router, Request, Response } from 'express';
import { biConnectorService } from '../services/biConnectorService';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/auth';
import { logger } from '../utils/logger';
import MedicalHistory from '../models/MedicalHistory';
import User from '../models/User';
import Appointment from '../models/Appointment';
import Alert from '../models/Alert';
import Prescription from '../models/Prescription';
import { LabResult } from '../models/LabResult';

const router = Router();

// ---------------------------------------------------------------------------
// Dataset resolver — returns real MongoDB documents for a given dataset name
// ---------------------------------------------------------------------------
const SUPPORTED_DATASETS = ['medical-histories', 'users', 'appointments', 'alerts', 'prescriptions', 'lab-results'] as const;
type Dataset = typeof SUPPORTED_DATASETS[number];

async function resolveDataset(dataset: string, query: Record<string, any> = {}): Promise<any[]> {
  const limit = Math.min(parseInt(query.limit ?? '500', 10), 2000);
  const startDate = query.startDate ? new Date(query.startDate as string) : undefined;
  const endDate   = query.endDate   ? new Date(query.endDate   as string) : undefined;
  const dateFilter = startDate || endDate
    ? { createdAt: { ...(startDate ? { $gte: startDate } : {}), ...(endDate ? { $lte: endDate } : {}) } }
    : {};

  switch (dataset as Dataset) {
    case 'medical-histories':
      return MedicalHistory.find(dateFilter).limit(limit).lean();
    case 'users':
      return User.find(dateFilter).select('-password').limit(limit).lean();
    case 'appointments':
      return Appointment.find(dateFilter).limit(limit).lean();
    case 'alerts':
      return Alert.find(dateFilter).limit(limit).lean();
    case 'prescriptions':
      return Prescription.find(dateFilter).limit(limit).lean();
    case 'lab-results':
      return LabResult.find(dateFilter).limit(limit).lean();
    default:
      throw new Error(`Dataset "${dataset}" no reconocido. Disponibles: ${SUPPORTED_DATASETS.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/bi/datasets — list available datasets
// ---------------------------------------------------------------------------
router.get('/datasets', authenticate, authorize('admin', 'doctor'), (_req: Request, res: Response) => {
  res.json({ success: true, datasets: SUPPORTED_DATASETS });
});

// ---------------------------------------------------------------------------
// GET /api/v1/bi/powerbi/:dataset
// ---------------------------------------------------------------------------
router.get('/powerbi/:dataset', authenticate, authorize('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const { dataset } = req.params;
    const format = (req.query.format as 'json' | 'odata') || 'json';
    const includeMetadata = req.query.metadata !== 'false';

    const data = await resolveDataset(dataset, req.query as Record<string, any>);
    const exportData = await biConnectorService.exportForPowerBI(data, { format, includeMetadata });

    res.json({ success: true, data: exportData, message: `Datos exportados para Power BI (dataset: ${dataset}, registros: ${data.length})` });
  } catch (err: any) {
    logger.error('Error en endpoint Power BI', { error: err.message });
    const status = err.message.includes('no reconocido') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/bi/tableau/:dataset
// ---------------------------------------------------------------------------
router.get('/tableau/:dataset', authenticate, authorize('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const { dataset } = req.params;
    const format = (req.query.format as 'json' | 'csv') || 'json';
    const includeMetadata = req.query.metadata !== 'false';

    const data = await resolveDataset(dataset, req.query as Record<string, any>);
    const exportData = await biConnectorService.exportForTableau(data, { format, includeMetadata });

    if (format === 'csv') {
      const csv = biConnectorService.convertToCSV(exportData.data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dataset}.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: exportData, message: `Datos exportados para Tableau (dataset: ${dataset}, registros: ${data.length})` });
  } catch (err: any) {
    logger.error('Error en endpoint Tableau', { error: err.message });
    const status = err.message.includes('no reconocido') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/bi/generic/:dataset
// ---------------------------------------------------------------------------
router.get('/generic/:dataset', authenticate, authorize('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const { dataset } = req.params;
    const format = (req.query.format as 'json' | 'csv') || 'json';
    const includeMetadata = req.query.metadata !== 'false';

    const data = await resolveDataset(dataset, req.query as Record<string, any>);
    const exportData = await biConnectorService.exportGeneric(data, format, includeMetadata);

    if (format === 'csv') {
      const csv = biConnectorService.convertToCSV(exportData.data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dataset}.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: exportData, message: `Datos exportados (dataset: ${dataset}, formato: ${format}, registros: ${data.length})` });
  } catch (err: any) {
    logger.error('Error en endpoint BI genérico', { error: err.message });
    const status = err.message.includes('no reconocido') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/bi/odata/:dataset — OData v4 compatible
// ---------------------------------------------------------------------------
router.get('/odata/:dataset', authenticate, authorize('admin', 'doctor'), async (req: Request, res: Response) => {
  try {
    const { dataset } = req.params;
    const data = await resolveDataset(dataset, req.query as Record<string, any>);

    res.json({
      '@odata.context': `${req.protocol}://${req.get('host')}/api/v1/bi/odata/$metadata#${dataset}`,
      '@odata.count': data.length,
      value: data,
    });
  } catch (err: any) {
    logger.error('Error en endpoint OData', { error: err.message });
    const status = err.message.includes('no reconocido') ? 400 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/bi/summary — quick aggregate stats for dashboards
// ---------------------------------------------------------------------------
router.get('/summary', authenticate, authorize('admin', 'doctor'), async (_req: Request, res: Response) => {
  try {
    const [totalPatients, totalHistories, totalAppointments, totalAlerts, totalPrescriptions, totalLabResults] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      MedicalHistory.countDocuments(),
      Appointment.countDocuments(),
      Alert.countDocuments(),
      Prescription.countDocuments(),
      LabResult.countDocuments(),
    ]);

    const recentHistories = await MedicalHistory.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('patientName diagnosis createdAt')
      .lean();

    const urgentAlerts = await Alert.countDocuments({ priority: { $in: ['high', 'critical'] }, status: { $ne: 'acknowledged' } });

    res.json({
      success: true,
      data: {
        totals: { patients: totalPatients, medicalHistories: totalHistories, appointments: totalAppointments, alerts: totalAlerts, prescriptions: totalPrescriptions, labResults: totalLabResults },
        highlights: { urgentAlerts, recentHistories },
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('Error generating BI summary', { error: err.message });
    res.status(500).json({ success: false, error: 'Error generating BI summary' });
  }
});

export default router;