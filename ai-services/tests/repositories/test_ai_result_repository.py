"""
Tests for repositories/ai_result_repository.py
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from bson import ObjectId

from repositories.ai_result_repository import AIResultRepository


class TestAIResultRepository:
    """Tests for AIResultRepository"""
    
    @pytest.fixture
    def mock_db_client(self):
        """Create mock database client"""
        mock_client = MagicMock()
        mock_collection = AsyncMock()
        mock_client.__getitem__ = MagicMock(return_value=mock_collection)
        return mock_client
    
    @pytest.fixture
    def ai_result_repository(self, mock_db_client):
        """Create AI result repository instance"""
        return AIResultRepository(mock_db_client)
    
    @pytest.fixture
    def sample_result_data(self):
        """Sample AI result data"""
        return {
            "patient_id": "P001",
            "type": "symptom_analysis",
            "data": {
                "disease": "Influenza B",
                "confidence": 0.85,
                "urgency": "media"
            }
        }
    
    @pytest.mark.asyncio
    async def test_create_ai_result_success(self, ai_result_repository, sample_result_data, mock_db_client):
        """Test successful AI result creation"""
        mock_collection = mock_db_client["ai_results"]
        mock_result = MagicMock()
        mock_result.inserted_id = ObjectId()
        mock_collection.insert_one = AsyncMock(return_value=mock_result)
        
        result = await ai_result_repository.create_ai_result(sample_result_data)
        
        assert result is not None
        assert "_id" in result
        assert result["status"] == "completed"
        assert "processing_time_ms" in result
        assert "model_version" in result
        assert "strategy_used" in result
        assert "confidence_score" in result
        mock_collection.insert_one.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_ai_result_missing_required_fields(self, ai_result_repository):
        """Test AI result creation with missing required fields"""
        incomplete_data = {
            "patient_id": "P001"
            # Missing type and data
        }
        
        with pytest.raises(ValueError, match="Missing required field"):
            await ai_result_repository.create_ai_result(incomplete_data)
    
    @pytest.mark.asyncio
    async def test_create_ai_result_missing_patient_id(self, ai_result_repository):
        """Test AI result creation with missing patient_id"""
        incomplete_data = {
            "type": "symptom_analysis",
            "data": {}
            # Missing patient_id
        }
        
        with pytest.raises(ValueError, match="Missing required field: patient_id"):
            await ai_result_repository.create_ai_result(incomplete_data)
    
    @pytest.mark.asyncio
    async def test_get_by_patient_id(self, ai_result_repository):
        """Test getting AI results by patient_id"""
        mock_results = [
            {"_id": ObjectId(), "patient_id": "P001", "type": "symptom_analysis"},
            {"_id": ObjectId(), "patient_id": "P001", "type": "medical_history"}
        ]
        
        ai_result_repository.find_by_field = AsyncMock(return_value=mock_results)
        
        result = await ai_result_repository.get_by_patient_id("P001")
        
        assert len(result) == 2
        assert all(r["patient_id"] == "P001" for r in result)
        ai_result_repository.find_by_field.assert_called_once_with("patient_id", "P001")
    
    @pytest.mark.asyncio
    async def test_get_by_type(self, ai_result_repository):
        """Test getting AI results by type"""
        mock_results = [
            {"_id": ObjectId(), "type": "symptom_analysis", "patient_id": "P001"},
            {"_id": ObjectId(), "type": "symptom_analysis", "patient_id": "P002"}
        ]
        
        ai_result_repository.find_by_field = AsyncMock(return_value=mock_results)
        
        result = await ai_result_repository.get_by_type("symptom_analysis")
        
        assert len(result) == 2
        assert all(r["type"] == "symptom_analysis" for r in result)
    
    @pytest.mark.asyncio
    async def test_get_patient_results_by_type(self, ai_result_repository, mock_db_client):
        """Test getting patient results by type"""
        mock_collection = mock_db_client["ai_results"]
        
        mock_cursor = AsyncMock()
        mock_doc1 = {
            "_id": ObjectId(),
            "patient_id": "P001",
            "type": "symptom_analysis",
            "created_at": datetime.utcnow()
        }
        mock_doc2 = {
            "_id": ObjectId(),
            "patient_id": "P001",
            "type": "symptom_analysis",
            "created_at": datetime.utcnow() - timedelta(days=1)
        }
        
        async def cursor_iter():
            yield mock_doc1
            yield mock_doc2
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await ai_result_repository.get_patient_results_by_type("P001", "symptom_analysis")
        
        assert len(result) == 2
        assert all(r["patient_id"] == "P001" and r["type"] == "symptom_analysis" for r in result)
        # Verify query structure
        call_args = mock_collection.find.call_args
        assert call_args[0][0]["patient_id"] == "P001"
        assert call_args[0][0]["type"] == "symptom_analysis"
    
    @pytest.mark.asyncio
    async def test_get_recent_results(self, ai_result_repository, mock_db_client):
        """Test getting recent AI results"""
        mock_collection = mock_db_client["ai_results"]
        
        mock_cursor = AsyncMock()
        mock_doc = {
            "_id": ObjectId(),
            "patient_id": "P001",
            "created_at": datetime.utcnow()
        }
        
        async def cursor_iter():
            yield mock_doc
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await ai_result_repository.get_recent_results("P001", days=30)
        
        assert len(result) == 1
        # Verify date filter
        call_args = mock_collection.find.call_args
        assert "created_at" in call_args[0][0]
        assert "$gte" in call_args[0][0]["created_at"]
    
    @pytest.mark.asyncio
    async def test_get_recent_results_custom_days(self, ai_result_repository, mock_db_client):
        """Test getting recent results with custom days"""
        mock_collection = mock_db_client["ai_results"]
        
        mock_cursor = AsyncMock()
        async def cursor_iter():
            pass
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        await ai_result_repository.get_recent_results("P001", days=7)
        
        # Verify cutoff date is correct
        call_args = mock_collection.find.call_args
        cutoff_date = call_args[0][0]["created_at"]["$gte"]
        expected_cutoff = datetime.utcnow() - timedelta(days=7)
        assert (cutoff_date - expected_cutoff).total_seconds() < 1  # Within 1 second
    
    @pytest.mark.asyncio
    async def test_get_high_confidence_results(self, ai_result_repository, mock_db_client):
        """Test getting high confidence results"""
        mock_collection = mock_db_client["ai_results"]
        
        mock_cursor = AsyncMock()
        mock_doc1 = {"_id": ObjectId(), "confidence_score": 0.9, "patient_id": "P001"}
        mock_doc2 = {"_id": ObjectId(), "confidence_score": 0.85, "patient_id": "P002"}
        
        async def cursor_iter():
            yield mock_doc1
            yield mock_doc2
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await ai_result_repository.get_high_confidence_results(confidence_threshold=0.8)
        
        assert len(result) == 2
        assert all(r["confidence_score"] >= 0.8 for r in result)
        # Verify query structure
        call_args = mock_collection.find.call_args
        assert "confidence_score" in call_args[0][0]
        assert call_args[0][0]["confidence_score"]["$gte"] == 0.8
    
    @pytest.mark.asyncio
    async def test_get_high_confidence_results_custom_threshold(self, ai_result_repository, mock_db_client):
        """Test getting high confidence results with custom threshold"""
        mock_collection = mock_db_client["ai_results"]
        
        mock_cursor = AsyncMock()
        async def cursor_iter():
            yield {"_id": ObjectId(), "confidence_score": 0.95}
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await ai_result_repository.get_high_confidence_results(confidence_threshold=0.9)
        
        assert len(result) == 1
        call_args = mock_collection.find.call_args
        assert call_args[0][0]["confidence_score"]["$gte"] == 0.9
    
    @pytest.mark.asyncio
    async def test_get_results_by_strategy(self, ai_result_repository):
        """Test getting results by strategy"""
        mock_results = [
            {"_id": ObjectId(), "strategy_used": "openai", "patient_id": "P001"},
            {"_id": ObjectId(), "strategy_used": "openai", "patient_id": "P002"}
        ]
        
        ai_result_repository.find_by_field = AsyncMock(return_value=mock_results)
        
        result = await ai_result_repository.get_results_by_strategy("openai")
        
        assert len(result) == 2
        assert all(r["strategy_used"] == "openai" for r in result)
    
    @pytest.mark.asyncio
    async def test_get_performance_metrics(self, ai_result_repository, mock_db_client):
        """Test getting performance metrics"""
        mock_collection = mock_db_client["ai_results"]
        
        # Mock count
        ai_result_repository.count = AsyncMock(return_value=100)
        mock_collection.count_documents = AsyncMock(return_value=50)
        
        # Mock aggregate pipelines
        async def confidence_aggregate():
            yield {"_id": "symptom_analysis", "avg_confidence": 0.85, "count": 50}
            yield {"_id": "medical_history", "avg_confidence": 0.80, "count": 50}
        
        async def processing_aggregate():
            yield {"_id": "openai", "avg_processing_time": 1500.5, "count": 30}
            yield {"_id": "rule_based", "avg_processing_time": 200.2, "count": 70}
        
        async def type_aggregate():
            yield {"_id": "symptom_analysis", "count": 60}
            yield {"_id": "medical_history", "count": 40}
        
        mock_collection.aggregate = AsyncMock(side_effect=[
            confidence_aggregate(),
            processing_aggregate(),
            type_aggregate()
        ])
        
        result = await ai_result_repository.get_performance_metrics()
        
        assert "confidence_by_type" in result
        assert "processing_by_strategy" in result
        assert "results_by_type" in result
        assert "recent_activity_24h" in result
        assert "total_results" in result
        assert result["total_results"] == 100
    
    @pytest.mark.asyncio
    async def test_get_performance_metrics_with_date_range(self, ai_result_repository, mock_db_client):
        """Test getting performance metrics with date range"""
        mock_collection = mock_db_client["ai_results"]
        
        start_date = datetime.utcnow() - timedelta(days=7)
        end_date = datetime.utcnow()
        
        ai_result_repository.count = AsyncMock(return_value=50)
        mock_collection.count_documents = AsyncMock(return_value=25)
        
        async def empty_aggregate():
            return
            yield  # Make it a generator
        
        mock_collection.aggregate = AsyncMock(side_effect=[
            empty_aggregate(),
            empty_aggregate(),
            empty_aggregate()
        ])
        
        result = await ai_result_repository.get_performance_metrics(
            start_date=start_date,
            end_date=end_date
        )
        
        assert "confidence_by_type" in result
        assert "total_results" in result
    
    @pytest.mark.asyncio
    async def test_get_error_results(self, ai_result_repository, mock_db_client):
        """Test getting error results"""
        mock_collection = mock_db_client["ai_results"]
        
        mock_cursor = AsyncMock()
        mock_doc1 = {
            "_id": ObjectId(),
            "confidence_score": 0.3,  # Low confidence
            "patient_id": "P001"
        }
        mock_doc2 = {
            "_id": ObjectId(),
            "status": "error",
            "error": "Processing failed",
            "patient_id": "P002"
        }
        
        async def cursor_iter():
            yield mock_doc1
            yield mock_doc2
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await ai_result_repository.get_error_results()
        
        assert len(result) == 2
        # Verify query structure
        call_args = mock_collection.find.call_args
        assert "$or" in call_args[0][0]
    
    @pytest.mark.asyncio
    async def test_cleanup_old_results(self, ai_result_repository, mock_db_client):
        """Test cleaning up old results"""
        mock_collection = mock_db_client["ai_results"]
        
        mock_result = MagicMock()
        mock_result.modified_count = 25
        mock_collection.update_many = AsyncMock(return_value=mock_result)
        
        result = await ai_result_repository.cleanup_old_results(days=90)
        
        assert result == 25
        mock_collection.update_many.assert_called_once()
        call_args = mock_collection.update_many.call_args
        # Verify soft delete was applied
        assert "$set" in call_args[1]
        assert "deleted_at" in call_args[1]["$set"]
    
    @pytest.mark.asyncio
    async def test_cleanup_old_results_custom_days(self, ai_result_repository, mock_db_client):
        """Test cleaning up old results with custom days"""
        mock_collection = mock_db_client["ai_results"]
        
        mock_result = MagicMock()
        mock_result.modified_count = 10
        mock_collection.update_many = AsyncMock(return_value=mock_result)
        
        result = await ai_result_repository.cleanup_old_results(days=30)
        
        assert result == 10
        # Verify date filter
        call_args = mock_collection.update_many.call_args
        cutoff_date = call_args[0][0]["created_at"]["$lt"]
        expected_cutoff = datetime.utcnow() - timedelta(days=30)
        assert (cutoff_date - expected_cutoff).total_seconds() < 1
    
    @pytest.mark.asyncio
    async def test_get_patient_analysis_trend(self, ai_result_repository, mock_db_client):
        """Test getting patient analysis trend"""
        mock_collection = mock_db_client["ai_results"]
        
        async def trend_aggregate():
            yield {
                "_id": {"date": "2024-01-15", "type": "symptom_analysis"},
                "count": 5,
                "avg_confidence": 0.85,
                "avg_processing_time": 1200.5
            }
            yield {
                "_id": {"date": "2024-01-16", "type": "symptom_analysis"},
                "count": 3,
                "avg_confidence": 0.80,
                "avg_processing_time": 1100.2
            }
        
        mock_collection.aggregate = AsyncMock(return_value=trend_aggregate())
        
        result = await ai_result_repository.get_patient_analysis_trend("P001", days=30)
        
        assert len(result) == 2
        assert all("date" in item for item in result)
        assert all("type" in item for item in result)
        assert all("count" in item for item in result)
        assert all("avg_confidence" in item for item in result)
        assert all("avg_processing_time_ms" in item for item in result)
    
    @pytest.mark.asyncio
    async def test_get_patient_analysis_trend_custom_days(self, ai_result_repository, mock_db_client):
        """Test getting patient analysis trend with custom days"""
        mock_collection = mock_db_client["ai_results"]
        
        async def empty_aggregate():
            return
            yield
        
        mock_collection.aggregate = AsyncMock(return_value=empty_aggregate())
        
        result = await ai_result_repository.get_patient_analysis_trend("P001", days=7)
        
        assert isinstance(result, list)
        # Verify pipeline includes correct date range
        call_args = mock_collection.aggregate.call_args
        pipeline = call_args[0][0]
        match_stage = pipeline[0]["$match"]
        assert "created_at" in match_stage
        assert "$gte" in match_stage["created_at"]

