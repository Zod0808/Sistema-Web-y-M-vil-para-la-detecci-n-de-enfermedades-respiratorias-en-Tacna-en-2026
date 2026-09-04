"""
Unit tests for SHAPDiseaseExplainer (RF-006: Explicabilidad SHAP)

Cierra el gap documentado en Documentation/pruebas/Catalogo_de_Pruebas_RespiCare.xlsx (CP-006):
previamente solo existía cobertura de la capa de presentación (patient_friendly_explainer),
sin prueba del módulo núcleo shap_explainer.py.
"""

import importlib.util
import os

import numpy as np
import pytest
from unittest.mock import MagicMock, patch

# conftest.py registers a lightweight stub at sys.modules['shap_explainer'] so other
# suites (e.g. test_symptom_ml_analyzer_endpoints.py) can run without the real ML
# dependencies. This suite targets the real module, so load the actual source file
# under a private name instead of touching that shared sys.modules entry.
_module_spec = importlib.util.spec_from_file_location(
    'shap_explainer_under_test',
    os.path.join(os.path.dirname(__file__), '..', '..', 'shap_explainer.py'),
)
_shap_explainer = importlib.util.module_from_spec(_module_spec)
_module_spec.loader.exec_module(_shap_explainer)

SHAPDiseaseExplainer = _shap_explainer.SHAPDiseaseExplainer


class FakeLabelEncoder:
    """Mimics sklearn LabelEncoder.inverse_transform for a fixed class list"""

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
    """Mimics a binary/multi-class sklearn-like classifier"""

    def __init__(self, prediction_idx=0, proba=(0.7, 0.2, 0.1)):
        self.prediction_idx = prediction_idx
        self.proba = np.array(proba)
        self.feature_importances_ = np.array([0.5, 0.3, 0.2])

    def predict(self, X):
        return np.array([self.prediction_idx])

    def predict_proba(self, X):
        return np.array([self.proba])


@pytest.fixture
def explainer():
    return SHAPDiseaseExplainer()


@pytest.fixture
def loaded_explainer(explainer, tmp_path):
    """Explainer with a model loaded via a mocked joblib.load / shap.TreeExplainer"""
    model = FakeModel()
    label_encoder = FakeLabelEncoder(['neumonia', 'asma', 'epoc'])
    vectorizer = FakeVectorizer()

    fake_data = {
        'model': model,
        'label_encoder': label_encoder,
        'vectorizer': vectorizer,
        'feature_engineer': None,
    }

    fake_shap_explainer = MagicMock()
    fake_shap_explainer.shap_values.return_value = np.array([[0.4, -0.2, 0.1]])

    with patch.object(_shap_explainer.joblib, 'load', return_value=fake_data), \
         patch.object(_shap_explainer.shap, 'TreeExplainer', return_value=fake_shap_explainer):
        explainer.load_model('models/fake_model.pkl')

    return explainer


class TestInit:
    def test_init_without_model_path_does_not_load(self, explainer):
        assert explainer.model is None
        assert explainer.explainer is None
        assert explainer.feature_names == []

    def test_init_with_model_path_loads_model(self, tmp_path):
        model = FakeModel()
        fake_data = {
            'model': model,
            'label_encoder': FakeLabelEncoder(['neumonia']),
            'vectorizer': FakeVectorizer(),
            'feature_engineer': None,
        }
        with patch.object(_shap_explainer.joblib, 'load', return_value=fake_data), \
             patch.object(_shap_explainer.shap, 'TreeExplainer', return_value=MagicMock()):
            loaded = SHAPDiseaseExplainer('models/fake_model.pkl')

        assert loaded.model is model


class TestLoadModel:
    def test_load_model_sets_feature_names_from_vectorizer(self, loaded_explainer):
        assert loaded_explainer.feature_names == ['tos', 'fiebre', 'fatiga']

    def test_load_model_creates_shap_tree_explainer(self, explainer):
        fake_data = {
            'model': FakeModel(),
            'label_encoder': FakeLabelEncoder(['neumonia']),
            'vectorizer': FakeVectorizer(),
            'feature_engineer': None,
        }
        with patch.object(_shap_explainer.joblib, 'load', return_value=fake_data), \
             patch.object(_shap_explainer.shap, 'TreeExplainer', return_value='tree-explainer-instance') as mock_tree:
            explainer.load_model('models/fake_model.pkl')

        mock_tree.assert_called_once_with(fake_data['model'])
        assert explainer.explainer == 'tree-explainer-instance'


class TestExplainPrediction:
    def test_returns_error_when_model_not_loaded(self, explainer):
        result = explainer.explain_prediction('tos, fiebre')
        assert result == {'error': 'Model not loaded'}

    def test_explain_prediction_returns_expected_structure(self, loaded_explainer):
        result = loaded_explainer.explain_prediction('tos, fiebre', patient_age=40)

        assert result['disease'] == 'neumonia'
        assert result['confidence'] == pytest.approx(0.7)
        assert 'explanation' in result
        assert set(result['explanation'].keys()) == {
            'positive_factors', 'negative_factors', 'decision_factors', 'explainability_score'
        }
        assert result['explanation']['explainability_score'] == 1.0

    def test_explain_prediction_splits_positive_and_negative_factors(self, loaded_explainer):
        result = loaded_explainer.explain_prediction('tos, fiebre')

        positive_names = {f['feature_name'] for f in result['explanation']['positive_factors']}
        negative_names = {f['feature_name'] for f in result['explanation']['negative_factors']}

        assert 'tos' in positive_names
        assert 'fatiga' in positive_names
        assert 'fiebre' in negative_names

    def test_explain_prediction_orders_contributions_by_importance(self, loaded_explainer):
        result = loaded_explainer.explain_prediction('tos, fiebre')

        importances = [f['feature_importance'] for f in result['explanation']['decision_factors']]
        assert importances == sorted(importances, reverse=True)

    def test_explain_prediction_returns_top_3_predictions(self, loaded_explainer):
        result = loaded_explainer.explain_prediction('tos, fiebre')

        assert len(result['top_3_predictions']) == 3
        diseases = [p['disease'] for p in result['top_3_predictions']]
        assert diseases[0] == 'neumonia'  # highest proba (0.7) first

    def test_explain_prediction_includes_raw_shap_values(self, loaded_explainer):
        result = loaded_explainer.explain_prediction('tos, fiebre')

        assert result['shap_values'] == pytest.approx([0.4, -0.2, 0.1])


class TestExplainBatch:
    def test_explain_batch_returns_one_explanation_per_symptom_set(self, loaded_explainer):
        results = loaded_explainer.explain_batch(['tos, fiebre', 'fatiga, tos'])

        assert len(results) == 2
        assert all('disease' in r for r in results)

    def test_explain_batch_defaults_patient_age_when_not_provided(self, loaded_explainer):
        results = loaded_explainer.explain_batch(['tos, fiebre'])

        assert len(results) == 1
        assert results[0]['disease'] == 'neumonia'


class TestFeatureImportanceSummary:
    def test_returns_error_when_model_not_loaded(self, explainer):
        result = explainer.get_feature_importance_summary()
        assert result == {'error': 'Model not loaded'}

    def test_returns_top_features_sorted_by_importance(self, loaded_explainer):
        summary = loaded_explainer.get_feature_importance_summary(top_n=2)

        assert summary['total_features'] == 3
        assert len(summary['most_important_features']) == 2
        assert summary['most_important_features'][0]['importance'] == pytest.approx(0.5)
