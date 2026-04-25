"""
Tests for api/routes/symptom_analyzer.py
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from fastapi import HTTPException

from api.routes.symptom_analyzer import (
    router,
    analyze_symptoms,
    get_symptom_trends,
    get_general_recommendations,
    SymptomInput,
    SymptomAnalysisOutput
)


class TestSymptomAnalyzerEndpoints:
    """Tests for symptom analyzer endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client with symptom analyzer router"""
        from fastapi import FastAPI
        app = FastAPI()
        app.include_router(router)
        return TestClient(app)
    
    @pytest.fixture
    def sample_symptom_input(self):
        """Create sample symptom input"""
        return {
            "patient_id": "test_patient_123",
            "symptoms": [
                {"symptom": "tos", "severity": "medium"},
                {"symptom": "fiebre", "severity": "high"}
            ],
            "severity": "medium",
            "duration": "3 días",
            "context": "Empezó con tos seca"
        }
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_success(self, client, sample_symptom_input):
        """Test successful symptom analysis"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.insert_one = AsyncMock()
        mock_db.ai_results = mock_collection
        
        mock_cache = None
        
        mock_service = AsyncMock()
        mock_service.analyze_symptoms_comprehensive = AsyncMock(return_value={
            "urgency_level": "medium",
            "severity_score": 0.6,
            "classification": {"categories": ["respiratory", "fever"]},
            "detailed_recommendations": {
                "immediate_actions": ["Consultar médico", "Monitorear síntomas"]
            },
            "warning_signs": [],
            "follow_up_required": True,
            "confidence_score": 0.85
        })
        
        with patch('api.routes.symptom_analyzer.get_database', return_value=mock_db), \
             patch('api.routes.symptom_analyzer.get_cache', return_value=mock_cache), \
             patch('api.routes.symptom_analyzer.ai_service_manager') as mock_manager, \
             patch('api.routes.symptom_analyzer.SymptomAnalysisService', return_value=mock_service):
            mock_manager._initialized = True
            
            response = client.post("/symptom-analyzer/analyze", json=sample_symptom_input)
            
            assert response.status_code == 200
            data = response.json()
            assert data["patient_id"] == "test_patient_123"
            assert data["urgency_level"] == "medium"
            assert "analyzed_at" in data
            assert "recommendations" in data
            assert isinstance(data["recommendations"], list)
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_initialization(self, client, sample_symptom_input):
        """Test symptom analysis with service manager initialization"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.insert_one = AsyncMock()
        mock_db.ai_results = mock_collection
        
        mock_service = AsyncMock()
        mock_service.analyze_symptoms_comprehensive = AsyncMock(return_value={
            "urgency_level": "low",
            "severity_score": 0.4,
            "classification": {},
            "detailed_recommendations": {"immediate_actions": []},
            "warning_signs": [],
            "follow_up_required": False,
            "confidence_score": 0.7
        })
        
        mock_manager = MagicMock()
        mock_manager._initialized = False
        mock_manager.initialize = AsyncMock()
        
        with patch('api.routes.symptom_analyzer.get_database', return_value=mock_db), \
             patch('api.routes.symptom_analyzer.get_cache', return_value=None), \
             patch('api.routes.symptom_analyzer.ai_service_manager', mock_manager), \
             patch('api.routes.symptom_analyzer.SymptomAnalysisService', return_value=mock_service):
            
            response = client.post("/symptom-analyzer/analyze", json=sample_symptom_input)
            
            assert response.status_code == 200
            mock_manager.initialize.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_error_handling(self, client, sample_symptom_input):
        """Test symptom analysis error handling"""
        mock_db = MagicMock()
        mock_service = AsyncMock()
        mock_service.analyze_symptoms_comprehensive = AsyncMock(side_effect=Exception("Service error"))
        
        mock_manager = MagicMock()
        mock_manager._initialized = True
        
        with patch('api.routes.symptom_analyzer.get_database', return_value=mock_db), \
             patch('api.routes.symptom_analyzer.get_cache', return_value=None), \
             patch('api.routes.symptom_analyzer.ai_service_manager', mock_manager), \
             patch('api.routes.symptom_analyzer.SymptomAnalysisService', return_value=mock_service):
            
            response = client.post("/symptom-analyzer/analyze", json=sample_symptom_input)
            
            assert response.status_code == 500
            assert "Internal server error" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_validation_error(self, client):
        """Test symptom analysis with validation error"""
        invalid_input = {
            "patient_id": "",  # Invalid: empty
            "symptoms": []  # Invalid: empty list
        }
        
        response = client.post("/symptom-analyzer/analyze", json=invalid_input)
        
        # Should return validation error
        assert response.status_code in [400, 422]
    
    @pytest.mark.asyncio
    async def test_get_symptom_trends_success(self, client):
        """Test getting symptom trends"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        
        # Mock trend data
        trend_docs = [
            {
                "patient_id": "test_patient_123",
                "type": "symptom_analysis",
                "created_at": datetime.utcnow() - timedelta(days=1),
                "data": {
                    "analyzed_at": datetime.utcnow() - timedelta(days=1),
                    "urgency_level": "low",
                    "severity_score": 0.3,
                    "classification": {"categories": ["respiratory"]}
                }
            },
            {
                "patient_id": "test_patient_123",
                "type": "symptom_analysis",
                "created_at": datetime.utcnow(),
                "data": {
                    "analyzed_at": datetime.utcnow(),
                    "urgency_level": "medium",
                    "severity_score": 0.6,
                    "classification": {"categories": ["respiratory", "fever"]}
                }
            }
        ]
        
        mock_cursor = AsyncMock()
        async def async_iter():
            for doc in trend_docs:
                yield doc
        mock_cursor.__aiter__ = async_iter
        
        mock_collection.find.return_value.sort.return_value = mock_cursor
        mock_db.ai_results = mock_collection
        
        with patch('api.routes.symptom_analyzer.get_database', return_value=mock_db):
            response = client.get("/symptom-analyzer/trends/test_patient_123?period=30d")
            
            assert response.status_code == 200
            data = response.json()
            assert data["patient_id"] == "test_patient_123"
            assert data["period"] == "30d"
            assert "trend_data" in data
            assert "overall_trend" in data
            assert "recommendations" in data
    
    @pytest.mark.asyncio
    async def test_get_symptom_trends_different_periods(self, client):
        """Test getting symptom trends with different periods"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_cursor = AsyncMock()
        async def async_iter():
            return
            yield
        mock_cursor.__aiter__ = async_iter
        mock_collection.find.return_value.sort.return_value = mock_cursor
        mock_db.ai_results = mock_collection
        
        periods = ["7d", "30d", "90d"]
        for period in periods:
            with patch('api.routes.symptom_analyzer.get_database', return_value=mock_db):
                response = client.get(f"/symptom-analyzer/trends/test_patient_123?period={period}")
                assert response.status_code == 200
                assert response.json()["period"] == period
    
    @pytest.mark.asyncio
    async def test_get_symptom_trends_error_handling(self, client):
        """Test getting symptom trends error handling"""
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.find.side_effect = Exception("Database error")
        mock_db.ai_results = mock_collection
        
        with patch('api.routes.symptom_analyzer.get_database', return_value=mock_db):
            response = client.get("/symptom-analyzer/trends/test_patient_123")
            
            assert response.status_code == 500
    
    def test_get_general_recommendations(self, client):
        """Test getting general recommendations"""
        response = client.get("/symptom-analyzer/recommendations")
        
        assert response.status_code == 200
        data = response.json()
        assert "respiratory" in data
        assert "fever" in data
        assert "pain" in data
        assert "general" in data
        assert isinstance(data["respiratory"], list)
        assert len(data["respiratory"]) > 0


class TestSymptomAnalyzerHelperFunctions:
    """Tests for helper functions in symptom_analyzer.py"""
    
    @pytest.mark.asyncio
    async def test_generate_symptom_recommendations_high_urgency(self):
        """Test recommendation generation for high urgency"""
        from api.routes.symptom_analyzer import _generate_symptom_recommendations
        
        symptoms = [{"symptom": "dificultad respiratoria severa"}]
        classification = {"urgency": "high", "categories": ["respiratory"]}
        
        recommendations = await _generate_symptom_recommendations(symptoms, classification, None)
        
        assert len(recommendations) > 0
        assert any("inmediata" in rec.lower() or "inmediato" in rec.lower() for rec in recommendations)
    
    @pytest.mark.asyncio
    async def test_generate_symptom_recommendations_respiratory(self):
        """Test recommendation generation for respiratory symptoms"""
        from api.routes.symptom_analyzer import _generate_symptom_recommendations
        
        symptoms = [{"symptom": "tos"}]
        classification = {"urgency": "medium", "categories": ["respiratory"]}
        
        recommendations = await _generate_symptom_recommendations(symptoms, classification, None)
        
        assert len(recommendations) > 0
        assert any("hidratación" in rec.lower() or "respiración" in rec.lower() for rec in recommendations)
    
    @pytest.mark.asyncio
    async def test_identify_warning_signs(self):
        """Test warning signs identification"""
        from api.routes.symptom_analyzer import _identify_warning_signs
        
        symptoms = [{"symptom": "dificultad respiratoria severa"}]
        classification = {"urgency": "high", "severity_score": 0.9}
        
        warning_signs = await _identify_warning_signs(symptoms, classification)
        
        assert len(warning_signs) > 0
    
    @pytest.mark.asyncio
    async def test_determine_follow_up_high_urgency(self):
        """Test follow-up determination for high urgency"""
        from api.routes.symptom_analyzer import _determine_follow_up
        
        classification = {"urgency": "high"}
        warning_signs = []
        
        result = await _determine_follow_up(classification, warning_signs, None)
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_determine_follow_up_with_warning_signs(self):
        """Test follow-up determination with warning signs"""
        from api.routes.symptom_analyzer import _determine_follow_up
        
        classification = {"urgency": "medium"}
        warning_signs = ["Síntoma grave detectado"]
        
        result = await _determine_follow_up(classification, warning_signs, None)
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_analyze_overall_trend_insufficient_data(self):
        """Test trend analysis with insufficient data"""
        from api.routes.symptom_analyzer import _analyze_overall_trend
        
        trend_data = [{"severity_score": 0.5}]
        
        result = await _analyze_overall_trend(trend_data)
        
        assert result == "insufficient_data"
    
    @pytest.mark.asyncio
    async def test_analyze_overall_trend_worsening(self):
        """Test trend analysis showing worsening"""
        from api.routes.symptom_analyzer import _analyze_overall_trend
        
        trend_data = [
            {"severity_score": 0.3},
            {"severity_score": 0.4},
            {"severity_score": 0.5},
            {"severity_score": 0.6},
            {"severity_score": 0.7}
        ]
        
        result = await _analyze_overall_trend(trend_data)
        
        assert result in ["worsening", "stable"]
    
    @pytest.mark.asyncio
    async def test_generate_trend_recommendations(self):
        """Test trend recommendations generation"""
        from api.routes.symptom_analyzer import _generate_trend_recommendations
        
        trend_data = []
        trend = "worsening"
        
        recommendations = await _generate_trend_recommendations(trend_data, trend)
        
        assert len(recommendations) > 0
        assert any("empeorar" in rec.lower() or "urgente" in rec.lower() for rec in recommendations)
    
    @pytest.mark.asyncio
    async def test_store_analysis_result(self):
        """Test storing analysis result"""
        from api.routes.symptom_analyzer import _store_analysis_result
        
        mock_db = MagicMock()
        mock_collection = AsyncMock()
        mock_collection.insert_one = AsyncMock()
        mock_db.ai_results = mock_collection
        
        result = SymptomAnalysisOutput(
            patient_id="test_patient",
            analyzed_at=datetime.utcnow(),
            urgency_level="medium",
            severity_score=0.6,
            classification={},
            recommendations=[],
            warning_signs=[],
            follow_up_required=False,
            confidence_score=0.8,
            processing_time_ms=100
        )
        
        await _store_analysis_result(mock_db, result, None)
        
        mock_collection.insert_one.assert_called_once()
