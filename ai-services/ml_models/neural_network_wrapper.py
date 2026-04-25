"""
Wrapper para Red Neuronal Multi-Tarea

Hace compatible la red neuronal con el sistema de predicción existente,
permitiendo usarla como alternativa a XGBoost/Random Forest con SHAP.
"""

import sys
import os
from typing import Dict, List, Any, Optional
import joblib
import numpy as np

# Add path
ml_models_path = os.path.dirname(__file__)
sys.path.insert(0, ml_models_path)

try:
    import importlib.util
    spec = importlib.util.spec_from_file_location("neural_network_model", os.path.join(ml_models_path, "neural_network_model.py"))
    neural_network_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(neural_network_module)
    MultiTaskNeuralNetwork = neural_network_module.MultiTaskNeuralNetwork
except Exception as e:
    MultiTaskNeuralNetwork = None
    print(f"Warning: Could not load MultiTaskNeuralNetwork: {e}")


class NeuralNetworkPredictor:
    """Wrapper for neural network that's compatible with existing ML system"""
    
    def __init__(self, model_path: str = None):
        """
        Initialize neural network predictor
        
        Args:
            model_path: Path to trained neural network model (.pkl)
        """
        self.model = None
        self.model_path = model_path
        self.is_loaded = False
        
        if model_path:
            self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """Load trained neural network model"""
        try:
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            self.model = MultiTaskNeuralNetwork()
            self.model.load_model(model_path)
            self.model_path = model_path
            self.is_loaded = True
            print(f"Neural network model loaded from {model_path}")
            
        except Exception as e:
            print(f"Error loading neural network model: {e}")
            self.is_loaded = False
            raise
    
    def predict(self, symptoms: List[str], patient_age: int = 35) -> Dict[str, Any]:
        """
        Predict disease and related information using neural network
        
        Args:
            symptoms: List of symptom strings
            patient_age: Patient age (not used by NN but kept for compatibility)
        
        Returns:
            Dict with prediction results compatible with existing system
        """
        if not self.is_loaded or not self.model:
            return {'error': 'Neural network model not loaded'}
        
        try:
            # Use multi-task prediction
            predictions = self.model.predict_all_tasks(symptoms)
            
            # Format to match existing system format
            result = {
                'disease': predictions['disease']['name'],
                'confidence': float(predictions['disease']['confidence']),
                'urgency_level': predictions.get('urgency', 'medium'),
                'severity': predictions.get('severity', 'moderate'),
                'category': predictions.get('category', 'general'),
                'model_type': 'neural_network',
                
                # Additional information
                'multi_task_predictions': {
                    'disease': predictions['disease'],
                    'urgency': predictions.get('urgency'),
                    'severity': predictions.get('severity'),
                    'category': predictions.get('category')
                },
                
                # For compatibility with SHAP explainer format
                'top_3_predictions': [
                    {
                        'disease': predictions['disease']['name'],
                        'confidence': f"{predictions['disease']['confidence']:.4f}"
                    }
                ],
                
                # Explanation placeholder (neural networks are less interpretable)
                'explanation': f"Predicción realizada por red neuronal multi-tarea. "
                              f"Enfermedad: {predictions['disease']['name']} "
                              f"(confianza: {predictions['disease']['confidence']:.2%}), "
                              f"Urgencia: {predictions.get('urgency', 'N/A')}, "
                              f"Severidad: {predictions.get('severity', 'N/A')}."
            }
            
            return result
            
        except Exception as e:
            return {'error': f'Prediction error: {str(e)}'}
    
    def predict_with_explanation(self, symptoms: List[str], patient_age: int = 35) -> Dict[str, Any]:
        """
        Predict with explanation (alias for predict for compatibility)
        
        Args:
            symptoms: List of symptom strings
            patient_age: Patient age
        
        Returns:
            Dict with prediction and explanation
        """
        return self.predict(symptoms, patient_age)
    
    def is_available(self) -> bool:
        """Check if model is loaded and available"""
        return self.is_loaded and self.model is not None


# Global instance
_neural_network_predictor = None


def get_neural_network_predictor(model_path: str = 'models/neural_network_model.pkl') -> Optional[NeuralNetworkPredictor]:
    """
    Get global neural network predictor instance
    
    Args:
        model_path: Path to model file
    
    Returns:
        NeuralNetworkPredictor instance or None if not available
    """
    global _neural_network_predictor
    
    if _neural_network_predictor is None:
        try:
            _neural_network_predictor = NeuralNetworkPredictor(model_path)
        except Exception as e:
            print(f"Could not initialize neural network predictor: {e}")
            return None
    
    return _neural_network_predictor if _neural_network_predictor.is_available() else None


if __name__ == "__main__":
    # Test the wrapper
    print("Testing Neural Network Wrapper...")
    
    predictor = NeuralNetworkPredictor('models/neural_network_model.pkl')
    
    if predictor.is_available():
        test_symptoms = ['tos', 'sibilancias', 'dificultad respiratoria']
        result = predictor.predict(test_symptoms)
        
        print(f"\nTest prediction:")
        print(f"  Disease: {result.get('disease')}")
        print(f"  Confidence: {result.get('confidence'):.4f}")
        print(f"  Urgency: {result.get('urgency_level')}")
        print(f"  Severity: {result.get('severity')}")
    else:
        print("Neural network predictor not available")

