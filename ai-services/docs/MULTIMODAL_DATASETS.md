# Datasets Sintéticos Multimodales para Mejorar el Chatbot

Este documento describe los generadores de datasets sintéticos para análisis de imágenes médicas y análisis de tos, diseñados para mejorar las respuestas del chatbot.

## 📋 Descripción

Los datasets sintéticos generan datos de entrenamiento realistas para modelos ML que mejoran la precisión y calidad de las respuestas del chatbot cuando analiza imágenes médicas o audio de tos.

## 🖼️ Dataset de Imágenes Médicas

### Generación

```bash
python generate_multimodal_datasets.py --images
```

O específicamente:

```python
from ml_models.synthetic_image_dataset_generator import SyntheticImageDatasetGenerator

generator = SyntheticImageDatasetGenerator()
df = generator.generate_dataset(
    samples_per_type={
        'chest_xray': 1000,
        'ct_scan': 800,
        'spirometry': 600,
        'oximetry': 500,
        'expectoration': 400,
        'skin_rash': 300,
        'cyanosis': 200,
        'other_medical_image': 200
    },
    output_file='synthetic_image_dataset.csv'
)
```

### Estructura del Dataset

Cada caso incluye:
- `image_type`: Tipo de imagen (chest_xray, ct_scan, etc.)
- `condition`: Condición detectada (normal, pneumonia, etc.)
- `features`: Características extraídas (JSON)
- `top_prediction`: Predicción principal
- `confidence`: Nivel de confianza (0-1)
- `top_3_predictions`: Top 3 predicciones con scores
- `severity`: Severidad (none, mild, moderate, high)
- `urgency`: Urgencia (low, medium, high, critical)
- `recommendation`: Recomendación médica para el chatbot
- `follow_up`: Tipo de seguimiento recomendado

### Tipos de Imágenes Soportados

1. **Radiografías de Tórax** (`chest_xray`)
   - Condiciones: normal, pneumonia, pneumothorax, pleural_effusion, etc.
   - Características: opacity_level, lung_volume, heart_size, etc.

2. **Tomografías Computarizadas** (`ct_scan`)
   - Condiciones: normal, pneumonia, pulmonary_embolism, lung_cancer, etc.
   - Características: density_range, contrast_enhancement, lesion_size, etc.

3. **Espirometría** (`spirometry`)
   - Condiciones: normal, obstructive, restrictive, mixed, etc.
   - Características: fev1_fvc_ratio, fvc_percent, flow_curve_shape, etc.

4. **Oximetría** (`oximetry`)
   - Condiciones: normal, mild_hypoxemia, moderate_hypoxemia, etc.
   - Características: spo2_level, pulse_rate, perfusion_index, etc.

5. **Expectoración** (`expectoration`)
   - Condiciones: normal, mucoid, purulent, bloody, etc.
   - Características: color_intensity, viscosity, volume, etc.

6. **Erupción Cutánea** (`skin_rash`)
   - Condiciones: normal, erythema, urticaria, petechiae, etc.
   - Características: redness_intensity, distribution, texture, etc.

7. **Cianosis** (`cyanosis`)
   - Condiciones: normal, mild_cyanosis, moderate_cyanosis, etc.
   - Características: blue_intensity, location_score, symmetry, etc.

8. **Otras Imágenes Médicas** (`other_medical_image`)
   - Condiciones: normal, abnormal, pathological, etc.
   - Características: quality_score, diagnostic_value, clarity, etc.

## 🎤 Dataset de Análisis de Tos

### Generación

```bash
python generate_multimodal_datasets.py --cough
```

O específicamente:

```python
from ml_models.synthetic_cough_dataset_generator import SyntheticCoughDatasetGenerator

generator = SyntheticCoughDatasetGenerator()
df = generator.generate_dataset(
    samples_per_type={
        'dry_cough': 500,
        'productive_cough': 500,
        'paroxysmal_cough': 300,
        'chronic_cough': 400,
        'whooping_cough': 200,
        'barking_cough': 300
    },
    output_file='synthetic_cough_dataset.csv'
)
```

### Estructura del Dataset

Cada caso incluye:
- `cough_type`: Tipo de tos (dry_cough, productive_cough, etc.)
- `severity`: Severidad (mild, moderate, severe)
- `urgency`: Urgencia (low, medium, high, critical)
- `detected`: Si se detectó tos (True/False)
- `characteristics`: Características de la tos (JSON array)
- `recommendations`: Recomendaciones médicas (JSON array)
- `confidence`: Nivel de confianza (0-1)
- `audio_features`: Características de audio extraídas (JSON)
- `duration_seconds`: Duración en segundos
- `frequency_range`: Rango de frecuencia (low, medium, high)
- `energy_level`: Nivel de energía (low, medium, high)

### Tipos de Tos Soportados

1. **Tos Seca** (`dry_cough`)
   - Severidades: mild, moderate, severe
   - Características: Alta frecuencia, sin producción
   - Causas comunes: asma, alergia, irritación

2. **Tos Productiva** (`productive_cough`)
   - Severidades: mild, moderate, severe
   - Características: Baja frecuencia, con producción
   - Causas comunes: infección, bronquitis, neumonía

3. **Tos Paroxística** (`paroxysmal_cough`)
   - Severidades: moderate, severe
   - Características: Múltiples episodios, alta variabilidad
   - Causas comunes: pertussis, asma severa

4. **Tos Crónica** (`chronic_cough`)
   - Severidades: mild, moderate
   - Características: Duración prolongada, patrón consistente
   - Causas comunes: EPOC, asma crónica

5. **Tos Convulsiva** (`whooping_cough`)
   - Severidades: severe
   - Características: Sonido característico, muy intensa
   - Causas comunes: pertussis, infección bacteriana

6. **Tos Perruna** (`barking_cough`)
   - Severidades: moderate, severe
   - Características: Alta frecuencia, sonido característico
   - Causas comunes: crup, laringitis

## 🚀 Entrenamiento de Modelos

### Entrenar Modelos con los Datasets

```bash
# Entrenar ambos modelos
python train_multimodal_models.py

# Solo modelo de imágenes
python train_multimodal_models.py --images-only --image-model rf

# Solo modelo de tos
python train_multimodal_models.py --cough-only --cough-model xgb

# Especificar datasets y modelos
python train_multimodal_models.py \
    --image-dataset synthetic_image_dataset.csv \
    --cough-dataset synthetic_cough_dataset.csv \
    --image-model rf \
    --cough-model xgb \
    --image-output models/image_classifier.pkl \
    --cough-output models/cough_classifier.pkl
```

### Modelos Disponibles

- **Random Forest** (`rf`): Rápido, bueno para empezar
- **Gradient Boosting** (`gb`): Mejor precisión, más lento
- **XGBoost** (`xgb`): Mejor precisión, requiere xgboost

### Salida

Los modelos entrenados se guardan como archivos `.pkl` que contienen:
- El modelo entrenado
- El label encoder para las clases
- Los nombres de las características

## 📊 Uso en el Chatbot

Los modelos entrenados mejoran las respuestas del chatbot de la siguiente manera:

### Para Imágenes Médicas

1. El usuario envía una imagen médica
2. Se extraen características de la imagen
3. El modelo entrenado predice la condición
4. El chatbot genera una respuesta basada en:
   - La condición predicha
   - La severidad y urgencia
   - Las recomendaciones médicas del dataset
   - El nivel de confianza

### Para Análisis de Tos

1. El usuario graba audio de tos
2. Se extraen características de audio
3. El modelo entrenado clasifica:
   - Tipo de tos
   - Severidad
   - Urgencia
4. El chatbot genera una respuesta basada en:
   - El tipo de tos detectado
   - Las características identificadas
   - Las recomendaciones médicas específicas
   - El nivel de confianza

## 🔄 Flujo Completo

```bash
# 1. Generar datasets sintéticos
python generate_multimodal_datasets.py --all

# 2. Entrenar modelos
python train_multimodal_models.py

# 3. Los modelos se cargan automáticamente en los servicios
#    - services/cough_analysis_service.py
#    - api/routes/advanced_ml.py (para imágenes)

# 4. El chatbot usa los modelos mejorados automáticamente
```

## 📈 Mejoras Esperadas

Con los modelos entrenados, el chatbot puede:

1. **Mayor Precisión**: Clasificación más precisa de condiciones
2. **Respuestas Contextuales**: Recomendaciones específicas basadas en el tipo de condición
3. **Mejor Evaluación de Urgencia**: Determinación más precisa de cuándo buscar atención médica
4. **Recomendaciones Personalizadas**: Consejos específicos para cada tipo de condición
5. **Mayor Confianza**: Niveles de confianza más precisos en las predicciones

## 🔧 Configuración

### Dependencias Requeridas

```bash
pip install pandas numpy scikit-learn xgboost joblib
```

### Estructura de Directorios

```
ai-services/
├── ml_models/
│   ├── synthetic_image_dataset_generator.py
│   ├── synthetic_cough_dataset_generator.py
│   └── ...
├── models/
│   ├── image_classifier.pkl
│   └── cough_classifier.pkl
├── generate_multimodal_datasets.py
├── train_multimodal_models.py
└── synthetic_image_dataset.csv
    synthetic_cough_dataset.csv
```

## 📝 Notas

- Los datasets sintéticos se generan con variaciones realistas
- Los modelos se entrenan con validación cruzada
- Los modelos entrenados tienen fallback a métodos basados en reglas si no están disponibles
- Los datasets pueden regenerarse con diferentes distribuciones según necesidad

## 🎯 Próximos Pasos

1. Generar datasets con más variaciones
2. Fine-tuning de modelos con datos reales (cuando estén disponibles)
3. Integración con sistema de feedback médico para mejora continua
4. A/B testing de respuestas del chatbot con y sin modelos entrenados

