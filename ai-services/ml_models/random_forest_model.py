"""
Random Forest Classifier for Disease Classification

Implements:
- Random Forest with 100-500 trees
- Emergency rule system
- Feature importance analysis
- Confidence scoring
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib


class RandomForestDiseaseClassifier:
    """Random Forest classifier for respiratory disease classification"""
    
    def __init__(self, n_estimators: int = 300, max_depth: int = 20, random_state: int = 42):
        """
        Initialize Random Forest classifier
        
        Args:
            n_estimators: Number of trees (100-500 recommended)
            max_depth: Maximum depth of trees
            random_state: Random seed for reproducibility
        """
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.random_state = random_state
        
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=random_state,
            n_jobs=-1,
            oob_score=True
        )
        
        self.label_encoder = LabelEncoder()
        self.is_trained = False
        
        # Emergency rules for critical conditions
        self.emergency_rules = self._define_emergency_rules()
    
    def _define_emergency_rules(self) -> Dict[str, List[str]]:
        """Define emergency rules for critical symptoms"""
        return {
            'critical': [
                'cianosis', 'dificultad respiratoria severa', 'confusion',
                'hipotension', 'taquicardia extrema', 'hemoptisis masiva'
            ],
            'high': [
                'dificultad respiratoria', 'fiebre alta', 'dolor toracico',
                'escalofrios intensos', 'confusion mental'
            ],
            'medium': [
                'fiebre', 'tos persistente', 'dolor de garganta',
                'malestar general', 'fatiga'
            ],
            'low': [
                'congestion nasal', 'estornudos', 'tos leve',
                'malestar ligero'
            ]
        }
    
    def prepare_features(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare features and labels from dataset
        
        Args:
            df: DataFrame with cases
        
        Returns:
            Tuple of (features, labels)
        """
        # Extract symptom features
        symptom_cols = [col for col in df.columns if col not in 
                       ['disease', 'urgency', 'severity', 'category', 'patient_age', 'symptom_count']]
        
        # If symptoms are in a single column, need to encode them
        if 'symptoms' in df.columns:
            # Convert symptoms list to binary features
            all_symptoms = set()
            for symptoms in df['symptoms']:
                if isinstance(symptoms, list):
                    all_symptoms.update([s.lower() for s in symptoms])
                elif isinstance(symptoms, str):
                    all_symptoms.update([s.lower() for s in symptoms.split(',')])
            
            # Create binary feature matrix
            X = np.zeros((len(df), len(all_symptoms)))
            symptom_list = sorted(all_symptoms)
            
            for i, symptoms in enumerate(df['symptoms']):
                if isinstance(symptoms, list):
                    symptom_set = {s.lower() for s in symptoms}
                else:
                    symptom_set = {s.lower() for s in symptoms.split(',')}
                
                for j, symptom in enumerate(symptom_list):
                    if symptom in symptom_set:
                        X[i, j] = 1
            
            # Encode labels
            y = self.label_encoder.fit_transform(df['disease'])
            
            return X, y
        else:
            # Use existing columns as features
            X = df[symptom_cols].values
            y = self.label_encoder.fit_transform(df['disease'])
            return X, y
    
    def train(self, X: np.ndarray, y: np.ndarray, test_size: float = 0.2):
        """
        Train Random Forest model
        
        Args:
            X: Feature matrix
            y: Labels
            test_size: Proportion of test set
        """
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=y
        )
        
        print(f"Training Random Forest with {self.n_estimators} trees...")
        self.model.fit(X_train, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        oob_score = self.model.oob_score_
        
        print(f"Training accuracy: {train_score:.4f}")
        print(f"Test accuracy: {test_score:.4f}")
        print(f"OOB score: {oob_score:.4f}")
        
        # Get feature importances
        feature_importances = self.model.feature_importances_
        print(f"\nTop 10 most important symptoms:")
        for i in np.argsort(feature_importances)[-10:][::-1]:
            print(f"  Feature {i}: {feature_importances[i]:.4f}")
        
        self.is_trained = True
    
    def predict(self, symptoms: List[str], all_symptoms: List[str]) -> Dict[str, Any]:
        """
        Predict disease from symptoms
        
        Args:
            symptoms: List of symptom strings
            all_symptoms: Complete list of all possible symptoms
        
        Returns:
            Dict with prediction, confidence, and details
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        # Check emergency rules first
        emergency_check = self._check_emergency_rules(symptoms)
        if emergency_check['is_emergency']:
            return emergency_check
        
        # Convert symptoms to feature vector
        feature_vector = np.zeros(len(all_symptoms))
        symptoms_lower = [s.lower() for s in symptoms]
        
        for i, symptom in enumerate(all_symptoms):
            if symptom.lower() in symptoms_lower:
                feature_vector[i] = 1
        
        # Predict
        prediction_idx = self.model.predict(feature_vector.reshape(1, -1))[0]
        prediction_probs = self.model.predict_proba(feature_vector.reshape(1, -1))[0]
        
        disease_name = self.label_encoder.inverse_transform([prediction_idx])[0]
        confidence = prediction_probs[prediction_idx]
        
        # Get top 3 predictions
        top_indices = np.argsort(prediction_probs)[-3:][::-1]
        top_predictions = [
            {
                'disease': self.label_encoder.inverse_transform([idx])[0],
                'confidence': float(prediction_probs[idx])
            }
            for idx in top_indices
        ]
        
        return {
            'disease': disease_name,
            'confidence': float(confidence),
            'top_3_predictions': top_predictions,
            'urgency_level': self._classify_urgency(symptoms),
            'is_emergency': False,
            'feature_importance': self._get_feature_importance(symptoms, all_symptoms)
        }
    
    def _check_emergency_rules(self, symptoms: List[str]) -> Dict[str, Any]:
        """Check if symptoms match emergency rules"""
        symptoms_lower = [s.lower() for s in symptoms]
        
        for urgency, keywords in self.emergency_rules.items():
            if urgency in ['critical', 'high']:
                for keyword in keywords:
                    if keyword.lower() in ' '.join(symptoms_lower):
                        return {
                            'disease': 'Emergencia médica',
                            'confidence': 1.0,
                            'urgency_level': urgency,
                            'is_emergency': True,
                            'warning': 'BUSCAR ATENCIÓN MÉDICA INMEDIATA'
                        }
        
        return {'is_emergency': False}
    
    def _classify_urgency(self, symptoms: List[str]) -> str:
        """Classify urgency based on symptoms"""
        symptoms_lower = [s.lower() for s in symptoms]
        symptoms_text = ' '.join(symptoms_lower)
        
        for urgency, keywords in self.emergency_rules.items():
            for keyword in keywords:
                if keyword.lower() in symptoms_text:
                    return urgency
        
        return 'medium'
    
    def _get_feature_importance(self, symptoms: List[str], all_symptoms: List[str]) -> List[Tuple[str, float]]:
        """Get importance scores for matched symptoms"""
        if not hasattr(self.model, 'feature_importances_'):
            return []
        
        importance_scores = []
        symptoms_lower = [s.lower() for s in symptoms]
        
        for i, symptom in enumerate(all_symptoms):
            if symptom.lower() in symptoms_lower:
                importance = self.model.feature_importances_[i]
                importance_scores.append((symptom, float(importance)))
        
        # Sort by importance
        importance_scores.sort(key=lambda x: x[1], reverse=True)
        
        return importance_scores
    
    def save_model(self, filepath: str):
        """Save trained model to file"""
        joblib.dump({
            'model': self.model,
            'label_encoder': self.label_encoder
        }, filepath)
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model from file"""
        data = joblib.load(filepath)
        self.model = data['model']
        self.label_encoder = data['label_encoder']
        self.is_trained = True
        print(f"Model loaded from {filepath}")


# Backwards compatibility aliases for legacy imports
RandomForestClassifier = RandomForestDiseaseClassifier
RandomForestModel = RandomForestDiseaseClassifier


if __name__ == "__main__":
    # Example usage
    from synthetic_dataset_generator import SyntheticDatasetGenerator
    
    # Generate synthetic data
    generator = SyntheticDatasetGenerator()
    df = generator.generate_dataset(
        samples_per_disease={
            'asma bronquial': 100,
            'neumonía': 100,
            'bronquitis aguda': 100
        }
    )
    
    # Train model
    classifier = RandomForestDiseaseClassifier(n_estimators=200)
    X, y = classifier.prepare_features(df)
    classifier.train(X, y)
    
    # Test prediction
    test_symptoms = ['tos', 'sibilancias', 'dificultad para respirar']
    all_symptoms = generator.symptom_keywords
    prediction = classifier.predict(test_symptoms, all_symptoms)
    
    print(f"\nPrediction: {prediction['disease']}")
    print(f"Confidence: {prediction['confidence']:.4f}")

