"""
Unit tests for PredictionMonitor — aligned with real API signatures
"""

import pytest
import json
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

from ml_models.prediction_monitor import PredictionMonitor


# ── fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def monitor(tmp_path):
    return PredictionMonitor(storage_path=str(tmp_path / "predictions"))


@pytest.fixture
def sample_symptoms():
    return ["tos", "fiebre", "dificultad_respiratoria"]


@pytest.fixture
def sample_prediction():
    return {
        "disease": "Bronquitis",
        "confidence": 0.85,
        "urgency_level": "moderate",
        "top_3_predictions": [
            {"disease": "Bronquitis", "confidence": 0.85},
            {"disease": "Asma", "confidence": 0.10},
        ],
        "explanation": "Síntomas compatibles con bronquitis aguda",
    }


# ── initialisation ─────────────────────────────────────────────────────────────

class TestPredictionMonitorInit:
    def test_storage_path_created(self, tmp_path):
        m = PredictionMonitor(storage_path=str(tmp_path / "new_dir"))
        assert m.storage_path.exists()

    def test_initial_window_size(self, monitor):
        assert monitor.window_size == 1000

    def test_initial_predictions_log_empty(self, monitor):
        assert len(monitor.predictions_log) == 0

    def test_initial_disease_counts_empty(self, monitor):
        assert len(monitor.disease_counts) == 0


# ── log_prediction ─────────────────────────────────────────────────────────────

class TestLogPrediction:
    def test_returns_prediction_id_string(self, monitor, sample_symptoms, sample_prediction):
        pred_id = monitor.log_prediction(
            symptoms=sample_symptoms,
            prediction=sample_prediction,
        )
        assert isinstance(pred_id, str)
        assert pred_id.startswith("pred_")

    def test_appends_to_predictions_log(self, monitor, sample_symptoms, sample_prediction):
        monitor.log_prediction(symptoms=sample_symptoms, prediction=sample_prediction)
        assert len(monitor.predictions_log) == 1

    def test_updates_disease_counts(self, monitor, sample_symptoms, sample_prediction):
        monitor.log_prediction(symptoms=sample_symptoms, prediction=sample_prediction)
        assert monitor.disease_counts["Bronquitis"] == 1

    def test_updates_confidence_distribution(self, monitor, sample_symptoms, sample_prediction):
        monitor.log_prediction(symptoms=sample_symptoms, prediction=sample_prediction)
        assert 0.85 in monitor.confidence_distribution

    def test_updates_urgency_distribution(self, monitor, sample_symptoms, sample_prediction):
        monitor.log_prediction(symptoms=sample_symptoms, prediction=sample_prediction)
        assert monitor.urgency_distribution["moderate"] == 1

    def test_multiple_predictions_accumulate(self, monitor, sample_symptoms):
        for disease in ["Bronquitis", "Asma", "Bronquitis"]:
            monitor.log_prediction(
                symptoms=sample_symptoms,
                prediction={"disease": disease, "confidence": 0.8, "urgency_level": "low"},
            )
        assert len(monitor.predictions_log) == 3
        assert monitor.disease_counts["Bronquitis"] == 2
        assert monitor.disease_counts["Asma"] == 1

    def test_persists_to_jsonl_file(self, monitor, sample_symptoms, sample_prediction):
        monitor.log_prediction(symptoms=sample_symptoms, prediction=sample_prediction)
        jsonl_files = list(monitor.storage_path.glob("predictions_*.jsonl"))
        assert len(jsonl_files) == 1

    def test_accepts_optional_patient_id(self, monitor, sample_symptoms, sample_prediction):
        pred_id = monitor.log_prediction(
            symptoms=sample_symptoms,
            prediction=sample_prediction,
            patient_id="patient_42",
        )
        entry = monitor.predictions_log[0]
        assert entry["patient_id"] == "patient_42"

    def test_accepts_patient_metadata(self, monitor, sample_symptoms, sample_prediction):
        monitor.log_prediction(
            symptoms=sample_symptoms,
            prediction=sample_prediction,
            patient_metadata={"age": 35, "gender": "male"},
        )
        entry = monitor.predictions_log[0]
        assert entry["metadata"]["patient"]["age"] == 35


# ── log_feedback ───────────────────────────────────────────────────────────────

class TestLogFeedback:
    def test_returns_true_on_success(self, monitor, sample_symptoms, sample_prediction):
        pred_id = monitor.log_prediction(
            symptoms=sample_symptoms, prediction=sample_prediction
        )
        result = monitor.log_feedback(
            prediction_id=pred_id,
            feedback_type="correct",
        )
        assert result is True

    def test_creates_feedback_file(self, monitor, sample_symptoms, sample_prediction):
        pred_id = monitor.log_prediction(
            symptoms=sample_symptoms, prediction=sample_prediction
        )
        monitor.log_feedback(prediction_id=pred_id, feedback_type="incorrect",
                             actual_disease="Asma")
        feedback_files = list(monitor.storage_path.glob("feedback_*.jsonl"))
        assert len(feedback_files) == 1

    def test_feedback_with_doctor_notes(self, monitor, sample_symptoms, sample_prediction):
        pred_id = monitor.log_prediction(
            symptoms=sample_symptoms, prediction=sample_prediction
        )
        result = monitor.log_feedback(
            prediction_id=pred_id,
            feedback_type="partially_correct",
            doctor_notes="Confirmar con radiografía",
        )
        assert result is True


# ── get_metrics ────────────────────────────────────────────────────────────────

class TestGetMetrics:
    def test_empty_returns_zero_total(self, monitor):
        metrics = monitor.get_metrics(days=1)
        assert metrics["summary"]["total_predictions"] == 0

    def test_empty_returns_required_keys(self, monitor):
        metrics = monitor.get_metrics(days=1)
        assert "period" in metrics
        assert "summary" in metrics
        assert "distributions" in metrics
        assert "quality_metrics" in metrics

    def test_with_predictions_counts_correctly(self, monitor, sample_symptoms):
        for _ in range(3):
            monitor.log_prediction(
                symptoms=sample_symptoms,
                prediction={"disease": "Bronquitis", "confidence": 0.8, "urgency_level": "low"},
            )
        metrics = monitor.get_metrics(days=1)
        assert metrics["summary"]["total_predictions"] == 3

    def test_disease_distribution_populated(self, monitor, sample_symptoms):
        monitor.log_prediction(
            symptoms=sample_symptoms,
            prediction={"disease": "Asma", "confidence": 0.75, "urgency_level": "medium"},
        )
        metrics = monitor.get_metrics(days=1)
        assert "Asma" in metrics["distributions"]["diseases"]

    def test_average_confidence_calculated(self, monitor, sample_symptoms):
        for conf in [0.8, 0.9]:
            monitor.log_prediction(
                symptoms=sample_symptoms,
                prediction={"disease": "EPOC", "confidence": conf, "urgency_level": "high"},
            )
        metrics = monitor.get_metrics(days=1)
        assert metrics["summary"]["avg_confidence"] == pytest.approx(0.85, rel=1e-3)


# ── detect_anomalies ───────────────────────────────────────────────────────────

class TestDetectAnomalies:
    def test_returns_empty_below_window_size(self, monitor, sample_symptoms):
        # Only 5 predictions — below default window_size of 100
        for _ in range(5):
            monitor.log_prediction(
                symptoms=sample_symptoms,
                prediction={"disease": "Bronquitis", "confidence": 0.8,
                             "urgency_level": "low"},
            )
        assert monitor.detect_anomalies() == []

    def test_detects_low_confidence_predictions(self, monitor, sample_symptoms):
        # Add window_size normal predictions
        for _ in range(100):
            monitor.log_prediction(
                symptoms=sample_symptoms,
                prediction={"disease": "Bronquitis", "confidence": 0.85,
                             "urgency_level": "medium"},
            )
        # Add outlier with very low confidence
        monitor.log_prediction(
            symptoms=sample_symptoms,
            prediction={"disease": "Neumonía", "confidence": 0.05,
                         "urgency_level": "high"},
        )
        anomalies = monitor.detect_anomalies(window_size=100)
        assert len(anomalies) >= 1
        reasons = [a["reason"] for a in anomalies]
        assert "low_confidence" in reasons

    def test_anomaly_structure(self, monitor, sample_symptoms):
        for _ in range(100):
            monitor.log_prediction(
                symptoms=sample_symptoms,
                prediction={"disease": "Bronquitis", "confidence": 0.85,
                             "urgency_level": "medium"},
            )
        monitor.log_prediction(
            symptoms=sample_symptoms,
            prediction={"disease": "X", "confidence": 0.05, "urgency_level": "high"},
        )
        anomalies = monitor.detect_anomalies(window_size=100)
        if anomalies:
            a = anomalies[0]
            assert "prediction_id" in a
            assert "confidence" in a
            assert "reason" in a


# ── export_for_analysis ────────────────────────────────────────────────────────

class TestExportForAnalysis:
    def test_creates_output_file(self, monitor, sample_symptoms, tmp_path):
        monitor.log_prediction(
            symptoms=sample_symptoms,
            prediction={"disease": "Bronquitis", "confidence": 0.8,
                         "urgency_level": "low"},
        )
        out = str(tmp_path / "export.csv")
        result = monitor.export_for_analysis(out, days=1)
        assert result == out
        assert Path(out).exists()

    def test_empty_predictions_creates_empty_file(self, monitor, tmp_path):
        out = str(tmp_path / "empty_export.csv")
        result = monitor.export_for_analysis(out, days=1)
        assert result == out
        assert Path(out).exists()


# ── calculate_psi ──────────────────────────────────────────────────────────────

class TestCalculatePsi:
    def test_identical_distributions_near_zero(self, monitor):
        pytest.importorskip("numpy")
        import numpy as np
        values = list(np.random.uniform(0.5, 0.9, 200))
        psi = monitor.calculate_psi(values, values)
        assert isinstance(psi, float)
        assert psi >= 0

    def test_different_distributions_higher_psi(self, monitor):
        pytest.importorskip("numpy")
        import numpy as np
        reference = list(np.random.normal(0.8, 0.05, 200))
        current = list(np.random.normal(0.3, 0.05, 200))
        psi = monitor.calculate_psi(reference, current)
        assert psi > 0

    def test_raises_without_numpy(self, monitor, monkeypatch):
        import ml_models.prediction_monitor as pm_module
        monkeypatch.setattr(pm_module, "HAS_NUMPY", False)
        with pytest.raises(RuntimeError, match="NumPy"):
            monitor.calculate_psi([0.8, 0.9], [0.7, 0.8])

    def test_raises_on_empty_reference(self, monitor):
        pytest.importorskip("numpy")
        with pytest.raises(ValueError):
            monitor.calculate_psi([], [0.5, 0.6])


# ── fairness_metrics ───────────────────────────────────────────────────────────

class TestFairnessMetrics:
    def test_empty_when_no_metadata(self, monitor, sample_symptoms, sample_prediction):
        monitor.log_prediction(symptoms=sample_symptoms, prediction=sample_prediction)
        metrics = monitor.fairness_metrics(group_field="gender")
        # No patient metadata → no groups
        assert metrics == {}

    def test_groups_by_field(self, monitor, sample_symptoms, sample_prediction):
        for gender in ["male", "female", "male"]:
            monitor.log_prediction(
                symptoms=sample_symptoms,
                prediction=sample_prediction,
                patient_metadata={"gender": gender},
            )
        metrics = monitor.fairness_metrics(group_field="gender")
        assert "male" in metrics
        assert "female" in metrics
        assert metrics["male"]["count"] == 2
        assert metrics["female"]["count"] == 1

    def test_group_metrics_structure(self, monitor, sample_symptoms, sample_prediction):
        monitor.log_prediction(
            symptoms=sample_symptoms,
            prediction=sample_prediction,
            patient_metadata={"age_band": "adult"},
        )
        metrics = monitor.fairness_metrics(group_field="age_band")
        group = metrics.get("adult", {})
        assert "count" in group
        assert "avg_confidence" in group
        assert "high_confidence_rate" in group
        assert "urgency_distribution" in group


# ── get_feature_influence ──────────────────────────────────────────────────────

class TestGetFeatureInfluence:
    def test_empty_predictions_returns_empty_lists(self, monitor):
        result = monitor.get_feature_influence()
        assert result["top_features"] == []
        assert result["friendly_factors"] == []

    def test_returns_required_keys(self, monitor):
        result = monitor.get_feature_influence()
        assert "top_features" in result
        assert "friendly_factors" in result

    def test_with_explanation_data(self, monitor, sample_symptoms):
        prediction_with_explanation = {
            "disease": "Asma",
            "confidence": 0.82,
            "urgency_level": "medium",
            "explanation": {
                "positive_factors": [
                    {"feature_name": "tos", "shap_value": 0.4},
                    {"feature_name": "sibilancias", "shap_value": 0.3},
                ],
                "negative_factors": [
                    {"feature_name": "fiebre", "shap_value": -0.1},
                ],
                "friendly": {
                    "key_factors": ["Presencia de tos crónica"],
                },
            },
        }
        monitor.log_prediction(symptoms=sample_symptoms,
                               prediction=prediction_with_explanation)
        result = monitor.get_feature_influence(top_n=5)
        assert len(result["top_features"]) > 0
        feature_names = [f["feature_name"] for f in result["top_features"]]
        assert "tos" in feature_names


# ── _load_existing_predictions ────────────────────────────────────────────────

class TestLoadExistingPredictions:
    def test_loads_from_jsonl_file(self, tmp_path):
        storage = tmp_path / "load_test"
        storage.mkdir()
        monitor = PredictionMonitor(storage_path=str(storage))

        entry = {
            "prediction_id": "pred_existing_001",
            "timestamp": datetime.now().isoformat(),
            "model_name": "xgboost",
            "patient_id": None,
            "session_id": None,
            "input": {"symptoms": ["tos"], "symptom_count": 1},
            "prediction": {
                "disease": "EPOC",
                "confidence": 0.7,
                "urgency_level": "high",
                "top_3_predictions": [],
                "explanation": None,
            },
            "metadata": {"has_explanation": False, "explanation_length": 0, "patient": {}},
        }
        jsonl_file = storage / f"predictions_{datetime.now().strftime('%Y%m%d')}.jsonl"
        with open(jsonl_file, "w") as f:
            f.write(json.dumps(entry) + "\n")

        monitor._load_existing_predictions(days=1, force_reload=True)

        assert any(e["prediction_id"] == "pred_existing_001"
                   for e in monitor.predictions_log)

    def test_skips_old_entries(self, tmp_path):
        storage = tmp_path / "old_test"
        storage.mkdir()
        monitor = PredictionMonitor(storage_path=str(storage))

        old_entry = {
            "prediction_id": "pred_old_001",
            "timestamp": (datetime.now() - timedelta(days=60)).isoformat(),
            "model_name": "xgboost",
            "patient_id": None,
            "session_id": None,
            "input": {"symptoms": ["tos"], "symptom_count": 1},
            "prediction": {
                "disease": "Bronquitis",
                "confidence": 0.8,
                "urgency_level": "low",
                "top_3_predictions": [],
                "explanation": None,
            },
            "metadata": {"has_explanation": False, "explanation_length": 0, "patient": {}},
        }
        jsonl_file = storage / f"predictions_old.jsonl"
        with open(jsonl_file, "w") as f:
            f.write(json.dumps(old_entry) + "\n")

        initial_count = len(monitor.predictions_log)
        monitor._load_existing_predictions(days=7, force_reload=True)

        # Entry is >7 days old, should not be loaded
        assert len(monitor.predictions_log) == initial_count