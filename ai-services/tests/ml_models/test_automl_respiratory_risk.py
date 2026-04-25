"""
Unit tests for AutoML Respiratory Risk Pipeline
Tests for RespiratoryRiskAutoML with real data
"""

import pytest
import numpy as np
from unittest.mock import patch, MagicMock
import tempfile
import os

# Try to import sklearn, but handle gracefully if not available
try:
    from sklearn.model_selection import cross_val_score
    from sklearn.datasets import make_classification
    from sklearn.model_selection import train_test_split
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

from ml_models.automl_respiratory_risk import RespiratoryRiskAutoML


@pytest.fixture
def automl():
    """Create RespiratoryRiskAutoML instance"""
    return RespiratoryRiskAutoML()


@pytest.fixture
def synthetic_data():
    """Generate synthetic data for testing"""
    if not SKLEARN_AVAILABLE:
        pytest.skip("sklearn not available")
    
    # Generate synthetic respiratory risk dataset
    X, y = make_classification(
        n_samples=200,
        n_features=10,
        n_informative=5,
        n_redundant=2,
        n_classes=2,
        random_state=42
    )
    
    feature_names = [f'feature_{i}' for i in range(X.shape[1])]
    return X, y, feature_names


class TestRespiratoryRiskAutoML:
    """Tests for RespiratoryRiskAutoML"""
    
    def test_initialization(self, automl):
        """Test AutoML initialization"""
        assert automl.selected_model is None
        assert automl.best_params == {}
        assert automl.selected_features == []
        assert automl.baseline_stats == {}
        assert automl.model_performance == {}
        assert automl.feature_importance == {}
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_select_model_with_data(self, automl, synthetic_data):
        """Test model selection with real data"""
        X, y, feature_names = synthetic_data
        
        result = automl.select_model(
            candidates=['random_forest', 'logistic_regression'],
            X=X,
            y=y
        )
        
        assert result['status'] == 'ok'
        assert 'selected_model' in result
        assert result['selected_model'] in ['random_forest', 'logistic_regression']
        assert 'cv_score' in result
        assert 0.0 <= result['cv_score'] <= 1.0
        assert automl.selected_model is not None
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_select_model_all_candidates(self, automl, synthetic_data):
        """Test model selection with all candidate models"""
        X, y, _ = synthetic_data
        
        result = automl.select_model(X=X, y=y)
        
        assert result['status'] == 'ok'
        assert result['selected_model'] in [
            'xgboost', 'random_forest', 'gradient_boosting',
            'logistic_regression', 'neural_net'
        ]
    
    def test_select_model_stub_mode(self, automl):
        """Test model selection in stub mode (no sklearn)"""
        result = automl.select_model()
        
        assert result['status'] == 'ok'
        assert 'selected_model' in result
        assert 'note' in result
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_auto_tune_with_optuna(self, automl, synthetic_data):
        """Test auto-tuning with Optuna"""
        X, y, _ = synthetic_data
        
        # Select model first
        automl.select_model(candidates=['random_forest'], X=X, y=y)
        
        param_grid = {
            'n_estimators': [50, 100, 200],
            'max_depth': [3, 5, 7]
        }
        
        result = automl.auto_tune(
            param_grid,
            X=X,
            y=y,
            use_optuna=True
        )
        
        assert result['status'] == 'ok'
        assert 'best_params' in result
        assert 'cv_score' in result
        assert result['method'] in ['optuna_bayesian', 'grid_search', 'randomized_search']
        assert automl.best_params is not None
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_auto_tune_with_grid_search(self, automl, synthetic_data):
        """Test auto-tuning with GridSearchCV"""
        X, y, _ = synthetic_data
        
        automl.select_model(candidates=['logistic_regression'], X=X, y=y)
        
        param_grid = {
            'C': [0.1, 1.0, 10.0],
            'penalty': ['l1', 'l2']
        }
        
        result = automl.auto_tune(
            param_grid,
            X=X,
            y=y,
            use_optuna=False
        )
        
        assert result['status'] == 'ok'
        assert 'best_params' in result
        assert 'cv_score' in result
    
    def test_auto_tune_stub_mode(self, automl):
        """Test auto-tuning in stub mode"""
        param_grid = {
            'param1': [1, 2, 3],
            'param2': [0.1, 0.2]
        }
        
        result = automl.auto_tune(param_grid)
        
        assert result['status'] == 'ok'
        assert 'best_params' in result
        assert 'note' in result
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_feature_selection_mutual_info(self, automl, synthetic_data):
        """Test feature selection with mutual information"""
        X, y, feature_names = synthetic_data
        
        result = automl.feature_selection(
            features=feature_names,
            X=X,
            y=y,
            k=5,
            method='mutual_info'
        )
        
        assert result['status'] == 'ok'
        assert 'selected_features' in result
        assert len(result['selected_features']) == 5
        assert result['method'] == 'mutual_info'
        assert 'feature_scores' in result
        assert len(automl.selected_features) == 5
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_feature_selection_rfe(self, automl, synthetic_data):
        """Test feature selection with RFE"""
        X, y, feature_names = synthetic_data
        
        result = automl.feature_selection(
            features=feature_names,
            X=X,
            y=y,
            k=5,
            method='rfe'
        )
        
        assert result['status'] == 'ok'
        assert len(result['selected_features']) == 5
        assert result['method'] == 'rfe'
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_feature_selection_univariate(self, automl, synthetic_data):
        """Test feature selection with univariate"""
        X, y, feature_names = synthetic_data
        
        result = automl.feature_selection(
            features=feature_names,
            X=X,
            y=y,
            k=5,
            method='univariate'
        )
        
        assert result['status'] == 'ok'
        assert len(result['selected_features']) == 5
        assert result['method'] == 'univariate'
    
    def test_feature_selection_stub_mode(self, automl):
        """Test feature selection in stub mode"""
        features = ['f1', 'f2', 'f3', 'f4', 'f5']
        
        result = automl.feature_selection(features, k=3)
        
        assert result['status'] == 'ok'
        assert len(result['selected_features']) == 3
        assert result['method'] == 'stub'
    
    def test_detect_drift_numeric(self, automl):
        """Test drift detection with numeric values"""
        baseline_stats = {
            'mean_age': 45.0,
            'mean_symptoms': 3.2,
            'adherence_rate': 0.75
        }
        
        current_stats = {
            'mean_age': 50.0,  # 11% change
            'mean_symptoms': 4.5,  # 40% change
            'adherence_rate': 0.65  # 13% change
        }
        
        result = automl.detect_drift(baseline_stats, current_stats, threshold=0.1)
        
        assert result['status'] == 'ok'
        assert 'drift_score' in result
        assert 'drift_detected' in result
        assert 'feature_drifts' in result
        assert result['drift_detected'] == True  # Should detect drift
    
    def test_detect_drift_no_drift(self, automl):
        """Test drift detection with no significant drift"""
        baseline_stats = {
            'mean_age': 45.0,
            'mean_symptoms': 3.2
        }
        
        current_stats = {
            'mean_age': 45.5,  # 1% change
            'mean_symptoms': 3.25  # 1.5% change
        }
        
        result = automl.detect_drift(baseline_stats, current_stats, threshold=0.1)
        
        assert result['status'] == 'ok'
        assert result['drift_detected'] == False
    
    def test_detect_drift_distributions(self, automl):
        """Test drift detection with distributions (KS test)"""
        baseline_stats = {
            'age_distribution': [40, 45, 50, 45, 48, 42, 47, 43, 46, 44]
        }
        
        current_stats = {
            'age_distribution': [60, 65, 70, 65, 68, 62, 67, 63, 66, 64]  # Different distribution
        }
        
        result = automl.detect_drift(baseline_stats, current_stats, threshold=0.1)
        
        assert result['status'] == 'ok'
        assert 'drift_score' in result
        assert 'drift_detected' in result
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_auto_retrain(self, automl, synthetic_data):
        """Test auto-retraining with real data"""
        X, y, _ = synthetic_data
        
        # Select model and tune first
        automl.select_model(candidates=['random_forest'], X=X, y=y)
        automl.auto_tune(
            {'n_estimators': [50, 100], 'max_depth': [3, 5]},
            X=X,
            y=y
        )
        
        training_meta = {
            'epochs': 1,
            'validation_split': 0.2
        }
        
        result = automl.auto_retrain(training_meta, X=X, y=y)
        
        assert result['status'] == 'ok'
        assert 'improved' in result
        assert 'metric_delta' in result
        assert 'model_artifact' in result
        assert 'performance' in result
        assert 'accuracy' in result['performance']
        assert 'precision' in result['performance']
        assert 'recall' in result['performance']
        assert 'f1' in result['performance']
        assert 'roc_auc' in result['performance']
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_auto_retrain_feature_importance(self, automl, synthetic_data):
        """Test that feature importance is captured after retraining"""
        X, y, feature_names = synthetic_data
        
        automl.select_model(candidates=['random_forest'], X=X, y=y)
        automl.feature_selection(features=feature_names, X=X, y=y, k=5)
        automl.auto_tune(
            {'n_estimators': [50]},
            X=X,
            y=y
        )
        
        result = automl.auto_retrain({'epochs': 1}, X=X, y=y)
        
        # Random Forest should have feature importance
        if automl.selected_model == 'random_forest':
            assert len(automl.feature_importance) > 0
    
    def test_auto_retrain_stub_mode(self, automl):
        """Test auto-retraining in stub mode"""
        training_meta = {'epochs': 3}
        
        result = automl.auto_retrain(training_meta)
        
        assert result['status'] == 'ok'
        assert 'improved' in result
        assert 'model_artifact' in result
        assert 'note' in result
    
    @pytest.mark.skipif(not SKLEARN_AVAILABLE, reason="sklearn not available")
    def test_full_pipeline(self, automl, synthetic_data):
        """Test complete AutoML pipeline"""
        X, y, feature_names = synthetic_data
        
        # 1. Select model
        select_result = automl.select_model(X=X, y=y)
        assert select_result['status'] == 'ok'
        
        # 2. Feature selection
        feature_result = automl.feature_selection(
            features=feature_names,
            X=X,
            y=y,
            k=5
        )
        assert feature_result['status'] == 'ok'
        
        # 3. Auto-tune
        tune_result = automl.auto_tune(
            {'n_estimators': [50, 100], 'max_depth': [3, 5]},
            X=X,
            y=y
        )
        assert tune_result['status'] == 'ok'
        
        # 4. Auto-retrain
        retrain_result = automl.auto_retrain(
            {'epochs': 1},
            X=X,
            y=y
        )
        assert retrain_result['status'] == 'ok'
        
        # Verify all steps completed
        assert automl.selected_model is not None
        assert len(automl.selected_features) > 0
        assert len(automl.best_params) > 0
        assert len(automl.model_performance) > 0

