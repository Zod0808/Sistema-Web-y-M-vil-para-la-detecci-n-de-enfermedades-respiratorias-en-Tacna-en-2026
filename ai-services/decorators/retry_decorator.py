"""
Retry Decorator Implementation
"""

import asyncio
import random
from functools import wraps
from typing import Any, Optional, Callable, List, Type
import structlog

logger = structlog.get_logger()


class RetryDecorator:
    """Decorator for adding retry functionality to methods"""
    
    def __init__(
        self,
        max_attempts: int = 3,
        delay: float = 1.0,
        backoff_multiplier: float = 2.0,
        max_delay: float = 60.0,
        exceptions: tuple = (Exception,),
        jitter: bool = True
    ):
        self.max_attempts = max_attempts
        self.delay = delay
        self.backoff_multiplier = backoff_multiplier
        self.max_delay = max_delay
        self.exceptions = exceptions
        self.jitter = jitter
    
    def __call__(self, func: Callable) -> Callable:
        """Apply retry decorator to function"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._retry_execution(func, args, kwargs, is_async=True)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._retry_execution(func, args, kwargs, is_async=False)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _retry_execution(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Execute function with retry logic"""
        last_exception = None
        current_delay = self.delay
        
        for attempt in range(1, self.max_attempts + 1):
            try:
                # Execute function
                if is_async:
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                
                # Success - log if it took multiple attempts
                if attempt > 1:
                    logger.info("Function succeeded after retries",
                               function=func.__name__,
                               attempts=attempt)
                
                return result
                
            except self.exceptions as e:
                last_exception = e
                
                # Log the attempt
                logger.warning("Function attempt failed",
                              function=func.__name__,
                              attempt=attempt,
                              max_attempts=self.max_attempts,
                              error=str(e),
                              error_type=type(e).__name__)
                
                # Don't retry on last attempt
                if attempt == self.max_attempts:
                    logger.error("Function failed after all retries",
                                function=func.__name__,
                                attempts=attempt,
                                error=str(e))
                    break
                
                # Calculate delay for next attempt
                if attempt < self.max_attempts:
                    await self._wait_before_retry(current_delay, attempt)
                    current_delay = min(
                        current_delay * self.backoff_multiplier,
                        self.max_delay
                    )
        
        # All attempts failed
        raise last_exception
    
    async def _wait_before_retry(self, delay: float, attempt: int):
        """Wait before retry with optional jitter"""
        if self.jitter:
            # Add random jitter to avoid thundering herd
            jitter = random.uniform(0.1, 0.3) * delay
            actual_delay = delay + jitter
        else:
            actual_delay = delay
        
        logger.debug("Waiting before retry",
                     delay=actual_delay,
                     attempt=attempt)
        
        await asyncio.sleep(actual_delay)


def with_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff_multiplier: float = 2.0,
    max_delay: float = 60.0,
    exceptions: tuple = (Exception,),
    jitter: bool = True
):
    """Decorator function for adding retry functionality to methods"""
    def decorator(func: Callable) -> Callable:
        retry_decorator = RetryDecorator(
            max_attempts=max_attempts,
            delay=delay,
            backoff_multiplier=backoff_multiplier,
            max_delay=max_delay,
            exceptions=exceptions,
            jitter=jitter
        )
        return retry_decorator(func)
    return decorator


class ExponentialBackoffRetry:
    """Retry decorator with exponential backoff and custom retry conditions"""
    
    def __init__(
        self,
        max_attempts: int = 5,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exceptions: tuple = (Exception,),
        retry_condition: Optional[Callable] = None
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exceptions = exceptions
        self.retry_condition = retry_condition
    
    def __call__(self, func: Callable) -> Callable:
        """Apply exponential backoff retry decorator to function"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._retry_with_exponential_backoff(func, args, kwargs, is_async=True)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._retry_with_exponential_backoff(func, args, kwargs, is_async=False)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _retry_with_exponential_backoff(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Execute function with exponential backoff retry"""
        last_exception = None
        
        for attempt in range(1, self.max_attempts + 1):
            try:
                # Execute function
                if is_async:
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                
                # Check custom retry condition
                if self.retry_condition and not self.retry_condition(result):
                    if attempt > 1:
                        logger.info("Function succeeded after retries",
                                   function=func.__name__,
                                   attempts=attempt)
                    return result
                elif not self.retry_condition:
                    # No custom condition, success
                    if attempt > 1:
                        logger.info("Function succeeded after retries",
                                   function=func.__name__,
                                   attempts=attempt)
                    return result
                
                # Custom condition failed, treat as failure
                raise Exception(f"Custom retry condition failed for {func.__name__}")
                
            except self.exceptions as e:
                last_exception = e
                
                logger.warning("Function attempt failed",
                              function=func.__name__,
                              attempt=attempt,
                              max_attempts=self.max_attempts,
                              error=str(e))
                
                # Don't retry on last attempt
                if attempt == self.max_attempts:
                    logger.error("Function failed after all retries",
                                function=func.__name__,
                                attempts=attempt,
                                error=str(e))
                    break
                
                # Calculate exponential backoff delay
                if attempt < self.max_attempts:
                    delay = min(
                        self.base_delay * (2 ** (attempt - 1)),
                        self.max_delay
                    )
                    
                    # Add jitter
                    jitter = random.uniform(0.1, 0.3) * delay
                    actual_delay = delay + jitter
                    
                    logger.debug("Waiting before retry",
                                 delay=actual_delay,
                                 attempt=attempt)
                    
                    await asyncio.sleep(actual_delay)
        
        # All attempts failed
        raise last_exception


def with_exponential_backoff_retry(
    max_attempts: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: tuple = (Exception,),
    retry_condition: Optional[Callable] = None
):
    """Decorator for exponential backoff retry"""
    def decorator(func: Callable) -> Callable:
        retry_decorator = ExponentialBackoffRetry(
            max_attempts=max_attempts,
            base_delay=base_delay,
            max_delay=max_delay,
            exceptions=exceptions,
            retry_condition=retry_condition
        )
        return retry_decorator(func)
    return decorator


class ConditionalRetry:
    """Retry decorator that only retries under certain conditions"""
    
    def __init__(
        self,
        max_attempts: int = 3,
        delay: float = 1.0,
        should_retry: Optional[Callable] = None,
        exceptions: tuple = (Exception,)
    ):
        self.max_attempts = max_attempts
        self.delay = delay
        self.should_retry = should_retry or (lambda e: True)
        self.exceptions = exceptions
    
    def __call__(self, func: Callable) -> Callable:
        """Apply conditional retry decorator to function"""
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await self._conditional_retry(func, args, kwargs, is_async=True)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return self._conditional_retry(func, args, kwargs, is_async=False)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    async def _conditional_retry(self, func: Callable, args: tuple, kwargs: dict, is_async: bool = True):
        """Execute function with conditional retry logic"""
        last_exception = None
        
        for attempt in range(1, self.max_attempts + 1):
            try:
                # Execute function
                if is_async:
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                
                return result
                
            except self.exceptions as e:
                last_exception = e
                
                # Check if we should retry this exception
                if not self.should_retry(e):
                    logger.info("Not retrying due to condition",
                               function=func.__name__,
                               error=str(e))
                    raise e
                
                logger.warning("Function attempt failed (will retry)",
                              function=func.__name__,
                              attempt=attempt,
                              max_attempts=self.max_attempts,
                              error=str(e))
                
                # Don't retry on last attempt
                if attempt == self.max_attempts:
                    logger.error("Function failed after all retries",
                                function=func.__name__,
                                attempts=attempt,
                                error=str(e))
                    break
                
                # Wait before retry
                if attempt < self.max_attempts:
                    await asyncio.sleep(self.delay)
        
        # All attempts failed
        raise last_exception


def with_conditional_retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    should_retry: Optional[Callable] = None,
    exceptions: tuple = (Exception,)
):
    """Decorator for conditional retry"""
    def decorator(func: Callable) -> Callable:
        retry_decorator = ConditionalRetry(
            max_attempts=max_attempts,
            delay=delay,
            should_retry=should_retry,
            exceptions=exceptions
        )
        return retry_decorator(func)
    return decorator
