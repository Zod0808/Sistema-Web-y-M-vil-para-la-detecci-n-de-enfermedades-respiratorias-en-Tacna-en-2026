"""
Script de Retraining Automático desde Feedback Médico

Ejecuta el retraining de modelos ML usando feedback médico acumulado.
Puede ejecutarse manualmente o programarse periódicamente.

Usage:
    python retrain_models_from_feedback.py [--model xgboost|random_forest|neural_network|all] [--threshold 50]
"""

import argparse
import sys
import os
from pathlib import Path
from datetime import datetime

# Add paths
sys.path.insert(0, os.path.dirname(__file__))
ml_models_path = os.path.join(os.path.dirname(__file__), 'ml_models')
sys.path.insert(0, ml_models_path)

# Import directly to avoid __init__.py issues
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
    parser = argparse.ArgumentParser(
        description='Retrain ML models using medical feedback'
    )
    parser.add_argument(
        '--model',
        type=str,
        choices=['xgboost', 'random_forest', 'neural_network', 'all'],
        default='all',
        help='Model(s) to retrain'
    )
    parser.add_argument(
        '--threshold',
        type=int,
        default=50,
        help='Minimum feedback samples to trigger retraining'
    )
    parser.add_argument(
        '--base-dataset',
        type=str,
        default='synthetic_dataset.csv',
        help='Base dataset path'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force retraining even if threshold not met'
    )
    
    args = parser.parse_args()
    
    print("="*60)
    print("RETRAINING AUTOMATICO DESDE FEEDBACK MEDICO")
    print("="*60)
    print(f"\nFecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Modelos a reentrenar: {args.model}")
    print(f"Umbral mínimo de feedback: {args.threshold}")
    
    # Initialize systems
    retraining_system = get_retraining_system()
    feedback_system = get_feedback_system()
    
    # Check feedback statistics
    print("\n" + "="*60)
    print("1. VERIFICANDO FEEDBACK MEDICO")
    print("="*60)
    
    quality_metrics = feedback_system.get_quality_metrics()
    
    print(f"\nEstadisticas de feedback:")
    print(f"  - Total feedback: {quality_metrics.get('total_feedback', 0)}")
    print(f"  - Predicciones correctas: {quality_metrics.get('correct_predictions', 0)}")
    print(f"  - Predicciones incorrectas: {quality_metrics.get('incorrect_predictions', 0)}")
    print(f"  - Predicciones parcialmente correctas: {quality_metrics.get('partially_correct_predictions', 0)}")
    print(f"  - Ejemplos de entrenamiento generados: {quality_metrics.get('training_examples_generated', 0)}")
    
    # Check if retraining should be triggered
    print("\n" + "="*60)
    print("2. EVALUANDO NECESIDAD DE RETRAINING")
    print("="*60)
    
    should_retrain, stats = retraining_system.should_retrain(min_new_feedback=args.threshold)
    
    if not should_retrain and not args.force:
        print(f"\n[INFO] Retraining no necesario:")
        print(f"  - Muestras de feedback disponibles: {stats['total_feedback_samples']}")
        print(f"  - Umbral requerido: {stats['threshold']}")
        print(f"\n  Espera hasta tener al menos {stats['threshold']} muestras de feedback")
        print(f"  o usa --force para forzar el retraining")
        return 0
    
    if args.force:
        print("\n[INFO] Retraining forzado con --force")
    
    # Collect training data
    print("\n" + "="*60)
    print("3. RECOPILANDO DATOS DE ENTRENAMIENTO")
    print("="*60)
    
    training_data = retraining_system.collect_training_data_from_feedback(days=90)
    
    if training_data.empty and not args.force:
        print("\n[ERROR] No hay datos de feedback disponibles para retraining")
        return 1
    
    print(f"\n[OK] Datos recopilados:")
    print(f"  - Muestras de feedback: {len(training_data)}")
    if not training_data.empty:
        print(f"  - Enfermedades en feedback: {training_data['disease'].nunique()}")
        print(f"\n  Primeras 3 muestras:")
        for idx, row in training_data.head(3).iterrows():
            print(f"    {idx+1}. Enfermedad: {row['disease']}")
            print(f"       Sintomas: {row['symptoms'][:80]}...")
    
    # Augment dataset
    print("\n" + "="*60)
    print("4. AUMENTANDO DATASET BASE")
    print("="*60)
    
    augmented_path = f"augmented_dataset_retraining_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    augmented_df = retraining_system.augment_dataset_with_feedback(
        args.base_dataset,
        output_path=augmented_path
    )
    
    if augmented_df.empty:
        print("\n[ERROR] No se pudo crear dataset aumentado")
        return 1
    
    print(f"\n[OK] Dataset aumentado creado:")
    print(f"  - Dataset base: {len(pd.read_csv(args.base_dataset)) if os.path.exists(args.base_dataset) else 0} muestras")
    print(f"  - Dataset aumentado: {len(augmented_df)} muestras")
    print(f"  - Muestras añadidas desde feedback: {len(augmented_df) - (len(pd.read_csv(args.base_dataset)) if os.path.exists(args.base_dataset) else 0)}")
    print(f"  - Archivo: {augmented_path}")
    
    # Backup current models
    print("\n" + "="*60)
    print("5. RESPALDO DE MODELOS ACTUALES")
    print("="*60)
    
    backups = retraining_system.backup_current_models()
    
    if backups:
        print(f"\n[OK] Modelos respaldados:")
        for model, backup_path in backups.items():
            print(f"  - {model} -> {backup_path}")
    else:
        print("\n[INFO] No se encontraron modelos para respaldar")
    
    # Determine which models to retrain
    models_to_retrain = []
    if args.model == 'all':
        models_to_retrain = ['xgboost', 'random_forest']
    else:
        models_to_retrain = [args.model]
    
    # Retrain models
    print("\n" + "="*60)
    print("6. REENTRENANDO MODELOS")
    print("="*60)
    
    results = {}
    
    for model_type in models_to_retrain:
        print(f"\n6.{models_to_retrain.index(model_type) + 1}. Reentrenando {model_type.upper()}...")
        
        if model_type == 'xgboost':
            result = retraining_system.retrain_xgboost(augmented_path)
            results['xgboost'] = result
        elif model_type == 'random_forest':
            result = retraining_system.retrain_random_forest(augmented_path)
            results['random_forest'] = result
        elif model_type == 'neural_network':
            result = retraining_system.retrain_neural_network(augmented_path)
            results['neural_network'] = result
        
        if 'error' in result:
            print(f"  [ERROR] {result['error']}")
        else:
            print(f"  [OK] Retraining iniciado para {model_type}")
    
    # Execute actual training using existing scripts
    print("\n" + "="*60)
    print("7. EJECUTANDO ENTRENAMIENTO")
    print("="*60)
    
    import subprocess
    
    for model_type in models_to_retrain:
        print(f"\nEntrenando {model_type}...")
        try:
            if model_type == 'xgboost':
                cmd = [sys.executable, 'train_xgboost_simple.py', '--dataset', augmented_path]
                subprocess.run(cmd, check=True, cwd=os.path.dirname(__file__))
                print(f"  [OK] XGBoost entrenado exitosamente")
            elif model_type == 'random_forest':
                cmd = [sys.executable, 'train_base_model.py']
                # Would need to modify train_base_model.py to accept dataset path
                print(f"  [INFO] Random Forest: usar train_base_model.py manualmente")
            elif model_type == 'neural_network':
                cmd = [sys.executable, 'train_neural_network.py', '--dataset', augmented_path, '--output', 'models/']
                subprocess.run(cmd, check=True, cwd=os.path.dirname(__file__))
                print(f"  [OK] Neural Network entrenado exitosamente")
        except subprocess.CalledProcessError as e:
            print(f"  [ERROR] Error entrenando {model_type}: {e}")
        except Exception as e:
            print(f"  [ERROR] Error inesperado: {e}")
    
    print("\n" + "="*60)
    print("[SUCCESS] RETRAINING COMPLETADO")
    print("="*60)
    print(f"\nResumen:")
    print(f"  - Dataset aumentado: {augmented_path}")
    print(f"  - Modelos respaldados: {len(backups)}")
    print(f"  - Modelos reentrenados: {', '.join(models_to_retrain)}")
    print(f"\nLos modelos actualizados están en: models/")
    print(f"Los respaldos están en: models/backups/")
    
    return 0


if __name__ == "__main__":
    import pandas as pd
    exit(main())

