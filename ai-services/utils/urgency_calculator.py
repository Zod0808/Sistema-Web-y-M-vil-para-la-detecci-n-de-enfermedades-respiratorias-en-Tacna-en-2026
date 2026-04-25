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
    base_score = 0.0
    if severity_scores:
        base_score = sum(severity_scores) / len(severity_scores) if severity_scores else 0.0
    else:
        # Si no hay scores, usar número de síntomas como proxy
        base_score = min(len(symptoms) * 0.2, 1.0)
    
    # Ajustar por factores de riesgo
    risk_multiplier = 1.0
    if risk_factors:
        risk_multiplier += len(risk_factors) * 0.2
    
    # Ajustar por edad
    if patient_age:
        if patient_age < 5 or patient_age > 65:
            risk_multiplier += 0.3
    
    # Calcular score final
    final_score = base_score * risk_multiplier
    
    # Determinar nivel de urgencia
    if final_score >= 0.9:
        return 'critical'
    elif final_score >= 0.7:
        return 'high'
    elif final_score >= 0.4:
        return 'medium'
    else:
        return 'low'

