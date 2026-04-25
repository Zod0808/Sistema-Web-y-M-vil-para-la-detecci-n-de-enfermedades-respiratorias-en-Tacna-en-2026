"""
Script de Validación Comparativa de Modelos ML

Evalúa el rendimiento de los 3 modelos (Random Forest, XGBoost, Neural Network)
usando el dataset completo de 307,295 casos y genera una tabla comparativa completa.

Usage:
    python validate_models_performance.py [--dataset DATASET.csv]
"""

import argparse
import sys
import os
from pathlib import Path
from datetime import datetime
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)

# Add paths
sys.path.insert(0, os.path.dirname(__file__))
ml_models_path = os.path.join(os.path.dirname(__file__), 'ml_models')
sys.path.insert(0, ml_models_path)

# Import models directly
import importlib.util

def load_model_wrapper(module_name, file_path, class_name=None):
    """Load module and return specified class or module"""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if class_name:
        return getattr(module, class_name)
    return module


class ModelValidator:
    """Validate and compare ML models"""
    
    def __init__(self, dataset_path: str):
        """Initialize validator with dataset"""
        self.dataset_path = dataset_path
        self.df = None
        self.results = {}
        
    def load_dataset(self):
        """Load and prepare dataset"""
        print(f"Cargando dataset: {self.dataset_path}")
        self.df = pd.read_csv(self.dataset_path, low_memory=False)
        
        # Clean data
        print("  Limpiando datos...")
        original_size = len(self.df)
        
        # Remove rows with NaN symptoms or diseases
        self.df = self.df.dropna(subset=['symptoms', 'disease'])
        
        # Clean symptoms - ensure they are strings
        self.df['symptoms'] = self.df['symptoms'].astype(str)
        
        # Remove rows with empty symptoms
        self.df = self.df[self.df['symptoms'].str.strip() != '']
        self.df = self.df[self.df['symptoms'] != 'nan']
        
        # Clean diseases - remove encoding issues
        self.df['disease'] = self.df['disease'].astype(str)
        
        cleaned_size = len(self.df)
        print(f"  Datos limpiados: {original_size:,} -> {cleaned_size:,} casos ({original_size - cleaned_size:,} eliminados)")
        print(f"  Enfermedades unicas: {self.df['disease'].nunique()}")
        
        return self.df
    
    def evaluate_random_forest(self, X_test, y_test):
        """Evaluate Random Forest model"""
        try:
            model_path = 'models/base_random_forest.pkl'
            if not os.path.exists(model_path):
                return {'error': 'Model file not found'}
            
            print("  Evaluando modelo...")
            data = joblib.load(model_path)
            model = data['model']
            label_encoder = data['label_encoder']
            
            # Ensure X_test is dense if needed
            if hasattr(X_test, 'toarray'):
                X_test = X_test.toarray()
            
            # Predict
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            
            # Get top 3 diseases by F1-score
            report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
            disease_scores = [
                (name, metrics.get('f1-score', 0))
                for name, metrics in report.items()
                if name not in ['accuracy', 'macro avg', 'weighted avg'] and isinstance(metrics, dict)
            ]
            disease_scores.sort(key=lambda x: x[1], reverse=True)
            
            return {
                'model': 'Random Forest',
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'top_3_diseases': disease_scores[:3],
                'total_classes': len(np.unique(y_test))
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def evaluate_xgboost(self, X_test, y_test):
        """Evaluate XGBoost model"""
        try:
            model_path = 'models/xgboost_model.pkl'
            if not os.path.exists(model_path):
                return {'error': 'Model file not found'}
            
            print("  Evaluando modelo...")
            data = joblib.load(model_path)
            model = data['model']
            label_encoder = data['label_encoder']
            
            # Ensure X_test is numpy array
            if hasattr(X_test, 'toarray'):
                X_test = X_test.toarray()
            X_test = np.asarray(X_test)
            
            # Predict
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
            recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
            f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
            
            # Get top 3 diseases
            report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
            disease_scores = [
                (name, metrics.get('f1-score', 0))
                for name, metrics in report.items()
                if name not in ['accuracy', 'macro avg', 'weighted avg'] and isinstance(metrics, dict)
            ]
            disease_scores.sort(key=lambda x: x[1], reverse=True)
            
            return {
                'model': 'XGBoost',
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'top_3_diseases': disease_scores[:3],
                'total_classes': len(np.unique(y_test))
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def evaluate_neural_network(self, X_test, y_test):
        """Evaluate Neural Network model"""
        try:
            model_path = 'models/neural_network_model.pkl'
            if not os.path.exists(model_path):
                return {'error': 'Model file not found'}
            
            print("  Evaluando modelo...")
            
            # Load neural network
            neural_network_module = load_model_wrapper(
                "neural_network_model",
                os.path.join(ml_models_path, "neural_network_model.py"),
                "MultiTaskNeuralNetwork"
            )
            
            nn_model = neural_network_module()
            nn_model.load_model(model_path)
            
            # Use disease task model
            if hasattr(nn_model, 'models') and 'disease' in nn_model.models:
                disease_model = nn_model.models['disease']
                
                # Ensure X_test is properly formatted
                if hasattr(X_test, 'toarray'):
                    X_test = X_test.toarray()
                X_test = np.asarray(X_test)
                
                # Predict
                y_pred = disease_model.predict(X_test)
                
                # Calculate metrics
                accuracy = accuracy_score(y_test, y_pred)
                precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
                recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
                f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)
                
                # Get top 3 diseases
                report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
                disease_scores = [
                    (name, metrics.get('f1-score', 0))
                    for name, metrics in report.items()
                    if name not in ['accuracy', 'macro avg', 'weighted avg'] and isinstance(metrics, dict)
                ]
                disease_scores.sort(key=lambda x: x[1], reverse=True)
                
                return {
                    'model': 'Neural Network',
                    'accuracy': accuracy,
                    'precision': precision,
                    'recall': recall,
                    'f1_score': f1,
                    'top_3_diseases': disease_scores[:3],
                    'total_classes': len(np.unique(y_test)),
                    'multi_task': True
                }
            else:
                return {'error': 'Neural network disease model not found'}
                
        except Exception as e:
            return {'error': str(e)}
    
    def prepare_data_for_models(self):
        """Prepare data in format needed for each model"""
        from sklearn.preprocessing import LabelEncoder
        
        # Encode diseases (common for all models)
        label_encoder = LabelEncoder()
        y = label_encoder.fit_transform(self.df['disease'])
        
        return y, label_encoder
    
    def prepare_data_for_rf(self):
        """Prepare data for Random Forest using its vectorizer"""
        try:
            model_path = 'models/base_random_forest.pkl'
            data = joblib.load(model_path)
            vectorizer = data['vectorizer']
            label_encoder = data['label_encoder']
            
            # Filter diseases that exist in the model
            known_diseases = set(label_encoder.classes_)
            df_filtered = self.df[self.df['disease'].isin(known_diseases)].copy()
            
            if len(df_filtered) == 0:
                raise ValueError("No matching diseases found after filtering")
            
            print(f"  Casos despues de filtrar enfermedades conocidas: {len(df_filtered):,}/{len(self.df):,}")
            
            # Vectorize symptoms using model's vectorizer
            X = vectorizer.transform(df_filtered['symptoms'].astype(str))
            y = label_encoder.transform(df_filtered['disease'])
            
            return X, y
        except Exception as e:
            raise ValueError(f"Error preparing RF data: {e}")
    
    def prepare_data_for_xgb(self):
        """Prepare data for XGBoost using its vectorizer and feature engineering"""
        try:
            model_path = 'models/xgboost_model.pkl'
            data = joblib.load(model_path)
            vectorizer = data['vectorizer']
            label_encoder = data['label_encoder']
            feature_engineer = data.get('feature_engineer')
            
            # If feature_engineer not saved, create one
            if feature_engineer is None:
                print("  Feature engineer no encontrado en modelo, creando uno nuevo...")
                from train_xgboost_model import AdvancedFeatureEngineering
                feature_engineer = AdvancedFeatureEngineering()
            
            # Filter diseases that exist in the model
            known_diseases = set(label_encoder.classes_)
            df_filtered = self.df[self.df['disease'].isin(known_diseases)].copy()
            
            if len(df_filtered) == 0:
                raise ValueError("No matching diseases found after filtering")
            
            print(f"  Casos despues de filtrar enfermedades conocidas: {len(df_filtered):,}/{len(self.df):,}")
            
            # Vectorize symptoms
            X_symptom = vectorizer.transform(df_filtered['symptoms'].astype(str))
            
            # Add feature engineering if available
            print(f"  Feature engineer disponible: {feature_engineer is not None}")
            if feature_engineer:
                print("  Aplicando ingenieria de features...")
                # Create engineered features
                engineered_features = []
                for idx, row in df_filtered.iterrows():
                    symptoms_str = str(row['symptoms']) if isinstance(row['symptoms'], str) else ', '.join([str(s) for s in row['symptoms']])
                    age = row.get('patient_age', 35)
                    if pd.isna(age) or age == '':
                        age = 35
                    try:
                        eng_features = feature_engineer.create_features(symptoms_str, int(float(age)))
                        # Ensure it's a 1D array
                        if isinstance(eng_features, (list, tuple)):
                            eng_features = np.array(eng_features)
                        if eng_features.ndim > 1:
                            eng_features = eng_features.flatten()
                        engineered_features.append(eng_features)
                    except Exception as e:
                        # Fallback: create zeros array with expected size
                        expected_size = 15  # Default size for advanced features
                        engineered_features.append(np.zeros(expected_size))
                
                X_engineered = np.array(engineered_features)
                # Combine features
                X_symptom_dense = X_symptom.toarray()
                
                # Ensure correct dimensions
                expected_engineered = 15
                if X_engineered.shape[1] != expected_engineered:
                    # Pad or truncate if needed
                    if X_engineered.shape[1] < expected_engineered:
                        padding = np.zeros((X_engineered.shape[0], expected_engineered - X_engineered.shape[1]))
                        X_engineered = np.hstack([X_engineered, padding])
                    elif X_engineered.shape[1] > expected_engineered:
                        X_engineered = X_engineered[:, :expected_engineered]
                
                X = np.hstack([X_symptom_dense, X_engineered])
                print(f"  Features combinadas: {X_symptom_dense.shape[1]} (sintomas) + {X_engineered.shape[1]} (ingenieria) = {X.shape[1]} total (esperado: {data['model'].n_features_in_})")
            else:
                X = X_symptom.toarray()
            
            y = label_encoder.transform(df_filtered['disease'])
            
            return X, y
        except Exception as e:
            raise ValueError(f"Error preparing XGBoost data: {e}")
    
    def prepare_data_for_nn(self):
        """Prepare data for Neural Network"""
        try:
            model_path = 'models/neural_network_model.pkl'
            model_data = joblib.load(model_path)
            
            # Load NN model to get label encoder
            neural_network_module = load_model_wrapper(
                "neural_network_model",
                os.path.join(ml_models_path, "neural_network_model.py"),
                "MultiTaskNeuralNetwork"
            )
            
            nn_model = neural_network_module()
            nn_model.load_model(model_path)
            
            # Get known diseases from model
            known_diseases = set(nn_model.label_encoders['disease'].classes_)
            df_filtered = self.df[self.df['disease'].isin(known_diseases)].copy()
            
            if len(df_filtered) == 0:
                raise ValueError("No matching diseases found after filtering")
            
            print(f"  Casos despues de filtrar enfermedades conocidas: {len(df_filtered):,}/{len(self.df):,}")
            
            # NN uses different format - symptoms as lists
            symptoms_lists = []
            for idx, row in df_filtered.iterrows():
                symptoms_str = row['symptoms']
                # Clean and convert to list
                if pd.isna(symptoms_str):
                    symptoms_list = []
                elif isinstance(symptoms_str, str):
                    symptoms_list = [s.strip().lower() for s in symptoms_str.split(',') if s.strip()]
                elif isinstance(symptoms_str, list):
                    symptoms_list = [str(s).strip().lower() for s in symptoms_str if s]
                else:
                    symptoms_list = [str(symptoms_str).strip().lower()]
                
                # Filter out empty strings
                symptoms_list = [s for s in symptoms_list if s and s != 'nan']
                symptoms_lists.append(symptoms_list)
            
            # Ensure we have required columns
            df_prepared = df_filtered.copy()
            df_prepared['symptoms'] = symptoms_lists
            
            # Add missing columns with defaults and clean values
            if 'urgency' not in df_prepared.columns:
                df_prepared['urgency'] = 'medium'
            else:
                # Clean urgency - convert to string and handle NaN
                df_prepared['urgency'] = df_prepared['urgency'].apply(
                    lambda x: str(x).lower() if pd.notna(x) and str(x).lower() in ['low', 'medium', 'high', 'critical'] else 'medium'
                )
            
            if 'severity' not in df_prepared.columns:
                df_prepared['severity'] = 'moderate'
            else:
                # Clean severity - convert to string and handle NaN
                df_prepared['severity'] = df_prepared['severity'].apply(
                    lambda x: str(x).lower() if pd.notna(x) and str(x).lower() in ['mild', 'moderate', 'severe'] else 'moderate'
                )
            
            # Use NN's prepare method
            tasks_data = nn_model.prepare_multi_task_data(df_prepared)
            
            X, y = tasks_data['disease']  # Get disease task data
            
            return X, y
        except Exception as e:
            raise ValueError(f"Error preparing NN data: {e}")
    
    def validate_all_models(self):
        """Validate all models and generate comparison"""
        print("="*70)
        print("VALIDACION COMPARATIVA DE MODELOS ML")
        print("="*70)
        print(f"\nDataset: {self.dataset_path}")
        print(f"Total casos: {len(self.df):,}")
        print(f"Enfermedades: {self.df['disease'].nunique()}")
        
        # Evaluate each model with its own data preparation
        results = {}
        
        print("\n" + "="*70)
        print("PREPARACION Y EVALUACION DE MODELOS")
        print("="*70)
        
        # Random Forest
        print("\n1. RANDOM FOREST")
        print("-" * 70)
        try:
            X_rf, y_rf = self.prepare_data_for_rf()
            print(f"  Datos preparados: {X_rf.shape[0]:,} casos, {X_rf.shape[1]} features")
            
            X_train_rf, X_test_rf, y_train_rf, y_test_rf = train_test_split(
                X_rf, y_rf, test_size=0.2, random_state=42
            )
            print(f"  Test set: {X_test_rf.shape[0]:,} casos")
            
            rf_result = self.evaluate_random_forest(X_test_rf, y_test_rf)
            if 'error' not in rf_result:
                results['random_forest'] = rf_result
                print(f"  [OK] Random Forest: Accuracy = {rf_result['accuracy']:.4f} ({rf_result['accuracy']*100:.2f}%)")
            else:
                print(f"  [ERROR] Random Forest: {rf_result['error']}")
                results['random_forest'] = {'error': rf_result['error']}
        except Exception as e:
            print(f"  [ERROR] Random Forest: {str(e)}")
            results['random_forest'] = {'error': str(e)}
        
        # XGBoost
        print("\n2. XGBOOST")
        print("-" * 70)
        try:
            X_xgb, y_xgb = self.prepare_data_for_xgb()
            print(f"  Datos preparados: {X_xgb.shape[0]:,} casos, {X_xgb.shape[1]} features")
            
            X_train_xgb, X_test_xgb, y_train_xgb, y_test_xgb = train_test_split(
                X_xgb, y_xgb, test_size=0.2, random_state=42
            )
            print(f"  Test set: {X_test_xgb.shape[0]:,} casos")
            
            xgb_result = self.evaluate_xgboost(X_test_xgb, y_test_xgb)
            if 'error' not in xgb_result:
                results['xgboost'] = xgb_result
                print(f"  [OK] XGBoost: Accuracy = {xgb_result['accuracy']:.4f} ({xgb_result['accuracy']*100:.2f}%)")
            else:
                print(f"  [ERROR] XGBoost: {xgb_result['error']}")
                results['xgboost'] = {'error': xgb_result['error']}
        except Exception as e:
            print(f"  [ERROR] XGBoost: {str(e)}")
            results['xgboost'] = {'error': str(e)}
        
        # Neural Network
        print("\n3. NEURAL NETWORK")
        print("-" * 70)
        try:
            X_nn, y_nn = self.prepare_data_for_nn()
            print(f"  Datos preparados: {X_nn.shape[0]:,} casos, {X_nn.shape[1]} features")
            
            X_train_nn, X_test_nn, y_train_nn, y_test_nn = train_test_split(
                X_nn, y_nn, test_size=0.2, random_state=42
            )
            print(f"  Test set: {X_test_nn.shape[0]:,} casos")
            
            nn_result = self.evaluate_neural_network(X_test_nn, y_test_nn)
            if 'error' not in nn_result:
                results['neural_network'] = nn_result
                print(f"  [OK] Neural Network: Accuracy = {nn_result['accuracy']:.4f} ({nn_result['accuracy']*100:.2f}%)")
            else:
                print(f"  [ERROR] Neural Network: {nn_result['error']}")
                results['neural_network'] = {'error': nn_result['error']}
        except Exception as e:
            print(f"  [ERROR] Neural Network: {str(e)}")
            results['neural_network'] = {'error': str(e)}
        
        self.results = results
        return results
    
    def generate_comparison_table(self):
        """Generate comparison table"""
        print("\n" + "="*70)
        print("TABLA COMPARATIVA DE MODELOS")
        print("="*70)
        
        # Prepare table data
        table_data = []
        
        for model_key, result in self.results.items():
            if 'error' not in result:
                table_data.append({
                    'Modelo': result['model'],
                    'Accuracy': f"{result['accuracy']:.4f} ({result['accuracy']*100:.2f}%)",
                    'Precision': f"{result['precision']:.4f}",
                    'Recall': f"{result['recall']:.4f}",
                    'F1-Score': f"{result['f1_score']:.4f}",
                    'Clases': result['total_classes']
                })
        
        if not table_data:
            print("\n[ERROR] No hay resultados para mostrar")
            return
        
        # Create DataFrame for nice formatting
        df_comparison = pd.DataFrame(table_data)
        
        print("\n" + df_comparison.to_string(index=False))
        
        # Rank models
        print("\n" + "="*70)
        print("RANKING DE MODELOS POR ACCURACY")
        print("="*70)
        
        ranked = sorted(
            [(k, v) for k, v in self.results.items() if 'error' not in v],
            key=lambda x: x[1]['accuracy'],
            reverse=True
        )
        
        for rank, (model_key, result) in enumerate(ranked, 1):
            print(f"{rank}. {result['model']}: {result['accuracy']:.4f} ({result['accuracy']*100:.2f}%)")
        
        # Top diseases per model
        print("\n" + "="*70)
        print("TOP 3 ENFERMEDADES POR MODELO (F1-Score)")
        print("="*70)
        
        for model_key, result in self.results.items():
            if 'error' not in result:
                print(f"\n{result['model']}:")
                for i, (disease, f1) in enumerate(result.get('top_3_diseases', []), 1):
                    print(f"  {i}. {disease}: {f1:.4f}")
        
        return df_comparison
    
    def save_results(self, output_file: str = 'model_validation_results.csv'):
        """Save comparison results to CSV"""
        if not self.results:
            return
        
        rows = []
        for model_key, result in self.results.items():
            if 'error' not in result:
                rows.append({
                    'model': result['model'],
                    'accuracy': result['accuracy'],
                    'precision': result['precision'],
                    'recall': result['recall'],
                    'f1_score': result['f1_score'],
                    'total_classes': result['total_classes']
                })
        
        if rows:
            df_results = pd.DataFrame(rows)
            df_results.to_csv(output_file, index=False)
            print(f"\n[OK] Resultados guardados en: {output_file}")
            return output_file
        return None


def main():
    parser = argparse.ArgumentParser(
        description='Validar y comparar modelos ML'
    )
    parser.add_argument(
        '--dataset',
        type=str,
        default='augmented_dataset_full_20251103_124126.csv',
        help='Dataset para validacion'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='model_validation_results.csv',
        help='Archivo de salida para resultados'
    )
    
    args = parser.parse_args()
    
    if not os.path.exists(args.dataset):
        print(f"[ERROR] Dataset no encontrado: {args.dataset}")
        # Try alternative
        alt_dataset = 'synthetic_dataset_extended.csv'
        if os.path.exists(alt_dataset):
            print(f"Usando dataset alternativo: {alt_dataset}")
            args.dataset = alt_dataset
        else:
            print("[ERROR] No se encontro ningun dataset disponible")
            return 1
    
    # Initialize validator
    validator = ModelValidator(args.dataset)
    
    # Load dataset
    validator.load_dataset()
    
    # Validate all models
    results = validator.validate_all_models()
    
    # Generate comparison table
    comparison_df = validator.generate_comparison_table()
    
    # Save results
    validator.save_results(args.output)
    
    print("\n" + "="*70)
    print("[SUCCESS] VALIDACION COMPLETADA")
    print("="*70)
    
    return 0


if __name__ == "__main__":
    exit(main())

