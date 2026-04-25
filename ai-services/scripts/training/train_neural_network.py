"""
Script de Entrenamiento para Red Neuronal Multi-Tarea

Entrena el modelo de red neuronal multi-tarea para clasificación de enfermedades respiratorias.
Predice simultáneamente: enfermedad, urgencia, severidad y categoría.

Usage:
    python train_neural_network.py [--dataset DATASET.csv] [--output models/]
"""

import argparse
import pandas as pd
import numpy as np
from pathlib import Path
import sys
import os

# Add ml_models to path
ml_models_path = os.path.join(os.path.dirname(__file__), 'ml_models')
sys.path.insert(0, ml_models_path)

# Import directly to avoid __init__.py issues
import importlib.util

spec = importlib.util.spec_from_file_location("neural_network_model", os.path.join(ml_models_path, "neural_network_model.py"))
neural_network_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(neural_network_module)
MultiTaskNeuralNetwork = neural_network_module.MultiTaskNeuralNetwork

spec2 = importlib.util.spec_from_file_location("synthetic_dataset_generator", os.path.join(ml_models_path, "synthetic_dataset_generator.py"))
dataset_generator_module = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(dataset_generator_module)
SyntheticDatasetGenerator = dataset_generator_module.SyntheticDatasetGenerator

from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib


def load_or_generate_dataset(dataset_path: str = None):
    """Load existing dataset or generate new one"""
    if dataset_path and os.path.exists(dataset_path):
        print(f"Cargando dataset desde: {dataset_path}")
        df = pd.read_csv(dataset_path)
        # Convert symptoms column if it's a string
        if isinstance(df['symptoms'].iloc[0], str):
            df['symptoms'] = df['symptoms'].apply(lambda x: [s.strip() for s in str(x).split(',')])
        return df
    else:
        print("Generando dataset sintético...")
        generator = SyntheticDatasetGenerator()
        
        # Generate balanced dataset
        common_diseases = [
            'asma bronquial', 'neumonía', 'bronquitis aguda', 'resfriado común',
            'sinusitis', 'faringitis', 'laringitis', 'influenza a (h1n1)', 
            'influenza a (h3n2)', 'influenza b', 'bronquiolitis aguda', 
            'epoc', 'rinitis', 'covid-19'
        ]
        
        samples_per_disease = {}
        for disease in generator.diseases_db.keys():
            if any(common in disease.lower() for common in common_diseases):
                samples_per_disease[disease] = np.random.randint(2000, 3000)
            else:
                samples_per_disease[disease] = np.random.randint(300, 800)
        
        df = generator.generate_dataset(samples_per_disease, output_file='synthetic_dataset_full.csv')
        print(f"Dataset generado: {len(df)} casos, {df['disease'].nunique()} enfermedades")
        return df


def train_neural_network(df: pd.DataFrame, output_dir: str = 'models/'):
    """Train multi-task neural network"""
    print("\n" + "="*60)
    print("ENTRENAMIENTO DE RED NEURONAL MULTI-TAREA")
    print("="*60)
    
    # Ensure output directory exists
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Initialize model
    print("\nInicializando modelo multi-tarea...")
    model = MultiTaskNeuralNetwork(random_state=42)
    
    # Prepare multi-task data
    print("Preparando datos multi-tarea...")
    tasks_data = model.prepare_multi_task_data(df)
    
    print(f"\nDatos preparados:")
    print(f"  - Features: {len(model.feature_names)}")
    print(f"  - Tareas: {list(tasks_data.keys())}")
    for task_name, (X, y) in tasks_data.items():
        print(f"  - {task_name}: {X.shape[0]} casos, {len(np.unique(y))} clases")
    
    # Train model
    print("\nIniciando entrenamiento...")
    model.train(tasks_data, test_size=0.2)
    
    # Evaluate model
    print("\n" + "="*60)
    print("EVALUACIÓN DEL MODELO")
    print("="*60)
    
    from sklearn.model_selection import train_test_split
    
    results = {}
    for task_name, (X, y) in tasks_data.items():
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        y_pred = model.models[task_name].predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        results[task_name] = {
            'accuracy': accuracy,
            'predictions': y_pred,
            'true_labels': y_test
        }
        
        print(f"\n{task_name.upper()}:")
        print(f"  Accuracy: {accuracy:.4f}")
        
        # Classification report for disease (most important)
        if task_name == 'disease':
            class_names = model.label_encoders[task_name].classes_
            print(f"\n  Classification Report:")
            report = classification_report(
                y_test, y_pred, 
                target_names=class_names,
                output_dict=True,
                zero_division=0
            )
            
            # Show top 5 diseases by F1-score
            f1_scores = [(name, report[name]['f1-score']) 
                        for name in class_names if name in report]
            f1_scores.sort(key=lambda x: x[1], reverse=True)
            
            print(f"\n  Top 5 enfermedades (F1-score):")
            for name, f1 in f1_scores[:5]:
                print(f"    - {name}: {f1:.4f}")
    
    # Save model
    output_path = os.path.join(output_dir, 'neural_network_model.pkl')
    model.save_model(output_path)
    print(f"\n[OK] Modelo guardado en: {output_path}")
    
    # Test prediction
    print("\n" + "="*60)
    print("PRUEBA DE PREDICCIÓN")
    print("="*60)
    
    # Test with sample symptoms
    test_cases = [
        ['tos', 'sibilancias', 'dificultad respiratoria', 'opresion pecho'],
        ['fiebre', 'tos', 'dificultad respiratoria', 'dolor toracico'],
        ['congestion nasal', 'estornudos', 'secrecion nasal', 'malestar general']
    ]
    
    for i, symptoms in enumerate(test_cases, 1):
        print(f"\nCaso de prueba {i}:")
        print(f"  Síntomas: {', '.join(symptoms)}")
        
        try:
            predictions = model.predict_all_tasks(symptoms)
            print(f"  Enfermedad: {predictions['disease']['name']} (confianza: {predictions['disease']['confidence']:.4f})")
            print(f"  Urgencia: {predictions['urgency']}")
            print(f"  Severidad: {predictions['severity']}")
            if 'category' in predictions:
                print(f"  Categoría: {predictions['category']}")
        except Exception as e:
            print(f"  Error en predicción: {e}")
    
    return model, results


def main():
    parser = argparse.ArgumentParser(
        description='Entrenar red neuronal multi-tarea para clasificación de enfermedades'
    )
    parser.add_argument(
        '--dataset', 
        type=str, 
        default=None,
        help='Ruta al dataset CSV (si no existe, se genera uno nuevo)'
    )
    parser.add_argument(
        '--output', 
        type=str, 
        default='models/',
        help='Directorio de salida para el modelo entrenado'
    )
    
    args = parser.parse_args()
    
    # Load or generate dataset
    df = load_or_generate_dataset(args.dataset)
    
    print(f"\nDataset cargado:")
    print(f"  - Total casos: {len(df)}")
    print(f"  - Enfermedades: {df['disease'].nunique()}")
    print(f"  - Columnas: {list(df.columns)}")
    
    # Train model
    model, results = train_neural_network(df, args.output)
    
    print("\n" + "="*60)
    print("[SUCCESS] ENTRENAMIENTO COMPLETADO")
    print("="*60)
    print(f"\nModelo guardado en: {args.output}/neural_network_model.pkl")
    print(f"\nResumen de rendimiento:")
    for task_name, result in results.items():
        print(f"  {task_name}: {result['accuracy']:.4f} accuracy")


if __name__ == "__main__":
    main()

