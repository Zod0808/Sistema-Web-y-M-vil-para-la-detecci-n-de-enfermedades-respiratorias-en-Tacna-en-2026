"""
Medical History Repository Implementation
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import structlog
from .base_repository import BaseRepository

logger = structlog.get_logger()


class MedicalHistoryRepository(BaseRepository):
    """Repository for medical history data with medical-specific operations"""
    
    def __init__(self, db_client):
        super().__init__("medical_histories", db_client)
    
    async def create_medical_history(self, history_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new medical history with medical-specific validation"""
        try:
            # Validate required medical fields
            required_fields = ['patient_id', 'text', 'language']
            for field in required_fields:
                if field not in history_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Add medical-specific metadata
            history_data.update({
                'status': 'pending',
                'processed_at': None,
                'ai_confidence': None,
                'medical_entities': [],
                'symptoms': [],
                'diagnosis_suggestions': [],
                'risk_factors': []
            })
            
            return await self.create(history_data)
            
        except Exception as e:
            logger.error("Error creating medical history", error=str(e))
            raise
    
    async def get_by_patient_id(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get all medical histories for a patient"""
        return await self.find_by_field("patient_id", patient_id)
    
    async def get_recent_histories(self, patient_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get recent medical histories for a patient"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            query = {
                "patient_id": patient_id,
                "created_at": {"$gte": cutoff_date}
            }
            
            cursor = self.collection.find(query).sort("created_at", -1)
            histories = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                histories.append(document)
            
            return histories
            
        except Exception as e:
            logger.error("Error getting recent histories", 
                        patient_id=patient_id,
                        days=days,
                        error=str(e))
            raise
    
    async def update_processing_status(
        self, 
        history_id: str, 
        status: str, 
        ai_result: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Update processing status and AI results"""
        try:
            update_data = {
                "status": status,
                "processed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            if ai_result:
                update_data.update({
                    "ai_confidence": ai_result.get("confidence_score"),
                    "medical_entities": ai_result.get("entities", []),
                    "symptoms": ai_result.get("symptoms", []),
                    "diagnosis_suggestions": ai_result.get("diagnosis_suggestions", []),
                    "risk_factors": ai_result.get("risk_factors", [])
                })
            
            from bson import ObjectId
            object_id = ObjectId(history_id)
            
            result = await self.collection.update_one(
                {"_id": object_id},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                return await self.get_by_id(history_id)
            else:
                return None
                
        except Exception as e:
            logger.error("Error updating processing status", 
                        history_id=history_id,
                        status=status,
                        error=str(e))
            raise
    
    async def search_by_symptoms(self, symptoms: List[str]) -> List[Dict[str, Any]]:
        """Search medical histories by symptoms"""
        try:
            query = {
                "symptoms.symptom": {"$in": symptoms},
                "deleted_at": {"$exists": False}
            }
            
            cursor = self.collection.find(query)
            histories = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                histories.append(document)
            
            return histories
            
        except Exception as e:
            logger.error("Error searching by symptoms", 
                        symptoms=symptoms,
                        error=str(e))
            raise
    
    async def search_by_diagnosis(self, diagnosis: str) -> List[Dict[str, Any]]:
        """Search medical histories by diagnosis suggestions"""
        try:
            query = {
                "diagnosis_suggestions": {"$regex": diagnosis, "$options": "i"},
                "deleted_at": {"$exists": False}
            }
            
            cursor = self.collection.find(query)
            histories = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                histories.append(document)
            
            return histories
            
        except Exception as e:
            logger.error("Error searching by diagnosis", 
                        diagnosis=diagnosis,
                        error=str(e))
            raise
    
    async def get_statistics(self, patient_id: Optional[str] = None) -> Dict[str, Any]:
        """Get medical history statistics"""
        try:
            base_query = {"deleted_at": {"$exists": False}}
            
            if patient_id:
                base_query["patient_id"] = patient_id
            
            # Count by status
            status_pipeline = [
                {"$match": base_query},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            
            status_counts = {}
            async for doc in self.collection.aggregate(status_pipeline):
                status_counts[doc["_id"]] = doc["count"]
            
            # Count by language
            language_pipeline = [
                {"$match": base_query},
                {"$group": {"_id": "$language", "count": {"$sum": 1}}}
            ]
            
            language_counts = {}
            async for doc in self.collection.aggregate(language_pipeline):
                language_counts[doc["_id"]] = doc["count"]
            
            # Average AI confidence
            confidence_pipeline = [
                {"$match": {**base_query, "ai_confidence": {"$exists": True}}},
                {"$group": {"_id": None, "avg_confidence": {"$avg": "$ai_confidence"}}}
            ]
            
            avg_confidence = 0
            async for doc in self.collection.aggregate(confidence_pipeline):
                avg_confidence = doc["avg_confidence"]
            
            # Recent activity (last 7 days)
            recent_cutoff = datetime.utcnow() - timedelta(days=7)
            recent_query = {**base_query, "created_at": {"$gte": recent_cutoff}}
            recent_count = await self.collection.count_documents(recent_query)
            
            return {
                "total_histories": await self.count(base_query),
                "status_breakdown": status_counts,
                "language_breakdown": language_counts,
                "average_ai_confidence": round(avg_confidence, 2),
                "recent_activity_7_days": recent_count
            }
            
        except Exception as e:
            logger.error("Error getting statistics", 
                        patient_id=patient_id,
                        error=str(e))
            raise
    
    async def get_patient_timeline(self, patient_id: str) -> List[Dict[str, Any]]:
        """Get chronological timeline of medical histories for a patient"""
        try:
            cursor = self.collection.find({
                "patient_id": patient_id,
                "deleted_at": {"$exists": False}
            }).sort("created_at", 1)
            
            timeline = []
            async for document in cursor:
                document['_id'] = str(document['_id'])
                timeline.append({
                    "id": document['_id'],
                    "date": document['created_at'],
                    "status": document.get('status', 'unknown'),
                    "symptoms_count": len(document.get('symptoms', [])),
                    "diagnosis_count": len(document.get('diagnosis_suggestions', [])),
                    "ai_confidence": document.get('ai_confidence'),
                    "text_preview": document.get('text', '')[:100] + "..." if len(document.get('text', '')) > 100 else document.get('text', '')
                })
            
            return timeline
            
        except Exception as e:
            logger.error("Error getting patient timeline", 
                        patient_id=patient_id,
                        error=str(e))
            raise
    
    async def bulk_update_status(self, history_ids: List[str], status: str) -> int:
        """Bulk update status for multiple histories"""
        try:
            from bson import ObjectId
            
            object_ids = [ObjectId(id) for id in history_ids]
            
            result = await self.collection.update_many(
                {"_id": {"$in": object_ids}},
                {
                    "$set": {
                        "status": status,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            logger.info("Bulk status update completed", 
                       count=result.modified_count,
                       status=status)
            
            return result.modified_count
            
        except Exception as e:
            logger.error("Error bulk updating status", 
                        history_ids=history_ids,
                        status=status,
                        error=str(e))
            raise
