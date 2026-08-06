"""
Tests for api/routes/health.py
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime

from api.routes.health import router, health_check, detailed_health_check, readiness_check, liveness_check
from core.database import get_database
from core.cache import get_cache


class TestHealthEndpoints:
    """Tests for health check endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client with health router"""
        from fastapi import FastAPI
        app = FastAPI()
        app.include_router(router)
        client = TestClient(app)
        yield client
        app.dependency_overrides.clear()

    def test_health_check_basic(self, client):
        """Test basic health check endpoint"""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["service"] == "RespiCare AI Services"
        assert data["version"] == "1.0.0"

    @pytest.mark.asyncio
    async def test_health_check_function(self):
        """Test health_check function directly"""
        result = await health_check()

        assert result["status"] == "healthy"
        assert "timestamp" in result
        assert result["service"] == "RespiCare AI Services"
        assert result["version"] == "1.0.0"

    @pytest.mark.asyncio
    async def test_detailed_health_check_all_healthy(self, client):
        """Test detailed health check with all services healthy"""
        mock_database = AsyncMock()
        mock_database.command = AsyncMock(return_value={"ok": 1})

        mock_cache = AsyncMock()
        mock_cache.ping = AsyncMock(return_value=True)

        mock_model_manager = MagicMock()
        mock_model_manager.get_model = MagicMock(return_value=MagicMock())

        # Dependencies resolved via FastAPI's Depends() are bound to the
        # original function objects at route-definition time, so patching
        # the module attribute doesn't affect them; use dependency_overrides.
        client.app.dependency_overrides[get_database] = lambda: mock_database
        client.app.dependency_overrides[get_cache] = lambda: mock_cache

        with patch('api.routes.health.model_manager', mock_model_manager):
            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "dependencies" in data
            assert data["dependencies"]["database"]["status"] == "healthy"
            assert data["dependencies"]["cache"]["status"] == "healthy"
            assert "ai_models" in data["dependencies"]

    @pytest.mark.asyncio
    async def test_detailed_health_check_database_unhealthy(self, client):
        """Test detailed health check with database unhealthy"""
        mock_database = AsyncMock()
        mock_database.command = AsyncMock(side_effect=Exception("Connection error"))

        mock_cache = AsyncMock()
        mock_cache.ping = AsyncMock(return_value=True)

        mock_model_manager = MagicMock()
        mock_model_manager.get_model = MagicMock(return_value=MagicMock())

        client.app.dependency_overrides[get_database] = lambda: mock_database
        client.app.dependency_overrides[get_cache] = lambda: mock_cache

        with patch('api.routes.health.model_manager', mock_model_manager):
            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "degraded"
            assert data["dependencies"]["database"]["status"] == "unhealthy"
            assert "error" in data["dependencies"]["database"]

    @pytest.mark.asyncio
    async def test_detailed_health_check_cache_unhealthy(self, client):
        """Test detailed health check with cache unhealthy"""
        mock_database = AsyncMock()
        mock_database.command = AsyncMock(return_value={"ok": 1})

        mock_cache = AsyncMock()
        mock_cache.ping = AsyncMock(side_effect=Exception("Connection error"))

        mock_model_manager = MagicMock()
        mock_model_manager.get_model = MagicMock(return_value=MagicMock())

        client.app.dependency_overrides[get_database] = lambda: mock_database
        client.app.dependency_overrides[get_cache] = lambda: mock_cache

        with patch('api.routes.health.model_manager', mock_model_manager):
            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "degraded"
            assert data["dependencies"]["cache"]["status"] == "unhealthy"
            assert "error" in data["dependencies"]["cache"]

    @pytest.mark.asyncio
    async def test_detailed_health_check_cache_disabled(self, client):
        """Test detailed health check with cache disabled"""
        mock_database = AsyncMock()
        mock_database.command = AsyncMock(return_value={"ok": 1})

        mock_model_manager = MagicMock()
        mock_model_manager.get_model = MagicMock(return_value=MagicMock())

        client.app.dependency_overrides[get_database] = lambda: mock_database
        client.app.dependency_overrides[get_cache] = lambda: None

        with patch('api.routes.health.model_manager', mock_model_manager):
            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert data["dependencies"]["cache"]["status"] == "disabled"

    @pytest.mark.asyncio
    async def test_detailed_health_check_models_unhealthy(self, client):
        """Test detailed health check with models unhealthy"""
        mock_database = AsyncMock()
        mock_database.command = AsyncMock(return_value={"ok": 1})

        mock_cache = AsyncMock()
        mock_cache.ping = AsyncMock(return_value=True)

        mock_model_manager = MagicMock()
        mock_model_manager.get_model = MagicMock(side_effect=Exception("Model error"))

        client.app.dependency_overrides[get_database] = lambda: mock_database
        client.app.dependency_overrides[get_cache] = lambda: mock_cache

        with patch('api.routes.health.model_manager', mock_model_manager):
            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "degraded"
            assert data["dependencies"]["ai_models"]["status"] == "unhealthy"
            assert "error" in data["dependencies"]["ai_models"]

    @pytest.mark.asyncio
    async def test_detailed_health_check_models_not_loaded(self, client):
        """Test detailed health check with models not loaded"""
        mock_database = AsyncMock()
        mock_database.command = AsyncMock(return_value={"ok": 1})

        mock_cache = AsyncMock()
        mock_cache.ping = AsyncMock(return_value=True)

        mock_model_manager = MagicMock()
        mock_model_manager.get_model = MagicMock(return_value=None)

        client.app.dependency_overrides[get_database] = lambda: mock_database
        client.app.dependency_overrides[get_cache] = lambda: mock_cache

        with patch('api.routes.health.model_manager', mock_model_manager):
            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()
            # Should still be healthy but models show not_loaded
            assert "ai_models" in data["dependencies"]

    def test_readiness_check(self, client):
        """Test readiness check endpoint"""
        response = client.get("/health/ready")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_readiness_check_function(self):
        """Test readiness_check function directly"""
        result = await readiness_check()

        assert result["status"] == "ready"
        assert "timestamp" in result

    def test_liveness_check(self, client):
        """Test liveness check endpoint"""
        response = client.get("/health/live")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"
        assert "timestamp" in data

    @pytest.mark.asyncio
    async def test_liveness_check_function(self):
        """Test liveness_check function directly"""
        result = await liveness_check()

        assert result["status"] == "alive"
        assert "timestamp" in result

    @pytest.mark.asyncio
    async def test_detailed_health_check_timestamp_format(self, client):
        """Test that timestamp is in ISO format"""
        mock_database = AsyncMock()
        mock_database.command = AsyncMock(return_value={"ok": 1})

        mock_cache = AsyncMock()
        mock_cache.ping = AsyncMock(return_value=True)

        mock_model_manager = MagicMock()
        mock_model_manager.get_model = MagicMock(return_value=MagicMock())

        client.app.dependency_overrides[get_database] = lambda: mock_database
        client.app.dependency_overrides[get_cache] = lambda: mock_cache

        with patch('api.routes.health.model_manager', mock_model_manager):
            response = client.get("/health/detailed")

            assert response.status_code == 200
            data = response.json()

            assert "timestamp" in data
            datetime.fromisoformat(data["timestamp"])
