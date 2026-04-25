/**
 * Script para verificar las relaciones entre historias médicas y usuarios
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';

async function verifyRelationships() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB\n');

    // Get models
    const UserModel = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const MedicalHistoryModel = mongoose.model('MedicalHistory', new mongoose.Schema({}, { strict: false }));

    // Get all patients
    const patients = await UserModel.find({ role: 'patient' }).lean();
    console.log(`📋 Found ${patients.length} patients:\n`);
    
    patients.forEach(patient => {
      console.log(`   - ${patient.name} (${patient.email})`);
      console.log(`     ID: ${patient._id} (type: ${typeof patient._id})`);
    });

    console.log('\n📊 Medical Histories by Patient:\n');

    // Check each patient's medical histories
    for (const patient of patients) {
      const patientIdStr = patient._id.toString();
      const patientIdObj = patient._id;
      
      // Try both string and ObjectId matches
      const histories = await MedicalHistoryModel.find({
        $or: [
          { patientId: patientIdStr },
          { patientId: patientIdObj }
        ]
      }).lean();

      console.log(`   ${patient.name} (${patient.email}):`);
      console.log(`     Patient ID: ${patientIdStr}`);
      console.log(`     Found ${histories.length} medical histories`);
      
      if (histories.length > 0) {
        console.log(`     First history patientId: ${histories[0].patientId} (type: ${typeof histories[0].patientId})`);
        console.log(`     Match: ${histories[0].patientId === patientIdStr || histories[0].patientId.toString() === patientIdStr || histories[0].patientId.equals(patientIdObj)}`);
        console.log(`     Diagnoses: ${[...new Set(histories.map(h => h.diagnosis))].join(', ')}`);
      } else {
        console.log(`     ⚠️  No medical histories found!`);
      }
      console.log('');
    }

    // Get all medical histories and check if they have valid patient references
    const allHistories = await MedicalHistoryModel.find({}).lean();
    console.log(`\n📋 Total medical histories: ${allHistories.length}`);
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const history of allHistories) {
      let patient;
      
      // Try to find patient with different ID formats
      if (typeof history.patientId === 'string') {
        patient = await UserModel.findOne({ _id: history.patientId }).lean() ||
                  await UserModel.findOne({ _id: new mongoose.Types.ObjectId(history.patientId) }).lean();
      } else {
        patient = await UserModel.findOne({ _id: history.patientId }).lean() ||
                  await UserModel.findOne({ _id: history.patientId.toString() }).lean();
      }
      
      if (patient) {
        validCount++;
      } else {
        invalidCount++;
        console.log(`   ⚠️  History ${history._id} has invalid patientId: ${history.patientId}`);
      }
    }
    
    console.log(`\n✅ Valid relationships: ${validCount}`);
    console.log(`❌ Invalid relationships: ${invalidCount}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyRelationships();

