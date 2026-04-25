from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from ml_models.trend_predictor import DiseaseTrendPredictor
from ml_models.anomaly_detector import StatisticalAnomalyDetector, PatientRiskClusterer
from ml_models.prediction_monitor import PredictionMonitor
import ml_models.prediction_monitor as monitor_module


def test_prediction_monitor_fairness_metrics(tmp_path):
    monitor = PredictionMonitor(storage_path=str(tmp_path))

    samples = [
        {
            "symptoms": ["tos", "fiebre"],
            "prediction": {"disease": "asma", "confidence": 0.92, "urgency_level": "low"},
            "patient_id": "p-001",
            "metadata": {"gender": "F", "age_band": "30-39"},
        },
        {
            "symptoms": ["disnea", "dolor torácico"],
            "prediction": {"disease": "neumonía", "confidence": 0.65, "urgency_level": "high"},
            "patient_id": "p-002",
            "metadata": {"gender": "M", "age_band": "40-49"},
        },
        {
            "symptoms": ["fatiga", "malestar"],
            "prediction": {"disease": "asma", "confidence": 0.81, "urgency_level": "medium"},
            "patient_id": "p-003",
            "metadata": {"gender": "F", "age_band": "30-39"},
        },
    ]

    for entry in samples:
        monitor.log_prediction(
            symptoms=entry["symptoms"],
            prediction=entry["prediction"],
            model_name="ensemble",
            patient_id=entry["patient_id"],
            patient_metadata=entry["metadata"],
        )

    fairness = monitor.fairness_metrics(group_field="gender", high_confidence_threshold=0.8)

    assert set(fairness.keys()) == {"F", "M"}
    assert fairness["F"]["count"] == 2
    assert pytest.approx(fairness["F"]["high_confidence_rate"], rel=1e-3) == 1.0
    assert fairness["M"]["urgency_distribution"]["high"] == 1


def test_prediction_monitor_calculate_psi_detects_shift(tmp_path):
    monitor = PredictionMonitor(storage_path=str(tmp_path))
    reference = np.array([0.2, 0.25, 0.3, 0.27, 0.26, 0.24, 0.28])
    current = np.array([0.35, 0.4, 0.38, 0.36, 0.42, 0.37, 0.39])

    psi = monitor.calculate_psi(reference, current, bins=5)
    assert psi > 0.2  # indica drift relevante


def test_prediction_monitor_metrics_anomalies_and_exports(tmp_path):
    monitor = PredictionMonitor(storage_path=str(tmp_path))

    base_time = datetime.now()
    # Generar 5 predicciones con diferentes niveles de confianza
    for idx, conf in enumerate([0.95, 0.88, 0.82, 0.45, 0.4]):
        # Ajustar timestamp manualmente para evitar filtros por días
        pred_id = monitor.log_prediction(
            symptoms=["tos", "fiebre"],
            prediction={
                "disease": "asma" if idx < 3 else "neumonía",
                "confidence": conf,
                "urgency_level": "high" if conf > 0.8 else "low",
                "top_3_predictions": [],
            },
            model_name="xgboost",
            patient_metadata={"gender": "F" if idx % 2 == 0 else "M"},
        )
        monitor.predictions_log[-1]["timestamp"] = (base_time - timedelta(minutes=idx)).isoformat()
        monitor.log_feedback(
            prediction_id=pred_id,
            feedback_type="correct" if conf > 0.8 else "incorrect",
            actual_disease="asma" if conf > 0.8 else "neumonía",
        )

    metrics = monitor.get_metrics(days=1)
    assert metrics["summary"]["total_predictions"] == 5
    assert metrics["distributions"]["diseases"]["neumonía"] == 2
    assert metrics["quality_metrics"]["low_confidence_rate"] > 0

    anomalies = monitor.detect_anomalies(window_size=3)
    assert any(item["reason"] == "low_confidence" for item in anomalies)

    export_path = tmp_path / "predicciones.csv"
    exported = monitor.export_for_analysis(str(export_path), days=1)
    assert Path(exported).exists()
    with open(exported, "r", encoding="utf-8") as f:
        contents = f.read()
        assert "prediction_id" in contents


def test_prediction_monitor_fallback_modes(monkeypatch, tmp_path):
    monitor = monitor_module.PredictionMonitor(storage_path=str(tmp_path))

    # Cuando NumPy no está disponible, calculate_psi debe notificarlo.
    monkeypatch.setattr(monitor_module, "HAS_NUMPY", False, raising=False)
    with pytest.raises(RuntimeError):
        monitor.calculate_psi([0.1, 0.2], [0.2, 0.3])
    monkeypatch.setattr(monitor_module, "HAS_NUMPY", True, raising=False)

    # Simular exportación sin pandas para cubrir la rama de fallback CSV manual.
    monitor.log_prediction(
        symptoms=["tos"],
        prediction={"disease": "asma", "confidence": 0.7, "urgency_level": "medium"},
        model_name="baseline",
    )
    dummy_path = tmp_path / "manual.csv"
    monkeypatch.setattr(monitor_module, "HAS_PANDAS", False, raising=False)
    exported = monitor.export_for_analysis(str(dummy_path), days=1)
    assert Path(exported).exists()
    monkeypatch.setattr(monitor_module, "HAS_PANDAS", True, raising=False)

    # Conjunto vacío produce estructura vacía en get_metrics (no error key).
    empty_monitor = monitor_module.PredictionMonitor(storage_path=str(tmp_path / "empty"))
    empty_metrics = empty_monitor.get_metrics(days=1)
    # get_metrics devuelve estructura vacía, no un diccionario con "error"
    assert empty_metrics["summary"]["total_predictions"] == 0
    assert empty_metrics["summary"]["avg_confidence"] == 0.0
    assert empty_monitor.detect_anomalies(window_size=5) == []


def test_prediction_monitor_feature_influence(tmp_path):
    monitor = PredictionMonitor(storage_path=str(tmp_path))

    monitor.log_prediction(
      symptoms=["tos", "fiebre"],
      prediction={
        "disease": "asma",
        "confidence": 0.9,
        "urgency_level": "medium",
        "top_3_predictions": [],
        "explanation": {
          "method": "shap",
          "raw_contributions": {
            "positive_factors": [
              {"feature_name": "tos", "shap_value": 0.45, "feature_importance": 0.45},
            ],
            "negative_factors": [
              {"feature_name": "fiebre", "shap_value": -0.2, "feature_importance": 0.2},
            ],
          },
        },
      },
      model_name="xgboost",
    )

    monitor.log_prediction(
      symptoms=["disnea"],
      prediction={
        "disease": "neumonía",
        "confidence": 0.75,
        "urgency_level": "high",
        "top_3_predictions": [],
        "explanation": {
          "method": "shap",
          "raw_contributions": {
            "positive_factors": [
              {"feature_name": "disnea", "shap_value": 0.3, "feature_importance": 0.3},
            ],
            "decision_factors": [
              {"feature_name": "tos", "shap_value": 0.1, "feature_importance": 0.1},
            ],
          },
          "friendly": {
            "key_factors": ["El síntoma 'disnea' aumenta la probabilidad de este diagnóstico"],
          },
        },
      },
      model_name="xgboost",
    )

    influence = monitor.get_feature_influence(top_n=5)

    feature_names = [item["feature_name"] for item in influence["top_features"]]
    assert "tos" in feature_names
    assert any(item["feature_name"] == "disnea" for item in influence["top_features"])
    assert influence["friendly_factors"][0]["description"].startswith("El síntoma 'disnea'")


def test_trend_predictor_requires_min_support():
    df = pd.DataFrame(
        {
            "date": pd.date_range("2025-10-01", periods=2, freq="D"),
            "disease": ["asma"] * 2,
            "count": [10, 15],
        }
    )
    predictor = DiseaseTrendPredictor(min_support=3).fit(df)

    with pytest.raises(ValueError):
        predictor.get_trend_summary("asma")


def test_statistical_anomaly_detector_handles_low_variance():
    detector = StatisticalAnomalyDetector(z_threshold=3.0, min_std=0.5)
    nearly_constant_series = [10] * 20

    anomalies = detector.detect(nearly_constant_series)
    assert anomalies == []


def test_statistical_anomaly_detector_validations():
    with pytest.raises(ValueError):
        StatisticalAnomalyDetector(z_threshold=0)

    detector = StatisticalAnomalyDetector(z_threshold=2.5)

    with pytest.raises(ValueError):
        detector._to_numpy([[1, 2], [3, 4]])  # type: ignore[arg-type]

    assert detector.detect([]) == []  # sin valores, retorna lista vacía

    with pytest.raises(ValueError):
        detector.rolling_detect(pd.Series([1, 2, 3]), window=1)


def test_patient_risk_clusterer_validations():
    clusterer = PatientRiskClusterer(n_clusters=2, random_state=0)

    with pytest.raises(ValueError):
        clusterer.fit(pd.DataFrame())

    with pytest.raises(ValueError):
        clusterer.fit(pd.DataFrame({"feature": ["a", "b"]}))

    feature_df = pd.DataFrame(
        {
            "severity_score": [0.2, 0.4, 0.8, 0.9],
            "chronic_conditions": [0, 1, 2, 3],
        }
    )
    clusterer.fit(feature_df)
    labels = clusterer.predict(feature_df)
    assert len(labels.unique()) == 2
    centroids = clusterer.centroids()
    assert centroids.shape == (2, feature_df.shape[1])


def test_trend_predictor_error_conditions():
    with pytest.raises(ValueError):
        DiseaseTrendPredictor(smoothing_factor=0)  # inválido

    predictor = DiseaseTrendPredictor()
    with pytest.raises(ValueError):
        predictor.fit(pd.DataFrame())  # faltan columnas

    df_missing = pd.DataFrame({"date": ["2025-10-01"], "disease": ["asma"]})
    with pytest.raises(ValueError):
        predictor.fit(df_missing)

    df = pd.DataFrame(
        {
            "date": pd.date_range("2025-10-01", periods=6, freq="D"),
            "disease": ["asma"] * 6,
            "count": [10, 12, 13, 12, 11, 9],
        }
    )
    predictor.fit(df)

    with pytest.raises(ValueError):
        predictor.get_trend_summary("influenza")

    with pytest.raises(ValueError):
        predictor.predict("asma", periods=0)

    summary = predictor.get_trend_summary("asma")
    assert summary.trend in predictor.VALID_TRENDS

    forecast = predictor.predict("asma", periods=2)
    assert list(forecast.columns) == ["date", "predicted_count"]


def test_trend_predictor_stable_and_decreasing():
    data = pd.DataFrame(
        {
            "date": pd.date_range("2025-01-01", periods=6, freq="D"),
            "disease": ["faringitis"] * 6,
            "count": [20, 21, 20, 19, 20, 19.5],
        }
    )
    predictor = DiseaseTrendPredictor(smoothing_factor=0.3, min_support=3).fit(data)
    summary = predictor.get_trend_summary("faringitis")
    assert summary.trend == "stable"

    decreasing_data = data.copy()
    decreasing_data["count"] = [30, 28, 26, 23, 21, 18]
    predictor.fit(decreasing_data)
    summary_dec = predictor.get_trend_summary("faringitis")
    assert summary_dec.trend == "decreasing"

