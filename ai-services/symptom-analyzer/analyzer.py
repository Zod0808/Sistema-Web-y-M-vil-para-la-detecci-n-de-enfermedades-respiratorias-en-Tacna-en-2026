"""
Symptom Analyzer
Analyzes symptoms and provides medical recommendations
"""

import structlog
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import asyncio

from data.medical_data import MedicalDataProcessor

logger = structlog.get_logger()


class SymptomAnalyzer:
    """Analyzes symptoms and provides medical recommendations"""
    
    def __init__(self):
        self.data_processor = MedicalDataProcessor()
        self.severity_weights = {
            "mild": 0.3,
            "moderate": 0.6,
            "severe": 0.9,
            "critical": 1.0
        }
        
        self.urgency_rules = {
            "critical": {
                "symptoms": ["dificultad respiratoria severa", "dolor en el pecho", "pérdida de conciencia"],
                "severity_threshold": 0.9,
                "response_time": "inmediato"
            },
            "high": {
                "symptoms": ["fiebre alta", "dolor abdominal severo", "confusión"],
                "severity_threshold": 0.7,
                "response_time": "2 horas"
            },
            "medium": {
                "symptoms": ["tos persistente", "dolor de cabeza", "fatiga"],
                "severity_threshold": 0.5,
                "response_time": "24 horas"
            },
            "low": {
                "symptoms": ["malestar general", "cansancio leve"],
                "severity_threshold": 0.3,
                "response_time": "1 semana"
            }
        }
    
    async def analyze_symptoms(
        self, 
        symptoms: List[Dict[str, Any]], 
        patient_id: str,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyze symptoms and provide comprehensive assessment
        
        Args:
            symptoms: List of symptom dictionaries
            patient_id: Patient identifier
            context: Additional context about symptoms
            
        Returns:
            Dictionary with analysis results
        """
        try:
            logger.info("Analyzing symptoms", patient_id=patient_id, count=len(symptoms))
            
            # Categorize symptoms
            symptom_categories = self._categorize_symptoms(symptoms)
            
            # Calculate severity scores
            severity_analysis = self._calculate_severity(symptoms, symptom_categories)
            
            # Determine urgency level
            urgency_level = self._determine_urgency(symptoms, severity_analysis)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                symptoms, symptom_categories, urgency_level, context
            )
            
            # Identify warning signs
            warning_signs = self._identify_warning_signs(symptoms, severity_analysis)
            
            # Determine follow-up requirements
            follow_up = self._determine_follow_up(urgency_level, warning_signs, symptoms)
            
            # Generate treatment suggestions
            treatment_suggestions = self._generate_treatment_suggestions(
                symptoms, symptom_categories, urgency_level
            )
            
            result = {
                "patient_id": patient_id,
                "analyzed_at": datetime.utcnow().isoformat(),
                "symptom_categories": symptom_categories,
                "severity_analysis": severity_analysis,
                "urgency_level": urgency_level,
                "recommendations": recommendations,
                "warning_signs": warning_signs,
                "follow_up_required": follow_up,
                "treatment_suggestions": treatment_suggestions,
                "confidence_score": self._calculate_confidence(symptoms, severity_analysis),
                "analysis_metadata": {
                    "total_symptoms": len(symptoms),
                    "analysis_method": "rule_based",
                    "context_provided": context is not None
                }
            }
            
            logger.info("Symptom analysis completed", 
                       patient_id=patient_id,
                       urgency=urgency_level,
                       follow_up=follow_up)
            
            return result
            
        except Exception as e:
            logger.error("Error analyzing symptoms", 
                        patient_id=patient_id, 
                        error=str(e))
            raise
    
    def _categorize_symptoms(self, symptoms: List[Dict[str, Any]]) -> Dict[str, List[Dict]]:
        """Categorize symptoms by type"""
        categorized = {category: [] for category in self.data_processor.symptom_categories.keys()}
        
        for symptom in symptoms:
            symptom_text = symptom.get("symptom", "").lower()
            for category, keywords in self.data_processor.symptom_categories.items():
                if any(keyword in symptom_text for keyword in keywords):
                    categorized[category].append(symptom)
                    break
        
        return categorized
    
    def _calculate_severity(
        self, 
        symptoms: List[Dict[str, Any]], 
        categories: Dict[str, List[Dict]]
    ) -> Dict[str, Any]:
        """Calculate severity scores for symptoms"""
        
        # Individual symptom severity
        symptom_severities = []
        for symptom in symptoms:
            severity_text = symptom.get("severity", "moderate").lower()
            severity_score = self.severity_weights.get(severity_text, 0.5)
            
            # Adjust based on duration
            duration = symptom.get("duration", "")
            duration_multiplier = self._get_duration_multiplier(duration)
            
            final_score = severity_score * duration_multiplier
            symptom_severities.append({
                "symptom": symptom.get("symptom"),
                "severity": severity_text,
                "score": final_score,
                "duration": duration
            })
        
        # Category-based severity
        category_severities = {}
        for category, cat_symptoms in categories.items():
            if cat_symptoms:
                cat_scores = [s["score"] for s in symptom_severities 
                             if s["symptom"] in [s["symptom"] for s in cat_symptoms]]
                category_severities[category] = {
                    "score": sum(cat_scores) / len(cat_scores) if cat_scores else 0,
                    "count": len(cat_symptoms),
                    "symptoms": [s["symptom"] for s in cat_symptoms]
                }
        
        # Overall severity
        overall_score = self.data_processor.calculate_severity_score(symptoms)
        
        return {
            "overall_score": overall_score,
            "symptom_severities": symptom_severities,
            "category_severities": category_severities,
            "severity_level": self._get_severity_level(overall_score)
        }
    
    def _get_duration_multiplier(self, duration: str) -> float:
        """Get severity multiplier based on duration"""
        duration_lower = duration.lower()
        
        if any(keyword in duration_lower for keyword in ["horas", "hours"]):
            return 1.2  # More severe if recent
        elif any(keyword in duration_lower for keyword in ["días", "days"]):
            return 1.0  # Normal
        elif any(keyword in duration_lower for keyword in ["semanas", "weeks"]):
            return 0.8  # Less severe if chronic
        elif any(keyword in duration_lower for keyword in ["meses", "months"]):
            return 0.6  # Much less severe if very chronic
        else:
            return 1.0  # Default
    
    def _get_severity_level(self, score: float) -> str:
        """Convert severity score to level"""
        if score >= 0.8:
            return "critical"
        elif score >= 0.6:
            return "severe"
        elif score >= 0.4:
            return "moderate"
        else:
            return "mild"
    
    def _determine_urgency(
        self, 
        symptoms: List[Dict[str, Any]], 
        severity_analysis: Dict[str, Any]
    ) -> str:
        """Determine urgency level based on symptoms and severity"""
        
        overall_score = severity_analysis["overall_score"]
        symptom_texts = [s.get("symptom", "").lower() for s in symptoms]
        
        # Check for critical symptoms
        for symptom_text in symptom_texts:
            if any(critical in symptom_text for critical in 
                   self.urgency_rules["critical"]["symptoms"]):
                return "critical"
        
        # Check severity thresholds
        if overall_score >= self.urgency_rules["high"]["severity_threshold"]:
            return "high"
        elif overall_score >= self.urgency_rules["medium"]["severity_threshold"]:
            return "medium"
        else:
            return "low"
    
    def _generate_recommendations(
        self, 
        symptoms: List[Dict[str, Any]], 
        categories: Dict[str, List[Dict]], 
        urgency: str,
        context: Optional[str]
    ) -> List[str]:
        """Generate medical recommendations based on analysis"""
        recommendations = []
        
        # Urgency-based recommendations
        urgency_recs = {
            "critical": [
                "Buscar atención médica inmediata",
                "Llamar servicios de emergencia",
                "No conducir ni realizar actividades peligrosas"
            ],
            "high": [
                "Consultar médico en las próximas 2 horas",
                "Monitorear signos vitales constantemente",
                "Tener contacto de emergencia disponible"
            ],
            "medium": [
                "Consultar médico en las próximas 24 horas",
                "Monitorear síntomas regularmente",
                "Evitar actividades extenuantes"
            ],
            "low": [
                "Monitorear síntomas en casa",
                "Consultar si empeoran",
                "Mantener reposo relativo"
            ]
        }
        
        recommendations.extend(urgency_recs.get(urgency, []))
        
        # Category-specific recommendations
        for category, cat_symptoms in categories.items():
            if cat_symptoms:
                if category == "respiratory":
                    recommendations.extend([
                        "Mantener hidratación adecuada",
                        "Evitar irritantes respiratorios",
                        "Usar técnicas de respiración profunda"
                    ])
                elif category == "fever":
                    recommendations.extend([
                        "Controlar temperatura cada 4 horas",
                        "Mantener reposo en cama",
                        "Hidratación abundante"
                    ])
                elif category == "pain":
                    recommendations.extend([
                        "Aplicar calor o frío según el tipo de dolor",
                        "Mantener postura correcta",
                        "Considerar técnicas de relajación"
                    ])
        
        # Context-specific recommendations
        if context:
            if "diabetes" in context.lower():
                recommendations.append("Monitorear glucosa en sangre")
            if "hipertensión" in context.lower():
                recommendations.append("Controlar presión arterial")
            if "asma" in context.lower():
                recommendations.append("Tener inhalador de rescate disponible")
        
        return recommendations[:10]  # Limit to 10 recommendations
    
    def _identify_warning_signs(
        self, 
        symptoms: List[Dict[str, Any]], 
        severity_analysis: Dict[str, Any]
    ) -> List[str]:
        """Identify warning signs that require immediate attention"""
        warning_signs = []
        
        # Check for critical symptoms
        critical_symptoms = [
            "dificultad respiratoria severa",
            "dolor en el pecho",
            "pérdida de conciencia",
            "confusión severa",
            "fiebre muy alta"
        ]
        
        for symptom in symptoms:
            symptom_text = symptom.get("symptom", "").lower()
            if any(critical in symptom_text for critical in critical_symptoms):
                warning_signs.append(f"Síntoma crítico: {symptom_text}")
        
        # Check severity thresholds
        overall_score = severity_analysis["overall_score"]
        if overall_score >= 0.9:
            warning_signs.append("Puntuación de severidad crítica")
        elif overall_score >= 0.7:
            warning_signs.append("Puntuación de severidad alta")
        
        # Check for rapid progression
        severe_symptoms = [s for s in symptoms if s.get("severity") == "severe"]
        if len(severe_symptoms) >= 3:
            warning_signs.append("Múltiples síntomas severos presentes")
        
        return warning_signs
    
    def _determine_follow_up(
        self, 
        urgency: str, 
        warning_signs: List[str], 
        symptoms: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Determine follow-up requirements"""
        
        follow_up = {
            "required": False,
            "urgency": urgency,
            "timeline": "no_required",
            "type": "none"
        }
        
        # Always require follow-up for critical/high urgency
        if urgency in ["critical", "high"]:
            follow_up["required"] = True
            follow_up["timeline"] = "immediate" if urgency == "critical" else "2_hours"
            follow_up["type"] = "emergency"
        elif warning_signs:
            follow_up["required"] = True
            follow_up["timeline"] = "24_hours"
            follow_up["type"] = "urgent"
        elif urgency == "medium":
            follow_up["required"] = True
            follow_up["timeline"] = "24_hours"
            follow_up["type"] = "routine"
        
        # Check for chronic conditions
        chronic_keywords = ["crónico", "persistente", "recurrente"]
        if any(keyword in str(symptoms).lower() for keyword in chronic_keywords):
            follow_up["required"] = True
            follow_up["timeline"] = "1_week"
            follow_up["type"] = "specialist"
        
        return follow_up
    
    def _generate_treatment_suggestions(
        self, 
        symptoms: List[Dict[str, Any]], 
        categories: Dict[str, List[Dict]], 
        urgency: str
    ) -> List[str]:
        """Generate treatment suggestions based on symptoms"""
        suggestions = []
        
        # General treatment suggestions
        if urgency == "critical":
            suggestions.append("Tratamiento de emergencia requerido")
        elif urgency == "high":
            suggestions.append("Tratamiento médico urgente")
        else:
            suggestions.append("Tratamiento médico de rutina")
        
        # Category-specific treatments
        for category, cat_symptoms in categories.items():
            if cat_symptoms:
                if category == "respiratory":
                    suggestions.extend([
                        "Broncodilatadores si es necesario",
                        "Hidratación y humidificación",
                        "Técnicas de respiración"
                    ])
                elif category == "fever":
                    suggestions.extend([
                        "Antipiréticos (paracetamol/ibuprofeno)",
                        "Hidratación abundante",
                        "Reposo en cama"
                    ])
                elif category == "pain":
                    suggestions.extend([
                        "Analgésicos según prescripción médica",
                        "Aplicación de calor/frío",
                        "Técnicas de relajación"
                    ])
        
        return suggestions[:8]  # Limit to 8 suggestions
    
    def _calculate_confidence(
        self, 
        symptoms: List[Dict[str, Any]], 
        severity_analysis: Dict[str, Any]
    ) -> float:
        """Calculate confidence score for the analysis"""
        if not symptoms:
            return 0.0
        
        # Base confidence on number of symptoms and severity
        base_confidence = min(0.8, 0.4 + (len(symptoms) * 0.1))
        
        # Boost confidence if we have clear severity indicators
        severity_score = severity_analysis["overall_score"]
        if severity_score > 0.7 or severity_score < 0.3:
            base_confidence += 0.1  # More confident with clear severity
        
        # Boost confidence if we have multiple categories
        categories = len([cat for cat, syms in severity_analysis["category_severities"].items() if syms])
        if categories > 1:
            base_confidence += 0.05
        
        return min(0.95, base_confidence)


# Global analyzer instance
analyzer = SymptomAnalyzer()
