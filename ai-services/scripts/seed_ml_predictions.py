"""
Script para poblar datos de prueba de predicciones ML
Útil para testing y demostración del dashboard de explicabilidad SHAP
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
import random

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ml_models.prediction_monitor import PredictionMonitor

# Enfermedades respiratorias comunes
DISEASES = [
    'asma bronquial',
    'neumonía',
    'bronquitis aguda',
    'gripe',
    'resfriado común',
    'EPOC',
    'COVID-19',
    'faringitis',
    'sinusitis',
    'laringitis'
]

# Síntomas comunes
SYMPTOMS_POOL = [
    'tos', 'fiebre', 'dificultad respiratoria', 'dolor de garganta',
    'congestión nasal', 'dolor de cabeza', 'fatiga', 'escalofríos',
    'dolor muscular', 'sibilancias', 'opresión en el pecho', 'estornudos'
]

# Niveles de urgencia
URGENCY_LEVELS = ['low', 'medium', 'high', 'critical']

# Géneros para fairness
GENDERS = ['M', 'F', 'other']

# Rangos de edad
AGE_BANDS = ['0-18', '19-35', '36-50', '51-65', '65+']

def generate_mock_prediction(disease: str, confidence: float, urgency: str, 
                             patient_metadata: dict = None) -> dict:
    """Generate a mock prediction with SHAP explanation"""
    
    # Generate symptoms based on disease
    num_symptoms = random.randint(2, 6)
    symptoms = random.sample(SYMPTOMS_POOL, num_symptoms)
    
    # Generate SHAP explanation
    explanation = {
        'method': 'SHAP',
        'models_used': ['xgboost', 'neural_network'],
        'description': f'Predicción basada en {num_symptoms} síntomas principales',
        'positive_factors': [
            {
                'feature_index': i,
                'feature_name': f'symptom_{symptoms[i]}',
                'shap_value': random.uniform(0.1, 0.5),
                'feature_importance': random.uniform(0.15, 0.4)
            }
            for i in range(min(3, len(symptoms)))
        ],
        'negative_factors': [
            {
                'feature_index': i + 10,
                'feature_name': f'absence_of_{random.choice(SYMPTOMS_POOL)}',
                'shap_value': random.uniform(-0.3, -0.1),
                'feature_importance': random.uniform(0.1, 0.25)
            }
            for i in range(2)
        ],
        'decision_factors': [
            {
                'feature_index': i,
                'feature_name': symptoms[i],
                'shap_value': random.uniform(0.05, 0.3),
                'feature_importance': random.uniform(0.1, 0.3)
            }
            for i in range(min(5, len(symptoms)))
        ],
        'explainability_score': random.uniform(0.85, 0.98),
        'friendly': {
            'key_factors': [
                f'Presencia de {symptoms[0]}',
                f'Duración de síntomas: {random.randint(2, 14)} días',
                f'Edad del paciente: {patient_metadata.get("age_band", "adulto")}'
            ]
        },
        'raw_contributions': {}
    }
    
    return {
        'disease': disease,
        'confidence': confidence,
        'urgency_level': urgency,
        'explanation': explanation,
        'top_3_predictions': [
            {'disease': disease, 'confidence': f'{confidence:.2f}'},
            {'disease': random.choice(DISEASES), 'confidence': f'{confidence * 0.7:.2f}'},
            {'disease': random.choice(DISEASES), 'confidence': f'{confidence * 0.5:.2f}'}
        ]
    }

def seed_predictions(num_predictions: int = 100, days_back: int = 7):
    """
    Seed ML predictions for testing
    
    Args:
        num_predictions: Number of predictions to generate
        days_back: How many days back to generate predictions
    """
    print(f"🌱 Generando {num_predictions} predicciones ML de prueba...")
    
    monitor = PredictionMonitor(storage_path='monitoring/predictions')
    
    # Generate predictions spread over the last N days
    base_date = datetime.now() - timedelta(days=days_back)
    
    for i in range(num_predictions):
        # Random date within the period
        days_offset = random.uniform(0, days_back)
        prediction_date = base_date + timedelta(days=days_offset)
        
        # Random disease and confidence
        disease = random.choice(DISEASES)
        confidence = random.uniform(0.65, 0.99)
        urgency = random.choice(URGENCY_LEVELS)
        
        # Patient metadata for fairness analysis
        patient_metadata = {
            'gender': random.choice(GENDERS),
            'age_band': random.choice(AGE_BANDS),
            'risk_level': random.choice(['low', 'medium', 'high'])
        }
        
        # Generate prediction
        prediction = generate_mock_prediction(disease, confidence, urgency, patient_metadata)
        
        # Generate symptoms
        num_symptoms = random.randint(2, 6)
        symptoms = random.sample(SYMPTOMS_POOL, num_symptoms)
        
        # Log prediction (manually set timestamp for historical data)
        prediction_id = f"pred_{prediction_date.strftime('%Y%m%d_%H%M%S')}_{i:04d}"
        
        log_entry = {
            'prediction_id': prediction_id,
            'timestamp': prediction_date.isoformat(),
            'model_name': random.choice(['xgboost', 'neural_network', 'ensemble']),
            'patient_id': f'patient_{random.randint(1000, 9999)}',
            'session_id': f'session_{random.randint(100, 999)}',
            'input': {
                'symptoms': symptoms,
                'symptom_count': len(symptoms)
            },
            'prediction': prediction,
            'metadata': {
                'has_explanation': True,
                'explanation_length': len(str(prediction.get('explanation', ''))),
                'patient': patient_metadata
            }
        }
        
        # Add to monitor's log
        monitor.predictions_log.append(log_entry)
        
        # Update metrics
        monitor.disease_counts[disease] += 1
        monitor.confidence_distribution.append(confidence)
        monitor.urgency_distribution[urgency] += 1
        
        # Persist to file
        log_file = monitor.storage_path / f"predictions_{prediction_date.strftime('%Y%m%d')}.jsonl"
        with open(log_file, 'a', encoding='utf-8') as f:
            import json
            f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        
        if (i + 1) % 20 == 0:
            print(f"  ✅ Generadas {i + 1}/{num_predictions} predicciones...")
    
    print(f"✅ {num_predictions} predicciones generadas exitosamente!")
    print(f"📁 Archivos guardados en: {monitor.storage_path}")
    print(f"📊 Métricas disponibles:")
    print(f"   - Enfermedades: {len(monitor.disease_counts)}")
    print(f"   - Predicciones totales: {len(monitor.predictions_log)}")
    print(f"   - Confianza promedio: {sum(monitor.confidence_distribution) / len(monitor.confidence_distribution):.2f}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Seed ML predictions for testing')
    parser.add_argument('--count', type=int, default=100, help='Number of predictions to generate')
    parser.add_argument('--days', type=int, default=7, help='Number of days back to generate predictions')
    
    args = parser.parse_args()
    
    seed_predictions(num_predictions=args.count, days_back=args.days)

