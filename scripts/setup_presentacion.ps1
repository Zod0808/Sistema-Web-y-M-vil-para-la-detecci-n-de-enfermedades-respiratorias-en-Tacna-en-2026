# =============================================================================
# setup_presentacion.ps1 — Prepara RespiCare para la sustentacion en VM
#
# Uso (ejecutar en PowerShell como Administrador):
#   cd ruta\del\proyecto
#   .\scripts\setup_presentacion.ps1
#
# Que hace:
#   1. Verifica Docker y Docker Compose
#   2. Crea los .env si no existen
#   3. Entrena los modelos ML si los .pkl no estan en el repo
#   4. Levanta todos los servicios con docker compose
# =============================================================================

$ErrorActionPreference = "Stop"
$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$AI_DIR       = Join-Path $PROJECT_ROOT "ai-services"
$MODELS_DIR   = Join-Path $AI_DIR "models"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  RespiCare - Setup Presentacion" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Verificar Docker ─────────────────────────────────────────────────────
Write-Host "[1/5] Verificando Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    Write-Host "      Docker $dockerVersion OK" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Docker no esta corriendo. Inicia Docker Desktop primero." -ForegroundColor Red
    exit 1
}

# ─── 2. Variables de entorno ─────────────────────────────────────────────────
Write-Host "[2/5] Configurando variables de entorno..." -ForegroundColor Yellow

$envFiles = @{
    (Join-Path $PROJECT_ROOT "backend\.env")     = (Join-Path $PROJECT_ROOT "backend\.env.example")
    (Join-Path $PROJECT_ROOT "ai-services\.env") = (Join-Path $PROJECT_ROOT "ai-services\.env.example")
    (Join-Path $PROJECT_ROOT "web\.env.local")   = (Join-Path $PROJECT_ROOT "web\.env.example")
}

foreach ($envFile in $envFiles.GetEnumerator()) {
    if (-not (Test-Path $envFile.Key)) {
        if (Test-Path $envFile.Value) {
            Copy-Item $envFile.Value $envFile.Key
            Write-Host "      Creado: $($envFile.Key)" -ForegroundColor DarkGray
        } else {
            Write-Host "      AVISO: No existe $($envFile.Value) — crea el .env manualmente si falla el servicio" -ForegroundColor DarkYellow
        }
    }
}
Write-Host "      Variables de entorno OK" -ForegroundColor Green

# ─── 3. Verificar / entrenar modelos ML ──────────────────────────────────────
Write-Host "[3/5] Verificando modelos ML entrenados..." -ForegroundColor Yellow

$rfModel  = Join-Path $MODELS_DIR "base_random_forest.pkl"
$xgbModel = Join-Path $MODELS_DIR "xgboost_model.pkl"
$nnModel  = Join-Path $MODELS_DIR "neural_network_model.pkl"

$modelsOk = (Test-Path $rfModel) -and (Test-Path $xgbModel)

if ($modelsOk) {
    $rfSize  = [math]::Round((Get-Item $rfModel).Length  / 1MB, 1)
    $xgbSize = [math]::Round((Get-Item $xgbModel).Length / 1MB, 1)
    Write-Host "      Random Forest  : $rfSize MB  OK" -ForegroundColor Green
    Write-Host "      XGBoost        : $xgbSize MB  OK" -ForegroundColor Green
    if (Test-Path $nnModel) {
        $nnSize = [math]::Round((Get-Item $nnModel).Length / 1MB, 1)
        Write-Host "      Neural Network : $nnSize MB  OK" -ForegroundColor Green
    }
} else {
    Write-Host "      Modelos no encontrados. Entrenando con datasets locales..." -ForegroundColor DarkYellow
    Write-Host "      (usa train_disease.csv — 4920 filas, 132 sintomas)" -ForegroundColor DarkGray
    Write-Host ""

    # Verificar Python
    try {
        $pyVersion = python --version 2>&1
        Write-Host "      $pyVersion" -ForegroundColor DarkGray
    } catch {
        Write-Host "      ERROR: Python no encontrado. Instala Python 3.11+" -ForegroundColor Red
        exit 1
    }

    # Instalar dependencias Python si faltan
    Write-Host "      Instalando dependencias Python..." -ForegroundColor DarkGray
    Set-Location $AI_DIR
    pip install -r requirements.txt -q 2>$null

    # Correr entrenamiento con datasets pequeños commiteados
    Write-Host "      Iniciando entrenamiento..." -ForegroundColor DarkGray
    $trainScript = Join-Path $AI_DIR "scripts\training\execute_full_retraining.py"
    python $trainScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      ERROR en entrenamiento. Revisa los logs arriba." -ForegroundColor Red
        Write-Host "      Consejo: el sistema puede funcionar en modo degradado (reglas heuristicas)" -ForegroundColor DarkYellow
    } else {
        Write-Host "      Modelos entrenados OK" -ForegroundColor Green
    }

    Set-Location $PROJECT_ROOT
}

# ─── 4. Build de imagenes Docker ─────────────────────────────────────────────
Write-Host "[4/5] Construyendo imagenes Docker..." -ForegroundColor Yellow
Write-Host "      (puede tardar 2-5 min la primera vez)" -ForegroundColor DarkGray
docker compose build --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR en docker compose build" -ForegroundColor Red
    exit 1
}
Write-Host "      Build OK" -ForegroundColor Green

# ─── 5. Levantar servicios ───────────────────────────────────────────────────
Write-Host "[5/5] Levantando servicios..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR al levantar servicios" -ForegroundColor Red
    exit 1
}

# Esperar que los health checks pasen
Write-Host "      Esperando que los servicios esten listos..." -ForegroundColor DarkGray
Start-Sleep -Seconds 10

$services = docker compose ps --format json 2>$null | ConvertFrom-Json
foreach ($svc in $services) {
    $color = if ($svc.State -eq "running") { "Green" } else { "Red" }
    Write-Host "      $($svc.Service.PadRight(20)) $($svc.State)" -ForegroundColor $color
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  RESPICARE LISTO PARA PRESENTACION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Web         : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API : http://localhost:4000/health" -ForegroundColor White
Write-Host "  AI Services : http://localhost:8000/health" -ForegroundColor White
Write-Host "  Mobile      : escanear QR de Expo Go" -ForegroundColor White
Write-Host ""
Write-Host "  Para detener: docker compose down" -ForegroundColor DarkGray
Write-Host ""