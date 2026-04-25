# Script para iniciar ngrok con ambos endpoints (Backend + AI Services) usando archivo de configuracion
# Uso: powershell -ExecutionPolicy Bypass -File scripts/start-ngrok-full.ps1

Write-Host "[*] Iniciando ngrok con ambos endpoints (Backend + AI Services)" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan

# Configuracion de rutas
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$ngrokConfigSource = Join-Path $projectRoot "ngrok-config.yml"
$ngrokConfigDest = "$env:USERPROFILE\.ngrok2\ngrok.yml"
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

# Verificar que ngrok este instalado
Write-Host "`n[*] Verificando ngrok..." -ForegroundColor Cyan
$ngrokCmd = $null

if (Get-Command ngrok -ErrorAction SilentlyContinue) {
    $ngrokCmd = "ngrok"
    Write-Host "   [OK] ngrok encontrado en PATH" -ForegroundColor Green
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
            Write-Host "   [OK] ngrok encontrado en: $path" -ForegroundColor Green
            break
        }
    }
    
    if (-not $ngrokCmd) {
        Write-Host "`n[ERROR] ngrok no esta instalado o no se encuentra." -ForegroundColor Red
        Write-Host "   Opciones para instalar:" -ForegroundColor Yellow
        Write-Host "   1. Con Chocolatey: choco install ngrok" -ForegroundColor White
        Write-Host "   2. Descargar desde: https://ngrok.com/download" -ForegroundColor White
        exit 1
    }
}

# Verificar archivo de configuracion
Write-Host "`n[*] Verificando archivo de configuracion..." -ForegroundColor Cyan

if (-not (Test-Path $ngrokConfigSource)) {
    Write-Host "   [ERROR] No se encuentra ngrok-config.yml en: $ngrokConfigSource" -ForegroundColor Red
    Write-Host "   Asegurate de que el archivo existe antes de continuar." -ForegroundColor Yellow
    exit 1
}

Write-Host "   [OK] Archivo de configuracion encontrado" -ForegroundColor Green

# Crear directorio .ngrok2 si no existe
Write-Host "`n[*] Configurando directorio de ngrok..." -ForegroundColor Cyan
$ngrokDir = Split-Path $ngrokConfigDest -Parent
if (-not (Test-Path $ngrokDir)) {
    New-Item -ItemType Directory -Path $ngrokDir -Force | Out-Null
    Write-Host "   [OK] Directorio creado: $ngrokDir" -ForegroundColor Green
}

# Copiar archivo de configuracion
Copy-Item -Path $ngrokConfigSource -Destination $ngrokConfigDest -Force
Write-Host "   [OK] Archivo de configuracion copiado a: $ngrokConfigDest" -ForegroundColor Green

# Verificar authtoken
Write-Host "`n[*] Verificando authtoken..." -ForegroundColor Cyan
$configContent = Get-Content $ngrokConfigDest -Raw
if ($configContent -notmatch "authtoken:\s*\S+") {
    Write-Host "   [WARN] No se encontro authtoken en la configuracion." -ForegroundColor Yellow
    Write-Host "   Para mejor rendimiento, configura tu authtoken:" -ForegroundColor Yellow
    Write-Host "   ngrok config add-authtoken TU_TOKEN" -ForegroundColor Gray
    Start-Sleep -Seconds 2
} else {
    Write-Host "   [OK] Authtoken configurado" -ForegroundColor Green
}

# Verificar servicios locales
Write-Host "`n[*] Verificando servicios locales..." -ForegroundColor Cyan

$backendOk = $false
$aiOk = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   [OK] Backend (3001) esta corriendo" -ForegroundColor Green
    $backendOk = $true
} catch {
    Write-Host "   [WARN] Backend (3001) no responde" -ForegroundColor Yellow
    Write-Host "      Asegurate de que el backend este corriendo: $dockerComposeCmd" -ForegroundColor Gray
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   [OK] AI Services (8000) esta corriendo" -ForegroundColor Green
    $aiOk = $true
} catch {
    Write-Host "   [WARN] AI Services (8000) no responde" -ForegroundColor Yellow
    Write-Host "      Asegurate de que AI Services este corriendo: $dockerComposeCmd" -ForegroundColor Gray
}

if (-not $backendOk -and -not $aiOk) {
    Write-Host "`n[ERROR] Ningun servicio esta corriendo." -ForegroundColor Red
    Write-Host "   Inicia los servicios con: $dockerComposeCmd" -ForegroundColor Yellow
    $continue = Read-Host "`nDeseas continuar de todos modos? (s/n)"
    if ($continue -ne "s") {
        exit 1
    }
}

# Detener ngrok existente
Write-Host "`n[*] Deteniendo instancias anteriores de ngrok..." -ForegroundColor Cyan
$ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    Write-Host "   Deteniendo $($ngrokProcesses.Count) proceso(s)..." -ForegroundColor Gray
    $ngrokProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   [OK] Procesos detenidos" -ForegroundColor Green
} else {
    Write-Host "   [INFO] No hay procesos de ngrok corriendo" -ForegroundColor Gray
}

# Iniciar ngrok con archivo de configuracion
Write-Host "`n[*] Iniciando ngrok con ambos tuneles..." -ForegroundColor Cyan
Write-Host "   Usando archivo de configuracion: $ngrokConfigDest" -ForegroundColor Gray

# Iniciar ngrok en nueva ventana usando el archivo de configuracion
if ($ngrokCmd -eq "ngrok") {
    Start-Process ngrok -ArgumentList "start", "--all" -WindowStyle Normal
} else {
    Start-Process -FilePath $ngrokCmd -ArgumentList "start", "--all" -WindowStyle Normal
}

Write-Host "   Esperando a que ngrok se inicie..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# Obtener URLs de ambos tuneles
Write-Host "`n[*] Obteniendo URLs publicas..." -ForegroundColor Cyan

$backendUrl = $null
$aiServiceUrl = $null
$maxRetries = 20
$retryCount = 0

while ($retryCount -lt $maxRetries -and ((-not $backendUrl -and $backendOk) -or (-not $aiServiceUrl -and $aiOk))) {
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        
        if ($ngrokApi.tunnels -and $ngrokApi.tunnels.Count -gt 0) {
            foreach ($tunnel in $ngrokApi.tunnels) {
                $name = $tunnel.name
                $addr = $tunnel.config.addr
                $publicUrl = $tunnel.public_url
                
                # Obtener URL HTTPS preferida
                if ($tunnel.public_url -match "^https://") {
                    $publicUrl = $tunnel.public_url
                } elseif ($tunnel.public_url -match "^http://") {
                    # Intentar obtener la version HTTPS
                    $publicUrl = $tunnel.public_url -replace "^http://", "https://"
                }
                
                # Identificar Backend por nombre o por puerto 3001
                if (($name -eq "backend" -or $addr -match ":3001$" -or $addr -eq "3001" -or $addr -eq "localhost:3001") -and -not $backendUrl) {
                    $backendUrl = $publicUrl
                    Write-Host "   [OK] Backend URL obtenida: $backendUrl" -ForegroundColor Green
                }
                
                # Identificar AI Services por nombre o por puerto 8000
                if (($name -eq "ai-services" -or $addr -match ":8000$" -or $addr -eq "8000" -or $addr -eq "localhost:8000") -and -not $aiServiceUrl) {
                    $aiServiceUrl = $publicUrl
                    Write-Host "   [OK] AI Services URL obtenida: $aiServiceUrl" -ForegroundColor Green
                }
            }
        }
        
        # Si tenemos todas las URLs necesarias, salir del loop
        if (($backendOk -and $backendUrl) -and ($aiOk -and $aiServiceUrl)) {
            break
        }
        if ($backendOk -and $backendUrl -and -not $aiOk) {
            break
        }
        if ($aiOk -and $aiServiceUrl -and -not $backendOk) {
            break
        }
    } catch {
        # Continuar intentando
    }
    
    $retryCount++
    if ($retryCount -lt $maxRetries) {
        Start-Sleep -Seconds 2
    }
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

# Agregar comentario con timestamp si se actualizo
if ($updated) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if (-not $envContent.Contains("# Configuracion ngrok")) {
        $header = "# Configuracion ngrok - Actualizado: $timestamp`n# Generado automaticamente por start-ngrok-full.ps1`n`n"
        $envContent = $header + $envContent
    }
    $envContent | Out-File -FilePath $envLocalPath -Encoding UTF8 -NoNewline
    Write-Host "   [OK] Archivo guardado" -ForegroundColor Green
} else {
    Write-Host "   [INFO] No se realizaron cambios (URLs no disponibles)" -ForegroundColor Gray
}

# Resumen final
Write-Host "`n" + ("=" * 70) -ForegroundColor Cyan
Write-Host "[OK] ngrok iniciado exitosamente" -ForegroundColor Green
Write-Host ("=" * 70) -ForegroundColor Cyan

Write-Host "`n[*] URLs Publicas:" -ForegroundColor Yellow
if ($backendUrl) {
    Write-Host "   Backend:      $backendUrl" -ForegroundColor White
    Write-Host "   API Endpoint: $backendUrl/api/v1" -ForegroundColor Cyan
} else {
    Write-Host "   Backend:      (no disponible - verifica en http://localhost:4040)" -ForegroundColor Yellow
}

if ($aiServiceUrl) {
    Write-Host "   AI Services:  $aiServiceUrl" -ForegroundColor White
} else {
    Write-Host "   AI Services:  (no disponible - verifica en http://localhost:4040)" -ForegroundColor Yellow
}

Write-Host "`n[*] Configuracion en .env.local:" -ForegroundColor Yellow
if ($backendUrl) {
    Write-Host "   NEXT_PUBLIC_API_URL=$backendUrl/api/v1" -ForegroundColor Cyan
}
if ($aiServiceUrl) {
    Write-Host "   NEXT_PUBLIC_AI_SERVICE_URL=$aiServiceUrl" -ForegroundColor Cyan
}

Write-Host "`n[*] Proximos Pasos:" -ForegroundColor Yellow
Write-Host "   1. [OK] ngrok esta corriendo (manten la ventana abierta)" -ForegroundColor White
Write-Host "   2. [OK] .env.local actualizado automaticamente" -ForegroundColor White
Write-Host "   3. Recompila la app:" -ForegroundColor Cyan
Write-Host "      npm run build" -ForegroundColor Gray
Write-Host "      npm run capacitor:sync" -ForegroundColor Gray
Write-Host "   4. Genera la APK:" -ForegroundColor Cyan
Write-Host "      npm run apk" -ForegroundColor Gray

Write-Host ""
Write-Host "Panel de ngrok: http://localhost:4040" -ForegroundColor Cyan
Write-Host "Para detener: npm run tunnel:ngrok:stop" -ForegroundColor Yellow
Write-Host ""
Write-Host "[!] IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - Manten la ventana de ngrok abierta" -ForegroundColor White
Write-Host "   - Las URLs cambiaran cada vez que reinicies ngrok" -ForegroundColor White
Write-Host "   - Debes recompilar la app despues de cambiar las URLs" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Enter para salir..." -ForegroundColor Gray
Read-Host | Out-Null
