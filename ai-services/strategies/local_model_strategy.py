"""
Local Model Strategy for AI Analysis
"""

import torch
import numpy as np
from typing import Dict, List, Any, Optional
import structlog
from .analysis_strategy import AnalysisStrategy
from transformers import AutoTokenizer, AutoModelForSequenceClassification

logger = structlog.get_logger()


class LocalModelStrategy(AnalysisStrategy):
    """Strategy that uses local ML models for analysis"""
    
    def __init__(self):
        self.symptom_model = None
        self.symptom_tokenizer = None
        self.medical_model = None
        self.medical_tokenizer = None
        self._load_models()
    
    def _load_models(self):
        """Load local models"""
        try:
            # Load symptom classification model
            model_name = "microsoft/DialoGPT-medium"  # Placeholder
            self.symptom_tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.symptom_model = AutoModelForSequenceClassification.from_pretrained(
                model_name,
                num_labels=10  # Number of symptom categories
            )
            
            # Load medical text processing model
            self.medical_tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.medical_model = AutoModelForSequenceClassification.from_pretrained(
                model_name,
                num_labels=15  # Number of medical entity types
            )
            
            logger.info("Local models loaded successfully")
            
        except Exception as e:
            logger.error("Failed to load local models", error=str(e))
            # Set models to None for graceful degradation
            self.symptom_model = None
            self.symptom_tokenizer = None
            self.medical_model = None
            self.medical_tokenizer = None
    
    async def analyze_symptoms(self, symptoms: List[Dict[str, Any]], context: Optional[Dict] = None) -> Dict[str, Any]:
        """Analyze symptoms using local models"""
        try:
            if not self.symptom_model or not self.symptom_tokenizer:
                return await self._fallback_symptom_analysis(symptoms, context)
            
            # Prepare symptoms text
            symptoms_text = self._format_symptoms_for_model(symptoms)
            
            # Tokenize input
            inputs = self.symptom_tokenizer(
                symptoms_text,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            )
            
            # Run inference
            with torch.no_grad():
                outputs = self.symptom_model(**inputs)
                predictions = torch.softmax(outputs.logits, dim=-1)
            
            # Process predictions
            result = self._process_symptom_predictions(predictions, symptoms)
            
            return result
            
        except Exception as e:
            logger.error("Error in local model symptom analysis", error=str(e))
            return await self._fallback_symptom_analysis(symptoms, context)
    
    async def process_medical_text(self, text: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Process medical text using local models"""
        try:
            if not self.medical_model or not self.medical_tokenizer:
                return await self._fallback_medical_text_processing(text, context)
            
            # Tokenize input
            inputs = self.medical_tokenizer(
                text,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            )
            
            # Run inference
            with torch.no_grad():
                outputs = self.medical_model(**inputs)
                predictions = torch.softmax(outputs.logits, dim=-1)
            
            # Process predictions
            result = self._process_medical_predictions(predictions, text)
            
            return result
            
        except Exception as e:
            logger.error("Error in local model medical text processing", error=str(e))
            return await self._fallback_medical_text_processing(text, context)
    
    def _format_symptoms_for_model(self, symptoms: List[Dict[str, Any]]) -> str:
        """Format symptoms for model input"""
        symptom_texts = []
        for symptom in symptoms:
            text = symptom.get('symptom', '')
            if symptom.get('severity'):
                text += f" severity:{symptom['severity']}"
            if symptom.get('duration'):
                text += f" duration:{symptom['duration']}"
            symptom_texts.append(text)
        
        return " ".join(symptom_texts)
    
    def _process_symptom_predictions(self, predictions: torch.Tensor, symptoms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process symptom classification predictions"""
        # Convert predictions to numpy for easier handling
        pred_np = predictions.cpu().numpy()[0]
        
        # Define symptom categories
        categories = [
            "respiratory", "fever", "pain", "digestive", "fatigue",
            "neurological", "cardiac", "skin", "mental", "other"
        ]
        
        # Get top categories
        top_indices = np.argsort(pred_np)[-3:][::-1]  # Top 3
        top_categories = [categories[i] for i in top_indices]
        top_scores = [float(pred_np[i]) for i in top_indices]
        
        # Calculate overall severity
        severity_score = float(np.mean(pred_np))
        
        # Determine urgency based on predictions
        urgency_level = self._determine_urgency_from_predictions(pred_np, categories)
        
        # Generate recommendations
        recommendations = self._generate_model_recommendations(top_categories, severity_score)
        
        return {
            "urgency_level": urgency_level,
            "severity_score": severity_score,
            "categories": top_categories,
            "category_scores": dict(zip(top_categories, top_scores)),
            "recommendations": recommendations,
            "warning_signs": self._identify_warning_signs_from_predictions(pred_np, categories),
            "follow_up_required": severity_score > 0.6
        }
    
    def _process_medical_predictions(self, predictions: torch.Tensor, text: str) -> Dict[str, Any]:
        """Process medical text predictions"""
        # Convert predictions to numpy
        pred_np = predictions.cpu().numpy()[0]
        
        # Define entity types
        entity_types = [
            "medication", "condition", "symptom", "vital_sign", "procedure",
            "anatomy", "test", "dosage", "frequency", "duration",
            "severity", "allergy", "family_history", "social_history", "other"
        ]
        
        # Get top predictions
        top_indices = np.argsort(pred_np)[-5:][::-1]  # Top 5
        top_entities = [entity_types[i] for i in top_indices]
        top_scores = [float(pred_np[i]) for i in top_indices]
        
        # Extract entities based on predictions
        entities = self._extract_entities_from_text(text, top_entities)
        
        return {
            "entities": entities,
            "entity_types": dict(zip(top_entities, top_scores)),
            "symptoms": self._extract_symptoms_from_entities(entities),
            "risk_factors": self._extract_risk_factors_from_text(text),
            "diagnosis_suggestions": self._suggest_diagnosis_from_entities(entities),
            "recommendations": self._generate_medical_recommendations(entities)
        }
    
    def _determine_urgency_from_predictions(self, predictions: np.ndarray, categories: List[str]) -> str:
        """Determine urgency level from model predictions"""
        # Weight certain categories higher for urgency
        urgency_weights = {
            "respiratory": 0.9,
            "neurological": 0.8,
            "cardiac": 0.9,
            "fever": 0.7,
            "pain": 0.5,
            "digestive": 0.4,
            "fatigue": 0.3,
            "skin": 0.2,
            "mental": 0.6,
            "other": 0.3
        }
        
        weighted_score = 0.0
        for i, category in enumerate(categories):
            if i < len(predictions):
                weight = urgency_weights.get(category, 0.3)
                weighted_score += predictions[i] * weight
        
        if weighted_score > 0.8:
            return "critical"
        elif weighted_score > 0.6:
            return "high"
        elif weighted_score > 0.4:
            return "medium"
        else:
            return "low"
    
    def _generate_model_recommendations(self, categories: List[str], severity_score: float) -> List[str]:
        """Generate recommendations based on model predictions"""
        recommendations = []
        
        # Severity-based recommendations
        if severity_score > 0.8:
            recommendations.append("Buscar atención médica inmediata")
        elif severity_score > 0.6:
            recommendations.append("Consultar médico en las próximas 24 horas")
        else:
            recommendations.append("Monitorear síntomas en casa")
        
        # Category-specific recommendations
        if "respiratory" in categories:
            recommendations.extend([
                "Mantener hidratación adecuada",
                "Evitar irritantes respiratorios"
            ])
        
        if "fever" in categories:
            recommendations.extend([
                "Controlar temperatura regularmente",
                "Mantener reposo"
            ])
        
        return recommendations[:5]
    
    def _identify_warning_signs_from_predictions(self, predictions: np.ndarray, categories: List[str]) -> List[str]:
        """Identify warning signs from model predictions"""
        warning_signs = []
        
        # Check for high-risk categories
        if "respiratory" in categories and predictions[categories.index("respiratory")] > 0.7:
            warning_signs.append("Síntomas respiratorios significativos")
        
        if "neurological" in categories and predictions[categories.index("neurological")] > 0.7:
            warning_signs.append("Síntomas neurológicos presentes")
        
        return warning_signs
    
    def _extract_entities_from_text(self, text: str, entity_types: List[str]) -> List[Dict[str, Any]]:
        """Extract entities from text based on predictions"""
        entities = []
        
        # Simple keyword-based extraction (would be enhanced with NER models)
        keywords = {
            "medication": ["medicina", "medicamento", "pastilla", "tableta"],
            "symptom": ["dolor", "fiebre", "tos", "fatiga"],
            "condition": ["diabetes", "hipertensión", "asma", "bronquitis"]
        }
        
        for entity_type in entity_types:
            if entity_type in keywords:
                for keyword in keywords[entity_type]:
                    if keyword in text.lower():
                        entities.append({
                            "text": keyword,
                            "type": entity_type,
                            "confidence": 0.7
                        })
        
        return entities
    
    def _extract_symptoms_from_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract symptoms from entities"""
        symptoms = []
        for entity in entities:
            if entity["type"] == "symptom":
                symptoms.append({
                    "symptom": entity["text"],
                    "category": "general",
                    "confidence": entity["confidence"]
                })
        return symptoms
    
    def _extract_risk_factors_from_text(self, text: str) -> List[str]:
        """Extract risk factors from text"""
        risk_factors = []
        text_lower = text.lower()
        
        risk_keywords = ["tabaquismo", "diabetes", "hipertensión", "obesidad"]
        for keyword in risk_keywords:
            if keyword in text_lower:
                risk_factors.append(keyword)
        
        return risk_factors
    
    def _suggest_diagnosis_from_entities(self, entities: List[Dict[str, Any]]) -> List[str]:
        """Suggest diagnosis based on entities"""
        suggestions = []
        
        entity_types = [entity["type"] for entity in entities]
        
        if "symptom" in entity_types and "medication" in entity_types:
            suggestions.append("Evaluación médica general recomendada")
        
        if "respiratory" in entity_types:
            suggestions.append("Posible condición respiratoria")
        
        return suggestions[:3]
    
    def _generate_medical_recommendations(self, entities: List[Dict[str, Any]]) -> List[str]:
        """Generate medical recommendations"""
        return [
            "Seguimiento médico regular",
            "Mantener estilo de vida saludable",
            "Reportar cambios en síntomas"
        ]
    
    async def _fallback_symptom_analysis(self, symptoms: List[Dict[str, Any]], context: Optional[Dict] = None) -> Dict[str, Any]:
        """Fallback symptom analysis when models are not available"""
        return {
            "urgency_level": "medium",
            "severity_score": 0.5,
            "categories": ["general"],
            "recommendations": ["Consultar con médico", "Monitorear síntomas"],
            "warning_signs": [],
            "follow_up_required": True
        }
    
    async def _fallback_medical_text_processing(self, text: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Fallback medical text processing when models are not available"""
        return {
            "entities": [],
            "symptoms": [],
            "risk_factors": [],
            "diagnosis_suggestions": ["Evaluación médica general"],
            "recommendations": ["Seguimiento médico recomendado"]
        }
    
    def get_strategy_name(self) -> str:
        """Get strategy name"""
        return "local_model"
    
    def get_confidence_score(self) -> float:
        """Get confidence score for local model strategy"""
        return 0.8 if self.symptom_model else 0.3
