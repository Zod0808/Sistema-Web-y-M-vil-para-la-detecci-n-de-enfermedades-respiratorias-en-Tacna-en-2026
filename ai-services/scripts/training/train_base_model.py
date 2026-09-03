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
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple
import json

# Agregar raíz del proyecto (ai-services) al path para reutilizar services/
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from services.medical_validation_rules import MedicalValidationRules

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
        
        # Split data — sin stratify para tolerar clases con pocas muestras
        import numpy as np
        counts = np.bincount(y_encoded)
        can_stratify = int(counts.min()) >= 2
        X_train, X_test, y_train, y_test = train_test_split(
            X_vectorized, y_encoded, test_size=0.2, random_state=42,
            stratify=y_encoded if can_stratify else None
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


def _resolve_dataset(path: str) -> str:
    """Busca el dataset en rutas alternativas si el path no existe."""
    import os
    if os.path.exists(path):
        return path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ai_root    = os.path.join(script_dir, '..', '..')
    candidates = [
        os.path.join(ai_root, 'data', 'datasets', 'modelo1', 'synthetic', 'augmented_dataset_retraining_20251103_123539.csv'),
        os.path.join(ai_root, 'data', 'datasets', 'modelo1', 'synthetic', 'augmented_dataset_full_20251103_124126.csv'),
        os.path.join(ai_root, 'data', 'datasets', 'modelo1', 'synthetic', 'synthetic_dataset_extended.csv'),
        os.path.join(ai_root, 'data', 'datasets', 'modelo1', 'synthetic', 'synthetic_dataset.csv'),
        os.path.join(ai_root, 'data', 'datasets', 'modelo1', 'real_approved', 'real_dataset_respicare.csv'),
    ]
    for c in candidates:
        if os.path.exists(c):
            print(f"  Dataset auto-detectado: {c}")
            return c
    raise FileNotFoundError(f"No se encontro ningun dataset. Proporciona --dataset <path>")


def main():
    """Main training script"""
    import argparse
    parser = argparse.ArgumentParser(description='Entrena Random Forest para RespiCare')
    parser.add_argument('--dataset', type=str, default='synthetic_dataset.csv',
                        help='Ruta al dataset de entrenamiento (.csv con columnas disease, symptoms)')
    parser.add_argument('--output', type=str, default='models/base_random_forest.pkl',
                        help='Ruta de salida del modelo entrenado')
    parser.add_argument('--estimators', type=int, default=300,
                        help='Numero de arboles del Random Forest')
    args = parser.parse_args()

    print("=== Training Base Random Forest Model ===")

    # Initialize model
    model = BaseRandomForestModel(n_estimators=args.estimators)

    # Resolver dataset
    dataset_path = _resolve_dataset(args.dataset)

    # Load data
    cases = model.prepare_data(dataset_path)
    
    # Train model
    model.train(cases)
    
    # Save model
    import os as _os
    _os.makedirs(_os.path.dirname(args.output) if _os.path.dirname(args.output) else '.', exist_ok=True)
    model.save_model(args.output)
    
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

