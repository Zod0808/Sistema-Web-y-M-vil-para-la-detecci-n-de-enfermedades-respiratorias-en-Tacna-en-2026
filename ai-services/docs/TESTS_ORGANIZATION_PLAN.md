# Plan de Organización de Tests

## Estructura Actual vs Estructura Deseada

### Archivos que DEBEN moverse desde la raíz de `tests/`:

#### 1. Tests de API Endpoints → `tests/api/`
- ✅ `test_main.py` → `tests/api/test_main_endpoints.py` (tests de endpoints de main.py)
- ✅ `test_advanced_ml_endpoints.py` → `tests/api/test_advanced_ml_endpoints.py`
- ✅ `test_advanced_nlp_endpoints.py` → `tests/api/test_advanced_nlp_endpoints.py` (ya existe, revisar si es duplicado)
- ✅ `test_automl_endpoints.py` → `tests/api/test_automl_endpoints.py`
- ✅ `test_rl_and_federated_endpoints.py` → `tests/api/test_rl_and_federated_endpoints.py`

#### 2. Tests de ML Models → `tests/ml_models/`
- ✅ `test_ml_components.py` → `tests/ml_models/test_ml_components.py`
- ✅ `test_model_predictions.py` → `tests/ml_models/test_model_predictions.py`
- ✅ `test_retraining_pipeline.py` → `tests/ml_models/test_retraining_pipeline.py`
- ✅ `test_retraining_system.py` → `tests/ml_models/test_retraining_system.py`
- ✅ `test_advanced_ml_smoke.py` → `tests/ml_models/test_advanced_ml_smoke.py`
- ✅ `test_advanced_ml_edge_cases.py` → `tests/ml_models/test_advanced_ml_edge_cases.py`

#### 3. Tests de Servicios → `tests/services/`
- ✅ `test_enhanced_chatbot.py` → `tests/services/test_enhanced_chatbot.py`

#### 4. Tests de Performance → `tests/performance/`
- ✅ `test_ensemble_performance.py` → `tests/performance/test_ensemble_performance.py`

#### 5. Tests de Integración/Adicionales → `tests/integration/`
- ✅ `test_additional_coverage.py` → `tests/integration/test_additional_coverage.py`

## Estructura Final Organizada

```
tests/
├── __init__.py
├── conftest.py
├── api/                                    # Tests de endpoints API
│   ├── test_main_endpoints.py             # ← MOVER desde raíz
│   ├── test_advanced_ml_endpoints.py      # ← MOVER desde raíz
│   ├── test_advanced_nlp_endpoints.py     # (ya existe, revisar duplicados)
│   ├── test_automl_endpoints.py           # ← MOVER desde raíz
│   ├── test_rl_and_federated_endpoints.py # ← MOVER desde raíz
│   ├── test_audio_analyzer_endpoints.py
│   ├── test_chat_analyzer_endpoints.py
│   ├── test_core_domains_support_endpoints.py
│   ├── test_health_endpoints.py
│   ├── test_medical_history_endpoints.py
│   ├── test_model_cache_endpoints.py
│   └── test_symptom_analyzer_endpoints.py
├── ml_models/                              # Tests de modelos ML
│   ├── test_ml_components.py              # ← MOVER desde raíz
│   ├── test_model_predictions.py          # ← MOVER desde raíz
│   ├── test_retraining_pipeline.py        # ← MOVER desde raíz
│   ├── test_retraining_system.py          # ← MOVER desde raíz
│   ├── test_advanced_ml_smoke.py          # ← MOVER desde raíz
│   ├── test_advanced_ml_edge_cases.py     # ← MOVER desde raíz
│   ├── test_analytics_models.py
│   ├── test_automl_respiratory_risk.py
│   ├── test_fl_secure_aggregation.py
│   ├── test_lazy_loader.py
│   ├── test_medical_nlp.py
│   ├── test_model_cache.py
│   ├── test_prediction_monitor.py
│   ├── test_risk_personalization.py
│   ├── test_rl_reminder_optimizer.py
│   └── test_xgboost_model.py
├── services/                               # Tests de servicios
│   ├── test_enhanced_chatbot.py           # ← MOVER desde raíz
│   ├── test_ai_service_manager.py
│   ├── test_audio_transcription_service.py
│   ├── test_core_domains_support.py
│   ├── test_enhanced_chatbot_service.py
│   ├── test_medical_history_service.py
│   └── test_symptom_analysis_service.py
├── performance/                            # Tests de performance
│   ├── test_ensemble_performance.py       # ← MOVER desde raíz
│   ├── test_benchmark.py
│   ├── test_endpoint_performance.py
│   ├── test_load_stress.py
│   ├── test_ml_model_performance.py
│   └── test_prediction_latency.py
├── integration/                            # Tests de integración
│   ├── test_additional_coverage.py        # ← MOVER desde raíz
│   ├── test_edge_cases.py
│   └── test_service_integration.py
├── core/                                   # Tests de módulos core
│   ├── test_cache.py
│   ├── test_cache_extended.py
│   ├── test_config.py
│   ├── test_database.py
│   └── test_pattern_config.py
├── patterns/                               # Tests de patrones
├── decorators/                             # Tests de decoradores
├── repositories/                           # Tests de repositorios
├── factories/                              # Tests de factories
├── circuit_breaker/                        # Tests de circuit breakers
├── strategies/                             # Tests de estrategias
├── utils/                                  # Tests de utilidades
├── security/                               # Tests de seguridad
└── mutation/                               # Tests de mutación
```

## Comandos para Organizar

### Opción 1: Script PowerShell (recomendado)
```powershell
cd ai-services
powershell -ExecutionPolicy Bypass -File scripts/organize_tests_structure.ps1
```

### Opción 2: Manualmente
Usar los comandos de movimiento proporcionados en el script.

## Notas Importantes

1. **Verificar duplicados**: Antes de mover, verificar si ya existen archivos con el mismo nombre en el destino.
2. **Actualizar imports**: Después de mover, algunos imports pueden necesitar ajuste.
3. **Mantener conftest.py**: Este archivo debe quedarse en la raíz de `tests/`.
4. **Mantener __init__.py**: Los archivos `__init__.py` deben quedarse en sus ubicaciones.

