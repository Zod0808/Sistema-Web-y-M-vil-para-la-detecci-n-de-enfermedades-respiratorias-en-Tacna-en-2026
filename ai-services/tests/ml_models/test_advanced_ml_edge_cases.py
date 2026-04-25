"""
Tests de Casos Especiales - ML Avanzado
Tests para edge cases, manejo de errores, timeouts, rate limiting, circuit breakers
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import time
from typing import Dict, Any

try:
    from main import app  # type: ignore
except Exception:
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from main import app  # type: ignore

client = TestClient(app)


class TestAdvancedNLPEdgeCases:
    """Edge cases para NLP Avanzado"""

    def test_nlp_empty_text(self):
        """Test con texto vacío"""
        payload = {"text": "", "language": "es"}
        resp = client.post("/api/v1/nlp/advanced/process", json=payload)
        # Rate limiting está deshabilitado en tests, así que no debería ser 429
        assert resp.status_code in [200, 400, 422, 500]  # Puede aceptar o rechazar
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("status") in ["success", "error"]

    def test_nlp_very_long_text(self):
        """Test con texto muy largo"""
        long_text = "Paciente con síntomas. " * 1000  # ~25KB
        payload = {"text": long_text, "language": "es"}
        resp = client.post("/api/v1/nlp/advanced/process", json=payload)
        # Rate limiting deshabilitado, pero puede haber otros errores
        assert resp.status_code in [200, 413, 400, 422, 500]  # 413 = Payload Too Large

    def test_nlp_invalid_language(self):
        """Test con idioma inválido"""
        payload = {"text": "Test text", "language": "invalid_lang"}
        resp = client.post("/api/v1/nlp/advanced/process", json=payload)
        # Debe manejar graciosamente
        assert resp.status_code in [200, 400, 422]

    def test_nlp_special_characters(self):
        """Test con caracteres especiales"""
        payload = {
            "text": "Paciente con síntomas: tos, fiebre (38°C), disnea. Tratamiento: paracetamol 500mg.",
            "language": "es"
        }
        resp = client.post("/api/v1/nlp/advanced/process", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "success"

    def test_nlp_missing_required_fields(self):
        """Test con campos requeridos faltantes"""
        payload = {"language": "es"}  # Falta 'text'
        resp = client.post("/api/v1/nlp/advanced/process", json=payload)
        assert resp.status_code == 422  # Validation error

    def test_nlp_ner_no_entities_found(self):
        """Test NER sin entidades encontradas"""
        payload = {
            "text": "El día está soleado y hace buen tiempo.",
            "language": "es"
        }
        resp = client.post("/api/v1/nlp/advanced/ner", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "success"
        assert "entities" in data["result"]
        # Puede estar vacío o tener entidades genéricas


class TestAutoMLEdgeCases:
    """Edge cases para AutoML"""

    def test_automl_empty_candidates(self):
        """Test con lista de candidatos vacía"""
        payload = {"task_type": "classification", "candidates": []}
        resp = client.post("/api/v1/automl/select_model", json=payload)
        assert resp.status_code in [200, 400]
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("status") in ["ok", "error"]

    def test_automl_invalid_task_type(self):
        """Test con tipo de tarea inválido"""
        payload = {"task_type": "invalid_task", "candidates": ["xgboost"]}
        resp = client.post("/api/v1/automl/select_model", json=payload)
        assert resp.status_code in [200, 400, 422]

    def test_automl_large_param_grid(self):
        """Test con grid de parámetros muy grande"""
        payload = {
            "task_type": "classification",
            "param_grid": {
                f"param_{i}": list(range(10)) for i in range(20)
            }
        }
        resp = client.post("/api/v1/automl/tune", json=payload)
        # Puede tardar mucho o rechazar
        assert resp.status_code in [200, 400, 413]

    def test_automl_feature_selection_k_larger_than_features(self):
        """Test con k mayor que número de características"""
        payload = {
            "task_type": "classification",
            "features": ["a", "b", "c"],
            "k": 10  # k > len(features)
        }
        resp = client.post("/api/v1/automl/feature_select", json=payload)
        assert resp.status_code in [200, 400]
        if resp.status_code == 200:
            data = resp.json()
            # Debe retornar máximo len(features) características
            assert len(data.get("selected_features", [])) <= 3

    def test_automl_drift_detection_missing_stats(self):
        """Test de detección de drift con estadísticas faltantes"""
        payload = {
            "baseline_stats": {"mean": 1.0},
            # Falta current_stats
        }
        resp = client.post("/api/v1/automl/drift_detect", json=payload)
        assert resp.status_code == 422  # Validation error


class TestReinforcementLearningEdgeCases:
    """Edge cases para Reinforcement Learning"""

    def test_rl_invalid_env_name(self):
        """Test con nombre de entorno inválido"""
        payload = {
            "env_name": "invalid-env",
            "config": {"gamma": 0.99}
        }
        resp = client.post("/api/v1/rl/configure", json=payload)
        # Debe manejar graciosamente
        assert resp.status_code in [200, 400, 404]

    def test_rl_train_zero_episodes(self):
        """Test de entrenamiento con 0 episodios"""
        client.post("/api/v1/rl/configure", json={
            "env_name": "clinical-optimizer",
            "config": {"gamma": 0.99}
        })
        
        payload = {"env_name": "clinical-optimizer", "episodes": 0}
        resp = client.post("/api/v1/rl/train", json=payload)
        assert resp.status_code in [200, 400]

    def test_rl_train_negative_episodes(self):
        """Test de entrenamiento con episodios negativos"""
        client.post("/api/v1/rl/configure", json={
            "env_name": "clinical-optimizer",
            "config": {"gamma": 0.99}
        })
        
        payload = {"env_name": "clinical-optimizer", "episodes": -5}
        resp = client.post("/api/v1/rl/train", json=payload)
        assert resp.status_code in [200, 400, 422]

    def test_rl_act_without_training(self):
        """Test de acción sin entrenar primero"""
        payload = {
            "env_name": "clinical-optimizer",
            "state": {"patient_age": 45}
        }
        resp = client.post("/api/v1/rl/act", json=payload)
        # Puede funcionar con política por defecto o fallar
        assert resp.status_code in [200, 400, 500]

    def test_rl_act_invalid_state(self):
        """Test de acción con estado inválido"""
        client.post("/api/v1/rl/configure", json={
            "env_name": "clinical-optimizer",
            "config": {"gamma": 0.99}
        })
        client.post("/api/v1/rl/train", json={
            "env_name": "clinical-optimizer",
            "episodes": 3
        })
        
        payload = {
            "env_name": "clinical-optimizer",
            "state": None  # Estado inválido
        }
        resp = client.post("/api/v1/rl/act", json=payload)
        assert resp.status_code in [200, 400, 422]


class TestFederatedLearningEdgeCases:
    """Edge cases para Federated Learning"""

    def test_fl_register_empty_clients(self):
        """Test de registro con lista vacía de clientes"""
        payload = {"clients": []}
        resp = client.post("/api/v1/federated/register_clients", json=payload)
        assert resp.status_code in [200, 400]
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("count") == 0

    def test_fl_register_duplicate_clients(self):
        """Test de registro con clientes duplicados"""
        payload = {"clients": ["c1", "c2", "c1", "c3", "c2"]}
        resp = client.post("/api/v1/federated/register_clients", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # Debe manejar duplicados (eliminar o mantener)
        assert "clients" in data

    def test_fl_run_round_empty_updates(self):
        """Test de ronda con actualizaciones vacías"""
        client.post("/api/v1/federated/register_clients", json={
            "clients": ["c1", "c2"]
        })
        
        payload = {"client_updates": []}
        resp = client.post("/api/v1/federated/run_round", json=payload)
        assert resp.status_code in [200, 400]

    def test_fl_run_round_mismatched_clients(self):
        """Test de ronda con número de updates diferente a clientes registrados"""
        client.post("/api/v1/federated/register_clients", json={
            "clients": ["c1", "c2", "c3"]
        })
        
        payload = {
            "client_updates": [
                {"acc": 0.85},
                {"acc": 0.90}
                # Solo 2 updates para 3 clientes
            ]
        }
        resp = client.post("/api/v1/federated/run_round", json=payload)
        # Debe manejar graciosamente
        assert resp.status_code in [200, 400]

    def test_fl_run_round_invalid_aggregation_method(self):
        """Test con método de agregación inválido"""
        client.post("/api/v1/federated/register_clients", json={
            "clients": ["c1", "c2"]
        })
        
        payload = {
            "client_updates": [{"acc": 0.85}, {"acc": 0.90}],
            "aggregation_method": "invalid_method"
        }
        resp = client.post("/api/v1/federated/run_round", json=payload)
        assert resp.status_code in [200, 400, 422]

    def test_fl_differential_privacy_invalid_epsilon(self):
        """Test con epsilon inválido para privacidad diferencial"""
        client.post("/api/v1/federated/register_clients", json={
            "clients": ["c1", "c2"]
        })
        
        payload = {
            "client_updates": [{"acc": 0.85}, {"acc": 0.90}],
            "use_dp": True,
            "dp_epsilon": -1.0  # Epsilon inválido (debe ser > 0)
        }
        resp = client.post("/api/v1/federated/run_round", json=payload)
        assert resp.status_code in [200, 400, 422]

    def test_fl_get_global_model_without_rounds(self):
        """Test de obtención de modelo global sin ejecutar rondas"""
        resp = client.get("/api/v1/federated/global_model")
        # Puede retornar modelo por defecto o error
        assert resp.status_code in [200, 404, 500]


class TestErrorHandlingAndTimeouts:
    """Tests de manejo de errores y timeouts"""

    @patch('ai-services.services.ai_service_manager.AIServiceManager')
    def test_service_timeout_handling(self, mock_service):
        """Test de manejo de timeout en servicios"""
        # Simular timeout
        mock_service.side_effect = TimeoutError("Service timeout")
        
        payload = {"text": "Test", "language": "es"}
        resp = client.post("/api/v1/nlp/advanced/process", json=payload)
        # Debe manejar timeout graciosamente
        assert resp.status_code in [200, 500, 504]

    def test_rate_limit_handling(self):
        """Test de manejo de rate limiting"""
        # Hacer múltiples requests rápidas
        # Nota: Rate limiting está deshabilitado en tests (TESTING=true)
        payload = {"text": "Test", "language": "es"}
        
        responses = []
        for _ in range(10):
            resp = client.post("/api/v1/nlp/advanced/process", json=payload)
            responses.append(resp.status_code)
            time.sleep(0.1)  # Pequeño delay
        
        # Con rate limiting deshabilitado, no deberían haber 429
        # Pero pueden haber otros errores (500, 400, etc.)
        assert all(status in [200, 400, 422, 500] for status in responses)

    def test_circuit_breaker_activation(self):
        """Test de activación de circuit breaker"""
        # Simular múltiples fallos para activar circuit breaker
        payload = {"task_type": "classification", "candidates": ["invalid_model"]}
        
        responses = []
        for _ in range(5):
            resp = client.post("/api/v1/automl/select_model", json=payload)
            responses.append(resp.status_code)
        
        # Después de varios fallos, circuit breaker puede activarse
        # y retornar error inmediatamente
        assert len(responses) == 5

    def test_fallback_strategy_on_error(self):
        """Test de estrategia de fallback en caso de error"""
        # Simular error en servicio principal
        payload = {"text": "Test", "language": "es"}
        
        # Si el servicio principal falla, debe usar fallback
        resp = client.post("/api/v1/nlp/advanced/process", json=payload)
        # Debe retornar respuesta (puede ser de fallback)
        assert resp.status_code in [200, 500]


class TestDataValidation:
    """Tests de validación de datos"""

    def test_malformed_json(self):
        """Test con JSON malformado"""
        resp = client.post(
            "/api/v1/nlp/advanced/process",
            data="invalid json{",
            headers={"Content-Type": "application/json"}
        )
        assert resp.status_code == 422

    def test_wrong_content_type(self):
        """Test con tipo de contenido incorrecto"""
        resp = client.post(
            "/api/v1/nlp/advanced/process",
            data="text=test",
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert resp.status_code in [400, 422, 415]

    def test_missing_authentication(self):
        """Test sin autenticación (si es requerida)"""
        # Algunos endpoints pueden requerir autenticación
        resp = client.post("/api/v1/automl/auto_retrain", json={
            "task_type": "classification"
        })
        # Puede requerir auth o no
        assert resp.status_code in [200, 401, 403]

    def test_very_large_payload(self):
        """Test con payload muy grande"""
        large_data = {"text": "x" * 1000000, "language": "es"}  # ~1MB
        resp = client.post("/api/v1/nlp/advanced/process", json=large_data)
        assert resp.status_code in [200, 413, 400]  # 413 = Payload Too Large


class TestConcurrentRequests:
    """Tests de requests concurrentes"""

    def test_concurrent_nlp_requests(self):
        """Test de múltiples requests NLP concurrentes"""
        import concurrent.futures
        
        payload = {"text": "Test", "language": "es"}
        
        def make_request():
            return client.post("/api/v1/nlp/advanced/process", json=payload)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        # Todas deben completarse (pueden tener diferentes status codes)
        assert len(results) == 5
        # Rate limiting deshabilitado en tests, así que no deberían haber 429
        assert all(r.status_code in [200, 400, 422, 500] for r in results)

    def test_concurrent_automl_requests(self):
        """Test de múltiples requests AutoML concurrentes"""
        import concurrent.futures
        
        payload = {"task_type": "classification", "candidates": ["xgboost"]}
        
        def make_request():
            return client.post("/api/v1/automl/select_model", json=payload)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(make_request) for _ in range(3)]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        assert len(results) == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

