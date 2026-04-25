"""
AI Service Manager - Central coordinator for all AI services
"""

import asyncio
from typing import Any, Dict, List, Optional

import structlog

from core.config import settings
from decorators import with_cache, with_circuit_breaker, with_logging, with_metrics
from factories.service_factory import ServiceFactory, ServiceType
from factories.strategy_factory import StrategyFactory, StrategyType

logger = structlog.get_logger()


class AIServiceManager:
    """Central manager for all AI services with pattern integration"""
    
    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.services: Dict[str, Any] = {}
        self.repositories: Dict[str, Any] = {}
        self.strategies: Dict[str, Any] = {}
        self._initialized = False
        self._batch_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_BATCH_JOBS)
    
    @with_logging(log_level="info", log_execution_time=True)
    async def initialize(self):
        """Initialize all AI services and strategies"""
        try:
            logger.info("Initializing AI Service Manager", environment=self.environment)
            
            # Create service suite based on environment
            if self.environment == "production":
                self.services = ServiceFactory.create_production_services()
            elif self.environment == "development":
                self.services = ServiceFactory.create_development_services()
            else:
                self.services = ServiceFactory.create_medical_service_suite()
            self.repositories = {}
            self._batch_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_BATCH_JOBS)
            
            # Warm-up heavy models when available
            await self._warm_up_models()
            
            # Initialize strategies
            await self._initialize_strategies()
            
            # Initialize repositories
            await self._initialize_repositories()
            
            self._initialized = True
            logger.info("AI Service Manager initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize AI Service Manager", error=str(e))
            raise
    
    async def _warm_up_models(self):
        """Ensure heavy AI models are pre-loaded and optimised."""
        model_manager = self._get_model_manager()
        if not model_manager:
            return
        try:
            await model_manager.load_models()
        except Exception as exc:
            logger.warning("Model warm-up failed", error=str(exc))
    
    def _get_model_manager(self):
        """Fetch or create the model manager service."""
        model_manager = self.services.get('model_manager')
        if model_manager:
            return model_manager
        model_manager = ServiceFactory.get_service(ServiceType.AI_MODEL_MANAGER)
        if model_manager:
            self.services['model_manager'] = model_manager
            return model_manager
        try:
            model_manager = ServiceFactory.create_service(ServiceType.AI_MODEL_MANAGER)
            self.services['model_manager'] = model_manager
        except Exception as exc:
            logger.warning("Model manager not available", error=str(exc))
            return None
        return model_manager
    
    async def _initialize_strategies(self):
        """Initialize analysis strategies"""
        try:
            # Create optimal strategy based on environment
            self.strategies['primary'] = StrategyFactory.create_optimal_strategy(self.environment)
            
            # Create fallback strategy
            self.strategies['fallback'] = StrategyFactory.create_strategy(StrategyType.FALLBACK)
            
            # Create specific strategies
            try:
                self.strategies['openai'] = StrategyFactory.create_strategy(StrategyType.OPENAI)
            except Exception as e:
                logger.warning("OpenAI strategy not available", error=str(e))
            
            try:
                self.strategies['local_model'] = StrategyFactory.create_strategy(StrategyType.LOCAL_MODEL)
            except Exception as e:
                logger.warning("Local model strategy not available", error=str(e))
            
            self.strategies['rule_based'] = StrategyFactory.create_strategy(StrategyType.RULE_BASED)
            
            logger.info("Analysis strategies initialized", 
                       strategies=list(self.strategies.keys()))
            
        except Exception as e:
            logger.error("Failed to initialize strategies", error=str(e))
            raise
    
    async def _initialize_repositories(self):
        """Initialize data repositories"""
        try:
            from repositories import (
                MedicalHistoryRepository,
                AIResultRepository,
                PatientRepository
            )
            
            # Get database client from services
            db_service = self.services.get('database_service')
            if db_service:
                self.repositories = {
                    'medical_history': MedicalHistoryRepository(db_service),
                    'ai_results': AIResultRepository(db_service),
                    'patients': PatientRepository(db_service)
                }
                logger.info("Data repositories initialized")
            else:
                logger.warning("Database service not available, repositories not initialized")
                
        except Exception as e:
            logger.error("Failed to initialize repositories", error=str(e))
            raise
    
    @with_cache(ttl=1800, key_prefix="ai_analysis")
    @with_circuit_breaker("ai_analysis", failure_threshold=3, recovery_timeout=300)
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def analyze_symptoms(
        self, 
        symptoms: List[Dict[str, Any]], 
        patient_id: str,
        context: Optional[Dict[str, Any]] = None,
        strategy_preference: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze symptoms using the best available strategy"""
        if not self._initialized:
            await self.initialize()
        
        try:
            # Select strategy
            strategy = self._select_strategy(strategy_preference)
            
            # Get analysis context
            analysis_context = self.services.get('analysis_context')
            if analysis_context:
                analysis_context.set_strategy(strategy)
                result = await analysis_context.analyze_symptoms(symptoms, context)
            else:
                # Fallback to direct strategy call
                result = await strategy.analyze_symptoms(symptoms, context)
            
            # Store result in repository
            if 'ai_results' in self.repositories:
                await self._store_ai_result('symptom_analysis', patient_id, result)
            
            # Update patient activity
            if 'patients' in self.repositories:
                await self.repositories['patients'].increment_activity_counters(
                    patient_id, ai_analysis_count=1
                )
            
            return result
            
        except Exception as e:
            logger.error("Symptom analysis failed", 
                        patient_id=patient_id,
                        error=str(e))
            raise
    
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def analyze_symptoms_batch(
        self,
        batch_requests: List[Dict[str, Any]],
        strategy_preference: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Process multiple symptom analyses concurrently with backpressure."""
        if not batch_requests:
            return []
        if not self._initialized:
            await self.initialize()

        async def _run_single(entry: Dict[str, Any]) -> Dict[str, Any]:
            symptoms = entry.get("symptoms", [])
            patient_id = entry.get("patient_id", "unknown")
            context = entry.get("context")
            preference = entry.get("strategy_preference", strategy_preference)
            async with self._batch_semaphore:
                try:
                    result = await self.analyze_symptoms(
                        symptoms,
                        patient_id,
                        context,
                        preference
                    )
                    if isinstance(result, dict):
                        result.setdefault("patient_id", patient_id)
                    return result
                except Exception as exc:
                    logger.error(
                        "Batch symptom analysis failed",
                        patient_id=patient_id,
                        error=str(exc)
                    )
                    return {"patient_id": patient_id, "error": str(exc)}

        tasks = [asyncio.create_task(_run_single(entry)) for entry in batch_requests]
        return await asyncio.gather(*tasks)
    
    @with_cache(ttl=3600, key_prefix="medical_history")
    @with_circuit_breaker("medical_history_processing", failure_threshold=3, recovery_timeout=300)
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def process_medical_history(
        self, 
        text: str, 
        patient_id: str,
        context: Optional[Dict[str, Any]] = None,
        strategy_preference: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process medical history text using the best available strategy"""
        if not self._initialized:
            await self.initialize()
        
        try:
            # Create medical history record
            if 'medical_history' in self.repositories:
                history_data = {
                    'patient_id': patient_id,
                    'text': text,
                    'language': context.get('language', 'es') if context else 'es',
                    'metadata': context
                }
                history_record = await self.repositories['medical_history'].create_medical_history(history_data)
                history_id = history_record['_id']
            else:
                history_id = None
            
            # Select strategy
            strategy = self._select_strategy(strategy_preference)
            
            # Get analysis context
            analysis_context = self.services.get('analysis_context')
            if analysis_context:
                analysis_context.set_strategy(strategy)
                result = await analysis_context.process_medical_text(text, context)
            else:
                # Fallback to direct strategy call
                result = await strategy.process_medical_text(text, context)
            
            # Update medical history with results
            if history_id and 'medical_history' in self.repositories:
                await self.repositories['medical_history'].update_processing_status(
                    history_id, 'completed', result
                )
            
            # Store AI result
            if 'ai_results' in self.repositories:
                await self._store_ai_result('medical_history', patient_id, result, {
                    'history_id': history_id,
                    'text_length': len(text)
                })
            
            # Update patient activity
            if 'patients' in self.repositories:
                await self.repositories['patients'].increment_activity_counters(
                    patient_id, history_count=1, ai_analysis_count=1
                )
            
            return result
            
        except Exception as e:
            logger.error("Medical history processing failed", 
                        patient_id=patient_id,
                        error=str(e))
            
            # Update history status to error if we created a record
            if 'history_id' in locals() and history_id and 'medical_history' in self.repositories:
                await self.repositories['medical_history'].update_processing_status(
                    history_id, 'error'
                )
            
            raise
    
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def process_medical_history_batch(
        self,
        batch_requests: List[Dict[str, Any]],
        strategy_preference: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Batch process multiple medical histories asynchronously."""
        if not batch_requests:
            return []
        if not self._initialized:
            await self.initialize()

        async def _run_single(entry: Dict[str, Any]) -> Dict[str, Any]:
            text = entry.get("text", "")
            patient_id = entry.get("patient_id", "unknown")
            context = entry.get("context")
            preference = entry.get("strategy_preference", strategy_preference)
            async with self._batch_semaphore:
                try:
                    result = await self.process_medical_history(
                        text,
                        patient_id,
                        context,
                        preference
                    )
                    if isinstance(result, dict):
                        result.setdefault("patient_id", patient_id)
                    return result
                except Exception as exc:
                    logger.error(
                        "Batch medical history processing failed",
                        patient_id=patient_id,
                        error=str(exc)
                    )
                    return {"patient_id": patient_id, "error": str(exc)}

        tasks = [asyncio.create_task(_run_single(entry)) for entry in batch_requests]
        return await asyncio.gather(*tasks)
    
    def _select_strategy(self, preference: Optional[str] = None) -> Any:
        """Select the best strategy based on preference and availability"""
        if preference and preference in self.strategies:
            return self.strategies[preference]
        
        # Use primary strategy (optimal for environment)
        return self.strategies.get('primary', self.strategies.get('rule_based'))
    
    async def _store_ai_result(
        self, 
        result_type: str, 
        patient_id: str, 
        result_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Store AI analysis result"""
        try:
            ai_result_data = {
                'patient_id': patient_id,
                'type': result_type,
                'data': result_data,
                'metadata': metadata or {}
            }
            
            await self.repositories['ai_results'].create_ai_result(ai_result_data)
            
        except Exception as e:
            logger.error("Failed to store AI result", 
                        result_type=result_type,
                        patient_id=patient_id,
                        error=str(e))
    
    @with_metrics(track_execution_time=True)
    async def get_service_health(self) -> Dict[str, Any]:
        """Get health status of all services"""
        health_status = {
            "overall_status": "healthy",
            "environment": self.environment,
            "initialized": self._initialized,
            "services": {},
            "strategies": {},
            "repositories": {}
        }
        
        try:
            # Check services
            for service_name, service in self.services.items():
                try:
                    # Simple health check - just verify service exists and is callable
                    health_status["services"][service_name] = {
                        "status": "healthy",
                        "type": type(service).__name__
                    }
                except Exception as e:
                    health_status["services"][service_name] = {
                        "status": "unhealthy",
                        "error": str(e)
                    }
            
            # Check strategies
            for strategy_name, strategy in self.strategies.items():
                try:
                    health_status["strategies"][strategy_name] = {
                        "status": "healthy",
                        "name": strategy.get_strategy_name(),
                        "confidence": strategy.get_confidence_score()
                    }
                except Exception as e:
                    health_status["strategies"][strategy_name] = {
                        "status": "unhealthy",
                        "error": str(e)
                    }
            
            # Check repositories
            for repo_name, repo in self.repositories.items():
                try:
                    # Simple health check - count operation
                    await repo.count({})
                    health_status["repositories"][repo_name] = {
                        "status": "healthy",
                        "type": type(repo).__name__
                    }
                except Exception as e:
                    health_status["repositories"][repo_name] = {
                        "status": "unhealthy",
                        "error": str(e)
                    }
            
            # Determine overall status
            all_statuses = []
            for category in health_status["services"], health_status["strategies"], health_status["repositories"]:
                for item_status in category.values():
                    all_statuses.append(item_status["status"])
            
            if "unhealthy" in all_statuses:
                health_status["overall_status"] = "degraded"
            if not all_statuses:
                health_status["overall_status"] = "unhealthy"
            
        except Exception as e:
            health_status["overall_status"] = "unhealthy"
            health_status["error"] = str(e)
            logger.error("Health check failed", error=str(e))
        
        return health_status
    
    @with_metrics(track_execution_time=True)
    async def get_service_metrics(self) -> Dict[str, Any]:
        """Get comprehensive service metrics"""
        metrics = {
            "timestamp": asyncio.get_event_loop().time(),
            "environment": self.environment,
            "services_count": len(self.services),
            "strategies_count": len(self.strategies),
            "repositories_count": len(self.repositories)
        }
        
        try:
            # Get strategy availability
            strategy_availability = StrategyFactory.get_available_strategies()
            metrics["strategy_availability"] = strategy_availability
            
            # Get repository statistics if available
            if 'ai_results' in self.repositories:
                try:
                    repo_metrics = await self.repositories['ai_results'].get_performance_metrics()
                    metrics["ai_results_metrics"] = repo_metrics
                except Exception as e:
                    logger.warning("Failed to get AI results metrics", error=str(e))
            
            if 'medical_history' in self.repositories:
                try:
                    repo_stats = await self.repositories['medical_history'].get_statistics()
                    metrics["medical_history_stats"] = repo_stats
                except Exception as e:
                    logger.warning("Failed to get medical history statistics", error=str(e))
            
            if 'patients' in self.repositories:
                try:
                    patient_stats = await self.repositories['patients'].get_patient_statistics()
                    metrics["patient_stats"] = patient_stats
                except Exception as e:
                    logger.warning("Failed to get patient statistics", error=str(e))
            
        except Exception as e:
            logger.error("Failed to collect service metrics", error=str(e))
            metrics["error"] = str(e)
        
        return metrics
    
    async def shutdown(self):
        """Gracefully shutdown all services"""
        try:
            logger.info("Shutting down AI Service Manager")
            
            # Close database connections
            if 'database_service' in self.services:
                # Close database connections if needed
                pass
            
            # Clear caches
            if 'cache_service' in self.services:
                # Clear cache if needed
                pass
            
            self._initialized = False
            logger.info("AI Service Manager shutdown complete")
            
        except Exception as e:
            logger.error("Error during shutdown", error=str(e))


# Global service manager instance
ai_service_manager = AIServiceManager()
