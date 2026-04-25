"""
Unit tests for Decorator Pattern implementation
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch
import time
from datetime import datetime, timedelta

from decorators.cache_decorator import cache_decorator, CacheDecorator
from decorators.logging_decorator import logging_decorator
from decorators.retry_decorator import retry_decorator, RetryConfig
from decorators.circuit_breaker_decorator import circuit_breaker_decorator
from decorators.metrics_decorator import metrics_decorator
from dataclasses import dataclass

# Helper class for test compatibility
@dataclass
class CacheConfig:
    """Test helper class for cache configuration"""
    ttl: int = 3600
    key_prefix: str = ""
    enabled: bool = True


class TestCacheDecorator:
    """Test cache decorator implementation"""
    
    @pytest.fixture
    def mock_cache(self):
        """Create mock cache"""
        mock = AsyncMock()
        mock.get.return_value = None
        mock.set.return_value = True
        return mock
    
    @pytest.fixture
    def cache_config(self):
        """Create cache configuration"""
        return CacheConfig(
            ttl=3600,
            key_prefix="test",
            enabled=True
        )
    
    @pytest.mark.asyncio
    async def test_cache_decorator_success(self, cache_config):
        """Test successful caching"""
        call_count = 0
        cache_store = {}
        
        async def mock_get_cache(key):
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            cache_store[key] = json.dumps(value) if isinstance(value, (dict, list)) else value
            return True
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            @cache_decorator(ttl=cache_config.ttl, key_prefix=cache_config.key_prefix)
            async def test_function(param1: str, param2: int) -> dict:
                nonlocal call_count
                call_count += 1
                return {"result": f"{param1}_{param2}", "count": call_count}
            
            # First call - cache miss
            result1 = await test_function("test", 123)
            
            # Second call - cache hit
            result2 = await test_function("test", 123)
            
            assert result1 == result2
            assert call_count == 1  # Function should only be called once
            assert "result" in result1
            assert result1["result"] == "test_123"
    
    @pytest.mark.asyncio
    async def test_cache_decorator_different_params(self, cache_config):
        """Test cache with different parameters"""
        call_count = 0
        cache_store = {}
        
        async def mock_get_cache(key):
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            cache_store[key] = json.dumps(value) if isinstance(value, (dict, list)) else value
            return True
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            @cache_decorator(ttl=cache_config.ttl, key_prefix=cache_config.key_prefix)
            async def test_function(param1: str, param2: int) -> dict:
                nonlocal call_count
                call_count += 1
                return {"result": f"{param1}_{param2}", "count": call_count}
            
            # Different parameters should result in separate cache entries
            result1 = await test_function("test1", 123)
            result2 = await test_function("test2", 123)
            
            assert result1 != result2
            assert call_count == 2  # Function should be called twice
    
    @pytest.mark.asyncio
    async def test_cache_decorator_disabled(self):
        """Test cache decorator when disabled (no caching)"""
        call_count = 0
        
        # When cache fails, function should still execute
        async def mock_get_cache(key):
            return None
        
        async def mock_set_cache(key, value, ttl=None):
            raise Exception("Cache disabled")
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            @cache_decorator(ttl=3600)
            async def test_function(param: str) -> str:
                nonlocal call_count
                call_count += 1
                return f"result_{param}"
            
            # Multiple calls should all execute function when cache fails
            await test_function("test")
            await test_function("test")
            
            assert call_count == 2
    
    @pytest.mark.asyncio
    async def test_cache_decorator_ttl_expiry(self, cache_config):
        """Test cache TTL expiry"""
        call_count = 0
        cache_store = {}
        cache_times = {}
        
        async def mock_get_cache(key):
            # Simulate TTL expiry
            if key in cache_store:
                if time.time() - cache_times.get(key, 0) > 0.1:
                    del cache_store[key]
                    del cache_times[key]
                    return None
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            cache_store[key] = json.dumps(value) if isinstance(value, (dict, list)) else value
            cache_times[key] = time.time()
            return True
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            @cache_decorator(ttl=0.1, key_prefix=cache_config.key_prefix)
            async def test_function(param: str) -> str:
                nonlocal call_count
                call_count += 1
                return f"result_{param}"
            
            # First call
            result1 = await test_function("test")
            
            # Wait for TTL to expire
            await asyncio.sleep(0.2)
            
            # Second call should execute function again
            result2 = await test_function("test")
            
            assert result1 == result2
            assert call_count == 2  # Function should be called twice after TTL expiry
    
    @pytest.mark.asyncio
    async def test_cache_decorator_error_handling(self, cache_config):
        """Test cache decorator error handling"""
        async def mock_get_cache(key):
            return None
        
        async def mock_set_cache(key, value, ttl=None):
            return True
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            @cache_decorator(ttl=cache_config.ttl, key_prefix=cache_config.key_prefix)
            async def failing_function() -> str:
                raise ValueError("Test error")
            
            # Function should raise error and not cache it
            with pytest.raises(ValueError):
                await failing_function()


class TestLoggingDecorator:
    """Test logging decorator implementation"""
    
    @pytest.mark.asyncio
    async def test_logging_decorator_success(self):
        """Test successful logging"""
        logger = MagicMock()
        
        @logging_decorator(logger)
        async def test_function(param1: str, param2: int) -> dict:
            return {"result": f"{param1}_{param2}"}
        
        result = await test_function("test", 123)
        
        assert result["result"] == "test_123"
        
        # Verify logging calls
        assert logger.info.call_count >= 2  # Start and end logs
        logger.info.assert_any_call("Function test_function started", extra={"param1": "test", "param2": 123})
        logger.info.assert_any_call("Function test_function completed", extra={"result": result, "duration_ms": 0})
    
    @pytest.mark.asyncio
    async def test_logging_decorator_with_error(self):
        """Test logging with error"""
        logger = MagicMock()
        
        @logging_decorator(logger)
        async def failing_function(param: str) -> str:
            raise ValueError("Test error")
        
        with pytest.raises(ValueError):
            await failing_function("test")
        
        # Verify error logging
        logger.error.assert_called_once()
        error_call = logger.error.call_args
        assert "Test error" in str(error_call)
    
    @pytest.mark.asyncio
    async def test_logging_decorator_performance_tracking(self):
        """Test performance tracking in logging"""
        logger = MagicMock()
        
        @logging_decorator(logger)
        async def slow_function() -> str:
            await asyncio.sleep(0.1)
            return "slow_result"
        
        result = await slow_function()
        
        assert result == "slow_result"
        
        # Verify performance logging
        logger.info.assert_any_call("Function slow_function completed", extra={"result": result, "duration_ms": 100})
    
    @pytest.mark.asyncio
    async def test_logging_decorator_with_complex_params(self):
        """Test logging with complex parameters"""
        logger = MagicMock()
        
        @logging_decorator(logger)
        async def complex_function(data: dict, items: list) -> dict:
            return {"processed": True, "count": len(items)}
        
        complex_data = {"key": "value", "nested": {"inner": "data"}}
        items = [1, 2, 3, 4, 5]
        
        result = await complex_function(complex_data, items)
        
        assert result["processed"] is True
        assert result["count"] == 5
        
        # Verify complex parameters were logged
        logger.info.assert_any_call("Function complex_function started", extra={"data": complex_data, "items": items})


class TestRetryDecorator:
    """Test retry decorator implementation"""
    
    @pytest.fixture
    def retry_config(self):
        """Create retry configuration"""
        return RetryConfig(
            max_attempts=3,
            delay=0.1,
            backoff_factor=2.0,
            exceptions=(ValueError, ConnectionError)
        )
    
    @pytest.mark.asyncio
    async def test_retry_decorator_success_first_try(self, retry_config):
        """Test successful function on first try"""
        call_count = 0
        
        @retry_decorator(retry_config)
        async def test_function(param: str) -> str:
            nonlocal call_count
            call_count += 1
            return f"success_{param}"
        
        result = await test_function("test")
        
        assert result == "success_test"
        assert call_count == 1
    
    @pytest.mark.asyncio
    async def test_retry_decorator_success_after_retries(self, retry_config):
        """Test successful function after retries"""
        call_count = 0
        
        @retry_decorator(retry_config)
        async def test_function(param: str) -> str:
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Temporary error")
            return f"success_{param}"
        
        result = await test_function("test")
        
        assert result == "success_test"
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_retry_decorator_max_attempts_exceeded(self, retry_config):
        """Test retry decorator when max attempts exceeded"""
        call_count = 0
        
        @retry_decorator(retry_config)
        async def failing_function(param: str) -> str:
            nonlocal call_count
            call_count += 1
            raise ValueError("Persistent error")
        
        with pytest.raises(ValueError):
            await failing_function("test")
        
        assert call_count == 3  # Should attempt 3 times
    
    @pytest.mark.asyncio
    async def test_retry_decorator_exponential_backoff(self, retry_config):
        """Test exponential backoff in retry decorator"""
        retry_config.delay = 0.05  # Short delay for testing
        retry_config.backoff_factor = 2.0
        
        call_count = 0
        call_times = []
        
        @retry_decorator(retry_config)
        async def test_function(param: str) -> str:
            nonlocal call_count
            call_count += 1
            call_times.append(time.time())
            if call_count < 3:
                raise ValueError("Temporary error")
            return f"success_{param}"
        
        start_time = time.time()
        result = await test_function("test")
        
        assert result == "success_test"
        assert call_count == 3
        
        # Verify exponential backoff timing
        if len(call_times) >= 3:
            delay1 = call_times[1] - call_times[0]
            delay2 = call_times[2] - call_times[1]
            
            # Second delay should be approximately double the first
            assert delay2 > delay1
    
    @pytest.mark.asyncio
    async def test_retry_decorator_unsupported_exception(self, retry_config):
        """Test retry decorator with unsupported exception"""
        @retry_decorator(retry_config)
        async def test_function(param: str) -> str:
            raise TypeError("Unsupported exception")
        
        with pytest.raises(TypeError):
            await test_function("test")
    
    @pytest.mark.asyncio
    async def test_retry_decorator_disabled(self):
        """Test retry decorator when disabled"""
        retry_config = RetryConfig(enabled=False)
        call_count = 0
        
        @retry_decorator(retry_config)
        async def failing_function(param: str) -> str:
            nonlocal call_count
            call_count += 1
            raise ValueError("Error")
        
        with pytest.raises(ValueError):
            await failing_function("test")
        
        assert call_count == 1  # Should only attempt once when disabled


class TestCircuitBreakerDecorator:
    """Test circuit breaker decorator implementation"""
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_decorator_success(self):
        """Test circuit breaker decorator with successful calls"""
        call_count = 0
        
        @circuit_breaker_decorator(failure_threshold=3, recovery_timeout=60)
        async def test_function(param: str) -> str:
            nonlocal call_count
            call_count += 1
            return f"success_{param}"
        
        result = await test_function("test")
        
        assert result == "success_test"
        assert call_count == 1
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_decorator_opens_circuit(self):
        """Test circuit breaker opens after threshold"""
        call_count = 0
        
        @circuit_breaker_decorator(failure_threshold=2, recovery_timeout=0.1)
        async def failing_function(param: str) -> str:
            nonlocal call_count
            call_count += 1
            raise ValueError("Test error")
        
        # Trigger failures up to threshold
        for i in range(2):
            with pytest.raises(ValueError):
                await failing_function("test")
        
        assert call_count == 2
        
        # Next call should be blocked by open circuit
        with pytest.raises(Exception) as exc_info:
            await failing_function("test")
        
        assert "Circuit breaker is open" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_decorator_recovery(self):
        """Test circuit breaker recovery"""
        call_count = 0
        
        @circuit_breaker_decorator(failure_threshold=2, recovery_timeout=0.1)
        async def test_function(param: str) -> str:
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise ValueError("Temporary error")
            return f"success_{param}"
        
        # Trigger circuit opening
        for i in range(2):
            with pytest.raises(ValueError):
                await test_function("test")
        
        # Wait for recovery
        await asyncio.sleep(0.2)
        
        # Next call should succeed and close circuit
        result = await test_function("test")
        
        assert result == "success_test"
        assert call_count == 3


class TestMetricsDecorator:
    """Test metrics decorator implementation"""
    
    @pytest.mark.asyncio
    async def test_metrics_decorator_success(self):
        """Test metrics decorator with successful execution"""
        metrics_collector = MagicMock()
        
        @metrics_decorator(metrics_collector)
        async def test_function(param: str) -> str:
            await asyncio.sleep(0.01)  # Simulate some work
            return f"result_{param}"
        
        result = await test_function("test")
        
        assert result == "result_test"
        
        # Verify metrics were collected
        metrics_collector.increment_counter.assert_called_with("function_calls", {"function": "test_function"})
        metrics_collector.record_timing.assert_called_with("function_duration", 10, {"function": "test_function"})
    
    @pytest.mark.asyncio
    async def test_metrics_decorator_with_error(self):
        """Test metrics decorator with error"""
        metrics_collector = MagicMock()
        
        @metrics_decorator(metrics_collector)
        async def failing_function(param: str) -> str:
            raise ValueError("Test error")
        
        with pytest.raises(ValueError):
            await failing_function("test")
        
        # Verify error metrics were collected
        metrics_collector.increment_counter.assert_called_with("function_calls", {"function": "failing_function"})
        metrics_collector.increment_counter.assert_called_with("function_errors", {"function": "failing_function", "error_type": "ValueError"})
    
    @pytest.mark.asyncio
    async def test_metrics_decorator_custom_metrics(self):
        """Test metrics decorator with custom metrics"""
        metrics_collector = MagicMock()
        
        @metrics_decorator(metrics_collector, custom_tags={"service": "test_service"})
        async def test_function(param: str) -> str:
            return f"result_{param}"
        
        result = await test_function("test")
        
        assert result == "result_test"
        
        # Verify custom tags were included
        metrics_collector.increment_counter.assert_called_with("function_calls", {"function": "test_function", "service": "test_service"})


class TestDecoratorIntegration:
    """Test decorator pattern integration"""
    
    @pytest.mark.asyncio
    async def test_multiple_decorators_combined(self):
        """Test combining multiple decorators"""
        logger = MagicMock()
        metrics_collector = MagicMock()
        cache_store = {}
        
        async def mock_get_cache(key):
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            cache_store[key] = json.dumps(value) if isinstance(value, (dict, list)) else value
            return True
        
        cache_config = CacheConfig(enabled=True, ttl=3600, key_prefix="test")
        retry_config = RetryConfig(max_attempts=2, delay=0.01)
        
        call_count = 0
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            @cache_decorator(ttl=cache_config.ttl, key_prefix=cache_config.key_prefix)
            @logging_decorator(logger)
            @retry_decorator(retry_config)
            @metrics_decorator(metrics_collector)
            async def complex_function(param: str) -> dict:
                nonlocal call_count
                call_count += 1
                if call_count == 1:
                    raise ValueError("Temporary error")
                return {"result": f"success_{param}", "count": call_count}
            
            result = await complex_function("test")
            
            assert result["result"] == "success_test"
            assert call_count == 2  # Should retry once
            
            # Verify all decorators worked
            logger.info.assert_called()
            metrics_collector.increment_counter.assert_called()
    
    @pytest.mark.asyncio
    async def test_decorator_error_propagation(self):
        """Test error propagation through decorators"""
        logger = MagicMock()
        metrics_collector = MagicMock()
        
        @logging_decorator(logger)
        @metrics_decorator(metrics_collector)
        async def failing_function(param: str) -> str:
            raise RuntimeError("Persistent error")
        
        with pytest.raises(RuntimeError):
            await failing_function("test")
        
        # Verify error was logged and metrics collected
        logger.error.assert_called()
        metrics_collector.increment_counter.assert_called_with("function_errors", {"function": "failing_function", "error_type": "RuntimeError"})
    
    @pytest.mark.asyncio
    async def test_decorator_performance_impact(self):
        """Test that decorators don't significantly impact performance"""
        logger = MagicMock()
        
        @logging_decorator(logger)
        async def fast_function() -> str:
            return "fast_result"
        
        start_time = time.time()
        result = await fast_function()
        end_time = time.time()
        
        assert result == "fast_result"
        
        # Decorator overhead should be minimal (< 10ms)
        execution_time = (end_time - start_time) * 1000
        assert execution_time < 10
