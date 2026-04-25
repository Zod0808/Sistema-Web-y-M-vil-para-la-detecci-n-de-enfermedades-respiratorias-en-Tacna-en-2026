"""
ML Monitoring and Feedback API

Endpoints for monitoring ML predictions and collecting medical feedback.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import structlog
import sys
import os

# Add ml_models to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../ml_models'))

from ml_models.prediction_monitor import get_monitor
from ml_models.medical_feedback_system import get_feedback_system

logger = structlog.get_logger()
router = APIRouter()


class FeedbackInput(BaseModel):
    """Input for medical feedback"""
    prediction_id: str = Field(..., description="Prediction ID")
    doctor_id: str = Field(..., description="Doctor ID")
    feedback_type: str = Field(..., description="Type: correct, incorrect, partially_correct")
    actual_disease: Optional[str] = Field(None, description="Actual disease if different")
    actual_urgency: Optional[str] = Field(None, description="Actual urgency level")
    actual_severity: Optional[str] = Field(None, description="Actual severity level")
    doctor_notes: Optional[str] = Field(None, description="Doctor notes")
    symptoms: Optional[List[str]] = Field(None, description="Symptoms list")
    confidence_rating: Optional[int] = Field(None, ge=1, le=5, description="Doctor confidence (1-5)")
    suggested_corrections: Optional[Dict[str, Any]] = Field(None, description="Suggested corrections")


@router.post("/v1/ml/predictions/{prediction_id}/feedback")
async def submit_feedback(prediction_id: str, feedback: FeedbackInput) -> Dict[str, Any]:
    """
    Submit medical feedback for a prediction
    
    Args:
        prediction_id: ID of the prediction
        feedback: Feedback data
    
    Returns:
        Success status and feedback ID
    """
    try:
        feedback_system = get_feedback_system()
        
        feedback_id = feedback_system.submit_feedback(
            prediction_id=prediction_id,
            doctor_id=feedback.doctor_id,
            feedback_type=feedback.feedback_type,
            actual_disease=feedback.actual_disease,
            actual_urgency=feedback.actual_urgency,
            actual_severity=feedback.actual_severity,
            doctor_notes=feedback.doctor_notes,
            symptoms=feedback.symptoms,
            confidence_rating=feedback.confidence_rating,
            suggested_corrections=feedback.suggested_corrections
        )
        
        logger.info("Feedback submitted",
                   feedback_id=feedback_id,
                   prediction_id=prediction_id)
        
        return {
            'success': True,
            'feedback_id': feedback_id,
            'message': 'Feedback submitted successfully'
        }
        
    except Exception as e:
        logger.error("Error submitting feedback", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error submitting feedback: {str(e)}"
        )


@router.get("/v1/ml/monitoring/metrics")
async def get_monitoring_metrics(days: int = 1) -> Dict[str, Any]:
    """
    Get monitoring metrics for ML predictions
    
    Args:
        days: Number of days to analyze (default: 1)
    
    Returns:
        Monitoring metrics with success flag
    """
    try:
        monitor = get_monitor()
        # Reload predictions to ensure we have latest data
        monitor._load_existing_predictions(days=min(days + 7, 30))  # Load a bit more to ensure we have data
        metrics = monitor.get_metrics(days=days)
        
        # Log for debugging
        logger.info("Metrics requested", 
                   days=days, 
                   total_predictions=len(monitor.predictions_log),
                   metrics_summary=metrics.get('summary', {}).get('total_predictions', 0))
        
        # Ensure response format matches frontend expectations
        return {
            'success': True,
            'data': metrics
        }
        
    except Exception as e:
        logger.error("Error getting metrics", error=str(e), exc_info=True)
        # Return empty structure on error instead of raising exception
        return {
            'success': True,
            'data': {
                'period': {
                    'days': days,
                    'start_date': (datetime.now() - timedelta(days=days)).isoformat(),
                    'end_date': datetime.now().isoformat()
                },
                'summary': {
                    'total_predictions': 0,
                    'avg_confidence': 0.0,
                    'median_confidence': 0.0,
                    'low_confidence_predictions': 0,
                    'low_confidence_percentage': 0.0
                },
                'distributions': {
                    'diseases': {},
                    'urgency_levels': {},
                    'models': {}
                },
                'quality_metrics': {
                    'high_confidence_rate': 0.0,
                    'medium_confidence_rate': 0.0,
                    'low_confidence_rate': 0.0
                }
            }
        }


@router.get("/v1/ml/monitoring/features")
async def get_feature_contributions(top_n: int = 10) -> Dict[str, Any]:
    """
    Get aggregated SHAP feature contributions from the prediction monitor.
    """
    try:
        monitor = get_monitor()
        # Reload predictions to ensure we have latest data
        monitor._load_existing_predictions(days=30)
        features = monitor.get_feature_influence(top_n=top_n)
        
        # Log for debugging
        logger.info("Feature contributions requested", 
                   top_n=top_n,
                   total_features=len(features.get('top_features', [])))
        
        # Ensure response format matches frontend expectations
        return {
            'success': True,
            'data': features
        }
    except Exception as e:
        logger.error("Error getting feature contributions", error=str(e), exc_info=True)
        # Return empty structure on error
        return {
            'success': True,
            'data': {
                'top_features': [],
                'friendly_factors': []
            }
        }


@router.get("/v1/ml/monitoring/fairness")
async def get_fairness_metrics(
    group_field: str = "gender",
    high_confidence_threshold: float = 0.7
) -> Dict[str, Any]:
    """
    Get fairness metrics for a given demographic group field.
    """
    try:
        monitor = get_monitor()
        # Reload predictions to ensure we have latest data
        monitor._load_existing_predictions(days=30)
        metrics = monitor.fairness_metrics(
            group_field=group_field,
            high_confidence_threshold=high_confidence_threshold
        )
        
        # Log for debugging
        logger.info("Fairness metrics requested", 
                   group_field=group_field,
                   groups_found=len(metrics) if metrics else 0)
        
        # Ensure response format matches frontend expectations
        return {
            'success': True,
            'data': metrics if metrics else {}
        }
    except Exception as e:
        logger.error("Error getting fairness metrics", error=str(e), exc_info=True)
        # Return empty structure on error
        return {
            'success': True,
            'data': {}
        }


@router.get("/v1/ml/monitoring/anomalies")
async def get_anomalies(window_size: int = 100) -> Dict[str, Any]:
    """
    Get anomalous predictions
    
    Args:
        window_size: Window size for anomaly detection
    
    Returns:
        List of anomalies
    """
    try:
        monitor = get_monitor()
        anomalies = monitor.detect_anomalies(window_size=window_size)
        
        return {
            'total_anomalies': len(anomalies),
            'anomalies': anomalies
        }
        
    except Exception as e:
        logger.error("Error detecting anomalies", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error detecting anomalies: {str(e)}"
        )


@router.get("/v1/ml/feedback/stats")
async def get_feedback_stats(days: int = 30) -> Dict[str, Any]:
    """
    Get statistics about medical feedback
    
    Args:
        days: Number of days to analyze
    
    Returns:
        Feedback statistics
    """
    try:
        feedback_system = get_feedback_system()
        stats = feedback_system.get_feedback_stats(days=days)
        
        return stats
        
    except Exception as e:
        logger.error("Error getting feedback stats", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error getting feedback stats: {str(e)}"
        )


@router.get("/v1/ml/feedback/quality")
async def get_quality_metrics() -> Dict[str, Any]:
    """
    Get quality metrics based on feedback
    
    Returns:
        Quality metrics
    """
    try:
        feedback_system = get_feedback_system()
        metrics = feedback_system.get_quality_metrics()
        
        return metrics
        
    except Exception as e:
        logger.error("Error getting quality metrics", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error getting quality metrics: {str(e)}"
        )


@router.get("/v1/ml/feedback/prediction/{prediction_id}")
async def get_feedback_for_prediction(prediction_id: str) -> Dict[str, Any]:
    """
    Get feedback for a specific prediction
    
    Args:
        prediction_id: Prediction ID
    
    Returns:
        Feedback entry if found
    """
    try:
        feedback_system = get_feedback_system()
        feedback = feedback_system.get_feedback_for_prediction(prediction_id)
        
        if not feedback:
            raise HTTPException(
                status_code=404,
                detail=f"Feedback not found for prediction {prediction_id}"
            )
        
        return feedback
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting feedback", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error getting feedback: {str(e)}"
        )


@router.post("/v1/ml/monitoring/export")
async def export_predictions(days: int = 7) -> Dict[str, Any]:
    """
    Export predictions to CSV for analysis
    
    Args:
        days: Number of days to export
    
    Returns:
        Export file path
    """
    try:
        monitor = get_monitor()
        output_file = f'monitoring/export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        export_path = monitor.export_for_analysis(output_file, days=days)
        
        return {
            'success': True,
            'file_path': export_path,
            'message': f'Predictions exported for last {days} days'
        }
        
    except Exception as e:
        logger.error("Error exporting predictions", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error exporting predictions: {str(e)}"
        )


@router.post("/v1/ml/feedback/export-training")
async def export_training_data() -> Dict[str, Any]:
    """
    Export feedback as training data for model improvement
    
    Returns:
        Export file path
    """
    try:
        feedback_system = get_feedback_system()
        output_file = f'monitoring/training_data_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        export_path = feedback_system.export_training_data(output_file)
        
        if not export_path:
            return {
                'success': False,
                'message': 'No training examples to export'
            }
        
        return {
            'success': True,
            'file_path': export_path,
            'message': 'Training data exported successfully'
        }
        
    except Exception as e:
        logger.error("Error exporting training data", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error exporting training data: {str(e)}"
        )

