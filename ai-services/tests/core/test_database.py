"""
Tests para core/database.py
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from core.database import init_database, create_indexes, get_database, close_database


class TestDatabase:
    """Tests para database utilities"""
    
    @pytest.fixture
    def mock_motor_client(self):
        """Create mock Motor client"""
        mock_client = AsyncMock()
        mock_client.admin = AsyncMock()
        mock_client.admin.command = AsyncMock(return_value={"ok": 1})
        mock_client.respicare = MagicMock()
        mock_client.close = MagicMock()
        return mock_client
    
    @pytest.mark.asyncio
    async def test_init_database_success(self, mock_motor_client):
        """Test init_database exitoso"""
        with patch('core.database.motor.motor_asyncio.AsyncIOMotorClient', return_value=mock_motor_client), \
             patch('core.database.settings') as mock_settings, \
             patch('core.database.create_indexes', new_callable=AsyncMock) as mock_create_indexes:
            mock_settings.DATABASE_URL = "mongodb://localhost:27017/test"
            
            await init_database()
            
            mock_motor_client.admin.command.assert_called_once_with('ping')
            mock_create_indexes.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_init_database_failure(self, mock_motor_client):
        """Test init_database con error de conexión"""
        mock_motor_client.admin.command = AsyncMock(side_effect=Exception("Connection error"))
        
        with patch('core.database.motor.motor_asyncio.AsyncIOMotorClient', return_value=mock_motor_client), \
             patch('core.database.settings') as mock_settings:
            mock_settings.DATABASE_URL = "mongodb://localhost:27017/test"
            
            with pytest.raises(Exception):
                await init_database()
    
    @pytest.mark.asyncio
    async def test_create_indexes_success(self):
        """Test create_indexes exitoso"""
        mock_database = MagicMock()
        mock_collection1 = AsyncMock()
        mock_collection2 = AsyncMock()
        mock_collection3 = AsyncMock()
        
        mock_database.medical_histories = mock_collection1
        mock_database.symptoms = mock_collection2
        mock_database.ai_results = mock_collection3
        
        with patch('core.database.database', mock_database):
            await create_indexes()
            
            # Verificar que se crearon los índices
            assert mock_collection1.create_index.call_count == 3
            assert mock_collection2.create_index.call_count == 3
            assert mock_collection3.create_index.call_count == 3
    
    @pytest.mark.asyncio
    async def test_create_indexes_with_exception(self):
        """Test create_indexes con excepción"""
        mock_database = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.create_index = AsyncMock(side_effect=Exception("Index error"))
        
        mock_database.medical_histories = mock_collection
        mock_database.symptoms = mock_collection
        mock_database.ai_results = mock_collection
        
        with patch('core.database.database', mock_database):
            # No debe lanzar excepción, solo loguear el error
            await create_indexes()
    
    @pytest.mark.asyncio
    async def test_get_database_success(self):
        """Test get_database cuando database está inicializado"""
        mock_database = MagicMock()
        
        with patch('core.database.database', mock_database):
            result = await get_database()
            assert result == mock_database
    
    @pytest.mark.asyncio
    async def test_get_database_not_initialized(self):
        """Test get_database cuando database no está inicializado"""
        with patch('core.database.database', None):
            with pytest.raises(HTTPException) as exc_info:
                await get_database()
            assert exc_info.value.status_code == 500
            assert "Database not initialized" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_close_database_success(self, mock_motor_client):
        """Test close_database exitoso"""
        with patch('core.database.client', mock_motor_client):
            await close_database()
            mock_motor_client.close.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_close_database_without_client(self):
        """Test close_database cuando no hay cliente"""
        with patch('core.database.client', None):
            # No debe lanzar excepción
            await close_database()
    
    @pytest.mark.asyncio
    async def test_init_database_sets_global_variables(self, mock_motor_client):
        """Test que init_database establece las variables globales"""
        with patch('core.database.motor.motor_asyncio.AsyncIOMotorClient', return_value=mock_motor_client), \
             patch('core.database.settings') as mock_settings, \
             patch('core.database.create_indexes', new_callable=AsyncMock):
            mock_settings.DATABASE_URL = "mongodb://localhost:27017/test"
            
            await init_database()
            
            from core.database import client, database
            assert client == mock_motor_client
            assert database == mock_motor_client.respicare
    
    @pytest.mark.asyncio
    async def test_create_indexes_all_collections(self):
        """Test que create_indexes crea índices en todas las colecciones"""
        mock_database = MagicMock()
        mock_medical = AsyncMock()
        mock_symptoms = AsyncMock()
        mock_ai_results = AsyncMock()
        
        mock_database.medical_histories = mock_medical
        mock_database.symptoms = mock_symptoms
        mock_database.ai_results = mock_ai_results
        
        with patch('core.database.database', mock_database):
            await create_indexes()
            
            # Verificar índices en medical_histories
            assert mock_medical.create_index.call_count == 3
            mock_medical.create_index.assert_any_call("patient_id")
            mock_medical.create_index.assert_any_call("date")
            mock_medical.create_index.assert_any_call("diagnosis")
            
            # Verificar índices en symptoms
            assert mock_symptoms.create_index.call_count == 3
            mock_symptoms.create_index.assert_any_call("patient_id")
            mock_symptoms.create_index.assert_any_call("timestamp")
            mock_symptoms.create_index.assert_any_call("severity")
            
            # Verificar índices en ai_results
            assert mock_ai_results.create_index.call_count == 3
            mock_ai_results.create_index.assert_any_call("patient_id")
            mock_ai_results.create_index.assert_any_call("type")
            mock_ai_results.create_index.assert_any_call("created_at")
    
    @pytest.mark.asyncio
    async def test_get_database_returns_correct_instance(self):
        """Test que get_database retorna la instancia correcta"""
        mock_database = MagicMock()
        mock_database.name = "respicare"
        
        with patch('core.database.database', mock_database):
            result = await get_database()
            
            assert result == mock_database
            assert result.name == "respicare"
    
    @pytest.mark.asyncio
    async def test_close_database_logs_message(self, mock_motor_client):
        """Test que close_database registra mensaje de log"""
        with patch('core.database.client', mock_motor_client), \
             patch('core.database.logger') as mock_logger:
            await close_database()
            
            mock_motor_client.close.assert_called_once()
            # Verificar que se registró el mensaje
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_init_database_logs_success(self, mock_motor_client):
        """Test que init_database registra éxito"""
        with patch('core.database.motor.motor_asyncio.AsyncIOMotorClient', return_value=mock_motor_client), \
             patch('core.database.settings') as mock_settings, \
             patch('core.database.create_indexes', new_callable=AsyncMock), \
             patch('core.database.logger') as mock_logger:
            mock_settings.DATABASE_URL = "mongodb://localhost:27017/test"
            
            await init_database()
            
            # Verificar que se registró el mensaje de éxito
            assert mock_logger.info.called
    
    @pytest.mark.asyncio
    async def test_init_database_logs_error(self, mock_motor_client):
        """Test que init_database registra error"""
        mock_motor_client.admin.command = AsyncMock(side_effect=Exception("Connection failed"))
        
        with patch('core.database.motor.motor_asyncio.AsyncIOMotorClient', return_value=mock_motor_client), \
             patch('core.database.settings') as mock_settings, \
             patch('core.database.logger') as mock_logger:
            mock_settings.DATABASE_URL = "mongodb://localhost:27017/test"
            
            with pytest.raises(Exception):
                await init_database()
            
            # Verificar que se registró el error
            assert mock_logger.error.called

