"""
Tests for circuit_breaker/external_service_circuit_breaker.py
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from circuit_breaker.external_service_circuit_breaker import (
    ExternalServiceCircuitBreaker,
    CircuitBreakerServiceManager,
    service_manager
)


class TestExternalServiceCircuitBreaker:
    """Tests for ExternalServiceCircuitBreaker"""
    
    @pytest.fixture
    def external_circuit_breaker(self):
        """Create external service circuit breaker instance"""
        return ExternalServiceCircuitBreaker(
            service_name="test_service",
            base_url="https://api.example.com",
            failure_threshold=5,
            recovery_timeout=60,
            timeout=30
        )
    
    @pytest.fixture
    def mock_httpx_response(self):
        """Create mock httpx response"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json = MagicMock(return_value={"result": "success"})
        mock_response.text = "success"
        mock_response.headers = {"content-type": "application/json"}
        mock_response.raise_for_status = MagicMock()
        return mock_response
    
    def test_initialization(self, external_circuit_breaker):
        """Test circuit breaker initialization"""
        assert external_circuit_breaker.service_name == "test_service"
        assert external_circuit_breaker.base_url == "https://api.example.com"
        assert external_circuit_breaker.timeout == 30
        assert external_circuit_breaker.failure_threshold == 5
        assert external_circuit_breaker.recovery_timeout == 60
    
    @pytest.mark.asyncio
    async def test_call_http_service_get_success(self, external_circuit_breaker, mock_httpx_response):
        """Test successful GET request"""
        with patch.object(external_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_httpx_response
            
            result = await external_circuit_breaker.call_http_service("GET", "/test")
            
            assert result["status_code"] == 200
            assert result["data"] == {"result": "success"}
            assert "headers" in result
            mock_call.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_call_http_service_post_success(self, external_circuit_breaker, mock_httpx_response):
        """Test successful POST request"""
        with patch.object(external_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_httpx_response
            
            result = await external_circuit_breaker.call_http_service("POST", "/test", json={"key": "value"})
            
            assert result["status_code"] == 200
            mock_call.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_call_http_service_url_construction(self, external_circuit_breaker, mock_httpx_response):
        """Test URL construction with trailing/leading slashes"""
        with patch.object(external_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_httpx_response
            
            # Test with trailing slash in base_url and leading slash in endpoint
            await external_circuit_breaker.call_http_service("GET", "/test")
            
            call_args = mock_call.call_args
            url = call_args[0][2]  # Third positional argument
            assert url == "https://api.example.com/test"
            
            # Test without slashes
            external_circuit_breaker.base_url = "https://api.example.com"
            await external_circuit_breaker.call_http_service("GET", "test")
            
            call_args = mock_call.call_args
            url = call_args[0][2]
            assert url == "https://api.example.com/test"
    
    @pytest.mark.asyncio
    async def test_call_http_service_non_json_response(self, external_circuit_breaker):
        """Test handling non-JSON response"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "plain text response"
        mock_response.headers = {"content-type": "text/plain"}
        mock_response.raise_for_status = MagicMock()
        
        with patch.object(external_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_response
            
            result = await external_circuit_breaker.call_http_service("GET", "/test")
            
            assert result["status_code"] == 200
            assert result["data"] == "plain text response"
    
    @pytest.mark.asyncio
    async def test_call_http_service_http_status_error(self, external_circuit_breaker):
        """Test handling HTTP status error"""
        import httpx
        
        mock_response = MagicMock()
        mock_response.status_code = 500
        http_error = httpx.HTTPStatusError("Server Error", request=MagicMock(), response=mock_response)
        http_error.response = mock_response
        
        with patch.object(external_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = http_error
            
            with pytest.raises(httpx.HTTPStatusError):
                await external_circuit_breaker.call_http_service("GET", "/test")
    
    @pytest.mark.asyncio
    async def test_call_http_service_timeout_error(self, external_circuit_breaker):
        """Test handling timeout error"""
        import httpx
        
        timeout_error = httpx.TimeoutException("Request timeout", request=MagicMock())
        
        with patch.object(external_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = timeout_error
            
            with pytest.raises(httpx.TimeoutException):
                await external_circuit_breaker.call_http_service("GET", "/test")
    
    @pytest.mark.asyncio
    async def test_call_http_service_request_error(self, external_circuit_breaker):
        """Test handling request error"""
        import httpx
        
        request_error = httpx.RequestError("Connection error", request=MagicMock())
        
        with patch.object(external_circuit_breaker, 'call', new_callable=AsyncMock) as mock_call:
            mock_call.side_effect = request_error
            
            with pytest.raises(httpx.RequestError):
                await external_circuit_breaker.call_http_service("GET", "/test")
    
    @pytest.mark.asyncio
    async def test_get_method(self, external_circuit_breaker, mock_httpx_response):
        """Test GET method helper"""
        with patch.object(external_circuit_breaker, 'call_http_service', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = {"status_code": 200, "data": {"result": "success"}}
            
            result = await external_circuit_breaker.get("/test")
            
            assert result["status_code"] == 200
            mock_call.assert_called_once_with("GET", "/test")
    
    @pytest.mark.asyncio
    async def test_post_method(self, external_circuit_breaker):
        """Test POST method helper"""
        with patch.object(external_circuit_breaker, 'call_http_service', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = {"status_code": 201, "data": {"id": "123"}}
            
            result = await external_circuit_breaker.post("/test", data={"key": "value"})
            
            assert result["status_code"] == 201
            mock_call.assert_called_once_with("POST", "/test", data={"key": "value"})
    
    @pytest.mark.asyncio
    async def test_put_method(self, external_circuit_breaker):
        """Test PUT method helper"""
        with patch.object(external_circuit_breaker, 'call_http_service', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = {"status_code": 200, "data": {"updated": True}}
            
            result = await external_circuit_breaker.put("/test", data={"key": "value"})
            
            assert result["status_code"] == 200
            mock_call.assert_called_once_with("PUT", "/test", data={"key": "value"})
    
    @pytest.mark.asyncio
    async def test_delete_method(self, external_circuit_breaker):
        """Test DELETE method helper"""
        with patch.object(external_circuit_breaker, 'call_http_service', new_callable=AsyncMock) as mock_call:
            mock_call.return_value = {"status_code": 204, "data": None}
            
            result = await external_circuit_breaker.delete("/test")
            
            assert result["status_code"] == 204
            mock_call.assert_called_once_with("DELETE", "/test")
    
    def test_get_metrics(self, external_circuit_breaker):
        """Test getting enhanced metrics"""
        metrics = external_circuit_breaker.get_metrics()
        
        assert "service_name" in metrics
        assert "base_url" in metrics
        assert "timeout" in metrics
        assert metrics["service_name"] == "test_service"
        assert metrics["base_url"] == "https://api.example.com"
        assert metrics["timeout"] == 30
        # Should also include base circuit breaker metrics
        assert "state" in metrics
        assert "failure_count" in metrics
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, external_circuit_breaker):
        """Test successful health check"""
        with patch.object(external_circuit_breaker, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"status_code": 200, "data": {"status": "healthy"}}
            
            result = await external_circuit_breaker.health_check()
            
            assert result is True
            mock_get.assert_called_once_with("/health")
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, external_circuit_breaker):
        """Test health check failure"""
        with patch.object(external_circuit_breaker, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = Exception("Connection error")
            
            result = await external_circuit_breaker.health_check()
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_close(self, external_circuit_breaker):
        """Test closing HTTP client"""
        external_circuit_breaker.client = AsyncMock()
        external_circuit_breaker.client.aclose = AsyncMock()
        
        await external_circuit_breaker.close()
        
        external_circuit_breaker.client.aclose.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_make_http_request(self, external_circuit_breaker, mock_httpx_response):
        """Test making HTTP request"""
        external_circuit_breaker.client = AsyncMock()
        external_circuit_breaker.client.request = AsyncMock(return_value=mock_httpx_response)
        
        # Mock context manager
        async def aenter(self):
            return self
        
        async def aexit(self, *args):
            pass
        
        external_circuit_breaker.client.__aenter__ = aenter
        external_circuit_breaker.client.__aexit__ = aexit
        
        result = await external_circuit_breaker._make_http_request("GET", "https://api.example.com/test")
        
        assert result == mock_httpx_response
        external_circuit_breaker.client.request.assert_called_once_with("GET", "https://api.example.com/test")
        mock_httpx_response.raise_for_status.assert_called_once()


class TestCircuitBreakerServiceManager:
    """Tests for CircuitBreakerServiceManager"""
    
    @pytest.fixture
    def service_manager_instance(self):
        """Create service manager instance"""
        return CircuitBreakerServiceManager()
    
    def test_initialization(self, service_manager_instance):
        """Test service manager initialization"""
        assert service_manager_instance.services == {}
    
    def test_register_service(self, service_manager_instance):
        """Test registering a new service"""
        service = service_manager_instance.register_service(
            service_name="test_service",
            base_url="https://api.example.com",
            failure_threshold=5,
            timeout=30
        )
        
        assert service is not None
        assert "test_service" in service_manager_instance.services
        assert service.service_name == "test_service"
        assert service.base_url == "https://api.example.com"
    
    def test_register_service_already_registered(self, service_manager_instance):
        """Test registering already registered service"""
        service1 = service_manager_instance.register_service(
            service_name="test_service",
            base_url="https://api.example.com"
        )
        
        service2 = service_manager_instance.register_service(
            service_name="test_service",
            base_url="https://api.example.com"
        )
        
        # Should return existing service
        assert service1 == service2
        assert len(service_manager_instance.services) == 1
    
    def test_get_service_success(self, service_manager_instance):
        """Test getting registered service"""
        service_manager_instance.register_service(
            service_name="test_service",
            base_url="https://api.example.com"
        )
        
        service = service_manager_instance.get_service("test_service")
        
        assert service is not None
        assert service.service_name == "test_service"
    
    def test_get_service_not_found(self, service_manager_instance):
        """Test getting non-existent service"""
        service = service_manager_instance.get_service("nonexistent")
        
        assert service is None
    
    @pytest.mark.asyncio
    async def test_call_service_success(self, service_manager_instance):
        """Test calling service successfully"""
        mock_service = AsyncMock()
        mock_service.call_http_service = AsyncMock(return_value={"status_code": 200, "data": {"result": "success"}})
        service_manager_instance.services["test_service"] = mock_service
        
        result = await service_manager_instance.call_service(
            service_name="test_service",
            method="GET",
            endpoint="/test"
        )
        
        assert result["status_code"] == 200
        mock_service.call_http_service.assert_called_once_with("GET", "/test")
    
    @pytest.mark.asyncio
    async def test_call_service_not_registered(self, service_manager_instance):
        """Test calling non-registered service"""
        with pytest.raises(ValueError, match="Service.*not registered"):
            await service_manager_instance.call_service(
                service_name="nonexistent",
                method="GET",
                endpoint="/test"
            )
    
    @pytest.mark.asyncio
    async def test_health_check_all(self, service_manager_instance):
        """Test health check for all services"""
        mock_service1 = AsyncMock()
        mock_service1.health_check = AsyncMock(return_value=True)
        mock_service2 = AsyncMock()
        mock_service2.health_check = AsyncMock(return_value=False)
        
        service_manager_instance.services = {
            "service1": mock_service1,
            "service2": mock_service2
        }
        
        results = await service_manager_instance.health_check_all()
        
        assert results["service1"] is True
        assert results["service2"] is False
        assert len(results) == 2
    
    @pytest.mark.asyncio
    async def test_health_check_all_with_error(self, service_manager_instance):
        """Test health check all with service error"""
        mock_service = AsyncMock()
        mock_service.health_check = AsyncMock(side_effect=Exception("Health check error"))
        
        service_manager_instance.services = {"service1": mock_service}
        
        results = await service_manager_instance.health_check_all()
        
        assert results["service1"] is False
    
    def test_get_all_metrics(self, service_manager_instance):
        """Test getting metrics for all services"""
        mock_service1 = AsyncMock()
        mock_service1.get_metrics = MagicMock(return_value={"state": "closed", "failure_count": 0})
        mock_service2 = AsyncMock()
        mock_service2.get_metrics = MagicMock(return_value={"state": "open", "failure_count": 5})
        
        service_manager_instance.services = {
            "service1": mock_service1,
            "service2": mock_service2
        }
        
        metrics = service_manager_instance.get_all_metrics()
        
        assert "service1" in metrics
        assert "service2" in metrics
        assert metrics["service1"]["state"] == "closed"
        assert metrics["service2"]["state"] == "open"
    
    @pytest.mark.asyncio
    async def test_close_all(self, service_manager_instance):
        """Test closing all HTTP clients"""
        mock_service1 = AsyncMock()
        mock_service1.close = AsyncMock()
        mock_service2 = AsyncMock()
        mock_service2.close = AsyncMock()
        
        service_manager_instance.services = {
            "service1": mock_service1,
            "service2": mock_service2
        }
        
        await service_manager_instance.close_all()
        
        mock_service1.close.assert_called_once()
        mock_service2.close.assert_called_once()
    
    def test_global_service_manager(self):
        """Test global service manager instance"""
        assert service_manager is not None
        assert isinstance(service_manager, CircuitBreakerServiceManager)

