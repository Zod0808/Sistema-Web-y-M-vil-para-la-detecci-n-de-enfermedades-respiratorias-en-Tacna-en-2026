/**
 * Full Demo Seed Script - JavaScript version
 * Generates comprehensive demo data for dashboards, analytics, and heatmaps
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';

// Load models
const SymptomReportModel = require('../models/SymptomReport');
let UserModel;
try {
  UserModel = require('../models/User');
} catch (error) {
  console.warn('Could not load User model:', error.message);
}

const DISTRICTS = [
  { name: 'Centro de Tacna', lat: -18.0056, lng: -70.2444 },
  { name: 'Gregorio Albarracín', lat: -18.0303, lng: -70.2489 },
  { name: 'Ciudad Nueva', lat: -18.0125, lng: -70.2467 },
  { name: 'Alto de la Alianza', lat: -18.0156, lng: -70.2500 },
  { name: 'Boca del Río', lat: -18.0200, lng: -70.2600 },
  { name: 'Pocollay', lat: -18.0083, lng: -70.2522 },
  { name: 'Calana', lat: -18.0100, lng: -70.2400 },
  { name: 'Pachia', lat: -18.0300, lng: -70.2300 },
];

const SYMPTOMS = [
  'tos', 'fiebre', 'dificultad_respiratoria', 'sibilancias', 'fatiga',
  'dolor_pecho', 'congestion_nasal', 'dolor_garganta', 'escalofrios',
  'dolor_cabeza', 'nauseas', 'vomitos', 'diarrea', 'perdida_apetito'
];

const DISEASES = [
  'asma', 'neumonia', 'bronquitis', 'covid19', 'gripe', 'epoc', 'resfriado', 'unknown'
];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateSymptomReports(count = 900) {
  const reports = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365); // Last year
  const endDate = new Date();

  for (let i = 0; i < count; i++) {
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const symptomCount = Math.floor(Math.random() * 5) + 2;
    const selectedSymptoms = [];
    const symptomSet = new Set();

    // Select unique symptoms
    while (symptomSet.size < symptomCount) {
      const symptom = SYMPTOMS[Math.floor(Math.random() * SYMPTOMS.length)];
      if (!symptomSet.has(symptom)) {
        symptomSet.add(symptom);
        selectedSymptoms.push({
          name: symptom,
          severity: ['mild', 'moderate', 'severe'][Math.floor(Math.random() * 3)],
          duration: {
            value: Math.floor(Math.random() * 14) + 1,
            unit: 'days'
          }
        });
      }
    }

    // Determine overall severity based on symptoms
    const hasSevereSymptoms = selectedSymptoms.some(s => s.severity === 'severe');
    const hasFever = selectedSymptoms.some(s => s.name === 'fiebre');
    const overallSeverity = hasSevereSymptoms || hasFever ? 
      (Math.random() > 0.3 ? 'high' : 'medium') :
      (Math.random() > 0.5 ? 'medium' : 'low');

    const reportedDate = randomDate(startDate, endDate);
    const diseaseIndex = Math.floor(Math.random() * DISEASES.length);

    reports.push({
      location: {
        district: district.name,
        coordinates: {
          latitude: district.lat + (Math.random() - 0.5) * 0.015,
          longitude: district.lng + (Math.random() - 0.5) * 0.015
        }
      },
      symptoms: selectedSymptoms,
      category: ['respiratory', 'fever', 'pain', 'digestive', 'fatigue', 'neurological'][Math.floor(Math.random() * 6)],
      overallSeverity: overallSeverity,
      suspectedDisease: DISEASES[diseaseIndex],
      temperature: hasFever ? (37 + Math.random() * 2.5) : (36 + Math.random() * 1.5),
      status: overallSeverity === 'high' && Math.random() > 0.5 ? 'urgent' : 'pending',
      medicalAttentionRequired: overallSeverity === 'high' || Math.random() > 0.7,
      reportedAt: reportedDate,
      notes: `Reporte generado para demo - ${reportedDate.toISOString()}`,
      isAnonymous: Math.random() > 0.3,
      source: ['web', 'mobile', 'phone'][Math.floor(Math.random() * 3)]
    });
  }

  return reports;
}

async function seedUsers() {
  if (!UserModel) {
    console.log('⚠️  User model not available, skipping user creation');
    return [];
  }

  console.log('👤 Creating demo users...');
  
  const demoUsers = [
    {
      name: 'Paciente Demo',
      email: 'paciente@demo.com',
      password: 'demo1234',
      role: 'patient',
      isActive: true
    },
    {
      name: 'Juan Pérez',
      email: 'juan.perez@demo.com',
      password: 'demo1234',
      role: 'patient',
      isActive: true
    },
    {
      name: 'María García',
      email: 'maria.garcia@demo.com',
      password: 'demo1234',
      role: 'patient',
      isActive: true
    },
    {
      name: 'Carlos Mendoza',
      email: 'carlos.mendoza@demo.com',
      password: 'demo1234',
      role: 'patient',
      isActive: true
    },
    {
      name: 'Dr. Ana López',
      email: 'doctor@demo.com',
      password: 'demo1234',
      role: 'doctor',
      isActive: true
    },
    {
      name: 'Admin RespiCare',
      email: 'admin@demo.com',
      password: 'admin1234',
      role: 'admin',
      isActive: true
    }
  ];

  const createdUsers = [];
  
  for (const userData of demoUsers) {
    try {
      // Check if user already exists
      const existingUser = await UserModel.findOne({ email: userData.email.toLowerCase() });
      
      if (existingUser) {
        console.log(`   User ${userData.email} already exists, skipping...`);
        createdUsers.push(existingUser);
      } else {
        // Create new user
        const user = await UserModel.create(userData);
        console.log(`   ✅ Created user: ${userData.email} (${userData.role})`);
        createdUsers.push(user);
      }
    } catch (error) {
      console.warn(`   ⚠️  Error creating user ${userData.email}:`, error.message);
    }
  }

  console.log(`✅ Created/updated ${createdUsers.length} users`);
  return createdUsers;
}

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing demo data (by notes pattern)
    console.log('🗑️  Clearing existing demo symptom reports...');
    await SymptomReportModel.deleteMany({ 
      notes: { $regex: 'generado para demo' } 
    });
    console.log('✅ Cleared existing demo data');

    // Generate and insert reports
    console.log('📝 Generating symptom reports...');
    const reports = generateSymptomReports(900);
    
    console.log(`📝 Inserting ${reports.length} symptom reports...`);
    // Insert in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < reports.length; i += batchSize) {
      const batch = reports.slice(i, i + batchSize);
      await SymptomReportModel.insertMany(batch);
      console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(reports.length / batchSize)}`);
    }

    // Get statistics
    console.log('\n📊 Getting statistics...');
    const stats = await SymptomReportModel.aggregate([
      {
        $group: {
          _id: '$location.district',
          totalCases: { $sum: 1 },
          highSeverity: {
            $sum: { $cond: [{ $eq: ['$overallSeverity', 'high'] }, 1, 0] }
          },
          mediumSeverity: {
            $sum: { $cond: [{ $eq: ['$overallSeverity', 'medium'] }, 1, 0] }
          },
          lowSeverity: {
            $sum: { $cond: [{ $eq: ['$overallSeverity', 'low'] }, 1, 0] }
          }
        }
      }
    ]);

    console.log('\n📊 Statistics by District:');
    stats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.totalCases} total (H:${stat.highSeverity} M:${stat.mediumSeverity} L:${stat.lowSeverity})`);
    });

    const totalReports = await SymptomReportModel.countDocuments();
    console.log(`\n✅ Total symptom reports in database: ${totalReports}`);
    
    if (UserModel) {
      const totalUsers = await UserModel.countDocuments();
      console.log(`✅ Total users in database: ${totalUsers}`);
    }
    
    console.log('\n🔑 Demo User Credentials:');
    console.log('   Patient: paciente@demo.com / demo1234');
    console.log('   Doctor: doctor@demo.com / demo1234');
    console.log('   Admin: admin@demo.com / admin1234');
    
    console.log('\n✅ Database seeded successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, generateSymptomReports };

