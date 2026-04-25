"""
Script para Generar Dataset Extendido

Genera un dataset más grande con más casos para mejorar la precisión del modelo.
Aumenta el número de casos por enfermedad y añade más variaciones.

Usage:
    python generate_extended_dataset.py [--output DATASET.csv] [--multiplier 2.0]
"""

import argparse
import random
import csv
from typing import List, Dict, Any
from pathlib import Path

# Definir enfermedades comunes que deberían tener más casos
COMMON_DISEASES = [
    'asma bronquial', 'neumonía', 'bronquitis aguda', 'resfriado común',
    'sinusitis', 'faringitis', 'laringitis', 'influenza a (h1n1)', 
    'influenza a (h3n2)', 'influenza b', 'bronquiolitis aguda', 
    'epoc', 'rinitis', 'bronquitis crónica', 'asma', 'covid-19'
]


def parse_disease_list():
    """Parse the disease list from the original generator"""
    disease_data = [
        ('Rinofaringitis aguda (resfriado común)', 'resfriado común', 'Congestión nasal, estornudos, dolor de garganta leve, secreción nasal, malestar general, fiebre leve', 'baja', 'leve'),
        ('Sinusitis aguda', 'sinusitis', 'Dolor facial, presión en senos paranasales, secreción nasal espesa, congestión, dolor de cabeza, fiebre', 'media', 'moderada'),
        ('Faringitis aguda', 'faringitis', 'Dolor de garganta intenso, dificultad para tragar, enrojecimiento faríngeo, fiebre, malestar general', 'media', 'moderada'),
        ('Amigdalitis aguda', 'amigdalitis', 'Dolor intenso de garganta, amígdalas inflamadas, placas blancas o amarillas, fiebre alta, dificultad para tragar', 'alta', 'alta'),
        ('Laringitis aguda', 'laringitis', 'Ronquera, pérdida de voz, dolor de garganta, tos seca, sensación de irritación en garganta', 'baja', 'leve'),
        ('Traqueítis aguda', 'traqueitis', 'Tos profunda y seca, dolor retroesternal, fiebre, dificultad respiratoria leve', 'media', 'moderada'),
        ('Laringitis obstructiva aguda (crup)', 'crup', 'Tos perruna o metálica, estridor inspiratorio, ronquera, dificultad respiratoria, fiebre', 'alta', 'alta'),
        ('Rinitis', 'rinitis', 'Estornudos frecuentes, picazón nasal, congestión, secreción acuosa, lagrimeo, picazón en ojos', 'baja', 'leve'),
        ('Influenza A (H1N1)', 'influenza h1n1', 'Fiebre alta súbita, escalofríos, dolor muscular intenso, fatiga extrema, tos seca, dolor de cabeza', 'alta', 'alta'),
        ('Influenza A (H3N2)', 'influenza h3n2', 'Fiebre alta, mialgias, tos, fatiga, dolor de cabeza', 'alta', 'alta'),
        ('Influenza B', 'influenza b', 'Fiebre, dolores musculares, tos, dolor de garganta, fatiga, síntomas gastrointestinales ocasionales', 'media', 'moderada'),
        ('Neumonía viral', 'neumonia viral', 'Fiebre, tos seca progresiva, dificultad respiratoria, dolor torácico, fatiga', 'alta', 'alta'),
        ('Neumonía por Streptococcus pneumoniae', 'neumonia estreptococo', 'Fiebre alta, escalofríos, tos con esputo oxidado, dolor torácico pleurítico, taquipnea', 'alta', 'alta'),
        ('Neumonía bacteriana', 'neumonia bacteriana', 'Fiebre alta, tos con esputo purulento, dolor torácico, dificultad respiratoria, escalofríos', 'alta', 'alta'),
        ('Neumonía grave', 'neumonia grave', 'Fiebre alta, dificultad respiratoria marcada, taquipnea, cianosis, confusión, requiere hospitalización', 'critica', 'muy alta'),
        ('Bronquitis aguda', 'bronquitis aguda', 'Tos persistente seca o productiva, dolor torácico al toser, fatiga, fiebre leve, sibilancias', 'media', 'moderada'),
        ('Bronquiolitis aguda', 'bronquiolitis aguda', 'Tos, sibilancias, dificultad respiratoria, taquipnea, tiraje intercostal, fiebre', 'alta', 'alta'),
        ('Bronquitis crónica simple', 'bronquitis cronica', 'Tos productiva persistente, esputo claro o blanco, sin sibilancias', 'baja', 'leve'),
        ('EPOC', 'epoc', 'Disnea progresiva, tos crónica, esputo, sibilancias, infecciones frecuentes, fatiga, pérdida de peso', 'alta', 'moderada'),
        ('Asma bronquial', 'asma bronquial', 'Sibilancias recurrentes, dificultad respiratoria episódica, tos nocturna, opresión torácica', 'alta', 'moderada'),
        ('Estado asmático', 'estado asmatico', 'Crisis asmática severa, dificultad respiratoria extrema, sibilancias intensas, cianosis, ansiedad', 'critica', 'muy alta'),
        ('Bronquiectasia', 'bronquiectasia', 'Tos crónica con esputo abundante purulento, hemoptisis, infecciones recurrentes, disnea', 'alta', 'moderada'),
        ('COVID-19', 'covid-19', 'Fiebre, tos seca, fatiga, pérdida de olfato/gusto, dificultad respiratoria, dolor muscular', 'alta', 'alta'),
        ('Virus Sincitial Respiratorio (VSR)', 'vsr', 'Congestión nasal, tos, fiebre, sibilancias, dificultad respiratoria en lactantes', 'alta', 'alta'),
        ('Tuberculosis pulmonar', 'tuberculosis', 'Tos persistente, esputo con sangre, fiebre vespertina, sudoración nocturna, pérdida de peso', 'alta', 'alta'),
        ('Tos ferina', 'tos ferina', 'Tos paroxística violenta, estridor inspiratorio, vómitos post-tusivos, apnea en lactantes', 'alta', 'alta'),
    ]
    
    return disease_data


def generate_case(disease_info: tuple, variation_factor: float = 1.0) -> Dict[str, Any]:
    """Generate a single synthetic case with variations"""
    name, code, symptoms_text, urgency, severity = disease_info
    
    # Parse symptoms
    symptoms_list = [s.strip() for s in symptoms_text.split(',')]
    
    # Select random subset of symptoms (varía según factor)
    min_symptoms = max(1, int(len(symptoms_list) * 0.5))
    max_symptoms = len(symptoms_list)
    num_to_select = random.randint(min_symptoms, max_symptoms)
    selected_symptoms = random.sample(symptoms_list, num_to_select)
    
    # Add variations with different intensities
    final_symptoms = []
    for symptom in selected_symptoms:
        # Add intensity variations (más variaciones)
        intensity = random.choice(['', ' leve', ' moderado', ' intenso', ' muy intenso', ' severo'])
        final_symptoms.append(f"{symptom}{intensity}")
        
        # Add duration variations (10-20% of cases)
        if random.random() < (0.1 * variation_factor):
            duration = random.choice(['', ' desde hace horas', ' desde hace días', ' desde hace semanas', ' intermitente', ' constante'])
            if duration:
                final_symptoms[-1] = f"{final_symptoms[-1]}{duration}"
    
    # Add some noise symptoms occasionally (5% chance)
    noise_symptoms = ['malestar general', 'cansancio', 'debilidad', 'mareos leves']
    if random.random() < (0.05 * variation_factor):
        noise = random.choice(noise_symptoms)
        if noise not in final_symptoms:
            final_symptoms.append(noise)
    
    return {
        'disease': code,
        'disease_name': name,
        'symptoms': ', '.join(final_symptoms),
        'urgency': urgency,
        'severity': severity,
        'category': 'general',
        'patient_age': random.randint(1, 100),
        'symptom_count': len(final_symptoms)
    }


def generate_extended_dataset(output_file: str = 'synthetic_dataset_extended.csv', 
                             multiplier: float = 2.0):
    """Generate extended synthetic dataset with more cases"""
    print(f"Generando dataset extendido (multiplicador: {multiplier}x)...")
    
    disease_data = parse_disease_list()
    cases = []
    
    for disease_info in disease_data:
        name, code, _, urgency, _ = disease_info
        
        # Determine number of samples (increased)
        is_common = any(common in name.lower() or common in code for common in COMMON_DISEASES)
        
        if is_common:
            # Common diseases: 2000-10000 cases (was 1000-5000)
            base_min, base_max = 2000, 10000
            num_samples = int(random.randint(base_min, base_max) * multiplier)
        else:
            # Rare diseases: 200-1000 cases (was 100-500)
            base_min, base_max = 200, 1000
            num_samples = int(random.randint(base_min, base_max) * multiplier)
        
        print(f"Generando {num_samples} casos para: {name}")
        
        for _ in range(num_samples):
            case = generate_case(disease_info, variation_factor=1.5)  # More variations
            cases.append(case)
    
    # Write to CSV
    fieldnames = ['disease', 'disease_name', 'symptoms', 'urgency', 'severity', 'category', 'patient_age', 'symptom_count']
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cases)
    
    print(f"\n[OK] Dataset extendido generado exitosamente!")
    print(f"Total casos: {len(cases)}")
    print(f"Enfermedades: {len(disease_data)}")
    print(f"Archivo de salida: {output_file}")
    
    # Statistics
    disease_counts = {}
    for case in cases:
        disease = case['disease']
        disease_counts[disease] = disease_counts.get(disease, 0) + 1
    
    print(f"\nEstadisticas por enfermedad:")
    for disease, count in sorted(disease_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {disease}: {count} casos")
    
    return cases


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generar dataset extendido para mejor precision')
    parser.add_argument('--output', type=str, default='synthetic_dataset_extended.csv',
                       help='Archivo de salida CSV')
    parser.add_argument('--multiplier', type=float, default=2.0,
                       help='Multiplicador para aumentar casos (default: 2.0 = doble)')
    
    args = parser.parse_args()
    
    generate_extended_dataset(args.output, args.multiplier)

