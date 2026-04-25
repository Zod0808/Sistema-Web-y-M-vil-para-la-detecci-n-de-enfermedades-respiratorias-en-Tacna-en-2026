"""
Modelo heurístico para prever demanda de recursos médicos.

Utiliza regresiones simples y medias móviles para estimar la demanda futura
de recursos como camas UCI, ventiladores o personal disponible.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd


@dataclass
class ResourceForecast:
    """Pronóstico resumido para un recurso médico."""

    resource: str
    predictions: List[Dict[str, float]]
    trend: float
    avg_usage: float
    max_usage: float


class HealthcareDemandForecaster:
    """
    Forecasting ligero basado en tendencias lineales.

    Parameters
    ----------
    window : int, optional
        Ventana mínima de observaciones para cada recurso. Por defecto 7.
    """

    def __init__(self, window: int = 7) -> None:
        if window < 3:
            raise ValueError("window debe ser al menos 3.")
        self.window = window
        self._data: Optional[pd.DataFrame] = None

    def fit(self, data: pd.DataFrame) -> "HealthcareDemandForecaster":
        """
        Ajusta el modelo con datos históricos.

        Espera un DataFrame con columnas: ``date``, ``resource`` y ``usage``.
        """
        required = {"date", "resource", "usage"}
        if not required.issubset(data.columns):
            missing = required - set(data.columns)
            raise ValueError(f"Faltan columnas requeridas: {missing}")

        if data.empty:
            raise ValueError("No se proporcionaron registros para ajustar la demanda.")

        df = data.copy()
        df["date"] = pd.to_datetime(df["date"])
        df = df.groupby(["resource", "date"], as_index=False)["usage"].mean()
        df = df.sort_values(["resource", "date"])
        self._data = df.reset_index(drop=True)
        return self

    def _resource_series(self, resource: str) -> pd.Series:
        if self._data is None:
            raise ValueError("Debe llamar a `fit` antes de pronosticar.")

        subset = self._data[self._data["resource"] == resource]
        if subset.shape[0] < self.window:
            raise ValueError(f"No hay suficientes datos para el recurso '{resource}'.")

        series = subset.set_index("date")["usage"].asfreq("D").interpolate(limit_direction="both")
        return series

    def forecast(self, resource: str, periods: int = 7) -> ResourceForecast:
        """
        Calcula un pronóstico para el recurso indicado.

        Utiliza una regresión lineal simple para estimar la tendencia y genera
        proyecciones determinísticas.
        """
        if periods <= 0:
            raise ValueError("`periods` debe ser un entero positivo.")

        series = self._resource_series(resource)
        values = series.values
        idx = np.arange(len(values))
        slope = 0.0
        intercept = float(values[-1])

        if len(values) > 1:
            slope, intercept = np.polyfit(idx, values, deg=1)

        forecasts: List[Dict[str, float]] = []
        last_date = series.index[-1]
        for step in range(1, periods + 1):
            future_idx = len(values) - 1 + step
            prediction = max(0.0, slope * future_idx + intercept)
            forecasts.append(
                {"date": pd.to_datetime(last_date + pd.Timedelta(days=step)), "predicted_usage": round(prediction, 2)}
            )

        resource_summary = ResourceForecast(
            resource=resource,
            predictions=forecasts,
            trend=round(slope, 4),
            avg_usage=float(round(series.mean(), 2)),
            max_usage=float(round(series.max(), 2)),
        )
        return resource_summary

    def resource_overview(self) -> pd.DataFrame:
        """Devuelve una tabla con métricas descriptivas por recurso."""
        if self._data is None:
            raise ValueError("Debe llamar a `fit` antes de solicitar el overview.")

        overview = (
            self._data.groupby("resource")["usage"]
            .agg(avg_usage="mean", max_usage="max", min_usage="min", observations="count")
            .reset_index()
        )
        return overview

