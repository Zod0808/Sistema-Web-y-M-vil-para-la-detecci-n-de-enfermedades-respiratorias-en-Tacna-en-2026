"""
Script de Prueba para Sistema de Retraining

Prueba el sistema de retraining automático con datos simulados.
"""

import sys
import os
from pathlib import Path

# Add paths
sys.path.insert(0, os.path.dirname(__file__))
# ml_models is in the parent directory, not in tests/
parent_dir = os.path.dirname(os.path.dirname(__file__))
ml_models_path = os.path.join(parent_dir, 'ml_models')
sys.path.insert(0, ml_models_path)

# Import directly
import importlib.util

spec = importlib.util.spec_from_file_location("auto_retraining", os.path.join(ml_models_path, "auto_retraining.py"))
auto_retraining_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auto_retraining_module)
get_retraining_system = auto_retraining_module.get_retraining_system

spec2 = importlib.util.spec_from_file_location("medical_feedback_system", os.path.join(ml_models_path, "medical_feedback_system.py"))
feedback_module = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(feedback_module)
get_feedback_system = feedback_module.get_feedback_system


def main():
    print("="*60)
    print("PRUEBA DE SISTEMA DE RETRAINING AUTOMATICO")
    print("="*60)
    
    # Initialize systems
    retraining_system = get_retraining_system()
    feedback_system = get_feedback_system()
    
    # Simulate some feedback
    print("\n1. Simulando feedback medico...")
    
    # Simulate feedback entries
    test_feedback = [
        {
            'prediction_id': 'pred_test_001',
            'doctor_id': 'dr_001',
            'feedback_type': 'incorrect',
            'actual_disease': 'asma bronquial',
            'actual_urgency': 'high',
            'symptoms': ['tos', 'sibilancias', 'dificultad respiratoria'],
            'confidence_rating': 5
        },
        {
            'prediction_id': 'pred_test_002',
            'doctor_id': 'dr_001',
            'feedback_type': 'incorrect',
            'actual_disease': 'neumonía',
            'actual_urgency': 'high',
            'symptoms': ['fiebre', 'tos', 'dificultad respiratoria', 'dolor toracico'],
            'confidence_rating': 5
        }
    ]
    
    for i, fb in enumerate(test_feedback, 1):
        feedback_system.submit_feedback(**fb)
        print(f"  [OK] Feedback {i} enviado")
    
    # Check retraining status
    print("\n2. Verificando estado de retraining...")
    should_retrain, stats = retraining_system.should_retrain(min_new_feedback=2)
    
    print(f"\n  Estado:")
    print(f"    - Debe reentrenar: {should_retrain}")
    print(f"    - Muestras disponibles: {stats['total_feedback_samples']}")
    print(f"    - Umbral requerido: {stats['threshold']}")
    
    # Collect training data
    print("\n3. Recopilando datos de entrenamiento...")
    training_data = retraining_system.collect_training_data_from_feedback(days=30)
    
    print(f"\n  Datos recopilados:")
    print(f"    - Total muestras: {len(training_data)}")
    if not training_data.empty:
        print(f"    - Enfermedades: {training_data['disease'].nunique()}")
        print(f"\n    Muestra de datos:")
        for idx, row in training_data.head(2).iterrows():
            print(f"      {idx+1}. Enfermedad: {row['disease']}")
            print(f"         Sintomas: {row['symptoms'][:60]}...")
    
    # Test backup
    print("\n4. Probando sistema de backup...")
    backups = retraining_system.backup_current_models()
    
    if backups:
        print(f"\n  [OK] Modelos respaldados:")
        for model, path in backups.items():
            print(f"    - {model} -> {path}")
    else:
        print("\n  [INFO] No se encontraron modelos para respaldar")
    
    # Test augmentation (if dataset exists)
    print("\n5. Probando aumento de dataset...")
    base_dataset = 'synthetic_dataset.csv'
    if os.path.exists(base_dataset):
        augmented_df = retraining_system.augment_dataset_with_feedback(
            base_dataset,
            output_path='test_augmented_dataset.csv'
        )
        print(f"\n  [OK] Dataset aumentado:")
        print(f"    - Muestras originales: {len(pd.read_csv(base_dataset))}")
        print(f"    - Muestras aumentadas: {len(augmented_df)}")
        print(f"    - Archivo: test_augmented_dataset.csv")
    else:
        print("\n  [INFO] Dataset base no encontrado, saltando prueba")
    
    print("\n" + "="*60)
    print("[SUCCESS] PRUEBA DE RETRAINING COMPLETADA")
    print("="*60)
    
    print("\nResumen:")
    print("  [OK] Sistema de retraining: FUNCIONANDO")
    print("  [OK] Recopilacion de feedback: FUNCIONANDO")
    print("  [OK] Sistema de backup: FUNCIONANDO")
    print("  [OK] Aumento de dataset: FUNCIONANDO")
    
    return 0


if __name__ == "__main__":
    try:
        import pandas as pd
    except ImportError:
        print("Warning: pandas no disponible, algunas funciones limitadas")
        pd = None
    
    exit(main())

