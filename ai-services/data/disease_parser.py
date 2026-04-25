"""
Disease Parser - Parse and structure all 124 respiratory diseases from markdown
"""

import re
from typing import Dict, List, Any

def parse_diseases_markdown(file_path: str) -> List[Dict[str, Any]]:
    """Parse diseases from markdown file and return structured data"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        diseases = []
        current_section = None
        
        lines = content.split('\n')
        
        for line in lines:
            # Detect section headers
            if line.startswith('## '):
                current_section = line.replace('## ', '').strip()
                continue
            
            # Skip empty lines and comments
            if not line.strip() or line.startswith('#'):
                continue
            
            # Parse disease entry: "Number. **Name**: Symptoms..."
            match = re.match(r'(\d+)\.\s*\*\*(.*?)\*\*:\s*(.+)', line)
            if match:
                number, name, symptoms_text = match.groups()
                
                # Extract symptoms
                symptoms = [s.strip() for s in symptoms_text.split(',')]
                symptoms = [s for s in symptoms if s]
                
                # Determine urgency based on keywords
                urgency = determine_urgency(symptoms_text)
                severity = determine_severity(symptoms_text)
                
                disease_data = {
                    'id': int(number),
                    'nombre': name.strip(),
                    'categoria': current_section,
                    'sintomas': symptoms,
                    'sintomas_text': symptoms_text,
                    'urgencia': urgency,
                    'severidad': severity,
                    'keywords': extract_keywords(symptoms_text)
                }
                
                diseases.append(disease_data)
        
        return diseases
    
    except Exception as e:
        print(f"Error parsing diseases: {e}")
        return []


def determine_urgency(symptoms_text: str) -> str:
    """Determine urgency level based on symptom keywords"""
    text_lower = symptoms_text.lower()
    
    # Critical urgency indicators
    critical_keywords = [
        'insuficiencia respiratoria', 'shock séptico', 'falla multiorgánica',
        'cianosis severa', 'alteración de conciencia', 'dificultad extrema',
        'urgente', 'emergencia'
    ]
    
    if any(kw in text_lower for kw in critical_keywords):
        return 'critica'
    
    # High urgency indicators
    high_keywords = [
        'dificultad respiratoria marcada', 'taquipnea', 'hipotensión',
        'requiere hospitalización', 'dificultad respiratoria severa'
    ]
    
    if any(kw in text_lower for kw in high_keywords):
        return 'alta'
    
    # Medium urgency indicators
    medium_keywords = [
        'fiebre alta', 'dolor intenso', 'dificultad respiratoria',
        'confusión', 'fiebre moderada'
    ]
    
    if any(kw in text_lower for kw in medium_keywords):
        return 'media'
    
    # Default to low
    return 'baja'


def determine_severity(symptoms_text: str) -> str:
    """Determine severity level based on symptom keywords"""
    text_lower = symptoms_text.lower()
    
    # Extreme severity
    if any(kw in text_lower for kw in ['extrema', 'intenso', 'marcada', 'severa', 'aguda']):
        return 'extrema'
    
    # High severity
    if any(kw in text_lower for kw in ['alta', 'intenso', 'grave', 'considerable']):
        return 'alta'
    
    # Moderate severity
    if any(kw in text_lower for kw in ['moderada', 'moderado', 'medio']):
        return 'moderada'
    
    # Default to mild
    return 'leve'


def extract_keywords(symptoms_text: str) -> List[str]:
    """Extract important keywords from symptoms text"""
    # Common medical keywords
    keywords = []
    
    symptoms_lower = symptoms_text.lower()
    
    # Extract key symptoms
    key_terms = [
        'tos', 'fiebre', 'dolor', 'dificultad respiratoria', 'disnea',
        'esputo', 'flema', 'fatiga', 'escalofríos', 'cianosis', 'hemoptisis',
        'sibilancias', 'sibilancia', 'dolor torácico', 'dolor de pecho',
        'estridor', 'taquipnea', 'congestión', 'secreción nasal', 'ronquera',
        'confusión', 'vómito', 'náusea', 'diarrea'
    ]
    
    for term in key_terms:
        if term in symptoms_lower:
            keywords.append(term)
    
    return keywords


def build_disease_database(diseases: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build a searchable disease database with symptom mapping"""
    database = {
        'diseases': diseases,
        'symptom_to_diseases': {},
        'urgency_mapping': {},
        'category_mapping': {}
    }
    
    # Build symptom to diseases mapping
    for disease in diseases:
        # Add each symptom as a key
        for symptom in disease.get('sintomas', []):
            if symptom not in database['symptom_to_diseases']:
                database['symptom_to_diseases'][symptom] = []
            database['symptom_to_diseases'][symptom].append(disease['id'])
        
        # Add urgency mapping
        urgency = disease.get('urgencia', 'baja')
        if urgency not in database['urgency_mapping']:
            database['urgency_mapping'][urgency] = []
        database['urgency_mapping'][urgency].append(disease['id'])
        
        # Add category mapping
        category = disease.get('categoria', 'general')
        if category not in database['category_mapping']:
            database['category_mapping'][category] = []
        database['category_mapping'][category].append(disease['id'])
    
    return database


if __name__ == "__main__":
    # Test the parser
    diseases = parse_diseases_markdown('../lista_enfermedades_respiratorias.md')
    print(f"Parsed {len(diseases)} diseases")
    
    # Build database
    db = build_disease_database(diseases)
    print(f"\nSymptom-to-disease mappings: {len(db['symptom_to_diseases'])}")
    print(f"Urgency mappings: {len(db['urgency_mapping'])}")
    print(f"Category mappings: {len(db['category_mapping'])}")
    
    # Show some examples
    print("\n--- Example Disease ---")
    if diseases:
        example = diseases[0]
        print(f"Name: {example['nombre']}")
        print(f"Category: {example['categoria']}")
        print(f"Symptoms: {example['sintomas'][:3]}")
        print(f"Urgency: {example['urgencia']}")
        print(f"Severity: {example['severidad']}")

