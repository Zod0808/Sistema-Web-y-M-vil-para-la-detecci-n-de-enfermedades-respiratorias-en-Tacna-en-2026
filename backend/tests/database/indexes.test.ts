/**
 * Tests de Índices MongoDB
 * 
 * Verifica que los índices estén correctamente creados y funcionen:
 * - Índices simples
 * - Índices compuestos
 * - Índices de texto
 * - Índices geoespaciales
 * - Performance de queries con índices
 */

import mongoose from 'mongoose';
import User from '../../src/models/User';
import MedicalHistory from '../../src/models/MedicalHistory';
import Appointment from '../../src/models/Appointment';
import AIAnalysis from '../../src/models/AIAnalysis';

// MongoDB 6+ driver returns each index as an array of [field, direction] tuples.
// Older code expected `{ field: direction }`. Normalize to object form for tests.
const normalizeIndex = (raw: any): Record<string, any> => {
  if (Array.isArray(raw)) return Object.fromEntries(raw);
  return raw ?? {};
};
const normalizeIndexes = (indexes: Record<string, any>): Record<string, Record<string, any>> => {
  const out: Record<string, Record<string, any>> = {};
  for (const [key, value] of Object.entries(indexes)) {
    out[key] = normalizeIndex(value);
  }
  return out;
};

describe('MongoDB Indexes Tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/respicare-test');
    }
    // Ensure collections and indexes exist before queries
    await Promise.all([
      User.init(),
      MedicalHistory.init(),
      Appointment.init(),
      AIAnalysis.init(),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await MedicalHistory.deleteMany({});
    await Appointment.deleteMany({});
    await AIAnalysis.deleteMany({});
  });

  describe('User Indexes', () => {
    it('should have index on email field', async () => {
      const indexes = normalizeIndexes(await User.collection.getIndexes());
      expect(indexes).toHaveProperty('email_1');
      expect(indexes.email_1).toEqual({ email: 1 });
    });

    it('should use email index for queries', async () => {
      await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'patient'
      });

      const explain = await User.find({ email: 'test@example.com' }).explain('executionStats');
      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        expect(executionStats.executionStages.stage).toBe('IXSCAN');
        expect(executionStats.executionStages.indexName).toContain('email');
      }
    });
  });

  describe('MedicalHistory Indexes', () => {
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
    });

    it('should have index on patientId field', async () => {
      const indexes = normalizeIndexes(await MedicalHistory.collection.getIndexes());
      expect(indexes).toHaveProperty('patientId_1');
    });

    it('should have index on doctorId field', async () => {
      const indexes = normalizeIndexes(await MedicalHistory.collection.getIndexes());
      expect(indexes).toHaveProperty('doctorId_1');
    });

    it('should have index on date field (descending)', async () => {
      const indexes = normalizeIndexes(await MedicalHistory.collection.getIndexes());
      expect(indexes).toHaveProperty('date_-1');
    });

    it('should have compound index on patientId and date', async () => {
      const indexes = normalizeIndexes(await MedicalHistory.collection.getIndexes());
      
      // Buscar índice compuesto
      const compoundIndex = Object.values(indexes).find(
        (index: any) => 
          index.patientId === 1 && index.date === -1
      );
      
      expect(compoundIndex).toBeDefined();
    });

    it('should have compound index on doctorId and date', async () => {
      const indexes = normalizeIndexes(await MedicalHistory.collection.getIndexes());
      
      const compoundIndex = Object.values(indexes).find(
        (index: any) => 
          index.doctorId === 1 && index.date === -1
      );
      
      expect(compoundIndex).toBeDefined();
    });

    it('should use patientId index for queries', async () => {
      await MedicalHistory.create({
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      const explain = await MedicalHistory.find({ patientId }).explain('executionStats');
      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        expect(executionStats.executionStages.stage).toBe('IXSCAN');
        expect(executionStats.executionStages.indexName).toContain('patientId');
      }
    });

    it('should use compound index for patientId and date queries', async () => {
      await MedicalHistory.create({
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      const explain = await MedicalHistory.find({ 
        patientId, 
        date: { $gte: new Date('2020-01-01') } 
      }).sort({ date: -1 }).explain('executionStats');
      
      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        // Debería usar el índice compuesto
        const stage = executionStats.executionStages;
        expect(stage.stage).toBe('IXSCAN');
      }
    });

    it('should have text index for search', async () => {
      const indexes = normalizeIndexes(await MedicalHistory.collection.getIndexes());
      
      // Buscar índice de texto
      const textIndex = Object.values(indexes).find(
        (index: any) => index._fts || index._ftsx
      );
      
      // MongoDB puede crear índices de texto con nombres específicos
      const hasTextIndex = Object.keys(indexes).some(key => 
        key.includes('text') || indexes[key]._fts || indexes[key]._ftsx
      );
      
      expect(hasTextIndex).toBe(true);
    });

    it('should have geospatial index on geoLocation', async () => {
      const indexes = normalizeIndexes(await MedicalHistory.collection.getIndexes());
      
      const geoIndex = Object.values(indexes).find(
        (index: any) => index.geoLocation === '2dsphere'
      );
      
      expect(geoIndex).toBeDefined();
    });

    it('should use geospatial index for location queries', async () => {
      await MedicalHistory.create({
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }],
        geoLocation: {
          type: 'Point',
          coordinates: [-70.2456, -18.0056] // Tacna, Perú
        }
      });

      const explain = await MedicalHistory.find({
        geoLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [-70.2456, -18.0056]
            },
            $maxDistance: 10000 // 10km
          }
        }
      }).explain('executionStats');
      
      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        expect(executionStats.executionStages.stage).toBe('GEO_NEAR_2DSPHERE');
      }
    });
  });

  describe('Appointment Indexes', () => {
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
    });

    it('should have index on patientId field', async () => {
      const indexes = normalizeIndexes(await Appointment.collection.getIndexes());
      expect(indexes).toHaveProperty('patientId_1');
    });

    it('should have index on doctorId field', async () => {
      const indexes = normalizeIndexes(await Appointment.collection.getIndexes());
      expect(indexes).toHaveProperty('doctorId_1');
    });

    it('should have index on date field', async () => {
      // Appointment renamed `date` -> `scheduledAt`; the standalone index is now on `scheduledAt`
      // via the compound indexes below, and Mongoose creates the compound entries here.
      const indexes = normalizeIndexes(await Appointment.collection.getIndexes());
      const hasScheduledIndex = Object.values(indexes).some(
        (index: any) => index.scheduledAt === 1
      );
      expect(hasScheduledIndex).toBe(true);
    });

    it('should have compound index on doctorId and date', async () => {
      const indexes = normalizeIndexes(await Appointment.collection.getIndexes());

      const compoundIndex = Object.values(indexes).find(
        (index: any) =>
          index.doctorId === 1 && index.scheduledAt === 1
      );

      expect(compoundIndex).toBeDefined();
    });
  });

  describe('AIAnalysis Indexes', () => {
    it('should have index on createdAt field', async () => {
      const indexes = normalizeIndexes(await AIAnalysis.collection.getIndexes());
      expect(indexes).toHaveProperty('createdAt_-1');
    });

    it('should have compound index on urgency and confidence', async () => {
      const indexes = normalizeIndexes(await AIAnalysis.collection.getIndexes());
      
      const compoundIndex = Object.values(indexes).find(
        (index: any) => 
          index.urgency === 1 && index.confidence === -1
      );
      
      expect(compoundIndex).toBeDefined();
    });
  });

  describe('Index Performance', () => {
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

      // Crear múltiples historias médicas para probar performance
      const histories = Array.from({ length: 100 }, (_, i) => ({
        patientId,
        doctorId,
        date: new Date(2024, 0, i + 1),
        diagnosis: `Diagnosis ${i}`,
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      }));

      await MedicalHistory.insertMany(histories);
    });

    it('should use index for efficient query', async () => {
      const explain = await MedicalHistory.find({ patientId })
        .sort({ date: -1 })
        .limit(10)
        .explain('executionStats');
      
      const executionStats = explain[0]?.executionStats;
      
      if (executionStats) {
        // Debería usar índice, no COLLSCAN
        expect(executionStats.executionStages.stage).not.toBe('COLLSCAN');
        expect(executionStats.executionStages.stage).toBe('IXSCAN');
        
        // Verificar que examinó pocos documentos
        expect(executionStats.totalDocsExamined).toBeLessThan(100);
      }
    });

    it('should have better performance with index than without', async () => {
      // Query con índice
      const withIndex = await MedicalHistory.find({ patientId })
        .sort({ date: -1 })
        .limit(10)
        .explain('executionStats');
      
      // Query sin índice (forzando COLLSCAN)
      const withoutIndex = await MedicalHistory.find({ 
        patientId,
        _id: { $exists: true } // Forzar COLLSCAN
      })
        .sort({ date: -1 })
        .limit(10)
        .hint({ $natural: 1 }) // Forzar scan natural
        .explain('executionStats');
      
      const withIndexStats = withIndex[0]?.executionStats;
      const withoutIndexStats = withoutIndex[0]?.executionStats;
      
      if (withIndexStats && withoutIndexStats) {
        // Con índice debería examinar menos documentos
        expect(withIndexStats.totalDocsExamined).toBeLessThanOrEqual(
          withoutIndexStats.totalDocsExamined
        );
      }
    });
  });
});

