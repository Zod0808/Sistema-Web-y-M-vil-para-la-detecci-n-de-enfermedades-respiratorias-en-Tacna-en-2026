"""
Multi-Task Neural Network for Disease Classification

Implements:
- Parallel classification of disease, urgency, severity, and category
- Shared hidden layers for feature learning
- Task-specific branches for multi-task learning
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib


class MultiTaskNeuralNetwork:
    """Neural network with multi-task learning"""
    
    def __init__(self, input_dim: int = None, random_state: int = 42):
        """
        Initialize neural network
        
        Args:
            input_dim: Input feature dimensions
            random_state: Random seed
        """
        self.random_state = random_state
        self.input_dim = input_dim
        
        self.scaler = StandardScaler()
        self.label_encoders = {
            'disease': LabelEncoder(),
            'urgency': LabelEncoder(),
            'severity': LabelEncoder(),
            'category': LabelEncoder()
        }
        
        self.models = {}
        self.feature_names = []
        self.is_trained = False
        
        # Simple MLP implementation (can be extended with TensorFlow/PyTorch)
        from sklearn.neural_network import MLPClassifier
        
        self.models['disease'] = MLPClassifier(
            hidden_layer_sizes=(128, 64),
            max_iter=500,
            random_state=random_state,
            early_stopping=True,
            validation_fraction=0.2
        )
        
        self.models['urgency'] = MLPClassifier(
            hidden_layer_sizes=(64, 32),
            max_iter=300,
            random_state=random_state,
            early_stopping=True
        )
        
        self.models['severity'] = MLPClassifier(
            hidden_layer_sizes=(64, 32),
            max_iter=300,
            random_state=random_state,
            early_stopping=True
        )
        
        self.models['category'] = MLPClassifier(
            hidden_layer_sizes=(64, 32),
            max_iter=300,
            random_state=random_state,
            early_stopping=True
        )
    
    def prepare_multi_task_data(self, df: pd.DataFrame) -> Dict[str, Tuple[np.ndarray, np.ndarray]]:
        """
        Prepare data for multi-task learning
        
        Args:
            df: DataFrame with cases
        
        Returns:
            Dict with (X, y) tuples for each task
        """
        # Extract symptom features
        all_symptoms = set()
        for symptoms in df['symptoms']:
            if isinstance(symptoms, list):
                all_symptoms.update([s.lower() for s in symptoms])
            elif isinstance(symptoms, str):
                all_symptoms.update([s.lower() for s in symptoms.split(',')])
        
        symptom_list = sorted(all_symptoms)
        self.feature_names = symptom_list
        
        # Create feature matrix
        X = np.zeros((len(df), len(symptom_list)))
        for i, symptoms in enumerate(df['symptoms']):
            if isinstance(symptoms, list):
                symptom_set = {s.lower() for s in symptoms}
            else:
                symptom_set = {s.lower() for s in symptoms.split(',')}
            
            for j, symptom in enumerate(symptom_list):
                if symptom in symptom_set:
                    X[i, j] = 1
        
        # Scale features
        X = self.scaler.fit_transform(X)
        
        # Prepare labels for each task
        tasks_data = {}
        
        # Task 1: Disease classification
        tasks_data['disease'] = (
            X,
            self.label_encoders['disease'].fit_transform(df['disease'])
        )
        
        # Task 2: Urgency level
        urgency_labels = df['urgency'].apply(lambda x: x.lower() if x else 'medium')
        tasks_data['urgency'] = (
            X,
            self.label_encoders['urgency'].fit_transform(urgency_labels)
        )
        
        # Task 3: Severity level
        severity_labels = df['severity'].apply(lambda x: x.lower() if x else 'moderate')
        tasks_data['severity'] = (
            X,
            self.label_encoders['severity'].fit_transform(severity_labels)
        )
        
        # Task 4: Category
        if 'category' in df.columns:
            tasks_data['category'] = (
                X,
                self.label_encoders['category'].fit_transform(df['category'])
            )
        
        return tasks_data
    
    def train(self, tasks_data: Dict[str, Tuple[np.ndarray, np.ndarray]], test_size: float = 0.2):
        """
        Train all task-specific models
        
        Args:
            tasks_data: Dict with (X, y) for each task
            test_size: Proportion of test set
        """
        print("Training multi-task neural networks...")
        
        for task_name, (X, y) in tasks_data.items():
            if task_name not in self.models:
                continue
            
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=self.random_state, stratify=y
            )
            
            print(f"\nTraining {task_name} classifier...")
            self.models[task_name].fit(X_train, y_train)
            
            train_score = self.models[task_name].score(X_train, y_train)
            test_score = self.models[task_name].score(X_test, y_test)
            
            print(f"  Training accuracy: {train_score:.4f}")
            print(f"  Test accuracy: {test_score:.4f}")
        
        self.is_trained = True
    
    def predict_all_tasks(self, symptoms: List[str]) -> Dict[str, Any]:
        """
        Predict all tasks simultaneously
        
        Args:
            symptoms: List of symptom strings
        
        Returns:
            Dict with predictions for all tasks
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        # Convert symptoms to feature vector
        X = self._symptoms_to_features(symptoms)
        X = self.scaler.transform(X.reshape(1, -1))
        
        predictions = {}
        
        # Predict disease
        disease_pred = self.models['disease'].predict(X)[0]
        disease_proba = self.models['disease'].predict_proba(X)[0]
        predictions['disease'] = {
            'name': self.label_encoders['disease'].inverse_transform([disease_pred])[0],
            'confidence': float(disease_proba[disease_pred])
        }
        
        # Predict urgency
        urgency_pred = self.models['urgency'].predict(X)[0]
        predictions['urgency'] = self.label_encoders['urgency'].inverse_transform([urgency_pred])[0]
        
        # Predict severity
        severity_pred = self.models['severity'].predict(X)[0]
        predictions['severity'] = self.label_encoders['severity'].inverse_transform([severity_pred])[0]
        
        # Predict category (if trained)
        if 'category' in self.models:
            category_pred = self.models['category'].predict(X)[0]
            predictions['category'] = self.label_encoders['category'].inverse_transform([category_pred])[0]
        
        return predictions
    
    def _symptoms_to_features(self, symptoms: List[str]) -> np.ndarray:
        """Convert symptom list to feature vector"""
        symptom_set = {s.lower() for s in symptoms}
        features = np.zeros(len(self.feature_names))
        
        for i, symptom in enumerate(self.feature_names):
            if symptom in symptom_set:
                features[i] = 1
        
        return features
    
    def save_model(self, filepath: str):
        """Save trained model to file"""
        joblib.dump({
            'models': self.models,
            'label_encoders': self.label_encoders,
            'feature_names': self.feature_names,
            'scaler': self.scaler
        }, filepath)
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model from file"""
        data = joblib.load(filepath)
        self.models = data['models']
        self.label_encoders = data['label_encoders']
        self.feature_names = data['feature_names']
        self.scaler = data['scaler']
        self.is_trained = True
        print(f"Model loaded from {filepath}")


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
    classifier = MultiTaskNeuralNetwork()
    tasks_data = classifier.prepare_multi_task_data(df)
    classifier.train(tasks_data)
    
    # Test prediction
    test_symptoms = ['tos', 'sibilancias', 'dificultad para respirar']
    predictions = classifier.predict_all_tasks(test_symptoms)
    
    print("\nMulti-task predictions:")
    print(f"Disease: {predictions['disease']['name']} (confidence: {predictions['disease']['confidence']:.4f})")
    print(f"Urgency: {predictions['urgency']}")
    print(f"Severity: {predictions['severity']}")

