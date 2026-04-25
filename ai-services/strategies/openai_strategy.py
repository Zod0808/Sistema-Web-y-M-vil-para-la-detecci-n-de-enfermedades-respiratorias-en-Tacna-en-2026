"""
OpenAI Strategy for AI Analysis
"""

import openai
import asyncio
from typing import Dict, List, Any, Optional
import structlog
from .analysis_strategy import AnalysisStrategy
from core.config import settings

logger = structlog.get_logger()


class OpenAIStrategy(AnalysisStrategy):
    """Strategy that uses OpenAI API for analysis"""
    
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-3.5-turbo"
        
    async def analyze_symptoms(self, symptoms: List[Dict[str, Any]], context: Optional[Dict] = None) -> Dict[str, Any]:
        """Analyze symptoms using OpenAI API"""
        try:
            # Prepare symptoms text
            symptoms_text = self._format_symptoms_for_ai(symptoms)
            
            # Create prompt
            prompt = self._create_symptom_analysis_prompt(symptoms_text, context)
            
            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Eres un médico experto en enfermedades respiratorias. Analiza los síntomas y proporciona recomendaciones médicas profesionales."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            
            # Parse response
            ai_response = response.choices[0].message.content
            
            # Extract structured information from AI response
            result = self._parse_ai_response(ai_response)
            result["ai_raw_response"] = ai_response
            
            return result
            
        except Exception as e:
            logger.error("Error in OpenAI symptom analysis", error=str(e))
            raise
    
    async def process_medical_text(self, text: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Process medical history text using OpenAI API"""
        try:
            # Create prompt for medical text processing
            prompt = self._create_medical_text_prompt(text, context)
            
            # Call OpenAI API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Eres un especialista en procesamiento de historias médicas. Extrae información estructurada del texto médico."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.2
            )
            
            # Parse response
            ai_response = response.choices[0].message.content
            
            # Extract structured information
            result = self._parse_medical_text_response(ai_response)
            result["ai_raw_response"] = ai_response
            
            return result
            
        except Exception as e:
            logger.error("Error in OpenAI medical text processing", error=str(e))
            raise
    
    def _format_symptoms_for_ai(self, symptoms: List[Dict[str, Any]]) -> str:
        """Format symptoms for AI input"""
        formatted = []
        for i, symptom in enumerate(symptoms, 1):
            formatted.append(f"{i}. {symptom.get('symptom', 'Síntoma desconocido')}")
            if symptom.get('severity'):
                formatted.append(f"   Severidad: {symptom['severity']}")
            if symptom.get('duration'):
                formatted.append(f"   Duración: {symptom['duration']}")
        
        return "\n".join(formatted)
    
    def _create_symptom_analysis_prompt(self, symptoms_text: str, context: Optional[Dict] = None) -> str:
        """Create prompt for symptom analysis"""
        prompt = f"""
Analiza los siguientes síntomas y proporciona:
1. Nivel de urgencia (bajo, medio, alto, crítico)
2. Puntuación de severidad (0-1)
3. Categorías de síntomas identificadas
4. Recomendaciones médicas (máximo 5)
5. Signos de alarma a vigilar
6. Si requiere seguimiento médico

Síntomas:
{symptoms_text}
"""
        
        if context:
            prompt += f"\nContexto adicional: {context}"
        
        prompt += """
Responde en formato JSON con las siguientes claves:
{
  "urgency_level": "string",
  "severity_score": float,
  "categories": ["string"],
  "recommendations": ["string"],
  "warning_signs": ["string"],
  "follow_up_required": boolean
}
"""
        return prompt
    
    def _create_medical_text_prompt(self, text: str, context: Optional[Dict] = None) -> str:
        """Create prompt for medical text processing"""
        prompt = f"""
Procesa el siguiente texto médico y extrae:
1. Entidades médicas (medicamentos, condiciones, signos vitales)
2. Síntomas mencionados
3. Factores de riesgo
4. Sugerencias de diagnóstico (máximo 3)
5. Recomendaciones médicas (máximo 5)

Texto médico:
{text}
"""
        
        if context:
            prompt += f"\nContexto: {context}"
        
        prompt += """
Responde en formato JSON con las siguientes claves:
{
  "entities": [{"text": "string", "type": "string", "confidence": float}],
  "symptoms": [{"symptom": "string", "category": "string", "confidence": float}],
  "risk_factors": ["string"],
  "diagnosis_suggestions": ["string"],
  "recommendations": ["string"]
}
"""
        return prompt
    
    def _parse_ai_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response for symptom analysis"""
        try:
            import json
            # Try to extract JSON from response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end != 0:
                json_str = response[start:end]
                return json.loads(json_str)
            else:
                # Fallback parsing if JSON not found
                return self._fallback_parse_symptoms(response)
        except json.JSONDecodeError:
            return self._fallback_parse_symptoms(response)
    
    def _parse_medical_text_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response for medical text processing"""
        try:
            import json
            # Try to extract JSON from response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start != -1 and end != 0:
                json_str = response[start:end]
                return json.loads(json_str)
            else:
                # Fallback parsing
                return self._fallback_parse_medical_text(response)
        except json.JSONDecodeError:
            return self._fallback_parse_medical_text(response)
    
    def _fallback_parse_symptoms(self, response: str) -> Dict[str, Any]:
        """Fallback parsing for symptom analysis"""
        return {
            "urgency_level": "medium",
            "severity_score": 0.5,
            "categories": ["general"],
            "recommendations": ["Consultar con médico"],
            "warning_signs": [],
            "follow_up_required": True
        }
    
    def _fallback_parse_medical_text(self, response: str) -> Dict[str, Any]:
        """Fallback parsing for medical text"""
        return {
            "entities": [],
            "symptoms": [],
            "risk_factors": [],
            "diagnosis_suggestions": ["Evaluación médica general"],
            "recommendations": ["Seguimiento médico recomendado"]
        }
    
    def get_strategy_name(self) -> str:
        """Get strategy name"""
        return "openai"
    
    def get_confidence_score(self) -> float:
        """Get confidence score for OpenAI strategy"""
        return 0.9
