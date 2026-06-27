"""
Ejecutar Retraining Completo con Dataset Aumentado

Combina el dataset extendido (307k casos) con feedback médico y
reentrena todos los modelos para máxima precisión.

"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Add paths
sys.path.insert(0, os.path.dirname(__file__))
ml_models_path = os.path.join(os.path.dirname(__file__), 'ml_models')
sys.path.insert(0, ml_models_path)

# Import directly
import importlib.util

auto_retraining_path = os.path.join(ml_models_path, "auto_retraining.py")
spec = importlib.util.spec_from_file_location("auto_retraining", auto_retraining_path)
auto_retraining_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auto_retraining_module)
get_retraining_system = auto_retraining_module.get_retraining_system

feedback_path = os.path.join(ml_models_path, "medical_feedback_system.py")
spec2 = importlib.util.spec_from_file_location("medical_feedback_system", feedback_path)
feedback_module = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(feedback_module)
get_feedback_system = feedback_module.get_feedback_system


def main():
    print("="*70)
    print("RETRAINING COMPLETO CON DATASET AUMENTADO")
    print("="*70)
    print(f"\nFecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Initialize systems
    retraining_system = get_retraining_system()
    feedback_system = get_feedback_system()
    
    # Step 1: Check feedback and augment dataset
    print("\n" + "="*70)
    print("PASO 1: PREPARACION DE DATASET AUMENTADO")
    print("="*70)
    
    # Priorizar datasets reales. Orden = calidad y tamano del dataset.
    # Para agregar un nuevo dataset: copiarlo en data/datasets/modelo1/ y agregarlo aqui.
    DATASETS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'datasets')
    MODELO1_DIR  = os.path.join(DATASETS_DIR, 'modelo1')
    DATASET_PRIORITY = [
        # 1. Dataset Kaggle UCI — 4920 filas, 132 sintomas binarios, 41 enfermedades
        os.path.join(MODELO1_DIR, 'prognosis_disease_symptoms', 'train_disease.csv'),
        # 2. Dataset real combinado Kaggle Profile + MINSA Tacna
        os.path.join(MODELO1_DIR, 'real_approved', 'real_dataset_respicare.csv'),
        os.path.join(DATASETS_DIR, 'real_dataset_respicare.csv'),           # fallback raiz
        # 3. Sintetico aumentado (fallback)
        os.path.join(MODELO1_DIR, 'synthetic', 'augmented_dataset_full_20251103_124126.csv'),
        os.path.join(DATASETS_DIR, 'augmented_dataset_full_20251103_124126.csv'),
        # 4. Sintetico extendido
        os.path.join(MODELO1_DIR, 'synthetic', 'synthetic_dataset_extended.csv'),
        os.path.join(DATASETS_DIR, 'synthetic_dataset_extended.csv'),
        # 5. Sintetico base
        os.path.join(MODELO1_DIR, 'synthetic', 'synthetic_dataset.csv'),
        os.path.join(DATASETS_DIR, 'synthetic_dataset.csv'),
        'synthetic_dataset_extended.csv',
        'synthetic_dataset.csv',
    ]

    base_dataset = None
    for candidate in DATASET_PRIORITY:
        if os.path.exists(candidate):
            base_dataset = candidate
            is_real = 'real_dataset' in os.path.basename(candidate)
            label   = '✅ REAL (aprobado científicamente)' if is_real else '⚙️  Sintético'
            print(f"\nDataset base seleccionado [{label}]:")
            print(f"  {candidate}")
            break

    if not base_dataset:
        print(f"\n[ERROR] Ningun dataset encontrado")
        print(f"  Ejecuta primero: python scripts/training/connect_real_datasets.py")
        return 1
    
    # Collect feedback data
    print("\nRecopilando feedback medico...")
    training_data = retraining_system.collect_training_data_from_feedback(days=90)
    
    print(f"  - Muestras de feedback disponibles: {len(training_data)}")
    
    # Create augmented dataset
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    augmented_path = f'augmented_dataset_full_{timestamp}.csv'
    
    print(f"\nCreando dataset aumentado: {augmented_path}")
    augmented_df = retraining_system.augment_dataset_with_feedback(
        base_dataset,
        output_path=augmented_path
    )
    
    if augmented_df.empty:
        print("\n[ERROR] No se pudo crear dataset aumentado")
        return 1
    
    base_count = len(pd.read_csv(base_dataset)) if os.path.exists(base_dataset) else 0
    feedback_count = len(training_data)
    total_count = len(augmented_df)
    
    print(f"\n[OK] Dataset aumentado creado:")
    print(f"  - Muestras base: {base_count:,}")
    print(f"  - Muestras de feedback: {feedback_count}")
    print(f"  - Total aumentado: {total_count:,}")
    print(f"  - Archivo: {augmented_path}")
    
    # Step 2: Backup current models
    print("\n" + "="*70)
    print("PASO 2: RESPALDO DE MODELOS ACTUALES")
    print("="*70)
    
    backups = retraining_system.backup_current_models()
    
    if backups:
        print(f"\n[OK] {len(backups)} modelos respaldados:")
        for model, backup_path in backups.items():
            size_kb = os.path.getsize(backup_path) / 1024 if os.path.exists(backup_path) else 0
            print(f"  - {model}")
            print(f"    Backup: {backup_path}")
            print(f"    Tamaño: {size_kb:.2f} KB")
    else:
        print("\n[INFO] No se encontraron modelos para respaldar")
    
    # Step 3: Retrain models
    print("\n" + "="*70)
    print("PASO 3: REENTRENAMIENTO DE MODELOS")
    print("="*70)
    
    models_to_train = ['xgboost', 'random_forest']  # Skip neural network for speed
    results = {}
    
    for model_type in models_to_train:
        print(f"\n3.{models_to_train.index(model_type) + 1}. Reentrenando {model_type.upper()}...")
        print(f"  Dataset: {augmented_path} ({total_count:,} muestras)")
        print(f"  Esto puede tardar varios minutos...")
        
        start_time = datetime.now()
        
        if model_type == 'xgboost':
            result = retraining_system.retrain_xgboost(augmented_path)
        elif model_type == 'random_forest':
            result = retraining_system.retrain_random_forest(augmented_path)
        
        elapsed = (datetime.now() - start_time).total_seconds()
        
        if 'error' in result:
            print(f"  [ERROR] {result['error']}")
            results[model_type] = result
        else:
            print(f"  [OK] Retraining completado en {elapsed:.1f} segundos")
            results[model_type] = result
    
    # Step 4: Execute actual training scripts
    print("\n" + "="*70)
    print("PASO 4: EJECUTANDO SCRIPTS DE ENTRENAMIENTO")
    print("="*70)
    
    import subprocess
    
    training_results = {}
    
    for model_type in models_to_train:
        print(f"\nEntrenando {model_type}...")
        start_time = datetime.now()
        
        try:
            if model_type == 'xgboost':
                # Use the existing training script
                cmd = [
                    sys.executable, 
                    'train_xgboost_simple.py'
                ]
                
                print(f"  Ejecutando: {' '.join(cmd)}")
                result = subprocess.run(
                    cmd,
                    cwd=os.path.dirname(__file__),
                    capture_output=True,
                    text=True,
                    timeout=7200  # 2 hours
                )
                
                if result.returncode == 0:
                    elapsed = (datetime.now() - start_time).total_seconds()
                    print(f"  [OK] XGBoost entrenado exitosamente ({elapsed/60:.1f} minutos)")
                    training_results['xgboost'] = {'status': 'completed', 'time': elapsed}
                else:
                    print(f"  [ERROR] {result.stderr[:200]}")
                    training_results['xgboost'] = {'status': 'failed', 'error': result.stderr}
                    
            elif model_type == 'random_forest':
                # Random Forest training
                cmd = [
                    sys.executable,
                    'train_base_model.py'
                ]
                
                print(f"  Ejecutando: {' '.join(cmd)}")
                result = subprocess.run(
                    cmd,
                    cwd=os.path.dirname(__file__),
                    capture_output=True,
                    text=True,
                    timeout=3600  # 1 hour
                )
                
                if result.returncode == 0:
                    elapsed = (datetime.now() - start_time).total_seconds()
                    print(f"  [OK] Random Forest entrenado exitosamente ({elapsed/60:.1f} minutos)")
                    training_results['random_forest'] = {'status': 'completed', 'time': elapsed}
                else:
                    print(f"  [ERROR] {result.stderr[:200]}")
                    training_results['random_forest'] = {'status': 'failed', 'error': result.stderr}
                    
        except subprocess.TimeoutExpired:
            print(f"  [ERROR] Timeout: Entrenamiento tardo mas de 2 horas")
            training_results[model_type] = {'status': 'timeout'}
        except Exception as e:
            print(f"  [ERROR] {str(e)}")
            training_results[model_type] = {'status': 'error', 'error': str(e)}
    
    # Step 5: Summary
    print("\n" + "="*70)
    print("RESUMEN DEL RETRAINING")
    print("="*70)
    
    print(f"\nDataset:")
    print(f"  - Base: {base_dataset} ({base_count:,} muestras)")
    print(f"  - Aumentado: {augmented_path} ({total_count:,} muestras)")
    print(f"  - Muestras añadidas: {feedback_count} desde feedback medico")
    
    print(f"\nModelos:")
    for model_type in models_to_train:
        if model_type in training_results:
            status = training_results[model_type].get('status', 'unknown')
            if status == 'completed':
                time = training_results[model_type].get('time', 0)
                print(f"  - {model_type.upper()}: [OK] Completado ({time/60:.1f} min)")
            else:
                print(f"  - {model_type.upper()}: [ERROR] {status}")
        else:
            print(f"  - {model_type.upper()}: [PENDIENTE]")
    
    print(f"\nRespaldos:")
    for model, backup_path in backups.items():
        print(f"  - {model}: {backup_path}")
    
    print("\n" + "="*70)
    print("[SUCCESS] RETRAINING COMPLETADO")
    print("="*70)
    print("\nLos nuevos modelos estan en: models/")
    print("Los respaldos estan en: models/backups/")
    
    return 0


if __name__ == "__main__":
    try:
        import pandas as pd
    except ImportError:
        print("[ERROR] pandas no disponible")
        exit(1)
    
    exit(main())

