"""
Cough Analysis Service - Uses audio features analysis (no dataset needed)
Analyzes cough characteristics using signal processing and pre-trained audio features
"""

from typing import Dict, Any, List, Optional
import structlog
import base64
import io
import numpy as np
import tempfile
import os

logger = structlog.get_logger()


class CoughAnalysisService:
    """
    Service for analyzing cough audio using trained ML models
    Uses trained cough classifier models (.pkl) for real medical diagnoses
    Falls back to signal processing if models are not available
    """
    
    def __init__(self):
        self._librosa_available = False
        self._trained_model = None
        self._label_encoder = None
        self._feature_names = None
        self._model_loaded = False
        self._check_dependencies()
        self._load_trained_model()
    
    def _check_dependencies(self):
        """Check if audio processing libraries are available"""
        try:
            import librosa
            import soundfile
            self._librosa_available = True
            logger.info("Audio processing libraries available")
        except ImportError:
            logger.warning("librosa/soundfile not available. Install with: pip install librosa soundfile")
            self._librosa_available = False
    
    def _load_trained_model(self):
        """Load trained cough classifier model if available"""
        try:
            import joblib
            import os
            
            # Possible model paths
            model_paths = [
                'models/cough_classifier.pkl',
                '/app/models/cough_classifier.pkl',
                'ai-services/models/cough_classifier.pkl',
                os.path.join(os.path.dirname(__file__), '../models/cough_classifier.pkl')
            ]
            
            for path in model_paths:
                if os.path.exists(path):
                    try:
                        model_data = joblib.load(path)
                        self._trained_model = model_data.get('model')
                        self._label_encoder = model_data.get('label_encoder')
                        self._feature_names = model_data.get('feature_names', [])
                        self._model_loaded = True
                        logger.info("Trained cough classifier model loaded", path=path)
                        return
                    except Exception as e:
                        logger.warning("Error loading trained model", path=path, error=str(e))
                        continue
            
            logger.info("No trained cough classifier model found, using signal processing analysis")
            self._model_loaded = False
            
        except ImportError:
            logger.warning("joblib not available, cannot load trained models")
            self._model_loaded = False
        except Exception as e:
            logger.error("Error loading trained cough model", error=str(e))
            self._model_loaded = False
    
    def _extract_audio_features(self, audio_path: str) -> Dict[str, Any]:
        """
        Extract audio features using librosa (signal processing, no ML model needed)
        
        Features extracted:
        - Spectral features (frequency domain)
        - Temporal features (time domain)
        - MFCC (Mel-frequency cepstral coefficients)
        - Zero crossing rate
        - Spectral centroid, rolloff, bandwidth
        """
        if not self._librosa_available:
            raise ImportError("librosa not available. Install with: pip install librosa soundfile")
        
        import librosa
        import soundfile as sf
        
        # Load audio file
        y, sr = librosa.load(audio_path, sr=None)  # Load with original sample rate
        
        # Duration
        duration = len(y) / sr
        
        # Zero Crossing Rate (indicates frequency of waveform crossing zero)
        zcr = librosa.feature.zero_crossing_rate(y)[0]
        avg_zcr = float(np.mean(zcr))
        
        # Spectral features
        spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
        spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
        
        # MFCC (Mel-frequency cepstral coefficients) - good for audio classification
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        
        # Chroma features (pitch class)
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        
        # Energy/RMS (Root Mean Square)
        rms = librosa.feature.rms(y=y)[0]
        
        # Tempo (if applicable)
        try:
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        except:
            tempo = 0
        
        return {
            "duration": float(duration),
            "sample_rate": int(sr),
            "zero_crossing_rate": float(avg_zcr),
            "spectral_centroid_mean": float(np.mean(spectral_centroids)),
            "spectral_centroid_std": float(np.std(spectral_centroids)),
            "spectral_rolloff_mean": float(np.mean(spectral_rolloff)),
            "spectral_bandwidth_mean": float(np.mean(spectral_bandwidth)),
            "mfcc_mean": [float(x) for x in np.mean(mfccs, axis=1)],
            "chroma_mean": [float(x) for x in np.mean(chroma, axis=1)],
            "rms_mean": float(np.mean(rms)),
            "rms_max": float(np.max(rms)),
            "tempo": float(tempo),
        }
    
    def _analyze_cough_characteristics(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze cough characteristics based on audio features
        Uses medical knowledge and signal processing (no ML model needed)
        
        Cough types:
        - Dry cough: Higher frequency, less energy in lower frequencies
        - Productive cough: More energy, lower frequency components
        - Paroxysmal cough: Multiple bursts, high variability
        - Chronic cough: Longer duration, consistent patterns
        """
        duration = features["duration"]
        spectral_centroid = features["spectral_centroid_mean"]
        spectral_bandwidth = features["spectral_bandwidth_mean"]
        rms_mean = features["rms_mean"]
        rms_max = features["rms_max"]
        zcr = features["zero_crossing_rate"]
        
        characteristics = []
        severity = "mild"
        urgency = "low"
        
        # Duration analysis
        if duration < 0.5:
            characteristics.append("Tos muy corta")
        elif duration < 2.0:
            characteristics.append("Tos corta")
        elif duration < 5.0:
            characteristics.append("Tos de duración moderada")
            severity = "moderate"
        else:
            characteristics.append("Tos prolongada")
            severity = "moderate"
            urgency = "medium"
        
        # Frequency analysis (spectral centroid)
        # Higher centroid = higher pitch (dry cough)
        # Lower centroid = lower pitch (productive cough)
        if spectral_centroid > 3000:  # High frequency
            characteristics.append("Tos seca (alta frecuencia)")
            severity = "moderate" if severity == "mild" else severity
        elif spectral_centroid < 1500:  # Low frequency
            characteristics.append("Tos productiva (baja frecuencia)")
            severity = "moderate"
            urgency = "medium"
        else:
            characteristics.append("Tos mixta")
        
        # Energy analysis (RMS)
        # High energy = forceful cough
        if rms_max > 0.3:
            characteristics.append("Tos intensa")
            severity = "moderate" if severity == "mild" else "severe"
            urgency = "high" if urgency == "low" else "medium"
        elif rms_mean < 0.05:
            characteristics.append("Tos débil")
        
        # Bandwidth analysis (variability)
        if spectral_bandwidth > 3000:
            characteristics.append("Tos variable (posible paroxística)")
            severity = "moderate"
            urgency = "medium"
        
        # Zero crossing rate (noise/breathiness)
        if zcr > 0.15:
            characteristics.append("Componente de respiración presente")
        
        # Determine final severity
        if "prolongada" in " ".join(characteristics) and "intensa" in " ".join(characteristics):
            severity = "severe"
            urgency = "high"
        elif "prolongada" in " ".join(characteristics) or "intensa" in " ".join(characteristics):
            severity = "moderate"
            urgency = "medium"
        
        # Generate recommendations based on analysis
        recommendations = self._generate_medical_recommendations(characteristics, severity, urgency)
        
        # Calculate confidence based on feature quality
        confidence = min(0.95, 0.6 + (duration * 0.05) + (len(characteristics) * 0.05))
        
        return {
            "detected": True,
            "severity": severity,
            "characteristics": characteristics,
            "recommendations": recommendations,
            "urgency_level": urgency,
            "confidence": float(confidence),
            "features_summary": {
                "duration_seconds": round(duration, 2),
                "frequency_range": "high" if spectral_centroid > 2500 else "low" if spectral_centroid < 1500 else "medium",
                "energy_level": "high" if rms_max > 0.3 else "low" if rms_mean < 0.05 else "medium",
            }
        }
    
    def _analyze_with_trained_model(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use trained ML model to classify cough and provide medical diagnosis
        
        Args:
            features: Extracted audio features
            
        Returns:
            Dict with cough classification, diagnosis, and recommendations
        """
        try:
            import numpy as np
            
            # Prepare feature vector from extracted features
            # Map features to the format expected by the trained model
            feature_vector = self._prepare_feature_vector(features)
            
            # Predict using trained model
            prediction_idx = self._trained_model.predict(feature_vector.reshape(1, -1))[0]
            prediction_probs = self._trained_model.predict_proba(feature_vector.reshape(1, -1))[0]
            
            # Get predicted cough type/condition
            cough_type = self._label_encoder.inverse_transform([prediction_idx])[0]
            confidence = float(prediction_probs[prediction_idx])
            
            # Get top 3 predictions
            top_indices = np.argsort(prediction_probs)[-3:][::-1]
            top_predictions = [
                {
                    'type': self._label_encoder.inverse_transform([idx])[0],
                    'confidence': float(prediction_probs[idx])
                }
                for idx in top_indices
            ]
            
            # Determine characteristics
            characteristics = self._get_characteristics_from_type(cough_type)

            # Map cough type to severity and urgency
            severity, urgency = self._classify_severity_from_type(cough_type, confidence)

            # Generate medical recommendations based on diagnosis
            recommendations = self._generate_medical_recommendations(characteristics, severity, urgency, cough_type)
            
            logger.info("Cough analyzed with trained model",
                       cough_type=cough_type,
                       confidence=confidence,
                       severity=severity,
                       urgency=urgency)
            
            return {
                "detected": True,
                "cough_type": cough_type,
                "severity": severity,
                "characteristics": characteristics,
                "recommendations": recommendations,
                "urgency_level": urgency,
                "confidence": confidence,
                "top_predictions": top_predictions,
                "diagnosis": f"Tos clasificada como: {cough_type}",
                "model_used": "trained_ml_model",
                "features_summary": {
                    "duration_seconds": round(features.get("duration", 0), 2),
                    "frequency_range": "high" if features.get("spectral_centroid_mean", 0) > 2500 else "low" if features.get("spectral_centroid_mean", 0) < 1500 else "medium",
                }
            }
            
        except Exception as e:
            logger.error("Error using trained model, falling back to signal processing", error=str(e))
            return self._analyze_cough_characteristics(features)
    
    def _prepare_feature_vector(self, features: Dict[str, Any]) -> np.ndarray:
        """Prepare feature vector from extracted audio features for ML model"""
        import numpy as np
        
        # Extract key features in the order expected by the model
        # This should match the feature order from training
        feature_list = [
            features.get("duration", 0),
            features.get("zero_crossing_rate", 0),
            features.get("spectral_centroid_mean", 0),
            features.get("spectral_centroid_std", 0),
            features.get("spectral_rolloff_mean", 0),
            features.get("spectral_bandwidth_mean", 0),
            features.get("rms_mean", 0),
            features.get("rms_max", 0),
            features.get("tempo", 0),
        ]
        
        # Add MFCC features (13 coefficients)
        mfcc_mean = features.get("mfcc_mean", [0] * 13)
        feature_list.extend(mfcc_mean[:13])
        
        # Add chroma features (12)
        chroma_mean = features.get("chroma_mean", [0] * 12)
        feature_list.extend(chroma_mean[:12])
        
        return np.array(feature_list[:self._trained_model.n_features_in_ if hasattr(self._trained_model, 'n_features_in_') else len(feature_list)])
    
    def _classify_severity_from_type(self, cough_type: str, confidence: float) -> tuple:
        """Classify severity and urgency based on cough type"""
        cough_type_lower = cough_type.lower()
        
        # Map cough types to severity
        if any(term in cough_type_lower for term in ['severe', 'severo', 'critico', 'acute', 'agudo']):
            return "severe", "high"
        elif any(term in cough_type_lower for term in ['moderate', 'moderado', 'chronic', 'cronico']):
            return "moderate", "medium"
        elif any(term in cough_type_lower for term in ['mild', 'leve', 'normal']):
            return "mild", "low"
        else:
            # Default based on confidence
            if confidence > 0.8:
                return "moderate", "medium"
            else:
                return "mild", "low"
    
    def _get_characteristics_from_type(self, cough_type: str) -> List[str]:
        """Get characteristics description from cough type"""
        cough_type_lower = cough_type.lower()
        characteristics = []
        
        if 'dry' in cough_type_lower or 'seca' in cough_type_lower:
            characteristics.append("Tos seca")
        if 'productive' in cough_type_lower or 'productiva' in cough_type_lower:
            characteristics.append("Tos productiva")
        if 'paroxysmal' in cough_type_lower or 'paroxística' in cough_type_lower:
            characteristics.append("Tos paroxística")
        if 'chronic' in cough_type_lower or 'cronica' in cough_type_lower:
            characteristics.append("Tos crónica")
        if 'acute' in cough_type_lower or 'aguda' in cough_type_lower:
            characteristics.append("Tos aguda")
        
        return characteristics if characteristics else ["Tos detectada"]
    
    def _generate_medical_recommendations(
        self, 
        characteristics: List[str], 
        severity: str, 
        urgency: str,
        cough_type: Optional[str] = None
    ) -> List[str]:
        """Generate medical recommendations based on trained model diagnosis"""
        recommendations = []
        
        # General recommendations
        recommendations.append("Mantén hidratación adecuada")
        recommendations.append("Evita irritantes como humo, polvo y productos químicos")
        
        # Type-specific medical recommendations (from trained model)
        if cough_type:
            cough_type_lower = cough_type.lower()
            
            if 'dry' in cough_type_lower or 'seca' in cough_type_lower:
                recommendations.append("Para tos seca: considera usar un humidificador")
                recommendations.append("Evita ambientes secos y mantén las vías respiratorias húmedas")
            elif 'productive' in cough_type_lower or 'productiva' in cough_type_lower:
                recommendations.append("La tos productiva puede indicar infección respiratoria")
                recommendations.append("Consulta con un médico para descartar infección bacteriana")
            elif 'chronic' in cough_type_lower or 'cronica' in cough_type_lower:
                recommendations.append("Tos crónica requiere evaluación médica especializada")
                recommendations.append("Puede estar relacionada con condiciones subyacentes que necesitan tratamiento")
            elif 'paroxysmal' in cough_type_lower or 'paroxística' in cough_type_lower:
                recommendations.append("Tos paroxística puede ser síntoma de enfermedades graves")
                recommendations.append("Consulta con un médico urgentemente para evaluación completa")
        
        # Characteristic-based recommendations
        characteristics_str = " ".join(characteristics).lower()
        if "productiva" in characteristics_str:
            recommendations.append("La tos productiva puede indicar infección - consulta si persiste")
        if "prolongada" in characteristics_str:
            recommendations.append("Una tos prolongada puede requerir evaluación médica")
        if "intensa" in characteristics_str:
            recommendations.append("Evita esfuerzos físicos hasta que la tos mejore")
        
        # Severity-based recommendations
        if severity == "severe" or urgency == "high":
            recommendations.insert(0, "⚠️ Consulta con un médico de inmediato")
            recommendations.append("Monitorea otros síntomas: fiebre, dificultad respiratoria, dolor en el pecho")
            recommendations.append("Busca atención médica urgente si hay dificultad para respirar")
        elif severity == "moderate":
            recommendations.insert(0, "Consulta con un médico si la tos persiste más de 3 días")
            recommendations.append("Considera usar un humidificador en tu habitación")
            recommendations.append("Evita esfuerzos físicos hasta que la tos mejore")
        else:
            recommendations.append("Monitorea la tos durante los próximos días")
            recommendations.append("Descansa y mantén una buena hidratación")
        
        return recommendations
    
    async def analyze(
        self,
        audio_data: bytes,
        audio_format: str = "wav"
    ) -> Dict[str, Any]:
        """
        Analyze cough audio
        
        Args:
            audio_data: Raw audio bytes
            audio_format: Audio format (wav, mp3, etc.)
        
        Returns:
            Dict with cough analysis results
        """
        try:
            logger.info("Starting cough analysis",
                       audio_length=len(audio_data),
                       format=audio_format)
            
            if not self._librosa_available:
                # Fallback to basic analysis
                logger.warning("librosa not available, using basic analysis")
                return self._basic_analysis(audio_data)
            
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{audio_format}") as tmp_file:
                tmp_file.write(audio_data)
                tmp_file_path = tmp_file.name
            
            try:
                # Extract audio features
                features = self._extract_audio_features(tmp_file_path)
                
                # Use trained ML model if available
                if self._model_loaded and self._trained_model:
                    analysis = self._analyze_with_trained_model(features)
                else:
                    # Fallback to signal processing analysis
                    analysis = self._analyze_cough_characteristics(features)
                
                logger.info("Cough analysis completed",
                           detected=analysis["detected"],
                           severity=analysis.get("severity", "unknown"),
                           urgency=analysis.get("urgency_level", "unknown"),
                           using_trained_model=self._model_loaded)
                
                return analysis
                
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_file_path):
                    os.unlink(tmp_file_path)
                    
        except Exception as e:
            logger.error("Error analyzing cough", error=str(e))
            # Return basic analysis as fallback
            return self._basic_analysis(audio_data)
    
    def _basic_analysis(self, audio_data: bytes) -> Dict[str, Any]:
        """Basic analysis fallback when librosa is not available"""
        duration_estimate = len(audio_data) / 16000  # Rough estimate
        
        detected = len(audio_data) > 1000
        severity = "moderate" if duration_estimate > 2.0 else "mild"
        urgency = "medium" if duration_estimate > 3.0 else "low"
        
        characteristics = []
        if duration_estimate > 3.0:
            characteristics.append("Tos prolongada")
        if duration_estimate < 1.0:
            characteristics.append("Tos corta")
        
        recommendations = [
            "Mantén hidratación adecuada",
            "Evita irritantes como el humo y polvo",
            "Consulta con un médico si la tos persiste más de 3 días",
        ]
        
        return {
            "detected": detected,
            "severity": severity,
            "characteristics": characteristics,
            "recommendations": recommendations,
            "urgency_level": urgency,
            "confidence": 0.5,
        }
    
    async def analyze_base64(
        self,
        audio_base64: str,
        audio_format: str = "wav"
    ) -> Dict[str, Any]:
        """
        Analyze base64-encoded cough audio
        
        Args:
            audio_base64: Base64-encoded audio string
            audio_format: Audio format
        
        Returns:
            Dict with cough analysis results
        """
        try:
            audio_data = base64.b64decode(audio_base64)
            return await self.analyze(audio_data, audio_format)
        except Exception as e:
            logger.error("Error decoding base64 audio", error=str(e))
            raise

