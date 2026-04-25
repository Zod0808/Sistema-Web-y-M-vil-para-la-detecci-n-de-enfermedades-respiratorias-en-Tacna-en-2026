"""
Unit tests for Configuration
"""

import pytest
import os
from unittest.mock import patch

from core.config import Settings, settings


class TestSettings:
    """Test Settings configuration"""
    
    def test_default_values(self):
        """Test default configuration values"""
        test_settings = Settings()
        
        assert test_settings.API_V1_STR == "/api/v1"
        assert test_settings.PROJECT_NAME == "RespiCare AI Services"
        assert test_settings.VERSION == "1.0.0"
    
    def test_allowed_origins(self):
        """Test CORS allowed origins"""
        test_settings = Settings()
        
        assert isinstance(test_settings.ALLOWED_ORIGINS, list)
        assert len(test_settings.ALLOWED_ORIGINS) > 0
    
    def test_database_url(self):
        """Test database URL"""
        test_settings = Settings()
        
        assert "mongodb" in test_settings.DATABASE_URL.lower()
    
    def test_redis_url(self):
        """Test Redis URL"""
        test_settings = Settings()
        
        assert "redis" in test_settings.REDIS_URL.lower()
    
    def test_ai_ml_configuration(self):
        """Test AI/ML configuration"""
        test_settings = Settings()
        
        assert isinstance(test_settings.ENABLE_BATCH_PROCESSING, bool)
        assert isinstance(test_settings.MAX_CONCURRENT_BATCH_JOBS, int)
        assert isinstance(test_settings.ENABLE_ASYNC_MODEL_LOADING, bool)
    
    def test_model_configuration(self):
        """Test model configuration"""
        test_settings = Settings()
        
        assert test_settings.MEDICAL_MODEL_NAME is not None
        assert test_settings.SYMPTOM_MODEL_NAME is not None
        assert test_settings.HISTORY_MODEL_NAME is not None
    
    def test_processing_configuration(self):
        """Test processing configuration"""
        test_settings = Settings()
        
        assert test_settings.MAX_TEXT_LENGTH > 0
        assert test_settings.BATCH_SIZE > 0
        assert test_settings.CACHE_TTL > 0
    
    def test_log_level(self):
        """Test log level"""
        test_settings = Settings()
        
        assert test_settings.LOG_LEVEL in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
    
    @patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
    def test_env_variable_loading(self):
        """Test loading from environment variables"""
        test_settings = Settings()
        
        assert test_settings.OPENAI_API_KEY == "test_key"
    
    @patch.dict(os.environ, {"REDIS_URL": "redis://custom:6379"})
    def test_custom_redis_url(self):
        """Test custom Redis URL from environment"""
        test_settings = Settings()
        
        assert test_settings.REDIS_URL == "redis://custom:6379"
    
    @patch.dict(os.environ, {"DATABASE_URL": "mongodb://custom:27017/db"})
    def test_custom_database_url(self):
        """Test custom database URL from environment"""
        test_settings = Settings()
        
        assert test_settings.DATABASE_URL == "mongodb://custom:27017/db"
    
    def test_global_settings_instance(self):
        """Test global settings instance"""
        assert settings is not None
        assert isinstance(settings, Settings)
    
    def test_settings_singleton(self):
        """Test that settings is a singleton"""
        from core.config import settings as settings1
        from core.config import settings as settings2
        
        assert settings1 is settings2
    
    def test_all_configuration_fields(self):
        """Test all configuration fields have expected types"""
        test_settings = Settings()
        
        # API Configuration
        assert isinstance(test_settings.API_V1_STR, str)
        assert isinstance(test_settings.PROJECT_NAME, str)
        assert isinstance(test_settings.VERSION, str)
        
        # CORS
        assert isinstance(test_settings.ALLOWED_ORIGINS, list)
        assert all(isinstance(origin, str) for origin in test_settings.ALLOWED_ORIGINS)
        
        # Database
        assert isinstance(test_settings.DATABASE_URL, str)
        assert isinstance(test_settings.REDIS_URL, str)
        
        # AI/ML Configuration
        assert isinstance(test_settings.OPENAI_API_KEY, (str, type(None)))
        assert isinstance(test_settings.MODEL_PATH, str)
        assert isinstance(test_settings.CACHE_PATH, str)
        assert isinstance(test_settings.ENABLE_BATCH_PROCESSING, bool)
        assert isinstance(test_settings.MAX_CONCURRENT_BATCH_JOBS, int)
        assert isinstance(test_settings.ENABLE_ASYNC_MODEL_LOADING, bool)
        assert isinstance(test_settings.ENABLE_MODEL_QUANTIZATION, bool)
        assert isinstance(test_settings.ENABLE_GPU_ACCELERATION, bool)
        assert isinstance(test_settings.GPU_DEVICE, (str, type(None)))
        assert isinstance(test_settings.ENABLE_ASYNC_INFERENCE, bool)
        
        # Model Configuration
        assert isinstance(test_settings.MEDICAL_MODEL_NAME, str)
        assert isinstance(test_settings.SYMPTOM_MODEL_NAME, str)
        assert isinstance(test_settings.HISTORY_MODEL_NAME, str)
        
        # Processing Configuration
        assert isinstance(test_settings.MAX_TEXT_LENGTH, int)
        assert isinstance(test_settings.BATCH_SIZE, int)
        assert isinstance(test_settings.CACHE_TTL, int)
        
        # Logging
        assert isinstance(test_settings.LOG_LEVEL, str)
    
    @patch.dict(os.environ, {
        "OPENAI_API_KEY": "test_key_123",
        "DATABASE_URL": "mongodb://test:27017/testdb",
        "REDIS_URL": "redis://test:6379",
        "LOG_LEVEL": "DEBUG",
        "MAX_TEXT_LENGTH": "20000",
        "BATCH_SIZE": "64",
        "CACHE_TTL": "7200"
    })
    def test_env_variable_override(self):
        """Test that environment variables override defaults"""
        test_settings = Settings()
        
        assert test_settings.OPENAI_API_KEY == "test_key_123"
        assert test_settings.DATABASE_URL == "mongodb://test:27017/testdb"
        assert test_settings.REDIS_URL == "redis://test:6379"
        assert test_settings.LOG_LEVEL == "DEBUG"
        assert test_settings.MAX_TEXT_LENGTH == 20000
        assert test_settings.BATCH_SIZE == 64
        assert test_settings.CACHE_TTL == 7200
    
    def test_default_numeric_values(self):
        """Test default numeric configuration values"""
        test_settings = Settings()
        
        assert test_settings.MAX_TEXT_LENGTH == 10000
        assert test_settings.BATCH_SIZE == 32
        assert test_settings.CACHE_TTL == 3600
        assert test_settings.MAX_CONCURRENT_BATCH_JOBS == 4
    
    def test_default_boolean_values(self):
        """Test default boolean configuration values"""
        test_settings = Settings()
        
        assert test_settings.ENABLE_BATCH_PROCESSING is True
        assert test_settings.ENABLE_ASYNC_MODEL_LOADING is True
        assert test_settings.ENABLE_MODEL_QUANTIZATION is True
        assert test_settings.ENABLE_GPU_ACCELERATION is False
        assert test_settings.ENABLE_ASYNC_INFERENCE is True
    
    def test_allowed_origins_content(self):
        """Test CORS allowed origins contain expected values"""
        test_settings = Settings()
        
        assert "http://localhost:3000" in test_settings.ALLOWED_ORIGINS
        assert "http://localhost:3001" in test_settings.ALLOWED_ORIGINS
        assert "http://localhost:8080" in test_settings.ALLOWED_ORIGINS
        assert "https://respicare-tacna.com" in test_settings.ALLOWED_ORIGINS
    
    def test_model_paths(self):
        """Test model path configurations"""
        test_settings = Settings()
        
        assert test_settings.MODEL_PATH == "/app/models"
        assert test_settings.CACHE_PATH == "/app/cache"
        assert test_settings.MEDICAL_MODEL_NAME == "en_core_sci_sm"
    
    def test_config_class_attributes(self):
        """Test Config class attributes"""
        test_settings = Settings()
        
        assert hasattr(test_settings.Config, 'env_file')
        assert test_settings.Config.env_file == ".env"
        assert test_settings.Config.case_sensitive is True
    
    @patch.dict(os.environ, {"OPENAI_API_KEY": ""})
    def test_empty_openai_key(self):
        """Test handling of empty OpenAI API key"""
        test_settings = Settings()
        
        # Empty string should be treated as None or empty
        assert test_settings.OPENAI_API_KEY == "" or test_settings.OPENAI_API_KEY is None
    
    def test_optional_fields(self):
        """Test optional configuration fields"""
        test_settings = Settings()
        
        # These should be Optional[str] and can be None
        assert isinstance(test_settings.OPENAI_API_KEY, (str, type(None)))
        assert isinstance(test_settings.GPU_DEVICE, (str, type(None)))

