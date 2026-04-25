"""
Configuración de OpenTelemetry para AI Services (Python/FastAPI)

Incluye:
- Tracing distribuido completo
- Métricas de negocio personalizadas
- Logs estructurados
- Integración con Jaeger y OTLP
"""

import os
import logging
from typing import Optional, Dict, Any, Callable
from functools import wraps
import time

logger = logging.getLogger(__name__)

# Variables globales para los componentes de OTEL
_tracer = None
_meter = None
_initialized = False

def init_opentelemetry() -> bool:
    """
    Inicializa OpenTelemetry para AI Services
    
    Returns:
        bool: True si se inicializó correctamente, False en caso contrario
    """
    global _tracer, _meter, _initialized
    
    if os.getenv('OTEL_ENABLED', 'false').lower() != 'true':
        logger.info('OpenTelemetry desactivado (OTEL_ENABLED!=true)')
        return False
    
    try:
        from opentelemetry import trace, metrics
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.metrics import MeterProvider
        from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.requests import RequestsInstrumentor
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        
        service_name = os.getenv('OTEL_SERVICE_NAME', 'respicare-ai-services')
        service_version = os.getenv('OTEL_SERVICE_VERSION', os.getenv('APP_VERSION', '1.0.0'))
        environment = os.getenv('NODE_ENV', os.getenv('ENVIRONMENT', 'development'))
        
        # Configurar Resource con atributos semánticos
        resource = Resource.create({
            'service.name': service_name,
            'service.version': service_version,
            'deployment.environment': environment,
            'service.namespace': 'respicare',
            'service.team': 'ai-services'
        })
        
        # Configurar exportador de trazas
        exporter_type = os.getenv('OTEL_EXPORTER', 'otlp').lower()
        
        if exporter_type == 'jaeger':
            from opentelemetry.exporter.jaeger.thrift import JaegerExporter
            trace_exporter = JaegerExporter(
                agent_host_name=os.getenv('OTEL_EXPORTER_JAEGER_AGENT_HOST', 'jaeger-collector'),
                agent_port=int(os.getenv('OTEL_EXPORTER_JAEGER_AGENT_PORT', '6831'))
            )
        else:
            # OTLP por defecto
            trace_exporter = OTLPSpanExporter(
                endpoint=os.getenv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT') or 
                         os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT') or 
                         'http://otel-collector:4318/v1/traces',
                headers=_parse_headers(os.getenv('OTEL_EXPORTER_OTLP_HEADERS', ''))
            )
        
        # Configurar TracerProvider
        trace_provider = TracerProvider(resource=resource)
        trace_provider.add_span_processor(
            BatchSpanProcessor(
                trace_exporter,
                max_export_batch_size=512,
                export_timeout_millis=30000,
                schedule_delay_millis=5000
            )
        )
        trace.set_tracer_provider(trace_provider)
        _tracer = trace.get_tracer(service_name, service_version)
        
        # Configurar exportador de métricas
        metric_exporter = OTLPMetricExporter(
            endpoint=os.getenv('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT') or 
                     os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT') or 
                     'http://otel-collector:4318/v1/metrics',
            headers=_parse_headers(os.getenv('OTEL_EXPORTER_OTLP_HEADERS', ''))
        )
        
        # Configurar MeterProvider
        metric_reader = PeriodicExportingMetricReader(
            exporter=metric_exporter,
            export_interval_millis=60000,  # Exportar cada minuto
            export_timeout_millis=30000
        )
        metric_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
        metrics.set_meter_provider(metric_provider)
        _meter = metrics.get_meter(service_name, service_version)
        
        # Inicializar métricas de negocio personalizadas
        _init_business_metrics()
        
        _initialized = True
        logger.info(f'✅ OpenTelemetry inicializado con exportador: {exporter_type}', extra={
            'service_name': service_name,
            'service_version': service_version,
            'environment': environment
        })
        
        return True
        
    except ImportError as e:
        logger.warning(f'OpenTelemetry no disponible (dependencias no instaladas): {e}')
        logger.info('Instala las dependencias con: pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp opentelemetry-instrumentation-fastapi')
        return False
    except Exception as e:
        logger.error(f'Error inicializando OpenTelemetry: {e}', exc_info=True)
        return False


def _parse_headers(headers_str: str) -> Dict[str, str]:
    """Parsea headers desde string JSON o formato key=value"""
    if not headers_str:
        return {}
    
    try:
        import json
        return json.loads(headers_str)
    except:
        # Formato alternativo: key1=value1,key2=value2
        headers = {}
        for pair in headers_str.split(','):
            if '=' in pair:
                key, value = pair.split('=', 1)
                headers[key.strip()] = value.strip()
        return headers


# Métricas de negocio personalizadas
_business_metrics: Dict[str, Any] = {}


def _init_business_metrics():
    """Inicializa métricas de negocio personalizadas"""
    global _business_metrics, _meter
    
    if not _meter:
        return
    
    try:
        # Métricas de predicciones ML
        _business_metrics['ml_predictions_total'] = _meter.create_counter(
            'respicare.ml.predictions',
            description='Total de predicciones ML realizadas',
            unit='1'
        )
        
        _business_metrics['ml_prediction_latency'] = _meter.create_histogram(
            'respicare.ml.prediction_latency',
            description='Latencia de predicciones ML en milisegundos',
            unit='ms'
        )
        
        # Métricas de análisis de síntomas
        _business_metrics['symptom_analyses_total'] = _meter.create_counter(
            'respicare.symptom_analyses.total',
            description='Total de análisis de síntomas realizados',
            unit='1'
        )
        
        # Métricas de análisis de imágenes
        _business_metrics['image_analyses_total'] = _meter.create_counter(
            'respicare.image_analyses.total',
            description='Total de análisis de imágenes realizados',
            unit='1'
        )
        
        # Métricas de transcripciones de audio
        _business_metrics['audio_transcriptions_total'] = _meter.create_counter(
            'respicare.audio_transcriptions.total',
            description='Total de transcripciones de audio realizadas',
            unit='1'
        )
        
        # Métricas de modelos ML
        _business_metrics['model_inference_latency'] = _meter.create_histogram(
            'respicare.model.inference_latency',
            description='Latencia de inferencia de modelos ML',
            unit='ms'
        )
        
        # Métricas de cache
        _business_metrics['cache_hits'] = _meter.create_counter(
            'respicare.cache.hits',
            description='Total de hits en cache',
            unit='1'
        )
        
        _business_metrics['cache_misses'] = _meter.create_counter(
            'respicare.cache.misses',
            description='Total de misses en cache',
            unit='1'
        )
        
        logger.info('✅ Métricas de negocio personalizadas inicializadas')
        
    except Exception as e:
        logger.warning(f'No se pudieron inicializar métricas de negocio: {e}')


def get_business_metric(name: str) -> Optional[Any]:
    """Obtiene una métrica de negocio por nombre"""
    return _business_metrics.get(name)


def increment_business_metric(name: str, value: int = 1, attributes: Optional[Dict[str, str]] = None):
    """Incrementa una métrica de negocio"""
    metric = _business_metrics.get(name)
    if metric:
        try:
            if hasattr(metric, 'add'):
                metric.add(value, attributes or {})
        except Exception as e:
            logger.warning(f'Error incrementando métrica {name}: {e}')


def record_business_latency(name: str, value: float, attributes: Optional[Dict[str, str]] = None):
    """Registra una latencia en una métrica de histograma"""
    metric = _business_metrics.get(name)
    if metric and hasattr(metric, 'record'):
        try:
            metric.record(value, attributes or {})
        except Exception as e:
            logger.warning(f'Error registrando latencia {name}: {e}')


def create_business_span(name: str, attributes: Optional[Dict[str, Any]] = None):
    """
    Crea un contexto de span para operaciones de negocio
    
    Usage:
        with create_business_span('operation_name', {'key': 'value'}):
            # código de la operación
    """
    if not _tracer:
        from contextlib import nullcontext
        return nullcontext()
    
    span = _tracer.start_span(name)
    if attributes:
        for key, value in attributes.items():
            span.set_attribute(key, str(value))
    
    return span


def trace_business_operation(operation_name: str):
    """
    Decorador para trazar operaciones de negocio
    
    Usage:
        @trace_business_operation('analyze_symptoms')
        def analyze_symptoms(data):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if not _tracer:
                return await func(*args, **kwargs)
            
            try:
                from opentelemetry import trace as otel_trace
                from opentelemetry.trace import Status, StatusCode
            except ImportError:
                return await func(*args, **kwargs)
            
            with _tracer.start_as_current_span(operation_name) as span:
                start_time = time.time()
                try:
                    span.set_attribute('business.operation', operation_name)
                    result = await func(*args, **kwargs)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    span.set_attribute('duration_ms', duration_ms)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if not _tracer:
                return func(*args, **kwargs)
            
            try:
                from opentelemetry import trace as otel_trace
                from opentelemetry.trace import Status, StatusCode
            except ImportError:
                return func(*args, **kwargs)
            
            with _tracer.start_as_current_span(operation_name) as span:
                start_time = time.time()
                try:
                    span.set_attribute('business.operation', operation_name)
                    result = func(*args, **kwargs)
                    span.set_status(Status(StatusCode.OK))
                    return result
                except Exception as e:
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    span.record_exception(e)
                    raise
                finally:
                    duration_ms = (time.time() - start_time) * 1000
                    span.set_attribute('duration_ms', duration_ms)
        
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def instrument_fastapi_app(app):
    """
    Instrumenta una aplicación FastAPI con OpenTelemetry
    
    Args:
        app: Instancia de FastAPI
    """
    if not _initialized:
        logger.warning('OpenTelemetry no inicializado, no se puede instrumentar FastAPI')
        return
    
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
        logger.info('✅ FastAPI instrumentado con OpenTelemetry')
    except Exception as e:
        logger.warning(f'Error instrumentando FastAPI: {e}')


def get_opentelemetry_status() -> Dict[str, Any]:
    """Obtiene el estado de OpenTelemetry"""
    return {
        'enabled': os.getenv('OTEL_ENABLED', 'false').lower() == 'true',
        'initialized': _initialized,
        'tracer_available': _tracer is not None,
        'meter_available': _meter is not None,
        'metrics_count': len(_business_metrics)
    }


# Trace se importa dinámicamente cuando es necesario

