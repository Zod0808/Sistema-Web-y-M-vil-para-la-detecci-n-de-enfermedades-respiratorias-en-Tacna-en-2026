"""
Cache Decorator Implementation
"""

import asyncio
import json
import hashlib
from functools import wraps
from typing import Any, Optional, Callable
import structlog
from core.cache import get_cache, set_cache

logger = structlog.get_logger()


class CacheDecorator:
    """Decorator for adding caching functionality to methods"""
    
    def __init__(self, ttl: int = 3600, key_prefix: str = ""):
        self.ttl = ttl
        self.key_prefix = key_prefix
    
    def __call__(self, func: Callable) -> Callable:
        """Apply cache decorator to function"""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = self._generate_cache_key(func.__name__, args, kwargs)
            
            try:
                # Try to get from cache
                cached_result = await get_cache(cache_key)
                if cached_result is not None:
                    logger.debug("Cache hit", 
                                function=func.__name__,
                                cache_key=cache_key)
                    return json.loads(cached_result) if isinstance(cached_result, str) else cached_result
                
                # Cache miss, execute function
                logger.debug("Cache miss", 
                            function=func.__name__,
                            cache_key=cache_key)
                
                result = await func(*args, **kwargs)
                
                # Store in cache
                await set_cache(cache_key, result, ttl=self.ttl)
                
                return result
                
            except Exception as e:
                logger.error("Cache decorator error", 
                            function=func.__name__,
                            error=str(e))
                # If caching fails, still execute the function
                return await func(*args, **kwargs)
        
        return wrapper
    
    def _generate_cache_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Generate cache key from function name and arguments"""
        # Create a hash of the arguments
        key_data = {
            "func": func_name,
            "args": args,
            "kwargs": kwargs
        }
        
        # Convert to JSON string and hash
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        
        # Add prefix if specified
        if self.key_prefix:
            return f"{self.key_prefix}:{key_hash}"
        
        return f"cache:{func_name}:{key_hash}"


def with_cache(ttl: int = 3600, key_prefix: str = ""):
    """Decorator function for adding caching to methods"""
    def decorator(func: Callable) -> Callable:
        cache_decorator = CacheDecorator(ttl=ttl, key_prefix=key_prefix)
        return cache_decorator(func)
    return decorator


# Backwards compatibility helper expected by pruebas antiguas
def cache_decorator(ttl: int = 3600, key_prefix: str = ""):
    """
    Mantiene compatibilidad con la versión anterior donde `cache_decorator`
    devolvía directamente el decorador configurado.
    """
    return with_cache(ttl=ttl, key_prefix=key_prefix)


class ConditionalCacheDecorator:
    """Decorator for conditional caching based on function result"""
    
    def __init__(self, ttl: int = 3600, condition_func: Optional[Callable] = None):
        self.ttl = ttl
        self.condition_func = condition_func or (lambda x: True)
    
    def __call__(self, func: Callable) -> Callable:
        """Apply conditional cache decorator to function"""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = self._generate_cache_key(func.__name__, args, kwargs)
            
            try:
                # Try to get from cache
                cached_result = await get_cache(cache_key)
                if cached_result is not None:
                    logger.debug("Conditional cache hit", 
                                function=func.__name__,
                                cache_key=cache_key)
                    return json.loads(cached_result) if isinstance(cached_result, str) else cached_result
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Check if result should be cached
                if self.condition_func(result):
                    await set_cache(cache_key, result, ttl=self.ttl)
                    logger.debug("Result cached", 
                                function=func.__name__,
                                cache_key=cache_key)
                else:
                    logger.debug("Result not cached due to condition", 
                                function=func.__name__,
                                cache_key=cache_key)
                
                return result
                
            except Exception as e:
                logger.error("Conditional cache decorator error", 
                            function=func.__name__,
                            error=str(e))
                return await func(*args, **kwargs)
        
        return wrapper
    
    def _generate_cache_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Generate cache key from function name and arguments"""
        key_data = {
            "func": func_name,
            "args": args,
            "kwargs": kwargs
        }
        
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        
        return f"conditional_cache:{func_name}:{key_hash}"


def with_conditional_cache(ttl: int = 3600, condition_func: Optional[Callable] = None):
    """Decorator for conditional caching"""
    def decorator(func: Callable) -> Callable:
        cache_decorator = ConditionalCacheDecorator(ttl=ttl, condition_func=condition_func)
        return cache_decorator(func)
    return decorator


class CacheInvalidationDecorator:
    """Decorator for cache invalidation"""
    
    def __init__(self, invalidate_patterns: list):
        self.invalidate_patterns = invalidate_patterns
    
    def __call__(self, func: Callable) -> Callable:
        """Apply cache invalidation decorator to function"""
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                # Execute function
                result = await func(*args, **kwargs)
                
                # Invalidate cache patterns
                await self._invalidate_cache_patterns()
                
                return result
                
            except Exception as e:
                logger.error("Cache invalidation decorator error", 
                            function=func.__name__,
                            error=str(e))
                raise
        
        return wrapper
    
    async def _invalidate_cache_patterns(self):
        """Invalidate cache patterns"""
        # This would implement cache invalidation logic
        # For now, just log the patterns
        logger.info("Cache invalidation triggered", 
                   patterns=self.invalidate_patterns)


def with_cache_invalidation(invalidate_patterns: list):
    """Decorator for cache invalidation"""
    def decorator(func: Callable) -> Callable:
        invalidation_decorator = CacheInvalidationDecorator(invalidate_patterns)
        return invalidation_decorator(func)
    return decorator
