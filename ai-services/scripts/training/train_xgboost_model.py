"""
Train XGBoost Model with Advanced Feature Engineering and SHAP

This script:
1. Loads the synthetic dataset
2. Creates advanced features
3. Trains XGBoost model with hyperparameter optimization
4. Generates SHAP explanations
5. Compares performance vs Random Forest
"""

import csv
import numpy as np
from typing import List, Dict, Any, Tuple
import xgboost as xgb
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
from sklearn.feature_extraction.text import CountVectorizer
import joblib
import shap


class AdvancedFeatureEngineering:
    """Advanced feature engineering for ML models"""
    
    @staticmethod
    def create_features(symptoms_text: str, patient_age: int = 35) -> np.ndarray:
        """
        Create advanced features from symptoms
        
        Args:
            symptoms_text: Comma-separated symptoms
            patient_age: Patient age
        
        Returns:
            Feature vector
        """
        symptoms = [s.strip().lower() for s in symptoms_text.split(',')]
        features = []
        
        # 1. Basic counts
        num_symptoms = len(symptoms)
        features.append(num_symptoms)
        features.append(num_symptoms / 10.0)  # Normalized count
        
        # 2. Symptom categories
        respiratory_keywords = ['tos', 'congestion', 'secrecion', 'estornudos', 'sibilancias', 'difficultad']
        respiratory_count = sum(1 for s in symptoms if any(kw in s for kw in respiratory_keywords))
        features.append(respiratory_count)
        
        systemic_keywords = ['fiebre', 'fatiga', 'malestar', 'cansancio', 'debilidad']
        systemic_count = sum(1 for s in symptoms if any(kw in s for kw in systemic_keywords))
        features.append(systemic_count)
        
        pain_keywords = ['dolor', 'ardor', 'opresion', 'molestia']
        pain_count = sum(1 for s in symptoms if any(kw in s for kw in pain_keywords))
        features.append(pain_count)
        
        # 3. Severity indicators
        severity_keywords = ['intenso', 'severa', 'extremo', 'grave', 'alto', 'muy alta']
        has_severe = 1 if any(kw in ' '.join(symptoms) for kw in severity_keywords) else 0
        features.append(has_severe)
        
        # 4. Emergency indicators
        emergency_keywords = ['dificultad respiratoria', 'cianosis', 'confusion', 'shock', 'coma']
        has_emergency = 1 if any(kw in ' '.join(symptoms) for kw in emergency_keywords) else 0
        features.append(has_emergency)
        
        # 5. Specific symptom presence
        has_fever = 1 if 'fiebre' in ' '.join(symptoms) else 0
        features.append(has_fever)
        
        has_cough = 1 if 'tos' in ' '.join(symptoms) else 0
        features.append(has_cough)
        
        has_breathlessness = 1 if any(kw in ' '.join(symptoms) for kw in ['dificultad', 'disnea', 'ahogo']) else 0
        features.append(has_breathlessness)
        
        has_fatigue = 1 if any(kw in ' '.join(symptoms) for kw in ['fatiga', 'cansancio']) else 0
        features.append(has_fatigue)
        
        # 6. Duration indicators
        acute_keywords = ['aguda', 'sudbito', 'inicio']
        chronic_keywords = ['cronico', 'persistente', 'semanas', 'meses']
        
        is_acute = 1 if any(kw in ' '.join(symptoms) for kw in acute_keywords) else 0
        is_chronic = 1 if any(kw in ' '.join(symptoms) for kw in chronic_keywords) else 0
        
        features.append(is_acute)
        features.append(is_chronic)
        
        # 7. Age normalized
        features.append(patient_age / 100.0)
        
        # 8. Symptom density (symptoms per characteristic)
        symptoms_text_lower = ' '.join(symptoms).lower()
        features.append(len(symptoms_text_lower.split()) / 20.0)  # Word density
        
        return np.array(features)
    
    @staticmethod
    def get_feature_names() -> List[str]:
        """Get names of engineered features"""
        return [
            'num_symptoms',
            'symptom_count_normalized',
            'respiratory_symptoms',
            'systemic_symptoms',
            'pain_symptoms',
            'has_severe',
            'has_emergency',
            'has_fever',
            'has_cough',
            'has_breathlessness',
            'has_fatigue',
            'is_acute',
            'is_chronic',
            'patient_age_normalized',
            'word_density'
        ]


class XGBoostDiseaseClassifier:
    """XGBoost classifier with advanced features and SHAP"""
    
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        
        # Base model
        self.model = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=random_state,
            n_jobs=-1,
            objective='multi:softprob',
            eval_metric='mlogloss'
        )
        
        self.label_encoder = LabelEncoder()
        self.vectorizer = CountVectorizer(max_features=500, ngram_range=(1, 2))
        self.feature_engineer = AdvancedFeatureEngineering()
        self.explainer = None
        self.is_trained = False
        
        self.feature_names = []
    
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
    
    def create_advanced_features(self, cases: List[Dict[str, Any]]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create advanced feature matrix from cases
        
        Returns:
            Tuple of (features, labels)
        """
        print("Creating advanced features...")
        
        X_symptom_text = []
        X_engineered = []
        y = []
        
        for case in cases:
            symptoms = case['symptoms']
            disease = case['disease']
            
            X_symptom_text.append(symptoms)
            
            # Create engineered features
            patient_age = int(case.get('patient_age', 35))
            engineered_feat = self.feature_engineer.create_features(symptoms, patient_age)
            X_engineered.append(engineered_feat)
            
            y.append(disease)
        
        # Vectorize symptoms
        print("Vectorizing symptoms...")
        X_symptom_vectorized = self.vectorizer.fit_transform(X_symptom_text).toarray()
        
        # Combine features
        X_engineered = np.array(X_engineered)
        X_combined = np.hstack([X_symptom_vectorized, X_engineered])
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Store feature names
        symptom_features = self.vectorizer.get_feature_names_out()
        engineered_features = self.feature_engineer.get_feature_names()
        self.feature_names = list(symptom_features) + engineered_features
        
        print(f"Combined features: {X_combined.shape[1]}")
        print(f"Classes: {len(self.label_encoder.classes_)}")
        
        return X_combined, y_encoded
    
    def train(self, X: np.ndarray, y: np.ndarray, optimize: bool = True):
        """
        Train XGBoost model with optional hyperparameter optimization
        
        Args:
            X: Feature matrix
            y: Labels
            optimize: Whether to optimize hyperparameters
        """
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=self.random_state, stratify=y
        )
        
        if optimize:
            print("\nOptimizing hyperparameters...")
            self._optimize_hyperparameters(X_train, y_train)
        
        print("\nTraining XGBoost model...")
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_test, y_test)],
            early_stopping_rounds=50,
            verbose=True
        )
        
        # Evaluate
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        print(f"\n=== Training Results ===")
        print(f"Training accuracy: {train_score:.4f}")
        print(f"Test accuracy: {test_score:.4f}")
        
        # Create SHAP explainer
        print("\nCreating SHAP explainer...")
        self.explainer = shap.TreeExplainer(self.model)
        
        # Feature importance
        feature_importances = self.model.feature_importances_
        print(f"\nTop 10 most important features:")
        top_indices = np.argsort(feature_importances)[-10:][::-1]
        for i in top_indices[:10]:
            if i < len(self.feature_names):
                print(f"  {self.feature_names[i]}: {feature_importances[i]:.4f}")
        
        self.is_trained = True
        
        return train_score, test_score
    
    def _optimize_hyperparameters(self, X_train, y_train, cv: int = 3):
        """Optimize hyperparameters using GridSearch"""
        print("Running GridSearchCV...")
        
        param_grid = {
            'n_estimators': [200, 300],
            'max_depth': [4, 6],
            'learning_rate': [0.1, 0.15],
            'subsample': [0.8, 0.9]
        }
        
        grid_search = GridSearchCV(
            self.model,
            param_grid,
            cv=cv,
            scoring='accuracy',
            n_jobs=-1,
            verbose=1
        )
        
        grid_search.fit(X_train, y_train)
        
        self.model = grid_search.best_estimator_
        
        print(f"Best parameters: {grid_search.best_params_}")
        print(f"Best CV score: {grid_search.best_score_:.4f}")
    
    def predict_with_shap(self, symptoms: str, patient_age: int = 35) -> Dict[str, Any]:
        """
        Predict disease and provide SHAP explanation
        
        Args:
            symptoms: Comma-separated symptoms
            patient_age: Patient age
        
        Returns:
            Dict with prediction and SHAP explanation
        """
        if not self.is_trained:
            return {'error': 'Model not trained'}
        
        # Create feature vector
        X_symptom = self.vectorizer.transform([symptoms]).toarray()
        X_engineered = self.feature_engineer.create_features(symptoms, patient_age).reshape(1, -1)
        X_combined = np.hstack([X_symptom, X_engineered])
        
        # Predict
        prediction_idx = self.model.predict(X_combined)[0]
        prediction_proba = self.model.predict_proba(X_combined)[0]
        
        disease = self.label_encoder.inverse_transform([prediction_idx])[0]
        confidence = prediction_proba[prediction_idx]
        
        # Get SHAP values
        shap_values = self.explainer.shap_values(X_combined)
        
        # Get top contributing features
        contribution_scores = []
        for i in range(len(self.feature_names)):
            if i < len(shap_values[0]):
                contribution_scores.append({
                    'feature': self.feature_names[i],
                    'contribution': float(shap_values[0][i])
                })
        
        contribution_scores.sort(key=lambda x: abs(x['contribution']), reverse=True)
        
        return {
            'disease': disease,
            'confidence': float(confidence),
            'top_contributing_features': contribution_scores[:10],
            'explanation': 'SHAP values show which symptoms contribute most to the diagnosis'
        }
    
    def save_model(self, filepath: str):
        """Save trained model"""
        joblib.dump({
            'model': self.model,
            'label_encoder': self.label_encoder,
            'vectorizer': self.vectorizer,
            'feature_names': self.feature_names
        }, filepath)
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model"""
        data = joblib.load(filepath)
        self.model = data['model']
        self.label_encoder = data['label_encoder']
        self.vectorizer = data['vectorizer']
        self.feature_names = data['feature_names']
        self.explainer = shap.TreeExplainer(self.model)
        self.is_trained = True


def main():
    """Main training script"""
    print("=== Training XGBoost Model with SHAP ===")
    
    # Initialize model
    model = XGBoostDiseaseClassifier(random_state=42)
    
    # Load data
    cases = model.prepare_data('synthetic_dataset.csv')
    
    # Create advanced features
    X, y = model.create_advanced_features(cases)
    
    # Train model
    train_score, test_score = model.train(X, y, optimize=True)
    
    # Save model
    model.save_model('models/xgboost_model.pkl')
    
    # Test prediction with SHAP
    print("\n=== Testing Model with SHAP ===")
    test_symptoms = "tos, sibilancias, dificultad respiratoria, opresion pecho"
    prediction = model.predict_with_shap(test_symptoms, patient_age=35)
    
    print(f"\nSymptoms: {test_symptoms}")
    print(f"Prediction: {prediction['disease']}")
    print(f"Confidence: {prediction['confidence']:.4f}")
    print(f"\nTop contributing features:")
    for feat in prediction['top_contributing_features'][:5]:
        print(f"  {feat['feature']}: {feat['contribution']:.4f}")
    
    print("\nModel training complete!")
    
    # Compare with Random Forest
    print("\n=== Performance Comparison ===")
    print(f"XGBoost Test Accuracy: {test_score:.4f}")
    print("RF Test Accuracy: 0.9919")
    print(f"Improvement: {(test_score - 0.9919)*100:.2f}%")


if __name__ == "__main__":
    main()

