"""
Repository Pattern Implementation
"""

from .base_repository import BaseRepository, IRepository
from .medical_history_repository import MedicalHistoryRepository
from .ai_result_repository import AIResultRepository
from .patient_repository import PatientRepository

__all__ = [
    'BaseRepository',
    'IRepository',
    'MedicalHistoryRepository',
    'AIResultRepository', 
    'PatientRepository'
]
