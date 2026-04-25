"""
SHAP Explainer for Disease Classification

Provides explainability for ML predictions using SHAP values.
Shows which symptoms contribute most to disease diagnosis.
"""

import numpy as np
import shap
import joblib
from typing import Dict, List, Any
import json


class SHAPDiseaseExplainer:
    """SHAP-based explainer for disease classification"""
    
    def __init__(self, model_path: str = None):
        """
        Initialize SHAP explainer
        
        Args:
            model_path: Path to trained model file
        """
        self.model = None
        self.label_encoder = None
        self.vectorizer = None
        self.feature_engineer = None
        self.explainer = None
        
        self.vectorizer_feature_names = []
        self.engineered_feature_names = []
        self.feature_names = []

        if model_path:
            self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """Load trained model"""
        print(f"Loading model from {model_path}...")
        
        data = joblib.load(model_path)
        self.model = data['model']
        self.label_encoder = data['label_encoder']
        self.vectorizer = data['vectorizer']
        
        try:
            self.feature_engineer = data.get('feature_engineer')
        except:
            # Fallback for models without feature engineer
            from train_xgboost_model import AdvancedFeatureEngineering
            self.feature_engineer = AdvancedFeatureEngineering()

        # Cache feature names for SHAP outputs
        if hasattr(self.vectorizer, 'get_feature_names_out'):
            self.vectorizer_feature_names = list(self.vectorizer.get_feature_names_out())
        elif hasattr(self.vectorizer, 'get_feature_names'):
            self.vectorizer_feature_names = list(self.vectorizer.get_feature_names())
        else:
            self.vectorizer_feature_names = []

        if self.feature_engineer and hasattr(self.feature_engineer, 'get_feature_names'):
            try:
                self.engineered_feature_names = list(self.feature_engineer.get_feature_names())
            except Exception:
                self.engineered_feature_names = []
        else:
            self.engineered_feature_names = []

        self.feature_names = self.vectorizer_feature_names + self.engineered_feature_names
        
        # Create SHAP explainer
        self.explainer = shap.TreeExplainer(self.model)
        
        print("Model loaded successfully")
    
    def explain_prediction(self, 
                          symptoms: str, 
                          patient_age: int = 35,
                          top_k: int = 10) -> Dict[str, Any]:
        """
        Explain model prediction for given symptoms
        
        Args:
            symptoms: Comma-separated symptoms
            patient_age: Patient age
            top_k: Number of top features to show
        
        Returns:
            Dict with prediction, confidence, and explanation
        """
        if not self.model:
            return {'error': 'Model not loaded'}
        
        # Create feature vector
        try:
            # Try XGBoost format (advanced features)
            X_symptom = self.vectorizer.transform([symptoms]).toarray()
            X_engineered = self.feature_engineer.create_features(symptoms, patient_age).reshape(1, -1)
            X_combined = np.hstack([X_symptom, X_engineered])
        except:
            # Fallback to basic format (Random Forest)
            X_combined = self.vectorizer.transform([symptoms]).toarray()
        
        # Predict
        prediction_idx = self.model.predict(X_combined)[0]
        prediction_proba = self.model.predict_proba(X_combined)[0]
        
        disease = self.label_encoder.inverse_transform([prediction_idx])[0]
        confidence = prediction_proba[prediction_idx]
        
        # Get SHAP values
        shap_values = self.explainer.shap_values(X_combined)
        
        # Handle multi-dimensional SHAP values (binary vs multi-class)
        if len(shap_values.shape) > 2:
            # Multi-class: get values for predicted class
            shap_values_for_prediction = shap_values[prediction_idx, 0]
        else:
            shap_values_for_prediction = shap_values[0]
        
        # Get feature contributions
        contributions = []
        for i, value in enumerate(shap_values_for_prediction):
            feature_name = None
            if i < len(self.vectorizer_feature_names):
                feature_name = self.vectorizer_feature_names[i]
            else:
                engineered_idx = i - len(self.vectorizer_feature_names)
                if 0 <= engineered_idx < len(self.engineered_feature_names):
                    feature_name = self.engineered_feature_names[engineered_idx]
            if feature_name is None:
                feature_name = f"feature_{i}"

            contributions.append({
                'feature_index': i,
                'shap_value': float(value),
                'feature_importance': abs(float(value)),
                'feature_name': feature_name
            })
        
        # Sort by importance
        contributions.sort(key=lambda x: x['feature_importance'], reverse=True)
        
        # Get top K positive and negative
        positive = [c for c in contributions if c['shap_value'] > 0][:top_k]
        negative = [c for c in contributions if c['shap_value'] < 0][:top_k]
        
        # Get top 3 predictions
        top_indices = np.argsort(prediction_proba)[-3:][::-1]
        top_predictions = [
            {
                'disease': self.label_encoder.inverse_transform([idx])[0],
                'confidence': float(prediction_proba[idx])
            }
            for idx in top_indices
        ]
        
        return {
            'disease': disease,
            'confidence': float(confidence),
            'top_3_predictions': top_predictions,
            'explanation': {
                'positive_factors': positive,
                'negative_factors': negative,
                'decision_factors': positive[:5],  # Top 5 factors that led to this diagnosis
                'explainability_score': 1.0  # Full explainability with SHAP
            },
            'shap_values': shap_values_for_prediction.tolist()
        }
    
    def explain_batch(self, 
                     symptoms_list: List[str],
                     patient_ages: List[int] = None) -> List[Dict[str, Any]]:
        """
        Explain predictions for multiple cases
        
        Args:
            symptoms_list: List of symptom strings
            patient_ages: List of patient ages (optional)
        
        Returns:
            List of explanations
        """
        if patient_ages is None:
            patient_ages = [35] * len(symptoms_list)
        
        explanations = []
        for symptoms, age in zip(symptoms_list, patient_ages):
            explanation = self.explain_prediction(symptoms, age)
            explanations.append(explanation)
        
        return explanations
    
    def get_feature_importance_summary(self, top_n: int = 20) -> Dict[str, Any]:
        """
        Get summary of most important features overall
        
        Args:
            top_n: Number of top features to return
        
        Returns:
            Dict with feature importance summary
        """
        if not self.model:
            return {'error': 'Model not loaded'}
        
        # Get model feature importances
        feature_importances = self.model.feature_importances_
        
        # Sort by importance
        top_indices = np.argsort(feature_importances)[-top_n:][::-1]
        
        summary = {
            'most_important_features': [],
            'total_features': len(feature_importances)
        }
        
        for idx in top_indices:
            summary['most_important_features'].append({
                'index': int(idx),
                'importance': float(feature_importances[idx])
            })
        
        return summary
    
    def visualize_shap(self, symptoms: str, patient_age: int = 35, output_file: str = None):
        """
        Create visual SHAP explanation (requires matplotlib)
        
        Args:
            symptoms: Comma-separated symptoms
            patient_age: Patient age
            output_file: Path to save plot (optional)
        """
        try:
            import matplotlib.pyplot as plt
        except ImportError:
            print("Matplotlib not available. Cannot create visualizations.")
            return
        
        # Create feature vector
        try:
            X_symptom = self.vectorizer.transform([symptoms]).toarray()
            X_engineered = self.feature_engineer.create_features(symptoms, patient_age).reshape(1, -1)
            X_combined = np.hstack([X_symptom, X_engineered])
        except:
            X_combined = self.vectorizer.transform([symptoms]).toarray()
        
        # Get SHAP values
        shap_values = self.explainer.shap_values(X_combined)
        
        # Plot
        shap.waterfall_plot(
            shap.Explanation(
                values=shap_values[0],
                base_values=self.explainer.expected_value,
                data=X_combined[0]
            )
        )
        
        if output_file:
            plt.savefig(output_file)
            print(f"Plot saved to {output_file}")
        else:
            plt.show()


def main():
    """Test SHAP explainer"""
    print("=== Testing SHAP Explainer ===")
    
    # Load model (try XGBoost first, then RF)
    explainer = None
    
    try:
        explainer = SHAPDiseaseExplainer('models/xgboost_model.pkl')
        print("Loaded XGBoost model")
    except:
        try:
            explainer = SHAPDiseaseExplainer('models/base_random_forest.pkl')
            print("Loaded Random Forest model")
        except Exception as e:
            print(f"Could not load model: {e}")
            return
    
    # Test prediction
    test_symptoms = "tos, sibilancias, dificultad respiratoria, opresion pecho"
    
    print(f"\nSymptoms: {test_symptoms}")
    explanation = explainer.explain_prediction(test_symptoms, patient_age=35)
    
    print(f"\nPrediction: {explanation['disease']}")
    print(f"Confidence: {explanation['confidence']:.4f}")
    
    print(f"\nExplanation:")
    print(f"Decision factors (why this diagnosis?):")
    for factor in explanation['explanation']['decision_factors']:
        print(f"  - Feature {factor['feature_index']}: {factor['shap_value']:.4f}")
    
    print(f"\nTop 3 Predictions:")
    for pred in explanation['top_3_predictions']:
        print(f"  - {pred['disease']}: {pred['confidence']:.4f}")


if __name__ == "__main__":
    main()

