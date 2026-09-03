"""
Medical Validation Rules

Coherence checks applied to a predicted disease given the reported symptoms
and patient age, to catch clinically implausible predictions before they
reach the patient (RF-005).
"""

from typing import Any, Dict


class MedicalValidationRules:
    """Medical validation rules to ensure plausible predictions"""

    def __init__(self):
        self.validation_rules = {
            'required_symptoms': {
                'asma': ['sibilancias', 'dificultad respiratoria'],
                'neumonia': ['fiebre', 'tos'],
                'bronquitis': ['tos'],
                'covid-19': ['fiebre', 'tos'],
                'influenza': ['fiebre'],
                'epoc': ['tos crónica', 'disnea'],
                'resfriado': ['congestión nasal'],
                'sinusitis': ['dolor facial'],
                'faringitis': ['dolor de garganta'],
                'rinitis': ['estornudos', 'congestión nasal']
            },
            'symptom_intensity': {
                'asma': {'sibilancias': 'required'},
                'neumonia': {'fiebre': 'high', 'tos': 'required'},
                'influenza': {'fiebre': 'high'},
                'resfriado': {'fiebre': 'low'}
            },
            'age_restrictions': {
                'bronquiolitis': (0, 2),  # Only in infants
                'crup': (1, 5),  # Common in toddlers
                'enfisema': (50, 100)  # Common in elderly
            }
        }

    def validate_prediction(self, disease: str, symptoms: str, age: int) -> Dict[str, Any]:
        """
        Validate if predicted disease is plausible given symptoms and age

        Returns:
            Dict with validation status and any warnings
        """
        symptoms_lower = symptoms.lower()

        validation_status = {
            'is_valid': True,
            'warnings': [],
            'confidence_adjustment': 0.0
        }

        # Check age restrictions
        for disease_name, (min_age, max_age) in self.validation_rules['age_restrictions'].items():
            if disease_name.lower() in disease.lower():
                if not (min_age <= age <= max_age):
                    validation_status['warnings'].append(
                        f"Enfermedad '{disease}' típicamente presenta en edad {min_age}-{max_age}, paciente tiene {age} años"
                    )
                    validation_status['confidence_adjustment'] -= 0.2

        # Check required symptoms
        for disease_name, required in self.validation_rules['required_symptoms'].items():
            if disease_name.lower() in disease.lower():
                missing = []
                for req_symptom in required:
                    if req_symptom.lower() not in symptoms_lower:
                        missing.append(req_symptom)

                if missing:
                    validation_status['warnings'].append(
                        f"Faltan síntomas típicos de '{disease}': {', '.join(missing)}"
                    )
                    validation_status['confidence_adjustment'] -= 0.15

        if validation_status['warnings']:
            validation_status['is_valid'] = False

        return validation_status
