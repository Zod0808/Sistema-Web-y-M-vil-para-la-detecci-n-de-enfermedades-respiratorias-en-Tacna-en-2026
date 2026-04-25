/**
 * Script para verificar los datos insertados por seed-complete-demo.js
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/respicare_dev';

async function verifyData() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log('📊 Resumen de datos en la base de datos:\n');
    
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   ${col.name.padEnd(25)}: ${count.toString().padStart(6)} documentos`);
    }

    // Verificar algunas relaciones
    console.log('\n🔗 Verificando relaciones:\n');
    
    // Verificar usuarios
    const users = await db.collection('users').find({}).toArray();
    const patients = users.filter(u => u.role === 'patient');
    const doctors = users.filter(u => u.role === 'doctor');
    const admins = users.filter(u => u.role === 'admin');
    
    console.log(`   Usuarios totales: ${users.length}`);
    console.log(`   - Pacientes: ${patients.length}`);
    console.log(`   - Doctores: ${doctors.length}`);
    console.log(`   - Admins: ${admins.length}`);

    // Verificar historias médicas
    const medicalHistories = await db.collection('medicalhistories').find({}).toArray();
    console.log(`\n   Historias médicas: ${medicalHistories.length}`);
    if (medicalHistories.length > 0) {
      const withPatient = medicalHistories.filter(h => h.patientId).length;
      const withDoctor = medicalHistories.filter(h => h.doctorId).length;
      console.log(`   - Con paciente enlazado: ${withPatient}`);
      console.log(`   - Con doctor enlazado: ${withDoctor}`);
    }

    // Verificar wearables
    const wearables = await db.collection('wearabledatas').find({}).toArray();
    console.log(`\n   Datos de wearables: ${wearables.length}`);
    if (wearables.length > 0) {
      const withPatient = wearables.filter(w => w.patientId).length;
      console.log(`   - Con paciente enlazado: ${withPatient}`);
      const sample = wearables[0];
      if (sample) {
        console.log(`   - Ejemplo de métricas: ${Object.keys(sample).filter(k => !['_id', 'patientId', 'timestamp', '__v'].includes(k)).join(', ')}`);
      }
    }

    // Verificar reportes de síntomas
    const reports = await db.collection('symptomreports').find({}).toArray();
    console.log(`\n   Reportes de síntomas: ${reports.length}`);
    if (reports.length > 0) {
      const bySeverity = {};
      reports.forEach(r => {
        const sev = r.overallSeverity || 'unknown';
        bySeverity[sev] = (bySeverity[sev] || 0) + 1;
      });
      console.log(`   - Por severidad:`, bySeverity);
    }

    // Verificar análisis de IA
    const aiAnalyses = await db.collection('aianalyses').find({}).toArray();
    console.log(`\n   Análisis de IA: ${aiAnalyses.length}`);
    if (aiAnalyses.length > 0) {
      const withHistory = aiAnalyses.filter(a => a.medicalHistoryId).length;
      console.log(`   - Con historia médica enlazada: ${withHistory}`);
    }

    console.log('\n✅ Verificación completada\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

verifyData();

