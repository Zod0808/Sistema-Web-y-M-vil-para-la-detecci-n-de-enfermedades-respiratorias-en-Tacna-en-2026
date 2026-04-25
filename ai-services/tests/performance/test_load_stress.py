"""
Performance Tests - Load and Stress Testing
Tests de carga y stress para endpoints y modelos ML
"""

import pytest
import asyncio
import time
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import MagicMock, patch

from ml_models.ensemble_predictor import EnsemblePredictor
from ml_models.medical_bert import MedicalBERTModel

# Load testing thresholds
LOAD_CONCURRENT_USERS = 50  # 50 usuarios concurrentes
LOAD_DURATION_SECONDS = 60  # 60 segundos de carga
STRESS_CONCURRENT_USERS = 100  # 100 usuarios para stress test
STRESS_DURATION_SECONDS = 120  # 2 minutos para stress test
MAX_ERROR_RATE = 0.05  # 5% máximo de errores


@pytest.mark.performance
@pytest.mark.slow
class TestLoadTesting:
    """Tests de carga (load testing)"""
    
    @pytest.fixture
    def ensemble_predictor(self):
        """Create ensemble predictor"""
        return EnsemblePredictor()
    
    def test_load_test_ensemble_predictions(self, ensemble_predictor):
        """Load test: múltiples predicciones concurrentes"""
        sample_symptoms = ['tos', 'fiebre']
        num_requests = 100
        concurrent_users = 10
        
        def make_prediction():
            try:
                return ensemble_predictor.predict(
                    symptoms=sample_symptoms,
                    patient_age=35,
                    apply_personalization=False
                )
            except Exception as e:
                return {'error': str(e)}
        
        results = []
        errors = []
        start_time = time.perf_counter()
        
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = [executor.submit(make_prediction) for _ in range(num_requests)]
            
            for future in as_completed(futures):
                try:
                    result = future.result()
                    if 'error' in result:
                        errors.append(result)
                    else:
                        results.append(result)
                except Exception as e:
                    errors.append({'error': str(e)})
        
        end_time = time.perf_counter()
        total_time = end_time - start_time
        error_rate = len(errors) / num_requests
        
        # Verificar resultados
        assert len(results) + len(errors) == num_requests
        assert error_rate < MAX_ERROR_RATE, \
            f"Error rate {error_rate:.2%} exceeds {MAX_ERROR_RATE:.2%}"
        
        # Calcular throughput
        throughput = num_requests / total_time
        assert throughput > 0, "Throughput must be positive"
    
    def test_load_test_bert_predictions(self):
        """Load test: predicciones BERT concurrentes"""
        bert_model = MedicalBERTModel()
        bert_model.load()
        
        sample_texts = ["Patient with persistent cough"]
        num_requests = 50  # Menos para BERT (más lento)
        concurrent_users = 5
        
        def make_prediction():
            try:
                return bert_model.predict(sample_texts)
            except Exception as e:
                return {'error': str(e)}
        
        results = []
        errors = []
        start_time = time.perf_counter()
        
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = [executor.submit(make_prediction) for _ in range(num_requests)]
            
            for future in as_completed(futures):
                try:
                    result = future.result()
                    if 'error' in result:
                        errors.append(result)
                    else:
                        results.append(result)
                except Exception as e:
                    errors.append({'error': str(e)})
        
        end_time = time.perf_counter()
        total_time = end_time - start_time
        error_rate = len(errors) / num_requests
        
        assert error_rate < MAX_ERROR_RATE, \
            f"Error rate {error_rate:.2%} exceeds {MAX_ERROR_RATE:.2%}"


@pytest.mark.performance
@pytest.mark.slow
class TestStressTesting:
    """Tests de stress (stress testing)"""
    
    @pytest.fixture
    def ensemble_predictor(self):
        """Create ensemble predictor"""
        return EnsemblePredictor()
    
    def test_stress_test_ensemble_predictions(self, ensemble_predictor):
        """Stress test: carga extrema de predicciones"""
        sample_symptoms = ['tos', 'fiebre']
        num_requests = 500
        concurrent_users = 50
        
        def make_prediction():
            try:
                return ensemble_predictor.predict(
                    symptoms=sample_symptoms,
                    patient_age=35,
                    apply_personalization=False
                )
            except Exception as e:
                return {'error': str(e)}
        
        results = []
        errors = []
        latencies = []
        start_time = time.perf_counter()
        
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = []
            for _ in range(num_requests):
                future = executor.submit(make_prediction)
                futures.append((future, time.perf_counter()))
            
            for future, submit_time in futures:
                try:
                    result = future.result()
                    latency = (time.perf_counter() - submit_time) * 1000
                    latencies.append(latency)
                    
                    if 'error' in result:
                        errors.append(result)
                    else:
                        results.append(result)
                except Exception as e:
                    errors.append({'error': str(e)})
        
        end_time = time.perf_counter()
        total_time = end_time - start_time
        error_rate = len(errors) / num_requests
        
        # Calcular percentiles de latencia
        latencies.sort()
        p95_latency = latencies[int(len(latencies) * 0.95)] if latencies else 0
        p99_latency = latencies[int(len(latencies) * 0.99)] if latencies else 0
        
        # En stress test, permitimos más errores pero verificamos que el sistema no colapsa
        assert error_rate < MAX_ERROR_RATE * 2, \
            f"Error rate {error_rate:.2%} too high in stress test"
        assert len(results) > 0, "System should handle at least some requests"
        
        # Verificar que las latencias no son excesivas
        if latencies:
            assert p95_latency < 2000, f"p95 latency {p95_latency:.2f}ms too high"
            assert p99_latency < 5000, f"p99 latency {p99_latency:.2f}ms too high"
    
    def test_stress_test_memory_usage(self, ensemble_predictor):
        """Stress test: verificar uso de memoria bajo carga"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        sample_symptoms = ['tos', 'fiebre']
        num_requests = 200
        
        def make_prediction():
            return ensemble_predictor.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                apply_personalization=False
            )
        
        # Ejecutar muchas predicciones
        for _ in range(num_requests):
            make_prediction()
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # El aumento de memoria no debe ser excesivo (< 100 MB)
        assert memory_increase < 100, \
            f"Memory increase {memory_increase:.2f}MB too high"


@pytest.mark.performance
@pytest.mark.slow
class TestEnduranceTesting:
    """Tests de resistencia (endurance testing)"""
    
    @pytest.fixture
    def ensemble_predictor(self):
        """Create ensemble predictor"""
        return EnsemblePredictor()
    
    def test_endurance_test_long_running(self, ensemble_predictor):
        """Endurance test: ejecución prolongada"""
        sample_symptoms = ['tos', 'fiebre']
        duration_seconds = 30  # 30 segundos para test rápido
        start_time = time.perf_counter()
        
        request_count = 0
        errors = []
        
        while (time.perf_counter() - start_time) < duration_seconds:
            try:
                ensemble_predictor.predict(
                    symptoms=sample_symptoms,
                    patient_age=35,
                    apply_personalization=False
                )
                request_count += 1
            except Exception as e:
                errors.append(str(e))
        
        error_rate = len(errors) / max(request_count, 1)
        
        # Verificar que el sistema mantiene estabilidad
        assert request_count > 0, "Should process at least some requests"
        assert error_rate < MAX_ERROR_RATE, \
            f"Error rate {error_rate:.2%} too high in endurance test"
    
    def test_endurance_test_memory_stability(self, ensemble_predictor):
        """Endurance test: estabilidad de memoria"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_samples = []
        
        sample_symptoms = ['tos', 'fiebre']
        num_iterations = 100
        
        for i in range(num_iterations):
            ensemble_predictor.predict(
                symptoms=sample_symptoms,
                patient_age=35,
                apply_personalization=False
            )
            
            # Sample memory every 10 iterations
            if i % 10 == 0:
                memory_mb = process.memory_info().rss / 1024 / 1024
                memory_samples.append(memory_mb)
        
        # Verificar que la memoria no crece constantemente (memory leak)
        if len(memory_samples) > 1:
            initial_memory = memory_samples[0]
            final_memory = memory_samples[-1]
            memory_increase = final_memory - initial_memory
            
            # El aumento no debe ser excesivo
            assert memory_increase < 50, \
                f"Memory leak detected: {memory_increase:.2f}MB increase"

