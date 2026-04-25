# Script de Organización de Tests
# Este script organiza los archivos de test en sus carpetas correspondientes

Write-Host "📁 Organizando estructura de tests..." -ForegroundColor Cyan
Write-Host ""

# Mover test_main.py a tests/api/ (ya que testea endpoints de main.py)
if (Test-Path "tests/test_main.py") {
    Move-Item -Path "tests/test_main.py" -Destination "tests/api/test_main_endpoints.py" -Force
    Write-Host "✅ Movido: test_main.py -> tests/api/test_main_endpoints.py" -ForegroundColor Green
}

# Mover tests de endpoints ML a tests/api/
$apiEndpoints = @(
    @{File="test_advanced_ml_endpoints.py"; Dest="test_advanced_ml_endpoints.py"},
    @{File="test_advanced_nlp_endpoints.py"; Dest="test_advanced_nlp_endpoints.py"},
    @{File="test_automl_endpoints.py"; Dest="test_automl_endpoints.py"},
    @{File="test_rl_and_federated_endpoints.py"; Dest="test_rl_and_federated_endpoints.py"}
)

foreach ($item in $apiEndpoints) {
    if (Test-Path "tests/$($item.File)") {
        Move-Item -Path "tests/$($item.File)" -Destination "tests/api/$($item.Dest)" -Force
        Write-Host "✅ Movido: $($item.File) -> tests/api/$($item.Dest)" -ForegroundColor Green
    }
}

# Mover tests de ML a tests/ml_models/
$mlTests = @(
    @{File="test_ml_components.py"; Dest="test_ml_components.py"},
    @{File="test_model_predictions.py"; Dest="test_model_predictions.py"},
    @{File="test_retraining_pipeline.py"; Dest="test_retraining_pipeline.py"},
    @{File="test_retraining_system.py"; Dest="test_retraining_system.py"},
    @{File="test_advanced_ml_smoke.py"; Dest="test_advanced_ml_smoke.py"},
    @{File="test_advanced_ml_edge_cases.py"; Dest="test_advanced_ml_edge_cases.py"}
)

foreach ($item in $mlTests) {
    if (Test-Path "tests/$($item.File)") {
        Move-Item -Path "tests/$($item.File)" -Destination "tests/ml_models/$($item.Dest)" -Force
        Write-Host "✅ Movido: $($item.File) -> tests/ml_models/$($item.Dest)" -ForegroundColor Green
    }
}

# Mover tests de servicios a tests/services/
$serviceTests = @(
    @{File="test_enhanced_chatbot.py"; Dest="test_enhanced_chatbot.py"}
)

foreach ($item in $serviceTests) {
    if (Test-Path "tests/$($item.File)") {
        Move-Item -Path "tests/$($item.File)" -Destination "tests/services/$($item.Dest)" -Force
        Write-Host "✅ Movido: $($item.File) -> tests/services/$($item.Dest)" -ForegroundColor Green
    }
}

# Mover tests de performance a tests/performance/
$performanceTests = @(
    @{File="test_ensemble_performance.py"; Dest="test_ensemble_performance.py"}
)

foreach ($item in $performanceTests) {
    if (Test-Path "tests/$($item.File)") {
        Move-Item -Path "tests/$($item.File)" -Destination "tests/performance/$($item.Dest)" -Force
        Write-Host "✅ Movido: $($item.File) -> tests/performance/$($item.Dest)" -ForegroundColor Green
    }
}

# Mover tests adicionales/integración a tests/integration/
$integrationTests = @(
    @{File="test_additional_coverage.py"; Dest="test_additional_coverage.py"}
)

foreach ($item in $integrationTests) {
    if (Test-Path "tests/$($item.File)") {
        Move-Item -Path "tests/$($item.File)" -Destination "tests/integration/$($item.Dest)" -Force
        Write-Host "✅ Movido: $($item.File) -> tests/integration/$($item.Dest)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Organización completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen de estructura de tests:" -ForegroundColor Cyan
Write-Host "   tests/"
Write-Host "   ├── api/                    # Tests de endpoints de API"
Write-Host "   ├── core/                   # Tests de módulos core"
Write-Host "   ├── services/               # Tests de servicios"
Write-Host "   ├── ml_models/              # Tests de modelos ML"
Write-Host "   ├── api/                    # Tests de endpoints"
Write-Host "   ├── strategies/             # Tests de estrategias"
Write-Host "   ├── decorators/             # Tests de decoradores"
Write-Host "   ├── repositories/           # Tests de repositorios"
Write-Host "   ├── factories/              # Tests de factories"
Write-Host "   ├── circuit_breaker/        # Tests de circuit breakers"
Write-Host "   ├── patterns/               # Tests de patrones"
Write-Host "   ├── integration/            # Tests de integración"
Write-Host "   ├── performance/            # Tests de performance"
Write-Host "   ├── security/               # Tests de seguridad"
Write-Host "   └── utils/                  # Tests de utilidades"
Write-Host ""

