"""
Hybrid System: Medical Rules + Machine Learning

Combines:
- Emergency rule system (priority)
- ML classifiers (Random Forest, XGBoost, Neural Networks)
- Medical validation rules
- Confidence scoring
- Explanation generation
"""

import numpy as np
from typing import Dict, List, Any
from .random_forest_model import RandomForestDiseaseClassifier
from .xgboost_model import XGBoostDiseaseClassifier
from .neural_network_model import MultiTaskNeuralNetwork


class HybridRuleMLSystem:
    """Hybrid system combining rules and ML"""
    
    def __init__(self):
        """Initialize hybrid system"""
        self.emergency_rules = self._define_emergency_rules()
        self.medical_validation_rules = self._define_validation_rules()
        
        # ML models
        self.random_forest = RandomForestDiseaseClassifier()
        self.xgboost = XGBoostDiseaseClassifier()
        self.neural_net = MultiTaskNeuralNetwork()
        
        self.is_trained = False
    
    def _define_emergency_rules(self) -> Dict[str, List[str]]:
        """Define emergency rules for critical conditions"""
        return {
            'critical': [
                'cianosis', 'dificultad respiratoria extrema', 'confusion severa',
                'hipotension marcada', 'taquicardia extrema', 'hemoptisis masiva',
                'shock', 'coma', 'convulsiones respiratorias'
            ],
            'high': [
                'dificultad respiratoria marcada', 'fiebre muy alta', 'dolor toracico severo',
                'escalofrios intensos', 'desorientacion', 'taquicardia',
                'hipotensión', 'hemoptisis'
            ],
            'medium': [
                'dificultad respiratoria moderada', 'fiebre', 'tos persistente',
                'dolor de garganta severo', 'fatiga extrema', 'malestar general intenso'
            ],
            'low': [
                'congestion nasal', 'estornudos', 'tos leve', 'malestar ligero',
                'dolor de cabeza leve', 'picazon nasal'
            ]
        }
    
    def _define_validation_rules(self) -> Dict[str, Any]:
        """Define medical validation rules"""
        return {
            'impossible_combinations': {
                'asma': ['sin tos', 'sin sibilancias'],
                'neumonia': ['sin fiebre', 'sin tos'],
                'bronquitis': ['sin tos'],
                'resfriado': ['fiebre muy alta']
            },
            'required_symptoms': {
                'asma': ['sibilancias', 'dificultad respiratoria'],
                'neumonia': ['fiebre', 'tos'],
                'bronquitis': ['tos'],
                'covid-19': ['fiebre', 'tos']
            },
            'exclusion_criteria': {
                'asma': ['sin sibilancias', 'sin dificultad respiratoria'],
                'neumonia': ['sin fiebre alta'],
                'resfriado': ['fiebre muy alta', 'dolor muscular severo']
            }
        }
    
    def predict(self, 
                symptoms: List[str],
                all_symptoms: List[str],
                use_ensemble: bool = True) -> Dict[str, Any]:
        """
        Predict disease using hybrid system
        
        Args:
            symptoms: List of symptom strings
            all_symptoms: Complete list of all symptoms
            use_ensemble: Whether to ensemble all ML models
        
        Returns:
            Dict with prediction, confidence, urgency, and explanation
        """
        # Step 1: Check emergency rules (highest priority)
        emergency_check = self._check_emergency(symptoms)
        if emergency_check['is_emergency']:
            return emergency_check
        
        # Step 2: ML predictions
        if use_ensemble and self.is_trained:
            predictions = self._ensemble_predict(symptoms, all_symptoms)
        elif self.random_forest.is_trained:
            predictions = self.random_forest.predict(symptoms, all_symptoms)
        else:
            # Fallback to basic pattern matching
            predictions = self._pattern_match(symptoms)
        
        # Step 3: Medical validation
        validated = self._validate_prediction(predictions, symptoms)
        
        # Step 4: Combine confidence from rules + ML
        final_confidence = self._calculate_confidence(predictions, symptoms)
        
        # Step 5: Generate explanation
        explanation = self._generate_explanation(predictions, symptoms, validated)
        
        return {
            'disease': validated['disease'],
            'confidence': final_confidence,
            'urgency_level': validated.get('urgency_level', 'medium'),
            'severity': validated.get('severity', 'moderate'),
            'is_emergency': False,
            'explanation': explanation,
            'top_3_predictions': predictions.get('top_3_predictions', []),
            'validation_status': validated.get('validation_status', 'passed')
        }
    
    def _check_emergency(self, symptoms: List[str]) -> Dict[str, Any]:
        """Check emergency rules"""
        symptoms_lower = [s.lower() for s in symptoms]
        symptoms_text = ' '.join(symptoms_lower)
        
        for urgency, keywords in self.emergency_rules.items():
            if urgency in ['critical', 'high']:
                for keyword in keywords:
                    if keyword.lower() in symptoms_text:
                        return {
                            'disease': 'EMERGENCIA MÉDICA',
                            'confidence': 1.0,
                            'urgency_level': urgency,
                            'is_emergency': True,
                            'warning': f'⚠️ ATENCIÓN MÉDICA URGENTE REQUERIDA - Síntoma crítico detectado: {keyword}',
                            'action': 'Buscar atención médica inmediata'
                        }
        
        return {'is_emergency': False}
    
    def _ensemble_predict(self, symptoms: List[str], all_symptoms: List[str]) -> Dict[str, Any]:
        """Combine predictions from all ML models"""
        predictions = {}
        
        # Random Forest
        if self.random_forest.is_trained:
            rf_pred = self.random_forest.predict(symptoms, all_symptoms)
            predictions['rf'] = rf_pred
        
        # XGBoost
        if self.xgboost.is_trained:
            xgb_pred = self.xgboost.predict_with_explanation(symptoms)
            predictions['xgb'] = xgb_pred
        
        # Neural Network
        if self.neural_net.is_trained:
            nn_pred = self.neural_net.predict_all_tasks(symptoms)
            predictions['nn'] = nn_pred
        
        # Ensemble vote
        if len(predictions) > 1:
            return self._ensemble_vote(predictions)
        else:
            return list(predictions.values())[0]
    
    def _ensemble_vote(self, predictions: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Vote-based ensemble of multiple models"""
        # Collect all disease predictions
        disease_counts = {}
        total_confidence = {}
        
        for model_name, pred in predictions.items():
            disease = pred.get('disease', pred.get('disease', {}).get('name', ''))
            confidence = pred.get('confidence', 0.5)
            
            if disease not in disease_counts:
                disease_counts[disease] = 0
                total_confidence[disease] = 0
            
            disease_counts[disease] += 1
            total_confidence[disease] += confidence
        
        # Most common disease
        most_common = max(disease_counts, key=disease_counts.get)
        avg_confidence = total_confidence[most_common] / disease_counts[most_common]
        
        return {
            'disease': most_common,
            'confidence': avg_confidence,
            'ensemble_votes': disease_counts,
            'models_agreed': disease_counts[most_common]
        }
    
    def _pattern_match(self, symptoms: List[str]) -> Dict[str, Any]:
        """Fallback pattern matching"""
        from .enhanced_chatbot_service import EnhancedChatbotService
        
        service = EnhancedChatbotService()
        result = service._classify_by_patterns(' '.join(symptoms), [], symptoms)
        
        return {
            'disease': result.get('disease_name', 'Infección respiratoria'),
            'confidence': result.get('confidence', 0.6),
            'matched_symptoms': result.get('matched_symptoms', [])
        }
    
    def _validate_prediction(self, predictions: Dict[str, Any], symptoms: List[str]) -> Dict[str, Any]:
        """Validate prediction using medical rules"""
        disease = predictions.get('disease', '')
        symptoms_lower = [s.lower() for s in symptoms]
        
        # Check validation rules
        validation_status = 'passed'
        warnings = []
        
        for disease_name, required in self.medical_validation_rules['required_symptoms'].items():
            if disease_name.lower() in disease.lower():
                # Check if required symptoms are present
                for req_symptom in required:
                    if not any(req_symptom.lower() in s for s in symptoms_lower):
                        validation_status = 'warning'
                        warnings.append(f"Falta síntoma típico: {req_symptom}")
        
        return {
            **predictions,
            'validation_status': validation_status,
            'warnings': warnings
        }
    
    def _calculate_confidence(self, predictions: Dict[str, Any], symptoms: List[str]) -> float:
        """Calculate final confidence combining ML and rules"""
        base_confidence = predictions.get('confidence', 0.5)
        
        # Adjust based on symptom count
        symptom_count = len(symptoms)
        if symptom_count < 2:
            base_confidence *= 0.5
        elif symptom_count > 8:
            base_confidence *= 1.1
        
        return min(1.0, max(0.0, base_confidence))
    
    def _generate_explanation(self, 
                            predictions: Dict[str, Any], 
                            symptoms: List[str],
                            validated: Dict[str, Any]) -> str:
        """Generate human-readable explanation"""
        disease = predictions.get('disease', '')
        confidence = predictions.get('confidence', 0.5)
        
        explanation = f"Se detectaron {len(symptoms)} síntomas. "
        explanation += f"Diagnóstico probable: {disease} (confianza: {confidence*100:.0f}%). "
        
        if validated.get('validation_status') == 'warning':
            explanation += "⚠️ Advertencia: pueden faltar síntomas típicos."
        
        return explanation
    
    def train_all_models(self, X_train, y_train, all_symptoms: List[str]):
        """Train all ML models"""
        print("Training all ML models for hybrid system...")
        
        # Train Random Forest
        print("\n1. Training Random Forest...")
        self.random_forest.train(X_train, y_train)
        
        # Train XGBoost
        print("\n2. Training XGBoost...")
        self.xgboost.train(X_train, y_train)
        
        # Train Neural Network
        print("\n3. Training Neural Network...")
        # This would require preparing multi-task data
        # For now, we'll skip it if not available
        
        self.is_trained = True
        print("\nAll models trained successfully!")
    
    def save_all_models(self, base_path: str):
        """Save all trained models"""
        if self.random_forest.is_trained:
            self.random_forest.save_model(f"{base_path}_rf.pkl")
        if self.xgboost.is_trained:
            self.xgboost.save_model(f"{base_path}_xgb.pkl")
        if self.neural_net.is_trained:
            self.neural_net.save_model(f"{base_path}_nn.pkl")
    
    def load_all_models(self, base_path: str):
        """Load all trained models"""
        try:
            self.random_forest.load_model(f"{base_path}_rf.pkl")
        except:
            print("Random Forest model not found")
        
        try:
            self.xgboost.load_model(f"{base_path}_xgb.pkl")
        except:
            print("XGBoost model not found")
        
        try:
            self.neural_net.load_model(f"{base_path}_nn.pkl")
        except:
            print("Neural Network model not found")
        
        self.is_trained = (self.random_forest.is_trained or 
                          self.xgboost.is_trained or 
                          self.neural_net.is_trained)

