"""
Benchmarks de endpoints AI Services

Ejecuta cargas concurrentes contra endpoints seleccionados y calcula p50/p95/p99.

Uso:
  python benchmark_endpoints.py --base-url http://localhost:8000 --endpoints /api/v1/health,/api/v1/nlp/advanced/process --concurrency 20 --requests 500
"""

from __future__ import annotations

import argparse
import asyncio
import time
from typing import List, Dict, Tuple

try:
    import httpx
except Exception:  # pragma: no cover
    raise SystemExit("Instala httpx: pip install httpx==0.25.2")


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    vs = sorted(values)
    k = (len(vs) - 1) * p
    f = int(k)
    c = min(f + 1, len(vs) - 1)
    if f == c:
        return float(vs[int(k)])
    d0 = vs[f] * (c - k)
    d1 = vs[c] * (k - f)
    return float(d0 + d1)


async def worker(client: httpx.AsyncClient, url: str, results: List[float], errors: List[int]) -> None:
    start = time.perf_counter()
    try:
        resp = await client.get(url, timeout=10.0)
        _ = resp.status_code
    except Exception:
        errors.append(1)
        return
    finally:
        results.append((time.perf_counter() - start) * 1000.0)


async def run_benchmark(base_url: str, endpoints: List[str], concurrency: int, total_requests: int) -> Dict[str, Dict[str, float]]:
    metrics: Dict[str, Dict[str, float]] = {}
    limits = httpx.Limits(max_connections=concurrency, max_keepalive_connections=concurrency)
    async with httpx.AsyncClient(limits=limits) as client:
        for ep in endpoints:
            url = base_url.rstrip("/") + ep
            latencies: List[float] = []
            errors: List[int] = []
            tasks: List[asyncio.Task] = []
            for _ in range(total_requests):
                if len(tasks) >= concurrency:
                    await asyncio.gather(*tasks)
                    tasks = []
                tasks.append(asyncio.create_task(worker(client, url, latencies, errors)))
            if tasks:
                await asyncio.gather(*tasks)
            p50 = percentile(latencies, 0.50)
            p95 = percentile(latencies, 0.95)
            p99 = percentile(latencies, 0.99)
            metrics[ep] = {
                "n": len(latencies),
                "errors": sum(errors),
                "p50_ms": round(p50, 2),
                "p95_ms": round(p95, 2),
                "p99_ms": round(p99, 2),
            }
    return metrics


def to_markdown(metrics: Dict[str, Dict[str, float]], base_url: str, concurrency: int, total_requests: int) -> str:
    lines: List[str] = []
    lines.append("# Benchmark de Endpoints - AI Services\n")
    lines.append(f"- Base URL: {base_url}\n- Concurrency: {concurrency}\n- Requests por endpoint: {total_requests}\n")
    lines.append("\n| Endpoint | n | Errores | p50 (ms) | p95 (ms) | p99 (ms) |\n|---|---:|---:|---:|---:|---:|\n")
    for ep, m in metrics.items():
        lines.append(f"| `{ep}` | {int(m['n'])} | {int(m['errors'])} | {m['p50_ms']:.2f} | {m['p95_ms']:.2f} | {m['p99_ms']:.2f} |")
    # objetivos
    lines.append("\n## Objetivos de rendimiento\n")
    lines.append("- p95 < 200 ms en endpoints ligeros (health, metadata)\n- p95 < 500 ms en endpoints de análisis ligero\n- p99 < 1000 ms en endpoints pesados o con stubs\n")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark endpoints AI Services")
    parser.add_argument("--base-url", type=str, default="http://localhost:8000", help="Base URL del servicio")
    parser.add_argument("--endpoints", type=str, default="/api/v1/health", help="Lista separada por comas de endpoints")
    parser.add_argument("--concurrency", type=int, default=20, help="Nivel de concurrencia")
    parser.add_argument("--requests", type=int, default=200, help="Requests por endpoint")
    parser.add_argument("--output", type=str, default="benchmark_report.md", help="Archivo de salida Markdown")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    endpoints = [e.strip() for e in args.endpoints.split(",") if e.strip()]
    metrics = asyncio.run(run_benchmark(args.base_url, endpoints, args.concurrency, args.requests))
    md = to_markdown(metrics, args.base_url, args.concurrency, args.requests)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"[OK] Benchmark guardado en: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


