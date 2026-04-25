"""
Tests for repositories/patient_repository.py
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from bson import ObjectId

from repositories.patient_repository import PatientRepository


class TestPatientRepository:
    """Tests for PatientRepository"""
    
    @pytest.fixture
    def mock_db_client(self):
        """Create mock database client"""
        mock_client = MagicMock()
        mock_collection = AsyncMock()
        mock_client.__getitem__ = MagicMock(return_value=mock_collection)
        return mock_client
    
    @pytest.fixture
    def patient_repository(self, mock_db_client):
        """Create patient repository instance"""
        return PatientRepository(mock_db_client)
    
    @pytest.fixture
    def sample_patient_data(self):
        """Sample patient data"""
        return {
            "patient_id": "P001",
            "first_name": "Juan",
            "last_name": "Pérez",
            "email": "juan.perez@example.com",
            "age": 45,
            "gender": "M"
        }
    
    @pytest.mark.asyncio
    async def test_create_patient_success(self, patient_repository, sample_patient_data, mock_db_client):
        """Test successful patient creation"""
        mock_collection = mock_db_client["patients"]
        mock_result = MagicMock()
        mock_result.inserted_id = ObjectId()
        mock_collection.insert_one = AsyncMock(return_value=mock_result)
        
        result = await patient_repository.create_patient(sample_patient_data)
        
        assert result is not None
        assert "_id" in result
        assert result["status"] == "active"
        assert result["total_histories"] == 0
        assert result["total_ai_analyses"] == 0
        assert "last_activity" in result
        assert "medical_summary" in result
        mock_collection.insert_one.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_patient_missing_required_fields(self, patient_repository):
        """Test patient creation with missing required fields"""
        incomplete_data = {
            "patient_id": "P001"
            # Missing first_name and last_name
        }
        
        with pytest.raises(ValueError, match="Missing required field"):
            await patient_repository.create_patient(incomplete_data)
    
    @pytest.mark.asyncio
    async def test_create_patient_missing_patient_id(self, patient_repository):
        """Test patient creation with missing patient_id"""
        incomplete_data = {
            "first_name": "Juan",
            "last_name": "Pérez"
            # Missing patient_id
        }
        
        with pytest.raises(ValueError, match="Missing required field: patient_id"):
            await patient_repository.create_patient(incomplete_data)
    
    @pytest.mark.asyncio
    async def test_get_by_patient_id_success(self, patient_repository, mock_db_client):
        """Test getting patient by patient_id"""
        mock_collection = mock_db_client["patients"]
        mock_patient = {
            "_id": ObjectId(),
            "patient_id": "P001",
            "first_name": "Juan",
            "last_name": "Pérez"
        }
        
        # Mock find_one_by_field from base repository
        patient_repository.find_one_by_field = AsyncMock(return_value=mock_patient)
        
        result = await patient_repository.get_by_patient_id("P001")
        
        assert result is not None
        assert result["patient_id"] == "P001"
        patient_repository.find_one_by_field.assert_called_once_with("patient_id", "P001")
    
    @pytest.mark.asyncio
    async def test_get_by_patient_id_not_found(self, patient_repository):
        """Test getting patient by patient_id when not found"""
        patient_repository.find_one_by_field = AsyncMock(return_value=None)
        
        result = await patient_repository.get_by_patient_id("P999")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_update_last_activity_success(self, patient_repository, mock_db_client):
        """Test updating last activity"""
        mock_collection = mock_db_client["patients"]
        mock_patient = {
            "_id": ObjectId(),
            "patient_id": "P001"
        }
        
        patient_repository.find_one_by_field = AsyncMock(return_value=mock_patient)
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        result = await patient_repository.update_last_activity("P001")
        
        assert result is True
        mock_collection.update_one.assert_called_once()
        call_args = mock_collection.update_one.call_args
        assert "$set" in call_args[1]
        assert "last_activity" in call_args[1]["$set"]
    
    @pytest.mark.asyncio
    async def test_update_last_activity_patient_not_found(self, patient_repository):
        """Test updating last activity when patient not found"""
        patient_repository.find_one_by_field = AsyncMock(return_value=None)
        
        result = await patient_repository.update_last_activity("P999")
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_increment_activity_counters_history(self, patient_repository, mock_db_client):
        """Test incrementing history counter"""
        mock_collection = mock_db_client["patients"]
        mock_patient = {
            "_id": ObjectId(),
            "patient_id": "P001"
        }
        
        patient_repository.find_one_by_field = AsyncMock(return_value=mock_patient)
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        result = await patient_repository.increment_activity_counters("P001", history_count=1)
        
        assert result is True
        mock_collection.update_one.assert_called_once()
        call_args = mock_collection.update_one.call_args
        assert "$inc" in call_args[1]
        assert call_args[1]["$inc"]["total_histories"] == 1
    
    @pytest.mark.asyncio
    async def test_increment_activity_counters_ai_analysis(self, patient_repository, mock_db_client):
        """Test incrementing AI analysis counter"""
        mock_collection = mock_db_client["patients"]
        mock_patient = {
            "_id": ObjectId(),
            "patient_id": "P001"
        }
        
        patient_repository.find_one_by_field = AsyncMock(return_value=mock_patient)
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        result = await patient_repository.increment_activity_counters("P001", ai_analysis_count=1)
        
        assert result is True
        call_args = mock_collection.update_one.call_args
        assert "$inc" in call_args[1]
        assert call_args[1]["$inc"]["total_ai_analyses"] == 1
    
    @pytest.mark.asyncio
    async def test_increment_activity_counters_both(self, patient_repository, mock_db_client):
        """Test incrementing both counters"""
        mock_collection = mock_db_client["patients"]
        mock_patient = {
            "_id": ObjectId(),
            "patient_id": "P001"
        }
        
        patient_repository.find_one_by_field = AsyncMock(return_value=mock_patient)
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        result = await patient_repository.increment_activity_counters(
            "P001", 
            history_count=1, 
            ai_analysis_count=2
        )
        
        assert result is True
        call_args = mock_collection.update_one.call_args
        assert "$inc" in call_args[1]
        assert call_args[1]["$inc"]["total_histories"] == 1
        assert call_args[1]["$inc"]["total_ai_analyses"] == 2
    
    @pytest.mark.asyncio
    async def test_increment_activity_counters_no_increments(self, patient_repository, mock_db_client):
        """Test incrementing with no counts (only update last_activity)"""
        mock_collection = mock_db_client["patients"]
        mock_patient = {
            "_id": ObjectId(),
            "patient_id": "P001"
        }
        
        patient_repository.find_one_by_field = AsyncMock(return_value=mock_patient)
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        result = await patient_repository.increment_activity_counters("P001")
        
        assert result is True
        call_args = mock_collection.update_one.call_args
        # Should only have $set, no $inc
        assert "$set" in call_args[1]
        assert "$inc" not in call_args[1]
    
    @pytest.mark.asyncio
    async def test_increment_activity_counters_patient_not_found(self, patient_repository):
        """Test incrementing counters when patient not found"""
        patient_repository.find_one_by_field = AsyncMock(return_value=None)
        
        result = await patient_repository.increment_activity_counters("P999", history_count=1)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_update_medical_summary_success(self, patient_repository, mock_db_client):
        """Test updating medical summary"""
        mock_collection = mock_db_client["patients"]
        mock_patient = {
            "_id": ObjectId(),
            "patient_id": "P001"
        }
        
        patient_repository.find_one_by_field = AsyncMock(return_value=mock_patient)
        mock_result = MagicMock()
        mock_result.modified_count = 1
        mock_collection.update_one = AsyncMock(return_value=mock_result)
        
        summary_data = {
            "common_symptoms": ["tos", "fiebre"],
            "frequent_diagnoses": ["Influenza"],
            "risk_factors": ["tabaquismo"]
        }
        
        result = await patient_repository.update_medical_summary("P001", summary_data)
        
        assert result is True
        mock_collection.update_one.assert_called_once()
        call_args = mock_collection.update_one.call_args
        assert call_args[1]["$set"]["medical_summary"] == summary_data
    
    @pytest.mark.asyncio
    async def test_update_medical_summary_patient_not_found(self, patient_repository):
        """Test updating medical summary when patient not found"""
        patient_repository.find_one_by_field = AsyncMock(return_value=None)
        
        result = await patient_repository.update_medical_summary("P999", {})
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_active_patients(self, patient_repository, mock_db_client):
        """Test getting active patients"""
        mock_collection = mock_db_client["patients"]
        
        # Mock cursor
        mock_cursor = AsyncMock()
        mock_doc1 = {"_id": ObjectId(), "patient_id": "P001", "last_activity": datetime.utcnow()}
        mock_doc2 = {"_id": ObjectId(), "patient_id": "P002", "last_activity": datetime.utcnow()}
        
        async def cursor_iter():
            yield mock_doc1
            yield mock_doc2
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await patient_repository.get_active_patients(days=30)
        
        assert len(result) == 2
        assert all("_id" in patient and isinstance(patient["_id"], str) for patient in result)
    
    @pytest.mark.asyncio
    async def test_get_active_patients_custom_days(self, patient_repository, mock_db_client):
        """Test getting active patients with custom days"""
        mock_collection = mock_db_client["patients"]
        
        mock_cursor = AsyncMock()
        async def cursor_iter():
            yield {"_id": ObjectId(), "patient_id": "P001"}
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await patient_repository.get_active_patients(days=7)
        
        # Verify query includes correct date range
        call_args = mock_collection.find.call_args
        assert "last_activity" in call_args[0][0]
        assert "$gte" in call_args[0][0]["last_activity"]
    
    @pytest.mark.asyncio
    async def test_get_patient_statistics(self, patient_repository, mock_db_client):
        """Test getting patient statistics"""
        mock_collection = mock_db_client["patients"]
        
        # Mock count
        patient_repository.count = AsyncMock(return_value=100)
        
        # Mock aggregate for age groups
        async def age_aggregate():
            yield {"_id": "18-29", "count": 30}
            yield {"_id": "30-44", "count": 40}
        
        # Mock aggregate for gender
        async def gender_aggregate():
            yield {"_id": "M", "count": 60}
            yield {"_id": "F", "count": 40}
        
        # Mock aggregate for most active
        async def active_aggregate():
            yield {"_id": ObjectId(), "patient_id": "P001", "total_histories": 10}
        
        mock_collection.aggregate = AsyncMock(side_effect=[
            age_aggregate(),
            gender_aggregate(),
            active_aggregate()
        ])
        
        result = await patient_repository.get_patient_statistics()
        
        assert "total_patients" in result
        assert "age_groups" in result
        assert "gender_distribution" in result
        assert "recent_registrations_30_days" in result
        assert "most_active_patients" in result
        assert result["total_patients"] == 100
    
    @pytest.mark.asyncio
    async def test_search_patients(self, patient_repository, mock_db_client):
        """Test searching patients"""
        mock_collection = mock_db_client["patients"]
        
        mock_cursor = AsyncMock()
        mock_doc = {
            "_id": ObjectId(),
            "patient_id": "P001",
            "first_name": "Juan",
            "last_name": "Pérez",
            "email": "juan@example.com"
        }
        
        async def cursor_iter():
            yield mock_doc
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        result = await patient_repository.search_patients("Juan", limit=10)
        
        assert len(result) == 1
        assert result[0]["patient_id"] == "P001"
        assert "first_name" in result[0]
        assert "last_name" in result[0]
        # Verify search query structure
        call_args = mock_collection.find.call_args
        assert "$or" in call_args[0][0]
    
    @pytest.mark.asyncio
    async def test_search_patients_limit(self, patient_repository, mock_db_client):
        """Test searching patients with limit"""
        mock_collection = mock_db_client["patients"]
        
        mock_cursor = AsyncMock()
        async def cursor_iter():
            pass
        
        mock_cursor.__aiter__ = cursor_iter
        mock_cursor.limit = MagicMock(return_value=mock_cursor)
        mock_collection.find = MagicMock(return_value=mock_cursor)
        
        await patient_repository.search_patients("test", limit=5)
        
        # Verify limit was applied
        mock_cursor.limit.assert_called_once_with(5)
    
    @pytest.mark.asyncio
    async def test_get_patient_dashboard_data_success(self, patient_repository):
        """Test getting patient dashboard data"""
        mock_patient = {
            "patient_id": "P001",
            "first_name": "Juan",
            "last_name": "Pérez",
            "status": "active",
            "total_histories": 5,
            "total_ai_analyses": 10,
            "last_activity": datetime.utcnow(),
            "medical_summary": {"common_symptoms": ["tos"]}
        }
        
        patient_repository.get_by_patient_id = AsyncMock(return_value=mock_patient)
        patient_repository.get_recent_activity = AsyncMock(return_value={
            "recent_histories": 2,
            "recent_analyses": 3
        })
        
        result = await patient_repository.get_patient_dashboard_data("P001")
        
        assert "patient_info" in result
        assert "recent_activity" in result
        assert "medical_summary" in result
        assert result["patient_info"]["patient_id"] == "P001"
        assert result["patient_info"]["total_histories"] == 5
    
    @pytest.mark.asyncio
    async def test_get_patient_dashboard_data_not_found(self, patient_repository):
        """Test getting dashboard data when patient not found"""
        patient_repository.get_by_patient_id = AsyncMock(return_value=None)
        
        result = await patient_repository.get_patient_dashboard_data("P999")
        
        assert result == {}
    
    @pytest.mark.asyncio
    async def test_get_recent_activity(self, patient_repository):
        """Test getting recent activity"""
        result = await patient_repository.get_recent_activity("P001", days=30)
        
        assert isinstance(result, dict)
        assert "recent_histories" in result
        assert "recent_analyses" in result
        assert "common_symptoms" in result
        assert "recent_diagnoses" in result
        assert "activity_trend" in result

