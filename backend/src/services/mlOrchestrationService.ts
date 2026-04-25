/**
 * ML Orchestration Service
 * 
 * Servicio para orquestar sesiones de Reinforcement Learning y Federated Learning
 * desde el backend, incluyendo coordinación, logs y seguimiento
 */

import { logger } from '../utils/logger';
import MLExperiment from '../models/MLExperiment';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface RLSessionConfig {
  envName?: string;
  config?: Record<string, any>;
  userId?: string;
  patientId?: string;
}

export interface RLSessionResult {
  sessionId: string;
  status: string;
  episodes?: number;
  avgReward?: number;
  experimentId: string;
}

export interface FLRoundConfig {
  clientIds: string[];
  roundNumber?: number;
  aggregationMethod?: 'fedavg' | 'fedprox' | 'scaffold';
}

export interface FLRoundResult {
  roundId: string;
  roundNumber: number;
  status: string;
  globalAccuracy?: number;
  participants?: number;
  experimentId: string;
}

export class MLOrchestrationService {
  /**
   * Iniciar sesión de Reinforcement Learning
   */
  async startRLSession(config: RLSessionConfig): Promise<RLSessionResult> {
    const sessionId = uuidv4();
    const experimentId = `rl_${sessionId}`;

    try {
      // Crear registro de experimento
      const experiment = new MLExperiment({
        experimentId,
        experimentType: 'rl_session',
        modelName: 'reinforcement_learning_agent',
        status: 'running',
        metadata: {
          sessionId,
          userId: config.userId,
          patientId: config.patientId,
          envName: config.envName || 'clinical-optimizer'
        },
        inputs: {
          config: config.config || {}
        },
        performance: {
          startTime: new Date()
        }
      });

      await experiment.save();
      await experiment.addLog('info', 'RL session started', { sessionId, config });

      // Configurar agente RL en AI Services
      try {
        const configureResponse = await axios.post(
          `${AI_SERVICE_URL}/api/v1/rl/configure`,
          {
            env_name: config.envName || 'clinical-optimizer',
            config: config.config || {}
          },
          { timeout: 30000 }
        );

        await experiment.addLog('info', 'RL agent configured', configureResponse.data);
      } catch (error: any) {
        await experiment.addError(error, { step: 'configure' });
        throw error;
      }

      logger.info('RL session started', { sessionId, experimentId });

      return {
        sessionId,
        status: 'running',
        experimentId
      };
    } catch (error: any) {
      logger.error('Failed to start RL session', { error: error.message, config });
      throw error;
    }
  }

  /**
   * Entrenar agente RL en una sesión
   */
  async trainRLSession(sessionId: string, episodes: number = 10): Promise<RLSessionResult> {
    try {
      const experiment = await MLExperiment.findOne({ 'metadata.sessionId': sessionId });
      if (!experiment) {
        throw new Error(`RL session not found: ${sessionId}`);
      }

      await experiment.addLog('info', `Starting RL training with ${episodes} episodes`);

      // Entrenar agente en AI Services
      const trainResponse = await axios.post(
        `${AI_SERVICE_URL}/api/v1/rl/train`,
        {
          env_name: experiment.metadata.envName || 'clinical-optimizer',
          episodes
        },
        { timeout: 300000 } // 5 minutos para entrenamiento
      );

      const { avg_reward, episodes: completedEpisodes } = trainResponse.data;

      // Actualizar experimento
      experiment.outputs = {
        episodes: completedEpisodes,
        avgReward: avg_reward
      };
      await experiment.complete(
        { episodes: completedEpisodes, avgReward: avg_reward },
        { success: true, message: 'RL training completed successfully' }
      );

      await experiment.addLog('info', 'RL training completed', trainResponse.data);

      logger.info('RL session training completed', { sessionId, episodes, avg_reward });

      return {
        sessionId,
        status: 'completed',
        episodes: completedEpisodes,
        avgReward: avg_reward,
        experimentId: experiment.experimentId
      };
    } catch (error: any) {
      logger.error('Failed to train RL session', { error: error.message, sessionId });
      
      // Actualizar experimento con error
      const experiment = await MLExperiment.findOne({ 'metadata.sessionId': sessionId });
      if (experiment) {
        await experiment.addError(error, { step: 'train' });
      }
      
      throw error;
    }
  }

  /**
   * Obtener acción del agente RL
   */
  async getRLAction(sessionId: string, state: Record<string, any>): Promise<any> {
    try {
      const experiment = await MLExperiment.findOne({ 'metadata.sessionId': sessionId });
      if (!experiment) {
        throw new Error(`RL session not found: ${sessionId}`);
      }

      await experiment.addLog('info', 'Requesting RL action', { stateKeys: Object.keys(state) });

      // Obtener acción del agente
      const actResponse = await axios.post(
        `${AI_SERVICE_URL}/api/v1/rl/act`,
        {
          env_name: experiment.metadata.envName || 'clinical-optimizer',
          state
        },
        { timeout: 10000 }
      );

      await experiment.addLog('info', 'RL action received', actResponse.data);

      return actResponse.data;
    } catch (error: any) {
      logger.error('Failed to get RL action', { error: error.message, sessionId });
      throw error;
    }
  }

  /**
   * Iniciar ronda de Federated Learning
   */
  async startFLRound(config: FLRoundConfig): Promise<FLRoundResult> {
    const roundId = uuidv4();
    const experimentId = `fl_${roundId}`;
    const roundNumber = config.roundNumber || 1;

    try {
      // Crear registro de experimento
      const experiment = new MLExperiment({
        experimentId,
        experimentType: 'fl_round',
        modelName: 'federated_learning_model',
        status: 'running',
        metadata: {
          roundId,
          roundNumber,
          clientIds: config.clientIds,
          aggregationMethod: config.aggregationMethod || 'fedavg'
        },
        inputs: {
          clientIds: config.clientIds,
          aggregationMethod: config.aggregationMethod || 'fedavg'
        },
        performance: {
          startTime: new Date()
        }
      });

      await experiment.save();
      await experiment.addLog('info', 'FL round started', { roundId, roundNumber, clients: config.clientIds.length });

      // Registrar clientes en AI Services
      try {
        const registerResponse = await axios.post(
          `${AI_SERVICE_URL}/api/v1/federated/register_clients`,
          {
            clients: config.clientIds
          },
          { timeout: 30000 }
        );

        await experiment.addLog('info', 'FL clients registered', registerResponse.data);
      } catch (error: any) {
        await experiment.addError(error, { step: 'register_clients' });
        throw error;
      }

      logger.info('FL round started', { roundId, roundNumber, experimentId });

      return {
        roundId,
        roundNumber,
        status: 'running',
        participants: config.clientIds.length,
        experimentId
      };
    } catch (error: any) {
      logger.error('Failed to start FL round', { error: error.message, config });
      throw error;
    }
  }

  /**
   * Ejecutar ronda de agregación federada
   */
  async runFLRound(roundId: string, clientUpdates: Array<Record<string, any>>): Promise<FLRoundResult> {
    try {
      const experiment = await MLExperiment.findOne({ 'metadata.roundId': roundId });
      if (!experiment) {
        throw new Error(`FL round not found: ${roundId}`);
      }

      await experiment.addLog('info', `Running FL aggregation with ${clientUpdates.length} client updates`);

      // Ejecutar ronda en AI Services
      const roundResponse = await axios.post(
        `${AI_SERVICE_URL}/api/v1/federated/run_round`,
        {
          client_updates: clientUpdates
        },
        { timeout: 300000 } // 5 minutos para agregación
      );

      const { global_acc, round: completedRound } = roundResponse.data;

      // Actualizar experimento
      experiment.outputs = {
        globalAccuracy: global_acc,
        roundNumber: completedRound
      };
      experiment.metadata.roundNumber = completedRound;
      await experiment.complete(
        { globalAccuracy: global_acc, roundNumber: completedRound },
        { success: true, message: 'FL round completed successfully' }
      );

      await experiment.addLog('info', 'FL round completed', roundResponse.data);

      logger.info('FL round completed', { roundId, global_acc, completedRound });

      return {
        roundId,
        roundNumber: completedRound,
        status: 'completed',
        globalAccuracy: global_acc,
        participants: clientUpdates.length,
        experimentId: experiment.experimentId
      };
    } catch (error: any) {
      logger.error('Failed to run FL round', { error: error.message, roundId });
      
      // Actualizar experimento con error
      const experiment = await MLExperiment.findOne({ 'metadata.roundId': roundId });
      if (experiment) {
        await experiment.addError(error, { step: 'run_round' });
      }
      
      throw error;
    }
  }

  /**
   * Obtener modelo global de FL
   */
  async getFLGlobalModel(): Promise<any> {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/api/v1/federated/global_model`, {
        timeout: 10000
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get FL global model', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtener historial de experimentos
   */
  async getExperimentHistory(filters: {
    experimentType?: string;
    status?: string;
    modelName?: string;
    userId?: string;
    limit?: number;
  }): Promise<any[]> {
    const query: any = {};

    if (filters.experimentType) {
      query.experimentType = filters.experimentType;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.modelName) {
      query.modelName = filters.modelName;
    }
    if (filters.userId) {
      query['metadata.userId'] = filters.userId;
    }

    const experiments = await MLExperiment.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50)
      .lean();

    return experiments;
  }

  /**
   * Obtener estadísticas de experimentos
   */
  async getExperimentStats(): Promise<any> {
    const stats = await MLExperiment.getExperimentStats();
    return stats;
  }
}

export default new MLOrchestrationService();

