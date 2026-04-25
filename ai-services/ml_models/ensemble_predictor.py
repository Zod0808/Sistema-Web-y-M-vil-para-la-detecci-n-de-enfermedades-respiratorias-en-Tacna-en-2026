"""
Ensemble Predictor - Combina múltiples modelos ML

Combina predicciones de:
- XGBoost (99.81% accuracy)
- Random Forest (99.19% accuracy)
- Neural Network Multi-Task (99.78% accuracy)

Para obtener mejores resultados mediante voting ensemble.
"""

import sys
import os
from typing import Dict, List, Any, Optional
from collections import Counter

# Add paths
sys.path.insert(0, os.path.dirname(__file__))
ml_models_path = os.path.dirname(__file__)

try:
    from risk_personalization import get_personalization_system
except ImportError:
    get_personalization_system = None

try:
    from shap_explainer import SHAPDiseaseExplainer
except ImportError:
    SHAPDiseaseExplainer = None

try:
    from neural_network_wrapper import get_neural_network_predictor
except ImportError:
    get_neural_network_predictor = None


class EnsemblePredictor:
    """Ensemble predictor combining multiple ML models"""
    
    def __init__(self, 
                 use_xgboost: bool = True,
                 use_random_forest: bool = True,
                 use_neural_network: bool = True):
        """
        Initialize ensemble predictor
        
        Args:
            use_xgboost: Use XGBoost model
            use_random_forest: Use Random Forest model
            use_neural_network: Use Neural Network model
        """
        self.use_xgboost = use_xgboost
        self.use_random_forest = use_random_forest
        self.use_neural_network = use_neural_network
        
        self.xgboost_explainer = None
        self.random_forest_explainer = None
        self.neural_network_predictor = None
        
        self._load_models()
    
    def _load_models(self):
        """Load all available models"""
        # Try to load XGBoost
        if self.use_xgboost and SHAPDiseaseExplainer:
            try:
                self.xgboost_explainer = SHAPDiseaseExplainer('models/xgboost_model.pkl')
                print("XGBoost model loaded")
            except Exception as e:
                print(f"Could not load XGBoost: {e}")
                self.use_xgboost = False
        
        # Try to load Random Forest
        if self.use_random_forest and SHAPDiseaseExplainer:
            try:
                self.random_forest_explainer = SHAPDiseaseExplainer('models/base_random_forest.pkl')
                print("Random Forest model loaded")
            except Exception as e:
                print(f"Could not load Random Forest: {e}")
                self.use_random_forest = False
        
        # Try to load Neural Network
        if self.use_neural_network and get_neural_network_predictor:
            try:
                self.neural_network_predictor = get_neural_network_predictor('models/neural_network_model.pkl')
                if self.neural_network_predictor:
                    print("Neural Network model loaded")
                else:
                    self.use_neural_network = False
            except Exception as e:
                print(f"Could not load Neural Network: {e}")
                self.use_neural_network = False
    
    def predict(self, 
                symptoms: List[str],
                symptoms_text: str = None,
                patient_age: int = 35,
                risk_factors: List[str] = None,
                ensemble_method: str = 'weighted_vote',
                apply_personalization: bool = True) -> Dict[str, Any]:
        """
        Predict using ensemble of models
        
        Args:
            symptoms: List of symptom strings
            symptoms_text: Comma-separated symptoms string (for XGBoost/RF)
            patient_age: Patient age
            ensemble_method: 'weighted_vote' or 'average'
        
        Returns:
            Ensemble prediction result
        """
        if symptoms_text is None:
            symptoms_text = ', '.join(symptoms)
        
        predictions = []
        weights = []
        
        # Get XGBoost prediction (highest weight - best accuracy)
        if self.use_xgboost and self.xgboost_explainer:
            try:
                xgb_pred = self.xgboost_explainer.explain_prediction(
                    symptoms_text, patient_age, top_k=3
                )
                predictions.append({
                    'model': 'xgboost',
                    'disease': xgb_pred.get('disease'),
                    'confidence': xgb_pred.get('confidence', 0.0),
                    'urgency': xgb_pred.get('urgency_level', 'medium'),
                    'weight': 0.5  # Highest weight
                })
                weights.append(0.5)
            except Exception as e:
                print(f"XGBoost prediction error: {e}")
        
        # Get Random Forest prediction
        if self.use_random_forest and self.random_forest_explainer:
            try:
                rf_pred = self.random_forest_explainer.explain_prediction(
                    symptoms_text, patient_age, top_k=3
                )
                predictions.append({
                    'model': 'random_forest',
                    'disease': rf_pred.get('disease'),
                    'confidence': rf_pred.get('confidence', 0.0),
                    'urgency': rf_pred.get('urgency_level', 'medium'),
                    'weight': 0.3
                })
                weights.append(0.3)
            except Exception as e:
                print(f"Random Forest prediction error: {e}")
        
        # Get Neural Network prediction (multi-task)
        if self.use_neural_network and self.neural_network_predictor:
            try:
                nn_pred = self.neural_network_predictor.predict(symptoms, patient_age)
                if 'error' not in nn_pred:
                    predictions.append({
                        'model': 'neural_network',
                        'disease': nn_pred.get('disease'),
                        'confidence': nn_pred.get('confidence', 0.0),
                        'urgency': nn_pred.get('urgency_level', 'medium'),
                        'severity': nn_pred.get('severity'),
                        'category': nn_pred.get('category'),
                        'weight': 0.2
                    })
                    weights.append(0.2)
            except Exception as e:
                print(f"Neural Network prediction error: {e}")
        
        if not predictions:
            return {'error': 'No models available for prediction'}
        
        # Normalize weights
        total_weight = sum(weights)
        if total_weight > 0:
            weights = [w / total_weight for w in weights]
        
        # Ensemble prediction
        if ensemble_method == 'weighted_vote':
            result = self._weighted_vote(predictions, weights)
        else:
            result = self._average_confidence(predictions, weights)
        
        # Add ensemble metadata
        result['ensemble_info'] = {
            'models_used': [p['model'] for p in predictions],
            'num_models': len(predictions),
            'method': ensemble_method
        }
        
        # Add top 3 predictions from best model
        try:
            if self.use_xgboost and self.xgboost_explainer:
                xgb_pred = self.xgboost_explainer.explain_prediction(
                    symptoms_text, patient_age, top_k=3
                )
                result['top_3_predictions'] = xgb_pred.get('top_3_predictions', [])
            elif self.use_random_forest and self.random_forest_explainer:
                rf_pred = self.random_forest_explainer.explain_prediction(
                    symptoms_text, patient_age, top_k=3
                )
                result['top_3_predictions'] = rf_pred.get('top_3_predictions', [])
        except:
            # Fallback: create top 3 from ensemble predictions
            disease_confidence = {}
            for pred in predictions:
                disease = pred.get('disease', '')
                if disease not in disease_confidence:
                    disease_confidence[disease] = 0.0
                disease_confidence[disease] += pred.get('confidence', 0.0) * pred.get('weight', 0.33)
            
            top_diseases = sorted(disease_confidence.items(), key=lambda x: x[1], reverse=True)[:3]
            result['top_3_predictions'] = [
                {'disease': disease, 'confidence': conf}
                for disease, conf in top_diseases
            ]
        
        # Apply personalization if requested
        if apply_personalization and get_personalization_system:
            try:
                personalization = get_personalization_system()
                result = personalization.personalize_prediction(
                    result, 
                    patient_age, 
                    risk_factors or []
                )
                result['ensemble_info']['personalization_applied'] = True
            except Exception as e:
                print(f"Personalization error: {e}")
                result['ensemble_info']['personalization_applied'] = False
        
        # Add patient-friendly explanation
        try:
            import sys
            import os
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services'))
            from patient_friendly_explainer import get_patient_explainer
            
            explainer = get_patient_explainer()
            
            # Get SHAP factors from best model prediction
            shap_factors = None
            if self.use_xgboost and self.xgboost_explainer:
                try:
                    shap_pred = self.xgboost_explainer.explain_prediction(
                        symptoms_text, patient_age, top_k=5
                    )
                    shap_factors = shap_pred.get('explanation', {}).get('decision_factors', [])
                except:
                    pass
            
            # Generate friendly explanation
            friendly_explanation = explainer.explain_prediction(
                disease=result.get('disease', ''),
                confidence=result.get('confidence', 0.0),
                urgency_level=result.get('urgency_level', 'medium'),
                symptoms=symptoms,
                shap_factors=shap_factors,
                top_predictions=result.get('top_3_predictions', [])
            )
            
            result['friendly_explanation'] = friendly_explanation
            result['explanation'] = friendly_explanation  # Main explanation for compatibility
            
        except Exception as e:
            print(f"Error generating friendly explanation: {e}")
            # Fallback explanation
            result['friendly_explanation'] = {
                'summary': f"Basado en sus síntomas, el diagnóstico más probable es {result.get('disease', 'enfermedad respiratoria')}."
            }
        
        return result
    
    def _weighted_vote(self, predictions: List[Dict], weights: List[float]) -> Dict[str, Any]:
        """Weighted voting ensemble"""
        disease_votes = {}
        urgency_votes = {}
        
        for pred, weight in zip(predictions, weights):
            disease = pred['disease']
            urgency = pred.get('urgency', 'medium')
            
            # Weighted vote for disease
            if disease not in disease_votes:
                disease_votes[disease] = 0.0
            disease_votes[disease] += weight * pred.get('confidence', 0.0)
            
            # Vote for urgency
            if urgency not in urgency_votes:
                urgency_votes[urgency] = 0.0
            urgency_votes[urgency] += weight
        
        # Select most voted disease
        best_disease = max(disease_votes.items(), key=lambda x: x[1])
        best_urgency = max(urgency_votes.items(), key=lambda x: x[1])
        
        # Get average confidence for best disease
        avg_confidence = sum(
            p['confidence'] * w 
            for p, w in zip(predictions, weights) 
            if p['disease'] == best_disease[0]
        )
        
        result = {
            'disease': best_disease[0],
            'confidence': avg_confidence,
            'urgency_level': best_urgency[0],
            'voting_score': best_disease[1]
        }
        
        # Add multi-task info from neural network if available
        nn_pred = next((p for p in predictions if p['model'] == 'neural_network'), None)
        if nn_pred:
            result['severity'] = nn_pred.get('severity')
            result['category'] = nn_pred.get('category')
        
        return result
    
    def _average_confidence(self, predictions: List[Dict], weights: List[float]) -> Dict[str, Any]:
        """Average confidence ensemble"""
        # Group by disease
        disease_scores = {}
        
        for pred, weight in zip(predictions, weights):
            disease = pred['disease']
            if disease not in disease_scores:
                disease_scores[disease] = {'total_confidence': 0.0, 'total_weight': 0.0}
            
            disease_scores[disease]['total_confidence'] += pred.get('confidence', 0.0) * weight
            disease_scores[disease]['total_weight'] += weight
        
        # Select disease with highest average confidence
        best_disease = max(
            disease_scores.items(), 
            key=lambda x: x[1]['total_confidence'] / max(x[1]['total_weight'], 0.001)
        )
        
        avg_confidence = best_disease[1]['total_confidence'] / max(best_disease[1]['total_weight'], 0.001)
        
        # Get most common urgency
        urgency_votes = Counter(p.get('urgency', 'medium') for p in predictions)
        best_urgency = urgency_votes.most_common(1)[0][0]
        
        result = {
            'disease': best_disease[0],
            'confidence': avg_confidence,
            'urgency_level': best_urgency
        }
        
        # Add multi-task info from neural network if available
        nn_pred = next((p for p in predictions if p['model'] == 'neural_network'), None)
        if nn_pred:
            result['severity'] = nn_pred.get('severity')
            result['category'] = nn_pred.get('category')
        
        return result


# Global instance
_ensemble_predictor = None


def get_ensemble_predictor() -> EnsemblePredictor:
    """Get global ensemble predictor instance"""
    global _ensemble_predictor
    if _ensemble_predictor is None:
        _ensemble_predictor = EnsemblePredictor()
    return _ensemble_predictor


if __name__ == "__main__":
    # Test ensemble
    print("Testing Ensemble Predictor...")
    
    ensemble = EnsemblePredictor()
    
    test_symptoms = ['tos', 'sibilancias', 'dificultad respiratoria', 'opresion pecho']
    result = ensemble.predict(test_symptoms, patient_age=35)
    
    print(f"\nEnsemble Prediction:")
    print(f"  Disease: {result.get('disease')}")
    print(f"  Confidence: {result.get('confidence'):.4f}")
    print(f"  Urgency: {result.get('urgency_level')}")
    print(f"  Models used: {result.get('ensemble_info', {}).get('models_used', [])}")

