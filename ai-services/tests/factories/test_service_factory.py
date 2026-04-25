"""
Tests for factories/service_factory.py
"""

import pytest
from unittest.mock import patch, MagicMock, Mock
from factories.service_factory import ServiceFactory, ServiceType


class TestServiceType:
    """Tests for ServiceType enum"""
    
    def test_service_type_values(self):
        """Test all service type values"""
        assert ServiceType.SYMPTOM_ANALYZER.value == "symptom_analyzer"
        assert ServiceType.MEDICAL_HISTORY_PROCESSOR.value == "medical_history_processor"
        assert ServiceType.AI_MODEL_MANAGER.value == "ai_model_manager"
        assert ServiceType.CACHE_SERVICE.value == "cache_service"
        assert ServiceType.DATABASE_SERVICE.value == "database_service"
        assert ServiceType.NOTIFICATION_SERVICE.value == "notification_service"


class TestServiceFactory:
    """Tests for ServiceFactory"""
    
    def setup_method(self):
        """Clear instances before each test"""
        ServiceFactory.clear_instances()
    
    def test_initialization(self):
        """Test factory initialization"""
        assert ServiceFactory._instances == {}
    
    @patch('factories.service_factory.SymptomAnalyzer')
    def test_create_service_symptom_analyzer(self, mock_analyzer_class):
        """Test creating symptom analyzer service"""
        mock_instance = MagicMock()
        mock_analyzer_class.return_value = mock_instance
        
        service = ServiceFactory.create_service(ServiceType.SYMPTOM_ANALYZER)
        
        assert service == mock_instance
        mock_analyzer_class.assert_called_once()
        assert ServiceType.SYMPTOM_ANALYZER in ServiceFactory._instances
    
    @patch('factories.service_factory.MedicalHistoryProcessor')
    def test_create_service_medical_history_processor(self, mock_processor_class):
        """Test creating medical history processor service"""
        mock_instance = MagicMock()
        mock_processor_class.return_value = mock_instance
        
        service = ServiceFactory.create_service(ServiceType.MEDICAL_HISTORY_PROCESSOR)
        
        assert service == mock_instance
        mock_processor_class.assert_called_once()
    
    @patch('factories.service_factory.ModelManager')
    def test_create_service_ai_model_manager(self, mock_manager_class):
        """Test creating AI model manager service"""
        mock_instance = MagicMock()
        mock_manager_class.return_value = mock_instance
        
        service = ServiceFactory.create_service(ServiceType.AI_MODEL_MANAGER)
        
        assert service == mock_instance
        mock_manager_class.assert_called_once()
    
    @patch('factories.service_factory.CacheService')
    def test_create_service_cache_service(self, mock_cache_class):
        """Test creating cache service"""
        mock_instance = MagicMock()
        mock_cache_class.return_value = mock_instance
        
        service = ServiceFactory.create_service(ServiceType.CACHE_SERVICE)
        
        assert service == mock_instance
        mock_cache_class.assert_called_once()
    
    @patch('factories.service_factory.DatabaseService')
    def test_create_service_database_service(self, mock_db_class):
        """Test creating database service"""
        mock_instance = MagicMock()
        mock_db_class.return_value = mock_instance
        
        service = ServiceFactory.create_service(ServiceType.DATABASE_SERVICE)
        
        assert service == mock_instance
        mock_db_class.assert_called_once()
    
    @patch('factories.service_factory.NotificationService')
    def test_create_service_notification_service(self, mock_notification_class):
        """Test creating notification service"""
        mock_instance = MagicMock()
        mock_notification_class.return_value = mock_instance
        
        service = ServiceFactory.create_service(ServiceType.NOTIFICATION_SERVICE)
        
        assert service == mock_instance
        mock_notification_class.assert_called_once()
    
    def test_create_service_unknown_type(self):
        """Test creating service with unknown type"""
        # Create a mock enum value
        unknown_type = MagicMock()
        unknown_type.value = "unknown_service"
        
        with pytest.raises(ValueError, match="Unknown service type"):
            ServiceFactory.create_service(unknown_type)
    
    @patch('factories.service_factory.SymptomAnalyzer')
    def test_create_service_singleton_behavior(self, mock_analyzer_class):
        """Test that factory returns same instance (singleton)"""
        mock_instance = MagicMock()
        mock_analyzer_class.return_value = mock_instance
        
        service1 = ServiceFactory.create_service(ServiceType.SYMPTOM_ANALYZER)
        service2 = ServiceFactory.create_service(ServiceType.SYMPTOM_ANALYZER)
        
        # Should return same instance
        assert service1 == service2
        # Should only create once
        assert mock_analyzer_class.call_count == 1
    
    @patch('factories.service_factory.SymptomAnalyzer')
    def test_create_service_with_kwargs(self, mock_analyzer_class):
        """Test creating service with keyword arguments"""
        mock_instance = MagicMock()
        mock_analyzer_class.return_value = mock_instance
        
        service = ServiceFactory.create_service(
            ServiceType.SYMPTOM_ANALYZER,
            config_key="config_value"
        )
        
        mock_analyzer_class.assert_called_once_with(config_key="config_value")
        assert service == mock_instance
    
    @patch('factories.service_factory.SymptomAnalyzer')
    def test_get_service_existing(self, mock_analyzer_class):
        """Test getting existing service"""
        mock_instance = MagicMock()
        mock_analyzer_class.return_value = mock_instance
        
        ServiceFactory.create_service(ServiceType.SYMPTOM_ANALYZER)
        service = ServiceFactory.get_service(ServiceType.SYMPTOM_ANALYZER)
        
        assert service == mock_instance
    
    def test_get_service_nonexistent(self):
        """Test getting non-existent service"""
        service = ServiceFactory.get_service(ServiceType.SYMPTOM_ANALYZER)
        
        assert service is None
    
    def test_clear_instances(self):
        """Test clearing all instances"""
        with patch('factories.service_factory.SymptomAnalyzer') as mock_analyzer:
            mock_instance = MagicMock()
            mock_analyzer.return_value = mock_instance
            
            ServiceFactory.create_service(ServiceType.SYMPTOM_ANALYZER)
            assert len(ServiceFactory._instances) == 1
            
            ServiceFactory.clear_instances()
            
            assert len(ServiceFactory._instances) == 0
    
    @patch('factories.service_factory.StrategyFactory')
    @patch('factories.service_factory.AnalysisContext')
    @patch('factories.service_factory.settings')
    def test_create_analysis_context_with_openai_key(self, mock_settings, mock_context_class, mock_strategy_factory):
        """Test creating analysis context with OpenAI API key"""
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_strategy = MagicMock()
        mock_strategy.get_strategy_name.return_value = "openai"
        mock_strategy_factory.create_strategy.return_value = mock_strategy
        mock_context_instance = MagicMock()
        mock_context_class.return_value = mock_context_instance
        
        context = ServiceFactory.create_analysis_context()
        
        mock_strategy_factory.create_strategy.assert_called_once()
        mock_context_class.assert_called_once_with(mock_strategy)
        assert context == mock_context_instance
    
    @patch('factories.service_factory.StrategyFactory')
    @patch('factories.service_factory.AnalysisContext')
    @patch('factories.service_factory.settings')
    def test_create_analysis_context_without_openai_key(self, mock_settings, mock_context_class, mock_strategy_factory):
        """Test creating analysis context without OpenAI API key"""
        mock_settings.OPENAI_API_KEY = None
        mock_strategy = MagicMock()
        mock_strategy.get_strategy_name.return_value = "rule_based"
        mock_strategy_factory.create_strategy.return_value = mock_strategy
        mock_context_instance = MagicMock()
        mock_context_class.return_value = mock_context_instance
        
        context = ServiceFactory.create_analysis_context()
        
        # Should use rule-based strategy
        mock_strategy_factory.create_strategy.assert_called_once()
        assert context == mock_context_instance
    
    @patch('factories.service_factory.StrategyFactory')
    @patch('factories.service_factory.AnalysisContext')
    def test_create_analysis_context_with_strategy_type(self, mock_context_class, mock_strategy_factory):
        """Test creating analysis context with specific strategy type"""
        from factories.strategy_factory import StrategyType
        
        mock_strategy = MagicMock()
        mock_strategy.get_strategy_name.return_value = "local_model"
        mock_strategy_factory.create_strategy.return_value = mock_strategy
        mock_context_instance = MagicMock()
        mock_context_class.return_value = mock_context_instance
        
        context = ServiceFactory.create_analysis_context(strategy_type=StrategyType.LOCAL_MODEL)
        
        mock_strategy_factory.create_strategy.assert_called_once_with(StrategyType.LOCAL_MODEL)
        assert context == mock_context_instance
    
    @patch('factories.service_factory.ServiceFactory.create_service')
    @patch('factories.service_factory.ServiceFactory.create_analysis_context')
    def test_create_medical_service_suite(self, mock_create_context, mock_create_service):
        """Test creating medical service suite"""
        mock_create_service.side_effect = lambda st: MagicMock()
        mock_create_context.return_value = MagicMock()
        
        services = ServiceFactory.create_medical_service_suite()
        
        assert 'symptom_analyzer' in services
        assert 'history_processor' in services
        assert 'model_manager' in services
        assert 'cache_service' in services
        assert 'database_service' in services
        assert 'analysis_context' in services
        assert mock_create_service.call_count == 5
        mock_create_context.assert_called_once()
    
    @patch('factories.service_factory.ServiceFactory.create_service')
    @patch('factories.service_factory.ServiceFactory.create_analysis_context')
    def test_create_development_services(self, mock_create_context, mock_create_service):
        """Test creating development services"""
        from factories.strategy_factory import StrategyType
        
        mock_create_service.side_effect = lambda st: MagicMock()
        mock_create_context.return_value = MagicMock()
        
        services = ServiceFactory.create_development_services()
        
        assert 'analysis_context' in services
        assert 'symptom_analyzer' in services
        assert 'history_processor' in services
        # Should use rule-based strategy for development
        mock_create_context.assert_called_once_with(StrategyType.RULE_BASED)
    
    @patch('factories.service_factory.ServiceFactory.create_medical_service_suite')
    @patch('factories.service_factory.ServiceFactory.create_service')
    @patch('factories.service_factory.ServiceFactory.create_analysis_context')
    @patch('factories.service_factory.settings')
    def test_create_production_services_with_openai(self, mock_settings, mock_create_context, 
                                                     mock_create_service, mock_create_suite):
        """Test creating production services with OpenAI"""
        from factories.strategy_factory import StrategyType
        
        mock_settings.OPENAI_API_KEY = "test-key"
        mock_suite = {
            'symptom_analyzer': MagicMock(),
            'history_processor': MagicMock()
        }
        mock_create_suite.return_value = mock_suite
        mock_create_service.return_value = MagicMock()
        mock_create_context.return_value = MagicMock()
        
        services = ServiceFactory.create_production_services()
        
        assert 'notification_service' in services
        # Should use OpenAI strategy
        mock_create_context.assert_called_once_with(StrategyType.OPENAI)
    
    @patch('factories.service_factory.ServiceFactory.create_medical_service_suite')
    @patch('factories.service_factory.ServiceFactory.create_service')
    @patch('factories.service_factory.ServiceFactory.create_analysis_context')
    @patch('factories.service_factory.settings')
    def test_create_production_services_without_openai(self, mock_settings, mock_create_context,
                                                        mock_create_service, mock_create_suite):
        """Test creating production services without OpenAI"""
        from factories.strategy_factory import StrategyType
        
        mock_settings.OPENAI_API_KEY = None
        mock_suite = {
            'symptom_analyzer': MagicMock(),
            'history_processor': MagicMock()
        }
        mock_create_suite.return_value = mock_suite
        mock_create_service.return_value = MagicMock()
        mock_create_context.return_value = MagicMock()
        
        services = ServiceFactory.create_production_services()
        
        # Should use local model strategy
        mock_create_context.assert_called_once_with(StrategyType.LOCAL_MODEL)
    
    @patch('factories.service_factory.SymptomAnalyzer')
    def test_create_service_error_handling(self, mock_analyzer_class):
        """Test error handling when creating service"""
        mock_analyzer_class.side_effect = Exception("Import error")
        
        with pytest.raises(Exception, match="Import error"):
            ServiceFactory.create_service(ServiceType.SYMPTOM_ANALYZER)
    
    @patch('factories.service_factory.StrategyFactory')
    def test_create_analysis_context_error_handling(self, mock_strategy_factory):
        """Test error handling when creating analysis context"""
        mock_strategy_factory.create_strategy.side_effect = Exception("Strategy creation failed")
        
        with pytest.raises(Exception):
            ServiceFactory.create_analysis_context()
    
    @patch('factories.service_factory.ServiceFactory.create_service')
    def test_create_medical_service_suite_error_handling(self, mock_create_service):
        """Test error handling when creating medical service suite"""
        mock_create_service.side_effect = Exception("Service creation failed")
        
        with pytest.raises(Exception):
            ServiceFactory.create_medical_service_suite()

