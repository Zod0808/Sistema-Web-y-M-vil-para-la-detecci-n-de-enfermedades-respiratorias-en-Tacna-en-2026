"""AI Model Manager for loading and optimising ML models."""

from __future__ import annotations

import asyncio
import contextlib
import os
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Tuple

import structlog

from core.config import settings

logger = structlog.get_logger()

try:  # pragma: no cover - torch no siempre está instalado en CI
    import torch
except Exception:  # pragma: no cover
    torch = None


class ModelManager:
    """Gestiona carga de modelos, inferencia y optimizaciones (batch/GPU/quantization)."""

    def __init__(self) -> None:
        self.models: Dict[str, Any] = {}
        self.model_path = Path(settings.MODEL_PATH)
        self.model_path.mkdir(parents=True, exist_ok=True)
        self._loading_lock = asyncio.Lock()
        self._load_task: Optional[asyncio.Task] = None

    async def load_models(self, force: bool = False) -> None:
        """Carga los modelos necesarios; puede forzar recarga completa."""
        async with self._loading_lock:
            if self._load_task and not self._load_task.done() and not force:
                await self._load_task
                return

            if force:
                logger.info("Forzando recarga de modelos IA")
                self.models.clear()

            logger.info(
                "Inicializando carga de modelos IA",
                async_loading=settings.ENABLE_ASYNC_MODEL_LOADING,
            )

            loaders = (
                self._load_medical_model(),
                self._load_symptom_model(),
                self._load_history_model(),
            )

            if settings.ENABLE_ASYNC_MODEL_LOADING:
                self._load_task = asyncio.create_task(
                    asyncio.gather(*loaders, return_exceptions=False)
                )
                await self._load_task
            else:
                for loader in loaders:
                    await loader

            logger.info("Modelos IA disponibles", modelos=list(self.models.keys()))

    async def ensure_model(self, model_name: str):
        """Garantiza que un modelo esté cargado antes de usarlo."""
        if model_name not in self.models:
            await self.load_models(force=False)
        return self.models.get(model_name)

    def get_model(self, model_name: str) -> Optional[Any]:
        """Obtiene un modelo ya cargado."""
        return self.models.get(model_name)

    async def _load_medical_model(self) -> None:
        """Carga modelo NLP médico (SpaCy) con fallback."""
        if "medical_nlp" in self.models:
            return

        import spacy

        def sync_load():
            try:
                return spacy.load(settings.MEDICAL_MODEL_NAME)
            except OSError:
                logger.warning(
                    "Modelo médico no encontrado; descargando",
                    modelo=settings.MEDICAL_MODEL_NAME,
                )
                os.system(f"python -m spacy download {settings.MEDICAL_MODEL_NAME}")
                return spacy.load(settings.MEDICAL_MODEL_NAME)

        try:
            nlp = await self._maybe_to_thread(sync_load)
        except Exception as exc:  # pragma: no cover - depende del runtime
            logger.error("Fallo cargando modelo médico", error=str(exc))
            nlp = spacy.load("en_core_web_sm")

        self.models["medical_nlp"] = nlp
        logger.info("Modelo NLP médico cargado", device="cpu", cuantizado=False)

    async def _load_symptom_model(self) -> None:
        """Carga el modelo de clasificación de síntomas y aplica optimizaciones."""
        if {"symptom_model", "symptom_tokenizer"}.issubset(self.models.keys()):
            return

        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        model_name = settings.SYMPTOM_MODEL_NAME or "microsoft/DialoGPT-medium"

        def sync_load() -> Tuple[Any, Any]:
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSequenceClassification.from_pretrained(
                model_name, num_labels=10
            )
            return tokenizer, model

        try:
            tokenizer, model = await self._maybe_to_thread(sync_load)
        except Exception as exc:  # pragma: no cover
            logger.error("No se pudo cargar el modelo de síntomas", error=str(exc))
            self.models["symptom_model"] = "rule_based"
            return

        optimisation_metadata, model = self._optimise_transformer_model(model)
        self.models["symptom_tokenizer"] = tokenizer
        self.models["symptom_model"] = model
        logger.info("Modelo de síntomas listo", **optimisation_metadata)

    async def _load_history_model(self) -> None:
        """Inicializa cliente de procesamiento de historias (OpenAI o fallback)."""
        if "openai_client" in self.models:
            return

        def sync_load():
            with contextlib.suppress(ImportError):
                import openai  # type: ignore

                openai.api_key = settings.OPENAI_API_KEY
                return openai
            return None

        client = await self._maybe_to_thread(sync_load)
        if client:
            logger.info("Cliente OpenAI inicializado")
            self.models["openai_client"] = client
        else:
            logger.warning("Cliente OpenAI no disponible; modo offline activo")
            self.models["openai_client"] = None

    def _optimise_transformer_model(self, model: Any) -> Tuple[Dict[str, Any], Any]:
        """Aplica cuantización dinámica y/o GPU según disponibilidad."""
        metadata: Dict[str, Any] = {
            "cuantizado": False,
            "gpu_activa": False,
            "device": "cpu",
        }

        if not torch or not hasattr(model, "to"):
            return metadata, model

        with contextlib.suppress(Exception):
            model.eval()

        if settings.ENABLE_MODEL_QUANTIZATION and hasattr(torch, "quantization"):
            try:
                model = model.to("cpu")
                model = torch.quantization.quantize_dynamic(
                    model, {torch.nn.Linear}, dtype=torch.qint8
                )
                metadata["cuantizado"] = True
            except Exception as exc:  # pragma: no cover
                logger.warning("Cuantización dinámica falló", error=str(exc))

        target_device = "cpu"
        if settings.ENABLE_GPU_ACCELERATION and torch.cuda.is_available():
            target_device = settings.GPU_DEVICE or "cuda"
            metadata["gpu_activa"] = True

        try:
            model.to(target_device)
            metadata["device"] = target_device
        except Exception as exc:  # pragma: no cover
            logger.warning(
                "No se pudo mover modelo a device",
                device=target_device,
                error=str(exc),
            )
            model.to("cpu")

        return metadata, model

    async def _maybe_to_thread(self, func: Callable, *args, **kwargs):
        """Ejecuta función bloqueante en thread pool si está habilitado."""
        if settings.ENABLE_ASYNC_MODEL_LOADING:
            return await asyncio.to_thread(func, *args, **kwargs)
        return func(*args, **kwargs)

    async def _maybe_run_inference(self, func: Callable, *args, **kwargs):
        """Ejecuta inferencia pesada en thread pool cuando corresponde."""
        if settings.ENABLE_ASYNC_INFERENCE:
            return await asyncio.to_thread(func, *args, **kwargs)
        return func(*args, **kwargs)

    async def process_medical_text(self, text: str) -> Dict[str, Any]:
        """Procesa texto médico con NLP y retorna entidades + síntomas."""
        try:
            nlp = await self.ensure_model("medical_nlp")
            if not nlp:
                return {"error": "Medical NLP model not available"}

            doc = await self._maybe_run_inference(nlp, text)

            entities = []
            for ent in doc.ents:
                entities.append(
                    {
                        "text": ent.text,
                        "label": ent.label_,
                        "start": ent.start_char,
                        "end": ent.end_char,
                        "confidence": 0.8,
                    }
                )

            symptoms = self._extract_symptoms(text)

            return {
                "entities": entities,
                "symptoms": symptoms,
                "processed_text": text,
                "confidence": 0.85,
            }

        except Exception as exc:
            logger.error("Error procesando texto médico", error=str(exc))
            return {"error": str(exc)}

    def _extract_symptoms(self, text: str) -> list:
        """Extrae síntomas mediante coincidencias por categoría."""
        symptom_keywords = {
            "respiratory": [
                "tos",
                "tos seca",
                "tos con flema",
                "dificultad respiratoria",
                "falta de aire",
                "sibilancias",
                "opresión en el pecho",
            ],
            "fever": ["fiebre", "temperatura alta", "escalofríos", "malestar general"],
            "pain": [
                "dolor de cabeza",
                "dolor de garganta",
                "dolor muscular",
                "dolor articular",
            ],
            "digestive": ["náuseas", "vómitos", "diarrea", "dolor abdominal"],
            "fatigue": ["cansancio", "fatiga", "debilidad", "agotamiento"],
        }

        found_symptoms = []
        text_lower = text.lower()

        for category, keywords in symptom_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    found_symptoms.append(
                        {
                            "symptom": keyword,
                            "category": category,
                            "confidence": 0.7,
                        }
                    )

        return found_symptoms

    async def classify_symptoms(self, symptoms: list) -> Dict[str, Any]:
        """Clasifica síntomas y genera recomendaciones rápidas."""
        try:
            severity_scores = {
                "respiratory": 0.8,
                "fever": 0.7,
                "pain": 0.5,
                "digestive": 0.4,
                "fatigue": 0.3,
            }

            categories = [s.get("category", "unknown") for s in symptoms]
            max_severity = max(
                [severity_scores.get(cat, 0.1) for cat in categories], default=0.1
            )

            if max_severity >= 0.8:
                urgency = "high"
                recommendation = "Se recomienda consulta médica inmediata"
            elif max_severity >= 0.6:
                urgency = "medium"
                recommendation = "Se recomienda consulta médica en las próximas 24 horas"
            else:
                urgency = "low"
                recommendation = "Monitorear síntomas y consultar si empeoran"

            return {
                "urgency": urgency,
                "severity_score": max_severity,
                "recommendation": recommendation,
                "categories": list(set(categories)),
                "confidence": 0.8,
            }

        except Exception as exc:
            logger.error("Error clasificando síntomas", error=str(exc))
            return {"error": str(exc)}


# Instancia global
model_manager = ModelManager()

