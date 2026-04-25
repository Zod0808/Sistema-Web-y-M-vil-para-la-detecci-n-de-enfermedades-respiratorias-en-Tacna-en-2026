# Guía Rápida: Ejecutar Tests en Windows

## ❌ Problema 1: `pytest` no es reconocido

**Error:**
```
'pytest' no se reconoce como un comando interno o externo
```

**Solución:**
```cmd
REM ❌ NO uses:
pytest

REM ✅ SÍ usa:
python -m pytest
```

## ❌ Problema 2: Error de Torch DLL

**Error:**
```
ERROR tests/api/test_advanced_ml_endpoints.py - OSError: [WinError 1114]
Error loading torch DLL
```

**Solución:** Ejecuta tests excluyendo los problemáticos:

```cmd
ejecutar_tests_seguro.bat
```

O manualmente:
```cmd
python -m pytest --ignore=tests/api/test_advanced_ml_endpoints.py --ignore=tests/ml_models/test_advanced_ml_smoke.py -v
```

## ✅ Comandos Recomendados

### Opción 1: Script Automático (Más Fácil)

```cmd
ejecutar_tests_seguro.bat
```

Este script:
- ✅ Configura variables de entorno
- ✅ Excluye tests problemáticos
- ✅ Genera reporte de coverage

### Opción 2: Manual

```cmd
REM Configurar variables
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0

REM Ejecutar tests seguros
python -m pytest tests/core/ tests/patterns/ tests/services/ -v

REM O con coverage
python -m pytest --cov=./ --cov-report=xml:coverage.xml --ignore=tests/api/test_advanced_ml_endpoints.py
```

### Opción 3: Ver Coverage

```cmd
REM Generar coverage (evitando tests problemáticos)
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml --ignore=tests/api/test_advanced_ml_endpoints.py --ignore=tests/ml_models/test_advanced_ml_smoke.py

REM Ver coverage
python ver_coverage.py
```

## 📋 Resumen

| Comando | Descripción |
|---------|-------------|
| `python -m pytest` | ✅ Correcto - siempre funciona |
| `pytest` | ❌ No funciona en Windows |
| `ejecutar_tests_seguro.bat` | ✅ Script automático seguro |
| `python ver_coverage.py` | ✅ Ver coverage actual |

## 🔗 Documentación Completa

- `SOLUCION_PYTEST.md` - Solución completa para pytest
- `SOLUCION_ERROR_TORCH.md` - Solución para error de torch
- `COMANDO_COVERAGE.md` - Comandos de coverage

