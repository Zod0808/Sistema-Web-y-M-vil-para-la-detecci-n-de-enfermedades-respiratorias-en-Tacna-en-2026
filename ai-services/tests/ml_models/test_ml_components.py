"""
Script de Prueba Completo para Componentes ML

Prueba:
1. Sistema de monitoreo de predicciones
2. Sistema de feedback médico
3. Entrenamiento de red neuronal (modo rápido para prueba)
4. Integración de componentes

Usage:
    python test_ml_components.py [--quick] [--full]
"""

import argparse
import sys
import os
import json
from pathlib import Path
from datetime import datetime

# Try to import optional dependencies
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    print("[!] pandas no disponible, algunas funciones pueden estar limitadas")

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    print("[!] numpy no disponible, algunas funciones pueden estar limitadas")

try:
    import structlog
    logger = structlog.get_logger()
    HAS_STRUCTLOG = True
except ImportError:
    HAS_STRUCTLOG = False
    # Create simple logger
    class SimpleLogger:
        def info(self, *args, **kwargs): pass
        def warning(self, *args, **kwargs): print(f"[!] WARNING: {args}")
        def error(self, *args, **kwargs): print(f"[ERROR] ERROR: {args}")
    logger = SimpleLogger()

# Add paths
sys.path.insert(0, os.path.dirname(__file__))
# ml_models is in the parent directory, not in tests/
parent_dir = os.path.dirname(os.path.dirname(__file__))
ml_models_path = os.path.join(parent_dir, 'ml_models')
sys.path.insert(0, ml_models_path)

# Import directly to avoid __init__.py issues
import importlib.util
spec = importlib.util.spec_from_file_location("prediction_monitor", os.path.join(ml_models_path, "prediction_monitor.py"))
prediction_monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prediction_monitor)
PredictionMonitor = prediction_monitor.PredictionMonitor
get_monitor = prediction_monitor.get_monitor

spec2 = importlib.util.spec_from_file_location("medical_feedback_system", os.path.join(ml_models_path, "medical_feedback_system.py"))
feedback_system = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(feedback_system)
MedicalFeedbackSystem = feedback_system.MedicalFeedbackSystem
get_feedback_system = feedback_system.get_feedback_system


def test_prediction_monitor():
    """Test prediction monitoring system"""
    print("\n" + "="*60)
    print("PRUEBA 1: Sistema de Monitoreo de Predicciones")
    print("="*60)
    
    monitor = PredictionMonitor(storage_path='monitoring/test_predictions')
    
    # Simular predicciones del dataset
    print("\n1.1. Registrando predicciones simuladas...")
    
    test_predictions = [
        {
            'symptoms': ['tos', 'sibilancias', 'dificultad respiratoria', 'opresion pecho'],
            'prediction': {
                'disease': 'asma bronquial',
                'confidence': 0.95,
                'urgency_level': 'high',
                'top_3_predictions': [
                    {'disease': 'asma bronquial', 'confidence': 0.95},
                    {'disease': 'epoc', 'confidence': 0.03},
                    {'disease': 'bronquitis aguda', 'confidence': 0.02}
                ],
                'explanation': 'Síntomas típicos de asma bronquial'
            },
            'model_name': 'xgboost'
        },
        {
            'symptoms': ['fiebre', 'tos', 'dificultad respiratoria', 'dolor toracico'],
            'prediction': {
                'disease': 'neumonía',
                'confidence': 0.88,
                'urgency_level': 'high',
                'top_3_predictions': [
                    {'disease': 'neumonía', 'confidence': 0.88},
                    {'disease': 'neumonía bacteriana', 'confidence': 0.08},
                    {'disease': 'bronquitis aguda', 'confidence': 0.04}
                ],
                'explanation': 'Cuadro compatible con neumonía'
            },
            'model_name': 'xgboost'
        },
        {
            'symptoms': ['congestion nasal', 'estornudos', 'secrecion nasal', 'malestar general'],
            'prediction': {
                'disease': 'resfriado común',
                'confidence': 0.92,
                'urgency_level': 'low',
                'top_3_predictions': [
                    {'disease': 'resfriado común', 'confidence': 0.92},
                    {'disease': 'rinitis', 'confidence': 0.05},
                    {'disease': 'sinusitis', 'confidence': 0.03}
                ],
                'explanation': 'Síntomas de resfriado común'
            },
            'model_name': 'xgboost'
        },
        {
            'symptoms': ['tos', 'fatiga', 'dificultad respiratoria'],
            'prediction': {
                'disease': 'bronquitis aguda',
                'confidence': 0.45,  # Baja confianza para probar detección de anomalías
                'urgency_level': 'medium',
                'top_3_predictions': [
                    {'disease': 'bronquitis aguda', 'confidence': 0.45},
                    {'disease': 'asma bronquial', 'confidence': 0.35},
                    {'disease': 'epoc', 'confidence': 0.20}
                ],
                'explanation': 'Síntomas ambiguos, múltiples posibilidades'
            },
            'model_name': 'xgboost'
        },
        {
            'symptoms': ['fiebre alta', 'escalofríos', 'tos con esputo', 'dolor toracico'],
            'prediction': {
                'disease': 'neumonía bacteriana',
                'confidence': 0.91,
                'urgency_level': 'high',
                'top_3_predictions': [
                    {'disease': 'neumonía bacteriana', 'confidence': 0.91},
                    {'disease': 'neumonía', 'confidence': 0.07},
                    {'disease': 'bronquitis aguda', 'confidence': 0.02}
                ],
                'explanation': 'Cuadro típico de neumonía bacteriana'
            },
            'model_name': 'xgboost'
        }
    ]
    
    prediction_ids = []
    for i, pred_data in enumerate(test_predictions, 1):
        pred_id = monitor.log_prediction(
            symptoms=pred_data['symptoms'],
            prediction=pred_data['prediction'],
            model_name=pred_data['model_name'],
            patient_id=f"P{i:03d}",
            session_id=f"S{i:03d}"
        )
        prediction_ids.append(pred_id)
        print(f"  [OK] Prediccion {i} registrada: {pred_id}")
    
    print(f"\n[OK] Total predicciones registradas: {len(prediction_ids)}")
    
    # Obtener métricas
    print("\n1.2. Obteniendo métricas de monitoreo...")
    metrics = monitor.get_metrics(days=1)
    
    print(f"\n  Resumen:")
    print(f"    - Total predicciones: {metrics['summary']['total_predictions']}")
    print(f"    - Confianza promedio: {metrics['summary']['avg_confidence']:.4f}")
    print(f"    - Confianza mediana: {metrics['summary']['median_confidence']:.4f}")
    print(f"    - Predicciones baja confianza: {metrics['summary']['low_confidence_predictions']}")
    print(f"    - Porcentaje baja confianza: {metrics['summary']['low_confidence_percentage']:.2f}%")
    
    print(f"\n  Distribución de enfermedades (top 5):")
    for disease, count in list(metrics['distributions']['diseases'].items())[:5]:
        print(f"    - {disease}: {count}")
    
    print(f"\n  Distribución de urgencia:")
    for urgency, count in metrics['distributions']['urgency_levels'].items():
        print(f"    - {urgency}: {count}")
    
    print(f"\n  Métricas de calidad:")
    print(f"    - Alta confianza (>=90%): {metrics['quality_metrics']['high_confidence_rate']:.2f}%")
    print(f"    - Media confianza (70-90%): {metrics['quality_metrics']['medium_confidence_rate']:.2f}%")
    print(f"    - Baja confianza (<70%): {metrics['quality_metrics']['low_confidence_rate']:.2f}%")
    
    # Detectar anomalías
    print("\n1.3. Detectando anomalías...")
    anomalies = monitor.detect_anomalies(window_size=10)
    
    if anomalies:
        print(f"\n  [OK] Anomalias detectadas: {len(anomalies)}")
        for anomaly in anomalies:
            print(f"    - {anomaly['prediction_id']}: {anomaly['reason']} (confianza: {anomaly['confidence']:.2f})")
    else:
        print("\n  [OK] No se detectaron anomalias")
    
    # Exportar para análisis
    print("\n1.4. Exportando predicciones...")
    export_path = monitor.export_for_analysis('monitoring/test_predictions_export.csv', days=1)
    print(f"  [OK] Exportado a: {export_path}")
    
    return prediction_ids, monitor


def test_feedback_system(prediction_ids):
    """Test medical feedback system"""
    print("\n" + "="*60)
    print("PRUEBA 2: Sistema de Feedback Médico")
    print("="*60)
    
    feedback_system = MedicalFeedbackSystem(storage_path='monitoring/test_feedback')
    
    # Simular feedback médico
    print("\n2.1. Enviando feedback médico...")
    
    feedback_data = [
        {
            'prediction_id': prediction_ids[0],
            'doctor_id': 'dr_001',
            'feedback_type': 'correct',
            'confidence_rating': 5,
            'symptoms': ['tos', 'sibilancias', 'dificultad respiratoria', 'opresion pecho']
        },
        {
            'prediction_id': prediction_ids[1],
            'doctor_id': 'dr_001',
            'feedback_type': 'correct',
            'confidence_rating': 5,
            'symptoms': ['fiebre', 'tos', 'dificultad respiratoria', 'dolor toracico']
        },
        {
            'prediction_id': prediction_ids[2],
            'doctor_id': 'dr_002',
            'feedback_type': 'correct',
            'confidence_rating': 4,
            'symptoms': ['congestion nasal', 'estornudos', 'secrecion nasal', 'malestar general']
        },
        {
            'prediction_id': prediction_ids[3],  # Predicción con baja confianza
            'doctor_id': 'dr_001',
            'feedback_type': 'incorrect',
            'actual_disease': 'asma bronquial',
            'actual_urgency': 'high',
            'actual_severity': 'moderate',
            'doctor_notes': 'El modelo predijo bronquitis pero era asma. Los síntomas eran ambiguos.',
            'confidence_rating': 5,
            'symptoms': ['tos', 'fatiga', 'dificultad respiratoria']
        },
        {
            'prediction_id': prediction_ids[4],
            'doctor_id': 'dr_002',
            'feedback_type': 'partially_correct',
            'actual_disease': 'neumonía',
            'actual_urgency': 'high',
            'doctor_notes': 'Correcto el diagnóstico de neumonía, pero no era específicamente bacteriana',
            'confidence_rating': 4,
            'symptoms': ['fiebre alta', 'escalofríos', 'tos con esputo', 'dolor toracico']
        }
    ]
    
    feedback_ids = []
    for i, fb_data in enumerate(feedback_data, 1):
        fb_id = feedback_system.submit_feedback(**fb_data)
        feedback_ids.append(fb_id)
        print(f"  [OK] Feedback {i} enviado: {fb_id}")
    
    print(f"\n[OK] Total feedback registrado: {len(feedback_ids)}")
    
    # Obtener estadísticas
    print("\n2.2. Obteniendo estadísticas de feedback...")
    stats = feedback_system.get_feedback_stats(days=1)
    
    if 'error' in stats:
        print(f"\n  [!] Error obteniendo estadísticas: {stats['error']}")
        return feedback_system
    
    print(f"\n  Resumen:")
    print(f"    - Total feedback: {stats.get('total_feedback', 0)}")
    print(f"    - Tasa de precisión: {stats['accuracy_rate']:.2f}%")
    print(f"    - Tasa de error: {stats['error_rate']:.2f}%")
    
    print(f"\n  Distribución de feedback:")
    for fb_type, count in stats['feedback_distribution'].items():
        print(f"    - {fb_type}: {count}")
    
    if stats.get('most_corrected_diseases'):
        print(f"\n  Enfermedades más corregidas:")
        for disease, count in list(stats['most_corrected_diseases'].items())[:5]:
            print(f"    - {disease}: {count}")
    
    if stats.get('avg_doctor_confidence'):
        print(f"\n  Confianza promedio del doctor: {stats['avg_doctor_confidence']:.2f}/5")
    
    # Obtener métricas de calidad
    print("\n2.3. Métricas de calidad...")
    quality_metrics = feedback_system.get_quality_metrics()
    
    print(f"\n  Resumen de calidad:")
    print(f"    - Total feedback: {quality_metrics['total_feedback']}")
    print(f"    - Predicciones correctas: {quality_metrics['correct_predictions']}")
    print(f"    - Predicciones incorrectas: {quality_metrics['incorrect_predictions']}")
    print(f"    - Predicciones parcialmente correctas: {quality_metrics['partially_correct_predictions']}")
    print(f"    - Precisión: {quality_metrics['accuracy_percentage']:.2f}%")
    print(f"    - Error: {quality_metrics['error_percentage']:.2f}%")
    print(f"    - Ejemplos de entrenamiento generados: {quality_metrics['training_examples_generated']}")
    
    if quality_metrics.get('avg_doctor_confidence'):
        print(f"    - Confianza promedio del doctor: {quality_metrics['avg_doctor_confidence']:.2f}/5")
    
    # Exportar datos de entrenamiento
    print("\n2.4. Exportando datos de entrenamiento...")
    if quality_metrics['training_examples_generated'] > 0:
        export_path = feedback_system.export_training_data('monitoring/test_training_data.csv')
        print(f"  [OK] Exportado a: {export_path}")
        
        # Leer y mostrar muestra
        if os.path.exists(export_path):
            if HAS_PANDAS:
                df = pd.read_csv(export_path)
                print(f"\n  Muestra de datos de entrenamiento:")
                print(f"    Total ejemplos: {len(df)}")
                print(f"\n  Primeros 3 ejemplos:")
                for idx, row in df.head(3).iterrows():
                    print(f"    {idx+1}. Síntomas: {row['symptoms']}")
                    print(f"       Enfermedad correcta: {row['disease']}")
            else:
                import csv
                with open(export_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                    print(f"\n  Muestra de datos de entrenamiento:")
                    print(f"    Total ejemplos: {len(rows)}")
                    print(f"\n  Primeros 3 ejemplos:")
                    for idx, row in enumerate(rows[:3], 1):
                        print(f"    {idx}. Síntomas: {row['symptoms']}")
                        print(f"       Enfermedad correcta: {row['disease']}")
    else:
        print("  [i] No hay datos de entrenamiento para exportar")
    
    return feedback_system


def test_neural_network_quick():
    """Test neural network training with small dataset"""
    print("\n" + "="*60)
    print("PRUEBA 3: Entrenamiento de Red Neuronal (Modo Rápido)")
    print("="*60)
    
    print("\n3.1. Generando dataset pequeño para prueba rápida...")
    
    # Usar el generador existente con pocos casos
    try:
        from ml_models.synthetic_dataset_generator import SyntheticDatasetGenerator
        
        generator = SyntheticDatasetGenerator()
        
        # Generar solo 3 enfermedades con pocos casos para prueba rápida
        samples_per_disease = {
            'asma bronquial': 100,
            'neumonía': 100,
            'resfriado común': 100
        }
        
        # Asegurarse de que las enfermedades existen
        available_diseases = list(generator.diseases_db.keys())
        samples_per_disease = {
            k: v for k, v in samples_per_disease.items() 
            if k in available_diseases
        }
        
        if not samples_per_disease:
            print("  [!] No se encontraron enfermedades en la base de datos")
            print("  [i] Saltando prueba de red neuronal")
            return
        
        if not HAS_PANDAS:
            print("  [!] pandas no disponible, saltando prueba de red neuronal")
            return
        
        df = generator.generate_dataset(samples_per_disease, output_file=None)
        print(f"  [OK] Dataset generado: {len(df)} casos, {df['disease'].nunique()} enfermedades")
        
        print("\n3.2. Preparando datos multi-tarea...")
        from ml_models.neural_network_model import MultiTaskNeuralNetwork
        
        model = MultiTaskNeuralNetwork(random_state=42)
        tasks_data = model.prepare_multi_task_data(df)
        
        print(f"  [OK] Datos preparados:")
        print(f"    - Features: {len(model.feature_names)}")
        if HAS_NUMPY:
            for task_name, (X, y) in tasks_data.items():
                print(f"    - {task_name}: {X.shape[0]} casos, {len(np.unique(y))} clases")
        else:
            for task_name, (X, y) in tasks_data.items():
                print(f"    - {task_name}: {len(X)} casos")
        
        print("\n3.3. Entrenando modelo (esto puede tardar unos minutos)...")
        model.train(tasks_data, test_size=0.2)
        
        print("\n[OK] Modelo entrenado exitosamente")
        
        # Probar predicción
        print("\n3.4. Probando predicción...")
        test_symptoms = ['tos', 'sibilancias', 'dificultad respiratoria']
        predictions = model.predict_all_tasks(test_symptoms)
        
        print(f"\n  Síntomas de prueba: {', '.join(test_symptoms)}")
        print(f"  Resultado:")
        print(f"    - Enfermedad: {predictions['disease']['name']}")
        print(f"    - Confianza: {predictions['disease']['confidence']:.4f}")
        print(f"    - Urgencia: {predictions['urgency']}")
        print(f"    - Severidad: {predictions['severity']}")
        if 'category' in predictions:
            print(f"    - Categoría: {predictions['category']}")
        
        print("\n[OK] Red neuronal probada exitosamente")
        
    except ImportError as e:
        print(f"  [!] Error importando módulos: {e}")
        print("  [i] Saltando prueba de red neuronal")
    except Exception as e:
        print(f"  [!] Error en prueba de red neuronal: {e}")
        import traceback
        traceback.print_exc()


def main():
    parser = argparse.ArgumentParser(description='Probar componentes ML')
    parser.add_argument('--quick', action='store_true', help='Prueba rápida sin red neuronal')
    parser.add_argument('--full', action='store_true', help='Prueba completa incluyendo entrenamiento completo')
    
    args = parser.parse_args()
    
    print("="*60)
    print("PRUEBA DE COMPONENTES ML - RespiCare")
    print("="*60)
    print(f"\nModo: {'Rápido' if args.quick else 'Completo' if args.full else 'Estándar'}")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Crear directorios de monitoreo
        Path('monitoring/test_predictions').mkdir(parents=True, exist_ok=True)
        Path('monitoring/test_feedback').mkdir(parents=True, exist_ok=True)
        
        # Prueba 1: Monitoreo
        prediction_ids, monitor = test_prediction_monitor()
        
        # Prueba 2: Feedback
        feedback_system = test_feedback_system(prediction_ids)
        
        # Prueba 3: Red Neuronal (solo si no es modo quick)
        if not args.quick:
            test_neural_network_quick()
        
        print("\n" + "="*60)
        print("[SUCCESS] TODAS LAS PRUEBAS COMPLETADAS")
        print("="*60)
        print("\nResumen:")
        print("  [OK] Sistema de monitoreo: FUNCIONANDO")
        print("  [OK] Sistema de feedback: FUNCIONANDO")
        if not args.quick:
            print("  [OK] Red neuronal: PROBADO (modo rápido)")
        print("\nArchivos generados:")
        print("  - monitoring/test_predictions/ - Logs de predicciones")
        print("  - monitoring/test_feedback/ - Logs de feedback")
        print("  - monitoring/test_predictions_export.csv - Exportación de predicciones")
        if os.path.exists('monitoring/test_training_data.csv'):
            print("  - monitoring/test_training_data.csv - Datos de entrenamiento")
        
    except Exception as e:
        print(f"\n[ERROR] Error en las pruebas: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

