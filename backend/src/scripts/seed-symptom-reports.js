/**
 * Seed script for symptom reports
 * Populates the database with sample symptom reports for Tacna districts
 */

const mongoose = require('mongoose');

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/respicare';

const sampleReports = [
  // Centro de Tacna - High risk
  ...Array(45).fill().map((_, i) => ({
    location: {
      district: 'Centro de Tacna',
      coordinates: {
        latitude: -18.0056 + (Math.random() - 0.5) * 0.01,
        longitude: -70.2444 + (Math.random() - 0.5) * 0.01
      }
    },
    symptoms: [
      { name: 'tos', severity: i < 12 ? 'severe' : (i < 32 ? 'moderate' : 'mild'), duration: { value: 3 + Math.floor(Math.random() * 10), unit: 'days' }},
      { name: 'fiebre', severity: i < 12 ? 'severe' : 'moderate', duration: { value: 1 + Math.floor(Math.random() * 5), unit: 'days' }}
    ],
    category: 'respiratory',
    overallSeverity: i < 12 ? 'high' : (i < 32 ? 'medium' : 'low'),
    suspectedDisease: ['neumonia', 'covid19', 'bronquitis', 'gripe'][Math.floor(Math.random() * 4)],
    temperature: 37 + Math.random() * 2,
    status: i < 5 ? 'urgent' : 'pending',
    medicalAttentionRequired: i < 12,
    reportedBy: 'anonymous',
    source: 'web',
    isAnonymous: true
  })),
  
  // Gregorio Albarracín - Medium risk
  ...Array(32).fill().map((_, i) => ({
    location: {
      district: 'Gregorio Albarracín',
      coordinates: {
        latitude: -18.0300 + (Math.random() - 0.5) * 0.01,
        longitude: -70.2500 + (Math.random() - 0.5) * 0.01
      }
    },
    symptoms: [
      { name: 'tos seca', severity: i < 8 ? 'severe' : 'moderate', duration: { value: 2 + Math.floor(Math.random() * 7), unit: 'days' }},
      { name: 'dolor de garganta', severity: 'moderate', duration: { value: 2, unit: 'days' }}
    ],
    category: 'respiratory',
    overallSeverity: i < 8 ? 'high' : (i < 23 ? 'medium' : 'low'),
    suspectedDisease: ['gripe', 'resfriado', 'covid19'][Math.floor(Math.random() * 3)],
    temperature: 37 + Math.random() * 1.5,
    status: 'pending',
    medicalAttentionRequired: i < 8,
    reportedBy: 'anonymous',
    source: 'web',
    isAnonymous: true
  })),
  
  // Ciudad Nueva - Medium risk
  ...Array(28).fill().map((_, i) => ({
    location: {
      district: 'Ciudad Nueva',
      coordinates: {
        latitude: -18.0120 + (Math.random() - 0.5) * 0.01,
        longitude: -70.2300 + (Math.random() - 0.5) * 0.01
      }
    },
    symptoms: [
      { name: 'dificultad respiratoria', severity: i < 6 ? 'severe' : 'moderate', duration: { value: 3, unit: 'days' }},
      { name: 'fatiga', severity: 'moderate', duration: { value: 5, unit: 'days' }}
    ],
    category: 'respiratory',
    overallSeverity: i < 6 ? 'high' : (i < 20 ? 'medium' : 'low'),
    suspectedDisease: ['asma', 'bronquitis', 'covid19'][Math.floor(Math.random() * 3)],
    oxygenSaturation: 92 + Math.random() * 6,
    status: 'pending',
    medicalAttentionRequired: i < 6,
    reportedBy: 'anonymous',
    source: 'mobile',
    isAnonymous: true
  })),
  
  // Pocollay - Low risk
  ...Array(15).fill().map((_, i) => ({
    location: {
      district: 'Pocollay',
      coordinates: {
        latitude: -17.9950 + (Math.random() - 0.5) * 0.01,
        longitude: -70.2100 + (Math.random() - 0.5) * 0.01
      }
    },
    symptoms: [
      { name: 'congestión nasal', severity: 'mild', duration: { value: 2, unit: 'days' }},
      { name: 'estornudos', severity: 'mild', duration: { value: 2, unit: 'days' }}
    ],
    category: 'respiratory',
    overallSeverity: i < 2 ? 'high' : (i < 9 ? 'medium' : 'low'),
    suspectedDisease: 'resfriado',
    temperature: 36.5 + Math.random() * 0.8,
    status: 'pending',
    medicalAttentionRequired: false,
    reportedBy: 'anonymous',
    source: 'web',
    isAnonymous: true
  })),
  
  // Alto de la Alianza - High risk
  ...Array(38).fill().map((_, i) => ({
    location: {
      district: 'Alto de la Alianza',
      coordinates: {
        latitude: -17.9700 + (Math.random() - 0.5) * 0.01,
        longitude: -70.2400 + (Math.random() - 0.5) * 0.01
      }
    },
    symptoms: [
      { name: 'tos con flema', severity: i < 10 ? 'severe' : 'moderate', duration: { value: 4, unit: 'days' }},
      { name: 'dolor de pecho', severity: i < 10 ? 'severe' : 'moderate', duration: { value: 2, unit: 'days' }}
    ],
    category: 'respiratory',
    overallSeverity: i < 10 ? 'high' : (i < 28 ? 'medium' : 'low'),
    suspectedDisease: ['neumonia', 'bronquitis', 'covid19'][Math.floor(Math.random() * 3)],
    temperature: 37.5 + Math.random() * 1.5,
    status: i < 3 ? 'urgent' : 'pending',
    medicalAttentionRequired: i < 10,
    reportedBy: 'anonymous',
    source: 'web',
    isAnonymous: true
  })),
  
  // Calana - Low risk
  ...Array(12).fill().map((_, i) => ({
    location: {
      district: 'Calana',
      coordinates: {
        latitude: -17.9600 + (Math.random() - 0.5) * 0.01,
        longitude: -70.1950 + (Math.random() - 0.5) * 0.01
      }
    },
    symptoms: [
      { name: 'tos leve', severity: 'mild', duration: { value: 3, unit: 'days' }},
      { name: 'malestar general', severity: 'mild', duration: { value: 2, unit: 'days' }}
    ],
    category: 'respiratory',
    overallSeverity: i < 1 ? 'high' : (i < 6 ? 'medium' : 'low'),
    suspectedDisease: 'resfriado',
    status: 'pending',
    medicalAttentionRequired: false,
    reportedBy: 'anonymous',
    source: 'web',
    isAnonymous: true
  })),
  
  // Pachia - Low risk
  ...Array(8).fill().map((_, i) => ({
    location: {
      district: 'Pachia',
      coordinates: {
        latitude: -17.9200 + (Math.random() - 0.5) * 0.01,
        longitude: -70.1850 + (Math.random() - 0.5) * 0.01
      }
    },
    symptoms: [
      { name: 'dolor de garganta', severity: 'mild', duration: { value: 1, unit: 'days' }}
    ],
    category: 'pain',
    overallSeverity: i < 1 ? 'high' : (i < 4 ? 'medium' : 'low'),
    suspectedDisease: 'resfriado',
    status: 'pending',
    medicalAttentionRequired: false,
    reportedBy: 'anonymous',
    source: 'phone',
    isAnonymous: true
  })),
  
  // Boca del Río - Medium risk
  ...Array(25).fill().map((_, i) => ({
    location: {
      district: 'Boca del Río',
      coordinates: {
        latitude: -18.0400 + (Math.random() - 0.5) * 0.01,
        longitude: -70.2800 + (Math.random() - 0.5) * 0.01
      }
    },
    symptoms: [
      { name: 'fiebre', severity: i < 5 ? 'severe' : 'moderate', duration: { value: 2, unit: 'days' }},
      { name: 'tos', severity: 'moderate', duration: { value: 4, unit: 'days' }}
    ],
    category: 'fever',
    overallSeverity: i < 5 ? 'high' : (i < 17 ? 'medium' : 'low'),
    suspectedDisease: ['gripe', 'covid19', 'resfriado'][Math.floor(Math.random() * 3)],
    temperature: 38 + Math.random() * 1,
    status: 'pending',
    medicalAttentionRequired: i < 5,
    reportedBy: 'anonymous',
    source: 'web',
    isAnonymous: true
  }))
];

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB');

    // Load model
    const SymptomReport = require('../models/SymptomReport');

    // Clear existing data
    console.log('🗑️  Clearing existing symptom reports...');
    await SymptomReport.deleteMany({});
    console.log('✅ Cleared existing data');

    // Insert sample data
    console.log('📝 Inserting sample symptom reports...');
    await SymptomReport.insertMany(sampleReports);
    console.log(`✅ Inserted ${sampleReports.length} symptom reports`);

    // Get statistics
    const stats = await SymptomReport.getAggregatedByDistrict();
    console.log('\n📊 Statistics:');
    console.log(`   Total reports: ${sampleReports.length}`);
    console.log(`   Districts: ${stats.length}`);
    stats.forEach(s => {
      console.log(`   ${s.district}: ${s.totalCases} cases (${s.severity})`);
    });

    console.log('\n✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleReports };

