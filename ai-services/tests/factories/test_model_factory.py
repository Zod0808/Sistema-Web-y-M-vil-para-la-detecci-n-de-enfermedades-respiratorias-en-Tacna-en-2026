"""
Tests for factories/model_factory.py
"""

import builtins

import pytest
from unittest.mock import patch, MagicMock, Mock
from factories.model_factory import ModelFactory, ModelType


class TestModelType:
    """Tests for ModelType enum"""
    
    def test_model_type_values(self):
        """Test all model type values"""
        assert ModelType.OPENAI_GPT35.value == "openai_gpt35"
        assert ModelType.OPENAI_GPT4.value == "openai_gpt4"
        assert ModelType.LOCAL_TRANSFORMER.value == "local_transformer"
        assert ModelType.SCI_SPACY.value == "sci_spacy"
        assert ModelType.CUSTOM_MEDICAL.value == "custom_medical"
        assert ModelType.RULE_BASED.value == "rule_based"


class TestModelFactory:
    """Tests for ModelFactory"""
    
    def setup_method(self):
        """Clear models before each test"""
        ModelFactory.clear_models()
    
    def test_initialization(self):
        """Test factory initialization"""
        assert ModelFactory._models == {}
    
    @patch('factories.model_factory.settings')
    @patch('openai.AsyncOpenAI')
    def test_create_model_openai_gpt35(self, mock_async_openai, mock_settings):
        """Test creating OpenAI GPT-3.5 model"""
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_client = MagicMock()
        mock_async_openai.return_value = mock_client

        model = ModelFactory.create_model(ModelType.OPENAI_GPT35)

        assert model["type"] == "openai"
        assert model["model_name"] == "gpt-3.5-turbo"
        assert model["client"] == mock_client
        assert "max_tokens" in model
        assert "temperature" in model

    @patch('factories.model_factory.settings')
    @patch('openai.AsyncOpenAI')
    def test_create_model_openai_gpt4(self, mock_async_openai, mock_settings):
        """Test creating OpenAI GPT-4 model"""
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_client = MagicMock()
        mock_async_openai.return_value = mock_client

        model = ModelFactory.create_model(ModelType.OPENAI_GPT4)

        assert model["type"] == "openai"
        assert model["model_name"] == "gpt-4"
        assert model["client"] == mock_client
    
    @patch('factories.model_factory.settings')
    def test_create_model_openai_without_key(self, mock_settings):
        """Test creating OpenAI model without API key"""
        mock_settings.OPENAI_API_KEY = None
        
        with pytest.raises(ValueError, match="OpenAI API key not configured"):
            ModelFactory.create_model(ModelType.OPENAI_GPT35)
    
    @patch('factories.model_factory.settings')
    @patch('openai.AsyncOpenAI')
    def test_create_model_openai_with_kwargs(self, mock_async_openai, mock_settings):
        """Test creating OpenAI model with custom kwargs"""
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_client = MagicMock()
        mock_async_openai.return_value = mock_client
        
        model = ModelFactory.create_model(
            ModelType.OPENAI_GPT35,
            max_tokens=2000,
            temperature=0.7
        )
        
        assert model["max_tokens"] == 2000
        assert model["temperature"] == 0.7
    
    @patch('transformers.AutoTokenizer')
    @patch('transformers.AutoModelForSequenceClassification')
    @patch('torch.cuda.is_available')
    def test_create_model_local_transformer(self, mock_cuda_available, mock_model_class, mock_tokenizer_class):
        """Test creating local transformer model"""
        mock_cuda_available.return_value = False
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_class.from_pretrained.return_value = mock_tokenizer
        mock_model_class.from_pretrained.return_value = mock_model
        
        model = ModelFactory.create_model(ModelType.LOCAL_TRANSFORMER)
        
        assert model["type"] == "transformer"
        assert model["tokenizer"] == mock_tokenizer
        assert model["model"] == mock_model
        assert model["device"] == "cpu"
        mock_model.eval.assert_called_once()
    
    @patch('transformers.AutoTokenizer')
    @patch('transformers.AutoModelForSequenceClassification')
    @patch('torch.cuda.is_available')
    def test_create_model_local_transformer_cuda(self, mock_cuda_available, mock_model_class, mock_tokenizer_class):
        """Test creating local transformer model with CUDA"""
        mock_cuda_available.return_value = True
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_class.from_pretrained.return_value = mock_tokenizer
        mock_model_class.from_pretrained.return_value = mock_model
        
        model = ModelFactory.create_model(ModelType.LOCAL_TRANSFORMER)
        
        assert model["device"] == "cuda"
    
    @patch('transformers.AutoTokenizer')
    @patch('transformers.AutoModelForSequenceClassification')
    @patch('torch.cuda.is_available')
    def test_create_model_local_transformer_custom_params(self, mock_cuda_available, mock_model_class, mock_tokenizer_class):
        """Test creating local transformer with custom parameters"""
        mock_cuda_available.return_value = False
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_tokenizer_class.from_pretrained.return_value = mock_tokenizer
        mock_model_class.from_pretrained.return_value = mock_model
        
        model = ModelFactory.create_model(
            ModelType.LOCAL_TRANSFORMER,
            model_name="custom-model",
            num_labels=20
        )
        
        mock_tokenizer_class.from_pretrained.assert_called_once_with("custom-model")
        mock_model_class.from_pretrained.assert_called_once_with("custom-model", num_labels=20)
    
    @patch('spacy.load')
    @patch('factories.model_factory.settings')
    def test_create_model_sci_spacy(self, mock_settings, mock_spacy_load):
        """Test creating SciSpacy model"""
        mock_settings.MEDICAL_MODEL_NAME = "en_core_sci_sm"
        mock_nlp = MagicMock()
        mock_spacy_load.return_value = mock_nlp

        model = ModelFactory.create_model(ModelType.SCI_SPACY)

        assert model["type"] == "spacy"
        assert model["nlp"] == mock_nlp
        assert model["model_name"] == "en_core_sci_sm"
        assert "entity_types" in model
        mock_spacy_load.assert_called_once_with("en_core_sci_sm")

    @patch('spacy.load')
    @patch('subprocess.run')
    @patch('factories.model_factory.settings')
    def test_create_model_sci_spacy_download(self, mock_settings, mock_subprocess_run, mock_spacy_load):
        """Test creating SciSpacy model with download"""
        mock_settings.MEDICAL_MODEL_NAME = "en_core_sci_sm"
        mock_spacy_load.side_effect = [OSError("Model not found"), MagicMock()]
        mock_subprocess_run.return_value = None

        model = ModelFactory.create_model(ModelType.SCI_SPACY)

        mock_subprocess_run.assert_called_once()
        assert mock_spacy_load.call_count == 2
    
    @patch('factories.model_factory.settings')
    def test_create_model_custom_medical(self, mock_settings):
        """Test creating custom medical model"""
        mock_settings.MODEL_PATH = "/path/to/model"
        
        model = ModelFactory.create_model(ModelType.CUSTOM_MEDICAL)
        
        assert model["type"] == "custom_medical"
        assert model["model_path"] == "/path/to/model"
        assert "version" in model
        assert "confidence_threshold" in model
    
    @patch('factories.model_factory.settings')
    def test_create_model_custom_medical_with_kwargs(self, mock_settings):
        """Test creating custom medical model with kwargs"""
        mock_settings.MODEL_PATH = "/path/to/model"
        
        model = ModelFactory.create_model(
            ModelType.CUSTOM_MEDICAL,
            version="2.0",
            confidence_threshold=0.9
        )
        
        assert model["version"] == "2.0"
        assert model["confidence_threshold"] == 0.9
    
    @patch('data.medical_data.MedicalDataProcessor')
    def test_create_model_rule_based(self, mock_processor_class):
        """Test creating rule-based model"""
        mock_processor = MagicMock()
        mock_processor_class.return_value = mock_processor
        
        model = ModelFactory.create_model(ModelType.RULE_BASED)
        
        assert model["type"] == "rule_based"
        assert model["processor"] == mock_processor
        assert "rules" in model
        assert model["rules"]["symptom_categories"] is True
    
    def test_create_model_unknown_type(self):
        """Test creating model with unknown type"""
        unknown_type = MagicMock()
        unknown_type.value = "unknown_model"
        
        with pytest.raises(ValueError, match="Unknown model type"):
            ModelFactory.create_model(unknown_type)
    
    @patch('factories.model_factory.settings')
    @patch('openai.AsyncOpenAI')
    def test_create_model_singleton_behavior(self, mock_async_openai, mock_settings):
        """Test that factory returns same instance (singleton)"""
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_client = MagicMock()
        mock_async_openai.return_value = mock_client

        model1 = ModelFactory.create_model(ModelType.OPENAI_GPT35)
        model2 = ModelFactory.create_model(ModelType.OPENAI_GPT35)

        # Should return same instance
        assert model1 == model2
        # Should only create once
        assert mock_async_openai.call_count == 1
    
    def test_get_model_existing(self):
        """Test getting existing model"""
        with patch('data.medical_data.MedicalDataProcessor') as mock_processor:
            mock_processor.return_value = MagicMock()
            
            ModelFactory.create_model(ModelType.RULE_BASED)
            model = ModelFactory.get_model(ModelType.RULE_BASED)
            
            assert model is not None
            assert model["type"] == "rule_based"
    
    def test_get_model_nonexistent(self):
        """Test getting non-existent model"""
        model = ModelFactory.get_model(ModelType.OPENAI_GPT35)
        
        assert model is None
    
    def test_clear_models(self):
        """Test clearing all models"""
        with patch('data.medical_data.MedicalDataProcessor') as mock_processor:
            mock_processor.return_value = MagicMock()
            
            ModelFactory.create_model(ModelType.RULE_BASED)
            assert len(ModelFactory._models) == 1
            
            ModelFactory.clear_models()
            
            assert len(ModelFactory._models) == 0
    
    @patch('factories.model_factory.ModelFactory.create_model')
    @patch('factories.model_factory.settings')
    def test_create_model_suite_development(self, mock_settings, mock_create_model):
        """Test creating model suite for development"""
        mock_create_model.side_effect = lambda mt: {"type": mt.value}
        
        models = ModelFactory.create_model_suite("development")
        
        assert 'symptom_classifier' in models
        assert 'text_processor' in models
        # Should use rule-based and sci_spacy for development
        assert mock_create_model.call_count == 2
    
    @patch('factories.model_factory.ModelFactory.create_model')
    @patch('factories.model_factory.settings')
    def test_create_model_suite_production_with_openai(self, mock_settings, mock_create_model):
        """Test creating model suite for production with OpenAI"""
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_create_model.side_effect = lambda mt: {"type": mt.value}
        
        models = ModelFactory.create_model_suite("production")
        
        assert 'symptom_classifier' in models
        assert 'text_processor' in models
        assert 'medical_processor' in models
        # Should use OpenAI models
        assert mock_create_model.call_count == 3
    
    @patch('factories.model_factory.ModelFactory.create_model')
    @patch('factories.model_factory.settings')
    def test_create_model_suite_production_without_openai(self, mock_settings, mock_create_model):
        """Test creating model suite for production without OpenAI"""
        mock_settings.OPENAI_API_KEY = None
        mock_create_model.side_effect = lambda mt: {"type": mt.value}
        
        models = ModelFactory.create_model_suite("production")
        
        assert 'symptom_classifier' in models
        assert 'text_processor' in models
        assert 'medical_processor' in models
        # Should use local models
        assert mock_create_model.call_count == 3
    
    @patch('factories.model_factory.ModelFactory.create_model')
    def test_create_model_suite_testing(self, mock_create_model):
        """Test creating model suite for testing"""
        mock_create_model.side_effect = lambda mt: {"type": mt.value}
        
        models = ModelFactory.create_model_suite("testing")
        
        assert 'symptom_classifier' in models
        assert 'text_processor' in models
        # Should use rule-based for testing
        assert mock_create_model.call_count == 2
    
    def test_create_model_suite_unknown_environment(self):
        """Test creating model suite with unknown environment"""
        with pytest.raises(ValueError, match="Unknown environment"):
            ModelFactory.create_model_suite("unknown")
    
    @patch('factories.model_factory.settings')
    def test_get_available_models_all_available(self, mock_settings):
        """Test getting available models when all are available"""
        # torch/spacy are lazily imported inside get_available_models and are
        # genuinely installed in this environment, so no mocking is needed to
        # exercise the "available" branch.
        mock_settings.OPENAI_API_KEY = "test-key"

        availability = ModelFactory.get_available_models()

        assert availability['openai'] is True
        assert availability['local_transformer'] is True
        assert availability['sci_spacy'] is True
        assert availability['rule_based'] is True

    @patch('factories.model_factory.settings')
    def test_get_available_models_no_openai(self, mock_settings):
        """Test getting available models without OpenAI"""
        mock_settings.OPENAI_API_KEY = None

        # Setting sys.modules entries to None makes a subsequent `import torch`
        # / `import spacy` raise ImportError, which is what the source's
        # per-dependency try/except blocks are checking for.
        with patch.dict('sys.modules', {'torch': None, 'spacy': None}):
            availability = ModelFactory.get_available_models()

            assert availability['openai'] is False
            assert availability['local_transformer'] is False
            assert availability['sci_spacy'] is False
            assert availability['rule_based'] is True  # Always available

    @patch('factories.model_factory.settings')
    def test_get_available_models_error_handling(self, mock_settings):
        """Test error handling in get_available_models"""
        mock_settings.OPENAI_API_KEY = None

        # A non-ImportError raised during `import torch` isn't caught by the
        # inner per-dependency except block, so it propagates to the outer
        # try/except in get_available_models and triggers the rule_based-only
        # fallback. Simulated via builtins.__import__ since sys.modules=None
        # only produces ImportError, not an arbitrary Exception.
        real_import = builtins.__import__

        def fake_import(name, *args, **kwargs):
            if name == 'torch':
                raise Exception("Error")
            return real_import(name, *args, **kwargs)

        with patch('builtins.__import__', side_effect=fake_import):
            availability = ModelFactory.get_available_models()

            # Should fallback to rule-based
            assert availability['rule_based'] is True
    
    @patch('data.medical_data.MedicalDataProcessor')
    def test_create_model_error_handling(self, mock_processor_class):
        """Test error handling when creating model"""
        mock_processor_class.side_effect = Exception("Import error")
        
        with pytest.raises(Exception, match="Import error"):
            ModelFactory.create_model(ModelType.RULE_BASED)
    
    @patch('factories.model_factory.ModelFactory.create_model')
    def test_create_model_suite_error_handling(self, mock_create_model):
        """Test error handling when creating model suite"""
        mock_create_model.side_effect = Exception("Model creation failed")
        
        with pytest.raises(Exception):
            ModelFactory.create_model_suite("development")

