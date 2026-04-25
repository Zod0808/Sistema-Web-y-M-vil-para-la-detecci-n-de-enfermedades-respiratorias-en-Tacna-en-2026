# Plan de Mejora de Cobertura de Pruebas - AI Services

## Estado Actual
- **Cobertura Actual**: 17.89% (2,701 líneas cubiertas / 15,098 líneas válidas)
- **Umbral Requerido**: 35% mínimo (temporal para dar margen de seguridad)
- **Objetivo Inmediato**: 50%
- **Objetivo Final**: 60%+

### Nota Importante
La cobertura actual del 17.89% está por debajo del umbral requerido. Este plan establece una estrategia clara y priorizada para alcanzar el 50% de cobertura.

## Análisis de Brecha
- **Gap actual**: 17.89% → 50% = **+32.11 puntos porcentuales**
- **Líneas necesarias**: Aproximadamente **4,800+ líneas adicionales** a cubrir
- **Estrategia**: Enfoque incremental y priorizado por impacto

## Módulos Excluidos de Cobertura

Los siguientes módulos están excluidos en `.coveragerc` (no se cuentan para cobertura):

1. **ML Models** (dependencias pesadas):
   - `ml_models/lazy_loader.py`
   - `ml_models/medical_bert.py`
   - `ml_models/image_classifier.py`
   - `ml_models/synthetic_*.py`
   - `ml_models/train_*.py`
   - `ml_models/time_series_predictor.py`

2. **Services** (complejidad alta):
   - `services/conversational_ai_service.py`
   - `services/patient_friendly_explainer.py`
   - `services/cough_analysis_service.py`

3. **Data Processing**:
   - `data/disease_parser.py`
   - `data/synthetic_*.py`
   - `medical-history-processor/*`
   - `symptom-analyzer/*`

4. **Models**:
   - `models/model_manager.py`

## Estrategia por Fases

### Fase 1: Prioridad Crítica - Alcanzar 25% (Gap: +7.11%)

**Objetivo**: Estabilizar cobertura y cubrir módulos core críticos  
**Tiempo estimado**: 1-2 semanas  
**Impacto esperado**: +1,073 líneas (~7% de cobertura)

#### 1.1 Core Módulos (Prioridad Máxima)
- [ ] `core/config.py` - Configuración de la aplicación
  - **Cobertura objetivo**: 80%
  - **Tests necesarios**: Validación de variables de entorno, valores por defecto, tipos
  - **Impacto estimado**: +150 líneas
  
- [ ] `core/database.py` - Conexión a MongoDB
  - **Cobertura objetivo**: 75%
  - **Tests necesarios**: Conexión, desconexión, manejo de errores, health checks
  - **Impacto estimado**: +200 líneas

- [ ] `core/cache.py` - Cache Redis
  - **Cobertura objetivo**: 75%
  - **Tests necesarios**: Set/get, TTL, invalidación, errores
  - **Impacto estimado**: +180 líneas

- [ ] `main.py` - Aplicación FastAPI principal
  - **Cobertura objetivo**: 60%
  - **Tests necesarios**: Endpoints principales, middleware, error handlers
  - **Impacto estimado**: +300 líneas

**Total Fase 1.1**: ~+830 líneas (~5.5% de cobertura)

#### 1.2 Routes API Principales
- [ ] `api/routes/health.py` - Health checks
  - **Cobertura objetivo**: 90%
  - **Tests necesarios**: Endpoints de salud, status de servicios
  - **Impacto estimado**: +80 líneas

- [ ] `api/routes/symptom_analyzer.py` - Análisis de síntomas
  - **Cobertura objetivo**: 70%
  - **Tests necesarios**: POST /analyze, validación, errores
  - **Impacto estimado**: +200 líneas

- [ ] `api/routes/medical_history.py` - Procesamiento de historial
  - **Cobertura objetivo**: 70%
  - **Tests necesarios**: POST /process, validación, errores
  - **Impacto estimado**: +200 líneas

**Total Fase 1.2**: ~+480 líneas (~3.2% de cobertura)

### Fase 2: Prioridad Alta - Alcanzar 35% (Gap: +10%)

**Objetivo**: Cumplir umbral mínimo requerido  
**Tiempo estimado**: 2-3 semanas  
**Impacto esperado**: +1,510 líneas (~10% de cobertura)

#### 2.1 Servicios Principales
- [ ] `services/ai_service_manager.py` - Manager principal
  - **Cobertura objetivo**: 70%
  - **Tests necesarios**: Inicialización, métodos principales, batch processing
  - **Impacto estimado**: +250 líneas
  - **Estado**: Ya tiene tests básicos, mejorar cobertura

- [ ] `services/symptom_analysis_service.py` - Análisis de síntomas
  - **Cobertura objetivo**: 75%
  - **Tests necesarios**: Análisis completo, trends, recomendaciones
  - **Impacto estimado**: +200 líneas
  - **Estado**: Ya tiene tests básicos, expandir casos

- [ ] `services/medical_history_service.py` - Procesamiento de historial
  - **Cobertura objetivo**: 75%
  - **Tests necesarios**: Procesamiento completo, extracción de entidades
  - **Impacto estimado**: +200 líneas
  - **Estado**: Ya tiene tests básicos, expandir casos

- [ ] `services/enhanced_chatbot_service.py` - Chatbot mejorado
  - **Cobertura objetivo**: 70%
  - **Tests necesarios**: Tokens, clasificación, respuestas, edge cases
  - **Impacto estimado**: +300 líneas
  - **Estado**: Ya tiene tests básicos, expandir casos

**Total Fase 2.1**: ~+950 líneas (~6.3% de cobertura)

#### 2.2 Strategies Completas
- [ ] `strategies/rule_based_strategy.py` - Estrategia basada en reglas
  - **Cobertura objetivo**: 80%
  - **Tests necesarios**: Todos los métodos, casos edge, extracción
  - **Impacto estimado**: +250 líneas

- [ ] `strategies/openai_strategy.py` - Estrategia OpenAI
  - **Cobertura objetivo**: 75%
  - **Tests necesarios**: Llamadas API, manejo de errores, fallbacks
  - **Impacto estimado**: +200 líneas

- [ ] `strategies/local_model_strategy.py` - Estrategia modelo local
  - **Cobertura objetivo**: 70%
  - **Tests necesarios**: Uso de modelos locales, fallbacks
  - **Impacto estimado**: +150 líneas

**Total Fase 2.2**: ~+600 líneas (~4% de cobertura)

### Fase 3: Prioridad Media - Alcanzar 50% (Gap: +15%)

**Objetivo**: Alcanzar meta de cobertura  
**Tiempo estimado**: 3-4 semanas  
**Impacto esperado**: +2,265 líneas (~15% de cobertura)

#### 3.1 Rutas API Adicionales
- [ ] `api/routes/chat_analyzer.py` - Chat analyzer
  - **Cobertura objetivo**: 70%
  - **Impacto estimado**: +250 líneas

- [ ] `api/routes/advanced_nlp.py` - NLP avanzado
  - **Cobertura objetivo**: 70%
  - **Impacto estimado**: +300 líneas

- [ ] `api/routes/audio_analyzer.py` - Análisis de audio
  - **Cobertura objetivo**: 65%
  - **Impacto estimado**: +200 líneas

- [ ] `api/routes/model_cache.py` - Cache de modelos
  - **Cobertura objetivo**: 75%
  - **Impacto estimado**: +180 líneas

- [ ] `api/routes/core_domains_support.py` - Soporte de dominios
  - **Cobertura objetivo**: 70%
  - **Impacto estimado**: +200 líneas

**Total Fase 3.1**: ~+1,130 líneas (~7.5% de cobertura)

#### 3.2 Decoradores Completos
- [ ] `decorators/cache_decorator.py` - Decorador de cache
  - **Cobertura objetivo**: 80%
  - **Tests necesarios**: TTL, invalidación, keys, errores
  - **Impacto estimado**: +200 líneas

- [ ] `decorators/retry_decorator.py` - Decorador de retry
  - **Cobertura objetivo**: 85%
  - **Tests necesarios**: Backoff, límites, excepciones
  - **Impacto estimado**: +150 líneas

- [ ] `decorators/metrics_decorator.py` - Decorador de métricas
  - **Cobertura objetivo**: 80%
  - **Tests necesarios**: Métricas, timing, errores
  - **Impacto estimado**: +150 líneas

- [ ] `decorators/circuit_breaker_decorator.py` - Decorador circuit breaker
  - **Cobertura objetivo**: 75%
  - **Tests necesarios**: Estados, fallbacks, recovery
  - **Impacto estimado**: +200 líneas

- [ ] `decorators/logging_decorator.py` - Decorador de logging
  - **Cobertura objetivo**: 75%
  - **Tests necesarios**: Logs, niveles, contexto
  - **Impacto estimado**: +150 líneas

**Total Fase 3.2**: ~+850 líneas (~5.6% de cobertura)

#### 3.3 Utilities y Helpers
- [ ] `utils/urgency_calculator.py` - Calculadora de urgencia
  - **Cobertura objetivo**: 85%
  - **Impacto estimado**: +150 líneas

- [ ] Otros módulos en `utils/`
  - **Cobertura objetivo**: 70%
  - **Impacto estimado**: +150 líneas

**Total Fase 3.3**: ~+300 líneas (~2% de cobertura)

### Fase 4: Prioridad Baja - Alcanzar 60%+ (Gap: +10%)

**Objetivo**: Excelencia en cobertura  
**Tiempo estimado**: 4-6 semanas  
**Impacto esperado**: +1,510 líneas (~10% de cobertura)

#### 4.1 Servicios Avanzados
- [ ] `services/audio_transcription_service.py` - Transcripción de audio
  - **Cobertura objetivo**: 70%
  - **Impacto estimado**: +250 líneas

- [ ] `services/core_domains_support.py` - Soporte de dominios
  - **Cobertura objetivo**: 70%
  - **Impacto estimado**: +200 líneas

#### 4.2 ML Models Básicos (si se incluyen)
- [ ] Modelos ML más simples (si se decide incluirlos)
  - **Cobertura objetivo**: 60%
  - **Impacto estimado**: +300 líneas

#### 4.3 Casos Edge y Integración
- [ ] Tests de integración entre componentes
  - **Cobertura objetivo**: 65%
  - **Impacto estimado**: +400 líneas

- [ ] Tests de casos edge en módulos existentes
  - **Cobertura objetivo**: Mejorar módulos existentes
  - **Impacto estimado**: +360 líneas

## Plan de Ejecución Detallado

### Priorización por Impacto/Costo

| Módulo | Prioridad | Impacto (líneas) | Esfuerzo | ROI |
|--------|-----------|------------------|----------|-----|
| `core/config.py` | 🔴 Crítica | +150 | Bajo | Alto |
| `core/database.py` | 🔴 Crítica | +200 | Medio | Alto |
| `core/cache.py` | 🔴 Crítica | +180 | Bajo | Alto |
| `main.py` | 🔴 Crítica | +300 | Medio | Alto |
| `api/routes/health.py` | 🔴 Crítica | +80 | Bajo | Alto |
| `services/*` (mejorar) | 🟠 Alta | +950 | Medio | Alto |
| `strategies/*` | 🟠 Alta | +600 | Medio | Medio |
| `api/routes/*` (adicionales) | 🟡 Media | +1,130 | Alto | Medio |
| `decorators/*` | 🟡 Media | +850 | Medio | Medio |
| `utils/*` | 🟢 Baja | +300 | Bajo | Bajo |

### Roadmap Semanal

#### Semana 1-2: Core Módulos (→ 25%)
- Día 1-3: `core/config.py` y `core/cache.py`
- Día 4-7: `core/database.py`
- Día 8-10: `main.py` (endpoints principales)
- Día 11-14: `api/routes/health.py` y `api/routes/symptom_analyzer.py`

#### Semana 3-4: Servicios y Strategies (→ 35%)
- Día 15-17: Mejorar tests de `services/ai_service_manager.py`
- Día 18-20: Mejorar tests de servicios de análisis
- Día 21-24: Completar tests de `strategies/rule_based_strategy.py`
- Día 25-28: Tests de `strategies/openai_strategy.py`

#### Semana 5-7: APIs y Decoradores (→ 45%)
- Día 29-31: `api/routes/chat_analyzer.py`
- Día 32-34: `api/routes/advanced_nlp.py`
- Día 35-37: `decorators/cache_decorator.py`
- Día 38-42: `decorators/retry_decorator.py` y `decorators/metrics_decorator.py`

#### Semana 8-10: Completar a 50%
- Día 43-45: `api/routes/audio_analyzer.py` y `api/routes/model_cache.py`
- Día 46-48: `decorators/circuit_breaker_decorator.py`
- Día 49-52: Tests de integración y casos edge
- Día 53-56: Revisión y ajustes finales

#### Semana 11-16: Hacia 60%+
- Servicios avanzados
- Casos edge adicionales
- Tests de integración completos

## Métricas de Seguimiento

### KPIs por Fase

| Fase | Cobertura Objetivo | Líneas Objetivo | Tests Objetivo | Estado |
|------|-------------------|-----------------|----------------|--------|
| Fase 1 | 25% | +1,073 | +50 tests | ⏳ Pendiente |
| Fase 2 | 35% | +1,510 | +75 tests | ⏳ Pendiente |
| Fase 3 | 50% | +2,265 | +100 tests | ⏳ Pendiente |
| Fase 4 | 60%+ | +1,510 | +75 tests | ⏳ Pendiente |

### Cobertura por Módulo (Objetivos)

#### Core (Objetivo: 80%+)
- `core/config.py`: 80%
- `core/database.py`: 75%
- `core/cache.py`: 75%
- `core/pattern_config.py`: 70%

#### Services (Objetivo: 70%+)
- `services/ai_service_manager.py`: 70%
- `services/symptom_analysis_service.py`: 75%
- `services/medical_history_service.py`: 75%
- `services/enhanced_chatbot_service.py`: 70%

#### API Routes (Objetivo: 70%+)
- `api/routes/health.py`: 90%
- `api/routes/symptom_analyzer.py`: 70%
- `api/routes/medical_history.py`: 70%
- `api/routes/chat_analyzer.py`: 70%
- `api/routes/advanced_nlp.py`: 70%

#### Strategies (Objetivo: 75%+)
- `strategies/rule_based_strategy.py`: 80%
- `strategies/openai_strategy.py`: 75%
- `strategies/local_model_strategy.py`: 70%

#### Decorators (Objetivo: 80%+)
- `decorators/cache_decorator.py`: 80%
- `decorators/retry_decorator.py`: 85%
- `decorators/metrics_decorator.py`: 80%
- `decorators/circuit_breaker_decorator.py`: 75%

## Acciones Inmediatas (Próximos 7 Días)

### Día 1-2: Setup y Core Config
1. ✅ Revisar y mejorar tests existentes de `core/config.py`
2. ⏳ Crear tests para validación de variables de entorno
3. ⏳ Tests para valores por defecto y tipos

### Día 3-4: Core Cache
1. ⏳ Tests básicos de `core/cache.py`
2. ⏳ Tests de TTL y expiración
3. ⏳ Tests de manejo de errores

### Día 5-7: Core Database
1. ⏳ Tests de conexión/desconexión
2. ⏳ Tests de health checks
3. ⏳ Tests de manejo de errores

## Estrategias de Testing

### 1. Unit Tests (Prioridad Alta)
- Tests rápidos y aislados
- Mock de dependencias externas
- Cobertura de casos happy path y errores

### 2. Integration Tests (Prioridad Media)
- Tests de integración entre componentes
- Uso de bases de datos en memoria (mongomock, fakeredis)
- Tests de flujos completos

### 3. Edge Cases (Prioridad Media)
- Validación de entradas
- Manejo de errores
- Límites y condiciones extremas

### 4. Performance Tests (Prioridad Baja)
- Solo para endpoints críticos
- Tests de carga básicos

## Herramientas y Comandos

### Ver Coverage Actual
```bash
python ver_coverage.py
# o
python -c "import xml.etree.ElementTree as ET; tree = ET.parse('coverage.xml'); root = tree.getroot(); print(f'Cobertura: {float(root.attrib.get(\"line-rate\", 0))*100:.2f}%')"
```

### Generar Coverage
```bash
# Windows PowerShell
$env:TESTING="true"
$env:AI_RATE_LIMIT_ENABLED="0"
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=term-missing --cov-report=xml:coverage.xml

# Windows CMD
set TESTING=true
set AI_RATE_LIMIT_ENABLED=0
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=term-missing --cov-report=xml:coverage.xml

# Linux/WSL
export TESTING=true
export AI_RATE_LIMIT_ENABLED=0
python -m pytest --cov=./ --cov-config=.coveragerc --cov-report=term-missing --cov-report=xml:coverage.xml
```

**Nota**: En Windows, usa `python -m pytest` en lugar de solo `pytest`. Ver `docs/INSTALACION_PYTEST.md` para más detalles.

### Ver Coverage por Módulo
```bash
python -m pytest --cov=./ --cov-report=term-missing | grep -E "^[a-z]"
```

### Coverage de Módulo Específico
```bash
python -m pytest --cov=core --cov-report=term-missing tests/core/
python -m pytest --cov=services --cov-report=term-missing tests/services/
python -m pytest --cov=api --cov-report=term-missing tests/api/
```

## Checklist de Progreso

### Fase 1: Core Módulos (→ 25%)
- [ ] `core/config.py` - 80% cobertura
- [ ] `core/database.py` - 75% cobertura
- [ ] `core/cache.py` - 75% cobertura
- [ ] `main.py` - 60% cobertura (endpoints principales)
- [ ] `api/routes/health.py` - 90% cobertura
- [ ] `api/routes/symptom_analyzer.py` - 70% cobertura

### Fase 2: Servicios y Strategies (→ 35%)
- [ ] `services/ai_service_manager.py` - 70% cobertura
- [ ] `services/symptom_analysis_service.py` - 75% cobertura
- [ ] `services/medical_history_service.py` - 75% cobertura
- [ ] `services/enhanced_chatbot_service.py` - 70% cobertura
- [ ] `strategies/rule_based_strategy.py` - 80% cobertura
- [ ] `strategies/openai_strategy.py` - 75% cobertura
- [ ] `strategies/local_model_strategy.py` - 70% cobertura

### Fase 3: APIs y Decoradores (→ 50%)
- [ ] `api/routes/chat_analyzer.py` - 70% cobertura
- [ ] `api/routes/advanced_nlp.py` - 70% cobertura
- [ ] `api/routes/audio_analyzer.py` - 65% cobertura
- [ ] `api/routes/model_cache.py` - 75% cobertura
- [ ] `api/routes/core_domains_support.py` - 70% cobertura
- [ ] `decorators/cache_decorator.py` - 80% cobertura
- [ ] `decorators/retry_decorator.py` - 85% cobertura
- [ ] `decorators/metrics_decorator.py` - 80% cobertura
- [ ] `decorators/circuit_breaker_decorator.py` - 75% cobertura
- [ ] `decorators/logging_decorator.py` - 75% cobertura
- [ ] `utils/urgency_calculator.py` - 85% cobertura

### Fase 4: Servicios Avanzados (→ 60%+)
- [ ] `services/audio_transcription_service.py` - 70% cobertura
- [ ] `services/core_domains_support.py` - 70% cobertura
- [ ] Tests de integración completos
- [ ] Casos edge adicionales

## Notas Importantes

1. **Umbral Temporal**: El umbral de 35% es temporal. Se aumentará gradualmente a medida que la cobertura mejore.

2. **Exclusiones**: Los módulos excluidos pueden incluirse gradualmente cuando sea necesario y posible.

3. **Priorización**: Enfocar esfuerzo en módulos con mayor impacto (core, servicios principales, APIs críticas).

4. **Testing Incremental**: Trabajar módulo por módulo, verificando cobertura después de cada uno.

5. **CI/CD**: El workflow de CI/CD verificará automáticamente el umbral de 35% mínimo.

6. **Mocks**: Usar mocks apropiados para dependencias externas (OpenAI, bases de datos, etc.).

7. **WSL/Docker**: Para evitar problemas con torch DLL en Windows, ejecutar tests en WSL o Docker.

## Referencias

- `ai-services/ver_coverage.py` - Script para ver coverage
- `ai-services/.coveragerc` - Configuración de coverage
- `.github/workflows/ai-services-tests.yml` - Workflow de CI/CD
- `ai-services/docs/TEST_FIXES_PROGRESS.md` - Progreso de correcciones de tests
