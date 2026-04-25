"""
Disease trend prediction utilities for the executive analytics dashboard.

This module provides a lightweight predictor that can be trained with aggregated
counts of diseases per día.  It aplica un suavizado exponencial para calcular la
dirección de la tendencia y genera proyecciones a corto plazo.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd


@dataclass
class TrendSummary:
    """Resumen estructurado de una tendencia de enfermedad."""

    disease: str
    last_value: float
    change_pct: float
    trend: str
    support: int


class DiseaseTrendPredictor:
    """
    Predictor simple de tendencias para enfermedades respiratorias.

    Parameters
    ----------
    smoothing_factor : float, optional
        Factor alfa para suavizado exponencial (0-1). Por defecto 0.35.
    min_support : int, optional
        Cantidad mínima de observaciones necesarias para calcular tendencias.
    """

    VALID_TRENDS = ("increasing", "decreasing", "stable")

    def __init__(self, smoothing_factor: float = 0.35, min_support: int = 3) -> None:
        if not 0 < smoothing_factor <= 1:
            raise ValueError("smoothing_factor debe estar en (0, 1].")
        self.smoothing_factor = smoothing_factor
        self.min_support = min_support
        self._history: Optional[pd.DataFrame] = None

    def fit(self, data: pd.DataFrame) -> "DiseaseTrendPredictor":
        """
        Ajusta el predictor con datos históricos.

        Espera un DataFrame con las columnas: ``date``, ``disease`` y ``count``.
        La fecha puede venir como string, será convertida a ``datetime64``.
        """
        required_columns = {"date", "disease", "count"}
        if not required_columns.issubset(data.columns):
            missing = required_columns - set(data.columns)
            raise ValueError(f"Faltan columnas requeridas: {missing}")

        if data.empty:
            raise ValueError("Se requieren registros históricos para entrenar el predictor.")

        df = data.copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.groupby(["disease", "date"], as_index=False)["count"].sum()
        df = df.sort_values(["disease", "date"])
        self._history = df.reset_index(drop=True)
        return self

    def _get_series(self, disease: str) -> pd.Series:
        if self._history is None:
            raise ValueError("El predictor no ha sido entrenado. Llame a `fit` primero.")

        subset = self._history[self._history["disease"] == disease]
        if subset.empty:
            raise ValueError(f"No hay datos disponibles para la enfermedad '{disease}'.")

        subset = subset.set_index("date")["count"].asfreq("D").fillna(0)
        if subset.shape[0] < self.min_support:
            raise ValueError(
                f"Se requieren al menos {self.min_support} observaciones para analizar '{disease}'."
            )
        return subset

    def get_trend_summary(self, disease: str) -> TrendSummary:
        """
        Calcula un resumen de la tendencia para la enfermedad indicada.

        Returns
        -------
        TrendSummary
            Información sobre dirección de tendencia, último valor y soporte.
        """
        series = self._get_series(disease)
        smoothed = series.ewm(alpha=self.smoothing_factor).mean()
        change_pct = float(((smoothed.iloc[-1] - smoothed.iloc[0]) / max(smoothed.iloc[0], 1e-6)) * 100)

        if change_pct > 5:
            trend = "increasing"
        elif change_pct < -5:
            trend = "decreasing"
        else:
            trend = "stable"

        return TrendSummary(
            disease=disease,
            last_value=float(smoothed.iloc[-1]),
            change_pct=float(round(change_pct, 2)),
            trend=trend,
            support=int(series.shape[0]),
        )

    def predict(self, disease: str, periods: int = 7) -> pd.DataFrame:
        """
        Genera una proyección a corto plazo para la enfermedad indicada.

        Utiliza un suavizado exponencial para estimar la tendencia y proyecta un
        crecimiento lineal basado en la variación reciente.
        """
        if periods <= 0:
            raise ValueError("`periods` debe ser un entero positivo.")

        series = self._get_series(disease)
        last_dates = series.index.values
        last_values = series.values.astype(float)

        # Cálculo de tasa de crecimiento mediante regresión lineal simple
        x = np.arange(len(last_values))
        slope = 0.0
        if len(x) > 1:
            slope, _ = np.polyfit(x, last_values, deg=1)

        smoothed = last_values.copy()
        for idx in range(1, len(smoothed)):
            smoothed[idx] = (
                self.smoothing_factor * last_values[idx]
                + (1 - self.smoothing_factor) * smoothed[idx - 1]
            )

        forecasts: List[Dict[str, float]] = []
        last_value = last_values[-1]
        last_date = last_dates[-1]
        for step in range(1, periods + 1):
            next_date = last_date + np.timedelta64(step, "D")
            # Tendencia incremental basada en la pendiente y el valor suavizado.
            forecast = float(max(0.0, smoothed[-1] + slope * step))
            # Mezcla ligera con el último valor real para evitar saltos bruscos
            forecast = float((forecast * 0.7) + (last_value * 0.3))
            forecasts.append({"date": pd.to_datetime(next_date), "predicted_count": round(forecast, 2)})

        return pd.DataFrame(forecasts)

