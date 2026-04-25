# Script de Organización de ai-services
# Este script organiza los archivos en la estructura correcta

Write-Host "📁 Organizando estructura de ai-services..." -ForegroundColor Cyan

# Crear directorios necesarios
$directories = @(
    "scripts/training",
    "scripts/analysis", 
    "scripts/validation",
    "data/datasets"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Creado: $dir" -ForegroundColor Green
    }
}

# Mover scripts de entrenamiento
$trainingScripts = @(
    "train_base_model.py",
    "train_xgboost_simple.py",
    "train_xgboost_model.py",
    "train_neural_network.py",
    "train_multimodal_models.py",
    "execute_full_retraining.py",
    "retrain_models_from_feedback.py"
)

foreach ($script in $trainingScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "scripts/training/" -Force
        Write-Host "📦 Movido: $script -> scripts/training/" -ForegroundColor Yellow
    }
}

# Mover scripts de generación de datasets
$datasetScripts = @(
    "generate_dataset.py",
    "generate_extended_dataset.py",
    "generate_multimodal_datasets.py"
)

foreach ($script in $datasetScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "scripts/training/" -Force
        Write-Host "📦 Movido: $script -> scripts/training/" -ForegroundColor Yellow
    }
}

# Mover scripts de análisis
$analysisScripts = @(
    "analyze_performance.py",
    "analyze_prediction_trends.py",
    "benchmark_endpoints.py"
)

foreach ($script in $analysisScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "scripts/analysis/" -Force
        Write-Host "📦 Movido: $script -> scripts/analysis/" -ForegroundColor Yellow
    }
}

# Mover scripts de validación
$validationScripts = @(
    "validate_models_performance.py",
    "validate_models_comparison.py",
    "validate_models_comparison_v2.py"
)

foreach ($script in $validationScripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "scripts/validation/" -Force
        Write-Host "📦 Movido: $script -> scripts/validation/" -ForegroundColor Yellow
    }
}

# Mover archivos CSV a data/datasets
$csvFiles = Get-ChildItem -Filter "*.csv" -Exclude "monitoring"
foreach ($csv in $csvFiles) {
    if (Test-Path $csv.FullName) {
        Move-Item -Path $csv.FullName -Destination "data/datasets/" -Force
        Write-Host "📦 Movido: $($csv.Name) -> data/datasets/" -ForegroundColor Yellow
    }
}

# Mover archivos de test sueltos a tests/
$testFiles = @(
    "test_ml_components.py",
    "test_enhanced_chatbot.py",
    "test_retraining_system.py"
)

foreach ($test in $testFiles) {
    if (Test-Path $test) {
        Move-Item -Path $test -Destination "tests/" -Force
        Write-Host "📦 Movido: $test -> tests/" -ForegroundColor Yellow
    }
}

# Mover archivos de backup
if (Test-Path "main.py.backup") {
    Remove-Item "main.py.backup" -Force
    Write-Host "🗑️  Eliminado: main.py.backup" -ForegroundColor Red
}

Write-Host "`n✅ Organización completada!" -ForegroundColor Green
Write-Host "`n📋 Estructura actualizada:" -ForegroundColor Cyan
Write-Host "  - scripts/training/ - Scripts de entrenamiento" -ForegroundColor White
Write-Host "  - scripts/analysis/ - Scripts de análisis" -ForegroundColor White
Write-Host "  - scripts/validation/ - Scripts de validación" -ForegroundColor White
Write-Host "  - data/datasets/ - Archivos CSV de datasets" -ForegroundColor White

