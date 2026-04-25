# 📊 Documentación de Modelos Iniciales - RespiCare Tacna

Este documento describe los modelos iniciales de Machine Learning implementados en el sistema RespiCare Tacna para análisis predictivo, detección de anomalías y pronóstico de demanda.

---

## 📋 Índice

1. [Disease Trend Predictor](#disease-trend-predictor)
2. [Statistical Anomaly Detector](#statistical-anomaly-detector)
3. [Healthcare Demand Forecaster](#healthcare-demand-forecaster)

---

## 1. Disease Trend Predictor

### Descripción
Modelo heurístico que predice tendencias de enfermedades respiratorias utilizando suavizado exponencial. Calcula la dirección de la tendencia (incremento, decremento, estable) y genera proyecciones a corto plazo.

### Archivo
`ai-services/ml_models/trend_predictor.py`

### Inputs

#### Entrenamiento (`fit`)
- **Tipo**: `pandas.DataFrame`
- **Columnas requeridas**:
  - `date`: Fecha de la observación (string o datetime)
  - `disease`: Nombre de la enfermedad (string)
  - `count`: Cantidad de casos (número entero o flotante)
- **Ejemplo**:
```python
import pandas as pd
data = pd.DataFrame({
    'date': ['2024-01-01', '2024-01-02', '2024-01-03'],
    'disease': ['Asma', 'Asma', 'Asma'],
    'count': [10, 12, 15]
})
```

#### Predicción (`get_trend_summary`)
- **Parámetro**: `disease` (string) - Nombre de la enfermedad a analizar
- **Ejemplo**:
```python
summary = predictor.get_trend_summary('Asma')
```

### Outputs

#### `TrendSummary`
- **`disease`** (str): Nombre de la enfermedad
- **`last_value`** (float): Último valor observado
- **`change_pct`** (float): Porcentaje de cambio (positivo = incremento, negativo = decremento)
- **`trend`** (str): Dirección de la tendencia (`"increasing"`, `"decreasing"`, `"stable"`)
- **`support`** (int): Cantidad de observaciones utilizadas

#### Ejemplo de respuesta:
```python
TrendSummary(
    disease='Asma',
    last_value=15.0,
    change_pct=25.5,
    trend='increasing',
    support=10
)
```

### Parámetros de configuración

- **`smoothing_factor`** (float, default: 0.35): Factor alfa para suavizado exponencial (0-1)
  - Valores más altos = más peso a observaciones recientes
  - Valores más bajos = más suavizado, menos sensibilidad a cambios recientes
- **`min_support`** (int, default: 3): Cantidad mínima de observaciones necesarias

### Limitaciones

1. **Datos mínimos**: Requiere al menos `min_support` observaciones por enfermedad
2. **Proyecciones simples**: No considera estacionalidad ni factores externos (clima, eventos)
3. **Tendencias lineales**: Asume que las tendencias son relativamente lineales en el corto plazo
4. **Sin validación cruzada**: No incluye validación automática de la calidad del modelo
5. **Sin manejo de outliers**: No filtra automáticamente valores atípicos antes del cálculo

### Ejemplos de uso

#### Uso básico
```python
from ml_models.trend_predictor import DiseaseTrendPredictor
import pandas as pd

# Preparar datos
data = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=30, freq='D'),
    'disease': ['Asma'] * 30,
    'count': [10 + i * 0.5 for i in range(30)]
})

# Entrenar
predictor = DiseaseTrendPredictor(smoothing_factor=0.35, min_support=3)
predictor.fit(data)

# Obtener tendencia
summary = predictor.get_trend_summary('Asma')
print(f"Tendencia: {summary.trend}, Cambio: {summary.change_pct}%")
```

#### Uso con múltiples enfermedades
```python
# Datos con múltiples enfermedades
data = pd.DataFrame({
    'date': ['2024-01-01', '2024-01-02', '2024-01-03'] * 2,
    'disease': ['Asma'] * 3 + ['Bronquitis'] * 3,
    'count': [10, 12, 15, 5, 6, 4]
})

predictor.fit(data)

# Analizar cada enfermedad
for disease in data['disease'].unique():
    summary = predictor.get_trend_summary(disease)
    print(f"{disease}: {summary.trend} ({summary.change_pct:.2f}%)")
```

---

## 2. Statistical Anomaly Detector

### Descripción
Detector estadístico de anomalías basado en puntuaciones Z (z-score). Identifica valores atípicos en series temporales clínicas utilizando métodos estadísticos simples.

### Archivo
`ai-services/ml_models/anomaly_detector.py`

### Inputs

#### Detección simple (`detect`)
- **Tipo**: `Sequence[float]` (lista, array numpy, o pandas Series)
- **Ejemplo**:
```python
series = [10, 12, 11, 15, 50, 13, 12]  # 50 es una anomalía
```

#### Detección con ventana móvil (`rolling_detect`)
- **Tipo**: `pandas.Series` con índice temporal
- **Parámetro**: `window` (int, default: 5) - Tamaño de la ventana móvil
- **Ejemplo**:
```python
import pandas as pd
series = pd.Series([10, 12, 11, 15, 50, 13, 12], 
                   index=pd.date_range('2024-01-01', periods=7, freq='D'))
```

### Outputs

#### `detect()` → `List[AnomalyRecord]`
- **`index`** (int): Índice del valor anómalo en la serie original
- **`value`** (float): Valor anómalo detectado
- **`z_score`** (float): Puntuación Z calculada (valores > `z_threshold` se consideran anomalías)

#### `rolling_detect()` → `pandas.Series`
- Serie booleana indicando si cada punto es anómalo (`True`) o no (`False`)

#### Ejemplo de respuesta:
```python
[
    AnomalyRecord(index=4, value=50.0, z_score=3.2)
]
```

### Parámetros de configuración

- **`z_threshold`** (float, default: 2.5): Umbral de z-score para marcar anomalías
  - Valores más altos = menos anomalías detectadas (más estricto)
  - Valores más bajos = más anomalías detectadas (más sensible)
- **`min_std`** (float, default: 1e-3): Desviación estándar mínima requerida
  - Si la desviación estándar es menor, no se detectan anomalías (datos muy uniformes)
- **`window`** (int, default: 5): Tamaño de ventana para `rolling_detect`

### Limitaciones

1. **Asunción de normalidad**: Asume que los datos siguen una distribución aproximadamente normal
2. **Sin contexto temporal**: La detección simple no considera el orden temporal de los datos
3. **Sensibilidad a outliers**: Si hay muchos outliers, puede afectar el cálculo de media/desviación
4. **Sin agrupación**: No agrupa anomalías cercanas en el tiempo
5. **Sin explicación**: No proporciona razones por las que un valor es anómalo

### Ejemplos de uso

#### Detección simple
```python
from ml_models.anomaly_detector import StatisticalAnomalyDetector

detector = StatisticalAnomalyDetector(z_threshold=2.5)
series = [10, 12, 11, 15, 50, 13, 12]  # 50 es una anomalía

anomalies = detector.detect(series)
for anomaly in anomalies:
    print(f"Anomalía en índice {anomaly.index}: valor={anomaly.value}, z-score={anomaly.z_score:.2f}")
```

#### Detección con ventana móvil
```python
import pandas as pd
from ml_models.anomaly_detector import StatisticalAnomalyDetector

detector = StatisticalAnomalyDetector(z_threshold=2.5)
series = pd.Series(
    [10, 12, 11, 15, 50, 13, 12, 14, 11, 12],
    index=pd.date_range('2024-01-01', periods=10, freq='D')
)

anomaly_flags = detector.rolling_detect(series, window=5)
print(anomaly_flags)
# 2024-01-01    False
# 2024-01-02    False
# 2024-01-03    False
# 2024-01-04    False
# 2024-01-05    True   # Anomalía detectada
# ...
```

---

## 3. Healthcare Demand Forecaster

### Descripción
Modelo heurístico para prever demanda de recursos médicos (camas UCI, ventiladores, personal). Utiliza regresiones lineales simples y medias móviles para estimar la demanda futura.

### Archivo
`ai-services/ml_models/demand_forecasting.py`

### Inputs

#### Entrenamiento (`fit`)
- **Tipo**: `pandas.DataFrame`
- **Columnas requeridas**:
  - `date`: Fecha de la observación (string o datetime)
  - `resource`: Nombre del recurso (string, ej: "ICU_Beds", "Ventilators")
  - `usage`: Uso del recurso (número entero o flotante)
- **Ejemplo**:
```python
import pandas as pd
data = pd.DataFrame({
    'date': ['2024-01-01', '2024-01-02', '2024-01-03'],
    'resource': ['ICU_Beds', 'ICU_Beds', 'ICU_Beds'],
    'usage': [45, 48, 50]
})
```

#### Pronóstico (`forecast`)
- **Parámetro**: `resource` (string) - Nombre del recurso a pronosticar
- **Parámetro**: `periods` (int, default: 7) - Número de períodos futuros a pronosticar
- **Ejemplo**:
```python
forecast = forecaster.forecast('ICU_Beds', periods=7)
```

### Outputs

#### `ResourceForecast`
- **`resource`** (str): Nombre del recurso
- **`predictions`** (List[Dict[str, float]]): Lista de pronósticos, cada uno con:
  - `date`: Fecha del pronóstico
  - `predicted_usage`: Uso pronosticado
- **`trend`** (float): Pendiente de la tendencia (positivo = incremento, negativo = decremento)
- **`avg_usage`** (float): Uso promedio histórico
- **`max_usage`** (float): Uso máximo histórico

#### Ejemplo de respuesta:
```python
ResourceForecast(
    resource='ICU_Beds',
    predictions=[
        {'date': '2024-01-04', 'predicted_usage': 52.0},
        {'date': '2024-01-05', 'predicted_usage': 54.0},
        ...
    ],
    trend=2.5,
    avg_usage=47.5,
    max_usage=55.0
)
```

### Parámetros de configuración

- **`window`** (int, default: 7): Ventana mínima de observaciones requeridas por recurso
  - Debe ser al menos 3
  - Valores más altos = más datos históricos necesarios, pero pronósticos más estables

### Limitaciones

1. **Modelo lineal simple**: Asume que las tendencias son lineales, no captura estacionalidad o patrones complejos
2. **Sin intervalos de confianza**: No proporciona rangos de incertidumbre para los pronósticos
3. **Sin factores externos**: No considera eventos especiales, brotes, o cambios en políticas
4. **Datos mínimos**: Requiere al menos `window` observaciones por recurso
5. **Sin validación**: No incluye validación automática de la calidad del pronóstico

### Ejemplos de uso

#### Uso básico
```python
from ml_models.demand_forecasting import HealthcareDemandForecaster
import pandas as pd

# Preparar datos
data = pd.DataFrame({
    'date': pd.date_range('2024-01-01', periods=30, freq='D'),
    'resource': ['ICU_Beds'] * 30,
    'usage': [45 + i * 0.3 for i in range(30)]
})

# Entrenar
forecaster = HealthcareDemandForecaster(window=7)
forecaster.fit(data)

# Pronosticar
forecast = forecaster.forecast('ICU_Beds', periods=7)
print(f"Tendencia: {forecast.trend:.2f}")
print(f"Uso promedio: {forecast.avg_usage:.2f}")
for pred in forecast.predictions:
    print(f"{pred['date']}: {pred['predicted_usage']:.2f}")
```

#### Uso con múltiples recursos
```python
# Datos con múltiples recursos
data = pd.DataFrame({
    'date': ['2024-01-01', '2024-01-02', '2024-01-03'] * 2,
    'resource': ['ICU_Beds'] * 3 + ['Ventilators'] * 3,
    'usage': [45, 48, 50, 20, 22, 21]
})

forecaster.fit(data)

# Pronosticar cada recurso
for resource in data['resource'].unique():
    forecast = forecaster.forecast(resource, periods=7)
    print(f"{resource}: tendencia={forecast.trend:.2f}, promedio={forecast.avg_usage:.2f}")
```

---

## 🔗 Integración con el Sistema

### Endpoints de API

Estos modelos están expuestos a través de los siguientes endpoints:

- **Tendencias**: `GET /api/v1/analytics/trends`
- **Anomalías**: `GET /api/v1/analytics/anomalies`
- **Demanda**: `GET /api/v1/analytics/demand`

### Uso desde Backend

```typescript
// Ejemplo de consumo desde backend
const trends = await aiIntegrationService.getTrends({ disease: 'Asma', days: 30 });
const anomalies = await aiIntegrationService.getAnomalies({ days: 7 });
const demand = await aiIntegrationService.getDemandForecast({ resource: 'ICU_Beds', periods: 7 });
```

### Uso desde Mobile

```typescript
// Ejemplo de consumo desde mobile
const trends = await predictiveAnalysisService.getTrends({ disease: 'Asma' });
```

---

## 📝 Notas de Implementación

- Todos los modelos son **heurísticos** y están diseñados para ser ligeros y rápidos
- Los modelos **no requieren GPU** y pueden ejecutarse en entornos con recursos limitados
- Los modelos están **optimizados para datos temporales** con frecuencia diaria
- Para producción, se recomienda **monitorear la calidad** de las predicciones y ajustar parámetros según sea necesario

---

## 🔄 Actualizaciones Futuras

- [ ] Agregar intervalos de confianza a los pronósticos
- [ ] Implementar validación cruzada automática
- [ ] Agregar detección de estacionalidad
- [ ] Integrar modelos más avanzados (ARIMA, Prophet) como opción
- [ ] Agregar métricas de calidad del modelo (MAE, RMSE, etc.)

---

**Última actualización**: 2024-11-03  
**Versión**: 1.0.0

