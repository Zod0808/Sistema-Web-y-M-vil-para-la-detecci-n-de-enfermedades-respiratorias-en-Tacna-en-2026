# Script rapido para obtener URLs de ngrok y actualizar .env.local sin interrupciones
# Uso: powershell -ExecutionPolicy Bypass -File scripts/update-urls-quick.ps1

# Ruta del archivo .env.local
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$envLocalPath = Join-Path $projectRoot ".env.local"

Write-Host "[*] Obteniendo URLs de ngrok..." -ForegroundColor Cyan

# Esperar un poco para que ngrok se inicie completamente
Start-Sleep -Seconds 3

$backendUrl = $null
$aiServiceUrl = $null
$maxRetries = 15

for ($i = 0; $i -lt $maxRetries; $i++) {
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
            
            if ($backendUrl -or $aiServiceUrl) {
                break
            }
        }
    } catch {
        # Continuar intentando
    }
    
    if ($i -lt $maxRetries - 1) {
        Start-Sleep -Seconds 2
    }
}

if (-not $backendUrl -and -not $aiServiceUrl) {
    Write-Host "[ERROR] No se pudieron obtener las URLs de ngrok" -ForegroundColor Red
    Write-Host "   Verifica que ngrok este corriendo: http://localhost:4040" -ForegroundColor Yellow
    exit 1
}

# Actualizar .env.local
Write-Host "`n[*] Actualizando .env.local..." -ForegroundColor Cyan

$envContent = ""
if (Test-Path $envLocalPath) {
    $envContent = Get-Content $envLocalPath -Raw
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
    Write-Host "   [OK] NEXT_PUBLIC_API_URL=$apiUrl" -ForegroundColor Green
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
    Write-Host "   [OK] NEXT_PUBLIC_AI_SERVICE_URL=$aiServiceUrl" -ForegroundColor Green
}

# Guardar archivo
if ($updated) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if (-not $envContent.Contains("# Configuracion ngrok")) {
        $header = "# Configuracion ngrok - Actualizado: $timestamp`n# Generado automaticamente por update-urls-quick.ps1`n`n"
        $envContent = $header + $envContent
    }
    $envContent | Out-File -FilePath $envLocalPath -Encoding UTF8 -NoNewline
    Write-Host "`n[OK] .env.local actualizado exitosamente" -ForegroundColor Green
} else {
    Write-Host "[INFO] No se realizaron cambios" -ForegroundColor Gray
}

Write-Host "`n[*] URLs configuradas:" -ForegroundColor Yellow
if ($backendUrl) {
    Write-Host "   Backend: $backendUrl/api/v1" -ForegroundColor Cyan
}
if ($aiServiceUrl) {
    Write-Host "   AI Services: $aiServiceUrl" -ForegroundColor Cyan
}

Write-Host "`n[!] Recuerda recompilar la app:" -ForegroundColor Yellow
Write-Host "   npm run build && npm run capacitor:sync" -ForegroundColor Gray

