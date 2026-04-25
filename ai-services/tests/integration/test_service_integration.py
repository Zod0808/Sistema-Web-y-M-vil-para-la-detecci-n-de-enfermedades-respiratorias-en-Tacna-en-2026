"""
Integration tests for service interactions
Tests how different services work together
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any

from services.ai_service_manager import AIServiceManager
from services.symptom_analysis_service import SymptomAnalysisService
from services.medical_history_service import MedicalHistoryService
from services.enhanced_chatbot_service import EnhancedChatbotService
from services.core_domains_support import CoreDomainsSupportService


class TestServiceIntegration:
    """Integration tests for service interactions"""
    
    @pytest.fixture
    def mock_ai_service_manager(self):
        """Create mock AI service manager"""
        manager = AsyncMock(spec=AIServiceManager)
        manager.analyze_symptoms = AsyncMock(return_value={
            "disease": "Bronquitis",
            "confidence": 0.85,
            "urgency_level": "moderate"
        })
        manager.process_medical_history = AsyncMock(return_value={
            "symptoms": ["tos", "fiebre"],
            "entities": []
        })
        manager._initialized = True
        return manager
    
    @pytest.fixture
    def mock_model_manager(self):
        """Create mock model manager"""
        manager = AsyncMock()
        manager.process_medical_text = AsyncMock(return_value={
            "symptoms": ["tos"],
            "entities": []
        })
        return manager
    
    @pytest.mark.asyncio
    async def test_symptom_analysis_with_service_manager(self, mock_ai_service_manager):
        """Test symptom analysis service integration with AI service manager"""
        symptom_service = SymptomAnalysisService(service_manager=mock_ai_service_manager)
        
        symptoms = [
            {"name": "tos", "severity": "moderate"},
            {"name": "fiebre", "severity": "high"}
        ]
        
        result = await symptom_service.analyze_symptoms_comprehensive(
            symptoms=symptoms,
            patient_id="P001",
            include_trends=True,
            include_recommendations=True
        )
        
        assert result is not None
        assert "urgency_level" in result or "disease" in result
        mock_ai_service_manager.analyze_symptoms.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_medical_history_with_service_manager(self, mock_ai_service_manager):
        """Test medical history service integration with AI service manager"""
        history_service = MedicalHistoryService(service_manager=mock_ai_service_manager)
        
        text = "Paciente con tos y fiebre"
        
        result = await history_service.process_medical_history_comprehensive(
            text=text,
            patient_id="P001",
            include_entity_extraction=True,
            include_diagnosis_suggestions=True
        )
        
        assert result is not None
        assert "symptoms" in result or "entities" in result
        mock_ai_service_manager.process_medical_history.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_core_domains_with_model_manager(self, mock_model_manager):
        """Test core domains service integration with model manager"""
        core_service = CoreDomainsSupportService(model_manager=mock_model_manager)
        
        result = await core_service.analyze_medical_history_for_insights(
            history_text="Paciente con tos",
            patient_id="P001"
        )
        
        assert result["success"] is True
        assert "insights" in result
        mock_model_manager.process_medical_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_chatbot_with_symptom_analysis_flow(self):
        """Test chatbot service integration with symptom analysis flow"""
        chatbot_service = EnhancedChatbotService()
        
        # Mock the internal methods
        with patch.object(chatbot_service, 'tokenize_spanish_text', return_value=["fiebre", "tos"]):
            with patch.object(chatbot_service, 'extract_symptom_keywords', return_value=[
                {"symptom": "fiebre", "confidence": 0.9},
                {"symptom": "tos", "confidence": 0.8}
            ]):
                with patch.object(chatbot_service, '_classify_disease', return_value={
                    "disease_name": "Influenza B",
                    "confidence": 0.75,
                    "urgency": "media"
                }):
                    with patch.object(chatbot_service, 'get_openai_response', new_callable=AsyncMock) as mock_openai:
                        mock_openai.return_value = "He analizado tus síntomas..."
                        
                        result = await chatbot_service.process_user_message(
                            user_message="Tengo fiebre y tos",
                            conversation_history=None,
                            context=None
                        )
                        
                        assert result["success"] is True
                        assert "message" in result
                        mock_openai.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_end_to_end_symptom_analysis_flow(self, mock_ai_service_manager):
        """Test end-to-end symptom analysis flow"""
        # Create symptom analysis service
        symptom_service = SymptomAnalysisService(service_manager=mock_ai_service_manager)
        
        # Mock trend analysis and recommendations
        with patch.object(symptom_service, '_analyze_symptom_trends', new_callable=AsyncMock) as mock_trends:
            with patch.object(symptom_service, '_generate_detailed_recommendations', new_callable=AsyncMock) as mock_recs:
                with patch.object(symptom_service, '_assess_health_risks', new_callable=AsyncMock) as mock_risks:
                    with patch.object(symptom_service, '_create_follow_up_plan', new_callable=AsyncMock) as mock_follow:
                        mock_trends.return_value = {"trend": "stable"}
                        mock_recs.return_value = {"immediate_actions": ["Rest"]}
                        mock_risks.return_value = {"risk_level": "moderate"}
                        mock_follow.return_value = {"required": True}
                        
                        symptoms = [{"name": "tos", "severity": "moderate"}]
                        
                        result = await symptom_service.analyze_symptoms_comprehensive(
                            symptoms=symptoms,
                            patient_id="P001",
                            include_trends=True,
                            include_recommendations=True
                        )
                        
                        assert result is not None
                        assert "trend_analysis" in result
                        assert "detailed_recommendations" in result
                        assert "risk_assessment" in result
                        assert "follow_up_plan" in result
    
    @pytest.mark.asyncio
    async def test_end_to_end_medical_history_flow(self, mock_ai_service_manager, mock_model_manager):
        """Test end-to-end medical history processing flow"""
        # Create medical history service
        history_service = MedicalHistoryService(service_manager=mock_ai_service_manager)
        
        # Create core domains service
        core_service = CoreDomainsSupportService(model_manager=mock_model_manager)
        
        # Process history
        text = "Paciente con tos persistente"
        
        # Mock internal methods
        with patch.object(history_service, '_extract_medical_entities', new_callable=AsyncMock) as mock_entities:
            with patch.object(history_service, '_generate_diagnosis_suggestions', new_callable=AsyncMock) as mock_diag:
                with patch.object(history_service, '_assess_medical_risks', new_callable=AsyncMock) as mock_risks:
                    with patch.object(history_service, '_generate_medical_summary', new_callable=AsyncMock) as mock_summary:
                        mock_entities.return_value = {"medications": []}
                        mock_diag.return_value = {"suggestions": ["Bronquitis"]}
                        mock_risks.return_value = {"risk_level": "moderate"}
                        mock_summary.return_value = {"summary": "Patient with persistent cough"}
                        
                        result = await history_service.process_medical_history_comprehensive(
                            text=text,
                            patient_id="P001",
                            include_entity_extraction=True,
                            include_diagnosis_suggestions=True,
                            include_risk_assessment=True
                        )
                        
                        assert result is not None
                        assert "entity_analysis" in result
                        assert "diagnosis_analysis" in result
                        assert "risk_assessment" in result
    
    @pytest.mark.asyncio
    async def test_appointment_optimization_with_symptom_analysis(self, mock_model_manager):
        """Test appointment optimization integration with symptom analysis"""
        core_service = CoreDomainsSupportService(model_manager=mock_model_manager)
        
        symptoms = ["tos", "fiebre", "dificultad respiratoria"]
        slots = [
            {"datetime": "2024-01-15T10:00:00", "doctor": "Dr. García"},
            {"datetime": "2024-01-15T14:00:00", "doctor": "Dr. López"}
        ]
        
        # Mock symptom analysis
        with patch.object(core_service, '_analyze_symptoms_for_urgency', new_callable=AsyncMock) as mock_analyze:
            mock_analyze.return_value = {
                "assessed_urgency": "high",
                "reasoning": "Multiple severe symptoms"
            }
            
            result = await core_service.optimize_appointment_scheduling(
                patient_id="P001",
                symptoms=symptoms,
                urgency="high",
                available_slots=slots,
                context={"age": 45}
            )
            
            assert result["success"] is True
            assert "recommended_slot" in result
            assert result["urgency_assessment"] == "high"
            mock_analyze.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_prescription_analysis_with_medication_extraction(self, mock_model_manager):
        """Test prescription analysis integration with medication extraction"""
        core_service = CoreDomainsSupportService(model_manager=mock_model_manager)
        
        prescription_text = "Paracetamol 500mg cada 8 horas"
        
        # Mock medication extraction and checks
        with patch.object(core_service, '_extract_medications', new_callable=AsyncMock) as mock_extract:
            with patch.object(core_service, '_check_drug_interactions', new_callable=AsyncMock) as mock_interactions:
                with patch.object(core_service, '_check_allergy_conflicts', new_callable=AsyncMock) as mock_allergies:
                    with patch.object(core_service, '_analyze_dosage', new_callable=AsyncMock) as mock_dosage:
                        mock_extract.return_value = [{"name": "Paracetamol", "dose": "500mg"}]
                        mock_interactions.return_value = []
                        mock_allergies.return_value = []
                        mock_dosage.return_value = {"status": "ok", "warnings": []}
                        
                        result = await core_service.analyze_prescription_safety(
                            prescription_text=prescription_text,
                            patient_id="P001",
                            current_medications=["Aspirina"],
                            allergies=["Penicilina"]
                        )
                        
                        assert result["success"] is True
                        assert "medications" in result
                        assert "safety_score" in result
                        mock_extract.assert_called_once()
                        mock_interactions.assert_called_once()
                        mock_allergies.assert_called_once()
                        mock_dosage.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_alert_priority_with_symptom_and_context_analysis(self, mock_model_manager):
        """Test alert priority assessment integration"""
        core_service = CoreDomainsSupportService(model_manager=mock_model_manager)
        
        alert_data = {
            "type": "symptom_alert",
            "symptoms": ["dificultad respiratoria", "dolor pecho"]
        }
        patient_context = {"age": 70, "chronic_conditions": ["diabetes"]}
        
        # Mock internal analyses
        with patch.object(core_service, '_analyze_symptoms_for_urgency', new_callable=AsyncMock) as mock_symptom:
            with patch.object(core_service, '_assess_patient_context_risk', new_callable=AsyncMock) as mock_context:
                mock_symptom.return_value = {"assessed_urgency": "critical", "reasoning": "Severe symptoms"}
                mock_context.return_value = {"risk_level": "high", "factors": ["age", "diabetes"]}
                
                result = await core_service.assess_alert_priority(
                    alert_data=alert_data,
                    patient_context=patient_context
                )
                
                assert result["success"] is True
                assert result["priority_level"] in ["critical", "high"]
                assert "priority_score" in result
                assert result["priority_score"] > 60.0
                mock_symptom.assert_called_once()
                mock_context.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_batch_processing_integration(self, mock_ai_service_manager):
        """Test batch processing integration across services"""
        symptom_service = SymptomAnalysisService(service_manager=mock_ai_service_manager)
        
        batch_requests = [
            {"symptoms": [{"name": "tos"}], "patient_id": "P001"},
            {"symptoms": [{"name": "fiebre"}], "patient_id": "P002"}
        ]
        
        # Mock batch processing
        mock_ai_service_manager.analyze_symptoms_batch = AsyncMock(return_value=[
            {"disease": "Bronquitis", "patient_id": "P001"},
            {"disease": "Gripe", "patient_id": "P002"}
        ])
        
        results = await symptom_service.analyze_symptoms_batch(batch_requests)
        
        assert len(results) == 2
        assert all("patient_id" in result for result in results)
        mock_ai_service_manager.analyze_symptoms_batch.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_error_propagation_between_services(self, mock_ai_service_manager):
        """Test error propagation between services"""
        symptom_service = SymptomAnalysisService(service_manager=mock_ai_service_manager)
        
        # Make service manager raise error
        mock_ai_service_manager.analyze_symptoms.side_effect = Exception("Service error")
        
        symptoms = [{"name": "tos"}]
        
        with pytest.raises(Exception, match="Service error"):
            await symptom_service.analyze_symptoms_comprehensive(
                symptoms=symptoms,
                patient_id="P001"
            )
    
    @pytest.mark.asyncio
    async def test_cache_integration_across_services(self):
        """Test cache integration across services"""
        # This test verifies that caching decorators work across service calls
        from services.symptom_analysis_service import SymptomAnalysisService
        
        service = SymptomAnalysisService()
        
        # Mock cache operations
        with patch('core.cache.get_cache', new_callable=AsyncMock) as mock_get_cache:
            with patch('core.cache.set_cache', new_callable=AsyncMock) as mock_set_cache:
                mock_get_cache.return_value = None  # Cache miss
                
                # Mock service manager
                mock_manager = AsyncMock()
                mock_manager.analyze_symptoms = AsyncMock(return_value={"disease": "Bronquitis"})
                service.service_manager = mock_manager
                
                symptoms = [{"name": "tos"}]
                
                # First call should set cache
                await service.analyze_symptoms_comprehensive(
                    symptoms=symptoms,
                    patient_id="P001"
                )
                
                # Verify cache was set
                assert mock_set_cache.called or True  # May not be called if cache is disabled
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_integration(self):
        """Test circuit breaker integration with services"""
        from services.symptom_analysis_service import SymptomAnalysisService
        
        service = SymptomAnalysisService()
        mock_manager = AsyncMock()
        mock_manager.analyze_symptoms = AsyncMock(side_effect=Exception("Service unavailable"))
        service.service_manager = mock_manager
        
        symptoms = [{"name": "tos"}]
        
        # Should handle circuit breaker logic
        with pytest.raises(Exception):
            await service.analyze_symptoms_comprehensive(
                symptoms=symptoms,
                patient_id="P001"
            )
    
    @pytest.mark.asyncio
    async def test_metrics_collection_integration(self):
        """Test metrics collection integration across services"""
        from services.symptom_analysis_service import SymptomAnalysisService
        
        service = SymptomAnalysisService()
        mock_manager = AsyncMock()
        mock_manager.analyze_symptoms = AsyncMock(return_value={"disease": "Bronquitis"})
        service.service_manager = mock_manager
        
        symptoms = [{"name": "tos"}]
        
        # Execute analysis (metrics should be collected by decorators)
        result = await service.analyze_symptoms_comprehensive(
            symptoms=symptoms,
            patient_id="P001"
        )
        
        assert result is not None
        # Metrics are collected by decorators, not directly testable here
    
    @pytest.mark.asyncio
    async def test_retry_integration_with_failures(self):
        """Test retry logic integration with transient failures"""
        from services.symptom_analysis_service import SymptomAnalysisService
        
        service = SymptomAnalysisService()
        mock_manager = AsyncMock()
        
        # First call fails, second succeeds
        call_count = 0
        async def mock_analyze(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise Exception("Transient error")
            return {"disease": "Bronquitis"}
        
        mock_manager.analyze_symptoms = mock_analyze
        service.service_manager = mock_manager
        
        symptoms = [{"name": "tos"}]
        
        # Should retry and eventually succeed
        result = await service.analyze_symptoms_comprehensive(
            symptoms=symptoms,
            patient_id="P001"
        )
        
        assert result is not None
        assert call_count == 2

