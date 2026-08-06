import mongoose from 'mongoose';
import MLExperiment from '../../../src/models/MLExperiment';

const buildExperimentData = (overrides: Partial<Record<string, any>> = {}) => ({
  experimentId: `exp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  experimentType: 'prediction',
  modelName: 'respiratory_classifier_v1',
  status: 'pending',
  metadata: { userId: 'user-1', patientId: 'patient-1' },
  inputs: { symptoms: ['tos', 'fiebre'] },
  outputs: {},
  performance: { startTime: new Date() },
  ...overrides,
});

describe('MLExperiment model', () => {
  afterEach(async () => {
    await MLExperiment.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones', () => {
    it('crea un experimento válido', async () => {
      const data = buildExperimentData();
      const exp = await MLExperiment.create(data);

      expect(exp._id).toBeDefined();
      expect(exp.experimentId).toBe(data.experimentId);
      expect(exp.status).toBe('pending');
    });

    it('falla sin experimentId', async () => {
      const data = buildExperimentData({ experimentId: undefined });
      await expect(MLExperiment.create(data)).rejects.toThrow();
    });

    it('falla sin experimentType', async () => {
      const data = buildExperimentData({ experimentType: undefined });
      await expect(MLExperiment.create(data)).rejects.toThrow();
    });

    it('falla sin modelName', async () => {
      const data = buildExperimentData({ modelName: undefined });
      await expect(MLExperiment.create(data)).rejects.toThrow();
    });

    it('falla con experimentType inválido', async () => {
      const data = buildExperimentData({ experimentType: 'invalid_type' });
      await expect(MLExperiment.create(data)).rejects.toThrow();
    });

    it('falla con status inválido', async () => {
      const data = buildExperimentData({ status: 'unknown_status' });
      await expect(MLExperiment.create(data)).rejects.toThrow();
    });

    it('falla con experimentId duplicado', async () => {
      const data = buildExperimentData({ experimentId: 'duplicate-id' });
      await MLExperiment.create(data);
      await expect(MLExperiment.create(data)).rejects.toThrow();
    });

    it('usa status pending por defecto', async () => {
      const data = buildExperimentData({ status: undefined });
      const exp = await MLExperiment.create(data);
      expect(exp.status).toBe('pending');
    });

    it('acepta todos los tipos de experimento válidos', async () => {
      const types = ['rl_session', 'fl_round', 'automl_pipeline', 'prediction', 'training', 'evaluation'];
      for (const type of types) {
        const exp = await MLExperiment.create(buildExperimentData({ experimentType: type }));
        expect(exp.experimentType).toBe(type);
      }
    });
  });

  describe('Virtual duration', () => {
    it('calcula la duración desde performance.durationMs', async () => {
      const exp = await MLExperiment.create(buildExperimentData({
        performance: { startTime: new Date(), durationMs: 5000 },
      }));
      expect((exp as any).duration).toBe(5000);
    });

    it('calcula la duración desde startTime y endTime', async () => {
      const startTime = new Date(Date.now() - 3000);
      const endTime = new Date();
      const exp = await MLExperiment.create(buildExperimentData({
        performance: { startTime, endTime },
      }));
      const duration = (exp as any).duration;
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeCloseTo(3000, -3);
    });

    it('retorna null cuando no hay datos de tiempo', async () => {
      const exp = await MLExperiment.create(buildExperimentData({
        performance: { startTime: new Date() },
      }));
      expect((exp as any).duration).toBeNull();
    });
  });

  describe('Instance methods', () => {
    it('addLog agrega entrada de log al experimento', async () => {
      const exp = await MLExperiment.create(buildExperimentData());
      await exp.addLog('info', 'Test log message', { key: 'value' });

      const updated = await MLExperiment.findById(exp._id);
      expect(updated!.logs).toHaveLength(1);
      expect(updated!.logs[0].message).toBe('Test log message');
      expect(updated!.logs[0].level).toBe('info');
    });

    it('addLog acepta todos los niveles de log', async () => {
      const exp = await MLExperiment.create(buildExperimentData());
      for (const level of ['info', 'warning', 'error', 'debug'] as const) {
        await exp.addLog(level, `Log level ${level}`);
      }
      const updated = await MLExperiment.findById(exp._id);
      expect(updated!.logs).toHaveLength(4);
    });

    it('addError agrega error y cambia estado a failed', async () => {
      const exp = await MLExperiment.create(buildExperimentData());
      const error = new Error('Test error occurred');
      await exp.addError(error, { step: 'training' });

      const updated = await MLExperiment.findById(exp._id);
      expect(updated!.status).toBe('failed');
      expect(updated!.errors).toHaveLength(1);
      expect(updated!.errors![0].error).toBe('Test error occurred');
    });

    it('addError acepta string como error', async () => {
      const exp = await MLExperiment.create(buildExperimentData());
      await exp.addError('String error message');

      const updated = await MLExperiment.findById(exp._id);
      expect(updated!.errors![0].error).toBe('String error message');
    });

    it('complete cambia estado a completed y registra tiempos', async () => {
      const exp = await MLExperiment.create(buildExperimentData());
      const outputs = { accuracy: 0.95, predictions: [1, 0, 1] };
      const results = { success: true, message: 'Completed successfully' };

      await exp.complete(outputs, results);

      const updated = await MLExperiment.findById(exp._id);
      expect(updated!.status).toBe('completed');
      expect(updated!.performance.endTime).toBeDefined();
      // bajo carga (ej. suite completa en paralelo) create()+complete() pueden
      // caer dentro del mismo milisegundo, dando durationMs = 0 legítimamente
      expect(updated!.performance.durationMs).toBeGreaterThanOrEqual(0);
      expect(updated!.results?.success).toBe(true);
    });

    it('complete sin argumentos también cambia estado', async () => {
      const exp = await MLExperiment.create(buildExperimentData());
      await exp.complete();

      const updated = await MLExperiment.findById(exp._id);
      expect(updated!.status).toBe('completed');
    });
  });

  describe('Static methods', () => {
    it('findByExperimentId encuentra por experimentId', async () => {
      const data = buildExperimentData({ experimentId: 'find-by-id-test' });
      await MLExperiment.create(data);

      const found = await MLExperiment.findByExperimentId('find-by-id-test');
      expect(found).not.toBeNull();
      expect(found!.experimentId).toBe('find-by-id-test');
    });

    it('findByType retorna experimentos del tipo dado', async () => {
      await MLExperiment.create(buildExperimentData({ experimentType: 'rl_session' }));
      await MLExperiment.create(buildExperimentData({ experimentType: 'rl_session' }));
      await MLExperiment.create(buildExperimentData({ experimentType: 'prediction' }));

      const results = await MLExperiment.findByType('rl_session');
      expect(results).toHaveLength(2);
      results.forEach((r) => expect(r.experimentType).toBe('rl_session'));
    });

    it('findByStatus retorna experimentos por estado', async () => {
      await MLExperiment.create(buildExperimentData({ status: 'running' }));
      await MLExperiment.create(buildExperimentData({ status: 'completed' }));

      const running = await MLExperiment.findByStatus('running');
      expect(running).toHaveLength(1);
      expect(running[0].status).toBe('running');
    });

    it('findBySession retorna experimentos por sessionId', async () => {
      await MLExperiment.create(buildExperimentData({ metadata: { sessionId: 'session-abc' } }));
      await MLExperiment.create(buildExperimentData({ metadata: { sessionId: 'session-xyz' } }));

      const results = await MLExperiment.findBySession('session-abc');
      expect(results).toHaveLength(1);
      expect(results[0].metadata.sessionId).toBe('session-abc');
    });

    it('findByModel retorna experimentos por nombre de modelo', async () => {
      const modelName = 'federated_model_v2';
      await MLExperiment.create(buildExperimentData({ modelName }));
      await MLExperiment.create(buildExperimentData({ modelName }));

      const results = await MLExperiment.findByModel(modelName);
      expect(results).toHaveLength(2);
    });

    it('getExperimentStats agrega estadísticas por tipo', async () => {
      await MLExperiment.create(buildExperimentData({ experimentType: 'prediction', status: 'completed' }));
      await MLExperiment.create(buildExperimentData({ experimentType: 'prediction', status: 'failed' }));
      await MLExperiment.create(buildExperimentData({ experimentType: 'training', status: 'running' }));

      const stats = await MLExperiment.getExperimentStats();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
    });
  });
});