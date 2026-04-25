@echo off
REM Script simple para ejecutar tests en Windows
REM Usa python -m pytest en lugar de pytest directamente

echo ====================================
echo   Ejecutando Tests - AI Services
echo ====================================
echo.

REM Configurar variables de entorno
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0
set CACHE_ENABLED=false
set CIRCUIT_BREAKER_ENABLED=false

REM Ejecutar tests con coverage
echo Ejecutando tests con coverage...
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=term-missing --cov-report=xml:coverage.xml

echo.
echo ====================================
echo   Tests completados
echo ====================================
echo.
echo Para ver el coverage:
echo   python ver_coverage.py
echo.
pause

