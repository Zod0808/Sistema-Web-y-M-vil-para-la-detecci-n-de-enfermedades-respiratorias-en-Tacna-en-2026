"""
Tests for factories/strategy_factory.py
"""

import pytest
from unittest.mock import patch, MagicMock, Mock
from factories.strategy_factory import StrategyFactory, StrategyType


class TestStrategyType:
    """Tests for StrategyType enum"""
    
    def test_strategy_type_values(self):
        """Test all strategy type values"""
        assert StrategyType.OPENAI.value == "openai"
        assert StrategyType.LOCAL_MODEL.value == "local_model"
        assert StrategyType.RULE_BASED.value == "rule_based"
        assert StrategyType.HYBRID.value == "hybrid"
        assert StrategyType.FALLBACK.value == "fallback"


class TestStrategyFactory:
    """Tests for StrategyFactory"""
    
    def setup_method(self):
        """Clear strategies before each test"""
        StrategyFactory.clear_strategies()
    
    def test_initialization(self):
        """Test factory initialization"""
        assert StrategyFactory._strategies == {}
    
    @patch('factories.strategy_factory.OpenAIStrategy')
    @patch('factories.strategy_factory.settings')
    def test_create_strategy_openai(self, mock_settings, mock_strategy_class):
        """Test creating OpenAI strategy"""
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_instance = MagicMock()
        mock_strategy_class.return_value = mock_instance
        
        strategy = StrategyFactory.create_strategy(StrategyType.OPENAI)
        
        assert strategy == mock_instance
        mock_strategy_class.assert_called_once()
        assert StrategyType.OPENAI in StrategyFactory._strategies
    
    @patch('factories.strategy_factory.settings')
    def test_create_strategy_openai_without_key(self, mock_settings):
        """Test creating OpenAI strategy without API key"""
        mock_settings.OPENAI_API_KEY = None
        
        with pytest.raises(ValueError, match="OpenAI API key not configured"):
            StrategyFactory.create_strategy(StrategyType.OPENAI)
    
    @patch('factories.strategy_factory.LocalModelStrategy')
    def test_create_strategy_local_model(self, mock_strategy_class):
        """Test creating local model strategy"""
        mock_instance = MagicMock()
        mock_strategy_class.return_value = mock_instance
        
        strategy = StrategyFactory.create_strategy(StrategyType.LOCAL_MODEL)
        
        assert strategy == mock_instance
        mock_strategy_class.assert_called_once()
    
    @patch('factories.strategy_factory.RuleBasedStrategy')
    def test_create_strategy_rule_based(self, mock_strategy_class):
        """Test creating rule-based strategy"""
        mock_instance = MagicMock()
        mock_strategy_class.return_value = mock_instance
        
        strategy = StrategyFactory.create_strategy(StrategyType.RULE_BASED)
        
        assert strategy == mock_instance
        mock_strategy_class.assert_called_once()
    
    @patch('factories.strategy_factory.StrategyFactory._create_openai_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_local_model_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_rule_based_strategy')
    def test_create_strategy_hybrid(self, mock_rule, mock_local, mock_openai):
        """Test creating hybrid strategy"""
        mock_openai_strategy = MagicMock()
        mock_openai_strategy.get_strategy_name.return_value = "openai"
        mock_openai.return_value = mock_openai_strategy
        
        mock_local_strategy = MagicMock()
        mock_local_strategy.get_strategy_name.return_value = "local_model"
        mock_local.return_value = mock_local_strategy
        
        mock_rule_strategy = MagicMock()
        mock_rule_strategy.get_strategy_name.return_value = "rule_based"
        mock_rule.return_value = mock_rule_strategy
        
        strategy = StrategyFactory.create_strategy(StrategyType.HYBRID)
        
        assert strategy is not None
        assert hasattr(strategy, 'strategies')
        assert hasattr(strategy, 'weights')
        assert len(strategy.strategies) >= 1  # At least rule-based
    
    @patch('factories.strategy_factory.StrategyFactory._create_openai_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_local_model_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_rule_based_strategy')
    def test_create_strategy_hybrid_with_failures(self, mock_rule, mock_local, mock_openai):
        """Test creating hybrid strategy when some strategies fail"""
        mock_openai.side_effect = Exception("OpenAI not available")
        mock_local.side_effect = Exception("Local model not available")
        
        mock_rule_strategy = MagicMock()
        mock_rule_strategy.get_strategy_name.return_value = "rule_based"
        mock_rule.return_value = mock_rule_strategy
        
        strategy = StrategyFactory.create_strategy(StrategyType.HYBRID)
        
        # Should still work with just rule-based
        assert strategy is not None
        assert len(strategy.strategies) == 1
    
    @patch('factories.strategy_factory.StrategyFactory._create_openai_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_local_model_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_rule_based_strategy')
    @pytest.mark.asyncio
    async def test_hybrid_strategy_analyze_symptoms(self, mock_rule, mock_local, mock_openai):
        """Test hybrid strategy analyze_symptoms method"""
        mock_openai_strategy = MagicMock()
        mock_openai_strategy.get_strategy_name.return_value = "openai"
        mock_openai_strategy.analyze_symptoms = AsyncMock(return_value={"confidence": 0.9})
        mock_openai.return_value = mock_openai_strategy
        
        mock_rule_strategy = MagicMock()
        mock_rule_strategy.get_strategy_name.return_value = "rule_based"
        mock_rule_strategy.analyze_symptoms = AsyncMock(return_value={"confidence": 0.7})
        mock_rule.return_value = mock_rule_strategy
        
        strategy = StrategyFactory.create_strategy(StrategyType.HYBRID)
        
        result = await strategy.analyze_symptoms(["cough", "fever"])
        
        assert "strategy_used" in result
        assert result["strategy_used"] == "hybrid"
    
    @patch('factories.strategy_factory.StrategyFactory._create_openai_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_local_model_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_rule_based_strategy')
    def test_create_strategy_fallback(self, mock_rule, mock_local, mock_openai):
        """Test creating fallback strategy"""
        mock_openai_strategy = MagicMock()
        mock_openai_strategy.get_strategy_name.return_value = "openai"
        mock_openai.return_value = mock_openai_strategy
        
        mock_rule_strategy = MagicMock()
        mock_rule_strategy.get_strategy_name.return_value = "rule_based"
        mock_rule.return_value = mock_rule_strategy
        
        strategy = StrategyFactory.create_strategy(StrategyType.FALLBACK)
        
        assert strategy is not None
        assert hasattr(strategy, 'strategies')
        assert len(strategy.strategies) >= 1
    
    @patch('factories.strategy_factory.StrategyFactory._create_openai_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_local_model_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_rule_based_strategy')
    @pytest.mark.asyncio
    async def test_fallback_strategy_analyze_symptoms(self, mock_rule, mock_local, mock_openai):
        """Test fallback strategy analyze_symptoms method"""
        mock_openai_strategy = MagicMock()
        mock_openai_strategy.get_strategy_name.return_value = "openai"
        mock_openai_strategy.analyze_symptoms = AsyncMock(return_value={"result": "success"})
        mock_openai.return_value = mock_openai_strategy
        
        strategy = StrategyFactory.create_strategy(StrategyType.FALLBACK)
        
        result = await strategy.analyze_symptoms(["cough", "fever"])
        
        assert "strategy_used" in result
        assert "fallback" in result["strategy_used"]
    
    @patch('factories.strategy_factory.StrategyFactory._create_openai_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_local_model_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_rule_based_strategy')
    @pytest.mark.asyncio
    async def test_fallback_strategy_all_fail(self, mock_rule, mock_local, mock_openai):
        """Test fallback strategy when all strategies fail"""
        mock_openai_strategy = MagicMock()
        mock_openai_strategy.get_strategy_name.return_value = "openai"
        mock_openai_strategy.analyze_symptoms = AsyncMock(side_effect=Exception("Failed"))
        mock_openai.return_value = mock_openai_strategy
        
        mock_rule_strategy = MagicMock()
        mock_rule_strategy.get_strategy_name.return_value = "rule_based"
        mock_rule_strategy.analyze_symptoms = AsyncMock(side_effect=Exception("Failed"))
        mock_rule.return_value = mock_rule_strategy
        
        strategy = StrategyFactory.create_strategy(StrategyType.FALLBACK)
        
        with pytest.raises(Exception, match="All strategies failed"):
            await strategy.analyze_symptoms(["cough", "fever"])
    
    def test_create_strategy_unknown_type(self):
        """Test creating strategy with unknown type"""
        unknown_type = MagicMock()
        unknown_type.value = "unknown_strategy"
        
        with pytest.raises(ValueError, match="Unknown strategy type"):
            StrategyFactory.create_strategy(unknown_type)
    
    @patch('factories.strategy_factory.OpenAIStrategy')
    @patch('factories.strategy_factory.settings')
    def test_create_strategy_singleton_behavior(self, mock_settings, mock_strategy_class):
        """Test that factory returns same instance (singleton)"""
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_instance = MagicMock()
        mock_strategy_class.return_value = mock_instance
        
        strategy1 = StrategyFactory.create_strategy(StrategyType.OPENAI)
        strategy2 = StrategyFactory.create_strategy(StrategyType.OPENAI)
        
        # Should return same instance
        assert strategy1 == strategy2
        # Should only create once
        assert mock_strategy_class.call_count == 1
    
    def test_get_strategy_existing(self):
        """Test getting existing strategy"""
        with patch('factories.strategy_factory.RuleBasedStrategy') as mock_strategy_class:
            mock_instance = MagicMock()
            mock_strategy_class.return_value = mock_instance
            
            StrategyFactory.create_strategy(StrategyType.RULE_BASED)
            strategy = StrategyFactory.get_strategy(StrategyType.RULE_BASED)
            
            assert strategy == mock_instance
    
    def test_get_strategy_nonexistent(self):
        """Test getting non-existent strategy"""
        strategy = StrategyFactory.get_strategy(StrategyType.OPENAI)
        
        assert strategy is None
    
    def test_clear_strategies(self):
        """Test clearing all strategies"""
        with patch('factories.strategy_factory.RuleBasedStrategy') as mock_strategy_class:
            mock_strategy_class.return_value = MagicMock()
            
            StrategyFactory.create_strategy(StrategyType.RULE_BASED)
            assert len(StrategyFactory._strategies) == 1
            
            StrategyFactory.clear_strategies()
            
            assert len(StrategyFactory._strategies) == 0
    
    @patch('factories.strategy_factory.StrategyFactory.create_strategy')
    @patch('factories.strategy_factory.settings')
    def test_create_optimal_strategy_production_with_openai(self, mock_settings, mock_create_strategy):
        """Test creating optimal strategy for production with OpenAI"""
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_strategy = MagicMock()
        mock_create_strategy.return_value = mock_strategy
        
        strategy = StrategyFactory.create_optimal_strategy("production")
        
        mock_create_strategy.assert_called_once_with(StrategyType.OPENAI)
        assert strategy == mock_strategy
    
    @patch('factories.strategy_factory.StrategyFactory.create_strategy')
    @patch('factories.strategy_factory.settings')
    def test_create_optimal_strategy_production_without_openai(self, mock_settings, mock_create_strategy):
        """Test creating optimal strategy for production without OpenAI"""
        mock_settings.OPENAI_API_KEY = None
        mock_strategy = MagicMock()
        mock_create_strategy.return_value = mock_strategy
        
        strategy = StrategyFactory.create_optimal_strategy("production")
        
        mock_create_strategy.assert_called_once_with(StrategyType.FALLBACK)
        assert strategy == mock_strategy
    
    @patch('factories.strategy_factory.StrategyFactory.create_strategy')
    def test_create_optimal_strategy_development(self, mock_create_strategy):
        """Test creating optimal strategy for development"""
        mock_strategy = MagicMock()
        mock_create_strategy.return_value = mock_strategy
        
        strategy = StrategyFactory.create_optimal_strategy("development")
        
        mock_create_strategy.assert_called_once_with(StrategyType.RULE_BASED)
        assert strategy == mock_strategy
    
    @patch('factories.strategy_factory.StrategyFactory.create_strategy')
    def test_create_optimal_strategy_testing(self, mock_create_strategy):
        """Test creating optimal strategy for testing"""
        mock_strategy = MagicMock()
        mock_create_strategy.return_value = mock_strategy
        
        strategy = StrategyFactory.create_optimal_strategy("testing")
        
        mock_create_strategy.assert_called_once_with(StrategyType.RULE_BASED)
        assert strategy == mock_strategy
    
    @patch('factories.strategy_factory.StrategyFactory.create_strategy')
    def test_create_optimal_strategy_unknown_environment(self, mock_create_strategy):
        """Test creating optimal strategy for unknown environment"""
        mock_strategy = MagicMock()
        mock_create_strategy.return_value = mock_strategy
        
        strategy = StrategyFactory.create_optimal_strategy("unknown")
        
        # Should default to fallback
        mock_create_strategy.assert_called_once_with(StrategyType.FALLBACK)
        assert strategy == mock_strategy
    
    @patch('factories.strategy_factory.StrategyFactory.create_strategy')
    def test_create_optimal_strategy_error_handling(self, mock_create_strategy):
        """Test error handling in create_optimal_strategy"""
        mock_create_strategy.side_effect = Exception("Strategy creation failed")
        
        # Should fallback to rule-based
        strategy = StrategyFactory.create_optimal_strategy("production")
        
        # Should have tried fallback, then rule-based
        assert mock_create_strategy.call_count >= 1
    
    @patch('factories.strategy_factory.StrategyFactory._create_openai_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_local_model_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_rule_based_strategy')
    def test_get_available_strategies_all_available(self, mock_rule, mock_local, mock_openai):
        """Test getting available strategies when all are available"""
        mock_openai.return_value = MagicMock()
        mock_local.return_value = MagicMock()
        mock_rule.return_value = MagicMock()
        
        availability = StrategyFactory.get_available_strategies()
        
        assert availability['openai'] is True
        assert availability['local_model'] is True
        assert availability['rule_based'] is True
        assert availability['hybrid'] is True
        assert availability['fallback'] is True
    
    @patch('factories.strategy_factory.StrategyFactory._create_openai_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_local_model_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_rule_based_strategy')
    def test_get_available_strategies_partial(self, mock_rule, mock_local, mock_openai):
        """Test getting available strategies when some are not available"""
        mock_openai.side_effect = Exception("Not available")
        mock_local.side_effect = Exception("Not available")
        mock_rule.return_value = MagicMock()
        
        availability = StrategyFactory.get_available_strategies()
        
        assert availability['openai'] is False
        assert availability['local_model'] is False
        assert availability['rule_based'] is True
        assert availability['hybrid'] is True  # At least one is available
        assert availability['fallback'] is True
    
    @patch('factories.strategy_factory.StrategyFactory._create_openai_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_local_model_strategy')
    @patch('factories.strategy_factory.StrategyFactory._create_rule_based_strategy')
    def test_get_available_strategies_error_handling(self, mock_rule, mock_local, mock_openai):
        """Test error handling in get_available_strategies"""
        mock_openai.side_effect = Exception("Error")
        mock_local.side_effect = Exception("Error")
        mock_rule.side_effect = Exception("Error")
        
        availability = StrategyFactory.get_available_strategies()
        
        # Should fallback to rule-based
        assert availability['rule_based'] is True
    
    @patch('factories.strategy_factory.RuleBasedStrategy')
    def test_create_strategy_error_handling(self, mock_strategy_class):
        """Test error handling when creating strategy"""
        mock_strategy_class.side_effect = Exception("Import error")
        
        with pytest.raises(Exception, match="Import error"):
            StrategyFactory.create_strategy(StrategyType.RULE_BASED)

