"""
AI Result Repository Implementation
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import structlog
from .base_repository import BaseRepository

logger = structlog.get_logger()


class AIResultRepository(BaseRepository):
    """Repository for AI analysis results with AI-specific operations"""
    
    def __init__(self, db_client):
        super().__init__("ai_results", db_client)
    
    async def create_ai_result(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new AI result with AI-specific validation"""
        try:
            # Validate required AI fields
            required_fields = ['patient_id', 'type', 'data']
            for field in required_fields:
                if field not in result_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Add AI-specific metadata
            result_data.update({
                'status': 'completed',
                'processing_time_ms': result_data.get('processing_time_ms', 0),
                'model_version': result_data.get('model_version', '1.0'),
                'strategy_used': result_data.get('strategy_used', 'unknown'),
                'confidence_score': result_data.get('confidence_score', 0.0)
            })
            
            return await self.create(result_data)
            
        except Exception as e:
            logger.error("Error creating AI result", error=str(e))
            raise
    
    async def get_by_patient_id(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get all AI results for a patient"""
        return await self.find_by_field("patient_id", patient_id)
    
    async def get_by_type(self, result_type: str) -> List[Dict[str, Any]]:
        """Get all AI results of a specific type"""
        return await self.find_by_field("type", result_type)
    
    async def get_patient_results_by_type(
        self, 
        patient_id: str, 
        result_type: str
    ) -> List[Dict[str, Any]]:
        """Get AI results for a patient by type"""
        try:
            query = {
                "patient_id": patient_id,
                "type": result_type,
                "deleted_at": {"$exists": False}
            }
            
            cursor = self.collection.find(query).sort("created_at", -1)
            results = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                results.append(document)
            
            return results
            
        except Exception as e:
            logger.error("Error getting patient results by type", 
                        patient_id=patient_id,
                        result_type=result_type,
                        error=str(e))
            raise
    
    async def get_recent_results(self, patient_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get recent AI results for a patient"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            query = {
                "patient_id": patient_id,
                "created_at": {"$gte": cutoff_date},
                "deleted_at": {"$exists": False}
            }
            
            cursor = self.collection.find(query).sort("created_at", -1)
            results = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                results.append(document)
            
            return results
            
        except Exception as e:
            logger.error("Error getting recent results", 
                        patient_id=patient_id,
                        days=days,
                        error=str(e))
            raise
    
    async def get_high_confidence_results(
        self, 
        confidence_threshold: float = 0.8
    ) -> List[Dict[str, Any]]:
        """Get AI results with high confidence scores"""
        try:
            query = {
                "confidence_score": {"$gte": confidence_threshold},
                "deleted_at": {"$exists": False}
            }
            
            cursor = self.collection.find(query).sort("confidence_score", -1)
            results = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                results.append(document)
            
            return results
            
        except Exception as e:
            logger.error("Error getting high confidence results", 
                        threshold=confidence_threshold,
                        error=str(e))
            raise
    
    async def get_results_by_strategy(self, strategy: str) -> List[Dict[str, Any]]:
        """Get AI results by strategy used"""
        return await self.find_by_field("strategy_used", strategy)
    
    async def get_performance_metrics(
        self, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get AI performance metrics"""
        try:
            # Build date filter
            date_filter = {"deleted_at": {"$exists": False}}
            if start_date or end_date:
                date_range = {}
                if start_date:
                    date_range["$gte"] = start_date
                if end_date:
                    date_range["$lte"] = end_date
                date_filter["created_at"] = date_range
            
            # Average confidence by type
            confidence_pipeline = [
                {"$match": {**date_filter, "confidence_score": {"$exists": True}}},
                {"$group": {
                    "_id": "$type",
                    "avg_confidence": {"$avg": "$confidence_score"},
                    "count": {"$sum": 1}
                }}
            ]
            
            confidence_by_type = {}
            async for doc in self.collection.aggregate(confidence_pipeline):
                confidence_by_type[doc["_id"]] = {
                    "avg_confidence": round(doc["avg_confidence"], 3),
                    "count": doc["count"]
                }
            
            # Average processing time by strategy
            processing_pipeline = [
                {"$match": {**date_filter, "processing_time_ms": {"$exists": True}}},
                {"$group": {
                    "_id": "$strategy_used",
                    "avg_processing_time": {"$avg": "$processing_time_ms"},
                    "count": {"$sum": 1}
                }}
            ]
            
            processing_by_strategy = {}
            async for doc in self.collection.aggregate(processing_pipeline):
                processing_by_strategy[doc["_id"]] = {
                    "avg_processing_time_ms": round(doc["avg_processing_time"], 2),
                    "count": doc["count"]
                }
            
            # Total results by type
            type_pipeline = [
                {"$match": date_filter},
                {"$group": {"_id": "$type", "count": {"$sum": 1}}}
            ]
            
            results_by_type = {}
            async for doc in self.collection.aggregate(type_pipeline):
                results_by_type[doc["_id"]] = doc["count"]
            
            # Recent activity (last 24 hours)
            recent_cutoff = datetime.utcnow() - timedelta(hours=24)
            recent_query = {**date_filter, "created_at": {"$gte": recent_cutoff}}
            recent_count = await self.collection.count_documents(recent_query)
            
            return {
                "confidence_by_type": confidence_by_type,
                "processing_by_strategy": processing_by_strategy,
                "results_by_type": results_by_type,
                "recent_activity_24h": recent_count,
                "total_results": await self.count(date_filter)
            }
            
        except Exception as e:
            logger.error("Error getting performance metrics", error=str(e))
            raise
    
    async def get_error_results(self) -> List[Dict[str, Any]]:
        """Get AI results that had errors or low confidence"""
        try:
            query = {
                "$or": [
                    {"confidence_score": {"$lt": 0.5}},
                    {"status": "error"},
                    {"error": {"$exists": True}}
                ],
                "deleted_at": {"$exists": False}
            }
            
            cursor = self.collection.find(query).sort("created_at", -1)
            results = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                results.append(document)
            
            return results
            
        except Exception as e:
            logger.error("Error getting error results", error=str(e))
            raise
    
    async def cleanup_old_results(self, days: int = 90) -> int:
        """Clean up old AI results (soft delete)"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            query = {
                "created_at": {"$lt": cutoff_date},
                "deleted_at": {"$exists": False}
            }
            
            result = await self.collection.update_many(
                query,
                {
                    "$set": {
                        "deleted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info("Old results cleaned up", 
                       count=result.modified_count,
                       days=days)
            
            return result.modified_count
            
        except Exception as e:
            logger.error("Error cleaning up old results", 
                        days=days,
                        error=str(e))
            raise
    
    async def get_patient_analysis_trend(
        self, 
        patient_id: str, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get analysis trend for a patient over time"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {
                    "$match": {
                        "patient_id": patient_id,
                        "created_at": {"$gte": cutoff_date},
                        "deleted_at": {"$exists": False}
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                            "type": "$type"
                        },
                        "count": {"$sum": 1},
                        "avg_confidence": {"$avg": "$confidence_score"},
                        "avg_processing_time": {"$avg": "$processing_time_ms"}
                    }
                },
                {"$sort": {"_id.date": 1}}
            ]
            
            trend_data = []
            async for doc in self.collection.aggregate(pipeline):
                trend_data.append({
                    "date": doc["_id"]["date"],
                    "type": doc["_id"]["type"],
                    "count": doc["count"],
                    "avg_confidence": round(doc.get("avg_confidence", 0), 3),
                    "avg_processing_time_ms": round(doc.get("avg_processing_time", 0), 2)
                })
            
            return trend_data
            
        except Exception as e:
            logger.error("Error getting patient analysis trend", 
                        patient_id=patient_id,
                        days=days,
                        error=str(e))
            raise
