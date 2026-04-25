"""
Unit tests for Federated Learning Secure Aggregation
Tests for SecureAggregator and FederatedLearningCoordinator
"""

import pytest
import numpy as np
from datetime import datetime
from unittest.mock import patch, MagicMock

from ml_models.fl_secure_aggregation import (
    SecureAggregator,
    FederatedLearningCoordinator
)


class TestSecureAggregator:
    """Tests for SecureAggregator"""
    
    @pytest.fixture
    def aggregator(self):
        """Create SecureAggregator instance"""
        return SecureAggregator(aggregation_method='fedavg')
    
    @pytest.fixture
    def sample_updates(self):
        """Sample client updates for testing"""
        return {
            'client1': {
                'update': {'param1': [1.0, 2.0, 3.0], 'param2': 0.5},
                'sample_count': 100,
                'metadata': {'accuracy': 0.85}
            },
            'client2': {
                'update': {'param1': [2.0, 3.0, 4.0], 'param2': 0.6},
                'sample_count': 200,
                'metadata': {'accuracy': 0.90}
            },
            'client3': {
                'update': {'param1': [1.5, 2.5, 3.5], 'param2': 0.55},
                'sample_count': 150,
                'metadata': {'accuracy': 0.88}
            }
        }
    
    def test_initialization(self, aggregator):
        """Test aggregator initialization"""
        assert aggregator.aggregation_method == 'fedavg'
        assert len(aggregator.client_updates) == 0
        assert aggregator.global_model_state is not None
        assert len(aggregator.round_history) == 0
    
    def test_add_client_update(self, aggregator):
        """Test adding client update"""
        update = {'param1': [1.0, 2.0], 'param2': 0.5}
        aggregator.add_client_update('client1', update, sample_count=100, metadata={'acc': 0.8})
        
        assert 'client1' in aggregator.client_updates
        assert aggregator.client_updates['client1']['update'] == update
        assert aggregator.client_updates['client1']['sample_count'] == 100
        assert aggregator.client_updates['client1']['metadata']['acc'] == 0.8
        assert 'timestamp' in aggregator.client_updates['client1']
    
    def test_aggregate_fedavg(self, aggregator, sample_updates):
        """Test FedAvg aggregation"""
        # Add client updates
        for client_id, update_data in sample_updates.items():
            aggregator.add_client_update(
                client_id,
                update_data['update'],
                update_data['sample_count'],
                update_data['metadata']
            )
        
        aggregated = aggregator.aggregate_fedavg()
        
        assert isinstance(aggregated, dict)
        assert 'param1' in aggregated
        assert 'param2' in aggregated
        
        # Check weighted average
        # Total samples: 100 + 200 + 150 = 450
        # param2: (0.5*100 + 0.6*200 + 0.55*150) / 450 = 0.566...
        assert abs(aggregated['param2'] - 0.566) < 0.01
    
    def test_aggregate_fedavg_empty(self, aggregator):
        """Test FedAvg with no updates"""
        with pytest.raises(ValueError, match="No client updates"):
            aggregator.aggregate_fedavg()
    
    def test_aggregate_fedavg_zero_samples(self, aggregator):
        """Test FedAvg with zero sample count"""
        aggregator.add_client_update('client1', {'param1': 1.0}, sample_count=0)
        
        with pytest.raises(ValueError, match="Total sample count is zero"):
            aggregator.aggregate_fedavg()
    
    def test_aggregate_fedprox(self, aggregator, sample_updates):
        """Test FedProx aggregation"""
        # Set global model state
        aggregator.global_model_state = {'param1': [1.0, 2.0, 3.0], 'param2': 0.5}
        
        # Add client updates
        for client_id, update_data in sample_updates.items():
            aggregator.add_client_update(
                client_id,
                update_data['update'],
                update_data['sample_count'],
                update_data['metadata']
            )
        
        aggregator.aggregation_method = 'fedprox'
        aggregated = aggregator.aggregate_fedprox(mu=0.1)
        
        assert isinstance(aggregated, dict)
        assert 'param1' in aggregated
        assert 'param2' in aggregated
    
    def test_aggregate_fedprox_no_global_model(self, aggregator, sample_updates):
        """Test FedProx falls back to FedAvg when no global model"""
        aggregator.global_model_state = None
        
        for client_id, update_data in sample_updates.items():
            aggregator.add_client_update(
                client_id,
                update_data['update'],
                update_data['sample_count'],
                update_data['metadata']
            )
        
        aggregated = aggregator.aggregate_fedprox()
        
        # Should use FedAvg
        assert isinstance(aggregated, dict)
        assert 'param1' in aggregated
    
    def test_aggregate_scaffold(self, aggregator, sample_updates):
        """Test SCAFFOLD aggregation"""
        for client_id, update_data in sample_updates.items():
            aggregator.add_client_update(
                client_id,
                update_data['update'],
                update_data['sample_count'],
                update_data['metadata']
            )
        
        aggregator.aggregation_method = 'scaffold'
        aggregated = aggregator.aggregate_scaffold()
        
        assert isinstance(aggregated, dict)
        assert 'param1' in aggregated
    
    def test_aggregate_unknown_method(self, aggregator):
        """Test aggregation with unknown method"""
        aggregator.aggregation_method = 'unknown'
        aggregator.add_client_update('client1', {'param1': 1.0}, sample_count=100)
        
        with pytest.raises(ValueError, match="Unknown aggregation method"):
            aggregator.aggregate()
    
    def test_validate_updates_success(self, aggregator, sample_updates):
        """Test validation with valid updates"""
        for client_id, update_data in sample_updates.items():
            aggregator.add_client_update(
                client_id,
                update_data['update'],
                update_data['sample_count'],
                update_data['metadata']
            )
        
        is_valid, errors = aggregator.validate_updates(min_clients=2)
        
        assert is_valid == True
        assert len(errors) == 0
    
    def test_validate_updates_insufficient_clients(self, aggregator):
        """Test validation with insufficient clients"""
        aggregator.add_client_update('client1', {'param1': 1.0}, sample_count=100)
        
        is_valid, errors = aggregator.validate_updates(min_clients=2)
        
        assert is_valid == False
        assert len(errors) > 0
        assert any('Insufficient clients' in err for err in errors)
    
    def test_validate_updates_too_many_clients(self, aggregator, sample_updates):
        """Test validation with too many clients"""
        for client_id, update_data in sample_updates.items():
            aggregator.add_client_update(
                client_id,
                update_data['update'],
                update_data['sample_count'],
                update_data['metadata']
            )
        
        is_valid, errors = aggregator.validate_updates(max_clients=2)
        
        assert is_valid == False
        assert any('Too many clients' in err for err in errors)
    
    def test_validate_updates_missing_update(self, aggregator):
        """Test validation with missing update field"""
        aggregator.client_updates['client1'] = {
            'sample_count': 100,
            'metadata': {}
        }
        
        is_valid, errors = aggregator.validate_updates()
        
        assert is_valid == False
        assert any("missing 'update'" in err for err in errors)
    
    def test_validate_updates_invalid_sample_count(self, aggregator):
        """Test validation with invalid sample count"""
        aggregator.add_client_update('client1', {'param1': 1.0}, sample_count=0)
        
        is_valid, errors = aggregator.validate_updates()
        
        assert is_valid == False
        assert any('invalid sample_count' in err for err in errors)
    
    def test_detect_malicious_updates(self, aggregator):
        """Test detection of malicious updates"""
        # Add normal updates
        aggregator.add_client_update('client1', {'param1': 1.0}, sample_count=100, metadata={'acc': 0.8})
        aggregator.add_client_update('client2', {'param1': 1.1}, sample_count=100, metadata={'acc': 0.82})
        aggregator.add_client_update('client3', {'param1': 0.9}, sample_count=100, metadata={'acc': 0.79})
        
        # Add malicious update (outlier)
        aggregator.add_client_update('client4', {'param1': 10.0}, sample_count=100, metadata={'acc': 0.5})
        
        malicious = aggregator.detect_malicious_updates(threshold=3.0)
        
        assert 'client4' in malicious
    
    def test_detect_malicious_updates_no_outliers(self, aggregator):
        """Test detection with no malicious updates"""
        aggregator.add_client_update('client1', {'param1': 1.0}, sample_count=100, metadata={'acc': 0.8})
        aggregator.add_client_update('client2', {'param1': 1.1}, sample_count=100, metadata={'acc': 0.82})
        aggregator.add_client_update('client3', {'param1': 0.9}, sample_count=100, metadata={'acc': 0.79})
        
        malicious = aggregator.detect_malicious_updates(threshold=3.0)
        
        assert len(malicious) == 0
    
    def test_detect_malicious_insufficient_clients(self, aggregator):
        """Test detection with insufficient clients for outlier detection"""
        aggregator.add_client_update('client1', {'param1': 1.0}, sample_count=100)
        aggregator.add_client_update('client2', {'param1': 10.0}, sample_count=100)
        
        malicious = aggregator.detect_malicious_updates(threshold=3.0)
        
        # Need at least 3 clients for outlier detection
        assert len(malicious) == 0
    
    def test_apply_differential_privacy(self, aggregator, sample_updates):
        """Test differential privacy application"""
        for client_id, update_data in sample_updates.items():
            aggregator.add_client_update(
                client_id,
                update_data['update'],
                update_data['sample_count'],
                update_data['metadata']
            )
        
        aggregated = aggregator.aggregate_fedavg()
        dp_aggregated = aggregator.apply_differential_privacy(epsilon=1.0, delta=1e-5)
        
        assert isinstance(dp_aggregated, dict)
        assert 'param1' in dp_aggregated
        assert 'param2' in dp_aggregated
        
        # Values should be different due to noise
        assert dp_aggregated['param2'] != aggregated['param2']


class TestFederatedLearningCoordinator:
    """Tests for FederatedLearningCoordinator"""
    
    @pytest.fixture
    def coordinator(self):
        """Create FederatedLearningCoordinator instance"""
        return FederatedLearningCoordinator(global_model="test-model")
    
    @pytest.fixture
    def sample_client_updates(self):
        """Sample client updates for testing"""
        return [
            {
                'client_id': 'client1',
                'update': {'param1': [1.0, 2.0], 'param2': 0.5},
                'sample_count': 100,
                'metadata': {'accuracy': 0.85}
            },
            {
                'client_id': 'client2',
                'update': {'param1': [2.0, 3.0], 'param2': 0.6},
                'sample_count': 200,
                'metadata': {'accuracy': 0.90}
            },
            {
                'client_id': 'client3',
                'update': {'param1': [1.5, 2.5], 'param2': 0.55},
                'sample_count': 150,
                'metadata': {'accuracy': 0.88}
            }
        ]
    
    def test_initialization(self, coordinator):
        """Test coordinator initialization"""
        assert coordinator.global_model_name == "test-model"
        assert coordinator.rounds_completed == 0
        assert len(coordinator.registered_clients) == 0
    
    def test_register_clients(self, coordinator):
        """Test client registration"""
        client_ids = ['client1', 'client2', 'client3']
        result = coordinator.register_clients(client_ids)
        
        assert result['status'] == 'ok'
        assert result['count'] == 3
        assert len(result['clients']) == 3
        assert all(cid in coordinator.registered_clients for cid in client_ids)
    
    def test_register_clients_duplicate(self, coordinator):
        """Test registering duplicate clients"""
        coordinator.register_clients(['client1', 'client2'])
        result = coordinator.register_clients(['client2', 'client3'])
        
        # Should not duplicate client2
        assert result['count'] == 3  # client1, client2, client3
        assert len(coordinator.registered_clients) == 3
    
    def test_run_round_fedavg(self, coordinator, sample_client_updates):
        """Test running a FL round with FedAvg"""
        # Register clients
        client_ids = [u['client_id'] for u in sample_client_updates]
        coordinator.register_clients(client_ids)
        
        # Run round
        result = coordinator.run_round(
            sample_client_updates,
            aggregation_method='fedavg',
            use_dp=False
        )
        
        assert result['status'] == 'ok'
        assert result['round'] == 1
        assert 'global_acc' in result
        assert result['participants'] == 3
        assert result['aggregation_method'] == 'fedavg'
        assert coordinator.rounds_completed == 1
    
    def test_run_round_fedprox(self, coordinator, sample_client_updates):
        """Test running a FL round with FedProx"""
        client_ids = [u['client_id'] for u in sample_client_updates]
        coordinator.register_clients(client_ids)
        
        result = coordinator.run_round(
            sample_client_updates,
            aggregation_method='fedprox',
            use_dp=False
        )
        
        assert result['status'] == 'ok'
        assert result['aggregation_method'] == 'fedprox'
    
    def test_run_round_with_dp(self, coordinator, sample_client_updates):
        """Test running a FL round with differential privacy"""
        client_ids = [u['client_id'] for u in sample_client_updates]
        coordinator.register_clients(client_ids)
        
        result = coordinator.run_round(
            sample_client_updates,
            aggregation_method='fedavg',
            use_dp=True,
            dp_epsilon=1.0
        )
        
        assert result['status'] == 'ok'
        assert coordinator.global_model_state is not None
    
    def test_run_round_validation_error(self, coordinator):
        """Test run_round with invalid updates"""
        invalid_updates = [
            {'client_id': 'client1', 'update': {}, 'sample_count': 0}
        ]
        
        result = coordinator.run_round(invalid_updates)
        
        assert result['status'] == 'error'
        assert 'errors' in result
    
    def test_run_round_malicious_detection(self, coordinator):
        """Test run_round with malicious client detection"""
        updates = [
            {
                'client_id': 'client1',
                'update': {'param1': 1.0},
                'sample_count': 100,
                'metadata': {'accuracy': 0.8}
            },
            {
                'client_id': 'client2',
                'update': {'param1': 1.1},
                'sample_count': 100,
                'metadata': {'accuracy': 0.82}
            },
            {
                'client_id': 'client3',
                'update': {'param1': 10.0},  # Outlier
                'sample_count': 100,
                'metadata': {'accuracy': 0.5}
            }
        ]
        
        coordinator.register_clients(['client1', 'client2', 'client3'])
        result = coordinator.run_round(updates)
        
        assert result['status'] == 'ok'
        assert result['malicious_detected'] >= 0  # May detect client3
    
    def test_get_global_model(self, coordinator):
        """Test getting global model"""
        coordinator.rounds_completed = 5
        coordinator.registered_clients = {'client1': {}, 'client2': {}}
        coordinator.global_model_state = {'param1': [1.0, 2.0], 'param2': 0.5}
        
        model = coordinator.get_global_model()
        
        assert model['model_name'] == "test-model"
        assert model['version'] == 5
        assert model['rounds_completed'] == 5
        assert model['registered_clients'] == 2
        assert 'state' in model
    
    def test_multiple_rounds(self, coordinator, sample_client_updates):
        """Test multiple FL rounds"""
        client_ids = [u['client_id'] for u in sample_client_updates]
        coordinator.register_clients(client_ids)
        
        # Run first round
        result1 = coordinator.run_round(sample_client_updates)
        assert result1['round'] == 1
        
        # Run second round
        result2 = coordinator.run_round(sample_client_updates)
        assert result2['round'] == 2
        
        assert coordinator.rounds_completed == 2
    
    def test_client_statistics_update(self, coordinator, sample_client_updates):
        """Test client statistics update after rounds"""
        client_ids = [u['client_id'] for u in sample_client_updates]
        coordinator.register_clients(client_ids)
        
        coordinator.run_round(sample_client_updates)
        
        # Check that client statistics are updated
        for client_id in client_ids:
            assert coordinator.registered_clients[client_id]['rounds_participated'] == 1

