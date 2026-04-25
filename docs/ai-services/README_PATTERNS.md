# 🎯 Patrones de Arquitectura Implementados - AI Services

Este documento describe la implementación completa de patrones de software en el sistema AI Services de RespiCare, siguiendo las mejores prácticas de arquitectura de software.

## 📋 Tabla de Contenidos

- [Patrones Implementados](#patrones-implementados)
- [Arquitectura General](#arquitectura-general)
- [Guía de Uso](#guía-de-uso)
- [Configuración](#configuración)
- [Ejemplos de Implementación](#ejemplos-de-implementación)

## 🏛️ Patrones Implementados

### 1. **Strategy Pattern** - Algoritmos de IA Intercambiables

**Ubicación**: `strategies/`

Permite cambiar algoritmos de análisis de IA en tiempo de ejecución sin modificar el código cliente.

```python
# Estrategias disponibles
- OpenAIStrategy: Usa OpenAI API
- LocalModelStrategy: Usa modelos locales (TensorFlow/PyTorch)
- RuleBasedStrategy: Análisis basado en reglas
- HybridStrategy: Combina múltiples estrategias
- FallbackStrategy: Estrategia de respaldo automático

# Uso
from strategies import AnalysisContext, OpenAIStrategy

strategy = OpenAIStrategy()
context = AnalysisContext(strategy)
result = await context.analyze_symptoms(symptoms, context)
```

**Beneficios**:
- ✅ Flexibilidad para cambiar algoritmos
- ✅ Fácil extensión con nuevas estrategias
- ✅ Fallback automático en caso de fallos

### 2. **Factory Pattern** - Creación de Servicios y Modelos

**Ubicación**: `factories/`

Centraliza la creación de objetos complejos y servicios.

```python
# Factories disponibles
- ServiceFactory: Crea servicios de IA
- ModelFactory: Crea modelos de ML
- StrategyFactory: Crea estrategias de análisis

# Uso
from factories import ServiceFactory, ServiceType

service = ServiceFactory.create_service(ServiceType.SYMPTOM_ANALYZER)
suite = ServiceFactory.create_production_services()
```

**Beneficios**:
- ✅ Creación consistente de objetos
- ✅ Configuración centralizada
- ✅ Diferentes configuraciones por ambiente

### 3. **Circuit Breaker Pattern** - Protección de Servicios Externos

**Ubicación**: `circuit_breaker/`

Protege contra fallos de servicios externos (OpenAI, APIs HTTP).

```python
# Tipos de Circuit Breaker
- CircuitBreaker: General para cualquier servicio
- OpenAICircuitBreaker: Especializado para OpenAI
- ExternalServiceCircuitBreaker: Para servicios HTTP

# Uso
from circuit_breaker import circuit_breaker_manager

result = await circuit_breaker_manager.call_with_circuit_breaker(
    "openai_service", openai_function, *args, **kwargs
)
```

**Beneficios**:
- ✅ Prevención de cascadas de fallos
- ✅ Recuperación automática
- ✅ Monitoreo de salud de servicios

### 4. **Repository Pattern** - Gestión de Datos

**Ubicación**: `repositories/`

Abstrae el acceso a datos y proporciona una interfaz consistente.

```python
# Repositories disponibles
- MedicalHistoryRepository: Historias médicas
- AIResultRepository: Resultados de IA
- PatientRepository: Datos de pacientes

# Uso
from repositories import MedicalHistoryRepository

repo = MedicalHistoryRepository(db_client)
history = await repo.create_medical_history(history_data)
```

**Beneficios**:
- ✅ Separación de lógica de negocio y datos
- ✅ Soft delete y auditoría automática
- ✅ Versionado de entidades

### 5. **Decorator Pattern** - Funcionalidades Transversales

**Ubicación**: `decorators/`

Añade funcionalidades transversales de manera no invasiva.

```python
# Decoradores disponibles
- @with_cache: Caché automático
- @with_logging: Logging estructurado
- @with_retry: Reintentos automáticos
- @with_circuit_breaker: Circuit breaker
- @with_metrics: Métricas de rendimiento

# Uso
from decorators import with_cache, with_logging, with_metrics

@with_cache(ttl=3600)
@with_logging(log_level="info")
@with_metrics(track_execution_time=True)
async def analyze_symptoms(symptoms, patient_id):
    # Lógica de análisis
    pass
```

**Beneficios**:
- ✅ Funcionalidades transversales reutilizables
- ✅ Código limpio y mantenible
- ✅ Configuración flexible

## 🏗️ Arquitectura General

### Estructura de Microservicios Ligeros

```
ai-services/
├── strategies/           # Strategy Pattern
│   ├── analysis_strategy.py
│   ├── openai_strategy.py
│   ├── local_model_strategy.py
│   └── rule_based_strategy.py
├── factories/           # Factory Pattern
│   ├── service_factory.py
│   ├── model_factory.py
│   └── strategy_factory.py
├── circuit_breaker/     # Circuit Breaker Pattern
│   ├── circuit_breaker.py
│   ├── openai_circuit_breaker.py
│   └── external_service_circuit_breaker.py
├── repositories/        # Repository Pattern
│   ├── base_repository.py
│   ├── medical_history_repository.py
│   ├── ai_result_repository.py
│   └── patient_repository.py
├── decorators/          # Decorator Pattern
│   ├── cache_decorator.py
│   ├── logging_decorator.py
│   ├── retry_decorator.py
│   ├── circuit_breaker_decorator.py
│   └── metrics_decorator.py
├── services/           # Service Layer
│   ├── ai_service_manager.py
│   ├── symptom_analysis_service.py
│   └── medical_history_service.py
└── core/               # Configuration
    ├── pattern_config.py
    └── config.py
```

### Flujo de Datos

```
API Request → Service Layer → Strategy Selection → Circuit Breaker → AI Processing → Repository → Response
                ↓
            Decorators (Cache, Logging, Metrics, Retry)
```

## 🚀 Guía de Uso

### 1. Inicialización del Sistema

```python
from services.ai_service_manager import ai_service_manager

# Inicializar el gestor de servicios
await ai_service_manager.initialize()

# Verificar salud del sistema
health = await ai_service_manager.get_service_health()
print(f"System status: {health['overall_status']}")
```

### 2. Análisis de Síntomas

```python
from services.symptom_analysis_service import SymptomAnalysisService

# Crear servicio de análisis
symptom_service = SymptomAnalysisService(ai_service_manager)

# Análisis completo
result = await symptom_service.analyze_symptoms_comprehensive(
    symptoms=[
        {"symptom": "tos seca", "severity": "moderate", "duration": "2 semanas"},
        {"symptom": "fiebre", "severity": "mild", "duration": "3 días"}
    ],
    patient_id="P001",
    context={"age": 45, "diabetes": True},
    include_trends=True,
    include_recommendations=True
)
```

### 3. Procesamiento de Historia Médica

```python
from services.medical_history_service import MedicalHistoryService

# Crear servicio de procesamiento
history_service = MedicalHistoryService(ai_service_manager)

# Procesamiento completo
result = await history_service.process_medical_history_comprehensive(
    text="Paciente de 45 años con tos seca persistente...",
    patient_id="P001",
    context={"language": "es"},
    include_entity_extraction=True,
    include_diagnosis_suggestions=True
)
```

### 4. Uso de Decoradores

```python
from decorators import with_cache, with_logging, with_metrics

@with_cache(ttl=1800, key_prefix="symptom_analysis")
@with_logging(log_level="info", log_execution_time=True)
@with_metrics(track_execution_time=True, track_success_rate=True)
async def custom_analysis_function(symptoms, patient_id):
    # Tu lógica personalizada aquí
    pass
```

## ⚙️ Configuración

### Variables de Entorno

```bash
# Strategy Pattern
STRATEGY_DEFAULT=auto
STRATEGY_FALLBACK_ENABLED=true
STRATEGY_CONFIDENCE_THRESHOLD=0.7

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60

# Cache
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=3600
CACHE_SYMPTOM_ANALYSIS_TTL=1800

# Retry
RETRY_ENABLED=true
RETRY_MAX_ATTEMPTS=3
RETRY_DELAY=1.0

# Logging
LOGGING_ENABLED=true
LOGGING_LEVEL=info
LOGGING_EXECUTION_TIME=true

# Metrics
METRICS_ENABLED=true
METRICS_EXECUTION_TIME=true
METRICS_SLOW_THRESHOLD_MS=1000.0
```

### Configuración Programática

```python
from core.pattern_config import pattern_manager

# Obtener configuración de un patrón
cache_config = pattern_manager.get_cache_config()
circuit_breaker_config = pattern_manager.get_circuit_breaker_config()

# Verificar si un patrón está habilitado
if pattern_manager.is_pattern_enabled("cache"):
    print("Cache está habilitado")

# Actualizar configuración
pattern_manager.update_config(
    cache_default_ttl=7200,
    retry_max_attempts=5
)
```

## 📊 Ejemplos de Implementación

### 1. Servicio con Todos los Patrones

```python
from decorators import *
from services.ai_service_manager import ai_service_manager

class ComprehensiveAnalysisService:
    
    @with_cache(ttl=1800, key_prefix="comprehensive_analysis")
    @with_circuit_breaker("comprehensive_analysis", failure_threshold=3)
    @with_retry(max_attempts=3, delay=1.0)
    @with_logging(log_level="info", log_execution_time=True)
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def analyze_comprehensive(self, data, patient_id):
        # Usar AI Service Manager
        result = await ai_service_manager.analyze_symptoms(
            data["symptoms"], 
            patient_id, 
            data.get("context")
        )
        
        # Usar Repository para almacenar
        if hasattr(ai_service_manager, 'repositories'):
            await ai_service_manager.repositories['ai_results'].create_ai_result({
                'patient_id': patient_id,
                'type': 'comprehensive_analysis',
                'data': result
            })
        
        return result
```

### 2. Factory para Diferentes Ambientes

```python
from factories import ServiceFactory, StrategyFactory

# Desarrollo
dev_services = ServiceFactory.create_development_services()

# Producción
prod_services = ServiceFactory.create_production_services()

# Estrategia óptima por ambiente
dev_strategy = StrategyFactory.create_optimal_strategy("development")
prod_strategy = StrategyFactory.create_optimal_strategy("production")
```

### 3. Circuit Breaker para Servicios Externos

```python
from circuit_breaker import circuit_breaker_manager

# Registrar servicio externo
service = circuit_breaker_manager.register_service(
    "medical_api",
    "https://api.medical-service.com",
    failure_threshold=3,
    recovery_timeout=60
)

# Llamada protegida
try:
    result = await circuit_breaker_manager.call_service(
        "medical_api",
        "GET",
        "/health"
    )
except Exception as e:
    print(f"Servicio no disponible: {e}")
```

## 🔍 Monitoreo y Métricas

### Health Check

```python
# Estado general del sistema
health = await ai_service_manager.get_service_health()
print(f"Overall Status: {health['overall_status']}")

# Métricas detalladas
metrics = await ai_service_manager.get_service_metrics()
print(f"Services: {metrics['services_count']}")
print(f"Strategies: {metrics['strategies_count']}")
```

### Métricas de Patrones

```python
# Métricas de Circuit Breaker
cb_metrics = circuit_breaker_manager.get_all_metrics()

# Métricas de Cache
cache_stats = await cache_service.get_stats()

# Métricas de Repositorio
repo_stats = await repository.get_statistics()
```

## 🛡️ Seguridad y Auditoría

### Auditoría Automática

```python
from decorators import with_audit_logging

@with_audit_logging(
    operation_type="medical_data_access",
    sensitive_fields=["patient_id", "medical_history"]
)
async def access_patient_data(patient_id, user_id):
    # Operación auditada automáticamente
    pass
```

### Soft Delete y Versionado

```python
# Los repositories implementan automáticamente:
# - Soft delete (no elimina físicamente)
# - Auditoría de cambios
# - Versionado de entidades

await repository.delete(entity_id)  # Soft delete
versions = await repository.get_versions(entity_id)  # Historial
```

## 🚀 Beneficios de la Implementación

### ✅ Escalabilidad
- Microservicios ligeros independientes
- Estrategias intercambiables
- Circuit breakers para resiliencia

### ✅ Mantenibilidad
- Separación clara de responsabilidades
- Patrones bien definidos
- Código reutilizable

### ✅ Observabilidad
- Logging estructurado
- Métricas detalladas
- Health checks automáticos

### ✅ Resiliencia
- Circuit breakers para servicios externos
- Retry automático
- Fallback strategies

### ✅ Flexibilidad
- Configuración por ambiente
- Estrategias intercambiables
- Decoradores modulares

## 📈 Próximos Pasos

1. **Implementar más estrategias de IA**
2. **Añadir más tipos de circuit breakers**
3. **Implementar observabilidad avanzada**
4. **Añadir tests automatizados para patrones**
5. **Optimizar configuración de cache**

---

*Este documento se actualiza continuamente. Para contribuciones o preguntas, consultar la documentación del proyecto.*
