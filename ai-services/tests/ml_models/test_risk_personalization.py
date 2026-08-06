"""
Unit tests for RiskPersonalizationSystem
"""

import pytest
from ml_models.risk_personalization import (
    RiskPersonalizationSystem,
    AgeGroup,
    RiskLevel
)


class TestRiskPersonalizationSystem:
    """Test RiskPersonalizationSystem implementation"""
    
    @pytest.fixture
    def personalization_system(self):
        """Create personalization system instance"""
        return RiskPersonalizationSystem()
    
    def test_get_age_group(self, personalization_system):
        """Test age group classification"""
        assert personalization_system.get_age_group(0) == AgeGroup.INFANT
        assert personalization_system.get_age_group(2) == AgeGroup.TODDLER
        assert personalization_system.get_age_group(5) == AgeGroup.PRESCHOOL
        assert personalization_system.get_age_group(10) == AgeGroup.CHILD
        assert personalization_system.get_age_group(15) == AgeGroup.ADOLESCENT
        assert personalization_system.get_age_group(25) == AgeGroup.YOUNG_ADULT
        assert personalization_system.get_age_group(40) == AgeGroup.ADULT
        assert personalization_system.get_age_group(55) == AgeGroup.MIDDLE_AGE
        assert personalization_system.get_age_group(70) == AgeGroup.ELDERLY
        assert personalization_system.get_age_group(85) == AgeGroup.VERY_ELDERLY
    
    def test_get_risk_level(self, personalization_system):
        """Test risk level calculation via calculate_risk_level(age, risk_factors)"""
        # Adolescents/young adults carry no baseline age risk -> VERY_LOW
        assert personalization_system.calculate_risk_level(15, []) == RiskLevel.VERY_LOW

        # Toddlers carry a moderate baseline age risk -> LOW
        assert personalization_system.calculate_risk_level(2, []) == RiskLevel.LOW

        # Infants carry a higher baseline age risk -> MODERATE
        assert personalization_system.calculate_risk_level(0, []) == RiskLevel.MODERATE

        # Very elderly patients carry a high baseline age risk -> HIGH
        assert personalization_system.calculate_risk_level(85, []) == RiskLevel.HIGH

        # Very elderly + a high-multiplier risk factor pushes risk into VERY_HIGH
        assert personalization_system.calculate_risk_level(85, ["immunosuppression"]) == RiskLevel.VERY_HIGH
    
    def test_personalize_prediction_by_age(self, personalization_system):
        """Test prediction personalization by age"""
        base_prediction = {
            "disease": "Bronquitis",
            "confidence": 0.7,
            "risk_score": 0.5
        }
        
        # Test with different ages
        result_infant = personalization_system.personalize_prediction(
            base_prediction, age=1, risk_factors=[]
        )
        
        result_elderly = personalization_system.personalize_prediction(
            base_prediction, age=75, risk_factors=[]
        )
        
        assert result_infant is not None
        assert result_elderly is not None
        # Elderly should have higher risk
        assert result_elderly.get("risk_score", 0) >= result_infant.get("risk_score", 0)
    
    def test_personalize_prediction_with_risk_factors(self, personalization_system):
        """Test prediction personalization with risk factors"""
        base_prediction = {
            "disease": "EPOC",
            "confidence": 0.7,
            "risk_score": 0.5
        }
        
        result_no_factors = personalization_system.personalize_prediction(
            base_prediction, age=45, risk_factors=[]
        )
        
        result_with_smoking = personalization_system.personalize_prediction(
            base_prediction, age=45, risk_factors=["smoking"]
        )
        
        assert result_with_smoking.get("risk_score", 0) >= result_no_factors.get("risk_score", 0)
    
    def test_adjust_disease_probability(self, personalization_system):
        """Test disease probability (confidence) adjustment"""
        base_prob = 0.5

        adjusted = personalization_system.adjust_prediction_confidence(
            "neumonía", base_prob, age=75, risk_factors=[]
        )

        assert adjusted > base_prob  # Elderly has higher risk for pneumonia

    def test_get_age_group_diseases(self, personalization_system):
        """Test getting diseases for age group"""
        diseases = personalization_system.age_group_diseases[AgeGroup.INFANT]

        assert "common" in diseases
        assert "rare" in diseases
        assert "risk_multiplier" in diseases

    def test_calculate_risk_multiplier(self, personalization_system):
        """Test that matching risk factors increase adjusted confidence"""
        without_factors = personalization_system.adjust_prediction_confidence(
            "neumonía", 0.5, age=75, risk_factors=[]
        )
        with_factors = personalization_system.adjust_prediction_confidence(
            "neumonía", 0.5, age=75, risk_factors=["smoking", "diabetes"]
        )

        assert with_factors > without_factors
    
    def test_edge_cases(self, personalization_system):
        """Test edge cases"""
        # Negative age
        age_group = personalization_system.get_age_group(-1)
        assert age_group == AgeGroup.INFANT
        
        # Very high age
        age_group = personalization_system.get_age_group(150)
        assert age_group == AgeGroup.VERY_ELDERLY

        # Lowest-risk age group with no risk factors
        risk = personalization_system.calculate_risk_level(15, [])
        assert risk == RiskLevel.VERY_LOW

        # Highest-risk age group with a high-multiplier risk factor
        risk = personalization_system.calculate_risk_level(85, ["immunosuppression"])
        assert risk == RiskLevel.VERY_HIGH

