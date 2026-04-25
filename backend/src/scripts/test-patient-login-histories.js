/**
 * Script para probar el login del paciente y obtener sus historias médicas
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

async function testPatientLoginAndHistories() {
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

    // Simular login del paciente
    const patient = await UserModel.findOne({ email: 'paciente@demo.com' }).lean();
    if (!patient) {
      console.log('❌ Patient not found');
      process.exit(1);
    }

    console.log('👤 Patient found:');
    console.log(`   Name: ${patient.name}`);
    console.log(`   Email: ${patient.email}`);
    console.log(`   Role: ${patient.role}`);
    console.log(`   ID: ${patient._id}\n`);

    // Crear token JWT como lo haría el backend
    const token = jwt.sign(
      { userId: patient._id.toString(), email: patient.email, role: patient.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('🔑 JWT Token created:');
    console.log(`   Token: ${token.substring(0, 50)}...\n`);

    // Decodificar el token para verificar
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('📋 Decoded token:');
    console.log(`   userId: ${decoded.userId}`);
    console.log(`   email: ${decoded.email}`);
    console.log(`   role: ${decoded.role}\n`);

    // Simular la query que haría el endpoint
    const authenticatedUserId = decoded.userId;
    const userRole = patient.role;

    console.log('🔍 Simulating endpoint query...');
    console.log(`   Authenticated User ID: ${authenticatedUserId}`);
    console.log(`   User Role: ${userRole}\n`);

    // Construir query como lo hace el endpoint
    const query = {};
    if (userRole === 'patient' && authenticatedUserId) {
      // Convertir string a ObjectId si es necesario
      try {
        const userIdObj = typeof authenticatedUserId === 'string'
          ? new mongoose.Types.ObjectId(authenticatedUserId)
          : authenticatedUserId;
        query.patientId = userIdObj;
        console.log(`✅ Query: { patientId: ObjectId("${userIdObj}") }`);
      } catch (e) {
        query.patientId = authenticatedUserId;
        console.log(`✅ Query: { patientId: "${authenticatedUserId}" }`);
      }
    }

    // Buscar historias médicas
    const histories = await MedicalHistoryModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    console.log(`\n📋 Medical Histories found: ${histories.length}\n`);

    if (histories.length > 0) {
      histories.forEach((h, idx) => {
        console.log(`${idx + 1}. ${h.diagnosis}`);
        console.log(`   Date: ${h.date}`);
        console.log(`   PatientId in DB: ${h.patientId} (type: ${typeof h.patientId})`);
        console.log(`   Match: ${h.patientId.toString() === authenticatedUserId}`);
        console.log('');
      });
    } else {
      console.log('❌ No medical histories found');
    }

    console.log('\n✅ Test completed successfully!');
    console.log('📝 Summary:');
    console.log(`   - Patient: ${patient.name} (${patient.email})`);
    console.log(`   - Medical Histories: ${histories.length}`);
    console.log(`   - Query works: ${histories.length > 0 ? 'YES ✅' : 'NO ❌'}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPatientLoginAndHistories();

