from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from ml_models.nlp_advanced import MedicalNLPProcessor

router = APIRouter(prefix="/v1/nlp/advanced", tags=["Advanced NLP"])


class TextPayload(BaseModel):
    text: str = Field(..., description="Texto médico a procesar")
    language: Optional[str] = Field("es", description="Idioma del texto (es/en)")


class TranslatePayload(BaseModel):
    term: str = Field(..., description="Término médico a traducir")
    source_language: Optional[str] = Field("es")
    target_language: Optional[str] = Field("en")


@router.post("/process", summary="Procesamiento general de texto médico")
async def nlp_process(payload: TextPayload) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor(language=payload.language)
        return {"status": "success", "result": nlp.process_text(payload.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ner", summary="Extracción de entidades médicas (NER)")
async def nlp_ner(payload: TextPayload) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor(language=payload.language)
        return {"status": "success", "result": nlp.extract_entities(payload.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/summarize", summary="Resumen automático de historias médicas")
async def nlp_summarize(payload: TextPayload) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor(language=payload.language)
        return {"status": "success", "result": nlp.summarize(payload.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate", summary="Traducción de términos médicos (simple)")
async def nlp_translate(payload: TranslatePayload) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor(language=payload.source_language or "es")
        return {"status": "success", "result": nlp.translate_term(payload.term, target_language=payload.target_language or "en")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sentiment", summary="Análisis de sentimiento en notas médicas")
async def nlp_sentiment(payload: TextPayload) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor(language=payload.language)
        return {"status": "success", "result": nlp.analyze_sentiment(payload.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from ml_models.medical_nlp import MedicalNLPProcessor

router = APIRouter(prefix="/v1/nlp/advanced", tags=["Advanced NLP"])


class TextBody(BaseModel):
    text: str = Field(..., description="Texto clínico a procesar")
    language: Optional[str] = Field("es", description="Idioma del texto (por defecto: es)")


class TermsBody(BaseModel):
    terms: List[str] = Field(..., min_items=1, description="Lista de términos médicos")
    target_language: Optional[str] = Field("en", description="Idioma destino")


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
        return {"status": "success", "result": nlp.translate_terms(req.terms, target_language=req.target_language or "en")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sentiment", summary="Análisis de sentimiento en notas médicas")
async def nlp_sentiment(req: TextBody) -> Dict[str, Any]:
    try:
        nlp = MedicalNLPProcessor(language=req.language or "es")
        return {"status": "success", "result": nlp.sentiment(req.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


