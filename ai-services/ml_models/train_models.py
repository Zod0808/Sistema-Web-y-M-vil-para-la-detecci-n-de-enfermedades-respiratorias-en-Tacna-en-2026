"""
Training Script for ML Models

Usage:
    python train_models.py --dataset synthetic_data.csv --model rf --output models/
"""

import argparse
import pandas as pd
import numpy as np
from synthetic_dataset_generator import SyntheticDatasetGenerator
from random_forest_model import RandomForestDiseaseClassifier
from xgboost_model import XGBoostDiseaseClassifier
from neural_network_model import MultiTaskNeuralNetwork
from hybrid_system import HybridRuleMLSystem


def generate_dataset(output_file: str = 'synthetic_dataset.csv', 
                     samples_per_common: int = 2000,
                     samples_per_rare: int = 300):
    """Generate synthetic dataset"""
    print("Generating synthetic dataset...")
    
    generator = SyntheticDatasetGenerator()
    
    # Define common and rare diseases
    common_diseases = [
        'asma bronquial', 'neumonía', 'bronquitis aguda', 'resfriado común',
        'sinusitis', 'faringitis', 'laringitis', 'influenza a', 'influenza b',
        'bronquiolitis aguda', 'epoc', 'rinitis'
    ]
    
    samples_per_disease = {}
    for disease in generator.diseases_db.keys():
        if any(common in disease.lower() for common in common_diseases):
            samples_per_disease[disease] = samples_per_common
        else:
            samples_per_disease[disease] = samples_per_rare
    
    df = generator.generate_dataset(samples_per_disease, output_file)
    return df, generator.symptom_keywords


def train_random_forest(df: pd.DataFrame, output_file: str):
    """Train Random Forest model"""
    print("\n=== Training Random Forest ===")
    
    classifier = RandomForestDiseaseClassifier(n_estimators=300)
    X, y = classifier.prepare_features(df)
    classifier.train(X, y, test_size=0.2)
    
    classifier.save_model(output_file)
    return classifier


def train_xgboost(df: pd.DataFrame, output_file: str):
    """Train XGBoost model"""
    print("\n=== Training XGBoost ===")
    
    classifier = XGBoostDiseaseClassifier()
    X = classifier.create_advanced_features(df)
    y = classifier.label_encoder.fit_transform(df['disease'])
    
    classifier.train(X, y, optimize=True)
    
    classifier.save_model(output_file)
    return classifier


def train_neural_network(df: pd.DataFrame, output_file: str):
    """Train Neural Network model"""
    print("\n=== Training Neural Network ===")
    
    classifier = MultiTaskNeuralNetwork()
    tasks_data = classifier.prepare_multi_task_data(df)
    classifier.train(tasks_data)
    
    classifier.save_model(output_file)
    return classifier


def train_hybrid(df: pd.DataFrame, output_path: str):
    """Train Hybrid System"""
    print("\n=== Training Hybrid System ===")
    
    system = HybridRuleMLSystem()
    
    # Train Random Forest
    rf_classifier = RandomForestDiseaseClassifier(n_estimators=200)
    X, y = rf_classifier.prepare_features(df)
    rf_classifier.train(X, y, test_size=0.2)
    system.random_forest = rf_classifier
    
    # Train XGBoost
    xgb_classifier = XGBoostDiseaseClassifier()
    X_xgb = xgb_classifier.create_advanced_features(df)
    y_xgb = xgb_classifier.label_encoder.fit_transform(df['disease'])
    xgb_classifier.train(X_xgb, y_xgb, optimize=False)
    system.xgboost = xgb_classifier
    
    # Save
    system.save_all_models(output_path)
    
    return system


def main():
    parser = argparse.ArgumentParser(description='Train ML models for disease classification')
    parser.add_argument('--generate-dataset', action='store_true', help='Generate synthetic dataset')
    parser.add_argument('--dataset', type=str, default='synthetic_dataset.csv', help='Path to dataset')
    parser.add_argument('--model', type=str, choices=['rf', 'xgb', 'nn', 'hybrid', 'all'], 
                       default='rf', help='Model to train')
    parser.add_argument('--output', type=str, default='models/', help='Output directory')
    
    args = parser.parse_args()
    
    # Generate or load dataset
    if args.generate_dataset or not pd.io.common.file_exists(args.dataset):
        print("Generating new dataset...")
        df, symptom_keywords = generate_dataset(args.dataset)
    else:
        print(f"Loading dataset from {args.dataset}")
        df = pd.read_csv(args.dataset)
        generator = SyntheticDatasetGenerator()
        symptom_keywords = generator.symptom_keywords
    
    print(f"Dataset loaded: {df.shape}")
    print(f"Diseases: {df['disease'].nunique()}")
    
    # Train specified model(s)
    if args.model in ['rf', 'all']:
        train_random_forest(df, f"{args.output}/random_forest.pkl")
    
    if args.model in ['xgb', 'all']:
        train_xgboost(df, f"{args.output}/xgboost.pkl")
    
    if args.model in ['nn', 'all']:
        train_neural_network(df, f"{args.output}/neural_network.pkl")
    
    if args.model in ['hybrid', 'all']:
        train_hybrid(df, args.output)
    
    print("\n✅ Training complete!")


if __name__ == "__main__":
    main()

