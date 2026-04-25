/**
 * Script para probar que las historias médicas están relacionadas con el paciente
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';

async function testPatientHistories() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB\n');

    const UserModel = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const MedicalHistoryModel = mongoose.model('MedicalHistory', new mongoose.Schema({}, { strict: false }));

    // Get patient
    const patient = await UserModel.findOne({ email: 'paciente@demo.com' }).lean();
    if (!patient) {
      console.log('❌ Patient not found');
      process.exit(1);
    }

    console.log('👤 Patient found:');
    console.log(`   Name: ${patient.name}`);
    console.log(`   Email: ${patient.email}`);
    console.log(`   ID: ${patient._id}`);
    console.log(`   ID type: ${typeof patient._id}`);
    console.log(`   ID string: ${patient._id.toString()}\n`);

    // Get histories with different query formats
    console.log('📋 Testing queries...\n');

    // Test 1: Direct ObjectId match
    const histories1 = await MedicalHistoryModel.find({ patientId: patient._id }).lean();
    console.log(`1. Query with ObjectId: ${histories1.length} histories`);

    // Test 2: String match
    const histories2 = await MedicalHistoryModel.find({ patientId: patient._id.toString() }).lean();
    console.log(`2. Query with String: ${histories2.length} histories`);

    // Test 3: Using $or
    const histories3 = await MedicalHistoryModel.find({
      $or: [
        { patientId: patient._id },
        { patientId: patient._id.toString() },
        { patientId: mongoose.Types.ObjectId(patient._id) }
      ]
    }).lean();
    console.log(`3. Query with $or: ${histories3.length} histories\n`);

    const histories = histories3.length > 0 ? histories3 : histories1;

    if (histories.length > 0) {
      console.log(`✅ Found ${histories.length} medical histories for paciente@demo.com:\n`);
      histories.forEach((h, idx) => {
        console.log(`   ${idx + 1}. ${h.diagnosis}`);
        console.log(`      Date: ${h.date}`);
        console.log(`      PatientId: ${h.patientId} (type: ${typeof h.patientId})`);
        console.log(`      Match: ${h.patientId.toString() === patient._id.toString() || h.patientId.equals(patient._id)}`);
        console.log('');
      });
    } else {
      console.log('❌ No medical histories found for this patient');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPatientHistories();

