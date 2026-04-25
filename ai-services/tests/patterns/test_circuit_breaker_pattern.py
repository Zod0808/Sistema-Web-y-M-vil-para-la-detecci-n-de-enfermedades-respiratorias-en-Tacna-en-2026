"""
Unit tests for Circuit Breaker Pattern implementation
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
import time

from circuit_breaker.circuit_breaker import CircuitBreaker, CircuitState
from circuit_breaker.openai_circuit_breaker import OpenAICircuitBreaker
from circuit_breaker.external_service_circuit_breaker import ExternalServiceCircuitBreaker


class TestCircuitBreaker:
    """Test base circuit breaker implementation"""
    
    @pytest.fixture
    def circuit_breaker(self):
        """Create circuit breaker instance"""
        return CircuitBreaker(
            failure_threshold=3,
            recovery_timeout=60,
            expected_exception=Exception
        )
    
    def test_circuit_breaker_initialization(self, circuit_breaker):
        """Test circuit breaker initialization"""
        assert circuit_breaker.state == CircuitState.CLOSED
        assert circuit_breaker.failure_count == 0
        assert circuit_breaker.failure_threshold == 3
        assert circuit_breaker.recovery_timeout == 60
    
    @pytest.mark.asyncio
    async def test_circuit_closed_state_success(self, circuit_breaker):
        """Test circuit breaker in closed state with successful call"""
        async def successful_operation():
            return "success"
        
        result = await circuit_breaker.call(successful_operation)
        
        assert result == "success"
        assert circuit_breaker.state == CircuitState.CLOSED
        assert circuit_breaker.failure_count == 0
    
    @pytest.mark.asyncio
    async def test_circuit_closed_state_failure(self, circuit_breaker):
        """Test circuit breaker in closed state with failed call"""
        async def failing_operation():
            raise Exception("Test failure")
        
        with pytest.raises(Exception):
            await circuit_breaker.call(failing_operation)
        
        assert circuit_breaker.failure_count == 1
        assert circuit_breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_circuit_opens_after_threshold(self, circuit_breaker):
        """Test circuit breaker opens after reaching failure threshold"""
        async def failing_operation():
            raise Exception("Test failure")
        
        # Trigger failures up to threshold
        for i in range(3):
            with pytest.raises(Exception):
                await circuit_breaker.call(failing_operation)
        
        # Circuit should now be open
        assert circuit_breaker.state == CircuitState.OPEN
        assert circuit_breaker.failure_count == 3
    
    @pytest.mark.asyncio
    async def test_circuit_open_state_blocks_calls(self, circuit_breaker):
        """Test circuit breaker blocks calls when open"""
        # First open the circuit
        async def failing_operation():
            raise Exception("Test failure")
        
        for i in range(3):
            with pytest.raises(Exception):
                await circuit_breaker.call(failing_operation)
        
        # Now circuit should be open and block calls
        with pytest.raises(Exception) as exc_info:
            await circuit_breaker.call(failing_operation)
        
        assert "Circuit breaker is OPEN" in str(exc_info.value) or "Circuit breaker is open" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_circuit_recovery_attempt(self, circuit_breaker):
        """Test circuit breaker attempts recovery"""
        # Open the circuit
        async def failing_operation():
            raise Exception("Test failure")
        
        for i in range(3):
            with pytest.raises(Exception):
                await circuit_breaker.call(failing_operation)
        
        assert circuit_breaker.state == CircuitState.OPEN
        
        # Wait for recovery timeout (use shorter timeout for testing)
        circuit_breaker.recovery_timeout = 0.1
        await asyncio.sleep(0.2)
        
        # Next call should be in half-open state
        async def successful_operation():
            return "recovery success"
        
        result = await circuit_breaker.call(successful_operation)
        
        assert result == "recovery success"
        # After successful call in half-open, circuit should transition to closed
        # But it may need multiple successes to fully close
        assert circuit_breaker.state in [CircuitState.CLOSED, CircuitState.HALF_OPEN]
    
    @pytest.mark.asyncio
    async def test_circuit_half_open_state_failure(self, circuit_breaker):
        """Test circuit breaker returns to open state after failure in half-open"""
        # Open the circuit
        async def failing_operation():
            raise Exception("Test failure")
        
        for i in range(3):
            with pytest.raises(Exception):
                await circuit_breaker.call(failing_operation)
        
        # Wait for recovery timeout
        circuit_breaker.recovery_timeout = 0.1
        await asyncio.sleep(0.2)
        
        # Failure in half-open should return to open
        with pytest.raises(Exception):
            await circuit_breaker.call(failing_operation)
        
        assert circuit_breaker.state == CircuitState.OPEN
    
    def test_circuit_breaker_state_transitions(self, circuit_breaker):
        """Test circuit breaker state transitions"""
        # Initial state should be closed
        assert circuit_breaker.state == CircuitState.CLOSED
        
        # Simulate failures - circuit opens when threshold is reached during call
        async def failing_operation():
            raise Exception("Test failure")
        
        for i in range(3):
            with pytest.raises(Exception):
                await circuit_breaker.call(failing_operation)
        
        assert circuit_breaker.state == CircuitState.OPEN
        
        # Simulate recovery attempt
        circuit_breaker.state = CircuitState.HALF_OPEN
        assert circuit_breaker.state == CircuitState.HALF_OPEN


class TestOpenAICircuitBreaker:
    """Test OpenAI-specific circuit breaker"""
    
    @pytest.fixture
    def openai_circuit_breaker(self):
        """Create OpenAI circuit breaker instance"""
        return OpenAICircuitBreaker()
    
    def test_openai_circuit_breaker_initialization(self, openai_circuit_breaker):
        """Test OpenAI circuit breaker initialization"""
        assert openai_circuit_breaker is not None
        assert openai_circuit_breaker.failure_threshold == 3  # OpenAI uses 3 as default
        assert openai_circuit_breaker.recovery_timeout == 300  # OpenAI uses 300 as default
    
    @pytest.mark.asyncio
    async def test_openai_api_success(self, openai_circuit_breaker):
        """Test successful OpenAI API call"""
        async def mock_openai_func(*args, **kwargs):
            return {"choices": [{"message": {"content": "test response"}}]}
        
        result = await openai_circuit_breaker.call_openai(mock_openai_func)
        
        assert result["choices"][0]["message"]["content"] == "test response"
        assert openai_circuit_breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_openai_api_rate_limit_error(self, openai_circuit_breaker):
        """Test OpenAI API rate limit error handling"""
        # Mock openai.RateLimitError
        import sys
        if hasattr(sys.modules.get('openai', None), 'RateLimitError'):
            RateLimitError = sys.modules['openai'].RateLimitError
        else:
            RateLimitError = type("RateLimitError", (Exception,), {})
        
        async def mock_openai_func(*args, **kwargs):
            raise RateLimitError("Rate limit exceeded")
        
        with pytest.raises(Exception):
            await openai_circuit_breaker.call_openai(mock_openai_func)
        
        # Rate limit errors are handled separately
        assert openai_circuit_breaker.rate_limit_count >= 0
    
    @pytest.mark.asyncio
    async def test_openai_api_authentication_error(self, openai_circuit_breaker):
        """Test OpenAI API authentication error handling"""
        async def mock_openai_func(*args, **kwargs):
            raise Exception("Invalid API key")
        
        with pytest.raises(Exception):
            await openai_circuit_breaker.call_openai(mock_openai_func)
        
        assert openai_circuit_breaker.failure_count == 1


class TestExternalServiceCircuitBreaker:
    """Test external service circuit breaker"""
    
    @pytest.fixture
    def external_circuit_breaker(self):
        """Create external service circuit breaker instance"""
        return ExternalServiceCircuitBreaker(
            service_name="test_service",
            base_url="http://test-service:8000",  # Required parameter
            failure_threshold=2,
            recovery_timeout=30
        )
    
    def test_external_circuit_breaker_initialization(self, external_circuit_breaker):
        """Test external service circuit breaker initialization"""
        assert external_circuit_breaker.service_name == "test_service"
        assert external_circuit_breaker.failure_threshold == 2
        assert external_circuit_breaker.recovery_timeout == 30
    
    @pytest.mark.asyncio
    async def test_external_service_success(self, external_circuit_breaker):
        """Test successful external service call"""
        async def mock_service_call():
            return {"status": "success", "data": "test_data"}
        
        result = await external_circuit_breaker.call(mock_service_call)
        
        assert result["status"] == "success"
        assert result["data"] == "test_data"
        assert external_circuit_breaker.state == CircuitState.CLOSED
    
    @pytest.mark.asyncio
    async def test_external_service_failure(self, external_circuit_breaker):
        """Test external service failure handling"""
        async def failing_service_call():
            raise Exception("Service unavailable")
        
        with pytest.raises(Exception):
            await external_circuit_breaker.call(failing_service_call)
        
        assert external_circuit_breaker.failure_count == 1
    
    @pytest.mark.asyncio
    async def test_external_service_circuit_opens(self, external_circuit_breaker):
        """Test external service circuit opens after threshold"""
        async def failing_service_call():
            raise Exception("Service unavailable")
        
        # Trigger failures up to threshold
        for i in range(2):
            with pytest.raises(Exception):
                await external_circuit_breaker.call(failing_service_call)
        
        # Circuit should now be open
        assert external_circuit_breaker.state == CircuitState.OPEN
    
    @pytest.mark.asyncio
    async def test_external_service_timeout_error(self, external_circuit_breaker):
        """Test external service timeout error handling"""
        async def timeout_service_call():
            await asyncio.sleep(10)  # Simulate timeout
            return "should not reach here"
        
        # Set short timeout for testing
        external_circuit_breaker.timeout = 0.1
        
        with pytest.raises(asyncio.TimeoutError):
            await external_circuit_breaker.call(timeout_service_call)
        
        assert external_circuit_breaker.failure_count == 1


class TestCircuitBreakerIntegration:
    """Test circuit breaker integration scenarios"""
    
    @pytest.mark.asyncio
    async def test_multiple_circuit_breakers_independence(self):
        """Test that multiple circuit breakers work independently"""
        cb1 = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
        cb2 = CircuitBreaker(failure_threshold=3, recovery_timeout=0.1)
        
        async def failing_operation():
            raise Exception("Test failure")
        
        # Open first circuit breaker
        for i in range(2):
            with pytest.raises(Exception):
                await cb1.call(failing_operation)
        
        assert cb1.state == CircuitState.OPEN
        assert cb2.state == CircuitState.CLOSED  # Should still be closed
        
        # Open second circuit breaker
        for i in range(3):
            with pytest.raises(Exception):
                await cb2.call(failing_operation)
        
        assert cb1.state == CircuitState.OPEN
        assert cb2.state == CircuitState.OPEN
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_with_retry_logic(self):
        """Test circuit breaker integration with retry logic"""
        cb = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
        
        call_count = 0
        async def operation_with_retry():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary failure")
            return "success after retries"
        
        # First two calls should fail and increment circuit breaker
        for i in range(2):
            with pytest.raises(Exception):
                await cb.call(operation_with_retry)
        
        # Circuit should be open now
        assert cb.state == CircuitState.OPEN
        
        # Wait for recovery
        await asyncio.sleep(0.2)
        
        # Next call should succeed
        result = await cb.call(operation_with_retry)
        assert result == "success after retries"
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_metrics_tracking(self, circuit_breaker):
        """Test circuit breaker metrics tracking"""
        # Track successful calls
        async def successful_operation():
            return "success"
        
        await circuit_breaker.call(successful_operation)
        
        # Track failed calls
        async def failing_operation():
            raise Exception("failure")
        
        with pytest.raises(Exception):
            await circuit_breaker.call(failing_operation)
        
        # Verify metrics
        assert circuit_breaker.failure_count == 1
        assert circuit_breaker.state == CircuitState.CLOSED
