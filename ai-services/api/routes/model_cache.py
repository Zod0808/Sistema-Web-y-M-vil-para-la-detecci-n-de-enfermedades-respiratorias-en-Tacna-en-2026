"""
Model Cache API Routes
Endpoints para gestionar y monitorear el caché de modelos
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import structlog

from ml_models.model_cache import get_model_cache

logger = structlog.get_logger()

router = APIRouter(prefix="/api/v1/ml/cache", tags=["Model Cache"])


class CacheStatsResponse(BaseModel):
    """Respuesta con estadísticas del caché"""
    hits: int
    misses: int
    evictions: int
    loads: int
    hit_rate: float
    cache_size: int
    memory_usage_mb: float
    max_size: int
    max_memory_mb: int


class CachedModelInfo(BaseModel):
    """Información de modelo en caché"""
    key: str
    model_name: str
    model_type: str
    memory_mb: float
    loaded_at: float
    last_access: float


@router.get("/stats", response_model=CacheStatsResponse)
async def get_cache_stats():
    """Obtiene estadísticas del caché de modelos"""
    try:
        cache = get_model_cache()
        stats = cache.get_stats()
        return CacheStatsResponse(**stats)
    except Exception as e:
        logger.error("cache_stats_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error getting cache stats: {str(e)}")


@router.get("/models", response_model=List[CachedModelInfo])
async def list_cached_models():
    """Lista modelos actualmente en caché"""
    try:
        cache = get_model_cache()
        models = cache.list_cached_models()
        return [CachedModelInfo(**model) for model in models]
    except Exception as e:
        logger.error("cache_list_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error listing cached models: {str(e)}")


@router.delete("/models/{model_name}")
async def remove_cached_model(model_name: str, model_type: str = "all"):
    """Elimina modelo específico del caché"""
    try:
        cache = get_model_cache()
        
        if model_type == "all":
            # Eliminar todos los modelos con ese nombre
            models = cache.list_cached_models()
            removed = False
            for model_info in models:
                if model_info['model_name'] == model_name:
                    # Necesitamos la clave completa para eliminar
                    cache.remove(
                        model_name=model_info['model_name'],
                        model_type=model_info['model_type']
                    )
                    removed = True
            if not removed:
                raise HTTPException(status_code=404, detail=f"Model {model_name} not found in cache")
        else:
            removed = cache.remove(model_name=model_name, model_type=model_type)
            if not removed:
                raise HTTPException(status_code=404, detail=f"Model {model_name} ({model_type}) not found in cache")
        
        return {"success": True, "message": f"Model {model_name} removed from cache"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("cache_remove_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error removing model from cache: {str(e)}")


@router.post("/clear")
async def clear_cache():
    """Limpia todo el caché de modelos"""
    try:
        cache = get_model_cache()
        cache.clear()
        return {"success": True, "message": "Cache cleared successfully"}
    except Exception as e:
        logger.error("cache_clear_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")

