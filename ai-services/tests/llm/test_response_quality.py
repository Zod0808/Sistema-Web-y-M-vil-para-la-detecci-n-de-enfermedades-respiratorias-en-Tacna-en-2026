"""
LLM Testing — Evaluaciones de Calidad de Respuestas (Evals)

Estrategia:
  - Golden dataset: pares (input → expected_output) con criterios de aceptación definidos
  - Evalúa ConversationalAIService (lógica de detección de síntomas y urgencia)
  - Evalúa PatientFriendlyExplainer (claridad y completitud de explicaciones)
  - Evalúa OpenAIStrategy (estructura y coherencia del parsing de respuestas)
  - No depende de la API de OpenAI real: usa mocks deterministas
  - Comprueba calidad semántica: urgencia correcta, síntomas detectados, lenguaje en español

Criterios de calidad evaluados:
  ✓ Urgencia correcta para cada escenario clínico
  ✓ Síntomas relevantes detectados (recall ≥ umbral configurado)
  ✓ Respuesta en español y comprensible
  ✓ Campos requeridos presentes en la respuesta
  ✓ Rango de confianza válido (0.0–1.0)
  ✓ Recomendaciones coherentes con el nivel de urgencia
  ✓ Explicación paciente contiene nombre de enfermedad y nivel de urgencia
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List


# ─── Golden Dataset ────────────────────────────────────────────────────────────

# Cada entrada: mensaje del usuario + verdad esperada
GOLDEN_DATASET = [
    {
        "id": "GD-001",
        "scenario": "Emergencia respiratoria crítica",
        "input": "No puedo respirar, me duele mucho el pecho y siento que me ahogo",
        "expected_urgency": "critical",
        "expected_symptoms_contain": ["respirar", "pecho", "ahogo"],
        "expected_needs_attention": True,
        "expected_follow_up": True,
    },
    {
        "id": "GD-002",
        "scenario": "Fiebre alta con tos severa",
        "input": "Tengo fiebre alta desde ayer y tos muy severa con flema",
        "expected_urgency_in": ["critical", "high"],
        "expected_symptoms_contain": ["fiebre", "tos"],
        "expected_needs_attention": True,
        "expected_follow_up": True,
    },
    {
        "id": "GD-003",
        "scenario": "Síntomas leves de resfriado",
        "input": "Tengo un poco de congestión nasal y estornudos leves desde esta mañana",
        "expected_urgency_in": ["low", "medium"],
        "expected_symptoms_contain": ["congestión nasal"],
        "expected_needs_attention": False,
    },
    {
        "id": "GD-004",
        "scenario": "Dificultad respiratoria moderada",
        "input": "Tengo dificultad moderada para respirar y me siento muy cansado",
        "expected_urgency_in": ["critical", "high", "medium"],
        "expected_symptoms_contain": ["respirar", "cansado"],
        "expected_needs_attention": True,
    },
    {
        "id": "GD-005",
        "scenario": "Dolor de pecho urgente",
        "input": "Dolor en el pecho y me cuesta mucho respirar, necesito ayuda urgente",
        "expected_urgency": "critical",
        "expected_symptoms_contain": ["pecho", "respirar"],
        "expected_needs_attention": True,
        "expected_follow_up": True,
    },
    {
        "id": "GD-006",
        "scenario": "Fatiga leve sin otros síntomas",
        "input": "Me siento un poco cansado hoy",
        "expected_urgency_in": ["low", "medium"],
        "expected_symptoms_contain": ["cansado"],
    },
    {
        "id": "GD-007",
        "scenario": "Sibilancias con historial de asma",
        "input": "Tengo sibilancias y dificultad para respirar, tengo asma diagnosticada",
        "expected_urgency_in": ["critical", "high", "medium"],
        "expected_symptoms_contain": ["respirar"],
        "expected_needs_attention": True,
    },
    {
        "id": "GD-008",
        "scenario": "Fiebre con dolor de cabeza",
        "input": "Tengo fiebre, escalofríos y un fuerte dolor de cabeza",
        "expected_urgency_in": ["critical", "high", "medium"],
        "expected_symptoms_contain": ["fiebre", "escalofrios"],
        "expected_follow_up": True,
    },
]


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def conversational_service():
    """Instancia del ConversationalAIService sin dependencias externas."""
    from services.conversational_ai_service import ConversationalAIService
    return ConversationalAIService(service_manager=None)


@pytest.fixture
def explainer():
    """Instancia del PatientFriendlyExplainer."""
    from services.patient_friendly_explainer import PatientFriendlyExplainer
    return PatientFriendlyExplainer()


# ─── Helper functions ─────────────────────────────────────────────────────────

def extract_detected_symptom_names(analysis: Dict) -> List[str]:
    """Extrae los nombres de síntomas detectados del análisis."""
    symptoms = analysis.get("symptoms", [])
    names = []
    for s in symptoms:
        if isinstance(s, dict):
            names.append(s.get("name", "").lower())
        elif isinstance(s, str):
            names.append(s.lower())
    return names


def symptom_recall(detected: List[str], expected_keywords: List[str]) -> float:
    """Calcula qué fracción de los keywords esperados está cubierta."""
    if not expected_keywords:
        return 1.0
    hits = sum(
        1 for kw in expected_keywords
        if any(kw in name for name in detected)
    )
    return hits / len(expected_keywords)


# ═══════════════════════════════════════════════════════════════════════════════
# ConversationalAIService — Evaluaciones de Calidad (Golden Dataset)
# ═══════════════════════════════════════════════════════════════════════════════

class TestConversationalServiceQuality:
    """Evals de calidad sobre el ConversationalAIService con golden dataset."""

    @pytest.mark.asyncio
    @pytest.mark.parametrize("case", GOLDEN_DATASET, ids=[c["id"] for c in GOLDEN_DATASET])
    async def test_urgency_level_correct(self, conversational_service, case):
        """El nivel de urgencia debe coincidir con la verdad del golden dataset."""
        result = await conversational_service.analyze_conversation(case["input"])
        urgency = result["analysis"]["urgency_level"]

        if "expected_urgency" in case:
            assert urgency == case["expected_urgency"], (
                f"[{case['id']}] Escenario '{case['scenario']}': "
                f"urgencia esperada '{case['expected_urgency']}', obtenida '{urgency}'"
            )
        else:
            assert urgency in case["expected_urgency_in"], (
                f"[{case['id']}] Escenario '{case['scenario']}': "
                f"urgencia debe ser una de {case['expected_urgency_in']}, obtenida '{urgency}'"
            )

    @pytest.mark.asyncio
    @pytest.mark.parametrize("case", GOLDEN_DATASET, ids=[c["id"] for c in GOLDEN_DATASET])
    async def test_symptom_recall_above_threshold(self, conversational_service, case):
        """Al menos el 50% de los síntomas clave deben ser detectados."""
        result = await conversational_service.analyze_conversation(case["input"])
        detected = extract_detected_symptom_names(result["analysis"])
        recall = symptom_recall(detected, case.get("expected_symptoms_contain", []))
        assert recall >= 0.5, (
            f"[{case['id']}] '{case['scenario']}': recall {recall:.2f} < 0.50. "
            f"Detectados: {detected}, esperados: {case.get('expected_symptoms_contain')}"
        )

    @pytest.mark.asyncio
    @pytest.mark.parametrize("case", [c for c in GOLDEN_DATASET if "expected_needs_attention" in c],
                             ids=[c["id"] for c in GOLDEN_DATASET if "expected_needs_attention" in c])
    async def test_needs_medical_attention_flag(self, conversational_service, case):
        """needs_medical_attention debe ser correcto para el escenario clínico."""
        result = await conversational_service.analyze_conversation(case["input"])
        flag = result["analysis"]["needs_medical_attention"]
        assert flag == case["expected_needs_attention"], (
            f"[{case['id']}] '{case['scenario']}': needs_medical_attention={flag}, "
            f"esperado={case['expected_needs_attention']}"
        )

    @pytest.mark.asyncio
    async def test_response_structure_completeness(self, conversational_service):
        """Toda respuesta debe contener los campos estructurados requeridos."""
        result = await conversational_service.analyze_conversation(
            "Tengo tos y fiebre desde hace dos días"
        )
        assert "user_message" in result
        assert "ai_response" in result
        assert "analysis" in result
        assert "conversation_context" in result

        analysis = result["analysis"]
        required_fields = [
            "symptoms", "urgency_level", "needs_medical_attention",
            "follow_up_required", "recommendations",
        ]
        for field in required_fields:
            assert field in analysis, f"Campo requerido ausente en analysis: '{field}'"

    @pytest.mark.asyncio
    async def test_ai_response_is_string_and_non_empty(self, conversational_service):
        """La respuesta conversacional debe ser una cadena no vacía."""
        result = await conversational_service.analyze_conversation(
            "Me duele el pecho y tengo dificultad para respirar"
        )
        ai_response = result.get("ai_response", "")
        assert isinstance(ai_response, str)
        assert len(ai_response) > 10, "La respuesta IA está vacía o demasiado corta"

    @pytest.mark.asyncio
    async def test_urgency_score_in_valid_range(self, conversational_service):
        """urgency_score debe estar en el rango [0, 1]."""
        result = await conversational_service.analyze_conversation(
            "Tengo fiebre alta y tos fuerte"
        )
        score = result["analysis"].get("urgency_score", 0)
        assert 0.0 <= score <= 1.0, f"urgency_score fuera de rango: {score}"

    @pytest.mark.asyncio
    async def test_critical_urgency_triggers_follow_up(self, conversational_service):
        """Un escenario crítico siempre debe requerir seguimiento."""
        result = await conversational_service.analyze_conversation(
            "No puedo respirar, dolor severo en el pecho, emergencia médica"
        )
        assert result["analysis"]["follow_up_required"] is True

    @pytest.mark.asyncio
    async def test_low_urgency_with_mild_symptoms(self, conversational_service):
        """Síntomas muy leves no deben generar urgencia crítica."""
        result = await conversational_service.analyze_conversation(
            "Me siento un poco cansado, nada grave"
        )
        urgency = result["analysis"]["urgency_level"]
        assert urgency != "critical", (
            f"Síntomas leves clasificados incorrectamente como 'critical': {urgency}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# PatientFriendlyExplainer — Calidad de Explicaciones
# ═══════════════════════════════════════════════════════════════════════════════

EXPLAINER_CASES = [
    {
        "id": "EX-001",
        "disease": "asma",
        "confidence": 0.87,
        "urgency": "high",
        "symptoms": ["sibilancias", "dificultad respiratoria"],
        "min_explanation_len": 50,
    },
    {
        "id": "EX-002",
        "disease": "neumonia",
        "confidence": 0.94,
        "urgency": "critical",
        "symptoms": ["fiebre alta", "tos con flema", "dificultad respiratoria severa"],
        "min_explanation_len": 50,
    },
    {
        "id": "EX-003",
        "disease": "resfriado comun",
        "confidence": 0.75,
        "urgency": "low",
        "symptoms": ["congestion nasal", "estornudos"],
        "min_explanation_len": 30,
    },
    {
        "id": "EX-004",
        "disease": "epoc",
        "confidence": 0.82,
        "urgency": "medium",
        "symptoms": ["disnea", "tos crónica", "fatiga"],
        "min_explanation_len": 50,
    },
]


class TestPatientFriendlyExplainerQuality:
    """Evals de calidad sobre PatientFriendlyExplainer."""

    @pytest.mark.parametrize("case", EXPLAINER_CASES, ids=[c["id"] for c in EXPLAINER_CASES])
    def test_explanation_contains_disease_name(self, explainer, case):
        """La explicación debe mencionar el nombre de la enfermedad o su traducción."""
        result = explainer.explain_prediction(
            disease=case["disease"],
            confidence=case["confidence"],
            urgency_level=case["urgency"],
            symptoms=case["symptoms"],
        )
        summary = result.get("summary", "").lower()
        patient_disease = result.get("disease", "").lower()
        assert (
            case["disease"].lower() in summary
            or case["disease"].lower() in patient_disease
            or any(part in summary for part in case["disease"].lower().split())
        ), f"[{case['id']}] La enfermedad '{case['disease']}' no aparece en la explicación"

    @pytest.mark.parametrize("case", EXPLAINER_CASES, ids=[c["id"] for c in EXPLAINER_CASES])
    def test_explanation_contains_urgency_info(self, explainer, case):
        """La explicación debe indicar el nivel de urgencia."""
        result = explainer.explain_prediction(
            disease=case["disease"],
            confidence=case["confidence"],
            urgency_level=case["urgency"],
            symptoms=case["symptoms"],
        )
        urgency_text = result.get("urgency_explanation", "")
        assert urgency_text, f"[{case['id']}] urgency_explanation vacía"
        assert len(urgency_text) >= 10, f"[{case['id']}] urgency_explanation demasiado corta"

    @pytest.mark.parametrize("case", EXPLAINER_CASES, ids=[c["id"] for c in EXPLAINER_CASES])
    def test_explanation_summary_minimum_length(self, explainer, case):
        """El resumen debe tener longitud mínima para ser informativo."""
        result = explainer.explain_prediction(
            disease=case["disease"],
            confidence=case["confidence"],
            urgency_level=case["urgency"],
            symptoms=case["symptoms"],
        )
        summary = result.get("summary", "")
        assert len(summary) >= case["min_explanation_len"], (
            f"[{case['id']}] Resumen demasiado corto: {len(summary)} chars "
            f"(mínimo {case['min_explanation_len']})"
        )

    def test_high_confidence_explanation_reflects_certainty(self, explainer):
        """Alta confianza (>0.85) debe producir explicación sin expresar incertidumbre alta."""
        result = explainer.explain_prediction(
            disease="neumonia",
            confidence=0.94,
            urgency_level="critical",
            symptoms=["fiebre alta", "tos con flema"],
        )
        confidence_level = result.get("confidence_level", "")
        # Alta confianza → debe ser 'high' o 'very_high', no 'low'
        assert confidence_level != "low", (
            f"Confianza 0.94 clasificada como 'low': {confidence_level}"
        )

    def test_low_confidence_explanation_reflects_uncertainty(self, explainer):
        """Baja confianza (<0.5) debe producir explicación con nivel apropiado."""
        result = explainer.explain_prediction(
            disease="bronquitis",
            confidence=0.42,
            urgency_level="medium",
            symptoms=["tos"],
        )
        confidence_level = result.get("confidence_level", "")
        assert confidence_level in ("low", "medium"), (
            f"Confianza 0.42 no clasificada como 'low'/'medium': {confidence_level}"
        )

    def test_result_has_all_required_keys(self, explainer):
        """La explicación debe tener todas las claves de estructura requeridas."""
        result = explainer.explain_prediction(
            disease="asma",
            confidence=0.87,
            urgency_level="high",
            symptoms=["sibilancias"],
        )
        required_keys = ["disease", "summary", "urgency_explanation", "confidence_level"]
        for key in required_keys:
            assert key in result, f"Clave requerida ausente: '{key}'"

    def test_symptoms_list_included_in_explanation(self, explainer):
        """Los síntomas deben reflejarse en la explicación o en la lista de factores."""
        symptoms = ["sibilancias", "fatiga", "tos seca"]
        result = explainer.explain_prediction(
            disease="asma",
            confidence=0.87,
            urgency_level="high",
            symptoms=symptoms,
        )
        # Los síntomas deben estar en algún campo de la respuesta
        result_str = str(result).lower()
        detected = [s for s in symptoms if s.lower() in result_str]
        assert len(detected) >= 1, (
            f"Ninguno de los síntomas {symptoms} aparece en la explicación"
        )

    @pytest.mark.parametrize("confidence,expected_level", [
        (0.90, "high"),
        (0.65, "medium"),
        (0.35, "low"),
    ])
    def test_confidence_level_mapping(self, explainer, confidence, expected_level):
        """La confianza debe mapearse correctamente al nivel textual."""
        result = explainer.explain_prediction(
            disease="gripe",
            confidence=confidence,
            urgency_level="medium",
            symptoms=["fiebre", "tos"],
        )
        assert result.get("confidence_level") == expected_level, (
            f"Confianza {confidence} → nivel esperado '{expected_level}', "
            f"obtenido '{result.get('confidence_level')}'"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# OpenAIStrategy — Calidad del Parsing de Respuestas
# ═══════════════════════════════════════════════════════════════════════════════

class TestOpenAIStrategyResponseParsing:
    """Verifica que el parsing de respuestas del LLM produce resultados de calidad."""

    @pytest.fixture
    def strategy(self):
        from strategies.openai_strategy import OpenAIStrategy
        with patch("openai.AsyncOpenAI"):
            return OpenAIStrategy()

    # ── Parsing de síntomas ───────────────────────────────────────────────────

    def test_valid_json_response_parsed_correctly(self, strategy):
        """JSON válido de la API debe ser parseado a dict con todos los campos."""
        mock_response = """{
            "urgency_level": "high",
            "severity_score": 0.78,
            "categories": ["respiratory", "fever"],
            "recommendations": ["Consultar médico hoy", "Reposo"],
            "warning_signs": ["Dificultad respiratoria severa"],
            "follow_up_required": true
        }"""
        result = strategy._parse_ai_response(mock_response)
        assert result["urgency_level"] == "high"
        assert result["severity_score"] == 0.78
        assert "respiratory" in result["categories"]
        assert isinstance(result["recommendations"], list)
        assert result["follow_up_required"] is True

    def test_json_embedded_in_text_extracted_correctly(self, strategy):
        """JSON embebido en texto narrativo debe ser extraído y parseado."""
        mock_response = """Basándonos en los síntomas presentados, el análisis indica:
        {
            "urgency_level": "medium",
            "severity_score": 0.55,
            "categories": ["respiratory"],
            "recommendations": ["Hidratación", "Reposo"],
            "warning_signs": [],
            "follow_up_required": true
        }
        En resumen, el paciente debe descansar."""
        result = strategy._parse_ai_response(mock_response)
        assert result["urgency_level"] == "medium"
        assert result["severity_score"] == 0.55

    def test_malformed_json_triggers_fallback(self, strategy):
        """JSON inválido debe activar el fallback con valores seguros."""
        mock_response = "No puedo determinar los síntomas correctamente."
        result = strategy._parse_ai_response(mock_response)
        # El fallback debe devolver un dict con campos requeridos
        assert "urgency_level" in result
        assert "recommendations" in result
        assert "follow_up_required" in result

    def test_fallback_values_are_safe_defaults(self, strategy):
        """Los valores por defecto del fallback deben ser conservadores (medium, follow_up=True)."""
        result = strategy._fallback_parse_symptoms("Respuesta inesperada")
        assert result["urgency_level"] == "medium"
        assert result["follow_up_required"] is True
        assert len(result["recommendations"]) >= 1

    # ── Parsing de texto médico ───────────────────────────────────────────────

    def test_medical_text_valid_json_parsed(self, strategy):
        """JSON de análisis de texto médico debe parsearse correctamente."""
        mock_response = """{
            "entities": [{"text": "bronquitis", "type": "condition", "confidence": 0.9}],
            "symptoms": [{"symptom": "tos", "category": "respiratory", "confidence": 0.85}],
            "risk_factors": ["tabaquismo"],
            "diagnosis_suggestions": ["bronquitis aguda"],
            "recommendations": ["Antibióticos si bacterial", "Reposo"]
        }"""
        result = strategy._parse_medical_text_response(mock_response)
        assert len(result["entities"]) == 1
        assert result["entities"][0]["type"] == "condition"
        assert result["symptoms"][0]["symptom"] == "tos"

    def test_severity_score_in_valid_range(self, strategy):
        """severity_score del LLM debe estar en [0, 1]."""
        mock_response = """{
            "urgency_level": "critical",
            "severity_score": 0.95,
            "categories": ["respiratory"],
            "recommendations": ["Llamar al 112 inmediatamente"],
            "warning_signs": ["Cianosis"],
            "follow_up_required": true
        }"""
        result = strategy._parse_ai_response(mock_response)
        assert 0.0 <= result["severity_score"] <= 1.0

    # ── Formato de prompts ────────────────────────────────────────────────────

    def test_symptom_prompt_contains_instructions_in_spanish(self, strategy):
        """El prompt de análisis debe estar en español."""
        symptoms_text = "1. Tos seca\n2. Fiebre\n   Severidad: alta"
        prompt = strategy._create_symptom_analysis_prompt(symptoms_text)
        assert "urgencia" in prompt.lower() or "urgency" in prompt.lower()
        assert symptoms_text in prompt

    def test_symptom_prompt_requests_json_format(self, strategy):
        """El prompt debe solicitar explícitamente JSON como formato de respuesta."""
        prompt = strategy._create_symptom_analysis_prompt("tos, fiebre")
        assert "JSON" in prompt or "json" in prompt

    def test_medical_text_prompt_requests_json_format(self, strategy):
        """El prompt de texto médico debe solicitar JSON."""
        prompt = strategy._create_medical_text_prompt("Paciente con bronquitis aguda")
        assert "JSON" in prompt or "json" in prompt

    def test_prompt_includes_additional_context(self, strategy):
        """El contexto adicional debe incluirse en el prompt."""
        context = {"patient_age": 45, "chronic_conditions": ["asma"]}
        prompt = strategy._create_symptom_analysis_prompt("tos", context=context)
        assert "45" in prompt or "asma" in prompt or "contexto" in prompt.lower()

    def test_format_symptoms_for_ai_includes_all_fields(self, strategy):
        """_format_symptoms_for_ai debe incluir síntoma, severidad y duración."""
        symptoms = [
            {"symptom": "Tos severa", "severity": "alta", "duration": "3 días"},
            {"symptom": "Fiebre"},
        ]
        text = strategy._format_symptoms_for_ai(symptoms)
        assert "Tos severa" in text
        assert "alta" in text
        assert "3 días" in text
        assert "Fiebre" in text


# ═══════════════════════════════════════════════════════════════════════════════
# Evals de Coherencia — Urgencia ↔ Recomendaciones
# ═══════════════════════════════════════════════════════════════════════════════

class TestUrgencyCoherenceEvals:
    """Verifica que el nivel de urgencia y las recomendaciones son coherentes."""

    URGENCY_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}

    @pytest.mark.asyncio
    async def test_escalating_symptoms_produce_escalating_urgency(self, conversational_service):
        """Síntomas progresivamente más graves deben producir urgencias crecientes."""
        inputs = [
            "Me siento un poco cansado",
            "Tengo tos y fiebre moderada",
            "Tengo tos severa, fiebre alta y dificultad para respirar",
            "No puedo respirar, dolor severo en el pecho, emergencia médica",
        ]
        urgencies = []
        for msg in inputs:
            result = await conversational_service.analyze_conversation(msg)
            urgencies.append(result["analysis"]["urgency_level"])

        # Verificar que hay una tendencia creciente (no necesariamente estrictamente monótona)
        scores = [self.URGENCY_ORDER.get(u, 0) for u in urgencies]
        # El último debe ser >= al primero
        assert scores[-1] >= scores[0], (
            f"La urgencia no escala con los síntomas: {list(zip(inputs, urgencies))}"
        )

    @pytest.mark.asyncio
    async def test_critical_scenario_has_immediate_recommendations(self, conversational_service):
        """Un escenario crítico debe producir recomendaciones de acción inmediata."""
        result = await conversational_service.analyze_conversation(
            "No puedo respirar, dolor en el pecho, necesito emergencia"
        )
        urgency = result["analysis"]["urgency_level"]
        if urgency == "critical":
            ai_response = result.get("ai_response", "").lower()
            # La respuesta debe mencionar urgencia o acción inmediata
            has_urgency_language = any(
                word in ai_response
                for word in ["emergencia", "urgente", "inmediatamente", "médico", "llame", "112", "911"]
            )
            assert has_urgency_language, (
                f"Respuesta crítica sin lenguaje de urgencia: {ai_response[:200]}"
            )

    @pytest.mark.asyncio
    async def test_low_urgency_does_not_recommend_emergency(self, conversational_service):
        """Síntomas leves no deben recomendar llamar a emergencias."""
        result = await conversational_service.analyze_conversation(
            "Me siento un poco cansado hoy, nada grave"
        )
        urgency = result["analysis"]["urgency_level"]
        if urgency == "low":
            ai_response = result.get("ai_response", "").lower()
            # No debe recomendar llamar al 112 para síntomas leves
            assert "112" not in ai_response and "emergencia médica" not in ai_response, (
                f"Síntomas leves generan recomendación de emergencia: {ai_response[:200]}"
            )

    @pytest.mark.asyncio
    async def test_conversation_context_contains_message_length(self, conversational_service):
        """conversation_context debe registrar la longitud del mensaje."""
        msg = "Tengo tos y fiebre"
        result = await conversational_service.analyze_conversation(msg)
        ctx = result.get("conversation_context", {})
        assert ctx.get("message_length") == len(msg)

    @pytest.mark.asyncio
    async def test_conversation_context_keywords_detected_flag(self, conversational_service):
        """has_keywords debe ser True cuando se detectan síntomas."""
        result = await conversational_service.analyze_conversation(
            "Tengo tos, fiebre y dificultad para respirar"
        )
        ctx = result.get("conversation_context", {})
        assert ctx.get("has_keywords") is True

    @pytest.mark.asyncio
    async def test_multi_turn_history_does_not_break_analysis(self, conversational_service):
        """Con historial de conversación, el análisis debe completarse sin error."""
        history = [
            {"role": "user", "content": "Hola, tengo tos desde ayer"},
            {"role": "assistant", "content": "Entiendo, ¿tiene fiebre también?"},
        ]
        result = await conversational_service.analyze_conversation(
            "Sí, tengo fiebre alta y me cuesta respirar",
            conversation_history=history,
        )
        assert "analysis" in result
        assert "urgency_level" in result["analysis"]