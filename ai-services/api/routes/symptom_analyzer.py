"""
Symptom Analysis API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import structlog

from core.database import get_database
from core.cache import get_cache, set_cache, get_cache as get_cache_value
from models.model_manager import model_manager
from services.ai_service_manager import ai_service_manager
from services.symptom_analysis_service import SymptomAnalysisService

logger = structlog.get_logger()
router = APIRouter()


class SymptomInput(BaseModel):
    """Input model for symptom analysis"""
    patient_id: str = Field(..., description="Patient identifier")
    symptoms: List[Dict[str, Any]] = Field(..., description="List of symptoms")
    severity: Optional[str] = Field(default="medium", description="Overall severity level")
    duration: Optional[str] = Field(description="Duration of symptoms")
    context: Optional[str] = Field(description="Additional context about symptoms")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")


class SymptomAnalysisOutput(BaseModel):
    """Output model for symptom analysis"""
    patient_id: str
    analyzed_at: datetime
    urgency_level: str
    severity_score: float
    classification: Dict[str, Any]
    recommendations: List[str]
    warning_signs: List[str]
    follow_up_required: bool
    confidence_score: float
    processing_time_ms: int


class SymptomTrendAnalysis(BaseModel):
    """Symptom trend analysis over time"""
    patient_id: str
    period: str
    trend_data: List[Dict[str, Any]]
    overall_trend: str
    recommendations: List[str]


@router.post("/symptom-analyzer/analyze", response_model=SymptomAnalysisOutput)
async def analyze_symptoms(
    input_data: SymptomInput,
    db=Depends(get_database),
    cache=Depends(get_cache)
) -> SymptomAnalysisOutput:
    """
    Analyze symptoms and provide medical recommendations using AI Service Manager
    """
    start_time = datetime.utcnow()
    
    try:
        # Initialize AI Service Manager if needed
        if not ai_service_manager._initialized:
            await ai_service_manager.initialize()
        
        # Create symptom analysis service
        symptom_service = SymptomAnalysisService(ai_service_manager)
        
        # Perform comprehensive symptom analysis
        analysis_result = await symptom_service.analyze_symptoms_comprehensive(
            symptoms=input_data.symptoms,
            patient_id=input_data.patient_id,
            context=input_data.context,
            include_trends=True,
            include_recommendations=True
        )
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Create response
        result = SymptomAnalysisOutput(
            patient_id=input_data.patient_id,
            analyzed_at=datetime.utcnow(),
            urgency_level=analysis_result.get("urgency_level", "low"),
            severity_score=analysis_result.get("severity_score", 0.5),
            classification=analysis_result,
            recommendations=analysis_result.get("detailed_recommendations", {}).get("immediate_actions", []),
            warning_signs=analysis_result.get("warning_signs", []),
            follow_up_required=analysis_result.get("follow_up_required", False),
            confidence_score=analysis_result.get("confidence_score", 0.8),
            processing_time_ms=int(processing_time)
        )
        
        # Store in database
        await _store_analysis_result(db, result, input_data.metadata)
        
        logger.info("Symptom analysis completed successfully", 
                   patient_id=input_data.patient_id,
                   urgency=result.urgency_level,
                   processing_time_ms=processing_time)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error analyzing symptoms", 
                    patient_id=input_data.patient_id, 
                    error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/symptom-analyzer/trends/{patient_id}", response_model=SymptomTrendAnalysis)
async def get_symptom_trends(
    patient_id: str,
    period: str = "30d",
    db=Depends(get_database)
) -> SymptomTrendAnalysis:
    """
    Analyze symptom trends over time for a patient
    """
    try:
        # Calculate date range based on period
        from datetime import timedelta
        end_date = datetime.utcnow()
        
        if period == "7d":
            start_date = end_date - timedelta(days=7)
        elif period == "30d":
            start_date = end_date - timedelta(days=30)
        elif period == "90d":
            start_date = end_date - timedelta(days=90)
        else:
            start_date = end_date - timedelta(days=30)
        
        # Query symptom analyses
        collection = db.ai_results
        cursor = collection.find({
            "patient_id": patient_id,
            "type": "symptom_analysis",
            "created_at": {"$gte": start_date, "$lte": end_date}
        }).sort("created_at", 1)
        
        trend_data = []
        async for doc in cursor:
            data = doc["data"]
            trend_data.append({
                "date": data["analyzed_at"],
                "urgency_level": data["urgency_level"],
                "severity_score": data["severity_score"],
                "symptom_count": len(data.get("classification", {}).get("categories", []))
            })
        
        # Analyze overall trend
        overall_trend = await _analyze_overall_trend(trend_data)
        
        # Generate trend-based recommendations
        trend_recommendations = await _generate_trend_recommendations(trend_data, overall_trend)
        
        return SymptomTrendAnalysis(
            patient_id=patient_id,
            period=period,
            trend_data=trend_data,
            overall_trend=overall_trend,
            recommendations=trend_recommendations
        )
        
    except Exception as e:
        logger.error("Error analyzing symptom trends", 
                    patient_id=patient_id, 
                    error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/symptom-analyzer/recommendations")
async def get_general_recommendations() -> Dict[str, List[str]]:
    """
    Get general symptom management recommendations
    """
    return {
        "respiratory": [
            "Mantener hidratación adecuada",
            "Evitar irritantes como humo y polvo",
            "Usar humidificador si es necesario",
            "Practicar técnicas de respiración profunda"
        ],
        "fever": [
            "Controlar temperatura regularmente",
            "Mantener reposo",
            "Hidratación abundante",
            "Usar ropa ligera y cómoda"
        ],
        "pain": [
            "Aplicar calor o frío según el tipo de dolor",
            "Mantener postura correcta",
            "Evitar movimientos bruscos",
            "Considerar técnicas de relajación"
        ],
        "general": [
            "Seguir las indicaciones médicas",
            "Mantener un estilo de vida saludable",
            "Reportar cualquier empeoramiento",
            "No automedicarse sin supervisión médica"
        ]
    }


async def _generate_symptom_recommendations(
    symptoms: List[Dict], 
    classification: Dict, 
    context: Optional[str]
) -> List[str]:
    """Generate specific recommendations based on symptoms"""
    recommendations = []
    
    urgency = classification.get("urgency", "low")
    categories = classification.get("categories", [])
    
    # Urgency-based recommendations
    if urgency == "high":
        recommendations.extend([
            "Buscar atención médica inmediata",
            "Monitorear signos vitales constantemente",
            "Tener contacto de emergencia disponible"
        ])
    elif urgency == "medium":
        recommendations.extend([
            "Consultar médico en las próximas 24 horas",
            "Monitorear síntomas regularmente",
            "Evitar actividades extenuantes"
        ])
    else:
        recommendations.extend([
            "Monitorear síntomas en casa",
            "Consultar si empeoran",
            "Mantener reposo relativo"
        ])
    
    # Category-specific recommendations
    if "respiratory" in categories:
        recommendations.extend([
            "Mantener hidratación adecuada",
            "Evitar irritantes respiratorios",
            "Usar técnicas de respiración profunda"
        ])
    
    if "fever" in categories:
        recommendations.extend([
            "Controlar temperatura cada 4 horas",
            "Mantener reposo en cama",
            "Hidratación abundante"
        ])
    
    return recommendations[:8]  # Limit to 8 recommendations


async def _identify_warning_signs(symptoms: List[Dict], classification: Dict) -> List[str]:
    """Identify potential warning signs that require immediate attention"""
    warning_signs = []
    
    # Check for severe symptoms
    severe_symptoms = [
        "dificultad respiratoria severa",
        "dolor en el pecho",
        "fiebre muy alta",
        "confusión",
        "pérdida de conciencia"
    ]
    
    for symptom in symptoms:
        symptom_text = symptom.get("symptom", "").lower()
        if any(severe in symptom_text for severe in severe_symptoms):
            warning_signs.append(f"Síntoma grave detectado: {symptom_text}")
    
    # Check urgency level
    if classification.get("urgency") == "high":
        warning_signs.append("Nivel de urgencia alto - requiere atención inmediata")
    
    # Check severity score
    if classification.get("severity_score", 0) > 0.8:
        warning_signs.append("Puntuación de severidad alta")
    
    return warning_signs


async def _determine_follow_up(
    classification: Dict, 
    warning_signs: List[str], 
    duration: Optional[str]
) -> bool:
    """Determine if medical follow-up is required"""
    
    # High urgency always requires follow-up
    if classification.get("urgency") == "high":
        return True
    
    # Warning signs require follow-up
    if warning_signs:
        return True
    
    # Long duration symptoms
    if duration and any(keyword in duration.lower() for keyword in ["semana", "mes", "crónico"]):
        return True
    
    # High severity score
    if classification.get("severity_score", 0) > 0.7:
        return True
    
    return False


async def _analyze_overall_trend(trend_data: List[Dict]) -> str:
    """Analyze overall symptom trend"""
    if len(trend_data) < 2:
        return "insufficient_data"
    
    # Calculate trend based on severity scores
    scores = [point["severity_score"] for point in trend_data]
    
    # Simple linear trend analysis
    if len(scores) >= 3:
        recent_avg = sum(scores[-3:]) / 3
        earlier_avg = sum(scores[:3]) / 3
        
        if recent_avg > earlier_avg + 0.1:
            return "worsening"
        elif recent_avg < earlier_avg - 0.1:
            return "improving"
        else:
            return "stable"
    
    return "stable"


async def _generate_trend_recommendations(trend_data: List[Dict], trend: str) -> List[str]:
    """Generate recommendations based on trend analysis"""
    recommendations = []
    
    if trend == "worsening":
        recommendations.extend([
            "Los síntomas muestran tendencia a empeorar",
            "Se recomienda consulta médica urgente",
            "Monitorear más frecuentemente"
        ])
    elif trend == "improving":
        recommendations.extend([
            "Los síntomas muestran mejoría",
            "Continuar con el tratamiento actual",
            "Mantener seguimiento regular"
        ])
    else:
        recommendations.extend([
            "Los síntomas se mantienen estables",
            "Continuar monitoreo regular",
            "Consultar si hay cambios significativos"
        ])
    
    return recommendations


async def _store_analysis_result(db, result: SymptomAnalysisOutput, metadata: Optional[Dict]):
    """Store analysis result in database"""
    try:
        collection = db.ai_results
        document = {
            "patient_id": result.patient_id,
            "type": "symptom_analysis",
            "data": result.dict(),
            "created_at": datetime.utcnow(),
            "metadata": metadata or {}
        }
        
        await collection.insert_one(document)
        logger.info("Symptom analysis result stored", patient_id=result.patient_id)
        
    except Exception as e:
        logger.error("Error storing analysis result", error=str(e))
        # Don't raise exception as this is not critical
