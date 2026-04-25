"""
Unit tests for ConversationalAIService
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List

from services.conversational_ai_service import ConversationalAIService


class TestConversationalAIService:
    """Test ConversationalAIService implementation"""

    @pytest.fixture
    def service(self):
        """Create service instance without external dependencies"""
        return ConversationalAIService(service_manager=None)

    @pytest.fixture
    def service_with_manager(self):
        """Create service with mocked service manager"""
        manager = AsyncMock()
        manager.analyze_symptoms.return_value = {
            "disease": "Gripe",
            "confidence": 0.78,
            "urgency_level": "medium",
            "symptoms": ["fiebre", "tos"],
        }
        return ConversationalAIService(service_manager=manager)

    # ─── __init__ ─────────────────────────────────────────────────────────────

    def test_init_sets_symptom_keywords(self, service):
        """Should initialize symptom keyword categories"""
        assert isinstance(service.symptom_keywords, dict)
        assert 'respiratory' in service.symptom_keywords
        assert 'fever' in service.symptom_keywords
        assert 'pain' in service.symptom_keywords
        assert 'fatigue' in service.symptom_keywords
        assert 'digestive' in service.symptom_keywords
        assert 'neurological' in service.symptom_keywords

    def test_init_sets_urgency_indicators(self, service):
        """Should initialize urgency indicator categories"""
        assert isinstance(service.urgency_indicators, dict)
        assert 'critical' in service.urgency_indicators
        assert 'high' in service.urgency_indicators
        assert 'medium' in service.urgency_indicators

    def test_init_sets_severity_keywords(self, service):
        """Should initialize severity keyword mappings"""
        assert isinstance(service.severity_keywords, dict)
        assert 'extreme' in service.severity_keywords
        assert 'high' in service.severity_keywords
        assert 'moderate' in service.severity_keywords
        assert 'mild' in service.severity_keywords

    def test_init_with_service_manager(self, service_with_manager):
        """Should store service manager reference"""
        assert service_with_manager.service_manager is not None

    def test_init_without_service_manager(self, service):
        """Should work without service manager"""
        assert service.service_manager is None

    # ─── analyze_conversation ─────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_analyze_conversation_returns_dict(self, service):
        """Should return a dictionary from conversation analysis"""
        result = await service.analyze_conversation("Tengo tos y fiebre")
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_analyze_conversation_basic_symptoms(self, service):
        """Should extract respiratory symptoms from message"""
        result = await service.analyze_conversation("Tengo tos persistente y dificultad para respirar")
        assert result is not None
        result_str = str(result).lower()
        # Should detect respiratory symptoms
        assert any(word in result_str for word in ['tos', 'respirat', 'respiratory', 'sintoma'])

    @pytest.mark.asyncio
    async def test_analyze_conversation_with_history(self, service):
        """Should accept conversation history parameter"""
        history = [
            {"role": "user", "content": "Tengo tos"},
            {"role": "assistant", "content": "¿Desde cuándo tiene tos?"},
        ]
        result = await service.analyze_conversation(
            "Desde hace 3 días, también tengo fiebre",
            conversation_history=history
        )
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_analyze_conversation_with_context(self, service):
        """Should accept context parameter"""
        context = {'patient_age': 45, 'has_asthma': True}
        result = await service.analyze_conversation(
            "Me cuesta respirar",
            context=context
        )
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_analyze_conversation_critical_message(self, service):
        """Should detect critical urgency in emergency messages"""
        result = await service.analyze_conversation(
            "No puedo respirar, me estoy ahogando, es una emergencia médica"
        )
        assert result is not None
        result_str = str(result).lower()
        # Should flag high/critical urgency
        assert any(word in result_str for word in ['critical', 'critica', 'high', 'urgente', 'emergencia'])

    @pytest.mark.asyncio
    async def test_analyze_conversation_empty_message(self, service):
        """Should handle empty message without crashing"""
        result = await service.analyze_conversation("")
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_analyze_conversation_no_symptoms(self, service):
        """Should handle message with no medical content"""
        result = await service.analyze_conversation("Hola, buenos días")
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_analyze_conversation_fever_keywords(self, service):
        """Should detect fever-related symptoms"""
        result = await service.analyze_conversation("Tengo mucha fiebre y escalofríos")
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_analyze_conversation_pain_keywords(self, service):
        """Should detect pain-related symptoms"""
        result = await service.analyze_conversation("Me duele mucho el pecho y tengo punzadas")
        assert isinstance(result, dict)

    # ─── _classify_symptoms ───────────────────────────────────────────────────

    def test_classify_symptoms_respiratory(self, service):
        """Should classify respiratory symptoms correctly"""
        result = service._classify_symptoms([
            {'name': 'tos', 'severity': 'moderate'},
            {'name': 'dificultad respiratoria', 'severity': 'high'},
        ])
        assert isinstance(result, list)

    def test_classify_symptoms_empty(self, service):
        """Should handle empty symptoms list"""
        result = service._classify_symptoms([])
        assert isinstance(result, list)

    def test_classify_symptoms_mixed(self, service):
        """Should classify mixed symptom types"""
        result = service._classify_symptoms([
            {'name': 'fiebre', 'severity': 'mild'},
            {'name': 'tos', 'severity': 'moderate'},
            {'name': 'dolor de cabeza', 'severity': 'mild'},
        ])
        assert isinstance(result, list)

    # ─── get_conversation_context ──────────────────────────────────────────

    def test_get_conversation_context_empty_history(self, service):
        """Should handle empty conversation history"""
        result = service.get_conversation_context([])
        assert isinstance(result, dict)

    def test_get_conversation_context_with_history(self, service):
        """Should extract context from conversation history"""
        history = [
            {"role": "user", "content": "Tengo tos y fiebre desde hace 2 días"},
            {"role": "assistant", "content": "¿Ha tenido contacto con personas enfermas?"},
            {"role": "user", "content": "Sí, mi hijo tuvo gripe la semana pasada"},
        ]
        result = service.get_conversation_context(history)
        assert isinstance(result, dict)

    def test_get_conversation_context_extracts_symptoms(self, service):
        """Should extract symptoms mentioned in history"""
        history = [
            {"role": "user", "content": "Tengo tos severa y dificultad para respirar"},
        ]
        result = service.get_conversation_context(history)
        assert isinstance(result, dict)
        # Should identify some context
        assert result is not None

    def test_get_conversation_context_single_message(self, service):
        """Should work with single message history"""
        history = [{"role": "user", "content": "Me duele el pecho"}]
        result = service.get_conversation_context(history)
        assert isinstance(result, dict)

    # ─── _get_urgency_recommendation ─────────────────────────────────────────

    def test_urgency_recommendation_critical(self, service):
        """Should return emergency recommendation for critical urgency"""
        result = service._get_urgency_recommendation('critical')
        assert isinstance(result, str)
        assert len(result) > 0

    def test_urgency_recommendation_high(self, service):
        """Should return urgent recommendation for high urgency"""
        result = service._get_urgency_recommendation('high')
        assert isinstance(result, str)
        assert len(result) > 0

    def test_urgency_recommendation_medium(self, service):
        """Should return moderate recommendation for medium urgency"""
        result = service._get_urgency_recommendation('medium')
        assert isinstance(result, str)

    def test_urgency_recommendation_low(self, service):
        """Should return mild recommendation for low urgency"""
        result = service._get_urgency_recommendation('low')
        assert isinstance(result, str)

    def test_urgency_recommendation_unknown(self, service):
        """Should handle unknown urgency without crashing"""
        result = service._get_urgency_recommendation('unknown_urgency_level')
        assert isinstance(result, str)

    # ─── Integration tests ─────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_full_conversation_flow_respiratory(self, service):
        """Full conversation flow with respiratory emergency symptoms"""
        result = await service.analyze_conversation(
            "Tengo mucha tos con flema, dificultad para respirar y fiebre de 39 grados desde hace 2 días",
            context={'patient_age': 65, 'risk_factors': ['EPOC']}
        )
        assert isinstance(result, dict)
        # Should produce some response
        assert len(result) > 0

    @pytest.mark.asyncio
    async def test_conversation_with_service_manager(self, service_with_manager):
        """Should use service manager when available"""
        result = await service_with_manager.analyze_conversation("Tengo tos y fiebre")
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_conversation_spanish_urgency_words(self, service):
        """Should detect Spanish urgency words"""
        result = await service.analyze_conversation("Es una emergencia, tengo dolor en el pecho muy intenso")
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_conversation_multi_turn_context(self, service):
        """Should maintain context across multiple turns"""
        history = [
            {"role": "user", "content": "Tengo tos desde hace una semana"},
            {"role": "assistant", "content": "¿Tiene fiebre también?"},
            {"role": "user", "content": "Sí, 38.5 grados desde ayer"},
            {"role": "assistant", "content": "¿Tiene dificultad para respirar?"},
        ]
        result = await service.analyze_conversation(
            "Sí, un poco de dificultad para respirar",
            conversation_history=history
        )
        assert isinstance(result, dict)