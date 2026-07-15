/**
 * ML Monitoring endpoints (dev-only)
 *
 * Proxies /ml/monitoring, /ml/features, /ml/fairness to the AI service
 * (trying multiple candidate URLs). /monitoring additionally falls back
 * to computing metrics from MongoDB MLExperiment documents when the AI
 * service is unreachable — this is the "always-return-something" dev
 * behavior that the frontend relies on.
 *
 * Also exposes GET /api/v1/ml/experiments (list MLExperiment docs).
 *
 * Registered via applyMlMonitoringDev(app) because the paths are mixed
 * (some under /api/analytics, some under /api/v1/analytics, one under
 * /api/v1/ml) — a single Router can't handle that cleanly.
 */

import type { Application, Request, Response } from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const AI_SERVICE_CANDIDATES: string[] = [
  process.env['AI_SERVICE_URL']?.replace(/\/$/, '') ?? '',
  'http://ai-services:8000/api/v1',
  'http://localhost:8000/api/v1',
].filter(Boolean);

const fetchFromAiService = async (path: string, options: any = {}): Promise<any> => {
  let lastError: any;
  for (const base of AI_SERVICE_CANDIDATES) {
    const url = `${base}${path}`;
    try {
      const response = await axios.get(url, { timeout: 8000, ...options });
      const result = response.data;
      if (result && typeof result === 'object') {
        if (result.success === true && 'data' in result) {
          const innerData = result.data;
          if (innerData && typeof innerData === 'object' && innerData.success === true && 'data' in innerData) {
            return innerData.data;
          }
          return innerData;
        }
        if (!('success' in result)) return result;
      }
      return result ?? {};
    } catch (err: any) {
      lastError = err;
      logger.warn(`AI service request failed for ${url}`, { error: err.message });
    }
  }
  throw lastError;
};

const ML_EXPERIMENT_SCHEMA = new mongoose.Schema(
  {
    experimentId: { type: String, index: true },
    experimentType: {
      type: String,
      enum: ['rl_session', 'fl_round', 'automl_pipeline', 'prediction', 'training', 'evaluation'],
      index: true,
    },
    modelName: { type: String, index: true },
    modelVersion: String,
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    inputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    outputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    logs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    errors: { type: [mongoose.Schema.Types.Mixed], default: [] },
    performance: {
      startTime: { type: Date, default: Date.now },
      endTime: Date,
      durationMs: Number,
      cpuUsage: Number,
      memoryUsage: Number,
      gpuUsage: Number,
    },
    results: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'mlexperiments' },
);

const getMlExperimentModel = (): mongoose.Model<any> => {
  try {
    return mongoose.model('MLExperiment');
  } catch {
    return mongoose.model('MLExperiment', ML_EXPERIMENT_SCHEMA);
  }
};

const isMongoConnected = (): boolean => mongoose.connection.readyState === 1;

const monitoringHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const params: Record<string, number> = {};
    if (req.query['days']) params['days'] = Number(req.query['days']);

    try {
      const data = await fetchFromAiService('/ml/monitoring/metrics', { params });
      res.json({ success: true, data });
      return;
    } catch {
      logger.warn('AI service not available, calculating from MongoDB MLExperiments');
    }

    if (!isMongoConnected()) {
      res.status(503).json({
        success: false,
        message: 'MongoDB no está conectado.',
        error: 'Database connection unavailable',
      });
      return;
    }

    const MLExperiment = getMlExperimentModel();
    const days = params['days'] ?? 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const experiments = await MLExperiment.find({
      status: 'completed',
      createdAt: { $gte: startDate },
    }).lean();

    let totalPredictions = 0;
    let totalConfidence = 0;
    let lowConfidenceCount = 0;
    const qualityBreakdown = { high: 0, medium: 0, low: 0 };

    for (const exp of experiments) {
      if ((exp as any).outputs?.prediction) {
        totalPredictions++;
        const confidence = (exp as any).outputs.prediction.confidence ?? 0;
        totalConfidence += confidence;
        if (confidence < 0.6) {
          lowConfidenceCount++;
          qualityBreakdown.low++;
        } else if (confidence < 0.8) {
          qualityBreakdown.medium++;
        } else {
          qualityBreakdown.high++;
        }
      }
    }

    const avgConfidence = totalPredictions > 0 ? totalConfidence / totalPredictions : 0;
    const lowConfidencePercentage = totalPredictions > 0 ? (lowConfidenceCount / totalPredictions) * 100 : 0;

    const dailyPredictions = Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayExperiments = experiments.filter((exp: any) => {
        const expDate = new Date(exp.createdAt);
        return expDate.toDateString() === date.toDateString();
      });
      const dayWithPreds = dayExperiments.filter((exp: any) => exp.outputs?.prediction);
      const dayConfidences = dayWithPreds.map((exp: any) => exp.outputs.prediction.confidence ?? 0);
      const dayAvg = dayConfidences.length > 0
        ? dayConfidences.reduce((a: number, b: number) => a + b, 0) / dayConfidences.length
        : 0;
      return { date: date.toISOString().split('T')[0], count: dayWithPreds.length, avg_confidence: dayAvg };
    });

    const modelStats: Record<string, { predictions: number; confidences: number[]; accuracies: number[] }> = {};
    for (const exp of experiments) {
      const e = exp as any;
      if (e.outputs?.prediction && e.modelName) {
        if (!modelStats[e.modelName]) {
          modelStats[e.modelName] = { predictions: 0, confidences: [], accuracies: [] };
        }
        modelStats[e.modelName]!.predictions++;
        modelStats[e.modelName]!.confidences.push(e.outputs.prediction.confidence ?? 0);
        if (e.outputs.metrics?.accuracy) {
          modelStats[e.modelName]!.accuracies.push(e.outputs.metrics.accuracy);
        }
      }
    }

    const modelPerformance = ['XGBoost', 'Random Forest', 'Neural Network'].map((name) => {
      const stats = modelStats[name] ?? { predictions: 0, confidences: [], accuracies: [] };
      return {
        model_name: name,
        predictions: stats.predictions,
        avg_confidence:
          stats.confidences.length > 0
            ? stats.confidences.reduce((a, b) => a + b, 0) / stats.confidences.length
            : 0,
        accuracy:
          stats.accuracies.length > 0
            ? stats.accuracies.reduce((a, b) => a + b, 0) / stats.accuracies.length
            : 0,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          total_predictions: totalPredictions,
          avg_confidence: avgConfidence,
          low_confidence_predictions: lowConfidenceCount,
          low_confidence_percentage: lowConfidencePercentage,
        },
        quality_metrics: {
          high_confidence_rate: totalPredictions > 0 ? (qualityBreakdown.high / totalPredictions) * 100 : 0,
          medium_confidence_rate: totalPredictions > 0 ? (qualityBreakdown.medium / totalPredictions) * 100 : 0,
          low_confidence_rate: totalPredictions > 0 ? (qualityBreakdown.low / totalPredictions) * 100 : 0,
        },
        daily_predictions: dailyPredictions,
        model_performance: modelPerformance,
      },
    });
  } catch (err: any) {
    logger.error('ML monitoring failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message ?? 'Error al obtener métricas de monitoreo' });
  }
};

const featuresHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const params: Record<string, number> = {};
    if (req.query['top']) params['top_n'] = Number(req.query['top']);
    const data = await fetchFromAiService('/ml/monitoring/features', { params });
    res.json({ success: true, data });
  } catch (err: any) {
    const status = err?.response?.status ?? 502;
    res.status(status).json({
      success: false,
      message: err?.response?.data?.detail ?? err.message ?? 'Error al obtener contribuciones de características',
    });
  }
};

const fairnessHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const params: Record<string, any> = {};
    if (req.query['groupField']) params['group_field'] = req.query['groupField'];
    if (req.query['highConfidenceThreshold']) {
      params['high_confidence_threshold'] = Number(req.query['highConfidenceThreshold']);
    }
    const data = await fetchFromAiService('/ml/monitoring/fairness', { params });
    res.json({ success: true, data });
  } catch (err: any) {
    const status = err?.response?.status ?? 502;
    res.status(status).json({
      success: false,
      message: err?.response?.data?.detail ?? err.message ?? 'Error al obtener métricas de equidad',
    });
  }
};

const experimentsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isMongoConnected()) {
      res.status(503).json({
        success: false,
        message: 'MongoDB no está conectado.',
        error: 'Database connection unavailable',
      });
      return;
    }
    const { limit = '5', experimentType, status, modelName } = req.query as Record<string, string>;
    const MLExperiment = getMlExperimentModel();

    const filter: Record<string, any> = {};
    if (experimentType) filter['experimentType'] = experimentType;
    if (status) filter['status'] = status;
    if (modelName) filter['modelName'] = new RegExp(modelName, 'i');

    const totalCount = await MLExperiment.countDocuments(filter);
    const experiments = await MLExperiment.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      message: 'Experimentos ML obtenidos correctamente',
      data: experiments,
      total: totalCount,
    });
  } catch (err: any) {
    logger.error('ML experiments list failed', { error: err.message });
    res.status(500).json({ success: false, message: 'Error al obtener experimentos ML', error: err.message });
  }
};

/**
 * Register all ML-monitoring dev endpoints on the given Express app.
 * Called from index-dev.js.
 */
export const applyMlMonitoringDev = (app: Application): void => {
  const monitoringRoutes = ['/api/analytics/ml/monitoring', '/api/v1/analytics/ml/monitoring'];
  const featureRoutes = ['/api/analytics/ml/features', '/api/v1/analytics/ml/features'];
  const fairnessRoutes = ['/api/analytics/ml/fairness', '/api/v1/analytics/ml/fairness'];

  app.get(monitoringRoutes, monitoringHandler);
  app.get(featureRoutes, featuresHandler);
  app.get(fairnessRoutes, fairnessHandler);
  app.get('/api/v1/ml/experiments', experimentsHandler);
};

export default applyMlMonitoringDev;
