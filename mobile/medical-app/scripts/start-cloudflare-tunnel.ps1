# Script para iniciar Cloudflare Tunnel
# Uso: powershell -ExecutionPolicy Bypass -File scripts/start-cloudflare-tunnel.ps1

Write-Host "☁️  Iniciando Cloudflare Tunnel..." -ForegroundColor Cyan

# Verificar que cloudflared esté instalado
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "❌ cloudflared no está instalado." -ForegroundColor Red
    Write-Host "`n📥 Opciones para instalar:" -ForegroundColor Yellow
    Write-Host "   1. Con Chocolatey: choco install cloudflared" -ForegroundColor White
    Write-Host "   2. Descargar desde: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor White
    Write-Host "   3. O usar winget: winget install --id Cloudflare.cloudflared" -ForegroundColor White
    exit 1
}

# Verificar que el backend esté corriendo
Write-Host "`n🔍 Verificando backend..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Backend detectado en localhost:3001" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No se pudo conectar al backend en localhost:3001" -ForegroundColor Yellow
    Write-Host "   Asegúrate de que el backend esté corriendo." -ForegroundColor Yellow
    $continue = Read-Host "¿Deseas continuar de todos modos? (s/n)"
    if ($continue -ne "s") {
        exit 1
    }
}

# Verificar si ya existe un túnel
Write-Host "`n🔍 Verificando configuración..." -ForegroundColor Cyan
$tunnelName = "respicare-backend"
$configPath = "$env:USERPROFILE\.cloudflared\config.yml"

if (-not (Test-Path $configPath)) {
    Write-Host "⚠️  No se encontró configuración de túnel." -ForegroundColor Yellow
    Write-Host "`n📝 Configuración inicial requerida:" -ForegroundColor Cyan
    Write-Host "   1. Autenticarse: cloudflared tunnel login" -ForegroundColor White
    Write-Host "   2. Crear túnel: cloudflared tunnel create $tunnelName" -ForegroundColor White
    Write-Host "   3. Configurar: Edita %USERPROFILE%\.cloudflared\config.yml" -ForegroundColor White
    Write-Host "`n💡 Ejemplo de config.yml:" -ForegroundColor Yellow
    Write-Host @"
tunnel: TU_TUNNEL_ID
credentials-file: %USERPROFILE%\.cloudflared\TU_TUNNEL_ID.json

ingress:
  - hostname: respicare-api.tu-dominio.com
    service: http://localhost:3001
  - hostname: respicare-ai.tu-dominio.com
    service: http://localhost:8000
  - service: http_status:404
"@ -ForegroundColor Gray
    
    $setup = Read-Host "`n¿Deseas configurar el túnel ahora? (s/n)"
    if ($setup -eq "s") {
        Write-Host "`n🔐 Paso 1: Autenticación" -ForegroundColor Cyan
        Write-Host "   Esto abrirá tu navegador para autenticarte..." -ForegroundColor Gray
        cloudflared tunnel login
        
        Write-Host "`n🏗️  Paso 2: Crear túnel" -ForegroundColor Cyan
        cloudflared tunnel create $tunnelName
        
        Write-Host "`n✅ Túnel creado. Ahora edita el archivo config.yml manualmente." -ForegroundColor Green
        Write-Host "   Ubicación: $configPath" -ForegroundColor Gray
        Write-Host "`n   Presiona Enter cuando hayas editado el config.yml..." -ForegroundColor Yellow
        Read-Host
    } else {
        exit 1
    }
}

# Verificar que el túnel esté configurado
if (-not (Test-Path $configPath)) {
    Write-Host "❌ No se encontró el archivo de configuración." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Configuración encontrada" -ForegroundColor Green

# Iniciar túnel
Write-Host "`n🚀 Iniciando túnel '$tunnelName'..." -ForegroundColor Cyan
Write-Host "   El túnel se mantendrá activo y mostrará las URLs públicas." -ForegroundColor Gray
Write-Host "   Presiona Ctrl+C para detener." -ForegroundColor Yellow
Write-Host "`n" -ForegroundColor White

# Ejecutar cloudflared
cloudflared tunnel run $tunnelName

