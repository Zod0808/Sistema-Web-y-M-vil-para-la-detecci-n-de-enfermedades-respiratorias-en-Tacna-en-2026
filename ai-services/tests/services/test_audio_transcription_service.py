"""
Unit tests for Audio Transcription Service
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch, mock_open
import base64
import tempfile
import os

from services.audio_transcription_service import AudioTranscriptionService


class TestAudioTranscriptionService:
    """Test AudioTranscriptionService implementation"""
    
    @pytest.fixture
    def transcription_service(self):
        """Create audio transcription service instance"""
        return AudioTranscriptionService()
    
    @pytest.fixture
    def sample_audio_data(self):
        """Sample audio data for testing"""
        # Create minimal WAV file header (44 bytes)
        wav_header = b'RIFF' + b'\x00' * 4 + b'WAVE' + b'fmt ' + b'\x10' * 4 + b'\x01' * 2 + b'\x02' * 2 + b'\x44' * 4 + b'\x88' * 4 + b'\x04' * 2 + b'\x10' * 2 + b'data' + b'\x00' * 4
        return wav_header + b'\x00' * 100  # Add some dummy audio data
    
    @pytest.fixture
    def sample_base64_audio(self, sample_audio_data):
        """Sample base64 encoded audio"""
        return base64.b64encode(sample_audio_data).decode('utf-8')
    
    def test_service_initialization(self, transcription_service):
        """Test service initialization"""
        assert transcription_service._whisper_model is None
        assert transcription_service._model_loaded is False
    
    @pytest.mark.asyncio
    async def test_transcribe_success(self, transcription_service, sample_audio_data):
        """Test successful audio transcription"""
        # Mock whisper module
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Hola, tengo tos y fiebre",
            "language": "es",
            "segments": [
                {"no_speech_prob": 0.1, "text": "Hola"},
                {"no_speech_prob": 0.2, "text": "tengo tos y fiebre"}
            ]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav",
                language="es"
            )
            
            assert result["transcription"] == "Hola, tengo tos y fiebre"
            assert result["language"] == "es"
            assert "confidence" in result
            assert result["confidence"] > 0
            assert "segments" in result
            assert transcription_service._model_loaded is True
    
    @pytest.mark.asyncio
    async def test_transcribe_auto_language_detection(self, transcription_service, sample_audio_data):
        """Test transcription with automatic language detection"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Hello, I have a cough",
            "language": "en",
            "segments": [{"no_speech_prob": 0.1, "text": "Hello, I have a cough"}]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav",
                language=None  # Auto-detect
            )
            
            assert result["language"] == "en"
            assert mock_whisper_model.transcribe.called
            # Verify language=None was passed
            call_args = mock_whisper_model.transcribe.call_args
            assert call_args[1]["language"] is None
    
    @pytest.mark.asyncio
    async def test_transcribe_different_formats(self, transcription_service, sample_audio_data):
        """Test transcription with different audio formats"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test transcription",
            "language": "es",
            "segments": [{"no_speech_prob": 0.1, "text": "Test"}]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            for audio_format in ["wav", "mp3", "m4a", "ogg"]:
                result = await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format=audio_format,
                    language="es"
                )
                
                assert result["transcription"] == "Test transcription"
                # Verify correct file extension was used
                call_args = mock_whisper_model.transcribe.call_args
                assert call_args[0][0].endswith(f".{audio_format}")
    
    @pytest.mark.asyncio
    async def test_transcribe_confidence_calculation(self, transcription_service, sample_audio_data):
        """Test confidence calculation from segments"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test",
            "language": "es",
            "segments": [
                {"no_speech_prob": 0.1, "text": "Test"},
                {"no_speech_prob": 0.2, "text": "transcription"}
            ]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav",
                language="es"
            )
            
            # Average no_speech_prob = (0.1 + 0.2) / 2 = 0.15
            # Confidence = 1.0 - 0.15 = 0.85
            assert result["confidence"] == pytest.approx(0.85, abs=0.01)
            assert result["segments"] == 2
    
    @pytest.mark.asyncio
    async def test_transcribe_no_segments(self, transcription_service, sample_audio_data):
        """Test transcription with no segments"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test",
            "language": "es",
            "segments": []
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav",
                language="es"
            )
            
            assert result["transcription"] == "Test"
            assert result["confidence"] == 0.8  # Default confidence when no segments
            assert result["segments"] == 0
    
    @pytest.mark.asyncio
    async def test_transcribe_empty_text(self, transcription_service, sample_audio_data):
        """Test transcription with empty text result"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "",
            "language": "es",
            "segments": []
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav",
                language="es"
            )
            
            assert result["transcription"] == ""
            assert result["confidence"] == 0.0  # No transcription = 0 confidence
    
    @pytest.mark.asyncio
    async def test_transcribe_base64_success(self, transcription_service, sample_base64_audio):
        """Test base64 transcription"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Transcripción desde base64",
            "language": "es",
            "segments": [{"no_speech_prob": 0.1, "text": "Transcripción"}]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe_base64(
                audio_base64=sample_base64_audio,
                audio_format="wav",
                language="es"
            )
            
            assert result["transcription"] == "Transcripción desde base64"
            assert result["language"] == "es"
            assert "confidence" in result
    
    @pytest.mark.asyncio
    async def test_transcribe_base64_invalid(self, transcription_service):
        """Test base64 transcription with invalid base64"""
        with pytest.raises(Exception):
            await transcription_service.transcribe_base64(
                audio_base64="invalid_base64!!!",
                audio_format="wav"
            )
    
    @pytest.mark.asyncio
    async def test_transcribe_temp_file_cleanup(self, transcription_service, sample_audio_data):
        """Test that temporary files are cleaned up"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test",
            "language": "es",
            "segments": []
        }
        
        temp_file_path = None
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper, \
             patch('services.audio_transcription_service.tempfile.NamedTemporaryFile') as mock_temp:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            # Track temp file creation
            mock_file = MagicMock()
            mock_file.name = "/tmp/test_audio.wav"
            mock_file.__enter__ = MagicMock(return_value=mock_file)
            mock_file.__exit__ = MagicMock(return_value=None)
            mock_temp.return_value = mock_file
            
            with patch('services.audio_transcription_service.os.path.exists', return_value=True), \
                 patch('services.audio_transcription_service.os.unlink') as mock_unlink:
                
                await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format="wav"
                )
                
                # Verify cleanup was attempted
                mock_unlink.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_transcribe_whisper_not_installed(self, transcription_service, sample_audio_data):
        """Test transcription when Whisper is not installed"""
        with patch('services.audio_transcription_service.whisper', side_effect=ImportError("No module named 'whisper'")):
            with pytest.raises(ImportError):
                await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format="wav"
                )
    
    @pytest.mark.asyncio
    async def test_transcribe_model_load_error(self, transcription_service, sample_audio_data):
        """Test transcription when model loading fails"""
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.side_effect = Exception("Model load error")
            
            with pytest.raises(Exception, match="Model load error"):
                await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format="wav"
                )
    
    @pytest.mark.asyncio
    async def test_transcribe_transcription_error(self, transcription_service, sample_audio_data):
        """Test transcription when Whisper transcription fails"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.side_effect = Exception("Transcription error")
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            with pytest.raises(Exception, match="Transcription error"):
                await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format="wav"
                )
    
    @pytest.mark.asyncio
    async def test_transcribe_lazy_model_loading(self, transcription_service, sample_audio_data):
        """Test that model is loaded lazily"""
        assert transcription_service._model_loaded is False
        assert transcription_service._whisper_model is None
        
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test",
            "language": "es",
            "segments": []
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            # First call should load model
            await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav"
            )
            
            assert transcription_service._model_loaded is True
            assert transcription_service._whisper_model is not None
            mock_whisper.load_model.assert_called_once()
            
            # Second call should not reload
            await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav"
            )
            
            # Should still be called only once (lazy loading)
            assert mock_whisper.load_model.call_count == 1
    
    @pytest.mark.asyncio
    async def test_transcribe_different_languages(self, transcription_service, sample_audio_data):
        """Test transcription with different languages"""
        languages = ["es", "en", "fr", "de"]
        
        mock_whisper_model = MagicMock()
        
        for lang in languages:
            mock_whisper_model.transcribe.return_value = {
                "text": f"Test in {lang}",
                "language": lang,
                "segments": [{"no_speech_prob": 0.1, "text": "Test"}]
            }
            
            with patch('services.audio_transcription_service.whisper') as mock_whisper:
                mock_whisper.load_model.return_value = mock_whisper_model
                
                result = await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format="wav",
                    language=lang
                )
                
                assert result["language"] == lang
                assert result["transcription"] == f"Test in {lang}"
    
    @pytest.mark.asyncio
    async def test_transcribe_confidence_calculation_edge_cases(self, transcription_service, sample_audio_data):
        """Test confidence calculation with edge cases"""
        # High confidence (low no_speech_prob)
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "High confidence",
            "language": "es",
            "segments": [
                {"no_speech_prob": 0.05, "text": "High"},
                {"no_speech_prob": 0.03, "text": "confidence"}
            ]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav"
            )
            
            assert result["confidence"] > 0.9  # High confidence
        
        # Low confidence (high no_speech_prob)
        mock_whisper_model.transcribe.return_value = {
            "text": "Low confidence",
            "language": "es",
            "segments": [
                {"no_speech_prob": 0.8, "text": "Low"},
                {"no_speech_prob": 0.9, "text": "confidence"}
            ]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav"
            )
            
            assert result["confidence"] < 0.2  # Low confidence
    
    @pytest.mark.asyncio
    async def test_transcribe_segments_without_no_speech_prob(self, transcription_service, sample_audio_data):
        """Test transcription when segments don't have no_speech_prob"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test",
            "language": "es",
            "segments": [
                {"text": "Test"},  # Missing no_speech_prob
                {"text": "transcription", "no_speech_prob": 0.2}
            ]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav"
            )
            
            # Should use default 0.5 for missing no_speech_prob
            # Average = (0.5 + 0.2) / 2 = 0.35
            # Confidence = 1.0 - 0.35 = 0.65
            assert result["confidence"] == pytest.approx(0.65, abs=0.01)
    
    @pytest.mark.asyncio
    async def test_transcribe_empty_audio(self, transcription_service):
        """Test transcription with empty audio data"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "",
            "language": "es",
            "segments": []
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe(
                audio_data=b"",
                audio_format="wav",
                language="es"
            )
            
            assert result["transcription"] == ""
            assert result["confidence"] == 0.0
    
    @pytest.mark.asyncio
    async def test_transcribe_whisper_not_installed(self, transcription_service, sample_audio_data):
        """Test error handling when whisper is not installed"""
        with patch('services.audio_transcription_service.whisper', side_effect=ImportError("No module named 'whisper'")):
            with pytest.raises(ImportError):
                await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format="wav",
                    language="es"
                )
    
    @pytest.mark.asyncio
    async def test_transcribe_model_load_error(self, transcription_service, sample_audio_data):
        """Test error handling when model loading fails"""
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.side_effect = Exception("Model load error")
            
            with pytest.raises(Exception, match="Model load error"):
                await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format="wav",
                    language="es"
                )
    
    @pytest.mark.asyncio
    async def test_transcribe_transcription_error(self, transcription_service, sample_audio_data):
        """Test error handling when transcription fails"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.side_effect = Exception("Transcription error")
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            with pytest.raises(Exception, match="Transcription error"):
                await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format="wav",
                    language="es"
                )
    
    @pytest.mark.asyncio
    async def test_transcribe_temp_file_cleanup(self, transcription_service, sample_audio_data):
        """Test that temporary files are cleaned up after transcription"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test",
            "language": "es",
            "segments": [{"no_speech_prob": 0.1, "text": "Test"}]
        }
        
        temp_files_created = []
        
        original_named_tempfile = tempfile.NamedTemporaryFile
        
        def track_tempfile(*args, **kwargs):
            f = original_named_tempfile(*args, **kwargs)
            temp_files_created.append(f.name)
            return f
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            with patch('tempfile.NamedTemporaryFile', side_effect=track_tempfile):
                await transcription_service.transcribe(
                    audio_data=sample_audio_data,
                    audio_format="wav",
                    language="es"
                )
                
                # Verify temp file was created
                assert len(temp_files_created) > 0
                temp_file_path = temp_files_created[0]
                
                # Verify temp file was deleted
                assert not os.path.exists(temp_file_path)
    
    @pytest.mark.asyncio
    async def test_transcribe_base64_success(self, transcription_service, sample_base64_audio):
        """Test base64 transcription"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test from base64",
            "language": "es",
            "segments": [{"no_speech_prob": 0.1, "text": "Test"}]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            result = await transcription_service.transcribe_base64(
                audio_base64=sample_base64_audio,
                audio_format="wav",
                language="es"
            )
            
            assert result["transcription"] == "Test from base64"
            assert result["language"] == "es"
    
    @pytest.mark.asyncio
    async def test_transcribe_base64_invalid(self, transcription_service):
        """Test base64 transcription with invalid base64"""
        with pytest.raises(Exception):
            await transcription_service.transcribe_base64(
                audio_base64="invalid_base64!!!",
                audio_format="wav",
                language="es"
            )
    
    @pytest.mark.asyncio
    async def test_model_lazy_loading(self, transcription_service, sample_audio_data):
        """Test that model is only loaded when needed"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test",
            "language": "es",
            "segments": [{"no_speech_prob": 0.1, "text": "Test"}]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            # Model should not be loaded initially
            assert transcription_service._model_loaded is False
            assert transcription_service._whisper_model is None
            
            # First transcription should load model
            await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav",
                language="es"
            )
            
            # Model should now be loaded
            assert transcription_service._model_loaded is True
            assert transcription_service._whisper_model is not None
            assert mock_whisper.load_model.call_count == 1
            
            # Second transcription should reuse model
            await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav",
                language="es"
            )
            
            # Should not load model again
            assert mock_whisper.load_model.call_count == 1
    
    @pytest.mark.asyncio
    async def test_transcribe_fp16_disabled(self, transcription_service, sample_audio_data):
        """Test that fp16 is disabled for compatibility"""
        mock_whisper_model = MagicMock()
        mock_whisper_model.transcribe.return_value = {
            "text": "Test",
            "language": "es",
            "segments": [{"no_speech_prob": 0.1, "text": "Test"}]
        }
        
        with patch('services.audio_transcription_service.whisper') as mock_whisper:
            mock_whisper.load_model.return_value = mock_whisper_model
            
            await transcription_service.transcribe(
                audio_data=sample_audio_data,
                audio_format="wav",
                language="es"
            )
            
            # Verify fp16=False was passed
            call_args = mock_whisper_model.transcribe.call_args
            assert call_args[1]["fp16"] is False

