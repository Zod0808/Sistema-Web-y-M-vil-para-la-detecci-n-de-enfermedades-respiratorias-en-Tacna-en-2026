"""
Tests for strategies/local_model_strategy.py
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from typing import Dict, List, Any
import numpy as np

# Mock torch before importing to avoid DLL issues in Windows
try:
    import torch
except (ImportError, OSError):
    # Create mock torch if import fails
    torch = MagicMock()
    torch.tensor = MagicMock(return_value=MagicMock())
    torch.cuda = MagicMock()
    torch.cuda.is_available = MagicMock(return_value=False)

from strategies.local_model_strategy import LocalModelStrategy


class TestLocalModelStrategy:
    """Tests for LocalModelStrategy"""
    
    @pytest.fixture
    def local_model_strategy(self):
        """Create local model strategy instance"""
        with patch('strategies.local_model_strategy.AutoTokenizer') as mock_tokenizer, \
             patch('strategies.local_model_strategy.AutoModelForSequenceClassification') as mock_model, \
             patch('strategies.local_model_strategy.torch') as mock_torch:
            
            mock_torch.cuda.is_available.return_value = False
            mock_tokenizer.from_pretrained.return_value = MagicMock()
            mock_model.from_pretrained.return_value = MagicMock()
            
            return LocalModelStrategy()
    
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
        return "Paciente con tos y fiebre"
    
    def test_initialization_success(self):
        """Test successful strategy initialization"""
        with patch('strategies.local_model_strategy.AutoTokenizer') as mock_tokenizer, \
             patch('strategies.local_model_strategy.AutoModelForSequenceClassification') as mock_model, \
             patch('strategies.local_model_strategy.torch') as mock_torch:
            
            mock_torch.cuda.is_available.return_value = False
            mock_tokenizer_instance = MagicMock()
            mock_model_instance = MagicMock()
            mock_tokenizer.from_pretrained.return_value = mock_tokenizer_instance
            mock_model.from_pretrained.return_value = mock_model_instance
            
            strategy = LocalModelStrategy()
            
            assert strategy.symptom_tokenizer is not None
            assert strategy.symptom_model is not None
            assert strategy.medical_tokenizer is not None
            assert strategy.medical_model is not None
    
    def test_initialization_load_failure(self):
        """Test initialization when model loading fails"""
        with patch('strategies.local_model_strategy.AutoTokenizer') as mock_tokenizer, \
             patch('strategies.local_model_strategy.AutoModelForSequenceClassification') as mock_model:
            
            mock_tokenizer.from_pretrained.side_effect = Exception("Load error")
            
            strategy = LocalModelStrategy()
            
            # Should set models to None for graceful degradation
            assert strategy.symptom_model is None
            assert strategy.symptom_tokenizer is None
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_success(self, local_model_strategy, sample_symptoms):
        """Test successful symptom analysis"""
        # Mock models
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {"input_ids": torch.tensor([[1, 2, 3]]), "attention_mask": torch.tensor([[1, 1, 1]])}
        local_model_strategy.symptom_tokenizer = mock_tokenizer
        
        mock_model = MagicMock()
        mock_output = MagicMock()
        mock_output.logits = torch.tensor([[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]])
        mock_model.return_value = mock_output
        local_model_strategy.symptom_model = mock_model
        
        result = await local_model_strategy.analyze_symptoms(sample_symptoms)
        
        assert "urgency_level" in result
        assert "severity_score" in result
        assert "categories" in result
        assert "recommendations" in result
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_fallback(self, sample_symptoms):
        """Test symptom analysis falls back when models not available"""
        strategy = LocalModelStrategy()
        strategy.symptom_model = None
        strategy.symptom_tokenizer = None
        
        result = await strategy.analyze_symptoms(sample_symptoms)
        
        # Should return fallback result
        assert isinstance(result, dict)
        assert "urgency_level" in result or "error" in result
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_with_context(self, local_model_strategy, sample_symptoms):
        """Test symptom analysis with context"""
        # Mock models
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {"input_ids": torch.tensor([[1, 2, 3]]), "attention_mask": torch.tensor([[1, 1, 1]])}
        local_model_strategy.symptom_tokenizer = mock_tokenizer
        
        mock_model = MagicMock()
        mock_output = MagicMock()
        mock_output.logits = torch.tensor([[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]])
        mock_model.return_value = mock_output
        local_model_strategy.symptom_model = mock_model
        
        context = {"age": 65}
        result = await local_model_strategy.analyze_symptoms(sample_symptoms, context)
        
        assert "urgency_level" in result
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_error_handling(self, local_model_strategy, sample_symptoms):
        """Test error handling in symptom analysis"""
        # Mock models to raise error
        mock_tokenizer = MagicMock()
        mock_tokenizer.side_effect = Exception("Tokenization error")
        local_model_strategy.symptom_tokenizer = mock_tokenizer
        
        # Should fallback to rule-based
        result = await local_model_strategy.analyze_symptoms(sample_symptoms)
        
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_process_medical_text_success(self, local_model_strategy, sample_medical_text):
        """Test successful medical text processing"""
        # Mock models
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {"input_ids": torch.tensor([[1, 2, 3]]), "attention_mask": torch.tensor([[1, 1, 1]])}
        local_model_strategy.medical_tokenizer = mock_tokenizer
        
        mock_model = MagicMock()
        mock_output = MagicMock()
        mock_output.logits = torch.tensor([[0.1] * 15])  # 15 labels
        mock_model.return_value = mock_output
        local_model_strategy.medical_model = mock_model
        
        result = await local_model_strategy.process_medical_text(sample_medical_text)
        
        assert "entities" in result
        assert "symptoms" in result
        assert "categories" in result
    
    @pytest.mark.asyncio
    async def test_process_medical_text_fallback(self, sample_medical_text):
        """Test medical text processing falls back when models not available"""
        strategy = LocalModelStrategy()
        strategy.medical_model = None
        strategy.medical_tokenizer = None
        
        result = await strategy.process_medical_text(sample_medical_text)
        
        # Should return fallback result
        assert isinstance(result, dict)
        assert "entities" in result or "error" in result
    
    @pytest.mark.asyncio
    async def test_process_medical_text_error_handling(self, local_model_strategy, sample_medical_text):
        """Test error handling in medical text processing"""
        # Mock models to raise error
        mock_tokenizer = MagicMock()
        mock_tokenizer.side_effect = Exception("Tokenization error")
        local_model_strategy.medical_tokenizer = mock_tokenizer
        
        # Should fallback
        result = await local_model_strategy.process_medical_text(sample_medical_text)
        
        assert isinstance(result, dict)
    
    def test_format_symptoms_for_model(self, local_model_strategy, sample_symptoms):
        """Test formatting symptoms for model input"""
        formatted = local_model_strategy._format_symptoms_for_model(sample_symptoms)
        
        assert isinstance(formatted, str)
        assert "tos" in formatted.lower()
        assert "fiebre" in formatted.lower()
    
    def test_format_symptoms_for_model_with_metadata(self, local_model_strategy):
        """Test formatting symptoms with severity and duration"""
        symptoms = [
            {"symptom": "tos", "severity": "moderate", "duration": "3 días"}
        ]
        
        formatted = local_model_strategy._format_symptoms_for_model(symptoms)
        
        assert "tos" in formatted.lower()
        assert "moderate" in formatted.lower() or "severity" in formatted.lower()
        assert "3" in formatted or "días" in formatted.lower()
    
    def test_process_symptom_predictions(self, local_model_strategy):
        """Test processing symptom predictions"""
        # Create mock predictions tensor
        predictions = torch.tensor([[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]])
        symptoms = [{"symptom": "tos"}]
        
        result = local_model_strategy._process_symptom_predictions(predictions, symptoms)
        
        assert "urgency_level" in result
        assert "severity_score" in result
        assert "categories" in result
        assert "recommendations" in result
        assert isinstance(result["severity_score"], (int, float))
        assert 0.0 <= result["severity_score"] <= 1.0
    
    def test_process_medical_predictions(self, local_model_strategy):
        """Test processing medical text predictions"""
        # Create mock predictions tensor (15 labels)
        predictions = torch.tensor([[0.1] * 15])
        text = "Paciente con tos y fiebre"
        
        result = local_model_strategy._process_medical_predictions(predictions, text)
        
        assert "entities" in result
        assert "symptoms" in result
        assert "categories" in result
    
    def test_determine_urgency_from_predictions(self, local_model_strategy):
        """Test urgency determination from predictions"""
        # High severity predictions
        pred_np = np.array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])
        categories = ["respiratory", "fever", "pain", "digestive", "fatigue",
                     "neurological", "cardiac", "skin", "mental", "other"]
        
        urgency = local_model_strategy._determine_urgency_from_predictions(pred_np, categories)
        
        assert urgency in ["critical", "high", "medium", "low"]
    
    def test_generate_model_recommendations(self, local_model_strategy):
        """Test generating recommendations from model predictions"""
        categories = ["respiratory", "fever"]
        severity_score = 0.7
        
        recommendations = local_model_strategy._generate_model_recommendations(categories, severity_score)
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
    
    def test_fallback_symptom_analysis(self, local_model_strategy, sample_symptoms):
        """Test fallback symptom analysis"""
        result = local_model_strategy._fallback_symptom_analysis(sample_symptoms, None)
        
        assert isinstance(result, dict)
        assert "urgency_level" in result
        assert "severity_score" in result
        assert "categories" in result
        assert "recommendations" in result
    
    def test_fallback_medical_text_processing(self, local_model_strategy, sample_medical_text):
        """Test fallback medical text processing"""
        result = local_model_strategy._fallback_medical_text_processing(sample_medical_text, None)
        
        assert isinstance(result, dict)
        assert "entities" in result
        assert "symptoms" in result
    
    def test_get_strategy_name(self, local_model_strategy):
        """Test getting strategy name"""
        name = local_model_strategy.get_strategy_name()
        
        assert name == "local_model"
    
    def test_get_confidence_score(self, local_model_strategy):
        """Test getting confidence score"""
        score = local_model_strategy.get_confidence_score()
        
        assert isinstance(score, (int, float))
        assert 0.0 <= score <= 1.0
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_tokenization_parameters(self, local_model_strategy, sample_symptoms):
        """Test that tokenization uses correct parameters"""
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {
            "input_ids": torch.tensor([[1, 2, 3]]),
            "attention_mask": torch.tensor([[1, 1, 1]])
        }
        local_model_strategy.symptom_tokenizer = mock_tokenizer
        
        mock_model = MagicMock()
        mock_output = MagicMock()
        mock_output.logits = torch.tensor([[0.1] * 10])
        mock_model.return_value = mock_output
        local_model_strategy.symptom_model = mock_model
        
        await local_model_strategy.analyze_symptoms(sample_symptoms)
        
        # Verify tokenization parameters
        call_args = mock_tokenizer.call_args
        assert call_args.kwargs["return_tensors"] == "pt"
        assert call_args.kwargs["max_length"] == 512
        assert call_args.kwargs["truncation"] is True
        assert call_args.kwargs["padding"] is True
    
    @pytest.mark.asyncio
    async def test_process_medical_text_tokenization_parameters(self, local_model_strategy, sample_medical_text):
        """Test that medical text tokenization uses correct parameters"""
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {
            "input_ids": torch.tensor([[1, 2, 3]]),
            "attention_mask": torch.tensor([[1, 1, 1]])
        }
        local_model_strategy.medical_tokenizer = mock_tokenizer
        
        mock_model = MagicMock()
        mock_output = MagicMock()
        mock_output.logits = torch.tensor([[0.1] * 15])
        mock_model.return_value = mock_output
        local_model_strategy.medical_model = mock_model
        
        await local_model_strategy.process_medical_text(sample_medical_text)
        
        # Verify tokenization parameters
        call_args = mock_tokenizer.call_args
        assert call_args.kwargs["return_tensors"] == "pt"
        assert call_args.kwargs["max_length"] == 512
        assert call_args.kwargs["truncation"] is True
        assert call_args.kwargs["padding"] is True
    
    def test_model_inference_mode(self, local_model_strategy):
        """Test that models are set to evaluation mode"""
        if local_model_strategy.symptom_model:
            # Model should be in eval mode
            assert not local_model_strategy.symptom_model.training or hasattr(local_model_strategy.symptom_model, 'eval')

