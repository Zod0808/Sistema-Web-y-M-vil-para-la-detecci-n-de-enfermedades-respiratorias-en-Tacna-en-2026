"""
Rule-Based Strategy for AI Analysis
"""

from typing import Dict, List, Any, Optional
import structlog
from .analysis_strategy import AnalysisStrategy
from data.medical_data import MedicalDataProcessor

logger = structlog.get_logger()


class RuleBasedStrategy(AnalysisStrategy):
    """Strategy that uses rule-based analysis"""
    
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
    
    async def analyze_symptoms(self, symptoms: List[Dict[str, Any]], context: Optional[Dict] = None) -> Dict[str, Any]:
        """Analyze symptoms using rule-based approach"""
        try:
            logger.info("Analyzing symptoms with rule-based strategy", symptom_count=len(symptoms))
            
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
            
            return {
                "urgency_level": urgency_level,
                "severity_score": severity_analysis["overall_score"],
                "categories": list(symptom_categories.keys()),
                "category_details": symptom_categories,
                "recommendations": recommendations,
                "warning_signs": warning_signs,
                "follow_up_required": follow_up,
                "severity_breakdown": severity_analysis
            }
            
        except Exception as e:
            logger.error("Error in rule-based symptom analysis", error=str(e))
            raise
    
    async def process_medical_text(self, text: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Process medical text using rule-based approach"""
        try:
            logger.info("Processing medical text with rule-based strategy", text_length=len(text))
            
            # Extract entities using regex patterns
            entities = self._extract_entities_with_regex(text)
            
            # Extract symptoms
            symptoms = self._extract_symptoms_from_text(text)
            
            # Extract risk factors
            risk_factors = self._extract_risk_factors_from_text(text)
            
            # Generate diagnosis suggestions
            symptom_categories = self.data_processor.categorize_symptoms(
                [s["symptom"] for s in symptoms]
            )
            diagnosis_suggestions = self.data_processor.suggest_diagnosis(symptom_categories)
            
            # Calculate severity score
            severity_score = self.data_processor.calculate_severity_score(symptoms)
            
            # Generate recommendations
            recommendations = self._generate_medical_recommendations(
                symptoms, diagnosis_suggestions, risk_factors
            )
            
            return {
                "entities": entities,
                "symptoms": symptoms,
                "risk_factors": risk_factors,
                "diagnosis_suggestions": diagnosis_suggestions,
                "severity_score": severity_score,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error("Error in rule-based medical text processing", error=str(e))
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
        
        # Remove empty categories
        return {k: v for k, v in categorized.items() if v}
    
    def _calculate_severity(self, symptoms: List[Dict[str, Any]], categories: Dict[str, List[Dict]]) -> Dict[str, Any]:
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
    
    def _determine_urgency(self, symptoms: List[Dict[str, Any]], severity_analysis: Dict[str, Any]) -> str:
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
    
    def _generate_recommendations(self, symptoms: List[Dict[str, Any]], categories: Dict[str, List[Dict]], 
                                 urgency: str, context: Optional[str]) -> List[str]:
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
    
    def _identify_warning_signs(self, symptoms: List[Dict[str, Any]], severity_analysis: Dict[str, Any]) -> List[str]:
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
    
    def _determine_follow_up(self, urgency: str, warning_signs: List[str], symptoms: List[Dict[str, Any]]) -> bool:
        """Determine if follow-up is required"""
        
        # Always require follow-up for critical/high urgency
        if urgency in ["critical", "high"]:
            return True
        
        # Warning signs require follow-up
        if warning_signs:
            return True
        
        # Check for chronic conditions
        chronic_keywords = ["crónico", "persistente", "recurrente"]
        if any(keyword in str(symptoms).lower() for keyword in chronic_keywords):
            return True
        
        return False
    
    def _extract_entities_with_regex(self, text: str) -> List[Dict[str, Any]]:
        """Extract medical entities using regex patterns"""
        import re
        
        entities = []
        medical_entities = {
            "medications": [
                r"\b(?:metformina|losartán|aspirina|ibuprofeno|paracetamol|amoxicilina|omeprazol)\b",
                r"\b(?:insulina|glibenclamida|enalapril|atorvastatina|simvastatina)\b"
            ],
            "vital_signs": [
                r"(\d+(?:\.\d+)?)\s*°?[CcFf]",
                r"presión\s+(?:arterial\s+)?(\d+/\d+)",
                r"frecuencia\s+cardíaca\s+(\d+)",
                r"peso\s+(\d+(?:\.\d+)?)\s*kg",
                r"altura\s+(\d+(?:\.\d+)?)\s*cm"
            ],
            "conditions": [
                r"\b(?:diabetes|hipertensión|asma|bronquitis|neumonía|gastritis)\b",
                r"\b(?:epoc|enfisema|fibrosis|artritis|migraña|depresión)\b"
            ]
        }
        
        for entity_type, patterns in medical_entities.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    entities.append({
                        "text": match.group(0),
                        "type": entity_type,
                        "start": match.start(),
                        "end": match.end(),
                        "confidence": 0.8
                    })
        
        return entities
    
    def _extract_symptoms_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Extract symptoms from medical text"""
        symptoms = []
        text_lower = text.lower()
        
        for category, keywords in self.data_processor.symptom_categories.items():
            for keyword in keywords:
                if keyword in text_lower:
                    start = text_lower.find(keyword)
                    end = start + len(keyword)
                    
                    symptoms.append({
                        "symptom": keyword,
                        "category": category,
                        "start": start,
                        "end": end,
                        "confidence": 0.7
                    })
        
        return symptoms
    
    def _extract_risk_factors_from_text(self, text: str) -> List[str]:
        """Extract risk factors from text"""
        return self.data_processor.extract_risk_factors(text)
    
    def _generate_medical_recommendations(self, symptoms: List[Dict], diagnoses: List[str], risk_factors: List[str]) -> List[str]:
        """Generate medical recommendations"""
        recommendations = []
        
        # Symptom-based recommendations
        symptom_categories = [s.get("category") for s in symptoms]
        
        if "respiratory" in symptom_categories:
            recommendations.extend([
                "Monitorear función respiratoria",
                "Evitar irritantes respiratorios",
                "Considerar espirometría"
            ])
        
        if "fever" in symptom_categories:
            recommendations.extend([
                "Control de temperatura regular",
                "Hidratación adecuada",
                "Evaluar necesidad de antipiréticos"
            ])
        
        # Risk factor-based recommendations
        if "tabaquismo" in risk_factors:
            recommendations.append("Programa de cesación tabáquica")
        
        if "diabetes" in risk_factors:
            recommendations.append("Control glucémico estricto")
        
        if "hipertensión" in risk_factors:
            recommendations.append("Monitoreo de presión arterial")
        
        # General recommendations
        recommendations.extend([
            "Seguimiento médico regular",
            "Mantener estilo de vida saludable",
            "Reportar cualquier empeoramiento"
        ])
        
        return recommendations[:8]  # Limit to 8 recommendations
    
    def get_strategy_name(self) -> str:
        """Get strategy name"""
        return "rule_based"
    
    def get_confidence_score(self) -> float:
        """Get confidence score for rule-based strategy"""
        return 0.7
