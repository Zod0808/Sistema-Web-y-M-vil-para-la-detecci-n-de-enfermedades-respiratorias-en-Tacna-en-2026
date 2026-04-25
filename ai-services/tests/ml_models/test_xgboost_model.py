"""
Tests for ml_models/xgboost_model.py
"""

import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock

try:
    from ml_models.xgboost_model import XGBoostDiseaseClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    XGBoostDiseaseClassifier = None


@pytest.mark.skipif(not XGBOOST_AVAILABLE, reason="XGBoost not available")
class TestXGBoostDiseaseClassifier:
    """Tests for XGBoostDiseaseClassifier"""
    
    @pytest.fixture
    def classifier(self):
        """Create classifier instance"""
        return XGBoostDiseaseClassifier(random_state=42)
    
    @pytest.fixture
    def sample_dataframe(self):
        """Sample DataFrame for testing"""
        return pd.DataFrame({
            'symptoms': [
                ['tos', 'fiebre'],
                ['tos', 'dolor garganta'],
                ['fiebre', 'fatiga']
            ],
            'disease': ['Bronquitis', 'Gripe', 'Resfriado']
        })
    
    def test_initialization(self, classifier):
        """Test classifier initialization"""
        assert classifier.random_state == 42
        assert classifier.model is not None
        assert classifier.label_encoder is not None
        assert classifier.feature_names == []
        assert classifier.explainer is None
        assert classifier.is_trained is False
    
    def test_initialization_default_random_state(self):
        """Test initialization with default random state"""
        classifier = XGBoostDiseaseClassifier()
        assert classifier.random_state == 42
    
    def test_create_advanced_features_basic(self, classifier, sample_dataframe):
        """Test basic feature creation"""
        features = classifier.create_advanced_features(sample_dataframe)
        
        assert isinstance(features, np.ndarray)
        assert len(features) == len(sample_dataframe)
        assert len(classifier.feature_names) > 0
    
    def test_create_advanced_features_symptom_count(self, classifier, sample_dataframe):
        """Test symptom count feature"""
        features = classifier.create_advanced_features(sample_dataframe)
        
        # Should have symptom_count feature
        assert 'symptom_count' in classifier.feature_names
        symptom_count_idx = classifier.feature_names.index('symptom_count')
        
        # Each row should have symptom count
        for i, row in sample_dataframe.iterrows():
            symptom_count = len(row['symptoms']) if isinstance(row['symptoms'], list) else 1
            assert features[i][symptom_count_idx] == symptom_count
    
    def test_create_advanced_features_fever_indicator(self, classifier):
        """Test fever indicator feature"""
        df = pd.DataFrame({
            'symptoms': [['fiebre', 'tos'], ['tos', 'dolor']]
        })
        
        features = classifier.create_advanced_features(df)
        
        # Should have has_fever feature
        assert 'has_fever' in classifier.feature_names
        fever_idx = classifier.feature_names.index('has_fever')
        
        # First row has fever, second doesn't
        assert features[0][fever_idx] == 1
        assert features[1][fever_idx] == 0
    
    def test_create_advanced_features_respiratory_distress(self, classifier):
        """Test respiratory distress indicator"""
        df = pd.DataFrame({
            'symptoms': [['dificultad respiratoria'], ['tos']]
        })
        
        features = classifier.create_advanced_features(df)
        
        assert 'respiratory_distress' in classifier.feature_names
        resp_idx = classifier.feature_names.index('respiratory_distress')
        
        # First row has respiratory distress
        assert features[0][resp_idx] == 1
    
    def test_create_advanced_features_string_symptoms(self, classifier):
        """Test feature creation with string symptoms"""
        df = pd.DataFrame({
            'symptoms': ['tos, fiebre', 'dolor, fatiga']
        })
        
        features = classifier.create_advanced_features(df)
        
        # Should handle string symptoms
        assert isinstance(features, np.ndarray)
        assert len(features) == 2
    
    def test_create_advanced_features_with_age(self, classifier):
        """Test feature creation with patient age"""
        df = pd.DataFrame({
            'symptoms': [['tos'], ['fiebre']],
            'patient_age': [45, 65]
        })
        
        features = classifier.create_advanced_features(df)
        
        assert 'patient_age_normalized' in classifier.feature_names
        age_idx = classifier.feature_names.index('patient_age_normalized')
        
        # Age should be normalized
        assert features[0][age_idx] == 0.45
        assert features[1][age_idx] == 0.65
    
    def test_create_advanced_features_without_age(self, classifier):
        """Test feature creation without patient age"""
        df = pd.DataFrame({
            'symptoms': [['tos'], ['fiebre']]
        })
        
        features = classifier.create_advanced_features(df)
        
        # Should use default age
        assert 'patient_age_normalized' in classifier.feature_names
        age_idx = classifier.feature_names.index('patient_age_normalized')
        
        # Default age is 35, normalized to 0.35
        assert features[0][age_idx] == 0.35
    
    def test_optimize_hyperparameters(self, classifier):
        """Test hyperparameter optimization"""
        X = np.array([[1, 0, 1], [0, 1, 0], [1, 1, 0]])
        y = np.array([0, 1, 0])
        
        # Mock GridSearchCV to avoid long execution
        with patch('ml_models.xgboost_model.GridSearchCV') as mock_grid:
            mock_grid.return_value.fit = MagicMock()
            mock_grid.return_value.best_params_ = {'max_depth': 5, 'learning_rate': 0.1}
            mock_grid.return_value.best_score_ = 0.9
            
            classifier.optimize_hyperparameters(X, y, cv=2)
            
            # Should update model parameters
            mock_grid.assert_called_once()
    
    def test_train_basic(self, classifier, sample_dataframe):
        """Test basic model training"""
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        
        classifier.train(X, y, test_size=0.2)
        
        assert classifier.is_trained is True
    
    def test_train_with_validation(self, classifier, sample_dataframe):
        """Test training with validation set"""
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        
        classifier.train(X, y, test_size=0.3, validation_size=0.2)
        
        assert classifier.is_trained is True
    
    def test_predict_basic(self, classifier, sample_dataframe):
        """Test basic prediction"""
        # Train model first
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        classifier.train(X, y, test_size=0.2)
        
        # Predict
        test_features = classifier.create_advanced_features(sample_dataframe.iloc[:1])
        predictions = classifier.predict(test_features)
        
        assert isinstance(predictions, np.ndarray)
        assert len(predictions) == 1
    
    def test_predict_proba(self, classifier, sample_dataframe):
        """Test probability prediction"""
        # Train model first
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        classifier.train(X, y, test_size=0.2)
        
        # Predict probabilities
        test_features = classifier.create_advanced_features(sample_dataframe.iloc[:1])
        probabilities = classifier.predict_proba(test_features)
        
        assert isinstance(probabilities, np.ndarray)
        assert probabilities.shape[1] == len(classifier.label_encoder.classes_)
        # Probabilities should sum to 1
        assert np.allclose(probabilities.sum(axis=1), 1.0)
    
    def test_evaluate(self, classifier, sample_dataframe):
        """Test model evaluation"""
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        classifier.train(X, y, test_size=0.2)
        
        # Evaluate
        test_features = classifier.create_advanced_features(sample_dataframe.iloc[:1])
        test_labels = y[:1]
        
        metrics = classifier.evaluate(test_features, test_labels)
        
        assert "accuracy" in metrics
        assert 0.0 <= metrics["accuracy"] <= 1.0
    
    def test_save_and_load_model(self, classifier, sample_dataframe, tmp_path):
        """Test saving and loading model"""
        # Train model
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        classifier.train(X, y, test_size=0.2)
        
        # Save
        model_path = tmp_path / "test_model.pkl"
        classifier.save_model(str(model_path))
        
        assert model_path.exists()
        
        # Load
        new_classifier = XGBoostDiseaseClassifier()
        new_classifier.load_model(str(model_path))
        
        assert new_classifier.is_trained is True
        assert len(new_classifier.feature_names) > 0
    
    def test_create_shap_explainer(self, classifier, sample_dataframe):
        """Test SHAP explainer creation"""
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        classifier.train(X, y, test_size=0.2)
        
        classifier.create_shap_explainer(X[:10])  # Use subset for speed
        
        assert classifier.explainer is not None
    
    def test_explain_prediction(self, classifier, sample_dataframe):
        """Test prediction explanation"""
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        classifier.train(X, y, test_size=0.2)
        classifier.create_shap_explainer(X[:5])
        
        # Explain prediction
        test_features = classifier.create_advanced_features(sample_dataframe.iloc[:1])
        explanation = classifier.explain_prediction(test_features[0])
        
        assert "prediction" in explanation
        assert "confidence" in explanation
        assert "feature_importance" in explanation
    
    def test_cross_validate(self, classifier, sample_dataframe):
        """Test cross-validation"""
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        
        # Mock cross_val_score to avoid long execution
        with patch('ml_models.xgboost_model.cross_val_score') as mock_cv:
            mock_cv.return_value = np.array([0.8, 0.85, 0.9])
            
            scores = classifier.cross_validate(X, y, cv=3)
            
            assert isinstance(scores, np.ndarray)
            assert len(scores) == 3
            mock_cv.assert_called_once()
    
    def test_get_feature_importance(self, classifier, sample_dataframe):
        """Test feature importance extraction"""
        X = classifier.create_advanced_features(sample_dataframe)
        y = classifier.label_encoder.fit_transform(sample_dataframe['disease'])
        classifier.train(X, y, test_size=0.2)
        
        importance = classifier.get_feature_importance()
        
        assert isinstance(importance, dict)
        assert len(importance) > 0
        # All values should be non-negative
        assert all(v >= 0 for v in importance.values())
    
    def test_predict_not_trained(self, classifier):
        """Test prediction when model is not trained"""
        X = np.array([[1, 0, 1]])
        
        with pytest.raises(ValueError, match="not trained"):
            classifier.predict(X)
    
    def test_predict_proba_not_trained(self, classifier):
        """Test probability prediction when model is not trained"""
        X = np.array([[1, 0, 1]])
        
        with pytest.raises(ValueError, match="not trained"):
            classifier.predict_proba(X)
    
    def test_evaluate_not_trained(self, classifier):
        """Test evaluation when model is not trained"""
        X = np.array([[1, 0, 1]])
        y = np.array([0])
        
        with pytest.raises(ValueError, match="not trained"):
            classifier.evaluate(X, y)
    
    def test_create_advanced_features_empty_dataframe(self, classifier):
        """Test feature creation with empty DataFrame"""
        df = pd.DataFrame({'symptoms': []})
        
        features = classifier.create_advanced_features(df)
        
        assert isinstance(features, np.ndarray)
        assert len(features) == 0
    
    def test_create_advanced_features_single_symptom(self, classifier):
        """Test feature creation with single symptom"""
        df = pd.DataFrame({'symptoms': [['tos']]})
        
        features = classifier.create_advanced_features(df)
        
        assert len(features) == 1
        assert len(features[0]) > 0

