"""
Circuit Breaker Decorator Implementation
"""

from functools import wraps
from typing import Any, Optional, Callable
import structlog
from circuit_breaker.circuit_breaker import circuit_breaker_manager

logger = structlog.get_logger()


class CircuitBreakerDecorator:
    """Decorator for adding circuit breaker functionality to methods"""
    
    def __init__(
        self,
        service_name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        success_threshold: int = 2
    ):
        self.service_name = service_name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.success_threshold = success_threshold
    
    def __call__(self, func: Callable) -> Callable:
        """Apply circuit breaker decorator to function"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._execute_with_circuit_breaker(func, args, kwargs, is_async=True)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._execute_with_circuit_breaker(func, args, kwargs, is_async=False)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _execute_with_circuit_breaker(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Execute function with circuit breaker protection"""
        # Get or create circuit breaker for this service
        circuit_breaker = circuit_breaker_manager.get_circuit_breaker(
            self.service_name,
            failure_threshold=self.failure_threshold,
            recovery_timeout=self.recovery_timeout,
            expected_exception=self.expected_exception,
            success_threshold=self.success_threshold
        )
        
        try:
            # Execute function through circuit breaker
            if is_async:
                result = await circuit_breaker.call(func, *args, **kwargs)
            else:
                # For sync functions, we need to wrap them in a coroutine
                async def sync_wrapper():
                    return func(*args, **kwargs)
                result = await circuit_breaker.call(sync_wrapper)
            
            logger.debug("Function executed successfully with circuit breaker",
                        function=func.__name__,
                        service=self.service_name)
            
            return result
            
        except Exception as e:
            logger.warning("Function execution failed with circuit breaker",
                          function=func.__name__,
                          service=self.service_name,
                          error=str(e))
            raise


def with_circuit_breaker(
    service_name: str,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exception: type = Exception,
    success_threshold: int = 2
):
    """Decorator function for adding circuit breaker functionality to methods"""
    def decorator(func: Callable) -> Callable:
        circuit_breaker_decorator = CircuitBreakerDecorator(
            service_name=service_name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=expected_exception,
            success_threshold=success_threshold
        )
        return circuit_breaker_decorator(func)
    return decorator


class OpenAICircuitBreakerDecorator:
    """Specialized circuit breaker decorator for OpenAI API calls"""
    
    def __init__(self, **kwargs):
        self.kwargs = kwargs
    
    def __call__(self, func: Callable) -> Callable:
        """Apply OpenAI circuit breaker decorator to function"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._execute_with_openai_circuit_breaker(func, args, kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._execute_with_openai_circuit_breaker(func, args, kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _execute_with_openai_circuit_breaker(self, func: Callable, args: tuple, kwargs: dict):
        """Execute OpenAI function with specialized circuit breaker"""
        from circuit_breaker.openai_circuit_breaker import OpenAICircuitBreaker
        
        # Create OpenAI-specific circuit breaker
        circuit_breaker = OpenAICircuitBreaker(**self.kwargs)
        
        try:
            # Execute function through OpenAI circuit breaker
            result = await circuit_breaker.call_openai(func, *args, **kwargs)
            
            logger.debug("OpenAI function executed successfully",
                        function=func.__name__)
            
            return result
            
        except Exception as e:
            logger.warning("OpenAI function execution failed",
                          function=func.__name__,
                          error=str(e))
            raise


def with_openai_circuit_breaker(**kwargs):
    """Decorator for OpenAI-specific circuit breaker"""
    def decorator(func: Callable) -> Callable:
        circuit_breaker_decorator = OpenAICircuitBreakerDecorator(**kwargs)
        return circuit_breaker_decorator(func)
    return decorator


class ExternalServiceCircuitBreakerDecorator:
    """Specialized circuit breaker decorator for external HTTP services"""
    
    def __init__(self, service_name: str, base_url: str, **kwargs):
        self.service_name = service_name
        self.base_url = base_url
        self.kwargs = kwargs
    
    def __call__(self, func: Callable) -> Callable:
        """Apply external service circuit breaker decorator to function"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._execute_with_external_circuit_breaker(func, args, kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._execute_with_external_circuit_breaker(func, args, kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _execute_with_external_circuit_breaker(self, func: Callable, args: tuple, kwargs: dict):
        """Execute external service function with circuit breaker"""
        from circuit_breaker.external_service_circuit_breaker import service_manager
        
        try:
            # Register service if not already registered
            service = service_manager.get_service(self.service_name)
            if not service:
                service = service_manager.register_service(
                    self.service_name,
                    self.base_url,
                    **self.kwargs
                )
            
            # Execute function through external service circuit breaker
            result = await service.call_http_service(
                func.__name__.upper(),  # Assume function name maps to HTTP method
                "/",  # Default endpoint
                **kwargs
            )
            
            logger.debug("External service function executed successfully",
                        function=func.__name__,
                        service=self.service_name)
            
            return result
            
        except Exception as e:
            logger.warning("External service function execution failed",
                          function=func.__name__,
                          service=self.service_name,
                          error=str(e))
            raise


def with_external_service_circuit_breaker(service_name: str, base_url: str, **kwargs):
    """Decorator for external service circuit breaker"""
    def decorator(func: Callable) -> Callable:
        circuit_breaker_decorator = ExternalServiceCircuitBreakerDecorator(
            service_name=service_name,
            base_url=base_url,
            **kwargs
        )
        return circuit_breaker_decorator(func)
    return decorator
