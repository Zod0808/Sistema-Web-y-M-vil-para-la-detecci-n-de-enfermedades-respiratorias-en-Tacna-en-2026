# Script para iniciar ngrok y exponer el backend
# Uso: powershell -ExecutionPolicy Bypass -File scripts/start-ngrok.ps1

Write-Host "🚀 Iniciando ngrok..." -ForegroundColor Cyan

# Verificar que ngrok esté instalado
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ngrok no está instalado." -ForegroundColor Red
    Write-Host "`n📥 Opciones para instalar:" -ForegroundColor Yellow
    Write-Host "   1. Con Chocolatey: choco install ngrok" -ForegroundColor White
    Write-Host "   2. Descargar desde: https://ngrok.com/download" -ForegroundColor White
    Write-Host "   3. O ejecuta este comando (PowerShell como Admin):" -ForegroundColor White
    Write-Host "      Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile `$env:TEMP\ngrok.zip" -ForegroundColor Gray
    exit 1
}

# Verificar que el backend esté corriendo
Write-Host "`n🔍 Verificando backend..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Backend detectado en localhost:3001" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No se pudo conectar al backend en localhost:3001" -ForegroundColor Yellow
    Write-Host "   Asegúrate de que el backend esté corriendo antes de continuar." -ForegroundColor Yellow
    Write-Host "   Puedes iniciarlo con: docker-compose up -d" -ForegroundColor Gray
    $continue = Read-Host "¿Deseas continuar de todos modos? (s/n)"
    if ($continue -ne "s") {
        exit 1
    }
}

# Verificar authtoken de ngrok
Write-Host "`n🔐 Verificando configuración de ngrok..." -ForegroundColor Cyan
$ngrokConfig = "$env:USERPROFILE\.ngrok2\ngrok.yml"
if (-not (Test-Path $ngrokConfig)) {
    Write-Host "⚠️  ngrok no está configurado con authtoken." -ForegroundColor Yellow
    Write-Host "   Para obtener mejor rendimiento, crea una cuenta en https://dashboard.ngrok.com" -ForegroundColor Yellow
    Write-Host "   Luego ejecuta: ngrok config add-authtoken TU_TOKEN" -ForegroundColor Gray
    Start-Sleep -Seconds 2
}

# Iniciar ngrok para el backend (puerto 3001)
Write-Host "`n📡 Exponiendo backend (puerto 3001)..." -ForegroundColor Cyan
Write-Host "   Esto abrirá una nueva ventana de ngrok." -ForegroundColor Gray

# Iniciar ngrok en nueva ventana
Start-Process ngrok -ArgumentList "http", "3001"

# Esperar un momento para que ngrok se inicie
Write-Host "   Esperando a que ngrok se inicie..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Intentar obtener la URL pública de ngrok
Write-Host "`n🔍 Obteniendo URL pública..." -ForegroundColor Cyan
$maxRetries = 10
$retryCount = 0
$publicUrl = $null

while ($retryCount -lt $maxRetries -and -not $publicUrl) {
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        if ($ngrokApi.tunnels -and $ngrokApi.tunnels.Count -gt 0) {
            $publicUrl = $ngrokApi.tunnels[0].public_url
            break
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Start-Sleep -Seconds 2
        }
    }
}

if ($publicUrl) {
    Write-Host "`n✅ ngrok iniciado exitosamente!" -ForegroundColor Green
    Write-Host "`n🌐 URL Pública del Backend:" -ForegroundColor Cyan
    Write-Host "   $publicUrl" -ForegroundColor White -BackgroundColor DarkGreen
    
    # Mostrar URL con /api/v1
    $apiUrl = "$publicUrl/api/v1"
    Write-Host "`n📋 URL para configurar en la app móvil:" -ForegroundColor Cyan
    Write-Host "   $apiUrl" -ForegroundColor White -BackgroundColor DarkBlue
    
    # Mostrar instrucciones
    Write-Host "`n📱 Pasos siguientes:" -ForegroundColor Yellow
    Write-Host "   1. Copia la URL de arriba" -ForegroundColor White
    Write-Host "   2. Edita mobile/medical-app/.env.local:" -ForegroundColor White
    Write-Host "      NEXT_PUBLIC_API_URL=$apiUrl" -ForegroundColor Gray
    Write-Host "   3. Si también necesitas AI Services, abre otra terminal y ejecuta:" -ForegroundColor White
    Write-Host "      ngrok http 8000" -ForegroundColor Gray
    Write-Host "   4. Recompila la app: npm run build && npm run capacitor:sync" -ForegroundColor White
    Write-Host "   5. Genera la APK: npm run apk" -ForegroundColor White
    
    Write-Host "`n⚠️  NOTA: Esta URL cambiará cada vez que reinicies ngrok" -ForegroundColor Yellow
    Write-Host "   (a menos que tengas plan pago de ngrok)" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  No se pudo obtener la URL de ngrok automáticamente." -ForegroundColor Yellow
    Write-Host "`n💡 Solución:" -ForegroundColor Cyan
    Write-Host "   1. Abre http://localhost:4040 en tu navegador" -ForegroundColor White
    Write-Host "   2. Verás la URL pública en la interfaz web de ngrok" -ForegroundColor White
    Write-Host "   3. Copia esa URL y úsala en .env.local" -ForegroundColor White
}

Write-Host "`n🛑 Para detener ngrok:" -ForegroundColor Yellow
Write-Host "   - Cierra la ventana de ngrok" -ForegroundColor White
Write-Host "   - O presiona Ctrl+C en esta ventana" -ForegroundColor White
Write-Host "`n📊 Panel de ngrok: http://localhost:4040" -ForegroundColor Cyan

# Mantener la ventana abierta
Write-Host "`n⏳ Presiona Enter para salir..." -ForegroundColor Gray
Read-Host

