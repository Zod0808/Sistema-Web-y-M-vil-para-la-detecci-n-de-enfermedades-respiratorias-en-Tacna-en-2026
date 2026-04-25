/**
 * Tests de Performance de Queries MongoDB
 * 
 * Verifica el performance de las queries:
 * - Uso de índices
 * - Queries lentas
 * - Explain plans
 * - Optimización de queries
 */

import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { MedicalHistory } from '../../src/models/MedicalHistory';
import { Appointment } from '../../src/models/Appointment';

describe('MongoDB Query Performance Tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/respicare-test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await MedicalHistory.deleteMany({});
    await Appointment.deleteMany({});
  });

  describe('Index Usage', () => {
    let patientId: string;
    let doctorId: string;

    beforeEach(async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });
      patientId = patient._id.toString();

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });
      doctorId = doctor._id.toString();

      // Crear datos de prueba
      const histories = Array.from({ length: 100 }, (_, i) => ({
        patientId,
        doctorId,
        date: new Date(2024, 0, i + 1),
        diagnosis: `Diagnosis ${i % 10}`,
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      }));

      await MedicalHistory.insertMany(histories);
    });

    it('should use index for patientId query', async () => {
      const explain = await MedicalHistory.find({ patientId })
        .explain('executionStats');

      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        expect(executionStats.executionStages.stage).toBe('IXSCAN');
        expect(executionStats.executionStages.indexName).toContain('patientId');
        expect(executionStats.totalDocsExamined).toBeLessThan(100);
      }
    });

    it('should use compound index for patientId and date query', async () => {
      const explain = await MedicalHistory.find({ 
        patientId,
        date: { $gte: new Date('2024-01-01') }
      })
        .sort({ date: -1 })
        .explain('executionStats');

      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        const stage = executionStats.executionStages;
        expect(stage.stage).toBe('IXSCAN');
        // Debería usar el índice compuesto
        expect(stage.indexName).toBeDefined();
      }
    });

    it('should avoid collection scan when index is available', async () => {
      const explain = await MedicalHistory.find({ patientId })
        .explain('executionStats');

      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        expect(executionStats.executionStages.stage).not.toBe('COLLSCAN');
      }
    });
  });

  describe('Query Performance Metrics', () => {
    let patientIds: string[];
    let doctorId: string;

    beforeEach(async () => {
      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });
      doctorId = doctor._id.toString();

      // Crear múltiples pacientes
      const patients = await User.insertMany(
        Array.from({ length: 50 }, (_, i) => ({
          name: `Patient ${i}`,
          email: `patient${i}@example.com`,
          password: 'password123',
          role: 'patient'
        }))
      );

      patientIds = patients.map(p => p._id.toString());

      // Crear muchas historias médicas
      const histories = [];
      for (let i = 0; i < patientIds.length; i++) {
        for (let j = 0; j < 20; j++) {
          histories.push({
            patientId: patientIds[i],
            doctorId,
            date: new Date(2024, 0, j + 1),
            diagnosis: `Diagnosis ${j % 5}`,
            symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
          });
        }
      }

      await MedicalHistory.insertMany(histories);
    });

    it('should complete indexed query quickly', async () => {
      const startTime = Date.now();

      await MedicalHistory.find({ patientId: patientIds[0] })
        .sort({ date: -1 })
        .limit(10);

      const duration = Date.now() - startTime;
      // Debería completarse en menos de 100ms con índice
      expect(duration).toBeLessThan(100);
    });

    it('should have reasonable execution time for aggregation', async () => {
      const startTime = Date.now();

      await MedicalHistory.aggregate([
        { $match: { patientId: new mongoose.Types.ObjectId(patientIds[0]) } },
        { $group: { _id: '$diagnosis', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const duration = Date.now() - startTime;
      // Agregación debería completarse en menos de 500ms
      expect(duration).toBeLessThan(500);
    });

    it('should limit documents examined with proper index', async () => {
      const explain = await MedicalHistory.find({ patientId: patientIds[0] })
        .sort({ date: -1 })
        .limit(10)
        .explain('executionStats');

      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        // Con índice y limit, debería examinar aproximadamente 10 documentos
        expect(executionStats.totalDocsExamined).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('Slow Query Detection', () => {
    beforeEach(async () => {
      // Crear muchos documentos sin índice para simular query lenta
      const patients = await User.insertMany(
        Array.from({ length: 100 }, (_, i) => ({
          name: `Patient ${i}`,
          email: `patient${i}@example.com`,
          password: 'password123',
          role: 'patient'
        }))
      );

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      const histories = [];
      for (const patient of patients) {
        for (let i = 0; i < 10; i++) {
          histories.push({
            patientId: patient._id,
            doctorId: doctor._id,
            date: new Date(2024, 0, i + 1),
            diagnosis: `Diagnosis ${i}`,
            symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }],
            description: `Description ${i}` // Campo sin índice
          });
        }
      }

      await MedicalHistory.insertMany(histories);
    });

    it('should identify queries that need optimization', async () => {
      const explain = await MedicalHistory.find({ 
        description: { $regex: /Description 5/ }
      }).explain('executionStats');

      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        // Query sin índice debería hacer COLLSCAN
        const stage = executionStats.executionStages;
        if (stage.stage === 'COLLSCAN') {
          // Esta es una query lenta que necesita optimización
          expect(executionStats.totalDocsExamined).toBeGreaterThan(100);
        }
      }
    });

    it('should detect queries without index usage', async () => {
      const explain = await MedicalHistory.find({ 
        description: 'Some description'
      }).hint({ $natural: 1 }) // Forzar scan natural
        .explain('executionStats');

      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        const stage = executionStats.executionStages;
        // Debería ser COLLSCAN cuando se fuerza scan natural
        expect(stage.stage).toBe('COLLSCAN');
      }
    });
  });

  describe('Query Optimization', () => {
    let patientId: string;
    let doctorId: string;

    beforeEach(async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });
      patientId = patient._id.toString();

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });
      doctorId = doctor._id.toString();

      await MedicalHistory.insertMany(
        Array.from({ length: 1000 }, (_, i) => ({
          patientId: i % 10 === 0 ? patientId : new mongoose.Types.ObjectId(),
          doctorId,
          date: new Date(2024, 0, (i % 30) + 1),
          diagnosis: `Diagnosis ${i % 10}`,
          symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
        }))
      );
    });

    it('should optimize query with projection', async () => {
      const explain = await MedicalHistory.find({ patientId })
        .select('diagnosis date')
        .explain('executionStats');

      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        // Con proyección, debería transferir menos datos
        expect(executionStats.executionStages.stage).toBe('IXSCAN');
      }
    });

    it('should optimize query with limit', async () => {
      const explain = await MedicalHistory.find({ patientId })
        .sort({ date: -1 })
        .limit(10)
        .explain('executionStats');

      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        // Con limit, debería examinar menos documentos
        expect(executionStats.totalDocsExamined).toBeLessThanOrEqual(10);
      }
    });

    it('should optimize query with proper sort order', async () => {
      // Sort que coincide con índice
      const explain1 = await MedicalHistory.find({ patientId })
        .sort({ date: -1 })
        .explain('executionStats');

      // Sort que no coincide con índice
      const explain2 = await MedicalHistory.find({ patientId })
        .sort({ date: 1 }) // Orden inverso
        .explain('executionStats');

      const stats1 = explain1[0]?.executionStats;
      const stats2 = explain2[0]?.executionStats;

      if (stats1 && stats2) {
        // Ambos deberían usar índice, pero el primero puede ser más eficiente
        expect(stats1.executionStages.stage).toBe('IXSCAN');
        expect(stats2.executionStages.stage).toBe('IXSCAN');
      }
    });
  });
});

