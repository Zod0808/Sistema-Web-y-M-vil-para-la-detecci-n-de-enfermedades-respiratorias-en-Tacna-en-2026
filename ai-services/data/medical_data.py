"""
Medical data processing utilities and sample datasets
"""

from typing import List, Dict, Any
import json
from pathlib import Path


class MedicalDataProcessor:
    """Processes and manages medical data for AI training and inference"""
    
    def __init__(self):
        self.symptom_categories = {
            "respiratory": [
                "tos", "tos seca", "tos con flema", "dificultad respiratoria",
                "falta de aire", "sibilancias", "opresión en el pecho",
                "dolor de pecho", "respiración rápida", "ahogo"
            ],
            "fever": [
                "fiebre", "temperatura alta", "escalofríos", "malestar general",
                "sudoración", "calor", "frío", "temblor"
            ],
            "pain": [
                "dolor de cabeza", "dolor de garganta", "dolor muscular",
                "dolor articular", "dolor de espalda", "dolor abdominal",
                "dolor de oído", "dolor de cuello"
            ],
            "digestive": [
                "náuseas", "vómitos", "diarrea", "dolor abdominal",
                "pérdida de apetito", "acidez", "indigestión"
            ],
            "fatigue": [
                "cansancio", "fatiga", "debilidad", "agotamiento",
                "somnolencia", "letargo", "falta de energía"
            ],
            "neurological": [
                "mareos", "desmayos", "confusión", "dolor de cabeza severo",
                "pérdida de conciencia", "convulsiones"
            ]
        }
        
        self.diagnosis_mapping = {
            "respiratory": [
                "Asma", "Bronquitis", "Neumonía", "EPOC",
                "Infección respiratoria aguda", "Sinusitis"
            ],
            "fever": [
                "Infección viral", "Infección bacteriana", "Gripe",
                "Resfriado común", "Síndrome febril"
            ],
            "pain": [
                "Migraña", "Cefalea tensional", "Dolor muscular",
                "Artritis", "Fibromialgia"
            ],
            "digestive": [
                "Gastritis", "Gastroenteritis", "Síndrome del intestino irritable",
                "Úlcera péptica", "Intoxicación alimentaria"
            ]
        }
        
        self.risk_factors = [
            "tabaquismo", "diabetes", "hipertensión", "obesidad",
            "edad avanzada", "antecedentes familiares", "inmunosupresión",
            "enfermedad cardiovascular", "enfermedad renal crónica"
        ]
    
    def categorize_symptoms(self, symptoms: List[str]) -> Dict[str, List[str]]:
        """Categorize symptoms by type"""
        categorized = {category: [] for category in self.symptom_categories.keys()}
        
        for symptom in symptoms:
            symptom_lower = symptom.lower()
            for category, keywords in self.symptom_categories.items():
                if any(keyword in symptom_lower for keyword in keywords):
                    categorized[category].append(symptom)
        
        return categorized
    
    def suggest_diagnosis(self, symptom_categories: Dict[str, List[str]]) -> List[str]:
        """Suggest possible diagnoses based on symptom categories"""
        suggestions = []
        
        for category, symptoms in symptom_categories.items():
            if symptoms and category in self.diagnosis_mapping:
                suggestions.extend(self.diagnosis_mapping[category])
        
        # Remove duplicates and return top suggestions
        return list(set(suggestions))[:5]
    
    def extract_risk_factors(self, text: str) -> List[str]:
        """Extract risk factors from medical text"""
        text_lower = text.lower()
        found_factors = []
        
        for factor in self.risk_factors:
            if factor in text_lower:
                found_factors.append(factor)
        
        return found_factors
    
    def calculate_severity_score(self, symptoms: List[Dict[str, Any]]) -> float:
        """Calculate overall severity score based on symptoms"""
        if not symptoms:
            return 0.0
        
        # Weight different categories differently
        category_weights = {
            "respiratory": 0.9,
            "neurological": 0.8,
            "fever": 0.7,
            "pain": 0.5,
            "digestive": 0.4,
            "fatigue": 0.3
        }
        
        total_score = 0.0
        total_weight = 0.0
        
        for symptom in symptoms:
            category = symptom.get("category", "unknown")
            confidence = symptom.get("confidence", 0.5)
            weight = category_weights.get(category, 0.3)
            
            total_score += confidence * weight
            total_weight += weight
        
        return total_score / total_weight if total_weight > 0 else 0.0


def get_sample_medical_histories() -> List[Dict[str, Any]]:
    """Get sample medical histories for testing"""
    return [
        {
            "patient_id": "P001",
            "text": "Paciente de 45 años con tos seca persistente de 2 semanas, dificultad respiratoria leve, fiebre intermitente de 38°C. Antecedentes de tabaquismo por 20 años. No alergias conocidas.",
            "language": "es",
            "metadata": {"source": "emergency_room", "doctor": "Dr. García"}
        },
        {
            "patient_id": "P002", 
            "text": "Mujer de 32 años con dolor de cabeza severo, náuseas y vómitos de 3 días. Fiebre de 39°C. Antecedentes familiares de migraña. Sin signos de rigidez nucal.",
            "language": "es",
            "metadata": {"source": "clinic", "doctor": "Dr. López"}
        },
        {
            "patient_id": "P003",
            "text": "Varón de 58 años diabético con dolor abdominal, diarrea y fiebre de 37.5°C. Antecedentes de hipertensión arterial. Medicación: metformina, losartán.",
            "language": "es", 
            "metadata": {"source": "hospital", "doctor": "Dr. Martínez"}
        }
    ]


def get_sample_symptoms() -> List[Dict[str, Any]]:
    """Get sample symptoms for testing"""
    return [
        {
            "patient_id": "P001",
            "symptoms": [
                {"symptom": "tos seca", "severity": "moderate", "duration": "2 semanas"},
                {"symptom": "dificultad respiratoria", "severity": "mild", "duration": "1 semana"},
                {"symptom": "fiebre", "severity": "moderate", "duration": "3 días"}
            ],
            "context": "Síntomas respiratorios persistentes con antecedentes de tabaquismo",
            "metadata": {"age": 45, "gender": "M"}
        },
        {
            "patient_id": "P002",
            "symptoms": [
                {"symptom": "dolor de cabeza", "severity": "severe", "duration": "3 días"},
                {"symptom": "náuseas", "severity": "moderate", "duration": "2 días"},
                {"symptom": "vómitos", "severity": "mild", "duration": "1 día"}
            ],
            "context": "Cefalea severa con síntomas gastrointestinales",
            "metadata": {"age": 32, "gender": "F"}
        }
    ]


def create_sample_datasets():
    """Create sample datasets for development and testing"""
    data_dir = Path("data/samples")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Save sample medical histories
    with open(data_dir / "medical_histories.json", "w", encoding="utf-8") as f:
        json.dump(get_sample_medical_histories(), f, indent=2, ensure_ascii=False)
    
    # Save sample symptoms
    with open(data_dir / "symptoms.json", "w", encoding="utf-8") as f:
        json.dump(get_sample_symptoms(), f, indent=2, ensure_ascii=False)
    
    print("Sample datasets created successfully")


if __name__ == "__main__":
    create_sample_datasets()
