/**
 * Tests de Transacciones MongoDB
 * 
 * Verifica que las transacciones funcionen correctamente:
 * - Atomicidad de operaciones
 * - Rollback en caso de error
 * - Transacciones multi-documento
 * - Aislamiento de transacciones
 */

import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { MedicalHistory } from '../../src/models/MedicalHistory';
import { Appointment } from '../../src/models/Appointment';
import { Prescription } from '../../src/models/Prescription';

describe('MongoDB Transactions Tests', () => {
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
    await Prescription.deleteMany({});
  });

  describe('Basic Transactions', () => {
    it('should commit transaction successfully', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const patient = await User.create([{
          name: 'Patient User',
          email: 'patient@example.com',
          password: 'password123',
          role: 'patient'
        }], { session });

        const doctor = await User.create([{
          name: 'Doctor User',
          email: 'doctor@example.com',
          password: 'password123',
          role: 'doctor'
        }], { session });

        await session.commitTransaction();

        // Verificar que los documentos fueron creados
        const savedPatient = await User.findById(patient[0]._id);
        const savedDoctor = await User.findById(doctor[0]._id);

        expect(savedPatient).toBeDefined();
        expect(savedDoctor).toBeDefined();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    });

    it('should rollback transaction on error', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const patient = await User.create([{
          name: 'Patient User',
          email: 'patient@example.com',
          password: 'password123',
          role: 'patient'
        }], { session });

        // Intentar crear un usuario con email duplicado (causará error)
        await User.create([{
          name: 'Another User',
          email: 'patient@example.com', // Email duplicado
          password: 'password123',
          role: 'patient'
        }], { session });

        await session.commitTransaction();
        fail('Should have thrown an error');
      } catch (error) {
        await session.abortTransaction();

        // Verificar que el primer documento también fue revertido
        const patient = await User.findOne({ email: 'patient@example.com' });
        expect(patient).toBeNull();
      } finally {
        session.endSession();
      }
    });
  });

  describe('Multi-Document Transactions', () => {
    it('should create related documents atomically', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const patient = await User.create([{
          name: 'Patient User',
          email: 'patient@example.com',
          password: 'password123',
          role: 'patient'
        }], { session });

        const doctor = await User.create([{
          name: 'Doctor User',
          email: 'doctor@example.com',
          password: 'password123',
          role: 'doctor'
        }], { session });

        const history = await MedicalHistory.create([{
          patientId: patient[0]._id,
          doctorId: doctor[0]._id,
          date: new Date(),
          diagnosis: 'Test Diagnosis',
          symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
        }], { session });

        const appointment = await Appointment.create([{
          patientId: patient[0]._id,
          doctorId: doctor[0]._id,
          date: new Date(),
          type: 'consultation'
        }], { session });

        await session.commitTransaction();

        // Verificar que todos los documentos fueron creados
        const savedHistory = await MedicalHistory.findById(history[0]._id);
        const savedAppointment = await Appointment.findById(appointment[0]._id);

        expect(savedHistory).toBeDefined();
        expect(savedAppointment).toBeDefined();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    });

    it('should rollback all documents if any operation fails', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const patient = await User.create([{
          name: 'Patient User',
          email: 'patient@example.com',
          password: 'password123',
          role: 'patient'
        }], { session });

        const doctor = await User.create([{
          name: 'Doctor User',
          email: 'doctor@example.com',
          password: 'password123',
          role: 'doctor'
        }], { session });

        // Crear historia médica válida
        await MedicalHistory.create([{
          patientId: patient[0]._id,
          doctorId: doctor[0]._id,
          date: new Date(),
          diagnosis: 'Test Diagnosis',
          symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
        }], { session });

        // Intentar crear cita con datos inválidos (causará error)
        await Appointment.create([{
          patientId: patient[0]._id,
          doctorId: doctor[0]._id,
          // date faltante - causará error
          type: 'invalid-type' // Tipo inválido - causará error
        }], { session });

        await session.commitTransaction();
        fail('Should have thrown an error');
      } catch (error) {
        await session.abortTransaction();

        // Verificar que todos los documentos fueron revertidos
        const patient = await User.findOne({ email: 'patient@example.com' });
        const doctor = await User.findOne({ email: 'doctor@example.com' });
        const history = await MedicalHistory.findOne({ diagnosis: 'Test Diagnosis' });

        expect(patient).toBeNull();
        expect(doctor).toBeNull();
        expect(history).toBeNull();
      } finally {
        session.endSession();
      }
    });
  });

  describe('Update Transactions', () => {
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

    it('should update multiple documents atomically', async () => {
      const history = await MedicalHistory.create({
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Initial Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      const appointment = await Appointment.create({
        patientId,
        doctorId,
        date: new Date(),
        type: 'consultation',
        status: 'scheduled'
      });

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        await MedicalHistory.updateOne(
          { _id: history._id },
          { diagnosis: 'Updated Diagnosis' },
          { session }
        );

        await Appointment.updateOne(
          { _id: appointment._id },
          { status: 'completed' },
          { session }
        );

        await session.commitTransaction();

        // Verificar que ambos documentos fueron actualizados
        const updatedHistory = await MedicalHistory.findById(history._id);
        const updatedAppointment = await Appointment.findById(appointment._id);

        expect(updatedHistory?.diagnosis).toBe('Updated Diagnosis');
        expect(updatedAppointment?.status).toBe('completed');
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    });

    it('should rollback updates if any operation fails', async () => {
      const history = await MedicalHistory.create({
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Initial Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      const appointment = await Appointment.create({
        patientId,
        doctorId,
        date: new Date(),
        type: 'consultation',
        status: 'scheduled'
      });

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Actualización válida
        await MedicalHistory.updateOne(
          { _id: history._id },
          { diagnosis: 'Updated Diagnosis' },
          { session }
        );

        // Actualización inválida (causará error)
        await Appointment.updateOne(
          { _id: appointment._id },
          { status: 'invalid-status' }, // Status inválido
          { session }
        );

        await session.commitTransaction();
        fail('Should have thrown an error');
      } catch (error) {
        await session.abortTransaction();

        // Verificar que los cambios fueron revertidos
        const revertedHistory = await MedicalHistory.findById(history._id);
        const revertedAppointment = await Appointment.findById(appointment._id);

        expect(revertedHistory?.diagnosis).toBe('Initial Diagnosis');
        expect(revertedAppointment?.status).toBe('scheduled');
      } finally {
        session.endSession();
      }
    });
  });

  describe('Delete Transactions', () => {
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

    it('should delete multiple documents atomically', async () => {
      const history1 = await MedicalHistory.create({
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Diagnosis 1',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      const history2 = await MedicalHistory.create({
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Diagnosis 2',
        symptoms: [{ name: 'Fever', severity: 'moderate', duration: '2 days' }]
      });

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        await MedicalHistory.deleteOne({ _id: history1._id }, { session });
        await MedicalHistory.deleteOne({ _id: history2._id }, { session });

        await session.commitTransaction();

        // Verificar que ambos documentos fueron eliminados
        const deleted1 = await MedicalHistory.findById(history1._id);
        const deleted2 = await MedicalHistory.findById(history2._id);

        expect(deleted1).toBeNull();
        expect(deleted2).toBeNull();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    });
  });

  describe('Transaction Isolation', () => {
    it('should isolate concurrent transactions', async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });

      // Transacción 1
      const session1 = await mongoose.startSession();
      session1.startTransaction();

      // Transacción 2
      const session2 = await mongoose.startSession();
      session2.startTransaction();

      try {
        // Actualizar en transacción 1
        await User.updateOne(
          { _id: patient._id },
          { name: 'Updated by Session 1' },
          { session: session1 }
        );

        // Actualizar en transacción 2 (debería ver el valor original)
        const userInSession2 = await User.findById(patient._id).session(session2);
        expect(userInSession2?.name).toBe('Patient User'); // Valor original

        await User.updateOne(
          { _id: patient._id },
          { name: 'Updated by Session 2' },
          { session: session2 }
        );

        // Commit transacción 1
        await session1.commitTransaction();

        // Verificar que transacción 2 aún ve su propio valor
        const userInSession2After = await User.findById(patient._id).session(session2);
        expect(userInSession2After?.name).toBe('Updated by Session 2');

        // Commit transacción 2
        await session2.commitTransaction();

        // Valor final debería ser el de la última transacción en commit
        const finalUser = await User.findById(patient._id);
        expect(finalUser?.name).toBe('Updated by Session 2');
      } catch (error) {
        await session1.abortTransaction();
        await session2.abortTransaction();
        throw error;
      } finally {
        session1.endSession();
        session2.endSession();
      }
    });
  });
});

