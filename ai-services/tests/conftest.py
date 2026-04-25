"""
Pytest configuration and shared fixtures for AI Services tests
"""

import os
import tempfile
import json
import sys
import asyncio
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from typing import AsyncGenerator, Generator

# Set test environment variables (MUST be set before any imports)
os.environ["TESTING"] = "true"
os.environ["LOG_LEVEL"] = "DEBUG"
os.environ["CACHE_ENABLED"] = "false"
os.environ["CIRCUIT_BREAKER_ENABLED"] = "false"
os.environ["AI_RATE_LIMIT_ENABLED"] = "0"  # Deshabilitar rate limiting en tests

# Mock torch BEFORE any imports to avoid DLL issues in Windows
# This must be done at the very beginning, before any module that might import torch
if 'torch' not in sys.modules:
    try:
        import torch
    except (ImportError, OSError):
        # Create mock torch if import fails and add to sys.modules
        torch_mock = MagicMock()
        torch_mock.tensor = MagicMock(return_value=MagicMock())
        torch_mock.cuda = MagicMock()
        torch_mock.cuda.is_available = MagicMock(return_value=False)
        torch_mock.no_grad = MagicMock()
        torch_mock.__version__ = "1.0.0"
        torch_mock.optim = MagicMock()
        torch_mock.nn = MagicMock()
        sys.modules['torch'] = torch_mock
        # Also mock common torch submodules
        sys.modules['torch.cuda'] = torch_mock.cuda
        sys.modules['torch.optim'] = torch_mock.optim
        sys.modules['torch.nn'] = torch_mock.nn


# Lightweight module stubs for heavy optional dependencies
if "shap" not in sys.modules:
    shap_mock = MagicMock(name="shap_mock")
    shap_explainer_mock = MagicMock(name="TreeExplainer")
    shap_explainer_mock.shap_values.return_value = []
    shap_mock.TreeExplainer.return_value = shap_explainer_mock
    shap_mock.Explanation = MagicMock()
    shap_mock.Cohorts = MagicMock()
    shap_mock.force_plot = MagicMock()
    sys.modules["shap"] = shap_mock

if "openai" not in sys.modules:
    import types
    openai_mock = types.ModuleType("openai")
    
    # Mock OpenAI client classes
    openai_mock.OpenAI = MagicMock
    openai_mock.AsyncOpenAI = MagicMock
    
    # Mock ChatCompletion
    openai_mock.ChatCompletion = MagicMock()
    openai_mock.AsyncConfiguration = MagicMock()
    
    # Add common OpenAI exceptions
    openai_mock.RateLimitError = type("RateLimitError", (Exception,), {})
    openai_mock.APIError = type("APIError", (Exception,), {})
    openai_mock.APIConnectionError = type("APIConnectionError", (Exception,), {})
    openai_mock.APITimeoutError = type("APITimeoutError", (Exception,), {})
    
    # Create a proper spec for the module
    try:
        from importlib.util import spec_from_loader, module_from_spec
        spec = spec_from_loader("openai", None)
        if spec:
            openai_mock.__spec__ = spec
    except (ImportError, AttributeError):
        # Fallback if ModuleSpec is not available
        pass
    sys.modules["openai"] = openai_mock

# Mock whisper module
if "whisper" not in sys.modules:
    whisper_mock = MagicMock(name="whisper_mock")
    whisper_mock.load_model.return_value = MagicMock()
    sys.modules["whisper"] = whisper_mock

# Mock librosa and soundfile for audio processing
if "librosa" not in sys.modules:
    librosa_mock = MagicMock(name="librosa_mock")
    librosa_mock.load.return_value = (None, 22050)
    librosa_mock.feature = MagicMock()
    librosa_mock.feature.mfcc.return_value = MagicMock()
    sys.modules["librosa"] = librosa_mock

if "soundfile" not in sys.modules:
    soundfile_mock = MagicMock(name="soundfile_mock")
    sys.modules["soundfile"] = soundfile_mock

# Mock SHAPDiseaseExplainer
if "shap_explainer" not in sys.modules:
    import types
    shap_explainer_mock = types.ModuleType("shap_explainer")
    
    # Create a proper mock class for SHAPDiseaseExplainer
    class SHAPDiseaseExplainerMock:
        def __init__(self, model_path=None):
            self.model = None
            self.explainer = None
            
        def load_model(self, model_path):
            pass
            
        def explain_prediction(self, symptoms, patient_age=35, top_k=10):
            return {
                "disease": "resfriado",
                "confidence": 0.8,
                "top_features": [],
                "urgency_level": "low"
            }
    
    shap_explainer_mock.SHAPDiseaseExplainer = SHAPDiseaseExplainerMock
    sys.modules["shap_explainer"] = shap_explainer_mock


from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from redis import Redis
import fakeredis
import mongomock

# Make main import optional to avoid torch DLL issues in Windows
try:
    from main import app
except (ImportError, OSError) as e:
    # If main import fails (e.g., torch DLL issues), create a mock app
    from fastapi import FastAPI
    app = FastAPI()
    import structlog
    logger = structlog.get_logger()
    logger.warning("Could not import main app, using mock app", error=str(e))

from core.config import settings
from core.database import get_database
from core.cache import get_cache_client as get_cache
from core.pattern_config import PatternConfig


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def test_db():
    """Mock MongoDB database for testing"""
    client = mongomock.MongoClient()
    db = client.respicare_test
    return db


@pytest.fixture
def test_redis():
    """Mock Redis cache for testing"""
    return fakeredis.FakeRedis()


@pytest.fixture
async def mock_database(test_db):
    """Async mock database dependency"""
    async def get_test_database():
        return test_db
    return get_test_database


@pytest.fixture
async def mock_cache(test_redis):
    """Async mock cache dependency"""
    async def get_test_cache():
        return test_redis
    return get_test_cache


@pytest.fixture
def client(mock_database, mock_cache):
    """Test client with mocked dependencies"""
    app.dependency_overrides[get_database] = mock_database
    app.dependency_overrides[get_cache] = mock_cache
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_medical_history():
    """Sample medical history data for testing"""
    return {
        "patient_id": "P001",
        "text": "Paciente de 45 años con tos seca persistente de 2 semanas, dificultad respiratoria leve, fiebre intermitente de 38°C. Antecedentes de tabaquismo por 20 años. No alergias conocidas.",
        "language": "es",
        "metadata": {
            "source": "emergency_room",
            "doctor": "Dr. García",
            "age": 45,
            "gender": "M"
        }
    }


@pytest.fixture
def sample_symptoms():
    """Sample symptoms data for testing"""
    return {
        "patient_id": "P001",
        "symptoms": [
            {"symptom": "tos seca", "severity": "moderate", "duration": "2 semanas"},
            {"symptom": "dificultad respiratoria", "severity": "mild", "duration": "1 semana"},
            {"symptom": "fiebre", "severity": "moderate", "duration": "3 días"}
        ],
        "context": "Síntomas respiratorios persistentes con antecedentes de tabaquismo",
        "metadata": {
            "age": 45,
            "gender": "M",
            "diabetes": False,
            "hypertension": True
        }
    }


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response"""
    return {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "symptoms": ["tos seca", "dificultad respiratoria"],
                        "urgency_level": "moderate",
                        "severity_score": 0.7,
                        "recommendations": ["Consulta médica", "Reposo"],
                        "confidence_score": 0.85
                    })
                }
            }
        ]
    }


@pytest.fixture
def mock_model_manager():
    """Mock model manager for testing"""
    mock = AsyncMock()
    mock.classify_symptoms.return_value = {
        "respiratory": 0.8,
        "general": 0.2
    }
    mock.process_medical_history.return_value = {
        "symptoms": ["tos", "fiebre"],
        "age": 45,
        "gender": "M",
        "diagnosis_suggestions": ["Bronquitis", "Neumonía"]
    }
    return mock


@pytest.fixture
def pattern_config():
    """Pattern configuration for testing"""
    return PatternConfig(
        strategy_default="rule_based",
        circuit_breaker_enabled=False,
        cache_enabled=False,
        retry_enabled=False,
        logging_enabled=False,
        metrics_enabled=False,
        audit_logging_enabled=False
    )


@pytest.fixture
def temp_file():
    """Temporary file for testing file operations"""
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json') as f:
        yield f.name
    os.unlink(f.name)


# Pytest markers
def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "ai: mark test as AI/ML specific"
    )
