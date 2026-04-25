# Soporte Indirecto de AI para Dominios Core

Este documento describe cómo los AI Services proporcionan soporte indirecto a los dominios core del sistema RespiCare: Medical Histories, Appointments, Prescriptions y Alerts.

## 📋 Descripción General

Los AI Services no implementan directamente los dominios core, sino que proporcionan capacidades de inteligencia artificial que mejoran y optimizan las funcionalidades de estos dominios. Este es un enfoque de "soporte indirecto" donde AI Services actúa como un servicio auxiliar que enriquece los dominios core con capacidades de ML/NLP.

## 🏥 Dominios Core Soportados

### 1. Medical Histories (Historias Médicas)

**Soporte Indirecto:**
- Análisis de texto médico para extraer insights
- Identificación de factores de riesgo
- Evaluación de severidad
- Generación de recomendaciones
- Sugerencias de seguimiento

**Endpoint:**
```
POST /api/v1/core-domains/medical-history/analyze
```

**Request:**
```json
{
  "history_text": "Paciente de 65 años con tos persistente y dificultad respiratoria...",
  "patient_id": "patient123",
  "context": {
    "age": 65,
    "gender": "male"
  }
}
```

**Response:**
```json
{
  "success": true,
  "insights": {
    "key_symptoms": ["tos", "dificultad respiratoria"],
    "risk_factors": ["edad avanzada"],
    "severity_assessment": "high",
    "recommendations": [
      "Monitorear temperatura regularmente",
      "Buscar atención médica inmediata si empeora"
    ],
    "follow_up_suggestions": [
      {
        "type": "immediate",
        "description": "Consulta médica urgente",
        "timeframe": "24 horas"
      }
    ]
  }
}
```

### 2. Appointments (Citas Médicas)

**Soporte Indirecto:**
- Optimización de programación basada en síntomas y urgencia
- Análisis de síntomas para determinar urgencia real
- Recomendación del mejor slot disponible
- Generación de tips de preparación para la cita

**Endpoint:**
```
POST /api/v1/core-domains/appointments/optimize
```

**Request:**
```json
{
  "patient_id": "patient123",
  "symptoms": ["tos", "fiebre", "dificultad respiratoria"],
  "urgency": "medium",
  "available_slots": [
    {"datetime": "2024-12-01T10:00:00Z", "doctor": "Dr. Smith"},
    {"datetime": "2024-12-01T14:00:00Z", "doctor": "Dr. Jones"}
  ],
  "context": {
    "age": 65,
    "chronic_conditions": ["diabetes"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "recommended_slot": {
    "datetime": "2024-12-01T10:00:00Z",
    "doctor": "Dr. Smith"
  },
  "urgency_assessment": "high",
  "preparation_tips": [
    "Llevar registro de temperatura",
    "Traer lista de medicamentos actuales",
    "Llegar 15 minutos antes de la cita"
  ],
  "reasoning": "Urgent symptoms detected"
}
```

### 3. Prescriptions (Prescripciones)

**Soporte Indirecto:**
- Análisis de seguridad de prescripciones
- Extracción de medicamentos del texto
- Verificación de interacciones medicamentosas
- Verificación de conflictos con alergias
- Análisis de dosificación
- Generación de recomendaciones de seguridad

**Endpoint:**
```
POST /api/v1/core-domains/prescriptions/analyze
```

**Request:**
```json
{
  "prescription_text": "Amoxicilina 500mg cada 8 horas por 7 días...",
  "patient_id": "patient123",
  "current_medications": ["Paracetamol", "Ibuprofeno"],
  "allergies": ["Penicilina"],
  "context": {
    "age": 65,
    "weight": 70
  }
}
```

**Response:**
```json
{
  "success": true,
  "medications": [
    {
      "name": "Amoxicilina",
      "dosage": "500mg",
      "frequency": "cada 8 horas",
      "duration": "7 días"
    }
  ],
  "interactions": [],
  "allergy_warnings": [
    {
      "medication": "Amoxicilina",
      "allergy": "Penicilina",
      "severity": "high",
      "message": "Amoxicilina es un derivado de penicilina"
    }
  ],
  "dosage_analysis": {
    "status": "ok",
    "warnings": []
  },
  "recommendations": [
    "⚠️ ADVERTENCIA: Posibles conflictos con alergias"
  ],
  "safety_score": 80.0
}
```

### 4. Alerts (Alertas)

**Soporte Indirecto:**
- Evaluación de prioridad de alertas basada en síntomas
- Análisis de contexto del paciente
- Cálculo de score de prioridad
- Generación de recomendaciones de acción

**Endpoint:**
```
POST /api/v1/core-domains/alerts/assess-priority
```

**Request:**
```json
{
  "alert_data": {
    "type": "symptom_alert",
    "symptoms": ["dificultad respiratoria", "dolor pecho"],
    "severity": "high"
  },
  "patient_context": {
    "age": 65,
    "chronic_conditions": ["diabetes", "hipertensión"],
    "recent_visits": 2
  }
}
```

**Response:**
```json
{
  "success": true,
  "priority_level": "critical",
  "priority_score": 85.5,
  "symptom_analysis": {
    "assessed_urgency": "critical",
    "reasoning": "Urgent symptoms detected"
  },
  "context_risk": {
    "risk_level": "high",
    "factors": ["edad_avanzada", "condiciones_cronicas"]
  },
  "action_recommendations": [
    "Contactar servicios de emergencia inmediatamente",
    "Notificar al médico de cabecera"
  ]
}
```

## 🔧 Integración con Backend

El backend puede integrar estos servicios de AI de la siguiente manera:

### Ejemplo: Integración en Medical History Controller

```typescript
import axios from 'axios';

async function createMedicalHistory(req, res) {
  // Crear historia médica normalmente
  const history = await MedicalHistory.create(req.body);
  
  // Obtener análisis de AI (soporte indirecto)
  try {
    const aiAnalysis = await axios.post(
      `${process.env.AI_SERVICES_URL}/api/v1/core-domains/medical-history/analyze`,
      {
        history_text: history.description,
        patient_id: history.patientId,
        context: { age: patient.age, gender: patient.gender }
      }
    );
    
    // Guardar insights de AI en la historia
    history.aiInsights = aiAnalysis.data.insights;
    await history.save();
  } catch (error) {
    // No fallar si AI Services no está disponible
    logger.warn('AI analysis not available', error);
  }
  
  res.json(history);
}
```

## 📊 Métricas y Monitoreo

Los servicios de soporte indirecto incluyen:
- **Caché**: Resultados cacheados para mejorar performance
- **Circuit Breaker**: Protección contra fallos en cascada
- **Métricas**: Tiempo de ejecución y tasa de éxito
- **Logging**: Logs estructurados para debugging

## 🚀 Uso en Producción

### Configuración

1. **Variables de Entorno:**
```bash
AI_SERVICES_URL=http://ai-services:8000
CORE_DOMAINS_CACHE_TTL=1800
```

2. **Health Checks:**
Los endpoints incluyen health checks automáticos. Verifica que AI Services esté disponible antes de hacer llamadas.

3. **Fallback:**
El backend debe manejar gracefully cuando AI Services no está disponible. Los dominios core deben funcionar sin AI, pero con funcionalidades reducidas.

## 📝 Notas de Implementación

- Los servicios de AI son **opcionales** - los dominios core funcionan sin ellos
- El soporte indirecto **mejora** las funcionalidades pero no es **requerido**
- Los resultados de AI se almacenan como **metadata** en los recursos core
- El caché reduce la carga en AI Services para consultas repetidas

## 🔗 Referencias

- [AI Services API Documentation](../README.md)
- [Backend Integration Guide](../../backend/README.md)
- [Core Domains Architecture](../../docs/architecture/CORE_DOMAINS.md)

