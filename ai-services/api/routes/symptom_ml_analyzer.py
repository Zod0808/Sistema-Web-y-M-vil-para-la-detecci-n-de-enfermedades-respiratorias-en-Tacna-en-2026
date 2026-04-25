"""
Symptom ML Analyzer API

Integrates ML models (Random Forest, XGBoost) with SHAP explanations
for disease classification with full explainability.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import structlog
import numpy as np

logger = structlog.get_logger()
router = APIRouter()


class SymptomMLInput(BaseModel):
    """Input for ML symptom analysis"""
    symptoms: List[str] = Field(..., description="List of symptoms")
    patient_age: Optional[int] = Field(35, description="Patient age")
    risk_factors: Optional[List[str]] = Field([], description="List of risk factors (smoking, diabetes, hypertension, etc.)")
    include_explanation: Optional[bool] = Field(True, description="Include SHAP explanation")
    apply_personalization: Optional[bool] = Field(True, description="Apply age/risk personalization")


class SymptomMLOutput(BaseModel):
    """Output for ML symptom analysis"""
    disease: str = Field(..., description="Predicted disease")
    confidence: float = Field(..., description="Confidence score (0-1)")
    urgency_level: str = Field(..., description="Urgency level")
    explanation: Optional[Dict[str, Any]] = Field(None, description="SHAP explanation")
    top_3_predictions: List[Dict[str, str]] = Field([], description="Top 3 predictions")
    needs_medical_attention: bool = Field(False, description="Whether medical attention is needed")
    age_group: Optional[str] = Field(None, description="Patient age group")
    risk_level: Optional[str] = Field(None, description="Overall risk level")
    personalized_recommendations: Optional[List[str]] = Field([], description="Personalized recommendations based on age/risk")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


@router.post("/v1/ml-analyze", response_model=SymptomMLOutput)
async def analyze_symptoms_ml(input_data: SymptomMLInput, use_ensemble: bool = True) -> SymptomMLOutput:
    """
    Analyze symptoms using ML models with SHAP explanations
    
    Args:
        input_data: Symptoms and patient info
        use_ensemble: Use ensemble of models (XGBoost + Random Forest + Neural Network)
    
    Returns:
        Prediction with SHAP-based explainability
    """
    try:
        logger.info("Processing ML symptom analysis",
                   num_symptoms=len(input_data.symptoms),
                   include_explanation=input_data.include_explanation,
                   use_ensemble=use_ensemble)
        
        # Convert symptoms to string format
        symptoms_str = ", ".join(input_data.symptoms)
        
        # Try ensemble first if requested
        if use_ensemble:
            try:
                import sys
                import os
                ml_models_path = os.path.join(os.path.dirname(__file__), '..', 'ml_models')
                sys.path.insert(0, ml_models_path)
                from ensemble_predictor import get_ensemble_predictor
                
                ensemble = get_ensemble_predictor()
                if ensemble:
                    ensemble_pred = ensemble.predict(
                        input_data.symptoms,
                        symptoms_text=symptoms_str,
                        patient_age=input_data.patient_age,
                        risk_factors=input_data.risk_factors or [],
                        ensemble_method='weighted_vote',
                        apply_personalization=input_data.apply_personalization
                    )
                    
                    if 'error' not in ensemble_pred:
                        # Format ensemble prediction to match expected output
                        urgent_diseases = ['neumonia grave', 'estado asmatico', 'tuberculosis']
                        is_urgent = any(urgent in ensemble_pred['disease'].lower() for urgent in urgent_diseases)
                        
                        # Get friendly explanation from ensemble
                        friendly_explanation = ensemble_pred.get('friendly_explanation') or ensemble_pred.get('explanation', {})
                        
                        response = SymptomMLOutput(
                            disease=ensemble_pred['disease'],
                            confidence=ensemble_pred['confidence'],
                            urgency_level=ensemble_pred.get('urgency_level', 'medium'),
                            explanation={
                                'method': 'ensemble',
                                'models_used': ensemble_pred.get('ensemble_info', {}).get('models_used', []),
                                'friendly': friendly_explanation,
                                'main_explanation': friendly_explanation.get('main_explanation', ''),
                                'key_factors': friendly_explanation.get('key_factors', []),
                                'reasoning': friendly_explanation.get('reasoning', ''),
                                'summary': friendly_explanation.get('summary', ''),
                                'decision_factors': friendly_explanation.get('key_factors', [])[:3]  # For compatibility
                            } if input_data.include_explanation else None,
                            top_3_predictions=[
                                {'disease': p['disease'], 'confidence': f"{p.get('confidence', 0):.4f}"}
                                for p in ensemble_pred.get('top_3_predictions', [])
                            ] if ensemble_pred.get('top_3_predictions') else [
                                {'disease': ensemble_pred['disease'], 'confidence': f"{ensemble_pred['confidence']:.4f}"}
                            ],
                            needs_medical_attention=is_urgent or ensemble_pred['confidence'] > 0.8,
                            age_group=ensemble_pred.get('age_group'),
                            risk_level=ensemble_pred.get('risk_level'),
                            personalized_recommendations=ensemble_pred.get('personalized_recommendations', [])
                        )
                        
                        # Log for monitoring
                        try:
                            import sys
                            import os
                            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../ml_models'))
                            from prediction_monitor import get_monitor
                            monitor = get_monitor()
                            monitor.log_prediction(
                                symptoms=input_data.symptoms,
                                prediction={
                                    'disease': response.disease,
                                    'confidence': response.confidence,
                                    'urgency_level': response.urgency_level,
                                    'top_3_predictions': response.top_3_predictions,
                                    'explanation': response.explanation
                                },
                                model_name='ensemble'
                            )
                        except Exception as e:
                            logger.warning("Failed to log prediction for monitoring", error=str(e))
                        
                        logger.info("Ensemble prediction completed",
                                   disease=response.disease,
                                   confidence=response.confidence)
                        
                        return response
            except Exception as e:
                logger.warning("Ensemble prediction failed, falling back to single model", error=str(e))
        
        # Fallback to single model (XGBoost with SHAP)
        # Load ML model and SHAP explainer
        from shap_explainer import SHAPDiseaseExplainer
        
        # Try to load XGBoost model first (better performance)
        explainer = None
        try:
            explainer = SHAPDiseaseExplainer('models/xgboost_model.pkl')
            logger.info("Loaded XGBoost model")
        except:
            try:
                explainer = SHAPDiseaseExplainer('models/base_random_forest.pkl')
                logger.info("Loaded Random Forest model")
            except Exception as e:
                logger.error("Could not load ML models", error=str(e))
                # Fallback to pattern matching
                from services.enhanced_chatbot_service import EnhancedChatbotService
                service = EnhancedChatbotService()
                result = service._classify_by_patterns(symptoms_str, [], input_data.symptoms)
                
                return SymptomMLOutput(
                    disease=result.get('disease_name', 'Infección respiratoria'),
                    confidence=result.get('confidence', 0.6),
                    urgency_level=result.get('urgency', 'medium'),
                    needs_medical_attention=result.get('urgency') in ['high', 'critical']
                )
        
        # Get prediction with SHAP explanation
        prediction = explainer.explain_prediction(
            symptoms_str,
            patient_age=input_data.patient_age,
            top_k=10 if input_data.include_explanation else 0
        )
        
        # Extract urgency from disease characteristics
        urgent_diseases = ['neumonia grave', 'estado asmatico', 'tuberculosis']
        is_urgent = any(urgent in prediction['disease'].lower() for urgent in urgent_diseases)
        
        # Generate patient-friendly explanation
        friendly_explanation = None
        if input_data.include_explanation:
            try:
                import sys
                import os
                sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'services'))
                from patient_friendly_explainer import get_patient_explainer
                
                explainer_service = get_patient_explainer()
                shap_factors = prediction.get('explanation', {}).get('decision_factors', [])
                
                friendly_explanation = explainer_service.explain_prediction(
                    disease=prediction['disease'],
                    confidence=prediction['confidence'],
                    urgency_level='high' if is_urgent else 'medium',
                    symptoms=input_data.symptoms,
                    shap_factors=shap_factors,
                    top_predictions=prediction.get('top_3_predictions', [])
                )
            except Exception as e:
                logger.warning("Failed to generate friendly explanation", error=str(e))
                friendly_explanation = None
        
        # Build response
        raw_explanation = prediction.get('explanation')
        explanation_data = None
        if input_data.include_explanation:
            if friendly_explanation:
                explanation_data = {
                    'method': 'shap',
                    'friendly': friendly_explanation,
                    'main_explanation': friendly_explanation.get('main_explanation', ''),
                    'key_factors': friendly_explanation.get('key_factors', []),
                    'reasoning': friendly_explanation.get('reasoning', ''),
                    'summary': friendly_explanation.get('summary', ''),
                    'decision_factors': friendly_explanation.get('key_factors', [])[:3],  # For compatibility
                    'raw_contributions': raw_explanation
                }
            else:
                explanation_data = raw_explanation
        else:
            explanation_data = raw_explanation if raw_explanation else None
        
        response = SymptomMLOutput(
            disease=prediction['disease'],
            confidence=prediction['confidence'],
            urgency_level='high' if is_urgent else 'medium',
            explanation=explanation_data,
            top_3_predictions=[
                {'disease': p['disease'], 'confidence': f"{p['confidence']:.4f}"}
                for p in prediction.get('top_3_predictions', [])
            ],
            needs_medical_attention=is_urgent or prediction['confidence'] > 0.8
        )
        
        logger.info("ML prediction completed",
                   disease=response.disease,
                   confidence=response.confidence)
        
        # Log prediction for monitoring
        try:
            import sys
            import os
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../ml_models'))
            from prediction_monitor import get_monitor
            monitor = get_monitor()
            monitor.log_prediction(
                symptoms=input_data.symptoms,
                prediction={
                    'disease': response.disease,
                    'confidence': response.confidence,
                    'urgency_level': response.urgency_level,
                    'top_3_predictions': response.top_3_predictions,
                    'explanation': response.explanation
                },
                model_name='xgboost'  # or detect which model was used
            )
        except Exception as e:
            logger.warning("Failed to log prediction for monitoring", error=str(e))
        
        return response
        
    except Exception as e:
        logger.error("Error in ML symptom analysis", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error processing symptoms: {str(e)}"
        )


@router.get("/v1/ml-model-info")
async def get_model_info() -> Dict[str, Any]:
    """Get information about loaded ML models"""
    try:
        from shap_explainer import SHAPDiseaseExplainer
        import joblib
        
        model_info = {
            'models_available': [],
            'models_loaded': []
        }
        
        # Check available models
        import os
        if os.path.exists('models/xgboost_model.pkl'):
            model_info['models_available'].append('xgboost')
        if os.path.exists('models/base_random_forest.pkl'):
            model_info['models_available'].append('random_forest')
        
        # Try to load one
        if model_info['models_available']:
            try:
                if 'xgboost' in model_info['models_available']:
                    explainer = SHAPDiseaseExplainer('models/xgboost_model.pkl')
                    model_info['models_loaded'] = ['xgboost']
                else:
                    explainer = SHAPDiseaseExplainer('models/base_random_forest.pkl')
                    model_info['models_loaded'] = ['random_forest']
                
                # Get model info
                model_info['feature_count'] = len(explainer.vectorizer.get_feature_names_out())
                model_info['class_count'] = len(explainer.label_encoder.classes_)
                
                # Get feature importance summary
                importance_summary = explainer.get_feature_importance_summary(top_n=10)
                model_info['most_important_features'] = importance_summary['most_important_features']
                
            except Exception as e:
                model_info['error'] = str(e)
        
        return model_info
        
    except Exception as e:
        logger.error("Error getting model info", error=str(e))
        return {'error': str(e)}


@router.post("/v1/ml-explanation")
async def get_detailed_explanation(symptoms: str, patient_age: int = 35) -> Dict[str, Any]:
    """Get detailed SHAP explanation for symptoms"""
    try:
        from shap_explainer import SHAPDiseaseExplainer
        
        # Try to load model
        explainer = None
        try:
            explainer = SHAPDiseaseExplainer('models/xgboost_model.pkl')
        except:
            explainer = SHAPDiseaseExplainer('models/base_random_forest.pkl')
        
        # Get explanation
        explanation = explainer.explain_prediction(symptoms, patient_age, top_k=20)
        
        return {
            'prediction': explanation['disease'],
            'confidence': explanation['confidence'],
            'top_3_predictions': explanation['top_3_predictions'],
            'explanation': explanation['explanation'],
            'shap_values': explanation['shap_values']
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating explanation: {str(e)}"
        )

