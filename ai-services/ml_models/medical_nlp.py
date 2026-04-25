"""
MedicalNLPProcessor - Stub de NLP avanzado para dominio médico.

Funciones incluidas (stubs):
- process_text: preprocesamiento/normalización médica
- extract_entities: NER médica básica
- summarize: resumen de historias médicas
- translate_terms: traducción de términos médicos
- sentiment: análisis de sentimiento en notas
"""
from typing import List, Dict, Any, Optional


class MedicalNLPProcessor:
    def __init__(self, language: str = "es") -> None:
        self.language = language

    def process_text(self, text: str) -> Dict[str, Any]:
        """Normaliza y tokeniza texto (stub)."""
        tokens = [t.strip(".,;:¡!¿?").lower() for t in text.split() if t.strip()]
        return {
            "language": self.language,
            "length": len(text),
            "tokens": tokens,
            "num_tokens": len(tokens),
        }

    def extract_entities(self, text: str) -> Dict[str, Any]:
        """NER médica (stub): detecta algunos patrones y términos frecuentes."""
        entities: List[Dict[str, Any]] = []
        keywords = {
            "symptom": ["tos", "fiebre", "disnea", "dolor", "fatiga"],
            "drug": ["paracetamol", "ibuprofeno", "amoxicilina"],
            "condition": ["asma", "neumonía", "epoc", "bronquitis", "covid-19"],
        }
        lower = text.lower()
        for label, terms in keywords.items():
            for term in terms:
                if term in lower:
                    entities.append({"text": term, "label": label, "confidence": 0.7})
        return {"entities": entities, "count": len(entities)}

    def summarize(self, text: str, max_sentences: int = 2) -> Dict[str, Any]:
        """Resumen simple (stub): devuelve primeras oraciones limitadas."""
        parts = [p.strip() for p in text.replace("\n", " ").split(".") if p.strip()]
        summary = ". ".join(parts[:max_sentences])
        if summary and not summary.endswith("."):
            summary += "."
        return {"summary": summary or text[:140], "sentences_used": min(len(parts), max_sentences)}

    def translate_terms(self, terms: List[str], target_language: str = "en") -> Dict[str, Any]:
        """Traducción de términos (stub): mapeo fijo de algunos términos médicos."""
        dictionary = {
            "es": {
                "tos": "cough",
                "fiebre": "fever",
                "disnea": "dyspnea",
                "asma": "asthma",
                "neumonía": "pneumonia",
            }
        }
        translations: Dict[str, str] = {}
        for term in terms:
            translations[term] = dictionary.get("es", {}).get(term.lower(), term)
        return {"target_language": target_language, "translations": translations}

    def sentiment(self, text: str) -> Dict[str, Any]:
        """Análisis de sentimiento (stub): heurística simple por palabras clave."""
        lower = text.lower()
        negative = any(w in lower for w in ["dolor", "grave", "peor", "fatal", "mal"])
        positive = any(w in lower for w in ["mejor", "bien", "estable", "leve"])
        label = "neutral"
        score = 0.5
        if negative and not positive:
            label, score = "negative", 0.8
        elif positive and not negative:
            label, score = "positive", 0.8
        elif positive and negative:
            label, score = "mixed", 0.6
        return {"label": label, "score": score}


