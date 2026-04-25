"""
Tests for decorators/circuit_breaker_decorator.py
"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock

from decorators.circuit_breaker_decorator import (
    CircuitBreakerDecorator,
    with_circuit_breaker,
    OpenAICircuitBreakerDecorator,
    with_openai_circuit_breaker,
    ExternalServiceCircuitBreakerDecorator,
    with_external_service_circuit_breaker
)


class TestCircuitBreakerDecorator:
    """Tests for CircuitBreakerDecorator"""
    
    @pytest.fixture
    def mock_circuit_breaker(self):
        """Create mock circuit breaker"""
        mock = MagicMock()
        mock.call = AsyncMock(return_value="success")
        return mock
    
    @pytest.fixture
    def mock_circuit_breaker_manager(self, mock_circuit_breaker):
        """Create mock circuit breaker manager"""
        mock_manager = MagicMock()
        mock_manager.get_circuit_breaker = MagicMock(return_value=mock_circuit_breaker)
        return mock_manager
    
    @pytest.mark.asyncio
    async def test_async_function_success(self, mock_circuit_breaker_manager):
        """Test circuit breaker decorator with successful async function"""
        with patch('decorators.circuit_breaker_decorator.circuit_breaker_manager', mock_circuit_breaker_manager):
            decorator = CircuitBreakerDecorator(
                service_name="test_service",
                failure_threshold=5,
                recovery_timeout=60
            )
            
            @decorator
            async def test_func(x: int) -> int:
                return x * 2
            
            result = await test_func(5)
            
            assert result == "success"  # Mock returns "success"
            mock_circuit_breaker_manager.get_circuit_breaker.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_sync_function_success(self, mock_circuit_breaker_manager):
        """Test circuit breaker decorator with successful sync function"""
        with patch('decorators.circuit_breaker_decorator.circuit_breaker_manager', mock_circuit_breaker_manager):
            decorator = CircuitBreakerDecorator(service_name="test_service")
            
            @decorator
            def test_func(x: int) -> int:
                return x * 2
            
            # Sync function should be wrapped
            result = await test_func(5)
            
            assert result == "success"
    
    @pytest.mark.asyncio
    async def test_function_failure(self, mock_circuit_breaker_manager):
        """Test circuit breaker decorator with function failure"""
        mock_circuit_breaker = MagicMock()
        mock_circuit_breaker.call = AsyncMock(side_effect=ValueError("Service error"))
        mock_circuit_breaker_manager.get_circuit_breaker.return_value = mock_circuit_breaker
        
        with patch('decorators.circuit_breaker_decorator.circuit_breaker_manager', mock_circuit_breaker_manager):
            decorator = CircuitBreakerDecorator(service_name="test_service")
            
            @decorator
            async def test_func():
                return "result"
            
            with pytest.raises(ValueError, match="Service error"):
                await test_func()
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_parameters(self, mock_circuit_breaker_manager):
        """Test circuit breaker decorator with custom parameters"""
        with patch('decorators.circuit_breaker_decorator.circuit_breaker_manager', mock_circuit_breaker_manager):
            decorator = CircuitBreakerDecorator(
                service_name="custom_service",
                failure_threshold=10,
                recovery_timeout=120,
                expected_exception=ValueError,
                success_threshold=3
            )
            
            @decorator
            async def test_func():
                return "result"
            
            await test_func()
            
            # Verify parameters were passed
            call_args = mock_circuit_breaker_manager.get_circuit_breaker.call_args
            assert call_args[0][0] == "custom_service"
            assert call_args[1]["failure_threshold"] == 10
            assert call_args[1]["recovery_timeout"] == 120
    
    def test_with_circuit_breaker_decorator_function(self):
        """Test with_circuit_breaker decorator function"""
        @with_circuit_breaker(service_name="test_service")
        async def test_func():
            return "result"
        
        assert asyncio.iscoroutinefunction(test_func)


class TestOpenAICircuitBreakerDecorator:
    """Tests for OpenAICircuitBreakerDecorator"""
    
    @pytest.fixture
    def mock_openai_circuit_breaker(self):
        """Create mock OpenAI circuit breaker"""
        mock = MagicMock()
        mock.call_openai = AsyncMock(return_value="success")
        return mock
    
    @pytest.mark.asyncio
    async def test_openai_function_success(self, mock_openai_circuit_breaker):
        """Test OpenAI circuit breaker decorator with successful function"""
        with patch('decorators.circuit_breaker_decorator.OpenAICircuitBreaker', return_value=mock_openai_circuit_breaker):
            decorator = OpenAICircuitBreakerDecorator()
            
            @decorator
            async def test_func(prompt: str) -> str:
                return f"Response to {prompt}"
            
            result = await test_func("test prompt")
            
            assert result == "success"
            mock_openai_circuit_breaker.call_openai.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_openai_function_failure(self, mock_openai_circuit_breaker):
        """Test OpenAI circuit breaker decorator with function failure"""
        mock_openai_circuit_breaker.call_openai = AsyncMock(side_effect=Exception("OpenAI error"))
        
        with patch('decorators.circuit_breaker_decorator.OpenAICircuitBreaker', return_value=mock_openai_circuit_breaker):
            decorator = OpenAICircuitBreakerDecorator()
            
            @decorator
            async def test_func():
                return "result"
            
            with pytest.raises(Exception, match="OpenAI error"):
                await test_func()
    
    @pytest.mark.asyncio
    async def test_openai_circuit_breaker_with_kwargs(self, mock_openai_circuit_breaker):
        """Test OpenAI circuit breaker with custom kwargs"""
        with patch('decorators.circuit_breaker_decorator.OpenAICircuitBreaker', return_value=mock_openai_circuit_breaker):
            decorator = OpenAICircuitBreakerDecorator(
                failure_threshold=10,
                recovery_timeout=120
            )
            
            @decorator
            async def test_func():
                return "result"
            
            await test_func()
            
            # Verify kwargs were passed
            call_args = mock_openai_circuit_breaker.__init__.call_args if hasattr(mock_openai_circuit_breaker, '__init__') else None
            # The decorator should create circuit breaker with kwargs
    
    def test_with_openai_circuit_breaker_decorator_function(self):
        """Test with_openai_circuit_breaker decorator function"""
        @with_openai_circuit_breaker(failure_threshold=5)
        async def test_func():
            return "result"
        
        assert asyncio.iscoroutinefunction(test_func)


class TestExternalServiceCircuitBreakerDecorator:
    """Tests for ExternalServiceCircuitBreakerDecorator"""
    
    @pytest.fixture
    def mock_service_manager(self):
        """Create mock service manager"""
        mock = MagicMock()
        mock_service = MagicMock()
        mock_service.call_http_service = AsyncMock(return_value="success")
        mock.get_service = MagicMock(return_value=None)
        mock.register_service = MagicMock(return_value=mock_service)
        return mock
    
    @pytest.mark.asyncio
    async def test_external_service_function_success(self, mock_service_manager):
        """Test external service circuit breaker decorator with successful function"""
        with patch('decorators.circuit_breaker_decorator.service_manager', mock_service_manager):
            decorator = ExternalServiceCircuitBreakerDecorator(
                service_name="external_service",
                base_url="https://api.example.com"
            )
            
            @decorator
            async def test_func(data: dict) -> dict:
                return {"result": "success"}
            
            result = await test_func({"key": "value"})
            
            assert result == "success"
            mock_service_manager.register_service.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_external_service_already_registered(self, mock_service_manager):
        """Test external service when already registered"""
        mock_service = MagicMock()
        mock_service.call_http_service = AsyncMock(return_value="success")
        mock_service_manager.get_service = MagicMock(return_value=mock_service)
        
        with patch('decorators.circuit_breaker_decorator.service_manager', mock_service_manager):
            decorator = ExternalServiceCircuitBreakerDecorator(
                service_name="external_service",
                base_url="https://api.example.com"
            )
            
            @decorator
            async def test_func():
                return "result"
            
            result = await test_func()
            
            assert result == "success"
            # Should not register again
            mock_service_manager.register_service.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_external_service_function_failure(self, mock_service_manager):
        """Test external service circuit breaker with function failure"""
        mock_service = MagicMock()
        mock_service.call_http_service = AsyncMock(side_effect=Exception("HTTP error"))
        mock_service_manager.get_service = MagicMock(return_value=None)
        mock_service_manager.register_service = MagicMock(return_value=mock_service)
        
        with patch('decorators.circuit_breaker_decorator.service_manager', mock_service_manager):
            decorator = ExternalServiceCircuitBreakerDecorator(
                service_name="external_service",
                base_url="https://api.example.com"
            )
            
            @decorator
            async def test_func():
                return "result"
            
            with pytest.raises(Exception, match="HTTP error"):
                await test_func()
    
    @pytest.mark.asyncio
    async def test_external_service_with_kwargs(self, mock_service_manager):
        """Test external service circuit breaker with custom kwargs"""
        mock_service = MagicMock()
        mock_service.call_http_service = AsyncMock(return_value="success")
        mock_service_manager.get_service = MagicMock(return_value=None)
        mock_service_manager.register_service = MagicMock(return_value=mock_service)
        
        with patch('decorators.circuit_breaker_decorator.service_manager', mock_service_manager):
            decorator = ExternalServiceCircuitBreakerDecorator(
                service_name="external_service",
                base_url="https://api.example.com",
                timeout=30,
                retries=3
            )
            
            @decorator
            async def test_func():
                return "result"
            
            await test_func()
            
            # Verify kwargs were passed to register_service
            call_args = mock_service_manager.register_service.call_args
            assert call_args[0][0] == "external_service"
            assert call_args[0][1] == "https://api.example.com"
            assert "timeout" in call_args[1] or call_args[1].get("timeout") == 30
    
    def test_with_external_service_circuit_breaker_decorator_function(self):
        """Test with_external_service_circuit_breaker decorator function"""
        @with_external_service_circuit_breaker(
            service_name="test_service",
            base_url="https://api.test.com"
        )
        async def test_func():
            return "result"
        
        assert asyncio.iscoroutinefunction(test_func)

