@echo off
REM Script para ejecutar pruebas en AI Services - Windows
REM Uso: run_tests.bat [opcion]

echo.
echo ====================================
echo   AI Services - Test Runner
echo ====================================
echo.

if "%1"=="" goto menu
if "%1"=="all" goto all
if "%1"=="quick" goto quick
if "%1"=="coverage" goto coverage
if "%1"=="patterns" goto patterns
if "%1"=="services" goto services
if "%1"=="strategy" goto strategy
if "%1"=="factory" goto factory
if "%1"=="circuit" goto circuit
if "%1"=="repository" goto repository
if "%1"=="decorator" goto decorator
if "%1"=="report" goto report
if "%1"=="parallel" goto parallel
if "%1"=="failed" goto failed
goto help

:menu
echo Seleccione una opcion:
echo.
echo 1. Ejecutar TODAS las pruebas
echo 2. Pruebas rapidas (sin cobertura)
echo 3. Pruebas con reporte de cobertura
echo 4. Pruebas de patrones
echo 5. Pruebas de servicios
echo 6. Pruebas de estrategias
echo 7. Pruebas de factories
echo 8. Pruebas de circuit breakers
echo 9. Pruebas de repositories
echo 10. Pruebas de decorators
echo 11. Generar reporte HTML completo
echo 12. Ejecutar en paralelo
echo 13. Re-ejecutar pruebas fallidas
echo 14. Salir
echo.
set /p option="Ingrese el numero de opcion: "

if "%option%"=="1" goto all
if "%option%"=="2" goto quick
if "%option%"=="3" goto coverage
if "%option%"=="4" goto patterns
if "%option%"=="5" goto services
if "%option%"=="6" goto strategy
if "%option%"=="7" goto factory
if "%option%"=="8" goto circuit
if "%option%"=="9" goto repository
if "%option%"=="10" goto decorator
if "%option%"=="11" goto report
if "%option%"=="12" goto parallel
if "%option%"=="13" goto failed
if "%option%"=="14" goto end
goto menu

:all
echo.
echo [*] Ejecutando TODAS las pruebas...
pytest -v
goto end

:quick
echo.
echo [*] Ejecutando pruebas rapidas...
pytest -q
goto end

:coverage
echo.
echo [*] Ejecutando pruebas con cobertura...
pytest --cov=. --cov-report=term-missing --cov-report=html
echo.
echo [+] Reporte HTML generado en: htmlcov\index.html
goto end

:patterns
echo.
echo [*] Ejecutando pruebas de patrones...
pytest tests/patterns/ -v
goto end

:services
echo.
echo [*] Ejecutando pruebas de servicios...
pytest tests/services/ -v
goto end

:strategy
echo.
echo [*] Ejecutando pruebas de Strategy Pattern...
pytest tests/patterns/test_strategy_pattern.py -v
goto end

:factory
echo.
echo [*] Ejecutando pruebas de Factory Pattern...
pytest tests/patterns/test_factory_pattern.py -v
goto end

:circuit
echo.
echo [*] Ejecutando pruebas de Circuit Breaker Pattern...
pytest tests/patterns/test_circuit_breaker_pattern.py -v
goto end

:repository
echo.
echo [*] Ejecutando pruebas de Repository Pattern...
pytest tests/patterns/test_repository_pattern.py -v
goto end

:decorator
echo.
echo [*] Ejecutando pruebas de Decorator Pattern...
pytest tests/patterns/test_decorator_pattern.py -v
goto end

:report
echo.
echo [*] Generando reporte completo...
pytest --cov=. --cov-report=html --html=test-report.html --self-contained-html -v
echo.
echo [+] Reportes generados:
echo     - Cobertura: htmlcov\index.html
echo     - Resultados: test-report.html
start htmlcov\index.html
goto end

:parallel
echo.
echo [*] Ejecutando pruebas en paralelo...
pytest -n auto -v
goto end

:failed
echo.
echo [*] Re-ejecutando pruebas que fallaron...
pytest --lf -v
goto end

:help
echo.
echo Uso: run_tests.bat [opcion]
echo.
echo Opciones disponibles:
echo   all         - Ejecutar todas las pruebas
echo   quick       - Pruebas rapidas sin cobertura
echo   coverage    - Pruebas con reporte de cobertura
echo   patterns    - Solo pruebas de patrones
echo   services    - Solo pruebas de servicios
echo   strategy    - Solo Strategy Pattern
echo   factory     - Solo Factory Pattern
echo   circuit     - Solo Circuit Breaker Pattern
echo   repository  - Solo Repository Pattern
echo   decorator   - Solo Decorator Pattern
echo   report      - Generar reporte HTML completo
echo   parallel    - Ejecutar en paralelo
echo   failed      - Re-ejecutar pruebas fallidas
echo.
echo Ejemplo: run_tests.bat coverage
echo.
goto end

:end
echo.
echo ====================================

