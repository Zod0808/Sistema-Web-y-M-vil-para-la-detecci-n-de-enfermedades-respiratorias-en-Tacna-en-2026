"""
Simple XGBoost Training Script

Trains XGBoost model with advanced features for disease classification.
"""

import csv
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics import classification_report, accuracy_score
import joblib
from datetime import datetime


def create_advanced_features(symptoms_text: str, patient_age: int = 35) -> np.ndarray:
    """Create advanced features from symptoms"""
    symptoms = [s.strip().lower() for s in symptoms_text.split(',')]
    features = []
    
    # 1. Basic counts
    num_symptoms = len(symptoms)
    features.extend([num_symptoms, num_symptoms / 10.0])
    
    # 2. Category counts
    respiratory_keywords = ['tos', 'congestion', 'secrecion', 'estornudos', 'sibilancias', 'difficultad']
    respiratory_count = sum(1 for s in symptoms if any(kw in s for kw in respiratory_keywords))
    features.append(respiratory_count)
    
    systemic_keywords = ['fiebre', 'fatiga', 'malestar', 'cansancio', 'debilidad']
    systemic_count = sum(1 for s in symptoms if any(kw in s for kw in systemic_keywords))
    features.append(systemic_count)
    
    pain_keywords = ['dolor', 'ardor', 'opresion', 'molestia']
    pain_count = sum(1 for s in symptoms if any(kw in s for kw in pain_keywords))
    features.append(pain_count)
    
    # 3. Severity and emergency indicators
    severity_keywords = ['intenso', 'severa', 'extremo', 'grave', 'alto', 'muy alta']
    features.append(1 if any(kw in ' '.join(symptoms) for kw in severity_keywords) else 0)
    
    emergency_keywords = ['dificultad respiratoria', 'cianosis', 'confusion', 'shock', 'coma']
    features.append(1 if any(kw in ' '.join(symptoms) for kw in emergency_keywords) else 0)
    
    # 4. Specific symptoms
    features.append(1 if 'fiebre' in ' '.join(symptoms) else 0)
    features.append(1 if 'tos' in ' '.join(symptoms) else 0)
    features.append(1 if any(kw in ' '.join(symptoms) for kw in ['dificultad', 'disnea', 'ahogo']) else 0)
    features.append(1 if any(kw in ' '.join(symptoms) for kw in ['fatiga', 'cansancio']) else 0)
    
    # 5. Duration
    acute_keywords = ['aguda', 'sudbito', 'inicio']
    chronic_keywords = ['cronico', 'persistente', 'semanas', 'meses']
    features.append(1 if any(kw in ' '.join(symptoms) for kw in acute_keywords) else 0)
    features.append(1 if any(kw in ' '.join(symptoms) for kw in chronic_keywords) else 0)
    
    # 6. Age
    features.append(patient_age / 100.0)
    features.append(len(' '.join(symptoms).split()) / 20.0)
    
    return np.array(features)


def main():
    print("=== Training XGBoost Model ===")
    
    # Load dataset
    print("\nLoading dataset...")
    cases = []
    with open('synthetic_dataset.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cases.append(row)
    
    print(f"Loaded {len(cases)} cases")
    
    # Prepare data
    print("\nCreating advanced features...")
    X_symptom_text = []
    X_engineered = []
    y = []
    
    for case in cases:
        symptoms = case['symptoms']
        disease = case['disease']
        
        X_symptom_text.append(symptoms)
        patient_age = int(case.get('patient_age', 35))
        engineered_feat = create_advanced_features(symptoms, patient_age)
        X_engineered.append(engineered_feat)
        y.append(disease)
    
    # Vectorize symptoms
    print("Vectorizing symptoms...")
    vectorizer = CountVectorizer(max_features=500, ngram_range=(1, 2))
    X_symptom_vectorized = vectorizer.fit_transform(X_symptom_text).toarray()
    
    # Combine features
    X_engineered = np.array(X_engineered)
    X_combined = np.hstack([X_symptom_vectorized, X_engineered])
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    print(f"Features: {X_combined.shape[1]}")
    print(f"Classes: {len(label_encoder.classes_)}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_combined, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    # Train XGBoost
    print("\nTraining XGBoost model...")
    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        objective='multi:softprob',
        eval_metric='mlogloss'
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Evaluate
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    
    print(f"\n=== Results ===")
    print(f"Training accuracy: {train_score:.4f}")
    print(f"Test accuracy: {test_score:.4f}")
    
    # Feature importance
    feature_importances = model.feature_importances_
    top_indices = np.argsort(feature_importances)[-10:][::-1]
    print(f"\nTop 10 important features:")
    for idx in top_indices[:10]:
        print(f"  Feature {idx}: {feature_importances[idx]:.4f}")
    
    # Save model
    print("\nSaving model...")
    model_data = {
        'model': model,
        'label_encoder': label_encoder,
        'vectorizer': vectorizer,
        'created_at': datetime.now().isoformat()
    }
    joblib.dump(model_data, 'models/xgboost_model.pkl')
    print("Model saved to models/xgboost_model.pkl")
    
    # Test prediction
    print("\n=== Testing Model ===")
    test_symptoms = "tos, sibilancias, dificultad respiratoria, opresion pecho"
    
    # Predict
    X_symptom_test = vectorizer.transform([test_symptoms]).toarray()
    X_engineered_test = create_advanced_features(test_symptoms).reshape(1, -1)
    X_test_combined = np.hstack([X_symptom_test, X_engineered_test])
    
    prediction_idx = model.predict(X_test_combined)[0]
    prediction_proba = model.predict_proba(X_test_combined)[0]
    
    disease = label_encoder.inverse_transform([prediction_idx])[0]
    confidence = prediction_proba[prediction_idx]
    
    print(f"\nSymptoms: {test_symptoms}")
    print(f"Prediction: {disease}")
    print(f"Confidence: {confidence:.4f}")
    
    # Get top 3
    top_indices = np.argsort(prediction_proba)[-3:][::-1]
    print(f"\nTop 3 predictions:")
    for idx in top_indices:
        disease_name = label_encoder.inverse_transform([idx])[0]
        conf = prediction_proba[idx]
        print(f"  {disease_name}: {conf:.4f}")
    
    print("\nModel training complete!")


if __name__ == "__main__":
    main()

