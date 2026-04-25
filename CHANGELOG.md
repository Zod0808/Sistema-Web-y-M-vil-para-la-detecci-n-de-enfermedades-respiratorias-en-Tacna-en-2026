# 📦 Changelog - RespiCare

Todas las notas de cambios relevantes del proyecto.

## 2024-11-XX - Versión 2.1.0

### ✨ Nuevas Funcionalidades

#### Análisis Multimodal (Fase 6)
- ✅ **Análisis de Imágenes Médicas**
  - Soporte para 8 tipos de imágenes: radiografías, TC, espirometría, oximetría, expectoración, erupción cutánea, cianosis
  - Modelo ResNet50 pre-entrenado para clasificación
  - Generación de datasets sintéticos para entrenamiento
  - Endpoint: `POST /api/v1/ml/advanced/image`
  
- ✅ **Procesamiento de Audio/Voz**
  - Transcripción de voz a texto usando Whisper (multilingüe, pre-entrenado)
  - Análisis de tos: 6 tipos (seca, productiva, paroxística, crónica, convulsiva, perruna)
  - Evaluación automática de severidad y urgencia
  - Generación de datasets sintéticos para entrenamiento
  - Endpoints:
    - `POST /api/v1/audio/cough` - Análisis de tos
    - `POST /api/v1/audio/transcribe` - Transcripción de voz

#### Chatbot Multimodal
- ✅ Integración de análisis de imágenes en el chatbot móvil
- ✅ Integración de análisis de audio (tos y transcripción) en el chatbot móvil
- ✅ Selección de tipo de imagen antes del análisis
- ✅ Opciones de audio: análisis de tos o transcripción
- ✅ Respuestas mejoradas con modelos entrenados usando datasets sintéticos

#### Datasets Sintéticos
- ✅ Generador de dataset sintético para imágenes médicas
- ✅ Generador de dataset sintético para análisis de tos
- ✅ Scripts de entrenamiento de modelos ML con datasets sintéticos
- ✅ Mejora de respuestas del chatbot con modelos entrenados

### 📚 Documentación

- ✅ Actualizado README.md principal con nuevas funcionalidades
- ✅ Actualizado QUICKSTART.md con endpoints multimodales
- ✅ Actualizado SECURITY.md con consideraciones de seguridad para funcionalidades multimodales
- ✅ Creado índice de documentación centralizado (docs/DOCUMENTATION_INDEX.md)
- ✅ Agregada documentación de servicios de audio (ai-services/docs/AUDIO_SERVICES.md)
- ✅ Agregada documentación de datasets sintéticos (ai-services/docs/MULTIMODAL_DATASETS.md)
- ✅ Actualizado roadmap ML (docs/roadmaps/ML_ROADMAP.md) con Fase 6: Análisis Multimodal

### 🔧 Mejoras Técnicas

- ✅ Servicios de audio con modelos pre-entrenados (sin dataset propio requerido)
- ✅ Análisis de imágenes con modelo ResNet50 pre-entrenado
- ✅ Procesamiento de señales de audio con librosa
- ✅ Transcripción multilingüe con Whisper
- ✅ Manejo mejorado de errores en análisis multimodal
- ✅ Logging detallado para debugging

### 🔒 Seguridad

- ✅ Validación de tipos de archivo para imágenes y audio
- ✅ Límites de tamaño y duración para archivos
- ✅ Sanitización de metadatos EXIF
- ✅ Procesamiento temporal (archivos eliminados después del procesamiento)
- ✅ Cifrado en tránsito para datos sensibles
- ✅ Autenticación requerida para endpoints multimodales

## 2025-11-16

### Mobile
- Offline/Sync: banners/chips de estado, snackbars, retry, cola para citas/alertas/historias.
- Onboarding: 3 slides, i18n ES/EN, placeholders PT/FR/QU.
- Citas: creación, reprogramación, cancelación; Snackbar para acciones offline; indicador “Offline” en headers.
- Detalle de Cita: aviso desde error offline, botón Guardar (reintento), navegación de retorno al éxito.
- AR: respiración/inhalador, persistencia de modo, nota de restauración, microinteracciones.
- Voz: servicio y flujo de dictado en captura; comandos de navegación en Home.
- i18n: Home, DataCapture, Profile; claves de Onboarding; wearables y perfiles traducidos.
- Wearables: `wearablesService` (stub), resumen FC/pasos/SpO₂ en Home.
- Analytics: `analyticsService` (eventos y timings) con persistencia (`AsyncStorage`) y auto-flush (30s); exportación JSON.
- Error tracking: `errorTrackingService` con handler global; setUser en login/logout/rehidratación.
- CI Beta: workflow `mobile-beta.yml` (artefacto zip por tag `beta-*`/`mobile-beta-*`).

### Documentación
- Actualización de `mobile/MOBILE_ROADMAP.md` (Fases 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3).
- `docs/DOCUMENTATION_INDEX.md` reorganizado con resumen Mobile y fecha de actualización.
- `README.md` raíz actualizado (Mobile, roadmap, últimas capacidades).
- `mobile/README.md` actualizado (servicios, offline/sync, analytics/error tracking, tests de integración offline/citas).


