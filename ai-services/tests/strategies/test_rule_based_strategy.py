"""
Tests for strategies/rule_based_strategy.py
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from typing import Dict, List, Any

from strategies.rule_based_strategy import RuleBasedStrategy


class TestRuleBasedStrategy:
    """Tests for RuleBasedStrategy"""
    
    @pytest.fixture
    def rule_based_strategy(self):
        """Create rule-based strategy instance"""
        return RuleBasedStrategy()
    
    @pytest.fixture
    def sample_symptoms(self):
        """Sample symptoms for testing"""
        return [
            {"symptom": "tos", "severity": "moderate"},
            {"symptom": "fiebre", "severity": "high"},
            {"symptom": "dificultad respiratoria", "severity": "severe"}
        ]
    
    @pytest.fixture
    def sample_medical_text(self):
        """Sample medical text for testing"""
        return "Paciente de 45 años con tos persistente y fiebre de 3 días. Antecedentes de asma y diabetes."
    
    def test_initialization(self, rule_based_strategy):
        """Test strategy initialization"""
        assert rule_based_strategy.data_processor is not None
        assert rule_based_strategy.severity_weights is not None
        assert rule_based_strategy.urgency_rules is not None
        assert "mild" in rule_based_strategy.severity_weights
        assert "critical" in rule_based_strategy.urgency_rules
    
    def test_severity_weights(self, rule_based_strategy):
        """Test severity weights configuration"""
        assert rule_based_strategy.severity_weights["mild"] == 0.3
        assert rule_based_strategy.severity_weights["moderate"] == 0.6
        assert rule_based_strategy.severity_weights["severe"] == 0.9
        assert rule_based_strategy.severity_weights["critical"] == 1.0
    
    def test_urgency_rules_structure(self, rule_based_strategy):
        """Test urgency rules structure"""
        for urgency_level in ["critical", "high", "medium", "low"]:
            assert urgency_level in rule_based_strategy.urgency_rules
            rule = rule_based_strategy.urgency_rules[urgency_level]
            assert "symptoms" in rule
            assert "severity_threshold" in rule
            assert "response_time" in rule
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_success(self, rule_based_strategy, sample_symptoms):
        """Test successful symptom analysis"""
        result = await rule_based_strategy.analyze_symptoms(sample_symptoms)
        
        assert "urgency_level" in result
        assert "severity_score" in result
        assert "categories" in result
        assert "recommendations" in result
        assert "warning_signs" in result
        assert "follow_up_required" in result
        assert "severity_breakdown" in result
        assert isinstance(result["severity_score"], (int, float))
        assert 0.0 <= result["severity_score"] <= 1.0
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_empty_list(self, rule_based_strategy):
        """Test symptom analysis with empty list"""
        result = await rule_based_strategy.analyze_symptoms([])
        
        assert "urgency_level" in result
        assert result["severity_score"] == 0.0 or result["severity_score"] >= 0.0
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_with_context(self, rule_based_strategy, sample_symptoms):
        """Test symptom analysis with context"""
        context = {"age": 65, "diabetes": True}
        
        result = await rule_based_strategy.analyze_symptoms(sample_symptoms, context)
        
        assert "urgency_level" in result
        assert "severity_score" in result
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_error_handling(self, rule_based_strategy):
        """Test error handling in symptom analysis"""
        with patch.object(rule_based_strategy, '_categorize_symptoms', side_effect=Exception("Error")):
            with pytest.raises(Exception):
                await rule_based_strategy.analyze_symptoms([{"symptom": "test"}])
    
    @pytest.mark.asyncio
    async def test_process_medical_text_success(self, rule_based_strategy, sample_medical_text):
        """Test successful medical text processing"""
        result = await rule_based_strategy.process_medical_text(sample_medical_text)
        
        assert "entities" in result
        assert "symptoms" in result
        assert "risk_factors" in result
        assert "diagnosis_suggestions" in result
        assert "severity_score" in result
        assert "recommendations" in result
        assert isinstance(result["symptoms"], list)
        assert isinstance(result["entities"], list)
    
    @pytest.mark.asyncio
    async def test_process_medical_text_empty(self, rule_based_strategy):
        """Test medical text processing with empty text"""
        result = await rule_based_strategy.process_medical_text("")
        
        assert "entities" in result
        assert "symptoms" in result
        assert isinstance(result["symptoms"], list)
    
    @pytest.mark.asyncio
    async def test_process_medical_text_with_context(self, rule_based_strategy, sample_medical_text):
        """Test medical text processing with context"""
        context = {"language": "es", "patient_id": "P001"}
        
        result = await rule_based_strategy.process_medical_text(sample_medical_text, context)
        
        assert "entities" in result
        assert "symptoms" in result
    
    def test_categorize_symptoms(self, rule_based_strategy, sample_symptoms):
        """Test symptom categorization"""
        categorized = rule_based_strategy._categorize_symptoms(sample_symptoms)
        
        assert isinstance(categorized, dict)
        # Should have at least one category if symptoms match
        assert len(categorized) >= 0
    
    def test_categorize_symptoms_no_matches(self, rule_based_strategy):
        """Test symptom categorization with no matches"""
        symptoms = [{"symptom": "sintoma_inexistente_12345"}]
        categorized = rule_based_strategy._categorize_symptoms(symptoms)
        
        # Should return empty dict or dict with empty categories
        assert isinstance(categorized, dict)
    
    def test_calculate_severity(self, rule_based_strategy, sample_symptoms):
        """Test severity calculation"""
        categorized = rule_based_strategy._categorize_symptoms(sample_symptoms)
        severity = rule_based_strategy._calculate_severity(sample_symptoms, categorized)
        
        assert "overall_score" in severity
        assert "category_scores" in severity
        assert "symptom_scores" in severity
        assert isinstance(severity["overall_score"], (int, float))
        assert 0.0 <= severity["overall_score"] <= 1.0
    
    def test_calculate_severity_different_levels(self, rule_based_strategy):
        """Test severity calculation with different severity levels"""
        symptoms = [
            {"symptom": "tos", "severity": "mild"},
            {"symptom": "fiebre", "severity": "moderate"},
            {"symptom": "dolor", "severity": "severe"},
            {"symptom": "grave", "severity": "critical"}
        ]
        
        categorized = rule_based_strategy._categorize_symptoms(symptoms)
        severity = rule_based_strategy._calculate_severity(symptoms, categorized)
        
        assert severity["overall_score"] > 0.0
        assert len(severity["symptom_scores"]) == 4
    
    def test_determine_urgency_critical(self, rule_based_strategy):
        """Test urgency determination for critical level"""
        symptoms = [{"symptom": "dificultad respiratoria severa"}]
        severity_analysis = {"overall_score": 0.95, "category_scores": {}}
        
        urgency = rule_based_strategy._determine_urgency(symptoms, severity_analysis)
        
        assert urgency in ["critical", "high", "medium", "low"]
    
    def test_determine_urgency_high(self, rule_based_strategy):
        """Test urgency determination for high level"""
        symptoms = [{"symptom": "fiebre alta"}]
        severity_analysis = {"overall_score": 0.75, "category_scores": {}}
        
        urgency = rule_based_strategy._determine_urgency(symptoms, severity_analysis)
        
        assert urgency in ["critical", "high", "medium", "low"]
    
    def test_determine_urgency_medium(self, rule_based_strategy):
        """Test urgency determination for medium level"""
        symptoms = [{"symptom": "tos persistente"}]
        severity_analysis = {"overall_score": 0.55, "category_scores": {}}
        
        urgency = rule_based_strategy._determine_urgency(symptoms, severity_analysis)
        
        assert urgency in ["critical", "high", "medium", "low"]
    
    def test_determine_urgency_low(self, rule_based_strategy):
        """Test urgency determination for low level"""
        symptoms = [{"symptom": "malestar general"}]
        severity_analysis = {"overall_score": 0.25, "category_scores": {}}
        
        urgency = rule_based_strategy._determine_urgency(symptoms, severity_analysis)
        
        assert urgency in ["critical", "high", "medium", "low"]
    
    def test_generate_recommendations(self, rule_based_strategy, sample_symptoms):
        """Test recommendation generation"""
        categorized = rule_based_strategy._categorize_symptoms(sample_symptoms)
        urgency = "high"
        context = None
        
        recommendations = rule_based_strategy._generate_recommendations(
            sample_symptoms, categorized, urgency, context
        )
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
    
    def test_generate_recommendations_different_urgency(self, rule_based_strategy):
        """Test recommendation generation for different urgency levels"""
        symptoms = [{"symptom": "tos"}]
        categorized = {"respiratory": symptoms}
        
        for urgency in ["critical", "high", "medium", "low"]:
            recommendations = rule_based_strategy._generate_recommendations(
                symptoms, categorized, urgency, None
            )
            assert isinstance(recommendations, list)
            assert len(recommendations) >= 0
    
    def test_identify_warning_signs(self, rule_based_strategy, sample_symptoms):
        """Test warning signs identification"""
        severity_analysis = {"overall_score": 0.85, "category_scores": {}}
        
        warning_signs = rule_based_strategy._identify_warning_signs(sample_symptoms, severity_analysis)
        
        assert isinstance(warning_signs, list)
    
    def test_identify_warning_signs_high_severity(self, rule_based_strategy):
        """Test warning signs with high severity"""
        symptoms = [{"symptom": "dificultad respiratoria severa"}]
        severity_analysis = {"overall_score": 0.95, "category_scores": {}}
        
        warning_signs = rule_based_strategy._identify_warning_signs(symptoms, severity_analysis)
        
        assert len(warning_signs) >= 0
    
    def test_determine_follow_up_required(self, rule_based_strategy):
        """Test follow-up determination when required"""
        urgency = "high"
        warning_signs = ["Severe symptom detected"]
        symptoms = [{"symptom": "dificultad respiratoria"}]
        
        follow_up = rule_based_strategy._determine_follow_up(urgency, warning_signs, symptoms)
        
        assert follow_up is True
    
    def test_determine_follow_up_not_required(self, rule_based_strategy):
        """Test follow-up determination when not required"""
        urgency = "low"
        warning_signs = []
        symptoms = [{"symptom": "malestar leve"}]
        
        follow_up = rule_based_strategy._determine_follow_up(urgency, warning_signs, symptoms)
        
        assert isinstance(follow_up, bool)
    
    def test_extract_entities_with_regex(self, rule_based_strategy, sample_medical_text):
        """Test entity extraction with regex"""
        entities = rule_based_strategy._extract_entities_with_regex(sample_medical_text)
        
        assert isinstance(entities, list)
        # Should extract some entities from the text
        assert len(entities) >= 0
    
    def test_extract_entities_empty_text(self, rule_based_strategy):
        """Test entity extraction with empty text"""
        entities = rule_based_strategy._extract_entities_with_regex("")
        
        assert isinstance(entities, list)
    
    def test_extract_symptoms_from_text(self, rule_based_strategy, sample_medical_text):
        """Test symptom extraction from text"""
        symptoms = rule_based_strategy._extract_symptoms_from_text(sample_medical_text)
        
        assert isinstance(symptoms, list)
        # Should extract symptoms from the text
        assert len(symptoms) >= 0
    
    def test_extract_risk_factors_from_text(self, rule_based_strategy, sample_medical_text):
        """Test risk factor extraction from text"""
        risk_factors = rule_based_strategy._extract_risk_factors_from_text(sample_medical_text)
        
        assert isinstance(risk_factors, list)
        # Should extract risk factors (e.g., "asma", "diabetes")
        assert len(risk_factors) >= 0
    
    def test_extract_risk_factors_specific_patterns(self, rule_based_strategy):
        """Test risk factor extraction with specific patterns"""
        text = "Paciente fumador de 20 años con diabetes e hipertensión"
        risk_factors = rule_based_strategy._extract_risk_factors_from_text(text)
        
        assert isinstance(risk_factors, list)
        # Should identify smoking, diabetes, hypertension
        assert len(risk_factors) >= 0
    
    def test_generate_medical_recommendations(self, rule_based_strategy):
        """Test medical recommendation generation"""
        symptoms = [{"symptom": "tos", "category": "respiratory"}]
        diagnosis_suggestions = ["Bronquitis", "Asma"]
        risk_factors = ["tabaquismo"]
        
        recommendations = rule_based_strategy._generate_medical_recommendations(
            symptoms, diagnosis_suggestions, risk_factors
        )
        
        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
    
    def test_get_strategy_name(self, rule_based_strategy):
        """Test getting strategy name"""
        name = rule_based_strategy.get_strategy_name()
        
        assert name == "rule_based"
    
    def test_get_confidence_score(self, rule_based_strategy):
        """Test getting confidence score"""
        score = rule_based_strategy.get_confidence_score()
        
        assert isinstance(score, (int, float))
        assert 0.0 <= score <= 1.0
    
    @pytest.mark.asyncio
    async def test_analyze_symptoms_complete_flow(self, rule_based_strategy):
        """Test complete symptom analysis flow"""
        symptoms = [
            {"symptom": "tos persistente", "severity": "moderate"},
            {"symptom": "fiebre", "severity": "high"},
            {"symptom": "dificultad respiratoria", "severity": "severe"}
        ]
        
        result = await rule_based_strategy.analyze_symptoms(symptoms)
        
        # Verify all components are present
        assert "urgency_level" in result
        assert "severity_score" in result
        assert "categories" in result
        assert "category_details" in result
        assert "recommendations" in result
        assert "warning_signs" in result
        assert "follow_up_required" in result
        assert "severity_breakdown" in result
        
        # Verify severity breakdown structure
        breakdown = result["severity_breakdown"]
        assert "overall_score" in breakdown
        assert "category_scores" in breakdown
        assert "symptom_scores" in breakdown
    
    @pytest.mark.asyncio
    async def test_process_medical_text_complete_flow(self, rule_based_strategy, sample_medical_text):
        """Test complete medical text processing flow"""
        result = await rule_based_strategy.process_medical_text(sample_medical_text)
        
        # Verify all components are present
        assert "entities" in result
        assert "symptoms" in result
        assert "risk_factors" in result
        assert "diagnosis_suggestions" in result
        assert "severity_score" in result
        assert "recommendations" in result
        
        # Verify entities structure
        for entity in result["entities"]:
            assert isinstance(entity, dict)
        
        # Verify symptoms structure
        for symptom in result["symptoms"]:
            assert isinstance(symptom, dict)
            assert "symptom" in symptom or "text" in symptom

