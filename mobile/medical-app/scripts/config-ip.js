#!/usr/bin/env node

/**
 * Script para configurar automáticamente la IP local en .env.local
 * Detecta la IP local de la máquina y actualiza el archivo de configuración
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const ENV_FILE = path.join(__dirname, '..', '.env.local');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  // Priorizar interfaces comunes
  const priorityInterfaces = ['Wi-Fi', 'Ethernet', 'eth0', 'wlan0', 'en0'];
  
  for (const interfaceName of priorityInterfaces) {
    const iface = interfaces[interfaceName];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  
  // Si no encuentra en las prioritarias, buscar en todas
  for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  
  return null;
}

function getLocalIPWindows() {
  try {
    // Intentar obtener IP usando ipconfig en Windows
    const result = execSync('ipconfig', { encoding: 'utf8' });
    const lines = result.split('\n');
    let foundAdapter = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Buscar adaptador Wi-Fi o Ethernet
      if (line.includes('Wi-Fi') || line.includes('Ethernet') || line.includes('LAN inalámbrica')) {
        foundAdapter = true;
      }
      
      // Si encontramos el adaptador, buscar IPv4
      if (foundAdapter && line.includes('IPv4')) {
        const match = line.match(/IPv4[^\d]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (match) {
          return match[1];
        }
      }
      
      // Reset si encontramos un separador
      if (line.trim() === '' && foundAdapter) {
        foundAdapter = false;
      }
    }
  } catch (error) {
    console.error('Error ejecutando ipconfig:', error.message);
  }
  
  return null;
}

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    return {};
  }
  
  const content = fs.readFileSync(ENV_FILE, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return env;
}

function writeEnvFile(env) {
  let content = `# Configuración de API para desarrollo móvil
# Este archivo fue generado automáticamente por config-ip.js
# Última actualización: ${new Date().toISOString()}\n\n`;

  // Agregar variables de entorno
  const sortedKeys = Object.keys(env).sort();
  sortedKeys.forEach(key => {
    content += `${key}=${env[key]}\n`;
  });
  
  fs.writeFileSync(ENV_FILE, content, 'utf8');
}

function main() {
  console.log('🔍 Detectando IP local...\n');
  
  let localIP = null;
  
  // Intentar obtener IP según el sistema operativo
  if (process.platform === 'win32') {
    localIP = getLocalIPWindows() || getLocalIP();
  } else {
    localIP = getLocalIP();
  }
  
  if (!localIP) {
    console.error('❌ No se pudo detectar la IP local automáticamente.');
    console.log('\nPor favor, obtén tu IP manualmente:');
    console.log('  Windows: ipconfig');
    console.log('  Linux/Mac: ifconfig | grep inet\n');
    console.log('Luego edita el archivo .env.local manualmente con:');
    console.log('  NEXT_PUBLIC_API_URL=http://TU_IP:3001/api/v1');
    process.exit(1);
  }
  
  console.log(`✅ IP local detectada: ${localIP}\n`);
  
  // Leer configuración actual
  const env = readEnvFile();
  
  // Actualizar URLs
  env['NEXT_PUBLIC_API_URL'] = `http://${localIP}:3001/api/v1`;
  env['NEXT_PUBLIC_AI_SERVICE_URL'] = `http://${localIP}:8000`;
  
  // Escribir archivo
  writeEnvFile(env);
  
  console.log('✅ Archivo .env.local actualizado:\n');
  console.log(`   NEXT_PUBLIC_API_URL=http://${localIP}:3001/api/v1`);
  console.log(`   NEXT_PUBLIC_AI_SERVICE_URL=http://${localIP}:8000\n`);
  
  console.log('📱 Próximos pasos:');
  console.log('   1. Verifica que Docker esté corriendo (docker ps)');
  console.log('   2. Verifica que el firewall permita conexiones en los puertos 3001 y 8000');
  console.log('   3. Asegúrate de que tu teléfono esté en la misma red WiFi');
  console.log('   4. Prueba la conexión desde el navegador del teléfono:');
  console.log(`      http://${localIP}:3001/api/v1/health`);
  console.log('   5. Recompila la app móvil si ya la generaste:');
  console.log('      npm run build');
  console.log('   6. Regenera la APK con Capacitor\n');
  
  console.log('⚠️  Nota: Si cambias de red WiFi, necesitarás ejecutar este script nuevamente.\n');
}

main();

