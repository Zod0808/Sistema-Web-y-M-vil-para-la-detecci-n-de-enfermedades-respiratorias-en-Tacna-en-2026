"""
Performance Tests - Prediction Latency
Tests de latencia de predicciones para diferentes modelos y escenarios
"""

import pytest
import time
import asyncio
from typing import List, Dict, Any
from statistics import mean, median
from unittest.mock import MagicMock, patch

from ml_models.ensemble_predictor import EnsemblePredictor
from ml_models.medical_bert import MedicalBERTModel
from ml_models.image_classifier import MedicalImageClassifier
from ml_models.time_series_predictor import TimeSeriesPredictor

# Latency thresholds (en milisegundos)
P50_THRESHOLD_MS = 200  # p50 debe ser < 200ms
P95_THRESHOLD_MS = 500  # p95 debe ser < 500ms
P99_THRESHOLD_MS = 1000  # p99 debe ser < 1000ms
MAX_LATENCY_MS = 2000  # Latencia máxima permitida


def calculate_percentile(values: List[float], percentile: float) -> float:
    """Calculate percentile from list of values"""
    if not values:
        return 0.0
    sorted_values = sorted(values)
    index = int(len(sorted_values) * percentile)
    return sorted_values[min(index, len(sorted_values) - 1)]


@pytest.mark.performance
class TestPredictionLatency:
    """Tests de latencia de predicciones"""
    
    @pytest.fixture
    def ensemble_predictor(self):
        """Create ensemble predictor"""
        return EnsemblePredictor()
    
    @pytest.fixture
    def sample_symptoms(self):
        """Sample symptoms"""
        return ['tos', 'fiebre', 'dificultad respiratoria']
    
    def test_ensemble_prediction_latency_distribution(self, ensemble_predictor, sample_symptoms):
        """Test latency distribution for ensemble predictions"""
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
        
        # Calcular percentiles
        p50 = calculate_percentile(latencies, 0.50)
        p95 = calculate_percentile(latencies, 0.95)
        p99 = calculate_percentile(latencies, 0.99)
        mean_latency = mean(latencies)
        median_latency = median(latencies)
        max_latency = max(latencies)
        
        # Verificar thresholds
        assert p50 < P50_THRESHOLD_MS, f"p50 {p50:.2f}ms exceeds {P50_THRESHOLD_MS}ms"
        assert p95 < P95_THRESHOLD_MS, f"p95 {p95:.2f}ms exceeds {P95_THRESHOLD_MS}ms"
        assert p99 < P99_THRESHOLD_MS, f"p99 {p99:.2f}ms exceeds {P99_THRESHOLD_MS}ms"
        assert max_latency < MAX_LATENCY_MS, f"max {max_latency:.2f}ms exceeds {MAX_LATENCY_MS}ms"
        
        # Verificar que la distribución es razonable
        assert mean_latency < P95_THRESHOLD_MS, f"mean {mean_latency:.2f}ms too high"
        assert median_latency < P50_THRESHOLD_MS, f"median {median_latency:.2f}ms too high"
    
    def test_bert_prediction_latency_distribution(self):
        """Test latency distribution for BERT predictions"""
        bert_model = MedicalBERTModel()
        bert_model.load()
        
        sample_texts = ["Patient with persistent cough and fever"]
        latencies = []
        
        for _ in range(50):  # Menos iteraciones para BERT
            start_time = time.perf_counter()
            bert_model.predict(sample_texts)
            end_time = time.perf_counter()
            latency_ms = (end_time - start_time) * 1000
            latencies.append(latency_ms)
        
        p50 = calculate_percentile(latencies, 0.50)
        p95 = calculate_percentile(latencies, 0.95)
        p99 = calculate_percentile(latencies, 0.99)
        
        # BERT puede ser más lento, thresholds más altos
        assert p95 < P95_THRESHOLD_MS * 2, f"p95 {p95:.2f}ms exceeds threshold"
        assert p99 < P99_THRESHOLD_MS * 2, f"p99 {p99:.2f}ms exceeds threshold"
    
    def test_image_classification_latency_distribution(self):
        """Test latency distribution for image classification"""
        image_classifier = MedicalImageClassifier()
        image_classifier.load()
        
        sample_images = ["image1.jpg"]
        latencies = []
        
        for _ in range(30):  # Menos iteraciones para imágenes
            start_time = time.perf_counter()
            image_classifier.predict(sample_images)
            end_time = time.perf_counter()
            latency_ms = (end_time - start_time) * 1000
            latencies.append(latency_ms)
        
        p50 = calculate_percentile(latencies, 0.50)
        p95 = calculate_percentile(latencies, 0.95)
        p99 = calculate_percentile(latencies, 0.99)
        
        # Clasificación de imágenes puede ser más lenta
        assert p95 < IMAGE_CLASSIFICATION_THRESHOLD_MS, f"p95 {p95:.2f}ms exceeds threshold"
        assert p99 < IMAGE_CLASSIFICATION_THRESHOLD_MS * 1.5, f"p99 {p99:.2f}ms exceeds threshold"
    
    def test_time_series_prediction_latency_distribution(self):
        """Test latency distribution for time series predictions"""
        from datetime import datetime, timedelta
        
        predictor = TimeSeriesPredictor()
        base_date = datetime.utcnow()
        series = [
            {'date': (base_date + timedelta(days=i)).isoformat(), 'value': 10.0 + i * 0.5}
            for i in range(30)
        ]
        predictor.fit(series)
        
        latencies = []
        
        for _ in range(100):
            start_time = time.perf_counter()
            predictor.forecast(horizon_days=7)
            end_time = time.perf_counter()
            latency_ms = (end_time - start_time) * 1000
            latencies.append(latency_ms)
        
        p50 = calculate_percentile(latencies, 0.50)
        p95 = calculate_percentile(latencies, 0.95)
        p99 = calculate_percentile(latencies, 0.99)
        
        # Time series debe ser muy rápido
        assert p50 < TIME_SERIES_PREDICTION_THRESHOLD_MS, f"p50 {p50:.2f}ms exceeds threshold"
        assert p95 < TIME_SERIES_PREDICTION_THRESHOLD_MS * 2, f"p95 {p95:.2f}ms exceeds threshold"
        assert p99 < TIME_SERIES_PREDICTION_THRESHOLD_MS * 3, f"p99 {p99:.2f}ms exceeds threshold"


@pytest.mark.performance
class TestConcurrentPredictionLatency:
    """Tests de latencia con predicciones concurrentes"""
    
    @pytest.fixture
    def ensemble_predictor(self):
        """Create ensemble predictor"""
        return EnsemblePredictor()
    
    async def predict_async(self, predictor, symptoms):
        """Async prediction wrapper"""
        return predictor.predict(symptoms=symptoms, patient_age=35, apply_personalization=False)
    
    def test_concurrent_predictions_latency(self, ensemble_predictor):
        """Test latency with concurrent predictions"""
        sample_symptoms = ['tos', 'fiebre']
        num_concurrent = 10
        
        async def run_concurrent():
            tasks = [
                self.predict_async(ensemble_predictor, sample_symptoms)
                for _ in range(num_concurrent)
            ]
            start_time = time.perf_counter()
            results = await asyncio.gather(*tasks)
            end_time = time.perf_counter()
            total_time_ms = (end_time - start_time) * 1000
            return results, total_time_ms
        
        results, total_time = asyncio.run(run_concurrent())
        
        # Verificar que todas las predicciones se completaron
        assert len(results) == num_concurrent
        
        # El tiempo total no debe ser mucho mayor que una predicción individual
        avg_time_per_prediction = total_time / num_concurrent
        assert avg_time_per_prediction < P95_THRESHOLD_MS, \
            f"Average concurrent latency {avg_time_per_prediction:.2f}ms too high"


@pytest.mark.performance
class TestPredictionThroughput:
    """Tests de throughput (predicciones por segundo)"""
    
    @pytest.fixture
    def ensemble_predictor(self):
        """Create ensemble predictor"""
        return EnsemblePredictor()
    
    def test_ensemble_prediction_throughput(self, ensemble_predictor):
        """Test throughput of ensemble predictions"""
        sample_symptoms = ['tos', 'fiebre']
        num_predictions = 100
        
        start_time = time.perf_counter()
        for _ in range(num_predictions):
            ensemble_predictor.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                apply_personalization=False
            )
        end_time = time.perf_counter()
        
        total_time = end_time - start_time
        throughput = num_predictions / total_time  # predicciones por segundo
        
        # Debe procesar al menos 10 predicciones por segundo
        assert throughput >= 10, f"Throughput {throughput:.2f} pred/s too low"
    
    def test_time_series_prediction_throughput(self):
        """Test throughput of time series predictions"""
        from datetime import datetime, timedelta
        
        predictor = TimeSeriesPredictor()
        base_date = datetime.utcnow()
        series = [
            {'date': (base_date + timedelta(days=i)).isoformat(), 'value': 10.0 + i * 0.5}
            for i in range(30)
        ]
        predictor.fit(series)
        
        num_predictions = 1000
        
        start_time = time.perf_counter()
        for _ in range(num_predictions):
            predictor.forecast(horizon_days=7)
        end_time = time.perf_counter()
        
        total_time = end_time - start_time
        throughput = num_predictions / total_time
        
        # Time series debe ser muy rápido, al menos 100 pred/s
        assert throughput >= 100, f"Throughput {throughput:.2f} pred/s too low"

