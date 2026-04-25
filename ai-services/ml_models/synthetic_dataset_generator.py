"""
Synthetic Dataset Generator for 124 Respiratory Diseases

Generates synthetic training data based on disease definitions with realistic variations.
"""

import random
from typing import List, Dict, Any
import json
import csv

# Try to import optional dependencies
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    print("Warning: pandas not available. Will use CSV module instead.")

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

# Import disease database
try:
    from data.respiratory_diseases_comprehensive import RESPIRATORY_DISEASES_DATABASE
except ImportError:
    # Create a minimal disease database for testing
    RESPIRATORY_DISEASES_DATABASE = {
        'asma bronquial': {
            'symptoms': ['tos', 'sibilancias', 'dificultad respiratoria', 'opresion pecho'],
            'urgency_level': 'high',
            'severity_level': 'moderate',
            'category': 'chronic'
        },
        'neumonía': {
            'symptoms': ['fiebre', 'tos', 'dificultad respiratoria', 'dolor toracico'],
            'urgency_level': 'high',
            'severity_level': 'high',
            'category': 'infectious'
        },
        'bronquitis aguda': {
            'symptoms': ['tos', 'congestion', 'fatiga', 'malestar'],
            'urgency_level': 'medium',
            'severity_level': 'moderate',
            'category': 'infectious'
        }
    }


class SyntheticDatasetGenerator:
    """Generate synthetic training data for ML models"""
    
    def __init__(self):
        self.diseases_db = RESPIRATORY_DISEASES_DATABASE
        self.symptom_keywords = self._extract_all_symptoms()
        
    def _extract_all_symptoms(self) -> List[str]:
        """Extract all unique symptoms from diseases database"""
        all_symptoms = set()
        for disease_info in self.diseases_db.values():
            symptoms = disease_info.get('symptoms', [])
            if isinstance(symptoms, str):
                # Split comma-separated symptoms
                for s in symptoms.split(','):
                    all_symptoms.add(s.strip().lower())
            elif isinstance(symptoms, list):
                for s in symptoms:
                    all_symptoms.add(s.lower())
        
        return sorted(list(all_symptoms))
    
    def generate_case(self, disease_name: str, common_disease: bool = True) -> Dict[str, Any]:
        """
        Generate a synthetic case for a specific disease
        
        Args:
            disease_name: Name of the disease
            common_disease: If True, generate 1000-5000 cases, else 100-500 cases
        
        Returns:
            Dict with case data
        """
        if disease_name not in self.diseases_db:
            raise ValueError(f"Disease {disease_name} not found in database")
        
        disease_info = self.diseases_db[disease_name]
        symptoms = disease_info.get('symptoms', [])
        
        # Convert symptoms to list if string
        if isinstance(symptoms, str):
            symptoms = [s.strip() for s in symptoms.split(',')]
        
        # Select symptoms for this case (60-100% of total symptoms)
        num_symptoms_to_use = random.randint(
            int(len(symptoms) * 0.6), 
            int(len(symptoms) * 1.0)
        )
        selected_symptoms = random.sample(symptoms, min(num_symptoms_to_use, len(symptoms)))
        
        # Add variations: similar symptoms, intensity variations, etc.
        final_symptoms = self._add_symptom_variations(selected_symptoms, disease_info)
        
        return {
            'disease': disease_name,
            'symptoms': final_symptoms,
            'urgency': disease_info.get('urgency_level', 'medium'),
            'severity': disease_info.get('severity_level', 'moderate'),
            'category': disease_info.get('category', 'general'),
            'patient_age': random.randint(1, 100),
            'symptom_count': len(final_symptoms)
        }
    
    def _add_symptom_variations(self, symptoms: List[str], disease_info: Dict) -> List[str]:
        """Add realistic variations to symptoms"""
        variations = []
        
        for symptom in symptoms:
            # Add intensity variations
            intensity = random.choice(['leve', 'moderado', 'intenso', ''])
            if intensity:
                variations.append(f"{symptom} {intensity}")
            else:
                variations.append(symptom)
            
            # Add duration variations (10% chance)
            if random.random() < 0.1:
                duration = random.choice(['', 'desde hace días', 'desde hace semanas', 'intermitente'])
                if duration:
                    variations[-1] = f"{variations[-1]} {duration}"
        
        return variations
    
    def generate_dataset(self, 
                        samples_per_disease: Dict[str, int] = None,
                        output_file: str = None) -> pd.DataFrame:
        """
        Generate full synthetic dataset
        
        Args:
            samples_per_disease: Dict mapping disease names to number of samples
            output_file: Path to save CSV file
        
        Returns:
            DataFrame with synthetic cases
        """
        cases = []
        
        # Default: 2000 for common diseases, 300 for rare diseases
        if samples_per_disease is None:
            common_diseases = [
                # More common respiratory diseases
                'influenza a', 'influenza b', 'resfriado común', 'asma', 'bronquitis',
                'neumonía', 'sinusitis', 'faringitis', 'laringitis', 'rinitis',
                'epoc', 'covid-19', 'bronquitis aguda', 'neumonía viral',
                'neumonía bacteriana', 'gripe', 'enfisema'
            ]
            
            samples_per_disease = {}
            for disease in self.diseases_db.keys():
                if any(common in disease.lower() for common in common_diseases):
                    samples_per_disease[disease] = random.randint(1000, 5000)
                else:
                    samples_per_disease[disease] = random.randint(100, 500)
        
        # Generate cases
        for disease_name, num_samples in samples_per_disease.items():
            if disease_name in self.diseases_db:
                for _ in range(num_samples):
                    try:
                        case = self.generate_case(disease_name)
                        cases.append(case)
                    except Exception as e:
                        print(f"Error generating case for {disease_name}: {e}")
                        continue
        
        # Convert to DataFrame
        df = pd.DataFrame(cases)
        
        # Save if output file specified
        if output_file:
            df.to_csv(output_file, index=False)
            print(f"Dataset saved to {output_file}")
            print(f"Total cases: {len(df)}")
            print(f"Diseases covered: {df['disease'].nunique()}")
        
        return df
    
    def get_feature_vector(self, symptoms: List[str]) -> np.ndarray:
        """
        Convert symptoms list to feature vector (binary encoding)
        
        Args:
            symptoms: List of symptom strings
        
        Returns:
            Binary feature vector indicating presence of symptoms
        """
        # Create binary vector for symptom presence
        feature_vector = np.zeros(len(self.symptom_keywords))
        
        symptoms_lower = [s.lower() for s in symptoms]
        for i, keyword in enumerate(self.symptom_keywords):
            if any(keyword in sym for sym in symptoms_lower):
                feature_vector[i] = 1
        
        return feature_vector
    
    def augment_synthetic_data(self, disease_name: str, n_samples: int = 100) -> List[Dict[str, Any]]:
        """Generate augmented synthetic data for data balancing"""
        cases = []
        for _ in range(n_samples):
            case = self.generate_case(disease_name)
            cases.append(case)
        return cases


if __name__ == "__main__":
    # Generate synthetic dataset
    generator = SyntheticDatasetGenerator()
    
    print(f"Total diseases in database: {len(generator.diseases_db)}")
    print(f"Total unique symptoms: {len(generator.symptom_keywords)}")
    
    # Generate small test dataset
    df = generator.generate_dataset(
        samples_per_disease={'asma bronquial': 50, 'neumonía': 50}
    )
    
    print("\nSample dataset:")
    print(df.head())
    print(f"\nDataset shape: {df.shape}")

