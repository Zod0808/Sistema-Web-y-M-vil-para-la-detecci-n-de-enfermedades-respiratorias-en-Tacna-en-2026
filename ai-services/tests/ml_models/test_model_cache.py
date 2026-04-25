"""
Unit tests for LRUModelCache
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import asyncio
from pathlib import Path
import tempfile

from ml_models.model_cache import LRUModelCache, get_model_cache


class TestLRUModelCache:
    """Test LRUModelCache implementation"""
    
    @pytest.fixture
    def temp_cache_dir(self):
        """Create temporary cache directory"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir
    
    @pytest.fixture
    def cache(self, temp_cache_dir):
        """Create cache instance"""
        return LRUModelCache(max_size=3, max_memory_mb=100, cache_dir=temp_cache_dir)
    
    @pytest.fixture
    def mock_model(self):
        """Create mock model"""
        model = MagicMock()
        model.__sizeof__ = lambda self: 1024 * 1024 * 10  # 10 MB
        return model
    
    def test_cache_initialization(self, cache):
        """Test cache initialization"""
        assert cache.max_size == 3
        assert cache.max_memory_mb == 100
        assert cache.stats['hits'] == 0
        assert cache.stats['misses'] == 0
    
    def test_get_cache_key(self, cache):
        """Test cache key generation"""
        key1 = cache._get_cache_key("model1", "bert", version="1.0")
        key2 = cache._get_cache_key("model1", "bert", version="1.0")
        key3 = cache._get_cache_key("model2", "bert", version="1.0")
        
        assert key1 == key2
        assert key1 != key3
    
    def test_estimate_memory_mb(self, cache, mock_model):
        """Test memory estimation"""
        memory = cache._estimate_memory_mb(mock_model)
        assert memory > 0
        assert isinstance(memory, float)
    
    def test_estimate_memory_mb_default(self, cache):
        """Test memory estimation with default fallback"""
        obj = object()
        memory = cache._estimate_memory_mb(obj)
        assert memory == 100.0  # Default
    
    @pytest.mark.asyncio
    async def test_add_model(self, cache, mock_model):
        """Test adding model to cache"""
        await cache.add_model("model1", "bert", mock_model)
        
        assert len(cache._cache) == 1
        assert cache.stats['loads'] == 1
    
    @pytest.mark.asyncio
    async def test_get_model_hit(self, cache, mock_model):
        """Test getting model from cache (hit)"""
        await cache.add_model("model1", "bert", mock_model)
        
        result = await cache.get_model("model1", "bert")
        
        assert result is not None
        assert cache.stats['hits'] == 1
        assert cache.stats['misses'] == 0
    
    @pytest.mark.asyncio
    async def test_get_model_miss(self, cache):
        """Test getting model from cache (miss)"""
        result = await cache.get_model("model1", "bert")
        
        assert result is None
        assert cache.stats['misses'] == 1
    
    @pytest.mark.asyncio
    async def test_lru_eviction(self, cache, mock_model):
        """Test LRU eviction when cache is full"""
        # Add models up to max_size
        for i in range(3):
            await cache.add_model(f"model{i}", "bert", mock_model)
        
        # Access first model to update LRU
        await cache.get_model("model0", "bert")
        
        # Add one more to trigger eviction
        await cache.add_model("model3", "bert", mock_model)
        
        # model1 should be evicted (least recently used)
        result = await cache.get_model("model1", "bert")
        assert result is None
        assert cache.stats['evictions'] == 1
    
    @pytest.mark.asyncio
    async def test_memory_eviction(self, cache, mock_model):
        """Test memory-based eviction"""
        # Create large model
        large_model = MagicMock()
        large_model.__sizeof__ = lambda self: 1024 * 1024 * 60  # 60 MB
        
        await cache.add_model("large_model", "bert", large_model)
        
        # Should trigger eviction if over limit
        assert cache._memory_usage_mb <= cache.max_memory_mb
    
    @pytest.mark.asyncio
    async def test_remove_model(self, cache, mock_model):
        """Test removing model from cache"""
        await cache.add_model("model1", "bert", mock_model)
        
        await cache.remove_model("model1", "bert")
        
        result = await cache.get_model("model1", "bert")
        assert result is None
    
    def test_get_stats(self, cache):
        """Test getting cache statistics"""
        stats = cache.get_stats()
        
        assert 'hits' in stats
        assert 'misses' in stats
        assert 'evictions' in stats
        assert 'loads' in stats
        assert 'hit_rate' in stats
    
    def test_clear_cache(self, cache, mock_model):
        """Test clearing cache"""
        asyncio.run(cache.add_model("model1", "bert", mock_model))
        
        cache.clear_cache()
        
        assert len(cache._cache) == 0
        assert cache._memory_usage_mb == 0.0
    
    @pytest.mark.asyncio
    async def test_concurrent_access(self, cache, mock_model):
        """Test concurrent access to cache"""
        async def add_model(i):
            await cache.add_model(f"model{i}", "bert", mock_model)
        
        # Add models concurrently
        await asyncio.gather(*[add_model(i) for i in range(5)])
        
        # Should handle concurrent access
        assert len(cache._cache) <= cache.max_size


class TestGetModelCache:
    """Test get_model_cache function"""
    
    def test_get_model_cache_singleton(self):
        """Test that get_model_cache returns singleton"""
        cache1 = get_model_cache()
        cache2 = get_model_cache()
        
        assert cache1 is cache2
    
    def test_get_model_cache_custom_params(self):
        """Test get_model_cache with custom parameters"""
        cache = get_model_cache(max_size=10, max_memory_mb=500)
        
        assert cache.max_size == 10
        assert cache.max_memory_mb == 500

