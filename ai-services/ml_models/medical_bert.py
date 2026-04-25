"""
MedicalBERTModel - Modelo Transformer (BERT) para texto médico.

Soporta carga real de modelos BERT con transformers cuando AI_USE_REAL_MODELS=1.
Incluye fallback robusto a stubs si falla la carga o no hay GPU disponible.
"""
from typing import List, Dict, Any, Optional
import os
import structlog
from .model_cache import get_model_cache
from .lazy_loader import get_lazy_loader

logger = structlog.get_logger()

# Modelos médicos recomendados
MEDICAL_BERT_MODELS = {
    "default": "bert-base-uncased",
    "medical": "emilyalsentzer/Bio_ClinicalBERT",  # BERT entrenado en textos clínicos
    "scibert": "allenai/scibert_scivocab_uncased",  # BERT para textos científicos
    "pubmed": "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext",  # PubMed BERT
    "bluebert": "bionlp/bluebert_pubmed_mimic_uncased_L-12_H-768_A-12",  # BlueBERT
}


class MedicalBERTModel:
    def __init__(self, model_name: str = "bert-base-uncased", device: Optional[str] = None) -> None:
        """
        Inicializa el modelo BERT médico.
        
        Args:
            model_name: Nombre del modelo. Puede ser un modelo estándar o uno de:
                       'medical', 'scibert', 'pubmed', 'bluebert'
            device: Dispositivo ('cpu' o 'cuda'). Si es None, se detecta automáticamente.
        """
        # Resolver nombre del modelo si es un alias
        if model_name in MEDICAL_BERT_MODELS:
            self.model_name = MEDICAL_BERT_MODELS[model_name]
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
        self._tokenizer = None
        self._use_real_model = False

    def _load_model_real(self) -> bool:
        """
        Carga real del modelo BERT usando transformers.
        
        Returns:
            True si la carga fue exitosa, False en caso contrario.
        """
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification  # type: ignore
            import torch  # type: ignore
            
            logger.info("loading_medical_bert", model=self.model_name, device=self.device)
            
            # Cargar tokenizer
            self._tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=os.getenv("TRANSFORMERS_CACHE", "/tmp/transformers_cache")
            )
            
            # Cargar modelo
            self._model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                num_labels=3,  # Por defecto: 3 clases (asthma, copd, flu)
                cache_dir=os.getenv("TRANSFORMERS_CACHE", "/tmp/transformers_cache")
            )
            
            # Mover a GPU si está disponible
            if self.device == "cuda" and torch.cuda.is_available():
                self._model.to("cuda")
                logger.info("medical_bert_loaded_gpu", model=self.model_name, device=torch.cuda.get_device_name(0))
            else:
                self._model.to("cpu")
                logger.info("medical_bert_loaded_cpu", model=self.model_name)
            
            # Modo evaluación
            self._model.eval()
            
            self._use_real_model = True
            logger.info("medical_bert_loaded_success", model=self.model_name, device=self.device)
            return True
            
        except ImportError as err:
            logger.warning(
                "medical_bert_import_error",
                error=str(err),
                message="transformers o torch no están instalados. Instalar con: pip install transformers torch"
            )
            return False
        except Exception as err:
            logger.warning(
                "medical_bert_load_error",
                error=str(err),
                model=self.model_name,
                fallback="stub"
            )
            return False
    
    def load(self) -> bool:
        """
        Carga (o simula) el modelo BERT usando caché y lazy loading.
        En producción, inicializaría tokenizer y modelo.
        """
        use_real = os.getenv("AI_USE_REAL_MODELS", "0") == "1"
        
        if use_real:
            # Usar caché y lazy loading
            cache = get_model_cache()
            lazy_loader = get_lazy_loader()
            
            # Intentar cargar desde caché o lazy loader
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
                    model_type="medical_bert",
                    loader_func=loader,
                    device=self.device
                )
                
                if model:
                    self._model = model
                    self._tokenizer = None  # Se carga por separado
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
        self._tokenizer = None
        self._model = None
        self._loaded = True
        return self._loaded

    def predict(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        Realiza inferencia sobre una lista de textos médicos.
        Retorna una lista de dicts con scores y etiquetas estimadas.
        
        Args:
            texts: Lista de textos médicos a analizar.
            
        Returns:
            Lista de diccionarios con predicciones para cada texto.
        """
        if not self._loaded:
            self.load()
        
        # Usar modelo real si está disponible
        if self._use_real_model and self._model is not None and self._tokenizer is not None:
            try:
                import torch  # type: ignore
                import torch.nn.functional as F  # type: ignore
                
                outputs: List[Dict[str, Any]] = []
                labels = ["asthma", "copd", "flu"]  # Etiquetas por defecto
                
                # Procesar textos en batch si es posible
                batch_size = int(os.getenv("BERT_BATCH_SIZE", "8"))
                
                for i in range(0, len(texts), batch_size):
                    batch_texts = texts[i:i + batch_size]
                    
                    # Tokenizar
                    encoded = self._tokenizer(
                        batch_texts,
                        padding=True,
                        truncation=True,
                        max_length=512,
                        return_tensors="pt"
                    )
                    
                    # Mover a dispositivo correcto
                    if self.device == "cuda" and torch.cuda.is_available():
                        encoded = {k: v.to("cuda") for k, v in encoded.items()}
                    
                    # Inferencia (sin gradientes)
                    with torch.no_grad():
                        outputs_model = self._model(**encoded)
                        logits = outputs_model.logits
                        
                        # Aplicar softmax para obtener probabilidades
                        probs = F.softmax(logits, dim=-1)
                        
                        # Convertir a CPU para numpy
                        probs = probs.cpu().numpy()
                    
                    # Procesar resultados
                    for j, text in enumerate(batch_texts):
                        scores = probs[j].tolist()
                        top_idx = int(probs[j].argmax())
                        
                        outputs.append({
                            "text": text,
                            "labels": labels[:len(scores)],
                            "scores": scores,
                            "top_label": labels[top_idx] if top_idx < len(labels) else "unknown",
                            "confidence": float(max(scores)),
                            "model": self.model_name,
                            "device": self.device,
                        })
                
                logger.info("medical_bert_predict_real", texts_count=len(texts), device=self.device)
                return outputs
                
            except Exception as err:
                logger.error(
                    "medical_bert_predict_error",
                    error=str(err),
                    fallback="stub"
                )
                # Fallback a stub
                self._use_real_model = False
        
        # Stub: puntuaciones simuladas (fallback)
        logger.info("medical_bert_predict_stub", texts_count=len(texts))
        outputs: List[Dict[str, Any]] = []
        for t in texts:
            outputs.append(
                {
                    "text": t,
                    "labels": ["asthma", "copd", "flu"],
                    "scores": [0.12, 0.78, 0.10],
                    "top_label": "copd",
                    "confidence": 0.78,
                    "model": "stub",
                    "device": "cpu",
                }
            )
        return outputs

    def train(self, train_data: List[Dict[str, Any]], epochs: int = 1) -> Dict[str, Any]:
        """
        Entrenamiento (stub). En la implementación real, ajustaría el modelo con train_data.
        """
        if not self._loaded:
            self.load()
        return {"status": "ok", "epochs": epochs, "samples": len(train_data)}


