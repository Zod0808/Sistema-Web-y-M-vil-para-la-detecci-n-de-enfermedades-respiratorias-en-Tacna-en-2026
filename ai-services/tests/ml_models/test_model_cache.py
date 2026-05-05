"""
Unit tests for LRUModelCache — aligned with real API (get_or_load / remove / clear)
"""

import pytest
import asyncio
from unittest.mock import MagicMock

from ml_models.model_cache import LRUModelCache, get_model_cache


class TestLRUModelCache:
    """Tests for LRUModelCache"""

    @pytest.fixture
    def cache(self, tmp_path):
        return LRUModelCache(max_size=3, max_memory_mb=100, cache_dir=str(tmp_path))

    @pytest.fixture
    def mock_model(self):
        model = MagicMock()
        model.__sizeof__ = lambda self: 1024 * 1024 * 5  # 5 MB
        return model

    # ── initialisation ────────────────────────────────────────────────────────

    def test_cache_initialization(self, cache):
        assert cache.max_size == 3
        assert cache.max_memory_mb == 100
        assert cache.stats['hits'] == 0
        assert cache.stats['misses'] == 0
        assert cache.stats['evictions'] == 0
        assert cache.stats['loads'] == 0

    # ── _get_cache_key ────────────────────────────────────────────────────────

    def test_cache_key_is_deterministic(self, cache):
        k1 = cache._get_cache_key("model1", "bert", version="1.0")
        k2 = cache._get_cache_key("model1", "bert", version="1.0")
        assert k1 == k2

    def test_different_models_have_different_keys(self, cache):
        k1 = cache._get_cache_key("model1", "bert")
        k2 = cache._get_cache_key("model2", "bert")
        assert k1 != k2

    def test_different_types_have_different_keys(self, cache):
        k1 = cache._get_cache_key("model1", "bert")
        k2 = cache._get_cache_key("model1", "gpt")
        assert k1 != k2

    # ── _estimate_memory_mb ───────────────────────────────────────────────────

    def test_estimate_memory_mb_uses_sizeof(self, cache, mock_model):
        memory = cache._estimate_memory_mb(mock_model)
        assert memory > 0
        assert isinstance(memory, float)

    def test_estimate_memory_mb_default_fallback(self, cache):
        # object() has __sizeof__ so the method returns sizeof/1MB (not the 100.0 fallback)
        memory = cache._estimate_memory_mb(object())
        assert isinstance(memory, float)
        assert memory >= 0

    # ── get_or_load — miss path ───────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_get_or_load_miss_calls_loader(self, cache, mock_model):
        calls = []

        def loader():
            calls.append(1)
            return mock_model

        model, was_cached = await cache.get_or_load("model1", "bert", loader)

        assert model is mock_model
        assert was_cached is False
        assert len(calls) == 1
        assert cache.stats['misses'] == 1
        assert cache.stats['loads'] == 1

    @pytest.mark.asyncio
    async def test_get_or_load_miss_increments_stats(self, cache, mock_model):
        await cache.get_or_load("m1", "bert", lambda: mock_model)
        assert cache.stats['misses'] == 1
        assert cache.stats['hits'] == 0

    # ── get_or_load — hit path ────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_get_or_load_hit_returns_cached_model(self, cache, mock_model):
        loader = lambda: mock_model
        await cache.get_or_load("model1", "bert", loader)
        model, was_cached = await cache.get_or_load("model1", "bert", loader)

        assert model is mock_model
        assert was_cached is True
        assert cache.stats['hits'] == 1

    @pytest.mark.asyncio
    async def test_get_or_load_hit_does_not_call_loader_again(self, cache, mock_model):
        calls = []

        def loader():
            calls.append(1)
            return mock_model

        await cache.get_or_load("model1", "bert", loader)
        await cache.get_or_load("model1", "bert", loader)

        assert len(calls) == 1

    # ── LRU eviction ──────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_lru_eviction_on_size_overflow(self, cache, mock_model):
        loader = lambda: mock_model

        # Fill cache to max_size (3)
        for i in range(3):
            await cache.get_or_load(f"model{i}", "bert", loader)

        # Access model0 so model1 becomes the LRU
        await cache.get_or_load("model0", "bert", loader)

        # Add a 4th model → triggers eviction of model1
        await cache.get_or_load("model3", "bert", loader)

        assert cache.stats['evictions'] == 1
        assert len(cache._cache) == 3

    @pytest.mark.asyncio
    async def test_memory_eviction_keeps_within_limit(self, cache):
        large_model = MagicMock()
        large_model.__sizeof__ = lambda self: 1024 * 1024 * 60  # 60 MB

        await cache.get_or_load("large_model", "bert", lambda: large_model)

        assert cache._memory_usage_mb <= cache.max_memory_mb

    # ── remove ────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_remove_deletes_model(self, cache, mock_model):
        await cache.get_or_load("model1", "bert", lambda: mock_model)

        removed = cache.remove("model1", "bert")

        assert removed is True
        assert len(cache._cache) == 0

    def test_remove_nonexistent_returns_false(self, cache):
        assert cache.remove("ghost", "bert") is False

    # ── clear ─────────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_clear_empties_cache(self, cache, mock_model):
        await cache.get_or_load("model1", "bert", lambda: mock_model)
        await cache.get_or_load("model2", "bert", lambda: mock_model)

        cache.clear()

        assert len(cache._cache) == 0
        assert cache._memory_usage_mb == 0.0

    @pytest.mark.asyncio
    async def test_clear_calls_cleanup_on_models(self, cache):
        model = MagicMock()
        model.__sizeof__ = lambda self: 1024

        await cache.get_or_load("m1", "bert", lambda: model)
        cache.clear()

        model.cleanup.assert_called_once()

    # ── get_stats ─────────────────────────────────────────────────────────────

    def test_get_stats_contains_required_keys(self, cache):
        stats = cache.get_stats()
        for key in ('hits', 'misses', 'evictions', 'loads', 'hit_rate',
                    'cache_size', 'memory_usage_mb', 'max_size', 'max_memory_mb'):
            assert key in stats, f"Missing key: {key}"

    @pytest.mark.asyncio
    async def test_get_stats_hit_rate_calculation(self, cache, mock_model):
        loader = lambda: mock_model
        await cache.get_or_load("m1", "bert", loader)   # miss
        await cache.get_or_load("m1", "bert", loader)   # hit

        stats = cache.get_stats()
        assert stats['hit_rate'] == pytest.approx(0.5, rel=1e-3)

    # ── list_cached_models ────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_list_cached_models_returns_info(self, cache, mock_model):
        await cache.get_or_load("model1", "bert", lambda: mock_model)

        models = cache.list_cached_models()

        assert len(models) == 1
        assert models[0]['model_name'] == 'model1'
        assert models[0]['model_type'] == 'bert'
        assert 'memory_mb' in models[0]

    @pytest.mark.asyncio
    async def test_list_cached_models_empty_when_no_models(self, cache):
        assert cache.list_cached_models() == []

    # ── concurrent access ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_concurrent_loads_respect_max_size(self, cache, mock_model):
        async def load(name):
            await cache.get_or_load(name, "bert", lambda: mock_model)

        await asyncio.gather(*[load(f"model{i}") for i in range(5)])

        assert len(cache._cache) <= cache.max_size


class TestGetModelCache:
    """Tests for the global singleton get_model_cache()"""

    def test_returns_singleton(self):
        c1 = get_model_cache()
        c2 = get_model_cache()
        assert c1 is c2

    def test_returns_lru_instance(self):
        assert isinstance(get_model_cache(), LRUModelCache)

    def test_singleton_has_positive_limits(self):
        cache = get_model_cache()
        assert cache.max_size > 0
        assert cache.max_memory_mb > 0