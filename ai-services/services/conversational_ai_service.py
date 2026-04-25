"""
Conversational AI Service - Advanced symptom analysis with natural conversation flow
This service processes user messages to extract symptoms, assess severity, urgency, and provide medical guidance
"""

from typing import Dict, Any, Optional, List
import structlog

logger = structlog.get_logger()

# Decorators commented out to fix import errors
# from decorators import with_logging, with_cache, with_metrics, with_circuit_breaker, with_retry


class ConversationalAIService:
    """Advanced conversational AI service for natural symptom analysis"""
    
    def __init__(self, service_manager=None):
        self.service_manager = service_manager
        self._cache_prefix = "conversational_ai"
        
        # Import comprehensive respiratory diseases database
        try:
            from data.respiratory_diseases_comprehensive import RESPIRATORY_DISEASES_DATABASE, DISEASE_KEYWORDS, URGENCY_LEVELS
            self.diseases_db = RESPIRATORY_DISEASES_DATABASE
            self.disease_keywords = DISEASE_KEYWORDS
            self.urgency_levels = URGENCY_LEVELS
            logger.info("comprehensive_diseases_database_loaded", count=len(self.diseases_db))
        except ImportError:
            logger.warning("comprehensive_diseases_database_not_available")
            self.diseases_db = {}
            self.disease_keywords = {}
            self.urgency_levels = {}
        
        # Medical keyword patterns for symptom detection
        self.symptom_keywords = {
            'respiratory': [
                'tos', 'toser', 'cough', 'flema', 'expectoración', 'dificultad respiratoria',
                'dificultad para respirar', 'falta de aire', 'ahogo', 'resollar', 'sibilancia',
                'respiro', 'respiracion', 'respirar', 'pecho', 'seno', 'nariz',
                'congestion nasal', 'congestionado', 'mocos', 'secrecion nasal', 'rinorrea'
            ],
            'fever': [
                'fiebre', 'calor', 'temperatura', 'escalofrios', 'escalofríos', 'sudoracion',
                'sudoración', 'frio', 'caliente', 'quemando', 'ardor'
            ],
            'pain': [
                'dolor', 'duele', 'doliendo', 'molestia', 'molesta', 'malestar',
                'punzada', 'punzadas', 'ardor', 'quemazon', 'quemazón', 'picazon', 'picazón'
            ],
            'fatigue': [
                'cansado', 'cansancio', 'fatiga', 'agotado', 'sin energia', 'sin energía',
                'debil', 'débil', 'debilidad'
            ],
            'digestive': [
                'nausea', 'nauseas', 'náusea', 'vomito', 'vómito', 'diarrea', 'estrenimiento',
                'estreñimiento', 'dolor abdominal', 'estomago', 'estómago', 'abdomen'
            ],
            'neurological': [
                'mareo', 'mareos', 'vertigo', 'vértigo', 'dolor de cabeza', 'cefalea',
                'confusion', 'confusión', 'desorientado', 'mareado'
            ]
        }
        
        # Urgency indicators
        self.urgency_indicators = {
            'critical': [
                'dificultad extrema para respirar', 'no puedo respirar', 'ahogo total',
                'asfixia', 'no respiro', 'ahogo extremo', 'chequeo vital',
                'emergencia medica', 'emergencia médica', 'dolor de pecho', 'dolor en el pecho'
            ],
            'high': [
                'dificultad moderada para respirar', 'tos intensa', 'tos severa',
                'fiebre alta', 'mucha fiebre', 'temperatura alta', 'muy enfermo',
                'necesito ayuda urgente', 'mal muy grave', 'sintomas graves'
            ],
            'medium': [
                'tengo', 'me duele', 'me molesta', 'sintomas', 'problemas',
                'dificultad leve para respirar', 'fiebre moderada', 'malestar'
            ]
        }
        
        # Severity descriptors
        self.severity_keywords = {
            'extreme': ['extremadamente', 'muy grave', 'mucho', 'muchísimo', 'insoportable', 'intolerable'],
            'high': ['grave', 'severo', 'intenso', 'fuerte', 'considerable', 'significativo'],
            'moderate': ['moderado', 'mediano', 'medio', 'regular', 'algo', 'bastante'],
            'mild': ['leve', 'ligero', 'poco', 'ligero', 'suave', 'menor']
        }
    
    # @with_logging(log_level="info", log_execution_time=True)
    # @with_cache(ttl=600, key_prefix="conversational_ai")
    # @with_circuit_breaker("conversational_ai", failure_threshold=3, recovery_timeout=300)
    # @with_retry(max_attempts=3, delay=1.0, exceptions=(Exception,))
    # @with_metrics(track_execution_time=True, track_success_rate=True)
    async def analyze_conversation(
        self,
        user_message: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze user message in conversational context to extract symptoms, 
        assess urgency, and provide natural medical guidance
        """
        try:
            logger.info("Analyzing conversational message", 
                       message_length=len(user_message),
                       has_history=conversation_history is not None)
            
            # Step 1: Extract symptoms and keywords from message
            extracted_data = await self._extract_symptoms_and_context(user_message)
            
            # Step 1b: Detect specific respiratory diseases
            detected_diseases = await self._detect_respiratory_diseases(user_message, extracted_data)
            extracted_data['detected_diseases'] = detected_diseases
            
            # Step 2: Assess urgency based on symptoms and keywords
            urgency_assessment = await self._assess_urgency(
                user_message, 
                extracted_data,
                conversation_history
            )
            
            # Step 3: Classify symptoms into categories
            symptom_categories = self._classify_symptoms(extracted_data['symptoms'])
            
            # Step 4: Assess severity from natural language
            severity = await self._assess_severity(user_message, extracted_data)
            
            # Step 5: Generate conversational response
            ai_response = await self._generate_natural_response(
                extracted_data,
                urgency_assessment,
                symptom_categories,
                severity,
                detected_diseases,
                conversation_history,
                context
            )
            
            # Step 6: Prepare structured analysis for backend
            structured_analysis = {
                'symptoms': extracted_data['symptoms'],
                'categories': symptom_categories,
                'urgency_level': urgency_assessment['level'],
                'urgency_score': urgency_assessment['score'],
                'severity': severity,
                'keywords_detected': extracted_data['keywords'],
                'needs_medical_attention': urgency_assessment['level'] in ['critical', 'high', 'medium'],
                'recommendations': urgency_assessment.get('immediate_actions', []),
                'follow_up_required': urgency_assessment['level'] != 'low'
            }
            
            logger.info("Conversational analysis completed",
                       urgency=urgency_assessment['level'],
                       categories=symptom_categories)
            
            return {
                'user_message': user_message,
                'ai_response': ai_response,
                'analysis': structured_analysis,
                'conversation_context': {
                    'message_length': len(user_message),
                    'has_keywords': len(extracted_data['keywords']) > 0,
                    'num_symptoms_detected': len(extracted_data['symptoms'])
                }
            }
            
        except Exception as e:
            logger.error("Conversational analysis failed", error=str(e))
            raise
    
    async def _extract_symptoms_and_context(self, message: str) -> Dict[str, Any]:
        """Extract symptoms and medical keywords from user message"""
        message_lower = message.lower()
        
        detected_symptoms = []
        detected_keywords = []
        symptom_context = {}
        
        # Check for each symptom category
        for category, keywords in self.symptom_keywords.items():
            for keyword in keywords:
                if keyword in message_lower:
                    detected_symptoms.append({
                        'name': keyword,
                        'category': category
                    })
                    detected_keywords.append(keyword)
                    
                    # Extract context around the keyword
                    keyword_index = message_lower.find(keyword)
                    if keyword_index != -1:
                        # Get surrounding text for context
                        start = max(0, keyword_index - 50)
                        end = min(len(message), keyword_index + len(keyword) + 50)
                        context_text = message[start:end]
                        symptom_context[keyword] = context_text.strip()
        
        # Remove duplicates
        detected_keywords = list(set(detected_keywords))
        
        return {
            'symptoms': detected_symptoms,
            'keywords': detected_keywords,
            'context': symptom_context,
            'original_message': message
        }
    
    async def _assess_urgency(
        self,
        message: str,
        extracted_data: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Assess medical urgency based on symptoms and context"""
        message_lower = message.lower()
        urgency_score = 0
        detected_urgency_level = 'low'
        immediate_actions = []
        
        # Check for critical indicators
        for indicator in self.urgency_indicators['critical']:
            if indicator in message_lower:
                urgency_score += 10
                detected_urgency_level = 'critical'
                immediate_actions.append(
                    "🚨 **URGENCIA MÉDICA CRÍTICA**: Busca atención médica de emergencia inmediatamente. "
                    "Si estás solo, llama al 911 o a emergencias locales."
                )
        
        # Check for high urgency indicators
        for indicator in self.urgency_indicators['high']:
            if indicator in message_lower:
                urgency_score += 7
                if detected_urgency_level == 'low':
                    detected_urgency_level = 'high'
                    immediate_actions.append(
                        "⚠️ **ATENCIÓN URGENTE**: Se recomienda buscar atención médica en las próximas 2-4 horas."
                    )
        
        # Check for medium urgency
        for indicator in self.urgency_indicators['medium']:
            if indicator in message_lower:
                urgency_score += 4
                if detected_urgency_level == 'low':
                    detected_urgency_level = 'medium'
                    immediate_actions.append(
                        "🏥 **CONSULTA MÉDICA RECOMENDADA**: Te recomiendo programar una cita médica pronto."
                    )
        
        # Additional urgency factors
        if extracted_data['symptoms']:
            num_symptoms = len(extracted_data['symptoms'])
            if num_symptoms >= 5:
                urgency_score += 5
                if detected_urgency_level == 'low':
                    detected_urgency_level = 'medium'
        
        # Check for severity descriptors
        for severity_level, words in self.severity_keywords.items():
            for word in words:
                if word in message_lower:
                    if severity_level == 'extreme':
                        urgency_score += 8
                        detected_urgency_level = 'critical' if urgency_score > 8 else 'high'
                    elif severity_level == 'high':
                        urgency_score += 5
                        if detected_urgency_level == 'low':
                            detected_urgency_level = 'high'
        
        # Determine final urgency level
        if urgency_score >= 10:
            final_urgency = 'critical'
        elif urgency_score >= 7:
            final_urgency = 'high'
        elif urgency_score >= 4:
            final_urgency = 'medium'
        else:
            final_urgency = 'low'
        
        return {
            'level': final_urgency,
            'score': urgency_score,
            'detected_indicators': [ind for ind in self.urgency_indicators.get(final_urgency, []) 
                                   if ind in message_lower],
            'immediate_actions': immediate_actions,
            'recommendation': self._get_urgency_recommendation(final_urgency)
        }
    
    def _classify_symptoms(self, symptoms: List[Dict[str, Any]]) -> List[str]:
        """Classify detected symptoms into medical categories"""
        categories = []
        for symptom in symptoms:
            category = symptom.get('category', 'general')
            if category not in categories:
                categories.append(category)
        
        if not categories:
            categories.append('general')
        
        return categories
    
    async def _assess_severity(self, message: str, extracted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess symptom severity from natural language"""
        message_lower = message.lower()
        
        severity_score = 0
        severity_level = 'mild'
        
        # Check for severity descriptors
        for level, words in self.severity_keywords.items():
            for word in words:
                if word in message_lower:
                    if level == 'extreme':
                        severity_score = 10
                        severity_level = 'extreme'
                    elif level == 'high' and severity_score < 7:
                        severity_score = 7
                        severity_level = 'high'
                    elif level == 'moderate' and severity_score < 4:
                        severity_score = 4
                        severity_level = 'moderate'
                    elif level == 'mild' and severity_score < 2:
                        severity_score = 2
                        severity_level = 'mild'
        
        return {
            'level': severity_level,
            'score': severity_score
        }
    
    async def _detect_respiratory_diseases(
        self,
        user_message: str,
        extracted_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect specific respiratory diseases from message and database"""
        detected = []
        message_lower = user_message.lower()
        
        # Check against disease keywords
        if self.disease_keywords:
            for disease_key, keywords in self.disease_keywords.items():
                for keyword in keywords:
                    if keyword.lower() in message_lower:
                        detected.append({
                            'disease_key': disease_key,
                            'matched_keyword': keyword,
                            'confidence': 0.8
                        })
                        break
        
        return detected
    
    async def _generate_natural_response(
        self,
        extracted_data: Dict[str, Any],
        urgency_assessment: Dict[str, Any],
        symptom_categories: List[str],
        severity: Dict[str, Any],
        detected_diseases: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, Any]]],
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Generate natural, conversational AI response"""
        
        # Build response based on urgency
        response_parts = []
        
        # Urgent response if critical
        if urgency_assessment['level'] == 'critical':
            response_parts.append(
                "⚠️ **SITUACIÓN CRÍTICA DETECTADA**\n\n"
                "Por favor, busca atención médica de EMERGENCIA inmediatamente.\n\n"
                "Esto podría ser una emergencia médica que requiere atención inmediata."
            )
        
        # Natural acknowledgment
        if extracted_data['symptoms']:
            num_symptoms = len(extracted_data['symptoms'])
            symptoms_list = ', '.join([s['name'] for s in extracted_data['symptoms'][:3]])
            
            response_parts.append(
                f"He detectado {num_symptoms} síntoma(s) en tu mensaje: {symptoms_list}.\n\n"
            )
        
        # Add relevant information based on categories
        if 'respiratory' in symptom_categories:
            response_parts.append(
                "💨 **Información sobre síntomas respiratorios:**\n\n"
                "• Mantén reposo y evita actividades que agraven los síntomas\n"
                "• Intenta mantener la calma y respirar lenta y profundamente\n"
                "• Evita irritantes como humo, polvo o productos químicos\n"
                "• Hidrátate bien con agua tibia\n\n"
            )
        
        if 'fever' in symptom_categories:
            response_parts.append(
                "🌡️ **Sobre la fiebre:**\n\n"
                "• Monitorea tu temperatura regularmente\n"
                "• Mantén una buena hidratación\n"
                "• Descansa en un ambiente cómodo y ventilado\n"
                "• Si la temperatura supera 39°C (102.2°F), busca atención médica\n\n"
            )
        
        # Add urgency recommendations
        if urgency_assessment['recommendation']:
            response_parts.append(urgency_assessment['recommendation'])
        
        # General medical disclaimer
        response_parts.append(
            "\n---\n"
            "ℹ️ **Información importante**: Esta es información general. "
            "Para un diagnóstico preciso y tratamiento personalizado, consulta con un profesional de la salud."
        )
        
        return '\n'.join(response_parts)
    
    def _get_urgency_recommendation(self, urgency_level: str) -> str:
        """Get recommendation based on urgency level"""
        recommendations = {
            'critical': (
                "🚨 **ACCIÓN INMEDIATA REQUERIDA**:\n\n"
                "• Llama a emergencias médicas ahora\n"
                "• Si estás solo, pide ayuda inmediatamente\n"
                "• No conduzcas si te sientes mal\n"
                "• Prepárate para ir a emergencias\n"
            ),
            'high': (
                "⚠️ **Atención médica urgente recomendada**:\n\n"
                "• Busca atención médica en las próximas 2-4 horas\n"
                "• Monitorea tus síntomas continuamente\n"
                "• No esperes si los síntomas empeoran\n"
                "• Mantén a alguien informado de tu estado\n"
            ),
            'medium': (
                "🏥 **Consulta médica recomendada**:\n\n"
                "• Programa una cita médica pronto (dentro de 24 horas)\n"
                "• Monitorea la evolución de tus síntomas\n"
                "• Registra cualquier cambio en un diario\n"
                "• Si empeoran, busca atención antes\n"
            ),
            'low': (
                "💚 **Monitoreo en casa**:\n\n"
                "• Continúa monitoreando tus síntomas\n"
                "• Descansa bien y mantén buena hidratación\n"
                "• Si los síntomas persisten por más de 3 días, consulta con un médico\n"
                "• Contacta a un profesional si algo te preocupa\n"
            )
        }
        
        return recommendations.get(urgency_level, recommendations['low'])
    
    def get_conversation_context(self, conversation_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract context from conversation history"""
        if not conversation_history:
            return {}
        
        all_messages = [msg.get('text', '') for msg in conversation_history]
        combined_text = ' '.join(all_messages).lower()
        
        return {
            'total_messages': len(conversation_history),
            'combined_keywords': self._extract_symptoms_and_context(combined_text),
            'has_symptoms_discussed': any(
                any(keyword in msg.get('text', '').lower() 
                    for keywords in self.symptom_keywords.values() 
                    for keyword in keywords)
                for msg in conversation_history
            )
        }

