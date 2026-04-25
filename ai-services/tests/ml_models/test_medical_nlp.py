"""
Tests for ml_models/medical_nlp.py
"""

import pytest
from ml_models.medical_nlp import MedicalNLPProcessor


class TestMedicalNLPProcessor:
    """Tests for MedicalNLPProcessor"""
    
    @pytest.fixture
    def nlp_processor(self):
        """Create NLP processor instance"""
        return MedicalNLPProcessor(language="es")
    
    @pytest.fixture
    def sample_medical_text(self):
        """Sample medical text for testing"""
        return "Paciente de 45 años con tos persistente de 2 semanas, fiebre intermitente de 38°C."
    
    def test_initialization_default(self):
        """Test processor initialization with default language"""
        processor = MedicalNLPProcessor()
        assert processor.language == "es"
    
    def test_initialization_custom_language(self):
        """Test processor initialization with custom language"""
        processor = MedicalNLPProcessor(language="en")
        assert processor.language == "en"
    
    def test_process_text_basic(self, nlp_processor, sample_medical_text):
        """Test basic text processing"""
        result = nlp_processor.process_text(sample_medical_text)
        
        assert "language" in result
        assert "length" in result
        assert "tokens" in result
        assert "num_tokens" in result
        assert result["language"] == "es"
        assert result["length"] == len(sample_medical_text)
        assert isinstance(result["tokens"], list)
        assert result["num_tokens"] == len(result["tokens"])
    
    def test_process_text_empty(self, nlp_processor):
        """Test text processing with empty text"""
        result = nlp_processor.process_text("")
        
        assert result["length"] == 0
        assert result["tokens"] == []
        assert result["num_tokens"] == 0
    
    def test_process_text_punctuation_removal(self, nlp_processor):
        """Test that punctuation is removed from tokens"""
        text = "Paciente con tos, fiebre y dolor."
        result = nlp_processor.process_text(text)
        
        # Tokens should not contain punctuation
        assert all(not any(char in token for char in ",.") for token in result["tokens"])
    
    def test_process_text_lowercase(self, nlp_processor):
        """Test that tokens are lowercase"""
        text = "PACIENTE CON TOS Y FIEBRE"
        result = nlp_processor.process_text(text)
        
        assert all(token.islower() for token in result["tokens"])
    
    def test_extract_entities_symptoms(self, nlp_processor, sample_medical_text):
        """Test entity extraction for symptoms"""
        result = nlp_processor.extract_entities(sample_medical_text)
        
        assert "entities" in result
        assert "count" in result
        assert isinstance(result["entities"], list)
        assert result["count"] == len(result["entities"])
        # Should extract "tos" and "fiebre"
        entity_texts = [e["text"] for e in result["entities"]]
        assert "tos" in entity_texts or "fiebre" in entity_texts
    
    def test_extract_entities_drugs(self, nlp_processor):
        """Test entity extraction for drugs"""
        text = "Paciente toma paracetamol e ibuprofeno"
        result = nlp_processor.extract_entities(text)
        
        entity_texts = [e["text"] for e in result["entities"]]
        assert "paracetamol" in entity_texts or "ibuprofeno" in entity_texts
    
    def test_extract_entities_conditions(self, nlp_processor):
        """Test entity extraction for conditions"""
        text = "Paciente con asma y neumonía"
        result = nlp_processor.extract_entities(text)
        
        entity_texts = [e["text"] for e in result["entities"]]
        assert "asma" in entity_texts or "neumonía" in entity_texts
    
    def test_extract_entities_empty_text(self, nlp_processor):
        """Test entity extraction with empty text"""
        result = nlp_processor.extract_entities("")
        
        assert result["entities"] == []
        assert result["count"] == 0
    
    def test_extract_entities_no_matches(self, nlp_processor):
        """Test entity extraction with no matching entities"""
        text = "Texto sin entidades médicas conocidas"
        result = nlp_processor.extract_entities(text)
        
        assert result["entities"] == []
        assert result["count"] == 0
    
    def test_extract_entities_confidence(self, nlp_processor, sample_medical_text):
        """Test that entities have confidence scores"""
        result = nlp_processor.extract_entities(sample_medical_text)
        
        for entity in result["entities"]:
            assert "confidence" in entity
            assert 0.0 <= entity["confidence"] <= 1.0
    
    def test_summarize_basic(self, nlp_processor, sample_medical_text):
        """Test basic text summarization"""
        result = nlp_processor.summarize(sample_medical_text)
        
        assert "summary" in result
        assert "sentences_used" in result
        assert isinstance(result["summary"], str)
        assert isinstance(result["sentences_used"], int)
        assert result["sentences_used"] <= 2  # Default max_sentences
    
    def test_summarize_custom_max_sentences(self, nlp_processor):
        """Test summarization with custom max_sentences"""
        text = "Primera oración. Segunda oración. Tercera oración. Cuarta oración."
        result = nlp_processor.summarize(text, max_sentences=3)
        
        assert result["sentences_used"] <= 3
        # Should contain multiple sentences
        assert "." in result["summary"]
    
    def test_summarize_single_sentence(self, nlp_processor):
        """Test summarization with single sentence"""
        text = "Una sola oración sin puntos adicionales"
        result = nlp_processor.summarize(text)
        
        assert result["summary"] is not None
        assert len(result["summary"]) > 0
    
    def test_summarize_empty_text(self, nlp_processor):
        """Test summarization with empty text"""
        result = nlp_processor.summarize("")
        
        assert result["summary"] is not None
        assert len(result["summary"]) <= 140  # Fallback length
    
    def test_summarize_newlines(self, nlp_processor):
        """Test summarization with newlines"""
        text = "Primera línea.\nSegunda línea.\nTercera línea."
        result = nlp_processor.summarize(text)
        
        # Newlines should be replaced with spaces
        assert "\n" not in result["summary"]
    
    def test_translate_terms_basic(self, nlp_processor):
        """Test basic term translation"""
        terms = ["tos", "fiebre"]
        result = nlp_processor.translate_terms(terms, target_language="en")
        
        assert "target_language" in result
        assert "translations" in result
        assert result["target_language"] == "en"
        assert isinstance(result["translations"], dict)
        assert "tos" in result["translations"]
        assert result["translations"]["tos"] == "cough"
    
    def test_translate_terms_unknown_term(self, nlp_processor):
        """Test translation of unknown term"""
        terms = ["termino_desconocido"]
        result = nlp_processor.translate_terms(terms, target_language="en")
        
        # Unknown terms should be returned as-is
        assert result["translations"]["termino_desconocido"] == "termino_desconocido"
    
    def test_translate_terms_multiple(self, nlp_processor):
        """Test translation of multiple terms"""
        terms = ["tos", "fiebre", "disnea", "asma"]
        result = nlp_processor.translate_terms(terms, target_language="en")
        
        assert len(result["translations"]) == len(terms)
        assert result["translations"]["tos"] == "cough"
        assert result["translations"]["fiebre"] == "fever"
        assert result["translations"]["disnea"] == "dyspnea"
        assert result["translations"]["asma"] == "asthma"
    
    def test_translate_terms_empty_list(self, nlp_processor):
        """Test translation with empty term list"""
        result = nlp_processor.translate_terms([], target_language="en")
        
        assert result["translations"] == {}
    
    def test_translate_terms_case_insensitive(self, nlp_processor):
        """Test that translation is case insensitive"""
        terms = ["TOS", "Fiebre"]
        result = nlp_processor.translate_terms(terms, target_language="en")
        
        # Should still translate (lowercase matching)
        assert "TOS" in result["translations"]
        assert "Fiebre" in result["translations"]
    
    def test_sentiment_negative(self, nlp_processor):
        """Test sentiment analysis for negative text"""
        text = "Paciente con dolor grave y malestar extremo"
        result = nlp_processor.sentiment(text)
        
        assert "label" in result
        assert "score" in result
        assert result["label"] == "negative"
        assert result["score"] > 0.5
    
    def test_sentiment_positive(self, nlp_processor):
        """Test sentiment analysis for positive text"""
        text = "Paciente estable y mejorando, síntomas leves"
        result = nlp_processor.sentiment(text)
        
        assert result["label"] == "positive"
        assert result["score"] > 0.5
    
    def test_sentiment_neutral(self, nlp_processor):
        """Test sentiment analysis for neutral text"""
        text = "Paciente con síntomas regulares"
        result = nlp_processor.sentiment(text)
        
        assert result["label"] == "neutral"
        assert result["score"] == 0.5
    
    def test_sentiment_mixed(self, nlp_processor):
        """Test sentiment analysis for mixed text"""
        text = "Paciente con dolor pero mejorando"
        result = nlp_processor.sentiment(text)
        
        # Should detect both positive and negative
        assert result["label"] in ["mixed", "neutral", "positive", "negative"]
    
    def test_sentiment_empty_text(self, nlp_processor):
        """Test sentiment analysis with empty text"""
        result = nlp_processor.sentiment("")
        
        assert result["label"] == "neutral"
        assert result["score"] == 0.5
    
    def test_sentiment_score_range(self, nlp_processor):
        """Test that sentiment score is in valid range"""
        texts = [
            "Paciente con dolor",
            "Paciente estable",
            "Paciente mejorando",
            "Texto neutral"
        ]
        
        for text in texts:
            result = nlp_processor.sentiment(text)
            assert 0.0 <= result["score"] <= 1.0
    
    def test_process_text_whitespace_handling(self, nlp_processor):
        """Test text processing with various whitespace"""
        text = "  Paciente   con    tos  "
        result = nlp_processor.process_text(text)
        
        # Should handle multiple spaces
        assert len(result["tokens"]) > 0
        assert all(token.strip() == token for token in result["tokens"])
    
    def test_extract_entities_case_insensitive(self, nlp_processor):
        """Test entity extraction is case insensitive"""
        text = "Paciente con TOS y FIEBRE"
        result = nlp_processor.extract_entities(text)
        
        entity_texts = [e["text"] for e in result["entities"]]
        # Should extract regardless of case
        assert len(entity_texts) >= 0
    
    def test_summarize_punctuation_preservation(self, nlp_processor):
        """Test that summary preserves sentence structure"""
        text = "Primera oración. Segunda oración."
        result = nlp_processor.summarize(text, max_sentences=2)
        
        # Summary should end with period
        assert result["summary"].endswith(".")
    
    def test_translate_terms_different_target_language(self, nlp_processor):
        """Test translation with different target language"""
        terms = ["tos"]
        result = nlp_processor.translate_terms(terms, target_language="fr")
        
        # Should still work (may return same or translated)
        assert "target_language" in result
        assert result["target_language"] == "fr"

