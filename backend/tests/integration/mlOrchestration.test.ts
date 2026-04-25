/**
 * Integration tests for ML Orchestration
 * Tests complete lifecycle of RL and FL sessions
 */

import request from 'supertest';
import appInstance from '../../src/index';
import { testUtils } from '../setup';
import { randomUUID } from 'crypto';
import MLExperiment from '../../src/models/MLExperiment';
import User, { UserDocument } from '../../src/models/User';

const app = appInstance.app;
const STRONG_PASSWORD = 'Password123!';

describe('ML Orchestration Integration Tests', () => {
  let doctorToken: string;
  let adminToken: string;
  let doctorId: string;
  let adminId: string;
  let patientId: string;

  beforeEach(async () => {
    await testUtils.cleanTestData();

    // Create test doctor
    const doctor = await User.create({
      name: 'Test Doctor',
      email: 'doctor@test.com',
      password: STRONG_PASSWORD,
      role: 'doctor',
      isActive: true
    }) as UserDocument;
    doctorId = doctor._id.toString();
    doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

    // Create test admin
    const admin = await User.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: STRONG_PASSWORD,
      role: 'admin',
      isActive: true
    }) as UserDocument;
    adminId = admin._id.toString();
    adminToken = testUtils.generateTestToken({ userId: adminId, role: 'admin' });

    // Create test patient
    const patient = await User.create({
      name: 'Test Patient',
      email: 'patient@test.com',
      password: STRONG_PASSWORD,
      role: 'patient',
      isActive: true
    }) as UserDocument;
    patientId = patient._id.toString();
  });

  describe('RL Session Lifecycle', () => {
    it('should complete full RL session lifecycle', async () => {
      // 1. Start RL session
      const startResponse = await request(app)
        .post('/api/v1/ml/rl/session/start')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          envName: 'reminder-optimizer',
          config: {
            patient_profile: {
              medication_schedule: ['08:00', '20:00']
            }
          },
          patientId: patientId
        })
        .expect(201);

      const sessionId = startResponse.body.data.sessionId;
      const experimentId = startResponse.body.data.experimentId;

      expect(sessionId).toBeDefined();
      expect(experimentId).toBeDefined();
      expect(startResponse.body.data.status).toBe('running');

      // Verify experiment was created
      const experiment = await MLExperiment.findOne({ experimentId });
      expect(experiment).toBeDefined();
      expect(experiment?.experimentType).toBe('rl_session');
      expect(experiment?.status).toBe('running');

      // 2. Train RL agent
      const trainResponse = await request(app)
        .post(`/api/v1/ml/rl/session/${sessionId}/train`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          episodes: 5
        })
        .expect(200);

      expect(trainResponse.body.data.status).toBe('ok');
      expect(trainResponse.body.data.episodes).toBe(5);
      expect(trainResponse.body.data.avgReward).toBeDefined();

      // 3. Get RL action
      const actResponse = await request(app)
        .post(`/api/v1/ml/rl/session/${sessionId}/act`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          state: {
            adherence_rate: 0.7,
            recent_reminders: 0.2,
            fatigue_level: 0.1,
            hour_of_day: 0.5,
            day_of_week: 0.5,
            time_to_next_dose: 0.3,
            medication_count: 0.2
          }
        })
        .expect(200);

      expect(actResponse.body.data.status).toBe('ok');
      expect(actResponse.body.data.action).toBeDefined();
      expect(['send_reminder', 'delay_reminder', 'skip_reminder', 'custom_timing']).toContain(
        actResponse.body.data.action
      );
      expect(actResponse.body.data.confidence).toBeDefined();

      // 4. Verify experiment logs
      const updatedExperiment = await MLExperiment.findOne({ experimentId });
      expect(updatedExperiment?.logs.length).toBeGreaterThan(0);
    });

    it('should handle RL session errors gracefully', async () => {
      // Try to train without starting session
      await request(app)
        .post('/api/v1/ml/rl/session/invalid-session/train')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ episodes: 5 })
        .expect(404);
    });

    it('should enforce RBAC for RL sessions', async () => {
      const patientToken = testUtils.generateTestToken({ userId: patientId, role: 'patient' });

      // Patient should not be able to start RL session
      await request(app)
        .post('/api/v1/ml/rl/session/start')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          envName: 'reminder-optimizer',
          config: {}
        })
        .expect(403);

      // Patient should be able to get actions (if session exists)
      const doctorStartResponse = await request(app)
        .post('/api/v1/ml/rl/session/start')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          envName: 'reminder-optimizer',
          config: {}
        })
        .expect(201);

      const sessionId = doctorStartResponse.body.data.sessionId;

      // Patient can get actions
      await request(app)
        .post(`/api/v1/ml/rl/session/${sessionId}/act`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          state: {
            adherence_rate: 0.7,
            recent_reminders: 0.2,
            fatigue_level: 0.1,
            hour_of_day: 0.5,
            day_of_week: 0.5,
            time_to_next_dose: 0.3,
            medication_count: 0.2
          }
        })
        .expect(200);
    });
  });

  describe('FL Round Lifecycle', () => {
    it('should complete full FL round lifecycle', async () => {
      // 1. Start FL round
      const startResponse = await request(app)
        .post('/api/v1/ml/fl/round/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientIds: ['client1', 'client2', 'client3'],
          roundNumber: 1,
          aggregationMethod: 'fedavg'
        })
        .expect(201);

      const roundId = startResponse.body.data.roundId;
      const experimentId = startResponse.body.data.experimentId;

      expect(roundId).toBeDefined();
      expect(experimentId).toBeDefined();
      expect(startResponse.body.data.status).toBe('running');

      // Verify experiment was created
      const experiment = await MLExperiment.findOne({ experimentId });
      expect(experiment).toBeDefined();
      expect(experiment?.experimentType).toBe('fl_round');

      // 2. Run FL round with client updates
      const runResponse = await request(app)
        .post(`/api/v1/ml/fl/round/${roundId}/run`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientUpdates: [
            {
              client_id: 'client1',
              update: { param1: [1.0, 2.0], param2: 0.5 },
              sample_count: 100,
              metadata: { accuracy: 0.85 }
            },
            {
              client_id: 'client2',
              update: { param1: [2.0, 3.0], param2: 0.6 },
              sample_count: 200,
              metadata: { accuracy: 0.90 }
            },
            {
              client_id: 'client3',
              update: { param1: [1.5, 2.5], param2: 0.55 },
              sample_count: 150,
              metadata: { accuracy: 0.88 }
            }
          ]
        })
        .expect(200);

      expect(runResponse.body.data.status).toBe('ok');
      expect(runResponse.body.data.roundNumber).toBe(1);
      expect(runResponse.body.data.participants).toBe(3);
      expect(runResponse.body.data.globalAccuracy).toBeDefined();

      // 3. Get global model
      const modelResponse = await request(app)
        .get('/api/v1/ml/fl/global-model')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(modelResponse.body.data.model_name).toBeDefined();
      expect(modelResponse.body.data.rounds_completed).toBeGreaterThanOrEqual(1);
      expect(modelResponse.body.data.state).toBeDefined();
    });

    it('should handle FL round validation errors', async () => {
      // Start round
      const startResponse = await request(app)
        .post('/api/v1/ml/fl/round/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientIds: ['client1', 'client2']
        })
        .expect(201);

      const roundId = startResponse.body.data.roundId;

      // Try to run with invalid updates
      await request(app)
        .post(`/api/v1/ml/fl/round/${roundId}/run`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          clientUpdates: [] // Empty updates
        })
        .expect(400);
    });

    it('should enforce RBAC for FL rounds', async () => {
      const doctorToken = testUtils.generateTestToken({ userId: doctorId, role: 'doctor' });

      // Doctor should not be able to start FL round
      await request(app)
        .post('/api/v1/ml/fl/round/start')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          clientIds: ['client1', 'client2']
        })
        .expect(403);
    });
  });

  describe('ML Experiment Logging', () => {
    it('should log RL session experiments', async () => {
      const startResponse = await request(app)
        .post('/api/v1/ml/rl/session/start')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          envName: 'reminder-optimizer',
          config: {}
        })
        .expect(201);

      const experimentId = startResponse.body.data.experimentId;

      // Verify experiment logging
      const experiment = await MLExperiment.findOne({ experimentId });
      expect(experiment).toBeDefined();
      expect(experiment?.logs.length).toBeGreaterThan(0);
      expect(experiment?.performance.startTime).toBeDefined();
    });

    it('should retrieve experiment history', async () => {
      // Create multiple experiments
      await request(app)
        .post('/api/v1/ml/rl/session/start')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          envName: 'reminder-optimizer',
          config: {}
        })
        .expect(201);

      await request(app)
        .post('/api/v1/ml/rl/session/start')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          envName: 'reminder-optimizer',
          config: {}
        })
        .expect(201);

      // Retrieve history
      const historyResponse = await request(app)
        .get('/api/v1/ml/experiments')
        .set('Authorization', `Bearer ${doctorToken}`)
        .query({
          experimentType: 'rl_session',
          limit: 10
        })
        .expect(200);

      expect(historyResponse.body.data.length).toBeGreaterThanOrEqual(2);
      expect(historyResponse.body.data[0].experimentType).toBe('rl_session');
    });

    it('should retrieve experiment statistics', async () => {
      // Create some experiments
      await request(app)
        .post('/api/v1/ml/rl/session/start')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          envName: 'reminder-optimizer',
          config: {}
        })
        .expect(201);

      // Get stats
      const statsResponse = await request(app)
        .get('/api/v1/ml/experiments/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(statsResponse.body.data.total_experiments).toBeGreaterThan(0);
      expect(statsResponse.body.data.by_type).toBeDefined();
      expect(statsResponse.body.data.by_status).toBeDefined();
    });
  });

  describe('Concurrent Sessions', () => {
    it('should handle multiple concurrent RL sessions', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post('/api/v1/ml/rl/session/start')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({
              envName: 'reminder-optimizer',
              config: { patient_profile: { medication_schedule: ['08:00'] } }
            })
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.data.sessionId).toBeDefined();
      });

      // Verify all experiments were created
      const experiments = await MLExperiment.find({ experimentType: 'rl_session' });
      expect(experiments.length).toBeGreaterThanOrEqual(3);
    });
  });
});

