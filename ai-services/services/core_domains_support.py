"""
Core Domains Support Service
Proporciona soporte indirecto de AI para los dominios core:
- Medical Histories (Historias Médicas)
- Appointments (Citas)
- Prescriptions (Prescripciones)
- Alerts (Alertas)
"""

from typing import Dict, Any, Optional, List
import structlog
from datetime import datetime
from decorators import with_logging, with_cache, with_metrics, with_circuit_breaker, with_retry

logger = structlog.get_logger()


class CoreDomainsSupportService:
    """
    Servicio de soporte indirecto para dominios core
    Proporciona capacidades de AI para mejorar los dominios core
    """
    
    def __init__(self, model_manager=None, service_manager=None):
        self.model_manager = model_manager
        self.service_manager = service_manager
        self._cache_prefix = "core_domains"
    
    @with_logging(log_level="info", log_execution_time=True)
    @with_cache(ttl=1800, key_prefix="medical_history_analysis")
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def analyze_medical_history_for_insights(
        self,
        history_text: str,
        patient_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analiza una historia médica para extraer insights y recomendaciones
        Soporte indirecto para el dominio de Medical Histories
        """
        try:
            logger.info("Analyzing medical history for insights", patient_id=patient_id)
            
            # Procesar texto médico
            if self.model_manager:
                processing_result = await self.model_manager.process_medical_text(history_text)
            else:
                processing_result = {"symptoms": [], "entities": []}
            
            # Extraer insights clave
            insights = {
                "key_symptoms": processing_result.get("symptoms", [])[:5],
                "risk_factors": await self._extract_risk_factors(history_text),
                "severity_assessment": await self._assess_severity(history_text, processing_result),
                "recommendations": await self._generate_recommendations(processing_result),
                "follow_up_suggestions": await self._suggest_follow_ups(processing_result, context),
            }
            
            logger.info("Medical history analysis completed", 
                       patient_id=patient_id,
                       insights_count=len(insights))
            
            return {
                "success": True,
                "insights": insights,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error("Error analyzing medical history", error=str(e), patient_id=patient_id)
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
    
    @with_logging(log_level="info", log_execution_time=True)
    @with_cache(ttl=3600, key_prefix="appointment_optimization")
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def optimize_appointment_scheduling(
        self,
        patient_id: str,
        symptoms: List[str],
        urgency: str,
        available_slots: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Optimiza la programación de citas basándose en síntomas y urgencia
        Soporte indirecto para el dominio de Appointments
        """
        try:
            logger.info("Optimizing appointment scheduling", 
                       patient_id=patient_id,
                       urgency=urgency,
                       slots_count=len(available_slots))
            
            # Analizar síntomas para determinar urgencia real
            symptom_analysis = await self._analyze_symptoms_for_urgency(symptoms)
            
            # Recomendar mejor slot basado en urgencia y disponibilidad
            recommended_slot = await self._recommend_best_slot(
                symptom_analysis,
                urgency,
                available_slots,
                context
            )
            
            # Generar recomendaciones de preparación
            preparation_tips = await self._generate_preparation_tips(symptoms, context)
            
            return {
                "success": True,
                "recommended_slot": recommended_slot,
                "urgency_assessment": symptom_analysis.get("assessed_urgency", urgency),
                "preparation_tips": preparation_tips,
                "reasoning": symptom_analysis.get("reasoning", ""),
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error("Error optimizing appointment", error=str(e), patient_id=patient_id)
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
    
    @with_logging(log_level="info", log_execution_time=True)
    @with_cache(ttl=1800, key_prefix="prescription_analysis")
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def analyze_prescription_safety(
        self,
        prescription_text: str,
        patient_id: str,
        current_medications: Optional[List[str]] = None,
        allergies: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analiza la seguridad de una prescripción
        Soporte indirecto para el dominio de Prescriptions
        """
        try:
            logger.info("Analyzing prescription safety", patient_id=patient_id)
            
            # Extraer medicamentos de la prescripción
            medications = await self._extract_medications(prescription_text)
            
            # Verificar interacciones
            interactions = []
            if current_medications:
                interactions = await self._check_drug_interactions(
                    medications,
                    current_medications
                )
            
            # Verificar alergias
            allergy_warnings = []
            if allergies:
                allergy_warnings = await self._check_allergy_conflicts(
                    medications,
                    allergies
                )
            
            # Analizar dosificación
            dosage_analysis = await self._analyze_dosage(medications, context)
            
            # Generar recomendaciones
            recommendations = await self._generate_prescription_recommendations(
                medications,
                interactions,
                allergy_warnings,
                dosage_analysis
            )
            
            return {
                "success": True,
                "medications": medications,
                "interactions": interactions,
                "allergy_warnings": allergy_warnings,
                "dosage_analysis": dosage_analysis,
                "recommendations": recommendations,
                "safety_score": self._calculate_safety_score(
                    interactions,
                    allergy_warnings,
                    dosage_analysis
                ),
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error("Error analyzing prescription", error=str(e), patient_id=patient_id)
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
    
    @with_logging(log_level="info", log_execution_time=True)
    @with_cache(ttl=600, key_prefix="alert_priority")
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def assess_alert_priority(
        self,
        alert_data: Dict[str, Any],
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evalúa la prioridad de una alerta basándose en síntomas y contexto
        Soporte indirecto para el dominio de Alerts
        """
        try:
            logger.info("Assessing alert priority", alert_type=alert_data.get("type"))
            
            # Analizar síntomas si están presentes
            symptoms = alert_data.get("symptoms", [])
            symptom_analysis = await self._analyze_symptoms_for_urgency(symptoms)
            
            # Evaluar contexto del paciente
            context_risk = await self._assess_patient_context_risk(patient_context)
            
            # Calcular prioridad combinada
            priority_score = self._calculate_priority_score(
                symptom_analysis,
                context_risk,
                alert_data
            )
            
            # Determinar nivel de prioridad
            priority_level = self._determine_priority_level(priority_score)
            
            # Generar recomendaciones de acción
            action_recommendations = await self._generate_alert_actions(
                priority_level,
                symptom_analysis,
                context_risk
            )
            
            return {
                "success": True,
                "priority_level": priority_level,
                "priority_score": priority_score,
                "symptom_analysis": symptom_analysis,
                "context_risk": context_risk,
                "action_recommendations": action_recommendations,
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error("Error assessing alert priority", error=str(e))
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }
    
    # Métodos auxiliares privados
    async def _extract_risk_factors(self, text: str) -> List[str]:
        """Extrae factores de riesgo del texto"""
        # Implementación simplificada - en producción usar NER médico
        risk_keywords = ["diabetes", "hipertensión", "obesidad", "tabaquismo", "edad avanzada"]
        found_risks = [risk for risk in risk_keywords if risk.lower() in text.lower()]
        return found_risks
    
    async def _assess_severity(self, text: str, processing_result: Dict[str, Any]) -> str:
        """Evalúa la severidad basándose en síntomas"""
        symptoms = processing_result.get("symptoms", [])
        if not symptoms:
            return "low"
        
        # Lógica simplificada - en producción usar modelo de clasificación
        severe_keywords = ["dificultad respiratoria", "dolor pecho", "cianosis"]
        if any(keyword in text.lower() for keyword in severe_keywords):
            return "high"
        elif len(symptoms) > 3:
            return "medium"
        else:
            return "low"
    
    async def _generate_recommendations(self, processing_result: Dict[str, Any]) -> List[str]:
        """Genera recomendaciones basadas en el análisis"""
        recommendations = []
        symptoms = processing_result.get("symptoms", [])
        
        if "fiebre" in str(symptoms).lower():
            recommendations.append("Monitorear temperatura regularmente")
        if "tos" in str(symptoms).lower():
            recommendations.append("Mantener hidratación adecuada")
        if "dificultad respiratoria" in str(symptoms).lower():
            recommendations.append("Buscar atención médica inmediata si empeora")
        
        return recommendations
    
    async def _suggest_follow_ups(self, processing_result: Dict[str, Any], context: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sugiere seguimientos basados en el análisis"""
        follow_ups = []
        severity = await self._assess_severity("", processing_result)
        
        if severity == "high":
            follow_ups.append({
                "type": "immediate",
                "description": "Consulta médica urgente",
                "timeframe": "24 horas"
            })
        elif severity == "medium":
            follow_ups.append({
                "type": "scheduled",
                "description": "Consulta médica programada",
                "timeframe": "3-5 días"
            })
        
        return follow_ups
    
    async def _analyze_symptoms_for_urgency(self, symptoms: List[str]) -> Dict[str, Any]:
        """Analiza síntomas para determinar urgencia"""
        if not symptoms:
            return {"assessed_urgency": "low", "reasoning": "No symptoms provided"}
        
        urgent_symptoms = ["dificultad respiratoria", "dolor pecho", "cianosis", "pérdida conciencia"]
        has_urgent = any(urgent in str(symptoms).lower() for urgent in urgent_symptoms)
        
        if has_urgent:
            return {"assessed_urgency": "critical", "reasoning": "Urgent symptoms detected"}
        elif len(symptoms) > 3:
            return {"assessed_urgency": "high", "reasoning": "Multiple symptoms"}
        else:
            return {"assessed_urgency": "medium", "reasoning": "Moderate symptoms"}
    
    async def _recommend_best_slot(
        self,
        symptom_analysis: Dict[str, Any],
        urgency: str,
        available_slots: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Recomienda el mejor slot disponible"""
        if not available_slots:
            return None
        
        assessed_urgency = symptom_analysis.get("assessed_urgency", urgency)
        
        # Priorizar slots más tempranos para urgencias
        if assessed_urgency in ["critical", "high"]:
            sorted_slots = sorted(available_slots, key=lambda x: x.get("datetime", ""))
            return sorted_slots[0] if sorted_slots else None
        
        # Para urgencias bajas, retornar el primero disponible
        return available_slots[0] if available_slots else None
    
    async def _generate_preparation_tips(self, symptoms: List[str], context: Optional[Dict[str, Any]]) -> List[str]:
        """Genera tips de preparación para la cita"""
        tips = []
        if "fiebre" in str(symptoms).lower():
            tips.append("Llevar registro de temperatura")
        if "medicamentos" in str(context or {}).lower():
            tips.append("Traer lista de medicamentos actuales")
        tips.append("Llegar 15 minutos antes de la cita")
        return tips
    
    async def _extract_medications(self, prescription_text: str) -> List[Dict[str, Any]]:
        """Extrae medicamentos del texto de prescripción"""
        # Implementación simplificada - en producción usar NER médico
        medications = []
        # Placeholder - en producción usar modelo de extracción
        return medications
    
    async def _check_drug_interactions(self, new_meds: List[Dict], current_meds: List[str]) -> List[Dict[str, Any]]:
        """Verifica interacciones medicamentosas"""
        # Placeholder - en producción integrar con servicio de interacciones
        return []
    
    async def _check_allergy_conflicts(self, medications: List[Dict], allergies: List[str]) -> List[Dict[str, Any]]:
        """Verifica conflictos con alergias"""
        warnings = []
        # Placeholder - en producción verificar contra base de datos de alergias
        return warnings
    
    async def _analyze_dosage(self, medications: List[Dict], context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Analiza dosificación"""
        return {"status": "ok", "warnings": []}
    
    async def _generate_prescription_recommendations(
        self,
        medications: List[Dict],
        interactions: List[Dict],
        allergy_warnings: List[Dict],
        dosage_analysis: Dict[str, Any]
    ) -> List[str]:
        """Genera recomendaciones para la prescripción"""
        recommendations = []
        if interactions:
            recommendations.append("Revisar interacciones medicamentosas")
        if allergy_warnings:
            recommendations.append("⚠️ ADVERTENCIA: Posibles conflictos con alergias")
        return recommendations
    
    def _calculate_safety_score(
        self,
        interactions: List[Dict],
        allergy_warnings: List[Dict],
        dosage_analysis: Dict[str, Any]
    ) -> float:
        """Calcula score de seguridad (0-100)"""
        score = 100.0
        score -= len(interactions) * 10
        score -= len(allergy_warnings) * 20
        if dosage_analysis.get("warnings"):
            score -= len(dosage_analysis["warnings"]) * 5
        return max(0.0, score)
    
    async def _assess_patient_context_risk(self, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Evalúa riesgo basado en contexto del paciente"""
        if not context:
            return {"risk_level": "unknown", "factors": []}
        
        risk_factors = []
        if context.get("age", 0) > 65:
            risk_factors.append("edad_avanzada")
        if context.get("chronic_conditions"):
            risk_factors.append("condiciones_cronicas")
        
        risk_level = "high" if len(risk_factors) > 2 else "medium" if risk_factors else "low"
        
        return {"risk_level": risk_level, "factors": risk_factors}
    
    def _calculate_priority_score(
        self,
        symptom_analysis: Dict[str, Any],
        context_risk: Dict[str, Any],
        alert_data: Dict[str, Any]
    ) -> float:
        """Calcula score de prioridad (0-100)"""
        score = 50.0  # Base
        
        urgency_map = {"critical": 40, "high": 30, "medium": 15, "low": 5}
        score += urgency_map.get(symptom_analysis.get("assessed_urgency", "low"), 5)
        
        risk_map = {"high": 20, "medium": 10, "low": 0, "unknown": 5}
        score += risk_map.get(context_risk.get("risk_level", "unknown"), 5)
        
        return min(100.0, score)
    
    def _determine_priority_level(self, score: float) -> str:
        """Determina nivel de prioridad basado en score"""
        if score >= 80:
            return "critical"
        elif score >= 60:
            return "high"
        elif score >= 40:
            return "medium"
        else:
            return "low"
    
    async def _generate_alert_actions(
        self,
        priority_level: str,
        symptom_analysis: Dict[str, Any],
        context_risk: Dict[str, Any]
    ) -> List[str]:
        """Genera recomendaciones de acción para alertas"""
        actions = []
        
        if priority_level == "critical":
            actions.append("Contactar servicios de emergencia inmediatamente")
            actions.append("Notificar al médico de cabecera")
        elif priority_level == "high":
            actions.append("Programar consulta médica urgente")
            actions.append("Monitorear síntomas de cerca")
        elif priority_level == "medium":
            actions.append("Programar consulta médica en 24-48 horas")
        else:
            actions.append("Monitorear síntomas y programar consulta si persisten")
        
        return actions

