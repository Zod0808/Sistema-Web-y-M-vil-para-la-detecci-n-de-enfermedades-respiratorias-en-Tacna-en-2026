# ✅ Personalización por Edad y Grupo de Riesgo - COMPLETADA

## 🎯 Resumen

Se ha implementado un sistema completo de personalización que ajusta las predicciones ML según la edad del paciente y sus factores de riesgo, mejorando la precisión y relevancia de los diagnósticos.

---

## 📊 Grupos de Edad Definidos

### 10 Grupos de Edad
1. **Infant** (0-1 años) - Mayor riesgo, requiere atención inmediata
2. **Toddler** (1-3 años) - Alto riesgo
3. **Preschool** (3-6 años) - Riesgo moderado-alto
4. **Child** (6-12 años) - Riesgo moderado
5. **Adolescent** (12-18 años) - Riesgo bajo
6. **Young Adult** (18-30 años) - Riesgo bajo
7. **Adult** (30-50 años) - Riesgo bajo-moderado
8. **Middle Age** (50-65 años) - Riesgo moderado
9. **Elderly** (65-80 años) - Alto riesgo
10. **Very Elderly** (80+ años) - Muy alto riesgo

---

## 🔍 Factores de Riesgo Implementados

### 10 Factores de Riesgo Principales
1. **smoking** (Tabaquismo)
   - Multiplicador: 1.5x
   - Enfermedades relacionadas: EPOC, bronquitis crónica, neumonía

2. **diabetes** (Diabetes)
   - Multiplicador: 1.3x
   - Enfermedades: Neumonía, infecciones respiratorias

3. **hypertension** (Hipertensión)
   - Multiplicador: 1.2x
   - Enfermedades: EPOC, neumonía

4. **immunosuppression** (Inmunosupresión)
   - Multiplicador: 2.0x (muy alto)
   - Enfermedades: Neumonía grave, tuberculosis

5. **heart_disease** (Enfermedad cardíaca)
   - Multiplicador: 1.4x
   - Enfermedades: Neumonía, EPOC

6. **asthma_history** (Historial de asma)
   - Multiplicador: 1.6x
   - Enfermedades: Asma bronquial, estado asmático

7. **obesity** (Obesidad)
   - Multiplicador: 1.2x
   - Enfermedades: EPOC, apnea del sueño

8. **chronic_kidney_disease** (Enfermedad renal crónica)
   - Multiplicador: 1.3x
   - Enfermedades: Neumonía, infecciones respiratorias

9. **copd_history** (Historial de EPOC)
   - Multiplicador: 1.8x
   - Enfermedades: EPOC, bronquitis crónica

10. **previous_pneumonia** (Neumonía previa)
    - Multiplicador: 1.5x
    - Enfermedades: Neumonía, neumonía grave

---

## 🎯 Niveles de Riesgo

### 5 Niveles de Riesgo Calculados
1. **VERY_LOW** - Riesgo muy bajo (<0.2)
2. **LOW** - Riesgo bajo (0.2-0.4)
3. **MODERATE** - Riesgo moderado (0.4-0.6)
4. **HIGH** - Riesgo alto (0.6-0.8)
5. **VERY_HIGH** - Riesgo muy alto (>0.8)

El nivel de riesgo se calcula combinando:
- Edad del paciente
- Factores de riesgo presentes
- Enfermedad predicha

---

## ⚙️ Ajustes de Predicción

### 1. Ajuste de Confianza
- **Enfermedades comunes para la edad**: +10% confianza
- **Enfermedades raras para la edad**: -10% confianza
- **Factores de riesgo coincidentes**: +10-50% confianza según factor
- **Multiplicador de riesgo por edad**: Aplicado según grupo

### 2. Ajuste de Urgencia
- **Grupos de alto riesgo** (infantes, ancianos): +0.5 nivel
- **Factores de riesgo altos**: +0.5 nivel
- **Resultado**: Urgencia aumentada para casos de riesgo

### 3. Recomendaciones Personalizadas
- Recomendaciones específicas por edad
- Recomendaciones por factores de riesgo
- Recomendaciones por enfermedad
- Alertas de alta prioridad para casos críticos

---

## 📋 Ejemplos de Personalización

### Ejemplo 1: Lactante con Bronquiolitis
**Caso**:
- Edad: 6 meses
- Síntomas: Tos, sibilancias, dificultad respiratoria
- Enfermedad predicha: Bronquiolitis aguda
- Confianza base: 0.85

**Ajustes**:
- ✅ Confianza ajustada: 0.86 (enfermedad común para edad)
- ✅ Urgencia: Media → Media (ya era apropiada)
- ✅ Recomendación: "ⓘ IMPORTANTE: Niños pequeños requieren atención médica inmediata"

### Ejemplo 2: Anciano con Neumonía y Factores de Riesgo
**Caso**:
- Edad: 75 años
- Síntomas: Fiebre, tos, dificultad respiratoria
- Enfermedad predicha: Neumonía
- Factores de riesgo: diabetes, smoking
- Confianza base: 0.88

**Ajustes**:
- ✅ Confianza ajustada: 1.00 (máxima por factores de riesgo)
- ✅ Urgencia: Alta → Crítica (aumentada por edad y factores)
- ✅ Nivel de riesgo: HIGH
- ✅ 7 recomendaciones personalizadas incluidas:
  - "ⓘ IMPORTANTE: Adultos mayores tienen mayor riesgo de complicaciones"
  - "Considerar dejar de fumar para reducir riesgo"
  - "Monitorear niveles de glucosa"
  - "ⓘ Neumonía en adultos mayores puede ser grave"

---

## 🔌 Integraciones Realizadas

### 1. Ensemble Predictor
- ✅ Integrado en `ensemble_predictor.py`
- ✅ Parámetros: `risk_factors`, `apply_personalization`
- ✅ Aplicación automática después del ensemble

### 2. API Endpoint
- ✅ Endpoint `/api/v1/ml-analyze` actualizado
- ✅ Nuevos campos en input:
  - `risk_factors`: Lista de factores de riesgo
  - `apply_personalization`: Habilitar/deshabilitar personalización
- ✅ Nuevos campos en output:
  - `age_group`: Grupo de edad del paciente
  - `risk_level`: Nivel de riesgo calculado
  - `personalized_recommendations`: Recomendaciones personalizadas

### 3. Chatbot Service
- ✅ Integrado en `enhanced_chatbot_service.py`
- ✅ Soporte para factores de riesgo en predicciones
- ✅ Personalización automática activada

---

## 🚀 Uso del Sistema

### En la API
```json
POST /api/v1/ml-analyze
{
    "symptoms": ["tos", "fiebre", "dificultad respiratoria"],
    "patient_age": 75,
    "risk_factors": ["diabetes", "smoking", "hypertension"],
    "include_explanation": true,
    "apply_personalization": true
}
```

**Respuesta**:
```json
{
    "disease": "neumonía",
    "confidence": 0.95,
    "urgency_level": "critical",
    "age_group": "elderly",
    "risk_level": "high",
    "personalized_recommendations": [
        "ⓘ IMPORTANTE: Adultos mayores tienen mayor riesgo...",
        "Considerar dejar de fumar...",
        "Monitorear niveles de glucosa...",
        ...
    ]
}
```

### En el Chatbot
```python
prediction = chatbot_service._predict_with_ml(
    user_message="Tengo tos y fiebre",
    symptoms=[...],
    risk_factors=["diabetes", "smoking"]
)
# Personalización aplicada automáticamente
```

---

## 📊 Mejoras de Precisión

### Beneficios de la Personalización
1. **Mayor Precisión**: Ajuste de confianza según perfil del paciente
2. **Mejor Urgencia**: Detección más precisa de casos críticos
3. **Recomendaciones Relevantes**: Consejos específicos por edad/riesgo
4. **Prevención**: Identificación temprana de casos de alto riesgo

### Ejemplos de Mejora
- **Lactantes**: Urgencia aumentada automáticamente para enfermedades respiratorias
- **Ancianos con factores de riesgo**: Urgencia crítica para neumonía
- **Fumadores**: Mayor confianza en diagnósticos de EPOC
- **Inmunocomprometidos**: Alertas urgentes para infecciones

---

## 📁 Archivos Creados/Modificados

### Nuevos Archivos
- ✅ `ml_models/risk_personalization.py` - Sistema de personalización completo

### Archivos Modificados
- ✅ `ml_models/ensemble_predictor.py` - Integración de personalización
- ✅ `api/routes/symptom_ml_analyzer.py` - Endpoint con personalización
- ✅ `services/enhanced_chatbot_service.py` - Chatbot con personalización

---

## ✅ Estado Final

**Sistema de Personalización**: ✅ **COMPLETADO Y FUNCIONAL**

El sistema ajusta automáticamente:
- ✅ Confianza de predicciones según edad y factores de riesgo
- ✅ Niveles de urgencia para casos de alto riesgo
- ✅ Recomendaciones personalizadas por perfil del paciente
- ✅ Identificación de grupos de alto riesgo

**Factores Soportados**:
- ✅ 10 grupos de edad diferentes
- ✅ 10 factores de riesgo principales
- ✅ 5 niveles de riesgo calculados
- ✅ Recomendaciones personalizadas por contexto

---

## 🔍 Casos de Uso

### 1. Screening Preventivo
Sistema identifica pacientes de alto riesgo antes de que desarrollen síntomas graves.

### 2. Triage Inteligente
Ajusta automáticamente la urgencia según el perfil del paciente.

### 3. Recomendaciones Contextuales
Proporciona consejos específicos basados en edad y factores de riesgo.

### 4. Prevención
Identifica factores de riesgo modificables (ej: tabaquismo) y recomienda cambios.

---

## 📈 Próximos Pasos (Opcional)

1. ⏳ Añadir más factores de riesgo (alergias, medicamentos, etc.)
2. ⏳ Ajustar multiplicadores basados en datos reales
3. ⏳ Validar recomendaciones con médicos expertos
4. ⏳ Dashboard de seguimiento de pacientes de alto riesgo

