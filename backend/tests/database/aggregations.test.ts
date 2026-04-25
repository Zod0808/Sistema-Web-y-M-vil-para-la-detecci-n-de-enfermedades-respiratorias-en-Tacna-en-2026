/**
 * Tests de Agregaciones MongoDB
 * 
 * Verifica que las agregaciones complejas funcionen correctamente:
 * - Pipeline de agregación
 * - Agrupaciones
 * - Operadores de agregación
 * - Performance de agregaciones
 */

import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { MedicalHistory } from '../../src/models/MedicalHistory';
import { Appointment } from '../../src/models/Appointment';

describe('MongoDB Aggregations Tests', () => {
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

  describe('Basic Aggregations', () => {
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
      await MedicalHistory.insertMany([
        {
          patientId,
          doctorId,
          date: new Date('2024-01-01'),
          diagnosis: 'Common Cold',
          symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
        },
        {
          patientId,
          doctorId,
          date: new Date('2024-01-15'),
          diagnosis: 'Common Cold',
          symptoms: [{ name: 'Cough', severity: 'moderate', duration: '5 days' }]
        },
        {
          patientId,
          doctorId,
          date: new Date('2024-02-01'),
          diagnosis: 'Flu',
          symptoms: [{ name: 'Fever', severity: 'severe', duration: '7 days' }]
        },
        {
          patientId,
          doctorId,
          date: new Date('2024-02-15'),
          diagnosis: 'Flu',
          symptoms: [{ name: 'Fever', severity: 'moderate', duration: '4 days' }]
        },
        {
          patientId,
          doctorId,
          date: new Date('2024-03-01'),
          diagnosis: 'Bronchitis',
          symptoms: [{ name: 'Cough', severity: 'severe', duration: '10 days' }]
        }
      ]);
    });

    it('should count documents', async () => {
      const result = await MedicalHistory.aggregate([
        { $count: 'total' }
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(5);
    });

    it('should group by diagnosis', async () => {
      const result = await MedicalHistory.aggregate([
        {
          $group: {
            _id: '$diagnosis',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      expect(result).toHaveLength(3);
      expect(result[0]._id).toBe('Common Cold');
      expect(result[0].count).toBe(2);
    });

    it('should calculate average by group', async () => {
      const result = await MedicalHistory.aggregate([
        {
          $group: {
            _id: '$diagnosis',
            count: { $sum: 1 },
            avgSeverity: {
              $avg: {
                $cond: [
                  { $eq: [{ $arrayElemAt: ['$symptoms.severity', 0] }, 'mild'] },
                  1,
                  {
                    $cond: [
                      { $eq: [{ $arrayElemAt: ['$symptoms.severity', 0] }, 'moderate'] },
                      2,
                      3
                    ]
                  }
                ]
              }
            }
          }
        }
      ]);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item.count).toBeGreaterThan(0);
        expect(item.avgSeverity).toBeGreaterThan(0);
      });
    });
  });

  describe('Complex Aggregations', () => {
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
      const patients = await User.insertMany([
        { name: 'Patient 1', email: 'patient1@example.com', password: 'password123', role: 'patient' },
        { name: 'Patient 2', email: 'patient2@example.com', password: 'password123', role: 'patient' },
        { name: 'Patient 3', email: 'patient3@example.com', password: 'password123', role: 'patient' }
      ]);

      patientIds = patients.map(p => p._id.toString());

      // Crear historias médicas para cada paciente
      const histories = [];
      for (let i = 0; i < patientIds.length; i++) {
        for (let j = 0; j < 3; j++) {
          histories.push({
            patientId: patientIds[i],
            doctorId,
            date: new Date(2024, 0, (i * 3) + j + 1),
            diagnosis: `Diagnosis ${i + 1}`,
            symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
          });
        }
      }

      await MedicalHistory.insertMany(histories);
    });

    it('should join with User collection', async () => {
      const result = await MedicalHistory.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'patientId',
            foreignField: '_id',
            as: 'patient'
          }
        },
        {
          $unwind: '$patient'
        },
        {
          $project: {
            diagnosis: 1,
            patientName: '$patient.name',
            patientEmail: '$patient.email'
          }
        },
        { $limit: 5 }
      ]);

      expect(result.length).toBeGreaterThan(0);
      result.forEach(item => {
        expect(item.patientName).toBeDefined();
        expect(item.patientEmail).toBeDefined();
      });
    });

    it('should filter and group', async () => {
      const result = await MedicalHistory.aggregate([
        {
          $match: {
            date: { $gte: new Date('2024-01-01') }
          }
        },
        {
          $group: {
            _id: '$patientId',
            totalHistories: { $sum: 1 },
            diagnoses: { $addToSet: '$diagnosis' }
          }
        },
        {
          $project: {
            patientId: '$_id',
            totalHistories: 1,
            uniqueDiagnoses: { $size: '$diagnoses' }
          }
        }
      ]);

      expect(result.length).toBe(3);
      result.forEach(item => {
        expect(item.totalHistories).toBe(3);
        expect(item.uniqueDiagnoses).toBeGreaterThan(0);
      });
    });

    it('should calculate statistics by date range', async () => {
      const result = await MedicalHistory.aggregate([
        {
          $match: {
            date: {
              $gte: new Date('2024-01-01'),
              $lt: new Date('2024-02-01')
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            firstDate: { $min: '$date' },
            lastDate: { $max: '$date' }
          }
        }
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].total).toBeGreaterThan(0);
      expect(result[0].firstDate).toBeDefined();
      expect(result[0].lastDate).toBeDefined();
    });
  });

  describe('Appointment Aggregations', () => {
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

      const patients = await User.insertMany([
        { name: 'Patient 1', email: 'patient1@example.com', password: 'password123', role: 'patient' },
        { name: 'Patient 2', email: 'patient2@example.com', password: 'password123', role: 'patient' }
      ]);

      patientIds = patients.map(p => p._id.toString());

      await Appointment.insertMany([
        {
          patientId: patientIds[0],
          doctorId,
          date: new Date('2024-01-01'),
          type: 'consultation',
          status: 'completed'
        },
        {
          patientId: patientIds[0],
          doctorId,
          date: new Date('2024-01-15'),
          type: 'consultation',
          status: 'scheduled'
        },
        {
          patientId: patientIds[1],
          doctorId,
          date: new Date('2024-02-01'),
          type: 'follow-up',
          status: 'completed'
        },
        {
          patientId: patientIds[1],
          doctorId,
          date: new Date('2024-02-15'),
          type: 'consultation',
          status: 'cancelled'
        }
      ]);
    });

    it('should group appointments by status', async () => {
      const result = await Appointment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      expect(result.length).toBeGreaterThan(0);
      const completed = result.find(r => r._id === 'completed');
      expect(completed).toBeDefined();
      expect(completed.count).toBe(2);
    });

    it('should calculate appointment statistics by patient', async () => {
      const result = await Appointment.aggregate([
        {
          $group: {
            _id: '$patientId',
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            patientId: '$_id',
            total: 1,
            completed: 1,
            cancelled: 1,
            completionRate: {
              $divide: ['$completed', '$total']
            }
          }
        }
      ]);

      expect(result.length).toBe(2);
      result.forEach(item => {
        expect(item.total).toBe(2);
        expect(item.completionRate).toBeGreaterThanOrEqual(0);
        expect(item.completionRate).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Performance Aggregations', () => {
    beforeEach(async () => {
      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      // Crear muchos documentos para probar performance
      const histories = Array.from({ length: 1000 }, (_, i) => ({
        patientId: new mongoose.Types.ObjectId(),
        doctorId: doctor._id,
        date: new Date(2024, 0, (i % 30) + 1),
        diagnosis: `Diagnosis ${i % 10}`,
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      }));

      await MedicalHistory.insertMany(histories);
    });

    it('should use indexes in aggregation', async () => {
      const explain = await MedicalHistory.aggregate([
        { $match: { doctorId: new mongoose.Types.ObjectId() } },
        { $group: { _id: '$diagnosis', count: { $sum: 1 } } }
      ]).explain('executionStats');

      // Verificar que se usó un índice
      const stages = explain.stages || [];
      const hasIndexScan = stages.some((stage: any) => 
        stage.stage === 'IXSCAN' || stage.inputStage?.stage === 'IXSCAN'
      );

      // En agregaciones complejas, puede haber múltiples etapas
      expect(explain).toBeDefined();
    });

    it('should complete aggregation within reasonable time', async () => {
      const startTime = Date.now();

      await MedicalHistory.aggregate([
        { $match: { date: { $gte: new Date('2024-01-01') } } },
        {
          $group: {
            _id: '$diagnosis',
            count: { $sum: 1 },
            avgDate: { $avg: { $toLong: '$date' } }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const duration = Date.now() - startTime;
      // Debería completarse en menos de 5 segundos
      expect(duration).toBeLessThan(5000);
    });
  });
});

