"""
Tests for api/routes/symptom_ml_analyzer.py

Focus: RF-005 medical coherence validation is applied to every real prediction
returned by POST /v1/ml-analyze (the endpoint actually consumed by the patient),
not just inside the offline training script.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.symptom_ml_analyzer import router, _apply_medical_validation, SymptomMLOutput


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


class TestApplyMedicalValidation:
    def test_adjusts_confidence_and_flags_incoherent_prediction(self):
        response = SymptomMLOutput(disease='neumonia', confidence=0.9, urgency_level='medium')

        validated = _apply_medical_validation(response, symptoms_str='dolor de cabeza', patient_age=40)

        assert validated.is_clinically_coherent is False
        assert validated.coherence_warnings != []
        assert validated.confidence == pytest.approx(0.75)

    def test_leaves_coherent_prediction_untouched(self):
        response = SymptomMLOutput(disease='neumonia', confidence=0.9, urgency_level='medium')

        validated = _apply_medical_validation(response, symptoms_str='fiebre, tos', patient_age=40)

        assert validated.is_clinically_coherent is True
        assert validated.coherence_warnings == []
        assert validated.confidence == pytest.approx(0.9)

    def test_confidence_never_drops_below_zero(self):
        response = SymptomMLOutput(disease='bronquiolitis', confidence=0.1, urgency_level='low')

        validated = _apply_medical_validation(response, symptoms_str='tos', patient_age=80)

        assert validated.confidence == 0.0


class TestMlAnalyzeEndpoint:
    """Uses the global shap_explainer mock registered in tests/conftest.py
    (disease='resfriado', confidence=0.8) via the non-ensemble fallback path."""

    def test_incoherent_prediction_lowers_confidence_and_reports_warnings(self, client):
        response = client.post(
            '/v1/ml-analyze?use_ensemble=false',
            json={'symptoms': ['tos'], 'patient_age': 30}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['disease'] == 'resfriado'
        assert data['is_clinically_coherent'] is False
        assert data['coherence_warnings'] != []
        assert data['confidence'] == pytest.approx(0.65)

    def test_coherent_prediction_keeps_original_confidence(self, client):
        response = client.post(
            '/v1/ml-analyze?use_ensemble=false',
            json={'symptoms': ['congestión nasal'], 'patient_age': 30}
        )

        assert response.status_code == 200
        data = response.json()
        assert data['disease'] == 'resfriado'
        assert data['is_clinically_coherent'] is True
        assert data['coherence_warnings'] == []
        assert data['confidence'] == pytest.approx(0.8)
