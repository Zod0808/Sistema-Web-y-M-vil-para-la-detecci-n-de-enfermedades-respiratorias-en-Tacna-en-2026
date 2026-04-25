"""
MedicalImageClassifier - Modelo de visión por computadora para imágenes médicas.

Soporta carga real de modelos de visión con torch/timm cuando AI_USE_REAL_MODELS=1.
Incluye fallback robusto a stubs si falla la carga o no hay GPU disponible.
"""
from typing import List, Dict, Any, Optional, Union
import os
import structlog
from .model_cache import get_model_cache
from .lazy_loader import get_lazy_loader

logger = structlog.get_logger()

# Modelos de visión recomendados para imágenes médicas
MEDICAL_IMAGE_MODELS = {
    "default": "resnet50",
    "resnet50": "resnet50",
    "resnet101": "resnet101",
    "densenet121": "densenet121",
    "efficientnet_b0": "efficientnet_b0",
    "efficientnet_b4": "efficientnet_b4",
    "vit_base": "vit_base_patch16_224",  # Vision Transformer
    "medical": "resnet50",  # Por defecto para imágenes médicas
}


class MedicalImageClassifier:
    def __init__(self, model_name: str = "resnet50", device: Optional[str] = None) -> None:
        """
        Inicializa el clasificador de imágenes médicas.
        
        Args:
            model_name: Nombre del modelo. Puede ser un modelo de torchvision o timm.
            device: Dispositivo ('cpu' o 'cuda'). Si es None, se detecta automáticamente.
        """
        # Resolver nombre del modelo si es un alias
        if model_name in MEDICAL_IMAGE_MODELS:
            self.model_name = MEDICAL_IMAGE_MODELS[model_name]
        else:
            self.model_name = model_name
        
        # Detectar dispositivo automáticamente
        if device is None:
            try:
                import torch  # type: ignore
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                self.device = "cpu"
        else:
            self.device = device
        
        self._loaded = False
        self._model = None
        self._preprocess = None
        self._use_real_model = False

    def _load_model_real(self) -> bool:
        """
        Carga real del modelo de visión usando torchvision o timm.
        
        Returns:
            True si la carga fue exitosa, False en caso contrario.
        """
        try:
            import torch  # type: ignore
            from torchvision import transforms  # type: ignore
            
            logger.info("loading_medical_image_model", model=self.model_name, device=self.device)
            
            # Intentar cargar con timm primero (más modelos disponibles)
            try:
                import timm  # type: ignore
                if timm.is_model(self.model_name):
                    self._model = timm.create_model(
                        self.model_name,
                        pretrained=True,
                        num_classes=2  # Por defecto: normal/anomaly
                    )
                    logger.info("medical_image_model_loaded_timm", model=self.model_name)
                else:
                    raise ValueError(f"Model {self.model_name} not found in timm")
            except (ImportError, ValueError):
                # Fallback a torchvision
                import torchvision.models as models  # type: ignore
                
                # Modelos disponibles en torchvision
                if hasattr(models, self.model_name):
                    model_fn = getattr(models, self.model_name)
                    self._model = model_fn(pretrained=True)  # type: ignore[attr-defined]
                    logger.info("medical_image_model_loaded_torchvision", model=self.model_name)
                else:
                    # Usar ResNet50 por defecto
                    logger.warning(
                        "medical_image_model_not_found",
                        model=self.model_name,
                        fallback="resnet50"
                    )
                    self._model = models.resnet50(pretrained=True)  # type: ignore[attr-defined]
                    self.model_name = "resnet50"
            
            # Configurar preprocesamiento
            self._preprocess = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225]
                ),
            ])
            
            # Mover a GPU si está disponible
            if self.device == "cuda" and torch.cuda.is_available():
                self._model.to("cuda")
                logger.info(
                    "medical_image_model_loaded_gpu",
                    model=self.model_name,
                    device=torch.cuda.get_device_name(0)
                )
            else:
                self._model.to("cpu")
                logger.info("medical_image_model_loaded_cpu", model=self.model_name)
            
            # Modo evaluación
            self._model.eval()
            
            self._use_real_model = True
            logger.info("medical_image_model_loaded_success", model=self.model_name, device=self.device)
            return True
            
        except ImportError as err:
            logger.warning(
                "medical_image_import_error",
                error=str(err),
                message="torch, torchvision o timm no están instalados. "
                       "Instalar con: pip install torch torchvision timm"
            )
            return False
        except Exception as err:
            logger.warning(
                "medical_image_load_error",
                error=str(err),
                model=self.model_name,
                fallback="stub"
            )
            return False
    
    def load(self) -> bool:
        """
        Carga (o simula) el modelo de visión usando caché y lazy loading.
        En producción inicializa pesos preentrenados.
        """
        use_real = os.getenv("AI_USE_REAL_MODELS", "0") == "1"
        
        if use_real:
            # Usar caché y lazy loading
            cache = get_model_cache()
            
            try:
                import asyncio
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            async def _load_with_cache():
                def loader():
                    return self._load_model_real()
                
                model, was_cached = await cache.get_or_load(
                    model_name=self.model_name,
                    model_type="medical_image",
                    loader_func=loader,
                    device=self.device
                )
                
                if model:
                    self._model = model
                    self._loaded = True
                    return True
                return False
            
            try:
                result = loop.run_until_complete(_load_with_cache())
                if result:
                    return True
            except Exception as e:
                logger.warning("cache_load_failed", error=str(e))
        
        # Fallback a carga directa o stub
        if use_real:
            if self._load_model_real():
                return True
        
        # Stub
        self._model = None
        self._loaded = True
        return self._loaded

    def predict(self, images: List[Union[str, Any]]) -> List[Dict[str, Any]]:
        """
        Clasifica imágenes médicas.
        'images' acepta rutas a archivos o tensores/imágenes preprocesadas.
        
        Args:
            images: Lista de rutas a imágenes o objetos de imagen.
            
        Returns:
            Lista de diccionarios con predicciones para cada imagen.
        """
        if not self._loaded:
            self.load()
        
        # Usar modelo real si está disponible
        if self._use_real_model and self._model is not None and self._preprocess is not None:
            try:
                import torch  # type: ignore
                from PIL import Image  # type: ignore
                import torch.nn.functional as F  # type: ignore
                
                outputs: List[Dict[str, Any]] = []
                labels = ["normal", "anomaly"]  # Etiquetas por defecto
                
                # Procesar imágenes
                for img_path in images:
                    try:
                        # Cargar imagen
                        if isinstance(img_path, str):
                            image = Image.open(img_path).convert("RGB")
                        else:
                            # Asumir que es un objeto PIL Image
                            image = img_path.convert("RGB") if hasattr(img_path, "convert") else img_path
                        
                        # Preprocesar
                        input_tensor = self._preprocess(image)
                        input_batch = input_tensor.unsqueeze(0)  # Agregar dimensión de batch
                        
                        # Mover a dispositivo correcto
                        if self.device == "cuda" and torch.cuda.is_available():
                            input_batch = input_batch.to("cuda")
                        
                        # Inferencia (sin gradientes)
                        with torch.no_grad():
                            output = self._model(input_batch)
                            
                            # Aplicar softmax para obtener probabilidades
                            probs = F.softmax(output, dim=-1)
                            
                            # Convertir a CPU para numpy
                            probs = probs.cpu().numpy()[0]
                        
                        # Procesar resultados
                        scores = probs.tolist()
                        top_idx = int(probs.argmax())
                        
                        outputs.append({
                            "image": str(img_path),
                            "labels": labels[:len(scores)],
                            "scores": scores,
                            "top_label": labels[top_idx] if top_idx < len(labels) else "unknown",
                            "confidence": float(max(scores)),
                            "model": self.model_name,
                            "device": self.device,
                        })
                        
                    except Exception as img_err:
                        logger.warning(
                            "medical_image_predict_single_error",
                            image=str(img_path),
                            error=str(img_err),
                            fallback="stub"
                        )
                        # Fallback para esta imagen
                        outputs.append({
                            "image": str(img_path),
                            "labels": ["normal", "anomaly"],
                            "scores": [0.85, 0.15],
                            "top_label": "normal",
                            "confidence": 0.85,
                            "model": "stub",
                            "device": "cpu",
                            "error": str(img_err),
                        })
                
                logger.info("medical_image_predict_real", images_count=len(images), device=self.device)
                return outputs
                
            except Exception as err:
                logger.error(
                    "medical_image_predict_error",
                    error=str(err),
                    fallback="stub"
                )
                # Fallback a stub
                self._use_real_model = False
        
        # Stub: puntuaciones simuladas (fallback)
        logger.info("medical_image_predict_stub", images_count=len(images))
        outputs: List[Dict[str, Any]] = []
        for img in images:
            outputs.append(
                {
                    "image": str(img),
                    "labels": ["normal", "anomaly"],
                    "scores": [0.85, 0.15],
                    "top_label": "normal",
                    "confidence": 0.85,
                    "model": "stub",
                    "device": "cpu",
                }
            )
        return outputs

    def train(self, dataset: Any, epochs: int = 1) -> Dict[str, Any]:
        """
        Entrenamiento (stub). En producción, ajusta el clasificador con dataset etiquetado.
        """
        if not self._loaded:
            self.load()
        return {"status": "ok", "epochs": epochs, "samples": getattr(dataset, "size", "unknown")}


