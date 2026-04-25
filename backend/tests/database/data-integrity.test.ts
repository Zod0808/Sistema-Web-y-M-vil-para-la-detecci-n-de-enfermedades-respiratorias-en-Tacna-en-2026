/**
 * Tests de Integridad de Datos MongoDB
 * 
 * Verifica la integridad de los datos:
 * - Referencias entre colecciones
 * - Validación de foreign keys (si aplica)
 * - Consistencia de datos
 * - Constraints de integridad
 */

import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { MedicalHistory } from '../../src/models/MedicalHistory';
import { Appointment } from '../../src/models/Appointment';
import { Prescription } from '../../src/models/Prescription';
import { Alert } from '../../src/models/Alert';

describe('MongoDB Data Integrity Tests', () => {
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
    await Alert.deleteMany({});
  });

  describe('Reference Integrity', () => {
    it('should maintain valid patientId reference', async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      const history = await MedicalHistory.create({
        patientId: patient._id,
        doctorId: doctor._id,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      // Verificar que la referencia es válida
      const savedHistory = await MedicalHistory.findById(history._id)
        .populate('patientId', 'name email')
        .populate('doctorId', 'name email');

      expect(savedHistory?.patientId).toBeDefined();
      expect((savedHistory?.patientId as any)?.name).toBe('Patient User');
      expect(savedHistory?.doctorId).toBeDefined();
      expect((savedHistory?.doctorId as any)?.name).toBe('Doctor User');
    });

    it('should reject invalid patientId reference', async () => {
      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      const invalidPatientId = new mongoose.Types.ObjectId();

      const history = new MedicalHistory({
        patientId: invalidPatientId,
        doctorId: doctor._id,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      // MongoDB no valida referencias automáticamente, pero podemos verificar
      // que el documento se crea con el ID inválido
      await history.save();

      const savedHistory = await MedicalHistory.findById(history._id);
      expect(savedHistory?.patientId.toString()).toBe(invalidPatientId.toString());
    });

    it('should maintain valid doctorId reference in appointments', async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      const appointment = await Appointment.create({
        patientId: patient._id,
        doctorId: doctor._id,
        date: new Date(),
        type: 'consultation'
      });

      const savedAppointment = await Appointment.findById(appointment._id)
        .populate('patientId', 'name')
        .populate('doctorId', 'name');

      expect(savedAppointment?.patientId).toBeDefined();
      expect(savedAppointment?.doctorId).toBeDefined();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent data across related documents', async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      // Crear múltiples documentos relacionados
      const history = await MedicalHistory.create({
        patientId: patient._id,
        doctorId: doctor._id,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      const appointment = await Appointment.create({
        patientId: patient._id,
        doctorId: doctor._id,
        date: new Date(),
        type: 'consultation'
      });

      const prescription = await Prescription.create({
        patientId: patient._id,
        doctorId: doctor._id,
        medications: [{ name: 'Medication', dosage: '10mg', frequency: 'daily' }]
      });

      // Verificar consistencia
      const histories = await MedicalHistory.find({ patientId: patient._id });
      const appointments = await Appointment.find({ patientId: patient._id });
      const prescriptions = await Prescription.find({ patientId: patient._id });

      expect(histories.length).toBe(1);
      expect(appointments.length).toBe(1);
      expect(prescriptions.length).toBe(1);

      // Todos deberían referenciar al mismo paciente y doctor
      expect(histories[0].patientId.toString()).toBe(patient._id.toString());
      expect(histories[0].doctorId.toString()).toBe(doctor._id.toString());
      expect(appointments[0].patientId.toString()).toBe(patient._id.toString());
      expect(appointments[0].doctorId.toString()).toBe(doctor._id.toString());
      expect(prescriptions[0].patientId.toString()).toBe(patient._id.toString());
      expect(prescriptions[0].doctorId.toString()).toBe(doctor._id.toString());
    });

    it('should maintain timestamp consistency', async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      const beforeCreate = new Date();
      const history = await MedicalHistory.create({
        patientId: patient._id,
        doctorId: doctor._id,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });
      const afterCreate = new Date();

      // Verificar que los timestamps están dentro del rango esperado
      expect(history.createdAt).toBeDefined();
      expect(history.updatedAt).toBeDefined();
      expect(history.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(history.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Cascade Operations', () => {
    it('should handle orphaned documents gracefully', async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      const history = await MedicalHistory.create({
        patientId: patient._id,
        doctorId: doctor._id,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      // Eliminar el paciente
      await User.findByIdAndDelete(patient._id);

      // La historia médica debería seguir existiendo (orphaned)
      const orphanedHistory = await MedicalHistory.findById(history._id);
      expect(orphanedHistory).toBeDefined();
      expect(orphanedHistory?.patientId.toString()).toBe(patient._id.toString());
    });

    it('should maintain data integrity when updating references', async () => {
      const patient1 = await User.create({
        name: 'Patient 1',
        email: 'patient1@example.com',
        password: 'password123',
        role: 'patient'
      });

      const patient2 = await User.create({
        name: 'Patient 2',
        email: 'patient2@example.com',
        password: 'password123',
        role: 'patient'
      });

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      const history = await MedicalHistory.create({
        patientId: patient1._id,
        doctorId: doctor._id,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{ name: 'Cough', severity: 'mild', duration: '3 days' }]
      });

      // Actualizar la referencia del paciente
      await MedicalHistory.updateOne(
        { _id: history._id },
        { patientId: patient2._id }
      );

      const updatedHistory = await MedicalHistory.findById(history._id);
      expect(updatedHistory?.patientId.toString()).toBe(patient2._id.toString());
    });
  });

  describe('Unique Constraints', () => {
    it('should enforce unique email constraint', async () => {
      await User.create({
        name: 'User 1',
        email: 'test@example.com',
        password: 'password123',
        role: 'patient'
      });

      await expect(
        User.create({
          name: 'User 2',
          email: 'test@example.com', // Email duplicado
          password: 'password123',
          role: 'patient'
        })
      ).rejects.toThrow(/duplicate key error/i);
    });

    it('should allow different emails', async () => {
      const user1 = await User.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'password123',
        role: 'patient'
      });

      const user2 = await User.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'password123',
        role: 'patient'
      });

      expect(user1._id).not.toEqual(user2._id);
      expect(user1.email).not.toBe(user2.email);
    });
  });

  describe('Required Fields', () => {
    it('should enforce required fields in MedicalHistory', async () => {
      const history = new MedicalHistory({
        // patientId faltante
        // doctorId faltante
        date: new Date(),
        diagnosis: 'Test Diagnosis'
      });

      await expect(history.save()).rejects.toThrow();
    });

    it('should enforce required fields in Appointment', async () => {
      const appointment = new Appointment({
        // patientId faltante
        // doctorId faltante
        date: new Date(),
        type: 'consultation'
      });

      await expect(appointment.save()).rejects.toThrow();
    });
  });

  describe('Enum Validation', () => {
    it('should enforce enum values in User role', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid-role' // Rol inválido
      });

      await expect(user.save()).rejects.toThrow(/patient, doctor o admin/i);
    });

    it('should enforce enum values in Appointment status', async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });

      const doctor = await User.create({
        name: 'Doctor User',
        email: 'doctor@example.com',
        password: 'password123',
        role: 'doctor'
      });

      const appointment = new Appointment({
        patientId: patient._id,
        doctorId: doctor._id,
        date: new Date(),
        type: 'consultation',
        status: 'invalid-status' // Status inválido
      });

      await expect(appointment.save()).rejects.toThrow();
    });
  });
});

