"""
Synthetic Dataset Generator for Cough Analysis
Generates synthetic training data for cough analysis models to improve chatbot responses
"""

import random
import numpy as np
from typing import List, Dict, Any
import json
import pandas as pd
from datetime import datetime


class SyntheticCoughDatasetGenerator:
    """Generate synthetic dataset for cough audio analysis"""
    
    def __init__(self):
        # Define cough types and their characteristics
        self.cough_types = {
            'dry_cough': {
                'severity_levels': ['mild', 'moderate', 'severe'],
                'characteristics': ['Tos seca', 'Alta frecuencia', 'Sin producción'],
                'audio_features': {
                    'duration': (0.3, 2.0),  # seconds
                    'spectral_centroid': (2500, 5000),  # Hz (high frequency)
                    'spectral_bandwidth': (2000, 4000),
                    'zero_crossing_rate': (0.1, 0.2),
                    'rms_mean': (0.05, 0.15),
                    'rms_max': (0.1, 0.3),
                    'mfcc_1': (-5, 5),
                    'mfcc_2': (-3, 3),
                    'mfcc_3': (-2, 2)
                },
                'medical_context': {
                    'common_causes': ['asma', 'alergia', 'irritación', 'reflujo'],
                    'urgency_base': 'medium'
                }
            },
            'productive_cough': {
                'severity_levels': ['mild', 'moderate', 'severe'],
                'characteristics': ['Tos productiva', 'Baja frecuencia', 'Con producción'],
                'audio_features': {
                    'duration': (1.0, 5.0),  # seconds (longer)
                    'spectral_centroid': (800, 2000),  # Hz (low frequency)
                    'spectral_bandwidth': (1000, 3000),
                    'zero_crossing_rate': (0.05, 0.15),
                    'rms_mean': (0.1, 0.3),
                    'rms_max': (0.2, 0.5),
                    'mfcc_1': (-10, 0),
                    'mfcc_2': (-5, 2),
                    'mfcc_3': (-3, 1)
                },
                'medical_context': {
                    'common_causes': ['infección', 'bronquitis', 'neumonía', 'epoc'],
                    'urgency_base': 'medium'
                }
            },
            'paroxysmal_cough': {
                'severity_levels': ['moderate', 'severe'],
                'characteristics': ['Tos paroxística', 'Múltiples episodios', 'Alta variabilidad'],
                'audio_features': {
                    'duration': (2.0, 8.0),  # seconds (longest)
                    'spectral_centroid': (1500, 3500),  # Hz (variable)
                    'spectral_bandwidth': (2500, 5000),  # High variability
                    'zero_crossing_rate': (0.12, 0.25),
                    'rms_mean': (0.15, 0.35),
                    'rms_max': (0.3, 0.6),
                    'mfcc_1': (-8, 3),
                    'mfcc_2': (-4, 4),
                    'mfcc_3': (-2, 3)
                },
                'medical_context': {
                    'common_causes': ['pertussis', 'asma severa', 'bronquitis crónica'],
                    'urgency_base': 'high'
                }
            },
            'chronic_cough': {
                'severity_levels': ['mild', 'moderate'],
                'characteristics': ['Tos crónica', 'Duración prolongada', 'Patrón consistente'],
                'audio_features': {
                    'duration': (1.5, 4.0),
                    'spectral_centroid': (1200, 2500),
                    'spectral_bandwidth': (1500, 3000),
                    'zero_crossing_rate': (0.08, 0.18),
                    'rms_mean': (0.08, 0.25),
                    'rms_max': (0.15, 0.4),
                    'mfcc_1': (-7, 2),
                    'mfcc_2': (-4, 3),
                    'mfcc_3': (-2, 2)
                },
                'medical_context': {
                    'common_causes': ['epoc', 'asma crónica', 'reflujo crónico', 'medicamentos'],
                    'urgency_base': 'medium'
                }
            },
            'whooping_cough': {
                'severity_levels': ['severe'],
                'characteristics': ['Tos convulsiva', 'Sonido característico', 'Muy intensa'],
                'audio_features': {
                    'duration': (3.0, 10.0),
                    'spectral_centroid': (2000, 4000),
                    'spectral_bandwidth': (3000, 6000),
                    'zero_crossing_rate': (0.15, 0.3),
                    'rms_mean': (0.2, 0.4),
                    'rms_max': (0.4, 0.7),
                    'mfcc_1': (-5, 5),
                    'mfcc_2': (-3, 4),
                    'mfcc_3': (-2, 3)
                },
                'medical_context': {
                    'common_causes': ['pertussis', 'infección bacteriana'],
                    'urgency_base': 'critical'
                }
            },
            'barking_cough': {
                'severity_levels': ['moderate', 'severe'],
                'characteristics': ['Tos perruna', 'Alta frecuencia', 'Sonido característico'],
                'audio_features': {
                    'duration': (0.5, 3.0),
                    'spectral_centroid': (3000, 5000),
                    'spectral_bandwidth': (2500, 4500),
                    'zero_crossing_rate': (0.12, 0.22),
                    'rms_mean': (0.1, 0.25),
                    'rms_max': (0.2, 0.45),
                    'mfcc_1': (-4, 4),
                    'mfcc_2': (-2, 3),
                    'mfcc_3': (-1, 2)
                },
                'medical_context': {
                    'common_causes': ['crup', 'laringitis', 'infección viral'],
                    'urgency_base': 'high'
                }
            }
        }
        
        # Medical recommendations based on cough type and severity
        self.recommendations = {
            'dry_cough': {
                'mild': [
                    'Mantén hidratación adecuada',
                    'Evita irritantes como humo y polvo',
                    'Usa humidificador en tu habitación',
                    'Monitorea si la tos persiste más de 1 semana'
                ],
                'moderate': [
                    'Consulta con un médico si la tos persiste más de 3 días',
                    'Evita esfuerzos físicos hasta que la tos mejore',
                    'Considera medicamentos para la tos seca (bajo supervisión médica)',
                    'Monitorea otros síntomas como dificultad respiratoria'
                ],
                'severe': [
                    'Consulta médica urgente recomendada',
                    'Evita cualquier actividad física',
                    'Busca atención inmediata si hay dificultad respiratoria',
                    'Monitorea signos de empeoramiento'
                ]
            },
            'productive_cough': {
                'mild': [
                    'Mantén hidratación adecuada para facilitar la expectoración',
                    'Evita supresores de tos (la tos productiva ayuda a limpiar las vías)',
                    'Descansa y evita esfuerzos',
                    'Consulta si el esputo cambia de color o persiste más de 1 semana'
                ],
                'moderate': [
                    'Consulta médica recomendada (puede indicar infección)',
                    'Monitorea el color y cantidad del esputo',
                    'Evita contacto cercano con otras personas',
                    'Descansa y mantén buena hidratación'
                ],
                'severe': [
                    'Consulta médica urgente (puede indicar neumonía u otra infección grave)',
                    'Busca atención inmediata si hay fiebre alta o dificultad respiratoria',
                    'Monitorea signos de empeoramiento',
                    'Evita contacto con otras personas'
                ]
            },
            'paroxysmal_cough': {
                'moderate': [
                    'Consulta médica recomendada (puede ser pertussis u otra condición)',
                    'Monitorea la frecuencia y duración de los episodios',
                    'Descansa entre episodios',
                    'Busca atención si los episodios empeoran'
                ],
                'severe': [
                    'Consulta médica urgente',
                    'Puede requerir tratamiento específico',
                    'Monitorea signos de dificultad respiratoria',
                    'Busca atención de emergencia si hay cianosis o dificultad para respirar'
                ]
            },
            'whooping_cough': {
                'severe': [
                    'Consulta médica URGENTE - puede ser pertussis',
                    'Requiere tratamiento médico específico',
                    'Busca atención de emergencia si hay dificultad respiratoria',
                    'Puede ser contagioso - evita contacto con otros'
                ]
            }
        }
    
    def generate_audio_features(self, cough_type: str, severity: str) -> Dict[str, Any]:
        """Generate synthetic audio features for a cough type"""
        if cough_type not in self.cough_types:
            cough_type = 'dry_cough'
        
        type_config = self.cough_types[cough_type]
        features_config = type_config['audio_features']
        
        features = {}
        for feature_name, (min_val, max_val) in features_config.items():
            # Adjust based on severity
            if severity == 'mild':
                base_val = min_val + (max_val - min_val) * 0.3
                std = (max_val - min_val) * 0.1
            elif severity == 'moderate':
                base_val = min_val + (max_val - min_val) * 0.5
                std = (max_val - min_val) * 0.15
            else:  # severe
                base_val = min_val + (max_val - min_val) * 0.7
                std = (max_val - min_val) * 0.2
            
            features[feature_name] = np.random.normal(base_val, std)
            # Clamp to valid range
            features[feature_name] = np.clip(features[feature_name], min_val * 0.8, max_val * 1.2)
        
        return features
    
    def determine_urgency(self, cough_type: str, severity: str, features: Dict[str, Any]) -> str:
        """Determine urgency level based on cough type, severity, and features"""
        type_config = self.cough_types[cough_type]
        base_urgency = type_config['medical_context']['urgency_base']
        
        # Adjust based on severity
        if severity == 'severe':
            if base_urgency == 'low':
                return 'medium'
            elif base_urgency == 'medium':
                return 'high'
            else:
                return 'critical'
        elif severity == 'moderate':
            if base_urgency == 'low':
                return 'low'
            elif base_urgency == 'medium':
                return 'medium'
            else:
                return 'high'
        else:  # mild
            return base_urgency if base_urgency != 'critical' else 'high'
    
    def generate_case(self, cough_type: str = None, severity: str = None) -> Dict[str, Any]:
        """Generate a single synthetic cough analysis case"""
        # Select cough type if not provided
        if cough_type is None:
            cough_type = random.choice(list(self.cough_types.keys()))
        
        type_config = self.cough_types[cough_type]
        
        # Select severity if not provided
        if severity is None:
            severity = random.choice(type_config['severity_levels'])
        
        # Generate audio features
        features = self.generate_audio_features(cough_type, severity)
        
        # Determine urgency
        urgency = self.determine_urgency(cough_type, severity, features)
        
        # Get recommendations
        recommendations = self.recommendations.get(cough_type, {}).get(severity, [
            'Consulta con un médico',
            'Monitorea la tos',
            'Mantén hidratación adecuada'
        ])
        
        # Calculate confidence based on feature consistency
        feature_variance = np.var(list(features.values()))
        confidence = max(0.65, min(0.98, 1.0 - feature_variance * 0.3))
        
        # Get characteristics
        characteristics = type_config['characteristics'].copy()
        if severity == 'severe':
            characteristics.append('Tos intensa')
        if features['duration'] > 5.0:
            characteristics.append('Tos prolongada')
        if features['rms_max'] > 0.4:
            characteristics.append('Tos de alta intensidad')
        
        case = {
            'cough_type': cough_type,
            'severity': severity,
            'urgency': urgency,
            'detected': True,
            'characteristics': json.dumps(characteristics),
            'recommendations': json.dumps(recommendations),
            'confidence': confidence,
            'audio_features': json.dumps(features),
            'duration_seconds': features['duration'],
            'frequency_range': 'high' if features['spectral_centroid'] > 2500 else 'low' if features['spectral_centroid'] < 1500 else 'medium',
            'energy_level': 'high' if features['rms_max'] > 0.3 else 'low' if features['rms_mean'] < 0.05 else 'medium',
            'timestamp': datetime.now().isoformat()
        }
        
        return case
    
    def generate_dataset(self,
                        samples_per_type: Dict[str, int] = None,
                        output_file: str = None) -> pd.DataFrame:
        """
        Generate full synthetic dataset for cough analysis
        
        Args:
            samples_per_type: Dict mapping cough types to number of samples
            output_file: Path to save CSV file
        
        Returns:
            DataFrame with synthetic cough analysis cases
        """
        if samples_per_type is None:
            # Default: 300 samples per cough type
            samples_per_type = {cough_type: 300 for cough_type in self.cough_types.keys()}
        
        cases = []
        
        for cough_type, num_samples in samples_per_type.items():
            if cough_type not in self.cough_types:
                continue
            
            type_config = self.cough_types[cough_type]
            severities = type_config['severity_levels']
            
            # Distribute samples across severities
            samples_per_severity = num_samples // len(severities)
            remainder = num_samples % len(severities)
            
            for severity in severities:
                num_for_severity = samples_per_severity
                if remainder > 0:
                    num_for_severity += 1
                    remainder -= 1
                
                for _ in range(num_for_severity):
                    try:
                        case = self.generate_case(cough_type, severity)
                        cases.append(case)
                    except Exception as e:
                        print(f"Error generating case for {cough_type}/{severity}: {e}")
                        continue
        
        # Convert to DataFrame
        df = pd.DataFrame(cases)
        
        # Save if output file specified
        if output_file:
            df.to_csv(output_file, index=False)
            print(f"✅ Dataset saved to {output_file}: {len(df)} cases, {df['cough_type'].nunique()} cough types")
        
        return df


if __name__ == "__main__":
    generator = SyntheticCoughDatasetGenerator()
    
    # Generate dataset
    samples_per_type = {
        'dry_cough': 500,
        'productive_cough': 500,
        'paroxysmal_cough': 300,
        'chronic_cough': 400,
        'whooping_cough': 200,
        'barking_cough': 300
    }
    
    df = generator.generate_dataset(samples_per_type, 'synthetic_cough_dataset.csv')
    print(f"\n📊 Dataset Summary:")
    print(f"Total cases: {len(df)}")
    print(f"Cough types: {df['cough_type'].nunique()}")
    print(f"\nCases per cough type:")
    print(df['cough_type'].value_counts())
    print(f"\nCases per severity:")
    print(df['severity'].value_counts())
    print(f"\nCases per urgency:")
    print(df['urgency'].value_counts())

