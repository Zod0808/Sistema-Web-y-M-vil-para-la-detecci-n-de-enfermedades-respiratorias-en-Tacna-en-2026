from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from ml_models.automl_manager import AutoMLManager

router = APIRouter(prefix="/v1/automl", tags=["AutoML"])


class SelectModelRequest(BaseModel):
    task_type: Optional[str] = Field("classification")
    candidates: Optional[List[str]] = Field(default_factory=list)


@router.post("/select_model", summary="AutoML - Selección de modelo")
async def automl_select_model(req: SelectModelRequest) -> Dict[str, Any]:
    try:
        am = AutoMLManager(task_type=req.task_type or "classification")
        return am.select_model(req.candidates or [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AutoTuneRequest(BaseModel):
    task_type: Optional[str] = Field("classification")
    param_grid: Dict[str, List[Any]]


@router.post("/tune", summary="AutoML - Auto-tuning de hiperparámetros")
async def automl_auto_tune(req: AutoTuneRequest) -> Dict[str, Any]:
    try:
        am = AutoMLManager(task_type=req.task_type or "classification")
        return am.auto_tune(req.param_grid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FeatureSelectRequest(BaseModel):
    task_type: Optional[str] = Field("classification")
    features: List[str]
    k: Optional[int] = Field(10, ge=1)


@router.post("/feature_select", summary="AutoML - Selección automática de features")
async def automl_feature_select(req: FeatureSelectRequest) -> Dict[str, Any]:
    try:
        am = AutoMLManager(task_type=req.task_type or "classification")
        return am.feature_selection(req.features, k=req.k or 10)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class DriftDetectRequest(BaseModel):
    baseline_stats: Dict[str, Any]
    current_stats: Dict[str, Any]


@router.post("/drift_detect", summary="AutoML - Detección automática de drift")
async def automl_drift_detect(req: DriftDetectRequest) -> Dict[str, Any]:
    try:
        am = AutoMLManager()
        return am.detect_drift(req.baseline_stats, req.current_stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AutoRetrainRequest(BaseModel):
    task_type: Optional[str] = Field("classification")
    training_meta: Dict[str, Any] = Field(default_factory=dict)


@router.post("/auto_retrain", summary="AutoML - Auto-retraining inteligente")
async def automl_auto_retrain(req: AutoRetrainRequest) -> Dict[str, Any]:
    try:
        am = AutoMLManager(task_type=req.task_type or "classification")
        return am.auto_retrain(req.training_meta or {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


