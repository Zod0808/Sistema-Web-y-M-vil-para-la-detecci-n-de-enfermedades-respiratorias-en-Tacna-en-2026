# Servicios de Audio - Modelos Pre-entrenados

Este documento describe los servicios de audio implementados que **NO requieren dataset propio** - utilizan modelos pre-entrenados y procesamiento de señales.

## 📋 Servicios Implementados

### 1. Transcripción de Audio (Whisper)

**Ubicación:** `services/audio_transcription_service.py`

**Modelo:** OpenAI Whisper (pre-entrenado, multilingüe)

**Características:**
- ✅ No requiere dataset propio
- ✅ Soporte para múltiples idiomas (auto-detección)
- ✅ Modelo pre-entrenado en millones de horas de audio
- ✅ Manejo de ruido y acentos
- ✅ Buena precisión en español

**Uso:**
```python
from services.audio_transcription_service import AudioTranscriptionService

service = AudioTranscriptionService()
result = await service.transcribe_base64(
    audio_base64="...",
    audio_format="wav",
    language="es"  # o None para auto-detección
)

# Resultado:
# {
#     "transcription": "texto transcrito...",
#     "language": "es",
#     "confidence": 0.95,
#     "segments": 5
# }
```

**Endpoint:** `POST /api/v1/audio/transcribe`

### 2. Análisis de Tos

**Ubicación:** `services/cough_analysis_service.py`

**Método:** Procesamiento de señales de audio (librosa) + conocimiento médico

**Características:**
- ✅ No requiere dataset propio
- ✅ Análisis basado en características de audio (MFCC, frecuencia, energía)
- ✅ Clasificación de tipo de tos (seca, productiva, paroxística)
- ✅ Evaluación de severidad y urgencia
- ✅ Recomendaciones médicas basadas en análisis

**Características Analizadas:**
- **Duración:** Corta, moderada, prolongada
- **Frecuencia:** Alta (tos seca) vs Baja (tos productiva)
- **Energía:** Intensidad de la tos
- **Variabilidad:** Patrones paroxísticos
- **Componentes espectrales:** Análisis de frecuencia

**Uso:**
```python
from services.cough_analysis_service import CoughAnalysisService

service = CoughAnalysisService()
result = await service.analyze_base64(
    audio_base64="...",
    audio_format="wav"
)

# Resultado:
# {
#     "detected": True,
#     "severity": "moderate",
#     "characteristics": ["Tos productiva", "Tos prolongada"],
#     "recommendations": [...],
#     "urgency_level": "medium",
#     "confidence": 0.85,
#     "features_summary": {...}
# }
```

**Endpoint:** `POST /api/v1/audio/cough`

## 🔧 Instalación

### Dependencias Requeridas

```bash
pip install librosa soundfile openai-whisper ffmpeg-python
```

**Nota:** `ffmpeg` debe estar instalado en el sistema para Whisper.

### Instalación de FFmpeg

**Windows:**
```bash
# Usando chocolatey
choco install ffmpeg

# O descargar desde: https://ffmpeg.org/download.html
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

## 📊 Modelos de Whisper Disponibles

Whisper ofrece varios modelos pre-entrenados (de menor a mayor precisión):

- `tiny` - Más rápido, menor precisión
- `base` - Balance velocidad/precisión (recomendado)
- `small` - Mejor precisión
- `medium` - Alta precisión
- `large` - Máxima precisión (más lento)

**Configuración actual:** `base` (puede cambiarse en `audio_transcription_service.py`)

## 🚀 Uso en Endpoints

### Transcripción

```bash
curl -X POST "http://localhost:8000/api/v1/audio/transcribe" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_base64": "...",
    "audio_format": "wav",
    "analysis_type": "transcription"
  }'
```

### Análisis de Tos

```bash
curl -X POST "http://localhost:8000/api/v1/audio/cough" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_base64": "...",
    "audio_format": "wav",
    "analysis_type": "cough_detection"
  }'
```

## 🎯 Ventajas de Modelos Pre-entrenados

1. **Sin necesidad de dataset:** Los modelos ya están entrenados
2. **Funcionamiento inmediato:** No requiere entrenamiento
3. **Alta calidad:** Modelos entrenados en grandes volúmenes de datos
4. **Multilingüe:** Soporte para múltiples idiomas
5. **Mantenimiento mínimo:** No requiere re-entrenamiento constante

## ⚠️ Limitaciones

### Whisper
- Requiere FFmpeg instalado
- Modelos grandes pueden ser lentos en hardware limitado
- Primera carga del modelo puede tardar unos segundos

### Análisis de Tos
- Requiere `librosa` y `soundfile`
- Análisis basado en características, no ML profundo
- Puede no detectar casos muy sutiles

## 🔄 Mejoras Futuras (Opcional)

Si en el futuro se quiere mejorar la precisión:

1. **Análisis de Tos:**
   - Entrenar un modelo específico con dataset de tos
   - Usar modelos pre-entrenados de clasificación de audio
   - Integrar con servicios médicos especializados

2. **Transcripción:**
   - Fine-tuning de Whisper con datos médicos
   - Modelos especializados en terminología médica
   - Integración con servicios de transcripción médica

## 📝 Notas

- Los servicios usan lazy loading (carga el modelo solo cuando se necesita)
- Los archivos temporales se limpian automáticamente
- Los servicios manejan errores gracefully con fallbacks
- Los logs incluyen información detallada para debugging

