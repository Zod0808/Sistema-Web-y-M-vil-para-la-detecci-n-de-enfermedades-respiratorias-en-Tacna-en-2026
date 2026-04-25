@echo off
REM Script para ejecutar tests en Windows
REM Usa python -m pytest (no requiere pytest en PATH)

echo ====================================
echo   Ejecutando Tests - AI Services
echo ====================================
echo.

REM Configurar variables de entorno para tests
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0
set CACHE_ENABLED=false
set CIRCUIT_BREAKER_ENABLED=false

REM Verificar que pytest está disponible
echo Verificando pytest...
python -m pytest --version
if errorlevel 1 (
    echo.
    echo ERROR: pytest no esta instalado
    echo Instalando dependencias...
    pip install -r requirements-test.txt
    echo.
)

echo.
echo Ejecutando tests...
echo.

REM Ejecutar tests con coverage
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=term-missing --cov-report=xml:coverage.xml

echo.
echo ====================================
echo   Tests completados
echo ====================================
echo.
echo Para ver el coverage ejecuta:
echo   python ver_coverage.py
echo.
pause

