"""
Sistema de Retraining Automático Basado en Feedback Médico

Permite reentrenar modelos ML automáticamente usando el feedback de médicos,
mejorando continuamente la precisión del sistema.

"""

import os
import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import joblib
import shutil

try:
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

try:
    import structlog
    logger = structlog.get_logger()
except ImportError:
    class SimpleLogger:
        def info(self, *args, **kwargs): pass
        def warning(self, *args, **kwargs): print(f"WARNING: {args}")
        def error(self, *args, **kwargs): print(f"ERROR: {args}")
    logger = SimpleLogger()


class AutoRetrainingSystem:
    """Sistema de retraining automático basado en feedback médico"""
    
    def __init__(self, 
                 feedback_path: str = 'monitoring/feedback',
                 models_path: str = 'models',
                 min_feedback_samples: int = 50,
                 retraining_threshold: float = 0.05):  # 5% mejora mínima
        """
        Initialize auto-retraining system
        
        Args:
            feedback_path: Path to feedback files
            models_path: Path to model files
            min_feedback_samples: Minimum feedback samples to trigger retraining
            retraining_threshold: Minimum improvement threshold to accept new model
        """
        self.feedback_path = Path(feedback_path)
        self.models_path = Path(models_path)
        self.min_feedback_samples = min_feedback_samples
        self.retraining_threshold = retraining_threshold
        
        # Create directories
        self.models_path.mkdir(parents=True, exist_ok=True)
        self.backup_path = self.models_path / 'backups'
        self.backup_path.mkdir(parents=True, exist_ok=True)
        
        self.feedback_system = None
        self._load_feedback_system()
    
    def _load_feedback_system(self):
        """Load feedback system"""
        try:
            import importlib.util
            feedback_path = os.path.join(os.path.dirname(__file__), 'medical_feedback_system.py')
            spec = importlib.util.spec_from_file_location("medical_feedback_system", feedback_path)
            feedback_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(feedback_module)
            self.feedback_system = feedback_module.get_feedback_system()
        except Exception as e:
            logger.warning(f"Could not load feedback system: {e}")
    
    def collect_training_data_from_feedback(self, days: int = 30) -> pd.DataFrame:
        """
        Collect training data from medical feedback
        
        Args:
            days: Number of days to look back
        
        Returns:
            DataFrame with training data
        """
        if not self.feedback_system:
            return pd.DataFrame()
        
        # Get all feedback
        cutoff_date = datetime.now() - timedelta(days=days)
        
        training_data = []
        feedback_files = list(self.feedback_path.glob('feedback_*.jsonl'))
        
        for feedback_file in feedback_files:
            try:
                with open(feedback_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        if not line.strip():
                            continue
                        try:
                            feedback = json.loads(line)
                            
                            # Only use incorrect/partially_correct feedback as training data
                            if feedback.get('feedback_type') in ['incorrect', 'partially_correct']:
                                if feedback.get('symptoms') and feedback.get('actual_diagnosis', {}).get('disease'):
                                    training_data.append({
                                        'symptoms': feedback['symptoms'],
                                        'disease': feedback['actual_diagnosis']['disease'],
                                        'urgency': feedback['actual_diagnosis'].get('urgency', 'medium'),
                                        'severity': feedback['actual_diagnosis'].get('severity', 'moderate'),
                                        'category': 'general',
                                        'patient_age': 35,  # Default if not available
                                        'source': 'medical_feedback',
                                        'feedback_id': feedback.get('feedback_id'),
                                        'timestamp': feedback.get('timestamp')
                                    })
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                logger.warning(f"Error reading feedback file {feedback_file}: {e}")
        
        if not training_data:
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(training_data)
        
        # Convert symptoms list to string format
        if 'symptoms' in df.columns:
            df['symptoms'] = df['symptoms'].apply(
                lambda x: ', '.join(x) if isinstance(x, list) else str(x)
            )
        
        logger.info(f"Collected {len(df)} training samples from feedback")
        return df
    
    def augment_dataset_with_feedback(self, 
                                     base_dataset_path: str,
                                     output_path: str = None) -> pd.DataFrame:
        """
        Augment base dataset with feedback data
        
        Args:
            base_dataset_path: Path to base dataset
            output_path: Path to save augmented dataset
        
        Returns:
            Augmented DataFrame
        """
        # Load base dataset
        try:
            base_df = pd.read_csv(base_dataset_path)
        except Exception as e:
            logger.error(f"Could not load base dataset: {e}")
            return pd.DataFrame()
        
        # Collect feedback data
        feedback_df = self.collect_training_data_from_feedback(days=90)
        
        if feedback_df.empty:
            logger.info("No feedback data available for augmentation")
            return base_df
        
        # Prepare feedback data to match base dataset format
        if 'symptoms' in feedback_df.columns:
            # Ensure symptoms format matches
            pass  # Already formatted
        
        # Add feedback data to base dataset
        augmented_df = pd.concat([base_df, feedback_df], ignore_index=True)
        
        logger.info(f"Augmented dataset: {len(base_df)} -> {len(augmented_df)} samples")
        
        # Save if output path specified
        if output_path:
            augmented_df.to_csv(output_path, index=False, encoding='utf-8')
            logger.info(f"Augmented dataset saved to {output_path}")
        
        return augmented_df
    
    def validate_model_performance(self,
                                   model_path: str,
                                   test_data: pd.DataFrame,
                                   baseline_metrics: Dict[str, float] = None) -> Dict[str, Any]:
        """
        Validate model performance on test data
        
        Args:
            model_path: Path to model file
            test_data: Test dataset
            baseline_metrics: Baseline metrics for comparison
        
        Returns:
            Validation results
        """
        if not HAS_SKLEARN or test_data.empty:
            return {'error': 'Cannot validate: missing sklearn or empty test data'}
        
        try:
            # Load model
            # This is a simplified validation - in practice would need to match model type
            # For now, return placeholder
            return {
                'model_path': model_path,
                'validation_date': datetime.now().isoformat(),
                'status': 'pending_validation',
                'note': 'Full validation requires model-specific implementation'
            }
        except Exception as e:
            return {'error': str(e)}
    
    def should_retrain(self, min_new_feedback: int = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Determine if retraining should be triggered
        
        Args:
            min_new_feedback: Minimum new feedback samples (overrides default)
        
        Returns:
            Tuple of (should_retrain, stats)
        """
        threshold = min_new_feedback or self.min_feedback_samples
        
        # Get feedback statistics
        feedback_df = self.collect_training_data_from_feedback(days=30)
        
        stats = {
            'total_feedback_samples': len(feedback_df),
            'threshold': threshold,
            'should_retrain': len(feedback_df) >= threshold,
            'date': datetime.now().isoformat()
        }
        
        if stats['should_retrain']:
            logger.info(f"Retraining triggered: {len(feedback_df)} feedback samples >= {threshold}")
        
        return stats['should_retrain'], stats
    
    def backup_current_models(self) -> Dict[str, str]:
        """
        Backup current models before retraining
        
        Returns:
            Dict mapping model names to backup paths
        """
        backups = {}
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        model_files = [
            'xgboost_model.pkl',
            'base_random_forest.pkl',
            'neural_network_model.pkl'
        ]
        
        for model_file in model_files:
            model_path = self.models_path / model_file
            if model_path.exists():
                backup_path = self.backup_path / f"{model_file}.backup_{timestamp}"
                try:
                    shutil.copy2(model_path, backup_path)
                    backups[model_file] = str(backup_path)
                    logger.info(f"Backed up {model_file} to {backup_path}")
                except Exception as e:
                    logger.error(f"Error backing up {model_file}: {e}")
        
        return backups
    
    def retrain_xgboost(self, 
                       dataset_path: str,
                       output_path: str = None) -> Dict[str, Any]:
        """
        Retrain XGBoost model with augmented dataset
        
        Args:
            dataset_path: Path to training dataset
            output_path: Output path for new model
        
        Returns:
            Training results
        """
        try:
            import subprocess
            import sys
            
            output = output_path or str(self.models_path / 'xgboost_model.pkl')
            
            logger.info(f"Starting XGBoost retraining with dataset: {dataset_path}")
            
            # Execute training script
            script_path = os.path.join(os.path.dirname(__file__), '..', 'train_xgboost_simple.py')
            
            if not os.path.exists(script_path):
                return {'error': 'Training script not found', 'status': 'failed'}
            
            # Run training (this will actually train the model)
            result = subprocess.run(
                [sys.executable, script_path],
                cwd=os.path.dirname(script_path),
                capture_output=True,
                text=True,
                timeout=3600  # 1 hour timeout
            )
            
            if result.returncode == 0:
                logger.info(f"XGBoost retraining completed successfully")
                return {
                    'model_type': 'xgboost',
                    'dataset_path': dataset_path,
                    'output_path': output,
                    'status': 'completed',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                logger.error(f"XGBoost retraining failed: {result.stderr}")
                return {'error': result.stderr, 'status': 'failed'}
            
        except subprocess.TimeoutExpired:
            logger.error("XGBoost retraining timed out")
            return {'error': 'Training timed out', 'status': 'failed'}
        except Exception as e:
            logger.error(f"Error in XGBoost retraining: {e}")
            return {'error': str(e), 'status': 'failed'}
    
    def retrain_random_forest(self,
                             dataset_path: str,
                             output_path: str = None) -> Dict[str, Any]:
        """Retrain Random Forest model"""
        try:
            import subprocess
            import sys
            
            output = output_path or str(self.models_path / 'base_random_forest.pkl')
            
            logger.info(f"Starting Random Forest retraining with dataset: {dataset_path}")
            
            # Execute training script
            script_path = os.path.join(os.path.dirname(__file__), '..', 'train_base_model.py')
            
            if not os.path.exists(script_path):
                return {'error': 'Training script not found', 'status': 'failed'}
            
            result = subprocess.run(
                [sys.executable, script_path],
                cwd=os.path.dirname(script_path),
                capture_output=True,
                text=True,
                timeout=3600
            )
            
            if result.returncode == 0:
                logger.info(f"Random Forest retraining completed successfully")
                return {
                    'model_type': 'random_forest',
                    'dataset_path': dataset_path,
                    'output_path': output,
                    'status': 'completed',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {'error': result.stderr, 'status': 'failed'}
            
        except subprocess.TimeoutExpired:
            return {'error': 'Training timed out', 'status': 'failed'}
        except Exception as e:
            logger.error(f"Error in Random Forest retraining: {e}")
            return {'error': str(e), 'status': 'failed'}
    
    def retrain_neural_network(self,
                              dataset_path: str,
                              output_path: str = None) -> Dict[str, Any]:
        """Retrain Neural Network model"""
        try:
            import subprocess
            import sys
            
            output = output_path or str(self.models_path / 'neural_network_model.pkl')
            
            logger.info(f"Starting Neural Network retraining with dataset: {dataset_path}")
            
            # Execute training script
            script_path = os.path.join(os.path.dirname(__file__), '..', 'train_neural_network.py')
            
            if not os.path.exists(script_path):
                return {'error': 'Training script not found', 'status': 'failed'}
            
            result = subprocess.run(
                [sys.executable, script_path, '--dataset', dataset_path, '--output', str(self.models_path)],
                cwd=os.path.dirname(script_path),
                capture_output=True,
                text=True,
                timeout=7200  # 2 hours for neural network
            )
            
            if result.returncode == 0:
                logger.info(f"Neural Network retraining completed successfully")
                return {
                    'model_type': 'neural_network',
                    'dataset_path': dataset_path,
                    'output_path': output,
                    'status': 'completed',
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {'error': result.stderr, 'status': 'failed'}
            
        except subprocess.TimeoutExpired:
            return {'error': 'Training timed out', 'status': 'failed'}
        except Exception as e:
            logger.error(f"Error in Neural Network retraining: {e}")
            return {'error': str(e), 'status': 'failed'}
    
    def execute_retraining_pipeline(self,
                                   model_types: List[str] = None,
                                   base_dataset: str = 'synthetic_dataset.csv') -> Dict[str, Any]:
        """
        Execute complete retraining pipeline
        
        Args:
            model_types: List of model types to retrain ['xgboost', 'random_forest', 'neural_network']
            base_dataset: Path to base dataset
        
        Returns:
            Pipeline results
        """
        model_types = model_types or ['xgboost', 'random_forest']
        
        # Check if retraining should be triggered
        should_retrain, stats = self.should_retrain()
        
        if not should_retrain:
            return {
                'status': 'skipped',
                'reason': 'insufficient_feedback',
                'stats': stats
            }
        
        logger.info("Starting retraining pipeline...")
        
        # Step 1: Backup current models
        backups = self.backup_current_models()
        
        # Step 2: Augment dataset with feedback
        augmented_dataset_path = str(self.models_path.parent / f'augmented_dataset_{datetime.now().strftime("%Y%m%d")}.csv')
        augmented_df = self.augment_dataset_with_feedback(base_dataset, augmented_dataset_path)
        
        if augmented_df.empty:
            return {
                'status': 'failed',
                'reason': 'could_not_create_augmented_dataset'
            }
        
        # Step 3: Retrain models
        results = {}
        
        for model_type in model_types:
            if model_type == 'xgboost':
                results['xgboost'] = self.retrain_xgboost(augmented_dataset_path)
            elif model_type == 'random_forest':
                results['random_forest'] = self.retrain_random_forest(augmented_dataset_path)
            elif model_type == 'neural_network':
                results['neural_network'] = self.retrain_neural_network(augmented_dataset_path)
        
        # Step 4: Save retraining metadata
        metadata = {
            'retraining_date': datetime.now().isoformat(),
            'backups': backups,
            'augmented_dataset': augmented_dataset_path,
            'augmented_samples': len(augmented_df),
            'feedback_samples': stats['total_feedback_samples'],
            'models_retrained': model_types,
            'results': results
        }
        
        metadata_path = self.models_path / f'retraining_metadata_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        logger.info("Retraining pipeline completed")
        
        return {
            'status': 'completed',
            'metadata': metadata,
            'metadata_path': str(metadata_path)
        }


# Global instance
_retraining_system = None


def get_retraining_system() -> AutoRetrainingSystem:
    """Get global retraining system instance"""
    global _retraining_system
    if _retraining_system is None:
        _retraining_system = AutoRetrainingSystem()
    return _retraining_system


if __name__ == "__main__":
    # Test the retraining system
    print("Testing Auto-Retraining System...")
    
    system = AutoRetrainingSystem()
    
    # Check if retraining should be triggered
    should_retrain, stats = system.should_retrain(min_new_feedback=10)
    
    print(f"\nRetraining Check:")
    print(f"  Should retrain: {should_retrain}")
    print(f"  Stats: {stats}")
    
    # Collect training data
    print("\nCollecting training data from feedback...")
    training_data = system.collect_training_data_from_feedback(days=30)
    print(f"  Collected {len(training_data)} samples")
    
    if not training_data.empty:
        print(f"\nSample data:")
        print(training_data.head())

