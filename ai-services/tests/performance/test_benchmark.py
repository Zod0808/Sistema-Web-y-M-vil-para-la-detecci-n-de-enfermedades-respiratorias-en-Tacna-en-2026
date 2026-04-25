"""
Performance Tests - Benchmark
Tests de benchmark usando pytest-benchmark para comparar performance
"""

import pytest
import time
from typing import List, Dict, Any

from ml_models.ensemble_predictor import EnsemblePredictor
from ml_models.medical_bert import MedicalBERTModel
from ml_models.image_classifier import MedicalImageClassifier
from ml_models.time_series_predictor import TimeSeriesPredictor


@pytest.mark.performance
@pytest.mark.benchmark
class TestModelBenchmarks:
    """Benchmarks de modelos ML usando pytest-benchmark"""
    
    @pytest.fixture
    def ensemble_predictor(self):
        """Create ensemble predictor"""
        return EnsemblePredictor()
    
    @pytest.fixture
    def sample_symptoms(self):
        """Sample symptoms"""
        return ['tos', 'fiebre', 'dificultad respiratoria']
    
    def test_ensemble_prediction_benchmark(self, benchmark, ensemble_predictor, sample_symptoms):
        """Benchmark ensemble prediction"""
        def predict():
            return ensemble_predictor.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                apply_personalization=False
            )
        
        result = benchmark(predict)
        assert result is not None
    
    def test_ensemble_prediction_with_personalization_benchmark(
        self, benchmark, ensemble_predictor, sample_symptoms
    ):
        """Benchmark ensemble prediction with personalization"""
        def predict():
            return ensemble_predictor.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                risk_factors=['smoking'],
                apply_personalization=True
            )
        
        result = benchmark(predict)
        assert result is not None
    
    def test_bert_prediction_benchmark(self, benchmark):
        """Benchmark BERT prediction"""
        bert_model = MedicalBERTModel()
        bert_model.load()
        
        sample_texts = ["Patient with persistent cough and fever"]
        
        def predict():
            return bert_model.predict(sample_texts)
        
        result = benchmark(predict)
        assert result is not None
    
    def test_image_classification_benchmark(self, benchmark):
        """Benchmark image classification"""
        image_classifier = MedicalImageClassifier()
        image_classifier.load()
        
        sample_images = ["image1.jpg"]
        
        def classify():
            return image_classifier.predict(sample_images)
        
        result = benchmark(classify)
        assert result is not None
    
    def test_time_series_forecast_benchmark(self, benchmark):
        """Benchmark time series forecasting"""
        from datetime import datetime, timedelta
        
        predictor = TimeSeriesPredictor()
        base_date = datetime.utcnow()
        series = [
            {'date': (base_date + timedelta(days=i)).isoformat(), 'value': 10.0 + i * 0.5}
            for i in range(30)
        ]
        predictor.fit(series)
        
        def forecast():
            return predictor.forecast(horizon_days=7)
        
        result = benchmark(forecast)
        assert len(result) == 7


@pytest.mark.performance
@pytest.mark.benchmark
class TestBatchProcessingBenchmarks:
    """Benchmarks de procesamiento por lotes"""
    
    @pytest.fixture
    def ensemble_predictor(self):
        """Create ensemble predictor"""
        return EnsemblePredictor()
    
    def test_batch_ensemble_predictions_benchmark(self, benchmark, ensemble_predictor):
        """Benchmark batch ensemble predictions"""
        batch_symptoms = [
            ['tos', 'fiebre'],
            ['dificultad respiratoria', 'dolor de pecho'],
            ['fatiga', 'náuseas'],
        ] * 10  # 30 predicciones
        
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
        assert len(result) == len(batch_symptoms)
    
    def test_batch_bert_predictions_benchmark(self, benchmark):
        """Benchmark batch BERT predictions"""
        bert_model = MedicalBERTModel()
        bert_model.load()
        
        batch_texts = [
            "Patient presents with persistent cough",
            "History of asthma with recent exacerbation",
            "Chest pain and shortness of breath",
        ] * 10  # 30 textos
        
        def predict_batch():
            return bert_model.predict(batch_texts)
        
        result = benchmark(predict_batch)
        assert len(result) == len(batch_texts)


@pytest.mark.performance
@pytest.mark.benchmark
class TestModelComparisonBenchmarks:
    """Benchmarks comparativos entre modelos"""
    
    @pytest.fixture
    def sample_symptoms(self):
        """Sample symptoms"""
        return ['tos', 'fiebre', 'dificultad respiratoria']
    
    def test_ensemble_vs_individual_models_benchmark(self, benchmark, sample_symptoms):
        """Compare ensemble vs individual models"""
        ensemble = EnsemblePredictor()
        
        def ensemble_predict():
            return ensemble.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                apply_personalization=False
            )
        
        result = benchmark(ensemble_predict)
        assert result is not None
    
    def test_with_vs_without_personalization_benchmark(self, benchmark, sample_symptoms):
        """Compare predictions with and without personalization"""
        ensemble = EnsemblePredictor()
        
        def predict_without_personalization():
            return ensemble.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                apply_personalization=False
            )
        
        def predict_with_personalization():
            return ensemble.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                risk_factors=['smoking'],
                apply_personalization=True
            )
        
        result_without = benchmark(predict_without_personalization)
        result_with = benchmark(predict_with_personalization)
        
        assert result_without is not None
        assert result_with is not None

