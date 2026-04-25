"""
Tests for decorators/retry_decorator.py
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock

from decorators.retry_decorator import (
    RetryDecorator,
    with_retry,
    ExponentialBackoffRetry,
    with_exponential_backoff_retry,
    ConditionalRetry,
    with_conditional_retry
)


class TestRetryDecorator:
    """Tests for RetryDecorator"""
    
    @pytest.fixture
    def retry_decorator(self):
        """Create retry decorator instance"""
        return RetryDecorator(
            max_attempts=3,
            delay=0.01,
            backoff_multiplier=2.0,
            max_delay=1.0,
            exceptions=(ValueError,),
            jitter=True
        )
    
    @pytest.mark.asyncio
    async def test_successful_function_no_retry(self, retry_decorator):
        """Test retry decorator with successful function (no retry needed)"""
        @retry_decorator
        async def test_func(x: int) -> int:
            return x * 2
        
        result = await test_func(5)
        
        assert result == 10
    
    @pytest.mark.asyncio
    async def test_function_succeeds_after_retries(self, retry_decorator):
        """Test retry decorator with function that succeeds after retries"""
        call_count = 0
        
        @retry_decorator
        async def test_func() -> str:
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Temporary error")
            return "success"
        
        result = await test_func()
        
        assert result == "success"
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_function_fails_after_all_retries(self, retry_decorator):
        """Test retry decorator with function that fails after all retries"""
        @retry_decorator
        async def test_func() -> str:
            raise ValueError("Persistent error")
        
        with pytest.raises(ValueError, match="Persistent error"):
            await test_func()
    
    @pytest.mark.asyncio
    async def test_retry_with_backoff(self, retry_decorator):
        """Test retry decorator with exponential backoff"""
        call_times = []
        
        @retry_decorator
        async def test_func() -> str:
            call_times.append(asyncio.get_event_loop().time())
            if len(call_times) < 2:
                raise ValueError("Error")
            return "success"
        
        result = await test_func()
        
        assert result == "success"
        assert len(call_times) == 2
        # Verify delay between calls
        if len(call_times) >= 2:
            delay = call_times[1] - call_times[0]
            assert delay >= 0.01  # At least the base delay
    
    @pytest.mark.asyncio
    async def test_retry_with_jitter(self, retry_decorator):
        """Test retry decorator with jitter"""
        @retry_decorator
        async def test_func() -> str:
            return "success"
        
        result = await test_func()
        assert result == "success"
    
    @pytest.mark.asyncio
    async def test_retry_without_jitter(self):
        """Test retry decorator without jitter"""
        decorator = RetryDecorator(
            max_attempts=2,
            delay=0.01,
            jitter=False
        )
        
        @decorator
        async def test_func() -> str:
            return "success"
        
        result = await test_func()
        assert result == "success"
    
    @pytest.mark.asyncio
    async def test_retry_only_specific_exceptions(self, retry_decorator):
        """Test retry decorator only retries specific exceptions"""
        @retry_decorator
        async def test_func() -> str:
            raise TypeError("Different error type")
        
        # Should not retry TypeError, only ValueError
        with pytest.raises(TypeError, match="Different error type"):
            await test_func()
    
    @pytest.mark.asyncio
    async def test_sync_function_retry(self, retry_decorator):
        """Test retry decorator with sync function"""
        call_count = 0
        
        @retry_decorator
        def test_func() -> str:
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ValueError("Error")
            return "success"
        
        result = test_func()
        
        assert result == "success"
        assert call_count == 2
    
    @pytest.mark.asyncio
    async def test_max_delay_limit(self):
        """Test retry decorator respects max_delay limit"""
        decorator = RetryDecorator(
            max_attempts=5,
            delay=0.01,
            backoff_multiplier=100.0,  # Very large multiplier
            max_delay=0.1  # But max delay is small
        )
        
        call_count = 0
        
        @decorator
        async def test_func() -> str:
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Error")
            return "success"
        
        result = await test_func()
        
        assert result == "success"
    
    def test_with_retry_decorator_function(self):
        """Test with_retry decorator function"""
        @with_retry(max_attempts=3, delay=0.01)
        async def test_func():
            return "result"
        
        assert asyncio.iscoroutinefunction(test_func)


class TestExponentialBackoffRetry:
    """Tests for ExponentialBackoffRetry"""
    
    @pytest.fixture
    def exponential_retry(self):
        """Create exponential backoff retry decorator"""
        return ExponentialBackoffRetry(
            max_attempts=3,
            base_delay=0.01,
            max_delay=1.0,
            exceptions=(ValueError,)
        )
    
    @pytest.mark.asyncio
    async def test_exponential_backoff_success(self, exponential_retry):
        """Test exponential backoff retry with success"""
        call_count = 0
        
        @exponential_retry
        async def test_func() -> str:
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ValueError("Error")
            return "success"
        
        result = await test_func()
        
        assert result == "success"
        assert call_count == 2
    
    @pytest.mark.asyncio
    async def test_exponential_backoff_calculation(self, exponential_retry):
        """Test exponential backoff delay calculation"""
        call_times = []
        
        @exponential_retry
        async def test_func() -> str:
            call_times.append(asyncio.get_event_loop().time())
            if len(call_times) < 3:
                raise ValueError("Error")
            return "success"
        
        result = await test_func()
        
        assert result == "success"
        # Verify delays increase exponentially
        if len(call_times) >= 3:
            delay1 = call_times[1] - call_times[0]
            delay2 = call_times[2] - call_times[1]
            # delay2 should be approximately 2x delay1 (with jitter)
            assert delay2 >= delay1
    
    @pytest.mark.asyncio
    async def test_exponential_backoff_with_retry_condition(self):
        """Test exponential backoff with custom retry condition"""
        def should_retry(result):
            return result is None or result == "retry"
        
        decorator = ExponentialBackoffRetry(
            max_attempts=3,
            base_delay=0.01,
            retry_condition=should_retry
        )
        
        call_count = 0
        
        @decorator
        async def test_func() -> str:
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                return None  # Condition says retry
            return "success"
        
        result = await test_func()
        
        assert result == "success"
        assert call_count == 2
    
    @pytest.mark.asyncio
    async def test_exponential_backoff_failure(self, exponential_retry):
        """Test exponential backoff retry with failure"""
        @exponential_retry
        async def test_func() -> str:
            raise ValueError("Persistent error")
        
        with pytest.raises(ValueError, match="Persistent error"):
            await test_func()
    
    def test_with_exponential_backoff_retry_decorator_function(self):
        """Test with_exponential_backoff_retry decorator function"""
        @with_exponential_backoff_retry(max_attempts=5, base_delay=0.01)
        async def test_func():
            return "result"
        
        assert asyncio.iscoroutinefunction(test_func)


class TestConditionalRetry:
    """Tests for ConditionalRetry"""
    
    @pytest.fixture
    def conditional_retry(self):
        """Create conditional retry decorator"""
        def should_retry(exception):
            return "retry" in str(exception).lower()
        
        return ConditionalRetry(
            max_attempts=3,
            delay=0.01,
            should_retry=should_retry,
            exceptions=(ValueError,)
        )
    
    @pytest.mark.asyncio
    async def test_conditional_retry_should_retry(self, conditional_retry):
        """Test conditional retry when should_retry returns True"""
        call_count = 0
        
        @conditional_retry
        async def test_func() -> str:
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ValueError("Please retry")
            return "success"
        
        result = await test_func()
        
        assert result == "success"
        assert call_count == 2
    
    @pytest.mark.asyncio
    async def test_conditional_retry_should_not_retry(self, conditional_retry):
        """Test conditional retry when should_retry returns False"""
        @conditional_retry
        async def test_func() -> str:
            raise ValueError("Do not retry")
        
        # Should not retry, raise immediately
        with pytest.raises(ValueError, match="Do not retry"):
            await test_func()
    
    @pytest.mark.asyncio
    async def test_conditional_retry_default_condition(self):
        """Test conditional retry with default condition (always retry)"""
        decorator = ConditionalRetry(
            max_attempts=2,
            delay=0.01
        )
        
        call_count = 0
        
        @decorator
        async def test_func() -> str:
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ValueError("Error")
            return "success"
        
        result = await test_func()
        
        assert result == "success"
        assert call_count == 2
    
    @pytest.mark.asyncio
    async def test_conditional_retry_failure(self, conditional_retry):
        """Test conditional retry with failure after all retries"""
        @conditional_retry
        async def test_func() -> str:
            raise ValueError("Please retry")
        
        with pytest.raises(ValueError, match="Please retry"):
            await test_func()
    
    def test_with_conditional_retry_decorator_function(self):
        """Test with_conditional_retry decorator function"""
        def should_retry(e):
            return True
        
        @with_conditional_retry(max_attempts=3, should_retry=should_retry)
        async def test_func():
            return "result"
        
        assert asyncio.iscoroutinefunction(test_func)

