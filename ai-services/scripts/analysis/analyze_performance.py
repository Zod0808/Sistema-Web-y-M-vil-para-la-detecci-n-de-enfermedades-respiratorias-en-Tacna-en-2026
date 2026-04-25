"""
Analiza logs de rendimiento (monitoring/performance/*.jsonl) y calcula p50/p95/p99 por ruta y método.

Uso:
    python analyze_performance.py --days 7
"""

from __future__ import annotations

import argparse
import glob
import json
import os
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Tuple


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analizar rendimiento (percentiles) por ruta")
    parser.add_argument("--dir", type=str, default="monitoring/performance", help="Directorio de logs jsonl")
    parser.add_argument("--days", type=int, default=7, help="Días hacia atrás a considerar")
    return parser.parse_args()


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    values_sorted = sorted(values)
    k = (len(values_sorted) - 1) * p
    f = int(k)
    c = min(f + 1, len(values_sorted) - 1)
    if f == c:
        return float(values_sorted[int(k)])
    d0 = values_sorted[f] * (c - k)
    d1 = values_sorted[c] * (k - f)
    return float(d0 + d1)


def main() -> int:
    args = parse_args()
    now = datetime.utcnow()
    start_date = (now - timedelta(days=args.days)).strftime("%Y%m%d")
    files = sorted(glob.glob(os.path.join(args.dir, "perf_*.jsonl")))
    files = [f for f in files if os.path.basename(f).split("_")[1].split(".")[0] >= start_date]

    metrics: Dict[Tuple[str, str], List[float]] = defaultdict(list)  # (method, path) -> durations
    total = 0

    for path in files:
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                        key = (rec.get("method", "?"), rec.get("path", "?"))
                        duration = float(rec.get("duration_ms", 0.0))
                        if duration >= 0:
                            metrics[key].append(duration)
                            total += 1
                    except Exception:
                        continue
        except FileNotFoundError:
            continue

    report_lines: List[str] = []
    report_lines.append("# Reporte de Rendimiento por Ruta\n")
    report_lines.append(f"Periodo: últimos {args.days} días\n")
    report_lines.append(f"Total de muestras: {total}\n")
    report_lines.append("\n| Método | Ruta | n | p50 (ms) | p95 (ms) | p99 (ms) |\n|---|---|---:|---:|---:|---:|\n")

    for (method, path), durations in sorted(metrics.items(), key=lambda x: (-len(x[1]), x[0][1])):
        p50 = percentile(durations, 0.50)
        p95 = percentile(durations, 0.95)
        p99 = percentile(durations, 0.99)
        report_lines.append(f"| {method} | {path} | {len(durations)} | {p50:.1f} | {p95:.1f} | {p99:.1f} |")

    os.makedirs("monitoring/performance", exist_ok=True)
    md_path = os.path.join("monitoring", "performance", f"perf_report_{now.strftime('%Y%m%d_%H%M%S')}.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))

    print(f"[OK] Reporte generado: {md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


