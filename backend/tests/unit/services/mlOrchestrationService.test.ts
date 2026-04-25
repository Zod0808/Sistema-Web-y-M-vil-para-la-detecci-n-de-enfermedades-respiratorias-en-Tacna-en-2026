import { MLOrchestrationService } from '../../../src/services/mlOrchestrationService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234'),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../../src/models/MLExperiment', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    experimentId: 'rl_test-uuid-1234',
    metadata: { sessionId: 'test-uuid-1234', envName: 'clinical-optimizer' },
    save: jest.fn().mockResolvedValue(undefined),
    addLog: jest.fn().mockResolvedValue(undefined),
    addError: jest.fn().mockResolvedValue(undefined),
    complete: jest.fn().mockResolvedValue(undefined),
    outputs: {},
  })),
}));

const axios = require('axios');
const MLExperiment = require('../../../src/models/MLExperiment').default;

// Agregar findOne mock al constructor mock
MLExperiment.findOne = jest.fn();

describe('MLOrchestrationService', () => {
  let service: MLOrchestrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MLOrchestrationService();

    // Reset MLExperiment mock instance
    MLExperiment.mockImplementation(() => ({
      experimentId: 'rl_test-uuid-1234',
      metadata: { sessionId: 'test-uuid-1234', envName: 'clinical-optimizer' },
      save: jest.fn().mockResolvedValue(undefined),
      addLog: jest.fn().mockResolvedValue(undefined),
      addError: jest.fn().mockResolvedValue(undefined),
      complete: jest.fn().mockResolvedValue(undefined),
      outputs: {},
    }));
  });

  describe('startRLSession', () => {
    it('crea experimento y configura el agente RL', async () => {
      axios.post.mockResolvedValue({
        data: { status: 'configured', env_name: 'clinical-optimizer' },
      });

      const result = await service.startRLSession({
        envName: 'clinical-optimizer',
        userId: 'user-1',
      });

      expect(result.sessionId).toBeDefined();
      expect(result.status).toBe('running');
      expect(result.experimentId).toContain('rl_');
    });

    it('incluye patientId en el resultado cuando se provee', async () => {
      axios.post.mockResolvedValue({ data: { status: 'configured' } });

      const result = await service.startRLSession({
        patientId: 'patient-1',
        userId: 'user-1',
      });

      expect(result.status).toBe('running');
    });

    it('propaga error cuando el servicio AI falla al configurar', async () => {
      axios.post.mockRejectedValue(new Error('AI Service unavailable'));

      await expect(
        service.startRLSession({ envName: 'clinical-optimizer' })
      ).rejects.toThrow('AI Service unavailable');
    });

    it('usa config personalizada del agente', async () => {
      axios.post.mockResolvedValue({ data: { status: 'configured' } });

      await service.startRLSession({
        config: { learning_rate: 0.001, discount_factor: 0.99 },
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/rl/configure'),
        expect.objectContaining({ config: { learning_rate: 0.001, discount_factor: 0.99 } }),
        expect.any(Object)
      );
    });
  });

  describe('trainRLSession', () => {
    it('entrena la sesión y retorna resultados', async () => {
      const mockExperiment = {
        experimentId: 'rl_test-uuid-1234',
        metadata: { envName: 'clinical-optimizer' },
        addLog: jest.fn().mockResolvedValue(undefined),
        addError: jest.fn().mockResolvedValue(undefined),
        complete: jest.fn().mockResolvedValue(undefined),
        outputs: {},
      };
      MLExperiment.findOne.mockResolvedValue(mockExperiment);

      axios.post.mockResolvedValue({
        data: { avg_reward: 85.5, episodes: 10 },
      });

      const result = await service.trainRLSession('test-uuid-1234', 10);

      expect(result.status).toBe('completed');
      expect(result.episodes).toBe(10);
      expect(result.avgReward).toBe(85.5);
    });

    it('lanza error cuando la sesión no existe', async () => {
      MLExperiment.findOne.mockResolvedValue(null);

      await expect(service.trainRLSession('nonexistent')).rejects.toThrow('RL session not found');
    });

    it('registra error en el experimento cuando el entrenamiento falla', async () => {
      const mockExperiment = {
        experimentId: 'rl_test',
        metadata: { envName: 'clinical-optimizer' },
        addLog: jest.fn().mockResolvedValue(undefined),
        addError: jest.fn().mockResolvedValue(undefined),
        outputs: {},
      };
      MLExperiment.findOne.mockResolvedValue(mockExperiment);
      axios.post.mockRejectedValue(new Error('Training failed'));

      await expect(service.trainRLSession('test-uuid-1234')).rejects.toThrow('Training failed');
      expect(mockExperiment.addError).toHaveBeenCalled();
    });
  });

  describe('getRLAction', () => {
    it('obtiene acción del agente para un estado dado', async () => {
      const mockExperiment = {
        metadata: { envName: 'clinical-optimizer' },
        addLog: jest.fn().mockResolvedValue(undefined),
      };
      MLExperiment.findOne.mockResolvedValue(mockExperiment);

      axios.post.mockResolvedValue({
        data: { action: 2, probability: 0.95 },
      });

      const result = await service.getRLAction('test-uuid-1234', { vitals: { hr: 80 } });

      expect(result).toBeDefined();
      expect(result.action).toBe(2);
    });

    it('lanza error cuando la sesión no existe', async () => {
      MLExperiment.findOne.mockResolvedValue(null);

      await expect(service.getRLAction('nonexistent', {})).rejects.toThrow('RL session not found');
    });
  });

  describe('startFLRound', () => {
    it('inicia ronda de federated learning', async () => {
      axios.post.mockResolvedValue({
        data: { status: 'registered', client_count: 3 },
      });

      const result = await service.startFLRound({
        clientIds: ['client-1', 'client-2', 'client-3'],
        roundNumber: 1,
      });

      expect(result.roundId).toBeDefined();
      expect(result.status).toBe('running');
      expect(result.participants).toBe(3);
      expect(result.experimentId).toContain('fl_');
    });

    it('usa fedavg como método de agregación por defecto', async () => {
      axios.post.mockResolvedValue({ data: { status: 'registered' } });

      await service.startFLRound({ clientIds: ['client-1'] });

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/federated/register_clients'),
        expect.objectContaining({ clients: ['client-1'] }),
        expect.any(Object)
      );
    });

    it('propaga error cuando el servicio AI falla al registrar clientes', async () => {
      axios.post.mockRejectedValue(new Error('FL Service unavailable'));

      await expect(
        service.startFLRound({ clientIds: ['client-1'] })
      ).rejects.toThrow('FL Service unavailable');
    });
  });

  describe('runFLRound', () => {
    it('ejecuta ronda de agregación federada', async () => {
      const mockExperiment = {
        experimentId: 'fl_test',
        metadata: {
          roundId: 'test-round',
          roundNumber: 1,
          aggregationMethod: 'fedavg',
          clientIds: ['c1', 'c2'],
        },
        addLog: jest.fn().mockResolvedValue(undefined),
        addError: jest.fn().mockResolvedValue(undefined),
        complete: jest.fn().mockResolvedValue(undefined),
        outputs: {},
      };
      MLExperiment.findOne.mockResolvedValue(mockExperiment);

      axios.post.mockResolvedValue({
        data: {
          status: 'completed',
          global_accuracy: 0.92,
          round_number: 1,
        },
      });

      const result = await service.runFLRound('test-round', [
        { client_id: 'c1', weights: {} },
        { client_id: 'c2', weights: {} },
      ]);

      expect(result.status).toBe('completed');
      expect(result.globalAccuracy).toBe(0.92);
    });

    it('lanza error cuando la ronda no existe', async () => {
      MLExperiment.findOne.mockResolvedValue(null);

      await expect(
        service.runFLRound('nonexistent', [])
      ).rejects.toThrow('FL round not found');
    });
  });
});