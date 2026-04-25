"""
Performance Tests - ML Models
Tests de performance para modelos ML (ensemble, BERT, image classifier, time series)
"""

import pytest
import time
import numpy as np
from unittest.mock import MagicMock, patch
from typing import Dict, List, Any

from ml_models.ensemble_predictor import EnsemblePredictor
from ml_models.medical_bert import MedicalBERTModel
from ml_models.image_classifier import MedicalImageClassifier
from ml_models.time_series_predictor import TimeSeriesPredictor

# Performance thresholds (en milisegundos)
ENSEMBLE_PREDICTION_THRESHOLD_MS = 500  # 500ms para predicción ensemble
BERT_PREDICTION_THRESHOLD_MS = 1000  # 1 segundo para BERT
IMAGE_CLASSIFICATION_THRESHOLD_MS = 2000  # 2 segundos para clasificación de imágenes
TIME_SERIES_PREDICTION_THRESHOLD_MS = 100  # 100ms para series temporales
BATCH_PREDICTION_THRESHOLD_MS = 2000  # 2 segundos para batch de 10 items


@pytest.mark.performance
class TestEnsemblePredictorPerformance:
    """Tests de performance para EnsemblePredictor"""
    
    @pytest.fixture
    def ensemble_predictor(self):
        """Create ensemble predictor instance"""
        return EnsemblePredictor(
            use_xgboost=True,
            use_random_forest=True,
            use_neural_network=True
        )
    
    @pytest.fixture
    def sample_symptoms(self):
        """Sample symptoms for testing"""
        return ['tos', 'fiebre', 'dificultad respiratoria']
    
    def test_single_prediction_performance(self, ensemble_predictor, sample_symptoms, benchmark):
        """Test performance of single prediction"""
        def predict():
            return ensemble_predictor.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                risk_factors=[],
                apply_personalization=False
            )
        
        result = benchmark(predict)
        
        # Verificar que la predicción es razonablemente rápida
        assert result is not None
    
    def test_batch_prediction_performance(self, ensemble_predictor, benchmark):
        """Test performance of batch predictions"""
        batch_symptoms = [
            ['tos', 'fiebre'],
            ['dificultad respiratoria', 'dolor de pecho'],
            ['fatiga', 'náuseas'],
        ] * 3  # 9 predicciones
        
        def predict_batch():
            results = []
            for symptoms in batch_symptoms:
                result = ensemble_predictor.predict(
                    symptoms=symptoms,
                    patient_age=35,
                    apply_personalization=False
                )
                results.append(result)
            return results
        
        result = benchmark(predict_batch)
        
        # Verificar que todas las predicciones se completaron
        assert len(result) == len(batch_symptoms)
    
    def test_prediction_latency_p95(self, ensemble_predictor, sample_symptoms):
        """Test p95 latency of predictions"""
        latencies = []
        
        for _ in range(100):
            start_time = time.perf_counter()
            ensemble_predictor.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                apply_personalization=False
            )
            end_time = time.perf_counter()
            latency_ms = (end_time - start_time) * 1000
            latencies.append(latency_ms)
        
        latencies.sort()
        p95_index = int(len(latencies) * 0.95)
        p95_latency = latencies[p95_index]
        
        assert p95_latency < ENSEMBLE_PREDICTION_THRESHOLD_MS, \
            f"p95 latency {p95_latency:.2f}ms exceeds threshold {ENSEMBLE_PREDICTION_THRESHOLD_MS}ms"
    
    def test_prediction_latency_p99(self, ensemble_predictor, sample_symptoms):
        """Test p99 latency of predictions"""
        latencies = []
        
        for _ in range(100):
            start_time = time.perf_counter()
            ensemble_predictor.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                apply_personalization=False
            )
            end_time = time.perf_counter()
            latency_ms = (end_time - start_time) * 1000
            latencies.append(latency_ms)
        
        latencies.sort()
        p99_index = int(len(latencies) * 0.99)
        p99_latency = latencies[p99_index]
        
        # p99 puede ser más alto, pero no excesivamente
        assert p99_latency < ENSEMBLE_PREDICTION_THRESHOLD_MS * 2, \
            f"p99 latency {p99_latency:.2f}ms exceeds threshold {ENSEMBLE_PREDICTION_THRESHOLD_MS * 2}ms"


@pytest.mark.performance
class TestMedicalBERTPerformance:
    """Tests de performance para MedicalBERTModel"""
    
    @pytest.fixture
    def bert_model(self):
        """Create BERT model instance"""
        return MedicalBERTModel(model_name="bert-base-uncased")
    
    @pytest.fixture
    def sample_texts(self):
        """Sample medical texts for testing"""
        return [
            "Patient presents with persistent cough and fever",
            "History of asthma with recent exacerbation",
            "Chest pain and shortness of breath",
        ]
    
    def test_single_text_prediction_performance(self, bert_model, sample_texts, benchmark):
        """Test performance of single text prediction"""
        def predict():
            return bert_model.predict(sample_texts[:1])
        
        result = benchmark(predict)
        assert result is not None
    
    def test_batch_text_prediction_performance(self, bert_model, sample_texts, benchmark):
        """Test performance of batch text predictions"""
        batch_texts = sample_texts * 10  # 30 textos
        
        def predict_batch():
            return bert_model.predict(batch_texts)
        
        result = benchmark(predict_batch)
        assert len(result) == len(batch_texts)
    
    def test_prediction_latency_p95(self, bert_model, sample_texts):
        """Test p95 latency of BERT predictions"""
        latencies = []
        
        for _ in range(50):  # Menos iteraciones para BERT (más lento)
            start_time = time.perf_counter()
            bert_model.predict(sample_texts[:1])
            end_time = time.perf_counter()
            latency_ms = (end_time - start_time) * 1000
            latencies.append(latency_ms)
        
        latencies.sort()
        p95_index = int(len(latencies) * 0.95)
        p95_latency = latencies[p95_index]
        
        assert p95_latency < BERT_PREDICTION_THRESHOLD_MS, \
            f"p95 latency {p95_latency:.2f}ms exceeds threshold {BERT_PREDICTION_THRESHOLD_MS}ms"


@pytest.mark.performance
class TestImageClassifierPerformance:
    """Tests de performance para MedicalImageClassifier"""
    
    @pytest.fixture
    def image_classifier(self):
        """Create image classifier instance"""
        return MedicalImageClassifier(model_name="resnet50")
    
    @pytest.fixture
    def sample_images(self):
        """Sample image paths for testing"""
        return ["image1.jpg", "image2.jpg", "image3.jpg"]
    
    def test_single_image_classification_performance(self, image_classifier, sample_images, benchmark):
        """Test performance of single image classification"""
        def classify():
            return image_classifier.predict(sample_images[:1])
        
        result = benchmark(classify)
        assert result is not None
    
    def test_batch_image_classification_performance(self, image_classifier, sample_images, benchmark):
        """Test performance of batch image classification"""
        batch_images = sample_images * 5  # 15 imágenes
        
        def classify_batch():
            return image_classifier.predict(batch_images)
        
        result = benchmark(classify_batch)
        assert len(result) == len(batch_images)
    
    def test_prediction_latency_p95(self, image_classifier, sample_images):
        """Test p95 latency of image classification"""
        latencies = []
        
        for _ in range(30):  # Menos iteraciones para imágenes (más lento)
            start_time = time.perf_counter()
            image_classifier.predict(sample_images[:1])
            end_time = time.perf_counter()
            latency_ms = (end_time - start_time) * 1000
            latencies.append(latency_ms)
        
        latencies.sort()
        p95_index = int(len(latencies) * 0.95)
        p95_latency = latencies[p95_index]
        
        assert p95_latency < IMAGE_CLASSIFICATION_THRESHOLD_MS, \
            f"p95 latency {p95_latency:.2f}ms exceeds threshold {IMAGE_CLASSIFICATION_THRESHOLD_MS}ms"


@pytest.mark.performance
class TestTimeSeriesPredictorPerformance:
    """Tests de performance para TimeSeriesPredictor"""
    
    @pytest.fixture
    def time_series_predictor(self):
        """Create time series predictor instance"""
        return TimeSeriesPredictor(model_type="simple-linear")
    
    @pytest.fixture
    def sample_series(self):
        """Sample time series data"""
        from datetime import datetime, timedelta
        base_date = datetime.utcnow()
        return [
            {'date': (base_date + timedelta(days=i)).isoformat(), 'value': 10.0 + i * 0.5}
            for i in range(30)
        ]
    
    def test_fit_performance(self, time_series_predictor, sample_series, benchmark):
        """Test performance of model fitting"""
        def fit():
            return time_series_predictor.fit(sample_series)
        
        result = benchmark(fit)
        assert result is not None
    
    def test_forecast_performance(self, time_series_predictor, sample_series, benchmark):
        """Test performance of forecasting"""
        time_series_predictor.fit(sample_series)
        
        def forecast():
            return time_series_predictor.forecast(horizon_days=7)
        
        result = benchmark(forecast)
        assert len(result) == 7
    
    def test_prediction_latency_p95(self, time_series_predictor, sample_series):
        """Test p95 latency of time series predictions"""
        time_series_predictor.fit(sample_series)
        latencies = []
        
        for _ in range(100):
            start_time = time.perf_counter()
            time_series_predictor.forecast(horizon_days=7)
            end_time = time.perf_counter()
            latency_ms = (end_time - start_time) * 1000
            latencies.append(latency_ms)
        
        latencies.sort()
        p95_index = int(len(latencies) * 0.95)
        p95_latency = latencies[p95_index]
        
        assert p95_latency < TIME_SERIES_PREDICTION_THRESHOLD_MS, \
            f"p95 latency {p95_latency:.2f}ms exceeds threshold {TIME_SERIES_PREDICTION_THRESHOLD_MS}ms"


@pytest.mark.performance
class TestModelLoadingPerformance:
    """Tests de performance para carga de modelos"""
    
    def test_ensemble_loading_performance(self, benchmark):
        """Test performance of loading ensemble predictor"""
        def load():
            predictor = EnsemblePredictor()
            return predictor
        
        result = benchmark(load)
        assert result is not None
    
    def test_bert_loading_performance(self, benchmark):
        """Test performance of loading BERT model"""
        def load():
            model = MedicalBERTModel()
            model.load()
            return model
        
        result = benchmark(load)
        assert result is not None
    
    def test_image_classifier_loading_performance(self, benchmark):
        """Test performance of loading image classifier"""
        def load():
            classifier = MedicalImageClassifier()
            classifier.load()
            return classifier
        
        result = benchmark(load)
        assert result is not None

