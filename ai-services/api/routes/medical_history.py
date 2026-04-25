"""
Medical History Processing API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import structlog

from core.database import get_database
from core.cache import get_cache, set_cache, get_cache as get_cache_value
from models.model_manager import model_manager

logger = structlog.get_logger()
router = APIRouter()


class MedicalHistoryInput(BaseModel):
    """Input model for medical history processing"""
    patient_id: str = Field(..., description="Patient identifier")
    text: str = Field(..., description="Medical history text to process", max_length=10000)
    language: str = Field(default="es", description="Text language")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class MedicalHistoryOutput(BaseModel):
    """Output model for medical history processing"""
    patient_id: str
    processed_at: datetime
    entities: List[Dict[str, Any]]
    symptoms: List[Dict[str, Any]]
    diagnosis_suggestions: List[str]
    risk_factors: List[str]
    recommendations: List[str]
    confidence_score: float
    processing_time_ms: int


class MedicalHistorySearch(BaseModel):
    """Search model for medical histories"""
    patient_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    diagnosis: Optional[str] = None
    symptoms: Optional[List[str]] = None
    limit: int = Field(default=50, le=100)


@router.post("/medical-history/process", response_model=MedicalHistoryOutput)
async def process_medical_history(
    input_data: MedicalHistoryInput,
    db=Depends(get_database),
    cache=Depends(get_cache)
) -> MedicalHistoryOutput:
    """
    Process medical history text and extract structured information
    """
    start_time = datetime.utcnow()
    
    try:
        # Check cache first
        cache_key = f"medical_history:{input_data.patient_id}:{hash(input_data.text)}"
        cached_result = await get_cache_value(cache_key)
        
        if cached_result:
            logger.info("Returning cached medical history processing result")
            return MedicalHistoryOutput(**cached_result)
        
        # Process with AI models
        logger.info("Processing medical history", patient_id=input_data.patient_id)
        
        # Extract entities and symptoms
        processing_result = await model_manager.process_medical_text(input_data.text)
        
        if "error" in processing_result:
            raise HTTPException(status_code=500, detail=processing_result["error"])
        
        # Generate diagnosis suggestions
        diagnosis_suggestions = await _generate_diagnosis_suggestions(
            processing_result["symptoms"],
            processing_result["entities"]
        )
        
        # Extract risk factors
        risk_factors = await _extract_risk_factors(input_data.text)
        
        # Generate recommendations
        recommendations = await _generate_recommendations(
            processing_result["symptoms"],
            diagnosis_suggestions
        )
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Create response
        result = MedicalHistoryOutput(
            patient_id=input_data.patient_id,
            processed_at=datetime.utcnow(),
            entities=processing_result["entities"],
            symptoms=processing_result["symptoms"],
            diagnosis_suggestions=diagnosis_suggestions,
            risk_factors=risk_factors,
            recommendations=recommendations,
            confidence_score=processing_result.get("confidence", 0.8),
            processing_time_ms=int(processing_time)
        )
        
        # Cache result
        await set_cache(cache_key, result.dict(), ttl=3600)
        
        # Store in database
        await _store_processing_result(db, result, input_data.metadata)
        
        logger.info("Medical history processed successfully", 
                   patient_id=input_data.patient_id,
                   processing_time_ms=processing_time)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error processing medical history", 
                    patient_id=input_data.patient_id, 
                    error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/medical-history/{patient_id}", response_model=List[MedicalHistoryOutput])
async def get_medical_histories(
    patient_id: str,
    limit: int = 50,
    db=Depends(get_database)
) -> List[MedicalHistoryOutput]:
    """
    Get processed medical histories for a patient
    """
    try:
        collection = db.ai_results
        cursor = collection.find(
            {"patient_id": patient_id, "type": "medical_history"}
        ).sort("created_at", -1).limit(limit)
        
        results = []
        async for doc in cursor:
            results.append(MedicalHistoryOutput(**doc["data"]))
        
        return results
        
    except Exception as e:
        logger.error("Error retrieving medical histories", 
                    patient_id=patient_id, 
                    error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/medical-history/search", response_model=List[MedicalHistoryOutput])
async def search_medical_histories(
    search_params: MedicalHistorySearch,
    db=Depends(get_database)
) -> List[MedicalHistoryOutput]:
    """
    Search medical histories with filters
    """
    try:
        collection = db.ai_results
        
        # Build query
        query = {"type": "medical_history"}
        
        if search_params.patient_id:
            query["patient_id"] = search_params.patient_id
        
        if search_params.date_from or search_params.date_to:
            date_query = {}
            if search_params.date_from:
                date_query["$gte"] = search_params.date_from
            if search_params.date_to:
                date_query["$lte"] = search_params.date_to
            query["created_at"] = date_query
        
        if search_params.diagnosis:
            query["data.diagnosis_suggestions"] = {"$regex": search_params.diagnosis, "$options": "i"}
        
        if search_params.symptoms:
            query["data.symptoms.symptom"] = {"$in": search_params.symptoms}
        
        # Execute query
        cursor = collection.find(query).sort("created_at", -1).limit(search_params.limit)
        
        results = []
        async for doc in cursor:
            results.append(MedicalHistoryOutput(**doc["data"]))
        
        return results
        
    except Exception as e:
        logger.error("Error searching medical histories", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


async def _generate_diagnosis_suggestions(symptoms: List[Dict], entities: List[Dict]) -> List[str]:
    """Generate diagnosis suggestions based on symptoms and entities"""
    # Simple rule-based diagnosis suggestions
    suggestions = []
    
    respiratory_symptoms = [s for s in symptoms if s.get("category") == "respiratory"]
    fever_symptoms = [s for s in symptoms if s.get("category") == "fever"]
    
    if respiratory_symptoms and fever_symptoms:
        suggestions.extend([
            "Infección respiratoria aguda",
            "Bronquitis",
            "Neumonía (evaluar con radiografía)"
        ])
    elif respiratory_symptoms:
        suggestions.extend([
            "Asma",
            "Bronquitis crónica",
            "Enfermedad pulmonar obstructiva crónica (EPOC)"
        ])
    elif fever_symptoms:
        suggestions.extend([
            "Síndrome febril",
            "Infección viral",
            "Infección bacteriana"
        ])
    
    # Add general suggestions if no specific patterns
    if not suggestions:
        suggestions.append("Evaluación médica general recomendada")
    
    return suggestions[:5]  # Limit to 5 suggestions


async def _extract_risk_factors(text: str) -> List[str]:
    """Extract risk factors from medical text"""
    risk_factors = []
    text_lower = text.lower()
    
    # Common risk factors
    risk_patterns = {
        "tabaquismo": ["fuma", "cigarrillo", "tabaco", "fumador"],
        "diabetes": ["diabetes", "glucosa alta", "azúcar alto"],
        "hipertensión": ["presión alta", "hipertensión", "hta"],
        "obesidad": ["sobrepeso", "obesidad", "peso alto"],
        "edad avanzada": ["mayor de 65", "anciano", "adulto mayor"],
        "antecedentes familiares": ["familia", "hereditario", "genético"]
    }
    
    for risk, patterns in risk_patterns.items():
        if any(pattern in text_lower for pattern in patterns):
            risk_factors.append(risk)
    
    return risk_factors


async def _generate_recommendations(symptoms: List[Dict], diagnoses: List[str]) -> List[str]:
    """Generate medical recommendations"""
    recommendations = []
    
    # General recommendations based on symptoms
    if any(s.get("category") == "respiratory" for s in symptoms):
        recommendations.extend([
            "Evitar exposición a irritantes respiratorios",
            "Mantener hidratación adecuada",
            "Monitorear signos vitales"
        ])
    
    if any(s.get("category") == "fever" for s in symptoms):
        recommendations.extend([
            "Control de temperatura regular",
            "Reposo y hidratación",
            "Evaluar necesidad de antipiréticos"
        ])
    
    # Add general recommendations
    recommendations.extend([
        "Seguimiento médico regular",
        "Mantener estilo de vida saludable",
        "Reportar cualquier empeoramiento de síntomas"
    ])
    
    return recommendations[:5]  # Limit to 5 recommendations


async def _store_processing_result(db, result: MedicalHistoryOutput, metadata: Optional[Dict]):
    """Store processing result in database"""
    try:
        collection = db.ai_results
        document = {
            "patient_id": result.patient_id,
            "type": "medical_history",
            "data": result.dict(),
            "created_at": datetime.utcnow(),
            "metadata": metadata or {}
        }
        
        await collection.insert_one(document)
        logger.info("Medical history processing result stored", patient_id=result.patient_id)
        
    except Exception as e:
        logger.error("Error storing processing result", error=str(e))
        # Don't raise exception as this is not critical
