"""
Tests for Ensemble Model Performance
Tests de performance del sistema ensemble
"""

import pytest
import random
import time
from ml_models.ensemble_predictor import EnsemblePredictor


SYMPTOM_POOL = [
    'fiebre', 'tos', 'dificultad_respiratoria', 'dolor_pecho', 'fatiga',
    'sibilancias', 'opresion_pecho', 'dolor_garganta', 'congestion_nasal', 'escalofrios'
]


class TestEnsemblePerformance:
    """Tests de performance del sistema ensemble"""

    @pytest.fixture
    def ensemble(self):
        """Fixture para crear instancia de ensemble"""
        return EnsemblePredictor()

    @pytest.fixture
    def sample_symptoms(self):
        """Síntomas de ejemplo"""
        return ['fiebre', 'tos', 'dificultad_respiratoria', 'fatiga']

    def test_ensemble_prediction_speed(self, ensemble, sample_symptoms):
        """Test que el ensemble predice rápidamente"""
        start = time.time()
        prediction = ensemble.predict(sample_symptoms)
        elapsed = time.time() - start

        assert elapsed < 0.5  # Menos de 500ms
        assert prediction is not None

    def test_ensemble_handles_multiple_predictions(self, ensemble):
        """Test que el ensemble maneja múltiples predicciones"""
        symptoms_batch = [random.sample(SYMPTOM_POOL, 4) for _ in range(10)]

        start = time.time()
        predictions = []
        for symptoms in symptoms_batch:
            pred = ensemble.predict(symptoms)
            predictions.append(pred)
        elapsed = time.time() - start

        assert len(predictions) == 10
        assert elapsed < 5.0  # 10 predicciones en menos de 5 segundos

    def test_ensemble_model_contributions(self, ensemble, sample_symptoms):
        """Test que el ensemble muestra contribuciones de cada modelo"""
        prediction = ensemble.predict(sample_symptoms)

        assert 'ensemble_info' in prediction
        models_used = prediction['ensemble_info']['models_used']

        # Debe haber contribuciones de al menos los modelos disponibles (xgboost, random_forest)
        assert len(models_used) >= 2

    def test_ensemble_confidence_calculation(self, ensemble, sample_symptoms):
        """Test que la confianza del ensemble es calculada correctamente"""
        prediction = ensemble.predict(sample_symptoms)

        assert 'confidence' in prediction
        confidence = prediction['confidence']

        # Confianza debe estar en rango [0, 1]
        assert 0 <= confidence <= 1

    def test_ensemble_consistency(self, ensemble, sample_symptoms):
        """Test que el ensemble da resultados consistentes"""
        pred1 = ensemble.predict(sample_symptoms)
        pred2 = ensemble.predict(sample_symptoms)

        # Mismo input debe dar mismo resultado
        assert pred1['disease'] == pred2['disease']
        assert abs(pred1['confidence'] - pred2['confidence']) < 0.01

    def test_ensemble_memory_usage(self, ensemble, sample_symptoms):
        """Test que el ensemble no consume memoria excesiva"""
        import psutil
        import os

        process = psutil.Process(os.getpid())
        mem_before = process.memory_info().rss / 1024 / 1024  # MB

        # Hacer múltiples predicciones
        for _ in range(100):
            ensemble.predict(sample_symptoms)

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
        symptoms = ['fiebre', 'tos', 'dificultad_respiratoria', 'fatiga']

        prediction = ensemble.predict(symptoms)

        assert prediction is not None
        assert 'disease' in prediction
        assert 'confidence' in prediction

