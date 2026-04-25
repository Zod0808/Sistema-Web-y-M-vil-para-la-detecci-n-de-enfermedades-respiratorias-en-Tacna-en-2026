# Solución: pytest no es reconocido como comando

## Problema

Cuando ejecutas `pytest` en la terminal, recibes un error como:
```
'pytest' no se reconoce como un comando interno o externo,
programa por lotes o archivo por comandos.
```

## Soluciones

### Solución 1: Usar pytest como módulo de Python (Recomendado)

En lugar de ejecutar `pytest` directamente, usa:

```bash
python -m pytest
```

**Ventajas:**
- ✅ Funciona siempre que Python esté instalado
- ✅ Usa la versión correcta de pytest para el entorno
- ✅ No requiere agregar nada al PATH

**Ejemplos:**
```bash
# Ejecutar todos los tests
python -m pytest

# Ejecutar tests con coverage
python -m pytest --cov=./ --cov-report=xml:coverage.xml

# Ejecutar tests de una carpeta específica
python -m pytest tests/core/

# Ejecutar un test específico
python -m pytest tests/core/test_config.py
```

### Solución 2: Instalar pytest en el entorno

Si quieres usar `pytest` directamente, instálalo:

```bash
# Instalar pytest
pip install pytest

# O instalar todas las dependencias de test
pip install -r requirements-test.txt
```

**Verificar instalación:**
```bash
python -m pytest --version
```

### Solución 3: Instalar pytest globalmente (No recomendado)

Si realmente necesitas usar `pytest` directamente:

```bash
pip install --user pytest
```

Luego agrega el directorio de Scripts de Python al PATH:
- Windows: `C:\Users\TuUsuario\AppData\Roaming\Python\Python311\Scripts`
- O usa: `python -m pip install --user pytest` y sigue las instrucciones

## Comandos Actualizados

### Ver Coverage

```bash
# Opción 1: Usar el script (recomendado)
python ver_coverage.py

# Opción 2: Generar coverage manualmente
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml
```

### Ejecutar Tests

```bash
# Todos los tests
python -m pytest

# Tests con verbose
python -m pytest -v

# Tests con coverage
python -m pytest --cov=./ --cov-report=term-missing

# Tests de una carpeta
python -m pytest tests/core/

# Un test específico
python -m pytest tests/core/test_config.py::TestSettings
```

### Verificar que pytest está disponible

```bash
# Verificar versión
python -m pytest --version

# Verificar instalación
pip list | findstr pytest
```

## Variables de Entorno para Tests

Antes de ejecutar tests, configura estas variables:

**Windows PowerShell:**
```powershell
$env:TESTING="true"
$env:AI_RATE_LIMIT_ENABLED="0"
$env:CACHE_ENABLED="false"
$env:CIRCUIT_BREAKER_ENABLED="false"
python -m pytest --cov=./ --cov-report=xml:coverage.xml
```

**Windows CMD:**
```cmd
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0
set CACHE_ENABLED=false
set CIRCUIT_BREAKER_ENABLED=false
python -m pytest --cov=./ --cov-report=xml:coverage.xml
```

**Linux/WSL:**
```bash
export TESTING=true
export AI_RATE_LIMIT_ENABLED=0
export CACHE_ENABLED=false
export CIRCUIT_BREAKER_ENABLED=false
python -m pytest --cov=./ --cov-report=xml:coverage.xml
```

## Scripts de Ayuda

### Script para ejecutar tests fácilmente

Crea un archivo `run_tests.bat` (Windows):

```batch
@echo off
echo Ejecutando tests con coverage...
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0
set CACHE_ENABLED=false
set CIRCUIT_BREAKER_ENABLED=false
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml --cov-report=term-missing
pause
```

O `run_tests.sh` (Linux/WSL):

```bash
#!/bin/bash
echo "Ejecutando tests con coverage..."
export TESTING=true
export AI_RATE_LIMIT_ENABLED=0
export CACHE_ENABLED=false
export CIRCUIT_BREAKER_ENABLED=false
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml --cov-report=term-missing
```

## Resumen

**✅ Solución Recomendada:**
```bash
python -m pytest
```

**📝 En lugar de:**
```bash
pytest  # ❌ Puede no funcionar
```

## Verificar Instalación Completa

Para verificar que todo está instalado correctamente:

```bash
python -m pip install -r requirements-test.txt
python -m pytest --version
python -m pytest tests/ --collect-only  # Ver todos los tests sin ejecutarlos
```

