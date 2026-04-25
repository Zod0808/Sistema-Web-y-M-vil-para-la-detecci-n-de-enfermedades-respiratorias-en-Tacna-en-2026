# Guía: Acceso Externo a la App Móvil (Sin Cables ni Misma WiFi)

Esta guía te muestra cómo exponer tu backend a internet para que la app móvil funcione en un teléfono real desde cualquier lugar.

## 📋 Opciones Disponibles

### 1. **ngrok** ⭐ (Recomendado para Pruebas Rápidas)
- ✅ Gratis (con limitaciones)
- ✅ Muy fácil de usar
- ✅ HTTPS automático
- ⚠️ URL cambia cada vez (a menos que uses plan pago)
- ⚠️ Límite de conexiones simultáneas

### 2. **Cloudflare Tunnel** ⭐⭐ (Recomendado para Uso Continuo)
- ✅ Completamente gratis
- ✅ URL estable (puedes usar tu dominio)
- ✅ Sin límites de tráfico
- ✅ Más seguro
- ⚠️ Requiere instalación de `cloudflared`

### 3. **localtunnel** (Alternativa Simple)
- ✅ Gratis
- ✅ Fácil de usar
- ⚠️ URL cambia cada vez
- ⚠️ Menos estable que ngrok

### 4. **Servidor en la Nube** (Para Producción)
- ✅ Solución permanente
- ✅ Mejor rendimiento
- ⚠️ Requiere configuración de servidor
- ⚠️ Puede tener costos

---

## 🚀 Opción 1: ngrok (Más Rápido)

### Paso 1: Instalar ngrok

**Windows (PowerShell como Administrador):**
```powershell
# Opción A: Con Chocolatey
choco install ngrok

# Opción B: Descargar manualmente
# 1. Ve a https://ngrok.com/download
# 2. Descarga ngrok para Windows
# 3. Extrae el .exe a una carpeta (ej: C:\ngrok)
# 4. Agrega la carpeta al PATH
```

**O descarga directa:**
```powershell
# Descargar ngrok
Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile "$env:TEMP\ngrok.zip"
Expand-Archive -Path "$env:TEMP\ngrok.zip" -DestinationPath "$env:TEMP\ngrok" -Force
Move-Item -Path "$env:TEMP\ngrok\ngrok.exe" -Destination "C:\ngrok\ngrok.exe" -Force
# Agregar al PATH (ejecutar en PowerShell como Admin)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\ngrok", [EnvironmentVariableTarget]::Machine)
```

### Paso 2: Crear cuenta en ngrok (Opcional pero recomendado)

1. Ve a https://dashboard.ngrok.com/signup
2. Crea una cuenta gratuita
3. Obtén tu authtoken de https://dashboard.ngrok.com/get-started/your-authtoken
4. Configura el token:
```powershell
ngrok config add-authtoken TU_AUTH_TOKEN_AQUI
```

### Paso 3: Crear script para iniciar ngrok

Crea el archivo `scripts/start-ngrok.ps1`:

```powershell
# Script para iniciar ngrok y exponer el backend
Write-Host "🚀 Iniciando ngrok..." -ForegroundColor Cyan

# Verificar que ngrok esté instalado
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ngrok no está instalado. Instálalo primero." -ForegroundColor Red
    exit 1
}

# Verificar que el backend esté corriendo
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Backend detectado en localhost:3001" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No se pudo conectar al backend en localhost:3001" -ForegroundColor Yellow
    Write-Host "   Asegúrate de que el backend esté corriendo antes de continuar." -ForegroundColor Yellow
}

# Iniciar ngrok para el backend (puerto 3001)
Write-Host "`n📡 Exponiendo backend (puerto 3001)..." -ForegroundColor Cyan
Start-Process ngrok -ArgumentList "http", "3001" -NoNewWindow

# Esperar un momento para que ngrok se inicie
Start-Sleep -Seconds 3

# Obtener la URL pública de ngrok
try {
    $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
    $publicUrl = $ngrokApi.tunnels[0].public_url
    Write-Host "`n✅ ngrok iniciado exitosamente!" -ForegroundColor Green
    Write-Host "`n🌐 URL Pública del Backend:" -ForegroundColor Cyan
    Write-Host "   $publicUrl" -ForegroundColor White -BackgroundColor DarkGreen
    
    # Si también necesitas exponer AI Services (puerto 8000)
    Write-Host "`n💡 Para exponer AI Services (puerto 8000), abre otra terminal y ejecuta:" -ForegroundColor Yellow
    Write-Host "   ngrok http 8000" -ForegroundColor White
    
    Write-Host "`n📱 Configura la app móvil con:" -ForegroundColor Cyan
    Write-Host "   NEXT_PUBLIC_API_URL=$publicUrl/api/v1" -ForegroundColor White
    Write-Host "`n⚠️  NOTA: Esta URL cambiará cada vez que reinicies ngrok (a menos que tengas plan pago)" -ForegroundColor Yellow
} catch {
    Write-Host "⚠️  No se pudo obtener la URL de ngrok automáticamente." -ForegroundColor Yellow
    Write-Host "   Abre http://localhost:4040 en tu navegador para ver la URL." -ForegroundColor Yellow
}

Write-Host "`n🛑 Para detener ngrok, presiona Ctrl+C o cierra esta ventana." -ForegroundColor Yellow
```

### Paso 4: Usar el script

```powershell
cd mobile/medical-app
powershell -ExecutionPolicy Bypass -File scripts/start-ngrok.ps1
```

### Paso 5: Configurar la app móvil

1. Copia la URL que ngrok te da (algo como `https://abc123.ngrok.io`)
2. Crea/edita `.env.local` en `mobile/medical-app`:
```bash
NEXT_PUBLIC_API_URL=https://TU_URL_NGROK.ngrok.io/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://TU_URL_NGROK_AI.ngrok.io
```

3. Recompila la app:
```bash
npm run build
npm run capacitor:sync
```

4. Genera la APK:
```bash
npm run apk
```

---

## ☁️ Opción 2: Cloudflare Tunnel (Recomendado)

### Paso 1: Instalar cloudflared

**Windows:**
```powershell
# Con Chocolatey
choco install cloudflared

# O descargar manualmente desde:
# https://github.com/cloudflare/cloudflared/releases
```

### Paso 2: Autenticarse

```powershell
cloudflared tunnel login
```

Esto abrirá tu navegador para autenticarte con Cloudflare.

### Paso 3: Crear un túnel

```powershell
# Crear túnel con nombre
cloudflared tunnel create respicare-backend

# Esto te dará un Tunnel ID, guárdalo
```

### Paso 4: Configurar el túnel

Crea el archivo `%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: TU_TUNNEL_ID_AQUI
credentials-file: %USERPROFILE%\.cloudflared\TU_TUNNEL_ID.json

ingress:
  # Backend API
  - hostname: respicare-api.tu-dominio.com  # O usa un subdominio de trycloudflare.com
    service: http://localhost:3001
  # AI Services
  - hostname: respicare-ai.tu-dominio.com
    service: http://localhost:8000
  # Catch-all
  - service: http_status:404
```

**Nota:** Si no tienes dominio, Cloudflare te da uno gratis: `*.trycloudflare.com`

### Paso 5: Crear script de inicio

Crea `scripts/start-cloudflare-tunnel.ps1`:

```powershell
Write-Host "☁️  Iniciando Cloudflare Tunnel..." -ForegroundColor Cyan

# Verificar que cloudflared esté instalado
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "❌ cloudflared no está instalado." -ForegroundColor Red
    Write-Host "   Instálalo con: choco install cloudflared" -ForegroundColor Yellow
    exit 1
}

# Iniciar túnel
Write-Host "🚀 Iniciando túnel..." -ForegroundColor Cyan
cloudflared tunnel run respicare-backend

# El túnel se mantendrá activo y mostrará las URLs públicas
```

### Paso 6: Usar el script

```powershell
cd mobile/medical-app
powershell -ExecutionPolicy Bypass -File scripts/start-cloudflare-tunnel.ps1
```

### Paso 7: Configurar la app

Usa las URLs que Cloudflare te proporciona en `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://respicare-api.tu-dominio.com/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://respicare-ai.tu-dominio.com
```

---

## 🔧 Opción 3: localtunnel (Alternativa)

### Paso 1: Instalar localtunnel

```bash
npm install -g localtunnel
```

### Paso 2: Crear script

Crea `scripts/start-localtunnel.ps1`:

```powershell
Write-Host "🌐 Iniciando localtunnel..." -ForegroundColor Cyan

# Iniciar túnel para backend
Write-Host "📡 Exponiendo backend (puerto 3001)..." -ForegroundColor Cyan
Start-Process -NoNewWindow npx -ArgumentList "localtunnel", "--port", "3001", "--subdomain", "respicare-backend"

Start-Sleep -Seconds 3

Write-Host "✅ Túnel iniciado!" -ForegroundColor Green
Write-Host "📱 La URL aparecerá en la consola. Úsala en .env.local" -ForegroundColor Cyan
```

### Paso 3: Usar

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-localtunnel.ps1
```

---

## 🖥️ Opción 4: Servidor en la Nube (Producción)

### Opciones de Hosting:

1. **Railway** (https://railway.app) - Fácil, gratis para empezar
2. **Render** (https://render.com) - Gratis con limitaciones
3. **Fly.io** (https://fly.io) - Generoso plan gratuito
4. **DigitalOcean App Platform** - Desde $5/mes
5. **AWS/GCP/Azure** - Más complejo pero más control

### Ejemplo con Railway:

1. Crea cuenta en Railway
2. Conecta tu repositorio GitHub
3. Railway detecta automáticamente Docker
4. Configura variables de entorno
5. Railway te da una URL HTTPS automática

Luego configura la app móvil con esa URL.

---

## 📱 Configuración Final de la App Móvil

### 1. Actualizar `.env.local`

```bash
# Para ngrok/Cloudflare/localtunnel
NEXT_PUBLIC_API_URL=https://TU_URL_PUBLICA/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://TU_URL_AI_PUBLICA

# Si usas HTTP (no recomendado para producción)
# NEXT_PUBLIC_API_URL=http://TU_URL_PUBLICA/api/v1
```

### 2. Recompilar la App

```bash
cd mobile/medical-app
npm run build
npm run capacitor:sync
```

### 3. Generar APK

```bash
npm run apk
```

### 4. Instalar en el Teléfono

```bash
# La APK estará en:
# mobile/medical-app/android/app/build/outputs/apk/debug/app-debug.apk

# Transfiérela a tu teléfono e instálala
```

---

## 🔒 Consideraciones de Seguridad

### ⚠️ IMPORTANTE para Desarrollo:

1. **No uses datos reales** en desarrollo
2. **Cambia las contraseñas** por defecto
3. **Usa HTTPS** siempre que sea posible
4. **Limita el acceso** si es posible (whitelist de IPs en ngrok/Cloudflare)

### Para Producción:

1. **Usa un servidor real** (no túnel temporal)
2. **Configura SSL/TLS** correctamente
3. **Implementa rate limiting**
4. **Usa autenticación fuerte**
5. **Monitorea el acceso**

---

## 🐛 Solución de Problemas

### Error: "Network request failed"

**Causas posibles:**
- ❌ URL incorrecta en `.env.local`
- ❌ Túnel no está corriendo
- ❌ Backend no está corriendo
- ❌ Firewall bloqueando

**Solución:**
1. Verifica que el túnel esté activo
2. Prueba la URL en el navegador del teléfono
3. Verifica que el backend responda en `localhost:3001`

### Error: "CORS policy"

**Solución:**
Asegúrate de que el backend permita el origen de tu app móvil. En `backend/src/index-dev.js`:

```javascript
app.use(cors({
  origin: ['*'], // En desarrollo, permite todo
  credentials: true
}));
```

### La URL cambia cada vez (ngrok free)

**Solución:**
- Usa Cloudflare Tunnel (URL estable)
- O compra plan de ngrok
- O usa un servidor en la nube

---

## 📊 Comparación Rápida

| Opción | Facilidad | Costo | Estabilidad | URL Fija |
|--------|-----------|-------|-------------|----------|
| ngrok | ⭐⭐⭐⭐⭐ | Gratis* | ⭐⭐⭐ | ❌ |
| Cloudflare | ⭐⭐⭐⭐ | Gratis | ⭐⭐⭐⭐⭐ | ✅ |
| localtunnel | ⭐⭐⭐⭐⭐ | Gratis | ⭐⭐ | ❌ |
| Servidor Cloud | ⭐⭐ | Variable | ⭐⭐⭐⭐⭐ | ✅ |

*ngrok tiene límites en plan gratuito

---

## 🎯 Recomendación

- **Para pruebas rápidas:** ngrok
- **Para uso continuo:** Cloudflare Tunnel
- **Para producción:** Servidor en la nube

---

## 📚 Recursos Adicionales

- [ngrok Documentation](https://ngrok.com/docs)
- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [localtunnel GitHub](https://github.com/localtunnel/localtunnel)

