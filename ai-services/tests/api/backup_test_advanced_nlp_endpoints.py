from fastapi.testclient import TestClient

try:
  from main import app  # type: ignore
except Exception:
  import sys
  import os
  sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
  from main import app  # type: ignore

client = TestClient(app)


def test_nlp_process_smoke():
    payload = {"text": "Paciente con tos y fiebre.", "language": "es"}
    resp = client.post("/api/v1/nlp/advanced/process", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("status") == "success"
    assert "tokens" in data["result"]


def test_nlp_ner_smoke():
    payload = {"text": "Diagnóstico probable: neumonía. Tratamiento con paracetamol.", "language": "es"}
    resp = client.post("/api/v1/nlp/advanced/ner", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("status") == "success"
    assert "entities" in data["result"]


def test_nlp_summarize_smoke():
    payload = {"text": "Primera oración. Segunda oración. Tercera oración.", "language": "es"}
    resp = client.post("/api/v1/nlp/advanced/summarize", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("status") == "success"
    assert "summary" in data["result"]


def test_nlp_translate_smoke():
    payload = {"term": "asma", "source_language": "es", "target_language": "en"}
    resp = client.post("/api/v1/nlp/advanced/translate", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("status") == "success"
    assert data["result"]["translated"] in ["asthma", "asma"]


def test_nlp_sentiment_smoke():
    payload = {"text": "El paciente se encuentra mejor y estable.", "language": "es"}
    resp = client.post("/api/v1/nlp/advanced/sentiment", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("status") == "success"
    assert data["result"]["label"] in ["positive", "neutral", "negative"]


