"""
API Endpoints para Retraining Automático

Endpoints para gestionar el retraining automático de modelos ML
basado en feedback médico.

"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import structlog
import sys
import os

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../ml_models'))

from ml_models.auto_retraining import get_retraining_system
from ml_models.medical_feedback_system import get_feedback_system

logger = structlog.get_logger()
router = APIRouter()


class RetrainingRequest(BaseModel):
    """Request for manual retraining"""
    model_types: Optional[List[str]] = Field(['xgboost', 'random_forest'], description="Models to retrain")
    min_feedback_samples: Optional[int] = Field(50, description="Minimum feedback samples")
    force: Optional[bool] = Field(False, description="Force retraining even if threshold not met")


class RetrainingStatus(BaseModel):
    """Retraining status response"""
    status: str = Field(..., description="Status: pending, in_progress, completed, failed")
    message: str = Field(..., description="Status message")
    stats: Optional[Dict[str, Any]] = Field(None, description="Statistics")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


@router.get("/v1/ml/retraining/status")
async def get_retraining_status() -> Dict[str, Any]:
    """
    Get retraining status and statistics
    
    Returns:
        Retraining status and statistics
    """
    try:
        retraining_system = get_retraining_system()
        feedback_system = get_feedback_system()
        
        # Check if retraining should be triggered
        should_retrain, stats = retraining_system.should_retrain()
        
        # Get feedback metrics
        quality_metrics = feedback_system.get_quality_metrics()
        
        # Collect training data
        training_data = retraining_system.collect_training_data_from_feedback(days=30)
        
        return {
            'should_retrain': should_retrain,
            'feedback_stats': stats,
            'quality_metrics': quality_metrics,
            'training_samples_available': len(training_data),
            'ready_for_retraining': should_retrain
        }
        
    except Exception as e:
        logger.error("Error getting retraining status", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error getting retraining status: {str(e)}"
        )


@router.post("/v1/ml/retraining/trigger")
async def trigger_retraining(
    request: RetrainingRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Trigger manual retraining of models
    
    Args:
        request: Retraining request parameters
        background_tasks: FastAPI background tasks
    
    Returns:
        Retraining initiation status
    """
    try:
        retraining_system = get_retraining_system()
        
        # Check if retraining should be triggered
        should_retrain, stats = retraining_system.should_retrain(
            min_new_feedback=request.min_feedback_samples
        )
        
        if not should_retrain and not request.force:
            raise HTTPException(
                status_code=400,
                detail=f"Retraining threshold not met. Available: {stats['total_feedback_samples']}, Required: {stats['threshold']}"
            )
        
        # Add background task for retraining
        background_tasks.add_task(
            execute_retraining_background,
            request.model_types,
            request.min_feedback_samples,
            request.force
        )
        
        return {
            'status': 'initiated',
            'message': 'Retraining started in background',
            'models': request.model_types,
            'stats': stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error triggering retraining", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error triggering retraining: {str(e)}"
        )


async def execute_retraining_background(
    model_types: List[str],
    min_feedback: int,
    force: bool
):
    """Execute retraining in background"""
    try:
        retraining_system = get_retraining_system()
        
        result = retraining_system.execute_retraining_pipeline(
            model_types=model_types,
            base_dataset='synthetic_dataset.csv'
        )
        
        logger.info("Background retraining completed", result=result)
        
    except Exception as e:
        logger.error("Background retraining failed", error=str(e))


@router.get("/v1/ml/retraining/training-data")
async def get_training_data_from_feedback(days: int = 30) -> Dict[str, Any]:
    """
    Get training data collected from feedback
    
    Args:
        days: Number of days to look back
    
    Returns:
        Training data statistics and samples
    """
    try:
        retraining_system = get_retraining_system()
        
        training_data = retraining_system.collect_training_data_from_feedback(days=days)
        
        if training_data.empty:
            return {
                'samples': 0,
                'diseases': [],
                'data': []
            }
        
        # Get statistics
        disease_counts = training_data['disease'].value_counts().to_dict()
        
        # Convert to JSON-serializable format
        samples = []
        for _, row in training_data.head(10).iterrows():
            samples.append({
                'disease': row.get('disease', ''),
                'symptoms': row.get('symptoms', ''),
                'urgency': row.get('urgency', ''),
                'severity': row.get('severity', '')
            })
        
        return {
            'samples': len(training_data),
            'diseases': list(disease_counts.keys()),
            'disease_counts': disease_counts,
            'sample_data': samples
        }
        
    except Exception as e:
        logger.error("Error getting training data", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error getting training data: {str(e)}"
        )


@router.post("/v1/ml/retraining/augment-dataset")
async def augment_dataset(
    base_dataset: str = 'synthetic_dataset.csv',
    output_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Augment base dataset with feedback data
    
    Args:
        base_dataset: Path to base dataset
        output_path: Optional output path
    
    Returns:
        Augmentation results
    """
    try:
        retraining_system = get_retraining_system()
        
        if output_path is None:
            output_path = f"augmented_dataset_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        augmented_df = retraining_system.augment_dataset_with_feedback(
            base_dataset,
            output_path=output_path
        )
        
        if augmented_df.empty:
            raise HTTPException(
                status_code=400,
                detail="Could not create augmented dataset"
            )
        
        return {
            'status': 'success',
            'output_path': output_path,
            'original_samples': 0,  # Would need to load base dataset
            'augmented_samples': len(augmented_df),
            'feedback_samples_added': len(augmented_df)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error augmenting dataset", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error augmenting dataset: {str(e)}"
        )

