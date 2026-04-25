# Guía de Integración con Modelos Reales de ML

Esta guía explica cómo configurar y usar modelos reales de Machine Learning (BERT, Computer Vision) en RespiCare AI Services.

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Requisitos de GPU](#requisitos-de-gpu)
- [Instalación de Dependencias](#instalación-de-dependencias)
- [Configuración](#configuración)
- [Modelos Disponibles](#modelos-disponibles)
- [Uso](#uso)
- [Fallback y Troubleshooting](#fallback-y-troubleshooting)
- [Optimización de Rendimiento](#optimización-de-rendimiento)
- [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

RespiCare AI Services soporta dos modos de operación:

1. **Modo Stub (Por Defecto)**: Usa implementaciones simuladas para desarrollo y testing
2. **Modo Real**: Carga modelos reales de ML (BERT, Computer Vision) para producción

El sistema incluye **fallback robusto**: si la carga de modelos reales falla, automáticamente usa stubs para garantizar disponibilidad.

---

## Requisitos de GPU

### Requisitos Mínimos

#### Para Modelos BERT

- **CPU**: Mínimo 4 cores, recomendado 8+ cores
- **RAM**: Mínimo 8GB, recomendado 16GB+
- **GPU (Opcional pero Recomendado)**:
  - NVIDIA GPU con CUDA support
  - Mínimo: NVIDIA T4 (16GB VRAM)
  - Recomendado: NVIDIA V100 (32GB VRAM) o A100 (40GB VRAM)
  - CUDA 11.8+ y cuDNN 8.6+

#### Para Modelos de Computer Vision

- **CPU**: Mínimo 4 cores, recomendado 8+ cores
- **RAM**: Mínimo 8GB, recomendado 16GB+
- **GPU (Opcional pero Recomendado)**:
  - NVIDIA GPU con CUDA support
  - Mínimo: NVIDIA T4 (16GB VRAM)
  - Recomendado: NVIDIA V100 (32GB VRAM) o A100 (40GB VRAM)
  - CUDA 11.8+ y cuDNN 8.6+

### Verificar GPU Disponible

```python
import torch

# Verificar CUDA
print(f"CUDA disponible: {torch.cuda.is_available()}")
print(f"Versión CUDA: {torch.version.cuda}")

# Verificar GPU
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
```

### Requisitos de Almacenamiento

- **Modelos BERT**: ~500MB - 2GB por modelo
- **Modelos CV**: ~100MB - 500MB por modelo
- **Cache de Transformers**: ~5GB (compartido entre modelos)
- **Total Recomendado**: 20GB+ de espacio libre

---

## Instalación de Dependencias

### Opción 1: Instalación Completa (Recomendado para Producción)

```bash
# Instalar PyTorch con soporte CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Instalar transformers y timm
pip install transformers timm

# Instalar procesamiento de imágenes
pip install Pillow

# Instalar dependencias adicionales
pip install numpy scipy
```

### Opción 2: Instalación CPU-only (Para Desarrollo)

```bash
# Instalar PyTorch CPU-only
pip install torch torchvision torchaudio

# Instalar transformers y timm
pip install transformers timm

# Instalar procesamiento de imágenes
pip install Pillow
```

### Opción 3: Usar requirements-full.txt

```bash
# El archivo requirements-full.txt incluye todas las dependencias
pip install -r requirements-full.txt
```

### Verificar Instalación

```bash
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "import transformers; print(f'Transformers: {transformers.__version__}')"
python -c "import timm; print(f'timm: {timm.__version__}')"
```

---

## Configuración

### Variables de Entorno

```bash
# Habilitar modelos reales
AI_USE_REAL_MODELS=1

# Configurar dispositivo (auto-detecta si no se especifica)
# AI_DEVICE=cuda  # o cpu

# Configurar cache de transformers
TRANSFORMERS_CACHE=/app/models/transformers_cache

# Configurar batch size para BERT
BERT_BATCH_SIZE=8

# Configurar batch size para imágenes
IMAGE_BATCH_SIZE=16
```

### Configuración en Docker

```dockerfile
# En Dockerfile
ENV AI_USE_REAL_MODELS=1
ENV TRANSFORMERS_CACHE=/app/models/transformers_cache
ENV BERT_BATCH_SIZE=8
ENV IMAGE_BATCH_SIZE=16

# Crear directorio de cache
RUN mkdir -p /app/models/transformers_cache
```

### Configuración en Kubernetes

```yaml
env:
  - name: AI_USE_REAL_MODELS
    value: "1"
  - name: TRANSFORMERS_CACHE
    value: "/app/models/transformers_cache"
  - name: BERT_BATCH_SIZE
    value: "8"
  - name: IMAGE_BATCH_SIZE
    value: "16"
```

---

## Modelos Disponibles

### Modelos BERT Médicos

#### 1. Bio_ClinicalBERT (Recomendado)
- **Nombre**: `emilyalsentzer/Bio_ClinicalBERT`
- **Tamaño**: ~440MB
- **Uso**: Textos clínicos y notas médicas
- **Rendimiento**: Excelente para clasificación de síntomas

```python
model = MedicalBERTModel(model_name="medical")  # Usa Bio_ClinicalBERT
```

#### 2. SciBERT
- **Nombre**: `allenai/scibert_scivocab_uncased`
- **Tamaño**: ~440MB
- **Uso**: Textos científicos y papers médicos
- **Rendimiento**: Bueno para literatura médica

```python
model = MedicalBERTModel(model_name="scibert")
```

#### 3. PubMed BERT
- **Nombre**: `microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext`
- **Tamaño**: ~440MB
- **Uso**: Abstracts y textos de PubMed
- **Rendimiento**: Excelente para investigación médica

```python
model = MedicalBERTModel(model_name="pubmed")
```

#### 4. BlueBERT
- **Nombre**: `bionlp/bluebert_pubmed_mimic_uncased_L-12_H-768_A-12`
- **Tamaño**: ~440MB
- **Uso**: Textos clínicos (MIMIC dataset)
- **Rendimiento**: Muy bueno para notas clínicas

```python
model = MedicalBERTModel(model_name="bluebert")
```

### Modelos de Computer Vision

#### 1. ResNet50 (Por Defecto)
- **Nombre**: `resnet50`
- **Tamaño**: ~100MB
- **Uso**: Clasificación general de imágenes médicas
- **Rendimiento**: Balanceado entre velocidad y precisión

```python
classifier = MedicalImageClassifier(model_name="resnet50")
```

#### 2. EfficientNet-B0
- **Nombre**: `efficientnet_b0`
- **Tamaño**: ~20MB
- **Uso**: Clasificación eficiente (más rápido)
- **Rendimiento**: Bueno para inferencia rápida

```python
classifier = MedicalImageClassifier(model_name="efficientnet_b0")
```

#### 3. EfficientNet-B4
- **Nombre**: `efficientnet_b4`
- **Tamaño**: ~75MB
- **Uso**: Clasificación de alta precisión
- **Rendimiento**: Mejor precisión, más lento

```python
classifier = MedicalImageClassifier(model_name="efficientnet_b4")
```

#### 4. Vision Transformer (ViT)
- **Nombre**: `vit_base_patch16_224`
- **Tamaño**: ~330MB
- **Uso**: Clasificación avanzada
- **Rendimiento**: Excelente precisión, requiere GPU

```python
classifier = MedicalImageClassifier(model_name="vit_base")
```

---

## Uso

### Uso Básico de BERT

```python
from ml_models.medical_bert import MedicalBERTModel

# Crear modelo (auto-detecta GPU)
model = MedicalBERTModel(model_name="medical")  # Bio_ClinicalBERT

# Cargar modelo
model.load()

# Predecir
texts = [
    "Paciente con tos persistente y dificultad para respirar",
    "Historial de asma desde la infancia"
]
results = model.predict(texts)

for result in results:
    print(f"Texto: {result['text']}")
    print(f"Predicción: {result['top_label']} (confianza: {result['confidence']:.2%})")
    print(f"Scores: {result['scores']}")
```

### Uso Básico de Computer Vision

```python
from ml_models.image_classifier import MedicalImageClassifier

# Crear clasificador (auto-detecta GPU)
classifier = MedicalImageClassifier(model_name="resnet50")

# Cargar modelo
classifier.load()

# Predecir
image_paths = [
    "/path/to/xray1.jpg",
    "/path/to/xray2.jpg"
]
results = classifier.predict(image_paths)

for result in results:
    print(f"Imagen: {result['image']}")
    print(f"Predicción: {result['top_label']} (confianza: {result['confidence']:.2%})")
    print(f"Scores: {result['scores']}")
```

### Especificar Dispositivo Manualmente

```python
# Forzar CPU
model = MedicalBERTModel(model_name="medical", device="cpu")

# Forzar GPU
model = MedicalBERTModel(model_name="medical", device="cuda")
```

---

## Fallback y Troubleshooting

### Fallback Automático

El sistema incluye fallback robusto:

1. **Si `AI_USE_REAL_MODELS=0`**: Usa stubs (por defecto)
2. **Si falla la carga del modelo**: Automáticamente usa stubs
3. **Si no hay GPU disponible**: Usa CPU (más lento pero funcional)
4. **Si falla la inferencia**: Retorna resultados stub con flag de error

### Verificar Estado del Modelo

```python
model = MedicalBERTModel(model_name="medical")
model.load()

# Verificar si está usando modelo real
if model._use_real_model:
    print("✅ Usando modelo real")
    print(f"Modelo: {model.model_name}")
    print(f"Dispositivo: {model.device}")
else:
    print("⚠️ Usando stub (fallback)")
```

### Troubleshooting Común

#### Problema: "transformers no está instalado"

**Solución:**
```bash
pip install transformers torch
```

#### Problema: "CUDA out of memory"

**Solución:**
1. Reducir batch size:
   ```bash
   export BERT_BATCH_SIZE=4
   export IMAGE_BATCH_SIZE=8
   ```

2. Usar CPU:
   ```python
   model = MedicalBERTModel(device="cpu")
   ```

3. Cargar modelo más pequeño:
   ```python
   model = MedicalBERTModel(model_name="bert-base-uncased")  # Más pequeño
   ```

#### Problema: "Modelo no se descarga"

**Solución:**
1. Verificar conexión a internet
2. Configurar cache manualmente:
   ```bash
   export TRANSFORMERS_CACHE=/path/to/cache
   ```

3. Descargar modelo manualmente:
   ```python
   from transformers import AutoTokenizer, AutoModelForSequenceClassification
   tokenizer = AutoTokenizer.from_pretrained("emilyalsentzer/Bio_ClinicalBERT")
   model = AutoModelForSequenceClassification.from_pretrained("emilyalsentzer/Bio_ClinicalBERT")
   ```

#### Problema: "GPU no detectada"

**Solución:**
1. Verificar instalación de CUDA:
   ```bash
   nvidia-smi
   ```

2. Verificar PyTorch con CUDA:
   ```python
   import torch
   print(torch.cuda.is_available())
   ```

3. Reinstalar PyTorch con CUDA:
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

---

## Optimización de Rendimiento

### Batch Processing

Procesar múltiples textos/imágenes en batch es más eficiente:

```python
# BERT: Procesar 8 textos a la vez (por defecto)
texts = ["texto1", "texto2", ..., "texto100"]
results = model.predict(texts)  # Procesa en batches automáticamente

# CV: Procesar 16 imágenes a la vez (por defecto)
images = ["img1.jpg", "img2.jpg", ..., "img100.jpg"]
results = classifier.predict(images)  # Procesa en batches automáticamente
```

### Cache de Modelos

Los modelos se cachean automáticamente usando `model_cache.py`:

```python
# El modelo se carga una vez y se reutiliza
model1 = MedicalBERTModel(model_name="medical")
model1.load()  # Descarga y carga modelo

model2 = MedicalBERTModel(model_name="medical")
model2.load()  # Usa modelo cacheado (más rápido)
```

### Lazy Loading

Los modelos se cargan solo cuando se necesitan:

```python
model = MedicalBERTModel(model_name="medical")
# Modelo aún no cargado

results = model.predict(texts)  # Carga automáticamente si no está cargado
```

### Optimización de GPU

1. **Usar Mixed Precision (FP16)**:
   ```python
   # En el código del modelo (futuro)
   model = model.half()  # Usa FP16 en lugar de FP32
   ```

2. **Batch Size Dinámico**:
   ```python
   # Ajustar según VRAM disponible
   if torch.cuda.get_device_properties(0).total_memory > 16e9:
       batch_size = 16
   else:
       batch_size = 8
   ```

---

## Mejores Prácticas

### 1. Desarrollo vs Producción

- **Desarrollo**: Usar `AI_USE_REAL_MODELS=0` (stubs) para desarrollo rápido
- **Testing**: Usar `AI_USE_REAL_MODELS=1` con CPU para validar código
- **Producción**: Usar `AI_USE_REAL_MODELS=1` con GPU para máximo rendimiento

### 2. Manejo de Errores

Siempre verificar si el modelo está usando implementación real:

```python
results = model.predict(texts)
if results[0].get("model") == "stub":
    logger.warning("Modelo usando stub, verificar configuración")
```

### 3. Monitoreo

Monitorear:
- Tiempo de inferencia
- Uso de GPU/CPU
- Tasa de errores
- Uso de memoria

### 4. Versionado de Modelos

Documentar qué versión de modelo se usa:

```python
model = MedicalBERTModel(model_name="medical")
print(f"Modelo: {model.model_name}")  # emilyalsentzer/Bio_ClinicalBERT
```

### 5. Testing

Probar tanto con stubs como con modelos reales:

```python
# Test con stub
os.environ["AI_USE_REAL_MODELS"] = "0"
model = MedicalBERTModel()
assert model.predict(["test"])[0]["model"] == "stub"

# Test con modelo real (si está disponible)
os.environ["AI_USE_REAL_MODELS"] = "1"
model = MedicalBERTModel()
results = model.predict(["test"])
assert "model" in results[0]
```

---

## Referencias

- [Transformers Documentation](https://huggingface.co/docs/transformers/)
- [PyTorch Documentation](https://pytorch.org/docs/)
- [timm Documentation](https://github.com/rwightman/pytorch-image-models)
- [GPU Infrastructure Guide](../guides/GPU_INFRASTRUCTURE_GUIDE.md)

---

**Última actualización**: Diciembre 2024

