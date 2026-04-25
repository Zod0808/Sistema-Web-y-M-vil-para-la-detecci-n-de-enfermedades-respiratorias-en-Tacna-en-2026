"""
Logging Decorator Implementation
"""

import time
import functools
from typing import Any, Optional, Callable
import structlog

logger = structlog.get_logger()


class LoggingDecorator:
    """Decorator for adding logging functionality to methods"""
    
    def __init__(
        self, 
        log_level: str = "info",
        log_args: bool = True,
        log_result: bool = False,
        log_execution_time: bool = True
    ):
        self.log_level = log_level
        self.log_args = log_args
        self.log_result = log_result
        self.log_execution_time = log_execution_time
    
    def __call__(self, func: Callable) -> Callable:
        """Apply logging decorator to function"""
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._log_execution(func, args, kwargs, is_async=True)
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._log_execution(func, args, kwargs, is_async=False)
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _log_execution(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Log function execution"""
        start_time = time.time()
        
        # Prepare log data
        log_data = {
            "function": func.__name__,
            "module": func.__module__
        }
        
        if self.log_args:
            # Log arguments (be careful with sensitive data)
            log_data.update({
                "args_count": len(args),
                "kwargs_keys": list(kwargs.keys()) if kwargs else []
            })
            
            # Log specific argument values if they're not too large
            for i, arg in enumerate(args):
                if isinstance(arg, (str, int, float, bool)) and len(str(arg)) < 100:
                    log_data[f"arg_{i}"] = arg
        
        # Log function start
        log_message = f"Starting {func.__name__}"
        self._log(log_message, log_data)
        
        try:
            # Execute function
            if is_async:
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Prepare success log data
            success_data = {
                **log_data,
                "execution_time_ms": round(execution_time * 1000, 2),
                "status": "success"
            }
            
            if self.log_result and result is not None:
                # Log result summary (be careful with large results)
                if isinstance(result, (dict, list)) and len(str(result)) < 500:
                    success_data["result_summary"] = str(result)[:200] + "..." if len(str(result)) > 200 else str(result)
                elif isinstance(result, (str, int, float, bool)):
                    success_data["result"] = result
            
            # Log function success
            success_message = f"Completed {func.__name__} successfully"
            self._log(success_message, success_data)
            
            return result
            
        except Exception as e:
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Prepare error log data
            error_data = {
                **log_data,
                "execution_time_ms": round(execution_time * 1000, 2),
                "status": "error",
                "error_type": type(e).__name__,
                "error_message": str(e)
            }
            
            # Log function error
            error_message = f"Failed {func.__name__}"
            self._log(error_message, error_data, level="error")
            
            raise
    
    def _log(self, message: str, data: dict, level: Optional[str] = None):
        """Log message with data"""
        log_level = level or self.log_level
        
        if log_level == "debug":
            logger.debug(message, **data)
        elif log_level == "info":
            logger.info(message, **data)
        elif log_level == "warning":
            logger.warning(message, **data)
        elif log_level == "error":
            logger.error(message, **data)
        else:
            logger.info(message, **data)


def with_logging(
    log_level: str = "info",
    log_args: bool = True,
    log_result: bool = False,
    log_execution_time: bool = True
):
    """Decorator function for adding logging to methods"""
    def decorator(func: Callable) -> Callable:
        logging_decorator = LoggingDecorator(
            log_level=log_level,
            log_args=log_args,
            log_result=log_result,
            log_execution_time=log_execution_time
        )
        return logging_decorator(func)
    return decorator


# Helper function for test compatibility
def logging_decorator(logger=None, log_level: str = "info", log_args: bool = True, 
                     log_result: bool = False, log_execution_time: bool = True):
    """
    Decorator function for adding logging to methods (test compatibility helper)
    
    Args:
        logger: Optional logger instance (for test compatibility, not used directly)
        log_level: Log level (default: "info")
        log_args: Whether to log function arguments (default: True)
        log_result: Whether to log function result (default: False)
        log_execution_time: Whether to log execution time (default: True)
    """
    def decorator(func: Callable) -> Callable:
        decorator_instance = LoggingDecorator(
            log_level=log_level,
            log_args=log_args,
            log_result=log_result,
            log_execution_time=log_execution_time
        )
        return decorator_instance(func)
    return decorator


class PerformanceLoggingDecorator:
    """Decorator for performance logging with detailed metrics"""
    
    def __init__(self, slow_threshold_ms: float = 1000.0):
        self.slow_threshold_ms = slow_threshold_ms
    
    def __call__(self, func: Callable) -> Callable:
        """Apply performance logging decorator to function"""
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._log_performance(func, args, kwargs, is_async=True)
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._log_performance(func, args, kwargs, is_async=False)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _log_performance(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Log performance metrics"""
        start_time = time.time()
        
        # Get memory usage (if available)
        import psutil
        process = psutil.Process()
        start_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        try:
            # Execute function
            if is_async:
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Calculate metrics
            execution_time = time.time() - start_time
            execution_time_ms = execution_time * 1000
            
            end_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_delta = end_memory - start_memory
            
            # Prepare performance data
            performance_data = {
                "function": func.__name__,
                "module": func.__module__,
                "execution_time_ms": round(execution_time_ms, 2),
                "memory_start_mb": round(start_memory, 2),
                "memory_end_mb": round(end_memory, 2),
                "memory_delta_mb": round(memory_delta, 2),
                "is_slow": execution_time_ms > self.slow_threshold_ms
            }
            
            # Log performance
            if execution_time_ms > self.slow_threshold_ms:
                logger.warning("Slow function execution", **performance_data)
            else:
                logger.info("Function performance", **performance_data)
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            execution_time_ms = execution_time * 1000
            
            error_data = {
                "function": func.__name__,
                "execution_time_ms": round(execution_time_ms, 2),
                "error": str(e),
                "status": "error"
            }
            
            logger.error("Function performance error", **error_data)
            raise


def with_performance_logging(slow_threshold_ms: float = 1000.0):
    """Decorator for performance logging"""
    def decorator(func: Callable) -> Callable:
        performance_decorator = PerformanceLoggingDecorator(slow_threshold_ms=slow_threshold_ms)
        return performance_decorator(func)
    return decorator


class AuditLoggingDecorator:
    """Decorator for audit logging of sensitive operations"""
    
    def __init__(self, operation_type: str, sensitive_fields: list = None):
        self.operation_type = operation_type
        self.sensitive_fields = sensitive_fields or []
    
    def __call__(self, func: Callable) -> Callable:
        """Apply audit logging decorator to function"""
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._audit_execution(func, args, kwargs, is_async=True)
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._audit_execution(func, args, kwargs, is_async=False)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _audit_execution(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Audit function execution"""
        # Sanitize sensitive data
        sanitized_kwargs = self._sanitize_data(kwargs)
        
        audit_data = {
            "operation_type": self.operation_type,
            "function": func.__name__,
            "module": func.__module__,
            "args_count": len(args),
            "kwargs": sanitized_kwargs,
            "timestamp": time.time()
        }
        
        try:
            # Execute function
            if is_async:
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Log successful audit
            audit_data["status"] = "success"
            logger.info("Audit log - operation successful", **audit_data)
            
            return result
            
        except Exception as e:
            # Log failed audit
            audit_data.update({
                "status": "failed",
                "error": str(e),
                "error_type": type(e).__name__
            })
            logger.warning("Audit log - operation failed", **audit_data)
            raise
    
    def _sanitize_data(self, data: dict) -> dict:
        """Remove sensitive fields from data"""
        sanitized = data.copy()
        for field in self.sensitive_fields:
            if field in sanitized:
                sanitized[field] = "[REDACTED]"
        return sanitized


def with_audit_logging(operation_type: str, sensitive_fields: list = None):
    """Decorator for audit logging"""
    def decorator(func: Callable) -> Callable:
        audit_decorator = AuditLoggingDecorator(
            operation_type=operation_type,
            sensitive_fields=sensitive_fields
        )
        return audit_decorator(func)
    return decorator
