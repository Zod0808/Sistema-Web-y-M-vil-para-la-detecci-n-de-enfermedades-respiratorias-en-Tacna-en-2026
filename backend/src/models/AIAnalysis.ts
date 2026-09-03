import mongoose, { Document, Model, Schema } from 'mongoose';
import { AIAnalysis as IAIAnalysis, Symptom } from '../types';
import { applyFieldEncryption, getEncryptionKey, encryptString, decryptString } from '../utils/encryption';

export type AIReviewStatus = 'pending' | 'approved' | 'rejected' | 'adjusted';
export type AIReviewSignatureMethod = 'digital' | 'typed' | 'click_to_sign';

const AI_REVIEW_STATUSES: AIReviewStatus[] = ['pending', 'approved', 'rejected', 'adjusted'];
const AI_REVIEW_SIGNATURE_METHODS: AIReviewSignatureMethod[] = ['digital', 'typed', 'click_to_sign'];

export interface AIReviewSignature {
  signatureData: string;
  signatureMethod: AIReviewSignatureMethod;
  signedAt: Date;
}

export interface AIAnalysisReview {
  status: AIReviewStatus;
  doctorId: string;
  doctorName: string;
  comments?: string;
  adjustedDiagnosis?: string;
  adjustedUrgency?: 'low' | 'medium' | 'high' | 'critical';
  signature: AIReviewSignature;
  reviewedAt: Date;
}

export interface AIAnalysisDocument extends Omit<IAIAnalysis, '_id' | 'medicalHistoryId'>, Document {
  patientId?: string;
  medicalHistoryId?: string;
  review?: AIAnalysisReview;
  toJSON(): any;
  approve(doctorId: string, doctorName: string, comments: string | undefined, signature: Omit<AIReviewSignature, 'signedAt'>): Promise<AIAnalysisDocument>;
  reject(doctorId: string, doctorName: string, comments: string | undefined, signature: Omit<AIReviewSignature, 'signedAt'>): Promise<AIAnalysisDocument>;
  adjust(
    doctorId: string,
    doctorName: string,
    adjustment: { adjustedDiagnosis?: string; adjustedUrgency?: 'low' | 'medium' | 'high' | 'critical'; comments?: string },
    signature: Omit<AIReviewSignature, 'signedAt'>
  ): Promise<AIAnalysisDocument>;
}

export interface AIAnalysisModel extends Model<AIAnalysisDocument> {
  findPendingReview(): Promise<AIAnalysisDocument[]>;
}

const SymptomSchema = new Schema<Symptom>({
  name: {
    type: String,
    required: [true, 'El nombre del síntoma es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre del síntoma no puede exceder 100 caracteres']
  },
  severity: {
    type: String,
    enum: {
      values: ['mild', 'moderate', 'severe'],
      message: 'La severidad debe ser mild, moderate o severe'
    },
    required: [true, 'La severidad del síntoma es obligatoria']
  },
  duration: {
    type: String,
    required: [true, 'La duración del síntoma es obligatoria'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  }
}, { _id: true });

const PossibleDiagnosisSchema = new Schema({
  condition: {
    type: String,
    required: [true, 'El nombre de la condición es obligatorio'],
    trim: true,
    maxlength: [200, 'El nombre de la condición no puede exceder 200 caracteres']
  },
  probability: {
    type: Number,
    required: [true, 'La probabilidad es obligatoria'],
    min: [0, 'La probabilidad no puede ser negativa'],
    max: [100, 'La probabilidad no puede exceder 100']
  },
  recommendations: [{
    type: String,
    required: [true, 'Las recomendaciones son obligatorias'],
    trim: true,
    maxlength: [500, 'Cada recomendación no puede exceder 500 caracteres']
  }]
}, { _id: true });

const AIReviewSignatureSchema = new Schema<AIReviewSignature>({
  signatureData: {
    type: String,
    required: [true, 'La firma del médico es obligatoria']
  },
  signatureMethod: {
    type: String,
    enum: AI_REVIEW_SIGNATURE_METHODS,
    required: [true, 'El método de firma es obligatorio']
  },
  signedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

const AIAnalysisReviewSchema = new Schema<AIAnalysisReview>({
  status: {
    type: String,
    enum: AI_REVIEW_STATUSES,
    default: 'pending'
  },
  doctorId: {
    type: String,
    required: [true, 'El ID del médico revisor es obligatorio'],
    trim: true
  },
  doctorName: {
    type: String,
    required: [true, 'El nombre del médico revisor es obligatorio'],
    trim: true
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [2000, 'Los comentarios no pueden exceder 2000 caracteres']
  },
  adjustedDiagnosis: {
    type: String,
    trim: true,
    maxlength: [200, 'El diagnóstico ajustado no puede exceder 200 caracteres']
  },
  adjustedUrgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical']
  },
  signature: {
    type: AIReviewSignatureSchema,
    required: [true, 'La firma electrónica del médico es obligatoria']
  },
  reviewedAt: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

const AIAnalysisSchema = new Schema<AIAnalysisDocument, AIAnalysisModel>({
  patientId: {
    type: String,
    trim: true,
    index: true
  },
  medicalHistoryId: {
    type: String,
    trim: true
  },
  review: {
    type: AIAnalysisReviewSchema
  },
  symptoms: {
    type: [SymptomSchema],
    required: [true, 'Los síntomas son obligatorios'],
    validate: {
      validator: function(symptoms: Symptom[]) {
        return symptoms.length > 0 && symptoms.length <= 50;
      },
      message: 'Debe haber entre 1 y 50 síntomas'
    }
  },
  possibleDiagnoses: {
    type: [PossibleDiagnosisSchema],
    required: [true, 'Los diagnósticos posibles son obligatorios'],
    validate: {
      validator: function(diagnoses: any[]) {
        return diagnoses.length > 0 && diagnoses.length <= 10;
      },
      message: 'Debe haber entre 1 y 10 diagnósticos posibles'
    }
  },
  urgency: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'La urgencia debe ser low, medium, high o critical'
    },
    required: [true, 'La urgencia es obligatoria']
  },
  confidence: {
    type: Number,
    required: [true, 'La confianza es obligatoria'],
    min: [0, 'La confianza no puede ser negativa'],
    max: [100, 'La confianza no puede exceder 100']
  },
  timestamp: {
    type: Date,
    required: [true, 'El timestamp es obligatorio'],
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Cifrado en reposo para recomendaciones/textos potencialmente sensibles
applyFieldEncryption(AIAnalysisSchema, [
  // Campos con texto libre: symptoms.description ya cifrada en MedicalHistory; protegemos recomendaciones si contienen PII
  // Estructura nested: encrypt no se aplica fácilmente a arrays de subdocs; se mantiene sin cambios por ahora
]);

// Cifrado específico para arrays/subdocumentos: possibleDiagnoses[].recommendations[]
function encryptNestedRecommendations(doc: any) {
  if (!doc?.possibleDiagnoses) return;
  const key = getEncryptionKey();
  for (const diag of doc.possibleDiagnoses) {
    if (!diag?.recommendations) continue;
    for (let i = 0; i < diag.recommendations.length; i++) {
      const rec = diag.recommendations[i];
      if (rec && typeof rec === 'string' && !rec.startsWith('enc:')) {
        diag.recommendations[i] = `enc:${encryptString(rec, key)}`;
      }
    }
  }
}

function decryptNestedRecommendations(doc: any) {
  if (!doc?.possibleDiagnoses) return;
  const key = getEncryptionKey();
  for (const diag of doc.possibleDiagnoses) {
    if (!diag?.recommendations) continue;
    for (let i = 0; i < diag.recommendations.length; i++) {
      const rec = diag.recommendations[i];
      if (rec && typeof rec === 'string' && rec.startsWith('enc:')) {
        const raw = rec.slice(4);
        diag.recommendations[i] = decryptString(raw, key);
      }
    }
  }
}

AIAnalysisSchema.pre('save', function(next) {
  try {
    encryptNestedRecommendations(this);
    next();
  } catch (e) {
    next(e as Error);
  }
});

AIAnalysisSchema.pre('findOneAndUpdate', function(next) {
  try {
    const update: any = this.getUpdate() || {};
    // Manejo de $set con ruta completa si viene el array
    const set = update.$set || update;
    if (set?.possibleDiagnoses) {
      encryptNestedRecommendations(set);
      if (update.$set) update.$set = set;
    }
    next();
  } catch (e) {
    next(e as Error);
  }
});

AIAnalysisSchema.post('find', function(docs: any[]) {
  try {
    for (const doc of docs) decryptNestedRecommendations(doc);
  } catch {
    // no-op
  }
});

AIAnalysisSchema.post('findOne', function(doc: any) {
  try {
    decryptNestedRecommendations(doc);
  } catch {
    // no-op
  }
});

AIAnalysisSchema.post('save', function(doc: any) {
  try {
    decryptNestedRecommendations(doc);
  } catch {
    // no-op
  }
});

// Índices para optimizar consultas
AIAnalysisSchema.index({ medicalHistoryId: 1 });
AIAnalysisSchema.index({ urgency: 1 });
AIAnalysisSchema.index({ confidence: -1 });
AIAnalysisSchema.index({ timestamp: -1 });
AIAnalysisSchema.index({ createdAt: -1 });

// Índice compuesto para búsquedas por urgencia y confianza
AIAnalysisSchema.index({ 
  urgency: 1, 
  confidence: -1 
});

// Índices específicos para analytics (Fase 3)
AIAnalysisSchema.index({ timestamp: -1, urgency: 1 }); // Por fecha y urgencia
AIAnalysisSchema.index({ timestamp: -1, confidence: -1 }); // Por fecha y confianza (para análisis de riesgo)
AIAnalysisSchema.index({ createdAt: -1, urgency: 1, confidence: -1 }); // Compuesto para dashboards de analytics

// Índices para el flujo de revisión médica (RF-007: Panel del doctor)
AIAnalysisSchema.index({ patientId: 1 });
AIAnalysisSchema.index({ 'review.status': 1, createdAt: -1 });

// Virtual para obtener la urgencia en español
AIAnalysisSchema.virtual('urgencyText').get(function() {
  const urgencyMap = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica'
  };
  return urgencyMap[this.urgency] || 'Desconocida';
});

// Virtual para obtener el nivel de confianza en texto
AIAnalysisSchema.virtual('confidenceText').get(function() {
  if (this.confidence >= 90) return 'Muy Alta';
  if (this.confidence >= 70) return 'Alta';
  if (this.confidence >= 50) return 'Media';
  if (this.confidence >= 30) return 'Baja';
  return 'Muy Baja';
});

// Virtual para obtener el diagnóstico más probable
AIAnalysisSchema.virtual('topDiagnosis').get(function() {
  if (this.possibleDiagnoses && this.possibleDiagnoses.length > 0) {
    return this.possibleDiagnoses.reduce((top, current) => 
      current.probability > top.probability ? current : top
    );
  }
  return null;
});

// Método para convertir a JSON
AIAnalysisSchema.methods.toJSON = function() {
  const analysisObject = this.toObject();
  delete analysisObject.__v;
  return analysisObject;
};

// Métodos de instancia para el flujo de revisión médica (RF-007: Panel del doctor)
AIAnalysisSchema.methods.approve = async function(
  doctorId: string,
  doctorName: string,
  comments: string | undefined,
  signature: Omit<AIReviewSignature, 'signedAt'>
) {
  this.review = {
    status: 'approved',
    doctorId,
    doctorName,
    comments,
    signature: { ...signature, signedAt: new Date() },
    reviewedAt: new Date()
  };
  await this.save();
  return this;
};

AIAnalysisSchema.methods.reject = async function(
  doctorId: string,
  doctorName: string,
  comments: string | undefined,
  signature: Omit<AIReviewSignature, 'signedAt'>
) {
  this.review = {
    status: 'rejected',
    doctorId,
    doctorName,
    comments,
    signature: { ...signature, signedAt: new Date() },
    reviewedAt: new Date()
  };
  await this.save();
  return this;
};

AIAnalysisSchema.methods.adjust = async function(
  doctorId: string,
  doctorName: string,
  adjustment: { adjustedDiagnosis?: string; adjustedUrgency?: 'low' | 'medium' | 'high' | 'critical'; comments?: string },
  signature: Omit<AIReviewSignature, 'signedAt'>
) {
  this.review = {
    status: 'adjusted',
    doctorId,
    doctorName,
    comments: adjustment.comments,
    adjustedDiagnosis: adjustment.adjustedDiagnosis,
    adjustedUrgency: adjustment.adjustedUrgency,
    signature: { ...signature, signedAt: new Date() },
    reviewedAt: new Date()
  };
  await this.save();
  return this;
};

// Método estático para buscar predicciones pendientes de revisión médica
AIAnalysisSchema.statics.findPendingReview = function() {
  return this.find({
    $or: [
      { review: { $exists: false } },
      { 'review.status': 'pending' }
    ]
  }).sort({ urgency: -1, timestamp: -1 });
};

// Método estático para buscar por historia médica
AIAnalysisSchema.statics.findByMedicalHistory = function(medicalHistoryId: string) {
  return this.find({ medicalHistoryId }).sort({ timestamp: -1 });
};

// Método estático para buscar por urgencia
AIAnalysisSchema.statics.findByUrgency = function(urgency: string) {
  return this.find({ urgency }).sort({ confidence: -1 });
};

// Método estático para buscar análisis críticos
AIAnalysisSchema.statics.findCritical = function() {
  return this.find({ urgency: 'critical' }).sort({ timestamp: -1 });
};

// Método estático para buscar por rango de confianza
AIAnalysisSchema.statics.findByConfidenceRange = function(minConfidence: number, maxConfidence: number) {
  return this.find({
    confidence: {
      $gte: minConfidence,
      $lte: maxConfidence
    }
  }).sort({ confidence: -1 });
};

// Método estático para obtener estadísticas
AIAnalysisSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        highConfidence: {
          $sum: { $cond: [{ $gte: ['$confidence', 70] }, 1, 0] }
        },
        critical: {
          $sum: { $cond: [{ $eq: ['$urgency', 'critical'] }, 1, 0] }
        },
        high: {
          $sum: { $cond: [{ $eq: ['$urgency', 'high'] }, 1, 0] }
        },
        medium: {
          $sum: { $cond: [{ $eq: ['$urgency', 'medium'] }, 1, 0] }
        },
        low: {
          $sum: { $cond: [{ $eq: ['$urgency', 'low'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    avgConfidence: 0,
    highConfidence: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
};

// Método estático para obtener diagnósticos más comunes
AIAnalysisSchema.statics.getTopDiagnoses = async function(limit: number = 10) {
  const diagnoses = await this.aggregate([
    { $unwind: '$possibleDiagnoses' },
    {
      $group: {
        _id: '$possibleDiagnoses.condition',
        count: { $sum: 1 },
        avgProbability: { $avg: '$possibleDiagnoses.probability' },
        maxProbability: { $max: '$possibleDiagnoses.probability' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);

  return diagnoses;
};

// Método estático para obtener análisis por período
AIAnalysisSchema.statics.getAnalysisByPeriod = async function(startDate: Date, endDate: Date) {
  const analyses = await this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        critical: {
          $sum: { $cond: [{ $eq: ['$urgency', 'critical'] }, 1, 0] }
        }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  return analyses;
};

// Método estático para obtener recomendaciones más comunes.
// Note: recommendations are stored encrypted with a random IV, so DB-side aggregation
// cannot group by plaintext. We load documents (which triggers decryption via post-hooks)
// and aggregate in memory.
AIAnalysisSchema.statics.getTopRecommendations = async function(limit: number = 10) {
  const docs = await this.find({}, { possibleDiagnoses: 1 }).lean(false);
  const counts = new Map<string, number>();
  for (const doc of docs) {
    const diagnoses = (doc as any).possibleDiagnoses || [];
    for (const diag of diagnoses) {
      const recs = diag?.recommendations || [];
      for (const rec of recs) {
        if (typeof rec === 'string' && rec.length > 0) {
          counts.set(rec, (counts.get(rec) || 0) + 1);
        }
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ _id: id, count }));
};

export default mongoose.model<AIAnalysisDocument, AIAnalysisModel>('AIAnalysis', AIAnalysisSchema);
