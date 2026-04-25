"""
NLP Avanzado - Stub para procesamiento de lenguaje natural médico.

Incluye métodos para:
- Procesamiento general (tokenización normalizada)
- Extracción de entidades médicas (NER)
- Resumen de historias médicas
- Traducción de términos (simple diccionario)
- Análisis de sentimiento (heurístico)
"""
from typing import List, Dict, Any, Optional


class MedicalNLPProcessor:
    def __init__(self, language: str = "es") -> None:
        self.language = language

    def process_text(self, text: str) -> Dict[str, Any]:
        tokens = [t.strip(".,;:!?").lower() for t in text.split() if t.strip()]
        return {"text": text, "tokens": tokens, "language": self.language}

    def extract_entities(self, text: str) -> Dict[str, Any]:
        # Heurística simple NER
        entities: List[Dict[str, Any]] = []
        symptom_keywords = ["tos", "fiebre", "disnea", "dolor", "cefalea"]
        disease_keywords = ["asma", "neumonía", "bronquitis", "covid-19", "epoc"]
        drug_keywords = ["paracetamol", "ibuprofeno", "salbutamol"]

        tl = text.lower()
        for w in symptom_keywords:
            if w in tl:
                entities.append({"text": w, "label": "SYMPTOM"})
        for w in disease_keywords:
            if w in tl:
                entities.append({"text": w, "label": "DISEASE"})
        for w in drug_keywords:
            if w in tl:
                entities.append({"text": w, "label": "DRUG"})
        return {"text": text, "entities": entities}

    def summarize(self, text: str, max_sentences: int = 2) -> Dict[str, Any]:
        # Resumen naive por oraciones
        sentences = [s.strip() for s in text.replace("?", ".").replace("!", ".").split(".") if s.strip()]
        summary = ". ".join(sentences[:max_sentences])
        if summary and not summary.endswith("."):
            summary += "."
        return {"text": text, "summary": summary or text}

    def translate_term(self, term: str, target_language: str = "en") -> Dict[str, Any]:
        # Diccionario mínimo de muestra
        es_en = {
            "asma": "asthma",
            "neumonía": "pneumonia",
            "bronquitis": "bronchitis",
            "tos": "cough",
            "fiebre": "fever",
            "disnea": "dyspnea",
        }
        en_es = {v: k for k, v in es_en.items()}
        if self.language == "es" and target_language == "en":
            translated = es_en.get(term.lower(), term)
        elif self.language == "en" and target_language == "es":
            translated = en_es.get(term.lower(), term)
        else:
            translated = term
        return {"term": term, "translated": translated, "from": self.language, "to": target_language}

    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        # Heurística simple por palabras clave
        positive = ["mejor", "bien", "estable"]
        negative = ["peor", "dolor", "mal", "grave"]
        score = 0
        tl = text.lower()
        score += sum(1 for p in positive if p in tl)
        score -= sum(1 for n in negative if n in tl)
        label = "neutral"
        if score > 0:
            label = "positive"
        elif score < 0:
            label = "negative"
        return {"text": text, "score": score, "label": label}


