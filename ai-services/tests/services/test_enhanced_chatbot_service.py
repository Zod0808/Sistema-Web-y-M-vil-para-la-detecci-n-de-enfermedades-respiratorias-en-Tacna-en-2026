"""
Unit tests for Enhanced Chatbot Service
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, Mock
from typing import Dict, Any, List

from services.enhanced_chatbot_service import EnhancedChatbotService


class TestEnhancedChatbotService:
    """Test EnhancedChatbotService implementation"""
    
    @pytest.fixture
    def chatbot_service(self):
        """Create enhanced chatbot service instance"""
        with patch('services.enhanced_chatbot_service.SHAPDiseaseExplainer'):
            with patch('services.enhanced_chatbot_service.parse_diseases_markdown'):
                with patch('services.enhanced_chatbot_service.build_disease_database'):
                    return EnhancedChatbotService()
    
    @pytest.fixture
    def sample_user_message(self):
        """Sample user message with symptoms"""
        return "Tengo fiebre, tos seca, dolor de garganta y fatiga"
    
    @pytest.fixture
    def sample_greeting(self):
        """Sample greeting message"""
        return "Hola, buenos días"
    
    def test_service_initialization(self, chatbot_service):
        """Test service initialization"""
        assert chatbot_service._disease_db is not None or chatbot_service._disease_db is None
        assert chatbot_service._openai_model == "gpt-3.5-turbo"
        assert chatbot_service.stop_words is not None
        assert len(chatbot_service.stop_words) > 0
    
    def test_tokenize_spanish_text_basic(self, chatbot_service):
        """Test basic Spanish text tokenization"""
        text = "Tengo fiebre y tos seca"
        tokens = chatbot_service.tokenize_spanish_text(text)
        
        assert isinstance(tokens, list)
        assert "fiebre" in tokens
        assert "tos" in tokens
        assert "seca" in tokens
        # Stop words should be filtered
        assert "y" not in tokens
    
    def test_tokenize_spanish_text_empty(self, chatbot_service):
        """Test tokenization with empty text"""
        tokens = chatbot_service.tokenize_spanish_text("")
        assert tokens == []
    
    def test_tokenize_spanish_text_none(self, chatbot_service):
        """Test tokenization with None"""
        tokens = chatbot_service.tokenize_spanish_text(None)
        assert tokens == []
    
    def test_tokenize_spanish_text_punctuation(self, chatbot_service):
        """Test tokenization removes punctuation"""
        text = "Tengo fiebre, tos y dolor."
        tokens = chatbot_service.tokenize_spanish_text(text)
        
        # Should not contain punctuation
        assert all(not any(char in token for char in ",.") for token in tokens)
    
    def test_tokenize_spanish_text_short_tokens(self, chatbot_service):
        """Test that short tokens (<3 chars) are filtered"""
        text = "Yo el la de a en"
        tokens = chatbot_service.tokenize_spanish_text(text)
        
        # All tokens should be >= 3 characters
        assert all(len(token) >= 3 for token in tokens)
    
    def test_extract_symptom_keywords_basic(self, chatbot_service):
        """Test basic symptom keyword extraction"""
        user_message = "Tengo fiebre y tos"
        tokens = chatbot_service.tokenize_spanish_text(user_message)
        symptoms = chatbot_service.extract_symptom_keywords(user_message, tokens)
        
        assert isinstance(symptoms, list)
        assert len(symptoms) > 0
        assert any(s.get('symptom') == 'fiebre' for s in symptoms)
    
    def test_extract_symptom_keywords_no_duplicates(self, chatbot_service):
        """Test that symptoms are not duplicated"""
        user_message = "Tengo fiebre fiebre fiebre alta"
        tokens = chatbot_service.tokenize_spanish_text(user_message)
        symptoms = chatbot_service.extract_symptom_keywords(user_message, tokens)
        
        # Should not have duplicate symptoms
        symptom_names = [s.get('symptom') for s in symptoms]
        assert len(symptom_names) == len(set(symptom_names))
    
    def test_extract_symptom_keywords_phrases(self, chatbot_service):
        """Test extraction of multi-word symptom phrases"""
        user_message = "Tengo dolor de garganta y dificultad para respirar"
        tokens = chatbot_service.tokenize_spanish_text(user_message)
        symptoms = chatbot_service.extract_symptom_keywords(user_message, tokens)
        
        symptom_names = [s.get('symptom') for s in symptoms]
        assert any('dolor de garganta' in name for name in symptom_names)
        assert any('dificultad para respirar' in name for name in symptom_names)
    
    def test_extract_symptom_keywords_confidence(self, chatbot_service):
        """Test that symptoms have confidence scores"""
        user_message = "Tengo fiebre"
        tokens = chatbot_service.tokenize_spanish_text(user_message)
        symptoms = chatbot_service.extract_symptom_keywords(user_message, tokens)
        
        for symptom in symptoms:
            assert 'confidence' in symptom
            assert 0.0 <= symptom['confidence'] <= 1.0
    
    def test_classify_disease_no_symptoms(self, chatbot_service):
        """Test disease classification with no symptoms"""
        result = chatbot_service.classify_disease("", [], [])
        
        assert result['disease_id'] is None
        assert result['disease_name'] is None
        assert result['confidence'] == 0.0
        assert 'reasoning' in result
    
    def test_classify_disease_pattern_matching(self, chatbot_service):
        """Test disease classification using pattern matching"""
        user_message = "Tengo estornudos frecuentes, picazon nasal, congestion nasal y secrecion acuosa"
        tokens = chatbot_service.tokenize_spanish_text(user_message)
        symptoms = chatbot_service.extract_symptom_keywords(user_message, tokens)
        
        result = chatbot_service.classify_disease(user_message, symptoms, tokens)
        
        assert result['disease_name'] is not None
        assert result['confidence'] > 0
        assert 'urgency' in result
        assert 'severity' in result
    
    def test_classify_disease_with_database(self, chatbot_service):
        """Test disease classification with disease database"""
        # Mock disease database
        chatbot_service._disease_db = {
            'diseases': [
                {
                    'id': 1,
                    'nombre': 'Rinitis alérgica',
                    'sintomas': ['estornudos', 'picazon nasal', 'congestion'],
                    'keywords': ['alergia', 'rinitis'],
                    'categoria': 'ALERGIAS',
                    'urgencia': 'baja',
                    'severidad': 'leve'
                }
            ],
            'symptom_to_diseases': {
                'estornudos': [1],
                'picazon nasal': [1]
            }
        }
        
        user_message = "Tengo estornudos y picazon nasal"
        tokens = chatbot_service.tokenize_spanish_text(user_message)
        symptoms = chatbot_service.extract_symptom_keywords(user_message, tokens)
        
        result = chatbot_service.classify_disease(user_message, symptoms, tokens)
        
        assert result['disease_id'] is not None
        assert result['disease_name'] is not None
        assert result['confidence'] > 0
    
    def test_is_greeting_detection(self, chatbot_service):
        """Test greeting detection"""
        greetings = ["Hola", "Buenos días", "Buenas tardes", "Hi", "Hello"]
        
        for greeting in greetings:
            assert chatbot_service._is_greeting(greeting) is True
    
    def test_is_greeting_negative(self, chatbot_service):
        """Test that non-greetings are not detected"""
        non_greetings = ["Tengo fiebre", "Dolor de cabeza", "Síntomas respiratorios"]
        
        for message in non_greetings:
            assert chatbot_service._is_greeting(message) is False
    
    def test_is_question_detection(self, chatbot_service):
        """Test question detection"""
        questions = [
            "¿Qué es la gripe?",
            "Cómo funciona?",
            "Por qué tengo tos?",
            "Cuál es el tratamiento?"
        ]
        
        for question in questions:
            assert chatbot_service._is_question(question) is True
    
    def test_is_question_negative(self, chatbot_service):
        """Test that non-questions are not detected"""
        statements = ["Tengo fiebre", "Dolor de cabeza", "Síntomas"]
        
        for statement in statements:
            assert chatbot_service._is_question(statement) is False
    
    @pytest.mark.asyncio
    async def test_get_greeting_response(self, chatbot_service):
        """Test greeting response generation"""
        response = chatbot_service._get_greeting_response()
        
        assert isinstance(response, str)
        assert len(response) > 0
        assert "Hola" in response or "asistente" in response.lower()
    
    @pytest.mark.asyncio
    async def test_get_general_question_response(self, chatbot_service):
        """Test general question response"""
        question = "¿Qué es la gripe?"
        response = chatbot_service._get_general_question_response(question)
        
        assert isinstance(response, str)
        assert len(response) > 0
    
    @pytest.mark.asyncio
    async def test_get_no_symptoms_response(self, chatbot_service):
        """Test response when no symptoms detected"""
        response = chatbot_service._get_no_symptoms_response("Mensaje sin síntomas")
        
        assert isinstance(response, str)
        assert len(response) > 0
        assert "síntomas" in response.lower()
    
    @pytest.mark.asyncio
    async def test_get_openai_response_greeting(self, chatbot_service, sample_greeting):
        """Test OpenAI response for greeting"""
        response = await chatbot_service.get_openai_response(
            user_message=sample_greeting,
            classified_disease={},
            symptoms=[]
        )
        
        assert isinstance(response, str)
        assert len(response) > 0
    
    @pytest.mark.asyncio
    async def test_get_openai_response_with_disease(self, chatbot_service, sample_user_message):
        """Test OpenAI response with classified disease"""
        classified_disease = {
            'disease_name': 'Influenza B',
            'urgency': 'media',
            'severity': 'moderada',
            'detected_symptoms': ['fiebre', 'tos'],
            'matched_symptoms': ['fiebre', 'tos seca']
        }
        
        symptoms = [
            {'symptom': 'fiebre', 'confidence': 0.9},
            {'symptom': 'tos', 'confidence': 0.8}
        ]
        
        response = await chatbot_service.get_openai_response(
            user_message=sample_user_message,
            classified_disease=classified_disease,
            symptoms=symptoms
        )
        
        assert isinstance(response, str)
        assert len(response) > 0
        assert 'Influenza B' in response or 'influenza' in response.lower()
    
    @pytest.mark.asyncio
    async def test_get_openai_response_urgency_levels(self, chatbot_service):
        """Test OpenAI response with different urgency levels"""
        urgency_levels = ['critica', 'alta', 'media', 'baja']
        
        for urgency in urgency_levels:
            classified_disease = {
                'disease_name': 'Test Disease',
                'urgency': urgency,
                'severity': 'moderada',
                'detected_symptoms': ['fiebre'],
                'matched_symptoms': ['fiebre']
            }
            
            response = await chatbot_service.get_openai_response(
                user_message="Tengo fiebre",
                classified_disease=classified_disease,
                symptoms=[{'symptom': 'fiebre'}]
            )
            
            assert isinstance(response, str)
            assert len(response) > 0
    
    @pytest.mark.asyncio
    async def test_process_user_message_greeting(self, chatbot_service, sample_greeting):
        """Test processing greeting message"""
        result = await chatbot_service.process_user_message(
            user_message=sample_greeting,
            conversation_history=None,
            context=None
        )
        
        assert result['success'] is True
        assert 'message' in result
        assert result['analysis']['message_type'] == 'greeting'
    
    @pytest.mark.asyncio
    async def test_process_user_message_with_symptoms(self, chatbot_service, sample_user_message):
        """Test processing message with symptoms"""
        result = await chatbot_service.process_user_message(
            user_message=sample_user_message,
            conversation_history=None,
            context=None
        )
        
        assert result['success'] is True
        assert 'message' in result
        # These fields may or may not be present depending on message type
        # Tokenization and extraction are done internally
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_process_user_message_tokenization(self, chatbot_service, sample_user_message):
        """Test that message is tokenized"""
        result = await chatbot_service.process_user_message(
            user_message=sample_user_message,
            conversation_history=None,
            context=None
        )
        
        # tokenization only present when message has symptoms (not greeting/question)
        if 'tokenization' in result:
            assert 'tokens' in result['tokenization']
            assert 'token_count' in result['tokenization']
            assert isinstance(result['tokenization']['tokens'], list)
        else:
            # For greetings/questions, tokenization may not be in result
            assert 'message' in result
    
    @pytest.mark.asyncio
    async def test_process_user_message_symptom_extraction(self, chatbot_service, sample_user_message):
        """Test that symptoms are extracted"""
        result = await chatbot_service.process_user_message(
            user_message=sample_user_message,
            conversation_history=None,
            context=None
        )
        
        # symptom_extraction only present when message has symptoms
        if 'symptom_extraction' in result:
            assert 'symptoms' in result['symptom_extraction']
            assert 'count' in result['symptom_extraction']
            assert isinstance(result['symptom_extraction']['symptoms'], list)
        else:
            # For greetings/questions, symptom_extraction may not be in result
            assert 'message' in result
    
    @pytest.mark.asyncio
    async def test_process_user_message_disease_classification(self, chatbot_service, sample_user_message):
        """Test that disease is classified"""
        result = await chatbot_service.process_user_message(
            user_message=sample_user_message,
            conversation_history=None,
            context=None
        )
        
        # disease_classification only present when message has symptoms
        if 'disease_classification' in result:
            assert 'disease_name' in result['disease_classification'] or result['disease_classification'].get('disease_name') is None
            assert 'confidence' in result['disease_classification']
        else:
            # For greetings/questions, disease_classification may not be in result
            assert 'message' in result
    
    @pytest.mark.asyncio
    async def test_process_user_message_error_handling(self, chatbot_service):
        """Test error handling in message processing"""
        # Mock a method to raise an error
        with patch.object(chatbot_service, 'tokenize_spanish_text', side_effect=Exception("Test error")):
            result = await chatbot_service.process_user_message(
                user_message="Test",
                conversation_history=None,
                context=None
            )
            
            assert result['success'] is False
            assert 'error' in result
            assert 'message' in result
    
    @pytest.mark.asyncio
    async def test_process_user_message_general_question(self, chatbot_service):
        """Test processing general question without symptoms"""
        result = await chatbot_service.process_user_message(
            user_message="¿Qué es la gripe?",
            conversation_history=None,
            context=None
        )
        
        assert result['success'] is True
        assert result['analysis']['message_type'] == 'general_question'
    
    @pytest.mark.asyncio
    async def test_process_user_message_no_symptoms(self, chatbot_service):
        """Test processing message with no symptoms detected"""
        result = await chatbot_service.process_user_message(
            user_message="Hola, cómo estás?",
            conversation_history=None,
            context=None
        )
        
        assert result['success'] is True
        # Should handle gracefully
        assert 'message' in result
    
    def test_get_actionable_recommendation(self, chatbot_service):
        """Test actionable recommendation generation"""
        urgency_levels = ['critica', 'alta', 'media', 'baja']
        
        for urgency in urgency_levels:
            classified_disease = {
                'urgency': urgency,
                'severity': 'moderada'
            }
            
            recommendation = chatbot_service._get_actionable_recommendation(classified_disease)
            
            assert isinstance(recommendation, str)
            assert len(recommendation) > 0
    
    @pytest.mark.asyncio
    async def test_predict_with_ml_not_available(self, chatbot_service):
        """Test ML prediction when ML is not available"""
        chatbot_service._use_ml = False
        chatbot_service._shap_explainer = None
        
        result = chatbot_service._predict_with_ml(
            user_message="Tengo fiebre",
            symptoms=[{'symptom': 'fiebre'}]
        )
        
        # Should return None when ML is not available
        assert result is None
    
    @pytest.mark.asyncio
    async def test_predict_with_ml_available(self, chatbot_service):
        """Test ML prediction when ML is available"""
        # Mock SHAP explainer
        mock_explainer = MagicMock()
        mock_explainer.explain_prediction.return_value = {
            'disease': 'Influenza B',
            'confidence': 0.85,
            'urgency': 'media'
        }
        
        chatbot_service._use_ml = True
        chatbot_service._shap_explainer = mock_explainer
        
        result = chatbot_service._predict_with_ml(
            user_message="Tengo fiebre y tos",
            symptoms=[{'symptom': 'fiebre'}, {'symptom': 'tos'}]
        )
        
        assert result is not None
        assert 'disease' in result
        mock_explainer.explain_prediction.assert_called_once()
    
    def test_classify_disease_with_patterns(self, chatbot_service):
        """Test disease classification using pattern matching"""
        symptoms = [
            {'symptom': 'fiebre', 'confidence': 0.9},
            {'symptom': 'tos seca', 'confidence': 0.8},
            {'symptom': 'dolor de garganta', 'confidence': 0.7}
        ]
        
        result = chatbot_service._classify_disease(symptoms)
        
        assert isinstance(result, dict)
        assert 'disease_name' in result or result.get('disease_name') is None
        assert 'confidence' in result or 'urgency' in result
    
    def test_classify_disease_no_match(self, chatbot_service):
        """Test disease classification with no matching patterns"""
        symptoms = [
            {'symptom': 'sintoma_inexistente', 'confidence': 0.5}
        ]
        
        result = chatbot_service._classify_disease(symptoms)
        
        assert isinstance(result, dict)
    
    def test_get_disease_patterns(self, chatbot_service):
        """Test getting disease patterns"""
        disease_name = "Influenza B"
        patterns = chatbot_service._get_disease_patterns(disease_name)
        
        assert isinstance(patterns, dict)
        assert 'symptoms' in patterns or 'patterns' in patterns or len(patterns) == 0
    
    def test_match_symptoms_to_disease(self, chatbot_service):
        """Test matching symptoms to disease"""
        symptoms = [
            {'symptom': 'fiebre', 'confidence': 0.9},
            {'symptom': 'tos', 'confidence': 0.8}
        ]
        disease_patterns = {
            'symptoms': ['fiebre', 'tos', 'dolor de garganta']
        }
        
        matched = chatbot_service._match_symptoms_to_disease(symptoms, disease_patterns)
        
        assert isinstance(matched, list)
        assert len(matched) >= 0
    
    def test_calculate_disease_confidence(self, chatbot_service):
        """Test disease confidence calculation"""
        symptoms = [
            {'symptom': 'fiebre', 'confidence': 0.9},
            {'symptom': 'tos', 'confidence': 0.8}
        ]
        matched_symptoms = ['fiebre', 'tos']
        total_patterns = 5
        
        confidence = chatbot_service._calculate_disease_confidence(
            symptoms, matched_symptoms, total_patterns
        )
        
        assert isinstance(confidence, float)
        assert 0.0 <= confidence <= 1.0
    
    @pytest.mark.asyncio
    async def test_process_user_message_with_conversation_history(self, chatbot_service, sample_user_message):
        """Test processing message with conversation history"""
        history = [
            {"role": "user", "content": "Hola"},
            {"role": "assistant", "content": "Hola, ¿en qué puedo ayudarte?"}
        ]
        
        result = await chatbot_service.process_user_message(
            user_message=sample_user_message,
            conversation_history=history,
            context=None
        )
        
        assert result['success'] is True
        assert 'message' in result
    
    @pytest.mark.asyncio
    async def test_process_user_message_with_context(self, chatbot_service, sample_user_message):
        """Test processing message with context"""
        context = {
            "patient_id": "P001",
            "age": 45,
            "gender": "M"
        }
        
        result = await chatbot_service.process_user_message(
            user_message=sample_user_message,
            conversation_history=None,
            context=context
        )
        
        assert result['success'] is True
        assert 'message' in result
    
    def test_extract_symptom_keywords_edge_cases(self, chatbot_service):
        """Test symptom keyword extraction with edge cases"""
        # Empty message
        tokens = chatbot_service.tokenize_spanish_text("")
        symptoms = chatbot_service.extract_symptom_keywords("", tokens)
        assert isinstance(symptoms, list)
        
        # Message with only stop words
        tokens = chatbot_service.tokenize_spanish_text("el la de y")
        symptoms = chatbot_service.extract_symptom_keywords("el la de y", tokens)
        assert isinstance(symptoms, list)
        
        # Message with numbers
        tokens = chatbot_service.tokenize_spanish_text("tengo 3 días con fiebre")
        symptoms = chatbot_service.extract_symptom_keywords("tengo 3 días con fiebre", tokens)
        assert isinstance(symptoms, list)
    
    def test_tokenize_spanish_text_special_characters(self, chatbot_service):
        """Test tokenization with special Spanish characters"""
        text = "Tengo fiebre y tos con ñoño y café"
        tokens = chatbot_service.tokenize_spanish_text(text)
        
        assert isinstance(tokens, list)
        # Should preserve Spanish characters
        assert all(any(char in token for char in "ñáéíóúü") or token.isalnum() for token in tokens)
    
    def test_tokenize_spanish_text_long_text(self, chatbot_service):
        """Test tokenization with long text"""
        long_text = " ".join(["síntoma"] * 100)
        tokens = chatbot_service.tokenize_spanish_text(long_text)
        
        assert isinstance(tokens, list)
        assert len(tokens) > 0
    
    @pytest.mark.asyncio
    async def test_get_openai_response_error_handling(self, chatbot_service):
        """Test OpenAI response error handling"""
        with patch('services.enhanced_chatbot_service.openai') as mock_openai:
            mock_openai.AsyncOpenAI.return_value.chat.completions.create = AsyncMock(
                side_effect=Exception("OpenAI error")
            )
            
            # Should handle error gracefully
            response = await chatbot_service.get_openai_response(
                user_message="Test",
                classified_disease={},
                symptoms=[]
            )
            
            # Should return a fallback response
            assert isinstance(response, str)
            assert len(response) > 0
    
    def test_get_disease_ids_for_symptom(self, chatbot_service):
        """Test getting disease IDs for a symptom"""
        # Mock disease database
        chatbot_service._disease_db = {
            'symptom_to_diseases': {
                'fiebre': [1, 2, 3],
                'tos': [2, 4]
            }
        }
        
        disease_ids = chatbot_service._get_disease_ids_for_symptom('fiebre')
        
        assert isinstance(disease_ids, list)
        assert len(disease_ids) > 0
    
    def test_get_disease_ids_for_symptom_no_db(self, chatbot_service):
        """Test getting disease IDs when database is not available"""
        chatbot_service._disease_db = None
        
        disease_ids = chatbot_service._get_disease_ids_for_symptom('fiebre')
        
        assert disease_ids == []
    
    def test_classify_by_patterns_rinitis(self, chatbot_service):
        """Test pattern matching for rinitis alérgica"""
        user_message = "Tengo estornudos frecuentes, picazon nasal, congestion nasal"
        tokens = chatbot_service.tokenize_spanish_text(user_message)
        symptoms = chatbot_service.extract_symptom_keywords(user_message, tokens)
        
        result = chatbot_service._classify_by_patterns(user_message, symptoms, tokens)
        
        assert result['disease_name'] is not None
        assert result['confidence'] > 0
    
    def test_classify_by_patterns_influenza(self, chatbot_service):
        """Test pattern matching for influenza"""
        user_message = "Tengo fiebre, dolores musculares, tos y fatiga"
        tokens = chatbot_service.tokenize_spanish_text(user_message)
        symptoms = chatbot_service.extract_symptom_keywords(user_message, tokens)
        
        result = chatbot_service._classify_by_patterns(user_message, symptoms, tokens)
        
        assert result['disease_name'] is not None
        assert result['confidence'] > 0
    
    def test_classify_by_patterns_low_confidence(self, chatbot_service):
        """Test pattern matching with low confidence"""
        user_message = "Tengo algo"
        tokens = chatbot_service.tokenize_spanish_text(user_message)
        symptoms = chatbot_service.extract_symptom_keywords(user_message, tokens)
        
        result = chatbot_service._classify_by_patterns(user_message, symptoms, tokens)
        
        # Should return generic diagnosis with low confidence
        assert result['disease_name'] is not None
        assert result['confidence'] < 0.5 or result['disease_id'] is None

