"""
Base Repository Implementation
"""

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Dict, Any, Optional
from datetime import datetime
import structlog

logger = structlog.get_logger()

T = TypeVar('T')


class IRepository(ABC, Generic[T]):
    """Interface for repository pattern"""
    
    @abstractmethod
    async def create(self, entity: T) -> T:
        """Create a new entity"""
        pass
    
    @abstractmethod
    async def get_by_id(self, entity_id: str) -> Optional[T]:
        """Get entity by ID"""
        pass
    
    @abstractmethod
    async def update(self, entity_id: str, entity: T) -> Optional[T]:
        """Update an existing entity"""
        pass
    
    @abstractmethod
    async def delete(self, entity_id: str) -> bool:
        """Delete an entity"""
        pass
    
    @abstractmethod
    async def find_all(self, filters: Optional[Dict[str, Any]] = None) -> List[T]:
        """Find all entities matching filters"""
        pass
    
    @abstractmethod
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count entities matching filters"""
        pass


class BaseRepository(IRepository[T]):
    """Base repository implementation with common functionality"""
    
    def __init__(self, collection_name: str, db_client):
        self.collection_name = collection_name
        self.db = db_client
        self.collection = db_client[collection_name]
    
    async def create(self, entity: T) -> T:
        """Create a new entity with audit fields"""
        try:
            # Add audit fields
            if hasattr(entity, 'dict'):
                entity_data = entity.dict()
            else:
                entity_data = dict(entity) if hasattr(entity, '__dict__') else entity
            
            entity_data.update({
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                'version': 1
            })
            
            # Remove None values
            entity_data = {k: v for k, v in entity_data.items() if v is not None}
            
            result = await self.collection.insert_one(entity_data)
            
            if result.inserted_id:
                entity_data['_id'] = result.inserted_id
                logger.info("Entity created", 
                           collection=self.collection_name,
                           entity_id=str(result.inserted_id))
                return entity_data
            else:
                raise Exception("Failed to create entity")
                
        except Exception as e:
            logger.error("Error creating entity", 
                        collection=self.collection_name,
                        error=str(e))
            raise
    
    async def get_by_id(self, entity_id: str) -> Optional[T]:
        """Get entity by ID"""
        try:
            from bson import ObjectId
            
            # Try to convert to ObjectId if it's a valid ObjectId string
            try:
                object_id = ObjectId(entity_id)
            except:
                object_id = entity_id
            
            document = await self.collection.find_one({"_id": object_id})
            
            if document:
                # Convert ObjectId to string for JSON serialization
                document['_id'] = str(document['_id'])
                logger.debug("Entity retrieved", 
                            collection=self.collection_name,
                            entity_id=entity_id)
                return document
            else:
                logger.debug("Entity not found", 
                            collection=self.collection_name,
                            entity_id=entity_id)
                return None
                
        except Exception as e:
            logger.error("Error retrieving entity", 
                        collection=self.collection_name,
                        entity_id=entity_id,
                        error=str(e))
            raise
    
    async def update(self, entity_id: str, entity: T) -> Optional[T]:
        """Update an existing entity with versioning"""
        try:
            from bson import ObjectId
            
            # Try to convert to ObjectId if it's a valid ObjectId string
            try:
                object_id = ObjectId(entity_id)
            except:
                object_id = entity_id
            
            # Prepare update data
            if hasattr(entity, 'dict'):
                update_data = entity.dict()
            else:
                update_data = dict(entity) if hasattr(entity, '__dict__') else entity
            
            # Add audit fields
            update_data.update({
                'updated_at': datetime.utcnow()
            })
            
            # Remove None values and _id
            update_data = {k: v for k, v in update_data.items() if v is not None and k != '_id'}
            
            # Increment version
            result = await self.collection.update_one(
                {"_id": object_id},
                {
                    "$set": update_data,
                    "$inc": {"version": 1}
                }
            )
            
            if result.modified_count > 0:
                # Get updated document
                updated_document = await self.get_by_id(entity_id)
                logger.info("Entity updated", 
                           collection=self.collection_name,
                           entity_id=entity_id)
                return updated_document
            else:
                logger.warning("Entity not found for update", 
                              collection=self.collection_name,
                              entity_id=entity_id)
                return None
                
        except Exception as e:
            logger.error("Error updating entity", 
                        collection=self.collection_name,
                        entity_id=entity_id,
                        error=str(e))
            raise
    
    async def delete(self, entity_id: str) -> bool:
        """Soft delete an entity (mark as deleted)"""
        try:
            from bson import ObjectId
            
            # Try to convert to ObjectId if it's a valid ObjectId string
            try:
                object_id = ObjectId(entity_id)
            except:
                object_id = entity_id
            
            # Soft delete by adding deleted_at timestamp
            result = await self.collection.update_one(
                {"_id": object_id},
                {
                    "$set": {
                        "deleted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info("Entity soft deleted", 
                           collection=self.collection_name,
                           entity_id=entity_id)
                return True
            else:
                logger.warning("Entity not found for deletion", 
                              collection=self.collection_name,
                              entity_id=entity_id)
                return False
                
        except Exception as e:
            logger.error("Error deleting entity", 
                        collection=self.collection_name,
                        entity_id=entity_id,
                        error=str(e))
            raise
    
    async def find_all(self, filters: Optional[Dict[str, Any]] = None) -> List[T]:
        """Find all entities matching filters"""
        try:
            # Add soft delete filter
            query = {"deleted_at": {"$exists": False}}
            
            if filters:
                query.update(filters)
            
            cursor = self.collection.find(query)
            documents = []
            
            async for document in cursor:
                # Convert ObjectId to string
                document['_id'] = str(document['_id'])
                documents.append(document)
            
            logger.debug("Entities retrieved", 
                        collection=self.collection_name,
                        count=len(documents))
            return documents
            
        except Exception as e:
            logger.error("Error finding entities", 
                        collection=self.collection_name,
                        error=str(e))
            raise
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count entities matching filters"""
        try:
            # Add soft delete filter
            query = {"deleted_at": {"$exists": False}}
            
            if filters:
                query.update(filters)
            
            count = await self.collection.count_documents(query)
            
            logger.debug("Entities counted", 
                        collection=self.collection_name,
                        count=count)
            return count
            
        except Exception as e:
            logger.error("Error counting entities", 
                        collection=self.collection_name,
                        error=str(e))
            raise
    
    async def find_by_field(self, field: str, value: Any) -> List[T]:
        """Find entities by specific field"""
        return await self.find_all({field: value})
    
    async def find_one_by_field(self, field: str, value: Any) -> Optional[T]:
        """Find one entity by specific field"""
        try:
            from bson import ObjectId
            
            # Handle ObjectId conversion for _id field
            if field == "_id":
                try:
                    value = ObjectId(value)
                except:
                    pass
            
            query = {
                field: value,
                "deleted_at": {"$exists": False}
            }
            
            document = await self.collection.find_one(query)
            
            if document:
                document['_id'] = str(document['_id'])
                return document
            
            return None
            
        except Exception as e:
            logger.error("Error finding entity by field", 
                        collection=self.collection_name,
                        field=field,
                        value=value,
                        error=str(e))
            raise
    
    async def paginate(
        self, 
        page: int = 1, 
        page_size: int = 10, 
        filters: Optional[Dict[str, Any]] = None,
        sort_field: str = "created_at",
        sort_direction: int = -1
    ) -> Dict[str, Any]:
        """Paginate entities"""
        try:
            # Add soft delete filter
            query = {"deleted_at": {"$exists": False}}
            
            if filters:
                query.update(filters)
            
            # Calculate skip
            skip = (page - 1) * page_size
            
            # Get total count
            total = await self.collection.count_documents(query)
            
            # Get paginated results
            cursor = self.collection.find(query).sort(sort_field, sort_direction).skip(skip).limit(page_size)
            documents = []
            
            async for document in cursor:
                document['_id'] = str(document['_id'])
                documents.append(document)
            
            # Calculate pagination info
            total_pages = (total + page_size - 1) // page_size
            
            result = {
                "data": documents,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1
                }
            }
            
            logger.debug("Entities paginated", 
                        collection=self.collection_name,
                        page=page,
                        page_size=page_size,
                        total=total)
            
            return result
            
        except Exception as e:
            logger.error("Error paginating entities", 
                        collection=self.collection_name,
                        error=str(e))
            raise
