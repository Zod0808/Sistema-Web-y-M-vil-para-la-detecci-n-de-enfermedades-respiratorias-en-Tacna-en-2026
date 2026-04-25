"""
Redis cache utilities
"""

import redis.asyncio as redis
import json
import structlog
from typing import Any, Optional

from .config import settings

logger = structlog.get_logger()

# Global cache client
cache_client: Optional[redis.Redis] = None
_is_initializing: bool = False


async def init_cache():
    """Initialize Redis cache connection"""
    global cache_client, _is_initializing

    if cache_client is not None:
        return cache_client

    if _is_initializing:
        return cache_client

    try:
        _is_initializing = True
        client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )

        # Test connection
        await client.ping()
        cache_client = client
        logger.info("Successfully connected to Redis cache")
        return cache_client

    except Exception as e:
        logger.error("Failed to connect to Redis", error=str(e))
        # Continue without cache if Redis is not available
        cache_client = None
        return None
    finally:
        _is_initializing = False


def get_cache_client():
    """Get cache client instance"""
    return cache_client


async def set_cache(
    key: str, 
    value: Any, 
    ttl: Optional[int] = None
) -> bool:
    """Set cache value"""
    if not cache_client:
        return False
        
    try:
        # Serialize value to JSON
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        
        # Set with TTL
        if ttl:
            await cache_client.setex(key, ttl, value)
        else:
            await cache_client.set(key, value)
            
        return True
        
    except Exception as e:
        logger.error("Failed to set cache", key=key, error=str(e))
        return False


async def get_cache(key: str) -> Optional[Any]:
    """Get cache value"""
    if not cache_client:
        return None
        
    try:
        value = await cache_client.get(key)
        if value:
            # Try to deserialize JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        return None
        
    except Exception as e:
        logger.error("Failed to get cache", key=key, error=str(e))
        return None


async def delete_cache(key: str) -> bool:
    """Delete cache value"""
    if not cache_client:
        return False
        
    try:
        await cache_client.delete(key)
        return True
        
    except Exception as e:
        logger.error("Failed to delete cache", key=key, error=str(e))
        return False


async def clear_cache_pattern(pattern: str) -> int:
    """Clear cache keys matching pattern"""
    if not cache_client:
        return 0
        
    try:
        keys = await cache_client.keys(pattern)
        if keys:
            return await cache_client.delete(*keys)
        return 0
        
    except Exception as e:
        logger.error("Failed to clear cache pattern", pattern=pattern, error=str(e))
        return 0


async def close_cache():
    """Close Redis cache connection"""
    global cache_client

    if not cache_client:
        return

    try:
        await cache_client.close()
        logger.info("Redis cache connection closed")
    except Exception as e:
        logger.error("Failed to close Redis cache", error=str(e))
    finally:
        cache_client = None
