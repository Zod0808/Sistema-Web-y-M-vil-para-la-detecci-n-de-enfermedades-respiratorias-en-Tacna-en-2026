"""
Sistema de Feedback Médico para Mejora de Modelos ML

Permite a médicos proporcionar feedback sobre predicciones del modelo,
facilitando la mejora continua y el aprendizaje supervisado.

"""

import json
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
from collections import defaultdict

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

try:
    import structlog
    logger = structlog.get_logger()
except ImportError:
    class SimpleLogger:
        def info(self, *args, **kwargs): pass
        def warning(self, *args, **kwargs): print(f"WARNING: {args}")
        def error(self, *args, **kwargs): print(f"ERROR: {args}")
    logger = SimpleLogger()


class MedicalFeedbackSystem:
    """System for collecting and processing medical feedback"""
    
    def __init__(self, storage_path: str = 'monitoring/feedback'):
        """
        Initialize feedback system
        
        Args:
            storage_path: Path to store feedback data
        """
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        self.feedback_log = []
        self.training_examples = []
        
    def submit_feedback(self,
                       prediction_id: str,
                       doctor_id: str,
                       feedback_type: str,  # 'correct', 'incorrect', 'partially_correct'
                       actual_disease: Optional[str] = None,
                       actual_urgency: Optional[str] = None,
                       actual_severity: Optional[str] = None,
                       doctor_notes: Optional[str] = None,
                       symptoms: Optional[List[str]] = None,
                       confidence_rating: Optional[int] = None,  # 1-5
                       suggested_corrections: Optional[Dict[str, Any]] = None) -> str:
        """
        Submit medical feedback for a prediction
        
        Args:
            prediction_id: ID of the prediction being reviewed
            doctor_id: ID of the reviewing doctor
            feedback_type: Type of feedback
            actual_disease: Actual disease diagnosis
            actual_urgency: Actual urgency level
            actual_severity: Actual severity level
            doctor_notes: Additional notes from doctor
            symptoms: List of symptoms (if available)
            confidence_rating: Doctor's confidence in their correction (1-5)
            suggested_corrections: Suggested corrections to prediction
        
        Returns:
            Feedback ID
        """
        feedback_id = f"fb_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        feedback_entry = {
            'feedback_id': feedback_id,
            'prediction_id': prediction_id,
            'doctor_id': doctor_id,
            'timestamp': datetime.now().isoformat(),
            'feedback_type': feedback_type,
            'actual_diagnosis': {
                'disease': actual_disease,
                'urgency': actual_urgency,
                'severity': actual_severity
            },
            'doctor_notes': doctor_notes,
            'symptoms': symptoms,
            'confidence_rating': confidence_rating,
            'suggested_corrections': suggested_corrections
        }
        
        # Store feedback
        self.feedback_log.append(feedback_entry)
        
        # Persist to file
        feedback_file = self.storage_path / f"feedback_{datetime.now().strftime('%Y%m%d')}.jsonl"
        with open(feedback_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(feedback_entry, ensure_ascii=False) + '\n')
        
        # If incorrect, create training example for model improvement
        if feedback_type in ['incorrect', 'partially_correct'] and symptoms and actual_disease:
            training_example = {
                'symptoms': symptoms,
                'correct_disease': actual_disease,
                'correct_urgency': actual_urgency,
                'correct_severity': actual_severity,
                'source': 'medical_feedback',
                'feedback_id': feedback_id,
                'timestamp': datetime.now().isoformat()
            }
            self.training_examples.append(training_example)
            
            # Persist training example
            training_file = self.storage_path / 'training_examples.jsonl'
            with open(training_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(training_example, ensure_ascii=False) + '\n')
        
        logger.info("Medical feedback submitted",
                   feedback_id=feedback_id,
                   prediction_id=prediction_id,
                   feedback_type=feedback_type)
        
        return feedback_id
    
    def get_feedback_stats(self, days: int = 30) -> Dict[str, Any]:
        """
        Get statistics about feedback
        
        Args:
            days: Number of days to analyze
        
        Returns:
            Statistics dictionary
        """
        if HAS_PANDAS:
            cutoff_date = datetime.now() - pd.Timedelta(days=days)
        else:
            from datetime import timedelta
            cutoff_date = datetime.now() - timedelta(days=days)
        
        recent_feedback = [
            f for f in self.feedback_log
            if datetime.fromisoformat(f['timestamp']) >= cutoff_date
        ]
        
        if not recent_feedback:
            return {'error': 'No feedback found for the specified period'}
        
        total = len(recent_feedback)
        feedback_types = defaultdict(int)
        disease_corrections = defaultdict(int)
        doctor_ratings = []
        
        for fb in recent_feedback:
            feedback_types[fb['feedback_type']] += 1
            if fb['actual_diagnosis']['disease']:
                disease_corrections[fb['actual_diagnosis']['disease']] += 1
            if fb['confidence_rating']:
                doctor_ratings.append(fb['confidence_rating'])
        
        if HAS_NUMPY and doctor_ratings:
            avg_doctor_conf = float(np.mean(doctor_ratings))
        elif doctor_ratings:
            avg_doctor_conf = sum(doctor_ratings) / len(doctor_ratings)
        else:
            avg_doctor_conf = None
        
        stats = {
            'period': {
                'days': days,
                'total_feedback': total
            },
            'feedback_distribution': dict(feedback_types),
            'accuracy_rate': feedback_types.get('correct', 0) / total * 100 if total > 0 else 0,
            'error_rate': feedback_types.get('incorrect', 0) / total * 100 if total > 0 else 0,
            'most_corrected_diseases': dict(sorted(disease_corrections.items(), 
                                                   key=lambda x: x[1], 
                                                   reverse=True)[:10]),
            'avg_doctor_confidence': avg_doctor_conf
        }
        
        return stats
    
    def export_training_data(self, output_file: str) -> str:
        """
        Export feedback as training data for model improvement
        
        Args:
            output_file: Output CSV file path
        
        Returns:
            Path to exported file
        """
        if not self.training_examples:
            logger.warning("No training examples to export")
            return ""
        
        rows = []
        for example in self.training_examples:
            row = {
                'symptoms': ', '.join(example['symptoms']),
                'disease': example['correct_disease'],
                'urgency': example['correct_urgency'],
                'severity': example['correct_severity'],
                'source': example['source'],
                'feedback_id': example['feedback_id'],
                'timestamp': example['timestamp']
            }
            rows.append(row)
        
        if HAS_PANDAS:
            df = pd.DataFrame(rows)
            df.to_csv(output_file, index=False, encoding='utf-8')
            logger.info("Training data exported", 
                       file=output_file, 
                       examples=len(df))
        else:
            # Fallback: write CSV manually
            import csv
            if rows:
                with open(output_file, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
                    writer.writeheader()
                    writer.writerows(rows)
            logger.info("Training data exported", 
                       file=output_file, 
                       examples=len(rows))
        
        return output_file
    
    def get_feedback_for_prediction(self, prediction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get feedback for a specific prediction
        
        Args:
            prediction_id: Prediction ID
        
        Returns:
            Feedback entry if found
        """
        for fb in self.feedback_log:
            if fb['prediction_id'] == prediction_id:
                return fb
        return None
    
    def get_quality_metrics(self) -> Dict[str, Any]:
        """
        Get quality metrics based on feedback
        
        Returns:
            Quality metrics dictionary
        """
        if not self.feedback_log:
            return {'error': 'No feedback available'}
        
        total = len(self.feedback_log)
        correct = sum(1 for f in self.feedback_log if f['feedback_type'] == 'correct')
        incorrect = sum(1 for f in self.feedback_log if f['feedback_type'] == 'incorrect')
        partial = sum(1 for f in self.feedback_log if f['feedback_type'] == 'partially_correct')
        
        ratings = [f['confidence_rating'] for f in self.feedback_log if f['confidence_rating']]
        
        if HAS_NUMPY and ratings:
            avg_doctor_conf = float(np.mean(ratings))
        elif ratings:
            avg_doctor_conf = sum(ratings) / len(ratings)
        else:
            avg_doctor_conf = None
        
        metrics = {
            'total_feedback': total,
            'correct_predictions': correct,
            'incorrect_predictions': incorrect,
            'partially_correct_predictions': partial,
            'accuracy_percentage': (correct / total * 100) if total > 0 else 0,
            'error_percentage': (incorrect / total * 100) if total > 0 else 0,
            'avg_doctor_confidence': avg_doctor_conf,
            'training_examples_generated': len(self.training_examples)
        }
        
        return metrics


# Global feedback system instance
_feedback_instance = None


def get_feedback_system() -> MedicalFeedbackSystem:
    """Get global feedback system instance"""
    global _feedback_instance
    if _feedback_instance is None:
        _feedback_instance = MedicalFeedbackSystem()
    return _feedback_instance


if __name__ == "__main__":
    # Test the feedback system
    feedback_system = MedicalFeedbackSystem()
    
    # Simulate some feedback
    feedback_id1 = feedback_system.submit_feedback(
        prediction_id='pred_123',
        doctor_id='dr_001',
        feedback_type='correct',
        symptoms=['tos', 'sibilancias', 'dificultad respiratoria'],
        confidence_rating=5
    )
    
    feedback_id2 = feedback_system.submit_feedback(
        prediction_id='pred_124',
        doctor_id='dr_001',
        feedback_type='incorrect',
        actual_disease='neumonía',
        actual_urgency='high',
        symptoms=['fiebre', 'tos', 'dificultad respiratoria'],
        doctor_notes='El modelo predijo asma pero era neumonía',
        confidence_rating=5
    )
    
    print(f"Feedback 1 submitted: {feedback_id1}")
    print(f"Feedback 2 submitted: {feedback_id2}")
    
    # Get stats
    stats = feedback_system.get_feedback_stats(days=30)
    print("\nFeedback Stats:")
    print(json.dumps(stats, indent=2, ensure_ascii=False))
    
    # Get quality metrics
    metrics = feedback_system.get_quality_metrics()
    print("\nQuality Metrics:")
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    
    # Export training data
    if feedback_system.training_examples:
        export_file = feedback_system.export_training_data('feedback_training_data.csv')
        print(f"\nTraining data exported to: {export_file}")

