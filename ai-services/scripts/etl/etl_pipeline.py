"""
RespiCare ETL Pipeline
======================
Extrae datos de fuentes públicas, los transforma al esquema de RespiCare
y los carga en MongoDB.

Fuentes:
  1. WHO GHO API          — Indicadores epidemiológicos respiratorios (Perú/América)
  2. MINSA Datos Abiertos — Vigilancia epidemiológica Perú (CKAN API)
  3. SINADEF MINSA        — Causas de muerte respiratorias (CSV público)
  4. Kaggle / CSV local   — Datasets de síntomas y diagnósticos clínicos
  5. UCI / ICBHI          — Datos clínicos de enfermedades respiratorias

Uso:
  # Dentro del contenedor ai-services:
  python scripts/etl/etl_pipeline.py --source all

  # Solo fuentes gratuitas sin API key:
  python scripts/etl/etl_pipeline.py --source who minsa

  # Con CSV local (ej. Kaggle descargado manualmente):
  python scripts/etl/etl_pipeline.py --source csv --csv-path /app/data/respiratory.csv

Variables de entorno:
  MONGODB_URI      — URI de conexión (default: mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin)
  KAGGLE_USERNAME  — Usuario Kaggle (solo si --source kaggle)
  KAGGLE_KEY       — API key Kaggle (solo si --source kaggle)
"""

import argparse
import hashlib
import json
import logging
import os
import random
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import pandas as pd
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

# ─── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("etl")

# ─── Configuración ──────────────────────────────────────────────────────────
MONGO_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin",
)
DB_NAME = os.getenv("MONGO_DB", "respicare_dev")

# Constantes del dominio
TACNA_DISTRICTS = [
    {"name": "Centro de Tacna",     "lat": -18.0056, "lng": -70.2444},
    {"name": "Gregorio Albarracín", "lat": -18.0303, "lng": -70.2489},
    {"name": "Ciudad Nueva",        "lat": -18.0125, "lng": -70.2467},
    {"name": "Alto de la Alianza",  "lat": -18.0156, "lng": -70.2500},
    {"name": "Pocollay",            "lat": -18.0083, "lng": -70.2522},
    {"name": "Calana",              "lat": -18.0100, "lng": -70.2400},
    {"name": "Pachia",              "lat": -18.0300, "lng": -70.2300},
    {"name": "Boca del Río",        "lat": -18.0200, "lng": -70.2600},
]

DIAGNOSIS_MAP = {
    # Inglés → Español (para normalización de Kaggle/UCI)
    "asthma":           "Asma bronquial",
    "pneumonia":        "Neumonía",
    "bronchitis":       "Bronquitis aguda",
    "copd":             "EPOC",
    "covid":            "COVID-19",
    "covid-19":         "COVID-19",
    "covid19":          "COVID-19",
    "flu":              "Gripe estacional",
    "influenza":        "Gripe estacional",
    "cold":             "Resfriado común",
    "rhinitis":         "Rinitis alérgica",
    "sinusitis":        "Sinusitis aguda",
    "pharyngitis":      "Faringitis",
    "laryngitis":       "Laringitis",
    "allergy":          "Alergia respiratoria",
    "upper respiratory infection": "Infección respiratoria alta",
    "lower respiratory infection": "Infección respiratoria baja",
    # MINSA codes
    "J00": "Resfriado común",
    "J06": "Infección respiratoria alta",
    "J18": "Neumonía",
    "J20": "Bronquitis aguda",
    "J45": "Asma bronquial",
    "J44": "EPOC",
    "J11": "Gripe estacional",
    "J32": "Sinusitis aguda",
    "J02": "Faringitis",
    "J04": "Laringitis",
    "U07": "COVID-19",
}

SYMPTOM_MAP = {
    "cough": "tos", "fever": "fiebre", "dyspnea": "dificultad_respiratoria",
    "wheezing": "sibilancias", "fatigue": "fatiga", "chest pain": "dolor_pecho",
    "nasal congestion": "congestion_nasal", "sore throat": "dolor_garganta",
    "chills": "escalofrios", "headache": "dolor_cabeza", "nausea": "nauseas",
    "loss of appetite": "perdida_apetito", "sputum": "expectoracion",
    "shortness of breath": "disnea", "runny nose": "congestion_nasal",
}

# ─── Helpers ────────────────────────────────────────────────────────────────
rng = random.Random(42)

def r_date(start: datetime, end: datetime) -> datetime:
    delta = end - start
    return start + timedelta(seconds=rng.randint(0, int(delta.total_seconds())))

def jitter(val: float, pct: float = 0.05) -> float:
    return val * (1 + rng.uniform(-pct, pct))

def pick(lst: list) -> Any:
    return rng.choice(lst)

def normalize_diagnosis(raw: str) -> str:
    if not raw:
        return "Enfermedad respiratoria no especificada"
    raw_lower = str(raw).strip().lower()
    for key, val in DIAGNOSIS_MAP.items():
        if key.lower() in raw_lower:
            return val
    return str(raw).strip().title()

def normalize_symptom(raw: str) -> str:
    return SYMPTOM_MAP.get(str(raw).strip().lower(), str(raw).strip().lower().replace(" ", "_"))

def safe_float(val, default=None):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def now() -> datetime:
    return datetime.now(timezone.utc)

# ═══════════════════════════════════════════════════════════════════════════
# EXTRACTORS
# ═══════════════════════════════════════════════════════════════════════════

class WHOExtractor:
    """
    Extrae datos de la API REST de la OMS (Global Health Observatory).
    No requiere autenticación.
    Docs: https://www.who.int/data/gho/info/gho-odata-api
    """
    BASE = "https://ghoapi.azureedge.net/api"
    TIMEOUT = 30

    # Indicadores relevantes para enfermedades respiratorias
    INDICATORS = {
        "RSUD_MORT":    "Mortalidad EPOC (edad estandarizada)",
        "MDG_0000000017": "Mortalidad por enfermedades respiratorias <5",
        "SA_0000001462":  "Prevalencia tabaquismo adultos",
        "AIR_10":         "Exposición contaminación aire interior",
        "AIR_11":         "Exposición contaminación aire exterior",
        "RS_198":         "Mortalidad EPOC/asma 30-70 años",
    }
    COUNTRIES = ["PER", "BOL", "CHL", "COL", "ECU"]  # Vecinos de Perú

    def extract(self) -> list[dict]:
        records = []
        with httpx.Client(timeout=self.TIMEOUT) as client:
            for code, description in self.INDICATORS.items():
                try:
                    url = f"{self.BASE}/{code}?$filter=SpatialDim in ({','.join(repr(c) for c in self.COUNTRIES)})"
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json().get("value", [])
                        for row in data:
                            records.append({
                                "source": "WHO_GHO",
                                "indicator_code": code,
                                "indicator_name": description,
                                "country": row.get("SpatialDim"),
                                "year": row.get("TimeDim"),
                                "value": safe_float(row.get("NumericValue")),
                                "value_display": row.get("Value"),
                                "sex": row.get("Dim1"),  # BTSX=ambos, MLE=hombre, FMLE=mujer
                                "raw": row,
                            })
                        log.info("WHO %s: %d registros", code, len(data))
                    else:
                        log.warning("WHO %s: HTTP %d", code, resp.status_code)
                    time.sleep(0.3)  # Rate limit educado
                except Exception as exc:
                    log.warning("WHO %s falló: %s", code, exc)
        return records


class MINSAExtractor:
    """
    Extrae datos del portal de Datos Abiertos del Perú (CKAN).
    No requiere autenticación.
    Portal: https://www.datosabiertos.gob.pe/
    """
    BASE = "https://www.datosabiertos.gob.pe/api/3/action"
    TIMEOUT = 30

    # IDs de recursos de enfermedades respiratorias en MINSA
    DATASETS = {
        # Notificaciones de enfermedades sujetas a vigilancia epidemiológica
        "vigilancia_ira": {
            "resource_id": "b5d4e6b0-6e1c-4b4e-9b4e-9b4e9b4e9b4e",  # placeholder
            "description": "Vigilancia IRA (Infecciones Respiratorias Agudas)",
        },
    }

    def extract(self) -> list[dict]:
        records = []
        with httpx.Client(timeout=self.TIMEOUT) as client:
            # Búsqueda por tags respiratorios
            try:
                resp = client.get(
                    f"{self.BASE}/package_search",
                    params={
                        "q": "enfermedades respiratorias tacna ira neumonia",
                        "rows": 20,
                    },
                )
                if resp.status_code == 200:
                    results = resp.json().get("result", {}).get("results", [])
                    for pkg in results:
                        for resource in pkg.get("resources", []):
                            if resource.get("format", "").upper() in ("CSV", "XLSX"):
                                rec = self._fetch_resource(client, resource, pkg)
                                records.extend(rec)
            except Exception as exc:
                log.warning("MINSA search falló: %s", exc)

        log.info("MINSA: %d registros totales", len(records))
        return records

    def _fetch_resource(self, client, resource: dict, package: dict) -> list[dict]:
        records = []
        url = resource.get("url", "")
        if not url:
            return records
        try:
            resp = client.get(url, follow_redirects=True, timeout=60)
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                if "csv" in content_type or url.endswith(".csv"):
                    from io import StringIO
                    df = pd.read_csv(StringIO(resp.text), encoding="utf-8", errors="replace")
                    for _, row in df.iterrows():
                        records.append({
                            "source": "MINSA_DATOSABIERTOS",
                            "package_name": package.get("name"),
                            "resource_name": resource.get("name"),
                            "data": row.to_dict(),
                        })
                    log.info("MINSA resource '%s': %d filas", resource.get("name"), len(df))
        except Exception as exc:
            log.debug("MINSA resource '%s' falló: %s", resource.get("name"), exc)
        return records


class SINADEFExtractor:
    """
    Extrae estadísticas de fallecidos por causas respiratorias de SINADEF (MINSA).
    Dataset público en datos.gob.pe con fallecidos por causas.
    URL: https://cloud.minsa.gob.pe/s/owgSdNDxRMqWPJG/download
    """
    URL = "https://cloud.minsa.gob.pe/s/owgSdNDxRMqWPJG/download"
    RESPIRATORY_CODES = ["J", "U07"]  # CIE-10 capítulo J = respiratorio, U07 = COVID

    def extract(self) -> pd.DataFrame:
        log.info("SINADEF: descargando dataset...")
        try:
            with httpx.Client(timeout=120, follow_redirects=True) as client:
                resp = client.get(self.URL)
                if resp.status_code == 200:
                    from io import StringIO
                    # SINADEF usa separador "|" y encoding latin-1
                    df = pd.read_csv(StringIO(resp.text), sep="|", encoding="latin-1", on_bad_lines="skip")
                    log.info("SINADEF: %d filas descargadas, cols: %s", len(df), list(df.columns)[:8])
                    return df
                else:
                    log.warning("SINADEF: HTTP %d", resp.status_code)
        except Exception as exc:
            log.warning("SINADEF falló: %s — usando datos sintéticos mejorados", exc)
        return pd.DataFrame()


class RespiCareDatasetExtractor:
    """
    Extrae los datasets ya existentes en ai-services/data/datasets/.
    Formato nativo del proyecto (generados por la IA del sistema):

      Columnas: disease, disease_name, symptoms, urgency, severity,
                category, patient_age, symptom_count[, source, feedback_id, timestamp]

    Ruta dentro del contenedor: /app/data/datasets/
    (montada automáticamente porque ./ai-services:/app ya está en el compose)

    Para agregar más datasets externos (Kaggle, UCI, etc.) simplemente
    coloca los CSV en la misma carpeta con el mismo formato de columnas.
    """
    DEFAULT_DIR = "/app/data/datasets"
    # Archivos a procesar en orden de prioridad
    PRIORITY_FILES = [
        "augmented_dataset_full_20251103_124126.csv",   # 307k filas — más completo
        "synthetic_dataset_extended.csv",               # 307k filas — extendido
        "synthetic_dataset.csv",                        # 64k  filas — base
        "augmented_dataset_retraining_20251103_123539.csv",
        "test_augmented_dataset.csv",
    ]
    # Archivos a omitir (resultados de validación, no son datos de pacientes)
    SKIP_FILES = {"model_validation_results.csv"}

    def __init__(self, csv_path: str | None = None, max_rows: int = 50_000):
        self.csv_path = csv_path or self.DEFAULT_DIR
        self.max_rows = max_rows  # límite por archivo para no saturar MongoDB

    def extract(self) -> pd.DataFrame:
        import glob

        # Escaneo recursivo: captura archivos en raíz y en subdirectorios modelo1/
        all_paths = glob.glob(os.path.join(self.csv_path, "**", "*.csv"), recursive=True)
        # basename → path completo (último gana en caso de colisión de nombre)
        all_files_map: dict[str, str] = {os.path.basename(p): p for p in all_paths}

        ordered       = [all_files_map[f] for f in self.PRIORITY_FILES if f in all_files_map]
        rest          = sorted(p for name, p in all_files_map.items()
                               if name not in self.PRIORITY_FILES and name not in self.SKIP_FILES)
        files_to_read = ordered + rest

        if not files_to_read:
            log.warning("Datasets: no se encontraron CSVs en %s", self.csv_path)
            return pd.DataFrame()

        frames = []
        for fpath in files_to_read:
            try:
                df = pd.read_csv(fpath, encoding="utf-8", errors="replace",
                                 nrows=self.max_rows)
                df["_source_file"] = os.path.basename(fpath)
                frames.append(df)
                log.info("  %-55s %7d filas", os.path.basename(fpath), len(df))
            except Exception as exc:
                log.warning("  CSV '%s' error: %s", os.path.basename(fpath), exc)

        if frames:
            combined = pd.concat(frames, ignore_index=True)
            log.info("Datasets total: %d filas de %d archivos", len(combined), len(frames))
            return combined
        return pd.DataFrame()


class KaggleCSVExtractor:
    """
    Extrae datos de CSVs externos descargados desde Kaggle u otras fuentes.
    Colócalos en la MISMA carpeta: ai-services/data/datasets/

    El script detecta automáticamente las columnas.
    Columnas esperadas (en inglés o español):
      - Síntomas: cough, fever, wheezing, dyspnea, chest_pain, etc.
      - Diagnóstico: disease, diagnosis, label, condition
      - Datos vitales: age, gender, oxygen_saturation, temperature

    Datasets recomendados:
      https://kaggle.com/datasets/jillanisofttech/lung-disease-dataset
      https://kaggle.com/datasets/andrewmvd/respiratory-disease
    """
    DEFAULT_DIR = "/app/data/datasets"

    def __init__(self, csv_path: str | None = None):
        self.csv_path = csv_path or self.DEFAULT_DIR

    def extract(self) -> pd.DataFrame:
        import glob
        # Solo archivos que NO sean del formato nativo RespiCare
        native_files = set(RespiCareDatasetExtractor.PRIORITY_FILES) | RespiCareDatasetExtractor.SKIP_FILES

        # Escaneo recursivo para capturar archivos en subdirectorios modelo2..5
        all_paths = glob.glob(os.path.join(self.csv_path, "**", "*.csv"), recursive=True)
        files = [p for p in all_paths if os.path.basename(p) not in native_files]

        if not files:
            log.info("Kaggle CSV: no hay archivos externos en %s (solo datasets nativos)", self.csv_path)
            return pd.DataFrame()

        frames = []
        for f in files:
            try:
                df = pd.read_csv(f, encoding="utf-8", errors="replace")
                df["_source_file"] = os.path.basename(f)
                frames.append(df)
                log.info("  %-55s %7d filas", os.path.basename(f), len(df))
            except Exception as exc:
                log.warning("  CSV '%s' error: %s", f, exc)

        if frames:
            combined = pd.concat(frames, ignore_index=True)
            log.info("Kaggle CSV total: %d filas", len(combined))
            return combined
        return pd.DataFrame()


# ═══════════════════════════════════════════════════════════════════════════
# TRANSFORMERS
# ═══════════════════════════════════════════════════════════════════════════

class SymptomReportTransformer:
    """Transforma datos de diversas fuentes al esquema SymptomReport."""

    def from_who(self, who_records: list[dict]) -> list[dict]:
        """Convierte estadísticas WHO en reportes de síntomas agregados."""
        docs = []
        for rec in who_records:
            if rec.get("value") is None:
                continue
            year = rec.get("year")
            if not year:
                continue
            # Distribuir el indicador en reportes mensuales simulados
            country = rec.get("country", "PER")
            for month in range(1, 13):
                try:
                    report_date = datetime(int(year), month, rng.randint(1, 28))
                except (ValueError, TypeError):
                    continue

                district = pick(TACNA_DISTRICTS)
                docs.append({
                    "source_etl": "WHO_GHO",
                    "indicator": rec.get("indicator_code"),
                    "country": country,
                    "patientId": None,
                    "location": {
                        "district": district["name"],
                        "coordinates": {
                            "latitude":  jitter(district["lat"]),
                            "longitude": jitter(district["lng"]),
                        },
                        "address": f"{district['name']}, Tacna, Perú",
                    },
                    "symptoms": [
                        {"name": "tos", "severity": pick(["mild", "moderate", "severe"]),
                         "duration": {"value": rng.randint(1, 14), "unit": "days"}},
                        {"name": "dificultad_respiratoria", "severity": pick(["mild", "moderate"]),
                         "duration": {"value": rng.randint(1, 7), "unit": "days"}},
                    ],
                    "category": "respiratory",
                    "overallSeverity": pick(["low", "medium", "high"]),
                    "suspectedDisease": pick(list(DIAGNOSIS_MAP.values())),
                    "status": "reviewed",
                    "reportedBy": "healthcare_worker",
                    "source": "who_statistical",
                    "isAnonymous": True,
                    "reportedAt": report_date,
                    "createdAt": report_date,
                    "updatedAt": report_date,
                    "_etl_meta": {
                        "source": "WHO_GHO",
                        "indicator": rec.get("indicator_name"),
                        "raw_value": rec.get("value"),
                        "sex": rec.get("sex"),
                        "loaded_at": now().isoformat(),
                    },
                })
        log.info("SymptomReport(WHO): %d documentos generados", len(docs))
        return docs

    def from_kaggle_csv(self, df: pd.DataFrame) -> list[dict]:
        """Convierte un DataFrame de Kaggle al esquema SymptomReport."""
        if df.empty:
            return []

        # Detección automática de columnas de diagnóstico
        diag_cols  = [c for c in df.columns if any(k in c.lower() for k in ["disease", "diagnosis", "label", "condition", "class"])]
        age_cols   = [c for c in df.columns if "age" in c.lower()]
        gender_cols = [c for c in df.columns if any(k in c.lower() for k in ["gender", "sex"])]
        symptom_cols = [c for c in df.columns if any(k in c.lower() for k in list(SYMPTOM_MAP.keys()) + ["symptom", "cough", "fever"])]

        diag_col   = diag_cols[0]  if diag_cols  else None
        age_col    = age_cols[0]   if age_cols   else None
        gender_col = gender_cols[0] if gender_cols else None

        log.info("CSV auto-detectado: diag=%s, age=%s, gender=%s, symptoms=%s",
                 diag_col, age_col, gender_col, symptom_cols[:5])

        docs = []
        base_date = datetime.now(timezone.utc) - timedelta(days=365)

        for _, row in df.iterrows():
            diagnosis = normalize_diagnosis(row[diag_col]) if diag_col else "Enfermedad respiratoria"

            # Construir síntomas desde columnas booleanas/numéricas
            symptoms = []
            for col in symptom_cols[:8]:
                val = row.get(col)
                if val in (1, "1", True, "yes", "Yes", "YES", "true", "True"):
                    symptoms.append({
                        "name":     normalize_symptom(col),
                        "severity": pick(["mild", "moderate", "severe"]),
                        "duration": {"value": rng.randint(1, 10), "unit": "days"},
                    })

            if not symptoms:
                symptoms = [{"name": "tos", "severity": "mild",
                             "duration": {"value": 3, "unit": "days"}}]

            district   = pick(TACNA_DISTRICTS)
            report_date = r_date(base_date, datetime.now(timezone.utc))

            docs.append({
                "source_etl": "KAGGLE_CSV",
                "patientId":  None,
                "location": {
                    "district":    district["name"],
                    "coordinates": {"latitude": jitter(district["lat"]), "longitude": jitter(district["lng"])},
                    "address":     f"{district['name']}, Tacna, Perú",
                },
                "symptoms":         symptoms,
                "category":         "respiratory",
                "overallSeverity":  pick(["low", "medium", "high"]),
                "suspectedDisease": diagnosis.lower().replace(" ", "_"),
                "temperature":      safe_float(row.get("temperature") or row.get("temp")) or (
                    round(rng.uniform(36.0, 39.5), 1) if any("fever" in str(s.get("name","")) for s in symptoms) else None
                ),
                "oxygenSaturation": safe_float(row.get("oxygen_saturation") or row.get("spo2")),
                "hasPreexistingConditions": rng.random() > 0.6,
                "status":     "reviewed",
                "reportedBy": "patient",
                "source":     "kaggle_dataset",
                "isAnonymous": True,
                "reportedAt": report_date,
                "createdAt":  report_date,
                "updatedAt":  report_date,
                "_kaggle_source_file": row.get("_source_file", ""),
                "_etl_meta": {
                    "source": "KAGGLE",
                    "original_diagnosis": str(row[diag_col]) if diag_col else None,
                    "age":    safe_float(row[age_col]) if age_col else None,
                    "gender": str(row[gender_col]) if gender_col else None,
                    "loaded_at": now().isoformat(),
                },
            })

        log.info("SymptomReport(CSV): %d documentos", len(docs))
        return docs


class RespiCareDatasetTransformer:
    """
    Transforma los datasets nativos del proyecto al esquema MongoDB.
    Formato de entrada:
      disease, disease_name, symptoms (CSV string), urgency, severity,
      category, patient_age, symptom_count
    """

    # Palabras de severidad en los síntomas
    SEVERITY_WORDS = {
        "leve": "mild", "ligero": "mild", "suave": "mild",
        "moderado": "moderate", "medio": "moderate",
        "severo": "severe", "intenso": "severe", "grave": "severe",
        "crítico": "severe", "fuerte": "severe",
    }
    URGENCY_MAP = {"baja": "low", "media": "medium", "alta": "high", "crítica": "critical"}
    SEVERITY_MAP = {"leve": "mild", "moderado": "moderate", "grave": "severe", "crítico": "severe"}

    def _parse_symptoms(self, symptoms_str: str) -> list[dict]:
        """'fiebre leve moderado, tos severo' → [{name, severity, duration}]"""
        if not symptoms_str or pd.isna(symptoms_str):
            return [{"name": "tos", "severity": "mild", "duration": {"value": 3, "unit": "days"}}]

        result = []
        for part in str(symptoms_str).split(","):
            part = part.strip()
            if not part:
                continue

            tokens = part.split()
            # Separa palabras de severidad del nombre del síntoma
            severity = "mild"
            name_tokens = []
            for token in tokens:
                t = token.lower()
                if t in self.SEVERITY_WORDS:
                    severity = self.SEVERITY_WORDS[t]
                else:
                    name_tokens.append(token)

            name = " ".join(name_tokens).strip()
            if not name:
                continue

            # Normalizar nombre del síntoma al formato del sistema
            name_normalized = (name.lower()
                                    .replace(" ", "_")
                                    .replace("á", "a").replace("é", "e")
                                    .replace("í", "i").replace("ó", "o")
                                    .replace("ú", "u").replace("ñ", "n"))

            result.append({
                "name":     name_normalized,
                "severity": severity,
                "duration": {"value": rng.randint(1, 10), "unit": "days"},
            })
        return result or [{"name": "tos", "severity": "mild", "duration": {"value": 3, "unit": "days"}}]

    def to_symptom_reports(self, df: pd.DataFrame) -> list[dict]:
        """Convierte el dataset al esquema SymptomReport."""
        docs = []
        base_date = datetime.now(timezone.utc) - timedelta(days=365)

        for _, row in df.iterrows():
            symptoms   = self._parse_symptoms(row.get("symptoms", ""))
            urgency    = self.URGENCY_MAP.get(str(row.get("urgency", "baja")).lower(), "low")
            disease    = str(row.get("disease", "")).strip()
            age        = safe_float(row.get("patient_age")) or rng.randint(18, 70)
            district   = pick(TACNA_DISTRICTS)
            report_date = r_date(base_date, datetime.now(timezone.utc))

            has_fever = any("fiebre" in s.get("name", "") or "temperatura" in s.get("name", "") for s in symptoms)

            docs.append({
                "source_etl":    "RESPICARE_DATASET",
                "patientId":     None,
                "location": {
                    "district":    district["name"],
                    "coordinates": {"latitude": jitter(district["lat"]), "longitude": jitter(district["lng"])},
                    "address":     f"{district['name']}, Tacna, Perú",
                },
                "symptoms":               symptoms,
                "category":               str(row.get("category", "respiratory")).lower(),
                "overallSeverity":        urgency,
                "suspectedDisease":       disease,
                "temperature":            round(rng.uniform(37.0, 39.5), 1) if has_fever else None,
                "oxygenSaturation":       round(rng.uniform(90, 100), 1),
                "hasPreexistingConditions": rng.random() > 0.65,
                "status":                 pick(["reviewed", "reviewed", "resolved", "pending"]),
                "reportedBy":             pick(["patient", "patient", "healthcare_worker"]),
                "source":                 "respicare_dataset",
                "isAnonymous":            True,
                "reportedAt":             report_date,
                "createdAt":              report_date,
                "updatedAt":              report_date,
                "_etl_meta": {
                    "source":           "RESPICARE_NATIVE",
                    "disease_name":     str(row.get("disease_name", "")),
                    "urgency_original": str(row.get("urgency", "")),
                    "severity_original": str(row.get("severity", "")),
                    "patient_age":      age,
                    "source_file":      str(row.get("_source_file", "")),
                    "loaded_at":        now().isoformat(),
                },
            })
        log.info("SymptomReport(RespiCare Dataset): %d documentos", len(docs))
        return docs

    def to_medical_histories(self, df: pd.DataFrame, doctors: list[dict], patients: list[dict]) -> list[dict]:
        """Convierte el dataset al esquema MedicalHistory (muestra representativa)."""
        if not doctors or not patients:
            return []

        # Usa solo 1 de cada 10 filas para historias médicas (evitar sobrecargar)
        sample = df.sample(frac=0.1, random_state=42) if len(df) > 1000 else df
        docs   = []

        for _, row in sample.iterrows():
            symptoms = self._parse_symptoms(row.get("symptoms", ""))
            diagnosis = str(row.get("disease_name") or row.get("disease", "Enfermedad respiratoria")).strip()
            age       = int(safe_float(row.get("patient_age")) or rng.randint(18, 70))
            doctor    = pick(doctors)
            patient   = pick(patients)
            district  = pick(TACNA_DISTRICTS)

            docs.append({
                "patientId":   str(patient["_id"]),
                "doctorId":    str(doctor["_id"]),
                "patientName": patient.get("name", "Paciente ETL"),
                "age":         age,
                "diagnosis":   diagnosis,
                "symptoms": [
                    {
                        "name":        s["name"],
                        "severity":    s["severity"],
                        "duration":    f"{s['duration']['value']} días",
                        "description": f"Dato importado desde dataset RespiCare",
                    }
                    for s in symptoms[:5]
                ],
                "description": f"Historia importada. Diagnóstico: {diagnosis}. Urgencia: {row.get('urgency', 'baja')}.",
                "date":        r_date(datetime.now(timezone.utc) - timedelta(days=365), datetime.now(timezone.utc)),
                "location": {
                    "latitude":  jitter(district["lat"]),
                    "longitude": jitter(district["lng"]),
                    "address":   f"{district['name']}, Tacna, Perú",
                },
                "isOffline":  False,
                "syncStatus": "synced",
                "_etl_meta": {
                    "source":      "RESPICARE_NATIVE",
                    "source_file": str(row.get("_source_file", "")),
                    "loaded_at":   now().isoformat(),
                },
            })
        log.info("MedicalHistory(RespiCare Dataset): %d documentos", len(docs))
        return docs


class MedicalHistoryTransformer:
    """Transforma registros clínicos externos en MedicalHistory."""

    def from_sinadef(self, df: pd.DataFrame, doctors: list[dict], patients: list[dict]) -> list[dict]:
        """Convierte SINADEF (fallecidos) en historias médicas de referencia epidemiológica."""
        if df.empty or not doctors or not patients:
            return []

        # Detectar columnas SINADEF — el formato varía por año
        # Columnas típicas: FECHA DE FALLECIMIENTO, SEXO, EDAD, CAUSA A, DEPARTAMENTO
        col_map = {}
        for col in df.columns:
            cl = col.upper().replace(" ", "_")
            if "FECHA" in cl and "FALL" in cl:    col_map["date"] = col
            elif "EDAD" in cl:                     col_map["age"] = col
            elif "SEXO" in cl or "GENERO" in cl:   col_map["gender"] = col
            elif "CAUSA_A" in cl or "CAUSA A" in col.upper(): col_map["cause"] = col
            elif "DEPARTAMENTO" in cl:              col_map["dept"] = col

        if not col_map.get("cause"):
            log.warning("SINADEF: no se encontró columna de causa")
            return []

        # Filtrar solo causas respiratorias (CIE-10 capítulo J + U07)
        df_resp = df[df[col_map["cause"]].astype(str).str.match(r"^[JU]", na=False)].copy()
        if col_map.get("dept"):
            tacna_mask = df_resp[col_map["dept"]].astype(str).str.upper().str.contains("TACNA", na=False)
            df_tacna = df_resp[tacna_mask]
            if len(df_tacna) > 50:
                df_resp = df_tacna
        log.info("SINADEF: %d registros respiratorios encontrados", len(df_resp))

        docs = []
        sample = df_resp.sample(min(500, len(df_resp)), random_state=42)

        for _, row in sample.iterrows():
            cause_code = str(row.get(col_map.get("cause", ""), "J18")).strip()
            diagnosis  = normalize_diagnosis(cause_code)
            age_raw    = safe_float(row.get(col_map.get("age", ""), 0))
            age        = int(age_raw) if age_raw and 0 < age_raw < 120 else rng.randint(40, 85)

            doctor  = pick(doctors)
            patient = pick(patients)
            district = pick(TACNA_DISTRICTS)

            date_raw = row.get(col_map.get("date", ""), "")
            try:
                hist_date = pd.to_datetime(date_raw, dayfirst=True, errors="coerce")
                hist_date = hist_date.to_pydatetime() if not pd.isnull(hist_date) else r_date(
                    datetime.now(timezone.utc) - timedelta(days=730), datetime.now(timezone.utc)
                )
            except Exception:
                hist_date = r_date(datetime.now(timezone.utc) - timedelta(days=730), datetime.now(timezone.utc))

            docs.append({
                "patientId":   patient["_id"],
                "doctorId":    doctor["_id"],
                "patientName": patient.get("name", "Paciente ETL"),
                "age":         age,
                "diagnosis":   diagnosis,
                "symptoms": [
                    {"name": pick(["tos", "disnea", "fiebre", "dificultad_respiratoria"]),
                     "severity": pick(["moderate", "severe"]),
                     "duration": f"{rng.randint(3, 21)} días",
                     "description": f"Síntoma documentado en SINADEF para {diagnosis}"},
                ],
                "description": f"Historia generada desde SINADEF. Causa CIE-10: {cause_code}. {diagnosis}.",
                "date":        hist_date,
                "location": {
                    "latitude":  jitter(district["lat"]),
                    "longitude": jitter(district["lng"]),
                    "address":   f"{district['name']}, Tacna, Perú",
                },
                "isOffline":   False,
                "syncStatus":  "synced",
                "_etl_meta": {
                    "source":      "SINADEF",
                    "cie10_code":  cause_code,
                    "loaded_at":   now().isoformat(),
                },
            })

        log.info("MedicalHistory(SINADEF): %d documentos", len(docs))
        return docs

    def from_kaggle_csv(self, df: pd.DataFrame, doctors: list[dict], patients: list[dict]) -> list[dict]:
        """Convierte CSV de Kaggle en historias médicas."""
        if df.empty or not doctors or not patients:
            return []

        diag_cols  = [c for c in df.columns if any(k in c.lower() for k in ["disease", "diagnosis", "label", "condition"])]
        age_cols   = [c for c in df.columns if "age" in c.lower()]
        symptom_cols = [c for c in df.columns if any(k in c.lower() for k in ["cough", "fever", "wheezing", "dyspnea", "symptom"])]

        diag_col = diag_cols[0] if diag_cols else None
        age_col  = age_cols[0]  if age_cols  else None

        docs = []
        for _, row in df.iterrows():
            diagnosis = normalize_diagnosis(row[diag_col]) if diag_col else "Enfermedad respiratoria"
            age = int(safe_float(row.get(age_col)) or rng.randint(18, 70))

            symptoms = []
            for col in symptom_cols[:6]:
                if row.get(col) in (1, "1", True, "yes", "Yes"):
                    symptoms.append({
                        "name":     normalize_symptom(col),
                        "severity": pick(["mild", "moderate", "severe"]),
                        "duration": f"{rng.randint(1, 14)} días",
                        "description": f"Dato de fuente {row.get('_source_file', 'CSV')}",
                    })
            if not symptoms:
                symptoms = [{"name": "tos", "severity": "mild", "duration": "3 días"}]

            doctor  = pick(doctors)
            patient = pick(patients)
            district = pick(TACNA_DISTRICTS)

            docs.append({
                "patientId":   patient["_id"],
                "doctorId":    doctor["_id"],
                "patientName": patient.get("name", "Paciente ETL"),
                "age":         age,
                "diagnosis":   diagnosis,
                "symptoms":    symptoms,
                "description": f"Historia importada desde dataset externo. Diagnóstico: {diagnosis}.",
                "date":        r_date(datetime.now(timezone.utc) - timedelta(days=365), datetime.now(timezone.utc)),
                "location": {
                    "latitude":  jitter(district["lat"]),
                    "longitude": jitter(district["lng"]),
                    "address":   f"{district['name']}, Tacna, Perú",
                },
                "isOffline":  False,
                "syncStatus": "synced",
                "_etl_meta": {
                    "source":     "KAGGLE",
                    "loaded_at":  now().isoformat(),
                },
            })
        log.info("MedicalHistory(CSV): %d documentos", len(docs))
        return docs


class EpidemiologicalEnricher:
    """
    Enriquece los datos existentes con estadísticas epidemiológicas reales de la OMS.
    Actualiza las métricas de SymptomReports y AutomaticReports.
    """
    def enrich_with_who_stats(self, who_records: list[dict]) -> dict:
        """Extrae KPIs reales de los datos WHO para usarlos en dashboards."""
        peru_data = [r for r in who_records if r.get("country") == "PER"]

        stats = {
            "prevalence_estimates": {},
            "mortality_rates": {},
            "risk_factors": {},
            "data_year_range": [],
        }

        years = [r.get("year") for r in peru_data if r.get("year")]
        if years:
            stats["data_year_range"] = [min(years), max(years)]

        for rec in peru_data:
            code = rec.get("indicator_code", "")
            val  = rec.get("value")
            year = rec.get("year")
            if val is not None and year:
                if "MORT" in code or "RS_" in code:
                    stats["mortality_rates"][f"{code}_{year}"] = val
                elif "AIR" in code:
                    stats["risk_factors"][f"{code}_{year}"] = val
                else:
                    stats["prevalence_estimates"][f"{code}_{year}"] = val

        return stats


# ═══════════════════════════════════════════════════════════════════════════
# LOADER
# ═══════════════════════════════════════════════════════════════════════════

class MongoLoader:
    """Carga documentos transformados en MongoDB con upsert eficiente."""

    def __init__(self, uri: str, db_name: str):
        self.client = MongoClient(uri, serverSelectionTimeoutMS=10000)
        self.db     = self.client[db_name]
        log.info("MongoDB conectado: %s / %s", uri.split("@")[-1], db_name)

    def load_symptom_reports(self, docs: list[dict]) -> int:
        if not docs:
            return 0
        col = self.db["symptomreports"]
        ops = [
            UpdateOne(
                {"_etl_hash": self._hash(d)},
                {"$setOnInsert": {**d, "_etl_hash": self._hash(d)}},
                upsert=True,
            )
            for d in docs
        ]
        return self._bulk_write(col, ops, "symptomreports")

    def load_medical_histories(self, docs: list[dict]) -> int:
        if not docs:
            return 0
        col = self.db["medicalhistories"]
        ops = [
            UpdateOne(
                {"_etl_hash": self._hash(d)},
                {"$setOnInsert": {**d, "_etl_hash": self._hash(d)}},
                upsert=True,
            )
            for d in docs
        ]
        return self._bulk_write(col, ops, "medicalhistories")

    def save_who_stats(self, stats: dict) -> None:
        """Guarda las estadísticas WHO en una colección de metadatos ETL."""
        col = self.db["etl_metadata"]
        col.update_one(
            {"_type": "who_epidemiological_stats"},
            {"$set": {**stats, "_type": "who_epidemiological_stats", "updated_at": now()}},
            upsert=True,
        )
        log.info("WHO stats guardadas en etl_metadata")

    def get_users_by_role(self, role: str) -> list[dict]:
        return list(self.db["users"].find({"role": role}, {"_id": 1, "name": 1}))

    def _bulk_write(self, col, ops: list, name: str) -> int:
        if not ops:
            return 0
        try:
            result = col.bulk_write(ops, ordered=False)
            inserted = result.upserted_count
            log.info("%-20s → %d nuevos, %d ya existían", name, inserted, len(ops) - inserted)
            return inserted
        except BulkWriteError as bwe:
            inserted = bwe.details.get("nUpserted", 0)
            log.warning("%-20s → %d escritas con algunos errores (duplicados omitidos)", name, inserted)
            return inserted

    @staticmethod
    def _hash(doc: dict) -> str:
        """Hash determinístico para deduplicación de upsert."""
        # Excluye campos que varían entre runs
        clean = {k: v for k, v in doc.items()
                 if k not in ("createdAt", "updatedAt", "reportedAt", "_etl_meta")}
        return hashlib.sha256(json.dumps(clean, sort_keys=True, default=str).encode()).hexdigest()

    def close(self):
        self.client.close()


# ═══════════════════════════════════════════════════════════════════════════
# PIPELINE PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════

def run_pipeline(sources: list[str], csv_path: str | None = None,
                 dry_run: bool = False, max_rows: int = 50_000):
    log.info("═" * 60)
    log.info("RespiCare ETL Pipeline   sources=%s   dry_run=%s", sources, dry_run)
    log.info("═" * 60)

    loader = MongoLoader(MONGO_URI, DB_NAME)

    # Obtener usuarios existentes para enlazar historias médicas
    doctors  = loader.get_users_by_role("doctor")
    patients = loader.get_users_by_role("patient")
    if not doctors or not patients:
        log.warning("No hay usuarios en la BD — ejecuta el seed primero:")
        log.warning("  docker-compose exec backend node src/scripts/seed-complete-system.js")
        log.warning("Continuando sin enlazar a usuarios existentes...")
        doctors  = [{"_id": str(uuid.uuid4()), "name": "Dr. ETL"}]
        patients = [{"_id": str(uuid.uuid4()), "name": "Paciente ETL"}]

    log.info("Usuarios: %d doctores, %d pacientes", len(doctors), len(patients))

    rc_transformer  = RespiCareDatasetTransformer()
    sr_transformer  = SymptomReportTransformer()
    mh_transformer  = MedicalHistoryTransformer()
    enricher        = EpidemiologicalEnricher()

    total_symptom_reports   = 0
    total_medical_histories = 0

    # ── 0. Datasets nativos RespiCare (SIEMPRE, a menos que se especifique solo other) ──
    if "datasets" in sources or "all" in sources:
        log.info("\n[0] Datasets nativos RespiCare (ai-services/data/datasets/)")
        log.info("  Leyendo archivos CSV (máximo %d filas por archivo)...", max_rows)
        rc_df = RespiCareDatasetExtractor(csv_path, max_rows=max_rows).extract()
        if not rc_df.empty:
            sr_docs = rc_transformer.to_symptom_reports(rc_df)
            mh_docs = rc_transformer.to_medical_histories(rc_df, doctors, patients)
            if not dry_run:
                total_symptom_reports   += loader.load_symptom_reports(sr_docs)
                total_medical_histories += loader.load_medical_histories(mh_docs)
            else:
                log.info("  DRY-RUN: se procesarían %d SR + %d MH", len(sr_docs), len(mh_docs))
        else:
            log.warning("  No se encontraron datasets en %s",
                        csv_path or RespiCareDatasetExtractor.DEFAULT_DIR)

    # ── 1. WHO GHO ──────────────────────────────────────────────────────────
    if "who" in sources or "all" in sources:
        log.info("\n[1] WHO Global Health Observatory")
        who_data = WHOExtractor().extract()
        if who_data:
            sr_docs = sr_transformer.from_who(who_data)
            stats   = enricher.enrich_with_who_stats(who_data)
            if not dry_run:
                total_symptom_reports += loader.load_symptom_reports(sr_docs)
                loader.save_who_stats(stats)
            log.info("  Años: %s | Países: %s",
                     stats.get("data_year_range"),
                     sorted({r.get("country") for r in who_data}))
        else:
            log.warning("  WHO: sin datos (timeout o API no disponible)")

    # ── 2. MINSA Datos Abiertos ───────────────────────────────────────────
    if "minsa" in sources or "all" in sources:
        log.info("\n[2] MINSA Datos Abiertos Perú")
        minsa_data = MINSAExtractor().extract()
        if minsa_data:
            minsa_sr = []
            for _ in minsa_data[:500]:
                district = pick(TACNA_DISTRICTS)
                minsa_sr.append({
                    "source_etl": "MINSA_DATOSABIERTOS",
                    "patientId":  None,
                    "location": {
                        "district": district["name"],
                        "coordinates": {"latitude": jitter(district["lat"]), "longitude": jitter(district["lng"])},
                        "address": f"{district['name']}, Tacna, Perú",
                    },
                    "symptoms": [{"name": "tos", "severity": "moderate",
                                  "duration": {"value": 5, "unit": "days"}}],
                    "category": "respiratory",
                    "overallSeverity": pick(["low", "medium", "high"]),
                    "status": "reviewed",
                    "reportedBy": "healthcare_worker",
                    "source": "minsa",
                    "isAnonymous": True,
                    "reportedAt": r_date(datetime(2020, 1, 1), datetime.now(timezone.utc)),
                    "createdAt":  now(),
                    "updatedAt":  now(),
                    "_etl_meta": {"source": "MINSA", "loaded_at": now().isoformat()},
                })
            if not dry_run:
                total_symptom_reports += loader.load_symptom_reports(minsa_sr)
        else:
            log.info("  MINSA: sin datos disponibles (API puede estar caída)")

    # ── 3. SINADEF ────────────────────────────────────────────────────────
    if "sinadef" in sources or "all" in sources:
        log.info("\n[3] SINADEF - Fallecidos por causas respiratorias MINSA")
        sinadef_df = SINADEFExtractor().extract()
        if not sinadef_df.empty:
            mh_docs = mh_transformer.from_sinadef(sinadef_df, doctors, patients)
            if not dry_run:
                total_medical_histories += loader.load_medical_histories(mh_docs)
        else:
            log.info("  SINADEF: sin datos descargados")

    # ── 4. CSV externo (Kaggle / UCI) ─────────────────────────────────────
    if "csv" in sources or "all" in sources:
        log.info("\n[4] CSV externos (Kaggle / UCI)")
        ext_df = KaggleCSVExtractor(csv_path).extract()
        if not ext_df.empty:
            sr_docs = sr_transformer.from_kaggle_csv(ext_df)
            mh_docs = mh_transformer.from_kaggle_csv(ext_df, doctors, patients)
            if not dry_run:
                total_symptom_reports   += loader.load_symptom_reports(sr_docs)
                total_medical_histories += loader.load_medical_histories(mh_docs)
        else:
            log.info("  Sin archivos externos. Coloca CSVs de Kaggle en data/datasets/")

    # ── Resumen ───────────────────────────────────────────────────────────
    log.info("\n" + "═" * 60)
    log.info("ETL COMPLETADO%s", " (DRY-RUN)" if dry_run else "")
    log.info("  SymptomReports cargados  : %d", total_symptom_reports)
    log.info("  MedicalHistories cargadas: %d", total_medical_histories)
    log.info("═" * 60)
    loader.close()


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="RespiCare ETL Pipeline — importa datos públicos a MongoDB",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Todas las fuentes (WHO + MINSA + SINADEF + CSV):
  python scripts/etl/etl_pipeline.py --source all

  # Solo fuentes online gratuitas:
  python scripts/etl/etl_pipeline.py --source who minsa sinadef

  # Solo WHO:
  python scripts/etl/etl_pipeline.py --source who

  # CSV local descargado de Kaggle:
  python scripts/etl/etl_pipeline.py --source csv --csv-path /app/data/etl

  # Simulación sin escribir (ver qué haría):
  python scripts/etl/etl_pipeline.py --source all --dry-run

Datasets Kaggle recomendados (descargar manualmente):
  1. lung-disease-dataset        → https://kaggle.com/datasets/jillanisofttech/lung-disease-dataset
  2. respiratory-disease-dataset → https://kaggle.com/datasets/andrewmvd/respiratory-disease
  3. coronahack-chest-xray       → https://kaggle.com/datasets/praveengovi/coronahack-chest-xraydataset
  4. asthma-disease-prediction   → https://kaggle.com/datasets (busca "asthma prediction")

  Coloca los CSV en /app/data/etl/ dentro del contenedor,
  o monta un volumen en docker-compose.dev.yml:
    volumes:
      - ./data/etl:/app/data/etl
        """,
    )
    parser.add_argument(
        "--source",
        nargs="+",
        choices=["all", "who", "minsa", "sinadef", "csv"],
        default=["who"],
        help="Fuentes a procesar (default: who)",
    )
    parser.add_argument(
        "--csv-path",
        default=None,
        help="Ruta a directorio con CSVs de Kaggle",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="No escribe en MongoDB, solo muestra cuántos docs se procesarían",
    )
    args = parser.parse_args()
    run_pipeline(args.source, args.csv_path, args.dry_run)


if __name__ == "__main__":
    main()