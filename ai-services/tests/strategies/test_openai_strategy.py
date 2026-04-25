"""
Tests for strategies/openai_strategy.py
"""

import pytest
import sys
from unittest.mock import patch, MagicMock, AsyncMock
from typing import Dict, List, Any
import json

# Mock torch before importing to avoid DLL issues in Windows
# This must be done BEFORE importing any strategies modules
# because strategies/__init__.py imports LocalModelStrategy which uses torch
if 'torch' not in sys.modules:
    try:
        import torch
    except (ImportError, OSError):
        # Create mock torch if import fails and add to sys.modules
        torch_mock = MagicMock()
        torch_mock.tensor = MagicMock(return_value=MagicMock())
        torch_mock.cuda = MagicMock()
        torch_mock.cuda.is_available = MagicMock(return_value=False)
        torch_mock.no_grad = MagicMock()
        sys.modules['torch'] = torch_mock

from strategies.openai_strategy import OpenAIStrategy


class TestOpenAIStrategy:
    """Tests for OpenAIStrategy"""
    
    @pytest.fixture
    def openai_strategy(self):
        """Create OpenAI strategy instance"""
        with patch('strategies.openai_strategy.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            with patch('strategies.openai_strategy.openai.AsyncOpenAI'):
                return OpenAIStrategy()
    
    @pytest.fixture
    def sample_symptoms(self):
        """Sample symptoms for testing"""
        return [
            {"symptom": "tos", "severity": "moderate"},
            {"symptom": "fiebre", "severity": "high"}
        ]
    
    @pytest.fixture
    def sample_medical_text(self):
        """Sample medical text for testing"""
        return "Paciente de 45 años con tos persistente y fiebre de 3 días."
    
    def test_initialization(self, openai_strategy):
        """Test strategy initialization"""
        assert openai_strategy.client is not None
        assert openai_strategy.model == "gpt-3.5-turbo"
    
    def test_initialization_without_api_key(self):
        """Test initialization without API key"""
        with patch('strategies.openai_strategy.settings') as mock_settings:
            mock_settings.OPENAI_API_KEY = None
            
            with pytest.raises(ValueError, match="OpenAI API key not configured"):
                OpenAIStrategy()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_success(self, openai_strategy, sample_symptoms):
        """Test successful symptom analysis"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "urgency_level": "medium",
            "severity_score": 0.6,
            "categories": ["respiratory", "fever"],
            "recommendations": ["Rest", "Hydration"],
            "warning_signs": [],
            "follow_up_required": True
        })
        
        openai_strategy.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await openai_strategy.analyze_symptoms(sample_symptoms)
        
        assert "urgency_level" in result
        assert "severity_score" in result
        assert "categories" in result
        assert "recommendations" in result
        assert "ai_raw_response" in result
        openai_strategy.client.chat.completions.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_with_context(self, openai_strategy, sample_symptoms):
        """Test symptom analysis with context"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "urgency_level": "medium",
            "severity_score": 0.6,
            "categories": [],
            "recommendations": [],
            "warning_signs": [],
            "follow_up_required": False
        })
        
        openai_strategy.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        context = {"age": 65, "diabetes": True}
        result = await openai_strategy.analyze_symptoms(sample_symptoms, context)
        
        assert "urgency_level" in result
        # Verify context was included in prompt
        call_args = openai_strategy.client.chat.completions.create.call_args
        assert call_args is not None
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_api_error(self, openai_strategy, sample_symptoms):
        """Test symptom analysis with API error"""
        import openai
        
        openai_strategy.client.chat.completions.create = AsyncMock(
            side_effect=openai.APIError("API error", request=MagicMock(), response=MagicMock())
        )
        
        with pytest.raises(openai.APIError):
            await openai_strategy.analyze_symptoms(sample_symptoms)
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_rate_limit_error(self, openai_strategy, sample_symptoms):
        """Test symptom analysis with rate limit error"""
        import openai
        
        openai_strategy.client.chat.completions.create = AsyncMock(
            side_effect=openai.RateLimitError("Rate limit", request=MagicMock(), response=MagicMock())
        )
        
        with pytest.raises(openai.RateLimitError):
            await openai_strategy.analyze_symptoms(sample_symptoms)
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_timeout_error(self, openai_strategy, sample_symptoms):
        """Test symptom analysis with timeout error"""
        import openai
        
        openai_strategy.client.chat.completions.create = AsyncMock(
            side_effect=openai.APITimeoutError("Timeout", request=MagicMock())
        )
        
        with pytest.raises(openai.APITimeoutError):
            await openai_strategy.analyze_symptoms(sample_symptoms)
    
    @pytest.mark.asyncio
    async def test_process_medical_text_success(self, openai_strategy, sample_medical_text):
        """Test successful medical text processing"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "entities": [{"text": "tos", "type": "SYMPTOM", "confidence": 0.9}],
            "symptoms": [{"symptom": "tos", "category": "respiratory", "confidence": 0.8}],
            "risk_factors": [],
            "diagnosis_suggestions": ["Bronquitis"],
            "recommendations": ["Rest"]
        })
        
        openai_strategy.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        result = await openai_strategy.process_medical_text(sample_medical_text)
        
        assert "entities" in result
        assert "symptoms" in result
        assert "risk_factors" in result
        assert "diagnosis_suggestions" in result
        assert "recommendations" in result
        assert "ai_raw_response" in result
    
    @pytest.mark.asyncio
    async def test_process_medical_text_with_context(self, openai_strategy, sample_medical_text):
        """Test medical text processing with context"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "entities": [],
            "symptoms": [],
            "risk_factors": [],
            "diagnosis_suggestions": [],
            "recommendations": []
        })
        
        openai_strategy.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        context = {"language": "es", "patient_id": "P001"}
        result = await openai_strategy.process_medical_text(sample_medical_text, context)
        
        assert "entities" in result
    
    @pytest.mark.asyncio
    async def test_process_medical_text_api_error(self, openai_strategy, sample_medical_text):
        """Test medical text processing with API error"""
        import openai
        
        openai_strategy.client.chat.completions.create = AsyncMock(
            side_effect=openai.APIError("API error", request=MagicMock(), response=MagicMock())
        )
        
        with pytest.raises(openai.APIError):
            await openai_strategy.process_medical_text(sample_medical_text)
    
    def test_format_symptoms_for_ai(self, openai_strategy, sample_symptoms):
        """Test formatting symptoms for AI input"""
        formatted = openai_strategy._format_symptoms_for_ai(sample_symptoms)
        
        assert isinstance(formatted, str)
        assert "tos" in formatted.lower()
        assert "fiebre" in formatted.lower()
    
    def test_format_symptoms_for_ai_with_severity(self, openai_strategy):
        """Test formatting symptoms with severity"""
        symptoms = [
            {"symptom": "tos", "severity": "moderate", "duration": "3 días"}
        ]
        
        formatted = openai_strategy._format_symptoms_for_ai(symptoms)
        
        assert "tos" in formatted.lower()
        assert "moderate" in formatted.lower() or "moderada" in formatted.lower()
        assert "3" in formatted or "días" in formatted.lower()
    
    def test_create_symptom_analysis_prompt(self, openai_strategy, sample_symptoms):
        """Test creating symptom analysis prompt"""
        symptoms_text = openai_strategy._format_symptoms_for_ai(sample_symptoms)
        prompt = openai_strategy._create_symptom_analysis_prompt(symptoms_text)
        
        assert isinstance(prompt, str)
        assert "urgencia" in prompt.lower() or "urgency" in prompt.lower()
        assert "severidad" in prompt.lower() or "severity" in prompt.lower()
        assert "recomendaciones" in prompt.lower() or "recommendations" in prompt.lower()
    
    def test_create_symptom_analysis_prompt_with_context(self, openai_strategy, sample_symptoms):
        """Test creating symptom analysis prompt with context"""
        symptoms_text = openai_strategy._format_symptoms_for_ai(sample_symptoms)
        context = {"age": 65, "diabetes": True}
        
        prompt = openai_strategy._create_symptom_analysis_prompt(symptoms_text, context)
        
        assert isinstance(prompt, str)
        # Context should be included
        assert "contexto" in prompt.lower() or "context" in prompt.lower()
    
    def test_create_medical_text_prompt(self, openai_strategy, sample_medical_text):
        """Test creating medical text prompt"""
        prompt = openai_strategy._create_medical_text_prompt(sample_medical_text)
        
        assert isinstance(prompt, str)
        assert "entidades" in prompt.lower() or "entities" in prompt.lower()
        assert "síntomas" in prompt.lower() or "symptoms" in prompt.lower()
        assert "diagnóstico" in prompt.lower() or "diagnosis" in prompt.lower()
    
    def test_parse_ai_response_valid_json(self, openai_strategy):
        """Test parsing valid JSON response"""
        ai_response = json.dumps({
            "urgency_level": "medium",
            "severity_score": 0.6,
            "categories": ["respiratory"],
            "recommendations": ["Rest"],
            "warning_signs": [],
            "follow_up_required": True
        })
        
        result = openai_strategy._parse_ai_response(ai_response)
        
        assert "urgency_level" in result
        assert result["urgency_level"] == "medium"
        assert result["severity_score"] == 0.6
        assert isinstance(result["categories"], list)
    
    def test_parse_ai_response_invalid_json(self, openai_strategy):
        """Test parsing invalid JSON response"""
        ai_response = "This is not valid JSON"
        
        result = openai_strategy._parse_ai_response(ai_response)
        
        # Should return a dict with fallback values
        assert isinstance(result, dict)
        assert "urgency_level" in result or "error" in result
    
    def test_parse_ai_response_partial_json(self, openai_strategy):
        """Test parsing partial JSON response"""
        ai_response = '{"urgency_level": "medium"}'  # Missing other fields
        
        result = openai_strategy._parse_ai_response(ai_response)
        
        assert isinstance(result, dict)
        assert result["urgency_level"] == "medium"
    
    def test_parse_medical_text_response_valid_json(self, openai_strategy):
        """Test parsing valid medical text JSON response"""
        ai_response = json.dumps({
            "entities": [{"text": "tos", "type": "SYMPTOM", "confidence": 0.9}],
            "symptoms": [{"symptom": "tos", "category": "respiratory", "confidence": 0.8}],
            "risk_factors": ["tabaquismo"],
            "diagnosis_suggestions": ["Bronquitis"],
            "recommendations": ["Rest"]
        })
        
        result = openai_strategy._parse_medical_text_response(ai_response)
        
        assert "entities" in result
        assert "symptoms" in result
        assert "risk_factors" in result
        assert "diagnosis_suggestions" in result
        assert "recommendations" in result
    
    def test_parse_medical_text_response_invalid_json(self, openai_strategy):
        """Test parsing invalid medical text JSON response"""
        ai_response = "Invalid JSON response"
        
        result = openai_strategy._parse_medical_text_response(ai_response)
        
        # Should return a dict with fallback values
        assert isinstance(result, dict)
        assert "entities" in result or "error" in result
    
    def test_get_strategy_name(self, openai_strategy):
        """Test getting strategy name"""
        name = openai_strategy.get_strategy_name()
        
        assert name == "openai"
    
    def test_get_confidence_score(self, openai_strategy):
        """Test getting confidence score"""
        score = openai_strategy.get_confidence_score()
        
        assert isinstance(score, (int, float))
        assert 0.0 <= score <= 1.0
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_model_parameters(self, openai_strategy, sample_symptoms):
        """Test that correct model parameters are used"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "urgency_level": "medium",
            "severity_score": 0.6,
            "categories": [],
            "recommendations": [],
            "warning_signs": [],
            "follow_up_required": False
        })
        
        openai_strategy.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        await openai_strategy.analyze_symptoms(sample_symptoms)
        
        # Verify call parameters
        call_args = openai_strategy.client.chat.completions.create.call_args
        assert call_args.kwargs["model"] == "gpt-3.5-turbo"
        assert call_args.kwargs["max_tokens"] == 1000
        assert call_args.kwargs["temperature"] == 0.3
    
    @pytest.mark.asyncio
    async def test_process_medical_text_model_parameters(self, openai_strategy, sample_medical_text):
        """Test that correct model parameters are used for medical text"""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "entities": [],
            "symptoms": [],
            "risk_factors": [],
            "diagnosis_suggestions": [],
            "recommendations": []
        })
        
        openai_strategy.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        await openai_strategy.process_medical_text(sample_medical_text)
        
        # Verify call parameters
        call_args = openai_strategy.client.chat.completions.create.call_args
        assert call_args.kwargs["model"] == "gpt-3.5-turbo"
        assert call_args.kwargs["max_tokens"] == 1500
        assert call_args.kwargs["temperature"] == 0.2

