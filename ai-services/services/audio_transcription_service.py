"""
Audio Transcription Service - Uses OpenAI Whisper (pre-trained model, no dataset needed)
"""

from typing import Optional, Dict, Any
import structlog
import base64
import io
import tempfile
import os

logger = structlog.get_logger()


class AudioTranscriptionService:
    """Service for transcribing audio using OpenAI Whisper (pre-trained model)"""
    
    def __init__(self):
        self._whisper_model = None
        self._model_loaded = False
    
    def _load_whisper_model(self):
        """Lazy load Whisper model (only when needed)"""
        if self._model_loaded:
            return self._whisper_model
        
        try:
            import whisper
            logger.info("Loading Whisper model (base - pre-trained)")
            # Using 'base' model - good balance between speed and accuracy
            # No dataset needed - it's pre-trained on multilingual data
            self._whisper_model = whisper.load_model("base")
            self._model_loaded = True
            logger.info("Whisper model loaded successfully")
            return self._whisper_model
        except ImportError:
            logger.error("Whisper not installed. Install with: pip install openai-whisper")
            raise
        except Exception as e:
            logger.error("Error loading Whisper model", error=str(e))
            raise
    
    async def transcribe(
        self, 
        audio_data: bytes, 
        audio_format: str = "wav",
        language: Optional[str] = "es"
    ) -> Dict[str, Any]:
        """
        Transcribe audio to text using Whisper (pre-trained model)
        
        Args:
            audio_data: Raw audio bytes
            audio_format: Audio format (wav, mp3, etc.)
            language: Language code (es, en, etc.) or None for auto-detect
        
        Returns:
            Dict with transcription, language, and confidence
        """
        try:
            logger.info("Starting audio transcription", 
                       audio_length=len(audio_data),
                       format=audio_format,
                       language=language)
            
            # Load model if not already loaded
            model = self._load_whisper_model()
            
            # Save audio to temporary file (Whisper needs a file path)
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{audio_format}") as tmp_file:
                tmp_file.write(audio_data)
                tmp_file_path = tmp_file.name
            
            try:
                # Transcribe using Whisper
                # Whisper automatically handles:
                # - Language detection (if language=None)
                # - Multiple languages
                # - Noise reduction
                # - Speaker diarization (in some models)
                result = model.transcribe(
                    tmp_file_path,
                    language=language,  # None for auto-detect, "es" for Spanish
                    task="transcribe",
                    fp16=False,  # Use fp32 for compatibility
                )
                
                transcription = result.get("text", "").strip()
                detected_language = result.get("language", language or "es")
                
                # Calculate confidence from segments
                segments = result.get("segments", [])
                if segments:
                    avg_confidence = sum(seg.get("no_speech_prob", 0.5) for seg in segments) / len(segments)
                    confidence = 1.0 - avg_confidence  # Invert: lower no_speech_prob = higher confidence
                else:
                    confidence = 0.8 if transcription else 0.0
                
                logger.info("Transcription completed",
                           transcription_length=len(transcription),
                           detected_language=detected_language,
                           confidence=confidence)
                
                return {
                    "transcription": transcription,
                    "language": detected_language,
                    "confidence": float(confidence),
                    "segments": len(segments),
                }
                
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)
                    
        except Exception as e:
            logger.error("Error transcribing audio", error=str(e))
            raise
    
    async def transcribe_base64(
        self,
        audio_base64: str,
        audio_format: str = "wav",
        language: Optional[str] = "es"
    ) -> Dict[str, Any]:
        """
        Transcribe base64-encoded audio
        
        Args:
            audio_base64: Base64-encoded audio string
            audio_format: Audio format
            language: Language code or None for auto-detect
        
        Returns:
            Dict with transcription results
        """
        try:
            audio_data = base64.b64decode(audio_base64)
            return await self.transcribe(audio_data, audio_format, language)
        except Exception as e:
            logger.error("Error decoding base64 audio", error=str(e))
            raise

