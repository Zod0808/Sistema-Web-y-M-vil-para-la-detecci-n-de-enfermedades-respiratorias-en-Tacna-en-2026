# Solución: pytest no es reconocido como comando

## ✅ Solución Confirmada

**El problema:** `pytest` no está en el PATH de Windows.

**La solución:** Usar `python -m pytest` en su lugar.

## 📋 Comandos Correctos

### Ejecutar Tests

```cmd
REM En lugar de: pytest tests/test_main.py -v
REM Usa:
python -m pytest tests/test_main.py -v
```

### Ver Coverage

```cmd
REM Generar coverage
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=xml:coverage.xml

REM Ver coverage
python ver_coverage.py
```

### Ejecutar Tests Específicos

```cmd
REM Todos los tests
python -m pytest

REM Un archivo específico
python -m pytest tests/test_main.py -v

REM Una carpeta específica
python -m pytest tests/core/ -v

REM Con coverage
python -m pytest tests/test_main.py --cov=./ --cov-report=term-missing
```

## 🚀 Script Rápido

Ejecuta el script `ejecutar_tests.bat` que crea todo automáticamente:

```cmd
ejecutar_tests.bat
```

## 📝 Variables de Entorno

Antes de ejecutar tests, configura estas variables:

```cmd
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0
set CACHE_ENABLED=false
set CIRCUIT_BREAKER_ENABLED=false
```

O usa el script `ejecutar_tests.bat` que las configura automáticamente.

## ⚠️ Nota sobre el Error de Torch

El error de torch DLL es normal en Windows. Algunos tests intentan cargar dependencias pesadas.

**Solución rápida:** Ejecuta tests excluyendo los problemáticos:

```cmd
python -m pytest --ignore=tests/api/test_advanced_ml_endpoints.py --ignore=tests/ml_models/test_advanced_ml_smoke.py -v
```

O usa el script seguro:
```cmd
ejecutar_tests_seguro.bat
```

Para más detalles, ver: `SOLUCION_ERROR_TORCH.md`

## 📚 Documentación

- `COMANDOS_PYTEST.md` - Guía completa de comandos pytest
- `docs/INSTALACION_PYTEST.md` - Guía de instalación
- `COMANDO_COVERAGE.md` - Comandos para ver coverage

