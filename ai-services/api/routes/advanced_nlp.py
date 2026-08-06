from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator
from typing import List, Dict, Any, Optional

from ml_models.medical_nlp import MedicalNLPProcessor

router = APIRouter(prefix="/v1/nlp/advanced", tags=["Advanced NLP"])


class TextBody(BaseModel):
    text: str = Field(..., description="Texto clínico a procesar")
    language: Optional[str] = Field("es", description="Idioma del texto (por defecto: es)")


class TermsBody(BaseModel):
    term: Optional[str] = Field(None, description="Término médico individual a traducir")
    terms: Optional[List[str]] = Field(None, min_items=1, description="Lista de términos médicos")
    source_language: Optional[str] = Field("es", description="Idioma origen")
    target_language: Optional[str] = Field("en", description="Idioma destino")

    @model_validator(mode="after")
    def check_term_or_terms(self):
        if not self.term and not self.terms:
            raise ValueError("Debe especificar 'term' o 'terms'")
        return self


class SummarizeBody(BaseModel):
    text: str = Field(..., description="Historia médica a resumir")
    max_sentences: Optional[int] = Field(2, ge=1, le=10, description="Número máximo de oraciones del resumen")


@router.post("/process", summary="Procesamiento de texto médico")
async def nlp_process(req: TextBody) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor(language=req.language or "es")
        return {"status": "success", "result": nlp.process_text(req.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ner", summary="Extracción de entidades (NER) médica")
async def nlp_ner(req: TextBody) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor(language=req.language or "es")
        return {"status": "success", "result": nlp.extract_entities(req.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarize", summary="Resumen automático de historias médicas")
async def nlp_summarize(req: SummarizeBody) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor()
        return {"status": "success", "result": nlp.summarize(req.text, max_sentences=req.max_sentences or 2)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate", summary="Traducción de términos médicos")
async def nlp_translate(req: TermsBody) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor()
        terms = req.terms or [req.term]
        return {"status": "success", "result": nlp.translate_terms(terms, target_language=req.target_language or "en")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sentiment", summary="Análisis de sentimiento en notas médicas")
async def nlp_sentiment(req: TextBody) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor(language=req.language or "es")
        return {"status": "success", "result": nlp.sentiment(req.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


