"""
Service Factory for creating AI services
"""

from enum import Enum
from typing import Optional, Any
import structlog
from core.config import settings

logger = structlog.get_logger()


class ServiceType(Enum):
    """Available service types"""
    SYMPTOM_ANALYZER = "symptom_analyzer"
    MEDICAL_HISTORY_PROCESSOR = "medical_history_processor"
    AI_MODEL_MANAGER = "ai_model_manager"
    CACHE_SERVICE = "cache_service"
    DATABASE_SERVICE = "database_service"
    NOTIFICATION_SERVICE = "notification_service"


class ServiceFactory:
    """Factory for creating AI services"""
    
    _instances = {}
    
    @classmethod
    def create_service(cls, service_type: ServiceType, **kwargs) -> Any:
        """Create a service instance based on type"""
        try:
            logger.info("Creating service", service_type=service_type.value)
            
            # Check if instance already exists (singleton pattern)
            if service_type in cls._instances:
                logger.info("Returning existing service instance", service_type=service_type.value)
                return cls._instances[service_type]
            
            service = None
            
            if service_type == ServiceType.SYMPTOM_ANALYZER:
                from symptom_analyzer.analyzer import SymptomAnalyzer
                service = SymptomAnalyzer(**kwargs)
                
            elif service_type == ServiceType.MEDICAL_HISTORY_PROCESSOR:
                from medical_history_processor.processor import MedicalHistoryProcessor
                service = MedicalHistoryProcessor(**kwargs)
                
            elif service_type == ServiceType.AI_MODEL_MANAGER:
                from models.model_manager import ModelManager
                service = ModelManager(**kwargs)
                
            elif service_type == ServiceType.CACHE_SERVICE:
                from core.cache import CacheService
                service = CacheService(**kwargs)
                
            elif service_type == ServiceType.DATABASE_SERVICE:
                from core.database import DatabaseService
                service = DatabaseService(**kwargs)
                
            elif service_type == ServiceType.NOTIFICATION_SERVICE:
                from services.notification_service import NotificationService
                service = NotificationService(**kwargs)
                
            else:
                raise ValueError(f"Unknown service type: {service_type}")
            
            # Store instance for singleton behavior
            cls._instances[service_type] = service
            
            logger.info("Service created successfully", service_type=service_type.value)
            return service
            
        except Exception as e:
            logger.error("Error creating service", service_type=service_type.value, error=str(e))
            raise
    
    @classmethod
    def get_service(cls, service_type: ServiceType) -> Optional[Any]:
        """Get existing service instance"""
        return cls._instances.get(service_type)
    
    @classmethod
    def clear_instances(cls):
        """Clear all service instances (for testing)"""
        cls._instances.clear()
        logger.info("All service instances cleared")
    
    @classmethod
    def create_analysis_context(cls, strategy_type: str = None, **kwargs) -> Any:
        """Create analysis context with specified strategy"""
        try:
            from strategies.strategy_factory import StrategyFactory, StrategyType
            
            # Determine strategy type
            if strategy_type is None:
                # Auto-select based on configuration
                if settings.OPENAI_API_KEY:
                    strategy_type = StrategyType.OPENAI
                else:
                    strategy_type = StrategyType.RULE_BASED
            
            # Create strategy
            strategy = StrategyFactory.create_strategy(strategy_type, **kwargs)
            
            # Create analysis context
            from strategies.analysis_strategy import AnalysisContext
            context = AnalysisContext(strategy)
            
            logger.info("Analysis context created", strategy=strategy.get_strategy_name())
            return context
            
        except Exception as e:
            logger.error("Error creating analysis context", error=str(e))
            raise
    
    @classmethod
    def create_medical_service_suite(cls) -> dict:
        """Create a complete suite of medical services"""
        services = {}
        
        try:
            # Create core services
            services['symptom_analyzer'] = cls.create_service(ServiceType.SYMPTOM_ANALYZER)
            services['history_processor'] = cls.create_service(ServiceType.MEDICAL_HISTORY_PROCESSOR)
            services['model_manager'] = cls.create_service(ServiceType.AI_MODEL_MANAGER)
            services['cache_service'] = cls.create_service(ServiceType.CACHE_SERVICE)
            services['database_service'] = cls.create_service(ServiceType.DATABASE_SERVICE)
            
            # Create analysis context
            services['analysis_context'] = cls.create_analysis_context()
            
            logger.info("Medical service suite created successfully")
            return services
            
        except Exception as e:
            logger.error("Error creating medical service suite", error=str(e))
            raise
    
    @classmethod
    def create_development_services(cls) -> dict:
        """Create services optimized for development"""
        services = {}
        
        try:
            # Use rule-based strategy for development (no external dependencies)
            services['analysis_context'] = cls.create_analysis_context(StrategyType.RULE_BASED)
            services['symptom_analyzer'] = cls.create_service(ServiceType.SYMPTOM_ANALYZER)
            services['history_processor'] = cls.create_service(ServiceType.MEDICAL_HISTORY_PROCESSOR)
            
            logger.info("Development services created successfully")
            return services
            
        except Exception as e:
            logger.error("Error creating development services", error=str(e))
            raise
    
    @classmethod
    def create_production_services(cls) -> dict:
        """Create services optimized for production"""
        services = {}
        
        try:
            # Create full service suite with all dependencies
            services = cls.create_medical_service_suite()
            
            # Add production-specific services
            services['notification_service'] = cls.create_service(ServiceType.NOTIFICATION_SERVICE)
            
            # Use best available strategy
            if settings.OPENAI_API_KEY:
                services['analysis_context'] = cls.create_analysis_context(StrategyType.OPENAI)
            else:
                services['analysis_context'] = cls.create_analysis_context(StrategyType.LOCAL_MODEL)
            
            logger.info("Production services created successfully")
            return services
            
        except Exception as e:
            logger.error("Error creating production services", error=str(e))
            raise
