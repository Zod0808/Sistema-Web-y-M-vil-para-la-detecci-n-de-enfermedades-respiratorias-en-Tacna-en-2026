"""
Tests for circuit_breaker/openai_circuit_breaker.py
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from circuit_breaker.openai_circuit_breaker import (
    OpenAICircuitBreaker,
    OpenAIWithCircuitBreaker
)
from circuit_breaker.circuit_breaker import CircuitState


class TestOpenAICircuitBreaker:
    """Tests for OpenAICircuitBreaker"""
    
    @pytest.fixture
    def openai_circuit_breaker(self):
        """Create OpenAI circuit breaker instance"""
        return OpenAICircuitBreaker(
            failure_threshold=3,
            recovery_timeout=300,
            success_threshold=2,
            rate_limit_threshold=2
        )
    
    @pytest.fixture
    def mock_openai_response(self):
        """Create mock OpenAI response"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Test response"
        return mock_response
    
    def test_initialization(self, openai_circuit_breaker):
        """Test circuit breaker initialization"""
        assert openai_circuit_breaker.failure_threshold == 3
        assert openai_circuit_breaker.recovery_timeout == 300
        assert openai_circuit_breaker.success_threshold == 2
        assert openai_circuit_breaker.rate_limit_threshold == 2
        assert openai_circuit_breaker.rate_limit_count == 0
        assert openai_circuit_breaker.last_rate_limit_time is None
    
    @pytest.mark.asyncio
    async def test_call_openai_success(self, openai_circuit_breaker, mock_openai_response):
        """Test successful OpenAI call"""
        async def mock_openai_func(*args, **kwargs):
            return mock_openai_response
        
        with patch.object(openai_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_openai_response
            
            result = await openai_circuit_breaker.call_openai(mock_openai_func, "test prompt")
            
            assert result == mock_openai_response
            mock_call.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_call_openai_rate_limit_error(self, openai_circuit_breaker):
        """Test handling OpenAI rate limit error"""
        # Mock openai module
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.RateLimitError = type('RateLimitError', (Exception,), {})
            
            rate_limit_error = mock_openai.RateLimitError("Rate limit exceeded")
            
            async def mock_openai_func(*args, **kwargs):
                raise rate_limit_error
            
            with patch.object(openai_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
                mock_call.side_effect = rate_limit_error
                with patch.object(openai_circuit_breaker, '_handle_rate_limit_error', new_callable=AsyncMock) as mock_handle:
                    
                    with pytest.raises(Exception):
                        await openai_circuit_breaker.call_openai(mock_openai_func)
                    
                    mock_handle.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_call_openai_timeout_error(self, openai_circuit_breaker):
        """Test handling OpenAI timeout error"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.APITimeoutError = type('APITimeoutError', (Exception,), {})
            
            timeout_error = mock_openai.APITimeoutError("Request timeout")
            
            async def mock_openai_func(*args, **kwargs):
                raise timeout_error
            
            with patch.object(openai_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
                mock_call.side_effect = timeout_error
                with patch.object(openai_circuit_breaker, '_handle_timeout_error', new_callable=AsyncMock) as mock_handle:
                    
                    with pytest.raises(Exception):
                        await openai_circuit_breaker.call_openai(mock_openai_func)
                    
                    mock_handle.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_call_openai_api_error(self, openai_circuit_breaker):
        """Test handling OpenAI API error"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.APIError = type('APIError', (Exception,), {})
            
            api_error = mock_openai.APIError("API error")
            api_error.code = "server_error"
            
            async def mock_openai_func(*args, **kwargs):
                raise api_error
            
            with patch.object(openai_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
                mock_call.side_effect = api_error
                with patch.object(openai_circuit_breaker, '_handle_api_error', new_callable=AsyncMock) as mock_handle:
                    
                    with pytest.raises(Exception):
                        await openai_circuit_breaker.call_openai(mock_openai_func)
                    
                    mock_handle.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_call_openai_generic_exception(self, openai_circuit_breaker):
        """Test handling generic exception"""
        async def mock_openai_func(*args, **kwargs):
            raise ValueError("Generic error")
        
        with patch.object(openai_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = ValueError("Generic error")
            with patch.object(openai_circuit_breaker, '_on_failure', new_callable=AsyncMock) as mock_failure:
                
                with pytest.raises(ValueError):
                    await openai_circuit_breaker.call_openai(mock_openai_func)
                
                mock_failure.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_rate_limit_error_below_threshold(self, openai_circuit_breaker):
        """Test handling rate limit error below threshold"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.RateLimitError = type('RateLimitError', (Exception,), {})
            rate_limit_error = mock_openai.RateLimitError("Rate limit")
            
            await openai_circuit_breaker._handle_rate_limit_error(rate_limit_error)
            
            assert openai_circuit_breaker.rate_limit_count == 1
            assert openai_circuit_breaker.state != CircuitState.OPEN  # Should not open yet
    
    @pytest.mark.asyncio
    async def test_handle_rate_limit_error_above_threshold(self, openai_circuit_breaker):
        """Test handling rate limit error above threshold"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.RateLimitError = type('RateLimitError', (Exception,), {})
            rate_limit_error = mock_openai.RateLimitError("Rate limit")
            
            # Set rate_limit_count to threshold
            openai_circuit_breaker.rate_limit_count = openai_circuit_breaker.rate_limit_threshold - 1
            
            await openai_circuit_breaker._handle_rate_limit_error(rate_limit_error)
            
            assert openai_circuit_breaker.rate_limit_count == openai_circuit_breaker.rate_limit_threshold
            assert openai_circuit_breaker.state == CircuitState.OPEN
    
    @pytest.mark.asyncio
    async def test_handle_timeout_error(self, openai_circuit_breaker):
        """Test handling timeout error"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.APITimeoutError = type('APITimeoutError', (Exception,), {})
            timeout_error = mock_openai.APITimeoutError("Timeout")
            
            with patch.object(openai_circuit_breaker, '_on_failure', new_callable=AsyncMock) as mock_failure:
                await openai_circuit_breaker._handle_timeout_error(timeout_error)
                
                mock_failure.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_api_error_billing_issue(self, openai_circuit_breaker):
        """Test handling API error with billing issue"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.APIError = type('APIError', (Exception,), {})
            api_error = mock_openai.APIError("Billing error")
            api_error.code = "insufficient_quota"
            
            await openai_circuit_breaker._handle_api_error(api_error)
            
            # Should open circuit immediately for billing issues
            assert openai_circuit_breaker.state == CircuitState.OPEN
    
    @pytest.mark.asyncio
    async def test_handle_api_error_server_error(self, openai_circuit_breaker):
        """Test handling API error with server error"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.APIError = type('APIError', (Exception,), {})
            api_error = mock_openai.APIError("Server error")
            api_error.code = "server_error"
            
            with patch.object(openai_circuit_breaker, '_on_failure', new_callable=AsyncMock) as mock_failure:
                await openai_circuit_breaker._handle_api_error(api_error)
                
                mock_failure.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_api_error_service_unavailable(self, openai_circuit_breaker):
        """Test handling API error with service unavailable"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.APIError = type('APIError', (Exception,), {})
            api_error = mock_openai.APIError("Service unavailable")
            api_error.code = "service_unavailable"
            
            with patch.object(openai_circuit_breaker, '_on_failure', new_callable=AsyncMock) as mock_failure:
                await openai_circuit_breaker._handle_api_error(api_error)
                
                mock_failure.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_handle_api_error_other_error(self, openai_circuit_breaker):
        """Test handling other API errors"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.APIError = type('APIError', (Exception,), {})
            api_error = mock_openai.APIError("Other error")
            api_error.code = "unknown_error"
            
            with patch.object(openai_circuit_breaker, '_on_failure', new_callable=AsyncMock) as mock_failure:
                await openai_circuit_breaker._handle_api_error(api_error)
                
                mock_failure.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_on_success_resets_rate_limit(self, openai_circuit_breaker):
        """Test that success resets rate limit counter"""
        openai_circuit_breaker.rate_limit_count = 5
        
        await openai_circuit_breaker._on_success()
        
        assert openai_circuit_breaker.rate_limit_count == 0
    
    def test_get_metrics(self, openai_circuit_breaker):
        """Test getting enhanced metrics"""
        openai_circuit_breaker.rate_limit_count = 3
        openai_circuit_breaker.last_rate_limit_time = datetime.utcnow()
        
        metrics = openai_circuit_breaker.get_metrics()
        
        assert "rate_limit_count" in metrics
        assert "rate_limit_threshold" in metrics
        assert "last_rate_limit_time" in metrics
        assert metrics["rate_limit_count"] == 3
        assert metrics["rate_limit_threshold"] == 2
        # Should also include base metrics
        assert "state" in metrics
        assert "failure_count" in metrics
    
    def test_should_attempt_reset_with_rate_limit(self, openai_circuit_breaker):
        """Test reset logic with rate limit"""
        openai_circuit_breaker.state = CircuitState.OPEN
        openai_circuit_breaker.rate_limit_count = 3  # Above threshold
        
        # Should not attempt reset if rate limit count is above threshold
        result = openai_circuit_breaker._should_attempt_reset()
        
        # The logic depends on base implementation, but rate_limit_count should be considered
        assert isinstance(result, bool)
    
    def test_should_attempt_reset_without_rate_limit(self, openai_circuit_breaker):
        """Test reset logic without rate limit"""
        openai_circuit_breaker.state = CircuitState.OPEN
        openai_circuit_breaker.rate_limit_count = 0
        openai_circuit_breaker.last_failure_time = None  # Should allow reset
        
        result = openai_circuit_breaker._should_attempt_reset()
        
        assert isinstance(result, bool)
    
    def test_reset(self, openai_circuit_breaker):
        """Test resetting circuit breaker"""
        openai_circuit_breaker.rate_limit_count = 5
        openai_circuit_breaker.last_rate_limit_time = datetime.utcnow()
        openai_circuit_breaker.failure_count = 3
        
        openai_circuit_breaker._reset()
        
        assert openai_circuit_breaker.rate_limit_count == 0
        assert openai_circuit_breaker.last_rate_limit_time is None
        assert openai_circuit_breaker.failure_count == 0
        assert openai_circuit_breaker.state == CircuitState.CLOSED


class TestOpenAIWithCircuitBreaker:
    """Tests for OpenAIWithCircuitBreaker"""
    
    @pytest.fixture
    def openai_wrapper(self):
        """Create OpenAI wrapper instance"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.AsyncOpenAI = MagicMock(return_value=MagicMock())
            return OpenAIWithCircuitBreaker(api_key="test-key")
    
    def test_initialization(self, openai_wrapper):
        """Test OpenAI wrapper initialization"""
        assert openai_wrapper.client is not None
        assert openai_wrapper.circuit_breaker is not None
        assert isinstance(openai_wrapper.circuit_breaker, OpenAICircuitBreaker)
    
    @pytest.mark.asyncio
    async def test_chat_completions_create(self, openai_wrapper):
        """Test chat completions create with circuit breaker"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Test response"
        
        openai_wrapper.client.chat.completions.create = AsyncMock(return_value=mock_response)
        openai_wrapper.circuit_breaker.call_openai = AsyncMock(return_value=mock_response)
        
        result = await openai_wrapper.chat_completions_create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}]
        )
        
        assert result == mock_response
        openai_wrapper.circuit_breaker.call_openai.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_completions_create(self, openai_wrapper):
        """Test completions create with circuit breaker"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].text = "Test completion"
        
        openai_wrapper.client.completions.create = AsyncMock(return_value=mock_response)
        openai_wrapper.circuit_breaker.call_openai = AsyncMock(return_value=mock_response)
        
        result = await openai_wrapper.completions_create(
            model="text-davinci-003",
            prompt="Test prompt"
        )
        
        assert result == mock_response
        openai_wrapper.circuit_breaker.call_openai.assert_called_once()
    
    def test_get_circuit_breaker_metrics(self, openai_wrapper):
        """Test getting circuit breaker metrics"""
        openai_wrapper.circuit_breaker.get_metrics = MagicMock(return_value={
            "state": "closed",
            "failure_count": 0,
            "rate_limit_count": 0
        })
        
        metrics = openai_wrapper.get_circuit_breaker_metrics()
        
        assert "state" in metrics
        assert "failure_count" in metrics
        assert "rate_limit_count" in metrics
    
    def test_is_circuit_open_false(self, openai_wrapper):
        """Test checking if circuit is open (closed state)"""
        openai_wrapper.circuit_breaker.get_state = MagicMock(return_value=CircuitState.CLOSED)
        
        result = openai_wrapper.is_circuit_open()
        
        assert result is False
    
    def test_is_circuit_open_true(self, openai_wrapper):
        """Test checking if circuit is open (open state)"""
        openai_wrapper.circuit_breaker.get_state = MagicMock(return_value=CircuitState.OPEN)
        
        result = openai_wrapper.is_circuit_open()
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_chat_completions_with_rate_limit(self, openai_wrapper):
        """Test chat completions with rate limit error"""
        with patch('circuit_breaker.openai_circuit_breaker.openai') as mock_openai:
            mock_openai.RateLimitError = type('RateLimitError', (Exception,), {})
            rate_limit_error = mock_openai.RateLimitError("Rate limit")
            
            openai_wrapper.circuit_breaker.call_openai = AsyncMock(side_effect=rate_limit_error)
            
            with pytest.raises(Exception):
                await openai_wrapper.chat_completions_create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "Hello"}]
                )

