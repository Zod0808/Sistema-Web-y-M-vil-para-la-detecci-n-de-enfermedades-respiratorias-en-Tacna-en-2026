"""
Conecta los datasets reales aprobados científicamente al pipeline de entrenamiento ML.

Datasets reales disponibles en ai-services/data/datasets/:
  1. Disease_symptom_and_patient_profile_dataset.csv  (Kaggle, 348 filas)
     Formato: Disease, Fever, Cough, Fatigue, Difficulty Breathing, Age, Gender,
              Blood Pressure, Cholesterol Level, Outcome Variable
  2. fallecidos_covid.csv  (MINSA Perú, 220k filas)
     Formato epidemiológico — no tiene síntomas clínicos, se usa para
     enriquecer la clase COVID-19 con datos demográficos reales de Perú.

Salida:
  ai-services/data/datasets/real_dataset_respicare.csv
  (Formato nativo: disease, disease_name, symptoms, urgency, severity, category,
                   patient_age, symptom_count, source)

Uso:
  python scripts/training/connect_real_datasets.py
  python scripts/training/connect_real_datasets.py --no-covid
  python scripts/training/connect_real_datasets.py --validate
"""

import argparse
import os
import sys
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np

# ─── Paths ───────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parent
AI_ROOT      = SCRIPT_DIR.parent.parent
DATASETS_DIR = AI_ROOT / "data" / "datasets"

KAGGLE_FILE  = DATASETS_DIR / "modelo1" / "kaggle_disease_profile" / "Disease_symptom_and_patient_profile_dataset.csv"
COVID_FILE   = DATASETS_DIR / "modelo1" / "real_approved" / "fallecidos_covid.csv"
OUTPUT_FILE  = DATASETS_DIR / "modelo1" / "real_approved" / "real_dataset_respicare.csv"

# ─── Mapeo Inglés → Español (enfermedades del dataset Kaggle) ────────────────
DISEASE_MAP = {
    "influenza":              ("influenza",               "Gripe estacional",                    "alta",  "alta",    "respiratoria"),
    "common cold":            ("resfriado común",         "Rinofaringitis aguda (resfriado común)", "baja", "leve",   "respiratoria"),
    "asthma":                 ("asma bronquial",          "Asma bronquial",                      "alta",  "alta",    "respiratoria"),
    "pneumonia":              ("neumonía",                "Neumonía bacteriana",                 "alta",  "alta",    "respiratoria"),
    "bronchitis":             ("bronquitis aguda",        "Bronquitis aguda",                    "media", "moderada","respiratoria"),
    "copd":                   ("epoc",                    "EPOC",                                "alta",  "alta",    "respiratoria"),
    "eczema":                 ("eczema",                  "Eczema",                              "baja",  "leve",    "dermatológica"),
    "allergic rhinitis":      ("rinitis alérgica",        "Rinitis alérgica",                    "baja",  "leve",    "respiratoria"),
    "diabetes":               ("diabetes",                "Diabetes mellitus",                   "media", "moderada","metabólica"),
    "hypertension":           ("hipertensión",            "Hipertensión arterial",               "alta",  "alta",    "cardiovascular"),
    "anxiety disorders":      ("ansiedad",                "Trastorno de ansiedad",               "media", "moderada","psiquiátrica"),
    "depression":             ("depresión",               "Trastorno depresivo",                 "media", "moderada","psiquiátrica"),
    "hyperthyroidism":        ("hipertiroidismo",         "Hipertiroidismo",                     "media", "moderada","endocrinológica"),
    "hypothyroidism":         ("hipotiroidismo",          "Hipotiroidismo",                      "media", "moderada","endocrinológica"),
    "gastroesophageal reflux":("reflujo gastroesofágico", "Reflujo gastroesofágico",             "baja",  "leve",    "gastrointestinal"),
    "sinusitis":              ("sinusitis",               "Sinusitis aguda",                     "media", "moderada","respiratoria"),
    "pharyngitis":            ("faringitis",              "Faringitis aguda",                    "media", "moderada","respiratoria"),
    "obesity":                ("obesidad",                "Obesidad",                            "media", "moderada","metabólica"),
    "tuberculosis":           ("tuberculosis",            "Tuberculosis pulmonar",               "alta",  "alta",    "respiratoria"),
    "covid-19":               ("covid-19",                "COVID-19",                            "alta",  "alta",    "respiratoria"),
    "covid":                  ("covid-19",                "COVID-19",                            "alta",  "alta",    "respiratoria"),
}

# ─── Mapeo de columnas booleanas Kaggle → síntomas en español ────────────────
SYMPTOM_MAP = {
    "Fever":                "fiebre",
    "Cough":                "tos",
    "Fatigue":              "fatiga",
    "Difficulty Breathing": "dificultad respiratoria",
    # Si el dataset tiene más columnas de síntomas en el futuro:
    "Wheezing":             "sibilancias",
    "Chest Pain":           "dolor torácico",
    "Nasal Congestion":     "congestión nasal",
    "Sore Throat":          "dolor de garganta",
    "Headache":             "dolor de cabeza",
    "Chills":               "escalofríos",
}

# Severidad basada en Blood Pressure y Cholesterol
def estimate_severity_from_vitals(bp: str, chol: str) -> str:
    bp_high   = str(bp).strip().lower() in ("high", "alta")
    chol_high = str(chol).strip().lower() in ("high", "alta")
    if bp_high and chol_high:
        return "severo"
    elif bp_high or chol_high:
        return "moderado"
    return "leve"


def convert_kaggle_to_respicare(kaggle_path: Path) -> pd.DataFrame:
    """
    Convierte Disease_symptom_and_patient_profile_dataset.csv al formato RespiCare ML.
    """
    print(f"\n[1] Cargando dataset Kaggle: {kaggle_path.name}")
    df = pd.read_csv(kaggle_path, encoding="utf-8")
    print(f"    Filas originales : {len(df)}")
    print(f"    Columnas         : {list(df.columns)}")

    rows = []
    symptom_cols = [c for c in df.columns if c in SYMPTOM_MAP]
    skipped = 0

    for _, row in df.iterrows():
        raw_disease = str(row.get("Disease", "")).strip().lower()
        mapped = DISEASE_MAP.get(raw_disease)
        if not mapped:
            # Intento de coincidencia parcial
            for key, val in DISEASE_MAP.items():
                if key in raw_disease or raw_disease in key:
                    mapped = val
                    break
        if not mapped:
            skipped += 1
            continue

        disease_code, disease_name, urgency, severity_base, category = mapped

        # Construir lista de síntomas desde columnas booleanas
        symptoms = []
        for col in symptom_cols:
            val = str(row.get(col, "No")).strip().lower()
            if val in ("yes", "1", "true"):
                # Agregar severidad basada en vitals
                sev = estimate_severity_from_vitals(
                    row.get("Blood Pressure", "Normal"),
                    row.get("Cholesterol Level", "Normal")
                )
                symptoms.append(f"{SYMPTOM_MAP[col]} {sev}")

        if not symptoms:
            symptoms = ["malestar general leve"]

        age = row.get("Age", 35)
        try:
            age = int(float(age))
        except (ValueError, TypeError):
            age = 35

        rows.append({
            "disease":       disease_code,
            "disease_name":  disease_name,
            "symptoms":      ", ".join(symptoms),
            "urgency":       urgency,
            "severity":      severity_base,
            "category":      category,
            "patient_age":   age,
            "symptom_count": len(symptoms),
            "source":        "kaggle_disease_profile_dataset",
        })

    df_out = pd.DataFrame(rows)
    print(f"    Filas convertidas : {len(df_out)}")
    print(f"    Filas omitidas    : {skipped} (enfermedades sin mapeo)")
    print(f"    Enfermedades      : {df_out['disease'].nunique()} únicas")
    print(f"    Distribución:")
    print(df_out['disease'].value_counts().to_string())
    return df_out


def convert_covid_peru(covid_path: Path, n_samples: int = 500) -> pd.DataFrame:
    """
    Convierte fallecidos_covid.csv (MINSA Perú) en registros de entrenamiento
    para la clase covid-19. Solo se usan N muestras para no desbalancear el dataset.

    El dataset de fallecidos no tiene síntomas clínicos directos, pero sí:
    - EDAD_DECLARADA → patient_age
    - CLASIFICACION_DEF → criterio de diagnóstico (virológico, epidemiológico, etc.)
    - SEXO → contexto demográfico

    Los síntomas se asignan según el perfil clínico conocido de COVID-19 grave
    (ya que la mayoría son fallecidos → casos graves).
    """
    print(f"\n[2] Cargando dataset COVID Perú: {covid_path.name}")
    df = pd.read_csv(covid_path, sep=";", encoding="utf-8", on_bad_lines="skip")
    print(f"    Filas totales     : {len(df)}")

    # Filtrar solo Tacna si el dato está disponible, sino usar muestra
    if "DEPARTAMENTO" in df.columns:
        tacna_df = df[df["DEPARTAMENTO"].str.upper().str.contains("TACNA", na=False)]
        print(f"    Filas de Tacna    : {len(tacna_df)}")
        source_df = tacna_df if len(tacna_df) >= 50 else df
    else:
        source_df = df

    sample = source_df.sample(min(n_samples, len(source_df)), random_state=42)

    # Síntomas típicos de COVID-19 grave (casos que llevan a fallecimiento)
    COVID_SEVERE_SYMPTOMS = [
        "fiebre severo, tos severo, dificultad respiratoria severo, fatiga severo",
        "dificultad respiratoria severo, fiebre moderado, tos moderado, malestar general severo",
        "fiebre severo, dificultad respiratoria severo, dolor torácico moderado, fatiga severo",
        "tos severo, dificultad respiratoria severo, fiebre severo, escalofríos moderado",
        "fiebre moderado, tos moderado, dificultad respiratoria moderado, fatiga moderado",
    ]

    rows = []
    for _, row in sample.iterrows():
        age = row.get("EDAD_DECLARADA", 60)
        try:
            age = int(float(age))
            age = max(1, min(120, age))
        except (ValueError, TypeError):
            age = 60

        clasificacion = str(row.get("CLASIFICACION_DEF", "Criterio virológico"))
        symptoms_str  = COVID_SEVERE_SYMPTOMS[len(rows) % len(COVID_SEVERE_SYMPTOMS)]
        symptom_count = len(symptoms_str.split(","))

        rows.append({
            "disease":       "covid-19",
            "disease_name":  "COVID-19",
            "symptoms":      symptoms_str,
            "urgency":       "alta",
            "severity":      "alta",
            "category":      "respiratoria",
            "patient_age":   age,
            "symptom_count": symptom_count,
            "source":        f"minsa_sinadef_peru ({clasificacion})",
        })

    df_out = pd.DataFrame(rows)
    print(f"    Muestras COVID-19 : {len(df_out)} (graves, perfil Tacna/Perú)")
    return df_out


def validate_dataset(df: pd.DataFrame):
    """Valida que el dataset tiene el formato correcto para el entrenamiento ML."""
    required_cols = {"disease", "disease_name", "symptoms", "urgency", "severity",
                     "category", "patient_age", "symptom_count"}
    missing = required_cols - set(df.columns)
    if missing:
        print(f"\n  ⚠️  Columnas faltantes: {missing}")
        return False

    print(f"\n[VALIDACIÓN]")
    print(f"  Filas totales          : {len(df)}")
    print(f"  Enfermedades únicas    : {df['disease'].nunique()}")
    print(f"  Edad promedio          : {df['patient_age'].mean():.1f} años")
    print(f"  Síntomas promedio      : {df['symptom_count'].mean():.1f} por caso")
    print(f"  Distribución urgencia  : {df['urgency'].value_counts().to_dict()}")
    print(f"  Fuentes incluidas      : {df['source'].unique().tolist()}")
    print(f"  Nulos en 'symptoms'    : {df['symptoms'].isna().sum()}")
    print(f"  Nulos en 'disease'     : {df['disease'].isna().sum()}")

    # Verificar que prepare_features del RandomForest puede procesar esto
    bad_symptoms = df[df['symptoms'].isna() | (df['symptoms'].str.strip() == "")]
    if len(bad_symptoms) > 0:
        print(f"\n  ⚠️  {len(bad_symptoms)} filas con síntomas vacíos — se rellenarán con 'malestar general leve'")
    return True


def main():
    parser = argparse.ArgumentParser(description="Conecta datasets reales al pipeline ML de RespiCare")
    parser.add_argument("--no-covid", action="store_true",
                        help="Omitir el dataset COVID/SINADEF de Perú")
    parser.add_argument("--covid-samples", type=int, default=500,
                        help="Número de muestras COVID a incluir (default: 500)")
    parser.add_argument("--validate", action="store_true",
                        help="Solo validar, no escribir el archivo de salida")
    parser.add_argument("--output", type=str, default=str(OUTPUT_FILE),
                        help="Ruta del archivo de salida")
    args = parser.parse_args()

    print("=" * 60)
    print("RespiCare - Conector de Datasets Reales")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    frames = []

    # 1. Dataset Kaggle (Disease Symptom and Patient Profile)
    if KAGGLE_FILE.exists():
        df_kaggle = convert_kaggle_to_respicare(KAGGLE_FILE)
        if not df_kaggle.empty:
            frames.append(df_kaggle)
    else:
        print(f"\n[1] ⚠️  No encontrado: {KAGGLE_FILE}")
        print(f"     Coloca el archivo en: {DATASETS_DIR}/")

    # 2. Dataset COVID Perú MINSA (fallecidos)
    if not args.no_covid:
        if COVID_FILE.exists():
            df_covid = convert_covid_peru(COVID_FILE, n_samples=args.covid_samples)
            if not df_covid.empty:
                frames.append(df_covid)
        else:
            print(f"\n[2] ⚠️  No encontrado: {COVID_FILE}")

    if not frames:
        print("\n❌ No se encontró ningún dataset real. Verifica las rutas.")
        sys.exit(1)

    # Combinar
    df_final = pd.concat(frames, ignore_index=True)

    # Limpiar síntomas vacíos
    mask_empty = df_final['symptoms'].isna() | (df_final['symptoms'].str.strip() == "")
    if mask_empty.sum() > 0:
        df_final.loc[mask_empty, 'symptoms'] = "malestar general leve"
        df_final.loc[mask_empty, 'symptom_count'] = 1

    # Validar
    is_valid = validate_dataset(df_final)

    if not args.validate and is_valid:
        out_path = Path(args.output)
        df_final.to_csv(out_path, index=False, encoding="utf-8")
        size_kb = out_path.stat().st_size / 1024
        print(f"\n[OK] Dataset real guardado:")
        print(f"   Ruta   : {out_path}")
        print(f"   Filas  : {len(df_final)}")
        print(f"   Tamanio: {size_kb:.1f} KB")
        print(f"\n[SIGUIENTE PASO] Para usar en el entrenamiento:")
        print(f"   python scripts/training/execute_full_retraining.py")
        print(f"   (El script ahora detecta '{out_path.name}' automaticamente)")
    elif args.validate:
        print("\n  [--validate] No se escribió el archivo.")

    return 0 if is_valid else 1


if __name__ == "__main__":
    sys.exit(main())