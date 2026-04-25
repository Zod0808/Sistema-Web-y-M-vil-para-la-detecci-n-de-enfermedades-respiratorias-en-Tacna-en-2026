"""
Database connection and utilities
"""

import motor.motor_asyncio
from pymongo import MongoClient
import structlog
from typing import Optional

from .config import settings

logger = structlog.get_logger()

# Global database client
client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
database = None


async def init_database():
    """Initialize database connection"""
    global client, database
    
    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(settings.DATABASE_URL)
        database = client.respicare
        
        # Test connection
        await client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        logger.error("Failed to connect to MongoDB", error=str(e))
        raise


async def create_indexes():
    """Create database indexes for better performance"""
    try:
        # Medical histories collection indexes
        await database.medical_histories.create_index("patient_id")
        await database.medical_histories.create_index("date")
        await database.medical_histories.create_index("diagnosis")
        
        # Symptoms collection indexes
        await database.symptoms.create_index("patient_id")
        await database.symptoms.create_index("timestamp")
        await database.symptoms.create_index("severity")
        
        # AI processing results indexes
        await database.ai_results.create_index("patient_id")
        await database.ai_results.create_index("type")
        await database.ai_results.create_index("created_at")
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.error("Failed to create database indexes", error=str(e))


async def get_database():
    """Get database instance"""
    if database is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Database not initialized")
    return database


async def close_database():
    """Close database connection"""
    global client
    if client:
        client.close()
        logger.info("Database connection closed")
