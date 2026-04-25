# Solución: Error de Torch DLL en Windows

## ❌ Error Común

Cuando ejecutas tests, puedes ver este error:

```
ERROR tests/api/test_advanced_ml_endpoints.py - OSError: [WinError 1114] 
Error en una rutina de inicialización de biblioteca de vínculos dinámicos (DLL). 
Error loading "C:\Users\User\AppData\Roaming\Python\Python311\site-packages\torch\lib\c10.dll"
```

## 🔍 Causa

Algunos tests intentan importar `main.py`, que a su vez carga dependencias pesadas como `torch`, causando problemas con DLLs en Windows.

## ✅ Soluciones

### Solución 1: Ejecutar Tests Seguros (Recomendado)

Usa el script que excluye tests problemáticos:

```cmd
ejecutar_tests_seguro.bat
```

O manualmente:

```cmd
python -m pytest --ignore=tests/api/test_advanced_ml_endpoints.py --ignore=tests/ml_models/test_advanced_ml_smoke.py -v
```

### Solución 2: Ejecutar Solo Tests Específicos

Ejecuta solo las carpetas de tests que funcionan bien:

```cmd
REM Tests de core
python -m pytest tests/core/ -v

REM Tests de patterns
python -m pytest tests/patterns/ -v

REM Tests de services
python -m pytest tests/services/ -v

REM Tests de api (excepto los problemáticos)
python -m pytest tests/api/ --ignore=tests/api/test_advanced_ml_endpoints.py -v
```

### Solución 3: Ejecutar en WSL o Docker

Los tests funcionan mejor en Linux:

```bash
# En WSL
wsl
cd /mnt/c/Users/User/Desktop/construccionI/proyecto-final-sistema_enfermedades_respiratorias/ai-services
export TESTING=true
export AI_RATE_LIMIT_ENABLED=0
python -m pytest -v
```

### Solución 4: Usar CI/CD

Los tests se ejecutan automáticamente en GitHub Actions (Linux) sin problemas.

## 📋 Tests Problemáticos en Windows

Los siguientes tests pueden causar problemas con torch:

- `tests/api/test_advanced_ml_endpoints.py`
- `tests/ml_models/test_advanced_ml_smoke.py`
- `tests/ml_models/test_advanced_ml_edge_cases.py`
- `tests/strategies/test_local_model_strategy.py` (si importa torch directamente)

## 🔧 Comandos Recomendados

### Ver Coverage Sin Tests Problemáticos

```cmd
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml --ignore=tests/api/test_advanced_ml_endpoints.py --ignore=tests/ml_models/test_advanced_ml_smoke.py

python ver_coverage.py
```

### Ejecutar Tests por Categoría

```cmd
REM Solo tests que funcionan bien
python -m pytest tests/core/ tests/patterns/ tests/services/ tests/api/test_health_endpoints.py -v
```

## 📝 Nota

El error de torch DLL es un problema conocido en Windows. Los tests funcionan correctamente en:
- ✅ Linux/WSL
- ✅ Docker
- ✅ CI/CD (GitHub Actions)

En Windows, ejecuta solo los tests que no requieren dependencias pesadas, o usa WSL.

## 🎯 Resumen

**Para ejecutar tests en Windows:**
1. ✅ Usa `python -m pytest` (no solo `pytest`)
2. ✅ Excluye tests problemáticos con `--ignore`
3. ✅ O ejecuta solo carpetas específicas
4. ✅ O usa WSL/Docker para todos los tests

