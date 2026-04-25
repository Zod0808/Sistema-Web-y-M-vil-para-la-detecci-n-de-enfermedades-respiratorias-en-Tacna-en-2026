"""
Train Multimodal ML Models using Synthetic Datasets
Trains models for image analysis and cough analysis to improve chatbot responses
"""

import argparse
import pandas as pd
import numpy as np
import json
from typing import Dict, Any
import joblib
import os
import sys
from pathlib import Path

# Agregar raíz del proyecto al path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Try to import ML libraries
try:
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
    from sklearn.preprocessing import LabelEncoder
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("Warning: scikit-learn not available. Install with: pip install scikit-learn")

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("Warning: xgboost not available. Install with: pip install xgboost")


def prepare_image_features(df: pd.DataFrame) -> tuple:
    """Prepare features for image classification model"""
    # Parse JSON features
    features_list = []
    for idx, row in df.iterrows():
        features_dict = json.loads(row['features'])
        features_list.append(features_dict)
    
    # Convert to DataFrame
    features_df = pd.DataFrame(features_list)
    
    # Add image type as feature
    image_type_encoded = pd.get_dummies(df['image_type'], prefix='img_type')
    features_df = pd.concat([features_df, image_type_encoded], axis=1)
    
    # Target: condition
    target = df['condition'].values
    
    return features_df.values, target


def prepare_cough_features(df: pd.DataFrame) -> tuple:
    """Prepare features for cough classification model"""
    # Parse JSON features
    features_list = []
    for idx, row in df.iterrows():
        features_dict = json.loads(row['audio_features'])
        features_list.append(features_dict)
    
    # Convert to DataFrame
    features_df = pd.DataFrame(features_list)
    
    # Add cough type as feature (if not already in features)
    if 'cough_type' not in features_df.columns:
        cough_type_encoded = pd.get_dummies(df['cough_type'], prefix='cough_type')
        features_df = pd.concat([features_df, cough_type_encoded], axis=1)
    
    # Target: severity (or cough_type for classification)
    target = df['severity'].values
    
    return features_df.values, target


def train_image_classifier(df: pd.DataFrame, model_type: str = 'rf', output_file: str = None):
    """Train image classification model"""
    if not HAS_SKLEARN:
        print("Error: scikit-learn required for training")
        return None
    
    print("🖼️  Training image classification model...")
    
    # Prepare features
    X, y = prepare_image_features(df)
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    print(f"   Features: {X.shape[1]}")
    print(f"   Classes: {len(np.unique(y_encoded))}")
    
    # Train model
    if model_type == 'rf':
        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
    elif model_type == 'gb' and HAS_SKLEARN:
        model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=10,
            learning_rate=0.1,
            random_state=42
        )
    elif model_type == 'xgb' and HAS_XGBOOST:
        model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=10,
            learning_rate=0.1,
            random_state=42,
            n_jobs=-1
        )
    else:
        print(f"Error: Model type '{model_type}' not available")
        return None
    
    print(f"   Training {model_type.upper()} model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n✅ Model trained successfully!")
    print(f"   Accuracy: {accuracy:.4f}")
    print(f"\n   Classification Report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    
    # Save model
    if output_file:
        os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else '.', exist_ok=True)
        model_data = {
            'model': model,
            'label_encoder': label_encoder,
            'feature_names': list(range(X.shape[1]))
        }
        joblib.dump(model_data, output_file)
        print(f"\n   Model saved to: {output_file}")
    
    return model, label_encoder


def train_cough_classifier(df: pd.DataFrame, model_type: str = 'rf', output_file: str = None):
    """Train cough classification model"""
    if not HAS_SKLEARN:
        print("Error: scikit-learn required for training")
        return None
    
    print("\n🎤 Training cough classification model...")
    
    # Prepare features
    X, y = prepare_cough_features(df)
    
    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    print(f"   Training samples: {len(X_train)}")
    print(f"   Test samples: {len(X_test)}")
    print(f"   Features: {X.shape[1]}")
    print(f"   Classes: {len(np.unique(y_encoded))}")
    
    # Train model
    if model_type == 'rf':
        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
    elif model_type == 'gb' and HAS_SKLEARN:
        model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=10,
            learning_rate=0.1,
            random_state=42
        )
    elif model_type == 'xgb' and HAS_XGBOOST:
        model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=10,
            learning_rate=0.1,
            random_state=42,
            n_jobs=-1
        )
    else:
        print(f"Error: Model type '{model_type}' not available")
        return None
    
    print(f"   Training {model_type.upper()} model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\n✅ Model trained successfully!")
    print(f"   Accuracy: {accuracy:.4f}")
    print(f"\n   Classification Report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
    
    # Save model
    if output_file:
        os.makedirs(os.path.dirname(output_file) if os.path.dirname(output_file) else '.', exist_ok=True)
        model_data = {
            'model': model,
            'label_encoder': label_encoder,
            'feature_names': list(range(X.shape[1]))
        }
        joblib.dump(model_data, output_file)
        print(f"\n   Model saved to: {output_file}")
    
    return model, label_encoder


def main():
    parser = argparse.ArgumentParser(
        description='Train multimodal ML models using synthetic datasets'
    )
    parser.add_argument(
        '--image-dataset',
        type=str,
        default='synthetic_image_dataset.csv',
        help='Path to image dataset CSV'
    )
    parser.add_argument(
        '--cough-dataset',
        type=str,
        default='synthetic_cough_dataset.csv',
        help='Path to cough dataset CSV'
    )
    parser.add_argument(
        '--image-model',
        type=str,
        choices=['rf', 'gb', 'xgb'],
        default='rf',
        help='Model type for image classification'
    )
    parser.add_argument(
        '--cough-model',
        type=str,
        choices=['rf', 'gb', 'xgb'],
        default='rf',
        help='Model type for cough classification'
    )
    parser.add_argument(
        '--image-output',
        type=str,
        default='models/image_classifier.pkl',
        help='Output file for image model'
    )
    parser.add_argument(
        '--cough-output',
        type=str,
        default='models/cough_classifier.pkl',
        help='Output file for cough model'
    )
    parser.add_argument(
        '--images-only',
        action='store_true',
        help='Train only image model'
    )
    parser.add_argument(
        '--cough-only',
        action='store_true',
        help='Train only cough model'
    )
    
    args = parser.parse_args()
    
    if not HAS_SKLEARN:
        print("Error: scikit-learn is required. Install with: pip install scikit-learn")
        return
    
    # Train image model
    if not args.cough_only:
        if os.path.exists(args.image_dataset):
            df_images = pd.read_csv(args.image_dataset)
            train_image_classifier(df_images, args.image_model, args.image_output)
        else:
            print(f"Warning: Image dataset not found: {args.image_dataset}")
            print("   Generate it first with: python generate_multimodal_datasets.py --images")
    
    # Train cough model
    if not args.images_only:
        if os.path.exists(args.cough_dataset):
            df_cough = pd.read_csv(args.cough_dataset)
            train_cough_classifier(df_cough, args.cough_model, args.cough_output)
        else:
            print(f"Warning: Cough dataset not found: {args.cough_dataset}")
            print("   Generate it first with: python generate_multimodal_datasets.py --cough")
    
    print("\n🎉 Training complete!")
    print("\nNext steps:")
    print("1. Integrate trained models with chatbot services")
    print("2. Update image_analysis_service.py and cough_analysis_service.py")
    print("3. Test improved chatbot responses")


if __name__ == "__main__":
    main()

