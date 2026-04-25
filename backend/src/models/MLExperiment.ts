/**
 * MLExperiment Model
 * 
 * Modelo para almacenar logs de experimentos ML, predicciones y auditoría
 * para análisis histórico y debugging
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MLExperimentDocument extends Omit<Document, 'errors'> {
  experimentId: string;
  experimentType: 'rl_session' | 'fl_round' | 'automl_pipeline' | 'prediction' | 'training' | 'evaluation';
  modelName: string;
  modelVersion?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Metadata del experimento
  metadata: {
    userId?: string;
    patientId?: string;
    sessionId?: string;
    roundNumber?: number;
    clientIds?: string[];
    [key: string]: any;
  };
  
  // Inputs del experimento
  inputs: {
    state?: Record<string, any>;
    symptoms?: any[];
    features?: string[];
    trainingData?: {
      samples: number;
      features: number;
      distribution?: Record<string, any>;
    };
    hyperparameters?: Record<string, any>;
    [key: string]: any;
  };
  
  // Outputs del experimento
  outputs: {
    prediction?: any;
    action?: string;
    reward?: number;
    metrics?: {
      accuracy?: number;
      precision?: number;
      recall?: number;
      f1?: number;
      loss?: number;
      [key: string]: number | undefined;
    };
    modelArtifact?: string;
    aggregatedModel?: any;
    [key: string]: any;
  };
  
  // Logs y errores
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'debug';
    message: string;
    data?: any;
  }>;
  
  errors?: Array<{
    timestamp: Date;
    error: string;
    stack?: string;
    context?: any;
  }>;
  
  // Performance
  performance: {
    startTime: Date;
    endTime?: Date;
    durationMs?: number;
    cpuUsage?: number;
    memoryUsage?: number;
    gpuUsage?: number;
  };
  
  // Resultados y análisis
  results?: {
    success: boolean;
    message?: string;
    recommendations?: string[];
    nextSteps?: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addLog(level: 'info' | 'warning' | 'error' | 'debug', message: string, data?: any): Promise<this>;
  addError(error: Error | string, context?: any): Promise<this>;
  complete(outputs?: any, results?: any): Promise<this>;
}

const LogEntrySchema = new Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  level: {
    type: String,
    enum: ['info', 'warning', 'error', 'debug'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed
  }
}, { _id: false });

const ErrorEntrySchema = new Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  error: {
    type: String,
    required: true
  },
  stack: String,
  context: {
    type: Schema.Types.Mixed
  }
}, { _id: false });

const MLExperimentSchema = new Schema<MLExperimentDocument>({
  experimentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  experimentType: {
    type: String,
    enum: ['rl_session', 'fl_round', 'automl_pipeline', 'prediction', 'training', 'evaluation'],
    required: true,
    index: true
  },
  modelName: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  modelVersion: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    required: true,
    default: 'pending',
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  inputs: {
    type: Schema.Types.Mixed,
    default: {}
  },
  outputs: {
    type: Schema.Types.Mixed,
    default: {}
  },
  logs: {
    type: [LogEntrySchema],
    default: []
  },
  errors: {
    type: [ErrorEntrySchema],
    default: []
  },
  performance: {
    startTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    endTime: Date,
    durationMs: Number,
    cpuUsage: Number,
    memoryUsage: Number,
    gpuUsage: Number
  },
  results: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
MLExperimentSchema.index({ experimentId: 1 });
MLExperimentSchema.index({ experimentType: 1, status: 1 });
MLExperimentSchema.index({ modelName: 1, createdAt: -1 });
MLExperimentSchema.index({ 'metadata.userId': 1 });
MLExperimentSchema.index({ 'metadata.sessionId': 1 });
MLExperimentSchema.index({ 'metadata.roundNumber': 1 });
MLExperimentSchema.index({ 'performance.startTime': -1 });
MLExperimentSchema.index({ status: 1, createdAt: -1 });

// Índices compuestos para analytics
MLExperimentSchema.index({ experimentType: 1, status: 1, createdAt: -1 });
MLExperimentSchema.index({ modelName: 1, status: 1, 'performance.startTime': -1 });

// Métodos estáticos
MLExperimentSchema.statics.findByExperimentId = function(experimentId: string) {
  return this.findOne({ experimentId });
};

MLExperimentSchema.statics.findByType = function(type: string) {
  return this.find({ experimentType: type }).sort({ createdAt: -1 });
};

MLExperimentSchema.statics.findByStatus = function(status: string) {
  return this.find({ status }).sort({ createdAt: -1 });
};

MLExperimentSchema.statics.findBySession = function(sessionId: string) {
  return this.find({ 'metadata.sessionId': sessionId }).sort({ createdAt: -1 });
};

MLExperimentSchema.statics.findByModel = function(modelName: string, limit: number = 50) {
  return this.find({ modelName }).sort({ createdAt: -1 }).limit(limit);
};

MLExperimentSchema.statics.getExperimentStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$experimentType',
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        avgDuration: { $avg: '$performance.durationMs' }
      }
    }
  ]);
};

// Virtual para calcular duración si no está calculada
MLExperimentSchema.virtual('duration').get(function() {
  if (this.performance?.durationMs) {
    return this.performance.durationMs;
  }
  if (this.performance?.endTime && this.performance?.startTime) {
    return this.performance.endTime.getTime() - this.performance.startTime.getTime();
  }
  return null;
});

// Método de instancia para agregar log
MLExperimentSchema.methods.addLog = function(level: string, message: string, data?: any) {
  this.logs.push({
    timestamp: new Date(),
    level: level as any,
    message,
    data
  });
  return this.save();
};

// Método de instancia para agregar error
MLExperimentSchema.methods.addError = function(error: Error | string, context?: any) {
  const errorEntry: any = {
    timestamp: new Date(),
    error: error instanceof Error ? error.message : error,
    context
  };
  if (error instanceof Error && error.stack) {
    errorEntry.stack = error.stack;
  }
  this.errors.push(errorEntry);
  this.status = 'failed';
  return this.save();
};

// Método de instancia para finalizar experimento
MLExperimentSchema.methods.complete = function(outputs?: any, results?: any) {
  this.status = 'completed';
  this.performance.endTime = new Date();
  this.performance.durationMs = this.performance.endTime.getTime() - this.performance.startTime.getTime();
  if (outputs) {
    this.outputs = { ...this.outputs, ...outputs };
  }
  if (results) {
    this.results = results;
  }
  return this.save();
};

interface MLExperimentModel extends Model<MLExperimentDocument> {
  findByExperimentId(experimentId: string): Promise<MLExperimentDocument | null>;
  findByType(type: string): Promise<MLExperimentDocument[]>;
  findByStatus(status: string): Promise<MLExperimentDocument[]>;
  findBySession(sessionId: string): Promise<MLExperimentDocument[]>;
  findByModel(modelName: string, limit?: number): Promise<MLExperimentDocument[]>;
  getExperimentStats(): Promise<any[]>;
}

export default mongoose.model<MLExperimentDocument, MLExperimentModel>('MLExperiment', MLExperimentSchema);

