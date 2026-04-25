/**
 * Script para actualizar .env.local con la URL del túnel
 * Uso: node scripts/update-env-from-tunnel.js <tipo> <url>
 * Ejemplo: node scripts/update-env-from-tunnel.js ngrok https://abc123.ngrok.io
 */

const fs = require('fs');
const path = require('path');

const tunnelType = process.argv[2]; // 'ngrok', 'cloudflare', etc.
const publicUrl = process.argv[3]; // URL pública del túnel

if (!tunnelType || !publicUrl) {
  console.error('❌ Uso: node scripts/update-env-from-tunnel.js <tipo> <url>');
  console.error('   Ejemplo: node scripts/update-env-from-tunnel.js ngrok https://abc123.ngrok.io');
  process.exit(1);
}

// Validar URL
try {
  new URL(publicUrl);
} catch (e) {
  console.error('❌ URL inválida:', publicUrl);
  process.exit(1);
}

const envPath = path.join(__dirname, '..', '.env.local');
const apiUrl = `${publicUrl}/api/v1`;

// Leer .env.local existente o crear uno nuevo
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Actualizar o agregar NEXT_PUBLIC_API_URL
if (envContent.includes('NEXT_PUBLIC_API_URL=')) {
  envContent = envContent.replace(
    /NEXT_PUBLIC_API_URL=.*/g,
    `NEXT_PUBLIC_API_URL=${apiUrl}`
  );
} else {
  envContent += `\nNEXT_PUBLIC_API_URL=${apiUrl}\n`;
}

// Si es ngrok y también necesitamos AI Services, agregar comentario
if (tunnelType === 'ngrok') {
  if (!envContent.includes('NEXT_PUBLIC_AI_SERVICE_URL=')) {
    envContent += `# Para AI Services, ejecuta: ngrok http 8000\n`;
    envContent += `# Luego actualiza: NEXT_PUBLIC_AI_SERVICE_URL=<url_ngrok_ai>\n`;
  }
}

// Escribir archivo
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('✅ Archivo .env.local actualizado:');
console.log(`   NEXT_PUBLIC_API_URL=${apiUrl}`);
console.log(`\n📝 Próximos pasos:`);
console.log(`   1. Recompila la app: npm run build`);
console.log(`   2. Sincroniza Capacitor: npm run capacitor:sync`);
console.log(`   3. Genera la APK: npm run apk`);

