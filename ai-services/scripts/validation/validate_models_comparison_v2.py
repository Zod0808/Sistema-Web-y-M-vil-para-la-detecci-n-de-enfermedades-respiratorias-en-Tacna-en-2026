"""
Validación Comparativa de Modelos ML (v2)

Evalúa los 3 modelos usando Ensemble Predictor y modelos individuales
con el dataset completo de 307,295 casos.

Usage:
    python validate_models_comparison_v2.py [--dataset DATASET.csv] [--test-size N]
"""

import argparse
import sys
import os
from pathlib import Path
from datetime import datetime
import pandas as pd
import numpy as np

# Add paths
sys.path.insert(0, os.path.dirname(__file__))
ml_models_path = os.path.join(os.path.dirname(__file__), 'ml_models')
sys.path.insert(0, ml_models_path)

from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score
)


def evaluate_model_with_ensemble(df: pd.DataFrame, model_name: str, 
                                  model_config: dict, test_size: int = 5000) -> dict:
    """Evaluate a single model using ensemble predictor"""
    print("\n" + "-"*70)
    print(f"EVALUANDO {model_name.upper()}")
    print("-"*70)
    
    try:
        import importlib.util
        
        # Load ensemble predictor
        ensemble_path = os.path.join(ml_models_path, 'ensemble_predictor.py')
        spec = importlib.util.spec_from_file_location("ensemble_predictor", ensemble_path)
        ensemble_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ensemble_module)
        EnsemblePredictor = ensemble_module.EnsemblePredictor
        
        # Create predictor with specific model configuration
        predictor = EnsemblePredictor(
            use_xgboost=model_config.get('use_xgboost', False),
            use_random_forest=model_config.get('use_random_forest', False),
            use_neural_network=model_config.get('use_neural_network', False)
        )
        
        # Sample test data
        actual_test_size = min(test_size, len(df))
        test_df = df.sample(n=actual_test_size, random_state=42).copy()
        
        # Convert symptoms to list format
        if 'symptoms' in test_df.columns:
            test_df['symptoms_list'] = test_df['symptoms'].apply(
                lambda x: [s.strip() for s in str(x).split(',')] if isinstance(x, str) else x
            )
        
        correct = 0
        total = 0
        predictions = []
        true_labels = []
        errors = 0
        progress_step = max(1, actual_test_size // 10)
        
        print(f"Evaluando {actual_test_size} casos de prueba...")
        
        for idx, row in test_df.iterrows():
            try:
                symptoms_list = row.get('symptoms_list', 
                    [s.strip() for s in str(row['symptoms']).split(',')] 
                    if isinstance(row['symptoms'], str) else row['symptoms'])
                
                symptoms_str = ', '.join(symptoms_list) if isinstance(symptoms_list, list) else str(symptoms_list)
                true_disease = str(row['disease']).strip()
                
                # Get prediction
                result = predictor.predict(
                    symptoms=symptoms_list,
                    symptoms_text=symptoms_str,
                    patient_age=int(row.get('patient_age', 35)),
                    risk_factors=[],
                    ensemble_method='weighted_vote',
                    apply_personalization=False
                )
                
                pred_disease = result.get('disease', '').strip()
                
                if not pred_disease:
                    errors += 1
                    continue
                
                predictions.append(pred_disease)
                true_labels.append(true_disease)
                
                # Flexible matching
                pred_lower = pred_disease.lower().strip()
                true_lower = true_disease.lower().strip()
                
                if (pred_lower == true_lower or 
                    true_lower in pred_lower or 
                    pred_lower in true_lower or
                    pred_lower.replace(' ', '_') == true_lower.replace(' ', '_')):
                    correct += 1
                
                total += 1
                
                if total % progress_step == 0:
                    current_acc = correct / total if total > 0 else 0
                    print(f"  Progreso: {total}/{actual_test_size} | Accuracy actual: {current_acc:.4f}")
                    
            except Exception as e:
                errors += 1
                if errors <= 3:
                    print(f"  [ERROR] Caso {idx}: {str(e)[:100]}")
                continue
        
        if total == 0:
            print(f"  [ERROR] No se pudieron evaluar casos (errores: {errors})")
            return {
                'model': model_name,
                'status': 'error',
                'error': 'No se pudieron evaluar casos'
            }
        
        accuracy = correct / total
        
        # Calculate metrics
        if len(predictions) > 0:
            try:
                all_diseases = sorted(set(true_labels + predictions))
                precision = precision_score(
                    true_labels, predictions, 
                    average='weighted', 
                    zero_division=0,
                    labels=all_diseases
                )
                recall = recall_score(
                    true_labels, predictions,
                    average='weighted',
                    zero_division=0,
                    labels=all_diseases
                )
                f1 = f1_score(
                    true_labels, predictions,
                    average='weighted',
                    zero_division=0,
                    labels=all_diseases
                )
            except Exception as e:
                print(f"  [WARNING] Error calculando métricas: {e}")
                precision = recall = f1 = accuracy
        
        results = {
            'model': model_name,
            'accuracy': accuracy,
            'precision': precision if len(predictions) > 0 else 0,
            'recall': recall if len(predictions) > 0 else 0,
            'f1_score': f1 if len(predictions) > 0 else 0,
            'samples_tested': total,
            'correct': correct,
            'errors': errors,
            'status': 'completed'
        }
        
        print(f"\n  [RESULTADOS]")
        print(f"  Accuracy: {accuracy:.4f} ({correct}/{total})")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1-Score: {f1:.4f}")
        if errors > 0:
            print(f"  Errores: {errors}")
        
        return results
        
    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'model': model_name,
            'status': 'error',
            'error': str(e)
        }


def generate_comparison_table(results: list) -> tuple:
    """Generate comparison table and markdown"""
    table = "\n" + "="*90 + "\n"
    table += "TABLA COMPARATIVA DE MODELOS ML\n"
    table += "="*90 + "\n\n"
    
    # Header
    table += f"{'Modelo':<25} {'Accuracy':<12} {'Precision':<12} {'Recall':<12} {'F1-Score':<12} {'Muestras':<12} {'Errores':<10}\n"
    table += "-"*90 + "\n"
    
    # Rows
    for result in results:
        if result.get('status') == 'completed':
            model = result['model']
            acc = result['accuracy']
            prec = result['precision']
            rec = result['recall']
            f1 = result['f1_score']
            samples = result['samples_tested']
            errors = result.get('errors', 0)
            
            table += f"{model:<25} {acc:<12.4f} {prec:<12.4f} {rec:<12.4f} {f1:<12.4f} {samples:<12} {errors:<10}\n"
        else:
            error_msg = result.get('error', 'Unknown error')[:30]
            table += f"{result['model']:<25} {'ERROR':<12} {'-':<12} {'-':<12} {'-':<12} {'-':<12} {error_msg:<10}\n"
    
    table += "-"*90 + "\n"
    
    # Best model analysis
    completed = [r for r in results if r.get('status') == 'completed']
    if completed:
        best_acc = max(completed, key=lambda x: x['accuracy'])
        best_f1 = max(completed, key=lambda x: x['f1_score'])
        
        table += f"\nMejor modelo por Accuracy: {best_acc['model']} ({best_acc['accuracy']:.4f})\n"
        table += f"Mejor modelo por F1-Score: {best_f1['model']} ({best_f1['f1_score']:.4f})\n"
        
        # Average metrics
        avg_acc = sum(r['accuracy'] for r in completed) / len(completed)
        avg_f1 = sum(r['f1_score'] for r in completed) / len(completed)
        table += f"\nPromedio Accuracy: {avg_acc:.4f}\n"
        table += f"Promedio F1-Score: {avg_f1:.4f}\n"
    
    # Markdown table
    md_table = "\n## Tabla Comparativa de Modelos\n\n"
    md_table += "| Modelo | Accuracy | Precision | Recall | F1-Score | Muestras | Errores |\n"
    md_table += "|--------|----------|-----------|--------|----------|----------|----------|\n"
    
    for result in results:
        if result.get('status') == 'completed':
            md_table += f"| {result['model']} | {result['accuracy']:.4f} | "
            md_table += f"{result['precision']:.4f} | {result['recall']:.4f} | "
            md_table += f"{result['f1_score']:.4f} | {result['samples_tested']} | "
            md_table += f"{result.get('errors', 0)} |\n"
        else:
            md_table += f"| {result['model']} | ERROR | - | - | - | - | - |\n"
    
    return table, md_table


def main():
    parser = argparse.ArgumentParser(description='Validar y comparar modelos ML')
    parser.add_argument('--dataset', type=str, 
                       default='augmented_dataset_full_20251103_124126.csv',
                       help='Dataset para validacion')
    parser.add_argument('--test-size', type=int, default=5000,
                       help='Tamaño de conjunto de prueba (default: 5000)')
    
    args = parser.parse_args()
    
    print("="*90)
    print("VALIDACION COMPARATIVA DE MODELOS ML - v2")
    print("="*90)
    print(f"\nDataset: {args.dataset}")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Tamaño de prueba: {args.test_size} casos")
    
    # Load dataset
    print("\n" + "="*90)
    print("CARGANDO DATASET")
    print("="*90)
    
    if not os.path.exists(args.dataset):
        print(f"\n[ERROR] Dataset no encontrado: {args.dataset}")
        return 1
    
    print(f"\nCargando dataset desde: {args.dataset}")
    df = pd.read_csv(args.dataset, low_memory=False)
    
    print(f"\n[OK] Dataset cargado:")
    print(f"  - Total casos: {len(df):,}")
    print(f"  - Enfermedades únicas: {df['disease'].nunique()}")
    print(f"  - Columnas: {len(df.columns)}")
    print(f"\n  Distribución de enfermedades (top 10):")
    disease_counts = df['disease'].value_counts().head(10)
    for disease, count in disease_counts.items():
        print(f"    {disease}: {count:,} ({count/len(df)*100:.1f}%)")
    
    # Evaluate models
    print("\n" + "="*90)
    print("EVALUACION DE MODELOS")
    print("="*90)
    
    results = []
    
    # Model configurations
    model_configs = [
        {'name': 'XGBoost', 'config': {'use_xgboost': True, 'use_random_forest': False, 'use_neural_network': False}},
        {'name': 'Random Forest', 'config': {'use_xgboost': False, 'use_random_forest': True, 'use_neural_network': False}},
        {'name': 'Neural Network', 'config': {'use_xgboost': False, 'use_random_forest': False, 'use_neural_network': True}},
    ]
    
    for model_info in model_configs:
        result = evaluate_model_with_ensemble(
            df, 
            model_info['name'],
            model_info['config'],
            test_size=args.test_size
        )
        results.append(result)
    
    # Generate comparison table
    print("\n" + "="*90)
    print("TABLA COMPARATIVA")
    print("="*90)
    
    table, md_table = generate_comparison_table(results)
    print(table)
    
    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_file = f"model_comparison_{timestamp}.txt"
    
    with open(results_file, 'w', encoding='utf-8') as f:
        f.write("VALIDACION COMPARATIVA DE MODELOS ML\n")
        f.write(f"Dataset: {args.dataset}\n")
        f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total casos en dataset: {len(df):,}\n")
        f.write(f"Casos evaluados: {args.test_size}\n")
        f.write(f"Enfermedades únicas: {df['disease'].nunique()}\n\n")
        f.write(table)
        
        # Add detailed results
        f.write("\n\nRESULTADOS DETALLADOS:\n")
        f.write("="*90 + "\n")
        for result in results:
            f.write(f"\n{result['model']}:\n")
            if result.get('status') == 'completed':
                f.write(f"  Accuracy: {result['accuracy']:.4f}\n")
                f.write(f"  Precision: {result['precision']:.4f}\n")
                f.write(f"  Recall: {result['recall']:.4f}\n")
                f.write(f"  F1-Score: {result['f1_score']:.4f}\n")
                f.write(f"  Correctas: {result['correct']}/{result['samples_tested']}\n")
                f.write(f"  Errores: {result.get('errors', 0)}\n")
            else:
                f.write(f"  Error: {result.get('error', 'Unknown error')}\n")
    
    print(f"\n[OK] Resultados guardados en: {results_file}")
    
    # Print and save markdown table
    print("\n" + "="*90)
    print("TABLA MARKDOWN")
    print("="*90)
    print(md_table)
    
    md_file = f"model_comparison_{timestamp}.md"
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write("# Comparativa de Modelos ML\n\n")
        f.write(f"**Dataset**: {args.dataset}\n")
        f.write(f"**Total casos**: {len(df):,}\n")
        f.write(f"**Casos evaluados**: {args.test_size}\n")
        f.write(f"**Enfermedades únicas**: {df['disease'].nunique()}\n")
        f.write(f"**Fecha**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(md_table)
        
        # Add summary
        completed = [r for r in results if r.get('status') == 'completed']
        if completed:
            f.write("\n## Resumen\n\n")
            best_acc = max(completed, key=lambda x: x['accuracy'])
            f.write(f"- **Mejor Accuracy**: {best_acc['model']} ({best_acc['accuracy']:.4f})\n")
            
            best_f1 = max(completed, key=lambda x: x['f1_score'])
            f.write(f"- **Mejor F1-Score**: {best_f1['model']} ({best_f1['f1_score']:.4f})\n")
            
            avg_acc = sum(r['accuracy'] for r in completed) / len(completed)
            avg_f1 = sum(r['f1_score'] for r in completed) / len(completed)
            f.write(f"- **Accuracy promedio**: {avg_acc:.4f}\n")
            f.write(f"- **F1-Score promedio**: {avg_f1:.4f}\n")
    
    print(f"\n[OK] Tabla markdown guardada en: {md_file}")
    
    return 0


if __name__ == "__main__":
    exit(main())

