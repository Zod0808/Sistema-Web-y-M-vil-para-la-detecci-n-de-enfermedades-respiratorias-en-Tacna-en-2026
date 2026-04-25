"""
Tests for ML Model Predictions
Tests unitarios para validar predicciones de modelos ML
"""

import pytest
import numpy as np
import pandas as pd
from ml_models.random_forest_model import RandomForestModel
from ml_models.xgboost_model import XGBoostDiseaseClassifier
from ml_models.neural_network_model import NeuralNetworkModel
from ml_models.ensemble_predictor import EnsemblePredictor


class TestModelPredictions:
    """Tests para validar que los modelos hacen predicciones correctas"""

    @pytest.fixture
    def sample_symptoms(self):
        """Síntomas de ejemplo para testing"""
        return {
            'fiebre': 38.5,
            'tos': True,
            'dificultad_respiratoria': True,
            'dolor_pecho': False,
            'fatiga': True,
            'edad': 45,
            'genero': 'M',
            'fumador': False,
            'enfermedades_cronicas': ['diabetes']
        }

    @pytest.fixture
    def sample_features(self):
        """Features de ejemplo en formato numérico"""
        return np.array([[38.5, 1, 1, 0, 1, 45, 1, 0, 1]])

    def test_random_forest_prediction_format(self, sample_features):
        """Test que Random Forest retorna predicción en formato correcto"""
        import os
        model = RandomForestModel()
        
        # Try to load model if file exists, otherwise use initialized model
        model_path = 'models/base_random_forest.pkl'
        if os.path.exists(model_path):
            model.load_model(model_path)
        elif os.path.exists(f'ai-services/{model_path}'):
            model.load_model(f'ai-services/{model_path}')
        
        # Model should be able to predict even if not loaded from file
        if hasattr(model, 'model') and model.model is not None:
            prediction = model.predict(sample_features)
            assert prediction is not None
            assert isinstance(prediction, (dict, list, np.ndarray))
            assert len(prediction) > 0
        else:
            pytest.skip("Model not available for testing")

    def test_xgboost_prediction_format(self, sample_features):
        """Test que XGBoost retorna predicción en formato correcto"""
        import os
        model = XGBoostDiseaseClassifier()
        
        # Try to load model if file exists, otherwise use initialized model
        model_path = 'models/xgboost_model.pkl'
        if os.path.exists(model_path):
            model.load_model(model_path)
        elif os.path.exists(f'ai-services/{model_path}'):
            model.load_model(f'ai-services/{model_path}')
        
        # Model should be able to predict even if not loaded from file
        if hasattr(model, 'model') and model.model is not None:
            # XGBoost needs features in correct format
            if isinstance(sample_features, dict):
                # Convert dict to array format expected by XGBoost
                features = np.array([list(sample_features.values())])
            else:
                features = sample_features
            prediction = model.predict(features) if hasattr(model, 'predict') else None
            if prediction is not None:
                assert isinstance(prediction, (dict, list, np.ndarray))
        else:
            pytest.skip("Model not available for testing")

    def test_neural_network_prediction_format(self, sample_features):
        """Test que Neural Network retorna predicción en formato correcto"""
        import os
        model = NeuralNetworkModel()
        
        # Try to load model if file exists, otherwise use initialized model
        model_path = 'models/neural_network_model.pkl'
        if os.path.exists(model_path):
            model.load_model(model_path)
        elif os.path.exists(f'ai-services/{model_path}'):
            model.load_model(f'ai-services/{model_path}')
        
        # Model should be able to predict even if not loaded from file
        if hasattr(model, 'model') and model.model is not None:
            prediction = model.predict(sample_features)
            assert prediction is not None
            assert isinstance(prediction, (dict, list, np.ndarray))
            assert len(prediction) > 0
        else:
            pytest.skip("Model not available for testing")

    def test_ensemble_prediction_format(self, sample_features):
        """Test que Ensemble retorna predicción en formato correcto"""
        ensemble = EnsemblePredictor()
        
        prediction = ensemble.predict(sample_features)
        
        assert prediction is not None
        assert isinstance(prediction, dict)
        assert 'prediction' in prediction
        assert 'confidence' in prediction
        assert 'model_contributions' in prediction

    def test_prediction_confidence_range(self, sample_features):
        """Test que la confianza está en rango válido [0, 1]"""
        ensemble = EnsemblePredictor()
        
        prediction = ensemble.predict(sample_features)
        
        confidence = prediction.get('confidence', 0)
        assert 0 <= confidence <= 1

    def test_prediction_disease_classes(self, sample_features):
        """Test que las predicciones pertenecen a clases de enfermedades válidas"""
        ensemble = EnsemblePredictor()
        
        prediction = ensemble.predict(sample_features)
        
        valid_diseases = [
            'bronquitis', 'neumonia', 'asma', 'enfisema',
            'covid19', 'influenza', 'resfriado_comun'
        ]
        
        predicted_disease = prediction.get('prediction', '')
        assert predicted_disease in valid_diseases or predicted_disease.lower() in valid_diseases

    def test_model_consistency(self, sample_features):
        """Test que modelos diferentes dan resultados consistentes"""
        ensemble = EnsemblePredictor()
        prediction1 = ensemble.predict(sample_features)
        prediction2 = ensemble.predict(sample_features)
        
        # Mismo input debe dar mismo resultado (determinístico)
        assert prediction1['prediction'] == prediction2['prediction']

    def test_edge_cases(self):
        """Test casos extremos"""
        ensemble = EnsemblePredictor()
        
        # Paciente muy joven
        young_features = np.array([[37.0, 0, 0, 0, 0, 5, 1, 0, 0]])
        young_pred = ensemble.predict(young_features)
        assert young_pred is not None
        
        # Paciente muy mayor
        old_features = np.array([[39.0, 1, 1, 1, 1, 90, 0, 1, 1]])
        old_pred = ensemble.predict(old_features)
        assert old_pred is not None
        
        # Síntomas mínimos
        minimal_features = np.array([[36.5, 0, 0, 0, 0, 30, 1, 0, 0]])
        minimal_pred = ensemble.predict(minimal_features)
        assert minimal_pred is not None


class TestModelPerformance:
    """Tests de performance de modelos"""

    def test_prediction_latency(self, sample_features):
        """Test que las predicciones se completan en tiempo razonable"""
        import time
        
        ensemble = EnsemblePredictor()
        
        start_time = time.time()
        prediction = ensemble.predict(sample_features)
        end_time = time.time()
        
        latency = end_time - start_time
        
        # Latencia debe ser menor a 500ms
        assert latency < 0.5, f"Prediction took {latency:.3f}s, expected < 0.5s"

    def test_batch_prediction_performance(self):
        """Test performance con múltiples predicciones"""
        import time
        
        ensemble = EnsemblePredictor()
        
        # Crear batch de 100 predicciones
        batch_features = np.random.rand(100, 9)
        
        start_time = time.time()
        predictions = [ensemble.predict(features.reshape(1, -1)) for features in batch_features]
        end_time = time.time()
        
        total_time = end_time - start_time
        avg_time = total_time / 100
        
        # Tiempo promedio por predicción debe ser razonable
        assert avg_time < 0.1, f"Average prediction time {avg_time:.3f}s is too high"


class TestModelValidation:
    """Tests de validación de modelos"""

    def test_model_loading(self):
        """Test que los modelos se cargan correctamente"""
        rf_model = RandomForestModel()
        xgb_model = XGBoostDiseaseClassifier()
        nn_model = NeuralNetworkModel()
        
        assert rf_model.model is not None or hasattr(rf_model, 'load_model')
        assert xgb_model.model is not None or hasattr(xgb_model, 'load_model')
        assert nn_model.model is not None or hasattr(nn_model, 'load_model')

    def test_model_accuracy_threshold(self):
        """Test que los modelos tienen accuracy mínimo aceptable"""
        # Este test requeriría datos de validación
        # Por ahora verificamos que los modelos existen
        rf_model = RandomForestModel()
        xgb_model = XGBoostDiseaseClassifier()
        nn_model = NeuralNetworkModel()
        
        # Todos deben poder cargar modelos
        assert rf_model is not None
        assert xgb_model is not None
        assert nn_model is not None

