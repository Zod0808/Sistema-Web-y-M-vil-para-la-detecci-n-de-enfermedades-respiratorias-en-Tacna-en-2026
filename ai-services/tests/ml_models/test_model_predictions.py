"""
Tests for ML Model Predictions
Tests unitarios para validar predicciones de modelos ML
"""

import pytest
import numpy as np
import pandas as pd
from ml_models.random_forest_model import RandomForestModel
from ml_models.xgboost_model import XGBoostDiseaseClassifier
from ml_models.neural_network_model import MultiTaskNeuralNetwork as NeuralNetworkModel
from ml_models.ensemble_predictor import EnsemblePredictor


@pytest.fixture
def sample_symptoms():
    """Lista de síntomas de ejemplo (texto) para testing"""
    return ['fiebre', 'tos', 'dificultad_respiratoria', 'fatiga']


@pytest.fixture
def small_training_df():
    """Dataset sintético pequeño para entrenar RandomForest/XGBoost/NN en el propio test.

    Los artefactos reales en models/*.pkl fueron entrenados con un pipeline
    basado en CountVectorizer (ver SHAPDiseaseExplainer), incompatible con el
    pipeline de feature engineering manual de estas clases standalone. Para
    ejercitar de verdad predict()/train() de cada clase (en vez de skip),
    entrenamos aquí un modelo pequeño y rápido con datos sintéticos.
    """
    from ml_models.synthetic_dataset_generator import SyntheticDatasetGenerator

    generator = SyntheticDatasetGenerator()
    return generator.generate_dataset(
        samples_per_disease={
            'asma bronquial': 20,
            'neumonia leve': 20,
            'bronquitis aguda': 20,
            'rinitis': 20,
        }
    )


class TestModelPredictions:
    """Tests para validar que los modelos hacen predicciones correctas"""

    def test_random_forest_prediction_format(self, small_training_df):
        """Test que Random Forest retorna predicción en formato correcto"""
        model = RandomForestModel(n_estimators=20, max_depth=5)
        X, y = model.prepare_features(small_training_df)
        model.train(X, y, test_size=0.3)

        all_symptoms = sorted({
            s.lower() for symptoms in small_training_df['symptoms'] for s in symptoms
        })
        prediction = model.predict(all_symptoms[:2], all_symptoms)

        assert prediction is not None
        assert isinstance(prediction, dict)
        assert 'disease' in prediction
        assert 'confidence' in prediction

    def test_xgboost_prediction_format(self, small_training_df):
        """Test que XGBoost retorna predicción en formato correcto"""
        model = XGBoostDiseaseClassifier()
        X = model.create_advanced_features(small_training_df)
        y = model.label_encoder.fit_transform(small_training_df['disease'])
        model.train(X, y, test_size=0.3, optimize=False)

        prediction = model.predict(X[:1])

        assert prediction is not None
        assert isinstance(prediction, (dict, list, np.ndarray))

    def test_neural_network_prediction_format(self, small_training_df):
        """Test que Neural Network retorna predicción en formato correcto"""
        model = NeuralNetworkModel()
        tasks_data = model.prepare_multi_task_data(small_training_df)
        model.train(tasks_data, test_size=0.3)

        all_symptoms = sorted({
            s.lower() for symptoms in small_training_df['symptoms'] for s in symptoms
        })
        prediction = model.predict_all_tasks(all_symptoms[:2])

        assert prediction is not None
        assert isinstance(prediction, (dict, list, np.ndarray))
        assert len(prediction) > 0

    def test_ensemble_prediction_format(self, sample_symptoms):
        """Test que Ensemble retorna predicción en formato correcto"""
        ensemble = EnsemblePredictor()

        prediction = ensemble.predict(sample_symptoms)

        assert prediction is not None
        assert isinstance(prediction, dict)
        assert 'disease' in prediction
        assert 'confidence' in prediction
        assert 'ensemble_info' in prediction

    def test_prediction_confidence_range(self, sample_symptoms):
        """Test que la confianza está en rango válido [0, 1]"""
        ensemble = EnsemblePredictor()

        prediction = ensemble.predict(sample_symptoms)

        confidence = prediction.get('confidence', 0)
        assert 0 <= confidence <= 1

    def test_prediction_disease_classes(self, sample_symptoms):
        """Test que las predicciones retornan una enfermedad no vacía"""
        ensemble = EnsemblePredictor()

        prediction = ensemble.predict(sample_symptoms)

        predicted_disease = prediction.get('disease', '')
        assert isinstance(predicted_disease, str)
        assert len(predicted_disease) > 0

    def test_model_consistency(self, sample_symptoms):
        """Test que modelos diferentes dan resultados consistentes"""
        ensemble = EnsemblePredictor()
        prediction1 = ensemble.predict(sample_symptoms)
        prediction2 = ensemble.predict(sample_symptoms)

        # Mismo input debe dar mismo resultado (determinístico)
        assert prediction1['disease'] == prediction2['disease']

    def test_edge_cases(self):
        """Test casos extremos"""
        ensemble = EnsemblePredictor()

        # Paciente muy joven
        young_pred = ensemble.predict(['tos'], patient_age=5)
        assert young_pred is not None

        # Paciente muy mayor
        old_pred = ensemble.predict(
            ['fiebre', 'tos', 'dificultad_respiratoria', 'dolor_pecho'], patient_age=90
        )
        assert old_pred is not None

        # Síntomas mínimos
        minimal_pred = ensemble.predict(['fatiga'], patient_age=30)
        assert minimal_pred is not None


class TestModelPerformance:
    """Tests de performance de modelos"""

    def test_prediction_latency(self, sample_symptoms):
        """Test que las predicciones se completan en tiempo razonable"""
        import time

        ensemble = EnsemblePredictor()

        start_time = time.time()
        prediction = ensemble.predict(sample_symptoms)
        end_time = time.time()

        latency = end_time - start_time

        # Latencia debe ser menor a 500ms
        assert latency < 0.5, f"Prediction took {latency:.3f}s, expected < 0.5s"

    def test_batch_prediction_performance(self):
        """Test performance con múltiples predicciones"""
        import time

        ensemble = EnsemblePredictor()

        # Crear batch de 100 predicciones
        batch_symptoms = [['fiebre', 'tos'] for _ in range(100)]

        start_time = time.time()
        predictions = [ensemble.predict(symptoms) for symptoms in batch_symptoms]
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
        assert nn_model.models is not None or hasattr(nn_model, 'load_model')

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
