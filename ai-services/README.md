# RespiCare AI Services

[![AI Services CI](https://img.shields.io/github/actions/workflow/status/USER_OR_ORG/REPO/ai-services-tests.yml?label=AI%20Services%20CI)](../../actions/workflows/ai-services-tests.yml)
[![Coverage](https://img.shields.io/codecov/c/github/USER_OR_ORG/REPO?label=Coverage)](https://codecov.io/gh/USER_OR_ORG/REPO)

Servicios de inteligencia artificial para el procesamiento de historias médicas y análisis de síntomas en el sistema RespiCare, implementando patrones de arquitectura robustos y escalables.

## 🏗️ Arquitectura con Patrones de Software

```
ai-services/
├── main.py                          # Aplicación principal FastAPI
├── requirements.txt                 # Dependencias Python
├── dockerfile                       # Configuración Docker
├── env.example                      # Variables de entorno
├── [Ver docs/ai-services/](../docs/ai-services/)  # Documentación de patrones y API
├── core/                           # Módulos centrales
│   ├── config.py                   # Configuración de la aplicación
│   ├── pattern_config.py           # Configuración de patrones
│   ├── database.py                 # Conexión a MongoDB
│   └── cache.py                    # Cache Redis
├── strategies/                     # Strategy Pattern
│   ├── analysis_strategy.py        # Estrategia base de análisis
│   ├── openai_strategy.py          # Estrategia OpenAI
│   ├── local_model_strategy.py     # Estrategia modelo local
│   └── rule_based_strategy.py      # Estrategia basada en reglas
├── factories/                      # Factory Pattern
│   ├── service_factory.py          # Factory de servicios
│   ├── model_factory.py            # Factory de modelos
│   └── strategy_factory.py         # Factory de estrategias
├── circuit_breaker/                # Circuit Breaker Pattern
│   ├── circuit_breaker.py          # Circuit breaker general
│   ├── openai_circuit_breaker.py   # Circuit breaker OpenAI
│   └── external_service_circuit_breaker.py # Circuit breaker servicios externos
├── repositories/                   # Repository Pattern
│   ├── base_repository.py          # Repository base
│   ├── medical_history_repository.py # Repository historias médicas
│   ├── ai_result_repository.py     # Repository resultados IA
│   └── patient_repository.py       # Repository pacientes
├── decorators/                     # Decorator Pattern
│   ├── cache_decorator.py          # Decorador de caché
│   ├── logging_decorator.py        # Decorador de logging
│   ├── retry_decorator.py          # Decorador de reintentos
│   ├── circuit_breaker_decorator.py # Decorador circuit breaker
│   └── metrics_decorator.py        # Decorador de métricas
├── services/                       # Service Layer
│   ├── ai_service_manager.py       # Gestor principal de servicios IA
│   ├── symptom_analysis_service.py # Servicio análisis de síntomas
│   └── medical_history_service.py  # Servicio procesamiento historias
├── scripts/                        # ⭐ Scripts organizados
│   ├── training/                  # Scripts de entrenamiento
│   │   ├── train_base_model.py
│   │   ├── train_xgboost_simple.py
│   │   ├── train_neural_network.py
│   │   ├── train_multimodal_models.py  # ⭐ Entrenamiento multimodal
│   │   ├── generate_dataset.py
│   │   ├── generate_multimodal_datasets.py  # ⭐ Generación multimodal
│   │   └── ...
│   ├── analysis/                  # Scripts de análisis
│   │   ├── analyze_performance.py
│   │   ├── analyze_prediction_trends.py
│   │   └── benchmark_endpoints.py
│   ├── validation/                # Scripts de validación
│   │   ├── validate_models_performance.py
│   │   └── validate_models_comparison*.py
│   └── seed_ml_predictions.py
├── data/                          # Datos y datasets
│   ├── datasets/                  # ⭐ Datasets CSV organizados
│   │   ├── synthetic_dataset.csv
│   │   ├── synthetic_image_dataset.csv  # ⭐ Dataset de imágenes
│   │   ├── synthetic_cough_dataset.csv  # ⭐ Dataset de tos
│   │   └── ...
│   ├── samples/                   # Datos de ejemplo
│   └── ...
├── services/                      # Service Layer
│   ├── audio_transcription_service.py  # ⭐ Transcripción (Whisper)
│   ├── cough_analysis_service.py       # ⭐ Análisis de tos
│   ├── ai_service_manager.py
│   ├── symptom_analysis_service.py
│   └── ...
├── ml_models/                     # Modelos de IA/ML
│   ├── synthetic_image_dataset_generator.py  # ⭐ Generador imágenes
│   ├── synthetic_cough_dataset_generator.py   # ⭐ Generador tos
│   ├── random_forest_model.py
│   ├── xgboost_model.py
│   └── ...
├── models/                         # Modelos entrenados (.pkl)
│   └── model_manager.py            # Gestor de modelos
├── api/                           # API REST
│   └── routes/
│       ├── health.py              # Endpoints de salud
│       ├── medical_history.py     # Procesamiento de historias médicas
│       └── symptom_analyzer.py    # Análisis de síntomas
├── medical-history-processor/      # Procesador de historias médicas
│   └── processor.py               # Lógica de procesamiento
├── symptom-analyzer/              # Analizador de síntomas
│   └── analyzer.py                # Lógica de análisis
└── data/                          # Datos y utilidades
    ├── medical_data.py            # Procesamiento de datos médicos
    └── samples/                   # Datos de muestra
        ├── medical_histories.json
        └── symptoms.json
```

## 🚀 Características

### 🏛️ Patrones de Arquitectura Implementados
- **Strategy Pattern**: Algoritmos de IA intercambiables (OpenAI, Local Models, Rule-based)
- **Factory Pattern**: Creación centralizada de servicios y modelos
- **Circuit Breaker Pattern**: Protección contra fallos de servicios externos
- **Repository Pattern**: Gestión de datos con auditoría y versionado
- **Decorator Pattern**: Funcionalidades transversales (cache, logging, retry, métricas)
- **Microservicios Ligeros**: Arquitectura modular y escalable

### Procesamiento de Historias Médicas
- Extracción avanzada de entidades médicas (medicamentos, signos vitales, fechas)
- Identificación inteligente de síntomas y categorización
- Detección automática de factores de riesgo
- Sugerencias de diagnóstico con múltiples estrategias de IA
- Generación de recomendaciones médicas personalizadas
- Análisis de tendencias y seguimiento temporal

### Análisis de Síntomas
- Clasificación de síntomas por categorías con múltiples algoritmos
- Cálculo de puntuaciones de severidad con IA
- Determinación de niveles de urgencia automática
- Identificación de signos de alarma críticos
- Recomendaciones de tratamiento personalizadas
- Análisis de riesgo y planificación de seguimiento

### Analytics & Business Intelligence (Nuevo)
- Predicción de tendencias por enfermedad (`DiseaseTrendPredictor`)
- Detección estadística de anomalías y clusters de riesgo (`StatisticalAnomalyDetector`, `PatientRiskClusterer`)
- Forecast de demanda de recursos médicos (`HealthcareDemandForecaster`)
- Soporte para dashboards ejecutivos y modelos epidemiológicos

### API REST Robusta
- Endpoints para procesamiento de historias médicas con circuit breakers
- Análisis de síntomas en tiempo real con cache inteligente
- Búsqueda y filtrado de datos con repositories
- Análisis de tendencias temporales
- Health checks avanzados y monitoreo de métricas
- Logging estructurado y auditoría completa

## 🛠️ Tecnologías

### Core Technologies
- **FastAPI**: Framework web moderno y rápido con async/await
- **Python 3.11**: Lenguaje de programación con type hints
- **spaCy**: Procesamiento de lenguaje natural médico
- **scikit-learn**: Machine learning y clasificación
- **MongoDB**: Base de datos NoSQL con Motor (async driver)
- **Redis**: Cache en memoria con aioredis
- **Docker**: Containerización y orquestación

### AI/ML Libraries
- **OpenAI**: API de GPT para análisis avanzado
- **Transformers**: Modelos de lenguaje pre-entrenados
- **PyTorch**: Framework de deep learning
- **scikit-learn**: Algoritmos de machine learning
- **spaCy**: NLP especializado en texto médico

### Architecture Patterns
- **Structlog**: Logging estructurado y observabilidad
- **Pydantic**: Validación de datos y serialización
- **Motor**: Driver asíncrono para MongoDB
- **aioredis**: Cliente asíncrono para Redis
- **httpx**: Cliente HTTP asíncrono para APIs externas

## 📋 Requisitos

- Python 3.11+
- MongoDB 4.4+
- Redis 6.0+
- Docker (opcional)

## 📁 Estructura del Proyecto

El proyecto está organizado de la siguiente manera:

```
ai-services/
├── api/routes/              # Endpoints de la API
├── core/                    # Núcleo del sistema
├── data/                    # Datos y datasets
│   └── datasets/           # Datasets CSV (sintéticos y reales)
├── ml_models/              # Modelos de Machine Learning
├── services/                # Servicios de negocio
├── scripts/                 # Scripts organizados
│   ├── training/          # Scripts de entrenamiento
│   ├── analysis/          # Scripts de análisis
│   └── validation/        # Scripts de validación
├── tests/                   # Tests
└── models/                 # Modelos entrenados (.pkl)
```

**Ver documentación completa**: [docs/ai-services/README_ESTRUCTURA.md](../docs/ai-services/README_ESTRUCTURA.md)

## 🚀 Instalación

### Desarrollo Local

1. **Clonar el repositorio**
```bash
git clone https://github.com/Zod0808/respicare-tacna.git
cd respicare-tacna/ai-services
```

2. **Crear entorno virtual**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o
venv\Scripts\activate     # Windows
```

3. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

4. **Configurar variables de entorno**
```bash
cp env.example .env
# Editar .env con tus configuraciones
```

5. **Ejecutar la aplicación**
```bash
uvicorn main:app --reload
```

### Docker

1. **Construir la imagen**
```bash
docker build -t respicare-ai .
```

2. **Ejecutar el contenedor**
```bash
docker run -p 8000:8000 respicare-ai
```

### Docker Compose

```bash
# Desde el directorio raíz del proyecto
docker-compose up ai-services
```

## 📚 Uso de la API

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

### Health Check Detallado (con patrones)
```bash
curl http://localhost:8000/api/v1/health/detailed
```

### Procesar Historia Médica (con IA avanzada)
```bash
curl -X POST "http://localhost:8000/api/v1/medical-history/process" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "text": "Paciente de 45 años con tos seca persistente de 2 semanas, dificultad respiratoria leve, fiebre intermitente de 38°C. Antecedentes de tabaquismo por 20 años. No alergias conocidas.",
    "language": "es",
    "metadata": {
      "source": "emergency_room",
      "doctor": "Dr. García"
    }
  }'
```

### Analizar Síntomas (con análisis completo)
```bash
curl -X POST "http://localhost:8000/api/v1/symptom-analyzer/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "symptoms": [
      {"symptom": "tos seca", "severity": "moderate", "duration": "2 semanas"},
      {"symptom": "dificultad respiratoria", "severity": "mild", "duration": "1 semana"},
      {"symptom": "fiebre", "severity": "moderate", "duration": "3 días"}
    ],
    "context": "Síntomas respiratorios persistentes con antecedentes de tabaquismo",
    "metadata": {
      "age": 45,
      "gender": "M",
      "diabetes": false,
      "hypertension": true
    }
  }'
```

### Obtener Tendencias de Síntomas
```bash
curl "http://localhost:8000/api/v1/symptom-analyzer/trends/P001?period=30d"
```

### Buscar Historias Médicas
```bash
curl -X POST "http://localhost:8000/api/v1/medical-history/search" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "P001",
    "date_from": "2024-01-01T00:00:00Z",
    "date_to": "2024-12-31T23:59:59Z",
    "symptoms": ["tos", "fiebre"],
    "limit": 10
  }'
```

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `DATABASE_URL` | URL de conexión a MongoDB | `mongodb://admin:password@mongodb:27017/respicare?authSource=admin` |
| `REDIS_URL` | URL de conexión a Redis | `redis://redis:6379` |
| `OPENAI_API_KEY` | Clave API de OpenAI | - |
| `MODEL_PATH` | Ruta de modelos ML | `/app/models` |
| `CACHE_TTL` | TTL del cache (segundos) | `3600` |
| `LOG_LEVEL` | Nivel de logging | `INFO` |

### Variables de Patrones de Arquitectura

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `STRATEGY_DEFAULT` | Estrategia IA por defecto | `auto` |
| `CIRCUIT_BREAKER_ENABLED` | Habilitar circuit breakers | `true` |
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Umbral de fallos | `5` |
| `CIRCUIT_BREAKER_RECOVERY_TIMEOUT` | Tiempo de recuperación (s) | `60` |
| `CACHE_ENABLED` | Habilitar cache | `true` |
| `RETRY_ENABLED` | Habilitar reintentos | `true` |
| `RETRY_MAX_ATTEMPTS` | Máximo reintentos | `3` |
| `LOGGING_ENABLED` | Habilitar logging estructurado | `true` |
| `METRICS_ENABLED` | Habilitar métricas | `true` |
| `AUDIT_LOGGING_ENABLED` | Habilitar auditoría | `true` |

### Modelos de IA

El sistema utiliza múltiples modelos y estrategias para el procesamiento:

#### Estrategias de Análisis
1. **OpenAI Strategy**: GPT-3.5/GPT-4 para análisis avanzado
2. **Local Model Strategy**: Modelos locales (Transformers, PyTorch)
3. **Rule-Based Strategy**: Análisis basado en reglas médicas
4. **Hybrid Strategy**: Combinación de múltiples estrategias
5. **Fallback Strategy**: Estrategia de respaldo automático

#### Modelos Especializados
1. **spaCy Medical Model**: Procesamiento de texto médico (en_core_sci_sm)
2. **Symptom Classifier**: Clasificación de síntomas con ML
3. **Medical History Processor**: Procesamiento de historias médicas
4. **Entity Extraction Model**: Extracción de entidades médicas

#### Configuración de Modelos
- Selección automática de estrategia según disponibilidad
- Fallback automático en caso de fallos
- Configuración por ambiente (desarrollo/producción)

## 📊 Monitoreo y Observabilidad

### Health Checks

- `/api/v1/health` - Health check básico
- `/api/v1/health/detailed` - Health check detallado con patrones
- `/api/v1/health/ready` - Kubernetes readiness probe
- `/api/v1/health/live` - Kubernetes liveness probe

### Métricas de Patrones

- **Circuit Breaker Metrics**: Estado de circuitos, fallos, recuperaciones
- **Cache Metrics**: Hit/miss rates, TTL, tamaño de cache
- **Retry Metrics**: Intentos, fallos, tiempos de espera
- **Strategy Metrics**: Uso de estrategias, tiempos de respuesta
- **Repository Metrics**: Operaciones CRUD, auditoría, versionado

### Logs Estructurados

Los logs se generan en formato JSON estructurado con los siguientes niveles:
- `INFO`: Información general del sistema
- `WARNING`: Advertencias y circuitos abiertos
- `ERROR`: Errores y fallos de servicios
- `DEBUG`: Información de depuración detallada

### Auditoría

- **Audit Trail**: Registro completo de operaciones sensibles
- **Soft Delete**: Registro de eliminaciones para cumplimiento
- **Versionado**: Historial de cambios en entidades
- **Performance Tracking**: Métricas de rendimiento por operación

## 🧪 Testing

### Ejecutar Tests
```bash
# Instalar dependencias de testing
pip install -r requirements-test.txt

# Tests unitarios
pytest tests/

# Tests de integración
pytest tests/integration/

# Tests de patrones
pytest tests/patterns/

# Tests con cobertura
pytest --cov=. tests/
```

### Tests de Patrones

- **Strategy Pattern Tests**: Validación de estrategias de IA
- **Circuit Breaker Tests**: Tests de resiliencia y fallos
- **Repository Tests**: Tests de persistencia y auditoría
- **Decorator Tests**: Tests de funcionalidades transversales
- **Factory Tests**: Tests de creación de servicios

### Datos de Prueba

El directorio `data/samples/` contiene datos de prueba para desarrollo y testing:
- Historias médicas de muestra
- Síntomas categorizados
- Casos de prueba para diferentes estrategias

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo
- Revisar la documentación de la API en `/docs`

## 🔄 Changelog

### v2.1.0 - Análisis Multimodal y Organización ⭐
- ✅ **Análisis de Imágenes Médicas**: 8 tipos soportados (ResNet50)
- ✅ **Procesamiento de Audio/Voz**: Whisper + Librosa
- ✅ **Análisis de Tos**: 6 tipos con evaluación médica
- ✅ **Transcripción Multilingüe**: Whisper pre-entrenado
- ✅ **Generación de Datasets Sintéticos**: Para imágenes y tos
- ✅ **Estructura Reorganizada**: Scripts, datasets y tests organizados
- ✅ **Documentación Actualizada**: Guías completas de nuevas funcionalidades

### v2.0.0 - Arquitectura con Patrones
- ✅ **Strategy Pattern**: Algoritmos de IA intercambiables
- ✅ **Factory Pattern**: Creación centralizada de servicios
- ✅ **Circuit Breaker Pattern**: Protección contra fallos
- ✅ **Repository Pattern**: Gestión de datos con auditoría
- ✅ **Decorator Pattern**: Funcionalidades transversales
- ✅ **Microservicios Ligeros**: Arquitectura modular
- ✅ Logging estructurado y observabilidad avanzada
- ✅ Métricas detalladas y health checks
- ✅ Configuración flexible por ambiente
- ✅ Documentación completa de patrones

### v1.0.0
- Implementación inicial del sistema de IA
- Procesamiento de historias médicas
- Análisis de síntomas
- API REST completa
- Integración con MongoDB y Redis
- Dockerización completa

## 🤖 Sistema de Machine Learning

RespiCare AI incluye un sistema avanzado de ML para clasificación de enfermedades con 4 fases:

### **Fase 1: Random Forest** ✅ IMPLEMENTADO
- 100-500 árboles para clasificación robusta
- Sistema de reglas de emergencia para casos críticos
- Análisis de importancia de características
- Soporte para 124 enfermedades respiratorias

**Archivos**:
- `ml_models/synthetic_dataset_generator.py` - Generador de datos sintéticos
- `ml_models/random_forest_model.py` - Clasificador Random Forest

### **Fase 2: XGBoost** ✅ LISTO PARA IMPLEMENTAR
- Optimización de hiperparámetros
- Feature engineering avanzado
- Explicabilidad SHAP
- Mejora esperada: +10-15% accuracy

**Archivo**: `ml_models/xgboost_model.py`

### **Fase 3: Neural Networks Multi-Tarea** ✅ LISTO
- Clasificación paralela: enfermedad, urgencia, gravedad, categoría
- Hidden layers compartidas
- Branches específicas por tarea

**Archivo**: `ml_models/neural_network_model.py`

### **Fase 4: Sistema Híbrido** ✅ LISTO
- Combina reglas médicas + ML
- Sistema de emergencia priorizado
- Ensemble de todos los modelos
- Validación médica

**Archivo**: `ml_models/hybrid_system.py`

**Entrenamiento**: 
```bash
python ml_models/train_models.py --generate-dataset --model all --output models/
```

**Ver**: [docs/roadmaps/ML_ROADMAP.md](../docs/roadmaps/ML_ROADMAP.md) para roadmap completo (incluye Fase 6: Análisis Multimodal)

## 📖 Documentación Adicional

### Documentación Principal (Raíz)
- **[docs/ai-services/README.md](../docs/ai-services/README.md)**: Índice de documentación de AI Services
- **[docs/ai-services/README_PATTERNS.md](../docs/ai-services/README_PATTERNS.md)**: Documentación detallada de patrones implementados
- **[docs/ai-services/API_DOCUMENTATION.md](../docs/ai-services/API_DOCUMENTATION.md)**: Documentación completa de la API
- **[docs/ai-services/TESTING_GUIDE.md](../docs/ai-services/TESTING_GUIDE.md)**: Guía completa de testing
- **[docs/ai-services/README_ESTRUCTURA.md](../docs/ai-services/README_ESTRUCTURA.md)**: Estructura organizada del proyecto

### Documentación Específica (docs/)
- **[docs/AUDIO_SERVICES.md](docs/AUDIO_SERVICES.md)**: Servicios de audio (Whisper, análisis de tos)
- **[docs/MULTIMODAL_DATASETS.md](docs/MULTIMODAL_DATASETS.md)**: Generación de datasets sintéticos multimodales
- **[docs/GUIA_CHATBOT_MEDICO.md](docs/GUIA_CHATBOT_MEDICO.md)**: Guía del chatbot médico
- **[docs/MODELOS_INICIALES.md](docs/MODELOS_INICIALES.md)**: Documentación de modelos iniciales

### Enlaces Externos
- **[API Documentation](http://localhost:8000/docs)**: Documentación interactiva de la API
- **[Health Checks](http://localhost:8000/api/v1/health/detailed)**: Estado detallado del sistema
- **[ML Roadmap](../docs/roadmaps/ML_ROADMAP.md)**: Sistema de ML progresivo (incluye Fase 6: Multimodal)
