# Comandos pytest - Solución para Windows

## ❌ Problema Común

En Windows, cuando ejecutas:
```bash
pytest
```

Puedes recibir el error:
```
'pytest' no se reconoce como un comando interno o externo
```

## ✅ Solución: Usar `python -m pytest`

En lugar de `pytest`, usa:

```bash
python -m pytest
```

**Esto siempre funciona** porque usa Python para ejecutar pytest como módulo.

## 📋 Comandos Actualizados

### Ver Coverage

```bash
# Usar el script (recomendado)
python ver_coverage.py

# Generar coverage manualmente
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

# Tests de una carpeta específica
python -m pytest tests/core/

# Un test específico
python -m pytest tests/core/test_config.py::TestSettings

# Tests con variables de entorno
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0
python -m pytest --cov=./ --cov-report=xml:coverage.xml
```

## 🔧 Instalar pytest (si es necesario)

Si pytest no está instalado:

```bash
# Instalar pytest
pip install pytest

# O instalar todas las dependencias de test
pip install -r requirements-test.txt
```

Verificar instalación:
```bash
python -m pytest --version
```

## 📝 Resumen

**❌ NO uses:**
```bash
pytest  # Puede no funcionar en Windows
```

**✅ SÍ usa:**
```bash
python -m pytest  # Siempre funciona
```

## 🎯 Ejemplos Completos

### Windows CMD

```cmd
cd ai-services
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0
set CACHE_ENABLED=false
set CIRCUIT_BREAKER_ENABLED=false
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml
```

### Windows PowerShell

```powershell
cd ai-services
$env:TESTING="true"
$env:AI_RATE_LIMIT_ENABLED="0"
$env:CACHE_ENABLED="false"
$env:CIRCUIT_BREAKER_ENABLED="false"
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml
```

### Linux/WSL

```bash
cd ai-services
export TESTING=true
export AI_RATE_LIMIT_ENABLED=0
export CACHE_ENABLED=false
export CIRCUIT_BREAKER_ENABLED=false
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml
```

