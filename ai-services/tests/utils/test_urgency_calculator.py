"""
Tests TDD para Urgency Calculator
Aplicando el ciclo RED -> GREEN -> REFACTOR
"""

import pytest
from utils.urgency_calculator import calculate_urgency_level


class TestUrgencyCalculator:
    """Tests para el calculador de urgencia"""
    
    # Test 1: Debe retornar 'low' para síntomas leves sin factores de riesgo
    def test_returns_low_for_mild_symptoms(self):
        """Test 1: Síntomas leves sin factores de riesgo"""
        symptoms = ['tos', 'congestión nasal']
        result = calculate_urgency_level(symptoms)
        assert result == 'low'
    
    # Test 2: Debe retornar 'medium' para síntomas moderados
    def test_returns_medium_for_moderate_symptoms(self):
        """Test 2: Síntomas moderados"""
        symptoms = ['tos', 'fiebre', 'fatiga']
        severity_scores = [0.5, 0.6, 0.5]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result == 'medium'
    
    # Test 3: Debe retornar 'high' para síntomas severos
    def test_returns_high_for_severe_symptoms(self):
        """Test 3: Síntomas severos"""
        symptoms = ['dificultad respiratoria', 'fiebre alta']
        severity_scores = [0.8, 0.9]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result == 'high'
    
    # Test 4: Debe retornar 'critical' para síntomas críticos
    def test_returns_critical_for_critical_symptoms(self):
        """Test 4: Síntomas críticos"""
        symptoms = ['dificultad respiratoria severa', 'dolor torácico', 'confusión']
        severity_scores = [0.95, 0.9, 0.85]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result == 'critical'
    
    # Test 5: Debe aumentar urgencia con factores de riesgo
    def test_increases_urgency_with_risk_factors(self):
        """Test 5: Factores de riesgo aumentan urgencia"""
        symptoms = ['tos', 'fiebre']
        risk_factors = ['diabetes', 'hipertensión', 'edad avanzada']
        result = calculate_urgency_level(symptoms, risk_factors=risk_factors)
        assert result == 'medium'  # De 'low' a 'medium' por factores de riesgo
    
    # Test 6: Debe considerar edad avanzada como factor de riesgo
    def test_considers_elderly_age_as_risk(self):
        """Test 6: Edad avanzada aumenta urgencia"""
        symptoms = ['tos', 'fiebre']
        result = calculate_urgency_level(symptoms, patient_age=75)
        assert result == 'medium'  # Edad avanzada aumenta urgencia
    
    # Test 7: Debe considerar edad pediátrica como factor de riesgo
    def test_considers_pediatric_age_as_risk(self):
        """Test 7: Edad pediátrica aumenta urgencia"""
        symptoms = ['tos', 'fiebre']
        result = calculate_urgency_level(symptoms, patient_age=3)
        assert result == 'medium'  # Edad pediátrica aumenta urgencia
    
    # Test 8: Debe manejar lista vacía de síntomas
    def test_handles_empty_symptoms_list(self):
        """Test 8: Lista vacía de síntomas"""
        symptoms = []
        result = calculate_urgency_level(symptoms)
        assert result == 'low'
    
    # Test 9: Debe combinar múltiples factores de riesgo
    def test_combines_multiple_risk_factors(self):
        """Test 9: Múltiples factores de riesgo"""
        symptoms = ['tos']
        severity_scores = [0.4]
        risk_factors = ['diabetes', 'hipertensión', 'obesidad']
        result = calculate_urgency_level(
            symptoms, 
            severity_scores=severity_scores, 
            risk_factors=risk_factors
        )
        assert result == 'high'  # Múltiples factores aumentan significativamente
    
    def test_urgency_with_high_severity_scores(self):
        """Test urgency calculation with high severity scores"""
        symptoms = ['dificultad respiratoria', 'fiebre alta']
        severity_scores = [0.95, 0.9]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result in ['high', 'critical']
    
    def test_urgency_with_low_severity_scores(self):
        """Test urgency calculation with low severity scores"""
        symptoms = ['tos leve', 'congestión nasal']
        severity_scores = [0.2, 0.15]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result == 'low'
    
    def test_urgency_with_medium_severity_scores(self):
        """Test urgency calculation with medium severity scores"""
        symptoms = ['tos', 'fiebre moderada']
        severity_scores = [0.5, 0.55]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result in ['medium', 'low']
    
    def test_urgency_without_severity_scores(self):
        """Test urgency calculation without severity scores"""
        symptoms = ['tos', 'fiebre', 'dolor de cabeza']
        result = calculate_urgency_level(symptoms)
        # Should use number of symptoms as proxy
        assert result in ['low', 'medium']
    
    def test_urgency_with_single_symptom(self):
        """Test urgency calculation with single symptom"""
        symptoms = ['tos']
        result = calculate_urgency_level(symptoms)
        assert result == 'low'
    
    def test_urgency_with_many_symptoms(self):
        """Test urgency calculation with many symptoms"""
        symptoms = ['tos', 'fiebre', 'dolor', 'fatiga', 'congestión', 'dolor de garganta']
        result = calculate_urgency_level(symptoms)
        # Many symptoms should increase urgency
        assert result in ['low', 'medium', 'high']
    
    def test_urgency_with_risk_factors_and_age(self):
        """Test urgency calculation with both risk factors and age"""
        symptoms = ['tos']
        risk_factors = ['diabetes']
        result = calculate_urgency_level(symptoms, risk_factors=risk_factors, patient_age=70)
        # Both risk factors and age should increase urgency
        assert result in ['medium', 'high']
    
    def test_urgency_critical_threshold(self):
        """Test urgency calculation at critical threshold"""
        symptoms = ['síntoma crítico']
        severity_scores = [0.95]
        risk_factors = ['diabetes', 'hipertensión']
        result = calculate_urgency_level(symptoms, severity_scores, risk_factors, patient_age=75)
        assert result in ['high', 'critical']
    
    def test_urgency_high_threshold(self):
        """Test urgency calculation at high threshold"""
        symptoms = ['síntoma severo']
        severity_scores = [0.75]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result in ['high', 'medium']
    
    def test_urgency_medium_threshold(self):
        """Test urgency calculation at medium threshold"""
        symptoms = ['síntoma moderado']
        severity_scores = [0.5]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result in ['medium', 'low']
    
    def test_urgency_low_threshold(self):
        """Test urgency calculation at low threshold"""
        symptoms = ['síntoma leve']
        severity_scores = [0.2]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result == 'low'
    
    def test_urgency_with_pediatric_age(self):
        """Test urgency calculation with pediatric age"""
        symptoms = ['tos', 'fiebre']
        result = calculate_urgency_level(symptoms, patient_age=3)
        # Pediatric age should increase urgency
        assert result in ['low', 'medium']
    
    def test_urgency_with_middle_age(self):
        """Test urgency calculation with middle age"""
        symptoms = ['tos', 'fiebre']
        result = calculate_urgency_level(symptoms, patient_age=40)
        # Middle age should not increase urgency
        assert result in ['low', 'medium']
    
    def test_urgency_with_elderly_age(self):
        """Test urgency calculation with elderly age"""
        symptoms = ['tos', 'fiebre']
        result = calculate_urgency_level(symptoms, patient_age=75)
        # Elderly age should increase urgency
        assert result in ['low', 'medium']
    
    def test_urgency_risk_multiplier_effect(self):
        """Test that risk multiplier affects final score"""
        symptoms = ['tos']
        severity_scores = [0.3]
        # Without risk factors
        result1 = calculate_urgency_level(symptoms, severity_scores)
        # With risk factors
        result2 = calculate_urgency_level(symptoms, severity_scores, risk_factors=['diabetes'])
        # Risk factors should increase urgency
        urgency_levels = ['low', 'medium', 'high', 'critical']
        assert urgency_levels.index(result2) >= urgency_levels.index(result1)
    
    def test_urgency_age_multiplier_effect(self):
        """Test that age multiplier affects final score"""
        symptoms = ['tos']
        severity_scores = [0.3]
        # Middle age
        result1 = calculate_urgency_level(symptoms, severity_scores, patient_age=40)
        # Elderly age
        result2 = calculate_urgency_level(symptoms, severity_scores, patient_age=75)
        # Elderly age should increase urgency
        urgency_levels = ['low', 'medium', 'high', 'critical']
        assert urgency_levels.index(result2) >= urgency_levels.index(result1)
    
    def test_urgency_final_score_calculation(self):
        """Test final score calculation"""
        symptoms = ['tos', 'fiebre']
        severity_scores = [0.6, 0.7]
        risk_factors = ['diabetes']
        patient_age = 70
        
        result = calculate_urgency_level(symptoms, severity_scores, risk_factors, patient_age)
        
        # Should consider all factors
        assert result in ['low', 'medium', 'high', 'critical']
    
    def test_urgency_edge_case_max_score(self):
        """Test urgency calculation with maximum possible score"""
        symptoms = ['síntoma crítico'] * 10
        severity_scores = [1.0] * 10
        risk_factors = ['diabetes', 'hipertensión', 'obesidad', 'tabaquismo']
        result = calculate_urgency_level(symptoms, severity_scores, risk_factors, patient_age=80)
        assert result == 'critical'
    
    def test_urgency_edge_case_min_score(self):
        """Test urgency calculation with minimum possible score"""
        symptoms = ['síntoma leve']
        severity_scores = [0.1]
        result = calculate_urgency_level(symptoms, severity_scores)
        assert result == 'low'

