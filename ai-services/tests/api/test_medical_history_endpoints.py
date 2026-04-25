"""
Tests for api/routes/medical_history.py
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime
from fastapi import HTTPException

from api.routes.medical_history import (
    router,
    process_medical_history,
    get_medical_histories,
    search_medical_histories,
    MedicalHistoryInput,
    MedicalHistoryOutput,
    MedicalHistorySearch
)


class TestMedicalHistoryEndpoints:
    """Tests for medical history endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client with medical history router"""
        from fastapi import FastAPI
        app = FastAPI()
        app.include_router(router)
        return TestClient(app)
    
    @pytest.fixture
    def sample_medical_history_input(self):
        """Create sample medical history input"""
        return {
            "patient_id": "test_patient_123",
            "text": "Paciente de 45 años con tos persistente y fiebre de 3 días. Antecedentes de asma.",
            "language": "es",
            "metadata": {"source": "test"}
        }
    
    @pytest.mark.asyncio
    async def test_process_medical_history_success(self, client, sample_medical_history_input):
        """Test successful medical history processing"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.insert_one = AsyncMock()
        mock_db.ai_results = mock_collection
        
        mock_cache = None
        
        mock_model_manager = MagicMock()
        mock_model_manager.process_medical_text = AsyncMock(return_value={
            "entities": [
                {"text": "asma", "type": "DISEASE", "confidence": 0.9}
            ],
            "symptoms": [
                {"symptom": "tos", "category": "respiratory", "confidence": 0.8},
                {"symptom": "fiebre", "category": "fever", "confidence": 0.85}
            ],
            "confidence": 0.85
        })
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db), \
             patch('api.routes.medical_history.get_cache', return_value=mock_cache), \
             patch('api.routes.medical_history.get_cache_value', return_value=None), \
             patch('api.routes.medical_history.set_cache', new_callable=AsyncMock), \
             patch('api.routes.medical_history.model_manager', mock_model_manager):
            
            response = client.post("/medical-history/process", json=sample_medical_history_input)
            
            assert response.status_code == 200
            data = response.json()
            assert data["patient_id"] == "test_patient_123"
            assert "processed_at" in data
            assert "entities" in data
            assert "symptoms" in data
            assert "diagnosis_suggestions" in data
            assert "risk_factors" in data
            assert "recommendations" in data
            assert "confidence_score" in data
            assert "processing_time_ms" in data
    
    @pytest.mark.asyncio
    async def test_process_medical_history_cached(self, client, sample_medical_history_input):
        """Test medical history processing with cached result"""
        cached_result = {
            "patient_id": "test_patient_123",
            "processed_at": datetime.utcnow().isoformat(),
            "entities": [],
            "symptoms": [],
            "diagnosis_suggestions": [],
            "risk_factors": [],
            "recommendations": [],
            "confidence_score": 0.8,
            "processing_time_ms": 50
        }
        
        mock_db = MagicMock()
        mock_cache = None
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db), \
             patch('api.routes.medical_history.get_cache', return_value=mock_cache), \
             patch('api.routes.medical_history.get_cache_value', return_value=cached_result):
            
            response = client.post("/medical-history/process", json=sample_medical_history_input)
            
            assert response.status_code == 200
            data = response.json()
            assert data["patient_id"] == "test_patient_123"
    
    @pytest.mark.asyncio
    async def test_process_medical_history_model_error(self, client, sample_medical_history_input):
        """Test medical history processing with model error"""
        mock_db = MagicMock()
        mock_cache = None
        
        mock_model_manager = MagicMock()
        mock_model_manager.process_medical_text = AsyncMock(return_value={
            "error": "Model processing failed"
        })
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db), \
             patch('api.routes.medical_history.get_cache', return_value=mock_cache), \
             patch('api.routes.medical_history.get_cache_value', return_value=None), \
             patch('api.routes.medical_history.model_manager', mock_model_manager):
            
            response = client.post("/medical-history/process", json=sample_medical_history_input)
            
            assert response.status_code == 500
            assert "Model processing failed" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_process_medical_history_error_handling(self, client, sample_medical_history_input):
        """Test medical history processing error handling"""
        mock_db = MagicMock()
        mock_cache = None
        
        mock_model_manager = MagicMock()
        mock_model_manager.process_medical_text = AsyncMock(side_effect=Exception("Processing error"))
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db), \
             patch('api.routes.medical_history.get_cache', return_value=mock_cache), \
             patch('api.routes.medical_history.get_cache_value', return_value=None), \
             patch('api.routes.medical_history.model_manager', mock_model_manager):
            
            response = client.post("/medical-history/process", json=sample_medical_history_input)
            
            assert response.status_code == 500
            assert "Internal server error" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_process_medical_history_validation_error(self, client):
        """Test medical history processing with validation error"""
        invalid_input = {
            "patient_id": "",  # Invalid: empty
            "text": ""  # Invalid: empty
        }
        
        response = client.post("/medical-history/process", json=invalid_input)
        
        # Should return validation error
        assert response.status_code in [400, 422]
    
    @pytest.mark.asyncio
    async def test_get_medical_histories_success(self, client):
        """Test getting medical histories for a patient"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        
        history_docs = [
            {
                "patient_id": "test_patient_123",
                "type": "medical_history",
                "created_at": datetime.utcnow(),
                "data": {
                    "patient_id": "test_patient_123",
                    "processed_at": datetime.utcnow(),
                    "entities": [],
                    "symptoms": [],
                    "diagnosis_suggestions": [],
                    "risk_factors": [],
                    "recommendations": [],
                    "confidence_score": 0.8,
                    "processing_time_ms": 100
                }
            }
        ]
        
        mock_cursor = AsyncMock()
        async def async_iter():
            for doc in history_docs:
                yield doc
        mock_cursor.__aiter__ = async_iter
        
        mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
        mock_db.ai_results = mock_collection
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db):
            response = client.get("/medical-history/test_patient_123?limit=50")
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            if len(data) > 0:
                assert data[0]["patient_id"] == "test_patient_123"
    
    @pytest.mark.asyncio
    async def test_get_medical_histories_error_handling(self, client):
        """Test getting medical histories error handling"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.find.side_effect = Exception("Database error")
        mock_db.ai_results = mock_collection
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db):
            response = client.get("/medical-history/test_patient_123")
            
            assert response.status_code == 500
    
    @pytest.mark.asyncio
    async def test_search_medical_histories_by_patient(self, client):
        """Test searching medical histories by patient"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        
        mock_cursor = AsyncMock()
        async def async_iter():
            return
            yield
        mock_cursor.__aiter__ = async_iter
        
        mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
        mock_db.ai_results = mock_collection
        
        search_params = {
            "patient_id": "test_patient_123",
            "limit": 50
        }
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db):
            response = client.post("/medical-history/search", json=search_params)
            
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_search_medical_histories_by_date_range(self, client):
        """Test searching medical histories by date range"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        
        mock_cursor = AsyncMock()
        async def async_iter():
            return
            yield
        mock_cursor.__aiter__ = async_iter
        
        mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
        mock_db.ai_results = mock_collection
        
        search_params = {
            "date_from": datetime.utcnow().isoformat(),
            "date_to": datetime.utcnow().isoformat(),
            "limit": 50
        }
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db):
            response = client.post("/medical-history/search", json=search_params)
            
            assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_search_medical_histories_by_diagnosis(self, client):
        """Test searching medical histories by diagnosis"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        
        mock_cursor = AsyncMock()
        async def async_iter():
            return
            yield
        mock_cursor.__aiter__ = async_iter
        
        mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
        mock_db.ai_results = mock_collection
        
        search_params = {
            "diagnosis": "asma",
            "limit": 50
        }
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db):
            response = client.post("/medical-history/search", json=search_params)
            
            assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_search_medical_histories_error_handling(self, client):
        """Test searching medical histories error handling"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.find.side_effect = Exception("Database error")
        mock_db.ai_results = mock_collection
        
        search_params = {"limit": 50}
        
        with patch('api.routes.medical_history.get_database', return_value=mock_db):
            response = client.post("/medical-history/search", json=search_params)
            
            assert response.status_code == 500


class TestMedicalHistoryHelperFunctions:
    """Tests for helper functions in medical_history.py"""
    
    @pytest.mark.asyncio
    async def test_generate_diagnosis_suggestions_respiratory_and_fever(self):
        """Test diagnosis suggestions for respiratory and fever symptoms"""
        from api.routes.medical_history import _generate_diagnosis_suggestions
        
        symptoms = [
            {"category": "respiratory"},
            {"category": "fever"}
        ]
        entities = []
        
        suggestions = await _generate_diagnosis_suggestions(symptoms, entities)
        
        assert len(suggestions) > 0
        assert any("infección" in s.lower() or "bronquitis" in s.lower() or "neumonía" in s.lower() for s in suggestions)
    
    @pytest.mark.asyncio
    async def test_generate_diagnosis_suggestions_respiratory_only(self):
        """Test diagnosis suggestions for respiratory symptoms only"""
        from api.routes.medical_history import _generate_diagnosis_suggestions
        
        symptoms = [
            {"category": "respiratory"}
        ]
        entities = []
        
        suggestions = await _generate_diagnosis_suggestions(symptoms, entities)
        
        assert len(suggestions) > 0
        assert any("asma" in s.lower() or "epoc" in s.lower() or "bronquitis" in s.lower() for s in suggestions)
    
    @pytest.mark.asyncio
    async def test_generate_diagnosis_suggestions_fever_only(self):
        """Test diagnosis suggestions for fever symptoms only"""
        from api.routes.medical_history import _generate_diagnosis_suggestions
        
        symptoms = [
            {"category": "fever"}
        ]
        entities = []
        
        suggestions = await _generate_diagnosis_suggestions(symptoms, entities)
        
        assert len(suggestions) > 0
        assert any("febril" in s.lower() or "infección" in s.lower() for s in suggestions)
    
    @pytest.mark.asyncio
    async def test_generate_diagnosis_suggestions_no_specific_pattern(self):
        """Test diagnosis suggestions when no specific pattern"""
        from api.routes.medical_history import _generate_diagnosis_suggestions
        
        symptoms = []
        entities = []
        
        suggestions = await _generate_diagnosis_suggestions(symptoms, entities)
        
        assert len(suggestions) > 0
        assert any("evaluación" in s.lower() or "médica" in s.lower() for s in suggestions)
    
    @pytest.mark.asyncio
    async def test_extract_risk_factors_tabaquismo(self):
        """Test risk factor extraction for smoking"""
        from api.routes.medical_history import _extract_risk_factors
        
        text = "Paciente fumador de 20 años"
        
        risk_factors = await _extract_risk_factors(text)
        
        assert "tabaquismo" in risk_factors
    
    @pytest.mark.asyncio
    async def test_extract_risk_factors_diabetes(self):
        """Test risk factor extraction for diabetes"""
        from api.routes.medical_history import _extract_risk_factors
        
        text = "Paciente con diabetes tipo 2"
        
        risk_factors = await _extract_risk_factors(text)
        
        assert "diabetes" in risk_factors
    
    @pytest.mark.asyncio
    async def test_extract_risk_factors_multiple(self):
        """Test extraction of multiple risk factors"""
        from api.routes.medical_history import _extract_risk_factors
        
        text = "Paciente de 70 años con hipertensión y sobrepeso"
        
        risk_factors = await _extract_risk_factors(text)
        
        assert len(risk_factors) >= 1
        assert any("hipertensión" in rf or "obesidad" in rf or "edad avanzada" in rf for rf in risk_factors)
    
    @pytest.mark.asyncio
    async def test_generate_recommendations_respiratory(self):
        """Test recommendation generation for respiratory symptoms"""
        from api.routes.medical_history import _generate_recommendations
        
        symptoms = [
            {"category": "respiratory"}
        ]
        diagnoses = ["Bronquitis"]
        
        recommendations = await _generate_recommendations(symptoms, diagnoses)
        
        assert len(recommendations) > 0
        assert any("irritantes" in rec.lower() or "hidratación" in rec.lower() for rec in recommendations)
    
    @pytest.mark.asyncio
    async def test_generate_recommendations_fever(self):
        """Test recommendation generation for fever symptoms"""
        from api.routes.medical_history import _generate_recommendations
        
        symptoms = [
            {"category": "fever"}
        ]
        diagnoses = ["Infección viral"]
        
        recommendations = await _generate_recommendations(symptoms, diagnoses)
        
        assert len(recommendations) > 0
        assert any("temperatura" in rec.lower() or "reposo" in rec.lower() for rec in recommendations)
    
    @pytest.mark.asyncio
    async def test_store_processing_result(self):
        """Test storing processing result"""
        from api.routes.medical_history import _store_processing_result
        
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.insert_one = AsyncMock()
        mock_db.ai_results = mock_collection
        
        result = MedicalHistoryOutput(
            patient_id="test_patient",
            processed_at=datetime.utcnow(),
            entities=[],
            symptoms=[],
            diagnosis_suggestions=[],
            risk_factors=[],
            recommendations=[],
            confidence_score=0.8,
            processing_time_ms=100
        )
        
        await _store_processing_result(mock_db, result, None)
        
        mock_collection.insert_one.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_store_processing_result_with_metadata(self):
        """Test storing processing result with metadata"""
        from api.routes.medical_history import _store_processing_result
        
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.insert_one = AsyncMock()
        mock_db.ai_results = mock_collection
        
        result = MedicalHistoryOutput(
            patient_id="test_patient",
            processed_at=datetime.utcnow(),
            entities=[],
            symptoms=[],
            diagnosis_suggestions=[],
            risk_factors=[],
            recommendations=[],
            confidence_score=0.8,
            processing_time_ms=100
        )
        
        metadata = {"source": "test", "version": "1.0"}
        
        await _store_processing_result(mock_db, result, metadata)
        
        # Verify metadata was included
        call_args = mock_collection.insert_one.call_args
        assert call_args[0][0]["metadata"] == metadata
