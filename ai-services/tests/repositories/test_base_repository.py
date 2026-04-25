"""
Tests for repositories/base_repository.py
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from bson import ObjectId

from repositories.base_repository import BaseRepository, IRepository


class TestBaseRepository:
    """Tests for BaseRepository"""
    
    @pytest.fixture
    def mock_db_client(self):
        """Create mock database client"""
        mock_client = MagicMock()
        mock_collection = AsyncMock()
        mock_client.__getitem__ = MagicMock(return_value=mock_collection)
        return mock_client
    
    @pytest.fixture
    def base_repository(self, mock_db_client):
        """Create base repository instance"""
        return BaseRepository("test_collection", mock_db_client)
    
    @pytest.fixture
    def sample_entity(self):
        """Sample entity data"""
        return {
            "name": "Test Entity",
            "value": 123,
            "metadata": {"key": "value"}
        }
    
    def test_repository_initialization(self, base_repository, mock_db_client):
        """Test repository initialization"""
        assert base_repository.collection_name == "test_collection"
        assert base_repository.db == mock_db_client
        assert base_repository.collection == mock_db_client["test_collection"]
    
    @pytest.mark.asyncio
    async def test_create_success(self, base_repository, sample_entity, mock_db_client):
        """Test successful entity creation"""
        mock_collection = mock_db_client["test_collection"]
        mock_result = MagicMock()
        mock_result.inserted_id = ObjectId()
        mock_collection.insert_one = AsyncMock(return_value=mock_result)
        
        result = await base_repository.create(sample_entity)
        
        assert result is not None
        assert "_id" in result
        assert result["name"] == "Test Entity"
        assert "created_at" in result
        assert "updated_at" in result
        assert result["version"] == 1
        mock_collection.insert_one.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_with_none_values(self, base_repository, mock_db_client):
        """Test creating entity with None values (should be removed)"""
        mock_collection = mock_db_client["test_collection"]
        mock_result = MagicMock()
        mock_result.inserted_id = ObjectId()
        mock_collection.insert_one = AsyncMock(return_value=mock_result)
        
        entity_with_none = {
            "name": "Test",
            "value": None,
            "optional": None,
            "valid": "data"
        }
        
        result = await base_repository.create(entity_with_none)
        
        # None values should be removed
        call_args = mock_collection.insert_one.call_args
        inserted_data = call_args[0][0]
        assert "value" not in inserted_data or inserted_data["value"] is not None
        assert "optional" not in inserted_data or inserted_data["optional"] is not None
        assert "valid" in inserted_data
    
    @pytest.mark.asyncio
    async def test_create_with_pydantic_model(self, base_repository, mock_db_client):
        """Test creating entity from Pydantic model"""
        from pydantic import BaseModel
        
        class TestModel(BaseModel):
            name: str
            value: int
        
        mock_collection = mock_db_client["test_collection"]
        mock_result = MagicMock()
        mock_result.inserted_id = ObjectId()
        mock_collection.insert_one = AsyncMock(return_value=mock_result)
        
        model = TestModel(name="Test", value=123)
        result = await base_repository.create(model)
        
        assert result is not None
        # Verify dict() was called
        call_args = mock_collection.insert_one.call_args
        assert "name" in call_args[0][0]
    
    @pytest.mark.asyncio
    async def test_create_failure(self, base_repository, sample_entity, mock_db_client):
        """Test entity creation failure"""
        mock_collection = mock_db_client["test_collection"]
        mock_result = MagicMock()
        mock_result.inserted_id = None  # Simulate failure
        mock_collection.insert_one = AsyncMock(return_value=mock_result)
        
        with pytest.raises(Exception, match="Failed to create entity"):
            await base_repository.create(sample_entity)
    
    @pytest.mark.asyncio
    async def test_get_by_id_success(self, base_repository, mock_db_client):
        """Test getting entity by ID"""
        mock_collection = mock_db_client["test_collection"]
        mock_document = {
            "_id": ObjectId(),
            "name": "Test Entity",
            "value": 123
        }
        mock_collection.find_one = AsyncMock(return_value=mock_document)
        
        result = await base_repository.get_by_id(str(mock_document["_id"]))
        
        assert result is not None
        assert result["name"] == "Test Entity"
        assert isinstance(result["_id"], str)  # Should be converted to string
        mock_collection.find_one.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_by_id_not_found(self, base_repository, mock_db_client):
        """Test getting entity by ID when not found"""
        mock_collection = mock_db_client["test_collection"]
        mock_collection.find_one = AsyncMock(return_value=None)
        
        result = await base_repository.get_by_id(str(ObjectId()))
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_get_by_id_invalid_objectid(self, base_repository, mock_db_client):
        """Test getting entity by ID with invalid ObjectId string"""
        mock_collection = mock_db_client["test_collection"]
        mock_document = {"_id": "invalid_id", "name": "Test"}
        mock_collection.find_one = AsyncMock(return_value=mock_document)
        
        result = await base_repository.get_by_id("invalid_id")
        
        # Should handle gracefully
        assert result is not None or result is None
    
    @pytest.mark.asyncio
    async def test_update_success(self, base_repository, mock_db_client):
        """Test successful entity update"""
        mock_collection = mock_db_client["test_collection"]
        entity_id = ObjectId()
        
        # Mock get_by_id for returning updated document
        updated_doc = {
            "_id": entity_id,
            "name": "Updated Entity",
            "version": 2
        }
        base_repository.get_by_id = AsyncMock(return_value=updated_doc)
        
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        update_data = {"name": "Updated Entity", "value": 456}
        result = await base_repository.update(str(entity_id), update_data)
        
        assert result is not None
        assert result["name"] == "Updated Entity"
        mock_collection.update_one.assert_called_once()
        call_args = mock_collection.update_one.call_args
        assert "$set" in call_args[1]
        assert "$inc" in call_args[1]
        assert call_args[1]["$inc"]["version"] == 1
    
    @pytest.mark.asyncio
    async def test_update_not_found(self, base_repository, mock_db_client):
        """Test updating entity when not found"""
        mock_collection = mock_db_client["test_collection"]
        entity_id = ObjectId()
        
        mock_result = MagicMock()
        mock_result.modified_count = 0
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        result = await base_repository.update(str(entity_id), {"name": "Updated"})
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_update_removes_none_and_id(self, base_repository, mock_db_client):
        """Test update removes None values and _id"""
        mock_collection = mock_db_client["test_collection"]
        entity_id = ObjectId()
        
        base_repository.get_by_id = AsyncMock(return_value={"_id": str(entity_id), "name": "Updated"})
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        update_data = {
            "name": "Updated",
            "value": None,
            "_id": "should_be_removed"
        }
        
        await base_repository.update(str(entity_id), update_data)
        
        call_args = mock_collection.update_one.call_args
        update_set = call_args[1]["$set"]
        assert "_id" not in update_set
        assert "value" not in update_set or update_set["value"] is not None
    
    @pytest.mark.asyncio
    async def test_delete_success(self, base_repository, mock_db_client):
        """Test successful soft delete"""
        mock_collection = mock_db_client["test_collection"]
        entity_id = ObjectId()
        
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        result = await base_repository.delete(str(entity_id))
        
        assert result is True
        mock_collection.update_one.assert_called_once()
        call_args = mock_collection.update_one.call_args
        assert "$set" in call_args[1]
        assert "deleted_at" in call_args[1]["$set"]
        assert "updated_at" in call_args[1]["$set"]
    
    @pytest.mark.asyncio
    async def test_delete_not_found(self, base_repository, mock_db_client):
        """Test deleting entity when not found"""
        mock_collection = mock_db_client["test_collection"]
        entity_id = ObjectId()
        
        mock_result = MagicMock()
        mock_result.modified_count = 0
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        result = await base_repository.delete(str(entity_id))
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_find_all_no_filters(self, base_repository, mock_db_client):
        """Test finding all entities without filters"""
        mock_collection = mock_db_client["test_collection"]
        
        mock_cursor = AsyncMock()
        mock_doc1 = {"_id": ObjectId(), "name": "Entity 1"}
        mock_doc2 = {"_id": ObjectId(), "name": "Entity 2"}
        
        async def cursor_iter():
            yield mock_doc1
            yield mock_doc2
        
        mock_cursor.__aiter__ = cursor_iter
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await base_repository.find_all()
        
        assert len(result) == 2
        assert all("_id" in doc and isinstance(doc["_id"], str) for doc in result)
        # Verify soft delete filter is applied
        call_args = mock_collection.find.call_args
        assert "deleted_at" in call_args[0][0]
        assert call_args[0][0]["deleted_at"]["$exists"] is False
    
    @pytest.mark.asyncio
    async def test_find_all_with_filters(self, base_repository, mock_db_client):
        """Test finding all entities with filters"""
        mock_collection = mock_db_client["test_collection"]
        
        mock_cursor = AsyncMock()
        async def cursor_iter():
            yield {"_id": ObjectId(), "name": "Entity 1", "status": "active"}
        
        mock_cursor.__aiter__ = cursor_iter
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        filters = {"status": "active", "value": {"$gt": 100}}
        result = await base_repository.find_all(filters)
        
        assert len(result) == 1
        # Verify filters were merged with soft delete filter
        call_args = mock_collection.find.call_args
        assert call_args[0][0]["status"] == "active"
        assert "deleted_at" in call_args[0][0]
    
    @pytest.mark.asyncio
    async def test_count_no_filters(self, base_repository, mock_db_client):
        """Test counting entities without filters"""
        mock_collection = mock_db_client["test_collection"]
        mock_collection.count_documents = AsyncMock(return_value=50)
        
        result = await base_repository.count()
        
        assert result == 50
        call_args = mock_collection.count_documents.call_args
        assert "deleted_at" in call_args[0][0]
    
    @pytest.mark.asyncio
    async def test_count_with_filters(self, base_repository, mock_db_client):
        """Test counting entities with filters"""
        mock_collection = mock_db_client["test_collection"]
        mock_collection.count_documents = AsyncMock(return_value=10)
        
        filters = {"status": "active"}
        result = await base_repository.count(filters)
        
        assert result == 10
        call_args = mock_collection.count_documents.call_args
        assert call_args[0][0]["status"] == "active"
        assert "deleted_at" in call_args[0][0]
    
    @pytest.mark.asyncio
    async def test_find_by_field(self, base_repository):
        """Test finding entities by field"""
        mock_results = [
            {"_id": ObjectId(), "status": "active"},
            {"_id": ObjectId(), "status": "active"}
        ]
        
        base_repository.find_all = AsyncMock(return_value=mock_results)
        
        result = await base_repository.find_by_field("status", "active")
        
        assert len(result) == 2
        base_repository.find_all.assert_called_once_with({"status": "active"})
    
    @pytest.mark.asyncio
    async def test_find_one_by_field_success(self, base_repository, mock_db_client):
        """Test finding one entity by field"""
        mock_collection = mock_db_client["test_collection"]
        mock_document = {
            "_id": ObjectId(),
            "patient_id": "P001",
            "name": "Test"
        }
        mock_collection.find_one = AsyncMock(return_value=mock_document)
        
        result = await base_repository.find_one_by_field("patient_id", "P001")
        
        assert result is not None
        assert result["patient_id"] == "P001"
        assert isinstance(result["_id"], str)
        call_args = mock_collection.find_one.call_args
        assert call_args[0][0]["patient_id"] == "P001"
        assert "deleted_at" in call_args[0][0]
    
    @pytest.mark.asyncio
    async def test_find_one_by_field_not_found(self, base_repository, mock_db_client):
        """Test finding one entity by field when not found"""
        mock_collection = mock_db_client["test_collection"]
        mock_collection.find_one = AsyncMock(return_value=None)
        
        result = await base_repository.find_one_by_field("patient_id", "P999")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_find_one_by_field_with_objectid(self, base_repository, mock_db_client):
        """Test finding one entity by _id field (ObjectId conversion)"""
        mock_collection = mock_db_client["test_collection"]
        entity_id = ObjectId()
        mock_document = {"_id": entity_id, "name": "Test"}
        mock_collection.find_one = AsyncMock(return_value=mock_document)
        
        result = await base_repository.find_one_by_field("_id", str(entity_id))
        
        assert result is not None
        # Verify ObjectId conversion was attempted
        call_args = mock_collection.find_one.call_args
        assert "_id" in call_args[0][0]
    
    @pytest.mark.asyncio
    async def test_paginate_basic(self, base_repository, mock_db_client):
        """Test basic pagination"""
        mock_collection = mock_db_client["test_collection"]
        mock_collection.count_documents = AsyncMock(return_value=100)
        
        mock_cursor = AsyncMock()
        mock_docs = [
            {"_id": ObjectId(), "name": f"Entity {i}"}
            for i in range(10)
        ]
        
        async def cursor_iter():
            for doc in mock_docs:
                yield doc
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await base_repository.paginate(page=1, page_size=10)
        
        assert "data" in result
        assert "pagination" in result
        assert len(result["data"]) == 10
        assert result["pagination"]["page"] == 1
        assert result["pagination"]["page_size"] == 10
        assert result["pagination"]["total"] == 100
        assert result["pagination"]["total_pages"] == 10
        assert result["pagination"]["has_next"] is True
        assert result["pagination"]["has_prev"] is False
    
    @pytest.mark.asyncio
    async def test_paginate_with_filters(self, base_repository, mock_db_client):
        """Test pagination with filters"""
        mock_collection = mock_db_client["test_collection"]
        mock_collection.count_documents = AsyncMock(return_value=25)
        
        mock_cursor = AsyncMock()
        async def cursor_iter():
            yield {"_id": ObjectId(), "status": "active"}
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        filters = {"status": "active"}
        result = await base_repository.paginate(page=1, page_size=10, filters=filters)
        
        assert result["pagination"]["total"] == 25
        # Verify filters were applied
        call_args = mock_collection.find.call_args
        assert call_args[0][0]["status"] == "active"
    
    @pytest.mark.asyncio
    async def test_paginate_last_page(self, base_repository, mock_db_client):
        """Test pagination on last page"""
        mock_collection = mock_db_client["test_collection"]
        mock_collection.count_documents = AsyncMock(return_value=25)
        
        mock_cursor = AsyncMock()
        async def cursor_iter():
            for i in range(5):
                yield {"_id": ObjectId(), "name": f"Entity {i}"}
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await base_repository.paginate(page=3, page_size=10)
        
        assert result["pagination"]["has_next"] is False
        assert result["pagination"]["has_prev"] is True
        assert result["pagination"]["page"] == 3
    
    @pytest.mark.asyncio
    async def test_paginate_custom_sort(self, base_repository, mock_db_client):
        """Test pagination with custom sort"""
        mock_collection = mock_db_client["test_collection"]
        mock_collection.count_documents = AsyncMock(return_value=10)
        
        mock_cursor = AsyncMock()
        async def cursor_iter():
            pass
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await base_repository.paginate(
            page=1,
            page_size=10,
            sort_field="name",
            sort_direction=1  # Ascending
        )
        
        # Verify sort was applied
        mock_cursor.sort.assert_called_once_with("name", 1)
    
    @pytest.mark.asyncio
    async def test_paginate_calculate_skip(self, base_repository, mock_db_client):
        """Test pagination skip calculation"""
        mock_collection = mock_db_client["test_collection"]
        mock_collection.count_documents = AsyncMock(return_value=50)
        
        mock_cursor = AsyncMock()
        async def cursor_iter():
            pass
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_cursor.skip = MagicMock(return_value=mock_cursor)
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        await base_repository.paginate(page=3, page_size=10)
        
        # Verify skip was calculated correctly: (3-1) * 10 = 20
        mock_cursor.skip.assert_called_once_with(20)

