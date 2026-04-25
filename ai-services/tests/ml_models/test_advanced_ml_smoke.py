"""
Smoke Tests para ML Avanzado
Tests rápidos para verificar que los servicios ML avanzados (NLP, AutoML, RL, FL) funcionan correctamente
"""

import pytest
from fastapi.testclient import TestClient
import numpy as np
from typing import Dict, Any

try:
    from main import app  # type: ignore
except Exception:
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from main import app  # type: ignore

client = TestClient(app)


class TestAdvancedNLPSmoke:
    """Smoke tests para NLP Avanzado"""

    def test_nlp_process_text(self):
        """Test básico de procesamiento de texto"""
        payload = {"text": "Paciente con tos persistente y fiebre alta.", "language": "es"}
        resp = client.post("/api/v1/nlp/advanced/process", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "success"
        assert "tokens" in data["result"]
        assert len(data["result"]["tokens"]) > 0

    def test_nlp_extract_entities(self):
        """Test de extracción de entidades médicas (NER)"""
        payload = {
            "text": "Diagnóstico: neumonía. Tratamiento con paracetamol y salbutamol.",
            "language": "es"
        }
        resp = client.post("/api/v1/nlp/advanced/ner", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "success"
        assert "entities" in data["result"]
        assert isinstance(data["result"]["entities"], list)

    def test_nlp_summarize_medical_text(self):
        """Test de resumen de texto médico"""
        payload = {
            "text": "El paciente presenta tos seca desde hace 3 días. Fiebre de 38.5°C. Saturación de oxígeno normal. Se indica reposo y paracetamol.",
            "language": "es",
            "max_sentences": 2
        }
        resp = client.post("/api/v1/nlp/advanced/summarize", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "success"
        assert "summary" in data["result"]
        assert len(data["result"]["summary"]) > 0

    def test_nlp_translate_medical_term(self):
        """Test de traducción de términos médicos"""
        payload = {
            "term": "asma",
            "source_language": "es",
            "target_language": "en"
        }
        resp = client.post("/api/v1/nlp/advanced/translate", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "success"
        assert "translated" in data["result"]

    def test_nlp_sentiment_analysis(self):
        """Test de análisis de sentimiento en texto médico"""
        payload = {
            "text": "El paciente se encuentra estable y mejorando. Pronóstico favorable.",
            "language": "es"
        }
        resp = client.post("/api/v1/nlp/advanced/sentiment", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "success"
        assert "sentiment" in data["result"]
        assert "score" in data["result"]


class TestAutoMLSmoke:
    """Smoke tests para AutoML"""

    def test_automl_select_model(self):
        """Test de selección automática de modelo"""
        payload = {
            "task_type": "classification",
            "candidates": ["xgboost", "random_forest", "neural_net"]
        }
        resp = client.post("/api/v1/automl/select_model", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"
        assert "selected_model" in data
        assert data["selected_model"] in ["xgboost", "random_forest", "neural_net", "logistic_regression"]

    def test_automl_hyperparameter_tuning(self):
        """Test de ajuste de hiperparámetros"""
        payload = {
            "task_type": "classification",
            "param_grid": {
                "max_depth": [3, 5, 7],
                "n_estimators": [100, 200],
                "learning_rate": [0.01, 0.1]
            }
        }
        resp = client.post("/api/v1/automl/tune", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"
        assert "best_params" in data
        assert isinstance(data["best_params"], dict)
        assert "cv_score" in data

    def test_automl_feature_selection(self):
        """Test de selección de características"""
        payload = {
            "task_type": "classification",
            "features": ["age", "symptoms", "temperature", "oxygen_saturation", "heart_rate"],
            "k": 3
        }
        resp = client.post("/api/v1/automl/feature_select", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"
        assert "selected_features" in data
        assert len(data["selected_features"]) == 3

    def test_automl_drift_detection(self):
        """Test de detección de drift de datos"""
        payload = {
            "baseline_stats": {
                "mean": 1.0,
                "std": 0.5,
                "min": 0.0,
                "max": 2.0
            },
            "current_stats": {
                "mean": 2.2,
                "std": 0.8,
                "min": 1.0,
                "max": 4.0
            }
        }
        resp = client.post("/api/v1/automl/drift_detect", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"
        assert "drift_score" in data
        assert "drift_detected" in data
        assert isinstance(data["drift_detected"], bool)

    def test_automl_auto_retrain(self):
        """Test de reentrenamiento automático"""
        payload = {
            "task_type": "classification",
            "training_meta": {
                "epochs": 2,
                "batch_size": 32
            }
        }
        resp = client.post("/api/v1/automl/auto_retrain", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"
        assert "model_id" in data or "training_status" in data


class TestReinforcementLearningSmoke:
    """Smoke tests para Reinforcement Learning"""

    def test_rl_configure_agent(self):
        """Test de configuración de agente RL"""
        payload = {
            "env_name": "clinical-optimizer",
            "config": {
                "gamma": 0.99,
                "alpha": 0.01,
                "epsilon": 0.1
            }
        }
        resp = client.post("/api/v1/rl/configure", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"

    def test_rl_train_agent(self):
        """Test de entrenamiento de agente RL"""
        # Primero configurar
        client.post("/api/v1/rl/configure", json={
            "env_name": "clinical-optimizer",
            "config": {"gamma": 0.99}
        })
        
        # Luego entrenar
        payload = {
            "env_name": "clinical-optimizer",
            "episodes": 5
        }
        resp = client.post("/api/v1/rl/train", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"
        assert "avg_reward" in data
        assert isinstance(data["avg_reward"], (int, float))

    def test_rl_agent_action(self):
        """Test de acción del agente RL"""
        # Configurar y entrenar primero
        client.post("/api/v1/rl/configure", json={
            "env_name": "clinical-optimizer",
            "config": {"gamma": 0.99}
        })
        client.post("/api/v1/rl/train", json={
            "env_name": "clinical-optimizer",
            "episodes": 3
        })
        
        # Probar acción
        payload = {
            "env_name": "clinical-optimizer",
            "state": {
                "patient_age": 45,
                "symptom_severity": 0.7,
                "risk_level": "medium"
            }
        }
        resp = client.post("/api/v1/rl/act", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "action" in data
        assert isinstance(data["action"], (dict, list, str, int))

    def test_rl_reminder_optimizer(self):
        """Test específico para optimizador de recordatorios"""
        payload = {
            "env_name": "reminder-optimizer",
            "config": {"gamma": 0.95}
        }
        resp = client.post("/api/v1/rl/configure", json=payload)
        assert resp.status_code == 200, resp.text
        
        # Entrenar
        resp = client.post("/api/v1/rl/train", json={
            "env_name": "reminder-optimizer",
            "episodes": 3
        })
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"


class TestFederatedLearningSmoke:
    """Smoke tests para Federated Learning"""

    def test_fl_register_clients(self):
        """Test de registro de clientes FL"""
        payload = {
            "clients": ["client_1", "client_2", "client_3"]
        }
        resp = client.post("/api/v1/federated/register_clients", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"
        assert "clients" in data
        assert len(data["clients"]) == 3

    def test_fl_run_round_fedavg(self):
        """Test de ronda FL con FedAvg"""
        # Registrar clientes primero
        client.post("/api/v1/federated/register_clients", json={
            "clients": ["c1", "c2"]
        })
        
        payload = {
            "client_updates": [
                {"acc": 0.85, "loss": 0.15, "model_weights": [0.1, 0.2, 0.3]},
                {"acc": 0.90, "loss": 0.10, "model_weights": [0.2, 0.3, 0.4]}
            ],
            "aggregation_method": "fedavg"
        }
        resp = client.post("/api/v1/federated/run_round", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"
        assert "global_acc" in data
        assert isinstance(data["global_acc"], (int, float))

    def test_fl_run_round_fedprox(self):
        """Test de ronda FL con FedProx"""
        client.post("/api/v1/federated/register_clients", json={
            "clients": ["c1", "c2"]
        })
        
        payload = {
            "client_updates": [
                {"acc": 0.80, "loss": 0.20},
                {"acc": 0.85, "loss": 0.15}
            ],
            "aggregation_method": "fedprox",
            "mu": 0.01
        }
        resp = client.post("/api/v1/federated/run_round", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"

    def test_fl_differential_privacy(self):
        """Test de FL con privacidad diferencial"""
        client.post("/api/v1/federated/register_clients", json={
            "clients": ["c1", "c2"]
        })
        
        payload = {
            "client_updates": [
                {"acc": 0.82, "loss": 0.18},
                {"acc": 0.88, "loss": 0.12}
            ],
            "aggregation_method": "fedavg",
            "use_dp": True,
            "dp_epsilon": 1.0
        }
        resp = client.post("/api/v1/federated/run_round", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "ok"

    def test_fl_get_global_model(self):
        """Test de obtención del modelo global"""
        # Ejecutar una ronda primero
        client.post("/api/v1/federated/register_clients", json={
            "clients": ["c1"]
        })
        client.post("/api/v1/federated/run_round", json={
            "client_updates": [{"acc": 0.85}]
        })
        
        resp = client.get("/api/v1/federated/global_model")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("status") == "success"
        assert "model" in data or "global_model" in data


class TestAdvancedMLIntegrationSmoke:
    """Smoke tests de integración entre servicios ML avanzados"""

    def test_nlp_to_automl_pipeline(self):
        """Test de pipeline NLP -> AutoML"""
        # 1. Procesar texto con NLP
        nlp_resp = client.post("/api/v1/nlp/advanced/process", json={
            "text": "Paciente con síntomas respiratorios severos",
            "language": "es"
        })
        assert nlp_resp.status_code == 200
        
        # 2. Usar resultado para AutoML
        automl_resp = client.post("/api/v1/automl/feature_select", json={
            "task_type": "classification",
            "features": nlp_resp.json()["result"]["tokens"][:5],
            "k": 3
        })
        assert automl_resp.status_code == 200

    def test_automl_to_rl_pipeline(self):
        """Test de pipeline AutoML -> RL"""
        # 1. Seleccionar modelo con AutoML
        automl_resp = client.post("/api/v1/automl/select_model", json={
            "task_type": "classification",
            "candidates": ["xgboost", "random_forest"]
        })
        assert automl_resp.status_code == 200
        
        # 2. Usar resultado para configurar RL
        rl_resp = client.post("/api/v1/rl/configure", json={
            "env_name": "clinical-optimizer",
            "config": {
                "model_type": automl_resp.json().get("selected_model", "random_forest")
            }
        })
        assert rl_resp.status_code == 200

    def test_fl_with_automl_models(self):
        """Test de FL usando modelos de AutoML"""
        # 1. Seleccionar modelo con AutoML
        automl_resp = client.post("/api/v1/automl/select_model", json={
            "task_type": "classification",
            "candidates": ["xgboost", "random_forest"]
        })
        selected_model = automl_resp.json().get("selected_model")
        
        # 2. Usar en FL
        client.post("/api/v1/federated/register_clients", json={
            "clients": ["c1", "c2"]
        })
        
        fl_resp = client.post("/api/v1/federated/run_round", json={
            "client_updates": [
                {"acc": 0.85, "model_type": selected_model},
                {"acc": 0.90, "model_type": selected_model}
            ]
        })
        assert fl_resp.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

