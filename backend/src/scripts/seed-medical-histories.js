/**
 * Seed Medical Histories Script - JavaScript version
 * Creates medical histories for existing patients
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';

// User Schema (simple version for querying)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Get or create User model
let UserModel;
try {
  UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
} catch (error) {
  UserModel = mongoose.model('User', UserSchema);
}

// Medical History Schema
const MedicalHistorySchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  patientName: { type: String },
  age: { type: Number },
  diagnosis: { type: String },
  symptoms: [{
    name: { type: String },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    duration: { type: String }
  }],
  description: { type: String },
  date: { type: Date, default: Date.now, index: true },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  images: [{ type: String }],
  audioNotes: { type: String },
  status: { type: String, enum: ['active', 'archived', 'deleted'], default: 'active' },
  isOffline: { type: Boolean, default: false },
  syncStatus: { type: String, default: 'synced' }
}, { timestamps: true });

MedicalHistorySchema.index({ patientId: 1, createdAt: -1 });
MedicalHistorySchema.index({ doctorId: 1, createdAt: -1 });

// Get or create MedicalHistory model
let MedicalHistoryModel;
try {
  MedicalHistoryModel = mongoose.models.MedicalHistory || mongoose.model('MedicalHistory', MedicalHistorySchema);
} catch (error) {
  MedicalHistoryModel = mongoose.model('MedicalHistory', MedicalHistorySchema);
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

const DIAGNOSES = [
  'Asma bronquial',
  'Bronquitis aguda',
  'Neumonía',
  'COVID-19',
  'Gripe',
  'Resfriado común',
  'Alergia respiratoria',
  'EPOC',
  'Faringitis',
  'Laringitis'
];

const SEVERITIES = ['mild', 'moderate', 'severe'];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateMedicalHistories(patients, doctors, countPerPatient = 5) {
  const histories = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 180); // Last 6 months
  const endDate = new Date();

  patients.forEach(patient => {
    const historiesCount = Math.floor(Math.random() * countPerPatient) + 3; // 3-8 histories per patient
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const doctor = doctors[Math.floor(Math.random() * doctors.length)];

    // Extract age from patient name or generate random
    const age = 25 + Math.floor(Math.random() * 50); // 25-75 years

    for (let i = 0; i < historiesCount; i++) {
      const symptomCount = Math.floor(Math.random() * 4) + 2; // 2-5 symptoms
      const selectedSymptoms = [];
      const symptomSet = new Set();

      // Select unique symptoms
      while (symptomSet.size < symptomCount) {
        const symptom = SYMPTOMS[Math.floor(Math.random() * SYMPTOMS.length)];
        if (!symptomSet.has(symptom)) {
          symptomSet.add(symptom);
          selectedSymptoms.push({
            name: symptom,
            severity: SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)],
            duration: `${Math.floor(Math.random() * 14) + 1} días`
          });
        }
      }

      const diagnosis = DIAGNOSES[Math.floor(Math.random() * DIAGNOSES.length)];
      const historyDate = randomDate(startDate, endDate);

      histories.push({
        patientId: patient._id.toString(),
        doctorId: doctor ? doctor._id.toString() : (doctors.length > 0 ? doctors[0]._id.toString() : patient._id.toString()),
        patientName: patient.name,
        age: age + Math.floor(Math.random() * 10) - 5, // Age variation
        diagnosis: diagnosis,
        symptoms: selectedSymptoms,
        description: `Consulta médica por ${selectedSymptoms.map(s => s.name).join(', ')}. Paciente presenta ${selectedSymptoms.length} síntomas con severidad ${selectedSymptoms[0].severity}. Diagnóstico: ${diagnosis}.`,
        date: historyDate,
        location: {
          latitude: district.lat + (Math.random() - 0.5) * 0.015,
          longitude: district.lng + (Math.random() - 0.5) * 0.015,
          address: `${district.name}, Tacna`
        },
        images: [],
        audioNotes: null,
        status: 'active',
        isOffline: false,
        syncStatus: 'synced'
      });
    }
  });

  return histories;
}

async function seedMedicalHistories() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB');

    // Get all patients and doctors
    console.log('👥 Fetching users...');
    const patients = await UserModel.find({ role: 'patient', isActive: true }).lean();
    const doctors = await UserModel.find({ role: 'doctor', isActive: true }).lean();

    if (patients.length === 0) {
      console.log('⚠️  No patients found. Please run seed-users.js first.');
      process.exit(0);
    }

    console.log(`✅ Found ${patients.length} patients`);
    console.log(`✅ Found ${doctors.length} doctors`);

    // Clear existing demo medical histories
    console.log('🗑️  Clearing existing demo medical histories...');
    const deletedCount = await MedicalHistoryModel.deleteMany({
      description: { $regex: 'Consulta médica por' }
    });
    console.log(`✅ Cleared ${deletedCount.deletedCount} existing medical histories`);

    // Generate medical histories
    console.log('📝 Generating medical histories...');
    const histories = generateMedicalHistories(patients, doctors, 5);

    console.log(`📝 Inserting ${histories.length} medical histories...`);

    // Insert in batches
    const batchSize = 50;
    let totalInserted = 0;
    for (let i = 0; i < histories.length; i += batchSize) {
      const batch = histories.slice(i, i + batchSize);
      await MedicalHistoryModel.insertMany(batch);
      totalInserted += batch.length;
      console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(histories.length / batchSize)} (${totalInserted}/${histories.length})`);
    }

    // Get statistics
    console.log('\n📊 Getting statistics...');
    const stats = await MedicalHistoryModel.aggregate([
      {
        $group: {
          _id: '$patientId',
          count: { $sum: 1 },
          diagnoses: { $push: '$diagnosis' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'patient'
        }
      },
      {
        $unwind: '$patient'
      },
      {
        $project: {
          patientName: '$patient.name',
          patientEmail: '$patient.email',
          count: 1,
          diagnoses: 1
        }
      }
    ]);

    console.log('\n📊 Medical Histories by Patient:');
    stats.forEach(stat => {
      const uniqueDiagnoses = [...new Set(stat.diagnoses)];
      console.log(`   ${stat.patientName} (${stat.patientEmail}): ${stat.count} histories - Diagnoses: ${uniqueDiagnoses.slice(0, 3).join(', ')}${uniqueDiagnoses.length > 3 ? '...' : ''}`);
    });

    const totalHistories = await MedicalHistoryModel.countDocuments();
    console.log(`\n✅ Total medical histories in database: ${totalHistories}`);
    console.log('✅ Medical histories seeding completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding medical histories:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  seedMedicalHistories();
}

module.exports = { seedMedicalHistories };

