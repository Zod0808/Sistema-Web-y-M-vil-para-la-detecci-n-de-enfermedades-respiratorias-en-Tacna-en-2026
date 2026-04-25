"""
Model Cache with LRU eviction
Sistema de caché LRU para modelos ML cargados con lazy loading
"""

from typing import Dict, Any, Optional, Callable, Tuple, List
from collections import OrderedDict
import asyncio
import structlog
import os
import time
from pathlib import Path
import hashlib
import json

logger = structlog.get_logger()


class LRUModelCache:
    """
    Caché LRU para modelos ML con soporte para lazy loading
    """
    
    def __init__(
        self,
        max_size: int = 5,
        max_memory_mb: int = 2048,
        cache_dir: Optional[str] = None
    ):
        """
        Args:
            max_size: Número máximo de modelos en caché
            max_memory_mb: Memoria máxima en MB para modelos
            cache_dir: Directorio para almacenar modelos descargados
        """
        self.max_size = max_size
        self.max_memory_mb = max_memory_mb
        self.cache_dir = Path(cache_dir) if cache_dir else Path("/tmp/ml_models_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # LRU cache: OrderedDict mantiene orden de acceso
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._loading_locks: Dict[str, asyncio.Lock] = {}
        self._memory_usage_mb = 0.0
        self._access_times: Dict[str, float] = {}
        
        # Estadísticas
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'loads': 0
        }
    
    def _get_cache_key(self, model_name: str, model_type: str, **kwargs) -> str:
        """Genera clave única para el modelo"""
        key_data = {
            'model_name': model_name,
            'model_type': model_type,
            **kwargs
        }
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def _estimate_memory_mb(self, model: Any) -> float:
        """Estima memoria usada por el modelo en MB"""
        try:
            if hasattr(model, '__sizeof__'):
                size_bytes = model.__sizeof__()
                # Estimación adicional para modelos PyTorch
                if hasattr(model, 'parameters'):
                    for param in model.parameters():
                        size_bytes += param.numel() * param.element_size()
                return size_bytes / (1024 * 1024)
        except Exception:
            pass
        # Estimación por defecto
        return 100.0  # 100 MB por defecto
    
    def _evict_lru(self) -> None:
        """Elimina el modelo menos usado recientemente"""
        if not self._cache:
            return
        
        # Encontrar el modelo con menor tiempo de acceso
        lru_key = min(self._access_times.items(), key=lambda x: x[1])[0]
        
        if lru_key in self._cache:
            model_data = self._cache.pop(lru_key)
            model = model_data.get('model')
            
            # Liberar memoria del modelo
            if model is not None:
                memory_mb = self._estimate_memory_mb(model)
                self._memory_usage_mb -= memory_mb
                
                # Limpiar modelo si tiene método cleanup
                if hasattr(model, 'cleanup'):
                    try:
                        model.cleanup()
                    except Exception as e:
                        logger.warning("model_cleanup_failed", key=lru_key, error=str(e))
            
            del self._access_times[lru_key]
            self.stats['evictions'] += 1
            logger.info("model_evicted", key=lru_key, reason="lru")
    
    def _make_room(self, required_memory_mb: float) -> None:
        """Libera espacio en caché si es necesario"""
        # Evict por tamaño si excede límite de memoria
        while (
            self._memory_usage_mb + required_memory_mb > self.max_memory_mb
            and self._cache
        ):
            self._evict_lru()
        
        # Evict por cantidad si excede límite de modelos
        while len(self._cache) >= self.max_size and self._cache:
            self._evict_lru()
    
    async def get_or_load(
        self,
        model_name: str,
        model_type: str,
        loader_func: Callable[[], Any],
        **kwargs
    ) -> Tuple[Any, bool]:
        """
        Obtiene modelo del caché o lo carga si no está disponible
        
        Returns:
            Tuple[model, was_cached]: Modelo y si estaba en caché
        """
        cache_key = self._get_cache_key(model_name, model_type, **kwargs)
        
        # Verificar si está en caché
        if cache_key in self._cache:
            # Mover al final (más reciente)
            model_data = self._cache.pop(cache_key)
            self._cache[cache_key] = model_data
            self._access_times[cache_key] = time.time()
            self.stats['hits'] += 1
            logger.debug("model_cache_hit", key=cache_key, model_name=model_name)
            return model_data['model'], True
        
        # No está en caché, cargar
        self.stats['misses'] += 1
        
        # Usar lock para evitar cargas duplicadas
        if cache_key not in self._loading_locks:
            self._loading_locks[cache_key] = asyncio.Lock()
        
        async with self._loading_locks[cache_key]:
            # Verificar nuevamente después de adquirir lock (double-check)
            if cache_key in self._cache:
                model_data = self._cache.pop(cache_key)
                self._cache[cache_key] = model_data
                self._access_times[cache_key] = time.time()
                self.stats['hits'] += 1
                return model_data['model'], True
            
            # Cargar modelo
            logger.info("model_loading", key=cache_key, model_name=model_name, model_type=model_type)
            start_time = time.time()
            
            try:
                # Ejecutar loader en thread pool para no bloquear
                loop = asyncio.get_event_loop()
                model = await loop.run_in_executor(None, loader_func)
                
                # Estimar memoria
                memory_mb = self._estimate_memory_mb(model)
                
                # Hacer espacio si es necesario
                self._make_room(memory_mb)
                
                # Agregar al caché
                self._cache[cache_key] = {
                    'model': model,
                    'model_name': model_name,
                    'model_type': model_type,
                    'memory_mb': memory_mb,
                    'loaded_at': time.time(),
                    'kwargs': kwargs
                }
                self._access_times[cache_key] = time.time()
                self._memory_usage_mb += memory_mb
                self.stats['loads'] += 1
                
                load_time = time.time() - start_time
                logger.info(
                    "model_loaded",
                    key=cache_key,
                    model_name=model_name,
                    memory_mb=memory_mb,
                    load_time_sec=load_time
                )
                
                return model, False
                
            except Exception as e:
                logger.error("model_load_failed", key=cache_key, error=str(e))
                raise
            finally:
                # Limpiar lock después de un tiempo
                if cache_key in self._loading_locks:
                    del self._loading_locks[cache_key]
    
    def remove(self, model_name: str, model_type: str, **kwargs) -> bool:
        """Elimina modelo específico del caché"""
        cache_key = self._get_cache_key(model_name, model_type, **kwargs)
        
        if cache_key in self._cache:
            model_data = self._cache.pop(cache_key)
            model = model_data.get('model')
            
            if model is not None:
                memory_mb = model_data.get('memory_mb', 0)
                self._memory_usage_mb -= memory_mb
                
                if hasattr(model, 'cleanup'):
                    try:
                        model.cleanup()
                    except Exception:
                        pass
            
            del self._access_times[cache_key]
            logger.info("model_removed", key=cache_key)
            return True
        
        return False
    
    def clear(self) -> None:
        """Limpia todo el caché"""
        for cache_key, model_data in list(self._cache.items()):
            model = model_data.get('model')
            if model is not None and hasattr(model, 'cleanup'):
                try:
                    model.cleanup()
                except Exception:
                    pass
        
        self._cache.clear()
        self._access_times.clear()
        self._memory_usage_mb = 0.0
        logger.info("model_cache_cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Obtiene estadísticas del caché"""
        hit_rate = (
            self.stats['hits'] / (self.stats['hits'] + self.stats['misses'])
            if (self.stats['hits'] + self.stats['misses']) > 0
            else 0.0
        )
        
        return {
            **self.stats,
            'hit_rate': hit_rate,
            'cache_size': len(self._cache),
            'memory_usage_mb': self._memory_usage_mb,
            'max_size': self.max_size,
            'max_memory_mb': self.max_memory_mb
        }
    
    def list_cached_models(self) -> List[Dict[str, Any]]:
        """Lista modelos en caché"""
        return [
            {
                'key': key,
                'model_name': data['model_name'],
                'model_type': data['model_type'],
                'memory_mb': data.get('memory_mb', 0),
                'loaded_at': data.get('loaded_at', 0),
                'last_access': self._access_times.get(key, 0)
            }
            for key, data in self._cache.items()
        ]


# Instancia global del caché
_global_cache: Optional[LRUModelCache] = None


def get_model_cache() -> LRUModelCache:
    """Obtiene instancia global del caché de modelos"""
    global _global_cache
    if _global_cache is None:
        max_size = int(os.getenv("ML_MODEL_CACHE_MAX_SIZE", "5"))
        max_memory_mb = int(os.getenv("ML_MODEL_CACHE_MAX_MEMORY_MB", "2048"))
        cache_dir = os.getenv("ML_MODEL_CACHE_DIR", "/tmp/ml_models_cache")
        
        _global_cache = LRUModelCache(
            max_size=max_size,
            max_memory_mb=max_memory_mb,
            cache_dir=cache_dir
        )
    
    return _global_cache

