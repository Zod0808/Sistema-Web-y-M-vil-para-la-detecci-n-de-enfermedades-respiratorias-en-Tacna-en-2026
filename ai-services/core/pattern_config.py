"""
Pattern Configuration - Central configuration for all design patterns
"""

from typing import Dict, Any, Optional
import structlog
from pydantic_settings import BaseSettings

logger = structlog.get_logger()


class PatternConfig(BaseSettings):
    """Configuration for design patterns and services"""
    
    # Strategy Pattern Configuration
    STRATEGY_DEFAULT: str = "auto"  # auto, openai, local_model, rule_based, hybrid, fallback
    STRATEGY_FALLBACK_ENABLED: bool = True
    STRATEGY_CONFIDENCE_THRESHOLD: float = 0.7
    
    # Factory Pattern Configuration
    SERVICE_ENVIRONMENT: str = "production"  # production, development, testing
    MODEL_ENVIRONMENT: str = "production"
    
    # Circuit Breaker Configuration
    CIRCUIT_BREAKER_ENABLED: bool = True
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 5
    CIRCUIT_BREAKER_RECOVERY_TIMEOUT: int = 60
    CIRCUIT_BREAKER_SUCCESS_THRESHOLD: int = 2
    
    # OpenAI Circuit Breaker Configuration
    OPENAI_CIRCUIT_BREAKER_ENABLED: bool = True
    OPENAI_FAILURE_THRESHOLD: int = 3
    OPENAI_RECOVERY_TIMEOUT: int = 300
    OPENAI_RATE_LIMIT_THRESHOLD: int = 2
    
    # Repository Pattern Configuration
    REPOSITORY_SOFT_DELETE: bool = True
    REPOSITORY_AUDIT_TRAIL: bool = True
    REPOSITORY_VERSIONING: bool = True
    
    # Cache Configuration
    CACHE_ENABLED: bool = True
    CACHE_DEFAULT_TTL: int = 3600
    CACHE_SYMPTOM_ANALYSIS_TTL: int = 1800
    CACHE_MEDICAL_HISTORY_TTL: int = 3600
    CACHE_CATEGORIES_TTL: int = 3600
    
    # Retry Configuration
    RETRY_ENABLED: bool = True
    RETRY_MAX_ATTEMPTS: int = 3
    RETRY_DELAY: float = 1.0
    RETRY_BACKOFF_MULTIPLIER: float = 2.0
    RETRY_MAX_DELAY: float = 60.0
    RETRY_JITTER: bool = True
    
    # Logging Configuration
    LOGGING_ENABLED: bool = True
    LOGGING_LEVEL: str = "info"
    LOGGING_EXECUTION_TIME: bool = True
    LOGGING_ARGS: bool = True
    LOGGING_RESULT: bool = False
    
    # Metrics Configuration
    METRICS_ENABLED: bool = True
    METRICS_EXECUTION_TIME: bool = True
    METRICS_SUCCESS_RATE: bool = True
    METRICS_CALL_COUNT: bool = True
    METRICS_SLOW_THRESHOLD_MS: float = 1000.0
    
    # Validation Configuration
    VALIDATION_ENABLED: bool = True
    VALIDATION_STRICT: bool = True
    
    # Security Configuration
    AUDIT_LOGGING_ENABLED: bool = True
    AUDIT_SENSITIVE_FIELDS: list = ["password", "token", "api_key", "secret"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global pattern configuration
pattern_config = PatternConfig()


class PatternManager:
    """Manager for applying patterns based on configuration"""
    
    def __init__(self, config: PatternConfig = None):
        self.config = config or pattern_config
        self._pattern_cache = {}
    
    def get_strategy_config(self) -> Dict[str, Any]:
        """Get strategy pattern configuration"""
        return {
            "default_strategy": self.config.STRATEGY_DEFAULT,
            "fallback_enabled": self.config.STRATEGY_FALLBACK_ENABLED,
            "confidence_threshold": self.config.STRATEGY_CONFIDENCE_THRESHOLD
        }
    
    def get_circuit_breaker_config(self) -> Dict[str, Any]:
        """Get circuit breaker configuration"""
        return {
            "enabled": self.config.CIRCUIT_BREAKER_ENABLED,
            "failure_threshold": self.config.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
            "recovery_timeout": self.config.CIRCUIT_BREAKER_RECOVERY_TIMEOUT,
            "success_threshold": self.config.CIRCUIT_BREAKER_SUCCESS_THRESHOLD,
            "openai_enabled": self.config.OPENAI_CIRCUIT_BREAKER_ENABLED,
            "openai_failure_threshold": self.config.OPENAI_FAILURE_THRESHOLD,
            "openai_recovery_timeout": self.config.OPENAI_RECOVERY_TIMEOUT,
            "openai_rate_limit_threshold": self.config.OPENAI_RATE_LIMIT_THRESHOLD
        }
    
    def get_cache_config(self) -> Dict[str, Any]:
        """Get cache configuration"""
        return {
            "enabled": self.config.CACHE_ENABLED,
            "default_ttl": self.config.CACHE_DEFAULT_TTL,
            "symptom_analysis_ttl": self.config.CACHE_SYMPTOM_ANALYSIS_TTL,
            "medical_history_ttl": self.config.CACHE_MEDICAL_HISTORY_TTL,
            "categories_ttl": self.config.CACHE_CATEGORIES_TTL
        }
    
    def get_retry_config(self) -> Dict[str, Any]:
        """Get retry configuration"""
        return {
            "enabled": self.config.RETRY_ENABLED,
            "max_attempts": self.config.RETRY_MAX_ATTEMPTS,
            "delay": self.config.RETRY_DELAY,
            "backoff_multiplier": self.config.RETRY_BACKOFF_MULTIPLIER,
            "max_delay": self.config.RETRY_MAX_DELAY,
            "jitter": self.config.RETRY_JITTER
        }
    
    def get_logging_config(self) -> Dict[str, Any]:
        """Get logging configuration"""
        return {
            "enabled": self.config.LOGGING_ENABLED,
            "level": self.config.LOGGING_LEVEL,
            "execution_time": self.config.LOGGING_EXECUTION_TIME,
            "args": self.config.LOGGING_ARGS,
            "result": self.config.LOGGING_RESULT
        }
    
    def get_metrics_config(self) -> Dict[str, Any]:
        """Get metrics configuration"""
        return {
            "enabled": self.config.METRICS_ENABLED,
            "execution_time": self.config.METRICS_EXECUTION_TIME,
            "success_rate": self.config.METRICS_SUCCESS_RATE,
            "call_count": self.config.METRICS_CALL_COUNT,
            "slow_threshold_ms": self.config.METRICS_SLOW_THRESHOLD_MS
        }
    
    def get_repository_config(self) -> Dict[str, Any]:
        """Get repository configuration"""
        return {
            "soft_delete": self.config.REPOSITORY_SOFT_DELETE,
            "audit_trail": self.config.REPOSITORY_AUDIT_TRAIL,
            "versioning": self.config.REPOSITORY_VERSIONING
        }
    
    def get_factory_config(self) -> Dict[str, Any]:
        """Get factory configuration"""
        return {
            "service_environment": self.config.SERVICE_ENVIRONMENT,
            "model_environment": self.config.MODEL_ENVIRONMENT
        }
    
    def get_validation_config(self) -> Dict[str, Any]:
        """Get validation configuration"""
        return {
            "enabled": self.config.VALIDATION_ENABLED,
            "strict": self.config.VALIDATION_STRICT
        }
    
    def get_audit_config(self) -> Dict[str, Any]:
        """Get audit configuration"""
        return {
            "enabled": self.config.AUDIT_LOGGING_ENABLED,
            "sensitive_fields": self.config.AUDIT_SENSITIVE_FIELDS
        }
    
    def get_all_config(self) -> Dict[str, Any]:
        """Get all pattern configurations"""
        return {
            "strategy": self.get_strategy_config(),
            "circuit_breaker": self.get_circuit_breaker_config(),
            "cache": self.get_cache_config(),
            "retry": self.get_retry_config(),
            "logging": self.get_logging_config(),
            "metrics": self.get_metrics_config(),
            "repository": self.get_repository_config(),
            "factory": self.get_factory_config(),
            "validation": self.get_validation_config(),
            "audit": self.get_audit_config()
        }
    
    def is_pattern_enabled(self, pattern_name: str) -> bool:
        """Check if a specific pattern is enabled"""
        pattern_configs = {
            "circuit_breaker": self.config.CIRCUIT_BREAKER_ENABLED,
            "cache": self.config.CACHE_ENABLED,
            "retry": self.config.RETRY_ENABLED,
            "logging": self.config.LOGGING_ENABLED,
            "metrics": self.config.METRICS_ENABLED,
            "validation": self.config.VALIDATION_ENABLED,
            "audit": self.config.AUDIT_LOGGING_ENABLED
        }
        
        return pattern_configs.get(pattern_name, False)
    
    def update_config(self, **kwargs):
        """Update configuration values"""
        for key, value in kwargs.items():
            if hasattr(self.config, key.upper()):
                setattr(self.config, key.upper(), value)
                logger.info("Configuration updated", key=key, value=value)


# Global pattern manager
pattern_manager = PatternManager()


def get_pattern_config(pattern_name: str) -> Dict[str, Any]:
    """Get configuration for a specific pattern"""
    config_methods = {
        "strategy": pattern_manager.get_strategy_config,
        "circuit_breaker": pattern_manager.get_circuit_breaker_config,
        "cache": pattern_manager.get_cache_config,
        "retry": pattern_manager.get_retry_config,
        "logging": pattern_manager.get_logging_config,
        "metrics": pattern_manager.get_metrics_config,
        "repository": pattern_manager.get_repository_config,
        "factory": pattern_manager.get_factory_config,
        "validation": pattern_manager.get_validation_config,
        "audit": pattern_manager.get_audit_config
    }
    
    method = config_methods.get(pattern_name)
    if method:
        return method()
    else:
        logger.warning("Unknown pattern configuration requested", pattern=pattern_name)
        return {}


def is_pattern_enabled(pattern_name: str) -> bool:
    """Check if a pattern is enabled"""
    return pattern_manager.is_pattern_enabled(pattern_name)
