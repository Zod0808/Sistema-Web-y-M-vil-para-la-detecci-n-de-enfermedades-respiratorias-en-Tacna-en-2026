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
        """Test risk level calculation"""
        risk = personalization_system.get_risk_level(0.1)
        assert risk == RiskLevel.VERY_LOW
        
        risk = personalization_system.get_risk_level(0.3)
        assert risk == RiskLevel.LOW
        
        risk = personalization_system.get_risk_level(0.5)
        assert risk == RiskLevel.MODERATE
        
        risk = personalization_system.get_risk_level(0.7)
        assert risk == RiskLevel.HIGH
        
        risk = personalization_system.get_risk_level(0.9)
        assert risk == RiskLevel.VERY_HIGH
    
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
        """Test disease probability adjustment"""
        base_prob = 0.5
        age_group = AgeGroup.ELDERLY
        
        adjusted = personalization_system._adjust_disease_probability(
            base_prob, age_group, "neumonía"
        )
        
        assert adjusted > base_prob  # Elderly has higher risk for pneumonia
    
    def test_get_age_group_diseases(self, personalization_system):
        """Test getting diseases for age group"""
        diseases = personalization_system._get_age_group_diseases(AgeGroup.INFANT)
        
        assert "common" in diseases
        assert "rare" in diseases
        assert "risk_multiplier" in diseases
    
    def test_calculate_risk_multiplier(self, personalization_system):
        """Test risk multiplier calculation"""
        multiplier = personalization_system._calculate_risk_multiplier(
            AgeGroup.ELDERLY, ["smoking", "diabetes"]
        )
        
        assert multiplier > 1.0
    
    def test_edge_cases(self, personalization_system):
        """Test edge cases"""
        # Negative age
        age_group = personalization_system.get_age_group(-1)
        assert age_group == AgeGroup.INFANT
        
        # Very high age
        age_group = personalization_system.get_age_group(150)
        assert age_group == AgeGroup.VERY_ELDERLY
        
        # Invalid risk score
        risk = personalization_system.get_risk_level(-0.1)
        assert risk == RiskLevel.VERY_LOW
        
        risk = personalization_system.get_risk_level(1.5)
        assert risk == RiskLevel.VERY_HIGH

