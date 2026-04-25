"""
Strategy Pattern for AI Analysis
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import structlog

logger = structlog.get_logger()


class AnalysisStrategy(ABC):
    """Abstract base class for AI analysis strategies"""
    
    @abstractmethod
    async def analyze_symptoms(self, symptoms: List[Dict[str, Any]], context: Optional[Dict] = None) -> Dict[str, Any]:
        """Analyze symptoms and provide recommendations"""
        pass
    
    @abstractmethod
    async def process_medical_text(self, text: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Process medical history text"""
        pass
    
    @abstractmethod
    def get_strategy_name(self) -> str:
        """Get the name of this strategy"""
        pass
    
    @abstractmethod
    def get_confidence_score(self) -> float:
        """Get the confidence score for this strategy"""
        pass


class AnalysisContext:
    """Context class that uses different analysis strategies"""
    
    def __init__(self, strategy: AnalysisStrategy):
        self._strategy = strategy
        logger.info("Analysis context initialized", strategy=strategy.get_strategy_name())
    
    def set_strategy(self, strategy: AnalysisStrategy) -> None:
        """Change the analysis strategy at runtime"""
        logger.info("Strategy changed", 
                   from_strategy=self._strategy.get_strategy_name(),
                   to_strategy=strategy.get_strategy_name())
        self._strategy = strategy
    
    async def analyze_symptoms(self, symptoms: List[Dict[str, Any]], context: Optional[Dict] = None) -> Dict[str, Any]:
        """Analyze symptoms using the current strategy"""
        try:
            logger.info("Analyzing symptoms", 
                       strategy=self._strategy.get_strategy_name(),
                       symptom_count=len(symptoms))
            
            result = await self._strategy.analyze_symptoms(symptoms, context)
            
            # Add strategy metadata
            result["strategy_used"] = self._strategy.get_strategy_name()
            result["strategy_confidence"] = self._strategy.get_confidence_score()
            
            return result
            
        except Exception as e:
            logger.error("Error in symptom analysis", 
                        strategy=self._strategy.get_strategy_name(),
                        error=str(e))
            raise
    
    async def process_medical_text(self, text: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Process medical text using the current strategy"""
        try:
            logger.info("Processing medical text", 
                       strategy=self._strategy.get_strategy_name(),
                       text_length=len(text))
            
            result = await self._strategy.process_medical_text(text, context)
            
            # Add strategy metadata
            result["strategy_used"] = self._strategy.get_strategy_name()
            result["strategy_confidence"] = self._strategy.get_confidence_score()
            
            return result
            
        except Exception as e:
            logger.error("Error in medical text processing", 
                        strategy=self._strategy.get_strategy_name(),
                        error=str(e))
            raise
