# Script simplificado para configurar ngrok (version alternativa)
# Inicia tuneles por separado en lugar de usar archivo de configuracion
# Uso: powershell -ExecutionPolicy Bypass -File scripts/setup-ngrok-simple.ps1

Write-Host "Configuracion Simplificada de ngrok" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

# Configuracion de rutas
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

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

# Verificar ngrok y encontrar su ubicacion
$ngrokCmd = $null

# Intentar encontrar ngrok en PATH
if (Get-Command ngrok -ErrorAction SilentlyContinue) {
    $ngrokCmd = "ngrok"
    Write-Host "`n[OK] ngrok encontrado en PATH" -ForegroundColor Green
} else {
    # Buscar en ubicaciones comunes
    $commonPaths = @(
        "C:\ngrok\ngrok.exe",
        "$env:USERPROFILE\Downloads\ngrok.exe",
        "$env:USERPROFILE\AppData\Local\Microsoft\WindowsApps\ngrok.exe",
        "$env:ProgramFiles\ngrok\ngrok.exe",
        "$env:LOCALAPPDATA\ngrok\ngrok.exe"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $ngrokCmd = $path
            Write-Host "`n[OK] ngrok encontrado en: $path" -ForegroundColor Green
            break
        }
    }
    
    if (-not $ngrokCmd) {
        Write-Host "`n[ERROR] ngrok no esta instalado o no se encuentra." -ForegroundColor Red
        Write-Host "   Instala con: choco install ngrok" -ForegroundColor Yellow
        Write-Host "   O descarga desde: https://ngrok.com/download" -ForegroundColor Yellow
        Write-Host "   Luego agrega ngrok.exe al PATH o colocalo en una de estas ubicaciones:" -ForegroundColor Yellow
        foreach ($path in $commonPaths) {
            Write-Host "     - $path" -ForegroundColor Gray
        }
        exit 1
    }
}

# Verificar servicios
Write-Host "`nVerificando servicios..." -ForegroundColor Cyan

$backendOk = $false
$aiOk = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   [OK] Backend (3001) esta corriendo" -ForegroundColor Green
    $backendOk = $true
} catch {
    Write-Host "   [WARN] Backend (3001) no responde" -ForegroundColor Yellow
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   [OK] AI Services (8000) esta corriendo" -ForegroundColor Green
    $aiOk = $true
} catch {
    Write-Host "   [WARN] AI Services (8000) no responde" -ForegroundColor Yellow
}

if (-not $backendOk -and -not $aiOk) {
    Write-Host "`n[ERROR] Ningun servicio esta corriendo." -ForegroundColor Red
    Write-Host "   Inicia con: $dockerComposeCmd" -ForegroundColor Yellow
    exit 1
}

# Detener ngrok existente
Write-Host "`nDeteniendo ngrok existente..." -ForegroundColor Cyan
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Iniciar tuneles en ventanas separadas
Write-Host "`nIniciando tuneles de ngrok..." -ForegroundColor Cyan

if ($backendOk) {
    Write-Host "   Iniciando tunel para Backend (3001)..." -ForegroundColor Gray
    Start-Process -FilePath $ngrokCmd -ArgumentList "http", "3001" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

if ($aiOk) {
    Write-Host "   Iniciando tunel para AI Services (8000)..." -ForegroundColor Gray
    Start-Process -FilePath $ngrokCmd -ArgumentList "http", "8000" -WindowStyle Normal
    Start-Sleep -Seconds 3
}

Write-Host "`nEsperando a que ngrok se inicie completamente..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Obtener URLs
Write-Host "`nObteniendo URLs publicas..." -ForegroundColor Cyan

$backendUrl = $null
$aiServiceUrl = $null
$maxRetries = 20

for ($i = 0; $i -lt $maxRetries; $i++) {
    # Intentar obtener URLs desde ambos puertos (4040 y 4041) ya que pueden estar en ventanas separadas
    $ports = @(4040, 4041)
    
    foreach ($port in $ports) {
        try {
            $ngrokApi = Invoke-RestMethod -Uri "http://localhost:$port/api/tunnels" -ErrorAction Stop
            
            if ($ngrokApi.tunnels) {
                foreach ($tunnel in $ngrokApi.tunnels) {
                    $addr = $tunnel.config.addr
                    $publicUrl = $tunnel.public_url
                    
                    # Preferir HTTPS
                    if ($tunnel.public_url -match "^http://") {
                        $publicUrl = $tunnel.public_url -replace "^http://", "https://"
                    }
                    
                    if ($addr -match ":3001$" -or $addr -eq "3001" -or $addr -eq "localhost:3001" -or $addr -match "3001") {
                        if (-not $backendUrl) {
                            $backendUrl = $publicUrl
                            Write-Host "   [OK] Backend URL: $backendUrl" -ForegroundColor Green
                        }
                    }
                    
                    if ($addr -match ":8000$" -or $addr -eq "8000" -or $addr -eq "localhost:8000" -or $addr -match "8000") {
                        if (-not $aiServiceUrl) {
                            $aiServiceUrl = $publicUrl
                            Write-Host "   [OK] AI Services URL: $aiServiceUrl" -ForegroundColor Green
                        }
                    }
                }
            }
        } catch {
            # Continuar con el siguiente puerto
        }
    }
    
    # Verificar si ya tenemos todas las URLs necesarias
    if (($backendOk -and $backendUrl) -and ($aiOk -and $aiServiceUrl)) {
        break
    }
    if ($backendOk -and $backendUrl -and -not $aiOk) {
        break
    }
    if ($aiOk -and $aiServiceUrl -and -not $backendOk) {
        break
    }
    
    if ($i -lt $maxRetries - 1) {
        Start-Sleep -Seconds 2
    }
}

# Si no se obtuvieron todas las URLs, mostrar instrucciones
if (-not $backendUrl -and $backendOk) {
    Write-Host "`n[WARN] No se pudo obtener URL del Backend automaticamente" -ForegroundColor Yellow
    Write-Host "   Abre http://localhost:4040 para ver las URLs" -ForegroundColor Yellow
}

if (-not $aiServiceUrl -and $aiOk) {
    Write-Host "`n[WARN] No se pudo obtener URL de AI Services automaticamente" -ForegroundColor Yellow
    Write-Host "   Abre http://localhost:4040 o http://localhost:4041 para ver las URLs" -ForegroundColor Yellow
}

# Actualizar .env.local
if ($backendUrl -or $aiServiceUrl) {
    Write-Host "`nActualizando .env.local..." -ForegroundColor Cyan
    
    $envPath = Join-Path $PSScriptRoot "..\.env.local"
    $envContent = ""
    
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
    }
    
    # Actualizar Backend URL
    if ($backendUrl) {
        $apiUrl = "$backendUrl/api/v1"
        if ($envContent -match "NEXT_PUBLIC_API_URL=") {
            $envContent = $envContent -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=$apiUrl"
        } else {
            if ($envContent -and -not $envContent.EndsWith("`n")) {
                $envContent += "`n"
            }
            $envContent += "NEXT_PUBLIC_API_URL=$apiUrl`n"
        }
    }
    
    # Actualizar AI Services URL
    if ($aiServiceUrl) {
        if ($envContent -match "NEXT_PUBLIC_AI_SERVICE_URL=") {
            $envContent = $envContent -replace "NEXT_PUBLIC_AI_SERVICE_URL=.*", "NEXT_PUBLIC_AI_SERVICE_URL=$aiServiceUrl"
        } else {
            if ($envContent -and -not $envContent.EndsWith("`n")) {
                $envContent += "`n"
            }
            $envContent += "NEXT_PUBLIC_AI_SERVICE_URL=$aiServiceUrl`n"
        }
    }
    
    # Agregar comentario
    if (-not $envContent.Contains("# Configuracion ngrok")) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $envContent = "# Configuracion ngrok - Actualizado: $timestamp`n# Generado automaticamente`n`n$envContent"
    }
    
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
    Write-Host "   [OK] .env.local actualizado" -ForegroundColor Green
}

# Resumen
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "[OK] Configuracion Completa" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan

Write-Host "`nURLs Publicas:" -ForegroundColor Yellow
if ($backendUrl) {
    Write-Host "   Backend:     $backendUrl" -ForegroundColor White
    Write-Host "   API:         $backendUrl/api/v1" -ForegroundColor White
} else {
    Write-Host "   Backend:     (verifica en http://localhost:4040)" -ForegroundColor Yellow
}
if ($aiServiceUrl) {
    Write-Host "   AI Services: $aiServiceUrl" -ForegroundColor White
} else {
    Write-Host "   AI Services: (verifica en http://localhost:4040 o http://localhost:4041)" -ForegroundColor Yellow
}

Write-Host "`nProximos Pasos:" -ForegroundColor Yellow
Write-Host "   1. [OK] ngrok esta corriendo (manten las ventanas abiertas)" -ForegroundColor White
Write-Host "   2. [OK] .env.local actualizado" -ForegroundColor White
Write-Host "   3. Recompila: npm run build && npm run capacitor:sync" -ForegroundColor Cyan
Write-Host "   4. Genera APK: npm run apk" -ForegroundColor Cyan

Write-Host ""
Write-Host "Panel de ngrok: http://localhost:4040" -ForegroundColor Cyan
Write-Host "Tambien verifica: http://localhost:4041" -ForegroundColor Cyan
Write-Host "Para detener: npm run tunnel:ngrok:stop" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona Enter para salir..." -ForegroundColor Gray
Read-Host | Out-Null
