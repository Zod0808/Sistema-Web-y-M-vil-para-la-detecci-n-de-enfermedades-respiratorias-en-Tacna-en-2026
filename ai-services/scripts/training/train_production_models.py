"""
train_production_models.py
==========================
Entrena todos los modelos del ensemble RespiCare usando los datasets disponibles
y guarda los .pkl listos para produccion.

Uso desde ai-services/:
    python scripts/training/train_production_models.py
    python scripts/training/train_production_models.py --dataset ruta/al/dataset.csv

Flujo:
  1. Detecta el mejor dataset disponible (el mas grande con formato correcto)
  2. Entrena Random Forest  → models/base_random_forest.pkl
  3. Entrena XGBoost        → models/xgboost_model.pkl
  4. Valida predicciones de prueba
  5. Muestra resumen de accuracy

Los .pkl resultantes se commitean al repo para que
cualquier maquina (VM, CI, presentacion) funcione sin reentrenar.
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# ─── Paths canonicos ─────────────────────────────────────────────────────────
SCRIPT_DIR  = Path(__file__).resolve().parent
AI_ROOT     = SCRIPT_DIR.parent.parent
MODELS_DIR  = AI_ROOT / "models"
DATASETS    = AI_ROOT / "data" / "datasets"

# Orden de prioridad para seleccionar dataset de entrenamiento
DATASET_PRIORITY = [
    # Sintetico aumentado — 307k filas (mayor diversidad) ← MEJOR para produccion
    DATASETS / "modelo1" / "synthetic" / "augmented_dataset_retraining_20251103_123539.csv",
    DATASETS / "modelo1" / "synthetic" / "augmented_dataset_full_20251103_124126.csv",
    DATASETS / "modelo1" / "synthetic" / "synthetic_dataset_extended.csv",
    # Real aprobado — 620 filas
    DATASETS / "modelo1" / "real_approved" / "real_dataset_respicare.csv",
    # Sintetico base
    DATASETS / "modelo1" / "synthetic" / "synthetic_dataset.csv",
]

OUTPUT_MODELS = {
    "random_forest": MODELS_DIR / "base_random_forest.pkl",
    "xgboost":       MODELS_DIR / "xgboost_model.pkl",
}


def find_dataset(override: str | None) -> Path:
    if override:
        p = Path(override)
        if p.exists():
            return p
        raise FileNotFoundError(f"Dataset no encontrado: {override}")

    for candidate in DATASET_PRIORITY:
        if candidate.exists():
            size_mb = candidate.stat().st_size / 1_048_576
            print(f"  Dataset seleccionado: {candidate.name}  ({size_mb:.1f} MB)")
            return candidate

    raise FileNotFoundError(
        "No se encontro ningun dataset. Ejecuta primero:\n"
        "  python scripts/training/connect_real_datasets.py"
    )


def run_training(script_name: str, dataset: Path, output: Path) -> bool:
    """Corre un script de entrenamiento como subproceso."""
    script_path = SCRIPT_DIR / script_name
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        str(script_path),
        "--dataset", str(dataset),
        "--output",  str(output),
    ]

    print(f"\n  Ejecutando: {script_name}")
    print(f"  Dataset   : {dataset.name}")
    print(f"  Salida    : {output}")

    t0 = datetime.now()
    result = subprocess.run(
        cmd,
        cwd=str(AI_ROOT),
        capture_output=False,   # mostrar output en tiempo real
        text=True,
    )
    elapsed = (datetime.now() - t0).total_seconds()

    if result.returncode == 0:
        size_mb = output.stat().st_size / 1_048_576 if output.exists() else 0
        print(f"\n  [OK] {script_name} completado en {elapsed:.0f}s  ->  {size_mb:.1f} MB")
        return True
    else:
        print(f"\n  [ERROR] {script_name} fallo (codigo {result.returncode})")
        return False


def validate_models():
    """Prueba rapida de carga y prediccion para verificar que los modelos funcionan."""
    print("\n--- Validacion rapida ---")
    try:
        sys.path.insert(0, str(AI_ROOT))
        from ml_models.ensemble_predictor import EnsemblePredictor
        predictor = EnsemblePredictor()
        test = predictor.predict("tos, fiebre alta, dificultad respiratoria", patient_age=45)
        print(f"  Prediccion: {test.get('disease', 'N/A')}  "
              f"(confianza: {test.get('confidence', 0):.2%})")
        print("  [OK] Modelos cargados y funcionando")
        return True
    except Exception as e:
        print(f"  [AVISO] Validacion no disponible: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Entrena modelos RespiCare para produccion"
    )
    parser.add_argument("--dataset", type=str, default=None,
                        help="Ruta explícita al dataset (auto-detecta si no se indica)")
    parser.add_argument("--skip-rf",  action="store_true", help="Omitir Random Forest")
    parser.add_argument("--skip-xgb", action="store_true", help="Omitir XGBoost")
    args = parser.parse_args()

    print("=" * 60)
    print("  RespiCare - Entrenamiento de Modelos de Produccion")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 1. Seleccionar dataset
    print("\n[1] Seleccionando dataset...")
    try:
        dataset = find_dataset(args.dataset)
    except FileNotFoundError as e:
        print(f"\n[ERROR] {e}")
        return 1

    # 2. Entrenar modelos
    print("\n[2] Entrenando modelos...")
    results = {}

    if not args.skip_rf:
        print("\n-- Random Forest --")
        results["Random Forest"] = run_training(
            "train_base_model.py", dataset, OUTPUT_MODELS["random_forest"]
        )

    if not args.skip_xgb:
        print("\n-- XGBoost --")
        results["XGBoost"] = run_training(
            "train_xgboost_simple.py", dataset, OUTPUT_MODELS["xgboost"]
        )

    # 3. Validar
    print("\n[3] Validando modelos entrenados...")
    validate_models()

    # 4. Resumen
    print("\n" + "=" * 60)
    print("  RESUMEN")
    print("=" * 60)
    all_ok = True
    for model_name, ok in results.items():
        status = "[OK]" if ok else "[ERROR]"
        print(f"  {status}  {model_name}")
        all_ok = all_ok and ok

    if all_ok:
        print()
        print("  Modelos listos. Para commitear al repo:")
        print("    git add ai-services/models/base_random_forest.pkl")
        print("    git add ai-services/models/xgboost_model.pkl")
        print('    git commit -m "feat: modelos ML entrenados con datasets reales"')
    else:
        print("\n  Algunos modelos fallaron. Revisa los errores arriba.")

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())