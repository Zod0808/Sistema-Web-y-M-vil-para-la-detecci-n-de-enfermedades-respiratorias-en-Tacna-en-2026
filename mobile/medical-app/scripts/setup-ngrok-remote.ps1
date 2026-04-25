# Script completo para configurar ngrok y exponer todos los servicios necesarios
# Uso: powershell -ExecutionPolicy Bypass -File scripts/setup-ngrok-remote.ps1

param(
    [switch]$AutoUpdate,
    [switch]$SkipChecks
)

Write-Host "🚀 Configuración Completa de ngrok para Acceso Remoto" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

# ============================================
# PASO 1: Verificar instalación de ngrok
# ============================================
Write-Host "`n📋 PASO 1: Verificando ngrok..." -ForegroundColor Yellow

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ngrok no está instalado." -ForegroundColor Red
    Write-Host "`n📥 Instalación rápida:" -ForegroundColor Yellow
    
    $install = Read-Host "¿Deseas instalar ngrok automáticamente? (s/n)"
    if ($install -eq "s") {
        Write-Host "`n📥 Descargando ngrok..." -ForegroundColor Cyan
        $ngrokDir = "C:\ngrok"
        $ngrokZip = "$env:TEMP\ngrok.zip"
        $ngrokExe = "$ngrokDir\ngrok.exe"
        
        try {
            # Crear directorio si no existe
            if (-not (Test-Path $ngrokDir)) {
                New-Item -ItemType Directory -Path $ngrokDir -Force | Out-Null
            }
            
            # Descargar ngrok
            Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile $ngrokZip -ErrorAction Stop
            Expand-Archive -Path $ngrokZip -DestinationPath $env:TEMP\ngrok -Force
            
            # Mover ejecutable
            if (Test-Path "$env:TEMP\ngrok\ngrok.exe") {
                Move-Item -Path "$env:TEMP\ngrok\ngrok.exe" -Destination $ngrokExe -Force
                Remove-Item -Path "$env:TEMP\ngrok" -Recurse -Force
                Remove-Item -Path $ngrokZip -Force
            }
            
            # Agregar al PATH (requiere permisos de admin)
            $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
            if ($currentPath -notlike "*$ngrokDir*") {
                [Environment]::SetEnvironmentVariable("Path", "$currentPath;$ngrokDir", "User")
                $env:Path += ";$ngrokDir"
            }
            
            Write-Host "✅ ngrok instalado en: $ngrokExe" -ForegroundColor Green
            Write-Host "⚠️  Reinicia PowerShell para que el PATH se actualice, o usa la ruta completa." -ForegroundColor Yellow
            
            # Usar la ruta completa para este script
            $ngrokCmd = $ngrokExe
        } catch {
            Write-Host "❌ Error al instalar ngrok: $_" -ForegroundColor Red
            Write-Host "`n💡 Instalación manual:" -ForegroundColor Yellow
            Write-Host "   1. Ve a https://ngrok.com/download" -ForegroundColor White
            Write-Host "   2. Descarga ngrok para Windows" -ForegroundColor White
            Write-Host "   3. Extrae ngrok.exe a una carpeta (ej: C:\ngrok)" -ForegroundColor White
            Write-Host "   4. Agrega la carpeta al PATH del sistema" -ForegroundColor White
            exit 1
        }
    } else {
        Write-Host "`n💡 Instalación manual:" -ForegroundColor Yellow
        Write-Host "   1. Ve a https://ngrok.com/download" -ForegroundColor White
        Write-Host "   2. O usa Chocolatey: choco install ngrok" -ForegroundColor White
        exit 1
    }
} else {
    $ngrokCmd = "ngrok"
    Write-Host "✅ ngrok está instalado" -ForegroundColor Green
}

# Verificar authtoken
Write-Host "`n🔐 Verificando authtoken de ngrok..." -ForegroundColor Cyan
$ngrokConfig = "$env:USERPROFILE\.ngrok2\ngrok.yml"
if (-not (Test-Path $ngrokConfig)) {
    Write-Host "⚠️  ngrok no tiene authtoken configurado." -ForegroundColor Yellow
    Write-Host "   Para mejor rendimiento, crea una cuenta gratuita en https://dashboard.ngrok.com" -ForegroundColor Yellow
    
    $setupToken = Read-Host "¿Tienes un authtoken? Ingresa 's' para configurarlo ahora, o 'n' para continuar sin él"
    if ($setupToken -eq "s") {
        $token = Read-Host "Ingresa tu authtoken de ngrok"
        & $ngrokCmd config add-authtoken $token
        Write-Host "✅ Authtoken configurado" -ForegroundColor Green
    }
}

# ============================================
# PASO 2: Verificar servicios locales
# ============================================
if (-not $SkipChecks) {
    Write-Host "`n📋 PASO 2: Verificando servicios locales..." -ForegroundColor Yellow
    
    $backendOk = $false
    $aiServiceOk = $false
    
    # Verificar Backend (puerto 3001)
    Write-Host "   Verificando Backend (puerto 3001)..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "   ✅ Backend detectado en localhost:3001" -ForegroundColor Green
        $backendOk = $true
    } catch {
        Write-Host "   ⚠️  Backend no responde en localhost:3001" -ForegroundColor Yellow
        Write-Host "      Asegúrate de que el backend esté corriendo (docker-compose up -d)" -ForegroundColor Gray
    }
    
    # Verificar AI Services (puerto 8000)
    Write-Host "   Verificando AI Services (puerto 8000)..." -ForegroundColor Gray
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "   ✅ AI Services detectado en localhost:8000" -ForegroundColor Green
        $aiServiceOk = $true
    } catch {
        Write-Host "   ⚠️  AI Services no responde en localhost:8000" -ForegroundColor Yellow
        Write-Host "      Asegúrate de que AI Services esté corriendo (docker-compose up -d)" -ForegroundColor Gray
    }
    
    if (-not $backendOk -and -not $aiServiceOk) {
        Write-Host "`n❌ Ningún servicio está corriendo." -ForegroundColor Red
        Write-Host "   Inicia los servicios con: docker-compose up -d" -ForegroundColor Yellow
        $continue = Read-Host "¿Deseas continuar de todos modos? (s/n)"
        if ($continue -ne "s") {
            exit 1
        }
    }
}

# ============================================
# PASO 3: Crear archivo de configuración de ngrok
# ============================================
Write-Host "`n📋 PASO 3: Configurando túneles de ngrok..." -ForegroundColor Yellow

$ngrokConfigDir = "$env:USERPROFILE\.ngrok2"
if (-not (Test-Path $ngrokConfigDir)) {
    New-Item -ItemType Directory -Path $ngrokConfigDir -Force | Out-Null
}

$ngrokConfigFile = "$ngrokConfigDir\ngrok-respicare.yml"
$ngrokConfigContent = @"
version: "2"
authtoken: null
tunnels:
  backend:
    addr: 3001
    proto: http
    bind_tls: true
  ai-services:
    addr: 8000
    proto: http
    bind_tls: true
"@

Write-Host "   Creando configuración de ngrok..." -ForegroundColor Gray
$ngrokConfigContent | Out-File -FilePath $ngrokConfigFile -Encoding UTF8
Write-Host "   ✅ Configuración creada: $ngrokConfigFile" -ForegroundColor Green

# ============================================
# PASO 4: Iniciar ngrok con múltiples túneles
# ============================================
Write-Host "`n📋 PASO 4: Iniciando túneles de ngrok..." -ForegroundColor Yellow

# Verificar si ngrok ya está corriendo
$ngrokProcess = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProcess) {
    Write-Host "   ⚠️  ngrok ya está corriendo. Deteniendo procesos existentes..." -ForegroundColor Yellow
    Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "   Iniciando túneles para Backend (3001) y AI Services (8000)..." -ForegroundColor Gray
Write-Host "   Esto abrirá una nueva ventana de ngrok." -ForegroundColor Gray

# Iniciar ngrok con el archivo de configuración
$ngrokProcess = Start-Process -FilePath $ngrokCmd -ArgumentList "start", "--all", "--config=$ngrokConfigFile" -PassThru -WindowStyle Normal

# Esperar a que ngrok se inicie
Write-Host "   Esperando a que ngrok se inicie..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# ============================================
# PASO 5: Obtener URLs públicas
# ============================================
Write-Host "`n📋 PASO 5: Obteniendo URLs públicas..." -ForegroundColor Yellow

$maxRetries = 15
$retryCount = 0
$backendUrl = $null
$aiServiceUrl = $null

while ($retryCount -lt $maxRetries -and (-not $backendUrl -or -not $aiServiceUrl)) {
    try {
        $ngrokApi = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
        
        if ($ngrokApi.tunnels) {
            foreach ($tunnel in $ngrokApi.tunnels) {
                $tunnelName = $tunnel.name
                $publicUrl = $tunnel.public_url
                $tunnelAddr = $tunnel.config.addr
                
                # Detectar Backend (puerto 3001)
                if ($tunnelName -eq "backend" -or 
                    $tunnelAddr -eq "localhost:3001" -or 
                    $tunnelAddr -eq "3001" -or
                    ($tunnelAddr -match ":3001$")) {
                    if (-not $backendUrl) {
                        $backendUrl = $publicUrl
                        Write-Host "   ✅ Backend URL encontrada: $backendUrl" -ForegroundColor Green
                    }
                }
                
                # Detectar AI Services (puerto 8000)
                if ($tunnelName -eq "ai-services" -or 
                    $tunnelAddr -eq "localhost:8000" -or 
                    $tunnelAddr -eq "8000" -or
                    ($tunnelAddr -match ":8000$")) {
                    if (-not $aiServiceUrl) {
                        $aiServiceUrl = $publicUrl
                        Write-Host "   ✅ AI Services URL encontrada: $aiServiceUrl" -ForegroundColor Green
                    }
                }
            }
        }
        
        if ($backendUrl -and $aiServiceUrl) {
            break
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "   Esperando... ($retryCount/$maxRetries)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $backendUrl -or -not $aiServiceUrl) {
    Write-Host "`n⚠️  No se pudieron obtener todas las URLs automáticamente." -ForegroundColor Yellow
    Write-Host "`n💡 Solución manual:" -ForegroundColor Cyan
    Write-Host "   1. Abre http://localhost:4040 en tu navegador" -ForegroundColor White
    Write-Host "   2. Verás las URLs públicas en la interfaz web de ngrok" -ForegroundColor White
    Write-Host "   3. Copia las URLs y actualiza .env.local manualmente" -ForegroundColor White
    
    if ($backendUrl) {
        Write-Host "`n   Backend URL encontrada: $backendUrl" -ForegroundColor Green
    }
    if ($aiServiceUrl) {
        Write-Host "   AI Services URL encontrada: $aiServiceUrl" -ForegroundColor Green
    }
    
    Write-Host "`n   Presiona Enter para continuar..." -ForegroundColor Gray
    Read-Host
} else {
    # ============================================
    # PASO 6: Actualizar .env.local automáticamente
    # ============================================
    Write-Host "`n📋 PASO 6: Actualizando configuración de la app..." -ForegroundColor Yellow
    
    $envPath = Join-Path $PSScriptRoot "..\.env.local"
    $apiUrl = "$backendUrl/api/v1"
    
    # Leer .env.local existente o crear uno nuevo
    $envContent = ""
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
    }
    
    # Actualizar o agregar NEXT_PUBLIC_API_URL
    if ($envContent -match "NEXT_PUBLIC_API_URL=") {
        $envContent = $envContent -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=$apiUrl"
    } else {
        if ($envContent -and -not $envContent.EndsWith("`n")) {
            $envContent += "`n"
        }
        $envContent += "NEXT_PUBLIC_API_URL=$apiUrl`n"
    }
    
    # Actualizar o agregar NEXT_PUBLIC_AI_SERVICE_URL
    if ($envContent -match "NEXT_PUBLIC_AI_SERVICE_URL=") {
        $envContent = $envContent -replace "NEXT_PUBLIC_AI_SERVICE_URL=.*", "NEXT_PUBLIC_AI_SERVICE_URL=$aiServiceUrl"
    } else {
        if ($envContent -and -not $envContent.EndsWith("`n")) {
            $envContent += "`n"
        }
        $envContent += "NEXT_PUBLIC_AI_SERVICE_URL=$aiServiceUrl`n"
    }
    
    # Agregar comentario con fecha
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if (-not $envContent.Contains("# Configuración ngrok")) {
        $envContent = "# Configuración ngrok - Actualizado: $timestamp`n# Generado automáticamente por setup-ngrok-remote.ps1`n`n$envContent"
    }
    
    # Escribir archivo
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
    
    Write-Host "   ✅ Archivo .env.local actualizado" -ForegroundColor Green
    Write-Host "   📄 Ubicación: $envPath" -ForegroundColor Gray
}

# ============================================
# RESUMEN FINAL
# ============================================
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "✅ Configuración Completa de ngrok" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan

Write-Host "`n🌐 URLs Públicas:" -ForegroundColor Yellow
if ($backendUrl) {
    Write-Host "   Backend:     $backendUrl" -ForegroundColor White
    Write-Host "   API:         $apiUrl" -ForegroundColor White
} else {
    Write-Host "   Backend:     (verifica en http://localhost:4040)" -ForegroundColor Yellow
}
if ($aiServiceUrl) {
    Write-Host "   AI Services: $aiServiceUrl" -ForegroundColor White
} else {
    Write-Host "   AI Services: (verifica en http://localhost:4040)" -ForegroundColor Yellow
}

Write-Host "`n📱 Próximos Pasos:" -ForegroundColor Yellow
Write-Host "   1. ✅ ngrok está corriendo (mantén esta ventana abierta)" -ForegroundColor White
Write-Host "   2. ✅ .env.local ha sido actualizado automáticamente" -ForegroundColor White
Write-Host "   3. 🔄 Recompila la app:" -ForegroundColor Cyan
Write-Host "      npm run build" -ForegroundColor Gray
Write-Host "      npm run capacitor:sync" -ForegroundColor Gray
Write-Host "   4. 📦 Genera la APK:" -ForegroundColor Cyan
Write-Host "      npm run apk" -ForegroundColor Gray
Write-Host "   5. 📲 Instala la APK en tu teléfono" -ForegroundColor Cyan

Write-Host "`n⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - Mantén ngrok corriendo mientras uses la app" -ForegroundColor White
Write-Host "   - Las URLs cambiarán cada vez que reinicies ngrok" -ForegroundColor White
Write-Host "   - Para URL estable, considera Cloudflare Tunnel o servidor en la nube" -ForegroundColor White

Write-Host "`n📊 Panel de ngrok: http://localhost:4040" -ForegroundColor Cyan
Write-Host "🛑 Para detener ngrok: Cierra la ventana de ngrok o presiona Ctrl+C" -ForegroundColor Yellow

Write-Host "`n⏳ Presiona Enter para salir (ngrok seguirá corriendo)..." -ForegroundColor Gray
Read-Host

