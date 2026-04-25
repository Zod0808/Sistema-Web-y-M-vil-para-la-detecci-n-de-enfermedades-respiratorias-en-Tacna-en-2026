"""
Anomaly detection utilities for analytics dashboards.

Uses statistical heuristics (z-score y ventanas móviles) para detectar valores
atípicos en series temporales clínicas.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence, Optional

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans


@dataclass
class AnomalyRecord:
    """Registro de un valor anómalo detectado."""

    index: int
    value: float
    z_score: float


class StatisticalAnomalyDetector:
    """
    Detector estadístico de anomalías basado en puntuaciones Z.

    Parameters
    ----------
    z_threshold : float, optional
        Umbral de z-score para marcar anomalías. Por defecto 2.5.
    min_std : float, optional
        Desviación estándar mínima requerida para considerar el dataset válido.
    """

    def __init__(self, z_threshold: float = 2.5, min_std: float = 1e-3) -> None:
        if z_threshold <= 0:
            raise ValueError("z_threshold debe ser positivo.")
        self.z_threshold = z_threshold
        self.min_std = min_std

    @staticmethod
    def _to_numpy(series: Sequence[float]) -> np.ndarray:
        arr = np.asarray(series, dtype=float)
        if arr.ndim != 1:
            raise ValueError("Los datos deben ser un vector unidimensional.")
        return arr

    def detect(self, series: Sequence[float]) -> List[AnomalyRecord]:
        """
        Detecta anomalías a partir de una secuencia de valores.

        Returns
        -------
        list[AnomalyRecord]
            Lista de registros con índices y z-scores que superan el umbral.
        """
        data = self._to_numpy(series)
        if data.size == 0:
            return []

        mean = data.mean()
        std = data.std(ddof=0)

        if std < self.min_std:
            return []

        z_scores = np.abs((data - mean) / std)
        indices = np.where(z_scores > self.z_threshold)[0]

        return [
            AnomalyRecord(index=int(idx), value=float(data[idx]), z_score=float(z_scores[idx]))
            for idx in indices
        ]

    def rolling_detect(
        self,
        data: pd.Series,
        window: int = 5,
    ) -> pd.Series:
        """
        Detecta anomalías utilizando ventanas móviles sobre una serie temporal.

        Parameters
        ----------
        data : pd.Series
            Serie con índice temporal.
        window : int
            Tamaño de la ventana para calcular estadísticas locales.

        Returns
        -------
        pd.Series
            Serie booleana indicando si cada punto se considera anómalo.
        """
        if window <= 1:
            raise ValueError("window debe ser mayor que 1.")

        series = data.astype(float)
        rolling_mean = series.rolling(window=window, min_periods=window).mean()
        rolling_std = series.rolling(window=window, min_periods=window).std(ddof=0).replace(0, np.nan)

        z_scores = (series - rolling_mean) / rolling_std
        anomalies = (np.abs(z_scores) > self.z_threshold) & rolling_std.notna()
        return anomalies.fillna(False)


class PatientRiskClusterer:
    """
    Clustering sencillo de pacientes por nivel de riesgo.

    Utiliza KMeans sobre métricas numéricas (ej. severidad promedio, comorbilidades,
    visitas a urgencias).
    """

    def __init__(self, n_clusters: int = 3, random_state: int = 42) -> None:
        if n_clusters < 2:
            raise ValueError("n_clusters debe ser al menos 2.")
        self.n_clusters = n_clusters
        self.random_state = random_state
        self._model: Optional[KMeans] = None
        self.feature_names: List[str] = []

    def fit(self, features: pd.DataFrame) -> "PatientRiskClusterer":
        if features.empty:
            raise ValueError("Se requieren datos para entrenar el clusterizador.")

        if not all(np.issubdtype(dtype, np.number) for dtype in features.dtypes):
            raise ValueError("Todas las columnas deben ser numéricas para realizar clustering.")

        self.feature_names = list(features.columns)
        self._model = KMeans(n_clusters=self.n_clusters, random_state=self.random_state)
        self._model.fit(features.values)
        return self

    def predict(self, features: pd.DataFrame) -> pd.Series:
        if self._model is None:
            raise ValueError("El modelo debe entrenarse antes de predecir clusters.")
        if list(features.columns) != self.feature_names:
            raise ValueError("Las columnas de entrada no coinciden con las usadas durante el entrenamiento.")

        labels = self._model.predict(features.values)
        return pd.Series(labels, index=features.index, name="risk_cluster")

    def centroids(self) -> pd.DataFrame:
        if self._model is None:
            raise ValueError("El modelo debe entrenarse antes de consultar centroides.")
        return pd.DataFrame(self._model.cluster_centers_, columns=self.feature_names)

