import pandas as pd

from ml_models.trend_predictor import DiseaseTrendPredictor
from ml_models.anomaly_detector import StatisticalAnomalyDetector, PatientRiskClusterer
from ml_models.demand_forecasting import HealthcareDemandForecaster


def test_trend_predictor_returns_increasing_summary_and_forecast():
    df = pd.DataFrame(
        {
            "date": pd.date_range("2025-10-01", periods=10, freq="D"),
            "disease": ["asma"] * 10,
            "count": [12, 14, 15, 18, 20, 22, 24, 26, 27, 30],
        }
    )
    predictor = DiseaseTrendPredictor(smoothing_factor=0.4).fit(df)
    summary = predictor.get_trend_summary("asma")
    forecast = predictor.predict("asma", periods=3)

    assert summary.trend == "increasing"
    assert summary.support == 10
    assert forecast.shape == (3, 2)
    assert forecast["predicted_count"].iloc[0] > 0


def test_anomaly_detector_flags_extreme_values():
    detector = StatisticalAnomalyDetector(z_threshold=2.0)
    series = [10, 11, 9, 10, 12, 50, 11, 10]

    anomalies = detector.detect(series)
    assert len(anomalies) == 1
    assert anomalies[0].index == 5

    rolling_series = pd.Series([10, 11, 9, 50, 11, 10, 9, 11])
    rolling_flags = detector.rolling_detect(rolling_series, window=4)
    assert rolling_flags.iloc[3] is False or rolling_flags.iloc[3] is True  # boolean output

    clusterer = PatientRiskClusterer(n_clusters=2)
    feature_df = pd.DataFrame(
        {
            "severity_score": [0.2, 0.3, 0.28, 0.85, 0.92, 0.88],
            "chronic_conditions": [0, 1, 0, 2, 3, 2],
            "recent_er_visits": [0, 0, 1, 3, 4, 3],
        },
        index=[f"patient_{i}" for i in range(6)],
    )
    clusterer.fit(feature_df)
    labels = clusterer.predict(feature_df)
    assert set(labels.unique()) <= {0, 1}
    assert clusterer.centroids().shape == (2, feature_df.shape[1])


def test_demand_forecaster_generates_predictions_and_overview():
    df = pd.DataFrame(
        {
            "date": pd.date_range("2025-09-01", periods=14, freq="D").tolist()
            + pd.date_range("2025-09-01", periods=14, freq="D").tolist(),
            "resource": ["uci_beds"] * 14 + ["ventilators"] * 14,
            "usage": [18 + i for i in range(14)] + [10 + (i * 0.5) for i in range(14)],
        }
    )

    forecaster = HealthcareDemandForecaster(window=5).fit(df)
    forecast = forecaster.forecast("uci_beds", periods=5)
    overview = forecaster.resource_overview()

    assert forecast.resource == "uci_beds"
    assert len(forecast.predictions) == 5
    assert forecast.trend > 0
    assert not overview.empty

