import json
from fastapi.testclient import TestClient

try:
  # Import app from main
  from main import app  # type: ignore
except Exception:
  # Fallback when running within package context
  import sys
  import os
  sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
  from main import app  # type: ignore


client = TestClient(app)


def test_advanced_text_inference_smoke():
    payload = {
        "texts": ["Paciente con tos seca y disnea desde hace 3 días."],
        "model_name": "bert-base-uncased",
    }
    resp = client.post("/api/v1/ml/advanced/text", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("status") == "success"
    assert isinstance(data.get("count"), int)
    assert isinstance(data.get("predictions"), list)
    assert len(data["predictions"]) == 1
    pred = data["predictions"][0]
    assert "labels" in pred and "scores" in pred and "top_label" in pred


def test_advanced_image_inference_smoke():
    payload = {
        "images": ["/tmp/mock_image.jpg"],
        "model_name": "resnet50",
    }
    resp = client.post("/api/v1/ml/advanced/image", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("status") == "success"
    assert isinstance(data.get("count"), int)
    assert isinstance(data.get("predictions"), list)
    assert len(data["predictions"]) == 1
    pred = data["predictions"][0]
    assert "labels" in pred and "scores" in pred and "top_label" in pred


def test_advanced_timeseries_forecast_smoke():
    payload = {
        "series": [
            {"date": "2025-11-01T00:00:00Z", "value": 2.1},
            {"date": "2025-11-02T00:00:00Z", "value": 2.4},
        ],
        "model_type": "simple-linear",
        "horizon_days": 5,
    }
    resp = client.post("/api/v1/ml/advanced/timeseries", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data.get("status") == "success"
    assert data.get("horizon_days") == 5
    assert isinstance(data.get("forecast"), list)
    assert len(data["forecast"]) == 5
    point = data["forecast"][0]
    assert "date" in point and "predicted" in point and "confidence" in point


