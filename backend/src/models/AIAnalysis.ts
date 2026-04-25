import mongoose, { Document, Schema } from 'mongoose';
import { AIAnalysis as IAIAnalysis, Symptom } from '../types';
import { applyFieldEncryption, getEncryptionKey, encryptString, decryptString } from '../utils/encryption';

export interface AIAnalysisDocument extends Omit<IAIAnalysis, '_id'>, Document {
  toJSON(): any;
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

const AIAnalysisSchema = new Schema<AIAnalysisDocument>({
  medicalHistoryId: {
    type: String,
    required: [true, 'El ID de la historia médica es obligatorio'],
    trim: true
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

// Método estático para obtener recomendaciones más comunes
AIAnalysisSchema.statics.getTopRecommendations = async function(limit: number = 10) {
  const recommendations = await this.aggregate([
    { $unwind: '$possibleDiagnoses' },
    { $unwind: '$possibleDiagnoses.recommendations' },
    {
      $group: {
        _id: '$possibleDiagnoses.recommendations',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);

  return recommendations;
};

export default mongoose.model<AIAnalysisDocument>('AIAnalysis', AIAnalysisSchema);
