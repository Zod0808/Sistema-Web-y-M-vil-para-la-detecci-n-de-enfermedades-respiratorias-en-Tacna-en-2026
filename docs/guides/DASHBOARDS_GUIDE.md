# 📊 Guía de Dashboards y KPIs - RespiCare Tacna

Guía completa sobre los dashboards disponibles, qué KPIs ver y cómo interpretarlos.

---

## 📋 Índice

1. [Dashboards Disponibles](#dashboards-disponibles)
2. [KPIs Principales](#kpis-principales)
3. [Interpretación de Métricas](#interpretación-de-métricas)
4. [Dashboards por Rol](#dashboards-por-rol)
5. [Mejores Prácticas](#mejores-prácticas)

---

## Dashboards Disponibles

### 1. Dashboard Ejecutivo (Web - Administradores)

**Ubicación**: `/dashboard` (Web)

**Propósito**: Vista de alto nivel para administradores y directivos del sistema.

**KPIs Principales**:
- Total de pacientes registrados
- Total de consultas en el período
- Tasa de crecimiento de casos
- Distribución geográfica de casos
- Alertas activas
- Métricas de uso del sistema

### 2. Dashboard Clínico (Web - Médicos)

**Ubicación**: `/dashboard` (Web, rol: doctor)

**Propósito**: Vista clínica para médicos con datos de sus pacientes.

**KPIs Principales**:
- Pacientes activos
- Citas programadas hoy/próxima semana
- Casos urgentes pendientes
- Diagnósticos más frecuentes
- Tendencias de síntomas
- Prescripciones recientes

### 3. Dashboard de Analytics (Web - Todos)

**Ubicación**: `/analytics` (Web)

**Propósito**: Visualizaciones avanzadas de analytics y BI.

**KPIs Principales**:
- Tendencias temporales de enfermedades
- Anomalías detectadas
- Predicción de demanda de recursos
- Métricas de modelos ML (confianza, accuracy)
- Fairness y sesgos en predicciones

### 4. Dashboard Mobile - Pacientes

**Ubicación**: `PatientAnalyticsScreen` (Mobile)

**Propósito**: Vista de analytics personales para pacientes.

**KPIs Principales**:
- Tendencias de síntomas (últimos 30 días)
- Distribución de riesgo (Bajo/Medio/Alto)
- Historial mensual de consultas
- Total de consultas
- Riesgo promedio

### 5. Dashboard Mobile - Médicos

**Ubicación**: `DoctorAnalyticsScreen` (Mobile)

**Propósito**: Vista de analytics para médicos en mobile.

**KPIs Principales**:
- Distribución de pacientes (últimos 6 meses)
- Diagnósticos más frecuentes
- Citas mensuales
- Distribución de urgencia (Baja/Media/Alta/Crítica)
- Total de pacientes
- Citas del mes actual

---

## KPIs Principales

### KPIs Clínicos

#### 1. Total de Pacientes Registrados
- **Qué mide**: Número total de pacientes en el sistema
- **Cómo interpretar**: 
  - ✅ **Alto**: Buena adopción del sistema
  - ⚠️ **Bajo**: Puede indicar falta de promoción o barreras de acceso
- **Acción recomendada**: Revisar estrategias de onboarding si está bajo

#### 2. Tasa de Crecimiento de Casos
- **Qué mide**: Porcentaje de incremento/decremento de casos en un período
- **Cómo interpretar**:
  - ✅ **Decrecimiento**: Puede indicar mejor control de enfermedades
  - ⚠️ **Crecimiento rápido**: Puede indicar brote o necesidad de recursos
- **Acción recomendada**: Investigar causas si hay crecimiento inesperado

#### 3. Distribución de Riesgo
- **Qué mide**: Porcentaje de casos por nivel de riesgo (Bajo/Medio/Alto)
- **Cómo interpretar**:
  - ✅ **Mayoría Bajo**: Sistema funcionando bien, prevención efectiva
  - ⚠️ **Mayoría Alto**: Necesita atención inmediata, revisar protocolos
- **Acción recomendada**: Implementar medidas preventivas si hay muchos casos de alto riesgo

#### 4. Tendencias de Síntomas
- **Qué mide**: Frecuencia de síntomas reportados a lo largo del tiempo
- **Cómo interpretar**:
  - ✅ **Tendencia estable o decreciente**: Control adecuado
  - ⚠️ **Tendencia creciente**: Posible brote o empeoramiento
- **Acción recomendada**: Alertar a autoridades sanitarias si hay tendencia creciente sostenida

#### 5. Diagnósticos Más Frecuentes
- **Qué mide**: Enfermedades más comunes en el sistema
- **Cómo interpretar**:
  - ✅ **Distribución esperada**: Alineada con datos epidemiológicos
  - ⚠️ **Distribución inusual**: Puede indicar brote o necesidad de investigación
- **Acción recomendada**: Comparar con datos epidemiológicos regionales

### KPIs Operacionales

#### 1. Total de Consultas
- **Qué mide**: Número total de consultas médicas registradas
- **Cómo interpretar**:
  - ✅ **Alto**: Alto uso del sistema, buena adopción
  - ⚠️ **Bajo**: Puede indicar subutilización o barreras de acceso
- **Acción recomendada**: Revisar barreras de acceso si está bajo

#### 2. Citas Programadas
- **Qué mide**: Número de citas programadas para hoy/próxima semana
- **Cómo interpretar**:
  - ✅ **Balanceado**: Buena planificación
  - ⚠️ **Sobrecarga**: Necesita redistribución de recursos
- **Acción recomendada**: Optimizar agenda si hay sobrecarga

#### 3. Casos Urgentes Pendientes
- **Qué mide**: Número de casos marcados como urgentes sin resolver
- **Cómo interpretar**:
  - ✅ **Bajo o cero**: Buena gestión de urgencias
  - ⚠️ **Alto**: Necesita atención inmediata, posible sobrecarga
- **Acción recomendada**: Priorizar resolución de casos urgentes

#### 4. Métricas de Modelos ML
- **Qué mide**: Confianza promedio, accuracy, número de predicciones
- **Cómo interpretar**:
  - ✅ **Alta confianza (>80%)**: Modelos funcionando bien
  - ⚠️ **Baja confianza (<60%)**: Necesita retraining o revisión
- **Acción recomendada**: Revisar modelos si la confianza es baja

---

## Interpretación de Métricas

### Gráficos de Tendencias

#### Línea de Tiempo (Line Chart)
- **Uso**: Mostrar evolución de métricas a lo largo del tiempo
- **Interpretación**:
  - **Línea ascendente**: Crecimiento (puede ser bueno o malo según contexto)
  - **Línea descendente**: Decrecimiento (puede ser bueno o malo según contexto)
  - **Línea estable**: Sin cambios significativos
- **Ejemplo**: Tendencias de síntomas, número de consultas mensuales

#### Gráfico de Barras (Bar Chart)
- **Uso**: Comparar valores entre categorías
- **Interpretación**:
  - **Barras altas**: Valores altos en esa categoría
  - **Barras bajas**: Valores bajos en esa categoría
- **Ejemplo**: Distribución de pacientes por mes, diagnósticos más frecuentes

#### Gráfico de Pastel (Pie Chart)
- **Uso**: Mostrar proporciones de un todo
- **Interpretación**:
  - **Segmentos grandes**: Mayor proporción
  - **Segmentos pequeños**: Menor proporción
- **Ejemplo**: Distribución de riesgo, distribución de diagnósticos

### Métricas de Riesgo

#### Riesgo Bajo (< 30%)
- **Interpretación**: Caso de baja prioridad, seguimiento rutinario
- **Acción**: Monitoreo estándar, seguimiento programado

#### Riesgo Medio (30-70%)
- **Interpretación**: Caso que requiere atención, pero no urgente
- **Acción**: Seguimiento más frecuente, posible intervención preventiva

#### Riesgo Alto (> 70%)
- **Interpretación**: Caso de alta prioridad, requiere atención inmediata
- **Acción**: Evaluación urgente, posible hospitalización o tratamiento intensivo

---

## Dashboards por Rol

### Pacientes

**Acceso**: Mobile app, sección "Analytics"

**KPIs Relevantes**:
- Tendencias de síntomas personales
- Distribución de riesgo personal
- Historial de consultas
- Recomendaciones de salud

**Interpretación**:
- Los pacientes deben enfocarse en sus propias métricas
- Valores altos de riesgo requieren consulta médica
- Tendencias crecientes de síntomas deben ser reportadas

### Médicos

**Acceso**: Web dashboard, Mobile analytics screen

**KPIs Relevantes**:
- Pacientes activos
- Casos urgentes
- Diagnósticos frecuentes
- Citas programadas
- Distribución de urgencia

**Interpretación**:
- Monitorear casos urgentes diariamente
- Revisar diagnósticos frecuentes para identificar patrones
- Optimizar agenda según carga de trabajo

### Administradores

**Acceso**: Web dashboard ejecutivo

**KPIs Relevantes**:
- Total de pacientes
- Tasa de crecimiento
- Distribución geográfica
- Métricas de uso del sistema
- Alertas activas

**Interpretación**:
- Monitorear crecimiento del sistema
- Identificar áreas geográficas con mayor carga
- Optimizar recursos según demanda

---

## Mejores Prácticas

### 1. Revisar Dashboards Regularmente

- **Pacientes**: Semanalmente para monitorear su salud
- **Médicos**: Diariamente para gestionar casos urgentes
- **Administradores**: Diariamente para monitoreo operacional

### 2. Interpretar en Contexto

- Comparar métricas con períodos anteriores
- Considerar factores externos (estación, eventos, etc.)
- No tomar decisiones basadas en una sola métrica

### 3. Acción Basada en Datos

- Usar KPIs para identificar problemas tempranamente
- Implementar medidas preventivas cuando sea necesario
- Ajustar estrategias según tendencias observadas

### 4. Compartir Insights

- Médicos deben compartir insights con pacientes
- Administradores deben comunicar tendencias al equipo
- Usar datos para justificar decisiones y recursos

### 5. Validar con Expertos

- Consultar con expertos médicos para interpretar métricas clínicas
- Validar predicciones ML con experiencia clínica
- No depender exclusivamente de métricas automatizadas

---

## Alertas y Notificaciones

### Alertas Automáticas

El sistema genera alertas automáticas cuando:
- Se detecta un caso de alto riesgo
- Hay una tendencia creciente de síntomas
- Se identifica una anomalía en los datos
- Los modelos ML tienen baja confianza

### Acciones Recomendadas

1. **Revisar alertas diariamente**
2. **Priorizar casos urgentes**
3. **Investigar anomalías**
4. **Ajustar modelos si es necesario**

---

## Recursos Adicionales

- **Performance Playbook**: `docs/PERFORMANCE_PLAYBOOK.md`
- **API Documentation**: `backend/README.md`
- **Mobile Analytics**: `mobile/README.md`

---

**Última actualización**: 2024-11-03  
**Versión**: 1.0.0

