/**
 * Database Seeding Script
 * Populates the database with sample data for development and testing
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import MedicalHistory from '../models/MedicalHistory';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// Sample users data
const sampleUsers = [
  {
    name: 'Dr. Juan Pérez',
    email: 'doctor@respicare.com',
    password: 'password123',
    role: 'doctor'
  },
  {
    name: 'Dr. María García',
    email: 'maria.garcia@respicare.com',
    password: 'password123',
    role: 'doctor'
  },
  {
    name: 'Admin RespiCare',
    email: 'admin@respicare.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    name: 'Ana López',
    email: 'ana.lopez@email.com',
    password: 'password123',
    role: 'patient'
  },
  {
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@email.com',
    password: 'password123',
    role: 'patient'
  },
  {
    name: 'Rosa Mamani',
    email: 'rosa.mamani@email.com',
    password: 'password123',
    role: 'patient'
  }
];

// Sample medical histories data
const sampleMedicalHistories = [
  {
    patientId: '', // Will be filled with actual patient ID
    doctorId: '', // Will be filled with actual doctor ID
    patientName: 'Ana López',
    age: 28,
    diagnosis: 'Asma leve',
    symptoms: [
      {
        name: 'Tos seca',
        severity: 'moderate',
        duration: '1 semana',
        description: 'Tos persistente especialmente en las noches'
      },
      {
        name: 'Dificultad respiratoria',
        severity: 'mild',
        duration: '3 días',
        description: 'Falta de aire al hacer ejercicio'
      }
    ],
    description: 'Paciente presenta síntomas de asma leve. Recomendado uso de inhalador de rescate.',
    date: new Date('2024-01-15'),
    location: {
      latitude: -18.0146,
      longitude: -70.2533,
      address: 'Centro de Tacna, Tacna, Perú'
    },
    images: [],
    audioNotes: null,
    isOffline: false,
    syncStatus: 'synced'
  },
  {
    patientId: '', // Will be filled with actual patient ID
    doctorId: '', // Will be filled with actual doctor ID
    patientName: 'Carlos Mendoza',
    age: 45,
    diagnosis: 'Bronquitis aguda',
    symptoms: [
      {
        name: 'Tos con flema',
        severity: 'severe',
        duration: '5 días',
        description: 'Tos productiva con expectoración amarillenta'
      },
      {
        name: 'Fiebre',
        severity: 'moderate',
        duration: '2 días',
        description: 'Temperatura de 38.5°C'
      },
      {
        name: 'Dolor de pecho',
        severity: 'mild',
        duration: '1 día',
        description: 'Dolor al toser'
      }
    ],
    description: 'Paciente con bronquitis aguda de origen viral. Prescrito tratamiento sintomático.',
    date: new Date('2024-01-20'),
    location: {
      latitude: -18.0089,
      longitude: -70.2489,
      address: 'Zona comercial, Tacna, Perú'
    },
    images: [],
    audioNotes: null,
    isOffline: false,
    syncStatus: 'synced'
  },
  {
    patientId: '', // Will be filled with actual patient ID
    doctorId: '', // Will be filled with actual doctor ID
    patientName: 'Rosa Mamani',
    age: 52,
    diagnosis: 'EPOC moderada',
    symptoms: [
      {
        name: 'Dificultad respiratoria',
        severity: 'severe',
        duration: '2 semanas',
        description: 'Falta de aire incluso en reposo'
      },
      {
        name: 'Tos crónica',
        severity: 'moderate',
        duration: '1 mes',
        description: 'Tos persistente con expectoración'
      },
      {
        name: 'Fatiga',
        severity: 'moderate',
        duration: '1 semana',
        description: 'Cansancio generalizado'
      }
    ],
    description: 'Paciente con EPOC moderada. Antecedentes de tabaquismo. Requiere seguimiento continuo.',
    date: new Date('2024-01-25'),
    location: {
      latitude: -18.0203,
      longitude: -70.2611,
      address: 'Pocollay, Tacna, Perú'
    },
    images: [],
    audioNotes: null,
    isOffline: false,
    syncStatus: 'synced'
  }
];

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.database.mongodb, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('✅ Conectado a MongoDB para seeding');
  } catch (error) {
    logger.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

async function clearDatabase(): Promise<void> {
  try {
    await User.deleteMany({});
    await MedicalHistory.deleteMany({});
    logger.info('🗑️ Base de datos limpiada');
  } catch (error) {
    logger.error('❌ Error limpiando base de datos:', error);
    throw error;
  }
}

async function seedUsers(): Promise<{ doctors: any[], patients: any[], admin: any }> {
  try {
    const users = [];
    const doctors = [];
    const patients = [];
    let admin = null;

    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword,
        isActive: true,
        lastLogin: new Date()
      });

      const savedUser = await user.save();
      users.push(savedUser);

      if (savedUser.role === 'doctor') {
        doctors.push(savedUser);
      } else if (savedUser.role === 'patient') {
        patients.push(savedUser);
      } else if (savedUser.role === 'admin') {
        admin = savedUser;
      }
    }

    logger.info(`✅ ${users.length} usuarios creados`);
    return { doctors, patients, admin };
  } catch (error) {
    logger.error('❌ Error creando usuarios:', error);
    throw error;
  }
}

async function seedMedicalHistories(doctors: any[], patients: any[]): Promise<void> {
  try {
    const medicalHistories = [];

    for (let i = 0; i < sampleMedicalHistories.length; i++) {
      const historyData = sampleMedicalHistories[i];
      const patient = patients[i % patients.length];
      const doctor = doctors[i % doctors.length];

      const medicalHistory = new MedicalHistory({
        ...historyData,
        patientId: patient._id,
        doctorId: doctor._id
      });

      const savedHistory = await medicalHistory.save();
      medicalHistories.push(savedHistory);
    }

    logger.info(`✅ ${medicalHistories.length} historias médicas creadas`);
  } catch (error) {
    logger.error('❌ Error creando historias médicas:', error);
    throw error;
  }
}

async function seedDatabase(): Promise<void> {
  try {
    logger.info('🌱 Iniciando seeding de la base de datos...');

    // Connect to database
    await connectDatabase();

    // Clear existing data
    await clearDatabase();

    // Seed users
    const { doctors, patients } = await seedUsers();

    // Seed medical histories
    await seedMedicalHistories(doctors, patients);

    logger.info('✅ Seeding completado exitosamente');
    logger.info('📊 Resumen:');
    logger.info(`   - ${doctors.length} doctores`);
    logger.info(`   - ${patients.length} pacientes`);
    logger.info(`   - 1 administrador`);
    logger.info(`   - ${sampleMedicalHistories.length} historias médicas`);

    // Display login credentials
    logger.info('🔑 Credenciales de acceso:');
    logger.info('   Admin: admin@respicare.com / admin123');
    logger.info('   Doctor: doctor@respicare.com / password123');
    logger.info('   Paciente: ana.lopez@email.com / password123');

  } catch (error) {
    logger.error('❌ Error durante el seeding:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('🔌 Conexión a MongoDB cerrada');
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('🎉 Seeding completado');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Error en seeding:', error);
      process.exit(1);
    });
}

export default seedDatabase;
