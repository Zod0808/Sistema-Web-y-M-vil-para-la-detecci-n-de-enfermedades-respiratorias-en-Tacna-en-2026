# RespiCare AI Services - API Documentation

## 🚀 Base URL
```
http://localhost:8000
```

## 📑 Índice Rápido

- Advanced ML
  - [Texto (BERT)](#01-texto-transformerbert)
  - [Imagen (Visión por Computador)](#02-imagen-visión-por-computador)
  - [Series Temporales (Pronóstico)](#03-series-temporales-pronóstico)
- Advanced NLP
  - [Procesamiento General](#0bis1-procesamiento-general)
  - [NER (Entidades Médicas)](#0bis2-ner-entidades-médicas)
  - [Resumen Automático](#0bis3-resumen-automático)
  - [Traducción de Términos](#0bis4-traducción-de-términos)
  - [Análisis de Sentimiento](#0bis5-análisis-de-sentimiento)
- Reinforcement Learning
  - [Configurar](#rl-configurar)
  - [Entrenar](#rl-entrenar)
  - [Actuar](#rl-actuar)
- Federated Learning
  - [Registrar Clientes](#fl-registrar-clientes)
  - [Ejecutar Ronda](#fl-ejecutar-ronda)
  - [Modelo Global](#fl-modelo-global)
- Endpoints Core
  - [Health Check](#1-health-check)
  - [Analyze Medical Query](#2-analyze-medical-query-principal)
  - [Get Supported Diseases](#3-get-supported-diseases)
  - [Get Symptom Categories](#4-get-symptom-categories)

---

### RL - Configurar
**POST** `/api/v1/rl/configure`

```bash
curl -X POST http://localhost:8000/api/v1/rl/configure \
  -H "Content-Type: application/json" \
  -d '{"env_name":"clinical-optimizer","config":{"gamma":0.99}}'
```

Respuesta (ejemplo):
```json
{
  "status": "ok",
  "config": {
    "gamma": 0.99
  }
}
```

### RL - Entrenar
**POST** `/api/v1/rl/train`

```bash
curl -X POST http://localhost:8000/api/v1/rl/train \
  -H "Content-Type: application/json" \
  -d '{"env_name":"clinical-optimizer","episodes":5}'
```

Respuesta (ejemplo):
```json
{
  "status": "ok",
  "episodes": 5,
  "avg_reward": 0.742
}
```

### RL - Actuar
**POST** `/api/v1/rl/act`

```bash
curl -X POST http://localhost:8000/api/v1/rl/act \
  -H "Content-Type: application/json" \
  -d '{"env_name":"clinical-optimizer","state":{"patient_age":45,"severity":2}}'
```

Respuesta (ejemplo):
```json
{
  "status": "ok",
  "action": "monitor",
  "state_summary": ["patient_age", "severity"]
}
```

---

### FL - Registrar Clientes
**POST** `/api/v1/federated/register_clients`

```bash
curl -X POST http://localhost:8000/api/v1/federated/register_clients \
  -H "Content-Type: application/json" \
  -d '{"clients":["c1","c2","c3"]}'
```

Respuesta (ejemplo):
```json
{
  "status": "ok",
  "clients": ["c1", "c2", "c3"],
  "count": 3
}
```

### FL - Ejecutar Ronda
**POST** `/api/v1/federated/run_round`

```bash
curl -X POST http://localhost:8000/api/v1/federated/run_round \
  -H "Content-Type: application/json" \
  -d '{"client_updates":[{"acc":0.83},{"acc":0.88}]}'
```

Respuesta (ejemplo):
```json
{
  "status": "ok",
  "round": 1,
  "global_acc": 0.855
}
```

### FL - Modelo Global
**GET** `/api/v1/federated/global_model`

```bash
curl http://localhost:8000/api/v1/federated/global_model
```

Respuesta (ejemplo):
```json
{
  "status": "success",
  "model": {
    "model_name": "baseline-model",
    "version": 0
  }
}
```

---

## 🔐 Notas de Seguridad/Privacidad (Federated Learning)

- No se comparten datos crudos de pacientes entre clientes y servidor coordinador.
- Los clientes envían únicamente actualizaciones/gradientes o métricas agregadas (p. ej., `acc`, `loss`).
- Se recomienda aplicar técnicas de privacidad:
  - Differential Privacy (ruido en gradientes/updates).
  - Secure Aggregation (agregación cifrada de updates de clientes).
  - Encripción en tránsito (TLS) y opcionalmente en reposo.
- Control de acceso y auditoría:
  - Autenticar y autorizar clientes participantes por ronda.
  - Registrar rondas, modelos globales y fuentes de updates.
- Gestión de fallos y calidad:
  - Filtrar updates anómalos o maliciosos (defensa contra poisoning).
  - Validar métricas y coherencia de dimensiones antes de agregar.

## 📋 Endpoints

### 0. Advanced ML (Texto, Imagen, Series Temporales)

Endpoints para capacidades avanzadas de ML (stubs funcionales con contratos definidos).

#### 0.1 Texto (Transformer/BERT)

**POST** `/api/v1/ml/advanced/text`

Request:
```json
{
  "texts": [
    "Paciente con tos seca y disnea desde hace 3 días.",
    "Dolor torácico y fiebre alta, sospecha de neumonía."
  ],
  "model_name": "bert-base-uncased"
}
```

Response:
```json
{
  "status": "success",
  "count": 2,
  "predictions": [
    {
      "text": "Paciente con tos seca y disnea desde hace 3 días.",
      "labels": ["asthma", "copd", "flu"],
      "scores": [0.12, 0.78, 0.10],
      "top_label": "copd"
    }
  ]
}
```

Ejemplo cURL:
```bash
curl -X POST http://localhost:8000/api/v1/ml/advanced/text \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Paciente con tos seca y disnea desde hace 3 días."],
    "model_name": "bert-base-uncased"
  }'
```

---

### 0bis. Advanced NLP (Procesamiento, NER, Resumen, Traducción, Sentimiento)

Endpoints para capacidades avanzadas de NLP médico (stubs con contratos claros).

#### 0bis.1 Procesamiento General

**POST** `/api/v1/nlp/advanced/process`

Request:
```json
{
  "text": "Paciente con tos y fiebre.",
  "language": "es"
}
```

Ejemplo cURL:
```bash
curl -X POST http://localhost:8000/api/v1/nlp/advanced/process \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Paciente con tos y fiebre.",
    "language": "es"
  }'
```

Respuesta (ejemplo):
```json
{
  "status": "success",
  "result": {
    "text": "Paciente con tos y fiebre.",
    "tokens": ["paciente", "con", "tos", "y", "fiebre"],
    "language": "es"
  }
}
```

---

#### 0bis.2 NER (Entidades Médicas)

**POST** `/api/v1/nlp/advanced/ner`

Request:
```json
{
  "text": "Diagnóstico: neumonía. Tratamiento con paracetamol.",
  "language": "es"
}
```

Ejemplo cURL:
```bash
curl -X POST http://localhost:8000/api/v1/nlp/advanced/ner \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Diagnóstico: neumonía. Tratamiento con paracetamol.",
    "language": "es"
  }'
```

Respuesta (ejemplo):
```json
{
  "status": "success",
  "result": {
    "text": "Diagnóstico: neumonía. Tratamiento con paracetamol.",
    "entities": [
      { "text": "neumonía", "label": "DISEASE" },
      { "text": "paracetamol", "label": "DRUG" }
    ]
  }
}
```

---

#### 0bis.3 Resumen Automático

**POST** `/api/v1/nlp/advanced/summarize`

Request:
```json
{
  "text": "Primera oración. Segunda oración. Tercera oración.",
  "language": "es"
}
```

Ejemplo cURL:
```bash
curl -X POST http://localhost:8000/api/v1/nlp/advanced/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Primera oración. Segunda oración. Tercera oración.",
    "language": "es"
  }'
```

Respuesta (ejemplo):
```json
{
  "status": "success",
  "result": {
    "text": "Primera oración. Segunda oración. Tercera oración.",
    "summary": "Primera oración. Segunda oración."
  }
}
```

---

#### 0bis.4 Traducción de Términos

**POST** `/api/v1/nlp/advanced/translate`

Request:
```json
{
  "term": "asma",
  "source_language": "es",
  "target_language": "en"
}
```

Ejemplo cURL:
```bash
curl -X POST http://localhost:8000/api/v1/nlp/advanced/translate \
  -H "Content-Type: application/json" \
  -d '{
    "term": "asma",
    "source_language": "es",
    "target_language": "en"
  }'
```

Respuesta (ejemplo):
```json
{
  "status": "success",
  "result": {
    "term": "asma",
    "translated": "asthma",
    "from": "es",
    "to": "en"
  }
}
```

---

#### 0bis.5 Análisis de Sentimiento

**POST** `/api/v1/nlp/advanced/sentiment`

Request:
```json
{
  "text": "El paciente se encuentra mejor y estable.",
  "language": "es"
}
```

Ejemplo cURL:
```bash
curl -X POST http://localhost:8000/api/v1/nlp/advanced/sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "text": "El paciente se encuentra mejor y estable.",
    "language": "es"
  }'
```

Respuesta (ejemplo):
```json
{
  "status": "success",
  "result": {
    "text": "El paciente se encuentra mejor y estable.",
    "score": 2,
    "label": "positive"
  }
}
```

---

#### 0.2 Imagen (Visión por Computador)

**POST** `/api/v1/ml/advanced/image`

Request:
```json
{
  "images": [
    "s3://bucket/imagenes/rx_001.png",
    "/data/studies/ct_abc123.jpg"
  ],
  "model_name": "resnet50"
}
```

Response:
```json
{
  "status": "success",
  "count": 2,
  "predictions": [
    {
      "image": "/data/studies/ct_abc123.jpg",
      "labels": ["normal", "anomaly"],
      "scores": [0.85, 0.15],
      "top_label": "normal"
    }
  ]
}
```

Ejemplo cURL:
```bash
curl -X POST http://localhost:8000/api/v1/ml/advanced/image \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["/data/studies/ct_abc123.jpg"],
    "model_name": "resnet50"
  }'
```

---

#### 0.3 Series Temporales (Pronóstico)

**POST** `/api/v1/ml/advanced/timeseries`

Request:
```json
{
  "series": [
    {"date": "2025-11-01T00:00:00Z", "value": 2.1},
    {"date": "2025-11-02T00:00:00Z", "value": 2.4},
    {"date": "2025-11-03T00:00:00Z", "value": 2.3}
  ],
  "model_type": "simple-linear",
  "horizon_days": 7
}
```

Response:
```json
{
  "status": "success",
  "horizon_days": 7,
  "forecast": [
    {"date": "2025-11-04T00:00:00.000Z", "predicted": 2.25, "confidence": 0.7}
  ]
}
```

Ejemplo cURL:
```bash
curl -X POST http://localhost:8000/api/v1/ml/advanced/timeseries \
  -H "Content-Type: application/json" \
  -d '{
    "series": [
      {"date": "2025-11-01T00:00:00Z", "value": 2.1},
      {"date": "2025-11-02T00:00:00Z", "value": 2.4}
    ],
    "model_type": "simple-linear",
    "horizon_days": 7
  }'
```

---

### 1. Health Check
**GET** `/api/v1/health`

Verifica el estado del servicio.

**Response:**
```json
{
  "status": "healthy",
  "service": "ai-services",
  "version": "1.0.0",
  "timestamp": "2025-10-24T02:00:00.000000"
}
```

---

### 2. Analyze Medical Query (Principal)
**POST** `/api/v1/analyze`

Analiza consultas médicas sobre enfermedades respiratorias y proporciona respuestas inteligentes.

#### Request Body:
```json
{
  "query": "¿Qué es el asma?",
  "context": "respiratory_diseases",
  "patient_id": "P001",
  "include_recommendations": true
}
```

**Parámetros:**
- `query` (string, requerido): Pregunta o consulta médica
- `context` (string, opcional): Contexto de la consulta (default: "respiratory_diseases")
- `patient_id` (string, opcional): ID del paciente
- `include_recommendations` (boolean, opcional): Incluir recomendaciones (default: true)

#### Response:
```json
{
  "status": "success",
  "message": "🫁 **ASMA**\n\nEl asma es una enfermedad crónica...",
  "analysis": {
    "detected_diseases": ["asma"],
    "detected_symptoms": ["tos", "dificultad respiratoria"],
    "question_type": "definition",
    "detailed_info": {
      "disease": "asma"
    }
  },
  "recommendations": [
    "Usar inhalador de rescate según necesidad",
    "Mantener inhalador de control diario",
    "Evitar desencadenantes conocidos"
  ],
  "urgency_level": "medium",
  "confidence": 0.85,
  "timestamp": "2025-10-24T02:00:00.000000"
}
```

**Niveles de Urgencia:**
- `critical` 🚨 - Atención médica inmediata
- `high` ⚠️ - Atención urgente (2 horas)
- `medium` ⚡ - Atención prioritaria (24 horas)
- `low` ✅ - Monitoreo regular
- `very_low` ✅ - Información general

---

### 3. Get Supported Diseases
**GET** `/api/v1/diseases`

Obtiene la lista de enfermedades respiratorias soportadas.

**Response:**
```json
{
  "status": "success",
  "count": 7,
  "diseases": [
    {
      "id": "asma",
      "name": "Asma",
      "description": "El asma es una enfermedad crónica que afecta las vías respiratorias...",
      "urgency": "medium"
    }
  ]
}
```

---

### 4. Get Symptom Categories
**GET** `/api/v1/symptoms`

Obtiene las categorías de síntomas disponibles.

**Response:**
```json
{
  "status": "success",
  "categories": {
    "respiratory": ["tos", "tos seca", "dificultad respiratoria", ...],
    "fever": ["fiebre", "temperatura alta", "escalofríos", ...],
    "pain": ["dolor de cabeza", "dolor de garganta", ...],
    ...
  }
}
```

---

## 🏥 Enfermedades Soportadas

### 1. **Asma**
- **Aliases:** asma, asmático
- **Urgencia:** Medium
- **Síntomas:** dificultad para respirar, sibilancias, opresión en el pecho, tos

### 2. **Neumonía**
- **Aliases:** neumonia, neumonía, pulmonía
- **Urgencia:** High
- **Síntomas:** fiebre alta, tos con flema, dolor en el pecho, dificultad respiratoria

### 3. **Bronquitis**
- **Aliases:** bronquitis
- **Urgencia:** Low
- **Síntomas:** tos persistente, producción de mucosidad, fatiga

### 4. **COVID-19**
- **Aliases:** covid, covid-19, covid19, coronavirus, sars-cov-2
- **Urgencia:** Medium
- **Síntomas:** fiebre, tos seca, fatiga, pérdida de olfato o gusto

### 5. **Gripe (Influenza)**
- **Aliases:** gripe, influenza, flu
- **Urgencia:** Low
- **Síntomas:** fiebre súbita, dolores musculares, dolor de cabeza, fatiga extrema

### 6. **EPOC**
- **Aliases:** epoc, enfermedad pulmonar obstructiva
- **Urgencia:** Medium
- **Síntomas:** falta de aire, sibilancias, opresión en el pecho, tos crónica

### 7. **Resfriado Común**
- **Aliases:** resfriado, resfrío, catarro
- **Urgencia:** Very Low
- **Síntomas:** congestión nasal, estornudos, dolor de garganta, tos leve

---

## 🔍 Tipos de Consultas Soportadas

### 1. **Definición** (`definition`)
Preguntas sobre qué es una enfermedad.

**Ejemplos:**
- "¿Qué es el asma?"
- "Define la neumonía"
- "Explícame qué es la bronquitis"

### 2. **Síntomas** (`symptoms`)
Preguntas sobre síntomas de enfermedades.

**Ejemplos:**
- "¿Cuáles son los síntomas del COVID-19?"
- "Señales de neumonía"
- "Síntomas de la gripe"

### 3. **Tratamiento** (`treatment`)
Preguntas sobre cómo tratar enfermedades.

**Ejemplos:**
- "¿Cómo se trata el asma?"
- "Tratamiento para la bronquitis"
- "Qué medicina tomar para la gripe"

### 4. **Prevención** (`prevention`)
Preguntas sobre cómo prevenir enfermedades.

**Ejemplos:**
- "¿Cómo prevenir la neumonía?"
- "Prevención del COVID-19"
- "Cómo evitar el asma"

### 5. **Acción** (`action`)
Preguntas sobre qué hacer en situaciones específicas.

**Ejemplos:**
- "Tengo fiebre y tos, ¿qué hago?"
- "¿Debo ir al médico?"
- "Qué hacer si tengo dificultad para respirar"

### 6. **General** (`general`)
Consultas generales o múltiples temas.

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Consulta sobre Asma
```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Qué es el asma?",
    "context": "respiratory_diseases"
  }'
```

**Respuesta:**
- Detecta: `asma`
- Tipo: `definition`
- Urgencia: `medium`
- Confianza: `0.85`

---

### Ejemplo 2: Síntomas de Neumonía
```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Cuáles son los síntomas de neumonía?"
  }'
```

**Respuesta:**
- Detecta: `neumonia`
- Tipo: `symptoms`
- Urgencia: `high` ⚠️
- Confianza: `0.85`
- Incluye signos de alarma

---

### Ejemplo 3: Análisis de Síntomas
```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Tengo tos, fiebre y dificultad para respirar",
    "include_recommendations": true
  }'
```

**Respuesta:**
- Detecta síntomas: `tos`, `fiebre`, `dificultad respiratoria`
- Urgencia: `medium`
- Confianza: `0.7`
- Proporciona 5 recomendaciones
- Sugiere posibles condiciones

---

### Ejemplo 4: Tratamiento COVID-19
```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Cómo tratar el COVID-19?",
    "context": "respiratory_diseases"
  }'
```

**Respuesta:**
- Detecta: `covid19`
- Tipo: `treatment`
- Urgencia: `medium`
- Incluye protocolo de aislamiento
- Lista signos de alarma

---

## 🔐 Seguridad y Consideraciones

### ⚠️ Disclaimer Médico
Todas las respuestas incluyen automáticamente el siguiente aviso:

> ⚠️ **Importante:** Esta es información general. Para un diagnóstico preciso y tratamiento personalizado, consulta con un profesional de la salud.

### 🛡️ CORS
El servicio está configurado con CORS abierto (`allow_origins=["*"]`) para desarrollo.

**⚠️ En producción:** Especificar orígenes permitidos:
```python
allow_origins=["https://tudominio.com", "https://app.tudominio.com"]
```

### 📝 Logging
Todas las peticiones son registradas con:
- Query original
- Enfermedades detectadas
- Nivel de urgencia
- Confianza del análisis
- Timestamp

---

## 🎯 Integración con Frontend (React)

### Ejemplo de uso en ChatBot:

```javascript
import axios from 'axios';

const analyzeQuery = async (userQuery) => {
  try {
    const response = await axios.post('http://localhost:8000/api/v1/analyze', {
      query: userQuery,
      context: 'respiratory_diseases',
      include_recommendations: true
    });

    return {
      message: response.data.message,
      urgency: response.data.urgency_level,
      confidence: response.data.confidence,
      recommendations: response.data.recommendations
    };
  } catch (error) {
    console.error('Error analyzing query:', error);
    throw error;
  }
};
```

---

## 📈 Métricas y Rendimiento

### Confianza del Análisis:
- **0.85+**: Enfermedad específica detectada
- **0.70-0.84**: Síntomas detectados
- **< 0.70**: Consulta general

### Tiempo de Respuesta:
- Promedio: < 100ms
- Máximo: < 500ms

---

## 🐛 Manejo de Errores

### Error 400 - Bad Request
```json
{
  "detail": "Query must be at least 3 characters long"
}
```

### Error 500 - Internal Server Error
```json
{
  "detail": "Analysis failed: [error message]"
}
```

---

## 🚀 Próximas Mejoras

- [ ] Integración con modelos de ML (spaCy, transformers)
- [ ] Análisis de sentimiento
- [ ] Detección de urgencia basada en ML
- [ ] Soporte multiidioma (inglés, quechua)
- [ ] Historial de conversaciones
- [ ] Análisis de imágenes médicas
- [ ] Integración con bases de datos de pacientes
- [ ] Sistema de recomendaciones personalizadas

---

## 📞 Soporte

Para problemas o preguntas:
- Revisar logs: `docker-compose -f docker-compose.dev.yml logs ai-services`
- Verificar salud: `GET /api/v1/health`
- Documentación interactiva: `http://localhost:8000/docs`

---

## 📚 Referencias

- FastAPI Documentation: https://fastapi.tiangolo.com
- Medical Data Standards: https://www.hl7.org
- RespiCare Project: https://github.com/tu-usuario/respicare

---

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2024  
**Autor:** RespiCare Development Team

