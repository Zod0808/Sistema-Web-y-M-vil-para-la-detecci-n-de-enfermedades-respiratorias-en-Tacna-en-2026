/**
 * Script para verificar los reportes de síntomas directamente desde MongoDB
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/respicare_dev';

// Cargar el modelo
const SymptomReport = require('../models/SymptomReport');

async function testSymptomReports() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Probar consultas directas
    console.log('📊 Probando consultas del modelo:\n');
    
    const total = await SymptomReport.countDocuments();
    console.log(`   Total de reportes (modelo): ${total}`);

    const recent = await SymptomReport.countDocuments({
      reportedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    console.log(`   Reportes recientes (7 días): ${recent}`);

    const urgent = await SymptomReport.countDocuments({
      $or: [
        { status: 'urgent' },
        { overallSeverity: 'high' }
      ]
    });
    console.log(`   Reportes urgentes: ${urgent}`);

    // Probar agregación
    const severityDist = await SymptomReport.aggregate([
      {
        $group: {
          _id: '$overallSeverity',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    console.log(`\n   Distribución por severidad:`, severityDist);

    // Probar consulta directa a la colección
    const db = mongoose.connection.db;
    const collectionName = SymptomReport.collection.name;
    console.log(`\n   Nombre de la colección: ${collectionName}`);
    
    const directCount = await db.collection(collectionName).countDocuments();
    console.log(`   Total (consulta directa): ${directCount}`);

    // Ver un ejemplo
    const sample = await SymptomReport.findOne().lean();
    if (sample) {
      console.log(`\n   Ejemplo de reporte:`);
      console.log(`     - ID: ${sample._id}`);
      console.log(`     - Distrito: ${sample.location?.district}`);
      console.log(`     - Severidad: ${sample.overallSeverity}`);
      console.log(`     - Categoría: ${sample.category}`);
      console.log(`     - Fecha: ${sample.reportedAt || sample.createdAt}`);
    }

    console.log('\n✅ Verificación completada\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testSymptomReports();

