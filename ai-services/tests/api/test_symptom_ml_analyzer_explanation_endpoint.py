"""
Integration test for POST /v1/ml-explanation (RF-006: Explicabilidad SHAP)

Cierra el gap CP-006-I documentado en
Documentation/pruebas/Catalogo_de_Pruebas_RespiCare.xlsx: antes solo existía
cobertura unitaria de shap_explainer.py en aislamiento (tests/services/test_shap_explainer.py).
Este test verifica la integración real: petición HTTP -> endpoint ->
SHAPDiseaseExplainer.explain_prediction() -> respuesta serializada, usando el
módulo real (no el stub liviano registrado por conftest.py para otras suites).
"""

import importlib.util
import os
import sys
import types

import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

from api.routes.symptom_ml_analyzer import router


def _load_real_shap_explainer_module():
    """Loads the real shap_explainer.py under a private module name.

    conftest.py registers a lightweight stub at sys.modules['shap_explainer']
    so other suites can run without real ML dependencies. The endpoint under
    test does `from shap_explainer import SHAPDiseaseExplainer` at call time,
    which resolves via sys.modules, so to exercise the real integration we
    swap that entry for the duration of the test (see `real_shap_module` fixture).
    """
    spec = importlib.util.spec_from_file_location(
        'shap_explainer_endpoint_under_test',
        os.path.join(os.path.dirname(__file__), '..', '..', 'shap_explainer.py'),
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeLabelEncoder:
    def __init__(self, classes):
        self.classes = classes

    def inverse_transform(self, indices):
        return [self.classes[i] for i in indices]


class FakeVectorizer:
    def get_feature_names_out(self):
        return ['tos', 'fiebre', 'fatiga']

    def transform(self, texts):
        return MagicMock(toarray=lambda: np.array([[1.0, 0.0, 1.0]] * len(texts)))


class FakeModel:
    def __init__(self, prediction_idx=0, proba=(0.7, 0.2, 0.1)):
        self.prediction_idx = prediction_idx
        self.proba = np.array(proba)

    def predict(self, X):
        return np.array([self.prediction_idx])

    def predict_proba(self, X):
        return np.array([self.proba])


@pytest.fixture
def real_shap_module(monkeypatch):
    """Swaps sys.modules['shap_explainer'] for the real module for one test.

    Uses monkeypatch so the original (mocked) entry is automatically restored
    after the test, regardless of pass/fail, avoiding cross-file pollution.
    """
    real_module = _load_real_shap_explainer_module()
    monkeypatch.setitem(sys.modules, 'shap_explainer', real_module)
    return real_module


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _fake_model_data():
    return {
        'model': FakeModel(),
        'label_encoder': FakeLabelEncoder(['neumonia', 'asma', 'epoc']),
        'vectorizer': FakeVectorizer(),
        'feature_engineer': None,
    }


class TestMlExplanationEndpoint:
    def test_returns_full_explanation_from_real_shap_pipeline(self, client, real_shap_module):
        fake_tree_explainer = MagicMock()
        fake_tree_explainer.shap_values.return_value = np.array([[0.4, -0.2, 0.1]])

        with patch.object(real_shap_module.joblib, 'load', return_value=_fake_model_data()), \
             patch.object(real_shap_module.shap, 'TreeExplainer', return_value=fake_tree_explainer):
            response = client.post(
                '/v1/ml-explanation',
                params={'symptoms': 'tos, fiebre', 'patient_age': 40},
            )

        assert response.status_code == 200
        data = response.json()

        assert data['prediction'] == 'neumonia'
        assert data['confidence'] == pytest.approx(0.7)
        assert len(data['top_3_predictions']) == 3
        assert set(data['explanation'].keys()) == {
            'positive_factors', 'negative_factors', 'decision_factors', 'explainability_score'
        }
        assert data['shap_values'] == pytest.approx([0.4, -0.2, 0.1])

    def test_falls_back_to_random_forest_model_when_xgboost_load_fails(self, client, real_shap_module):
        """Endpoint tries models/xgboost_model.pkl first; if that raises it
        must fall back to models/base_random_forest.pkl rather than failing."""
        fake_tree_explainer = MagicMock()
        fake_tree_explainer.shap_values.return_value = np.array([[0.4, -0.2, 0.1]])

        load_calls = {'count': 0}

        def load_side_effect(path):
            load_calls['count'] += 1
            if 'xgboost' in path:
                raise FileNotFoundError('xgboost model missing')
            return _fake_model_data()

        with patch.object(real_shap_module.joblib, 'load', side_effect=load_side_effect), \
             patch.object(real_shap_module.shap, 'TreeExplainer', return_value=fake_tree_explainer):
            response = client.post(
                '/v1/ml-explanation',
                params={'symptoms': 'tos, fiebre', 'patient_age': 40},
            )

        assert response.status_code == 200
        assert response.json()['prediction'] == 'neumonia'
        assert load_calls['count'] == 2

    def test_returns_500_when_both_models_fail_to_load(self, client, real_shap_module):
        with patch.object(real_shap_module.joblib, 'load', side_effect=FileNotFoundError('no model')):
            response = client.post(
                '/v1/ml-explanation',
                params={'symptoms': 'tos, fiebre', 'patient_age': 40},
            )

        assert response.status_code == 500
        assert 'Error generating explanation' in response.json()['detail']
