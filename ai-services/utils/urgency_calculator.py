"""
Urgency Calculator Utility
Calcula el nivel de urgencia basado en síntomas y factores de riesgo.
Esta función será desarrollada usando TDD.
"""

from typing import List, Dict, Any, Optional


def calculate_urgency_level(
    symptoms: List[str],
    severity_scores: Optional[List[float]] = None,
    risk_factors: Optional[List[str]] = None,
    patient_age: Optional[int] = None
) -> str:
    """
    Calcula el nivel de urgencia basado en síntomas y factores de riesgo.
    
    Args:
        symptoms: Lista de síntomas
        severity_scores: Lista opcional de scores de severidad (0-1)
        risk_factors: Lista opcional de factores de riesgo
        patient_age: Edad opcional del paciente
    
    Returns:
        Nivel de urgencia: 'low', 'medium', 'high', 'critical'
    """
    # Validación de entrada
    if not symptoms:
        return 'low'
    
    # Calcular score base de severidad
    if severity_scores:
        base_score = sum(severity_scores) / len(severity_scores)
    else:
        # Sin scores explícitos, usar el número de síntomas como proxy débil,
        # limitado para que muchos síntomas por sí solos no disparen 'critical'
        base_score = min(len(symptoms) * 0.15, 0.6)

    # Ajustar por factores de riesgo (contribución aditiva por factor)
    risk_bonus = len(risk_factors) * 0.1 if risk_factors else 0.0

    # Ajustar por edad (bonus fijo para edades de mayor riesgo)
    age_bonus = 0.0
    if patient_age is not None and (patient_age < 5 or patient_age > 65):
        age_bonus = 0.2

    # Calcular score final
    final_score = base_score + risk_bonus + age_bonus

    # Determinar nivel de urgencia
    if final_score >= 0.9:
        return 'critical'
    elif final_score >= 0.7:
        return 'high'
    elif final_score > 0.4:
        return 'medium'
    else:
        return 'low'

