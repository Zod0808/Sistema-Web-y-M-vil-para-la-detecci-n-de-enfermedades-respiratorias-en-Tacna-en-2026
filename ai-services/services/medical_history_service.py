"""
Medical History Service - Dedicated service for medical history processing
"""

from typing import Dict, Any, Optional, List
import structlog
from decorators import with_logging, with_cache, with_metrics, with_circuit_breaker, with_retry

logger = structlog.get_logger()


class MedicalHistoryService:
    """Dedicated service for medical history processing operations"""
    
    def __init__(self, service_manager=None):
        self.service_manager = service_manager
        self._cache_prefix = "medical_history"
    
    @with_logging(log_level="info", log_execution_time=True)
    @with_cache(ttl=3600, key_prefix="medical_history")
    @with_circuit_breaker("medical_history_processing", failure_threshold=3, recovery_timeout=300)
    @with_retry(max_attempts=3, delay=1.0, exceptions=(Exception,))
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def process_medical_history_comprehensive(
        self,
        text: str,
        patient_id: str,
        context: Optional[Dict[str, Any]] = None,
        include_entity_extraction: bool = True,
        include_diagnosis_suggestions: bool = True,
        include_risk_assessment: bool = True
    ) -> Dict[str, Any]:
        """Perform comprehensive medical history processing"""
        try:
            logger.info("Starting comprehensive medical history processing", 
                       patient_id=patient_id,
                       text_length=len(text))
            
            # Basic medical history processing
            processing_result = await self._perform_basic_processing(text, patient_id, context)
            
            # Add entity extraction if requested
            if include_entity_extraction:
                entity_analysis = await self._extract_medical_entities(text)
                processing_result["entity_analysis"] = entity_analysis
            
            # Add diagnosis suggestions if requested
            if include_diagnosis_suggestions:
                diagnosis_analysis = await self._generate_diagnosis_suggestions(processing_result)
                processing_result["diagnosis_analysis"] = diagnosis_analysis
            
            # Add risk assessment if requested
            if include_risk_assessment:
                risk_assessment = await self._assess_medical_risks(processing_result, context)
                processing_result["risk_assessment"] = risk_assessment
            
            # Add medical summary
            medical_summary = await self._generate_medical_summary(processing_result, patient_id)
            processing_result["medical_summary"] = medical_summary
            
            # Add care recommendations
            care_recommendations = await self._generate_care_recommendations(processing_result)
            processing_result["care_recommendations"] = care_recommendations
            
            logger.info("Comprehensive medical history processing completed",
                       patient_id=patient_id,
                       entities_found=len(processing_result.get("entities", [])),
                       symptoms_found=len(processing_result.get("symptoms", [])))
            
            return processing_result
            
        except Exception as e:
            logger.error("Comprehensive medical history processing failed",
                        patient_id=patient_id,
                        error=str(e))
            raise
    
    async def process_medical_history_batch(
        self,
        batch_requests: List[Dict[str, Any]],
        strategy_preference: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Delegates batch processing to AI service manager if disponible."""
        manager = self.service_manager
        if not manager:
            from services.ai_service_manager import ai_service_manager  # evita circularidad
            manager = ai_service_manager
        return await manager.process_medical_history_batch(batch_requests, strategy_preference)
    
    async def _perform_basic_processing(
        self,
        text: str,
        patient_id: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Perform basic medical history processing using service manager"""
        if self.service_manager:
            return await self.service_manager.process_medical_history(
                text, patient_id, context
            )
        else:
            # Fallback to direct processing
            from medical_history_processor.processor import processor
            return await processor.process_history(text, patient_id)
    
    async def _extract_medical_entities(self, text: str) -> Dict[str, Any]:
        """Extract and analyze medical entities from text"""
        try:
            # This would typically use NLP models for entity extraction
            # For now, return a structured analysis
            
            entities = {
                "medications": [],
                "conditions": [],
                "symptoms": [],
                "procedures": [],
                "vital_signs": [],
                "dates": [],
                "anatomical_structures": []
            }
            
            # Simple keyword-based extraction (would be enhanced with NLP)
            text_lower = text.lower()
            
            # Medication patterns
            medication_keywords = [
                "metformina", "losartán", "aspirina", "ibuprofeno", "paracetamol",
                "amoxicilina", "omeprazol", "insulina", "enalapril"
            ]
            
            for med in medication_keywords:
                if med in text_lower:
                    entities["medications"].append({
                        "name": med,
                        "confidence": 0.8,
                        "context": self._extract_context_around(text, med)
                    })
            
            # Condition patterns
            condition_keywords = [
                "diabetes", "hipertensión", "asma", "bronquitis", "neumonía",
                "gastritis", "epoc", "artritis", "migraña"
            ]
            
            for condition in condition_keywords:
                if condition in text_lower:
                    entities["conditions"].append({
                        "name": condition,
                        "confidence": 0.8,
                        "context": self._extract_context_around(text, condition)
                    })
            
            # Vital signs patterns
            import re
            vital_patterns = [
                (r'(\d+(?:\.\d+)?)\s*°?[CcFf]', "temperature"),
                (r'presión\s+(?:arterial\s+)?(\d+/\d+)', "blood_pressure"),
                (r'frecuencia\s+cardíaca\s+(\d+)', "heart_rate"),
                (r'peso\s+(\d+(?:\.\d+)?)\s*kg', "weight"),
                (r'altura\s+(\d+(?:\.\d+)?)\s*cm', "height")
            ]
            
            for pattern, vital_type in vital_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    entities["vital_signs"].append({
                        "type": vital_type,
                        "value": match.group(1),
                        "confidence": 0.9,
                        "position": match.start()
                    })
            
            # Calculate entity statistics
            total_entities = sum(len(entity_list) for entity_list in entities.values())
            
            return {
                "entities": entities,
                "statistics": {
                    "total_entities": total_entities,
                    "entity_types_found": len([k for k, v in entities.items() if v]),
                    "confidence_avg": self._calculate_average_confidence(entities)
                }
            }
            
        except Exception as e:
            logger.error("Failed to extract medical entities", error=str(e))
            return {"error": "Entity extraction unavailable"}
    
    async def _generate_diagnosis_suggestions(self, processing_result: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive diagnosis suggestions"""
        try:
            symptoms = processing_result.get("symptoms", [])
            entities = processing_result.get("entities", [])
            
            diagnosis_analysis = {
                "primary_suggestions": [],
                "differential_diagnoses": [],
                "ruled_out_conditions": [],
                "investigations_needed": [],
                "confidence_scores": {}
            }
            
            # Analyze symptom patterns
            symptom_categories = {}
            for symptom in symptoms:
                category = symptom.get("category", "unknown")
                if category not in symptom_categories:
                    symptom_categories[category] = []
                symptom_categories[category].append(symptom)
            
            # Generate suggestions based on symptom combinations
            if "respiratory" in symptom_categories and "fever" in symptom_categories:
                diagnosis_analysis["primary_suggestions"] = [
                    "Infección respiratoria aguda",
                    "Bronquitis",
                    "Neumonía (requiere confirmación radiológica)"
                ]
                diagnosis_analysis["investigations_needed"] = [
                    "Radiografía de tórax",
                    "Hemograma completo",
                    "Cultivo de esputo si indicado"
                ]
            
            elif "respiratory" in symptom_categories:
                diagnosis_analysis["primary_suggestions"] = [
                    "Asma",
                    "Bronquitis crónica",
                    "Enfermedad pulmonar obstructiva crónica (EPOC)"
                ]
                diagnosis_analysis["investigations_needed"] = [
                    "Espirometría",
                    "Radiografía de tórax",
                    "Pruebas de función pulmonar"
                ]
            
            elif "fever" in symptom_categories:
                diagnosis_analysis["primary_suggestions"] = [
                    "Síndrome febril",
                    "Infección viral",
                    "Infección bacteriana"
                ]
                diagnosis_analysis["investigations_needed"] = [
                    "Hemograma completo",
                    "Cultivos según sospecha clínica",
                    "Marcadores inflamatorios"
                ]
            
            else:
                diagnosis_analysis["primary_suggestions"] = [
                    "Evaluación médica general recomendada",
                    "Síndrome clínico inespecífico"
                ]
                diagnosis_analysis["investigations_needed"] = [
                    "Evaluación clínica completa",
                    "Anamnesis detallada",
                    "Exploración física"
                ]
            
            # Add differential diagnoses
            diagnosis_analysis["differential_diagnoses"] = [
                "Condiciones inflamatorias",
                "Enfermedades infecciosas",
                "Trastornos metabólicos",
                "Enfermedades autoinmunes"
            ]
            
            # Add confidence scores
            diagnosis_analysis["confidence_scores"] = {
                "primary_suggestions": 0.7,
                "differential_diagnoses": 0.5,
                "investigations_needed": 0.8
            }
            
            return diagnosis_analysis
            
        except Exception as e:
            logger.error("Failed to generate diagnosis suggestions", error=str(e))
            return {"error": "Diagnosis analysis unavailable"}
    
    async def _assess_medical_risks(
        self,
        processing_result: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assess medical risks based on processed history"""
        try:
            symptoms = processing_result.get("symptoms", [])
            entities = processing_result.get("entities", [])
            risk_factors = processing_result.get("risk_factors", [])
            
            risk_assessment = {
                "overall_risk_level": "low",
                "identified_risks": [],
                "risk_factors": [],
                "preventive_measures": [],
                "monitoring_recommendations": []
            }
            
            # Analyze risk factors
            risk_score = 0
            
            # Age-related risks
            if context and context.get("age"):
                age = context["age"]
                if age > 65:
                    risk_score += 2
                    risk_assessment["risk_factors"].append("Edad avanzada (>65 años)")
                elif age < 18:
                    risk_score += 1
                    risk_assessment["risk_factors"].append("Edad pediátrica")
            
            # Chronic conditions
            chronic_conditions = ["diabetes", "hipertensión", "asma", "epoc"]
            for condition in chronic_conditions:
                if any(condition in str(entity).lower() for entity in entities):
                    risk_score += 2
                    risk_assessment["risk_factors"].append(f"Condición crónica: {condition}")
            
            # Symptom severity
            severe_symptoms = [s for s in symptoms if s.get("severity") == "severe"]
            if len(severe_symptoms) >= 2:
                risk_score += 3
                risk_assessment["identified_risks"].append("Múltiples síntomas severos")
            
            # Respiratory symptoms
            respiratory_symptoms = [s for s in symptoms if s.get("category") == "respiratory"]
            if respiratory_symptoms:
                risk_score += 2
                risk_assessment["identified_risks"].append("Síntomas respiratorios presentes")
            
            # Determine overall risk level
            if risk_score >= 6:
                risk_assessment["overall_risk_level"] = "high"
            elif risk_score >= 3:
                risk_assessment["overall_risk_level"] = "moderate"
            else:
                risk_assessment["overall_risk_level"] = "low"
            
            # Generate preventive measures
            if risk_assessment["overall_risk_level"] == "high":
                risk_assessment["preventive_measures"] = [
                    "Evaluación médica inmediata",
                    "Monitoreo continuo",
                    "Preparación para atención de emergencia"
                ]
                risk_assessment["monitoring_recommendations"] = [
                    "Vigilancia de signos vitales",
                    "Monitoreo de síntomas",
                    "Evaluación médica frecuente"
                ]
            elif risk_assessment["overall_risk_level"] == "moderate":
                risk_assessment["preventive_measures"] = [
                    "Evaluación médica en 24-48 horas",
                    "Monitoreo regular de síntomas",
                    "Implementar medidas preventivas"
                ]
                risk_assessment["monitoring_recommendations"] = [
                    "Control diario de síntomas",
                    "Registro de cambios",
                    "Seguimiento médico programado"
                ]
            else:
                risk_assessment["preventive_measures"] = [
                    "Mantener estilo de vida saludable",
                    "Prevención primaria",
                    "Seguimiento médico rutinario"
                ]
                risk_assessment["monitoring_recommendations"] = [
                    "Control periódico",
                    "Evaluación preventiva",
                    "Mantenimiento de la salud"
                ]
            
            return risk_assessment
            
        except Exception as e:
            logger.error("Failed to assess medical risks", error=str(e))
            return {"error": "Risk assessment unavailable"}
    
    async def _generate_medical_summary(
        self,
        processing_result: Dict[str, Any],
        patient_id: str
    ) -> Dict[str, Any]:
        """Generate comprehensive medical summary"""
        try:
            symptoms = processing_result.get("symptoms", [])
            entities = processing_result.get("entities", [])
            risk_factors = processing_result.get("risk_factors", [])
            diagnosis_suggestions = processing_result.get("diagnosis_suggestions", [])
            
            summary = {
                "patient_summary": {
                    "total_symptoms": len(symptoms),
                    "symptom_categories": list(set(s.get("category", "unknown") for s in symptoms)),
                    "chronic_conditions": [],
                    "medications": [],
                    "vital_signs": []
                },
                "clinical_impression": "",
                "key_findings": [],
                "follow_up_needed": True,
                "priority_level": "routine"
            }
            
            # Extract medications
            for entity in entities:
                if entity.get("type") == "medications":
                    summary["patient_summary"]["medications"].append(entity.get("text"))
            
            # Extract vital signs
            for entity in entities:
                if entity.get("type") == "vital_signs":
                    summary["patient_summary"]["vital_signs"].append({
                        "type": entity.get("text"),
                        "value": entity.get("value", "N/A")
                    })
            
            # Generate clinical impression
            if symptoms and diagnosis_suggestions:
                summary["clinical_impression"] = f"Paciente presenta {len(symptoms)} síntomas consistentes con {', '.join(diagnosis_suggestions[:2])}"
            elif symptoms:
                summary["clinical_impression"] = f"Paciente presenta {len(symptoms)} síntomas que requieren evaluación médica"
            else:
                summary["clinical_impression"] = "Evaluación médica general recomendada"
            
            # Key findings
            if symptoms:
                summary["key_findings"].append(f"Identificados {len(symptoms)} síntomas")
            
            if risk_factors:
                summary["key_findings"].append(f"Factores de riesgo: {', '.join(risk_factors)}")
            
            if entities:
                entity_count = len(entities)
                summary["key_findings"].append(f"Extraídas {entity_count} entidades médicas")
            
            # Determine priority level
            severe_symptoms = [s for s in symptoms if s.get("severity") == "severe"]
            if len(severe_symptoms) >= 2:
                summary["priority_level"] = "urgent"
            elif severe_symptoms:
                summary["priority_level"] = "priority"
            else:
                summary["priority_level"] = "routine"
            
            return summary
            
        except Exception as e:
            logger.error("Failed to generate medical summary", error=str(e))
            return {"error": "Medical summary unavailable"}
    
    async def _generate_care_recommendations(self, processing_result: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive care recommendations"""
        try:
            symptoms = processing_result.get("symptoms", [])
            diagnosis_suggestions = processing_result.get("diagnosis_suggestions", [])
            risk_factors = processing_result.get("risk_factors", [])
            
            recommendations = {
                "immediate_care": [],
                "short_term_care": [],
                "long_term_care": [],
                "medication_recommendations": [],
                "lifestyle_modifications": [],
                "specialist_referrals": [],
                "investigations_needed": []
            }
            
            # Immediate care based on symptoms
            severe_symptoms = [s for s in symptoms if s.get("severity") == "severe"]
            if severe_symptoms:
                recommendations["immediate_care"] = [
                    "Evaluación médica urgente",
                    "Monitoreo de signos vitales",
                    "Preparación para tratamiento inmediato"
                ]
            
            # Category-specific care
            symptom_categories = set(s.get("category", "unknown") for s in symptoms)
            
            if "respiratory" in symptom_categories:
                recommendations["short_term_care"].extend([
                    "Monitoreo de función respiratoria",
                    "Evitar irritantes respiratorios",
                    "Mantener hidratación adecuada"
                ])
                recommendations["investigations_needed"].append("Espirometría si es necesario")
            
            if "fever" in symptom_categories:
                recommendations["short_term_care"].extend([
                    "Control de temperatura",
                    "Hidratación abundante",
                    "Reposo adecuado"
                ])
                recommendations["investigations_needed"].append("Hemograma completo")
            
            # Risk factor specific recommendations
            if "diabetes" in risk_factors:
                recommendations["medication_recommendations"].extend([
                    "Continuar medicación para diabetes",
                    "Monitoreo de glucosa",
                    "Cuidado de los pies"
                ])
            
            if "hipertensión" in risk_factors:
                recommendations["medication_recommendations"].extend([
                    "Continuar antihipertensivos",
                    "Monitoreo de presión arterial",
                    "Dieta baja en sodio"
                ])
            
            # General recommendations
            recommendations["long_term_care"] = [
                "Seguimiento médico regular",
                "Mantener estilo de vida saludable",
                "Prevención de complicaciones"
            ]
            
            recommendations["lifestyle_modifications"] = [
                "Dieta balanceada",
                "Ejercicio regular según capacidad",
                "Evitar hábitos nocivos",
                "Manejo del estrés"
            ]
            
            # Specialist referrals based on findings
            if "respiratory" in symptom_categories:
                recommendations["specialist_referrals"].append("Neumología si síntomas persisten")
            
            if diagnosis_suggestions and any("diabetes" in d.lower() for d in diagnosis_suggestions):
                recommendations["specialist_referrals"].append("Endocrinología")
            
            return recommendations
            
        except Exception as e:
            logger.error("Failed to generate care recommendations", error=str(e))
            return {"error": "Care recommendations unavailable"}
    
    def _extract_context_around(self, text: str, keyword: str, context_size: int = 50) -> str:
        """Extract context around a keyword"""
        try:
            index = text.lower().find(keyword.lower())
            if index == -1:
                return ""
            
            start = max(0, index - context_size)
            end = min(len(text), index + len(keyword) + context_size)
            
            return text[start:end].strip()
        except Exception:
            return ""
    
    def _calculate_average_confidence(self, entities: Dict[str, List[Dict]]) -> float:
        """Calculate average confidence score for entities"""
        try:
            all_confidences = []
            for entity_list in entities.values():
                for entity in entity_list:
                    if isinstance(entity, dict) and "confidence" in entity:
                        all_confidences.append(entity["confidence"])
            
            return sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
        except Exception:
            return 0.0
