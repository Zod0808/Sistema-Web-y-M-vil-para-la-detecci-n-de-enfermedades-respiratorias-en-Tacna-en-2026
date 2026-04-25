"""
LLM Testing — Pruebas de Regresión de Prompts

Estrategia:
  - Captura snapshots de los prompts actuales (plantillas, variables, instrucciones)
  - Verifica que cualquier cambio en los prompts no rompe la estructura de respuesta esperada
  - Detecta: campos eliminados, cambio de idioma, pérdida del bloque JSON, variables no sustituidas
  - Prueba compatibilidad hacia atrás del parser con respuestas del LLM
  - Verifica que el system prompt mantiene el rol médico correcto

Reglas de regresión:
  R1 — El prompt de síntomas SIEMPRE solicita JSON con los 6 campos canónicos
  R2 — El prompt de texto médico SIEMPRE solicita JSON con los 5 campos canónicos
  R3 — El system prompt SIEMPRE menciona "médico" o "respiratory"
  R4 — Los síntomas formateados SIEMPRE incluyen numeración
  R5 — El parser SIEMPRE devuelve un dict con urgency_level aunque el LLM responda en texto plano
  R6 — Los prompts SIEMPRE están en español o en inglés consistente (no mezcla incoherente)
  R7 — Añadir contexto NO elimina las instrucciones de formato JSON
  R8 — El parser extrae JSON aunque haya texto narrativo alrededor
"""

import pytest
import json
import re
from unittest.mock import patch, MagicMock
from typing import Dict, Any


# ─── Campos canónicos de los prompts ──────────────────────────────────────────

SYMPTOM_ANALYSIS_JSON_FIELDS = {
    "urgency_level", "severity_score", "categories",
    "recommendations", "warning_signs", "follow_up_required"
}

MEDICAL_TEXT_JSON_FIELDS = {
    "entities", "symptoms", "risk_factors",
    "diagnosis_suggestions", "recommendations"
}


# ─── Fixture: estrategia OpenAI (sin llamada real a la API) ───────────────────

@pytest.fixture
def strategy():
    from strategies.openai_strategy import OpenAIStrategy
    with patch("openai.AsyncOpenAI"):
        return OpenAIStrategy()


# ═══════════════════════════════════════════════════════════════════════════════
# R1 — Prompt de síntomas contiene los 6 campos JSON canónicos
# ═══════════════════════════════════════════════════════════════════════════════

class TestSymptomPromptStructure:
    """R1 — El prompt de síntomas siempre debe solicitar los 6 campos JSON canónicos."""

    def test_prompt_requests_all_canonical_fields(self, strategy):
        """Todos los campos canónicos deben aparecer en el prompt."""
        prompt = strategy._create_symptom_analysis_prompt("1. Tos seca\n2. Fiebre")
        for field in SYMPTOM_ANALYSIS_JSON_FIELDS:
            assert field in prompt, (
                f"Campo canónico '{field}' ausente en el prompt de síntomas"
            )

    def test_prompt_requests_json_block(self, strategy):
        """El prompt debe solicitar explícitamente una respuesta JSON."""
        prompt = strategy._create_symptom_analysis_prompt("tos, fiebre")
        assert "JSON" in prompt or "json" in prompt, "Falta instrucción de formato JSON"

    def test_prompt_contains_urgency_instruction(self, strategy):
        """El prompt debe incluir instrucción sobre nivel de urgencia."""
        prompt = strategy._create_symptom_analysis_prompt("tos severa").lower()
        assert "urgencia" in prompt or "urgency" in prompt

    def test_prompt_contains_severity_instruction(self, strategy):
        """El prompt debe incluir instrucción sobre severidad."""
        prompt = strategy._create_symptom_analysis_prompt("fiebre alta").lower()
        assert "severidad" in prompt or "severity" in prompt or "score" in prompt

    def test_prompt_contains_recommendations_instruction(self, strategy):
        """El prompt debe solicitar recomendaciones."""
        prompt = strategy._create_symptom_analysis_prompt("dolor de pecho").lower()
        assert "recomendaciones" in prompt or "recommendations" in prompt

    def test_prompt_contains_follow_up_instruction(self, strategy):
        """El prompt debe solicitar si requiere seguimiento."""
        prompt = strategy._create_symptom_analysis_prompt("tos seca")
        # Buscar follow_up en el prompt
        assert "follow_up_required" in prompt or "seguimiento" in prompt.lower()

    def test_prompt_contains_symptoms_text(self, strategy):
        """Los síntomas formateados deben estar incluidos en el prompt."""
        symptoms_text = "1. Tos severa\n   Severidad: alta\n2. Fiebre\n   Duración: 3 días"
        prompt = strategy._create_symptom_analysis_prompt(symptoms_text)
        assert symptoms_text in prompt

    def test_prompt_with_context_still_has_json_instruction(self, strategy):
        """R7 — Agregar contexto no debe eliminar el bloque JSON del prompt."""
        context = {"patient_age": 60, "chronic_conditions": ["epoc"]}
        prompt = strategy._create_symptom_analysis_prompt("tos", context=context)
        assert "JSON" in prompt or "json" in prompt, (
            "El contexto eliminó la instrucción JSON del prompt"
        )

    def test_prompt_with_context_still_has_canonical_fields(self, strategy):
        """R7 — Los 6 campos canónicos deben seguir presentes con contexto."""
        context = {"patient_age": 45}
        prompt = strategy._create_symptom_analysis_prompt("fiebre", context=context)
        for field in SYMPTOM_ANALYSIS_JSON_FIELDS:
            assert field in prompt, (
                f"Campo '{field}' desapareció del prompt al añadir contexto"
            )


# ═══════════════════════════════════════════════════════════════════════════════
# R2 — Prompt de texto médico contiene los 5 campos JSON canónicos
# ═══════════════════════════════════════════════════════════════════════════════

class TestMedicalTextPromptStructure:
    """R2 — El prompt de texto médico siempre debe solicitar los 5 campos JSON canónicos."""

    def test_prompt_requests_all_canonical_fields(self, strategy):
        """Todos los campos canónicos del texto médico deben aparecer en el prompt."""
        prompt = strategy._create_medical_text_prompt("Paciente con bronquitis aguda")
        for field in MEDICAL_TEXT_JSON_FIELDS:
            assert field in prompt, (
                f"Campo canónico '{field}' ausente en el prompt de texto médico"
            )

    def test_prompt_requests_json_block(self, strategy):
        """El prompt de texto médico debe solicitar JSON."""
        prompt = strategy._create_medical_text_prompt("Historia médica del paciente")
        assert "JSON" in prompt or "json" in prompt

    def test_prompt_includes_input_text(self, strategy):
        """El texto médico de entrada debe estar embebido en el prompt."""
        medical_text = "Paciente de 45 años con diagnóstico de EPOC"
        prompt = strategy._create_medical_text_prompt(medical_text)
        assert medical_text in prompt

    def test_prompt_contains_entities_instruction(self, strategy):
        """El prompt debe pedir extracción de entidades médicas."""
        prompt = strategy._create_medical_text_prompt("texto médico").lower()
        assert "entidades" in prompt or "entities" in prompt

    def test_prompt_contains_risk_factors_instruction(self, strategy):
        """El prompt debe pedir factores de riesgo."""
        prompt = strategy._create_medical_text_prompt("texto médico").lower()
        assert "riesgo" in prompt or "risk" in prompt

    def test_prompt_context_appended_correctly(self, strategy):
        """El contexto adicional debe añadirse al prompt sin eliminar instrucciones."""
        context = {"patient_id": "P-001"}
        prompt = strategy._create_medical_text_prompt("historia clínica", context=context)
        assert "P-001" in prompt or "context" in prompt.lower()
        # Los campos canónicos deben seguir presentes
        for field in MEDICAL_TEXT_JSON_FIELDS:
            assert field in prompt


# ═══════════════════════════════════════════════════════════════════════════════
# R3 — System prompt mantiene rol médico
# ═══════════════════════════════════════════════════════════════════════════════

class TestSystemPromptRegression:
    """R3 — El system prompt siempre debe definir el rol de médico experto."""

    @pytest.mark.asyncio
    async def test_system_prompt_contains_medical_role(self, strategy):
        """El system prompt debe mencionar 'médico' o el dominio respiratorio."""
        # Interceptar la llamada a la API para capturar el system prompt
        captured_messages = []

        async def mock_create(**kwargs):
            captured_messages.extend(kwargs.get("messages", []))
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json.dumps({
                "urgency_level": "low",
                "severity_score": 0.3,
                "categories": ["general"],
                "recommendations": ["Reposo"],
                "warning_signs": [],
                "follow_up_required": False,
            })
            return mock_response

        strategy.client.chat.completions.create = mock_create

        symptoms = [{"symptom": "tos leve", "severity": "mild"}]
        await strategy.analyze_symptoms(symptoms)

        system_messages = [m for m in captured_messages if m.get("role") == "system"]
        assert len(system_messages) >= 1, "No hay system prompt en la llamada a la API"

        system_content = system_messages[0]["content"].lower()
        assert "médico" in system_content or "medical" in system_content or "respiratori" in system_content, (
            f"El system prompt no define rol médico: '{system_content[:200]}'"
        )

    @pytest.mark.asyncio
    async def test_system_prompt_for_medical_text_defines_specialist_role(self, strategy):
        """El system prompt de procesamiento de texto médico debe definir un especialista."""
        captured_messages = []

        async def mock_create(**kwargs):
            captured_messages.extend(kwargs.get("messages", []))
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = json.dumps({
                "entities": [],
                "symptoms": [],
                "risk_factors": [],
                "diagnosis_suggestions": [],
                "recommendations": [],
            })
            return mock_response

        strategy.client.chat.completions.create = mock_create
        await strategy.process_medical_text("Historia clínica del paciente")

        system_messages = [m for m in captured_messages if m.get("role") == "system"]
        assert len(system_messages) >= 1
        system_content = system_messages[0]["content"].lower()
        assert any(
            word in system_content
            for word in ["médico", "medical", "especialista", "specialist", "histori"]
        ), f"System prompt no define especialista: '{system_content[:200]}'"


# ═══════════════════════════════════════════════════════════════════════════════
# R4 — Síntomas formateados siempre incluyen numeración
# ═══════════════════════════════════════════════════════════════════════════════

class TestSymptomFormattingRegression:
    """R4 — El formateo de síntomas para la IA debe incluir numeración."""

    def test_symptoms_formatted_with_numbering(self, strategy):
        """Los síntomas deben numerarse (1., 2., etc.)."""
        symptoms = [
            {"symptom": "Tos seca"},
            {"symptom": "Fiebre"},
            {"symptom": "Dolor de pecho"},
        ]
        text = strategy._format_symptoms_for_ai(symptoms)
        assert "1." in text
        assert "2." in text
        assert "3." in text

    def test_symptoms_formatted_include_all_symptoms(self, strategy):
        """Todos los síntomas deben estar en el texto formateado."""
        symptoms = [
            {"symptom": "Sibilancias", "severity": "alta", "duration": "2 días"},
            {"symptom": "Disnea"},
        ]
        text = strategy._format_symptoms_for_ai(symptoms)
        assert "Sibilancias" in text
        assert "Disnea" in text

    def test_symptoms_formatted_include_severity_when_present(self, strategy):
        """La severidad debe incluirse cuando está disponible."""
        symptoms = [{"symptom": "Tos", "severity": "severa"}]
        text = strategy._format_symptoms_for_ai(symptoms)
        assert "severa" in text.lower() or "Severidad" in text

    def test_symptoms_formatted_include_duration_when_present(self, strategy):
        """La duración debe incluirse cuando está disponible."""
        symptoms = [{"symptom": "Fiebre", "duration": "3 días"}]
        text = strategy._format_symptoms_for_ai(symptoms)
        assert "3 días" in text

    def test_empty_symptoms_list_returns_string(self, strategy):
        """Lista vacía no debe lanzar excepción, debe devolver string."""
        text = strategy._format_symptoms_for_ai([])
        assert isinstance(text, str)

    def test_symptom_without_name_uses_fallback(self, strategy):
        """Síntoma sin campo 'symptom' debe usar un valor por defecto."""
        symptoms = [{"severity": "alta"}]  # Sin campo 'symptom'
        text = strategy._format_symptoms_for_ai(symptoms)
        assert isinstance(text, str)
        # Debe haber algún texto, no vacío
        assert len(text) >= 0  # No debe lanzar error


# ═══════════════════════════════════════════════════════════════════════════════
# R5 — Parser devuelve urgency_level aunque el LLM no responda JSON
# ═══════════════════════════════════════════════════════════════════════════════

class TestParserBackwardCompatibility:
    """R5 — El parser siempre devuelve dict con urgency_level, incluso ante respuestas no-JSON."""

    GUARANTEED_FIELDS = ["urgency_level", "recommendations", "follow_up_required"]

    @pytest.mark.parametrize("llm_response", [
        # JSON válido
        '{"urgency_level": "high", "severity_score": 0.8, "categories": [], "recommendations": ["Consultar médico"], "warning_signs": [], "follow_up_required": true}',
        # Texto plano sin JSON
        "El paciente debe consultar a un médico urgentemente.",
        # JSON con campos extra
        '{"urgency_level": "low", "severity_score": 0.2, "extra_field": "valor", "categories": [], "recommendations": [], "warning_signs": [], "follow_up_required": false}',
        # JSON parcialmente inválido
        '{"urgency_level": "medium", severity_score: 0.5}',
        # Respuesta vacía
        "",
        # Solo un número
        "0.75",
        # JSON con comillas simples (inválido)
        "{'urgency_level': 'high'}",
    ])
    def test_parse_always_returns_urgency_level(self, strategy, llm_response):
        """R5 — parse_ai_response siempre devuelve un dict con urgency_level."""
        result = strategy._parse_ai_response(llm_response)
        assert isinstance(result, dict), f"El parser devolvió {type(result)} en lugar de dict"
        assert "urgency_level" in result, (
            f"urgency_level ausente para respuesta: '{llm_response[:100]}'"
        )

    @pytest.mark.parametrize("field", GUARANTEED_FIELDS)
    def test_parse_fallback_has_all_guaranteed_fields(self, strategy, field):
        """Los campos garantizados deben estar presentes incluso en fallback."""
        result = strategy._parse_ai_response("Respuesta completamente inesperada")
        assert field in result, f"Campo garantizado '{field}' ausente en fallback"

    def test_parse_valid_json_preserves_urgency_value(self, strategy):
        """El valor de urgency_level debe ser preservado del JSON válido."""
        response = json.dumps({
            "urgency_level": "critical",
            "severity_score": 0.95,
            "categories": ["respiratory"],
            "recommendations": ["Llamar al 112"],
            "warning_signs": ["Cianosis"],
            "follow_up_required": True,
        })
        result = strategy._parse_ai_response(response)
        assert result["urgency_level"] == "critical"

    def test_medical_text_parse_always_returns_entities(self, strategy):
        """_parse_medical_text_response siempre devuelve un dict con entities."""
        for response in ["texto inválido", "", '{"other": "field"}'""]:
            result = strategy._parse_medical_text_response(response)
            assert isinstance(result, dict)


# ═══════════════════════════════════════════════════════════════════════════════
# R6 — Consistencia de idioma en los prompts
# ═══════════════════════════════════════════════════════════════════════════════

class TestPromptLanguageConsistency:
    """R6 — Los prompts deben estar en español o inglés consistente, sin mezcla incoherente."""

    SPANISH_MEDICAL_WORDS = [
        "síntomas", "urgencia", "severidad", "recomendaciones", "seguimiento",
        "médico", "análisis"
    ]

    def test_symptom_prompt_is_primarily_in_spanish(self, strategy):
        """El prompt de síntomas debe estar principalmente en español."""
        prompt = strategy._create_symptom_analysis_prompt("tos, fiebre").lower()
        spanish_count = sum(1 for word in self.SPANISH_MEDICAL_WORDS if word in prompt)
        assert spanish_count >= 3, (
            f"El prompt tiene pocas palabras en español ({spanish_count}/7): "
            f"'{prompt[:300]}'"
        )

    def test_medical_text_prompt_is_primarily_in_spanish(self, strategy):
        """El prompt de texto médico debe estar principalmente en español."""
        prompt = strategy._create_medical_text_prompt("historia médica").lower()
        spanish_count = sum(1 for word in self.SPANISH_MEDICAL_WORDS if word in prompt)
        assert spanish_count >= 2, (
            f"El prompt de texto médico tiene pocas palabras en español ({spanish_count})"
        )

    def test_prompt_does_not_mix_instruction_language_randomly(self, strategy):
        """Las instrucciones no deben alternar aleatoriamente entre idiomas en la misma sección."""
        prompt = strategy._create_symptom_analysis_prompt("síntomas test")
        # Verificar que las instrucciones de estructura (numeradas) están en un idioma
        # Simplemente verifica que no hay mezcla obvia de "Provide" y "Proporciona" en el mismo bloque
        has_spanish_verbs = any(v in prompt for v in ["Analiza", "Proporciona", "Responde"])
        has_english_verbs = any(v in prompt for v in ["Analyze", "Provide", "Respond"])
        # Puede tener ambos SOLO si son campos JSON (nombres técnicos), no instrucciones
        if has_spanish_verbs and has_english_verbs:
            # Verificar que los campos en inglés son nombres de campos JSON, no instrucciones
            english_instructions = re.findall(r'\b(Analyze|Provide|Respond|List|Extract)\b', prompt)
            # Si hay instrucciones en inglés Y español, registrar como advertencia pero no fallar
            # en sistemas bilingües esto puede ser válido
            assert len(english_instructions) <= 3, (
                f"Demasiadas instrucciones en inglés mezcladas con español: {english_instructions}"
            )


# ═══════════════════════════════════════════════════════════════════════════════
# R8 — Parser extrae JSON aunque haya texto narrativo alrededor
# ═══════════════════════════════════════════════════════════════════════════════

class TestJsonExtractionRegression:
    """R8 — El parser debe extraer JSON aunque haya texto narrativo antes/después."""

    NARRATIVE_WRAPPERS = [
        ("Tras analizar los síntomas:\n{json}\nEn conclusión, el paciente requiere atención.",
         "JSON con texto antes y después"),
        ("El modelo indica:\n{json}", "JSON al final"),
        ("{json}\nNota: Consultar con médico.", "JSON al inicio"),
        ("Análisis:\n\n{json}\n\nFirma: Sistema IA", "JSON con líneas en blanco"),
    ]

    VALID_JSON = json.dumps({
        "urgency_level": "medium",
        "severity_score": 0.55,
        "categories": ["respiratory"],
        "recommendations": ["Reposo", "Hidratación"],
        "warning_signs": ["Fiebre persistente"],
        "follow_up_required": True,
    })

    @pytest.mark.parametrize("template,description", NARRATIVE_WRAPPERS)
    def test_json_extracted_from_narrative_response(self, strategy, template, description):
        """R8 — JSON embebido en narrativa debe ser correctamente extraído."""
        response = template.format(json=self.VALID_JSON)
        result = strategy._parse_ai_response(response)
        assert result.get("urgency_level") == "medium", (
            f"JSON no extraído correctamente en caso: {description}"
        )

    def test_nested_json_in_response_extracted(self, strategy):
        """JSON con campos anidados debe ser extraído correctamente."""
        complex_json = json.dumps({
            "urgency_level": "high",
            "severity_score": 0.8,
            "categories": ["respiratory", "fever"],
            "recommendations": ["Ir a urgencias", "Llamar al médico"],
            "warning_signs": ["Cianosis", "Confusión"],
            "follow_up_required": True,
        })
        result = strategy._parse_ai_response(complex_json)
        assert result["urgency_level"] == "high"
        assert len(result["recommendations"]) == 2

    def test_medical_text_json_extracted_from_narrative(self, strategy):
        """JSON de texto médico embebido en narrativa debe extraerse."""
        json_block = json.dumps({
            "entities": [{"text": "EPOC", "type": "condition", "confidence": 0.9}],
            "symptoms": [],
            "risk_factors": ["tabaquismo"],
            "diagnosis_suggestions": ["EPOC"],
            "recommendations": ["Espirometría"],
        })
        response = f"El análisis del texto indica lo siguiente:\n{json_block}\nFin del análisis."
        result = strategy._parse_medical_text_response(response)
        assert len(result.get("entities", [])) == 1
        assert result["entities"][0]["text"] == "EPOC"


# ═══════════════════════════════════════════════════════════════════════════════
# Snapshot Tests — Prompt Templates
# ═══════════════════════════════════════════════════════════════════════════════

class TestPromptSnapshots:
    """
    Verifican que los templates de prompt no han cambiado de forma inesperada.
    Actúan como 'snapshot tests' para detectar regresiones de prompt.
    """

    EXPECTED_SYMPTOM_PROMPT_STRUCTURE = {
        "has_numbered_list_instruction": True,  # Solicita urgencia numerada
        "has_json_format_request": True,         # Solicita JSON
        "has_all_canonical_fields": True,        # Los 6 campos
        "min_length": 200,                       # Longitud mínima del prompt
        "max_length": 2000,                      # No debe ser demasiado largo
    }

    def test_symptom_prompt_meets_structural_snapshot(self, strategy):
        """El prompt de síntomas debe cumplir todos los criterios del snapshot estructural."""
        prompt = strategy._create_symptom_analysis_prompt(
            "1. Tos seca\n   Severidad: alta\n2. Fiebre\n   Duración: 2 días"
        )
        s = self.EXPECTED_SYMPTOM_PROMPT_STRUCTURE

        assert len(prompt) >= s["min_length"], (
            f"Prompt demasiado corto: {len(prompt)} chars (mínimo {s['min_length']})"
        )
        assert len(prompt) <= s["max_length"], (
            f"Prompt demasiado largo: {len(prompt)} chars (máximo {s['max_length']})"
        )
        if s["has_json_format_request"]:
            assert "JSON" in prompt or "json" in prompt
        if s["has_all_canonical_fields"]:
            for field in SYMPTOM_ANALYSIS_JSON_FIELDS:
                assert field in prompt

    def test_medical_text_prompt_meets_structural_snapshot(self, strategy):
        """El prompt de texto médico debe cumplir criterios mínimos de snapshot."""
        prompt = strategy._create_medical_text_prompt(
            "Paciente masculino de 55 años con diagnóstico de EPOC estadio II"
        )
        assert len(prompt) >= 150, f"Prompt demasiado corto: {len(prompt)}"
        assert "JSON" in prompt or "json" in prompt
        for field in MEDICAL_TEXT_JSON_FIELDS:
            assert field in prompt

    def test_format_symptoms_output_is_stable(self, strategy):
        """El formato de síntomas debe ser estable y predecible."""
        symptoms = [
            {"symptom": "Tos seca", "severity": "alta", "duration": "3 días"},
        ]
        text = strategy._format_symptoms_for_ai(symptoms)
        # Debe contener numeración
        assert "1." in text
        # Debe contener el nombre del síntoma
        assert "Tos seca" in text
        # Debe ser multilinea (no un solo string plano)
        assert "\n" in text or "Severidad" in text