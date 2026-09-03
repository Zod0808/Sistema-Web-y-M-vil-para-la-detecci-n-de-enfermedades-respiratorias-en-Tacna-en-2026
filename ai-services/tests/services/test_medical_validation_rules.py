"""
Tests for services/medical_validation_rules.py (RF-005: coherencia médica)
"""

import pytest

from services.medical_validation_rules import MedicalValidationRules


class TestMedicalValidationRules:
    @pytest.fixture
    def validator(self):
        return MedicalValidationRules()

    def test_valid_prediction_has_no_warnings(self, validator):
        result = validator.validate_prediction(
            disease='asma',
            symptoms='sibilancias, dificultad respiratoria, tos',
            age=30
        )

        assert result['is_valid'] is True
        assert result['warnings'] == []
        assert result['confidence_adjustment'] == 0.0

    def test_missing_required_symptoms_lowers_confidence(self, validator):
        result = validator.validate_prediction(
            disease='neumonia',
            symptoms='dolor de cabeza',
            age=40
        )

        assert result['is_valid'] is False
        assert result['confidence_adjustment'] == pytest.approx(-0.15)
        assert any('neumonia' in warning for warning in result['warnings'])

    def test_age_outside_typical_range_lowers_confidence(self, validator):
        result = validator.validate_prediction(
            disease='bronquiolitis',
            symptoms='tos, dificultad respiratoria',
            age=45
        )

        assert result['is_valid'] is False
        assert result['confidence_adjustment'] == pytest.approx(-0.2)
        assert any('45' in warning for warning in result['warnings'])

    def test_age_within_typical_range_has_no_age_warning(self, validator):
        result = validator.validate_prediction(
            disease='bronquiolitis',
            symptoms='tos',
            age=1
        )

        assert not any('típicamente presenta en edad' in warning for warning in result['warnings'])

    def test_combined_age_and_symptom_warnings_stack_adjustment(self, validator):
        result = validator.validate_prediction(
            disease='enfisema',
            symptoms='fiebre',
            age=20
        )

        # enfisema tiene restricción de edad (50-100) pero no síntomas requeridos definidos
        assert result['is_valid'] is False
        assert result['confidence_adjustment'] == pytest.approx(-0.2)

    def test_disease_not_covered_by_rules_is_valid(self, validator):
        result = validator.validate_prediction(
            disease='alergia estacional',
            symptoms='estornudos',
            age=25
        )

        assert result['is_valid'] is True
        assert result['confidence_adjustment'] == 0.0
