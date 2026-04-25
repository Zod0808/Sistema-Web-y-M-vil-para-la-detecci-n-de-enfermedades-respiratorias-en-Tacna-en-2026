"""
Análisis de tendencias temporales de predicciones

Lee logs de monitoreo (JSONL) en ai-services/monitoring y genera:
- Serie temporal diaria por enfermedad (conteos)
- Métricas agregadas (confianza promedio, tasa de alta confianza)
- Tablas CSV y un resumen en Markdown

Uso:
    python analyze_prediction_trends.py --logs-dir monitoring --days 30
"""

from __future__ import annotations

import argparse
import json
import os
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analizar tendencias temporales de predicciones")
    parser.add_argument("--logs-dir", type=str, default="monitoring", help="Directorio con archivos .jsonl")
    parser.add_argument("--days", type=int, default=30, help="Cantidad de días hacia atrás a analizar")
    parser.add_argument("--confidence-threshold", type=float, default=0.8, help="Umbral de alta confianza")
    return parser.parse_args()


def iter_jsonl_files(logs_dir: str) -> List[str]:
    if not os.path.isdir(logs_dir):
        return []
    files = [
        os.path.join(logs_dir, f)
        for f in os.listdir(logs_dir)
        if f.endswith(".jsonl")
    ]
    files.sort()
    return files


def within_range(ts: str, start_dt: datetime) -> bool:
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
        return dt >= start_dt
    except Exception:
        return False


def analyze_trends(
    files: List[str],
    days: int,
    confidence_threshold: float,
) -> Dict[str, Any]:
    start_dt = datetime.utcnow() - timedelta(days=days)
    # Estructuras
    daily_counts_by_disease: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    daily_confidence_stats: Dict[str, Dict[str, float]] = defaultdict(lambda: {"sum": 0.0, "n": 0})
    high_conf_daily_rate: Dict[str, Dict[str, int]] = defaultdict(lambda: {"high": 0, "total": 0})

    total_by_day: Dict[str, int] = defaultdict(int)

    for file_path in files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    ts = rec.get("timestamp") or rec.get("ts") or rec.get("time")
                    if not ts or not within_range(ts, start_dt):
                        continue

                    # Fecha clave (YYYY-MM-DD)
                    try:
                        dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).date()
                    except Exception:
                        continue
                    day_key = dt.isoformat()

                    disease = rec.get("disease") or rec.get("prediction", {}).get("disease") or "unknown"
                    confidence = rec.get("confidence") or rec.get("prediction", {}).get("confidence")
                    try:
                        confidence = float(confidence) if confidence is not None else None
                    except Exception:
                        confidence = None

                    # Conteos por enfermedad
                    daily_counts_by_disease[day_key][str(disease)] += 1
                    total_by_day[day_key] += 1

                    # Confianza promedio
                    if confidence is not None:
                        daily_confidence_stats[day_key]["sum"] += confidence
                        daily_confidence_stats[day_key]["n"] += 1
                        high_conf_daily_rate[day_key]["total"] += 1
                        if confidence >= confidence_threshold:
                            high_conf_daily_rate[day_key]["high"] += 1
        except FileNotFoundError:
            continue

    # Agregados
    daily_summary: List[Dict[str, Any]] = []
    for day in sorted(total_by_day.keys()):
        n = daily_confidence_stats[day]["n"]
        avg_conf = (daily_confidence_stats[day]["sum"] / n) if n > 0 else None
        high_total = high_conf_daily_rate[day]["total"]
        high_rate = (high_conf_daily_rate[day]["high"] / high_total) if high_total > 0 else None
        daily_summary.append(
            {
                "day": day,
                "total_predictions": total_by_day[day],
                "avg_confidence": round(avg_conf, 4) if avg_conf is not None else None,
                "high_conf_rate": round(high_rate, 4) if high_rate is not None else None,
            }
        )

    return {
        "daily_counts_by_disease": daily_counts_by_disease,
        "daily_summary": daily_summary,
    }


def save_csv_trends(results: Dict[str, Any]) -> None:
    # CSV 1: resumen diario
    summary_path = f"prediction_trends_summary_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    with open(summary_path, "w", encoding="utf-8") as f:
        f.write("day,total_predictions,avg_confidence,high_conf_rate\n")
        for row in results["daily_summary"]:
            f.write(
                f"{row['day']},{row['total_predictions']},{row['avg_confidence']},{row['high_conf_rate']}\n"
            )

    # CSV 2: serie temporal por enfermedad (formato largo)
    series_path = f"prediction_trends_series_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    with open(series_path, "w", encoding="utf-8") as f:
        f.write("day,disease,count\n")
        for day in sorted(results["daily_counts_by_disease"].keys()):
            for disease, count in sorted(results["daily_counts_by_disease"][day].items()):
                f.write(f"{day},{disease},{count}\n")


def save_markdown_summary(results: Dict[str, Any], days: int) -> None:
    md_path = f"prediction_trends_report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# Tendencias Temporales de Predicciones\n\n")
        f.write(f"Periodo analizado: últimos {days} días\n\n")
        f.write("## Resumen Diario\n\n")
        f.write("| Día | Total Predicciones | Confianza Promedio | Tasa Alta Confianza |\n")
        f.write("|-----|---------------------|--------------------|---------------------|\n")
        for row in results["daily_summary"]:
            avg_conf = row['avg_confidence'] if row['avg_confidence'] is not None else "-"
            high_rate = row['high_conf_rate'] if row['high_conf_rate'] is not None else "-"
            f.write(f"| {row['day']} | {row['total_predictions']} | {avg_conf} | {high_rate} |\n")
        f.write("\n> Series temporales por enfermedad disponibles en CSV (prediction_trends_series_*.csv)\n")


def main() -> int:
    args = parse_args()
    files = iter_jsonl_files(args.logs_dir)
    if not files:
        print(f"[WARN] No se encontraron archivos .jsonl en: {args.logs_dir}")
    results = analyze_trends(files, args.days, args.confidence_threshold)
    save_csv_trends(results)
    save_markdown_summary(results, args.days)
    print("[OK] Reportes generados (CSV/Markdown).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


