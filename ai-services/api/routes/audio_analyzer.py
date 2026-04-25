"""
Audio Analyzer API - Endpoints for audio analysis (cough detection and transcription)
Uses pre-trained models - no dataset needed
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import structlog
import base64
import io

# Import services (pre-trained models, no dataset needed)
from services.audio_transcription_service import AudioTranscriptionService
from services.cough_analysis_service import CoughAnalysisService

logger = structlog.get_logger()
router = APIRouter()

# Initialize services (singleton pattern)
_transcription_service = None
_cough_service = None


def get_transcription_service() -> AudioTranscriptionService:
    """Get or create transcription service instance"""
    global _transcription_service
    if _transcription_service is None:
        _transcription_service = AudioTranscriptionService()
    return _transcription_service


def get_cough_service() -> CoughAnalysisService:
    """Get or create cough analysis service instance"""
    global _cough_service
    if _cough_service is None:
        _cough_service = CoughAnalysisService()
    return _cough_service


class AudioAnalysisRequest(BaseModel):
    """Request model for audio analysis"""
    audio_base64: str = Field(..., description="Audio file encoded in base64")
    audio_format: str = Field(default="wav", description="Audio format (wav, mp3, etc.)")
    analysis_type: str = Field(default="cough_detection", description="Type of analysis: 'cough_detection' or 'transcription'")


class CoughAnalysisResult(BaseModel):
    """Result model for cough analysis"""
    detected: bool = Field(..., description="Whether cough was detected")
    severity: str = Field(..., description="Severity level: mild, moderate, severe")
    characteristics: List[str] = Field(default=[], description="Characteristics of the cough")
    recommendations: List[str] = Field(default=[], description="Medical recommendations")
    urgency_level: str = Field(default="medium", description="Urgency level")
    confidence: float = Field(default=0.0, description="Confidence score (0-1)")


class TranscriptionResult(BaseModel):
    """Result model for audio transcription"""
    transcription: str = Field(..., description="Transcribed text")
    language: str = Field(default="es", description="Detected language")
    confidence: float = Field(default=0.0, description="Confidence score (0-1)")


class AudioAnalysisResponse(BaseModel):
    """Response model for audio analysis"""
    success: bool = Field(..., description="Whether the analysis was successful")
    type: str = Field(..., description="Type of analysis performed")
    cough_analysis: Optional[CoughAnalysisResult] = None
    transcription: Optional[TranscriptionResult] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


@router.post("/v1/audio/cough", response_model=AudioAnalysisResponse)
async def analyze_cough(request: AudioAnalysisRequest) -> AudioAnalysisResponse:
    """
    Analyze audio to detect and classify cough
    
    Uses signal processing and audio feature extraction (no dataset needed).
    Analyzes:
    - Frequency patterns (spectral analysis)
    - Duration and intensity
    - Cough type (dry, productive, paroxysmal)
    - Medical recommendations
    """
    try:
        logger.info("Analyzing audio for cough detection", 
                   audio_format=request.audio_format,
                   audio_length=len(request.audio_base64))
        
        # Decode base64 audio
        try:
            audio_data = base64.b64decode(request.audio_base64)
        except Exception as e:
            logger.error("Error decoding audio", error=str(e))
            raise HTTPException(status_code=400, detail="Invalid base64 audio data")
        
        # Use cough analysis service (pre-trained features, no dataset needed)
        cough_service = get_cough_service()
        analysis_result = await cough_service.analyze_base64(
            request.audio_base64,
            request.audio_format
        )
        
        # Convert to response model
        result = CoughAnalysisResult(
            detected=analysis_result["detected"],
            severity=analysis_result["severity"],
            characteristics=analysis_result["characteristics"],
            recommendations=analysis_result["recommendations"],
            urgency_level=analysis_result["urgency_level"],
            confidence=analysis_result["confidence"]
        )
        
        logger.info("Cough analysis completed", 
                   detected=result.detected,
                   severity=result.severity,
                   urgency=result.urgency_level,
                   confidence=result.confidence)
        
        return AudioAnalysisResponse(
            success=True,
            type="cough",
            cough_analysis=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error analyzing cough", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing audio: {str(e)}"
        )


@router.post("/v1/audio/transcribe", response_model=AudioAnalysisResponse)
async def transcribe_audio(request: AudioAnalysisRequest) -> AudioAnalysisResponse:
    """
    Transcribe audio to text using OpenAI Whisper (pre-trained model, no dataset needed)
    
    This endpoint converts speech audio to text for users who cannot type.
    Supports multiple languages and auto-detection.
    """
    try:
        logger.info("Transcribing audio", 
                   audio_format=request.audio_format,
                   audio_length=len(request.audio_base64))
        
        # Decode base64 audio
        try:
            audio_data = base64.b64decode(request.audio_base64)
        except Exception as e:
            logger.error("Error decoding audio", error=str(e))
            raise HTTPException(status_code=400, detail="Invalid base64 audio data")
        
        # Use transcription service (Whisper pre-trained model, no dataset needed)
        transcription_service = get_transcription_service()
        transcription_result = await transcription_service.transcribe_base64(
            request.audio_base64,
            request.audio_format,
            language="es"  # Can be None for auto-detect
        )
        
        # Convert to response model
        result = TranscriptionResult(
            transcription=transcription_result["transcription"],
            language=transcription_result["language"],
            confidence=transcription_result["confidence"]
        )
        
        logger.info("Audio transcription completed",
                   transcription_length=len(result.transcription),
                   language=result.language,
                   confidence=result.confidence)
        
        return AudioAnalysisResponse(
            success=True,
            type="transcription",
            transcription=result
        )
        
    except ImportError as e:
        logger.error("Whisper not installed", error=str(e))
        raise HTTPException(
            status_code=503,
            detail="Servicio de transcripción no disponible. Instala Whisper: pip install openai-whisper"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error transcribing audio", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Error transcribing audio: {str(e)}"
        )

