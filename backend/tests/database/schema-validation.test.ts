/**
 * Tests de Validación de Esquemas MongoDB
 * 
 * Verifica que los esquemas de Mongoose validen correctamente:
 * - Campos requeridos
 * - Tipos de datos
 * - Constraints personalizados
 * - Validaciones de formato (email, regex, etc.)
 * - Enums
 * - Longitudes mínimas/máximas
 */

import mongoose from 'mongoose';
import { User, UserDocument } from '../../src/models/User';
import { MedicalHistory, MedicalHistoryDocument } from '../../src/models/MedicalHistory';
import { Appointment, AppointmentDocument } from '../../src/models/Appointment';
import { Prescription, PrescriptionDocument } from '../../src/models/Prescription';
import { Alert, AlertDocument } from '../../src/models/Alert';

describe('MongoDB Schema Validation Tests', () => {
  beforeAll(async () => {
    // Conectar a base de datos de prueba
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/respicare-test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Limpiar colecciones antes de cada test
    await User.deleteMany({});
    await MedicalHistory.deleteMany({});
    await Appointment.deleteMany({});
    await Prescription.deleteMany({});
    await Alert.deleteMany({});
  });

  describe('User Schema Validation', () => {
    it('should require name field', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'patient'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/nombre es obligatorio/i);
    });

    it('should require email field', async () => {
      const userData = {
        name: 'Test User',
        password: 'password123',
        role: 'patient'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/email es obligatorio/i);
    });

    it('should require password field', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'patient'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/contraseña es obligatoria/i);
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
        role: 'patient'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/email válido/i);
    });

    it('should validate password minimum length', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'short',
        role: 'patient'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/al menos 8 caracteres/i);
    });

    it('should validate role enum', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid-role'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/patient, doctor o admin/i);
    });

    it('should validate name max length', async () => {
      const longName = 'a'.repeat(101);
      const userData = {
        name: longName,
        email: 'test@example.com',
        password: 'password123',
        role: 'patient'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow(/no puede exceder 100 caracteres/i);
    });

    it('should enforce unique email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'patient'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow(/duplicate key error/i);
    });

    it('should create valid user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'patient'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe('Test User');
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.role).toBe('patient');
    });
  });

  describe('MedicalHistory Schema Validation', () => {
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

    it('should require patientId field', async () => {
      const historyData = {
        doctorId,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{
          name: 'Cough',
          severity: 'mild',
          duration: '3 days'
        }]
      };

      const history = new MedicalHistory(historyData);
      await expect(history.save()).rejects.toThrow();
    });

    it('should require doctorId field', async () => {
      const historyData = {
        patientId,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{
          name: 'Cough',
          severity: 'mild',
          duration: '3 days'
        }]
      };

      const history = new MedicalHistory(historyData);
      await expect(history.save()).rejects.toThrow();
    });

    it('should require date field', async () => {
      const historyData = {
        patientId,
        doctorId,
        diagnosis: 'Test Diagnosis',
        symptoms: [{
          name: 'Cough',
          severity: 'mild',
          duration: '3 days'
        }]
      };

      const history = new MedicalHistory(historyData);
      await expect(history.save()).rejects.toThrow();
    });

    it('should validate symptom severity enum', async () => {
      const historyData = {
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{
          name: 'Cough',
          severity: 'invalid-severity',
          duration: '3 days'
        }]
      };

      const history = new MedicalHistory(historyData);
      await expect(history.save()).rejects.toThrow(/mild, moderate o severe/i);
    });

    it('should validate symptom name max length', async () => {
      const longName = 'a'.repeat(101);
      const historyData = {
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{
          name: longName,
          severity: 'mild',
          duration: '3 days'
        }]
      };

      const history = new MedicalHistory(historyData);
      await expect(history.save()).rejects.toThrow(/no puede exceder 100 caracteres/i);
    });

    it('should create valid medical history', async () => {
      const historyData = {
        patientId,
        doctorId,
        date: new Date(),
        diagnosis: 'Test Diagnosis',
        symptoms: [{
          name: 'Cough',
          severity: 'mild',
          duration: '3 days'
        }]
      };

      const history = new MedicalHistory(historyData);
      const savedHistory = await history.save();

      expect(savedHistory._id).toBeDefined();
      expect(savedHistory.patientId.toString()).toBe(patientId);
      expect(savedHistory.diagnosis).toBe('Test Diagnosis');
    });
  });

  describe('Appointment Schema Validation', () => {
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

    it('should require patientId field', async () => {
      const appointmentData = {
        doctorId,
        date: new Date(),
        type: 'consultation'
      };

      const appointment = new Appointment(appointmentData);
      await expect(appointment.save()).rejects.toThrow();
    });

    it('should require doctorId field', async () => {
      const appointmentData = {
        patientId,
        date: new Date(),
        type: 'consultation'
      };

      const appointment = new Appointment(appointmentData);
      await expect(appointment.save()).rejects.toThrow();
    });

    it('should require date field', async () => {
      const appointmentData = {
        patientId,
        doctorId,
        type: 'consultation'
      };

      const appointment = new Appointment(appointmentData);
      await expect(appointment.save()).rejects.toThrow();
    });

    it('should validate appointment type enum', async () => {
      const appointmentData = {
        patientId,
        doctorId,
        date: new Date(),
        type: 'invalid-type'
      };

      const appointment = new Appointment(appointmentData);
      await expect(appointment.save()).rejects.toThrow();
    });

    it('should create valid appointment', async () => {
      const appointmentData = {
        patientId,
        doctorId,
        date: new Date(),
        type: 'consultation'
      };

      const appointment = new Appointment(appointmentData);
      const savedAppointment = await appointment.save();

      expect(savedAppointment._id).toBeDefined();
      expect(savedAppointment.patientId.toString()).toBe(patientId);
      expect(savedAppointment.type).toBe('consultation');
    });
  });

  describe('Prescription Schema Validation', () => {
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

    it('should require patientId field', async () => {
      const prescriptionData = {
        doctorId,
        medications: [{
          name: 'Medication',
          dosage: '10mg',
          frequency: 'daily'
        }]
      };

      const prescription = new Prescription(prescriptionData);
      await expect(prescription.save()).rejects.toThrow();
    });

    it('should require doctorId field', async () => {
      const prescriptionData = {
        patientId,
        medications: [{
          name: 'Medication',
          dosage: '10mg',
          frequency: 'daily'
        }]
      };

      const prescription = new Prescription(prescriptionData);
      await expect(prescription.save()).rejects.toThrow();
    });

    it('should require medications array', async () => {
      const prescriptionData = {
        patientId,
        doctorId
      };

      const prescription = new Prescription(prescriptionData);
      await expect(prescription.save()).rejects.toThrow();
    });

    it('should create valid prescription', async () => {
      const prescriptionData = {
        patientId,
        doctorId,
        medications: [{
          name: 'Medication',
          dosage: '10mg',
          frequency: 'daily'
        }]
      };

      const prescription = new Prescription(prescriptionData);
      const savedPrescription = await prescription.save();

      expect(savedPrescription._id).toBeDefined();
      expect(savedPrescription.medications).toHaveLength(1);
    });
  });

  describe('Alert Schema Validation', () => {
    let patientId: string;

    beforeEach(async () => {
      const patient = await User.create({
        name: 'Patient User',
        email: 'patient@example.com',
        password: 'password123',
        role: 'patient'
      });
      patientId = patient._id.toString();
    });

    it('should require patientId field', async () => {
      const alertData = {
        type: 'medication',
        message: 'Test alert',
        severity: 'high'
      };

      const alert = new Alert(alertData);
      await expect(alert.save()).rejects.toThrow();
    });

    it('should require type field', async () => {
      const alertData = {
        patientId,
        message: 'Test alert',
        severity: 'high'
      };

      const alert = new Alert(alertData);
      await expect(alert.save()).rejects.toThrow();
    });

    it('should require message field', async () => {
      const alertData = {
        patientId,
        type: 'medication',
        severity: 'high'
      };

      const alert = new Alert(alertData);
      await expect(alert.save()).rejects.toThrow();
    });

    it('should validate severity enum', async () => {
      const alertData = {
        patientId,
        type: 'medication',
        message: 'Test alert',
        severity: 'invalid-severity'
      };

      const alert = new Alert(alertData);
      await expect(alert.save()).rejects.toThrow();
    });

    it('should create valid alert', async () => {
      const alertData = {
        patientId,
        type: 'medication',
        message: 'Test alert',
        severity: 'high'
      };

      const alert = new Alert(alertData);
      const savedAlert = await alert.save();

      expect(savedAlert._id).toBeDefined();
      expect(savedAlert.type).toBe('medication');
      expect(savedAlert.severity).toBe('high');
    });
  });
});

