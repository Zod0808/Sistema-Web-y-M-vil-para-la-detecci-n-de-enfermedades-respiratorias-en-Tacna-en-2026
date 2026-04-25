"""
Unit tests for SymptomAnalysisService
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List

from services.symptom_analysis_service import SymptomAnalysisService


class TestSymptomAnalysisService:
    """Test SymptomAnalysisService implementation"""
    
    @pytest.fixture
    def service_manager_mock(self):
        """Create mock service manager"""
        mock = AsyncMock()
        mock.analyze_symptoms.return_value = {
            "disease": "Bronquitis",
            "confidence": 0.85,
            "urgency_level": "moderate",
            "symptoms": ["tos", "fiebre"]
        }
        return mock
    
    @pytest.fixture
    def symptom_service(self, service_manager_mock):
        """Create symptom analysis service instance"""
        return SymptomAnalysisService(service_manager=service_manager_mock)
    
    @pytest.fixture
    def sample_symptoms(self):
        """Sample symptoms for testing"""
        return [
            {"name": "tos", "severity": "moderate", "duration_days": 5},
            {"name": "fiebre", "severity": "mild", "duration_days": 2}
        ]
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_comprehensive_basic(self, symptom_service, sample_symptoms):
        """Test comprehensive symptom analysis with basic options"""
        result = await symptom_service.analyze_symptoms_comprehensive(
            symptoms=sample_symptoms,
            patient_id="patient_123",
            include_trends=False,
            include_recommendations=False
        )
        
        assert result is not None
        assert "disease" in result or "urgency_level" in result
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_comprehensive_with_trends(self, symptom_service, sample_symptoms):
        """Test comprehensive analysis with trends"""
        with patch.object(symptom_service, '_analyze_symptom_trends', new_callable=AsyncMock) as mock_trends:
            mock_trends.return_value = {"trend": "increasing", "days": 5}
            
            result = await symptom_service.analyze_symptoms_comprehensive(
                symptoms=sample_symptoms,
                patient_id="patient_123",
                include_trends=True
            )
            
            assert "trend_analysis" in result
            mock_trends.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_comprehensive_with_recommendations(self, symptom_service, sample_symptoms):
        """Test comprehensive analysis with recommendations"""
        with patch.object(symptom_service, '_generate_detailed_recommendations', new_callable=AsyncMock) as mock_recs:
            mock_recs.return_value = ["Rest", "Hydration"]
            
            result = await symptom_service.analyze_symptoms_comprehensive(
                symptoms=sample_symptoms,
                patient_id="patient_123",
                include_recommendations=True
            )
            
            assert "detailed_recommendations" in result
            mock_recs.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_comprehensive_risk_assessment(self, symptom_service, sample_symptoms):
        """Test risk assessment in comprehensive analysis"""
        with patch.object(symptom_service, '_assess_health_risks', new_callable=AsyncMock) as mock_risk:
            mock_risk.return_value = {"risk_level": "moderate", "factors": ["age", "symptoms"]}
            
            result = await symptom_service.analyze_symptoms_comprehensive(
                symptoms=sample_symptoms,
                patient_id="patient_123"
            )
            
            assert "risk_assessment" in result
            mock_risk.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_comprehensive_follow_up(self, symptom_service, sample_symptoms):
        """Test follow-up plan in comprehensive analysis"""
        with patch.object(symptom_service, '_create_follow_up_plan', new_callable=AsyncMock) as mock_follow:
            mock_follow.return_value = {"required": True, "timeline": "24h"}
            
            result = await symptom_service.analyze_symptoms_comprehensive(
                symptoms=sample_symptoms,
                patient_id="patient_123"
            )
            
            assert "follow_up_plan" in result
            mock_follow.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_batch(self, symptom_service):
        """Test batch symptom analysis"""
        batch_requests = [
            {"symptoms": [{"name": "tos"}], "patient_id": "P001"},
            {"symptoms": [{"name": "fiebre"}], "patient_id": "P002"}
        ]
        
        with patch.object(symptom_service.service_manager, 'analyze_symptoms_batch', new_callable=AsyncMock) as mock_batch:
            mock_batch.return_value = [
                {"disease": "Bronquitis", "patient_id": "P001"},
                {"disease": "Gripe", "patient_id": "P002"}
            ]
            
            results = await symptom_service.analyze_symptoms_batch(batch_requests)
            
            assert len(results) == 2
            mock_batch.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_perform_basic_analysis_with_service_manager(self, symptom_service, sample_symptoms):
        """Test basic analysis using service manager"""
        result = await symptom_service._perform_basic_analysis(
            sample_symptoms,
            "patient_123",
            None
        )
        
        assert result is not None
        symptom_service.service_manager.analyze_symptoms.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_perform_basic_analysis_fallback(self):
        """Test basic analysis fallback when no service manager"""
        service = SymptomAnalysisService(service_manager=None)
        
        with patch('services.symptom_analysis_service.analyzer') as mock_analyzer:
            mock_analyzer.analyze_symptoms = AsyncMock(return_value={"disease": "Bronquitis"})
            
            result = await service._perform_basic_analysis(
                [{"name": "tos"}],
                "patient_123",
                None
            )
            
            assert result is not None
            mock_analyzer.analyze_symptoms.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptom_trends_success(self, symptom_service):
        """Test symptom trends analysis"""
        result = await symptom_service._analyze_symptom_trends("patient_123")
        
        assert "trend_period" in result
        assert "overall_trend" in result
        assert "symptom_frequency" in result
        assert "severity_trend" in result
        assert "recommendations" in result
    
    @pytest.mark.asyncio
    async def test_analyze_symptom_trends_error(self, symptom_service):
        """Test symptom trends analysis with error"""
        # Should return error dict, not raise exception
        with patch('services.symptom_analysis_service.logger') as mock_logger:
            result = await symptom_service._analyze_symptom_trends("patient_123")
            
            # Should return dict with trend data or error
            assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_generate_detailed_recommendations_critical(self, symptom_service):
        """Test generating recommendations for critical urgency"""
        analysis_result = {
            "urgency_level": "critical",
            "categories": ["respiratory"],
            "warning_signs": ["Severe difficulty breathing"]
        }
        
        recommendations = await symptom_service._generate_detailed_recommendations(
            analysis_result,
            [{"name": "dificultad respiratoria"}],
            None
        )
        
        assert "immediate_actions" in recommendations
        assert len(recommendations["immediate_actions"]) > 0
        assert any("emergency" in action.lower() or "inmediat" in action.lower() for action in recommendations["immediate_actions"])
    
    @pytest.mark.asyncio
    async def test_generate_detailed_recommendations_high(self, symptom_service):
        """Test generating recommendations for high urgency"""
        analysis_result = {
            "urgency_level": "high",
            "categories": ["fever"],
            "warning_signs": []
        }
        
        recommendations = await symptom_service._generate_detailed_recommendations(
            analysis_result,
            [{"name": "fiebre alta"}],
            None
        )
        
        assert "immediate_actions" in recommendations
        assert "short_term_actions" in recommendations
        assert len(recommendations["immediate_actions"]) > 0
    
    @pytest.mark.asyncio
    async def test_generate_detailed_recommendations_medium(self, symptom_service):
        """Test generating recommendations for medium urgency"""
        analysis_result = {
            "urgency_level": "medium",
            "categories": ["pain"],
            "warning_signs": []
        }
        
        recommendations = await symptom_service._generate_detailed_recommendations(
            analysis_result,
            [{"name": "dolor"}],
            None
        )
        
        assert "immediate_actions" in recommendations
        assert "short_term_actions" in recommendations
    
    @pytest.mark.asyncio
    async def test_generate_detailed_recommendations_low(self, symptom_service):
        """Test generating recommendations for low urgency"""
        analysis_result = {
            "urgency_level": "low",
            "categories": [],
            "warning_signs": []
        }
        
        recommendations = await symptom_service._generate_detailed_recommendations(
            analysis_result,
            [{"name": "malestar"}],
            None
        )
        
        assert "immediate_actions" in recommendations
        assert len(recommendations["immediate_actions"]) > 0
    
    @pytest.mark.asyncio
    async def test_generate_detailed_recommendations_with_context(self, symptom_service):
        """Test generating recommendations with patient context"""
        analysis_result = {
            "urgency_level": "medium",
            "categories": ["respiratory"],
            "warning_signs": []
        }
        
        context = {
            "age": 70,
            "diabetes": True,
            "hypertension": True
        }
        
        recommendations = await symptom_service._generate_detailed_recommendations(
            analysis_result,
            [{"name": "tos"}],
            context
        )
        
        assert "specialist_referrals" in recommendations
        assert "medication_considerations" in recommendations
        assert any("geriatric" in ref.lower() or "geriátric" in ref.lower() for ref in recommendations["specialist_referrals"])
    
    @pytest.mark.asyncio
    async def test_generate_detailed_recommendations_error(self, symptom_service):
        """Test generating recommendations with error"""
        with patch('services.symptom_analysis_service.logger') as mock_logger:
            recommendations = await symptom_service._generate_detailed_recommendations(
                {},
                [],
                None
            )
            
            assert "error" in recommendations
    
    @pytest.mark.asyncio
    async def test_assess_health_risks_high(self, symptom_service):
        """Test health risk assessment for high risk"""
        analysis_result = {
            "urgency_level": "critical",
            "severity_score": 0.9,
            "warning_signs": ["Severe symptom"],
            "categories": ["respiratory"]
        }
        
        risk_assessment = await symptom_service._assess_health_risks(analysis_result, None)
        
        assert risk_assessment["overall_risk_level"] == "high"
        assert len(risk_assessment["risk_factors"]) > 0
        assert len(risk_assessment["potential_complications"]) > 0
        assert len(risk_assessment["risk_mitigation"]) > 0
    
    @pytest.mark.asyncio
    async def test_assess_health_risks_moderate(self, symptom_service):
        """Test health risk assessment for moderate risk"""
        analysis_result = {
            "urgency_level": "high",
            "severity_score": 0.65,
            "warning_signs": [],
            "categories": ["fever"]
        }
        
        risk_assessment = await symptom_service._assess_health_risks(analysis_result, None)
        
        assert risk_assessment["overall_risk_level"] == "moderate"
    
    @pytest.mark.asyncio
    async def test_assess_health_risks_low(self, symptom_service):
        """Test health risk assessment for low risk"""
        analysis_result = {
            "urgency_level": "low",
            "severity_score": 0.3,
            "warning_signs": [],
            "categories": []
        }
        
        risk_assessment = await symptom_service._assess_health_risks(analysis_result, None)
        
        assert risk_assessment["overall_risk_level"] == "low"
    
    @pytest.mark.asyncio
    async def test_assess_health_risks_with_context(self, symptom_service):
        """Test health risk assessment with patient context"""
        analysis_result = {
            "urgency_level": "medium",
            "severity_score": 0.5,
            "warning_signs": [],
            "categories": []
        }
        
        context = {
            "age": 75,
            "diabetes": True,
            "smoking": True
        }
        
        risk_assessment = await symptom_service._assess_health_risks(analysis_result, context)
        
        assert len(risk_assessment["risk_factors"]) >= 2
        assert any("age" in factor.lower() or "edad" in factor.lower() for factor in risk_assessment["risk_factors"])
    
    @pytest.mark.asyncio
    async def test_create_follow_up_plan_required(self, symptom_service):
        """Test creating follow-up plan when required"""
        analysis_result = {
            "urgency_level": "high",
            "follow_up_required": True
        }
        
        follow_up = await symptom_service._create_follow_up_plan(analysis_result, "patient_123")
        
        assert follow_up["required"] is True
        assert "timeline" in follow_up
        assert "type" in follow_up
        assert "recommendations" in follow_up
        assert "monitoring_schedule" in follow_up
    
    @pytest.mark.asyncio
    async def test_create_follow_up_plan_not_required(self, symptom_service):
        """Test creating follow-up plan when not required"""
        analysis_result = {
            "urgency_level": "low",
            "follow_up_required": False
        }
        
        follow_up = await symptom_service._create_follow_up_plan(analysis_result, "patient_123")
        
        assert follow_up["required"] is False
        assert len(follow_up["recommendations"]) > 0
    
    @pytest.mark.asyncio
    async def test_create_follow_up_plan_critical(self, symptom_service):
        """Test creating follow-up plan for critical urgency"""
        analysis_result = {
            "urgency_level": "critical",
            "follow_up_required": True
        }
        
        follow_up = await symptom_service._create_follow_up_plan(analysis_result, "patient_123")
        
        assert follow_up["urgency"] == "critical"
        assert follow_up["type"] == "urgent"
        assert "immediate" in follow_up["timeline"].lower() or "inmediat" in follow_up["timeline"].lower()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_comprehensive_error_handling(self, symptom_service, sample_symptoms):
        """Test error handling in comprehensive analysis"""
        symptom_service.service_manager.analyze_symptoms.side_effect = Exception("Service error")
        
        with pytest.raises(Exception):
            await symptom_service.analyze_symptoms_comprehensive(
                symptoms=sample_symptoms,
                patient_id="patient_123"
            )
            mock_follow.return_value = {"next_appointment": "2024-01-15", "monitoring": True}
            
            result = await symptom_service.analyze_symptoms_comprehensive(
                symptoms=sample_symptoms,
                patient_id="patient_123"
            )
            
            assert "follow_up_plan" in result
            mock_follow.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_batch(self, symptom_service):
        """Test batch symptom analysis"""
        batch_requests = [
            {"symptoms": [{"name": "tos"}], "patient_id": "p1"},
            {"symptoms": [{"name": "fiebre"}], "patient_id": "p2"}
        ]
        
        result = await symptom_service.analyze_symptoms_batch(batch_requests)
        
        assert isinstance(result, list)
        assert len(result) == 2
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_batch_with_strategy(self, symptom_service):
        """Test batch analysis with strategy preference"""
        batch_requests = [{"symptoms": [{"name": "tos"}], "patient_id": "p1"}]
        
        result = await symptom_service.analyze_symptoms_batch(
            batch_requests,
            strategy_preference="local"
        )
        
        assert isinstance(result, list)
    
    @pytest.mark.asyncio
    async def test_perform_basic_analysis_with_manager(self, symptom_service, sample_symptoms):
        """Test basic analysis using service manager"""
        result = await symptom_service._perform_basic_analysis(
            symptoms=sample_symptoms,
            patient_id="patient_123",
            context=None
        )
        
        assert result is not None
        symptom_service.service_manager.analyze_symptoms.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_perform_basic_analysis_fallback(self, sample_symptoms):
        """Test basic analysis fallback when no manager"""
        service = SymptomAnalysisService(service_manager=None)
        
        # Correct import path: from symptom_analyzer.analyzer import analyzer
        with patch('symptom_analyzer.analyzer.analyzer') as mock_analyzer:
            mock_analyzer.analyze_symptoms = AsyncMock(return_value={"disease": "Bronquitis"})
            
            result = await service._perform_basic_analysis(
                symptoms=sample_symptoms,
                patient_id="patient_123",
                context=None
            )
            
            assert result is not None
    
    @pytest.mark.asyncio
    async def test_analyze_symptom_trends(self, symptom_service):
        """Test symptom trend analysis"""
        result = await symptom_service._analyze_symptom_trends("patient_123")
        
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_generate_detailed_recommendations(self, symptom_service, sample_symptoms):
        """Test detailed recommendations generation"""
        analysis_result = {"disease": "Bronquitis", "urgency_level": "moderate"}
        
        result = await symptom_service._generate_detailed_recommendations(
            analysis_result=analysis_result,
            symptoms=sample_symptoms,
            context=None
        )
        
        # _generate_detailed_recommendations returns Dict, not list
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_assess_health_risks(self, symptom_service, sample_symptoms):
        """Test health risk assessment"""
        analysis_result = {"disease": "Bronquitis", "confidence": 0.85}
        context = {"age": 45, "gender": "M"}
        
        result = await symptom_service._assess_health_risks(analysis_result, context)
        
        assert isinstance(result, dict)
        assert "risk_level" in result or "factors" in result
    
    @pytest.mark.asyncio
    async def test_create_follow_up_plan(self, symptom_service, sample_symptoms):
        """Test follow-up plan creation"""
        analysis_result = {"disease": "Bronquitis", "urgency_level": "moderate"}
        
        result = await symptom_service._create_follow_up_plan(
            analysis_result=analysis_result,
            patient_id="patient_123"
        )
        
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_error_handling(self, symptom_service, sample_symptoms):
        """Test error handling in comprehensive analysis"""
        symptom_service.service_manager.analyze_symptoms.side_effect = Exception("Service error")
        
        with pytest.raises(Exception):
            await symptom_service.analyze_symptoms_comprehensive(
                symptoms=sample_symptoms,
                patient_id="patient_123"
            )

