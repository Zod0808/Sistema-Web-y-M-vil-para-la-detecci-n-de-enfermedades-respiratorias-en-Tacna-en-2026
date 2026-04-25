"""
Configuration settings for RespiCare AI Services
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RespiCare AI Services"
    VERSION: str = "1.0.0"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:8080",
        "https://respicare-tacna.com"
    ]
    
    # Database
    DATABASE_URL: str = "mongodb://admin:password@mongodb:27017/respicare?authSource=admin"
    REDIS_URL: str = "redis://redis:6379"
    
    # AI/ML Configuration
    OPENAI_API_KEY: Optional[str] = None
    MODEL_PATH: str = "/app/models"
    CACHE_PATH: str = "/app/cache"
    ENABLE_BATCH_PROCESSING: bool = True
    MAX_CONCURRENT_BATCH_JOBS: int = 4
    ENABLE_ASYNC_MODEL_LOADING: bool = True
    ENABLE_MODEL_QUANTIZATION: bool = True
    ENABLE_GPU_ACCELERATION: bool = False
    GPU_DEVICE: Optional[str] = None
    ENABLE_ASYNC_INFERENCE: bool = True
    
    # Model Configuration
    MEDICAL_MODEL_NAME: str = "en_core_sci_sm"  # SciSpacy medical model
    SYMPTOM_MODEL_NAME: str = "symptom-classifier-v1"
    HISTORY_MODEL_NAME: str = "medical-history-processor-v1"
    
    # Processing Configuration
    MAX_TEXT_LENGTH: int = 10000
    BATCH_SIZE: int = 32
    CACHE_TTL: int = 3600  # 1 hour
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
