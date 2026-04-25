"""
Tests extendidos para core/cache.py para aumentar cobertura
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from core.cache import (
    init_cache, get_cache_client, set_cache, get_cache,
    delete_cache, clear_cache_pattern, close_cache
)


class TestCacheExtended:
    """Tests extendidos para cache"""
    
    @pytest.mark.asyncio
    async def test_init_cache_already_initialized(self):
        """Test init_cache cuando ya está inicializado"""
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        
        with patch('core.cache.cache_client', mock_redis):
            result = await init_cache()
            assert result == mock_redis
    
    @pytest.mark.asyncio
    async def test_init_cache_during_initialization(self):
        """Test init_cache durante inicialización"""
        with patch('core.cache._is_initializing', True):
            with patch('core.cache.cache_client', None):
                result = await init_cache()
                assert result is None
    
    @pytest.mark.asyncio
    async def test_init_cache_success(self):
        """Test init_cache exitoso"""
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        
        with patch('core.cache.cache_client', None), \
             patch('core.cache._is_initializing', False), \
             patch('core.cache.redis.from_url', return_value=mock_redis), \
             patch('core.cache.settings') as mock_settings:
            mock_settings.REDIS_URL = "redis://localhost:6379"
            
            result = await init_cache()
            assert result == mock_redis
            mock_redis.ping.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_set_cache_with_dict_value(self):
        """Test set_cache con valor tipo dict"""
        mock_redis = AsyncMock()
        mock_redis.setex = AsyncMock(return_value=True)
        
        with patch('core.cache.cache_client', mock_redis):
            result = await set_cache("test_key", {"key": "value"}, ttl=3600)
            assert result is True
            mock_redis.setex.assert_called_once()
            # Verificar que el valor fue serializado a JSON
            call_args = mock_redis.setex.call_args
            assert call_args[0][0] == "test_key"
            assert json.loads(call_args[0][2]) == {"key": "value"}
    
    @pytest.mark.asyncio
    async def test_set_cache_with_list_value(self):
        """Test set_cache con valor tipo list"""
        mock_redis = AsyncMock()
        mock_redis.setex = AsyncMock(return_value=True)
        
        with patch('core.cache.cache_client', mock_redis):
            result = await set_cache("test_key", [1, 2, 3], ttl=3600)
            assert result is True
            mock_redis.setex.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_set_cache_without_ttl(self):
        """Test set_cache sin TTL"""
        mock_redis = AsyncMock()
        mock_redis.set = AsyncMock(return_value=True)
        
        with patch('core.cache.cache_client', mock_redis):
            result = await set_cache("test_key", "test_value")
            assert result is True
            mock_redis.set.assert_called_once_with("test_key", "test_value")
    
    @pytest.mark.asyncio
    async def test_get_cache_with_json_value(self):
        """Test get_cache con valor JSON"""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value='{"key": "value"}')
        
        with patch('core.cache.cache_client', mock_redis):
            result = await get_cache("test_key")
            assert result == {"key": "value"}
    
    @pytest.mark.asyncio
    async def test_get_cache_with_string_value(self):
        """Test get_cache con valor string"""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="test_value")
        
        with patch('core.cache.cache_client', mock_redis):
            result = await get_cache("test_key")
            assert result == "test_value"
    
    @pytest.mark.asyncio
    async def test_get_cache_with_invalid_json(self):
        """Test get_cache con JSON inválido"""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="invalid json{")
        
        with patch('core.cache.cache_client', mock_redis):
            result = await get_cache("test_key")
            # Debe retornar el valor sin parsear si el JSON es inválido
            assert result == "invalid json{"
    
    @pytest.mark.asyncio
    async def test_get_cache_with_none_value(self):
        """Test get_cache cuando el valor es None"""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=None)
        
        with patch('core.cache.cache_client', mock_redis):
            result = await get_cache("test_key")
            assert result is None
    
    @pytest.mark.asyncio
    async def test_delete_cache_success(self):
        """Test delete_cache exitoso"""
        mock_redis = AsyncMock()
        mock_redis.delete = AsyncMock(return_value=1)
        
        with patch('core.cache.cache_client', mock_redis):
            result = await delete_cache("test_key")
            assert result is True
            mock_redis.delete.assert_called_once_with("test_key")
    
    @pytest.mark.asyncio
    async def test_delete_cache_with_exception(self):
        """Test delete_cache con excepción"""
        mock_redis = AsyncMock()
        mock_redis.delete = AsyncMock(side_effect=Exception("Redis error"))
        
        with patch('core.cache.cache_client', mock_redis):
            result = await delete_cache("test_key")
            assert result is False
    
    @pytest.mark.asyncio
    async def test_clear_cache_pattern_with_keys(self):
        """Test clear_cache_pattern con keys encontradas"""
        mock_redis = AsyncMock()
        mock_redis.keys = AsyncMock(return_value=["key1", "key2", "key3"])
        mock_redis.delete = AsyncMock(return_value=3)
        
        with patch('core.cache.cache_client', mock_redis):
            result = await clear_cache_pattern("test:*")
            assert result == 3
            mock_redis.keys.assert_called_once_with("test:*")
            mock_redis.delete.assert_called_once_with("key1", "key2", "key3")
    
    @pytest.mark.asyncio
    async def test_clear_cache_pattern_no_keys(self):
        """Test clear_cache_pattern sin keys encontradas"""
        mock_redis = AsyncMock()
        mock_redis.keys = AsyncMock(return_value=[])
        
        with patch('core.cache.cache_client', mock_redis):
            result = await clear_cache_pattern("test:*")
            assert result == 0
    
    @pytest.mark.asyncio
    async def test_clear_cache_pattern_with_exception(self):
        """Test clear_cache_pattern con excepción"""
        mock_redis = AsyncMock()
        mock_redis.keys = AsyncMock(side_effect=Exception("Redis error"))
        
        with patch('core.cache.cache_client', mock_redis):
            result = await clear_cache_pattern("test:*")
            assert result == 0
    
    @pytest.mark.asyncio
    async def test_close_cache_success(self):
        """Test close_cache exitoso"""
        mock_redis = AsyncMock()
        mock_redis.close = AsyncMock(return_value=None)
        
        with patch('core.cache.cache_client', mock_redis):
            await close_cache()
            mock_redis.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_close_cache_with_exception(self):
        """Test close_cache con excepción"""
        mock_redis = AsyncMock()
        mock_redis.close = AsyncMock(side_effect=Exception("Close error"))
        
        with patch('core.cache.cache_client', mock_redis):
            # No debe lanzar excepción
            await close_cache()
            mock_redis.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_close_cache_with_none_client(self):
        """Test close_cache cuando el cliente es None"""
        with patch('core.cache.cache_client', None):
            # No debe lanzar excepción
            await close_cache()
    
    def test_get_cache_client_with_client(self):
        """Test get_cache_client cuando hay cliente"""
        mock_redis = AsyncMock()
        with patch('core.cache.cache_client', mock_redis):
            result = get_cache_client()
            assert result == mock_redis
    
    def test_get_cache_client_without_client(self):
        """Test get_cache_client cuando no hay cliente"""
        with patch('core.cache.cache_client', None):
            result = get_cache_client()
            assert result is None

