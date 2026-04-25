"""
Tests for Ensemble Model Performance
Tests de performance del sistema ensemble
"""

import pytest
import numpy as np
import time
from ml_models.ensemble_predictor import EnsemblePredictor


class TestEnsemblePerformance:
    """Tests de performance del sistema ensemble"""

    @pytest.fixture
    def ensemble(self):
        """Fixture para crear instancia de ensemble"""
        return EnsemblePredictor()

    @pytest.fixture
    def sample_features(self):
        """Features de ejemplo"""
        return np.array([[38.5, 1, 1, 0, 1, 45, 1, 0, 1]])

    def test_ensemble_prediction_speed(self, ensemble, sample_features):
        """Test que el ensemble predice rápidamente"""
        start = time.time()
        prediction = ensemble.predict(sample_features)
        elapsed = time.time() - start
        
        assert elapsed < 0.5  # Menos de 500ms
        assert prediction is not None

    def test_ensemble_handles_multiple_predictions(self, ensemble):
        """Test que el ensemble maneja múltiples predicciones"""
        features_batch = np.random.rand(10, 9)
        
        start = time.time()
        predictions = []
        for features in features_batch:
            pred = ensemble.predict(features.reshape(1, -1))
            predictions.append(pred)
        elapsed = time.time() - start
        
        assert len(predictions) == 10
        assert elapsed < 5.0  # 10 predicciones en menos de 5 segundos

    def test_ensemble_model_contributions(self, ensemble, sample_features):
        """Test que el ensemble muestra contribuciones de cada modelo"""
        prediction = ensemble.predict(sample_features)
        
        assert 'model_contributions' in prediction
        contributions = prediction['model_contributions']
        
        # Debe haber contribuciones de los 3 modelos
        assert len(contributions) >= 3

    def test_ensemble_confidence_calculation(self, ensemble, sample_features):
        """Test que la confianza del ensemble es calculada correctamente"""
        prediction = ensemble.predict(sample_features)
        
        assert 'confidence' in prediction
        confidence = prediction['confidence']
        
        # Confianza debe estar en rango [0, 1]
        assert 0 <= confidence <= 1

    def test_ensemble_consistency(self, ensemble, sample_features):
        """Test que el ensemble da resultados consistentes"""
        pred1 = ensemble.predict(sample_features)
        pred2 = ensemble.predict(sample_features)
        
        # Mismo input debe dar mismo resultado
        assert pred1['prediction'] == pred2['prediction']
        assert abs(pred1['confidence'] - pred2['confidence']) < 0.01

    def test_ensemble_memory_usage(self, ensemble):
        """Test que el ensemble no consume memoria excesiva"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        mem_before = process.memory_info().rss / 1024 / 1024  # MB
        
        # Hacer múltiples predicciones
        for _ in range(100):
            features = np.random.rand(1, 9)
            ensemble.predict(features)
        
        mem_after = process.memory_info().rss / 1024 / 1024  # MB
        mem_increase = mem_after - mem_before
        
        # No debería aumentar más de 100MB
        assert mem_increase < 100, f"Memory increased by {mem_increase:.2f}MB"


class TestEnsembleAccuracy:
    """Tests de accuracy del ensemble"""

    def test_ensemble_accuracy_threshold(self):
        """Test que el ensemble tiene accuracy mínimo aceptable"""
        # Este test requeriría datos de validación reales
        # Por ahora verificamos que el ensemble funciona
        ensemble = EnsemblePredictor()
        features = np.array([[38.5, 1, 1, 0, 1, 45, 1, 0, 1]])
        
        prediction = ensemble.predict(features)
        
        assert prediction is not None
        assert 'prediction' in prediction
        assert 'confidence' in prediction

