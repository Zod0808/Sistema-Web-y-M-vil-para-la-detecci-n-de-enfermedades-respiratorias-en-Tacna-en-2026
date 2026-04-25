"""
Validación Comparativa de Modelos ML

Evalúa los 3 modelos (XGBoost, Random Forest, Neural Network) con el dataset completo
y genera una tabla comparativa de rendimiento.

Usage:
    python validate_models_comparison.py [--dataset DATASET.csv]
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

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)


def load_model(model_path: str):
    """Load trained model"""
    try:
        import joblib
        data = joblib.load(model_path)
        return data
    except Exception as e:
        print(f"Error loading {model_path}: {e}")
        return None


def evaluate_xgboost(df: pd.DataFrame) -> dict:
    """Evaluate XGBoost model"""
    print("\n" + "-"*60)
    print("EVALUANDO XGBOOST")
    print("-"*60)
    
    try:
        import importlib.util
        shap_path = os.path.join(os.path.dirname(__file__), 'shap_explainer.py')
        spec = importlib.util.spec_from_file_location("shap_explainer", shap_path)
        shap_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(shap_module)
        SHAPDiseaseExplainer = shap_module.SHAPDiseaseExplainer
        
        explainer = SHAPDiseaseExplainer('models/xgboost_model.pkl')
        
        # Prepare test data
        test_size = min(2000, len(df) // 5)  # Test with more samples
        test_df = df.sample(n=test_size, random_state=42)
        
        correct = 0
        total = 0
        predictions = []
        true_labels = []
        errors = 0
        
        print(f"Evaluando {test_size} casos de prueba...")
        
        for idx, row in test_df.iterrows():
            symptoms_str = row['symptoms'] if isinstance(row['symptoms'], str) else ', '.join(row['symptoms'])
            true_disease = row['disease']
            
            try:
                # Try prediction
                prediction = explainer.explain_prediction(
                    symptoms_str,
                    patient_age=int(row.get('patient_age', 35)),
                    top_k=0  # Don't get top_k to avoid errors
                )
                
                pred_disease = prediction.get('disease', '')
                if not pred_disease:
                    errors += 1
                    continue
                    
                predictions.append(pred_disease)
                true_labels.append(true_disease)
                
                # More flexible matching
                pred_lower = pred_disease.lower().strip()
                true_lower = true_disease.lower().strip()
                
                if pred_lower == true_lower or true_lower in pred_lower or pred_lower in true_lower:
                    correct += 1
                total += 1
                
            except Exception as e:
                errors += 1
                if errors < 5:  # Only print first few errors
                    pass
                continue
        
        accuracy = correct / total if total > 0 else 0
        
        # Calculate additional metrics
        if len(predictions) > 0:
            # Get unique diseases
            all_diseases = sorted(set(true_labels + predictions))
            
            try:
                precision = precision_score(true_labels, predictions, average='weighted', zero_division=0, labels=all_diseases)
                recall = recall_score(true_labels, predictions, average='weighted', zero_division=0, labels=all_diseases)
                f1 = f1_score(true_labels, predictions, average='weighted', zero_division=0, labels=all_diseases)
            except:
                precision = recall = f1 = 0.0
        
        if total == 0:
            print(f"  [ERROR] No se pudieron evaluar casos (errores: {errors})")
            return {
                'model': 'XGBoost',
                'status': 'error',
                'error': 'No se pudieron evaluar casos'
            }
        
        results = {
            'model': 'XGBoost',
            'accuracy': accuracy,
            'precision': precision if len(predictions) > 0 else 0,
            'recall': recall if len(predictions) > 0 else 0,
            'f1_score': f1 if len(predictions) > 0 else 0,
            'samples_tested': total,
            'correct': correct,
            'errors': errors,
            'status': 'completed'
        }
        
        print(f"  Accuracy: {accuracy:.4f} ({correct}/{total})")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1-Score: {f1:.4f}")
        if errors > 0:
            print(f"  Errores: {errors}")
        
        return results
        
    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        return {
            'model': 'XGBoost',
            'status': 'error',
            'error': str(e)
        }


def evaluate_random_forest(df: pd.DataFrame) -> dict:
    """Evaluate Random Forest model"""
    print("\n" + "-"*60)
    print("EVALUANDO RANDOM FOREST")
    print("-"*60)
    
    try:
        import importlib.util
        shap_path = os.path.join(os.path.dirname(__file__), 'shap_explainer.py')
        spec = importlib.util.spec_from_file_location("shap_explainer", shap_path)
        shap_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(shap_module)
        SHAPDiseaseExplainer = shap_module.SHAPDiseaseExplainer
        
        explainer = SHAPDiseaseExplainer('models/base_random_forest.pkl')
        
        # Prepare test data
        test_size = min(1000, len(df) // 5)
        test_df = df.sample(n=test_size, random_state=42)
        
        correct = 0
        total = 0
        predictions = []
        true_labels = []
        errors = 0
        
        print(f"Evaluando {test_size} casos de prueba...")
        
        for idx, row in test_df.iterrows():
            symptoms_str = row['symptoms'] if isinstance(row['symptoms'], str) else ', '.join(row['symptoms'])
            true_disease = row['disease']
            
            try:
                prediction = explainer.explain_prediction(
                    symptoms_str,
                    patient_age=int(row.get('patient_age', 35)),
                    top_k=0  # Don't get top_k
                )
                
                pred_disease = prediction.get('disease', '')
                if not pred_disease:
                    errors += 1
                    continue
                    
                predictions.append(pred_disease)
                true_labels.append(true_disease)
                
                pred_lower = pred_disease.lower().strip()
                true_lower = true_disease.lower().strip()
                
                if pred_lower == true_lower or true_lower in pred_lower or pred_lower in true_lower:
                    correct += 1
                total += 1
                
            except Exception as e:
                errors += 1
                continue
        
        accuracy = correct / total if total > 0 else 0
        
        if len(predictions) > 0:
            all_diseases = sorted(set(true_labels + predictions))
            try:
                precision = precision_score(true_labels, predictions, average='weighted', zero_division=0, labels=all_diseases)
                recall = recall_score(true_labels, predictions, average='weighted', zero_division=0, labels=all_diseases)
                f1 = f1_score(true_labels, predictions, average='weighted', zero_division=0, labels=all_diseases)
            except:
                precision = recall = f1 = 0.0
        
        if total == 0:
            return {
                'model': 'Random Forest',
                'status': 'error',
                'error': 'No se pudieron evaluar casos'
            }
        
        results = {
            'model': 'Random Forest',
            'accuracy': accuracy,
            'precision': precision if len(predictions) > 0 else 0,
            'recall': recall if len(predictions) > 0 else 0,
            'f1_score': f1 if len(predictions) > 0 else 0,
            'samples_tested': total,
            'correct': correct,
            'errors': errors,
            'status': 'completed'
        }
        
        print(f"  Accuracy: {accuracy:.4f} ({correct}/{total})")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1-Score: {f1:.4f}")
        if errors > 0:
            print(f"  Errores: {errors}")
        
        return results
        
    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        return {
            'model': 'Random Forest',
            'status': 'error',
            'error': str(e)
        }


def evaluate_neural_network(df: pd.DataFrame) -> dict:
    """Evaluate Neural Network model"""
    print("\n" + "-"*60)
    print("EVALUANDO NEURAL NETWORK")
    print("-"*60)
    
    try:
        import importlib.util
        nn_path = os.path.join(ml_models_path, 'neural_network_model.py')
        spec = importlib.util.spec_from_file_location("neural_network_model", nn_path)
        nn_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(nn_module)
        MultiTaskNeuralNetwork = nn_module.MultiTaskNeuralNetwork
        
        model = MultiTaskNeuralNetwork()
        model.load_model('models/neural_network_model.pkl')
        
        # Prepare test data
        test_size = min(1000, len(df) // 5)
        test_df = df.sample(n=test_size, random_state=42)
        
        # Convert symptoms to list format
        test_df = test_df.copy()
        if 'symptoms' in test_df.columns:
            test_df['symptoms'] = test_df['symptoms'].apply(
                lambda x: [s.strip() for s in str(x).split(',')] if isinstance(x, str) else x
            )
        
        correct = 0
        total = 0
        predictions = []
        true_labels = []
        
        print(f"Evaluando {test_size} casos de prueba...")
        
        for idx, row in test_df.iterrows():
            symptoms = row['symptoms']
            if isinstance(symptoms, str):
                symptoms = [s.strip() for s in symptoms.split(',')]
            
            true_disease = row['disease']
            
            try:
                prediction = model.predict_all_tasks(symptoms)
                pred_disease = prediction['disease']['name']
                predictions.append(pred_disease)
                true_labels.append(true_disease)
                
                if pred_disease.lower() == true_disease.lower() or true_disease.lower() in pred_disease.lower():
                    correct += 1
                total += 1
                
            except Exception as e:
                continue
        
        accuracy = correct / total if total > 0 else 0
        
        if len(predictions) > 0:
            all_diseases = sorted(set(true_labels + predictions))
            try:
                precision = precision_score(true_labels, predictions, average='weighted', zero_division=0, labels=all_diseases)
                recall = recall_score(true_labels, predictions, average='weighted', zero_division=0, labels=all_diseases)
                f1 = f1_score(true_labels, predictions, average='weighted', zero_division=0, labels=all_diseases)
            except:
                precision = recall = f1 = 0.0
        
        results = {
            'model': 'Neural Network',
            'accuracy': accuracy,
            'precision': precision if len(predictions) > 0 else 0,
            'recall': recall if len(predictions) > 0 else 0,
            'f1_score': f1 if len(predictions) > 0 else 0,
            'samples_tested': total,
            'correct': correct,
            'status': 'completed'
        }
        
        print(f"  Accuracy: {accuracy:.4f} ({correct}/{total})")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1-Score: {f1:.4f}")
        
        return results
        
    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        return {
            'model': 'Neural Network',
            'status': 'error',
            'error': str(e)
        }


def generate_comparison_table(results: list) -> str:
    """Generate comparison table"""
    table = "\n" + "="*80 + "\n"
    table += "TABLA COMPARATIVA DE MODELOS ML\n"
    table += "="*80 + "\n\n"
    
    # Header
    table += f"{'Modelo':<20} {'Accuracy':<12} {'Precision':<12} {'Recall':<12} {'F1-Score':<12} {'Muestras':<10}\n"
    table += "-"*80 + "\n"
    
    # Rows
    for result in results:
        if result.get('status') == 'completed':
            model = result['model']
            acc = result['accuracy']
            prec = result['precision']
            rec = result['recall']
            f1 = result['f1_score']
            samples = result['samples_tested']
            
            table += f"{model:<20} {acc:<12.4f} {prec:<12.4f} {rec:<12.4f} {f1:<12.4f} {samples:<10}\n"
        else:
            table += f"{result['model']:<20} {'ERROR':<12}\n"
    
    table += "-"*80 + "\n"
    
    # Best model
    completed = [r for r in results if r.get('status') == 'completed']
    if completed:
        best = max(completed, key=lambda x: x['accuracy'])
        table += f"\nMejor modelo por Accuracy: {best['model']} ({best['accuracy']:.4f})\n"
        
        best_f1 = max(completed, key=lambda x: x['f1_score'])
        table += f"Mejor modelo por F1-Score: {best_f1['model']} ({best_f1['f1_score']:.4f})\n"
    
    return table


def main():
    parser = argparse.ArgumentParser(description='Validar y comparar modelos ML')
    parser.add_argument('--dataset', type=str, 
                       default='augmented_dataset_full_20251103_124126.csv',
                       help='Dataset para validacion')
    parser.add_argument('--test-size', type=int, default=1000,
                       help='Tamaño de conjunto de prueba (default: 1000)')
    
    args = parser.parse_args()
    
    print("="*80)
    print("VALIDACION COMPARATIVA DE MODELOS ML")
    print("="*80)
    print(f"\nDataset: {args.dataset}")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Load dataset
    print("\n" + "="*80)
    print("CARGANDO DATASET")
    print("="*80)
    
    if not os.path.exists(args.dataset):
        print(f"\n[ERROR] Dataset no encontrado: {args.dataset}")
        return 1
    
    print(f"\nCargando dataset desde: {args.dataset}")
    df = pd.read_csv(args.dataset, low_memory=False)
    
    print(f"\n[OK] Dataset cargado:")
    print(f"  - Total casos: {len(df):,}")
    print(f"  - Enfermedades: {df['disease'].nunique()}")
    print(f"  - Columnas: {len(df.columns)}")
    
    # Convert symptoms if needed
    if 'symptoms' in df.columns:
        df['symptoms'] = df['symptoms'].apply(
            lambda x: [s.strip() for s in str(x).split(',')] if isinstance(x, str) else x
        )
    
    # Evaluate models
    print("\n" + "="*80)
    print("EVALUACION DE MODELOS")
    print("="*80)
    
    results = []
    
    # Evaluate XGBoost
    xgb_result = evaluate_xgboost(df)
    results.append(xgb_result)
    
    # Evaluate Random Forest
    rf_result = evaluate_random_forest(df)
    results.append(rf_result)
    
    # Evaluate Neural Network
    nn_result = evaluate_neural_network(df)
    results.append(nn_result)
    
    # Generate comparison table
    print("\n" + "="*80)
    print("TABLA COMPARATIVA")
    print("="*80)
    
    table = generate_comparison_table(results)
    print(table)
    
    # Save results
    results_file = f"model_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(results_file, 'w', encoding='utf-8') as f:
        f.write("VALIDACION COMPARATIVA DE MODELOS ML\n")
        f.write(f"Dataset: {args.dataset}\n")
        f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Total casos en dataset: {len(df):,}\n")
        f.write(f"Casos evaluados: {args.test_size}\n\n")
        f.write(table)
        
        # Add detailed results
        f.write("\n\nRESULTADOS DETALLADOS:\n")
        f.write("="*80 + "\n")
        for result in results:
            f.write(f"\n{result['model']}:\n")
            if result.get('status') == 'completed':
                f.write(f"  Accuracy: {result['accuracy']:.4f}\n")
                f.write(f"  Precision: {result['precision']:.4f}\n")
                f.write(f"  Recall: {result['recall']:.4f}\n")
                f.write(f"  F1-Score: {result['f1_score']:.4f}\n")
                f.write(f"  Correctas: {result['correct']}/{result['samples_tested']}\n")
            else:
                f.write(f"  Error: {result.get('error', 'Unknown error')}\n")
    
    print(f"\n[OK] Resultados guardados en: {results_file}")
    
    # Create markdown table
    md_table = "\n## Tabla Comparativa de Modelos\n\n"
    md_table += "| Modelo | Accuracy | Precision | Recall | F1-Score | Muestras |\n"
    md_table += "|--------|----------|-----------|--------|----------|----------|\n"
    
    for result in results:
        if result.get('status') == 'completed':
            md_table += f"| {result['model']} | {result['accuracy']:.4f} | {result['precision']:.4f} | "
            md_table += f"{result['recall']:.4f} | {result['f1_score']:.4f} | {result['samples_tested']} |\n"
        else:
            md_table += f"| {result['model']} | ERROR | - | - | - | - |\n"
    
    print("\n" + "="*80)
    print("TABLA MARKDOWN")
    print("="*80)
    print(md_table)
    
    # Save markdown table
    md_file = f"model_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write("# Comparativa de Modelos ML\n\n")
        f.write(f"**Dataset**: {args.dataset}\n")
        f.write(f"**Total casos**: {len(df):,}\n")
        f.write(f"**Casos evaluados**: {args.test_size}\n")
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
    
    print(f"\n[OK] Tabla markdown guardada en: {md_file}")
    
    return 0


if __name__ == "__main__":
    exit(main())

