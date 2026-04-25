"""
Tests for decorators/metrics_decorator.py
"""

import pytest
import asyncio
import time
from unittest.mock import MagicMock, patch, AsyncMock

from decorators.metrics_decorator import (
    MetricsDecorator,
    with_metrics,
    PerformanceMetricsDecorator,
    with_performance_metrics,
    BusinessMetricsDecorator,
    with_business_metrics
)


class TestMetricsDecorator:
    """Tests for MetricsDecorator"""
    
    @pytest.fixture
    def metrics_decorator(self):
        """Create metrics decorator instance"""
        return MetricsDecorator(
            metric_name="test_metric",
            track_execution_time=True,
            track_success_rate=True,
            track_call_count=True
        )
    
    @pytest.mark.asyncio
    async def test_async_function_success(self, metrics_decorator):
        """Test metrics decorator with successful async function"""
        @metrics_decorator
        async def test_func(x: int, y: int) -> int:
            await asyncio.sleep(0.01)
            return x + y
        
        result = await test_func(2, 3)
        
        assert result == 5
        assert metrics_decorator.call_count == 1
        assert metrics_decorator.success_count == 1
        assert metrics_decorator.failure_count == 0
        assert metrics_decorator.total_execution_time > 0
    
    @pytest.mark.asyncio
    async def test_sync_function_success(self, metrics_decorator):
        """Test metrics decorator with successful sync function"""
        @metrics_decorator
        def test_func(x: int, y: int) -> int:
            return x + y
        
        result = test_func(2, 3)
        
        assert result == 5
        assert metrics_decorator.call_count == 1
        assert metrics_decorator.success_count == 1
    
    @pytest.mark.asyncio
    async def test_async_function_failure(self, metrics_decorator):
        """Test metrics decorator with failing async function"""
        @metrics_decorator
        async def test_func(x: int) -> int:
            raise ValueError("Test error")
        
        with pytest.raises(ValueError, match="Test error"):
            await test_func(2)
        
        assert metrics_decorator.call_count == 1
        assert metrics_decorator.success_count == 0
        assert metrics_decorator.failure_count == 1
    
    @pytest.mark.asyncio
    async def test_sync_function_failure(self, metrics_decorator):
        """Test metrics decorator with failing sync function"""
        @metrics_decorator
        def test_func(x: int) -> int:
            raise ValueError("Test error")
        
        with pytest.raises(ValueError, match="Test error"):
            test_func(2)
        
        assert metrics_decorator.failure_count == 1
    
    @pytest.mark.asyncio
    async def test_multiple_calls(self, metrics_decorator):
        """Test metrics decorator with multiple calls"""
        @metrics_decorator
        async def test_func(x: int) -> int:
            return x * 2
        
        results = await asyncio.gather(*[test_func(i) for i in range(5)])
        
        assert len(results) == 5
        assert metrics_decorator.call_count == 5
        assert metrics_decorator.success_count == 5
    
    @pytest.mark.asyncio
    async def test_custom_metric_name(self):
        """Test metrics decorator with custom metric name"""
        decorator = MetricsDecorator(metric_name="custom_metric")
        
        @decorator
        async def test_func():
            return "result"
        
        await test_func()
        
        # Verify metric name is used in logging
        assert decorator.metric_name == "custom_metric"
    
    @pytest.mark.asyncio
    async def test_track_execution_time_disabled(self):
        """Test metrics decorator with execution time tracking disabled"""
        decorator = MetricsDecorator(track_execution_time=False)
        
        @decorator
        async def test_func():
            return "result"
        
        await test_func()
        
        metrics_data = decorator._build_metrics_data(0.1, True, "result")
        assert "execution_time_ms" not in metrics_data
    
    @pytest.mark.asyncio
    async def test_track_success_rate_disabled(self):
        """Test metrics decorator with success rate tracking disabled"""
        decorator = MetricsDecorator(track_success_rate=False)
        
        @decorator
        async def test_func():
            return "result"
        
        await test_func()
        
        metrics_data = decorator._build_metrics_data(0.1, True, "result")
        assert "success_rate_percent" not in metrics_data
    
    @pytest.mark.asyncio
    async def test_track_call_count_disabled(self):
        """Test metrics decorator with call count tracking disabled"""
        decorator = MetricsDecorator(track_call_count=False)
        
        @decorator
        async def test_func():
            return "result"
        
        await test_func()
        
        metrics_data = decorator._build_metrics_data(0.1, True, "result")
        assert "call_count" not in metrics_data
    
    @pytest.mark.asyncio
    async def test_custom_metrics(self):
        """Test metrics decorator with custom metrics"""
        def extract_value(result):
            return result.get("value", 0) if isinstance(result, dict) else 0
        
        decorator = MetricsDecorator(custom_metrics={"value": extract_value})
        
        @decorator
        async def test_func():
            return {"value": 42}
        
        result = await test_func()
        
        assert result["value"] == 42
        # Custom metric should be calculated
        metrics_data = decorator._build_metrics_data(0.1, True, result)
        assert "value" in metrics_data
    
    @pytest.mark.asyncio
    async def test_custom_metrics_with_error(self):
        """Test custom metrics when extraction fails"""
        def failing_metric(result):
            raise Exception("Metric extraction error")
        
        decorator = MetricsDecorator(custom_metrics={"failing": failing_metric})
        
        @decorator
        async def test_func():
            return "result"
        
        # Should not raise error, just log warning
        await test_func()
    
    @pytest.mark.asyncio
    async def test_get_metrics_summary(self, metrics_decorator):
        """Test getting metrics summary"""
        @metrics_decorator
        async def test_func(x: int) -> int:
            return x * 2
        
        await test_func(5)
        await test_func(10)
        
        summary = metrics_decorator.get_metrics_summary()
        
        assert summary["call_count"] == 2
        assert summary["success_count"] == 2
        assert summary["failure_count"] == 0
        assert summary["success_rate_percent"] == 100.0
        assert summary["avg_execution_time_ms"] >= 0
        assert summary["total_execution_time_ms"] >= 0
    
    @pytest.mark.asyncio
    async def test_get_metrics_summary_with_failures(self, metrics_decorator):
        """Test metrics summary with failures"""
        @metrics_decorator
        async def test_func(should_fail: bool) -> int:
            if should_fail:
                raise ValueError("Error")
            return 42
        
        await test_func(False)
        await test_func(True)
        await test_func(False)
        
        summary = metrics_decorator.get_metrics_summary()
        
        assert summary["call_count"] == 3
        assert summary["success_count"] == 2
        assert summary["failure_count"] == 1
        assert summary["success_rate_percent"] == pytest.approx(66.67, abs=0.01)
    
    def test_with_metrics_decorator_function(self):
        """Test with_metrics decorator function"""
        @with_metrics(metric_name="test_metric")
        async def test_func(x: int) -> int:
            return x * 2
        
        # Should be callable
        assert asyncio.iscoroutinefunction(test_func)


class TestPerformanceMetricsDecorator:
    """Tests for PerformanceMetricsDecorator"""
    
    @pytest.fixture
    def performance_decorator(self):
        """Create performance metrics decorator"""
        return PerformanceMetricsDecorator(slow_threshold_ms=100.0)
    
    @pytest.mark.asyncio
    async def test_fast_function(self, performance_decorator):
        """Test performance decorator with fast function"""
        @performance_decorator
        async def test_func():
            await asyncio.sleep(0.01)
            return "result"
        
        result = await test_func()
        
        assert result == "result"
        assert performance_decorator.total_calls == 1
        assert performance_decorator.slow_call_count == 0
    
    @pytest.mark.asyncio
    async def test_slow_function(self, performance_decorator):
        """Test performance decorator with slow function"""
        @performance_decorator
        async def test_func():
            await asyncio.sleep(0.15)  # 150ms > 100ms threshold
            return "result"
        
        result = await test_func()
        
        assert result == "result"
        assert performance_decorator.slow_call_count == 1
    
    @pytest.mark.asyncio
    async def test_function_error(self, performance_decorator):
        """Test performance decorator with function error"""
        @performance_decorator
        async def test_func():
            raise ValueError("Error")
        
        with pytest.raises(ValueError):
            await test_func()
        
        # Should still track execution time
        assert performance_decorator.total_calls == 0  # Error before completion
    
    @pytest.mark.asyncio
    async def test_multiple_calls(self, performance_decorator):
        """Test performance decorator with multiple calls"""
        @performance_decorator
        async def test_func(x: int):
            await asyncio.sleep(0.01)
            return x * 2
        
        results = await asyncio.gather(*[test_func(i) for i in range(5)])
        
        assert len(results) == 5
        assert performance_decorator.total_calls == 5
    
    def test_with_performance_metrics_decorator(self):
        """Test with_performance_metrics decorator function"""
        @with_performance_metrics(slow_threshold_ms=200.0)
        async def test_func():
            return "result"
        
        assert asyncio.iscoroutinefunction(test_func)


class TestBusinessMetricsDecorator:
    """Tests for BusinessMetricsDecorator"""
    
    @pytest.fixture
    def business_decorator(self):
        """Create business metrics decorator"""
        def extract_value(result):
            return result.get("value", 0) if isinstance(result, dict) else 0
        
        return BusinessMetricsDecorator("test_business_metric", extract_value)
    
    @pytest.mark.asyncio
    async def test_business_metric_extraction(self, business_decorator):
        """Test business metric extraction"""
        @business_decorator
        async def test_func():
            return {"value": 42}
        
        result = await test_func()
        
        assert result["value"] == 42
        assert len(business_decorator.metric_values) == 1
        assert business_decorator.metric_values[0] == 42
    
    @pytest.mark.asyncio
    async def test_multiple_metric_values(self, business_decorator):
        """Test collecting multiple metric values"""
        @business_decorator
        async def test_func(value: int):
            return {"value": value}
        
        await test_func(10)
        await test_func(20)
        await test_func(30)
        
        assert len(business_decorator.metric_values) == 3
        assert business_decorator.metric_values == [10, 20, 30]
    
    @pytest.mark.asyncio
    async def test_metric_extraction_failure(self, business_decorator):
        """Test business metric when extraction fails"""
        @business_decorator
        async def test_func():
            return "invalid_result"  # Not a dict, extraction will fail
        
        # Should not raise error, just log warning
        result = await test_func()
        assert result == "invalid_result"
    
    @pytest.mark.asyncio
    async def test_function_error(self, business_decorator):
        """Test business metrics with function error"""
        @business_decorator
        async def test_func():
            raise ValueError("Error")
        
        with pytest.raises(ValueError):
            await test_func()
        
        # Should not add metric value on error
        assert len(business_decorator.metric_values) == 0
    
    @pytest.mark.asyncio
    async def test_get_business_metrics_summary(self, business_decorator):
        """Test getting business metrics summary"""
        @business_decorator
        async def test_func(value: int):
            return {"value": value}
        
        await test_func(10)
        await test_func(20)
        await test_func(30)
        
        summary = business_decorator.get_business_metrics_summary()
        
        assert summary["metric_name"] == "test_business_metric"
        assert summary["samples"] == 3
        assert summary["min"] == 10
        assert summary["max"] == 30
        assert summary["avg"] == 20.0
        assert summary["latest"] == 30
    
    @pytest.mark.asyncio
    async def test_get_business_metrics_summary_empty(self, business_decorator):
        """Test business metrics summary with no samples"""
        summary = business_decorator.get_business_metrics_summary()
        
        assert summary["metric_name"] == "test_business_metric"
        assert summary["samples"] == 0
    
    def test_with_business_metrics_decorator(self):
        """Test with_business_metrics decorator function"""
        def extract_value(result):
            return result.get("value", 0)
        
        @with_business_metrics("test_metric", extract_value)
        async def test_func():
            return {"value": 42}
        
        assert asyncio.iscoroutinefunction(test_func)

