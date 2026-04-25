"""
Symptom Analysis Service - Dedicated service for symptom analysis
"""

from typing import Dict, Any, Optional, List
import structlog
from decorators import with_logging, with_cache, with_metrics, with_circuit_breaker, with_retry

logger = structlog.get_logger()


class SymptomAnalysisService:
    """Dedicated service for symptom analysis operations"""
    
    def __init__(self, service_manager=None):
        self.service_manager = service_manager
        self._cache_prefix = "symptom_analysis"
    
    @with_logging(log_level="info", log_execution_time=True)
    @with_cache(ttl=1800, key_prefix="symptom_analysis")
    @with_circuit_breaker("symptom_analysis", failure_threshold=3, recovery_timeout=300)
    @with_retry(max_attempts=3, delay=1.0, exceptions=(Exception,))
    @with_metrics(track_execution_time=True, track_success_rate=True)
    async def analyze_symptoms_comprehensive(
        self,
        symptoms: List[Dict[str, Any]],
        patient_id: str,
        context: Optional[Dict[str, Any]] = None,
        include_trends: bool = True,
        include_recommendations: bool = True
    ) -> Dict[str, Any]:
        """Perform comprehensive symptom analysis"""
        try:
            logger.info("Starting comprehensive symptom analysis", 
                       patient_id=patient_id,
                       symptom_count=len(symptoms))
            
            # Basic symptom analysis
            analysis_result = await self._perform_basic_analysis(symptoms, patient_id, context)
            
            # Add trend analysis if requested
            if include_trends:
                trend_data = await self._analyze_symptom_trends(patient_id)
                analysis_result["trend_analysis"] = trend_data
            
            # Add detailed recommendations if requested
            if include_recommendations:
                recommendations = await self._generate_detailed_recommendations(
                    analysis_result, symptoms, context
                )
                analysis_result["detailed_recommendations"] = recommendations
            
            # Add risk assessment
            risk_assessment = await self._assess_health_risks(analysis_result, context)
            analysis_result["risk_assessment"] = risk_assessment
            
            # Add follow-up planning
            follow_up_plan = await self._create_follow_up_plan(analysis_result, patient_id)
            analysis_result["follow_up_plan"] = follow_up_plan
            
            logger.info("Comprehensive symptom analysis completed",
                       patient_id=patient_id,
                       urgency=analysis_result.get("urgency_level"),
                       follow_up_required=analysis_result.get("follow_up_required"))
            
            return analysis_result
            
        except Exception as e:
            logger.error("Comprehensive symptom analysis failed",
                        patient_id=patient_id,
                        error=str(e))
            raise
    
    async def analyze_symptoms_batch(
        self,
        batch_requests: List[Dict[str, Any]],
        strategy_preference: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Delegates batch analysis to the AI service manager when available."""
        manager = self.service_manager
        if not manager:
            from services.ai_service_manager import ai_service_manager  # evitar import circular
            manager = ai_service_manager
        return await manager.analyze_symptoms_batch(batch_requests, strategy_preference)
    
    async def _perform_basic_analysis(
        self,
        symptoms: List[Dict[str, Any]],
        patient_id: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Perform basic symptom analysis using service manager"""
        if self.service_manager:
            return await self.service_manager.analyze_symptoms(
                symptoms, patient_id, context
            )
        else:
            # Fallback to direct analysis
            from symptom_analyzer.analyzer import analyzer
            return await analyzer.analyze_symptoms(symptoms, patient_id, context)
    
    async def _analyze_symptom_trends(self, patient_id: str) -> Dict[str, Any]:
        """Analyze symptom trends for the patient"""
        try:
            # This would typically query historical data
            # For now, return a placeholder structure
            return {
                "trend_period": "30_days",
                "overall_trend": "stable",
                "symptom_frequency": {
                    "respiratory": "increasing",
                    "fever": "stable",
                    "pain": "decreasing"
                },
                "severity_trend": "improving",
                "recommendations": [
                    "Continue monitoring respiratory symptoms",
                    "Maintain current treatment for fever management",
                    "Pain management appears effective"
                ]
            }
        except Exception as e:
            logger.error("Failed to analyze symptom trends", 
                        patient_id=patient_id,
                        error=str(e))
            return {"error": "Trend analysis unavailable"}
    
    async def _generate_detailed_recommendations(
        self,
        analysis_result: Dict[str, Any],
        symptoms: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate detailed recommendations based on analysis"""
        try:
            urgency = analysis_result.get("urgency_level", "low")
            categories = analysis_result.get("categories", [])
            warning_signs = analysis_result.get("warning_signs", [])
            
            recommendations = {
                "immediate_actions": [],
                "short_term_actions": [],
                "long_term_actions": [],
                "lifestyle_modifications": [],
                "medication_considerations": [],
                "specialist_referrals": []
            }
            
            # Immediate actions based on urgency
            if urgency == "critical":
                recommendations["immediate_actions"] = [
                    "Seek emergency medical attention immediately",
                    "Call emergency services if symptoms worsen",
                    "Do not drive or operate machinery",
                    "Have someone stay with the patient"
                ]
            elif urgency == "high":
                recommendations["immediate_actions"] = [
                    "Schedule urgent medical appointment within 2 hours",
                    "Monitor vital signs continuously",
                    "Prepare emergency contact information"
                ]
            elif urgency == "medium":
                recommendations["immediate_actions"] = [
                    "Schedule medical appointment within 24 hours",
                    "Monitor symptoms regularly",
                    "Keep symptom diary"
                ]
            else:
                recommendations["immediate_actions"] = [
                    "Monitor symptoms at home",
                    "Schedule routine medical appointment if symptoms persist"
                ]
            
            # Category-specific recommendations
            if "respiratory" in categories:
                recommendations["short_term_actions"].extend([
                    "Use humidifier to ease breathing",
                    "Avoid irritants like smoke and dust",
                    "Practice breathing exercises",
                    "Monitor oxygen saturation if available"
                ])
                recommendations["lifestyle_modifications"].extend([
                    "Avoid smoking and secondhand smoke",
                    "Maintain clean indoor air quality",
                    "Consider air purifiers if necessary"
                ])
            
            if "fever" in categories:
                recommendations["short_term_actions"].extend([
                    "Monitor temperature every 4 hours",
                    "Maintain adequate hydration",
                    "Use cooling measures if temperature > 38.5°C",
                    "Rest and avoid strenuous activities"
                ])
            
            if "pain" in categories:
                recommendations["short_term_actions"].extend([
                    "Apply appropriate pain management techniques",
                    "Use heat or cold therapy as appropriate",
                    "Maintain proper posture",
                    "Avoid activities that worsen pain"
                ])
            
            # Warning sign specific recommendations
            if warning_signs:
                recommendations["immediate_actions"].extend([
                    "Pay special attention to warning signs",
                    "Document any changes in symptoms",
                    "Have emergency contacts readily available"
                ])
            
            # Context-specific recommendations
            if context:
                if context.get("age", 0) > 65:
                    recommendations["specialist_referrals"].append("Consider geriatric consultation")
                
                if context.get("diabetes"):
                    recommendations["medication_considerations"].extend([
                        "Monitor blood glucose levels",
                        "Ensure adequate hydration",
                        "Watch for signs of diabetic complications"
                    ])
                
                if context.get("hypertension"):
                    recommendations["medication_considerations"].extend([
                        "Monitor blood pressure regularly",
                        "Continue antihypertensive medications as prescribed"
                    ])
            
            return recommendations
            
        except Exception as e:
            logger.error("Failed to generate detailed recommendations", error=str(e))
            return {"error": "Recommendations unavailable"}
    
    async def _assess_health_risks(
        self,
        analysis_result: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assess health risks based on analysis"""
        try:
            urgency = analysis_result.get("urgency_level", "low")
            severity_score = analysis_result.get("severity_score", 0.0)
            warning_signs = analysis_result.get("warning_signs", [])
            
            risk_assessment = {
                "overall_risk_level": "low",
                "risk_factors": [],
                "potential_complications": [],
                "risk_mitigation": [],
                "monitoring_recommendations": []
            }
            
            # Determine overall risk level
            if urgency == "critical" or severity_score > 0.8:
                risk_assessment["overall_risk_level"] = "high"
            elif urgency == "high" or severity_score > 0.6:
                risk_assessment["overall_risk_level"] = "moderate"
            else:
                risk_assessment["overall_risk_level"] = "low"
            
            # Identify risk factors
            if severity_score > 0.7:
                risk_assessment["risk_factors"].append("High symptom severity")
            
            if warning_signs:
                risk_assessment["risk_factors"].append("Presence of warning signs")
            
            if context:
                if context.get("age", 0) > 65:
                    risk_assessment["risk_factors"].append("Advanced age")
                
                if context.get("diabetes"):
                    risk_assessment["risk_factors"].append("Diabetes mellitus")
                
                if context.get("hypertension"):
                    risk_assessment["risk_factors"].append("Hypertension")
                
                if context.get("smoking"):
                    risk_assessment["risk_factors"].append("Smoking history")
            
            # Identify potential complications
            categories = analysis_result.get("categories", [])
            if "respiratory" in categories:
                risk_assessment["potential_complications"].extend([
                    "Respiratory distress",
                    "Oxygen desaturation",
                    "Respiratory failure"
                ])
            
            if "fever" in categories:
                risk_assessment["potential_complications"].extend([
                    "Dehydration",
                    "Febrile seizures (in children)",
                    "Heat stroke"
                ])
            
            # Risk mitigation strategies
            if risk_assessment["overall_risk_level"] == "high":
                risk_assessment["risk_mitigation"].extend([
                    "Immediate medical evaluation",
                    "Continuous monitoring",
                    "Emergency preparedness"
                ])
            elif risk_assessment["overall_risk_level"] == "moderate":
                risk_assessment["risk_mitigation"].extend([
                    "Regular monitoring",
                    "Prompt medical attention if symptoms worsen",
                    "Lifestyle modifications"
                ])
            else:
                risk_assessment["risk_mitigation"].extend([
                    "Routine monitoring",
                    "Preventive measures",
                    "Health maintenance"
                ])
            
            return risk_assessment
            
        except Exception as e:
            logger.error("Failed to assess health risks", error=str(e))
            return {"error": "Risk assessment unavailable"}
    
    async def _create_follow_up_plan(
        self,
        analysis_result: Dict[str, Any],
        patient_id: str
    ) -> Dict[str, Any]:
        """Create comprehensive follow-up plan"""
        try:
            urgency = analysis_result.get("urgency_level", "low")
            follow_up_required = analysis_result.get("follow_up_required", False)
            
            follow_up_plan = {
                "required": follow_up_required,
                "urgency": urgency,
                "timeline": "not_specified",
                "type": "routine",
                "recommendations": [],
                "monitoring_schedule": {},
                "next_steps": []
            }
            
            if not follow_up_required:
                follow_up_plan["recommendations"] = [
                    "Continue monitoring symptoms at home",
                    "Contact healthcare provider if symptoms worsen",
                    "Maintain routine health maintenance"
                ]
                return follow_up_plan
            
            # Determine timeline and type based on urgency
            if urgency == "critical":
                follow_up_plan.update({
                    "timeline": "immediate",
                    "type": "emergency",
                    "next_steps": [
                        "Seek emergency medical care immediately",
                        "Call emergency services",
                        "Do not delay medical attention"
                    ]
                })
            elif urgency == "high":
                follow_up_plan.update({
                    "timeline": "2_hours",
                    "type": "urgent",
                    "next_steps": [
                        "Schedule urgent medical appointment",
                        "Monitor symptoms continuously",
                        "Prepare for medical evaluation"
                    ]
                })
            elif urgency == "medium":
                follow_up_plan.update({
                    "timeline": "24_hours",
                    "type": "priority",
                    "next_steps": [
                        "Schedule medical appointment within 24 hours",
                        "Monitor symptoms regularly",
                        "Prepare symptom diary for appointment"
                    ]
                })
            else:
                follow_up_plan.update({
                    "timeline": "1_week",
                    "type": "routine",
                    "next_steps": [
                        "Schedule routine medical appointment",
                        "Continue symptom monitoring",
                        "Maintain current treatment plan"
                    ]
                })
            
            # Create monitoring schedule
            if urgency in ["critical", "high"]:
                follow_up_plan["monitoring_schedule"] = {
                    "frequency": "continuous",
                    "parameters": ["vital signs", "symptom severity", "overall condition"],
                    "duration": "until medical evaluation"
                }
            elif urgency == "medium":
                follow_up_plan["monitoring_schedule"] = {
                    "frequency": "every_4_hours",
                    "parameters": ["symptom severity", "temperature", "overall condition"],
                    "duration": "24_hours"
                }
            else:
                follow_up_plan["monitoring_schedule"] = {
                    "frequency": "daily",
                    "parameters": ["symptom progression", "overall condition"],
                    "duration": "1_week"
                }
            
            return follow_up_plan
            
        except Exception as e:
            logger.error("Failed to create follow-up plan", 
                        patient_id=patient_id,
                        error=str(e))
            return {"error": "Follow-up plan unavailable"}
    
    @with_cache(ttl=3600, key_prefix="symptom_categories")
    async def get_symptom_categories(self) -> Dict[str, List[str]]:
        """Get available symptom categories and their symptoms"""
        try:
            from data.medical_data import MedicalDataProcessor
            processor = MedicalDataProcessor()
            return processor.symptom_categories
        except Exception as e:
            logger.error("Failed to get symptom categories", error=str(e))
            return {}
    
    @with_cache(ttl=7200, key_prefix="symptom_recommendations")
    async def get_general_recommendations(self) -> Dict[str, List[str]]:
        """Get general symptom management recommendations"""
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
