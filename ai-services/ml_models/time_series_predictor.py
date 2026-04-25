"""
TimeSeriesPredictor - Stub para predicción de series temporales (tendencias).

Define una interfaz genérica para entrenar y predecir métricas clínicas
(e.g., frecuencia de síntomas, riesgo, demanda de atenciones) a lo largo del tiempo.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta


class TimeSeriesPredictor:
    def __init__(self, model_type: str = "simple-linear") -> None:
        self.model_type = model_type
        self._fitted = False

    def fit(self, series: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Ajusta el modelo con una serie de puntos: [{ 'date': iso, 'value': float }, ...].
        """
        self._fitted = True
        return {"status": "ok", "points": len(series), "model_type": self.model_type}

    def forecast(self, horizon_days: int = 7) -> List[Dict[str, Any]]:
        """
        Genera un pronóstico simple para N días. Si no hay modelo ajustado, lo simula.
        """
        if horizon_days <= 0:
            return []
        today = datetime.utcnow()
        base = 2.0  # valor base stub
        results: List[Dict[str, Any]] = []
        for i in range(1, horizon_days + 1):
            results.append(
                {
                    "date": (today + timedelta(days=i)).isoformat(),
                    "predicted": base + (i * 0.05),
                    "confidence": 0.7,
                }
            )
        return results


