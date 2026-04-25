"""
Unit tests for PredictionMonitor
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import json

from ml_models.prediction_monitor import PredictionMonitor


class TestPredictionMonitor:
    """Test PredictionMonitor implementation"""
    
    @pytest.fixture
    def temp_storage_dir(self):
        """Create temporary storage directory"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir
    
    @pytest.fixture
    def monitor(self, temp_storage_dir):
        """Create monitor instance"""
        return PredictionMonitor(storage_path=temp_storage_dir)
    
    @pytest.fixture
    def sample_prediction(self):
        """Sample prediction data"""
        return {
            "prediction_id": "pred_123",
            "patient_id": "patient_123",
            "disease": "Bronquitis",
            "confidence": 0.85,
            "urgency_level": "moderate",
            "timestamp": datetime.now().isoformat(),
            "symptoms": ["tos", "fiebre"]
        }
    
    def test_monitor_initialization(self, monitor):
        """Test monitor initialization"""
        assert monitor.storage_path.exists()
        assert monitor.window_size == 1000
    
    def test_log_prediction(self, monitor, sample_prediction):
        """Test logging prediction"""
        monitor.log_prediction(sample_prediction)
        
        assert len(monitor.predictions_log) == 1
        assert monitor.disease_counts["Bronquitis"] == 1
    
    def test_log_prediction_multiple(self, monitor, sample_prediction):
        """Test logging multiple predictions"""
        monitor.log_prediction(sample_prediction)
        
        prediction2 = sample_prediction.copy()
        prediction2["prediction_id"] = "pred_124"
        prediction2["disease"] = "Asma"
        monitor.log_prediction(prediction2)
        
        assert len(monitor.predictions_log) == 2
        assert monitor.disease_counts["Bronquitis"] == 1
        assert monitor.disease_counts["Asma"] == 1
    
    def test_get_disease_statistics(self, monitor, sample_prediction):
        """Test getting disease statistics"""
        monitor.log_prediction(sample_prediction)
        
        stats = monitor.get_disease_statistics()
        
        assert "Bronquitis" in stats
        assert stats["Bronquitis"] == 1
    
    def test_get_confidence_distribution(self, monitor, sample_prediction):
        """Test getting confidence distribution"""
        monitor.log_prediction(sample_prediction)
        
        distribution = monitor.get_confidence_distribution()
        
        assert len(distribution) > 0
        assert 0.85 in distribution
    
    def test_get_urgency_distribution(self, monitor, sample_prediction):
        """Test getting urgency distribution"""
        monitor.log_prediction(sample_prediction)
        
        distribution = monitor.get_urgency_distribution()
        
        assert "moderate" in distribution
        assert distribution["moderate"] == 1
    
    def test_detect_anomalies(self, monitor, sample_prediction):
        """Test anomaly detection"""
        # Add normal predictions
        for i in range(10):
            pred = sample_prediction.copy()
            pred["prediction_id"] = f"pred_{i}"
            pred["confidence"] = 0.7 + (i * 0.01)
            monitor.log_prediction(pred)
        
        # Add anomalous prediction (very low confidence)
        anomaly = sample_prediction.copy()
        anomaly["prediction_id"] = "pred_anomaly"
        anomaly["confidence"] = 0.1
        monitor.log_prediction(anomaly)
        
        anomalies = monitor.detect_anomalies()
        
        assert len(anomalies) > 0
    
    def test_get_performance_metrics(self, monitor, sample_prediction):
        """Test getting performance metrics"""
        monitor.log_prediction(sample_prediction)
        
        metrics = monitor.get_performance_metrics()
        
        assert "total_predictions" in metrics
        assert "average_confidence" in metrics
        assert metrics["total_predictions"] == 1
    
    def test_export_predictions(self, monitor, sample_prediction):
        """Test exporting predictions"""
        monitor.log_prediction(sample_prediction)
        
        export_path = monitor.export_predictions(days=1)
        
        assert export_path.exists()
        assert export_path.suffix == ".jsonl"
    
    def test_load_existing_predictions(self, monitor, temp_storage_dir):
        """Test loading existing predictions"""
        # Create sample JSONL file
        jsonl_file = Path(temp_storage_dir) / "predictions_2024-01-01.jsonl"
        with open(jsonl_file, 'w') as f:
            entry = {
                "prediction_id": "old_pred",
                "disease": "Asma",
                "timestamp": (datetime.now() - timedelta(days=1)).isoformat()
            }
            f.write(json.dumps(entry) + "\n")
        
        monitor._load_existing_predictions(days=2)
        
        assert len(monitor.predictions_log) > 0
    
    def test_clear_old_predictions(self, monitor, sample_prediction):
        """Test clearing old predictions"""
        # Add old prediction
        old_pred = sample_prediction.copy()
        old_pred["timestamp"] = (datetime.now() - timedelta(days=100)).isoformat()
        monitor.log_prediction(old_pred)
        
        # Add recent prediction
        monitor.log_prediction(sample_prediction)
        
        monitor.clear_old_predictions(days=30)
        
        # Old prediction should be removed
        assert len(monitor.predictions_log) <= 1

