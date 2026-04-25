"""
Edge case tests for various modules
Tests boundary conditions, error cases, and unusual inputs
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List

from services.ai_service_manager import AIServiceManager
from services.symptom_analysis_service import SymptomAnalysisService
from services.medical_history_service import MedicalHistoryService
from services.enhanced_chatbot_service import EnhancedChatbotService
from services.core_domains_support import CoreDomainsSupportService
from utils.urgency_calculator import calculate_urgency_level


class TestEdgeCases:
    """Edge case tests for various modules"""
    
    @pytest.mark.asyncio
    async def test_ai_service_manager_empty_batch(self):
        """Test AI service manager with empty batch"""
        manager = AIServiceManager(environment="development")
        manager._initialized = True
        
        results = await manager.analyze_symptoms_batch([])
        
        assert results == []
    
    @pytest.mark.asyncio
    async def test_ai_service_manager_very_large_batch(self):
        """Test AI service manager with very large batch"""
        manager = AIServiceManager(environment="development")
        manager._initialized = True
        manager.strategies = {'primary': MagicMock()}
        manager.strategies['primary'].analyze_symptoms = AsyncMock(return_value={"disease": "Test"})
        
        # Create large batch
        large_batch = [
            {"symptoms": [{"symptom": "tos"}], "patient_id": f"P{i:04d}"}
            for i in range(100)
        ]
        
        results = await manager.analyze_symptoms_batch(large_batch)
        
        assert len(results) == 100
        assert all("patient_id" in result for result in results)
    
    @pytest.mark.asyncio
    async def test_ai_service_manager_missing_patient_id(self):
        """Test AI service manager with missing patient_id"""
        manager = AIServiceManager(environment="development")
        manager._initialized = True
        manager.strategies = {'primary': MagicMock()}
        manager.strategies['primary'].analyze_symptoms = AsyncMock(return_value={"disease": "Test"})
        
        batch = [{"symptoms": [{"symptom": "tos"}]}]  # No patient_id
        
        results = await manager.analyze_symptoms_batch(batch)
        
        assert len(results) == 1
        assert results[0]["patient_id"] == "unknown"
    
    @pytest.mark.asyncio
    async def test_symptom_analysis_empty_symptoms(self):
        """Test symptom analysis with empty symptoms list"""
        service = SymptomAnalysisService()
        service.service_manager = AsyncMock()
        service.service_manager.analyze_symptoms = AsyncMock(return_value={"urgency_level": "low"})
        
        result = await service.analyze_symptoms_comprehensive(
            symptoms=[],
            patient_id="P001"
        )
        
        assert result is not None
        assert "urgency_level" in result or "disease" in result
    
    @pytest.mark.asyncio
    async def test_symptom_analysis_very_many_symptoms(self):
        """Test symptom analysis with very many symptoms"""
        service = SymptomAnalysisService()
        service.service_manager = AsyncMock()
        service.service_manager.analyze_symptoms = AsyncMock(return_value={"urgency_level": "high"})
        
        many_symptoms = [{"name": f"symptom_{i}", "severity": "moderate"} for i in range(50)]
        
        result = await service.analyze_symptoms_comprehensive(
            symptoms=many_symptoms,
            patient_id="P001"
        )
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_symptom_analysis_missing_severity(self):
        """Test symptom analysis with missing severity"""
        service = SymptomAnalysisService()
        service.service_manager = AsyncMock()
        service.service_manager.analyze_symptoms = AsyncMock(return_value={"urgency_level": "medium"})
        
        symptoms = [{"name": "tos"}]  # No severity
        
        result = await service.analyze_symptoms_comprehensive(
            symptoms=symptoms,
            patient_id="P001"
        )
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_medical_history_empty_text(self):
        """Test medical history processing with empty text"""
        service = MedicalHistoryService()
        service.service_manager = AsyncMock()
        service.service_manager.process_medical_history = AsyncMock(return_value={"symptoms": []})
        
        result = await service.process_medical_history_comprehensive(
            text="",
            patient_id="P001"
        )
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_medical_history_very_long_text(self):
        """Test medical history processing with very long text"""
        service = MedicalHistoryService()
        service.service_manager = AsyncMock()
        service.service_manager.process_medical_history = AsyncMock(return_value={"symptoms": []})
        
        long_text = "Paciente con síntomas. " * 1000  # Very long text
        
        result = await service.process_medical_history_comprehensive(
            text=long_text,
            patient_id="P001"
        )
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_medical_history_special_characters(self):
        """Test medical history processing with special characters"""
        service = MedicalHistoryService()
        service.service_manager = AsyncMock()
        service.service_manager.process_medical_history = AsyncMock(return_value={"symptoms": []})
        
        text = "Paciente con síntomas: tos, fiebre; dolor (severidad: alta)."
        
        result = await service.process_medical_history_comprehensive(
            text=text,
            patient_id="P001"
        )
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_chatbot_empty_message(self):
        """Test chatbot with empty message"""
        chatbot = EnhancedChatbotService()
        
        result = await chatbot.process_user_message(
            user_message="",
            conversation_history=None,
            context=None
        )
        
        assert result["success"] is True
        assert "message" in result
    
    @pytest.mark.asyncio
    async def test_chatbot_very_long_message(self):
        """Test chatbot with very long message"""
        chatbot = EnhancedChatbotService()
        
        long_message = "Tengo síntomas. " * 1000
        
        result = await chatbot.process_user_message(
            user_message=long_message,
            conversation_history=None,
            context=None
        )
        
        assert result["success"] is True
    
    @pytest.mark.asyncio
    async def test_chatbot_unicode_characters(self):
        """Test chatbot with unicode characters"""
        chatbot = EnhancedChatbotService()
        
        unicode_message = "Tengo síntomas: tos, fiebre, dolor de garganta. ¿Qué debo hacer?"
        
        result = await chatbot.process_user_message(
            user_message=unicode_message,
            conversation_history=None,
            context=None
        )
        
        assert result["success"] is True
    
    @pytest.mark.asyncio
    async def test_chatbot_only_numbers(self):
        """Test chatbot with only numbers"""
        chatbot = EnhancedChatbotService()
        
        result = await chatbot.process_user_message(
            user_message="123456789",
            conversation_history=None,
            context=None
        )
        
        assert result["success"] is True
    
    @pytest.mark.asyncio
    async def test_chatbot_only_punctuation(self):
        """Test chatbot with only punctuation"""
        chatbot = EnhancedChatbotService()
        
        result = await chatbot.process_user_message(
            user_message="!!!???...",
            conversation_history=None,
            context=None
        )
        
        assert result["success"] is True
    
    def test_urgency_calculator_zero_severity_scores(self):
        """Test urgency calculator with zero severity scores"""
        symptoms = ['tos']
        severity_scores = [0.0, 0.0]
        
        result = calculate_urgency_level(symptoms, severity_scores)
        
        assert result == 'low'
    
    def test_urgency_calculator_max_severity_scores(self):
        """Test urgency calculator with maximum severity scores"""
        symptoms = ['síntoma crítico']
        severity_scores = [1.0, 1.0]
        
        result = calculate_urgency_level(symptoms, severity_scores)
        
        assert result in ['high', 'critical']
    
    def test_urgency_calculator_mismatched_lengths(self):
        """Test urgency calculator with mismatched symptom and score lengths"""
        symptoms = ['tos', 'fiebre', 'dolor']
        severity_scores = [0.5, 0.6]  # Fewer scores than symptoms
        
        # Should handle gracefully
        result = calculate_urgency_level(symptoms, severity_scores)
        
        assert result in ['low', 'medium', 'high', 'critical']
    
    def test_urgency_calculator_negative_age(self):
        """Test urgency calculator with negative age"""
        symptoms = ['tos']
        result = calculate_urgency_level(symptoms, patient_age=-5)
        
        # Should handle gracefully
        assert result in ['low', 'medium', 'high', 'critical']
    
    def test_urgency_calculator_very_high_age(self):
        """Test urgency calculator with very high age"""
        symptoms = ['tos']
        result = calculate_urgency_level(symptoms, patient_age=150)
        
        # Should handle gracefully
        assert result in ['low', 'medium', 'high', 'critical']
    
    def test_urgency_calculator_empty_risk_factors(self):
        """Test urgency calculator with empty risk factors"""
        symptoms = ['tos']
        result = calculate_urgency_level(symptoms, risk_factors=[])
        
        assert result in ['low', 'medium', 'high', 'critical']
    
    def test_urgency_calculator_very_many_risk_factors(self):
        """Test urgency calculator with very many risk factors"""
        symptoms = ['tos']
        risk_factors = [f'risk_{i}' for i in range(20)]
        
        result = calculate_urgency_level(symptoms, risk_factors=risk_factors)
        
        # Should increase urgency significantly
        assert result in ['medium', 'high', 'critical']
    
    @pytest.mark.asyncio
    async def test_core_domains_empty_slots(self):
        """Test core domains with empty appointment slots"""
        service = CoreDomainsSupportService()
        
        result = await service.optimize_appointment_scheduling(
            patient_id="P001",
            symptoms=["tos"],
            urgency="high",
            available_slots=[],
            context=None
        )
        
        assert result["success"] is True
        assert result["recommended_slot"] is None
    
    @pytest.mark.asyncio
    async def test_core_domains_very_many_slots(self):
        """Test core domains with very many appointment slots"""
        service = CoreDomainsSupportService()
        
        many_slots = [
            {"datetime": f"2024-01-15T{i:02d}:00:00", "doctor": f"Dr. {i}"}
            for i in range(24)
        ]
        
        result = await service.optimize_appointment_scheduling(
            patient_id="P001",
            symptoms=["tos"],
            urgency="high",
            available_slots=many_slots,
            context=None
        )
        
        assert result["success"] is True
        assert result["recommended_slot"] is not None
    
    @pytest.mark.asyncio
    async def test_core_domains_empty_prescription(self):
        """Test core domains with empty prescription text"""
        service = CoreDomainsSupportService()
        
        result = await service.analyze_prescription_safety(
            prescription_text="",
            patient_id="P001"
        )
        
        assert result["success"] is True
        assert "medications" in result
    
    @pytest.mark.asyncio
    async def test_core_domains_empty_alert_data(self):
        """Test core domains with empty alert data"""
        service = CoreDomainsSupportService()
        
        result = await service.assess_alert_priority(
            alert_data={},
            patient_context=None
        )
        
        assert result["success"] is True
        assert "priority_level" in result
    
    @pytest.mark.asyncio
    async def test_service_manager_uninitialized_access(self):
        """Test accessing service manager methods before initialization"""
        manager = AIServiceManager()
        
        # Should auto-initialize
        with patch.object(manager, 'initialize', new_callable=AsyncMock) as mock_init:
            manager.strategies = {'primary': MagicMock()}
            manager.strategies['primary'].analyze_symptoms = AsyncMock(return_value={"disease": "Test"})
            
            await manager.analyze_symptoms(
                symptoms=[{"symptom": "tos"}],
                patient_id="P001"
            )
            
            # Should have attempted initialization
            assert manager._initialized or mock_init.called
    
    @pytest.mark.asyncio
    async def test_service_manager_none_strategies(self):
        """Test service manager with None strategies"""
        manager = AIServiceManager()
        manager._initialized = True
        manager.strategies = {}
        
        # Should handle gracefully
        with pytest.raises((KeyError, AttributeError, TypeError)):
            await manager.analyze_symptoms(
                symptoms=[{"symptom": "tos"}],
                patient_id="P001"
            )
    
    @pytest.mark.asyncio
    async def test_batch_processing_concurrent_limit(self):
        """Test that batch processing respects concurrent limits"""
        manager = AIServiceManager(environment="development")
        manager._initialized = True
        manager.strategies = {'primary': MagicMock()}
        manager.strategies['primary'].analyze_symptoms = AsyncMock(return_value={"disease": "Test"})
        
        # Create batch that exceeds default limit
        batch = [
            {"symptoms": [{"symptom": "tos"}], "patient_id": f"P{i}"}
            for i in range(50)
        ]
        
        results = await manager.analyze_symptoms_batch(batch)
        
        # Should complete all, but with concurrency control
        assert len(results) == 50
    
    def test_urgency_calculator_none_inputs(self):
        """Test urgency calculator with None inputs"""
        # Empty symptoms
        result = calculate_urgency_level([], None, None, None)
        assert result == 'low'
        
        # Symptoms with None scores
        result = calculate_urgency_level(['tos'], None, None, None)
        assert result in ['low', 'medium']
    
    def test_urgency_calculator_extreme_scores(self):
        """Test urgency calculator with extreme score values"""
        # Very small scores
        result = calculate_urgency_level(['tos'], [0.001, 0.001])
        assert result == 'low'
        
        # Very large scores
        result = calculate_urgency_level(['tos'], [0.999, 0.999])
        assert result in ['high', 'critical']
    
    @pytest.mark.asyncio
    async def test_symptom_analysis_all_options_false(self):
        """Test symptom analysis with all optional features disabled"""
        service = SymptomAnalysisService()
        service.service_manager = AsyncMock()
        service.service_manager.analyze_symptoms = AsyncMock(return_value={"urgency_level": "medium"})
        
        result = await service.analyze_symptoms_comprehensive(
            symptoms=[{"name": "tos"}],
            patient_id="P001",
            include_trends=False,
            include_recommendations=False
        )
        
        assert result is not None
        # Should not have optional features
        assert "trend_analysis" not in result
        assert "detailed_recommendations" not in result
    
    @pytest.mark.asyncio
    async def test_medical_history_all_options_false(self):
        """Test medical history with all optional features disabled"""
        service = MedicalHistoryService()
        service.service_manager = AsyncMock()
        service.service_manager.process_medical_history = AsyncMock(return_value={"symptoms": []})
        
        result = await service.process_medical_history_comprehensive(
            text="Test text",
            patient_id="P001",
            include_entity_extraction=False,
            include_diagnosis_suggestions=False,
            include_risk_assessment=False
        )
        
        assert result is not None
        # Should not have optional features
        assert "entity_analysis" not in result
        assert "diagnosis_analysis" not in result
        assert "risk_assessment" not in result
    
    @pytest.mark.asyncio
    async def test_chatbot_very_long_conversation_history(self):
        """Test chatbot with very long conversation history"""
        chatbot = EnhancedChatbotService()
        
        long_history = []
        for i in range(100):
            long_history.append({"role": "user", "content": f"Message {i}"})
            long_history.append({"role": "assistant", "content": f"Response {i}"})
        
        result = await chatbot.process_user_message(
            user_message="Test",
            conversation_history=long_history,
            context=None
        )
        
        assert result["success"] is True
    
    @pytest.mark.asyncio
    async def test_chatbot_none_conversation_history(self):
        """Test chatbot with None conversation history"""
        chatbot = EnhancedChatbotService()
        
        result = await chatbot.process_user_message(
            user_message="Test",
            conversation_history=None,
            context=None
        )
        
        assert result["success"] is True
    
    @pytest.mark.asyncio
    async def test_chatbot_none_context(self):
        """Test chatbot with None context"""
        chatbot = EnhancedChatbotService()
        
        result = await chatbot.process_user_message(
            user_message="Test",
            conversation_history=None,
            context=None
        )
        
        assert result["success"] is True
    
    def test_urgency_calculator_float_precision(self):
        """Test urgency calculator with floating point precision issues"""
        symptoms = ['tos']
        # Scores that might cause precision issues
        severity_scores = [0.4000000001, 0.3999999999]
        
        result = calculate_urgency_level(symptoms, severity_scores)
        
        # Should handle precision correctly
        assert result in ['low', 'medium', 'high', 'critical']
    
    @pytest.mark.asyncio
    async def test_service_manager_shutdown_multiple_times(self):
        """Test shutting down service manager multiple times"""
        manager = AIServiceManager()
        manager._initialized = True
        
        await manager.shutdown()
        assert manager._initialized is False
        
        # Should handle multiple shutdowns gracefully
        await manager.shutdown()
        assert manager._initialized is False
    
    @pytest.mark.asyncio
    async def test_service_manager_health_check_uninitialized(self):
        """Test health check when not initialized"""
        manager = AIServiceManager()
        
        health = await manager.get_service_health()
        
        assert health["initialized"] is False
        assert health["overall_status"] == "unhealthy"

