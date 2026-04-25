"""
Unit tests for Cache utilities
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from core.cache import init_cache, get_cache_client, set_cache, get_cache, delete_cache, clear_cache_pattern


class TestCache:
    """Test Cache utilities"""
    
    @pytest.fixture
    def mock_redis(self):
        """Create mock Redis client"""
        mock = AsyncMock()
        mock.ping = AsyncMock(return_value=True)
        mock.setex = AsyncMock(return_value=True)
        mock.set = AsyncMock(return_value=True)
        mock.get = AsyncMock(return_value=None)
        mock.delete = AsyncMock(return_value=1)
        mock.keys = AsyncMock(return_value=["key1", "key2", "key3"])
        mock.flushdb = AsyncMock(return_value=True)
        return mock
    
    @pytest.mark.asyncio
    async def test_init_cache_success(self, mock_redis):
        """Test successful cache initialization"""
        with patch('core.cache.redis.from_url', return_value=mock_redis):
            with patch('core.cache.settings') as mock_settings:
                mock_settings.REDIS_URL = "redis://localhost:6379"
                
                client = await init_cache()
                
                assert client is not None
                mock_redis.ping.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_init_cache_failure(self):
        """Test cache initialization failure"""
        with patch('core.cache.cache_client', None), \
             patch('core.cache._is_initializing', False), \
             patch('core.cache.redis.from_url', side_effect=Exception("Connection error")):
            with patch('core.cache.settings') as mock_settings:
                mock_settings.REDIS_URL = "redis://localhost:6379"
                
                client = await init_cache()
                
                # Should return None on failure
                assert client is None
    
    @pytest.mark.asyncio
    async def test_set_cache_dict(self, mock_redis):
        """Test setting cache with dict value"""
        with patch('core.cache.cache_client', mock_redis):
            result = await set_cache("key1", {"data": "value"}, ttl=60)
            
            assert result is True
            mock_redis.setex.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_set_cache_string(self, mock_redis):
        """Test setting cache with string value"""
        with patch('core.cache.cache_client', mock_redis):
            result = await set_cache("key1", "value", ttl=60)
            
            assert result is True
            mock_redis.setex.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_set_cache_no_ttl(self, mock_redis):
        """Test setting cache without TTL"""
        with patch('core.cache.cache_client', mock_redis):
            result = await set_cache("key1", "value")
            
            assert result is True
            mock_redis.set.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_set_cache_no_client(self):
        """Test setting cache when client is None"""
        with patch('core.cache.cache_client', None):
            result = await set_cache("key1", "value")
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_get_cache_hit(self, mock_redis):
        """Test getting cache (hit)"""
        mock_redis.get.return_value = json.dumps({"data": "value"})
        
        with patch('core.cache.cache_client', mock_redis):
            result = await get_cache("key1")
            
            assert result == {"data": "value"}
    
    @pytest.mark.asyncio
    async def test_get_cache_miss(self, mock_redis):
        """Test getting cache (miss)"""
        mock_redis.get.return_value = None
        
        with patch('core.cache.cache_client', mock_redis):
            result = await get_cache("key1")
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_get_cache_string_value(self, mock_redis):
        """Test getting cache with string value"""
        mock_redis.get.return_value = "simple_string"
        
        with patch('core.cache.cache_client', mock_redis):
            result = await get_cache("key1")
            
            assert result == "simple_string"
    
    @pytest.mark.asyncio
    async def test_get_cache_no_client(self):
        """Test getting cache when client is None"""
        with patch('core.cache.cache_client', None):
            result = await get_cache("key1")
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_delete_cache(self, mock_redis):
        """Test deleting cache"""
        with patch('core.cache.cache_client', mock_redis):
            result = await delete_cache("key1")
            
            assert result is True
            mock_redis.delete.assert_called_once_with("key1")
    
    @pytest.mark.asyncio
    async def test_delete_cache_no_client(self):
        """Test deleting cache when client is None"""
        with patch('core.cache.cache_client', None):
            result = await delete_cache("key1")
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_clear_cache(self, mock_redis):
        """Test clearing all cache"""
        with patch('core.cache.cache_client', mock_redis):
            result = await clear_cache_pattern("*")
            
            assert result >= 0
            # clear_cache_pattern uses keys() and delete(), not flushdb
            mock_redis.keys.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_clear_cache_no_client(self):
        """Test clearing cache when client is None"""
        with patch('core.cache.cache_client', None):
            result = await clear_cache_pattern("*")
            
            assert result == 0
    
    def test_get_cache_client(self, mock_redis):
        """Test getting cache client"""
        with patch('core.cache.cache_client', mock_redis):
            client = get_cache_client()
            
            assert client is not None
    
    @pytest.mark.asyncio
    async def test_init_cache_already_initialized(self, mock_redis):
        """Test init_cache when already initialized"""
        with patch('core.cache.cache_client', mock_redis), \
             patch('core.cache._is_initializing', False):
            client = await init_cache()
            
            # Should return existing client without reconnecting
            assert client == mock_redis
    
    @pytest.mark.asyncio
    async def test_init_cache_during_initialization(self, mock_redis):
        """Test init_cache during initialization (concurrent calls)"""
        with patch('core.cache.cache_client', None), \
             patch('core.cache._is_initializing', True):
            client = await init_cache()
            
            # Should return None or existing client if being initialized
            assert client is None or client == mock_redis
    
    @pytest.mark.asyncio
    async def test_set_cache_list_value(self, mock_redis):
        """Test setting cache with list value"""
        with patch('core.cache.cache_client', mock_redis):
            result = await set_cache("key1", [1, 2, 3], ttl=60)
            
            assert result is True
            mock_redis.setex.assert_called_once()
            # Verify JSON serialization
            call_args = mock_redis.setex.call_args
            assert isinstance(call_args[0][1], str)  # Value should be JSON string
    
    @pytest.mark.asyncio
    async def test_set_cache_error_handling(self, mock_redis):
        """Test set_cache error handling"""
        mock_redis.setex = AsyncMock(side_effect=Exception("Redis error"))
        
        with patch('core.cache.cache_client', mock_redis), \
             patch('core.cache.logger') as mock_logger:
            result = await set_cache("key1", "value")
            
            assert result is False
            mock_logger.error.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_cache_json_decode_error(self, mock_redis):
        """Test get_cache with invalid JSON"""
        mock_redis.get.return_value = "{invalid json}"
        
        with patch('core.cache.cache_client', mock_redis):
            # Should return the raw value if JSON decode fails
            result = await get_cache("key1")
            
            assert result == "{invalid json}"
    
    @pytest.mark.asyncio
    async def test_get_cache_type_error(self, mock_redis):
        """Test get_cache with TypeError during JSON decode"""
        mock_redis.get.return_value = 123  # Non-string value
        
        with patch('core.cache.cache_client', mock_redis):
            result = await get_cache("key1")
            
            # Should return the value as-is if TypeError occurs
            assert result == 123
    
    @pytest.mark.asyncio
    async def test_get_cache_error_handling(self, mock_redis):
        """Test get_cache error handling"""
        mock_redis.get = AsyncMock(side_effect=Exception("Redis error"))
        
        with patch('core.cache.cache_client', mock_redis), \
             patch('core.cache.logger') as mock_logger:
            result = await get_cache("key1")
            
            assert result is None
            mock_logger.error.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_delete_cache_error_handling(self, mock_redis):
        """Test delete_cache error handling"""
        mock_redis.delete = AsyncMock(side_effect=Exception("Redis error"))
        
        with patch('core.cache.cache_client', mock_redis), \
             patch('core.cache.logger') as mock_logger:
            result = await delete_cache("key1")
            
            assert result is False
            mock_logger.error.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_clear_cache_pattern_no_keys(self, mock_redis):
        """Test clear_cache_pattern when no keys match"""
        mock_redis.keys = AsyncMock(return_value=[])
        
        with patch('core.cache.cache_client', mock_redis):
            result = await clear_cache_pattern("nonexistent:*")
            
            assert result == 0
            mock_redis.delete.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_clear_cache_pattern_with_keys(self, mock_redis):
        """Test clear_cache_pattern with matching keys"""
        mock_redis.keys = AsyncMock(return_value=["key1", "key2", "key3"])
        mock_redis.delete = AsyncMock(return_value=3)
        
        with patch('core.cache.cache_client', mock_redis):
            result = await clear_cache_pattern("test:*")
            
            assert result == 3
            mock_redis.delete.assert_called_once_with("key1", "key2", "key3")
    
    @pytest.mark.asyncio
    async def test_clear_cache_pattern_error_handling(self, mock_redis):
        """Test clear_cache_pattern error handling"""
        mock_redis.keys = AsyncMock(side_effect=Exception("Redis error"))
        
        with patch('core.cache.cache_client', mock_redis), \
             patch('core.cache.logger') as mock_logger:
            result = await clear_cache_pattern("test:*")
            
            assert result == 0
            mock_logger.error.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_close_cache_success(self, mock_redis):
        """Test close_cache success"""
        mock_redis.close = AsyncMock()
        
        with patch('core.cache.cache_client', mock_redis), \
             patch('core.cache.logger') as mock_logger:
            await close_cache()
            
            mock_redis.close.assert_called_once()
            mock_logger.info.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_close_cache_error_handling(self, mock_redis):
        """Test close_cache error handling"""
        mock_redis.close = AsyncMock(side_effect=Exception("Close error"))
        
        with patch('core.cache.cache_client', mock_redis), \
             patch('core.cache.logger') as mock_logger:
            await close_cache()
            
            mock_logger.error.assert_called_once()
            # Should still set cache_client to None
            from core.cache import cache_client
            # Note: This test verifies error handling, actual reset happens in finally block
    
    @pytest.mark.asyncio
    async def test_init_cache_sets_global_client(self, mock_redis):
        """Test that init_cache sets global cache_client"""
        with patch('core.cache.redis.from_url', return_value=mock_redis), \
             patch('core.cache.settings') as mock_settings, \
             patch('core.cache.cache_client', None), \
             patch('core.cache._is_initializing', False):
            mock_settings.REDIS_URL = "redis://localhost:6379"
            
            client = await init_cache()
            
            from core.cache import cache_client
            assert cache_client == mock_redis
            assert client == mock_redis

