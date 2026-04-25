"""
External Service Circuit Breaker Implementation
"""

import httpx
import asyncio
from typing import Dict, Any, Optional, Callable
import structlog
from .circuit_breaker import CircuitBreaker, CircuitState

logger = structlog.get_logger()


class ExternalServiceCircuitBreaker(CircuitBreaker):
    """Circuit breaker for external HTTP services"""
    
    def __init__(
        self,
        service_name: str,
        base_url: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        timeout: int = 30
    ):
        super().__init__(
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            expected_exception=Exception
        )
        
        self.service_name = service_name
        self.base_url = base_url
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)
    
    async def call_http_service(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """Call HTTP service with circuit breaker protection"""
        
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        
        try:
            response = await self.call(
                self._make_http_request,
                method,
                url,
                **kwargs
            )
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text,
                "headers": dict(response.headers)
            }
            
        except httpx.HTTPStatusError as e:
            logger.warning("HTTP status error", 
                          service=self.service_name,
                          status_code=e.response.status_code,
                          error=str(e))
            raise e
        except httpx.TimeoutException as e:
            logger.warning("HTTP timeout error", 
                          service=self.service_name,
                          error=str(e))
            raise e
        except httpx.RequestError as e:
            logger.warning("HTTP request error", 
                          service=self.service_name,
                          error=str(e))
            raise e
    
    async def _make_http_request(self, method: str, url: str, **kwargs):
        """Make HTTP request"""
        async with self.client:
            response = await self.client.request(method, url, **kwargs)
            response.raise_for_status()
            return response
    
    async def get(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make GET request"""
        return await self.call_http_service("GET", endpoint, **kwargs)
    
    async def post(self, endpoint: str, data: Any = None, **kwargs) -> Dict[str, Any]:
        """Make POST request"""
        return await self.call_http_service("POST", endpoint, data=data, **kwargs)
    
    async def put(self, endpoint: str, data: Any = None, **kwargs) -> Dict[str, Any]:
        """Make PUT request"""
        return await self.call_http_service("PUT", endpoint, data=data, **kwargs)
    
    async def delete(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make DELETE request"""
        return await self.call_http_service("DELETE", endpoint, **kwargs)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get enhanced metrics for HTTP service"""
        metrics = super().get_metrics()
        metrics.update({
            "service_name": self.service_name,
            "base_url": self.base_url,
            "timeout": self.timeout
        })
        return metrics
    
    async def health_check(self) -> bool:
        """Perform health check on the service"""
        try:
            await self.get("/health")
            return True
        except Exception as e:
            logger.warning("Health check failed", 
                          service=self.service_name,
                          error=str(e))
            return False
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class CircuitBreakerServiceManager:
    """Manager for multiple external services with circuit breakers"""
    
    def __init__(self):
        self.services = {}
    
    def register_service(
        self, 
        service_name: str, 
        base_url: str, 
        **circuit_breaker_kwargs
    ) -> ExternalServiceCircuitBreaker:
        """Register a new service with circuit breaker"""
        
        if service_name in self.services:
            logger.warning("Service already registered", service=service_name)
            return self.services[service_name]
        
        service = ExternalServiceCircuitBreaker(
            service_name=service_name,
            base_url=base_url,
            **circuit_breaker_kwargs
        )
        
        self.services[service_name] = service
        logger.info("Service registered with circuit breaker", 
                   service=service_name,
                   base_url=base_url)
        
        return service
    
    def get_service(self, service_name: str) -> Optional[ExternalServiceCircuitBreaker]:
        """Get registered service"""
        return self.services.get(service_name)
    
    async def call_service(
        self,
        service_name: str,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Call service with circuit breaker protection"""
        
        service = self.get_service(service_name)
        if not service:
            raise ValueError(f"Service {service_name} not registered")
        
        return await service.call_http_service(method, endpoint, **kwargs)
    
    async def health_check_all(self) -> Dict[str, bool]:
        """Perform health check on all registered services"""
        results = {}
        
        tasks = []
        for service_name, service in self.services.items():
            task = asyncio.create_task(service.health_check())
            tasks.append((service_name, task))
        
        for service_name, task in tasks:
            try:
                results[service_name] = await task
            except Exception as e:
                logger.error("Health check task failed", 
                           service=service_name,
                           error=str(e))
                results[service_name] = False
        
        return results
    
    def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics for all services"""
        return {
            service_name: service.get_metrics()
            for service_name, service in self.services.items()
        }
    
    async def close_all(self):
        """Close all HTTP clients"""
        for service in self.services.values():
            await service.close()
        logger.info("All service HTTP clients closed")


# Global service manager
service_manager = CircuitBreakerServiceManager()
