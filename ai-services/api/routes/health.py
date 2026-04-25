"""
Health check endpoints
"""

from fastapi import APIRouter, Depends
from datetime import datetime
import structlog
from typing import Dict, Any

from core.database import get_database
from core.cache import get_cache
from models.model_manager import model_manager

logger = structlog.get_logger()
router = APIRouter()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "RespiCare AI Services",
        "version": "1.0.0"
    }


@router.get("/health/detailed")
async def detailed_health_check(
    db=Depends(get_database),
    cache=Depends(get_cache)
) -> Dict[str, Any]:
    """Detailed health check with dependencies"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "RespiCare AI Services",
        "version": "1.0.0",
        "dependencies": {}
    }
    
    # Check database connection
    try:
        await db.command("ping")
        health_status["dependencies"]["database"] = {
            "status": "healthy",
            "type": "mongodb"
        }
    except Exception as e:
        health_status["dependencies"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check cache connection
    try:
        if cache:
            await cache.ping()
            health_status["dependencies"]["cache"] = {
                "status": "healthy",
                "type": "redis"
            }
        else:
            health_status["dependencies"]["cache"] = {
                "status": "disabled",
                "type": "redis"
            }
    except Exception as e:
        health_status["dependencies"]["cache"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Check AI models
    try:
        models_status = {}
        for model_name in ["medical_nlp", "symptom_model", "openai_client"]:
            model = model_manager.get_model(model_name)
            models_status[model_name] = {
                "status": "loaded" if model else "not_loaded",
                "type": type(model).__name__ if model else "None"
            }
        
        health_status["dependencies"]["ai_models"] = {
            "status": "healthy",
            "models": models_status
        }
    except Exception as e:
        health_status["dependencies"]["ai_models"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    return health_status


@router.get("/health/ready")
async def readiness_check() -> Dict[str, Any]:
    """Kubernetes readiness probe"""
    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/health/live")
async def liveness_check() -> Dict[str, Any]:
    """Kubernetes liveness probe"""
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }
