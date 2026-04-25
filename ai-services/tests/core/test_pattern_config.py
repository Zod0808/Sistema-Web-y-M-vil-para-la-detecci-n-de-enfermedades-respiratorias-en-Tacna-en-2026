"""
Tests adicionales para core/pattern_config.py
"""

import pytest
from core.pattern_config import PatternConfig, PatternManager, pattern_config


class TestPatternConfig:
    """Tests para PatternConfig"""
    
    def test_pattern_config_default_values(self):
        """Test valores por defecto de PatternConfig"""
        config = PatternConfig()
        
        assert config.STRATEGY_DEFAULT == "auto"
        assert config.STRATEGY_FALLBACK_ENABLED is True
        assert config.STRATEGY_CONFIDENCE_THRESHOLD == 0.7
        assert config.CIRCUIT_BREAKER_ENABLED is True
        assert config.CACHE_ENABLED is True
        assert config.RETRY_ENABLED is True
    
    def test_pattern_config_custom_values(self):
        """Test PatternConfig con valores personalizados"""
        config = PatternConfig(
            STRATEGY_DEFAULT="openai",
            STRATEGY_FALLBACK_ENABLED=False,
            CIRCUIT_BREAKER_ENABLED=False
        )
        
        assert config.STRATEGY_DEFAULT == "openai"
        assert config.STRATEGY_FALLBACK_ENABLED is False
        assert config.CIRCUIT_BREAKER_ENABLED is False
    
    def test_pattern_config_global_instance(self):
        """Test que pattern_config es una instancia global"""
        assert pattern_config is not None
        assert isinstance(pattern_config, PatternConfig)


class TestPatternManager:
    """Tests para PatternManager"""
    
    def test_pattern_manager_default_config(self):
        """Test PatternManager con configuración por defecto"""
        manager = PatternManager()
        
        assert manager.config is not None
        assert isinstance(manager.config, PatternConfig)
    
    def test_pattern_manager_custom_config(self):
        """Test PatternManager con configuración personalizada"""
        custom_config = PatternConfig(STRATEGY_DEFAULT="local_model")
        manager = PatternManager(config=custom_config)
        
        assert manager.config == custom_config
        assert manager.config.STRATEGY_DEFAULT == "local_model"
    
    def test_get_strategy_config(self):
        """Test get_strategy_config"""
        manager = PatternManager()
        config = manager.get_strategy_config()
        
        assert "default_strategy" in config
        assert "fallback_enabled" in config
        assert "confidence_threshold" in config
        assert config["default_strategy"] == "auto"
        assert config["fallback_enabled"] is True
    
    def test_get_circuit_breaker_config(self):
        """Test get_circuit_breaker_config"""
        manager = PatternManager()
        config = manager.get_circuit_breaker_config()
        
        assert "enabled" in config
        assert "failure_threshold" in config
        assert "recovery_timeout" in config
        assert "success_threshold" in config
        assert "openai_enabled" in config
        assert config["enabled"] is True
    
    def test_get_cache_config(self):
        """Test get_cache_config"""
        manager = PatternManager()
        config = manager.get_cache_config()
        
        assert "enabled" in config
        assert "default_ttl" in config
        assert "symptom_analysis_ttl" in config
        assert "medical_history_ttl" in config
        assert config["enabled"] is True
        assert config["default_ttl"] == 3600
    
    def test_get_retry_config(self):
        """Test get_retry_config"""
        manager = PatternManager()
        config = manager.get_retry_config()
        
        assert "enabled" in config
        assert "max_attempts" in config
        assert "delay" in config
        assert "backoff_multiplier" in config
        assert config["enabled"] is True
        assert config["max_attempts"] == 3
    
    def test_get_logging_config(self):
        """Test get_logging_config"""
        manager = PatternManager()
        config = manager.get_logging_config()
        
        assert "enabled" in config
        assert "level" in config
        assert "execution_time" in config
        assert config["enabled"] is True
    
    def test_get_metrics_config(self):
        """Test get_metrics_config"""
        manager = PatternManager()
        config = manager.get_metrics_config()
        
        assert "enabled" in config
        assert config["enabled"] is True
    
    def test_pattern_cache(self):
        """Test que PatternManager mantiene un cache de patrones"""
        manager = PatternManager()
        
        assert hasattr(manager, '_pattern_cache')
        assert isinstance(manager._pattern_cache, dict)

