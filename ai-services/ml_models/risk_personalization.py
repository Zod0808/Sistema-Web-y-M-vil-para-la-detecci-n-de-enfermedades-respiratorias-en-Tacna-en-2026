"""
Sistema de Personalización por Edad y Grupo de Riesgo

Ajusta predicciones ML según la edad del paciente y factores de riesgo para
mejorar la precisión y relevancia de los diagnósticos.

"""

from typing import Dict, List, Any, Optional
from enum import Enum
import math


class AgeGroup(Enum):
    """Grupos de edad"""
    INFANT = "infant"  # 0-1 años
    TODDLER = "toddler"  # 1-3 años
    PRESCHOOL = "preschool"  # 3-6 años
    CHILD = "child"  # 6-12 años
    ADOLESCENT = "adolescent"  # 12-18 años
    YOUNG_ADULT = "young_adult"  # 18-30 años
    ADULT = "adult"  # 30-50 años
    MIDDLE_AGE = "middle_age"  # 50-65 años
    ELDERLY = "elderly"  # 65-80 años
    VERY_ELDERLY = "very_elderly"  # 80+ años


class RiskLevel(Enum):
    """Niveles de riesgo"""
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"


class RiskPersonalizationSystem:
    """Sistema de personalización por edad y factores de riesgo"""
    
    def __init__(self):
        """Initialize personalization system"""
        # Enfermedades más comunes por grupo de edad
        self.age_group_diseases = {
            AgeGroup.INFANT: {
                'common': ['bronquiolitis aguda', 'vsr', 'resfriado común', 'neumonía viral'],
                'rare': ['asma bronquial', 'epoc'],
                'risk_multiplier': 1.5  # Mayor riesgo para enfermedades respiratorias
            },
            AgeGroup.TODDLER: {
                'common': ['resfriado común', 'bronquiolitis aguda', 'faringitis', 'otitis'],
                'rare': ['neumonía grave', 'epoc'],
                'risk_multiplier': 1.3
            },
            AgeGroup.PRESCHOOL: {
                'common': ['resfriado común', 'faringitis', 'amigdalitis', 'sinusitis'],
                'rare': ['neumonía grave', 'epoc'],
                'risk_multiplier': 1.2
            },
            AgeGroup.CHILD: {
                'common': ['resfriado común', 'faringitis', 'asma bronquial', 'bronquitis aguda'],
                'rare': ['neumonía grave', 'epoc'],
                'risk_multiplier': 1.1
            },
            AgeGroup.ADOLESCENT: {
                'common': ['resfriado común', 'faringitis', 'asma bronquial', 'bronquitis aguda'],
                'rare': ['neumonía grave', 'epoc', 'tuberculosis'],
                'risk_multiplier': 1.0
            },
            AgeGroup.YOUNG_ADULT: {
                'common': ['resfriado común', 'bronquitis aguda', 'asma bronquial', 'influenza'],
                'rare': ['neumonía grave', 'epoc'],
                'risk_multiplier': 1.0
            },
            AgeGroup.ADULT: {
                'common': ['resfriado común', 'bronquitis aguda', 'asma bronquial', 'neumonía'],
                'rare': ['epoc', 'tuberculosis'],
                'risk_multiplier': 1.1
            },
            AgeGroup.MIDDLE_AGE: {
                'common': ['epoc', 'bronquitis crónica', 'asma bronquial', 'neumonía'],
                'rare': ['tuberculosis', 'bronquiectasia'],
                'risk_multiplier': 1.3
            },
            AgeGroup.ELDERLY: {
                'common': ['epoc', 'neumonía', 'bronquitis crónica', 'neumonía grave'],
                'rare': ['tuberculosis', 'bronquiectasia'],
                'risk_multiplier': 1.5  # Mayor riesgo
            },
            AgeGroup.VERY_ELDERLY: {
                'common': ['neumonía', 'neumonía grave', 'epoc', 'bronquitis crónica'],
                'rare': ['tuberculosis'],
                'risk_multiplier': 2.0  # Muy alto riesgo
            }
        }
        
        # Factores de riesgo adicionales
        self.risk_factors = {
            'smoking': {'multiplier': 1.5, 'diseases': ['epoc', 'bronquitis crónica', 'neumonía', 'cáncer de pulmón']},
            'diabetes': {'multiplier': 1.3, 'diseases': ['neumonía', 'neumonía grave', 'infecciones respiratorias']},
            'hypertension': {'multiplier': 1.2, 'diseases': ['epoc', 'neumonía']},
            'immunosuppression': {'multiplier': 2.0, 'diseases': ['neumonía', 'neumonía grave', 'tuberculosis']},
            'heart_disease': {'multiplier': 1.4, 'diseases': ['neumonía', 'epoc']},
            'asthma_history': {'multiplier': 1.6, 'diseases': ['asma bronquial', 'estado asmático']},
            'obesity': {'multiplier': 1.2, 'diseases': ['epoc', 'apnea del sueño']},
            'chronic_kidney_disease': {'multiplier': 1.3, 'diseases': ['neumonía', 'infecciones respiratorias']},
            'copd_history': {'multiplier': 1.8, 'diseases': ['epoc', 'bronquitis crónica']},
            'previous_pneumonia': {'multiplier': 1.5, 'diseases': ['neumonía', 'neumonía grave']},
            # Nuevos factores: alergias, medicación, historial familiar
            'allergies': {'multiplier': 1.2, 'diseases': ['rinitis alérgica', 'asma bronquial', 'sinusitis']},
            'current_medications': {'multiplier': 1.1, 'diseases': ['asma bronquial', 'epoc', 'neumonía']},
            'family_history_asthma': {'multiplier': 1.2, 'diseases': ['asma bronquial']},
            'family_history_copd': {'multiplier': 1.3, 'diseases': ['epoc', 'bronquitis crónica']},
            'family_history_tuberculosis': {'multiplier': 1.4, 'diseases': ['tuberculosis']}
        }
    
    def get_age_group(self, age: int) -> AgeGroup:
        """Get age group for given age"""
        if age < 1:
            return AgeGroup.INFANT
        elif age < 3:
            return AgeGroup.TODDLER
        elif age < 6:
            return AgeGroup.PRESCHOOL
        elif age < 12:
            return AgeGroup.CHILD
        elif age < 18:
            return AgeGroup.ADOLESCENT
        elif age < 30:
            return AgeGroup.YOUNG_ADULT
        elif age < 50:
            return AgeGroup.ADULT
        elif age < 65:
            return AgeGroup.MIDDLE_AGE
        elif age < 80:
            return AgeGroup.ELDERLY
        else:
            return AgeGroup.VERY_ELDERLY
    
    def calculate_risk_level(self, age: int, risk_factors: List[str] = None) -> RiskLevel:
        """
        Calculate overall risk level based on age and risk factors
        
        Args:
            age: Patient age
            risk_factors: List of risk factor names
        
        Returns:
            RiskLevel enum
        """
        age_group = self.get_age_group(age)
        base_risk = age_group.value
        
        # Calculate risk score
        risk_score = 0.0
        
        # Age-based risk
        age_risks = {
            AgeGroup.INFANT: 0.4,
            AgeGroup.TODDLER: 0.3,
            AgeGroup.PRESCHOOL: 0.2,
            AgeGroup.CHILD: 0.1,
            AgeGroup.ADOLESCENT: 0.0,
            AgeGroup.YOUNG_ADULT: 0.0,
            AgeGroup.ADULT: 0.1,
            AgeGroup.MIDDLE_AGE: 0.3,
            AgeGroup.ELDERLY: 0.5,
            AgeGroup.VERY_ELDERLY: 0.7
        }
        risk_score += age_risks.get(age_group, 0.0)
        
        # Risk factors contribution
        if risk_factors:
            for factor in risk_factors:
                if factor in self.risk_factors:
                    factor_info = self.risk_factors[factor]
                    risk_score += (factor_info['multiplier'] - 1.0) * 0.2
        
        # Determine risk level
        if risk_score < 0.2:
            return RiskLevel.VERY_LOW
        elif risk_score < 0.4:
            return RiskLevel.LOW
        elif risk_score < 0.6:
            return RiskLevel.MODERATE
        elif risk_score < 0.8:
            return RiskLevel.HIGH
        else:
            return RiskLevel.VERY_HIGH
    
    def adjust_prediction_confidence(self, 
                                    disease: str,
                                    base_confidence: float,
                                    age: int,
                                    risk_factors: List[str] = None) -> float:
        """
        Adjust prediction confidence based on age and risk factors
        
        Args:
            disease: Predicted disease
            base_confidence: Base confidence from model
            age: Patient age
            risk_factors: List of risk factors
        
        Returns:
            Adjusted confidence score
        """
        age_group = self.get_age_group(age)
        age_info = self.age_group_diseases.get(age_group, {})
        
        adjustment_factor = 1.0
        
        # Check if disease is common for this age group
        common_diseases = age_info.get('common', [])
        rare_diseases = age_info.get('rare', [])
        
        disease_lower = disease.lower()
        
        if any(d.lower() in disease_lower for d in common_diseases):
            # Increase confidence for age-appropriate diseases
            adjustment_factor *= 1.1
        elif any(d.lower() in disease_lower for d in rare_diseases):
            # Decrease confidence for rare diseases in this age group
            adjustment_factor *= 0.9
        
        # Apply risk factor adjustments
        if risk_factors:
            for factor in risk_factors:
                if factor in self.risk_factors:
                    factor_info = self.risk_factors[factor]
                    if any(d.lower() in disease_lower for d in factor_info['diseases']):
                        # Increase confidence if risk factor matches disease
                        adjustment_factor *= factor_info['multiplier'] * 0.1 + 1.0
        
        # Apply age group risk multiplier
        risk_multiplier = age_info.get('risk_multiplier', 1.0)
        adjustment_factor *= (1.0 + (risk_multiplier - 1.0) * 0.1)
        
        # Clamp confidence between 0.0 and 1.0
        adjusted_confidence = min(1.0, max(0.0, base_confidence * adjustment_factor))
        
        return adjusted_confidence
    
    def adjust_urgency_level(self,
                            disease: str,
                            base_urgency: str,
                            age: int,
                            risk_factors: List[str] = None) -> str:
        """
        Adjust urgency level based on age and risk factors
        
        Args:
            disease: Predicted disease
            base_urgency: Base urgency from model
            age: Patient age
            risk_factors: List of risk factors
        
        Returns:
            Adjusted urgency level
        """
        age_group = self.get_age_group(age)
        risk_level = self.calculate_risk_level(age, risk_factors)
        
        urgency_map = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'critical': 4
        }
        
        base_urgency_value = urgency_map.get(base_urgency.lower(), 2)
        
        # Increase urgency for high-risk groups
        if age_group in [AgeGroup.INFANT, AgeGroup.ELDERLY, AgeGroup.VERY_ELDERLY]:
            base_urgency_value += 0.5
        
        if risk_level in [RiskLevel.HIGH, RiskLevel.VERY_HIGH]:
            base_urgency_value += 0.5
        
        # Round to nearest urgency level
        if base_urgency_value >= 4:
            return 'critical'
        elif base_urgency_value >= 3:
            return 'high'
        elif base_urgency_value >= 2:
            return 'medium'
        else:
            return 'low'
    
    def get_personalized_recommendations(self,
                                        disease: str,
                                        age: int,
                                        risk_factors: List[str] = None) -> List[str]:
        """
        Get personalized recommendations based on age and risk factors
        
        Args:
            disease: Predicted disease
            age: Patient age
            risk_factors: List of risk factors
        
        Returns:
            List of personalized recommendations
        """
        age_group = self.get_age_group(age)
        risk_level = self.calculate_risk_level(age, risk_factors)
        
        recommendations = []
        
        # Age-specific recommendations
        if age_group in [AgeGroup.INFANT, AgeGroup.TODDLER]:
            recommendations.append("ⓘ IMPORTANTE: Niños pequeños requieren atención médica inmediata para síntomas respiratorios")
            recommendations.append("Monitorear signos de dificultad respiratoria constantemente")
            recommendations.append("Mantener hidratación adecuada")
        elif age_group in [AgeGroup.ELDERLY, AgeGroup.VERY_ELDERLY]:
            recommendations.append("ⓘ IMPORTANTE: Adultos mayores tienen mayor riesgo de complicaciones")
            recommendations.append("Consulta médica recomendada incluso para síntomas leves")
            recommendations.append("Monitorear signos vitales regularmente")
        
        # Risk factor specific recommendations
        if risk_factors:
            if 'smoking' in risk_factors:
                recommendations.append("Considerar dejar de fumar para reducir riesgo de complicaciones")
            if 'diabetes' in risk_factors:
                recommendations.append("Monitorear niveles de glucosa, infecciones respiratorias pueden afectarlos")
            if 'immunosuppression' in risk_factors:
                recommendations.append("⚠️ URGENTE: Paciente inmunocomprometido requiere evaluación médica inmediata")
            if 'heart_disease' in risk_factors:
                recommendations.append("Enfermedades respiratorias pueden afectar el corazón, monitor cuidadoso requerido")
            if 'allergies' in risk_factors:
                recommendations.append("Evitar alérgenos identificados; considerar antihistamínicos según prescripción")
            if 'current_medications' in risk_factors:
                recommendations.append("Revisar interacciones fármaco-respiratorias con el médico tratante")
            if 'family_history_asthma' in risk_factors:
                recommendations.append("Historial familiar de asma: mantener plan de acción y control ambiental")
            if 'family_history_copd' in risk_factors:
                recommendations.append("Antecedente familiar EPOC: seguimiento de función pulmonar recomendado")
            if 'family_history_tuberculosis' in risk_factors:
                recommendations.append("Antecedente familiar TB: estar atento a tos persistente y pérdida de peso")
        
        # Disease-specific recommendations
        if 'neumonía' in disease.lower() or 'neumonia' in disease.lower():
            if age_group in [AgeGroup.ELDERLY, AgeGroup.VERY_ELDERLY]:
                recommendations.append("ⓘ Neumonía en adultos mayores puede ser grave - evaluación médica urgente")
            if 'bacteriana' in disease.lower() or 'grave' in disease.lower():
                recommendations.append("⚠️ Neumonía bacteriana o grave requiere tratamiento antibiótico inmediato")
        
        if 'asma' in disease.lower() or 'asmatico' in disease.lower():
            recommendations.append("Tener plan de acción para asma disponible")
            recommendations.append("Usar inhalador de rescate según prescripción")
        
        if risk_level in [RiskLevel.HIGH, RiskLevel.VERY_HIGH]:
            recommendations.append("⚠️ ALTA PRIORIDAD: Evaluación médica urgente recomendada debido a factores de riesgo")
        
        return recommendations
    
    def personalize_prediction(self,
                              prediction: Dict[str, Any],
                              age: int,
                              risk_factors: List[str] = None) -> Dict[str, Any]:
        """
        Personalize a prediction based on age and risk factors
        
        Args:
            prediction: Base prediction from ML model
            age: Patient age
            risk_factors: List of risk factors
        
        Returns:
            Personalized prediction
        """
        disease = prediction.get('disease', '')
        base_confidence = prediction.get('confidence', 0.5)
        base_urgency = prediction.get('urgency_level', 'medium')
        
        # Adjust confidence
        adjusted_confidence = self.adjust_prediction_confidence(
            disease, base_confidence, age, risk_factors
        )
        
        # Adjust urgency
        adjusted_urgency = self.adjust_urgency_level(
            disease, base_urgency, age, risk_factors
        )
        
        # Get personalized recommendations
        recommendations = self.get_personalized_recommendations(
            disease, age, risk_factors
        )
        
        # Create personalized prediction
        personalized = prediction.copy()
        personalized.update({
            'confidence': adjusted_confidence,
            'urgency_level': adjusted_urgency,
            'age_group': self.get_age_group(age).value,
            'risk_level': self.calculate_risk_level(age, risk_factors).value,
            'personalized_recommendations': recommendations,
            'age': age,
            'risk_factors': risk_factors or [],
            'personalization_applied': True
        })
        
        return personalized


# Global instance
_personalization_system = None


def get_personalization_system() -> RiskPersonalizationSystem:
    """Get global personalization system instance"""
    global _personalization_system
    if _personalization_system is None:
        _personalization_system = RiskPersonalizationSystem()
    return _personalization_system


if __name__ == "__main__":
    # Test personalization system
    print("Testing Risk Personalization System...")
    
    system = RiskPersonalizationSystem()
    
    # Test case 1: Infant with high risk
    print("\n1. Test: Infant (6 months) with RSV symptoms")
    age = 0.5
    risk_factors = []
    disease = "bronquiolitis aguda"
    
    base_prediction = {
        'disease': disease,
        'confidence': 0.85,
        'urgency_level': 'medium'
    }
    
    personalized = system.personalize_prediction(base_prediction, int(age * 12), risk_factors)
    print(f"   Base confidence: {base_prediction['confidence']:.2f}")
    print(f"   Adjusted confidence: {personalized['confidence']:.2f}")
    print(f"   Urgency: {base_prediction['urgency_level']} -> {personalized['urgency_level']}")
    print(f"   Risk level: {personalized['risk_level']}")
    print(f"   Recommendations: {len(personalized['personalized_recommendations'])}")
    
    # Test case 2: Elderly with risk factors
    print("\n2. Test: Elderly (75 years) with pneumonia, diabetes and smoking")
    age = 75
    risk_factors = ['diabetes', 'smoking']
    disease = "neumonía"
    
    base_prediction = {
        'disease': disease,
        'confidence': 0.88,
        'urgency_level': 'high'
    }
    
    personalized = system.personalize_prediction(base_prediction, age, risk_factors)
    print(f"   Base confidence: {base_prediction['confidence']:.2f}")
    print(f"   Adjusted confidence: {personalized['confidence']:.2f}")
    print(f"   Urgency: {base_prediction['urgency_level']} -> {personalized['urgency_level']}")
    print(f"   Risk level: {personalized['risk_level']}")
    print(f"   Recommendations: {len(personalized['personalized_recommendations'])}")

