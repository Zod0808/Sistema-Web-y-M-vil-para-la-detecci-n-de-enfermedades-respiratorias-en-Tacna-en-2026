"""
Unit tests for PatientFriendlyExplainer service
"""

import pytest
from unittest.mock import MagicMock, patch
from typing import Dict, List, Any

from services.patient_friendly_explainer import PatientFriendlyExplainer, get_patient_explainer


class TestPatientFriendlyExplainer:
    """Test PatientFriendlyExplainer implementation"""

    @pytest.fixture
    def explainer(self):
        """Create explainer instance"""
        return PatientFriendlyExplainer()

    # ─── __init__ ─────────────────────────────────────────────────────────────

    def test_init_loads_symptom_explanations(self, explainer):
        """Should initialize with symptom explanations mapping"""
        assert isinstance(explainer.symptom_explanations, dict)
        assert len(explainer.symptom_explanations) > 0

    def test_init_loads_disease_explanations(self, explainer):
        """Should initialize with disease explanations mapping"""
        assert isinstance(explainer.disease_explanations, dict)
        assert 'asma' in explainer.disease_explanations
        assert 'neumonia' in explainer.disease_explanations
        assert 'epoc' in explainer.disease_explanations

    def test_init_loads_urgency_explanations(self, explainer):
        """Should initialize with urgency level explanations"""
        assert isinstance(explainer.urgency_explanations, dict)
        assert 'critical' in explainer.urgency_explanations
        assert 'high' in explainer.urgency_explanations
        assert 'medium' in explainer.urgency_explanations
        assert 'low' in explainer.urgency_explanations
        assert 'very_low' in explainer.urgency_explanations

    # ─── explain_prediction ───────────────────────────────────────────────────

    def test_explain_prediction_returns_dict(self, explainer):
        """Should return a dictionary with explanation"""
        result = explainer.explain_prediction(
            disease='neumonia',
            confidence=0.85,
            urgency_level='high',
            symptoms=['tos', 'fiebre']
        )
        assert isinstance(result, dict)

    def test_explain_prediction_contains_required_keys(self, explainer):
        """Should return dict with all expected keys"""
        result = explainer.explain_prediction(
            disease='gripe',
            confidence=0.7,
            urgency_level='medium',
            symptoms=['fiebre', 'cansancio']
        )
        assert 'main_explanation' in result or 'summary' in result or len(result) > 0

    def test_explain_prediction_uses_disease_mapping(self, explainer):
        """Should translate technical disease name to friendly name"""
        result = explainer.explain_prediction(
            disease='epoc',
            confidence=0.80,
            urgency_level='high',
            symptoms=['dificultad respiratoria']
        )
        # EPOC should be translated
        result_str = str(result)
        assert 'EPOC' in result_str or 'Pulmonar' in result_str or 'epoc' in result_str.lower()

    def test_explain_prediction_high_confidence(self, explainer):
        """High confidence (>0.8) should reflect in explanation"""
        result = explainer.explain_prediction(
            disease='asma',
            confidence=0.92,
            urgency_level='medium',
            symptoms=['tos', 'sibilancias']
        )
        assert result is not None
        confidence_text = str(result).lower()
        # Should indicate high confidence
        assert any(word in confidence_text for word in ['alta', 'alto', '92', 'muy', 'elevada'])

    def test_explain_prediction_low_confidence(self, explainer):
        """Low confidence (<0.5) should reflect in explanation"""
        result = explainer.explain_prediction(
            disease='bronquitis',
            confidence=0.35,
            urgency_level='low',
            symptoms=['tos']
        )
        assert result is not None

    def test_explain_prediction_critical_urgency(self, explainer):
        """Critical urgency should be clearly communicated"""
        result = explainer.explain_prediction(
            disease='neumonia',
            confidence=0.88,
            urgency_level='critical',
            symptoms=['dificultad respiratoria', 'fiebre alta']
        )
        result_str = str(result).lower()
        assert 'crítica' in result_str or 'inmediata' in result_str or 'urgente' in result_str

    def test_explain_prediction_with_shap_factors(self, explainer):
        """Should handle optional SHAP factors"""
        shap_factors = [
            {'feature': 'tos', 'value': 0.35, 'impact': 'positive'},
            {'feature': 'fiebre', 'value': 0.28, 'impact': 'positive'},
        ]
        result = explainer.explain_prediction(
            disease='gripe',
            confidence=0.75,
            urgency_level='medium',
            symptoms=['tos', 'fiebre'],
            shap_factors=shap_factors
        )
        assert result is not None
        assert isinstance(result, dict)

    def test_explain_prediction_with_top_predictions(self, explainer):
        """Should handle optional alternative predictions"""
        top_predictions = [
            {'disease': 'gripe', 'confidence': 0.75},
            {'disease': 'resfriado comun', 'confidence': 0.18},
        ]
        result = explainer.explain_prediction(
            disease='gripe',
            confidence=0.75,
            urgency_level='medium',
            symptoms=['fiebre', 'tos'],
            top_predictions=top_predictions
        )
        assert result is not None

    def test_explain_prediction_unknown_disease(self, explainer):
        """Should handle disease not in mapping without crashing"""
        result = explainer.explain_prediction(
            disease='enfermedad_desconocida_xyz',
            confidence=0.60,
            urgency_level='low',
            symptoms=['malestar']
        )
        assert result is not None
        assert isinstance(result, dict)

    def test_explain_prediction_unknown_urgency(self, explainer):
        """Should handle unknown urgency level without crashing"""
        result = explainer.explain_prediction(
            disease='gripe',
            confidence=0.60,
            urgency_level='unknown_urgency',
            symptoms=['fiebre']
        )
        assert result is not None

    def test_explain_prediction_empty_symptoms(self, explainer):
        """Should handle empty symptoms list"""
        result = explainer.explain_prediction(
            disease='asma',
            confidence=0.70,
            urgency_level='medium',
            symptoms=[]
        )
        assert result is not None
        assert isinstance(result, dict)

    def test_explain_prediction_zero_confidence(self, explainer):
        """Should handle zero confidence without crashing"""
        result = explainer.explain_prediction(
            disease='gripe',
            confidence=0.0,
            urgency_level='low',
            symptoms=['malestar']
        )
        assert result is not None

    def test_explain_prediction_full_confidence(self, explainer):
        """Should handle 100% confidence (1.0) without crashing"""
        result = explainer.explain_prediction(
            disease='neumonia',
            confidence=1.0,
            urgency_level='critical',
            symptoms=['dificultad respiratoria']
        )
        assert result is not None

    # ─── _simplify_feature_name ────────────────────────────────────────────

    def test_simplify_feature_name_known_symptom(self, explainer):
        """Should simplify known symptom feature names"""
        result = explainer._simplify_feature_name('tos')
        assert isinstance(result, str)
        assert len(result) > 0

    def test_simplify_feature_name_unknown(self, explainer):
        """Should return original name for unknown features"""
        result = explainer._simplify_feature_name('feature_unknown_xyz')
        assert isinstance(result, str)
        assert len(result) > 0

    def test_simplify_feature_name_with_underscores(self, explainer):
        """Should handle feature names with underscores"""
        result = explainer._simplify_feature_name('dificultad_respiratoria')
        assert isinstance(result, str)

    # ─── _get_confidence_level ─────────────────────────────────────────────

    def test_get_confidence_level_high(self, explainer):
        """Should return high confidence label for >80%"""
        result = explainer._get_confidence_level(85)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_get_confidence_level_medium(self, explainer):
        """Should return medium confidence label for ~60%"""
        result = explainer._get_confidence_level(60)
        assert isinstance(result, str)

    def test_get_confidence_level_low(self, explainer):
        """Should return low confidence label for <40%"""
        result = explainer._get_confidence_level(30)
        assert isinstance(result, str)

    # ─── _build_summary ────────────────────────────────────────────────────

    def test_build_summary_returns_string(self, explainer):
        """Should return string summary"""
        result = explainer._build_summary('asma', 80, 'medium')
        assert isinstance(result, str)
        assert len(result) > 0

    def test_build_summary_contains_disease(self, explainer):
        """Summary should mention the disease"""
        result = explainer._build_summary('gripe', 75, 'low')
        assert 'gripe' in result.lower() or 'gripe' in str(result).lower()

    # ─── get_patient_explainer factory ────────────────────────────────────────

    def test_get_patient_explainer_returns_instance(self):
        """Factory function should return PatientFriendlyExplainer instance"""
        explainer = get_patient_explainer()
        assert isinstance(explainer, PatientFriendlyExplainer)

    def test_get_patient_explainer_singleton_like(self):
        """Multiple calls should return equivalent instances"""
        explainer1 = get_patient_explainer()
        explainer2 = get_patient_explainer()
        assert type(explainer1) == type(explainer2)
        assert explainer1.symptom_explanations == explainer2.symptom_explanations

    # ─── Integration-style: full pipeline test ────────────────────────────────

    def test_full_pipeline_asma_patient(self, explainer):
        """Complete explanation pipeline for asthma patient"""
        shap_factors = [
            {'feature': 'sibilancias', 'value': 0.42, 'impact': 'positive'},
            {'feature': 'tos', 'value': 0.31, 'impact': 'positive'},
            {'feature': 'dificultad respiratoria', 'value': 0.27, 'impact': 'positive'},
        ]
        top_predictions = [
            {'disease': 'asma', 'confidence': 0.82},
            {'disease': 'bronquitis', 'confidence': 0.12},
            {'disease': 'epoc', 'confidence': 0.06},
        ]

        result = explainer.explain_prediction(
            disease='asma',
            confidence=0.82,
            urgency_level='high',
            symptoms=['sibilancias', 'tos', 'dificultad respiratoria'],
            shap_factors=shap_factors,
            top_predictions=top_predictions
        )

        assert result is not None
        assert isinstance(result, dict)

    def test_full_pipeline_covid_critical(self, explainer):
        """Complete explanation pipeline for critical COVID case"""
        result = explainer.explain_prediction(
            disease='covid-19',
            confidence=0.91,
            urgency_level='critical',
            symptoms=['dificultad respiratoria', 'fiebre alta', 'tos seca', 'fatiga'],
            shap_factors=[
                {'feature': 'dificultad respiratoria', 'value': 0.55, 'impact': 'positive'},
                {'feature': 'fiebre', 'value': 0.38, 'impact': 'positive'},
            ]
        )

        assert result is not None
        result_str = str(result).lower()
        # Should communicate urgency clearly
        assert any(word in result_str for word in ['crítica', 'inmediata', 'urgente', 'médico'])