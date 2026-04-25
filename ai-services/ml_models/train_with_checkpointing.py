"""
Training with Checkpointing for Spot Instances
Sistema de checkpointing para trabajos en spot instances
"""

import os
import sys
import time
import structlog
from pathlib import Path
from typing import Dict, Any, Optional
import json
import signal

logger = structlog.get_logger()

# Configuración de checkpointing
CHECKPOINT_DIR = Path(os.getenv("CHECKPOINT_DIR", "/checkpoints"))
CHECKPOINT_INTERVAL = int(os.getenv("CHECKPOINT_INTERVAL", "300"))  # 5 minutos por defecto
SPOT_INSTANCE = os.getenv("SPOT_INSTANCE", "false").lower() == "true"


class CheckpointManager:
    """Gestiona checkpoints para entrenamiento en spot instances"""
    
    def __init__(self, checkpoint_dir: Path, interval_seconds: int = 300):
        self.checkpoint_dir = checkpoint_dir
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.interval_seconds = interval_seconds
        self.last_checkpoint_time = time.time()
        self.checkpoint_count = 0
        self.interrupted = False
        
        # Registrar handler para señales de interrupción
        if SPOT_INSTANCE:
            signal.signal(signal.SIGTERM, self._handle_interrupt)
            signal.signal(signal.SIGINT, self._handle_interrupt)
    
    def _handle_interrupt(self, signum, frame):
        """Maneja interrupciones (spot instance termination)"""
        logger.warning("training_interrupted", signal=signum)
        self.interrupted = True
        self.save_checkpoint(force=True)
    
    def should_checkpoint(self) -> bool:
        """Verifica si es momento de hacer checkpoint"""
        if self.interrupted:
            return True
        
        elapsed = time.time() - self.last_checkpoint_time
        return elapsed >= self.interval_seconds
    
    def save_checkpoint(
        self,
        epoch: int,
        model_state: Dict[str, Any],
        optimizer_state: Optional[Dict[str, Any]] = None,
        metrics: Optional[Dict[str, Any]] = None,
        force: bool = False
    ) -> bool:
        """
        Guarda checkpoint del entrenamiento
        
        Args:
            epoch: Época actual
            model_state: Estado del modelo
            optimizer_state: Estado del optimizador (opcional)
            metrics: Métricas del entrenamiento (opcional)
            force: Forzar guardado incluso si no es momento
        """
        if not force and not self.should_checkpoint():
            return False
        
        try:
            checkpoint_num = self.checkpoint_count + 1
            checkpoint_path = self.checkpoint_dir / f"checkpoint_{checkpoint_num:04d}.pt"
            metadata_path = self.checkpoint_dir / f"checkpoint_{checkpoint_num:04d}_metadata.json"
            
            # Guardar estado del modelo
            import pickle
            with open(checkpoint_path, 'wb') as f:
                checkpoint_data = {
                    'epoch': epoch,
                    'model_state': model_state,
                    'optimizer_state': optimizer_state,
                    'timestamp': time.time()
                }
                pickle.dump(checkpoint_data, f)
            
            # Guardar metadata
            metadata = {
                'checkpoint_num': checkpoint_num,
                'epoch': epoch,
                'timestamp': time.time(),
                'metrics': metrics or {},
                'model_size_mb': self._estimate_model_size(model_state)
            }
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Guardar checkpoint más reciente
            latest_path = self.checkpoint_dir / "latest_checkpoint.pt"
            latest_metadata_path = self.checkpoint_dir / "latest_checkpoint_metadata.json"
            
            import shutil
            shutil.copy(checkpoint_path, latest_path)
            shutil.copy(metadata_path, latest_metadata_path)
            
            self.last_checkpoint_time = time.time()
            self.checkpoint_count = checkpoint_num
            
            logger.info(
                "checkpoint_saved",
                checkpoint_num=checkpoint_num,
                epoch=epoch,
                path=str(checkpoint_path)
            )
            
            return True
            
        except Exception as e:
            logger.error("checkpoint_save_failed", error=str(e))
            return False
    
    def load_latest_checkpoint(self) -> Optional[Dict[str, Any]]:
        """Carga el checkpoint más reciente"""
        latest_path = self.checkpoint_dir / "latest_checkpoint.pt"
        
        if not latest_path.exists():
            logger.info("no_checkpoint_found", path=str(latest_path))
            return None
        
        try:
            import pickle
            with open(latest_path, 'rb') as f:
                checkpoint_data = pickle.load(f)
            
            logger.info(
                "checkpoint_loaded",
                epoch=checkpoint_data.get('epoch', 0),
                path=str(latest_path)
            )
            
            return checkpoint_data
            
        except Exception as e:
            logger.error("checkpoint_load_failed", error=str(e))
            return None
    
    def _estimate_model_size(self, model_state: Dict[str, Any]) -> float:
        """Estima tamaño del modelo en MB"""
        try:
            import sys
            size_bytes = sys.getsizeof(model_state)
            # Estimación adicional para tensores
            if isinstance(model_state, dict):
                for key, value in model_state.items():
                    if hasattr(value, 'numel'):
                        size_bytes += value.numel() * value.element_size()
            return size_bytes / (1024 * 1024)
        except Exception:
            return 0.0
    
    def cleanup_old_checkpoints(self, keep_last: int = 5) -> None:
        """Elimina checkpoints antiguos, manteniendo los últimos N"""
        try:
            checkpoints = sorted(
                self.checkpoint_dir.glob("checkpoint_*.pt"),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )
            
            # Mantener los últimos N
            for checkpoint in checkpoints[keep_last:]:
                checkpoint.unlink()
                metadata = checkpoint.with_suffix('.pt').with_name(
                    checkpoint.stem.replace('.pt', '_metadata.json')
                )
                if metadata.exists():
                    metadata.unlink()
                
                logger.debug("old_checkpoint_removed", path=str(checkpoint))
                
        except Exception as e:
            logger.warning("checkpoint_cleanup_failed", error=str(e))


def main():
    """Función principal para entrenamiento con checkpointing"""
    logger.info("training_with_checkpointing_started", spot_instance=SPOT_INSTANCE)
    
    checkpoint_manager = CheckpointManager(
        checkpoint_dir=CHECKPOINT_DIR,
        interval_seconds=CHECKPOINT_INTERVAL
    )
    
    # Intentar cargar checkpoint previo
    checkpoint_data = checkpoint_manager.load_latest_checkpoint()
    start_epoch = 0
    
    if checkpoint_data:
        start_epoch = checkpoint_data.get('epoch', 0) + 1
        logger.info("resuming_from_checkpoint", epoch=start_epoch)
    
    # Simulación de entrenamiento
    max_epochs = int(os.getenv("MAX_EPOCHS", "100"))
    
    for epoch in range(start_epoch, max_epochs):
        if checkpoint_manager.interrupted:
            logger.warning("training_interrupted_saving_checkpoint", epoch=epoch)
            break
        
        # Simular entrenamiento
        logger.info("training_epoch", epoch=epoch, max_epochs=max_epochs)
        time.sleep(10)  # Simular trabajo
        
        # Métricas simuladas
        metrics = {
            'loss': 1.0 / (epoch + 1),
            'accuracy': min(0.95, 0.5 + epoch * 0.01)
        }
        
        # Guardar checkpoint periódicamente
        model_state = {'epoch': epoch, 'weights': f'model_weights_epoch_{epoch}'}
        checkpoint_manager.save_checkpoint(
            epoch=epoch,
            model_state=model_state,
            metrics=metrics
        )
        
        # Limpiar checkpoints antiguos
        if epoch % 10 == 0:
            checkpoint_manager.cleanup_old_checkpoints(keep_last=5)
    
    logger.info("training_completed", final_epoch=epoch)


if __name__ == "__main__":
    main()

