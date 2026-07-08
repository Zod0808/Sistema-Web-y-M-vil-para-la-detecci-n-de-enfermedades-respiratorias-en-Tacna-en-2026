/**
 * ML Orchestration Routes
 * 
 * Rutas para orquestar sesiones de RL y FL desde el backend
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import mlOrchestrationService from '../services/mlOrchestrationService';
import { logger } from '../utils/logger';

const router = Router();

// Every ML orchestration endpoint requires a signed-in user. Without this the
// downstream requireRole() guards observed req.user as undefined and rejected
// every request with 401.
router.use(authenticate);

/**
 * POST /api/v1/ml/rl/session/start
 * Iniciar sesión de Reinforcement Learning
 */
router.post(
  '/rl/session/start',
  requireRole('doctor'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { envName, config, patientId } = req.body;
    const userId = req.user?._id?.toString();

    const sessionResult = await mlOrchestrationService.startRLSession({
      envName,
      config,
      userId,
      patientId
    });

    res.status(201).json({
      success: true,
      message: 'RL session started successfully',
      data: sessionResult
    });
  })
);

/**
 * POST /api/v1/ml/rl/session/:sessionId/train
 * Entrenar agente RL en una sesión
 */
router.post(
  '/rl/session/:sessionId/train',
  requireRole('doctor'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    const { episodes } = req.body;

    const result = await mlOrchestrationService.trainRLSession(sessionId, episodes || 10);

    res.status(200).json({
      success: true,
      message: 'RL training completed',
      data: result
    });
  })
);

/**
 * POST /api/v1/ml/rl/session/:sessionId/act
 * Obtener acción del agente RL
 */
router.post(
  '/rl/session/:sessionId/act',
  requireRole('patient'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    const { state } = req.body;

    if (!state) {
      return res.status(400).json({
        success: false,
        message: 'State is required'
      });
    }

    const action = await mlOrchestrationService.getRLAction(sessionId, state);

    res.status(200).json({
      success: true,
      message: 'RL action retrieved',
      data: action
    });
  })
);

/**
 * POST /api/v1/ml/fl/round/start
 * Iniciar ronda de Federated Learning
 */
router.post(
  '/fl/round/start',
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { clientIds, roundNumber, aggregationMethod } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'clientIds array is required'
      });
    }

    const result = await mlOrchestrationService.startFLRound({
      clientIds,
      roundNumber,
      aggregationMethod
    });

    res.status(201).json({
      success: true,
      message: 'FL round started successfully',
      data: result
    });
  })
);

/**
 * POST /api/v1/ml/fl/round/:roundId/run
 * Ejecutar ronda de agregación federada
 */
router.post(
  '/fl/round/:roundId/run',
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { roundId } = req.params;
    const { clientUpdates } = req.body;

    if (!clientUpdates || !Array.isArray(clientUpdates)) {
      return res.status(400).json({
        success: false,
        message: 'clientUpdates array is required'
      });
    }

    const result = await mlOrchestrationService.runFLRound(roundId, clientUpdates);

    res.status(200).json({
      success: true,
      message: 'FL round completed',
      data: result
    });
  })
);

/**
 * GET /api/v1/ml/fl/global-model
 * Obtener modelo global de FL
 */
router.get(
  '/fl/global-model',
  requireRole('doctor'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const model = await mlOrchestrationService.getFLGlobalModel();

    res.status(200).json({
      success: true,
      message: 'FL global model retrieved',
      data: model
    });
  })
);

/**
 * GET /api/v1/ml/experiments
 * Obtener historial de experimentos
 */
router.get(
  '/experiments',
  requireRole('doctor'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { experimentType, status, modelName, limit } = req.query;
    const userId = req.user?.role === 'patient' ? req.user._id?.toString() : undefined;

    const experiments = await mlOrchestrationService.getExperimentHistory({
      experimentType: experimentType as string,
      status: status as string,
      modelName: modelName as string,
      userId,
      limit: limit ? parseInt(limit as string) : 50
    });

    res.status(200).json({
      success: true,
      message: 'Experiments retrieved',
      data: experiments
    });
  })
);

/**
 * GET /api/v1/ml/experiments/stats
 * Obtener estadísticas de experimentos
 */
router.get(
  '/experiments/stats',
  requireRole('admin'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const stats = await mlOrchestrationService.getExperimentStats();

    res.status(200).json({
      success: true,
      message: 'Experiment statistics retrieved',
      data: stats
    });
  })
);

export default router;

