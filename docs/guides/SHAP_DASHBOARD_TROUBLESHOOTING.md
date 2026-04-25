# 🔧 Solución de Problemas - Dashboard SHAP de Explicabilidad

## 🐛 Problema: Dashboard muestra "No hay datos suficientes"

### Síntomas
- Todos los paneles muestran "0" o mensajes de "No hay datos suficientes"
- Gráficos vacíos
- Métricas en cero

### Causas Posibles

1. **No hay predicciones ML guardadas**
   - Las predicciones solo se guardan cuando se realizan análisis ML
   - Si no se han hecho análisis recientes, no habrá datos

2. **El monitor no está cargando datos existentes**
   - El monitor carga datos de archivos JSONL en `monitoring/predictions/`
   - Si no hay archivos, no habrá datos

3. **Problema de conexión entre frontend y backend**
   - Los endpoints pueden no estar respondiendo correctamente
   - Error en la configuración de la URL base

## ✅ Soluciones

### Solución 1: Poblar Datos de Prueba

Ejecuta el script para generar datos de prueba:

```bash
cd ai-services
python scripts/seed_ml_predictions.py --count 100 --days 7
```

Esto generará 100 predicciones distribuidas en los últimos 7 días.

**Opciones:**
- `--count N`: Número de predicciones a generar (default: 100)
- `--days N`: Días hacia atrás para generar predicciones (default: 7)

### Solución 2: Realizar Análisis ML Reales

Las predicciones se guardan automáticamente cuando se realizan análisis ML:

1. **Desde el Frontend Web:**
   - Ve a la sección de análisis de síntomas
   - Ingresa síntomas y realiza un análisis
   - La predicción se guardará automáticamente

2. **Desde la API:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/ml-analyze \
     -H "Content-Type: application/json" \
     -d '{
       "symptoms": ["tos", "fiebre", "dificultad respiratoria"],
       "patient_age": 35,
       "include_explanation": true
     }'
   ```

### Solución 3: Verificar Conexión Backend-AI Services

1. **Verificar que AI Services esté corriendo:**
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

2. **Verificar endpoints de monitoreo:**
   ```bash
   curl http://localhost:8000/api/v1/ml/monitoring/metrics?days=7
   ```

3. **Verificar que el backend pueda conectarse:**
   ```bash
   curl http://localhost:3001/api/v1/analytics/ml/monitoring?days=7
   ```

### Solución 4: Verificar Archivos JSONL

Los datos se guardan en archivos JSONL:

```bash
# Ver archivos de predicciones
ls -lh ai-services/monitoring/predictions/predictions_*.jsonl

# Ver contenido de un archivo
head -n 1 ai-services/monitoring/predictions/predictions_*.jsonl | jq
```

Si no hay archivos, ejecuta el script de seeding.

## 🔍 Verificación Paso a Paso

### 1. Verificar que el Monitor Carga Datos

```python
# En Python shell dentro de ai-services
from ml_models.prediction_monitor import get_monitor

monitor = get_monitor()
print(f"Predicciones cargadas: {len(monitor.predictions_log)}")
print(f"Enfermedades: {monitor.disease_counts}")
```

### 2. Verificar Endpoints del AI Service

```bash
# Métricas de monitoreo
curl http://localhost:8000/api/v1/ml/monitoring/metrics?days=7

# Contribuciones de features
curl http://localhost:8000/api/v1/ml/monitoring/features?top_n=10

# Métricas de equidad
curl http://localhost:8000/api/v1/ml/monitoring/fairness?groupField=gender
```

### 3. Verificar Endpoints del Backend

```bash
# Asegúrate de estar autenticado primero
TOKEN="tu-token-jwt"

# Métricas de monitoreo
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/analytics/ml/monitoring?days=7

# Features
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/analytics/ml/features?top=12

# Fairness
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/analytics/ml/fairness?groupField=gender
```

### 4. Verificar en el Frontend

Abre la consola del navegador (F12) y verifica:

1. **Requests a la API:**
   - Busca requests a `/api/v1/analytics/ml/*`
   - Verifica que no haya errores 404 o 500

2. **Respuestas:**
   - Las respuestas deben tener `success: true` y `data: {...}`
   - Si `data` está vacío, no hay predicciones guardadas

## 📊 Estructura de Datos Esperada

### Respuesta de `/analytics/ml/monitoring`

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_predictions": 100,
      "avg_confidence": 0.85,
      "median_confidence": 0.87,
      "low_confidence_predictions": 5
    },
    "distributions": {
      "diseases": {
        "asma bronquial": 25,
        "neumonía": 20,
        ...
      },
      "urgency_levels": {
        "low": 30,
        "medium": 40,
        "high": 25,
        "critical": 5
      }
    },
    "quality_metrics": {
      "high_confidence_rate": 75.0,
      "medium_confidence_rate": 20.0,
      "low_confidence_rate": 5.0
    }
  }
}
```

### Respuesta de `/analytics/ml/features`

```json
{
  "success": true,
  "data": {
    "top_features": [
      {
        "feature_name": "symptom_tos",
        "shap_abs": 0.45,
        "positive": 0.35,
        "negative": -0.10,
        "count": 50,
        "avg_contribution": 0.25
      },
      ...
    ],
    "friendly_factors": [
      {
        "description": "Presencia de tos",
        "count": 45
      },
      ...
    ]
  }
}
```

### Respuesta de `/analytics/ml/fairness`

```json
{
  "success": true,
  "data": {
    "M": {
      "count": 50,
      "avg_confidence": 0.85,
      "high_confidence_rate": 0.75
    },
    "F": {
      "count": 50,
      "avg_confidence": 0.83,
      "high_confidence_rate": 0.72
    }
  }
}
```

## 🚀 Solución Rápida

Si necesitas ver el dashboard funcionando inmediatamente:

```bash
# 1. Generar datos de prueba
cd ai-services
python scripts/seed_ml_predictions.py --count 200 --days 7

# 2. Reiniciar AI Services para cargar los datos
# (Si está en Docker)
docker-compose restart ai-services

# 3. Verificar que los datos se cargaron
curl http://localhost:8000/api/v1/ml/monitoring/metrics?days=7

# 4. Recargar el dashboard en el navegador
```

## 📝 Notas Importantes

1. **Los datos se guardan en archivos JSONL**, no en MongoDB directamente
2. **El monitor carga datos al inicializarse** desde archivos JSONL
3. **Las predicciones se guardan automáticamente** cuando se hacen análisis ML
4. **El formato de respuesta** debe incluir `success: true` y `data: {...}`

## 🔄 Flujo de Datos

```
Análisis ML → log_prediction() → Archivo JSONL → Monitor carga al iniciar → Endpoints API → Frontend
```

Si algún paso falla, los datos no aparecerán en el dashboard.

---

**Última actualización:** Diciembre 2024

