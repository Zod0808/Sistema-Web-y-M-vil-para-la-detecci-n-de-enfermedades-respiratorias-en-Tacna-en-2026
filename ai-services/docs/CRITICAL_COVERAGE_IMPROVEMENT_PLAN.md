# Plan de Mejora de Cobertura - Módulos Críticos al 85%

## 📊 Situación Actual

- **Cobertura Total**: 17.89% (2,701 / 15,098 líneas)
- **Objetivo**: 85% en módulos críticos
- **Gap**: 67.11% para alcanzar objetivo

## 🎯 Módulos Críticos Identificados

### Prioridad 1: Módulos Core (Objetivo: 85%)

1. **main.py** - 0% actual → 85% objetivo
   - **Impacto**: Alto (punto de entrada principal)
   - **Líneas estimadas**: ~700 líneas
   - **Tests necesarios**: 50+ casos

2. **services/** - 9.38% actual → 85% objetivo
   - **Impacto**: Crítico (lógica de negocio principal)
   - **Módulos prioritarios**:
     - `ai_service_manager.py` - 70% actual → 85% objetivo
     - `symptom_analysis_service.py` - 75% actual → 85% objetivo
     - `medical_history_service.py` - 75% actual → 85% objetivo
     - `enhanced_chatbot_service.py` - 70% actual → 85% objetivo
     - `audio_transcription_service.py` - 70% actual → 85% objetivo
     - `core_domains_support.py` - 70% actual → 85% objetivo

3. **strategies/** - 8.96% actual → 85% objetivo
   - **Impacto**: Alto (estrategias de análisis)
   - **Módulos prioritarios**:
     - `rule_based_strategy.py` - 80% actual → 85% objetivo
     - `openai_strategy.py` - 75% actual → 85% objetivo
     - `local_model_strategy.py` - 70% actual → 85% objetivo

4. **api/routes/** - 0% actual → 85% objetivo
   - **Impacto**: Crítico (endpoints públicos)
   - **Rutas prioritarias**:
     - `health.py` - 90% actual → 95% objetivo
     - `symptom_analyzer.py` - 70% actual → 85% objetivo
     - `medical_history.py` - 70% actual → 85% objetivo
     - `chat_analyzer.py` - 70% actual → 85% objetivo
     - `advanced_nlp.py` - 70% actual → 85% objetivo
     - `audio_analyzer.py` - 65% actual → 85% objetivo
     - `model_cache.py` - 75% actual → 85% objetivo
     - `core_domains_support.py` - 70% actual → 85% objetivo

5. **core/** - 51.61% actual → 85% objetivo
   - **Impacto**: Crítico (infraestructura base)
   - **Módulos prioritarios**:
     - `config.py` - 80% actual → 85% objetivo
     - `database.py` - 75% actual → 85% objetivo
     - `cache.py` - 75% actual → 85% objetivo

6. **decorators/** - 0% actual → 85% objetivo
   - **Impacto**: Alto (cross-cutting concerns)
   - **Módulos prioritarios**:
     - `cache_decorator.py` - 80% actual → 85% objetivo
     - `retry_decorator.py` - 85% actual → 90% objetivo
     - `metrics_decorator.py` - 80% actual → 85% objetivo
     - `circuit_breaker_decorator.py` - 75% actual → 85% objetivo
     - `logging_decorator.py` - 75% actual → 85% objetivo

7. **circuit_breaker/** - 30.74% actual → 85% objetivo
   - **Impacto**: Alto (tolerancia a fallos)
   - **Módulos prioritarios**:
     - `circuit_breaker.py` - Base implementation
     - `openai_circuit_breaker.py` - OpenAI specific
     - `external_service_circuit_breaker.py` - HTTP services

---

## 📋 Plan de Implementación por Fases

### Fase 1: main.py (Prioridad Máxima) - Semana 1

**Objetivo**: 0% → 85% cobertura

#### Tests Necesarios:

1. **Inicialización de la aplicación**
   - ✅ Creación de FastAPI app
   - ✅ Configuración de logging
   - ✅ Inicialización de Sentry
   - ✅ Registro de routers (con y sin errores de importación)

2. **Endpoints principales**
   - ✅ GET `/` - Root endpoint
   - ✅ GET `/api/v1/health` - Health check
   - ✅ GET `/api/v1/diseases` - Lista de enfermedades
   - ✅ GET `/api/v1/symptoms` - Lista de síntomas

3. **Middleware**
   - ✅ CORS middleware (configuración, headers)
   - ✅ Security headers middleware
   - ✅ Rate limiting middleware (habilitado/deshabilitado)
   - ✅ Body size limit middleware

4. **Lifecycle events**
   - ✅ Startup event (cache initialization, database connection)
   - ✅ Shutdown event (cleanup, cache closure)

5. **Helper functions**
   - ✅ `analyze_query()` - Análisis de consultas
   - ✅ `generate_response()` - Generación de respuestas
   - ✅ Manejo de errores y excepciones

6. **Error handlers**
   - ✅ HTTPException handler
   - ✅ Generic exception handler
   - ✅ Validation error handler

**Tests estimados**: 50+ casos
**Impacto**: +350 líneas de cobertura

---

### Fase 2: Services (Prioridad Crítica) - Semana 2-3

**Objetivo**: 9.38% → 85% cobertura

#### 2.1 ai_service_manager.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Inicialización con diferentes entornos
- ✅ Strategy selection (fallback, hybrid)
- ✅ Batch processing con límites de concurrencia
- ✅ Health checks detallados
- ✅ Métricas y estadísticas
- ✅ Shutdown y cleanup
- ✅ Manejo de errores en estrategias
- ✅ Concurrent operations

**Tests estimados**: 15+ casos adicionales
**Impacto**: +100 líneas de cobertura

#### 2.2 symptom_analysis_service.py (75% → 85%)

**Tests adicionales necesarios**:
- ✅ Análisis con diferentes combinaciones de síntomas
- ✅ Trend analysis con diferentes períodos
- ✅ Risk assessment con diferentes factores
- ✅ Follow-up plan generation edge cases
- ✅ Batch analysis con errores parciales
- ✅ Cache hit/miss scenarios
- ✅ Error recovery

**Tests estimados**: 10+ casos adicionales
**Impacto**: +80 líneas de cobertura

#### 2.3 medical_history_service.py (75% → 85%)

**Tests adicionales necesarios**:
- ✅ Entity extraction con diferentes formatos
- ✅ Diagnosis suggestions con diferentes niveles de confianza
- ✅ Risk assessment con diferentes contextos
- ✅ Medical summary generation edge cases
- ✅ Batch processing optimizations
- ✅ Error handling y recovery

**Tests estimados**: 10+ casos adicionales
**Impacto**: +80 líneas de cobertura

#### 2.4 enhanced_chatbot_service.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Conversaciones largas (más de 100 mensajes)
- ✅ Manejo de contexto complejo
- ✅ ML integration edge cases
- ✅ Tokenization de textos muy largos
- ✅ Disease classification con baja confianza
- ✅ Error recovery en OpenAI calls

**Tests estimados**: 12+ casos adicionales
**Impacto**: +100 líneas de cobertura

#### 2.5 audio_transcription_service.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Diferentes formatos de audio (m4a, ogg, flac)
- ✅ Audio muy largo (>10 minutos)
- ✅ Audio con ruido
- ✅ Múltiples idiomas en un mismo audio
- ✅ Model loading con diferentes tamaños
- ✅ Memory management

**Tests estimados**: 8+ casos adicionales
**Impacto**: +60 líneas de cobertura

#### 2.6 core_domains_support.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Appointment optimization con muchos slots
- ✅ Prescription analysis con interacciones complejas
- ✅ Alert priority con múltiples factores
- ✅ Edge cases en cálculos de scores
- ✅ Error recovery en análisis

**Tests estimados**: 10+ casos adicionales
**Impacto**: +80 líneas de cobertura

**Total Fase 2**: 65+ casos adicionales, +500 líneas de cobertura

---

### Fase 3: Strategies (Prioridad Alta) - Semana 4

**Objetivo**: 8.96% → 85% cobertura

#### 3.1 rule_based_strategy.py (80% → 85%)

**Tests adicionales necesarios**:
- ✅ Edge cases en severity calculation
- ✅ Urgency determination con múltiples factores
- ✅ Recommendation generation con casos raros
- ✅ Entity extraction con texto mal formateado
- ✅ Performance con grandes volúmenes

**Tests estimados**: 8+ casos adicionales
**Impacto**: +60 líneas de cobertura

#### 3.2 openai_strategy.py (75% → 85%)

**Tests adicionales necesarios**:
- ✅ Rate limiting handling
- ✅ Token limit management
- ✅ Retry logic con diferentes errores
- ✅ Prompt optimization
- ✅ Response parsing edge cases
- ✅ Cost tracking

**Tests estimados**: 10+ casos adicionales
**Impacto**: +80 líneas de cobertura

#### 3.3 local_model_strategy.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Model loading con diferentes versiones
- ✅ Fallback mechanisms
- ✅ Prediction confidence thresholds
- ✅ Memory management
- ✅ Model caching

**Tests estimados**: 10+ casos adicionales
**Impacto**: +80 líneas de cobertura

**Total Fase 3**: 28+ casos adicionales, +220 líneas de cobertura

---

### Fase 4: API Routes (Prioridad Crítica) - Semana 5

**Objetivo**: 0% → 85% cobertura (verificar por qué muestra 0%)

#### 4.1 health.py (90% → 95%)

**Tests adicionales necesarios**:
- ✅ Degraded states
- ✅ Partial failures
- ✅ Timeout scenarios

**Tests estimados**: 5+ casos adicionales
**Impacto**: +30 líneas de cobertura

#### 4.2 symptom_analyzer.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Validación exhaustiva de inputs
- ✅ Error handling detallado
- ✅ Rate limiting
- ✅ Authentication/Authorization (si aplica)
- ✅ Response format validation

**Tests estimados**: 10+ casos adicionales
**Impacto**: +80 líneas de cobertura

#### 4.3 medical_history.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Validación de historiales complejos
- ✅ Batch processing endpoints
- ✅ Error handling detallado
- ✅ Response format validation

**Tests estimados**: 10+ casos adicionales
**Impacto**: +80 líneas de cobertura

#### 4.4 chat_analyzer.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Conversaciones largas
- ✅ Manejo de contexto
- ✅ Error recovery
- ✅ Rate limiting

**Tests estimados**: 8+ casos adicionales
**Impacto**: +60 líneas de cobertura

#### 4.5 advanced_nlp.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Todos los endpoints NLP
- ✅ Validación de parámetros
- ✅ Error handling
- ✅ Performance tests

**Tests estimados**: 10+ casos adicionales
**Impacto**: +80 líneas de cobertura

#### 4.6 audio_analyzer.py (65% → 85%)

**Tests adicionales necesarios**:
- ✅ Diferentes formatos de audio
- ✅ Validación de base64
- ✅ Error handling
- ✅ Timeout scenarios

**Tests estimados**: 8+ casos adicionales
**Impacto**: +60 líneas de cobertura

#### 4.7 model_cache.py (75% → 85%)

**Tests adicionales necesarios**:
- ✅ Cache operations exhaustivas
- ✅ Memory management
- ✅ Error recovery
- ✅ Performance tests

**Tests estimados**: 8+ casos adicionales
**Impacto**: +60 líneas de cobertura

#### 4.8 core_domains_support.py (70% → 85%)

**Tests adicionales necesarios**:
- ✅ Todos los endpoints
- ✅ Validación exhaustiva
- ✅ Error handling
- ✅ Performance tests

**Tests estimados**: 10+ casos adicionales
**Impacto**: +80 líneas de cobertura

**Total Fase 4**: 69+ casos adicionales, +510 líneas de cobertura

---

### Fase 5: Core Modules (Prioridad Alta) - Semana 6

**Objetivo**: 51.61% → 85% cobertura

#### 5.1 config.py (80% → 85%)

**Tests adicionales necesarios**:
- ✅ Validación de tipos
- ✅ Edge cases en environment variables
- ✅ Configuración de producción vs desarrollo
- ✅ Validación de valores

**Tests estimados**: 5+ casos adicionales
**Impacto**: +40 líneas de cobertura

#### 5.2 database.py (75% → 85%)

**Tests adicionales necesarios**:
- ✅ Connection pooling
- ✅ Retry logic
- ✅ Health checks detallados
- ✅ Index management
- ✅ Error recovery

**Tests estimados**: 8+ casos adicionales
**Impacto**: +60 líneas de cobertura

#### 5.3 cache.py (75% → 85%)

**Tests adicionales necesarios**:
- ✅ Connection pooling
- ✅ Retry logic
- ✅ TTL management
- ✅ Pattern matching avanzado
- ✅ Error recovery

**Tests estimados**: 8+ casos adicionales
**Impacto**: +60 líneas de cobertura

**Total Fase 5**: 21+ casos adicionales, +160 líneas de cobertura

---

### Fase 6: Decorators (Prioridad Media) - Semana 7

**Objetivo**: 0% → 85% cobertura (verificar por qué muestra 0%)

#### 6.1 cache_decorator.py (80% → 85%)

**Tests adicionales necesarios**:
- ✅ Cache invalidation avanzada
- ✅ TTL edge cases
- ✅ Key generation edge cases
- ✅ Error recovery

**Tests estimados**: 5+ casos adicionales
**Impacto**: +40 líneas de cobertura

#### 6.2 retry_decorator.py (85% → 90%)

**Tests adicionales necesarios**:
- ✅ Backoff strategies
- ✅ Max delay scenarios
- ✅ Conditional retries avanzados

**Tests estimados**: 5+ casos adicionales
**Impacto**: +40 líneas de cobertura

#### 6.3 metrics_decorator.py (80% → 85%)

**Tests adicionales necesarios**:
- ✅ Custom metrics avanzados
- ✅ Performance tracking
- ✅ Error tracking

**Tests estimados**: 5+ casos adicionales
**Impacto**: +40 líneas de cobertura

#### 6.4 circuit_breaker_decorator.py (75% → 85%)

**Tests adicionales necesarios**:
- ✅ State transitions
- ✅ Recovery scenarios
- ✅ Fallback mechanisms

**Tests estimados**: 8+ casos adicionales
**Impacto**: +60 líneas de cobertura

#### 6.5 logging_decorator.py (75% → 85%)

**Tests adicionales necesarios**:
- ✅ Log levels avanzados
- ✅ Context logging
- ✅ Performance logging

**Tests estimados**: 5+ casos adicionales
**Impacto**: +40 líneas de cobertura

**Total Fase 6**: 28+ casos adicionales, +220 líneas de cobertura

---

### Fase 7: Circuit Breakers (Prioridad Media) - Semana 8

**Objetivo**: 30.74% → 85% cobertura

#### 7.1 circuit_breaker.py

**Tests necesarios**:
- ✅ State machine completo
- ✅ Metrics collection
- ✅ Recovery logic
- ✅ Error handling

**Tests estimados**: 15+ casos
**Impacto**: +120 líneas de cobertura

#### 7.2 openai_circuit_breaker.py

**Tests necesarios**:
- ✅ OpenAI-specific errors
- ✅ Rate limiting
- ✅ Billing errors
- ✅ Recovery scenarios

**Tests estimados**: 12+ casos
**Impacto**: +100 líneas de cobertura

#### 7.3 external_service_circuit_breaker.py

**Tests necesarios**:
- ✅ HTTP error handling
- ✅ Service registration
- ✅ Health checks
- ✅ Recovery scenarios

**Tests estimados**: 12+ casos
**Impacto**: +100 líneas de cobertura

**Total Fase 7**: 39+ casos, +320 líneas de cobertura

---

## 📊 Resumen del Plan

### Totales por Fase

| Fase | Módulo | Tests Adicionales | Líneas Estimadas | Semana |
|------|--------|-------------------|------------------|--------|
| 1 | main.py | 50+ | +350 | 1 |
| 2 | services/ | 65+ | +500 | 2-3 |
| 3 | strategies/ | 28+ | +220 | 4 |
| 4 | api/routes/ | 69+ | +510 | 5 |
| 5 | core/ | 21+ | +160 | 6 |
| 6 | decorators/ | 28+ | +220 | 7 |
| 7 | circuit_breaker/ | 39+ | +320 | 8 |

**Total**: 300+ tests adicionales, +2,280 líneas de cobertura estimadas

### Impacto Esperado

- **Cobertura actual**: 17.89% (2,701 líneas)
- **Cobertura objetivo**: 85% en módulos críticos
- **Líneas adicionales**: +2,280 líneas
- **Cobertura estimada final**: ~35-40% global (85% en módulos críticos)

---

## 🎯 Priorización

### Crítico (Hacer primero)
1. ✅ main.py - Punto de entrada
2. ✅ services/ - Lógica de negocio
3. ✅ api/routes/ - Endpoints públicos

### Alto (Hacer segundo)
4. ✅ strategies/ - Estrategias de análisis
5. ✅ core/ - Infraestructura base

### Medio (Hacer tercero)
6. ✅ decorators/ - Cross-cutting concerns
7. ✅ circuit_breaker/ - Tolerancia a fallos

---

## 🔧 Comandos Útiles

### Ejecutar tests de un módulo específico
```bash
# main.py
pytest tests/test_main.py -v --cov=main --cov-report=term-missing

# services
pytest tests/services/ -v --cov=services --cov-report=term-missing

# strategies
pytest tests/strategies/ -v --cov=strategies --cov-report=term-missing

# api routes
pytest tests/api/ -v --cov=api --cov-report=term-missing
```

### Ver cobertura detallada
```bash
pytest --cov=. --cov-report=html:htmlcov
# Abrir htmlcov/index.html
```

### Verificar cobertura de un archivo específico
```bash
pytest --cov=main --cov-report=term-missing tests/test_main.py
```

---

## 📝 Notas Importantes

1. **Verificar configuración de coverage**: El reporte muestra 0% en algunos módulos que tienen tests. Verificar `.coveragerc` y `pytest.ini`.

2. **Tests existentes**: Muchos tests ya están implementados. Este plan se enfoca en expandir la cobertura de los tests existentes y agregar casos edge.

3. **Mocks y stubs**: Usar mocks extensivamente para aislar componentes y evitar dependencias externas.

4. **Integración continua**: Asegurar que los tests se ejecuten en CI/CD y que la cobertura se monitoree.

---

**Última actualización**: Plan creado basado en reporte de cobertura del 2025-11-26
**Objetivo**: Alcanzar 85% de cobertura en módulos críticos

