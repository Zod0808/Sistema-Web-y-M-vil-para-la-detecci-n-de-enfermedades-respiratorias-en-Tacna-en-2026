"""
Tests extendidos para decorators para aumentar cobertura
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

# Import directly to avoid loading problematic modules
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from decorators.cache_decorator import CacheDecorator, ConditionalCacheDecorator, with_cache
from decorators.retry_decorator import RetryDecorator, with_retry
from decorators.logging_decorator import LoggingDecorator, with_logging
from decorators.metrics_decorator import MetricsDecorator, with_metrics


class TestCacheDecoratorExtended:
    """Tests extendidos para cache decorator"""
    
    @pytest.mark.asyncio
    async def test_cache_decorator_key_generation(self):
        """Test generación de cache key"""
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
            async def test_function(param1: str, param2: int) -> str:
                return f"{param1}_{param2}"
            
            # Mismos parámetros deben generar misma key
            await test_function("a", 1)
            await test_function("a", 1)
            
            # Diferentes parámetros deben generar diferentes keys
            await test_function("b", 2)
            
            # Verificar que hay 2 keys en el cache (una para cada combinación única)
            assert len(cache_store) == 2
    
    @pytest.mark.asyncio
    async def test_with_cache_function(self):
        """Test función helper with_cache"""
        cache_store = {}
        
        async def mock_get_cache(key):
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            cache_store[key] = json.dumps(value) if isinstance(value, (dict, list)) else value
            return True
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            @with_cache(ttl=3600, key_prefix="test")
            async def test_function(value: str) -> str:
                return f"result_{value}"
            
            result1 = await test_function("test")
            result2 = await test_function("test")
            
            assert result1 == result2
            assert result1 == "result_test"


class TestRetryDecoratorExtended:
    """Tests extendidos para retry decorator"""
    
    @pytest.mark.asyncio
    async def test_retry_decorator_with_backoff(self):
        """Test retry decorator con exponential backoff"""
        call_count = 0
        call_times = []
        
        decorator = RetryDecorator(
            max_attempts=3,
            delay=0.01,
            backoff_multiplier=2.0
        )
        
        @decorator
        async def failing_function():
            nonlocal call_count, call_times
            call_count += 1
            call_times.append(asyncio.get_event_loop().time())
            if call_count < 3:
                raise ValueError("Fails")
            return "success"
        
        result = await failing_function()
        
        assert result == "success"
        assert call_count == 3
        # Verificar que hay delays entre llamadas
        if len(call_times) >= 2:
            assert call_times[1] - call_times[0] >= 0.01
    
    @pytest.mark.asyncio
    async def test_retry_decorator_with_jitter(self):
        """Test retry decorator con jitter"""
        decorator = RetryDecorator(
            max_attempts=2,
            delay=0.01,
            jitter=True
        )
        
        @decorator
        async def test_function():
            return "success"
        
        result = await test_function()
        assert result == "success"
    
    @pytest.mark.asyncio
    async def test_with_retry_function(self):
        """Test función helper with_retry"""
        call_count = 0
        
        @with_retry(max_attempts=3, delay=0.01)
        async def eventually_succeeds():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ValueError("Fails")
            return "success"
        
        result = await eventually_succeeds()
        assert result == "success"
        assert call_count == 2


class TestLoggingDecoratorExtended:
    """Tests extendidos para logging decorator"""
    
    @pytest.mark.asyncio
    async def test_logging_decorator_with_args(self):
        """Test logging decorator con log_args=True"""
        decorator = LoggingDecorator(log_args=True, log_result=False)
        
        @decorator
        async def test_function(param1: str, param2: int) -> str:
            return f"{param1}_{param2}"
        
        result = await test_function("test", 123)
        assert result == "test_123"
    
    @pytest.mark.asyncio
    async def test_logging_decorator_with_result(self):
        """Test logging decorator con log_result=True"""
        decorator = LoggingDecorator(log_args=False, log_result=True)
        
        @decorator
        async def test_function() -> str:
            return "result"
        
        result = await test_function()
        assert result == "result"
    
    @pytest.mark.asyncio
    async def test_logging_decorator_with_execution_time(self):
        """Test logging decorator con log_execution_time=True"""
        decorator = LoggingDecorator(log_execution_time=True)
        
        @decorator
        async def test_function():
            await asyncio.sleep(0.01)
            return "result"
        
        result = await test_function()
        assert result == "result"
    
    @pytest.mark.asyncio
    async def test_with_logging_function(self):
        """Test función helper with_logging"""
        @with_logging(log_level="info", log_args=True)
        async def test_function(param: str) -> str:
            return f"result_{param}"
        
        result = await test_function("test")
        assert result == "result_test"


class TestMetricsDecoratorExtended:
    """Tests extendidos para metrics decorator"""
    
    @pytest.mark.asyncio
    async def test_metrics_decorator_track_call_count(self):
        """Test metrics decorator tracking call count"""
        decorator = MetricsDecorator(track_call_count=True)
        
        @decorator
        async def test_function():
            return "success"
        
        await test_function()
        await test_function()
        
        assert decorator.call_count == 2
    
    @pytest.mark.asyncio
    async def test_metrics_decorator_track_success_rate(self):
        """Test metrics decorator tracking success rate"""
        decorator = MetricsDecorator(track_success_rate=True)
        
        @decorator
        async def test_function():
            return "success"
        
        await test_function()
        
        assert decorator.success_count == 1
        assert decorator.failure_count == 0
    
    @pytest.mark.asyncio
    async def test_metrics_decorator_track_execution_time(self):
        """Test metrics decorator tracking execution time"""
        decorator = MetricsDecorator(track_execution_time=True)
        
        @decorator
        async def test_function():
            await asyncio.sleep(0.01)
            return "success"
        
        await test_function()
        
        assert decorator.total_execution_time > 0
    
    @pytest.mark.asyncio
    async def test_with_metrics_function(self):
        """Test función helper with_metrics"""
        @with_metrics(metric_name="test_metric", track_call_count=True)
        async def test_function():
            return "success"
        
        result = await test_function()
        assert result == "success"

