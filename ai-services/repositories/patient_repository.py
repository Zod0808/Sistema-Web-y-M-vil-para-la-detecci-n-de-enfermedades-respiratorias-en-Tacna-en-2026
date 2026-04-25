"""
Patient Repository Implementation
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import structlog
from .base_repository import BaseRepository

logger = structlog.get_logger()


class PatientRepository(BaseRepository):
    """Repository for patient data with patient-specific operations"""
    
    def __init__(self, db_client):
        super().__init__("patients", db_client)
    
    async def create_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new patient with patient-specific validation"""
        try:
            # Validate required patient fields
            required_fields = ['patient_id', 'first_name', 'last_name']
            for field in required_fields:
                if field not in patient_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Add patient-specific metadata
            patient_data.update({
                'status': 'active',
                'total_histories': 0,
                'total_ai_analyses': 0,
                'last_activity': datetime.utcnow(),
                'medical_summary': {
                    'common_symptoms': [],
                    'frequent_diagnoses': [],
                    'risk_factors': [],
                    'medications': []
                }
            })
            
            return await self.create(patient_data)
            
        except Exception as e:
            logger.error("Error creating patient", error=str(e))
            raise
    
    async def get_by_patient_id(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Get patient by patient ID"""
        return await self.find_one_by_field("patient_id", patient_id)
    
    async def update_last_activity(self, patient_id: str) -> bool:
        """Update patient's last activity timestamp"""
        try:
            from bson import ObjectId
            
            # Find patient by patient_id
            patient = await self.find_one_by_field("patient_id", patient_id)
            if not patient:
                return False
            
            # Update last activity
            result = await self.collection.update_one(
                {"_id": ObjectId(patient["_id"])},
                {
                    "$set": {
                        "last_activity": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error("Error updating last activity", 
                        patient_id=patient_id,
                        error=str(e))
            raise
    
    async def increment_activity_counters(
        self, 
        patient_id: str, 
        history_count: int = 0, 
        ai_analysis_count: int = 0
    ) -> bool:
        """Increment patient activity counters"""
        try:
            from bson import ObjectId
            
            # Find patient by patient_id
            patient = await self.find_one_by_field("patient_id", patient_id)
            if not patient:
                return False
            
            update_data = {
                "last_activity": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            if history_count > 0:
                update_data["$inc"] = {"total_histories": history_count}
            
            if ai_analysis_count > 0:
                update_data["$inc"] = {"total_ai_analyses": ai_analysis_count}
            
            # Remove $inc from $set if it exists
            if "$inc" in update_data:
                inc_data = update_data.pop("$inc")
                result = await self.collection.update_one(
                    {"_id": ObjectId(patient["_id"])},
                    {"$set": update_data, "$inc": inc_data}
                )
            else:
                result = await self.collection.update_one(
                    {"_id": ObjectId(patient["_id"])},
                    {"$set": update_data}
                )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error("Error incrementing activity counters", 
                        patient_id=patient_id,
                        error=str(e))
            raise
    
    async def update_medical_summary(
        self, 
        patient_id: str, 
        summary_data: Dict[str, Any]
    ) -> bool:
        """Update patient's medical summary"""
        try:
            from bson import ObjectId
            
            # Find patient by patient_id
            patient = await self.find_one_by_field("patient_id", patient_id)
            if not patient:
                return False
            
            # Update medical summary
            result = await self.collection.update_one(
                {"_id": ObjectId(patient["_id"])},
                {
                    "$set": {
                        "medical_summary": summary_data,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error("Error updating medical summary", 
                        patient_id=patient_id,
                        error=str(e))
            raise
    
    async def get_active_patients(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get patients with recent activity"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            query = {
                "last_activity": {"$gte": cutoff_date},
                "status": "active",
                "deleted_at": {"$exists": False}
            }
            
            cursor = self.collection.find(query).sort("last_activity", -1)
            patients = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                patients.append(document)
            
            return patients
            
        except Exception as e:
            logger.error("Error getting active patients", 
                        days=days,
                        error=str(e))
            raise
    
    async def get_patient_statistics(self) -> Dict[str, Any]:
        """Get patient statistics"""
        try:
            # Total patients
            total_patients = await self.count({"status": "active"})
            
            # Patients by age group (if age field exists)
            age_pipeline = [
                {"$match": {"status": "active", "deleted_at": {"$exists": False}}},
                {"$group": {
                    "_id": {
                        "$switch": {
                            "branches": [
                                {"case": {"$lt": ["$age", 18]}, "then": "0-17"},
                                {"case": {"$lt": ["$age", 30]}, "then": "18-29"},
                                {"case": {"$lt": ["$age", 45]}, "then": "30-44"},
                                {"case": {"$lt": ["$age", 60]}, "then": "45-59"},
                                {"case": {"$lt": ["$age", 75]}, "then": "60-74"}
                            ],
                            "default": "75+"
                        }
                    },
                    "count": {"$sum": 1}
                }}
            ]
            
            age_groups = {}
            async for doc in self.collection.aggregate(age_pipeline):
                age_groups[doc["_id"]] = doc["count"]
            
            # Gender distribution
            gender_pipeline = [
                {"$match": {"status": "active", "deleted_at": {"$exists": False}}},
                {"$group": {"_id": "$gender", "count": {"$sum": 1}}}
            ]
            
            gender_distribution = {}
            async for doc in self.collection.aggregate(gender_pipeline):
                gender_distribution[doc["_id"]] = doc["count"]
            
            # Recent registrations (last 30 days)
            recent_cutoff = datetime.utcnow() - timedelta(days=30)
            recent_registrations = await self.count({
                "created_at": {"$gte": recent_cutoff},
                "status": "active"
            })
            
            # Most active patients (by total histories)
            most_active_pipeline = [
                {"$match": {"status": "active", "deleted_at": {"$exists": False}}},
                {"$sort": {"total_histories": -1}},
                {"$limit": 10},
                {"$project": {
                    "patient_id": 1,
                    "first_name": 1,
                    "last_name": 1,
                    "total_histories": 1,
                    "total_ai_analyses": 1,
                    "last_activity": 1
                }}
            ]
            
            most_active = []
            async for doc in self.collection.aggregate(most_active_pipeline):
                doc['_id'] = str(doc['_id'])
                most_active.append(doc)
            
            return {
                "total_patients": total_patients,
                "age_groups": age_groups,
                "gender_distribution": gender_distribution,
                "recent_registrations_30_days": recent_registrations,
                "most_active_patients": most_active
            }
            
        except Exception as e:
            logger.error("Error getting patient statistics", error=str(e))
            raise
    
    async def search_patients(
        self, 
        query_text: str, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Search patients by name or patient_id"""
        try:
            # Create text search query
            search_query = {
                "$or": [
                    {"first_name": {"$regex": query_text, "$options": "i"}},
                    {"last_name": {"$regex": query_text, "$options": "i"}},
                    {"patient_id": {"$regex": query_text, "$options": "i"}},
                    {"email": {"$regex": query_text, "$options": "i"}}
                ],
                "status": "active",
                "deleted_at": {"$exists": False}
            }
            
            cursor = self.collection.find(search_query).limit(limit)
            patients = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                # Only return essential fields for search results
                patients.append({
                    "id": document['_id'],
                    "patient_id": document.get('patient_id'),
                    "first_name": document.get('first_name'),
                    "last_name": document.get('last_name'),
                    "email": document.get('email'),
                    "total_histories": document.get('total_histories', 0),
                    "last_activity": document.get('last_activity')
                })
            
            return patients
            
        except Exception as e:
            logger.error("Error searching patients", 
                        query=query_text,
                        error=str(e))
            raise
    
    async def get_patient_dashboard_data(self, patient_id: str) -> Dict[str, Any]:
        """Get comprehensive dashboard data for a patient"""
        try:
            patient = await self.get_by_patient_id(patient_id)
            if not patient:
                return {}
            
            # Get recent activity (last 30 days)
            recent_activity = await self.get_recent_activity(patient_id, days=30)
            
            # Get medical summary
            medical_summary = patient.get('medical_summary', {})
            
            return {
                "patient_info": {
                    "patient_id": patient['patient_id'],
                    "name": f"{patient.get('first_name', '')} {patient.get('last_name', '')}".strip(),
                    "status": patient.get('status'),
                    "total_histories": patient.get('total_histories', 0),
                    "total_ai_analyses": patient.get('total_ai_analyses', 0),
                    "last_activity": patient.get('last_activity')
                },
                "recent_activity": recent_activity,
                "medical_summary": medical_summary
            }
            
        except Exception as e:
            logger.error("Error getting patient dashboard data", 
                        patient_id=patient_id,
                        error=str(e))
            raise
    
    async def get_recent_activity(self, patient_id: str, days: int = 30) -> Dict[str, Any]:
        """Get recent activity summary for a patient"""
        try:
            # This would typically involve querying related collections
            # For now, return a placeholder structure
            
            return {
                "recent_histories": 0,  # Would query medical_histories collection
                "recent_analyses": 0,   # Would query ai_results collection
                "common_symptoms": [],
                "recent_diagnoses": [],
                "activity_trend": "stable"
            }
            
        except Exception as e:
            logger.error("Error getting recent activity", 
                        patient_id=patient_id,
                        days=days,
                        error=str(e))
            raise
