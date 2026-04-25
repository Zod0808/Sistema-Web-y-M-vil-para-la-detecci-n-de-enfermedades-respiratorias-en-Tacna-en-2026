#!/usr/bin/env node

/**
 * Script para verificar la conexión con el backend y servicios de IA
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[34m',
  blue: '\x1b[36m',
};

function testConnection(url, name) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'GET',
      timeout: 5000,
    };

    const startTime = Date.now();
    const req = client.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          success: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          responseTime,
          data: data.substring(0, 200), // Primeros 200 caracteres
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout después de 5 segundos',
        responseTime: 5000,
      });
    });

    req.end();
  });
}

async function main() {
  console.log(`${colors.cyan}🔍 Verificando conexión con servicios...${colors.reset}\n`);

  // Leer configuración del .env.local
  const fs = require('fs');
  const path = require('path');
  const envFile = path.join(__dirname, '..', '.env.local');

  let backendURL = 'http://localhost:3001/api/v1';
  let aiServiceURL = 'http://localhost:8000';

  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach(line => {
      if (line.startsWith('NEXT_PUBLIC_API_URL=')) {
        backendURL = line.split('=')[1].trim();
      }
      if (line.startsWith('NEXT_PUBLIC_AI_SERVICE_URL=')) {
        aiServiceURL = line.split('=')[1].trim();
      }
    });
  }

  console.log(`${colors.blue}📍 Configuración detectada:${colors.reset}`);
  console.log(`   Backend: ${backendURL}`);
  console.log(`   AI Service: ${aiServiceURL}\n`);

  // Test Backend Health
  console.log(`${colors.yellow}1️⃣ Probando Backend API...${colors.reset}`);
  // El endpoint de health está en /api/health (no /api/v1/health)
  const baseBackendURL = backendURL.replace('/api/v1', '');
  const backendHealthURL = `${baseBackendURL}/api/health`;
  const backendResult = await testConnection(backendHealthURL, 'Backend');

  if (backendResult.success) {
    console.log(`${colors.green}   ✅ Backend accesible${colors.reset}`);
    console.log(`   📊 Status: ${backendResult.status}`);
    console.log(`   ⏱️  Tiempo de respuesta: ${backendResult.responseTime}ms`);
  } else {
    console.log(`${colors.red}   ❌ Backend no accesible${colors.reset}`);
    console.log(`   📊 Error: ${backendResult.error || `Status ${backendResult.status}`}`);
    console.log(`   💡 Verifica que Docker esté corriendo y los puertos estén expuestos`);
  }

  console.log('');

  // Test AI Service
  console.log(`${colors.yellow}2️⃣ Probando AI Service...${colors.reset}`);
  // El endpoint de health del AI Service está en /api/v1/health
  const aiHealthURL = `${aiServiceURL}/api/v1/health`;
  const aiResult = await testConnection(aiHealthURL, 'AI Service');
  
  // Si falla, intentar con el endpoint raíz
  if (!aiResult.success && aiResult.status !== 404) {
    console.log(`   ⚠️  Intentando endpoint alternativo...`);
    const aiRootResult = await testConnection(`${aiServiceURL}/`, 'AI Service Root');
    if (aiRootResult.success) {
      console.log(`   ✅ AI Service accesible (usando endpoint raíz)`);
      console.log(`   📊 Status: ${aiRootResult.status}`);
      console.log(`   ⏱️  Tiempo de respuesta: ${aiRootResult.responseTime}ms`);
      // Actualizar resultado
      aiResult.success = true;
      aiResult.status = aiRootResult.status;
      aiResult.responseTime = aiRootResult.responseTime;
    }
  }

  if (aiResult.success) {
    console.log(`${colors.green}   ✅ AI Service accesible${colors.reset}`);
    console.log(`   📊 Status: ${aiResult.status}`);
    console.log(`   ⏱️  Tiempo de respuesta: ${aiResult.responseTime}ms`);
  } else {
    console.log(`${colors.red}   ❌ AI Service no accesible${colors.reset}`);
    console.log(`   📊 Error: ${aiResult.error || `Status ${aiResult.status}`}`);
    console.log(`   💡 Verifica que Docker esté corriendo y los puertos estén expuestos`);
  }

  console.log('');

  // Resumen
  console.log(`${colors.cyan}📋 Resumen:${colors.reset}`);
  if (backendResult.success && aiResult.success) {
    console.log(`${colors.green}✅ Todos los servicios están accesibles${colors.reset}`);
    console.log(`\n💡 Tu app móvil debería poder conectarse correctamente.`);
    console.log(`   Asegúrate de que tu teléfono esté en la misma red WiFi.`);
  } else {
    console.log(`${colors.red}⚠️  Algunos servicios no están accesibles${colors.reset}`);
    console.log(`\n🔧 Pasos para solucionar:`);
    console.log(`   1. Verifica que Docker esté corriendo: docker ps`);
    console.log(`   2. Verifica que los puertos estén expuestos en docker-compose.dev.yml`);
    console.log(`   3. Verifica el firewall de Windows (puertos 3001 y 8000)`);
    console.log(`   4. Asegúrate de que la IP en .env.local sea correcta`);
    console.log(`   5. Prueba desde el navegador: ${backendHealthURL}`);
  }
  console.log('');
}

main().catch(console.error);

