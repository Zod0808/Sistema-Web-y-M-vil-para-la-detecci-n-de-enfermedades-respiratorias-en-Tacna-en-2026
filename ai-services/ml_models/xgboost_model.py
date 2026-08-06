"""
XGBoost Classifier for Disease Classification

Implements:
- XGBoost with hyperparameter optimization
- Advanced feature engineering
- SHAP for explainability
- Confidence calibration
"""

import os

# Must be set before xgboost's native library (which bundles its own libomp)
# is loaded. When this process also loads PyTorch (which bundles its own
# separate OpenMP runtime), the two OpenMP thread pools can corrupt each
# other's internal state under concurrent load, crashing with SIGSEGV inside
# libomp's thread-suspend path. Forcing a single OpenMP thread avoids the
# unsafe multi-threaded code path; KMP_DUPLICATE_LIB_OK silences the (now
# non-fatal) duplicate-runtime warning. setdefault() so an operator-configured
# value is never overridden.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
import xgboost as xgb
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
import shap


class XGBoostDiseaseClassifier:
    """XGBoost classifier with advanced features"""

    _ENGINEERED_FEATURE_NAMES = [
        'symptom_count',
        'symptom_density',
        'has_fever',
        'respiratory_distress',
        'has_pain',
        'severity_indicators',
        'chronic_indicators',
        'respiratory_symptom_count',
        'systemic_symptom_count',
        'patient_age_normalized'
    ]

    def __init__(self, random_state: int = 42):
        """
        Initialize XGBoost classifier
        
        Args:
            random_state: Random seed for reproducibility
        """
        self.random_state = random_state
        
        # Initial model with default parameters
        self.model = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=random_state,
            # n_jobs=1: parallelism is delegated to GridSearchCV (n_jobs=-1) during
            # optimize_hyperparameters(); nesting -1 threads per-estimator inside
            # -1 CV worker processes causes oversubscription and can segfault
            # (fork + OpenMP thread pool conflict, notably on macOS).
            n_jobs=1,
            objective='multi:softprob',
            eval_metric='mlogloss',
            early_stopping_rounds=20
        )
        
        self.label_encoder = LabelEncoder()
        self.feature_names = []
        self.explainer = None
        self.is_trained = False
    
    def create_advanced_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Create advanced features from symptoms
        
        Args:
            df: DataFrame with symptom data
        
        Returns:
            DataFrame with engineered features
        """
        print("Creating advanced features...")

        # Reuse the symptom vocabulary established by an earlier call (e.g.
        # during training) instead of recomputing it from whatever rows are
        # passed in this time. Without this, predicting on a subset of rows
        # (or any rows with a different set of unique symptoms) would build a
        # differently-sized feature vector than the one the model was trained
        # on, breaking inference.
        if self.feature_names:
            symptom_list = self.feature_names[:-len(self._ENGINEERED_FEATURE_NAMES)]
        else:
            # Start with basic binary features for each symptom
            all_symptoms = set()
            for symptoms in df['symptoms']:
                if isinstance(symptoms, list):
                    all_symptoms.update([s.lower() for s in symptoms])
                elif isinstance(symptoms, str):
                    all_symptoms.update([s.lower() for s in symptoms.split(',')])

            symptom_list = sorted(all_symptoms)
            self.feature_names = symptom_list.copy()
        
        # Create binary symptom features
        X_data = []
        for row_idx, symptoms in enumerate(df['symptoms']):
            if isinstance(symptoms, list):
                symptom_set = {s.lower() for s in symptoms}
            else:
                symptom_set = {s.lower() for s in symptoms.split(',')}
            
            features = [1 if s in symptom_set else 0 for s in symptom_list]
            
            # Advanced feature engineering
            # 1. Symptom count
            features.append(len(symptom_set))
            
            # 2. Symptom density (symptoms per day - assume ~7 days)
            features.append(len(symptom_set) / 7.0)
            
            # 3. Has fever indicator
            features.append(1 if any('fiebre' in s for s in symptom_set) else 0)
            
            # 4. Respiratory distress indicators
            resp_keywords = ['dificultad', 'respirar', 'disnea', 'ahogo', 'sibilancia']
            features.append(1 if any(kw in ' '.join(symptom_set) for kw in resp_keywords) else 0)
            
            # 5. Pain indicators
            pain_keywords = ['dolor', 'ardor', 'opresion', 'molestia']
            features.append(1 if any(kw in ' '.join(symptom_set) for kw in pain_keywords) else 0)
            
            # 6. Severity indicators
            severity_keywords = ['intenso', 'severa', 'extremo', 'grave', 'alto']
            features.append(1 if any(kw in ' '.join(symptom_set) for kw in severity_keywords) else 0)
            
            # 7. Duration indicators (long-term)
            duration_keywords = ['semanas', 'meses', 'cronico', 'persistente']
            features.append(1 if any(kw in ' '.join(symptom_set) for kw in duration_keywords) else 0)
            
            # 8. Symptom category interactions
            # Respiratory symptoms
            resp_symptoms = ['tos', 'congestion', 'secrecion', 'estornudos', 'picazon']
            resp_count = sum(1 for s in symptom_set if any(r in s for r in resp_symptoms))
            features.append(resp_count)
            
            # Systemic symptoms
            systemic_symptoms = ['fiebre', 'fatiga', 'malestar', 'cansancio', 'debilidad']
            systemic_count = sum(1 for s in symptom_set if any(sys in s for sys in systemic_symptoms))
            features.append(systemic_count)
            
            # 9. Patient age (if available)
            if 'patient_age' in df.columns:
                age_row = df['patient_age'].iloc[row_idx]
            else:
                age_row = 35  # Default
            features.append(age_row / 100.0)  # Normalize age
            
            X_data.append(features)
        
        # Update feature names (only on first computation; see reuse branch above)
        if len(self.feature_names) == len(symptom_list):
            self.feature_names.extend(self._ENGINEERED_FEATURE_NAMES)

        return np.array(X_data)
    
    def optimize_hyperparameters(self, X: np.ndarray, y: np.ndarray, cv: int = 3):
        """
        Optimize hyperparameters using GridSearch
        
        Args:
            X: Feature matrix
            y: Labels
            cv: Number of cross-validation folds
        """
        print("Optimizing hyperparameters...")
        
        param_grid = {
            'n_estimators': [200, 300, 500],
            'max_depth': [4, 6, 8],
            'learning_rate': [0.05, 0.1, 0.2],
            'subsample': [0.8, 0.9, 1.0],
            'colsample_bytree': [0.8, 0.9, 1.0]
        }
        
        # GridSearchCV's internal folds call fit() without an eval_set, so the
        # searched estimator must not have early_stopping_rounds configured
        # (xgboost raises "Must have at least 1 validation dataset for early
        # stopping" otherwise). Search over a clone without it, then apply the
        # winning hyperparameters to self.model, which keeps early stopping
        # enabled for the later fit() call in train() that does pass eval_set.
        search_model = xgb.XGBClassifier(**{
            k: v for k, v in self.model.get_params().items()
            if k != 'early_stopping_rounds'
        })

        # n_jobs=1 (sequential): running CV folds in parallel worker threads or
        # processes out of a long-running server process that has already
        # imported a large native-extension dependency graph (torch, xgboost,
        # etc.) is a known source of native segfaults on macOS, since those
        # libraries each bring their own OpenMP/threading runtime.
        grid_search = GridSearchCV(
            search_model,
            param_grid,
            cv=cv,
            scoring='accuracy',
            n_jobs=1,
            verbose=1
        )

        grid_search.fit(X, y)

        self.model.set_params(**grid_search.best_params_)

        print(f"Best parameters: {grid_search.best_params_}")
        print(f"Best CV score: {grid_search.best_score_:.4f}")
    
    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        test_size: float = 0.2,
        validation_size: float = None,
        optimize: bool = True
    ):
        """
        Train XGBoost model

        Args:
            X: Feature matrix
            y: Labels
            test_size: Proportion of test set
            validation_size: Optional proportion (of the training split) held out as a
                validation set for early stopping, separate from the final test set
            optimize: Whether to optimize hyperparameters
        """
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=y
        )

        if validation_size:
            X_train, X_val, y_train, y_val = train_test_split(
                X_train, y_train, test_size=validation_size,
                random_state=self.random_state, stratify=y_train
            )
            eval_set = [(X_val, y_val)]
        else:
            eval_set = [(X_test, y_test)]

        if optimize:
            self.optimize_hyperparameters(X_train, y_train)

        print(f"Training XGBoost model...")
        self.model.fit(
            X_train, y_train,
            eval_set=eval_set,
            verbose=False
        )
        
        # Evaluate
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        print(f"Training accuracy: {train_score:.4f}")
        print(f"Test accuracy: {test_score:.4f}")
        
        # Feature importance
        feature_importances = self.model.feature_importances_
        print(f"\nTop 10 most important features:")
        top_indices = np.argsort(feature_importances)[-10:][::-1]
        for i in top_indices:
            feature_name = self.feature_names[i] if i < len(self.feature_names) else f"Feature {i}"
            print(f"  {feature_name}: {feature_importances[i]:.4f}")
        
        # Create SHAP explainer
        print("Creating SHAP explainer...")
        self.explainer = shap.TreeExplainer(self.model)
        
        self.is_trained = True

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict disease class indices for a feature matrix"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")

        return self.model.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predict class probabilities for a feature matrix"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")

        return self.model.predict_proba(X)

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """Evaluate the trained model on a labeled feature matrix"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")

        predictions = self.model.predict(X)

        return {
            "accuracy": float(accuracy_score(y, predictions)),
            "predictions": predictions.tolist()
        }

    def cross_validate(self, X: np.ndarray, y: np.ndarray, cv: int = 5) -> np.ndarray:
        """Run cross-validation and return the per-fold scores"""
        return cross_val_score(self.model, X, y, cv=cv)

    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance scores keyed by feature name"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")

        importances = self.model.feature_importances_
        return {
            self.feature_names[i] if i < len(self.feature_names) else f"feature_{i}": float(importances[i])
            for i in range(len(importances))
        }

    def create_shap_explainer(self, X_background: np.ndarray = None):
        """(Re)create the SHAP TreeExplainer for the current model"""
        self.explainer = shap.TreeExplainer(self.model)

    def explain_prediction(self, feature_vector: np.ndarray) -> Dict[str, Any]:
        """Predict and explain a single sample using SHAP"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")

        feature_vector = np.asarray(feature_vector).reshape(1, -1)

        prediction_idx = self.model.predict(feature_vector)[0]
        prediction_probs = self.model.predict_proba(feature_vector)[0]

        disease_name = self.label_encoder.inverse_transform([prediction_idx])[0]
        confidence = float(prediction_probs[prediction_idx])

        shap_values = self.explainer.shap_values(feature_vector)

        # SHAP's return shape varies by version/mode: a list of one
        # per-sample-array per class (older TreeExplainer API), a single
        # (n_samples, n_features, n_classes) array (newer API), or a plain
        # (n_samples, n_features) array for binary/single-output models.
        # Normalize to a flat per-feature array for the predicted class.
        if isinstance(shap_values, list):
            class_values = shap_values[prediction_idx] if prediction_idx < len(shap_values) else []
            sample_shap = np.asarray(class_values)[0] if len(class_values) > 0 else np.array([])
        else:
            shap_array = np.asarray(shap_values)
            if shap_array.ndim == 3:
                sample_shap = shap_array[0, :, prediction_idx]
            elif shap_array.ndim == 2:
                sample_shap = shap_array[0]
            else:
                sample_shap = shap_array

        contribution_scores = []
        for i in range(len(self.feature_names)):
            if i < len(sample_shap):
                contribution_scores.append({
                    'feature': self.feature_names[i],
                    'contribution': float(sample_shap[i])
                })

        contribution_scores.sort(key=lambda x: abs(x['contribution']), reverse=True)

        return {
            'prediction': disease_name,
            'confidence': confidence,
            'feature_importance': contribution_scores
        }

    def predict_with_explanation(self, symptoms: List[str]) -> Dict[str, Any]:
        """
        Predict disease and provide SHAP explanation
        
        Args:
            symptoms: List of symptom strings
        
        Returns:
            Dict with prediction, confidence, and SHAP explanation
        """
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        # Convert symptoms to feature vector
        feature_vector = self._symptoms_to_features(symptoms)
        
        # Predict
        prediction_idx = self.model.predict(feature_vector.reshape(1, -1))[0]
        prediction_probs = self.model.predict_proba(feature_vector.reshape(1, -1))[0]
        
        disease_name = self.label_encoder.inverse_transform([prediction_idx])[0]
        confidence = prediction_probs[prediction_idx]
        
        # Get SHAP values for explainability
        shap_values = self.explainer.shap_values(feature_vector)
        
        # Get top contributing symptoms
        contribution_scores = []
        for i in range(len(self.feature_names)):
            if i < len(shap_values[0]):
                contribution_scores.append({
                    'feature': self.feature_names[i],
                    'contribution': float(shap_values[0][i])
                })
        
        contribution_scores.sort(key=lambda x: abs(x['contribution']), reverse=True)
        
        # Get top 3 predictions
        top_indices = np.argsort(prediction_probs)[-3:][::-1]
        top_predictions = [
            {
                'disease': self.label_encoder.inverse_transform([idx])[0],
                'confidence': float(prediction_probs[idx])
            }
            for idx in top_indices
        ]
        
        return {
            'disease': disease_name,
            'confidence': float(confidence),
            'top_3_predictions': top_predictions,
            'explanation': {
                'top_contributing_features': contribution_scores[:10],
                'shap_values': shap_values[0].tolist()
            },
            'feature_importance': contribution_scores
        }
    
    def _symptoms_to_features(self, symptoms: List[str]) -> np.ndarray:
        """Convert symptom list to feature vector"""
        symptom_set = {s.lower() for s in symptoms}
        
        # Binary features
        features = [1 if s in symptom_set else 0 for s in self.feature_names[:len(self.feature_names)-10]]
        
        # Advanced features
        features.append(len(symptom_set))  # symptom_count
        features.append(len(symptom_set) / 7.0)  # symptom_density
        
        features.append(1 if any('fiebre' in s for s in symptom_set) else 0)  # has_fever
        
        resp_keywords = ['dificultad', 'respirar', 'disnea', 'ahogo', 'sibilancia']
        features.append(1 if any(kw in ' '.join(symptom_set) for kw in resp_keywords) else 0)  # respiratory_distress
        
        pain_keywords = ['dolor', 'ardor', 'opresion', 'molestia']
        features.append(1 if any(kw in ' '.join(symptom_set) for kw in pain_keywords) else 0)  # has_pain
        
        severity_keywords = ['intenso', 'severa', 'extremo', 'grave', 'alto']
        features.append(1 if any(kw in ' '.join(symptom_set) for kw in severity_keywords) else 0)  # severity
        
        duration_keywords = ['semanas', 'meses', 'cronico', 'persistente']
        features.append(1 if any(kw in ' '.join(symptom_set) for kw in duration_keywords) else 0)  # chronic
        
        resp_symptoms = ['tos', 'congestion', 'secrecion', 'estornudos', 'picazon']
        resp_count = sum(1 for s in symptom_set if any(r in s for r in resp_symptoms))
        features.append(resp_count)  # respiratory_symptom_count
        
        systemic_symptoms = ['fiebre', 'fatiga', 'malestar', 'cansancio', 'debilidad']
        systemic_count = sum(1 for s in symptom_set if any(sys in s for sys in systemic_symptoms))
        features.append(systemic_count)  # systemic_symptom_count
        
        features.append(35 / 100.0)  # patient_age_normalized (default)
        
        return np.array(features)
    
    def save_model(self, filepath: str):
        """Save trained model to file"""
        joblib.dump({
            'model': self.model,
            'label_encoder': self.label_encoder,
            'feature_names': self.feature_names
        }, filepath)
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model from file"""
        data = joblib.load(filepath)
        self.model = data['model']
        self.label_encoder = data['label_encoder']
        self.feature_names = data['feature_names']
        
        # Recreate SHAP explainer
        self.explainer = shap.TreeExplainer(self.model)
        self.is_trained = True
        print(f"Model loaded from {filepath}")


# Backwards compatibility alias for legacy imports
XGBoostClassifier = XGBoostDiseaseClassifier


if __name__ == "__main__":
    # Example usage
    from synthetic_dataset_generator import SyntheticDatasetGenerator
    import pandas as pd
    
    # Generate synthetic data
    generator = SyntheticDatasetGenerator()
    df = generator.generate_dataset(
        samples_per_disease={
            'asma bronquial': 200,
            'neumonía': 200,
            'bronquitis aguda': 200,
            'rinitis': 200
        }
    )
    
    # Train model
    classifier = XGBoostDiseaseClassifier()
    X = classifier.create_advanced_features(df)
    y = classifier.label_encoder.fit_transform(df['disease'])
    
    classifier.train(X, y, optimize=True)
    
    # Test prediction with explanation
    test_symptoms = ['tos', 'sibilancias', 'dificultad para respirar']
    prediction = classifier.predict_with_explanation(test_symptoms)
    
    print(f"\nPrediction: {prediction['disease']}")
    print(f"Confidence: {prediction['confidence']:.4f}")
    print(f"\nTop contributing features:")
    for feat in prediction['explanation']['top_contributing_features'][:5]:
        print(f"  {feat['feature']}: {feat['contribution']:.4f}")

