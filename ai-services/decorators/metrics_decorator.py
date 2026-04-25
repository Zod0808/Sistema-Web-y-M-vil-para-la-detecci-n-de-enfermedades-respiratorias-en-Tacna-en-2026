"""
Metrics Decorator Implementation
"""

import time
from functools import wraps
from typing import Any, Optional, Callable, Dict
import structlog

logger = structlog.get_logger()


class MetricsDecorator:
    """Decorator for collecting and logging metrics from method execution"""
    
    def __init__(
        self,
        metric_name: Optional[str] = None,
        track_execution_time: bool = True,
        track_success_rate: bool = True,
        track_call_count: bool = True,
        custom_metrics: Optional[Dict[str, Callable]] = None
    ):
        self.metric_name = metric_name
        self.track_execution_time = track_execution_time
        self.track_success_rate = track_success_rate
        self.track_call_count = track_call_count
        self.custom_metrics = custom_metrics or {}
        
        # Initialize counters
        self.call_count = 0
        self.success_count = 0
        self.failure_count = 0
        self.total_execution_time = 0.0
    
    def __call__(self, func: Callable) -> Callable:
        """Apply metrics decorator to function"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._collect_metrics(func, args, kwargs, is_async=True)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._collect_metrics(func, args, kwargs, is_async=False)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _collect_metrics(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Collect metrics from function execution"""
        start_time = time.time()
        self.call_count += 1
        
        metric_name = self.metric_name or f"{func.__module__}.{func.__name__}"
        
        try:
            # Execute function
            if is_async:
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Record success
            self.success_count += 1
            execution_time = time.time() - start_time
            self.total_execution_time += execution_time
            
            # Collect metrics
            metrics_data = self._build_metrics_data(execution_time, True, result)
            
            # Log metrics
            logger.info("Function metrics",
                       metric_name=metric_name,
                       **metrics_data)
            
            return result
            
        except Exception as e:
            # Record failure
            self.failure_count += 1
            execution_time = time.time() - start_time
            self.total_execution_time += execution_time
            
            # Collect metrics
            metrics_data = self._build_metrics_data(execution_time, False, None, str(e))
            
            # Log metrics
            logger.info("Function metrics",
                       metric_name=metric_name,
                       **metrics_data)
            
            raise
    
    def _build_metrics_data(self, execution_time: float, success: bool, result: Any = None, error: str = None) -> Dict[str, Any]:
        """Build metrics data dictionary"""
        metrics_data = {}
        
        if self.track_call_count:
            metrics_data.update({
                "call_count": self.call_count,
                "success_count": self.success_count,
                "failure_count": self.failure_count
            })
        
        if self.track_execution_time:
            metrics_data.update({
                "execution_time_ms": round(execution_time * 1000, 2),
                "total_execution_time_ms": round(self.total_execution_time * 1000, 2),
                "avg_execution_time_ms": round(
                    (self.total_execution_time * 1000) / self.call_count, 2
                ) if self.call_count > 0 else 0
            })
        
        if self.track_success_rate:
            success_rate = (self.success_count / self.call_count * 100) if self.call_count > 0 else 0
            metrics_data["success_rate_percent"] = round(success_rate, 2)
        
        # Add custom metrics
        for metric_name, metric_func in self.custom_metrics.items():
            try:
                if success:
                    metrics_data[metric_name] = metric_func(result)
                else:
                    metrics_data[metric_name] = metric_func(None, error)
            except Exception as e:
                logger.warning("Custom metric calculation failed",
                              metric_name=metric_name,
                              error=str(e))
        
        return metrics_data
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get current metrics summary"""
        return {
            "call_count": self.call_count,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate_percent": round(
                (self.success_count / self.call_count * 100) if self.call_count > 0 else 0, 2
            ),
            "avg_execution_time_ms": round(
                (self.total_execution_time * 1000) / self.call_count, 2
            ) if self.call_count > 0 else 0,
            "total_execution_time_ms": round(self.total_execution_time * 1000, 2)
        }


def with_metrics(
    metric_name: Optional[str] = None,
    track_execution_time: bool = True,
    track_success_rate: bool = True,
    track_call_count: bool = True,
    custom_metrics: Optional[Dict[str, Callable]] = None
):
    """Decorator function for adding metrics collection to methods"""
    def decorator(func: Callable) -> Callable:
        metrics_decorator = MetricsDecorator(
            metric_name=metric_name,
            track_execution_time=track_execution_time,
            track_success_rate=track_success_rate,
            track_call_count=track_call_count,
            custom_metrics=custom_metrics
        )
        return metrics_decorator(func)
    return decorator


# Helper function for test compatibility
def metrics_decorator(metrics_collector=None, metric_name: Optional[str] = None,
                     track_execution_time: bool = True, track_success_rate: bool = True,
                     track_call_count: bool = True, custom_metrics: Optional[Dict[str, Callable]] = None):
    """
    Decorator function for adding metrics collection to methods (test compatibility helper)
    
    Args:
        metrics_collector: Optional metrics collector instance (for test compatibility)
        metric_name: Optional metric name
        track_execution_time: Whether to track execution time (default: True)
        track_success_rate: Whether to track success rate (default: True)
        track_call_count: Whether to track call count (default: True)
        custom_metrics: Optional custom metrics dictionary
    """
    def decorator(func: Callable) -> Callable:
        decorator_instance = MetricsDecorator(
            metric_name=metric_name,
            track_execution_time=track_execution_time,
            track_success_rate=track_success_rate,
            track_call_count=track_call_count,
            custom_metrics=custom_metrics
        )
        # Store metrics_collector if provided (for test compatibility)
        if metrics_collector:
            decorator_instance.metrics_collector = metrics_collector
        return decorator_instance(func)
    return decorator


class PerformanceMetricsDecorator:
    """Specialized decorator for performance metrics"""
    
    def __init__(self, slow_threshold_ms: float = 1000.0):
        self.slow_threshold_ms = slow_threshold_ms
        self.slow_call_count = 0
        self.total_calls = 0
        self.total_time = 0.0
    
    def __call__(self, func: Callable) -> Callable:
        """Apply performance metrics decorator to function"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._collect_performance_metrics(func, args, kwargs, is_async=True)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._collect_performance_metrics(func, args, kwargs, is_async=False)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _collect_performance_metrics(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Collect performance metrics from function execution"""
        start_time = time.time()
        
        try:
            # Execute function
            if is_async:
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            execution_time = time.time() - start_time
            execution_time_ms = execution_time * 1000
            
            # Update counters
            self.total_calls += 1
            self.total_time += execution_time
            
            if execution_time_ms > self.slow_threshold_ms:
                self.slow_call_count += 1
                logger.warning("Slow function execution detected",
                              function=func.__name__,
                              execution_time_ms=round(execution_time_ms, 2),
                              threshold_ms=self.slow_threshold_ms)
            
            # Log performance metrics
            logger.info("Performance metrics",
                       function=func.__name__,
                       execution_time_ms=round(execution_time_ms, 2),
                       is_slow=execution_time_ms > self.slow_threshold_ms,
                       avg_execution_time_ms=round((self.total_time * 1000) / self.total_calls, 2),
                       slow_call_percentage=round((self.slow_call_count / self.total_calls) * 100, 2) if self.total_calls > 0 else 0)
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            execution_time_ms = execution_time * 1000
            
            logger.error("Function performance error",
                        function=func.__name__,
                        execution_time_ms=round(execution_time_ms, 2),
                        error=str(e))
            
            raise


def with_performance_metrics(slow_threshold_ms: float = 1000.0):
    """Decorator for performance metrics"""
    def decorator(func: Callable) -> Callable:
        performance_decorator = PerformanceMetricsDecorator(slow_threshold_ms=slow_threshold_ms)
        return performance_decorator(func)
    return decorator


class BusinessMetricsDecorator:
    """Decorator for business-specific metrics"""
    
    def __init__(self, business_metric_name: str, metric_extractor: Callable):
        self.business_metric_name = business_metric_name
        self.metric_extractor = metric_extractor
        self.metric_values = []
    
    def __call__(self, func: Callable) -> Callable:
        """Apply business metrics decorator to function"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._collect_business_metrics(func, args, kwargs, is_async=True)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._collect_business_metrics(func, args, kwargs, is_async=False)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _collect_business_metrics(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Collect business metrics from function execution"""
        try:
            # Execute function
            if is_async:
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # Extract business metric
            try:
                metric_value = self.metric_extractor(result)
                self.metric_values.append(metric_value)
                
                # Log business metric
                logger.info("Business metric collected",
                           metric_name=self.business_metric_name,
                           value=metric_value,
                           function=func.__name__,
                           total_samples=len(self.metric_values))
                
            except Exception as e:
                logger.warning("Business metric extraction failed",
                              metric_name=self.business_metric_name,
                              function=func.__name__,
                              error=str(e))
            
            return result
            
        except Exception as e:
            logger.error("Function execution failed",
                        function=func.__name__,
                        error=str(e))
            raise
    
    def get_business_metrics_summary(self) -> Dict[str, Any]:
        """Get business metrics summary"""
        if not self.metric_values:
            return {"metric_name": self.business_metric_name, "samples": 0}
        
        return {
            "metric_name": self.business_metric_name,
            "samples": len(self.metric_values),
            "min": min(self.metric_values),
            "max": max(self.metric_values),
            "avg": sum(self.metric_values) / len(self.metric_values),
            "latest": self.metric_values[-1]
        }


def with_business_metrics(business_metric_name: str, metric_extractor: Callable):
    """Decorator for business metrics"""
    def decorator(func: Callable) -> Callable:
        business_decorator = BusinessMetricsDecorator(business_metric_name, metric_extractor)
        return business_decorator(func)
    return decorator
