/**
 * Script para verificar la distribución de fechas en los reportes de síntomas
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27018/respicare_dev?authSource=admin';

async function checkDates() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    const SymptomReport = require('../models/SymptomReport');
    
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    console.log('📊 Distribución de reportes por período:\n');
    
    const total = await SymptomReport.countDocuments();
    console.log(`   Total de reportes: ${total}`);
    
    const lastDay = await SymptomReport.countDocuments({ createdAt: { $gte: dayAgo } });
    console.log(`   Último día: ${lastDay}`);
    
    const lastWeek = await SymptomReport.countDocuments({ createdAt: { $gte: weekAgo } });
    console.log(`   Última semana: ${lastWeek}`);
    
    const lastMonth = await SymptomReport.countDocuments({ createdAt: { $gte: monthAgo } });
    console.log(`   Último mes: ${lastMonth}`);
    
    const lastYear = await SymptomReport.countDocuments({ createdAt: { $gte: yearAgo } });
    console.log(`   Último año: ${lastYear}`);

    // Verificar fechas mínimas y máximas
    const oldest = await SymptomReport.findOne().sort({ createdAt: 1 }).select('createdAt').lean();
    const newest = await SymptomReport.findOne().sort({ createdAt: -1 }).select('createdAt').lean();
    
    console.log('\n📅 Rango de fechas:');
    console.log(`   Más antiguo: ${oldest?.createdAt?.toISOString() || 'N/A'}`);
    console.log(`   Más reciente: ${newest?.createdAt?.toISOString() || 'N/A'}`);

    // Probar el método getAggregatedByDistrict con diferentes períodos
    console.log('\n🧪 Probando getAggregatedByDistrict con diferentes períodos:\n');
    
    console.log('1. Último día:');
    const dayData = await SymptomReport.getAggregatedByDistrict({
      startDate: dayAgo.toISOString(),
      endDate: now.toISOString()
    });
    console.log(`   Distritos: ${dayData.length}, Total casos: ${dayData.reduce((sum, d) => sum + d.totalCases, 0)}`);
    
    console.log('2. Última semana:');
    const weekData = await SymptomReport.getAggregatedByDistrict({
      startDate: weekAgo.toISOString(),
      endDate: now.toISOString()
    });
    console.log(`   Distritos: ${weekData.length}, Total casos: ${weekData.reduce((sum, d) => sum + d.totalCases, 0)}`);
    
    console.log('3. Último mes:');
    const monthData = await SymptomReport.getAggregatedByDistrict({
      startDate: monthAgo.toISOString(),
      endDate: now.toISOString()
    });
    console.log(`   Distritos: ${monthData.length}, Total casos: ${monthData.reduce((sum, d) => sum + d.totalCases, 0)}`);
    
    console.log('4. Último año:');
    const yearData = await SymptomReport.getAggregatedByDistrict({
      startDate: yearAgo.toISOString(),
      endDate: now.toISOString()
    });
    console.log(`   Distritos: ${yearData.length}, Total casos: ${yearData.reduce((sum, d) => sum + d.totalCases, 0)}`);

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

if (require.main === module) {
  checkDates();
}

module.exports = { checkDates };

