# Script simple para obtener URLs de ngrok y actualizar .env.local
# Uso: powershell -ExecutionPolicy Bypass -File scripts/get-ngrok-urls.ps1
# Requiere: ngrok corriendo con tuneles para puertos 3001 y 8000

Write-Host "[*] Obteniendo URLs de ngrok..." -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

# Ruta del archivo .env.local
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$envLocalPath = Join-Path $projectRoot ".env.local"

# Detectar archivo de docker-compose a usar
$dockerComposeCmd = "docker-compose up -d"
$dockerComposeDevPath = Join-Path $projectRoot "docker-compose.dev.yml"
$dockerComposePath = Join-Path $projectRoot "docker-compose.yml"

if (Test-Path $dockerComposeDevPath) {
    if (Test-Path $dockerComposePath) {
        $dockerComposeCmd = "docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d"
    } else {
        $dockerComposeCmd = "docker-compose -f docker-compose.dev.yml up -d"
    }
}

# Verificar que ngrok este corriendo
Write-Host "`n[*] Verificando ngrok..." -ForegroundColor Cyan
try {
    $test = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   [OK] ngrok esta corriendo en puerto 4040" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] ngrok no esta corriendo o no responde en puerto 4040" -ForegroundColor Red
    Write-Host "   Inicia ngrok primero con:" -ForegroundColor Yellow
    Write-Host "      ngrok start --all" -ForegroundColor Gray
    Write-Host "   O usa el script: scripts/start-ngrok-full.ps1" -ForegroundColor Gray
    Write-Host "   Asegurate de que los servicios esten corriendo con:" -ForegroundColor Yellow
    Write-Host "      $dockerComposeCmd" -ForegroundColor Gray
    exit 1
}

# Obtener tuneles de ngrok
Write-Host "`n[*] Obteniendo URLs publicas..." -ForegroundColor Cyan
$backendUrl = $null
$aiServiceUrl = $null
$maxRetries = 10
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        
        if ($ngrokApi.tunnels -and $ngrokApi.tunnels.Count -gt 0) {
            foreach ($tunnel in $ngrokApi.tunnels) {
                $name = $tunnel.name
                $addr = $tunnel.config.addr
                $publicUrl = $tunnel.public_url
                
                # Preferir HTTPS
                if ($publicUrl -match "^http://") {
                    $publicUrl = $publicUrl -replace "^http://", "https://"
                }
                
                # Identificar por nombre o por puerto
                if ($name -eq "backend" -or $addr -match ":3001$" -or $addr -eq "3001" -or $addr -eq "localhost:3001") {
                    if (-not $backendUrl) {
                        $backendUrl = $publicUrl
                        Write-Host "   [OK] Backend (3001): $backendUrl" -ForegroundColor Green
                    }
                }
                
                if ($name -eq "ai-services" -or $addr -match ":8000$" -or $addr -eq "8000" -or $addr -eq "localhost:8000") {
                    if (-not $aiServiceUrl) {
                        $aiServiceUrl = $publicUrl
                        Write-Host "   [OK] AI Services (8000): $aiServiceUrl" -ForegroundColor Green
                    }
                }
            }
            
            # Si tenemos al menos una URL, salir
            if ($backendUrl -or $aiServiceUrl) {
                break
            }
        }
    } catch {
        # Continuar intentando
    }
    
    $retryCount++
    if ($retryCount -lt $maxRetries) {
        Start-Sleep -Seconds 2
    }
}

# Verificar que obtuvimos las URLs
if (-not $backendUrl -and -not $aiServiceUrl) {
    Write-Host "`n[ERROR] No se pudieron obtener las URLs de ngrok" -ForegroundColor Red
    Write-Host "   Verifica que ngrok este corriendo con tuneles para puertos 3001 y 8000" -ForegroundColor Yellow
    Write-Host "   Abre http://localhost:4040 para ver los tuneles activos" -ForegroundColor Yellow
    exit 1
}

# Actualizar .env.local
Write-Host "`n[*] Actualizando .env.local..." -ForegroundColor Cyan

$envContent = ""
if (Test-Path $envLocalPath) {
    $envContent = Get-Content $envLocalPath -Raw
} else {
    Write-Host "   [INFO] .env.local no existe, se creara uno nuevo" -ForegroundColor Gray
}

$updated = $false

# Actualizar Backend URL
if ($backendUrl) {
    $apiUrl = "$backendUrl/api/v1"
    
    if ($envContent -match "NEXT_PUBLIC_API_URL=") {
        $envContent = $envContent -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=$apiUrl"
        $updated = $true
    } else {
        if ($envContent -and -not $envContent.EndsWith("`n")) {
            $envContent += "`n"
        }
        $envContent += "NEXT_PUBLIC_API_URL=$apiUrl`n"
        $updated = $true
    }
    Write-Host "   [OK] NEXT_PUBLIC_API_URL actualizado" -ForegroundColor Green
}

# Actualizar AI Services URL
if ($aiServiceUrl) {
    if ($envContent -match "NEXT_PUBLIC_AI_SERVICE_URL=") {
        $envContent = $envContent -replace "NEXT_PUBLIC_AI_SERVICE_URL=.*", "NEXT_PUBLIC_AI_SERVICE_URL=$aiServiceUrl"
        $updated = $true
    } else {
        if ($envContent -and -not $envContent.EndsWith("`n")) {
            $envContent += "`n"
        }
        $envContent += "NEXT_PUBLIC_AI_SERVICE_URL=$aiServiceUrl`n"
        $updated = $true
    }
    Write-Host "   [OK] NEXT_PUBLIC_AI_SERVICE_URL actualizado" -ForegroundColor Green
}

# Guardar archivo
if ($updated) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if (-not $envContent.Contains("# Configuracion ngrok")) {
        $header = "# Configuracion ngrok - Actualizado: $timestamp`n# Generado automaticamente por get-ngrok-urls.ps1`n`n"
        $envContent = $header + $envContent
    }
    $envContent | Out-File -FilePath $envLocalPath -Encoding UTF8 -NoNewline
    Write-Host "   [OK] Archivo guardado" -ForegroundColor Green
} else {
    Write-Host "   [INFO] No se realizaron cambios" -ForegroundColor Gray
}

# Resumen
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "[OK] Configuracion completada" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan

Write-Host "`n[*] URLs Configuradas:" -ForegroundColor Yellow
if ($backendUrl) {
    Write-Host "   Backend:      $backendUrl" -ForegroundColor White
    Write-Host "   API Endpoint: $backendUrl/api/v1" -ForegroundColor Cyan
} else {
    Write-Host "   Backend:      (no disponible)" -ForegroundColor Yellow
}

if ($aiServiceUrl) {
    Write-Host "   AI Services:  $aiServiceUrl" -ForegroundColor White
} else {
    Write-Host "   AI Services:  (no disponible)" -ForegroundColor Yellow
}

Write-Host "`n[*] Variables en .env.local:" -ForegroundColor Yellow
if ($backendUrl) {
    Write-Host "   NEXT_PUBLIC_API_URL=$backendUrl/api/v1" -ForegroundColor Cyan
}
if ($aiServiceUrl) {
    Write-Host "   NEXT_PUBLIC_AI_SERVICE_URL=$aiServiceUrl" -ForegroundColor Cyan
}

Write-Host "`n[*] Proximos Pasos:" -ForegroundColor Yellow
Write-Host "   1. [OK] .env.local actualizado" -ForegroundColor White
Write-Host "   2. Recompila la app:" -ForegroundColor Cyan
Write-Host "      npm run build" -ForegroundColor Gray
Write-Host "      npm run capacitor:sync" -ForegroundColor Gray
Write-Host "   3. Genera la APK:" -ForegroundColor Cyan
Write-Host "      npm run apk" -ForegroundColor Gray

Write-Host "`n[!] Nota: Las URLs cambiaran cada vez que reinicies ngrok" -ForegroundColor Yellow
Write-Host "   Ejecuta este script nuevamente despues de reiniciar ngrok" -ForegroundColor Yellow

Write-Host "`nPresiona Enter para salir..." -ForegroundColor Gray
Read-Host | Out-Null
