import mongoose, { Document, Schema, Model } from 'mongoose';

export type ReportType = 'daily' | 'weekly' | 'monthly';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'exported';

export interface AutomaticReportDocument extends Document {
  reportType: ReportType;
  period: {
    startDate: Date;
    endDate: Date;
  };
  status: ReportStatus;
  metrics: {
    totalPatients: number;
    totalDoctors: number;
    totalAdmins?: number;
    totalMedicalHistories: number;
    totalAlerts: number;
    criticalAlerts: number;
    totalAppointments: number;
    completedAppointments: number;
    aiAnalyses: number;
    averageAIConfidence: number;
    topDiagnoses: Array<{ diagnosis: string; count: number }>;
    symptomCategories: Array<{ category: string; total: number }>;
    districtDistribution: Array<{ district: string; count: number }>;
    growthMetrics: {
      patientsGrowth: number;
      historiesGrowth: number;
      alertsGrowth: number;
    };
  };
  anomalies?: Array<{
    metric: string;
    value: number;
    expectedRange: { min: number; max: number };
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
  }>;
  filePath?: string;
  exportedAt?: Date;
  exportFormat?: 'pdf' | 'csv' | 'json';
  generatedBy?: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomaticReportModel extends Model<AutomaticReportDocument> {
  findByType(type: ReportType, limit?: number): Promise<AutomaticReportDocument[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<AutomaticReportDocument[]>;
  findLatestByType(type: ReportType): Promise<AutomaticReportDocument | null>;
  getReportStats(): Promise<{
    total: number;
    byType: Record<ReportType, number>;
    byStatus: Record<ReportStatus, number>;
  }>;
}

const AnomalySchema = new Schema({
  metric: { type: String, required: true },
  value: { type: Number, required: true },
  expectedRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
  },
  description: { type: String, required: true },
  detectedAt: { type: Date, default: Date.now },
}, { _id: false });

const AutomaticReportSchema = new Schema<AutomaticReportDocument>(
  {
    reportType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
      index: true,
    },
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
    metrics: {
      totalPatients: { type: Number, default: 0 },
      totalDoctors: { type: Number, default: 0 },
      totalAdmins: { type: Number, default: 0 },
      totalMedicalHistories: { type: Number, default: 0 },
      totalAlerts: { type: Number, default: 0 },
      criticalAlerts: { type: Number, default: 0 },
      totalAppointments: { type: Number, default: 0 },
      completedAppointments: { type: Number, default: 0 },
      aiAnalyses: { type: Number, default: 0 },
      averageAIConfidence: { type: Number, default: 0 },
      topDiagnoses: [{
        diagnosis: String,
        count: Number,
      }],
      symptomCategories: [{
        category: String,
        total: Number,
      }],
      districtDistribution: [{
        district: String,
        count: Number,
      }],
      growthMetrics: {
        patientsGrowth: { type: Number, default: 0 },
        historiesGrowth: { type: Number, default: 0 },
        alertsGrowth: { type: Number, default: 0 },
      },
    },
    anomalies: [AnomalySchema],
    filePath: { type: String },
    exportedAt: { type: Date },
    exportFormat: {
      type: String,
      enum: ['pdf', 'csv', 'json'],
    },
    generatedBy: { type: String },
    generatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices para optimizar consultas
AutomaticReportSchema.index({ reportType: 1, 'period.startDate': -1 });
AutomaticReportSchema.index({ status: 1, generatedAt: -1 });
AutomaticReportSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });

// Métodos estáticos
AutomaticReportSchema.statics.findByType = async function (
  type: ReportType,
  limit: number = 10
): Promise<AutomaticReportDocument[]> {
  return this.find({ reportType: type })
    .sort({ 'period.startDate': -1 })
    .limit(limit)
    .exec();
};

AutomaticReportSchema.statics.findByDateRange = async function (
  startDate: Date,
  endDate: Date
): Promise<AutomaticReportDocument[]> {
  return this.find({
    'period.startDate': { $gte: startDate },
    'period.endDate': { $lte: endDate },
  })
    .sort({ 'period.startDate': -1 })
    .exec();
};

AutomaticReportSchema.statics.findLatestByType = async function (
  type: ReportType
): Promise<AutomaticReportDocument | null> {
  return this.findOne({ reportType: type })
    .sort({ 'period.startDate': -1 })
    .exec();
};

AutomaticReportSchema.statics.getReportStats = async function () {
  const [total, byType, byStatus] = await Promise.all([
    this.countDocuments(),
    this.aggregate([
      { $group: { _id: '$reportType', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const typeMap: Record<string, number> = {};
  byType.forEach((item: any) => {
    typeMap[item._id] = item.count;
  });

  const statusMap: Record<string, number> = {};
  byStatus.forEach((item: any) => {
    statusMap[item._id] = item.count;
  });

  return {
    total,
    byType: {
      daily: typeMap.daily || 0,
      weekly: typeMap.weekly || 0,
      monthly: typeMap.monthly || 0,
    },
    byStatus: {
      pending: statusMap.pending || 0,
      generating: statusMap.generating || 0,
      completed: statusMap.completed || 0,
      failed: statusMap.failed || 0,
      exported: statusMap.exported || 0,
    },
  };
};

const AutomaticReport = mongoose.model<AutomaticReportDocument, AutomaticReportModel>(
  'AutomaticReport',
  AutomaticReportSchema
);

export default AutomaticReport;

