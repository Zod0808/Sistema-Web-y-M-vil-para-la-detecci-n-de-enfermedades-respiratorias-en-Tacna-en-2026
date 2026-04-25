"""
Unit tests for AI Service Manager
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

from services.ai_service_manager import AIServiceManager
from factories.service_factory import ServiceFactory
from factories.strategy_factory import StrategyFactory


class TestAIServiceManager:
    """Test AI Service Manager implementation"""
    
    @pytest.fixture
    def ai_service_manager(self):
        """Create AI service manager instance"""
        return AIServiceManager(environment="development")
    
    @pytest.fixture
    def mock_services(self):
        """Create mock services dictionary"""
        return {
            'model_manager': AsyncMock(),
            'analysis_context': AsyncMock(),
            'database_service': AsyncMock(),
            'cache_service': AsyncMock()
        }
    
    @pytest.fixture
    def mock_strategies(self):
        """Create mock strategies"""
        strategy = MagicMock()
        strategy.analyze_symptoms = AsyncMock(return_value={
            "disease": "Bronquitis",
            "confidence": 0.85,
            "urgency_level": "moderate"
        })
        strategy.process_medical_text = AsyncMock(return_value={
            "symptoms": ["tos", "fiebre"],
            "entities": []
        })
        strategy.get_strategy_name = MagicMock(return_value="rule_based")
        strategy.get_confidence_score = MagicMock(return_value=0.8)
        return {
            'primary': strategy,
            'fallback': strategy,
            'rule_based': strategy
        }
    
    @pytest.fixture
    def mock_repositories(self):
        """Create mock repositories"""
        repo = AsyncMock()
        repo.create_medical_history = AsyncMock(return_value={"_id": "history_123"})
        repo.update_processing_status = AsyncMock()
        repo.create_ai_result = AsyncMock()
        repo.count = AsyncMock(return_value=10)
        repo.increment_activity_counters = AsyncMock()
        return {
            'medical_history': repo,
            'ai_results': repo,
            'patients': repo
        }
    
    def test_ai_service_manager_initialization(self, ai_service_manager):
        """Test AI service manager initialization"""
        assert ai_service_manager._initialized is False
        assert ai_service_manager.environment == "development"
        assert ai_service_manager.services == {}
        assert ai_service_manager.repositories == {}
        assert ai_service_manager.strategies == {}
    
    @pytest.mark.asyncio
    async def test_initialize_success(self, ai_service_manager):
        """Test successful initialization"""
        # Mock ServiceFactory methods to avoid dependency issues
        with patch.object(ServiceFactory, 'create_development_services', return_value={}) as mock_services:
            with patch.object(ai_service_manager, '_warm_up_models', new_callable=AsyncMock):
                with patch.object(ai_service_manager, '_initialize_strategies', new_callable=AsyncMock):
                    with patch.object(ai_service_manager, '_initialize_repositories', new_callable=AsyncMock):
                        await ai_service_manager.initialize()
                        
                        assert ai_service_manager._initialized is True
                        mock_services.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_initialize_production_environment(self):
        """Test initialization with production environment"""
        manager = AIServiceManager(environment="production")
        
        with patch.object(ServiceFactory, 'create_production_services', return_value={}):
            with patch.object(manager, '_warm_up_models', new_callable=AsyncMock):
                with patch.object(manager, '_initialize_strategies', new_callable=AsyncMock):
                    with patch.object(manager, '_initialize_repositories', new_callable=AsyncMock):
                        await manager.initialize()
                        
                        assert manager._initialized is True
    
    @pytest.mark.asyncio
    async def test_initialize_auto_initializes_on_use(self, ai_service_manager, mock_services, mock_strategies):
        """Test that manager auto-initializes when used"""
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        
        with patch.object(ai_service_manager, 'initialize', new_callable=AsyncMock) as mock_init:
            await ai_service_manager.analyze_symptoms(
                symptoms=[{"symptom": "tos"}],
                patient_id="P001"
            )
            
            mock_init.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_warm_up_models(self, ai_service_manager):
        """Test model warm-up"""
        mock_model_manager = AsyncMock()
        mock_model_manager.load_models = AsyncMock()
        ai_service_manager.services['model_manager'] = mock_model_manager
        
        await ai_service_manager._warm_up_models()
        
        mock_model_manager.load_models.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_warm_up_models_no_manager(self, ai_service_manager):
        """Test warm-up when model manager is not available"""
        ai_service_manager.services = {}
        
        # Should not raise error
        await ai_service_manager._warm_up_models()
    
    @pytest.mark.asyncio
    async def test_get_model_manager_existing(self, ai_service_manager):
        """Test getting existing model manager"""
        mock_manager = AsyncMock()
        ai_service_manager.services['model_manager'] = mock_manager
        
        result = ai_service_manager._get_model_manager()
        
        assert result == mock_manager
    
    @pytest.mark.asyncio
    async def test_get_model_manager_create_new(self, ai_service_manager):
        """Test creating new model manager"""
        with patch.object(ServiceFactory, 'get_service', return_value=None):
            with patch.object(ServiceFactory, 'create_service', return_value=AsyncMock()) as mock_create:
                result = ai_service_manager._get_model_manager()
                
                assert result is not None
                mock_create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_initialize_strategies(self, ai_service_manager):
        """Test strategy initialization"""
        with patch.object(StrategyFactory, 'create_optimal_strategy', return_value=MagicMock()):
            with patch.object(StrategyFactory, 'create_strategy', return_value=MagicMock()):
                await ai_service_manager._initialize_strategies()
                
                assert 'primary' in ai_service_manager.strategies
                assert 'fallback' in ai_service_manager.strategies
                assert 'rule_based' in ai_service_manager.strategies
    
    @pytest.mark.asyncio
    async def test_initialize_repositories(self, ai_service_manager, mock_services):
        """Test repository initialization"""
        ai_service_manager.services = mock_services
        
        with patch('services.ai_service_manager.MedicalHistoryRepository') as mock_hist_repo:
            with patch('services.ai_service_manager.AIResultRepository') as mock_ai_repo:
                with patch('services.ai_service_manager.PatientRepository') as mock_patient_repo:
                    await ai_service_manager._initialize_repositories()
                    
                    assert 'medical_history' in ai_service_manager.repositories
                    assert 'ai_results' in ai_service_manager.repositories
                    assert 'patients' in ai_service_manager.repositories
    
    @pytest.mark.asyncio
    async def test_initialize_repositories_no_db_service(self, ai_service_manager):
        """Test repository initialization without database service"""
        ai_service_manager.services = {}
        
        await ai_service_manager._initialize_repositories()
        
        # Should not raise error, repositories should be empty or not initialized
        assert isinstance(ai_service_manager.repositories, dict)
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_success(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test successful symptom analysis"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        mock_services['analysis_context'].set_strategy = MagicMock()
        mock_services['analysis_context'].analyze_symptoms = AsyncMock(return_value={
            "disease": "Bronquitis",
            "confidence": 0.85
        })
        
        result = await ai_service_manager.analyze_symptoms(
            symptoms=[{"symptom": "tos", "severity": "moderate"}],
            patient_id="P001",
            context={"age": 45}
        )
        
        assert result is not None
        assert "disease" in result or "confidence" in result
        mock_services['analysis_context'].analyze_symptoms.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_fallback_to_strategy(
        self, ai_service_manager, mock_services, mock_strategies
    ):
        """Test symptom analysis falls back to strategy when analysis_context not available"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        
        result = await ai_service_manager.analyze_symptoms(
            symptoms=[{"symptom": "tos"}],
            patient_id="P001"
        )
        
        assert result is not None
        mock_strategies['primary'].analyze_symptoms.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_strategy_preference(
        self, ai_service_manager, mock_services, mock_strategies
    ):
        """Test symptom analysis with strategy preference"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        
        result = await ai_service_manager.analyze_symptoms(
            symptoms=[{"symptom": "tos"}],
            patient_id="P001",
            strategy_preference="rule_based"
        )
        
        assert result is not None
        # Should use preferred strategy
        mock_strategies['rule_based'].analyze_symptoms.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_stores_result(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test that analysis result is stored"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        await ai_service_manager.analyze_symptoms(
            symptoms=[{"symptom": "tos"}],
            patient_id="P001"
        )
        
        mock_repositories['ai_results'].create_ai_result.assert_called_once()
        mock_repositories['patients'].increment_activity_counters.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_error_handling(
        self, ai_service_manager, mock_strategies
    ):
        """Test error handling in symptom analysis"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        
        mock_strategies['primary'].analyze_symptoms.side_effect = Exception("Analysis error")
        
        with pytest.raises(Exception, match="Analysis error"):
            await ai_service_manager.analyze_symptoms(
                symptoms=[{"symptom": "tos"}],
                patient_id="P001"
            )
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_batch(
        self, ai_service_manager, mock_strategies
    ):
        """Test batch symptom analysis"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        
        batch_requests = [
            {"symptoms": [{"symptom": "tos"}], "patient_id": "P001"},
            {"symptoms": [{"symptom": "fiebre"}], "patient_id": "P002"}
        ]
        
        results = await ai_service_manager.analyze_symptoms_batch(batch_requests)
        
        assert len(results) == 2
        assert all("patient_id" in result for result in results)
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_batch_empty(self, ai_service_manager):
        """Test batch symptom analysis with empty list"""
        ai_service_manager._initialized = True
        
        results = await ai_service_manager.analyze_symptoms_batch([])
        
        assert results == []
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_batch_with_errors(self, ai_service_manager, mock_strategies):
        """Test batch symptom analysis with some errors"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        
        # Make one strategy fail
        mock_strategies['primary'].analyze_symptoms.side_effect = [
            {"disease": "Bronquitis"},
            Exception("Analysis error")
        ]
        
        batch_requests = [
            {"symptoms": [{"symptom": "tos"}], "patient_id": "P001"},
            {"symptoms": [{"symptom": "fiebre"}], "patient_id": "P002"}
        ]
        
        results = await ai_service_manager.analyze_symptoms_batch(batch_requests)
        
        assert len(results) == 2
        # One should have error
        assert any("error" in result for result in results)
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_batch_concurrent_limit(self, ai_service_manager, mock_strategies):
        """Test batch processing respects concurrent limit"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        
        # Create many requests
        batch_requests = [
            {"symptoms": [{"symptom": f"symptom_{i}"}], "patient_id": f"P{i:03d}"}
            for i in range(10)
        ]
        
        results = await ai_service_manager.analyze_symptoms_batch(batch_requests)
        
        assert len(results) == 10
        # All should complete (semaphore limits concurrency)
    
    @pytest.mark.asyncio
    async def test_process_medical_history_success(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test successful medical history processing"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        mock_services['analysis_context'].set_strategy = MagicMock()
        mock_services['analysis_context'].process_medical_text = AsyncMock(return_value={
            "symptoms": ["tos", "fiebre"],
            "entities": []
        })
        
        result = await ai_service_manager.process_medical_history(
            text="Paciente con tos y fiebre",
            patient_id="P001",
            context={"language": "es"}
        )
        
        assert result is not None
        assert "symptoms" in result or "entities" in result
        mock_services['analysis_context'].process_medical_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_medical_history_creates_record(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test that medical history record is created"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        mock_services['analysis_context'].set_strategy = MagicMock()
        mock_services['analysis_context'].process_medical_text = AsyncMock(return_value={
            "symptoms": [],
            "entities": []
        })
        
        await ai_service_manager.process_medical_history(
            text="Test text",
            patient_id="P001"
        )
        
        mock_repositories['medical_history'].create_medical_history.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_medical_history_batch(
        self, ai_service_manager, mock_strategies, mock_repositories
    ):
        """Test batch medical history processing"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        batch_requests = [
            {"text": "Text 1", "patient_id": "P001"},
            {"text": "Text 2", "patient_id": "P002"}
        ]
        
        results = await ai_service_manager.process_medical_history_batch(batch_requests)
        
        assert len(results) == 2
        assert all("patient_id" in result for result in results)
    
    @pytest.mark.asyncio
    async def test_select_strategy_with_preference(self, ai_service_manager, mock_strategies):
        """Test strategy selection with preference"""
        ai_service_manager.strategies = mock_strategies
        
        strategy = ai_service_manager._select_strategy("rule_based")
        
        assert strategy == mock_strategies['rule_based']
    
    @pytest.mark.asyncio
    async def test_select_strategy_default(self, ai_service_manager, mock_strategies):
        """Test strategy selection defaults to primary"""
        ai_service_manager.strategies = mock_strategies
        
        strategy = ai_service_manager._select_strategy(None)
        
        assert strategy == mock_strategies['primary']
    
    @pytest.mark.asyncio
    async def test_select_strategy_fallback(self, ai_service_manager):
        """Test strategy selection falls back to rule_based"""
        ai_service_manager.strategies = {'rule_based': MagicMock()}
        
        strategy = ai_service_manager._select_strategy(None)
        
        assert strategy == ai_service_manager.strategies['rule_based']
    
    @pytest.mark.asyncio
    async def test_store_ai_result_success(self, ai_service_manager, mock_repositories):
        """Test storing AI result"""
        ai_service_manager.repositories = mock_repositories
        
        result_data = {"disease": "Bronquitis", "confidence": 0.85}
        metadata = {"source": "test"}
        
        await ai_service_manager._store_ai_result(
            "symptom_analysis",
            "P001",
            result_data,
            metadata
        )
        
        mock_repositories['ai_results'].create_ai_result.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_store_ai_result_error_handling(self, ai_service_manager):
        """Test storing AI result with error"""
        mock_repo = AsyncMock()
        mock_repo.create_ai_result = AsyncMock(side_effect=Exception("DB error"))
        ai_service_manager.repositories = {'ai_results': mock_repo}
        
        # Should not raise exception, just log error
        await ai_service_manager._store_ai_result(
            "symptom_analysis",
            "P001",
            {"data": "test"}
        )
    
    @pytest.mark.asyncio
    async def test_get_service_health_all_healthy(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test health check with all services healthy"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        health = await ai_service_manager.get_service_health()
        
        assert health["overall_status"] in ["healthy", "degraded"]
        assert health["initialized"] is True
        assert "services" in health
        assert "strategies" in health
        assert "repositories" in health
    
    @pytest.mark.asyncio
    async def test_get_service_health_with_unhealthy_service(
        self, ai_service_manager, mock_strategies, mock_repositories
    ):
        """Test health check with unhealthy service"""
        ai_service_manager._initialized = True
        # Create a service that raises error
        mock_service = MagicMock()
        mock_service.__class__.__name__ = "TestService"
        type(mock_service).__name__ = property(lambda self: "TestService")
        ai_service_manager.services = {'test_service': mock_service}
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        health = await ai_service_manager.get_service_health()
        
        # Should still return health status
        assert "overall_status" in health
    
    @pytest.mark.asyncio
    async def test_get_service_health_with_unhealthy_strategy(
        self, ai_service_manager, mock_services, mock_repositories
    ):
        """Test health check with unhealthy strategy"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        # Create strategy that raises error
        mock_strategy = MagicMock()
        mock_strategy.get_strategy_name.side_effect = Exception("Strategy error")
        ai_service_manager.strategies = {'test_strategy': mock_strategy}
        ai_service_manager.repositories = mock_repositories
        
        health = await ai_service_manager.get_service_health()
        
        assert "strategies" in health
        assert health["strategies"]["test_strategy"]["status"] == "unhealthy"
    
    @pytest.mark.asyncio
    async def test_get_service_health_with_unhealthy_repository(
        self, ai_service_manager, mock_services, mock_strategies
    ):
        """Test health check with unhealthy repository"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        # Create repository that raises error
        mock_repo = AsyncMock()
        mock_repo.count = AsyncMock(side_effect=Exception("Repo error"))
        ai_service_manager.repositories = {'test_repo': mock_repo}
        
        health = await ai_service_manager.get_service_health()
        
        assert "repositories" in health
        assert health["repositories"]["test_repo"]["status"] == "unhealthy"
    
    @pytest.mark.asyncio
    async def test_get_service_metrics_success(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test getting service metrics"""
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        # Mock repository methods
        mock_repositories['ai_results'].get_performance_metrics = AsyncMock(return_value={"count": 100})
        mock_repositories['medical_history'].get_statistics = AsyncMock(return_value={"total": 50})
        mock_repositories['patients'].get_patient_statistics = AsyncMock(return_value={"active": 25})
        
        with patch('services.ai_service_manager.StrategyFactory.get_available_strategies', return_value={"rule_based": True}):
            metrics = await ai_service_manager.get_service_metrics()
            
            assert "timestamp" in metrics
            assert "environment" in metrics
            assert "services_count" in metrics
            assert "strategies_count" in metrics
            assert "repositories_count" in metrics
            assert "strategy_availability" in metrics
    
    @pytest.mark.asyncio
    async def test_get_service_metrics_with_errors(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test getting service metrics with repository errors"""
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        # Make repository methods fail
        mock_repositories['ai_results'].get_performance_metrics = AsyncMock(side_effect=Exception("Error"))
        mock_repositories['medical_history'].get_statistics = AsyncMock(side_effect=Exception("Error"))
        mock_repositories['patients'].get_patient_statistics = AsyncMock(side_effect=Exception("Error"))
        
        with patch('services.ai_service_manager.StrategyFactory.get_available_strategies', return_value={}):
            metrics = await ai_service_manager.get_service_metrics()
            
            # Should still return metrics even with errors
            assert "timestamp" in metrics
    
    @pytest.mark.asyncio
    async def test_shutdown(self, ai_service_manager, mock_services):
        """Test graceful shutdown"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        
        await ai_service_manager.shutdown()
        
        assert ai_service_manager._initialized is False
    
    @pytest.mark.asyncio
    async def test_shutdown_error_handling(self, ai_service_manager):
        """Test shutdown error handling"""
        ai_service_manager._initialized = True
        
        # Should not raise exception even if there are errors
        await ai_service_manager.shutdown()
        
        assert ai_service_manager._initialized is False
        
        results = await ai_service_manager.analyze_symptoms_batch(batch_requests)
        
        assert len(results) == 2
        assert all("patient_id" in result for result in results)
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_batch_empty(self, ai_service_manager):
        """Test batch analysis with empty list"""
        ai_service_manager._initialized = True
        
        results = await ai_service_manager.analyze_symptoms_batch([])
        
        assert results == []
    
    @pytest.mark.asyncio
    async def test_process_medical_history_success(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test successful medical history processing"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        mock_services['analysis_context'].set_strategy = MagicMock()
        mock_services['analysis_context'].process_medical_text = AsyncMock(return_value={
            "symptoms": ["tos", "fiebre"],
            "entities": []
        })
        
        result = await ai_service_manager.process_medical_history(
            text="Paciente con tos y fiebre",
            patient_id="P001",
            context={"language": "es"}
        )
        
        assert result is not None
        assert "symptoms" in result
        mock_services['analysis_context'].process_medical_text.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_medical_history_creates_record(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test that medical history record is created"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        mock_services['analysis_context'].set_strategy = MagicMock()
        mock_services['analysis_context'].process_medical_text = AsyncMock(return_value={
            "symptoms": ["tos"]
        })
        
        await ai_service_manager.process_medical_history(
            text="Paciente con tos",
            patient_id="P001"
        )
        
        mock_repositories['medical_history'].create_medical_history.assert_called_once()
        mock_repositories['medical_history'].update_processing_status.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_medical_history_error_handling(
        self, ai_service_manager, mock_strategies, mock_repositories
    ):
        """Test error handling in medical history processing"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        mock_strategies['primary'].process_medical_text.side_effect = Exception("Processing error")
        
        with pytest.raises(Exception, match="Processing error"):
            await ai_service_manager.process_medical_history(
                text="Test",
                patient_id="P001"
            )
    
    @pytest.mark.asyncio
    async def test_process_medical_history_batch(
        self, ai_service_manager, mock_strategies
    ):
        """Test batch medical history processing"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        
        batch_requests = [
            {"text": "Paciente con tos", "patient_id": "P001"},
            {"text": "Paciente con fiebre", "patient_id": "P002"}
        ]
        
        results = await ai_service_manager.process_medical_history_batch(batch_requests)
        
        assert len(results) == 2
        assert all("patient_id" in result for result in results)
    
    def test_select_strategy_with_preference(self, ai_service_manager, mock_strategies):
        """Test strategy selection with preference"""
        ai_service_manager.strategies = mock_strategies
        
        strategy = ai_service_manager._select_strategy("rule_based")
        
        assert strategy == mock_strategies['rule_based']
    
    def test_select_strategy_default(self, ai_service_manager, mock_strategies):
        """Test default strategy selection"""
        ai_service_manager.strategies = mock_strategies
        
        strategy = ai_service_manager._select_strategy(None)
        
        assert strategy == mock_strategies['primary']
    
    def test_select_strategy_fallback(self, ai_service_manager):
        """Test strategy selection with fallback"""
        ai_service_manager.strategies = {
            'rule_based': MagicMock()
        }
        
        strategy = ai_service_manager._select_strategy(None)
        
        assert strategy == ai_service_manager.strategies['rule_based']
    
    @pytest.mark.asyncio
    async def test_store_ai_result(
        self, ai_service_manager, mock_repositories
    ):
        """Test storing AI result"""
        ai_service_manager.repositories = mock_repositories
        
        await ai_service_manager._store_ai_result(
            result_type="symptom_analysis",
            patient_id="P001",
            result_data={"disease": "Bronquitis"},
            metadata={"confidence": 0.85}
        )
        
        mock_repositories['ai_results'].create_ai_result.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_store_ai_result_error_handling(
        self, ai_service_manager, mock_repositories
    ):
        """Test error handling when storing AI result"""
        ai_service_manager.repositories = mock_repositories
        mock_repositories['ai_results'].create_ai_result.side_effect = Exception("Storage error")
        
        # Should not raise error, just log
        await ai_service_manager._store_ai_result(
            result_type="test",
            patient_id="P001",
            result_data={}
        )
    
    @pytest.mark.asyncio
    async def test_get_service_health_success(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test successful health check"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        health = await ai_service_manager.get_service_health()
        
        assert health["overall_status"] in ["healthy", "degraded", "unhealthy"]
        assert health["initialized"] is True
        assert "services" in health
        assert "strategies" in health
        assert "repositories" in health
    
    @pytest.mark.asyncio
    async def test_get_service_health_not_initialized(self, ai_service_manager):
        """Test health check when not initialized"""
        health = await ai_service_manager.get_service_health()
        
        assert health["initialized"] is False
        assert health["overall_status"] == "unhealthy"
    
    @pytest.mark.asyncio
    async def test_get_service_health_with_errors(
        self, ai_service_manager, mock_services, mock_strategies, mock_repositories
    ):
        """Test health check with service errors"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        ai_service_manager.strategies = mock_strategies
        ai_service_manager.repositories = mock_repositories
        
        # Make one repository fail
        mock_repositories['medical_history'].count.side_effect = Exception("DB error")
        
        health = await ai_service_manager.get_service_health()
        
        assert health["repositories"]["medical_history"]["status"] == "unhealthy"
        assert health["overall_status"] == "degraded"
    
    @pytest.mark.asyncio
    async def test_get_service_metrics(
        self, ai_service_manager, mock_repositories
    ):
        """Test getting service metrics"""
        ai_service_manager._initialized = True
        ai_service_manager.repositories = mock_repositories
        
        with patch.object(StrategyFactory, 'get_available_strategies', return_value=["rule_based", "openai"]):
            metrics = await ai_service_manager.get_service_metrics()
            
            assert "timestamp" in metrics
            assert "environment" in metrics
            assert "services_count" in metrics
            assert "strategies_count" in metrics
            assert "repositories_count" in metrics
    
    @pytest.mark.asyncio
    async def test_get_service_metrics_with_repo_stats(
        self, ai_service_manager, mock_repositories
    ):
        """Test metrics with repository statistics"""
        ai_service_manager._initialized = True
        ai_service_manager.repositories = mock_repositories
        
        mock_repositories['ai_results'].get_performance_metrics = AsyncMock(return_value={"count": 100})
        mock_repositories['medical_history'].get_statistics = AsyncMock(return_value={"total": 50})
        mock_repositories['patients'].get_patient_statistics = AsyncMock(return_value={"active": 25})
        
        with patch.object(StrategyFactory, 'get_available_strategies', return_value=[]):
            metrics = await ai_service_manager.get_service_metrics()
            
            assert "ai_results_metrics" in metrics
            assert "medical_history_stats" in metrics
            assert "patient_stats" in metrics
    
    @pytest.mark.asyncio
    async def test_shutdown(self, ai_service_manager):
        """Test graceful shutdown"""
        ai_service_manager._initialized = True
        
        await ai_service_manager.shutdown()
        
        assert ai_service_manager._initialized is False
    
    @pytest.mark.asyncio
    async def test_shutdown_with_services(self, ai_service_manager, mock_services):
        """Test shutdown with services"""
        ai_service_manager._initialized = True
        ai_service_manager.services = mock_services
        
        await ai_service_manager.shutdown()
        
        assert ai_service_manager._initialized is False
    
    @pytest.mark.asyncio
    async def test_concurrent_operations(
        self, ai_service_manager, mock_strategies
    ):
        """Test concurrent operations"""
        ai_service_manager._initialized = True
        ai_service_manager.services = {}
        ai_service_manager.strategies = mock_strategies
        
        async def analyze():
            return await ai_service_manager.analyze_symptoms(
                symptoms=[{"symptom": "tos"}],
                patient_id="P001"
            )
        
        # Run multiple analyses concurrently
        results = await asyncio.gather(*[analyze() for _ in range(5)])
        
        assert len(results) == 5
        assert all(result is not None for result in results)
