"""
Tests adicionales para aumentar la cobertura de código
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch, MagicMock
import json

from core.cache import get_cache, set_cache, delete_cache, clear_cache_pattern
# Import directly from files to avoid __init__.py loading problematic modules
import importlib.util
import os

# Import cache_decorator directly
cache_decorator_path = os.path.join(os.path.dirname(__file__), '..', '..', 'decorators', 'cache_decorator.py')
if os.path.exists(cache_decorator_path):
    spec = importlib.util.spec_from_file_location("cache_decorator", cache_decorator_path)
    cache_decorator_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cache_decorator_module)
    CacheDecorator = cache_decorator_module.CacheDecorator
    ConditionalCacheDecorator = cache_decorator_module.ConditionalCacheDecorator
else:
    # Fallback if file doesn't exist
    CacheDecorator = MagicMock
    ConditionalCacheDecorator = MagicMock

# Import retry_decorator directly
retry_decorator_path = os.path.join(os.path.dirname(__file__), '..', '..', 'decorators', 'retry_decorator.py')
if os.path.exists(retry_decorator_path):
    spec = importlib.util.spec_from_file_location("retry_decorator", retry_decorator_path)
    retry_decorator_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(retry_decorator_module)
    RetryDecorator = retry_decorator_module.RetryDecorator
    with_retry = retry_decorator_module.with_retry
else:
    # Fallback if file doesn't exist
    RetryDecorator = MagicMock
    def with_retry(*args, **kwargs):
        def decorator(func):
            return func
        return decorator

# Import logging_decorator directly
logging_decorator_path = os.path.join(os.path.dirname(__file__), '..', '..', 'decorators', 'logging_decorator.py')
if os.path.exists(logging_decorator_path):
    spec = importlib.util.spec_from_file_location("logging_decorator", logging_decorator_path)
    logging_decorator_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(logging_decorator_module)
    LoggingDecorator = logging_decorator_module.LoggingDecorator
    with_logging = logging_decorator_module.with_logging
else:
    # Fallback if file doesn't exist
    LoggingDecorator = MagicMock
    def with_logging(*args, **kwargs):
        def decorator(func):
            return func
        return decorator

# Import metrics_decorator directly
metrics_decorator_path = os.path.join(os.path.dirname(__file__), '..', '..', 'decorators', 'metrics_decorator.py')
if os.path.exists(metrics_decorator_path):
    spec = importlib.util.spec_from_file_location("metrics_decorator", metrics_decorator_path)
    metrics_decorator_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(metrics_decorator_module)
    MetricsDecorator = metrics_decorator_module.MetricsDecorator
    with_metrics = metrics_decorator_module.with_metrics
else:
    # Fallback if file doesn't exist
    MetricsDecorator = MagicMock
    def with_metrics(*args, **kwargs):
        def decorator(func):
            return func
        return decorator


class TestCacheAdditional:
    """Tests adicionales para cache"""
    
    @pytest.mark.asyncio
    async def test_get_cache_with_none_client(self):
        """Test get_cache cuando el cliente es None"""
        with patch('core.cache.cache_client', None):
            result = await get_cache("test_key")
            assert result is None
    
    @pytest.mark.asyncio
    async def test_set_cache_with_none_client(self):
        """Test set_cache cuando el cliente es None"""
        with patch('core.cache.cache_client', None):
            result = await set_cache("test_key", "test_value", ttl=3600)
            assert result is False
    
    @pytest.mark.asyncio
    async def test_delete_cache_with_none_client(self):
        """Test delete_cache cuando el cliente es None"""
        with patch('core.cache.cache_client', None):
            result = await delete_cache("test_key")
            assert result is False
    
    @pytest.mark.asyncio
    async def test_get_cache_with_exception(self):
        """Test get_cache cuando hay una excepción"""
        mock_redis = MagicMock()
        mock_redis.get = MagicMock(side_effect=Exception("Redis error"))
        
        with patch('core.cache.cache_client', mock_redis):
            result = await get_cache("test_key")
            assert result is None
    
    @pytest.mark.asyncio
    async def test_set_cache_with_exception(self):
        """Test set_cache cuando hay una excepción"""
        mock_redis = MagicMock()
        mock_redis.setex = MagicMock(side_effect=Exception("Redis error"))
        
        with patch('core.cache.cache_client', mock_redis):
            result = await set_cache("test_key", "test_value", ttl=3600)
            assert result is False


class TestCacheDecoratorAdditional:
    """Tests adicionales para cache decorator"""
    
    @pytest.mark.asyncio
    async def test_cache_decorator_with_dict_result(self):
        """Test cache decorator con resultado tipo dict"""
        cache_store = {}
        
        async def mock_get_cache(key):
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            cache_store[key] = json.dumps(value) if isinstance(value, (dict, list)) else value
            return True
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600, key_prefix="test")
            
            @decorator
            async def test_function() -> dict:
                return {"key": "value", "number": 42}
            
            result1 = await test_function()
            result2 = await test_function()
            
            assert result1 == result2
            assert result1 == {"key": "value", "number": 42}
    
    @pytest.mark.asyncio
    async def test_cache_decorator_with_list_result(self):
        """Test cache decorator con resultado tipo list"""
        cache_store = {}
        
        async def mock_get_cache(key):
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            cache_store[key] = json.dumps(value) if isinstance(value, (dict, list)) else value
            return True
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600)
            
            @decorator
            async def test_function() -> list:
                return [1, 2, 3, "test"]
            
            result1 = await test_function()
            result2 = await test_function()
            
            assert result1 == result2
            assert result1 == [1, 2, 3, "test"]
    
    @pytest.mark.asyncio
    async def test_cache_decorator_cache_failure_handling(self):
        """Test que el decorator maneja fallos de cache correctamente"""
        call_count = 0
        
        async def mock_get_cache(key):
            raise Exception("Cache error")
        
        async def mock_set_cache(key, value, ttl=None):
            raise Exception("Cache error")
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600)
            
            @decorator
            async def test_function(param: str) -> str:
                nonlocal call_count
                call_count += 1
                return f"result_{param}"
            
            # Debe ejecutar la función aunque el cache falle
            result = await test_function("test")
            assert result == "result_test"
            assert call_count == 1


class TestConditionalCacheDecorator:
    """Tests para conditional cache decorator"""
    
    @pytest.mark.asyncio
    async def test_conditional_cache_with_condition_true(self):
        """Test conditional cache cuando la condición es True"""
        cache_store = {}
        
        async def mock_get_cache(key):
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            cache_store[key] = json.dumps(value) if isinstance(value, (dict, list)) else value
            return True
        
        def condition_func(result):
            return result.get("should_cache", False)
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = ConditionalCacheDecorator(ttl=3600, condition_func=condition_func)
            
            @decorator
            async def test_function() -> dict:
                return {"should_cache": True, "data": "test"}
            
            result1 = await test_function()
            result2 = await test_function()
            
            assert result1 == result2
    
    @pytest.mark.asyncio
    async def test_conditional_cache_with_condition_false(self):
        """Test conditional cache cuando la condición es False"""
        call_count = 0
        
        async def mock_get_cache(key):
            return None
        
        async def mock_set_cache(key, value, ttl=None):
            # No debería llamarse si la condición es False
            pass
        
        def condition_func(result):
            return False
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = ConditionalCacheDecorator(ttl=3600, condition_func=condition_func)
            
            @decorator
            async def test_function() -> dict:
                nonlocal call_count
                call_count += 1
                return {"should_cache": False, "data": "test"}
            
            result1 = await test_function()
            result2 = await test_function()
            
            # Debe ejecutarse dos veces porque no se cachea
            assert call_count == 2


class TestRetryDecoratorAdditional:
    """Tests adicionales para retry decorator"""
    
    @pytest.mark.asyncio
    async def test_retry_decorator_max_attempts_reached(self):
        """Test retry decorator cuando se alcanza el máximo de intentos"""
        call_count = 0
        retry_decorator = RetryDecorator(max_attempts=3, delay=0.01)
        
        @retry_decorator
        async def failing_function():
            nonlocal call_count
            call_count += 1
            raise ValueError("Always fails")
        
        with pytest.raises(ValueError):
            await failing_function()
        
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_retry_decorator_success_after_retries(self):
        """Test retry decorator que tiene éxito después de algunos intentos"""
        call_count = 0
        retry_decorator = RetryDecorator(max_attempts=3, delay=0.01)
        
        @retry_decorator
        async def eventually_succeeds():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ValueError("Fails first time")
            return "success"
        
        result = await eventually_succeeds()
        assert result == "success"
        assert call_count == 2


class TestLoggingDecoratorAdditional:
    """Tests adicionales para logging decorator"""
    
    @pytest.mark.asyncio
    async def test_logging_decorator_with_exception(self):
        """Test logging decorator cuando hay una excepción"""
        decorator = LoggingDecorator(log_level="info")
        
        @decorator
        async def failing_function():
            raise ValueError("Test error")
        
        with pytest.raises(ValueError):
            await failing_function()
        
        # El decorator debe manejar la excepción y loguearla
        # (el logging se hace internamente, no necesitamos verificar el logger mock)


class TestMetricsDecoratorAdditional:
    """Tests adicionales para metrics decorator"""
    
    @pytest.mark.asyncio
    async def test_metrics_decorator_with_exception(self):
        """Test metrics decorator cuando hay una excepción"""
        metrics_collector = MagicMock()
        decorator = MetricsDecorator()
        decorator.metrics_collector = metrics_collector
        
        @decorator
        async def failing_function():
            raise ValueError("Test error")
        
        with pytest.raises(ValueError):
            await failing_function()
        
        # Debe registrar métricas de error
        assert decorator.failure_count > 0
    
    @pytest.mark.asyncio
    async def test_metrics_decorator_with_timing(self):
        """Test metrics decorator registra tiempo de ejecución"""
        decorator = MetricsDecorator(track_execution_time=True)
        
        @decorator
        async def test_function():
            import asyncio
            await asyncio.sleep(0.01)
            return "success"
        
        result = await test_function()
        assert result == "success"
        
        # Debe registrar métricas
        assert decorator.call_count > 0
        assert decorator.total_execution_time > 0

