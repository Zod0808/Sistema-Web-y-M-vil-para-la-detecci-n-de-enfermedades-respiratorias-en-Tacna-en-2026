/**
 * Fixed version of seed demo data - JavaScript version
 * This script will seed the database with demo data for dashboards
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';

// Load models
const UserModel = require('../models/User');
const MedicalHistoryModel = require('../models/MedicalHistory');
const SymptomReportModel = require('../models/SymptomReport');
const AppointmentModel = require('../models/Appointment');
const AlertModel = require('../models/Alert');
const AIAnalysisModel = require('../models/AIAnalysis');

const SEED_MARKER = '[DEMO]';

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

async function cleanupPreviousDemoData() {
  console.log('🧹 Limpiando datos demo anteriores...');
  
  try {
    // Try to clean up in a safe way - catch individual errors
    const cleanups = [
      MedicalHistoryModel.deleteMany({ description: { $regex: SEED_MARKER } }).catch(e => console.warn('Warning cleaning MedicalHistory:', e.message)),
      SymptomReportModel.deleteMany({ notes: { $regex: SEED_MARKER } }).catch(e => console.warn('Warning cleaning SymptomReport:', e.message)),
      AppointmentModel.deleteMany({ 'metadata.seedTag': SEED_MARKER }).catch(e => console.warn('Warning cleaning Appointment:', e.message)),
      AlertModel.deleteMany({ 'metadata.seedTag': SEED_MARKER }).catch(e => console.warn('Warning cleaning Alert:', e.message)),
    ];
    
    await Promise.all(cleanups);
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.warn('⚠️ Some cleanup warnings (continuing anyway):', error.message);
  }
}

async function seedSymptomReports(count = 200) {
  console.log(`📝 Seeding ${count} symptom reports...`);
  
  const districts = [
    { name: 'Centro de Tacna', lat: -18.0056, lng: -70.2444 },
    { name: 'Gregorio Albarracín', lat: -18.0303, lng: -70.2489 },
    { name: 'Ciudad Nueva', lat: -18.0125, lng: -70.2467 },
    { name: 'Alto de la Alianza', lat: -18.0156, lng: -70.2500 },
  ];
  
  const symptoms = ['tos', 'fiebre', 'dificultad_respiratoria', 'sibilancias', 'fatiga', 'dolor_pecho'];
  const severities = ['low', 'medium', 'high'];
  
  const reports = [];
  for (let i = 0; i < count; i++) {
    const district = districts[Math.floor(Math.random() * districts.length)];
    const symptomCount = Math.floor(Math.random() * 4) + 2;
    const selectedSymptoms = [];
    for (let j = 0; j < symptomCount; j++) {
      const symptom = symptoms[Math.floor(Math.random() * symptoms.length)];
      if (!selectedSymptoms.find(s => s.name === symptom)) {
        selectedSymptoms.push({
          name: symptom,
          severity: severities[Math.floor(Math.random() * severities.length)],
          duration: { value: Math.floor(Math.random() * 10) + 1, unit: 'days' }
        });
      }
    }
    
    reports.push({
      location: {
        district: district.name,
        coordinates: {
          latitude: district.lat + (Math.random() - 0.5) * 0.01,
          longitude: district.lng + (Math.random() - 0.5) * 0.01
        }
      },
      symptoms: selectedSymptoms,
      category: 'respiratory',
      overallSeverity: severities[Math.floor(Math.random() * severities.length)],
      suspectedDisease: ['asma', 'bronquitis', 'neumonia', 'covid19'][Math.floor(Math.random() * 4)],
      temperature: 36.5 + Math.random() * 2,
      status: Math.random() > 0.8 ? 'urgent' : 'pending',
      medicalAttentionRequired: Math.random() > 0.7,
      reportedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      notes: `Reporte generado para demo ${SEED_MARKER}`,
    });
  }
  
  await SymptomReportModel.insertMany(reports);
  console.log(`✅ Inserted ${reports.length} symptom reports`);
  return reports.length;
}

async function main() {
  try {
    console.log('🌱 Iniciando seed de datos demo...');
    await connectDatabase();
    await cleanupPreviousDemoData();
    await seedSymptomReports(200);
    console.log('✅ Seed completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

