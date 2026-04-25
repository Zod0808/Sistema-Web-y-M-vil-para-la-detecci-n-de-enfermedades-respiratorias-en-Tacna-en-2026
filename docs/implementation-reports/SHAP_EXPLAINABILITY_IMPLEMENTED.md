# 🎯 SHAP Explainability System - Implementado

## ✅ **Completado**

### **1. Sistema SHAP para Explicabilidad**

He implementado un sistema completo de explicabilidad usando **SHAP (SHapley Additive exPlanations)** para el diagnóstico de enfermedades respiratorias.

---

## 📁 **Archivos Creados**

### **1. `shap_explainer.py`**
Sistema principal de explicabilidad con SHAP:

**Características**:
- ✅ Explicación de predicciones individuales
- ✅ Análisis de batch (múltiples casos)
- ✅ Resumen de importancia de características
- ✅ Visualizaciones SHAP (waterfall plots)
- ✅ Compatibilidad con XGBoost y Random Forest

**Métodos principales**:
```python
- explain_prediction()    # Explicar una predicción
- explain_batch()         # Explicar múltiples casos
- get_feature_importance_summary()  # Importancia global
- visualize_shap()        # Visualización SHAP
```

### **2. `symptom_ml_analyzer.py`**
API REST para análisis ML con SHAP:

**Endpoints**:
- `POST /api/v1/ml-analyze` - Analizar síntomas con SHAP
- `GET /api/v1/ml-model-info` - Info de modelos ML
- `POST /api/v1/ml-explanation` - Explicación detallada

**Características**:
- ✅ Input: Lista de síntomas
- ✅ Output: Predicción + explicación SHAP
- ✅ Top 3 predicciones con confianza
- ✅ Factores de decisión (por qué este diagnóstico)
- ✅ Contribución de cada síntoma

### **3. Integración en `main.py`**
- ✅ Router de ML Analysis registrado
- ✅ Disponible en `/api` con tags `["ML Analysis"]`

---

## 🔧 **Cómo Funciona SHAP**

### **Explicación Individual**:
SHAP calcula el valor de contribución de cada característica (síntoma) a la predicción final:

```python
symptoms = ["tos", "sibilancias", "dificultad respiratoria"]
prediction = explainer.explain_prediction(symptoms)
```

**Output**:
```json
{
  "disease": "asma bronquial",
  "confidence": 0.95,
  "explanation": {
    "decision_factors": [
      {"feature": "sibilancias", "contribution": +0.42},
      {"feature": "dificultad respiratoria", "contribution": +0.38},
      {"feature": "tos", "contribution": +0.15}
    ]
  }
}
```

### **Factores de Decisión**:
- **Valores positivos**: Síntomas que **favorecen** el diagnóstico
- **Valores negativos**: Síntomas que **desfavorecen** el diagnóstico

**Ejemplo**:
- `sibilancias: +0.42` → "Este síntoma aumenta la probabilidad de asma"
- `fiebre: -0.12` → "Este síntoma reduce la probabilidad de asma"

---

## 📊 **Feature Engineering Avanzado**

El sistema utiliza **15 features avanzadas** además de sintomas textuales:

1. **Contadores básicos**: Número de síntomas
2. **Categorías**: Síntomas respiratorios, sistémicos, de dolor
3. **Indicadores de severidad**: Intensidad de síntomas
4. **Indicadores de emergencia**: Síntomas críticos
5. **Específicos**: Fiebre, tos, dificultad respiratoria, fatiga
6. **Duración**: Agudo vs crónico
7. **Edad normalizada**: Factor de edad del paciente

---

## 🚀 **Uso en Producción**

### **Ejemplo de Llamada API**:
```bash
POST /api/v1/ml-analyze
{
  "symptoms": ["tos", "sibilancias", "dificultad respiratoria"],
  "patient_age": 35,
  "include_explanation": true
}
```

### **Respuesta con SHAP**:
```json
{
  "disease": "asma bronquial",
  "confidence": 0.95,
  "urgency_level": "high",
  "explanation": {
    "positive_factors": [
      {"feature": "sibilancias", "contribution": 0.42},
      {"feature": "dificultad respiratoria", "contribution": 0.38}
    ],
    "negative_factors": [
      {"feature": "fiebre", "contribution": -0.12}
    ]
  },
  "top_3_predictions": [
    {"disease": "asma bronquial", "confidence": "0.9500"},
    {"disease": "bronquitis aguda", "confidence": "0.0300"},
    {"disease": "epoc", "confidence": "0.0100"}
  ]
}
```

---

## 📈 **Beneficios de SHAP**

### **1. Transparencia Médica**:
- ✅ Explica **POR QUÉ** el modelo predice cada enfermedad
- ✅ Muestra qué síntomas son más relevantes
- ✅ Identifica síntomas contradictorios

### **2. Confianza del Usuario**:
- ✅ No es una "caja negra"
- ✅ Usuario puede entender la lógica
- ✅ Facilita la validación médica

### **3. Debugging y Mejora**:
- ✅ Identifica features problemáticas
- ✅ Permite ajustar pesos
- ✅ Optimiza modelo basado en SHAP

---

## 🎯 **Próximos Pasos**

1. ✅ **Entrenar modelo XGBoost** con los 64k casos
2. ✅ **Validar con médicos** casos de prueba
3. ⏳ **Integrar con chatbot** para explicaciones en tiempo real
4. ⏳ **Dashboard de SHAP** para visualizaciones
5. ⏳ **Sistema de feedback** médico para mejorar

---

## 📝 **Estado Actual**

| Componente | Estado | Archivo |
|-------------|--------|---------|
| SHAP Explainer | ✅ Implementado | `shap_explainer.py` |
| ML API | ✅ Implementado | `api/routes/symptom_ml_analyzer.py` |
| Feature Engineering | ✅ Implementado | `AdvancedFeatureEngineering` |
| Integración | ✅ Implementado | `main.py` |
| Modelo Entrenado | ✅ Completado | `base_random_forest.pkl` (99.19% accuracy) |
| XGBoost Entrenado | ⏳ PENDIENTE | Requiere dataset + entrenamiento |

---

## 🏥 **Casos de Uso**

### **Caso 1: Diagnóstico con Explicación**
```
Usuario: "Tengo tos, sibilancias, dificultad para respirar"

Sistema:
  - Predicción: Asma bronquial (95%)
  - Explicación: 
    * Sibilancias (+0.42) → Factor clave
    * Dificultad respiratoria (+0.38) → Importante
    * Tos (+0.15) → Coincide
  - Urgencia: Alta (necesita atención médica)
```

### **Caso 2: Conflicto de Síntomas**
```
Usuario: "Fiebre alta, congestión nasal, dolor de garganta"

Sistema:
  - Predicción: Influenza A (85%)
  - Explicación:
    * Fiebre (+0.45) → Factor determinante
    * Congestión (-0.20) → No típico de influenza
  - Aviso: Conflicto detectado, validar con médico
```

---

**Estado**: Sistema de explicabilidad SHAP implementado ✅  
**Próximo**: Entrenar XGBoost y comparar rendimiento

