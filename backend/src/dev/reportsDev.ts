/**
 * Automatic Reports endpoints (dev-only)
 *
 * Read-side endpoints hit MongoDB via a loose AutomaticReport model
 * (created on the fly if missing). Write-side endpoints (generate/export)
 * simulate work — no real report generation happens in dev.
 *
 * Mounted at /api/v1/reports/automatic BEFORE the production
 * automaticReportRoutes.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const router = Router();

const AUTOMATIC_REPORT_SCHEMA = new mongoose.Schema(
  {
    reportType: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true, index: true },
    period: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed', 'exported'],
      default: 'pending',
      index: true,
    },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    anomalies: [{ type: mongoose.Schema.Types.Mixed }],
    filePath: { type: String },
    exportedAt: { type: Date },
    exportFormat: { type: String, enum: ['pdf', 'csv', 'json'] },
    generatedBy: { type: String },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'automaticreports' },
);

const getAutomaticReportModel = (): mongoose.Model<any> => {
  try {
    return mongoose.model('AutomaticReport');
  } catch {
    return mongoose.model('AutomaticReport', AUTOMATIC_REPORT_SCHEMA);
  }
};

const toIso = (v: Date | string | null | undefined): string | null => {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
};

const isMongoConnected = (): boolean => mongoose.connection.readyState === 1;

// ---------------------------------------------------------------------------
// GET / — list reports
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!isMongoConnected()) {
      return res.json({ success: true, data: { reports: [], total: 0 } });
    }
    const { type } = req.query as Record<string, string>;
    const Model = getAutomaticReportModel();
    const query: Record<string, any> = {};
    if (type && type !== 'all') query.reportType = type;

    let reports: any[] = [];
    try {
      reports = await Model.find(query).sort({ 'period.startDate': -1 }).limit(50).lean();
    } catch (queryErr: any) {
      logger.error('automaticReports list query failed', { error: queryErr.message });
    }

    const mappedReports = reports
      .map((report) => {
        try {
          return {
            _id: report._id ? report._id.toString() : null,
            reportType: report.reportType ?? 'unknown',
            status: report.status ?? 'pending',
            generatedAt: toIso(report.generatedAt),
            period: {
              startDate: toIso(report.period?.startDate) ?? new Date().toISOString(),
              endDate: toIso(report.period?.endDate) ?? new Date().toISOString(),
            },
            metrics: report.metrics ?? {},
            anomalies: report.anomalies ?? [],
            topDiagnoses: report.metrics?.topDiagnoses ?? [],
            exportFormats: report.exportFormat ? [report.exportFormat] : [],
            exportedAt: toIso(report.exportedAt),
          };
        } catch {
          return null;
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    res.json({ success: true, data: { reports: mappedReports, total: mappedReports.length } });
  } catch (err: any) {
    logger.error('automaticReports list failed', { error: err.message });
    res.json({
      success: true,
      data: { reports: [], total: 0 },
      warning: `Error al obtener reportes: ${err.message}`,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /stats
// ---------------------------------------------------------------------------
router.get('/stats', async (_req: Request, res: Response) => {
  const emptyStats = {
    total: 0,
    byType: { daily: 0, weekly: 0, monthly: 0 },
    byStatus: { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 },
    lastGenerated: null as string | null,
    nextScheduled: null as string | null,
  };

  try {
    if (!isMongoConnected()) {
      return res.json({ success: true, data: emptyStats });
    }
    const Model = getAutomaticReportModel();

    const [total, byType, byStatus, lastGenerated] = await Promise.all([
      Model.countDocuments().catch(() => 0),
      Model.aggregate([{ $group: { _id: '$reportType', count: { $sum: 1 } } }]).catch(() => [] as any[]),
      Model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).catch(() => [] as any[]),
      Model.findOne().sort({ generatedAt: -1 }).select('generatedAt').lean().catch(() => null),
    ]);

    const byTypeObj: Record<string, number> = { daily: 0, weekly: 0, monthly: 0 };
    if (Array.isArray(byType)) {
      for (const item of byType) {
        if (item?._id && item._id in byTypeObj) byTypeObj[item._id] = item.count ?? 0;
      }
    }
    const byStatusObj: Record<string, number> = { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 };
    if (Array.isArray(byStatus)) {
      for (const item of byStatus) {
        if (item?._id && item._id in byStatusObj) byStatusObj[item._id] = item.count ?? 0;
      }
    }

    res.json({
      success: true,
      data: {
        total: total ?? 0,
        byType: byTypeObj,
        byStatus: byStatusObj,
        lastGenerated: toIso((lastGenerated as any)?.generatedAt),
        nextScheduled: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (err: any) {
    logger.error('automaticReports stats failed', { error: err.message });
    res.json({ success: true, data: emptyStats, warning: `Error al obtener estadísticas: ${err.message}` });
  }
});

// ---------------------------------------------------------------------------
// GET /:reportId
// ---------------------------------------------------------------------------
router.get('/:reportId', async (req: Request, res: Response) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        message: 'MongoDB no está conectado.',
        error: 'Database connection unavailable',
      });
    }
    const Model = getAutomaticReportModel();
    const report = await Model.findById(req.params['reportId']).lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Reporte no encontrado', error: 'Report not found' });
    }
    res.json({
      success: true,
      data: {
        _id: (report as any)._id.toString(),
        reportType: (report as any).reportType,
        status: (report as any).status,
        generatedAt: toIso((report as any).generatedAt),
        period: {
          startDate: toIso((report as any).period?.startDate) ?? new Date().toISOString(),
          endDate: toIso((report as any).period?.endDate) ?? new Date().toISOString(),
        },
        metrics: (report as any).metrics ?? {},
        anomalies: (report as any).anomalies ?? [],
        topDiagnoses: (report as any).metrics?.topDiagnoses ?? [],
        exportFormats: (report as any).exportFormat ? [(report as any).exportFormat] : [],
        exportedAt: toIso((report as any).exportedAt),
      },
    });
  } catch (err: any) {
    logger.error('automaticReports getById failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error fetching report details', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /generate — simulated
// ---------------------------------------------------------------------------
router.post('/generate', (req: Request, res: Response) => {
  try {
    const { reportType, includeAnomalies, exportFormat } = req.body;
    const rt = reportType ?? 'daily';
    const windowHours = rt === 'daily' ? 24 : rt === 'weekly' ? 7 * 24 : 30 * 24;

    const newReport: Record<string, any> = {
      _id: `report-${Date.now()}`,
      reportType: rt,
      status: 'generating',
      generatedAt: null,
      period: {
        start: new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      summary: null,
      exportFormats: exportFormat ? [exportFormat] : [],
    };

    // Fake completion after 2s (mutates the response object post-hoc — matches
    // the pre-existing JS behavior; not observable to the client).
    setTimeout(() => {
      newReport.status = 'completed';
      newReport.generatedAt = new Date().toISOString();
      newReport.summary = {
        totalCases: Math.floor(Math.random() * 100) + 20,
        highSeverity: Math.floor(Math.random() * 20),
        mediumSeverity: Math.floor(Math.random() * 40),
        lowSeverity: Math.floor(Math.random() * 30),
        anomalies: includeAnomalies ? Math.floor(Math.random() * 5) : 0,
      };
    }, 2000);

    res.status(201).json({
      success: true,
      message: `Reporte ${rt} en proceso de generación`,
      data: newReport,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error generating report', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /:reportId/export — simulated
// ---------------------------------------------------------------------------
router.post('/:reportId/export', (req: Request, res: Response) => {
  try {
    const reportId = req.params['reportId'];
    const { format = 'pdf' } = req.body;
    res.json({
      success: true,
      message: `Reporte exportado en formato ${format}`,
      data: {
        reportId,
        format,
        downloadUrl: `/api/v1/reports/automatic/${reportId}/download?format=${format}`,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error exporting report', error: err.message });
  }
});

export default router;
