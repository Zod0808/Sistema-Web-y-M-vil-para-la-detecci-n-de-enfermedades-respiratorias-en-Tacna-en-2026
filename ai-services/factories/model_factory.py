"""
Model Factory for creating AI models
"""

from enum import Enum
from typing import Optional, Any, Dict
import structlog
from core.config import settings

logger = structlog.get_logger()


class ModelType(Enum):
    """Available model types"""
    OPENAI_GPT35 = "openai_gpt35"
    OPENAI_GPT4 = "openai_gpt4"
    LOCAL_TRANSFORMER = "local_transformer"
    SCI_SPACY = "sci_spacy"
    CUSTOM_MEDICAL = "custom_medical"
    RULE_BASED = "rule_based"


class ModelFactory:
    """Factory for creating AI models"""
    
    _models = {}
    
    @classmethod
    def create_model(cls, model_type: ModelType, **kwargs) -> Any:
        """Create a model instance based on type"""
        try:
            logger.info("Creating model", model_type=model_type.value)
            
            # Check if model already exists
            if model_type in cls._models:
                logger.info("Returning existing model instance", model_type=model_type.value)
                return cls._models[model_type]
            
            model = None
            
            if model_type == ModelType.OPENAI_GPT35:
                model = cls._create_openai_model("gpt-3.5-turbo", **kwargs)
                
            elif model_type == ModelType.OPENAI_GPT4:
                model = cls._create_openai_model("gpt-4", **kwargs)
                
            elif model_type == ModelType.LOCAL_TRANSFORMER:
                model = cls._create_local_transformer_model(**kwargs)
                
            elif model_type == ModelType.SCI_SPACY:
                model = cls._create_sci_spacy_model(**kwargs)
                
            elif model_type == ModelType.CUSTOM_MEDICAL:
                model = cls._create_custom_medical_model(**kwargs)
                
            elif model_type == ModelType.RULE_BASED:
                model = cls._create_rule_based_model(**kwargs)
                
            else:
                raise ValueError(f"Unknown model type: {model_type}")
            
            # Store model for reuse
            cls._models[model_type] = model
            
            logger.info("Model created successfully", model_type=model_type.value)
            return model
            
        except Exception as e:
            logger.error("Error creating model", model_type=model_type.value, error=str(e))
            raise
    
    @classmethod
    def _create_openai_model(cls, model_name: str, **kwargs) -> Any:
        """Create OpenAI model"""
        try:
            import openai
            
            if not settings.OPENAI_API_KEY:
                raise ValueError("OpenAI API key not configured")
            
            client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
            return {
                "client": client,
                "model_name": model_name,
                "type": "openai",
                "max_tokens": kwargs.get("max_tokens", 1000),
                "temperature": kwargs.get("temperature", 0.3)
            }
            
        except Exception as e:
            logger.error("Error creating OpenAI model", error=str(e))
            raise
    
    @classmethod
    def _create_local_transformer_model(cls, **kwargs) -> Any:
        """Create local transformer model"""
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            import torch
            
            model_name = kwargs.get("model_name", "microsoft/DialoGPT-medium")
            num_labels = kwargs.get("num_labels", 10)
            
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSequenceClassification.from_pretrained(
                model_name,
                num_labels=num_labels
            )
            
            # Set to evaluation mode
            model.eval()
            
            return {
                "tokenizer": tokenizer,
                "model": model,
                "model_name": model_name,
                "type": "transformer",
                "device": "cuda" if torch.cuda.is_available() else "cpu"
            }
            
        except Exception as e:
            logger.error("Error creating local transformer model", error=str(e))
            raise
    
    @classmethod
    def _create_sci_spacy_model(cls, **kwargs) -> Any:
        """Create SciSpacy model"""
        try:
            import spacy
            
            model_name = kwargs.get("model_name", settings.MEDICAL_MODEL_NAME)
            
            try:
                nlp = spacy.load(model_name)
            except OSError:
                logger.warning(f"Model {model_name} not found, downloading...")
                import subprocess
                subprocess.run(["python", "-m", "spacy", "download", model_name])
                nlp = spacy.load(model_name)
            
            return {
                "nlp": nlp,
                "model_name": model_name,
                "type": "spacy",
                "entity_types": ["DISEASE", "SYMPTOM", "MEDICATION", "ANATOMY"]
            }
            
        except Exception as e:
            logger.error("Error creating SciSpacy model", error=str(e))
            raise
    
    @classmethod
    def _create_custom_medical_model(cls, **kwargs) -> Any:
        """Create custom medical model"""
        try:
            # This would load a custom trained model
            # For now, return a placeholder structure
            model_path = kwargs.get("model_path", settings.MODEL_PATH)
            
            return {
                "model_path": model_path,
                "type": "custom_medical",
                "version": kwargs.get("version", "1.0"),
                "confidence_threshold": kwargs.get("confidence_threshold", 0.7)
            }
            
        except Exception as e:
            logger.error("Error creating custom medical model", error=str(e))
            raise
    
    @classmethod
    def _create_rule_based_model(cls, **kwargs) -> Any:
        """Create rule-based model"""
        try:
            from data.medical_data import MedicalDataProcessor
            
            return {
                "processor": MedicalDataProcessor(),
                "type": "rule_based",
                "rules": {
                    "symptom_categories": True,
                    "severity_calculation": True,
                    "urgency_determination": True,
                    "recommendation_generation": True
                }
            }
            
        except Exception as e:
            logger.error("Error creating rule-based model", error=str(e))
            raise
    
    @classmethod
    def get_model(cls, model_type: ModelType) -> Optional[Any]:
        """Get existing model instance"""
        return cls._models.get(model_type)
    
    @classmethod
    def create_model_suite(cls, environment: str = "development") -> Dict[str, Any]:
        """Create a suite of models for different environments"""
        models = {}
        
        try:
            if environment == "development":
                # Use lightweight models for development
                models['symptom_classifier'] = cls.create_model(ModelType.RULE_BASED)
                models['text_processor'] = cls.create_model(ModelType.SCI_SPACY)
                
            elif environment == "production":
                # Use best available models for production
                if settings.OPENAI_API_KEY:
                    models['symptom_classifier'] = cls.create_model(ModelType.OPENAI_GPT35)
                    models['text_processor'] = cls.create_model(ModelType.OPENAI_GPT4)
                else:
                    models['symptom_classifier'] = cls.create_model(ModelType.LOCAL_TRANSFORMER)
                    models['text_processor'] = cls.create_model(ModelType.SCI_SPACY)
                
                models['medical_processor'] = cls.create_model(ModelType.CUSTOM_MEDICAL)
                
            elif environment == "testing":
                # Use fast models for testing
                models['symptom_classifier'] = cls.create_model(ModelType.RULE_BASED)
                models['text_processor'] = cls.create_model(ModelType.RULE_BASED)
                
            else:
                raise ValueError(f"Unknown environment: {environment}")
            
            logger.info("Model suite created", environment=environment, models=list(models.keys()))
            return models
            
        except Exception as e:
            logger.error("Error creating model suite", environment=environment, error=str(e))
            raise
    
    @classmethod
    def clear_models(cls):
        """Clear all model instances (for testing)"""
        cls._models.clear()
        logger.info("All model instances cleared")
    
    @classmethod
    def get_available_models(cls) -> Dict[str, bool]:
        """Get information about which models are available"""
        availability = {}
        
        try:
            # Check OpenAI availability
            availability['openai'] = bool(settings.OPENAI_API_KEY)
            
            # Check local model availability
            try:
                import torch
                availability['local_transformer'] = True
            except ImportError:
                availability['local_transformer'] = False
            
            # Check SciSpacy availability
            try:
                import spacy
                availability['sci_spacy'] = True
            except ImportError:
                availability['sci_spacy'] = False
            
            # Rule-based is always available
            availability['rule_based'] = True
            
            logger.info("Model availability checked", availability=availability)
            return availability
            
        except Exception as e:
            logger.error("Error checking model availability", error=str(e))
            return {"rule_based": True}  # Always fallback to rule-based
