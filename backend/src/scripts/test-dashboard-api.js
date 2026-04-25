/**
 * Script para probar el endpoint del dashboard con los datos insertados
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testDashboard() {
  try {
    console.log('🧪 Probando endpoint del dashboard...\n');
    console.log(`📡 URL: ${API_URL}/api/analytics/dashboard\n`);

    const response = await axios.get(`${API_URL}/api/analytics/dashboard`, {
      timeout: 10000,
    });

    console.log('✅ Respuesta recibida exitosamente\n');
    console.log('📊 Datos del dashboard:\n');
    
    const data = response.data;
    
    // Mostrar estructura completa para debugging
    console.log('🔍 Estructura de la respuesta:');
    console.log(JSON.stringify(data, null, 2).substring(0, 1000));
    console.log('\n');
    
    if (data.overview) {
      console.log('📈 Resumen:');
      console.log(`   - Total de reportes: ${data.overview.totalReports}`);
      console.log(`   - Reportes recientes (7 días): ${data.overview.recentReports}`);
      console.log(`   - Reportes urgentes: ${data.overview.urgentReports}`);
      console.log(`   - Total conversaciones: ${data.overview.totalConversations}`);
      console.log(`   - Conversaciones recientes: ${data.overview.recentConversations}`);
    }

    if (data.distributions) {
      console.log('\n📊 Distribuciones:');
      if (data.distributions.severity) {
        console.log('   Por severidad:');
        data.distributions.severity.forEach(item => {
          console.log(`     - ${item._id}: ${item.count}`);
        });
      }
      if (data.distributions.category) {
        console.log('   Por categoría:');
        data.distributions.category.forEach(item => {
          console.log(`     - ${item._id}: ${item.count}`);
        });
      }
    }

    if (data.topDistricts && data.topDistricts.length > 0) {
      console.log('\n📍 Top distritos:');
      data.topDistricts.slice(0, 5).forEach((district, idx) => {
        console.log(`   ${idx + 1}. ${district._id}: ${district.count} reportes`);
      });
    }

    if (data.recentActivity && data.recentActivity.length > 0) {
      console.log('\n🕐 Actividad reciente:');
      data.recentActivity.slice(0, 3).forEach((activity, idx) => {
        console.log(`   ${idx + 1}. ${activity.district || 'N/A'}: ${activity.symptoms?.length || 0} síntomas`);
      });
    }

    console.log('\n✅ Dashboard funcionando correctamente con datos reales!\n');
    process.exit(0);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Error: No se puede conectar al backend.');
      console.error('   Asegúrate de que el backend esté corriendo en http://localhost:3001');
    } else if (error.response) {
      console.error(`❌ Error HTTP ${error.response.status}:`, error.response.statusText);
      console.error('   Respuesta:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

testDashboard();

