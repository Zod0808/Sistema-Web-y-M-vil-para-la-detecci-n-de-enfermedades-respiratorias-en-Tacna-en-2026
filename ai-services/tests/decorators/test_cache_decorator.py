"""
Tests for decorators/cache_decorator.py
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

from decorators.cache_decorator import (
    CacheDecorator,
    with_cache,
    ConditionalCacheDecorator,
    with_conditional_cache,
    CacheInvalidationDecorator,
    with_cache_invalidation
)


class TestCacheDecorator:
    """Tests for CacheDecorator"""
    
    @pytest.fixture
    def cache_store(self):
        """Create in-memory cache store for testing"""
        return {}
    
    @pytest.fixture
    def mock_cache_functions(self, cache_store):
        """Create mock cache functions"""
        async def mock_get_cache(key):
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            if isinstance(value, (dict, list)):
                cache_store[key] = json.dumps(value)
            else:
                cache_store[key] = value
            return True
        
        return mock_get_cache, mock_set_cache
    
    @pytest.mark.asyncio
    async def test_cache_hit(self, cache_store, mock_cache_functions):
        """Test cache decorator with cache hit"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600, key_prefix="test")
            
            @decorator
            async def test_func(x: int, y: int) -> int:
                return x + y
            
            # First call - cache miss
            result1 = await test_func(2, 3)
            assert result1 == 5
            assert len(cache_store) == 1
            
            # Second call - cache hit
            result2 = await test_func(2, 3)
            assert result2 == 5
            assert len(cache_store) == 1  # Still one entry
    
    @pytest.mark.asyncio
    async def test_cache_miss_different_arguments(self, cache_store, mock_cache_functions):
        """Test cache decorator with different arguments (cache miss)"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600)
            
            @decorator
            async def test_func(x: int) -> int:
                return x * 2
            
            result1 = await test_func(5)
            result2 = await test_func(10)
            
            assert result1 == 10
            assert result2 == 20
            assert len(cache_store) == 2  # Different arguments = different cache keys
    
    @pytest.mark.asyncio
    async def test_cache_key_generation(self, cache_store, mock_cache_functions):
        """Test cache key generation"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600, key_prefix="test_prefix")
            
            @decorator
            async def test_func(x: int) -> int:
                return x * 2
            
            await test_func(5)
            
            # Verify cache key has prefix
            cache_keys = list(cache_store.keys())
            assert len(cache_keys) == 1
            assert cache_keys[0].startswith("test_prefix:")
    
    @pytest.mark.asyncio
    async def test_cache_key_without_prefix(self, cache_store, mock_cache_functions):
        """Test cache key generation without prefix"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600)
            
            @decorator
            async def test_func(x: int) -> int:
                return x * 2
            
            await test_func(5)
            
            # Verify cache key format
            cache_keys = list(cache_store.keys())
            assert len(cache_keys) == 1
            assert cache_keys[0].startswith("cache:test_func:")
    
    @pytest.mark.asyncio
    async def test_cache_with_dict_result(self, cache_store, mock_cache_functions):
        """Test cache decorator with dictionary result"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600)
            
            @decorator
            async def test_func() -> dict:
                return {"result": "success", "value": 42}
            
            result1 = await test_func()
            result2 = await test_func()
            
            assert result1 == {"result": "success", "value": 42}
            assert result2 == {"result": "success", "value": 42}
            # Verify cached value is JSON string
            cache_keys = list(cache_store.keys())
            assert isinstance(cache_store[cache_keys[0]], str)
    
    @pytest.mark.asyncio
    async def test_cache_error_fallback(self, mock_cache_functions):
        """Test cache decorator falls back to function execution on cache error"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        mock_get_cache.side_effect = Exception("Cache error")
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600)
            
            @decorator
            async def test_func(x: int) -> int:
                return x * 2
            
            # Should still execute function even if cache fails
            result = await test_func(5)
            assert result == 10
    
    @pytest.mark.asyncio
    async def test_cache_set_error_fallback(self, cache_store, mock_cache_functions):
        """Test cache decorator continues on set_cache error"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        mock_set_cache.side_effect = Exception("Set cache error")
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600)
            
            @decorator
            async def test_func(x: int) -> int:
                return x * 2
            
            # Should still return result even if set_cache fails
            result = await test_func(5)
            assert result == 10
    
    @pytest.mark.asyncio
    async def test_cache_with_kwargs(self, cache_store, mock_cache_functions):
        """Test cache decorator with keyword arguments"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = CacheDecorator(ttl=3600)
            
            @decorator
            async def test_func(x: int, y: int = 10) -> int:
                return x + y
            
            result1 = await test_func(5, y=10)
            result2 = await test_func(5, y=10)  # Same kwargs - cache hit
            result3 = await test_func(5, y=20)  # Different kwargs - cache miss
            
            assert result1 == 15
            assert result2 == 15
            assert result3 == 25
            assert len(cache_store) == 2  # Two different argument combinations
    
    def test_with_cache_decorator_function(self):
        """Test with_cache decorator function"""
        @with_cache(ttl=3600, key_prefix="test")
        async def test_func(x: int) -> int:
            return x * 2
        
        assert asyncio.iscoroutinefunction(test_func)


class TestConditionalCacheDecorator:
    """Tests for ConditionalCacheDecorator"""
    
    @pytest.fixture
    def cache_store(self):
        """Create in-memory cache store"""
        return {}
    
    @pytest.fixture
    def mock_cache_functions(self, cache_store):
        """Create mock cache functions"""
        async def mock_get_cache(key):
            return cache_store.get(key)
        
        async def mock_set_cache(key, value, ttl=None):
            if isinstance(value, (dict, list)):
                cache_store[key] = json.dumps(value)
            else:
                cache_store[key] = value
            return True
        
        return mock_get_cache, mock_set_cache
    
    @pytest.mark.asyncio
    async def test_conditional_cache_cache_when_condition_true(self, cache_store, mock_cache_functions):
        """Test conditional cache when condition is True"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        
        def should_cache(result):
            return result.get("cacheable", False) if isinstance(result, dict) else False
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = ConditionalCacheDecorator(ttl=3600, condition_func=should_cache)
            
            @decorator
            async def test_func() -> dict:
                return {"cacheable": True, "value": 42}
            
            result1 = await test_func()
            result2 = await test_func()
            
            assert result1 == {"cacheable": True, "value": 42}
            assert result2 == {"cacheable": True, "value": 42}
            assert len(cache_store) == 1  # Should be cached
    
    @pytest.mark.asyncio
    async def test_conditional_cache_not_cache_when_condition_false(self, cache_store, mock_cache_functions):
        """Test conditional cache when condition is False"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        
        def should_cache(result):
            return result.get("cacheable", False) if isinstance(result, dict) else False
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = ConditionalCacheDecorator(ttl=3600, condition_func=should_cache)
            
            @decorator
            async def test_func() -> dict:
                return {"cacheable": False, "value": 42}
            
            result1 = await test_func()
            result2 = await test_func()
            
            assert result1 == {"cacheable": False, "value": 42}
            assert result2 == {"cacheable": False, "value": 42}
            assert len(cache_store) == 0  # Should not be cached
    
    @pytest.mark.asyncio
    async def test_conditional_cache_default_condition(self, cache_store, mock_cache_functions):
        """Test conditional cache with default condition (always cache)"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = ConditionalCacheDecorator(ttl=3600)  # No condition = always cache
            
            @decorator
            async def test_func() -> str:
                return "result"
            
            result1 = await test_func()
            result2 = await test_func()
            
            assert result1 == "result"
            assert result2 == "result"
            assert len(cache_store) == 1  # Should be cached
    
    @pytest.mark.asyncio
    async def test_conditional_cache_error_fallback(self, mock_cache_functions):
        """Test conditional cache falls back on error"""
        mock_get_cache, mock_set_cache = mock_cache_functions
        mock_get_cache.side_effect = Exception("Cache error")
        
        with patch('decorators.cache_decorator.get_cache', side_effect=mock_get_cache), \
             patch('decorators.cache_decorator.set_cache', side_effect=mock_set_cache):
            
            decorator = ConditionalCacheDecorator(ttl=3600)
            
            @decorator
            async def test_func() -> str:
                return "result"
            
            result = await test_func()
            assert result == "result"
    
    def test_with_conditional_cache_decorator_function(self):
        """Test with_conditional_cache decorator function"""
        def should_cache(result):
            return True
        
        @with_conditional_cache(ttl=3600, condition_func=should_cache)
        async def test_func():
            return "result"
        
        assert asyncio.iscoroutinefunction(test_func)


class TestCacheInvalidationDecorator:
    """Tests for CacheInvalidationDecorator"""
    
    @pytest.fixture
    def invalidation_decorator(self):
        """Create cache invalidation decorator"""
        return CacheInvalidationDecorator(invalidate_patterns=["pattern1", "pattern2"])
    
    @pytest.mark.asyncio
    async def test_cache_invalidation_on_success(self, invalidation_decorator):
        """Test cache invalidation decorator on successful execution"""
        @invalidation_decorator
        async def test_func(x: int) -> int:
            return x * 2
        
        result = await test_func(5)
        
        assert result == 10
        # Invalidation should be triggered (logged)
    
    @pytest.mark.asyncio
    async def test_cache_invalidation_on_error(self, invalidation_decorator):
        """Test cache invalidation decorator on error"""
        @invalidation_decorator
        async def test_func() -> int:
            raise ValueError("Error")
        
        with pytest.raises(ValueError, match="Error"):
            await test_func()
    
    @pytest.mark.asyncio
    async def test_cache_invalidation_with_multiple_patterns(self):
        """Test cache invalidation with multiple patterns"""
        decorator = CacheInvalidationDecorator(
            invalidate_patterns=["user:*", "session:*", "cache:*"]
        )
        
        @decorator
        async def test_func() -> str:
            return "result"
        
        result = await test_func()
        assert result == "result"
    
    def test_with_cache_invalidation_decorator_function(self):
        """Test with_cache_invalidation decorator function"""
        @with_cache_invalidation(invalidate_patterns=["pattern1"])
        async def test_func():
            return "result"
        
        assert asyncio.iscoroutinefunction(test_func)

