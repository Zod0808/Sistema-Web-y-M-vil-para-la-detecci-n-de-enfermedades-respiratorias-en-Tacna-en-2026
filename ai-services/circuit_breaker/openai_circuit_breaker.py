"""
OpenAI-specific Circuit Breaker Implementation
"""

import openai
from typing import Dict, Any, Optional
import structlog
from .circuit_breaker import CircuitBreaker, CircuitState

logger = structlog.get_logger()


class OpenAICircuitBreaker(CircuitBreaker):
    """Circuit breaker specifically designed for OpenAI API calls"""
    
    def __init__(
        self,
        failure_threshold: int = 3,  # Lower threshold for external API
        recovery_timeout: int = 300,  # 5 minutes
        success_threshold: int = 2,
        rate_limit_threshold: int = 2  # Separate threshold for rate limits
    ):
        super().__init__(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=Exception,
            success_threshold=success_threshold
        )
        
        self.rate_limit_threshold = rate_limit_threshold
        self.rate_limit_count = 0
        self.last_rate_limit_time = None
    
    async def call_openai(self, openai_func: callable, *args, **kwargs) -> Dict[str, Any]:
        """Call OpenAI function with circuit breaker protection"""
        try:
            return await self.call(openai_func, *args, **kwargs)
        except openai.RateLimitError as e:
            await self._handle_rate_limit_error(e)
            raise e
        except openai.APITimeoutError as e:
            await self._handle_timeout_error(e)
            raise e
        except openai.APIError as e:
            await self._handle_api_error(e)
            raise e
        except Exception as e:
            # For other exceptions, use standard circuit breaker logic
            await self._on_failure()
            raise e
    
    async def _handle_rate_limit_error(self, error: openai.RateLimitError):
        """Handle OpenAI rate limit errors specifically"""
        self.rate_limit_count += 1
        
        if self.rate_limit_count >= self.rate_limit_threshold:
            self.state = CircuitState.OPEN
            logger.warning("Circuit breaker opened due to rate limit errors", 
                          rate_limit_count=self.rate_limit_count)
        else:
            logger.warning("OpenAI rate limit error", error=str(error))
    
    async def _handle_timeout_error(self, error: openai.APITimeoutError):
        """Handle OpenAI timeout errors"""
        logger.warning("OpenAI timeout error", error=str(error))
        await self._on_failure()
    
    async def _handle_api_error(self, error: openai.APIError):
        """Handle general OpenAI API errors"""
        error_code = getattr(error, 'code', None)
        
        if error_code in ['insufficient_quota', 'billing_hard_limit_reached']:
            # These are billing issues, open circuit immediately
            self.state = CircuitState.OPEN
            logger.error("Circuit breaker opened due to billing issue", error_code=error_code)
        elif error_code in ['server_error', 'service_unavailable']:
            # Server errors, use normal failure handling
            await self._on_failure()
        else:
            # Other API errors, treat as normal failures
            await self._on_failure()
    
    async def _on_success(self):
        """Handle successful OpenAI call"""
        await super()._on_success()
        # Reset rate limit counter on success
        self.rate_limit_count = 0
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get enhanced metrics including rate limit info"""
        metrics = super().get_metrics()
        metrics.update({
            "rate_limit_count": self.rate_limit_count,
            "rate_limit_threshold": self.rate_limit_threshold,
            "last_rate_limit_time": self.last_rate_limit_time
        })
        return metrics
    
    def _should_attempt_reset(self) -> bool:
        """Enhanced reset logic for OpenAI"""
        if self.state != CircuitState.OPEN:
            return False
        
        # For rate limit errors, wait longer
        if self.rate_limit_count > 0:
            return super()._should_attempt_reset() and self.rate_limit_count < self.rate_limit_threshold
        
        return super()._should_attempt_reset()
    
    def _reset(self):
        """Reset circuit breaker including rate limit counters"""
        super()._reset()
        self.rate_limit_count = 0
        self.last_rate_limit_time = None


class OpenAIWithCircuitBreaker:
    """Wrapper for OpenAI client with circuit breaker protection"""
    
    def __init__(self, api_key: str):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.circuit_breaker = OpenAICircuitBreaker()
    
    async def chat_completions_create(self, *args, **kwargs):
        """Create chat completion with circuit breaker protection"""
        return await self.circuit_breaker.call_openai(
            self.client.chat.completions.create,
            *args,
            **kwargs
        )
    
    async def completions_create(self, *args, **kwargs):
        """Create completion with circuit breaker protection"""
        return await self.circuit_breaker.call_openai(
            self.client.completions.create,
            *args,
            **kwargs
        )
    
    def get_circuit_breaker_metrics(self) -> Dict[str, Any]:
        """Get circuit breaker metrics"""
        return self.circuit_breaker.get_metrics()
    
    def is_circuit_open(self) -> bool:
        """Check if circuit breaker is open"""
        return self.circuit_breaker.get_state() == CircuitState.OPEN
