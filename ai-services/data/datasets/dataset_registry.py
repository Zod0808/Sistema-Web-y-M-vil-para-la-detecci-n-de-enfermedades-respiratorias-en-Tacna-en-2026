"""
dataset_registry.py — Registro central de datasets por modelo RespiCare

Cada modelo ML tiene su propia carpeta bajo ai-services/data/datasets/modeloN/
Este archivo es la fuente de verdad: describe qué dataset usa cada modelo,
su formato esperado, y el estado de disponibilidad.

Uso:
    from data.datasets.dataset_registry import REGISTRY, get_dataset_paths

    paths = get_dataset_paths("modelo1")  # lista de Path disponibles
    meta  = REGISTRY["modelo1"]
"""

from pathlib import Path
from typing import Optional
import os

DATASETS_ROOT = Path(__file__).resolve().parent

# ─── Registry ─────────────────────────────────────────────────────────────────
# Cada entrada describe un modelo y sus datasets.
# status: "active" | "pending" | "future"

REGISTRY = {

    # ────────────────────────────────────────────────────────────────────────
    # MODELO 1 — Prediccion de Sintomas (Random Forest / XGBoost)
    # Entrada : sintomas textuales o columnas binarias
    # Salida  : enfermedad + urgencia + severidad
    # ────────────────────────────────────────────────────────────────────────
    "modelo1": {
        "name":        "Prediccion de Sintomas",
        "type":        "tabular",
        "algorithms":  ["RandomForest", "XGBoost", "NeuralNetwork"],
        "status":      "active",
        "target_col":  "prognosis / disease",
        "feature_col": "sintomas (texto o columnas binarias)",
        "sources": [
            {
                "subdir":  "prognosis_disease_symptoms",
                "files":   ["train_disease.csv", "test_disease.csv"],
                "format":  "132 columnas binarias de sintomas (0/1) + columna 'prognosis'",
                "origin":  "Kaggle - Disease Symptom Prediction",
                "rows":    4920,
                "status":  "active",
                "priority": 1,
            },
            {
                "subdir":  "real_approved",
                "files":   ["real_dataset_respicare.csv"],
                "format":  "disease, disease_name, symptoms (texto), urgency, severity, category, patient_age, symptom_count, source",
                "origin":  "Kaggle Disease Profile + MINSA SINADEF Peru (Tacna)",
                "rows":    620,
                "status":  "active",
                "priority": 2,
            },
            {
                "subdir":  "kaggle_disease_profile",
                "files":   ["Disease_symptom_and_patient_profile_dataset.csv"],
                "format":  "Disease, Fever, Cough, Fatigue, Difficulty Breathing, Age, Gender, Blood Pressure, Cholesterol Level, Outcome Variable",
                "origin":  "Kaggle - Disease Symptom and Patient Profile Dataset",
                "rows":    349,
                "status":  "active",
                "priority": 3,
            },
            {
                "subdir":  "disease_symptom_prediction",
                "files":   [
                    "dataset.csv",
                    "symptom_Description.csv",
                    "Symptom-severity.csv",
                    "symptom_precaution.csv",
                ],
                "format":  "dataset.csv: Disease, Symptom_1..Symptom_17 (lista de sintomas por nombre) | symptom_Description.csv: Disease, Description | Symptom-severity.csv: Symptom, weight | symptom_precaution.csv: Disease, Precaution_1..4",
                "origin":  "Kaggle - Disease Symptom Prediction (complemento de prognosis_disease_symptoms)",
                "rows":    "dataset.csv ~4920 filas",
                "status":  "active",
                "priority": 5,
            },
            {
                "subdir":  "respiratory_symptoms_and_treatment",
                "files":   ["respiratory symptoms and treatment.csv"],
                "format":  "Symptoms, Age, Sex, Disease, Treatment, Nature",
                "origin":  "Dataset clinico respiratorio con tratamientos",
                "rows":    "variable",
                "status":  "active",
                "priority": 6,
            },
            {
                "subdir":  "synthetic",
                "files":   [
                    "synthetic_dataset_extended.csv",
                    "synthetic_dataset.csv",
                    "augmented_dataset_full_20251103_124126.csv",
                ],
                "format":  "disease, disease_name, symptoms (texto), urgency, severity, category, patient_age, symptom_count",
                "origin":  "SyntheticDatasetGenerator (RespiCare interno)",
                "rows":    "variable",
                "status":  "active",
                "priority": 4,
            },
        ],
        "validation": {
            "subdir": "validation",
            "files":  ["model_validation_results.csv"],
            "format": "model, accuracy, precision, recall, f1_score, total_classes",
            "notes":  "Generado por scripts/validation/validate_models_comparison_v2.py",
        },
        "training_script": "scripts/training/execute_full_retraining.py",
        "connect_script":  "scripts/training/connect_real_datasets.py",
        "notes": (
            "El modelo usa prepare_features() en random_forest_model.py que acepta "
            "tanto formato de sintomas en texto como columnas binarias. "
            "Priorizar siempre prognosis_disease_symptoms/ (4920 filas, 132 sintomas)"
        ),
    },

    # ────────────────────────────────────────────────────────────────────────
    # MODELO 2 — Analisis de Tos por Audio (CNN)
    # Entrada : archivo .wav / .mp3 de la tos del paciente
    # Salida  : tipo de tos (seca, productiva, croupy) + probabilidad COVID/otro
    # ────────────────────────────────────────────────────────────────────────
    "modelo2": {
        "name":        "Analisis de Tos por Audio",
        "type":        "audio",
        "algorithms":  ["CNN", "YAMNet_transfer", "ResNet1D"],
        "status":      "pending",
        "target_col":  "label (cough_type o diagnosis)",
        "feature_col": "mel_spectrogram extraido del .wav",
        "sources": [
            {
                "subdir":  "cough",
                "files":   ["*.wav"],
                "format":  "WAV mono, 16kHz, 16-bit. Nombre: {patient_id}_{label}_{n}.wav",
                "origin":  "Pendiente — ver datasets recomendados abajo",
                "rows":    0,
                "status":  "pending",
                "priority": 1,
            },
            {
                "subdir":  "no_cough",
                "files":   ["*.wav"],
                "format":  "WAV mono, 16kHz, audio ambiente / voz sin tos",
                "origin":  "Pendiente",
                "rows":    0,
                "status":  "pending",
                "priority": 2,
            },
            {
                "subdir":  "metadata",
                "files":   ["metadata.csv"],
                "format":  "filename, label, duration_ms, sample_rate, split (train/val/test)",
                "origin":  "Generado automaticamente por scripts/training/prepare_audio_dataset.py",
                "rows":    0,
                "status":  "pending",
                "priority": 3,
            },
        ],
        "datasets_recomendados": [
            "COUGHVID (EPFL) — 20,000 audios COVID/no-COVID (licencia abierta)",
            "Coswara (IISc Bangalore) — tos, voz, respiracion COVID",
            "ESC-50 — Environmental Sound Classification (negativas de tos)",
        ],
        "training_script": "scripts/training/train_cough_cnn.py",
        "notes": (
            "Poner archivos .wav en cough/ y no_cough/ segun la etiqueta. "
            "El script de entrenamiento genera metadata.csv automaticamente. "
            "Formato audio: WAV mono 16kHz - convertir con ffmpeg si es necesario."
        ),
    },

    # ────────────────────────────────────────────────────────────────────────
    # MODELO 3 — Sonidos Respiratorios / Auscultacion (extension futura)
    # Entrada : grabacion de auscultacion pulmonar (.wav)
    # Salida  : presencia de crackles / wheeze / normal
    # ────────────────────────────────────────────────────────────────────────
    "modelo3": {
        "name":        "Sonidos Respiratorios Auscultacion",
        "type":        "audio",
        "algorithms":  ["CNN_biespectral", "LSTM", "Transformer"],
        "status":      "future",
        "target_col":  "crackle (0/1), wheeze (0/1)",
        "feature_col": "MFCC + CQT extraidos del .wav",
        "sources": [
            {
                "subdir":  "recordings",
                "files":   ["*.wav"],
                "format":  "WAV mono, 4000Hz (ICBHI estandar). Ciclos respiratorios anotados.",
                "origin":  "Pendiente — ver datasets recomendados abajo",
                "rows":    0,
                "status":  "future",
                "priority": 1,
            },
            {
                "subdir":  "annotations",
                "files":   ["annotations.csv"],
                "format":  "filename, cycle_start_ms, cycle_end_ms, crackle (0/1), wheeze (0/1), diagnosis",
                "origin":  "Pendiente",
                "rows":    0,
                "status":  "future",
                "priority": 2,
            },
        ],
        "datasets_recomendados": [
            "ICBHI 2017 Challenge Dataset — 920 grabaciones, 6898 ciclos respiratorios",
            "RespireNet Dataset (GitHub: microsoft/RespireNet)",
        ],
        "training_script": "scripts/training/train_auscultation_model.py",
        "notes": "Extension futura — priorizar despues de Modelo 2.",
    },

    # ────────────────────────────────────────────────────────────────────────
    # MODELO 4 — Imagenologia (ResNet50 para radiografias de torax)
    # Entrada : imagen radiografia .png / .jpg / DICOM
    # Salida  : normal / neumonia / covid / tuberculosis
    # ────────────────────────────────────────────────────────────────────────
    "modelo4": {
        "name":        "Imagenologia Radiografia de Torax",
        "type":        "image",
        "algorithms":  ["ResNet50", "EfficientNetB3", "DenseNet121"],
        "status":      "pending",
        "target_col":  "label (normal/pneumonia/covid/tuberculosis)",
        "feature_col": "imagen 224x224 RGB normalizada",
        "sources": [
            {
                "subdir":  "train",
                "files":   ["normal/*.png", "pneumonia/*.jpg", "covid/*.jpg", "tuberculosis/*.jpg"],
                "format":  (
                    "Imagenes en subcarpetas por clase. "
                    "Nombre: {id}_{clase}_{n}.{ext}. "
                    "Resolucion minima recomendada: 512x512"
                ),
                "origin":  "Pendiente — ver datasets recomendados abajo",
                "rows":    0,
                "status":  "pending",
                "priority": 1,
            },
            {
                "subdir":  "val",
                "files":   ["normal/*.png", "pneumonia/*.jpg", "covid/*.jpg", "tuberculosis/*.jpg"],
                "format":  "Mismo formato que train. 20% del total.",
                "origin":  "Split automatico desde train",
                "rows":    0,
                "status":  "pending",
                "priority": 2,
            },
            {
                "subdir":  "test",
                "files":   ["*.png", "*.jpg"],
                "format":  "Imagenes sin subcarpeta — evaluacion final. Requiere metadata.csv con ground truth.",
                "origin":  "Pendiente",
                "rows":    0,
                "status":  "pending",
                "priority": 3,
            },
        ],
        "datasets_recomendados": [
            "NIH ChestX-ray14 — 112,120 imagenes, 14 patologias (acceso libre)",
            "CheXpert (Stanford) — 224,316 radiografias con labels automaticos",
            "COVID-19 Radiography Database (Kaggle) — 21,165 imagenes 4 clases",
            "Montgomery / Shenzhen TB Dataset — tuberculosis pulmonar",
        ],
        "training_script": "scripts/training/train_imaging_model.py",
        "notes": (
            "Imagenes .dcm DICOM se convierten a PNG con scripts/etl/dicom_to_png.py (pendiente). "
            "Split recomendado: 70% train / 20% val / 10% test. "
            "Data augmentation: rotacion +-15deg, flip horizontal, brillo +-20%."
        ),
    },

    # ────────────────────────────────────────────────────────────────────────
    # MODELO 5 — Signos Vitales de Wearables (SpO2 / Frecuencia Cardiaca)
    # Entrada : series de tiempo SpO2 + FC del smartwatch/oximetro
    # Salida  : alerta critica / deterioro / normal
    # ────────────────────────────────────────────────────────────────────────
    "modelo5": {
        "name":        "Signos Vitales Wearables SpO2 FC",
        "type":        "timeseries",
        "algorithms":  ["LSTM", "GRU", "IsolationForest", "AutoEncoder"],
        "status":      "pending",
        "target_col":  "alert_level (normal/warning/critical)",
        "feature_col": "spo2, heart_rate, ventana 60s (rolling window)",
        "sources": [
            {
                "subdir":  "timeseries",
                "files":   ["*.csv"],
                "format":  (
                    "Una fila por lectura. Columnas: "
                    "timestamp (ISO8601), patient_id, spo2 (%), heart_rate (bpm), "
                    "respiratory_rate (rpm, opcional), temperature_c (opcional)"
                ),
                "origin":  "Pendiente — ver datasets recomendados abajo",
                "rows":    0,
                "status":  "pending",
                "priority": 1,
            },
            {
                "subdir":  "labels",
                "files":   ["labels.csv"],
                "format":  "patient_id, start_ts, end_ts, alert_level, diagnosis, notes",
                "origin":  "Etiquetado clinico manual o generado desde alertas MongoDB",
                "rows":    0,
                "status":  "pending",
                "priority": 2,
            },
        ],
        "sources": [
            {
                "subdir":  "lung_disease_clinical",
                "files":   ["lung_disease.xlsx"],
                "format":  "Patient, smoke, FVC, FEC1 (FEV1), PEFR, O2, ABG-P-O2, ABG-P-CO2, ABG-pH Level, Scan, Asthama, Other diseases, AGE, Risk",
                "origin":  "Dataset clinico pulmonar — mediciones de funcion respiratoria y gasometria (Modelo 5)",
                "rows":    470,
                "status":  "active",
                "priority": 1,
                "nota":    "Mover desde modelo1/lung_disease_dataset/ a modelo5/ — contiene O2/FVC/FEV1 (signos vitales respiratorios)",
            },
        ],
        "datasets_recomendados": [
            "PhysioNet MIMIC-III Waveform — SpO2/HR de UCI (requiere credenciales PhysioNet)",
            "BIDMC PPG and Respiration Dataset (PhysioNet) — libre",
            "Datos propios RespiCare: exportar desde MongoDB wearable_readings (ver scripts/etl/export_wearable_data.py)",
        ],
        "training_script": "scripts/training/train_wearable_model.py",
        "notes": (
            "El flujo wearable->MongoDB ya esta implementado (ver proyecto_wearable_flow.md). "
            "Exportar datos reales de pacientes RespiCare con: "
            "python scripts/etl/export_wearable_data.py --days 90 --output modelo5/timeseries/"
        ),
    },
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_dataset_paths(model_key: str, status_filter: Optional[str] = None) -> list[Path]:
    """
    Devuelve lista de Path de archivos existentes para el modelo dado.

    Args:
        model_key:     "modelo1" ... "modelo5"
        status_filter: si se indica, solo incluye sources con ese status

    Returns:
        Lista de Path de archivos CSV/WAV/PNG que existen en disco.
    """
    if model_key not in REGISTRY:
        raise ValueError(f"Modelo '{model_key}' no encontrado. Disponibles: {list(REGISTRY.keys())}")

    model_dir = DATASETS_ROOT / model_key
    found: list[Path] = []

    for source in REGISTRY[model_key]["sources"]:
        if status_filter and source.get("status") != status_filter:
            continue
        subdir = model_dir / source["subdir"]
        for pattern in source["files"]:
            matches = list(subdir.glob(pattern)) if "*" in pattern else [subdir / pattern]
            found.extend(p for p in matches if p.exists())

    found.sort(key=lambda p: p.stat().st_size, reverse=True)
    return found


def print_registry_summary():
    """Imprime un resumen del estado del registro."""
    print("\n" + "=" * 65)
    print("  RespiCare - Registro de Datasets por Modelo")
    print("=" * 65)
    for key, meta in REGISTRY.items():
        status_icon = {"active": "[OK]", "pending": "[--]", "future": "[..]"}.get(meta["status"], "[?]")
        paths = get_dataset_paths(key, status_filter="active")
        total_rows = sum(
            s["rows"] for s in meta["sources"]
            if isinstance(s.get("rows"), int)
        )
        print(f"\n  {status_icon} {key.upper()} — {meta['name']}")
        print(f"       Tipo       : {meta['type']}")
        print(f"       Algoritmos : {', '.join(meta['algorithms'])}")
        print(f"       Archivos   : {len(paths)} disponibles en disco")
        print(f"       Filas/mues.: {total_rows if total_rows else 'N/A (audio/imagen)'}")
        print(f"       Script     : {meta['training_script']}")
    print()


if __name__ == "__main__":
    print_registry_summary()