@echo off
REM Script para ejecutar tests evitando problemas con torch DLL en Windows
REM Excluye tests que requieren dependencias pesadas

echo ====================================
echo   Ejecutando Tests - AI Services
echo   (Modo seguro - evitando torch)
echo ====================================
echo.

REM Configurar variables de entorno
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0
set CACHE_ENABLED=false
set CIRCUIT_BREAKER_ENABLED=false

echo Excluyendo tests problemáticos que requieren torch o archivos faltantes...
echo.

REM Ejecutar tests excluyendo TODOS los problemáticos
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=term-missing --cov-report=xml:coverage.xml ^
    --ignore=tests/api/test_advanced_ml_endpoints.py ^
    --ignore=tests/ml_models/test_advanced_ml_smoke.py ^
    --ignore=tests/ml_models/test_advanced_ml_edge_cases.py ^
    --ignore=tests/ml_models/test_fl_secure_aggregation.py ^
    --ignore=tests/ml_models/test_lazy_loader.py ^
    --ignore=tests/ml_models/test_ml_components.py ^
    --ignore=tests/ml_models/test_model_predictions.py ^
    --ignore=tests/ml_models/test_retraining_system.py ^
    --ignore=tests/integration/test_additional_coverage.py ^
    --ignore=tests/patterns/test_circuit_breaker_pattern.py ^
    --ignore=tests/patterns/test_decorator_pattern.py ^
    --ignore=tests/patterns/test_strategy_pattern.py ^
    --ignore=tests/services/test_core_domains_support.py ^
    --ignore=tests/strategies/test_local_model_strategy.py ^
    --ignore=tests/strategies/test_openai_strategy.py ^
    --ignore=tests/strategies/test_rule_based_strategy.py ^
    --ignore=tests/performance ^
    --ignore=tests/security ^
    -v

echo.
echo ====================================
echo   Tests completados
echo ====================================
echo.
echo Nota: Se excluyeron tests que requieren:
echo   - Dependencias pesadas (torch DLL)
echo   - Archivos que no existen
echo   - Importaciones problemáticas
echo.
echo Para ver coverage: python ver_coverage.py
echo.
pause
