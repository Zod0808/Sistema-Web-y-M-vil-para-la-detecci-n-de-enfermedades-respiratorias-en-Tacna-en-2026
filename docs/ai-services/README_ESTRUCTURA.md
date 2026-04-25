# 📁 Estructura Organizada de ai-services

Este documento describe la estructura organizada del directorio `ai-services` después de la reorganización.

## 📂 Estructura de Directorios

```
ai-services/
├── api/                          # API Routes (FastAPI)
│   └── routes/                  # Endpoints de la API
│       ├── audio_analyzer.py    # ⭐ Análisis de audio/voz
│       ├── advanced_ml.py       # ⭐ Análisis de imágenes
│       ├── chat_analyzer.py
│       ├── symptom_ml_analyzer.py
│       └── ...
│
├── core/                         # Núcleo del sistema
│   ├── cache.py
│   ├── config.py
│   ├── database.py
│   └── pattern_config.py
│
├── data/                         # Datos y datasets
│   ├── datasets/                # ⭐ Datasets CSV (sintéticos y reales)
│   │   ├── synthetic_dataset.csv
│   │   ├── synthetic_dataset_extended.csv
│   │   ├── synthetic_image_dataset.csv
│   │   ├── synthetic_cough_dataset.csv
│   │   └── ...
│   ├── samples/                  # Datos de ejemplo
│   ├── disease_parser.py
│   ├── medical_data.py
│   └── respiratory_diseases_comprehensive.py
│
├── ml_models/                    # Modelos de Machine Learning
│   ├── synthetic_dataset_generator.py
│   ├── synthetic_image_dataset_generator.py  # ⭐ Generador de datasets de imágenes
│   ├── synthetic_cough_dataset_generator.py   # ⭐ Generador de datasets de tos
│   ├── random_forest_model.py
│   ├── xgboost_model.py
│   ├── neural_network_model.py
│   ├── ensemble_predictor.py
│   ├── hybrid_system.py
│   └── ...
│
├── services/                     # Servicios de negocio
│   ├── audio_transcription_service.py  # ⭐ Servicio de transcripción (Whisper)
│   ├── cough_analysis_service.py        # ⭐ Servicio de análisis de tos
│   ├── ai_service_manager.py
│   ├── symptom_analysis_service.py
│   └── ...
│
├── scripts/                      # ⭐ Scripts organizados
│   ├── training/                # Scripts de entrenamiento
│   │   ├── train_base_model.py
│   │   ├── train_xgboost_simple.py
│   │   ├── train_xgboost_model.py
│   │   ├── train_neural_network.py
│   │   ├── train_multimodal_models.py  # ⭐ Entrenamiento multimodal
│   │   ├── generate_dataset.py
│   │   ├── generate_extended_dataset.py
│   │   ├── generate_multimodal_datasets.py  # ⭐ Generación multimodal
│   │   ├── execute_full_retraining.py
│   │   └── retrain_models_from_feedback.py
│   ├── analysis/                # Scripts de análisis
│   │   ├── analyze_performance.py
│   │   ├── analyze_prediction_trends.py
│   │   └── benchmark_endpoints.py
│   ├── validation/              # Scripts de validación
│   │   ├── validate_models_performance.py
│   │   ├── validate_models_comparison.py
│   │   └── validate_models_comparison_v2.py
│   ├── seed_ml_predictions.py
│   └── organize_structure.ps1    # Script de organización
│
├── tests/                        # Tests
│   ├── test_ml_components.py     # Movido desde raíz
│   ├── test_enhanced_chatbot.py  # Movido desde raíz
│   ├── test_retraining_system.py # Movido desde raíz
│   ├── core/
│   ├── ml_models/
│   ├── services/
│   └── ...
│
├── models/                       # Modelos entrenados (.pkl)
│
├── monitoring/                   # Monitoreo y logs
│
├── logs/                         # Logs de la aplicación
│
├── cache/                        # Caché temporal
│
├── tmp/                          # Archivos temporales
│
├── main.py                       # Punto de entrada principal
├── shap_explainer.py             # Explicador SHAP
│
├── requirements*.txt              # Dependencias
├── dockerfile                    # Dockerfile desarrollo
├── Dockerfile.prod               # Dockerfile producción
│
└── *.md                          # Documentación
```

## 🔄 Cambios Realizados

### Archivos Movidos

#### Scripts de Entrenamiento → `scripts/training/`
- ✅ `train_base_model.py`
- ✅ `train_xgboost_simple.py`
- ✅ `train_xgboost_model.py`
- ✅ `train_neural_network.py`
- ✅ `train_multimodal_models.py` ⭐
- ✅ `generate_dataset.py`
- ✅ `generate_extended_dataset.py`
- ✅ `generate_multimodal_datasets.py` ⭐
- ✅ `execute_full_retraining.py`
- ✅ `retrain_models_from_feedback.py`

#### Scripts de Análisis → `scripts/analysis/`
- ✅ `analyze_performance.py`
- ✅ `analyze_prediction_trends.py`
- ✅ `benchmark_endpoints.py`

#### Scripts de Validación → `scripts/validation/`
- ✅ `validate_models_performance.py`
- ✅ `validate_models_comparison.py`
- ✅ `validate_models_comparison_v2.py`

#### Datasets CSV → `data/datasets/`
- ✅ `synthetic_dataset.csv`
- ✅ `synthetic_dataset_extended.csv`
- ✅ `augmented_dataset_*.csv`
- ✅ `test_augmented_dataset.csv`
- ✅ `model_validation_results.csv`

#### Tests Sueltos → `tests/`
- ✅ `test_ml_components.py`
- ✅ `test_enhanced_chatbot.py`
- ✅ `test_retraining_system.py`

#### Archivos Eliminados
- ✅ `main.py.backup` (archivo de backup innecesario)

## 📝 Uso de Scripts Reorganizados

### Entrenamiento de Modelos

```bash
# Desde la raíz de ai-services
python scripts/training/train_base_model.py
python scripts/training/train_multimodal_models.py
python scripts/training/generate_multimodal_datasets.py --all
```

### Análisis y Benchmarking

```bash
python scripts/analysis/analyze_performance.py
python scripts/analysis/benchmark_endpoints.py
```

### Validación de Modelos

```bash
python scripts/validation/validate_models_performance.py
python scripts/validation/validate_models_comparison_v2.py
```

## 🎯 Beneficios de la Organización

1. **Estructura Clara**: Fácil encontrar archivos por tipo
2. **Separación de Responsabilidades**: Scripts organizados por función
3. **Mantenibilidad**: Más fácil mantener y actualizar
4. **Escalabilidad**: Fácil agregar nuevos scripts en la ubicación correcta
5. **Documentación**: Estructura documentada y clara

## 📋 Notas Importantes

- Los imports en los scripts pueden necesitar actualización si referencian rutas relativas
- Los scripts en `scripts/training/` pueden necesitar ajustes de rutas para acceder a `ml_models/`
- Los datasets en `data/datasets/` pueden necesitar rutas actualizadas en los scripts

## 🔧 Actualizar Imports

Si algún script tiene problemas de imports después de moverlo, actualizar las rutas:

```python
# Antes (si estaba en raíz)
from ml_models.synthetic_dataset_generator import SyntheticDatasetGenerator

# Después (desde scripts/training/)
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from ml_models.synthetic_dataset_generator import SyntheticDatasetGenerator
```

---

**Última actualización:** Noviembre 2024  
**Mantenido por:** Equipo de Desarrollo RespiCare Tacna

