# ai-services — Historial de correcciones

Consolidado de 10 notas dispersas (`RESUMEN_*.md`, `SOLUCION_*.md`, `TESTS_*.md`, `TEST_RESULTS_SUMMARY.md`) que vivían en la raíz de `ai-services/`. Los archivos originales fueron eliminados el 2026-07-15; este documento preserva su información clave. Fuente autoritativa para detalle línea a línea: `git log`.

## Cronología

### 2025-12 — Correcciones masivas pre-producción
- **Qué se rompía**: 436 problemas (372 fallos + 64 errores) afectando rate limiting, mocks de OpenAI/Whisper/SHAP, factories, estrategias y servicios.
- **Cómo se arregló**: Deshabilitación de rate limiting en tests (`TESTING=true`), mocks globales en `conftest.py`, correcciones de firma/tipos en 16 archivos.
- **Archivos tocados**: `tests/conftest.py`, `tests/patterns/*`, `tests/services/*`, `tests/factories/*`, `tests/repositories/*`, `tests/circuit_breaker/*`, `main.py`.

### 2025-11 — Error torch DLL en Windows
- **Qué se rompía**: Todos los tests que importaban `main.py` fallaban con `OSError (WinError 1114)` en `torch.lib.c10.dll`.
- **Cómo se arregló**: Mock pre-importación de torch en `conftest.py` y `test_main.py`; try/except wrapping; `pytest.skip()` fallback.
- **Archivos tocados**: `tests/test_main.py`, `tests/api/test_*.py`, `tests/strategies/test_openai_strategy.py`, `.github/workflows/`.

### 2025-10 — test_prediction_monitor & test_main mismatches
- **Qué se rompía**: `test_prediction_monitor` esperaba clave `error` inexistente; `generate_response(query, analysis)` invertía el orden.
- **Cómo se arregló**: Corregida la estructura esperada a `get_metrics()["summary"]["total_predictions"]`; invertidos los parámetros en todas las llamadas.
- **Archivos tocados**: `ml_tests/test_fairness_and_drift.py`, `tests/test_main.py`, `ml_models/prediction_monitor.py`.

### 2025-09 — Model Cache & Repository Pattern API mismatches
- **Qué se rompía**: Tests usaban `add_model()`/`get_model()` (no existen); `add_model()` esperado vs `get_or_load()` real; `soft_delete()`/`create_with_audit()` no implementados.
- **Cómo se arregló**: Actualizados los tests para usar `get_or_load(loader_func)` real; removidos métodos fantasma; ajustado `find_all()` async/await.
- **Archivos tocados**: `tests/ml_models/test_model_cache.py`, `tests/patterns/test_repository_pattern.py`.

### 2025-09 — Pytest command PATH missing
- **Qué se rompía**: `pytest` no reconocido; usuarios intentaban `pytest tests/` sin `python -m`.
- **Cómo se arregló**: Documentado `python -m pytest` como comando correcto; creado `ejecutar_tests.bat` con variables de entorno.

## Categorías de bugs recurrentes

- **Torch / imports pesados**: torch DLL carga en Windows al importar `main.py`. Resuelto con mock preventivo + try/except. Sigue problemático en: `test_fl_secure_aggregation.py`, `test_lazy_loader.py`, `test_local_model_strategy.py` (excluir en Windows o usar WSL/Docker).
- **Pytest / CLI**: `pytest` no está en PATH en Windows. Resuelto con `python -m pytest`. Los usuarios siguen olvidándolo si no usan el script.
- **OpenAI strategy**: Cadena de imports (`strategies/__init__` → `LocalModelStrategy` → torch) causaba fallos indirectos. Resuelto con mock global pre-importación antes de tocar `strategies`.
- **Tests problemáticos aún abiertos**: XGBoost data validation (muestras por clase insuficientes), RL Reminder Optimizer (parsing `"08:00"`), Circuit Breaker (mocks de métodos privados), Decorators (async/sync mismatch). Baja prioridad — no bloquean.

## Estado a fecha de consolidación

- **Tests pasando**: ~398 tras las correcciones.
- **Cobertura**: `49.37%` (real, medida — ver `[[project-coverage-real]]` en memory). Nota histórica: durante el hotfix de 2025-12 se reportó 51.86%, pero la métrica autoritativa actual es 49.37%. Meta ≥60%.
- **Deuda pendiente**:
  - Excluir del suite: `test_fl_secure_aggregation.py`, `test_lazy_loader.py`, `test_strategy_pattern.py`, `test_rule_based_strategy.py` (torch), `test_additional_coverage.py` (FileNotFoundError).
  - XGBoost tests requieren datos balanceados (bajo impacto).
  - RL / Risk / Decorator tests parcialmente corregidos.
- **Ambiente recomendado**: CI/CD (Linux) evita el problema de torch DLL; local usar WSL o Docker; Windows desktop solo para desarrollo (los tests problemáticos se saltan con skip).

## Notas operacionales

- **Script seguro**: `ejecutar_tests_seguro.bat` excluye todos los tests problemáticos (torch, FileNotFoundError).
- **Variables de entorno críticas**: `TESTING=true`, `AI_RATE_LIMIT_ENABLED=0`, `CACHE_ENABLED=false`, `CIRCUIT_BREAKER_ENABLED=false`.
- **CI/CD verde**: GitHub Actions ejecuta sin problemas gracias al mock global de torch + entorno Linux.
