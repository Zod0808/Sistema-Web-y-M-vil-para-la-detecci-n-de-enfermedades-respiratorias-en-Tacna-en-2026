"""
API Routes for Core Domains Support
Endpoints para soporte indirecto de AI a los dominios core
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import structlog

from services.core_domains_support import CoreDomainsSupportService
from api.dependencies import get_model_manager, get_service_manager

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/core-domains", tags=["Core Domains Support"])


# Request/Response Models
class MedicalHistoryAnalysisRequest(BaseModel):
    history_text: str = Field(..., description="Texto de la historia médica")
    patient_id: str = Field(..., description="ID del paciente")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Contexto adicional")


class AppointmentOptimizationRequest(BaseModel):
    patient_id: str = Field(..., description="ID del paciente")
    symptoms: List[str] = Field(..., description="Lista de síntomas")
    urgency: str = Field(..., description="Nivel de urgencia")
    available_slots: List[Dict[str, Any]] = Field(..., description="Slots disponibles")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Contexto adicional")


class PrescriptionAnalysisRequest(BaseModel):
    prescription_text: str = Field(..., description="Texto de la prescripción")
    patient_id: str = Field(..., description="ID del paciente")
    current_medications: Optional[List[str]] = Field(default=None, description="Medicamentos actuales")
    allergies: Optional[List[str]] = Field(default=None, description="Alergias del paciente")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Contexto adicional")


class AlertPriorityRequest(BaseModel):
    alert_data: Dict[str, Any] = Field(..., description="Datos de la alerta")
    patient_context: Optional[Dict[str, Any]] = Field(default=None, description="Contexto del paciente")


# Endpoints
@router.post("/medical-history/analyze")
async def analyze_medical_history(
    request: MedicalHistoryAnalysisRequest,
    model_manager=Depends(get_model_manager),
    service_manager=Depends(get_service_manager)
):
    """
    Analiza una historia médica para extraer insights y recomendaciones
    Soporte indirecto para el dominio de Medical Histories
    """
    try:
        service = CoreDomainsSupportService(model_manager=model_manager, service_manager=service_manager)
        result = await service.analyze_medical_history_for_insights(
            request.history_text,
            request.patient_id,
            request.context
        )
        return result
    except Exception as e:
        logger.error("Error in medical history analysis", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/appointments/optimize")
async def optimize_appointment(
    request: AppointmentOptimizationRequest,
    model_manager=Depends(get_model_manager),
    service_manager=Depends(get_service_manager)
):
    """
    Optimiza la programación de citas basándose en síntomas y urgencia
    Soporte indirecto para el dominio de Appointments
    """
    try:
        service = CoreDomainsSupportService(model_manager=model_manager, service_manager=service_manager)
        result = await service.optimize_appointment_scheduling(
            request.patient_id,
            request.symptoms,
            request.urgency,
            request.available_slots,
            request.context
        )
        return result
    except Exception as e:
        logger.error("Error in appointment optimization", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prescriptions/analyze")
async def analyze_prescription(
    request: PrescriptionAnalysisRequest,
    model_manager=Depends(get_model_manager),
    service_manager=Depends(get_service_manager)
):
    """
    Analiza la seguridad de una prescripción
    Soporte indirecto para el dominio de Prescriptions
    """
    try:
        service = CoreDomainsSupportService(model_manager=model_manager, service_manager=service_manager)
        result = await service.analyze_prescription_safety(
            request.prescription_text,
            request.patient_id,
            request.current_medications,
            request.allergies,
            request.context
        )
        return result
    except Exception as e:
        logger.error("Error in prescription analysis", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/assess-priority")
async def assess_alert_priority(
    request: AlertPriorityRequest,
    model_manager=Depends(get_model_manager),
    service_manager=Depends(get_service_manager)
):
    """
    Evalúa la prioridad de una alerta basándose en síntomas y contexto
    Soporte indirecto para el dominio de Alerts
    """
    try:
        service = CoreDomainsSupportService(model_manager=model_manager, service_manager=service_manager)
        result = await service.assess_alert_priority(
            request.alert_data,
            request.patient_context
        )
        return result
    except Exception as e:
        logger.error("Error in alert priority assessment", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

