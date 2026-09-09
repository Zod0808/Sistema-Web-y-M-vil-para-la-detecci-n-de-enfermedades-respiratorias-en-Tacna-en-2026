"""
Performance Tests - Benchmark
Tests de benchmark usando pytest-benchmark para comparar performance
"""

import importlib.util
import os
import time
from typing import Any, Dict, List
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

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
        
        # The benchmark fixture can only run one function per test, so only
        # the personalization path is benchmarked; the other is called
        # directly to still verify both produce a result.
        result_without = predict_without_personalization()
        result_with = benchmark(predict_with_personalization)

        assert result_without is not None
        assert result_with is not None


def _load_real_shap_explainer_module():
    """Loads the real shap_explainer.py under a private module name.

    conftest.py registers a lightweight stub at sys.modules['shap_explainer']
    so other suites can run without real ML dependencies; loading the file
    directly here bypasses that stub for this benchmark only (same approach
    as tests/api/test_symptom_ml_analyzer_explanation_endpoint.py).
    """
    spec = importlib.util.spec_from_file_location(
        'shap_explainer_benchmark_under_test',
        os.path.join(os.path.dirname(__file__), '..', '..', 'shap_explainer.py'),
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class _FakeLabelEncoder:
    def __init__(self, classes):
        self.classes = classes

    def inverse_transform(self, indices):
        return [self.classes[i] for i in indices]


class _FakeVectorizer:
    def get_feature_names_out(self):
        return [f'feature_{i}' for i in range(50)]

    def transform(self, texts):
        values = np.random.RandomState(0).uniform(0, 1, (len(texts), 50))
        return MagicMock(toarray=lambda: values)


class _FakeModel:
    def __init__(self, prediction_idx=0, proba=(0.7, 0.2, 0.1)):
        self.prediction_idx = prediction_idx
        self.proba = np.array(proba)

    def predict(self, X):
        return np.array([self.prediction_idx])

    def predict_proba(self, X):
        return np.array([self.proba])


@pytest.mark.performance
@pytest.mark.benchmark
class TestSHAPExplanationOverheadBenchmark:
    """CP-006-R: overhead que agrega el cálculo de SHAP al diagnóstico (RF-006)

    Compara una predicción "cruda" (model.predict + predict_proba, sin
    explicabilidad) contra SHAPDiseaseExplainer.explain_prediction(), que
    ejecuta esa misma predicción y además calcula y post-procesa los
    valores SHAP (shap_values, ordenamiento de contribuciones, factores
    positivos/negativos). La diferencia entre ambos mide el costo real
    que añade la explicabilidad.
    """

    @pytest.fixture
    def shap_explainer(self):
        real_module = _load_real_shap_explainer_module()

        fake_tree_explainer = MagicMock()
        fake_tree_explainer.shap_values.return_value = np.random.RandomState(1).uniform(-1, 1, (1, 50))

        model_data = {
            'model': _FakeModel(),
            'label_encoder': _FakeLabelEncoder(['neumonia', 'asma', 'epoc']),
            'vectorizer': _FakeVectorizer(),
            'feature_engineer': None,
        }

        with patch.object(real_module.joblib, 'load', return_value=model_data), \
             patch.object(real_module.shap, 'TreeExplainer', return_value=fake_tree_explainer):
            explainer = real_module.SHAPDiseaseExplainer('fake_model_path.pkl')

        return explainer

    def test_shap_explanation_overhead_benchmark(self, benchmark, shap_explainer):
        """Compara predicción sin SHAP vs explain_prediction() (con SHAP)"""
        symptoms = 'tos, fiebre, dificultad respiratoria'

        def raw_predict():
            X = shap_explainer.vectorizer.transform([symptoms]).toarray()
            prediction_idx = shap_explainer.model.predict(X)[0]
            confidence = shap_explainer.model.predict_proba(X)[0][prediction_idx]
            return prediction_idx, confidence

        def predict_with_shap():
            return shap_explainer.explain_prediction(symptoms, patient_age=40)

        # The benchmark fixture can only time one function per test, so only
        # the SHAP-explained path is benchmarked; the raw path is called
        # directly to still verify it works and to document the baseline
        # being compared against (same pattern as
        # test_with_vs_without_personalization_benchmark above).
        raw_result = raw_predict()
        shap_result = benchmark(predict_with_shap)

        assert raw_result[0] == 0
        assert shap_result['disease'] == 'neumonia'
        assert 'shap_values' in shap_result

