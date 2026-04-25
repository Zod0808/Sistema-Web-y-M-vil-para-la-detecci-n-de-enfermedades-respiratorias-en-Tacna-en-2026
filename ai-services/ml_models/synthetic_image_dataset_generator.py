"""
Synthetic Dataset Generator for Medical Images
Generates synthetic training data for image analysis models to improve chatbot responses
"""

import random
import numpy as np
from typing import List, Dict, Any, Tuple
import json
import pandas as pd
from datetime import datetime


class SyntheticImageDatasetGenerator:
    """Generate synthetic dataset for medical image analysis"""
    
    def __init__(self):
        # Define image types and their characteristics
        self.image_types = {
            'chest_xray': {
                'conditions': [
                    'normal', 'pneumonia', 'pneumothorax', 'pleural_effusion',
                    'atelectasis', 'cardiomegaly', 'consolidation', 'edema',
                    'emphysema', 'fibrosis', 'mass', 'nodule', 'infiltration'
                ],
                'features': {
                    'opacity_level': (0.0, 1.0),
                    'lung_volume': (0.3, 1.0),
                    'heart_size': (0.4, 0.6),
                    'bone_density': (0.7, 1.0),
                    'soft_tissue_contrast': (0.5, 1.0)
                }
            },
            'ct_scan': {
                'conditions': [
                    'normal', 'pneumonia', 'pulmonary_embolism', 'lung_cancer',
                    'tuberculosis', 'bronchiectasis', 'interstitial_lung_disease',
                    'sarcoidosis', 'pneumothorax', 'pleural_effusion'
                ],
                'features': {
                    'density_range': (0.0, 1.0),
                    'contrast_enhancement': (0.0, 1.0),
                    'lesion_size': (0.0, 0.3),
                    'vessel_prominence': (0.3, 1.0),
                    'airway_wall_thickness': (0.1, 0.5)
                }
            },
            'spirometry': {
                'conditions': [
                    'normal', 'obstructive', 'restrictive', 'mixed',
                    'mild_obstruction', 'moderate_obstruction', 'severe_obstruction',
                    'mild_restriction', 'moderate_restriction', 'severe_restriction'
                ],
                'features': {
                    'fev1_fvc_ratio': (0.4, 1.0),
                    'fvc_percent': (0.3, 1.2),
                    'fev1_percent': (0.2, 1.2),
                    'flow_curve_shape': (0.0, 1.0),
                    'volume_curve_shape': (0.0, 1.0)
                }
            },
            'oximetry': {
                'conditions': [
                    'normal', 'mild_hypoxemia', 'moderate_hypoxemia', 'severe_hypoxemia',
                    'desaturation', 'nocturnal_hypoxemia', 'exercise_hypoxemia'
                ],
                'features': {
                    'spo2_level': (70.0, 100.0),
                    'pulse_rate': (50.0, 120.0),
                    'perfusion_index': (0.1, 10.0),
                    'variability': (0.0, 5.0),
                    'trend_direction': (-1.0, 1.0)
                }
            },
            'expectoration': {
                'conditions': [
                    'normal', 'mucoid', 'purulent', 'bloody', 'frothy',
                    'thick', 'thin', 'yellow', 'green', 'brown', 'clear'
                ],
                'features': {
                    'color_intensity': (0.0, 1.0),
                    'viscosity': (0.0, 1.0),
                    'volume': (0.0, 1.0),
                    'transparency': (0.0, 1.0),
                    'consistency': (0.0, 1.0)
                }
            },
            'skin_rash': {
                'conditions': [
                    'normal', 'erythema', 'urticaria', 'petechiae', 'purpura',
                    'eczema', 'dermatitis', 'allergic_reaction', 'viral_exanthem'
                ],
                'features': {
                    'redness_intensity': (0.0, 1.0),
                    'distribution': (0.0, 1.0),
                    'texture': (0.0, 1.0),
                    'elevation': (0.0, 1.0),
                    'symmetry': (0.0, 1.0)
                }
            },
            'cyanosis': {
                'conditions': [
                    'normal', 'mild_cyanosis', 'moderate_cyanosis', 'severe_cyanosis',
                    'peripheral', 'central', 'acrocyanosis'
                ],
                'features': {
                    'blue_intensity': (0.0, 1.0),
                    'location_score': (0.0, 1.0),
                    'symmetry': (0.0, 1.0),
                    'temperature': (0.0, 1.0),
                    'capillary_refill': (0.0, 3.0)
                }
            },
            'other_medical_image': {
                'conditions': [
                    'normal', 'abnormal', 'pathological', 'inconclusive',
                    'artifacts', 'poor_quality', 'diagnostic'
                ],
                'features': {
                    'quality_score': (0.0, 1.0),
                    'diagnostic_value': (0.0, 1.0),
                    'artifact_level': (0.0, 1.0),
                    'clarity': (0.0, 1.0),
                    'completeness': (0.0, 1.0)
                }
            }
        }
        
        # Medical interpretations for chatbot responses
        self.medical_interpretations = {
            'normal': {
                'severity': 'none',
                'urgency': 'low',
                'recommendation': 'No se observan anomalías significativas. Continúa con seguimiento regular.',
                'follow_up': 'Rutinario'
            },
            'pneumonia': {
                'severity': 'high',
                'urgency': 'high',
                'recommendation': 'Se observan signos compatibles con neumonía. Consulta médica urgente recomendada.',
                'follow_up': 'Inmediato'
            },
            'pneumothorax': {
                'severity': 'high',
                'urgency': 'critical',
                'recommendation': 'Posible neumotórax detectado. Busca atención médica de emergencia inmediatamente.',
                'follow_up': 'Emergencia'
            },
            'obstructive': {
                'severity': 'moderate',
                'urgency': 'medium',
                'recommendation': 'Patrón obstructivo detectado. Consulta con neumólogo para evaluación completa.',
                'follow_up': '1-2 semanas'
            },
            'mild_hypoxemia': {
                'severity': 'mild',
                'urgency': 'medium',
                'recommendation': 'Saturación de oxígeno ligeramente baja. Monitorea y consulta si empeora.',
                'follow_up': '1 semana'
            },
            'purulent': {
                'severity': 'moderate',
                'urgency': 'medium',
                'recommendation': 'Esputo purulento sugiere posible infección. Consulta médica recomendada.',
                'follow_up': '3-5 días'
            }
        }
    
    def generate_image_features(self, image_type: str, condition: str) -> Dict[str, Any]:
        """Generate synthetic features for a medical image"""
        if image_type not in self.image_types:
            image_type = 'other_medical_image'
        
        type_config = self.image_types[image_type]
        features_config = type_config['features']
        
        # Generate features based on condition
        features = {}
        for feature_name, (min_val, max_val) in features_config.items():
            # Adjust based on condition severity
            if condition == 'normal':
                # Normal values around middle-high range
                base_val = (min_val + max_val) / 2 + (max_val - min_val) * 0.2
                features[feature_name] = np.random.normal(base_val, (max_val - min_val) * 0.1)
            elif 'severe' in condition or 'critical' in condition:
                # Severe conditions push features to extremes
                features[feature_name] = np.random.normal(max_val * 0.8, max_val * 0.1)
            elif 'mild' in condition:
                # Mild conditions slightly elevated
                base_val = (min_val + max_val) / 2
                features[feature_name] = np.random.normal(base_val, (max_val - min_val) * 0.15)
            else:
                # Moderate conditions
                base_val = (min_val + max_val) / 2 + (max_val - min_val) * 0.1
                features[feature_name] = np.random.normal(base_val, (max_val - min_val) * 0.2)
            
            # Clamp to valid range
            features[feature_name] = np.clip(features[feature_name], min_val, max_val)
        
        return features
    
    def get_medical_interpretation(self, condition: str) -> Dict[str, Any]:
        """Get medical interpretation for chatbot response"""
        # Try exact match first
        if condition in self.medical_interpretations:
            return self.medical_interpretations[condition]
        
        # Try partial match
        for key, value in self.medical_interpretations.items():
            if key in condition.lower() or condition.lower() in key:
                return value
        
        # Default interpretation
        if 'severe' in condition.lower() or 'critical' in condition.lower():
            return {
                'severity': 'high',
                'urgency': 'high',
                'recommendation': 'Anomalía significativa detectada. Consulta médica recomendada.',
                'follow_up': 'Inmediato'
            }
        elif 'mild' in condition.lower():
            return {
                'severity': 'mild',
                'urgency': 'low',
                'recommendation': 'Anomalía leve detectada. Monitorea y consulta si persiste.',
                'follow_up': '1-2 semanas'
            }
        else:
            return {
                'severity': 'moderate',
                'urgency': 'medium',
                'recommendation': 'Anomalía detectada. Consulta médica recomendada.',
                'follow_up': '1 semana'
            }
    
    def generate_case(self, image_type: str, condition: str = None) -> Dict[str, Any]:
        """Generate a single synthetic image analysis case"""
        if image_type not in self.image_types:
            image_type = 'other_medical_image'
        
        type_config = self.image_types[image_type]
        
        # Select condition if not provided
        if condition is None:
            condition = random.choice(type_config['conditions'])
        
        # Generate features
        features = self.generate_image_features(image_type, condition)
        
        # Get medical interpretation
        interpretation = self.get_medical_interpretation(condition)
        
        # Calculate confidence based on feature consistency
        feature_variance = np.var(list(features.values()))
        confidence = max(0.6, min(0.99, 1.0 - feature_variance * 0.5))
        
        # Generate prediction scores (top 3 conditions)
        all_conditions = type_config['conditions']
        scores = []
        for c in all_conditions:
            if c == condition:
                score = confidence + random.uniform(0.0, 0.1)
            else:
                score = random.uniform(0.0, 0.3)
            scores.append((c, score))
        
        scores.sort(key=lambda x: x[1], reverse=True)
        top_predictions = scores[:3]
        
        case = {
            'image_type': image_type,
            'condition': condition,
            'features': json.dumps(features),
            'top_prediction': top_predictions[0][0],
            'confidence': confidence,
            'top_3_predictions': json.dumps([(p[0], float(p[1])) for p in top_predictions]),
            'severity': interpretation['severity'],
            'urgency': interpretation['urgency'],
            'recommendation': interpretation['recommendation'],
            'follow_up': interpretation['follow_up'],
            'timestamp': datetime.now().isoformat()
        }
        
        return case
    
    def generate_dataset(self, 
                        samples_per_type: Dict[str, int] = None,
                        output_file: str = None) -> pd.DataFrame:
        """
        Generate full synthetic dataset for medical images
        
        Args:
            samples_per_type: Dict mapping image types to number of samples
            output_file: Path to save CSV file
        
        Returns:
            DataFrame with synthetic image analysis cases
        """
        if samples_per_type is None:
            # Default: 500 samples per image type
            samples_per_type = {img_type: 500 for img_type in self.image_types.keys()}
        
        cases = []
        
        for image_type, num_samples in samples_per_type.items():
            if image_type not in self.image_types:
                continue
            
            type_config = self.image_types[image_type]
            conditions = type_config['conditions']
            
            # Distribute samples across conditions
            samples_per_condition = num_samples // len(conditions)
            remainder = num_samples % len(conditions)
            
            for condition in conditions:
                num_for_condition = samples_per_condition
                if remainder > 0:
                    num_for_condition += 1
                    remainder -= 1
                
                for _ in range(num_for_condition):
                    try:
                        case = self.generate_case(image_type, condition)
                        cases.append(case)
                    except Exception as e:
                        print(f"Error generating case for {image_type}/{condition}: {e}")
                        continue
        
        # Convert to DataFrame
        df = pd.DataFrame(cases)
        
        # Save if output file specified
        if output_file:
            df.to_csv(output_file, index=False)
            print(f"✅ Dataset saved to {output_file}: {len(df)} cases, {df['image_type'].nunique()} image types")
        
        return df


if __name__ == "__main__":
    generator = SyntheticImageDatasetGenerator()
    
    # Generate dataset
    samples_per_type = {
        'chest_xray': 1000,
        'ct_scan': 800,
        'spirometry': 600,
        'oximetry': 500,
        'expectoration': 400,
        'skin_rash': 300,
        'cyanosis': 200,
        'other_medical_image': 200
    }
    
    df = generator.generate_dataset(samples_per_type, 'synthetic_image_dataset.csv')
    print(f"\n📊 Dataset Summary:")
    print(f"Total cases: {len(df)}")
    print(f"Image types: {df['image_type'].nunique()}")
    print(f"\nCases per image type:")
    print(df['image_type'].value_counts())
    print(f"\nCases per condition (top 10):")
    print(df['condition'].value_counts().head(10))

