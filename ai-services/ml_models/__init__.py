"""
ML Models Package for Disease Classification
"""

from importlib import import_module
from typing import Any

from .synthetic_dataset_generator import SyntheticDatasetGenerator
from .trend_predictor import DiseaseTrendPredictor
from .anomaly_detector import StatisticalAnomalyDetector, PatientRiskClusterer
from .demand_forecasting import HealthcareDemandForecaster


def _safe_import(module: str, attribute: str, fallback: Any = None) -> Any:
    """
    Import helper that returns a fallback when optional heavy dependencies
    (ej. xgboost, torch) no están disponibles durante las pruebas.
    """
    try:
        mod = import_module(module)
        return getattr(mod, attribute)
    except Exception:  # pragma: no cover - intentionally broad para pruebas
        return fallback


RandomForestClassifier = _safe_import(
    "ml_models.random_forest_model", "RandomForestClassifier", fallback=None
)
RandomForestModel = _safe_import(
    "ml_models.random_forest_model", "RandomForestModel", fallback=None
)
XGBoostClassifier = _safe_import(
    "ml_models.xgboost_model", "XGBoostClassifier", fallback=None
)
MultiTaskNeuralNetwork = _safe_import(
    "ml_models.neural_network_model", "MultiTaskNeuralNetwork", fallback=None
)
HybridRuleMLSystem = _safe_import(
    "ml_models.hybrid_system", "HybridRuleMLSystem", fallback=None
)

__all__ = [
    'SyntheticDatasetGenerator',
    'RandomForestClassifier',
    'RandomForestModel',
    'XGBoostClassifier',
    'MultiTaskNeuralNetwork',
    'HybridRuleMLSystem',
    'DiseaseTrendPredictor',
    'StatisticalAnomalyDetector',
    'PatientRiskClusterer',
    'HealthcareDemandForecaster',
]

