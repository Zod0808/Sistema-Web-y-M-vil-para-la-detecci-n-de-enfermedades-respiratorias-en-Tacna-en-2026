"""
Medical History Processor
Extracts structured information from medical history text
"""

import re
import structlog
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import asyncio

from data.medical_data import MedicalDataProcessor

logger = structlog.get_logger()


class MedicalHistoryProcessor:
    """Processes medical history text and extracts structured information"""
    
    def __init__(self):
        self.data_processor = MedicalDataProcessor()
        self.medical_entities = self._load_medical_entities()
        
    def _load_medical_entities(self) -> Dict[str, List[str]]:
        """Load medical entity patterns for extraction"""
        return {
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
            "dates": [
                r"(\d{1,2})/(\d{1,2})/(\d{2,4})",
                r"(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})",
                r"hace\s+(\d+)\s+(?:días?|semanas?|meses?|años?)"
            ],
            "conditions": [
                r"\b(?:diabetes|hipertensión|asma|bronquitis|neumonía|gastritis)\b",
                r"\b(?:epoc|enfisema|fibrosis|artritis|migraña|depresión)\b"
            ]
        }
    
    async def process_history(self, text: str, patient_id: str) -> Dict[str, Any]:
        """
        Process medical history text and extract structured information
        
        Args:
            text: Medical history text
            patient_id: Patient identifier
            
        Returns:
            Dictionary with extracted information
        """
        try:
            logger.info("Processing medical history", patient_id=patient_id)
            
            # Clean and normalize text
            cleaned_text = self._clean_text(text)
            
            # Extract basic information
            age = self._extract_age(cleaned_text)
            gender = self._extract_gender(cleaned_text)
            
            # Extract medical entities
            entities = await self._extract_entities(cleaned_text)
            
            # Extract symptoms
            symptoms = self._extract_symptoms(cleaned_text)
            
            # Extract risk factors
            risk_factors = self.data_processor.extract_risk_factors(cleaned_text)
            
            # Generate diagnosis suggestions
            symptom_categories = self.data_processor.categorize_symptoms(
                [s["symptom"] for s in symptoms]
            )
            diagnosis_suggestions = self.data_processor.suggest_diagnosis(symptom_categories)
            
            # Calculate severity score
            severity_score = self.data_processor.calculate_severity_score(symptoms)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                symptoms, diagnosis_suggestions, risk_factors
            )
            
            result = {
                "patient_id": patient_id,
                "processed_at": datetime.utcnow().isoformat(),
                "basic_info": {
                    "age": age,
                    "gender": gender,
                    "text_length": len(cleaned_text)
                },
                "entities": entities,
                "symptoms": symptoms,
                "risk_factors": risk_factors,
                "diagnosis_suggestions": diagnosis_suggestions,
                "severity_score": severity_score,
                "recommendations": recommendations,
                "confidence_score": self._calculate_confidence(entities, symptoms),
                "processing_metadata": {
                    "original_text_length": len(text),
                    "cleaned_text_length": len(cleaned_text),
                    "extraction_method": "rule_based"
                }
            }
            
            logger.info("Medical history processed successfully", 
                       patient_id=patient_id,
                       symptoms_count=len(symptoms),
                       entities_count=len(entities))
            
            return result
            
        except Exception as e:
            logger.error("Error processing medical history", 
                        patient_id=patient_id, 
                        error=str(e))
            raise
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize medical text"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Normalize common medical abbreviations
        abbreviations = {
            'HTA': 'hipertensión arterial',
            'DM': 'diabetes mellitus',
            'EPOC': 'enfermedad pulmonar obstructiva crónica',
            'IAM': 'infarto agudo de miocardio',
            'ACV': 'accidente cerebrovascular'
        }
        
        for abbr, full in abbreviations.items():
            text = re.sub(rf'\b{abbr}\b', full, text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def _extract_age(self, text: str) -> Optional[int]:
        """Extract patient age from text"""
        age_patterns = [
            r'(\d+)\s*años?',
            r'edad\s+(\d+)',
            r'paciente\s+de\s+(\d+)\s*años?'
        ]
        
        for pattern in age_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                age = int(match.group(1))
                if 0 <= age <= 120:  # Reasonable age range
                    return age
        
        return None
    
    def _extract_gender(self, text: str) -> Optional[str]:
        """Extract patient gender from text"""
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['varón', 'hombre', 'masculino', 'paciente masculino']):
            return 'M'
        elif any(word in text_lower for word in ['mujer', 'femenino', 'paciente femenino']):
            return 'F'
        
        return None
    
    async def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract medical entities from text"""
        entities = []
        
        for entity_type, patterns in self.medical_entities.items():
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
    
    def _extract_symptoms(self, text: str) -> List[Dict[str, Any]]:
        """Extract symptoms from medical text"""
        symptoms = []
        text_lower = text.lower()
        
        for category, keywords in self.data_processor.symptom_categories.items():
            for keyword in keywords:
                if keyword in text_lower:
                    # Find the position of the symptom
                    start = text_lower.find(keyword)
                    end = start + len(keyword)
                    
                    # Try to extract severity and duration context
                    context = self._extract_symptom_context(text, start, end)
                    
                    symptoms.append({
                        "symptom": keyword,
                        "category": category,
                        "start": start,
                        "end": end,
                        "confidence": 0.7,
                        "context": context
                    })
        
        return symptoms
    
    def _extract_symptom_context(self, text: str, start: int, end: int) -> Dict[str, Any]:
        """Extract context around a symptom (severity, duration, etc.)"""
        context = {}
        
        # Extract surrounding text (50 characters before and after)
        context_start = max(0, start - 50)
        context_end = min(len(text), end + 50)
        surrounding_text = text[context_start:context_end].lower()
        
        # Look for severity indicators
        severity_patterns = {
            'leve': ['leve', 'ligero', 'suave'],
            'moderado': ['moderado', 'medio', 'regular'],
            'severo': ['severo', 'grave', 'intenso', 'fuerte']
        }
        
        for severity, keywords in severity_patterns.items():
            if any(keyword in surrounding_text for keyword in keywords):
                context['severity'] = severity
                break
        
        # Look for duration indicators
        duration_patterns = [
            r'(\d+)\s*(?:días?|semanas?|meses?|años?)',
            r'hace\s+(\d+)\s*(?:días?|semanas?|meses?|años?)'
        ]
        
        for pattern in duration_patterns:
            match = re.search(pattern, surrounding_text)
            if match:
                context['duration'] = match.group(0)
                break
        
        return context
    
    def _generate_recommendations(
        self, 
        symptoms: List[Dict], 
        diagnoses: List[str], 
        risk_factors: List[str]
    ) -> List[str]:
        """Generate medical recommendations based on extracted information"""
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
    
    def _calculate_confidence(
        self, 
        entities: List[Dict], 
        symptoms: List[Dict]
    ) -> float:
        """Calculate confidence score for the extraction"""
        if not entities and not symptoms:
            return 0.0
        
        # Base confidence on number of extracted items
        total_items = len(entities) + len(symptoms)
        confidence = min(0.9, 0.5 + (total_items * 0.1))
        
        # Boost confidence if we have both entities and symptoms
        if entities and symptoms:
            confidence += 0.1
        
        return min(0.95, confidence)


# Global processor instance
processor = MedicalHistoryProcessor()
