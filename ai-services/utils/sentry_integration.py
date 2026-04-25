"""
Sentry Error Tracking Integration for AI Services

Configuración e inicialización de Sentry para tracking de errores
"""

import os
import logging
from typing import Optional, Dict, Any
from functools import wraps

logger = logging.getLogger(__name__)

_sentry_initialized = False
_sentry_sdk = None

def init_sentry() -> bool:
    """
    Inicializa Sentry si está habilitado y configurado
    
    Returns:
        bool: True si Sentry se inicializó correctamente
    """
    global _sentry_initialized, _sentry_sdk
    
    if _sentry_initialized:
        return True
    
    dsn = os.getenv('SENTRY_DSN')
    enabled = os.getenv('SENTRY_ENABLED', 'false').lower() == 'true'
    environment = os.getenv('NODE_ENV', 'development')
    
    if not enabled or not dsn:
        logger.info('Sentry disabled or DSN not configured')
        return False
    
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        
        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            integrations=[
                FastApiIntegration(transaction_style='endpoint'),
                LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
                SqlalchemyIntegration(),
            ],
            # Performance Monitoring
            traces_sample_rate=1.0 if environment != 'production' else 0.1,  # 10% en prod
            profiles_sample_rate=1.0 if environment != 'production' else 0.1,
            
            # Release tracking
            release=os.getenv('APP_VERSION', '1.0.0'),
            
            # Before send hook para filtrar/redactar datos sensibles
            before_send=lambda event, hint: _redact_sensitive_data(event),
            
            # Ignorar ciertos errores
            ignore_errors=[
                KeyboardInterrupt,
                SystemExit,
            ],
        )
        
        _sentry_sdk = sentry_sdk
        _sentry_initialized = True
        logger.info('✅ Sentry initialized successfully')
        return True
    except ImportError:
        logger.warning('Sentry SDK not installed. Install with: pip install sentry-sdk[fastapi]')
        return False
    except Exception as e:
        logger.error(f'❌ Failed to initialize Sentry: {e}')
        return False


def _redact_sensitive_data(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Redacta información sensible del evento antes de enviarlo a Sentry
    """
    sensitive_fields = ['password', 'token', 'secret', 'api_key', 'jwt', 'authorization']
    
    def redact_dict(obj: Any) -> Any:
        if not isinstance(obj, dict):
            return obj
        
        redacted = {}
        for key, value in obj.items():
            key_lower = key.lower()
            if any(field in key_lower for field in sensitive_fields):
                redacted[key] = '[REDACTED]'
            elif isinstance(value, dict):
                redacted[key] = redact_dict(value)
            elif isinstance(value, list):
                redacted[key] = [redact_dict(item) if isinstance(item, dict) else item for item in value]
            else:
                redacted[key] = value
        return redacted
    
    # Redactar request data
    if 'request' in event and 'data' in event['request']:
        event['request']['data'] = redact_dict(event['request']['data'])
    
    # Redactar headers
    if 'request' in event and 'headers' in event['request']:
        headers = event['request']['headers']
        for header in ['authorization', 'cookie', 'x-api-key']:
            if header in headers:
                headers[header] = '[REDACTED]'
    
    return event


def set_sentry_user(user_id: str, email: Optional[str] = None, role: Optional[str] = None):
    """
    Establece información del usuario en Sentry
    
    Args:
        user_id: ID del usuario
        email: Email del usuario (opcional)
        role: Rol del usuario (opcional)
    """
    if not _sentry_initialized or not _sentry_sdk:
        return
    
    try:
        _sentry_sdk.set_user({
            'id': user_id,
            'email': email,
            'username': email,
            'role': role,
        })
    except Exception as e:
        logger.warning(f'Failed to set Sentry user: {e}')


def clear_sentry_user():
    """Limpia la información del usuario en Sentry"""
    if not _sentry_initialized or not _sentry_sdk:
        return
    
    try:
        _sentry_sdk.set_user(None)
    except Exception as e:
        logger.warning(f'Failed to clear Sentry user: {e}')


def capture_exception(error: Exception, context: Optional[Dict[str, Any]] = None):
    """
    Captura una excepción en Sentry
    
    Args:
        error: Excepción a capturar
        context: Contexto adicional (opcional)
    """
    if not _sentry_initialized or not _sentry_sdk:
        return
    
    try:
        with _sentry_sdk.push_scope() as scope:
            if context:
                scope.set_context('additional', context)
            _sentry_sdk.capture_exception(error)
    except Exception as e:
        logger.warning(f'Failed to capture exception in Sentry: {e}')


def capture_message(message: str, level: str = 'info', context: Optional[Dict[str, Any]] = None):
    """
    Captura un mensaje en Sentry
    
    Args:
        message: Mensaje a capturar
        level: Nivel del mensaje (info, warning, error)
        context: Contexto adicional (opcional)
    """
    if not _sentry_initialized or not _sentry_sdk:
        return
    
    try:
        with _sentry_sdk.push_scope() as scope:
            if context:
                scope.set_context('additional', context)
            scope.level = level
            _sentry_sdk.capture_message(message)
    except Exception as e:
        logger.warning(f'Failed to capture message in Sentry: {e}')


def add_breadcrumb(message: str, category: str = 'default', level: str = 'info', data: Optional[Dict[str, Any]] = None):
    """
    Agrega un breadcrumb a Sentry
    
    Args:
        message: Mensaje del breadcrumb
        category: Categoría del breadcrumb
        level: Nivel (info, warning, error)
        data: Datos adicionales (opcional)
    """
    if not _sentry_initialized or not _sentry_sdk:
        return
    
    try:
        _sentry_sdk.add_breadcrumb(
            message=message,
            category=category,
            level=level,
            data=data or {},
        )
    except Exception as e:
        logger.warning(f'Failed to add breadcrumb to Sentry: {e}')


def sentry_trace(func):
    """
    Decorator para rastrear funciones en Sentry
    
    Usage:
        @sentry_trace
        def my_function():
            ...
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not _sentry_initialized or not _sentry_sdk:
            return func(*args, **kwargs)
        
        with _sentry_sdk.start_transaction(op='function', name=func.__name__):
            return func(*args, **kwargs)
    
    return wrapper

