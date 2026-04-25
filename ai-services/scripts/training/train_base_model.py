"""
Train Base Model (Random Forest) with Emergency Rules

This script:
1. Loads the synthetic dataset
2. Trains Random Forest model
3. Implements emergency rule system
4. Validates with medical rules
"""

import csv
import random
from typing import List, Dict, Any, Tuple
import json

# Try to import ML libraries
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    print("Pandas not available. Using basic CSV reading.")

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from sklearn.metrics import classification_report, accuracy_score
    from sklearn.feature_extraction.text import CountVectorizer
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("scikit-learn not available. Cannot train model.")


class EmergencyRuleSystem:
    """Medical emergency rule system"""
    
    def __init__(self):
        self.critical_symptoms = {
            'critica': [
                'cianosis', 'dificultad respiratoria extrema', 'confusion severa',
                'hipotension marcada', 'taquicardia extrema', 'hemoptisis masiva',
                'shock', 'coma', 'convulsiones respiratorias', 'apnea',
                'parada cardio-respiratoria', 'grado', 'muy alta gravedad',
                'insuficiencia respiratoria aguda severa'
            ],
            'alta': [
                'dificultad respiratoria marcada', 'fiebre muy alta', 'dolor toracico severo',
                'escalofrios intensos', 'desorientacion', 'taquicardia extrema',
                'hemoptisis', 'dificultad respiratoria severa', 'confusion',
                'hipotension', 'cianosis', 'estridor severo'
            ],
            'media': [
                'dificultad respiratoria moderada', 'fiebre', 'tos persistente',
                'dolor de garganta severo', 'fatiga extrema', 'malestar general intenso',
                'dolor toracico', 'disnea', 'sibilancias'
            ],
            'baja': [
                'congestion nasal', 'estornudos', 'tos leve', 'malestar ligero',
                'dolor de cabeza leve', 'picazon nasal', 'lagrimeo'
            ]
        }
    
    def check_emergency(self, symptoms: str) -> Dict[str, Any]:
        """
        Check if symptoms indicate medical emergency
        
        Args:
            symptoms: Comma-separated symptom string
        
        Returns:
            Dict with emergency status and action
        """
        symptoms_lower = symptoms.lower()
        
        # Check critical
        for keyword in self.critical_symptoms['critica']:
            if keyword in symptoms_lower:
                return {
                    'is_emergency': True,
                    'urgency_level': 'critica',
                    'action': 'ATENCION MEDICA INMEDIATA - BUSCAR SERVICIO DE URGENCIAS AHORA',
                    'reason': f'Sintoma critico detectado: {keyword}',
                    'predicted_disease': 'Emergencia Medica Critica'
                }
        
        # Check high urgency
        for keyword in self.critical_symptoms['alta']:
            if keyword in symptoms_lower:
                return {
                    'is_emergency': False,
                    'urgency_level': 'alta',
                    'action': 'Buscar atencion medica en las proximas horas',
                    'reason': f'Sintoma de alta urgencia: {keyword}',
                    'needs_medical_attention': True
                }
        
        # Check medium
        for keyword in self.critical_symptoms['media']:
            if keyword in symptoms_lower:
                return {
                    'is_emergency': False,
                    'urgency_level': 'media',
                    'action': 'Consulta medica recomendada en 24-48 horas',
                    'reason': f'Sintoma moderado: {keyword}',
                    'needs_medical_attention': True
                }
        
        # Default low
        return {
            'is_emergency': False,
            'urgency_level': 'baja',
            'action': 'Monitorear sintomas y buscar atencion si empeoran',
            'needs_medical_attention': False
        }


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


class BaseRandomForestModel:
    """Base Random Forest model with emergency rules"""
    
    def __init__(self, n_estimators: int = 300):
        self.n_estimators = n_estimators
        self.emergency_system = EmergencyRuleSystem()
        self.validation_system = MedicalValidationRules()
        self.model = None
        self.label_encoder = LabelEncoder() if HAS_SKLEARN else None
        self.vectorizer = None
        self.is_trained = False
    
    def prepare_data(self, csv_file: str):
        """Load and prepare data from CSV"""
        print(f"Loading data from {csv_file}...")
        
        cases = []
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                cases.append(row)
        
        print(f"Loaded {len(cases)} cases")
        return cases
    
    def train(self, cases: List[Dict[str, Any]]):
        """Train Random Forest model"""
        if not HAS_SKLEARN:
            print("ERROR: scikit-learn not available. Cannot train model.")
            return
        
        print("\n=== Training Random Forest Model ===")
        print(f"Number of trees: {self.n_estimators}")
        
        # Prepare features (symptoms) and labels (diseases)
        X = []
        y = []
        
        for case in cases:
            symptoms = case['symptoms']
            disease = case['disease']
            
            X.append(symptoms)
            y.append(disease)
        
        # Vectorize symptoms
        print("Vectorizing symptoms...")
        self.vectorizer = CountVectorizer(
            max_features=500,
            ngram_range=(1, 3),
            stop_words='english'
        )
        X_vectorized = self.vectorizer.fit_transform(X).toarray()
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        
        print(f"Features: {X_vectorized.shape[1]}")
        print(f"Classes: {len(self.label_encoder.classes_)}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_vectorized, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        # Train model
        print("Training Random Forest...")
        self.model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            max_depth=20,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        print(f"\n=== Training Results ===")
        print(f"Training accuracy: {train_score:.4f}")
        print(f"Test accuracy: {test_score:.4f}")
        
        # Classification report
        y_pred = self.model.predict(X_test)
        print(f"\nClassification Report:")
        print(classification_report(y_test, y_pred, 
                                   target_names=self.label_encoder.classes_))
        
        self.is_trained = True
    
    def predict_with_validation(self, symptoms: str, patient_age: int = 35) -> Dict[str, Any]:
        """
        Predict disease with emergency checks and medical validation
        
        Args:
            symptoms: Comma-separated symptoms
            patient_age: Patient age
        
        Returns:
            Dict with prediction, emergency status, and validation
        """
        if not self.is_trained:
            return {
                'error': 'Model not trained yet',
                'suggestion': 'Train model first using train() method'
            }
        
        # Step 1: Check emergency
        emergency_check = self.emergency_system.check_emergency(symptoms)
        if emergency_check.get('is_emergency'):
            return {
                'prediction': emergency_check,
                'skip_ml': True,
                'urgency': 'critica'
            }
        
        # Step 2: ML prediction
        X = self.vectorizer.transform([symptoms]).toarray()
        prediction_idx = self.model.predict(X)[0]
        prediction_proba = self.model.predict_proba(X)[0]
        
        disease = self.label_encoder.inverse_transform([prediction_idx])[0]
        confidence = prediction_proba[prediction_idx]
        
        # Step 3: Medical validation
        validation = self.validation_system.validate_prediction(disease, symptoms, patient_age)
        
        # Adjust confidence based on validation
        final_confidence = confidence + validation['confidence_adjustment']
        final_confidence = max(0.0, min(1.0, final_confidence))
        
        return {
            'disease': disease,
            'confidence': float(final_confidence),
            'urgency': emergency_check.get('urgency_level', 'baja'),
            'emergency_check': emergency_check,
            'validation': validation,
            'needs_medical_attention': emergency_check.get('needs_medical_attention', False)
        }
    
    def save_model(self, filepath: str):
        """Save trained model"""
        import joblib
        joblib.dump({
            'model': self.model,
            'label_encoder': self.label_encoder,
            'vectorizer': self.vectorizer
        }, filepath)
        print(f"Model saved to {filepath}")


def main():
    """Main training script"""
    print("=== Training Base Random Forest Model ===")
    
    # Initialize model
    model = BaseRandomForestModel(n_estimators=300)
    
    # Load data
    cases = model.prepare_data('synthetic_dataset.csv')
    
    # Train model
    model.train(cases)
    
    # Save model
    model.save_model('models/base_random_forest.pkl')
    
    # Test prediction
    print("\n=== Testing Model ===")
    test_symptoms = "tos, sibilancias, dificultad respiratoria, opresion pecho"
    prediction = model.predict_with_validation(test_symptoms, patient_age=35)
    
    print(f"\nSymptoms: {test_symptoms}")
    print(f"Prediction: {prediction['disease']}")
    print(f"Confidence: {prediction['confidence']:.4f}")
    print(f"Urgency: {prediction['urgency']}")
    
    if prediction['validation']['warnings']:
        print("Warnings:")
        for warning in prediction['validation']['warnings']:
            print(f"  - {warning}")
    
        print("\nModel training complete!")


if __name__ == "__main__":
    main()

