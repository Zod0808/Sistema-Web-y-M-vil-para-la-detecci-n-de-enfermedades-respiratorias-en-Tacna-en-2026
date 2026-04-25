"""
Lazy Model Loader
Sistema de carga diferida para modelos pesados (BERT, CV, etc.)
con estrategia de descarga de modelos grandes
"""

from typing import Dict, Any, Optional, Callable, List
import asyncio
import structlog
import os
from pathlib import Path
import shutil
import hashlib
import json
from urllib.parse import urlparse
import aiohttp
import aiofiles

logger = structlog.get_logger()


class ModelDownloader:
    """Descarga modelos grandes desde URLs remotas"""
    
    def __init__(self, cache_dir: Optional[str] = None):
        self.cache_dir = Path(cache_dir) if cache_dir else Path("/tmp/ml_models_downloads")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._download_locks: Dict[str, asyncio.Lock] = {}
    
    def _get_cache_path(self, model_url: str, model_name: str) -> Path:
        """Obtiene ruta de caché para modelo descargado"""
        url_hash = hashlib.md5(model_url.encode()).hexdigest()
        return self.cache_dir / f"{model_name}_{url_hash}"
    
    async def download_model(
        self,
        model_url: str,
        model_name: str,
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> Path:
        """
        Descarga modelo desde URL
        
        Args:
            model_url: URL del modelo a descargar
            model_name: Nombre del modelo
            progress_callback: Callback para progreso (0.0 a 1.0)
        
        Returns:
            Path al modelo descargado
        """
        cache_path = self._get_cache_path(model_url, model_name)
        
        # Verificar si ya está descargado
        if cache_path.exists() and cache_path.is_dir():
            logger.info("model_already_downloaded", model_name=model_name, path=str(cache_path))
            return cache_path
        
        # Usar lock para evitar descargas duplicadas
        lock_key = f"{model_url}_{model_name}"
        if lock_key not in self._download_locks:
            self._download_locks[lock_key] = asyncio.Lock()
        
        async with self._download_locks[lock_key]:
            # Verificar nuevamente después de adquirir lock
            if cache_path.exists() and cache_path.is_dir():
                return cache_path
            
            logger.info("model_downloading", model_url=model_url, model_name=model_name)
            
            # Crear directorio temporal
            temp_path = cache_path.with_suffix('.tmp')
            temp_path.mkdir(parents=True, exist_ok=True)
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(model_url) as response:
                        if response.status != 200:
                            raise Exception(f"Download failed: {response.status}")
                        
                        total_size = int(response.headers.get('Content-Length', 0))
                        downloaded = 0
                        
                        # Descargar archivo
                        model_file = temp_path / "model.bin"
                        async with aiofiles.open(model_file, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                await f.write(chunk)
                                downloaded += len(chunk)
                                
                                if progress_callback and total_size > 0:
                                    progress = downloaded / total_size
                                    progress_callback(progress)
                        
                        # Mover a ubicación final
                        temp_path.rename(cache_path)
                        logger.info("model_downloaded", model_name=model_name, path=str(cache_path))
                        
                        return cache_path
                        
            except Exception as e:
                # Limpiar en caso de error
                if temp_path.exists():
                    shutil.rmtree(temp_path, ignore_errors=True)
                logger.error("model_download_failed", model_url=model_url, error=str(e))
                raise


class LazyModelLoader:
    """
    Cargador lazy para modelos pesados
    Solo carga modelos cuando se necesitan
    """
    
    def __init__(
        self,
        downloader: Optional[ModelDownloader] = None,
        preload_models: Optional[List[str]] = None
    ):
        self.downloader = downloader or ModelDownloader()
        self.preload_models = preload_models or []
        self._loaded_models: Dict[str, Any] = {}
        self._loading_tasks: Dict[str, asyncio.Task] = {}
    
    async def load_model_lazy(
        self,
        model_name: str,
        model_type: str,
        loader_func: Callable[[], Any],
        model_url: Optional[str] = None,
        force_reload: bool = False
    ) -> Any:
        """
        Carga modelo de forma lazy (solo cuando se necesita)
        
        Args:
            model_name: Nombre del modelo
            model_type: Tipo de modelo (bert, cv, etc.)
            loader_func: Función que carga el modelo
            model_url: URL opcional para descargar modelo
            force_reload: Forzar recarga incluso si está cargado
        
        Returns:
            Modelo cargado
        """
        cache_key = f"{model_type}:{model_name}"
        
        # Verificar si ya está cargado
        if not force_reload and cache_key in self._loaded_models:
            logger.debug("model_already_loaded", cache_key=cache_key)
            return self._loaded_models[cache_key]
        
        # Verificar si hay una tarea de carga en progreso
        if cache_key in self._loading_tasks:
            logger.debug("model_loading_in_progress", cache_key=cache_key)
            return await self._loading_tasks[cache_key]
        
        # Crear tarea de carga
        async def _load():
            try:
                # Descargar modelo si es necesario
                model_path = None
                if model_url:
                    model_path = await self.downloader.download_model(model_url, model_name)
                
                # Cargar modelo
                if model_path:
                    # Modificar loader_func para usar path descargado
                    original_loader = loader_func
                    def path_loader():
                        # Ajustar loader para usar model_path
                        return original_loader()
                    loader = path_loader
                else:
                    loader = loader_func
                
                # Ejecutar loader
                loop = asyncio.get_event_loop()
                model = await loop.run_in_executor(None, loader)
                
                # Almacenar modelo cargado
                self._loaded_models[cache_key] = model
                logger.info("model_loaded_lazy", cache_key=cache_key, model_name=model_name)
                
                return model
                
            except Exception as e:
                logger.error("model_lazy_load_failed", cache_key=cache_key, error=str(e))
                raise
            finally:
                # Limpiar tarea
                if cache_key in self._loading_tasks:
                    del self._loading_tasks[cache_key]
        
        task = asyncio.create_task(_load())
        self._loading_tasks[cache_key] = task
        
        return await task
    
    async def preload_models(self, model_configs: List[Dict[str, Any]]) -> None:
        """
        Precarga modelos en background
        
        Args:
            model_configs: Lista de configuraciones de modelos a precargar
        """
        tasks = []
        for config in model_configs:
            model_name = config.get('model_name')
            model_type = config.get('model_type')
            loader_func = config.get('loader_func')
            model_url = config.get('model_url')
            
            if model_name and model_type and loader_func:
                task = self.load_model_lazy(
                    model_name=model_name,
                    model_type=model_type,
                    loader_func=loader_func,
                    model_url=model_url
                )
                tasks.append(task)
        
        # Ejecutar precargas en paralelo
        if tasks:
            logger.info("preloading_models", count=len(tasks))
            await asyncio.gather(*tasks, return_exceptions=True)
    
    def unload_model(self, model_name: str, model_type: str) -> bool:
        """Descarga modelo de memoria"""
        cache_key = f"{model_type}:{model_name}"
        
        if cache_key in self._loaded_models:
            model = self._loaded_models.pop(cache_key)
            
            # Limpiar modelo si tiene método cleanup
            if hasattr(model, 'cleanup'):
                try:
                    model.cleanup()
                except Exception as e:
                    logger.warning("model_cleanup_failed", cache_key=cache_key, error=str(e))
            
            logger.info("model_unloaded", cache_key=cache_key)
            return True
        
        return False
    
    def get_loaded_models(self) -> List[str]:
        """Obtiene lista de modelos cargados"""
        return list(self._loaded_models.keys())


# Instancia global del lazy loader
_global_lazy_loader: Optional[LazyModelLoader] = None


def get_lazy_loader() -> LazyModelLoader:
    """Obtiene instancia global del lazy loader"""
    global _global_lazy_loader
    if _global_lazy_loader is None:
        cache_dir = os.getenv("ML_MODEL_DOWNLOAD_DIR", "/tmp/ml_models_downloads")
        downloader = ModelDownloader(cache_dir=cache_dir)
        _global_lazy_loader = LazyModelLoader(downloader=downloader)
    
    return _global_lazy_loader

