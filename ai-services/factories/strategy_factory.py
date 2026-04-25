"""
Strategy Factory for creating analysis strategies
"""

from enum import Enum
from typing import Optional, Any
import structlog
from core.config import settings

logger = structlog.get_logger()


class StrategyType(Enum):
    """Available strategy types"""
    OPENAI = "openai"
    LOCAL_MODEL = "local_model"
    RULE_BASED = "rule_based"
    HYBRID = "hybrid"
    FALLBACK = "fallback"


class StrategyFactory:
    """Factory for creating analysis strategies"""
    
    _strategies = {}
    
    @classmethod
    def create_strategy(cls, strategy_type: StrategyType, **kwargs) -> Any:
        """Create a strategy instance based on type"""
        try:
            logger.info("Creating strategy", strategy_type=strategy_type.value)
            
            # Check if strategy already exists
            if strategy_type in cls._strategies:
                logger.info("Returning existing strategy instance", strategy_type=strategy_type.value)
                return cls._strategies[strategy_type]
            
            strategy = None
            
            if strategy_type == StrategyType.OPENAI:
                strategy = cls._create_openai_strategy(**kwargs)
                
            elif strategy_type == StrategyType.LOCAL_MODEL:
                strategy = cls._create_local_model_strategy(**kwargs)
                
            elif strategy_type == StrategyType.RULE_BASED:
                strategy = cls._create_rule_based_strategy(**kwargs)
                
            elif strategy_type == StrategyType.HYBRID:
                strategy = cls._create_hybrid_strategy(**kwargs)
                
            elif strategy_type == StrategyType.FALLBACK:
                strategy = cls._create_fallback_strategy(**kwargs)
                
            else:
                raise ValueError(f"Unknown strategy type: {strategy_type}")
            
            # Store strategy for reuse
            cls._strategies[strategy_type] = strategy
            
            logger.info("Strategy created successfully", strategy_type=strategy_type.value)
            return strategy
            
        except Exception as e:
            logger.error("Error creating strategy", strategy_type=strategy_type.value, error=str(e))
            raise
    
    @classmethod
    def _create_openai_strategy(cls, **kwargs) -> Any:
        """Create OpenAI strategy"""
        try:
            if not settings.OPENAI_API_KEY:
                raise ValueError("OpenAI API key not configured")
            
            from strategies.openai_strategy import OpenAIStrategy
            return OpenAIStrategy()
            
        except Exception as e:
            logger.error("Error creating OpenAI strategy", error=str(e))
            raise
    
    @classmethod
    def _create_local_model_strategy(cls, **kwargs) -> Any:
        """Create local model strategy"""
        try:
            from strategies.local_model_strategy import LocalModelStrategy
            return LocalModelStrategy()
            
        except Exception as e:
            logger.error("Error creating local model strategy", error=str(e))
            raise
    
    @classmethod
    def _create_rule_based_strategy(cls, **kwargs) -> Any:
        """Create rule-based strategy"""
        try:
            from strategies.rule_based_strategy import RuleBasedStrategy
            return RuleBasedStrategy()
            
        except Exception as e:
            logger.error("Error creating rule-based strategy", error=str(e))
            raise
    
    @classmethod
    def _create_hybrid_strategy(cls, **kwargs) -> Any:
        """Create hybrid strategy that combines multiple approaches"""
        try:
            from strategies.analysis_strategy import AnalysisStrategy
            
            class HybridStrategy(AnalysisStrategy):
                """Hybrid strategy that combines multiple approaches"""
                
                def __init__(self):
                    self.strategies = []
                    self.weights = []
                    
                    # Try to create available strategies
                    try:
                        openai_strategy = cls._create_openai_strategy()
                        self.strategies.append(openai_strategy)
                        self.weights.append(0.4)  # 40% weight
                    except:
                        pass
                    
                    try:
                        local_strategy = cls._create_local_model_strategy()
                        self.strategies.append(local_strategy)
                        self.weights.append(0.3)  # 30% weight
                    except:
                        pass
                    
                    # Always include rule-based as fallback
                    rule_strategy = cls._create_rule_based_strategy()
                    self.strategies.append(rule_strategy)
                    self.weights.append(0.3)  # 30% weight
                    
                    # Normalize weights
                    total_weight = sum(self.weights)
                    self.weights = [w / total_weight for w in self.weights]
                
                async def analyze_symptoms(self, symptoms, context=None):
                    """Combine results from multiple strategies"""
                    results = []
                    
                    for strategy, weight in zip(self.strategies, self.weights):
                        try:
                            result = await strategy.analyze_symptoms(symptoms, context)
                            results.append((result, weight))
                        except Exception as e:
                            logger.warning("Strategy failed", 
                                         strategy=strategy.get_strategy_name(), 
                                         error=str(e))
                    
                    # Combine results
                    return self._combine_results(results)
                
                async def process_medical_text(self, text, context=None):
                    """Combine results from multiple strategies"""
                    results = []
                    
                    for strategy, weight in zip(self.strategies, self.weights):
                        try:
                            result = await strategy.process_medical_text(text, context)
                            results.append((result, weight))
                        except Exception as e:
                            logger.warning("Strategy failed", 
                                         strategy=strategy.get_strategy_name(), 
                                         error=str(e))
                    
                    # Combine results
                    return self._combine_results(results)
                
                def _combine_results(self, results):
                    """Combine results from multiple strategies"""
                    if not results:
                        return {"error": "No strategies available"}
                    
                    # Simple weighted average for now
                    combined = {}
                    
                    for result, weight in results:
                        for key, value in result.items():
                            if key not in combined:
                                combined[key] = 0
                            
                            if isinstance(value, (int, float)):
                                combined[key] += value * weight
                            else:
                                # For non-numeric values, use the most confident result
                                combined[key] = value
                    
                    # Add strategy metadata
                    combined["strategy_used"] = "hybrid"
                    combined["strategy_confidence"] = self.get_confidence_score()
                    
                    return combined
                
                def get_strategy_name(self):
                    return "hybrid"
                
                def get_confidence_score(self):
                    return 0.85  # Higher confidence due to combination
            
            return HybridStrategy()
            
        except Exception as e:
            logger.error("Error creating hybrid strategy", error=str(e))
            raise
    
    @classmethod
    def _create_fallback_strategy(cls, **kwargs) -> Any:
        """Create fallback strategy that tries multiple approaches"""
        try:
            from strategies.analysis_strategy import AnalysisStrategy
            
            class FallbackStrategy(AnalysisStrategy):
                """Fallback strategy that tries strategies in order"""
                
                def __init__(self):
                    self.strategies = []
                    
                    # Try strategies in order of preference
                    strategy_order = [
                        (StrategyType.OPENAI, cls._create_openai_strategy),
                        (StrategyType.LOCAL_MODEL, cls._create_local_model_strategy),
                        (StrategyType.RULE_BASED, cls._create_rule_based_strategy)
                    ]
                    
                    for strategy_type, creator in strategy_order:
                        try:
                            strategy = creator()
                            self.strategies.append((strategy, strategy_type))
                        except Exception as e:
                            logger.warning("Failed to create strategy", 
                                         strategy=strategy_type.value, 
                                         error=str(e))
                
                async def analyze_symptoms(self, symptoms, context=None):
                    """Try strategies in order until one succeeds"""
                    last_error = None
                    
                    for strategy, strategy_type in self.strategies:
                        try:
                            result = await strategy.analyze_symptoms(symptoms, context)
                            result["strategy_used"] = f"fallback_{strategy.get_strategy_name()}"
                            result["strategy_confidence"] = strategy.get_confidence_score()
                            return result
                        except Exception as e:
                            last_error = e
                            logger.warning("Strategy failed, trying next", 
                                         strategy=strategy_type.value, 
                                         error=str(e))
                    
                    # If all strategies fail, return error
                    raise Exception(f"All strategies failed. Last error: {last_error}")
                
                async def process_medical_text(self, text, context=None):
                    """Try strategies in order until one succeeds"""
                    last_error = None
                    
                    for strategy, strategy_type in self.strategies:
                        try:
                            result = await strategy.process_medical_text(text, context)
                            result["strategy_used"] = f"fallback_{strategy.get_strategy_name()}"
                            result["strategy_confidence"] = strategy.get_confidence_score()
                            return result
                        except Exception as e:
                            last_error = e
                            logger.warning("Strategy failed, trying next", 
                                         strategy=strategy_type.value, 
                                         error=str(e))
                    
                    # If all strategies fail, return error
                    raise Exception(f"All strategies failed. Last error: {last_error}")
                
                def get_strategy_name(self):
                    return "fallback"
                
                def get_confidence_score(self):
                    return 0.8
            
            return FallbackStrategy()
            
        except Exception as e:
            logger.error("Error creating fallback strategy", error=str(e))
            raise
    
    @classmethod
    def get_strategy(cls, strategy_type: StrategyType) -> Optional[Any]:
        """Get existing strategy instance"""
        return cls._strategies.get(strategy_type)
    
    @classmethod
    def create_optimal_strategy(cls, environment: str = "production") -> Any:
        """Create the optimal strategy for the given environment"""
        try:
            if environment == "production":
                # Try to use the best available strategy
                if settings.OPENAI_API_KEY:
                    return cls.create_strategy(StrategyType.OPENAI)
                else:
                    return cls.create_strategy(StrategyType.FALLBACK)
                    
            elif environment == "development":
                # Use fast, reliable strategy for development
                return cls.create_strategy(StrategyType.RULE_BASED)
                
            elif environment == "testing":
                # Use deterministic strategy for testing
                return cls.create_strategy(StrategyType.RULE_BASED)
                
            else:
                # Default to fallback
                return cls.create_strategy(StrategyType.FALLBACK)
                
        except Exception as e:
            logger.error("Error creating optimal strategy", environment=environment, error=str(e))
            # Always fallback to rule-based
            return cls.create_strategy(StrategyType.RULE_BASED)
    
    @classmethod
    def get_available_strategies(cls) -> dict:
        """Get information about which strategies are available"""
        availability = {}
        
        try:
            # Check OpenAI strategy availability
            try:
                cls._create_openai_strategy()
                availability['openai'] = True
            except:
                availability['openai'] = False
            
            # Check local model strategy availability
            try:
                cls._create_local_model_strategy()
                availability['local_model'] = True
            except:
                availability['local_model'] = False
            
            # Check rule-based strategy availability
            try:
                cls._create_rule_based_strategy()
                availability['rule_based'] = True
            except:
                availability['rule_based'] = False
            
            # Hybrid and fallback are always available if any base strategy is available
            availability['hybrid'] = any(availability.values())
            availability['fallback'] = any(availability.values())
            
            logger.info("Strategy availability checked", availability=availability)
            return availability
            
        except Exception as e:
            logger.error("Error checking strategy availability", error=str(e))
            return {"rule_based": True}  # Always fallback to rule-based
    
    @classmethod
    def clear_strategies(cls):
        """Clear all strategy instances (for testing)"""
        cls._strategies.clear()
        logger.info("All strategy instances cleared")
