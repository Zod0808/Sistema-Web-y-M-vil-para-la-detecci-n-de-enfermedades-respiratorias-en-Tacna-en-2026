"""
Patient-Friendly Explanation Service

Convierte explicaciones técnicas de SHAP a lenguaje simple y comprensible
para pacientes sin conocimientos médicos.
"""

from typing import Dict, List, Any, Optional
import re


class PatientFriendlyExplainer:
    """Convierte explicaciones técnicas a lenguaje simple para pacientes"""
    
    def __init__(self):
        """Inicializa el servicio con mapeos de términos médicos"""
        # Mapeo de síntomas técnicos a explicaciones simples
        self.symptom_explanations = {
            'tos': 'tos',
            'tos seca': 'tos seca',
            'tos productiva': 'tos con flemas',
            'fiebre': 'fiebre',
            'dificultad respiratoria': 'dificultad para respirar',
            'disnea': 'dificultad para respirar',
            'sibilancias': 'silbidos al respirar',
            'opresion pecho': 'opresión en el pecho',
            'dolor toracico': 'dolor en el pecho',
            'fatiga': 'cansancio',
            'congestion nasal': 'congestión nasal',
            'rinorrea': 'secreción nasal',
            'dolor de garganta': 'dolor de garganta',
            'dolor de cabeza': 'dolor de cabeza',
            'escalofrios': 'escalofríos',
            'sudoracion': 'sudoración',
            'perdida apetito': 'pérdida de apetito',
            'nauseas': 'náuseas',
            'vomitos': 'vómitos',
            'dolor muscular': 'dolor muscular',
            'dolor articular': 'dolor en las articulaciones',
            'flema': 'flemas',
            'sangre en flema': 'sangre en las flemas',
            'ronquera': 'ronquera',
            'dificultad para tragar': 'dificultad para tragar',
            'ganglios inflamados': 'ganglios inflamados'
        }
        
        # Mapeo de enfermedades a explicaciones simples
        self.disease_explanations = {
            'asma': 'asma',
            'bronquitis': 'bronquitis (inflamación de los bronquios)',
            'neumonia': 'neumonía (infección en los pulmones)',
            'gripe': 'gripe',
            'resfriado comun': 'resfriado común',
            'covid-19': 'COVID-19',
            'tuberculosis': 'tuberculosis',
            'enfisema': 'enfisema pulmonar',
            'epoc': 'EPOC (Enfermedad Pulmonar Obstructiva Crónica)',
            'sinusitis': 'sinusitis',
            'faringitis': 'faringitis (inflamación de la garganta)',
            'laringitis': 'laringitis (inflamación de la laringe)'
        }
        
        # Mapeo de urgencia a explicaciones simples
        self.urgency_explanations = {
            'critical': 'crítica - requiere atención médica inmediata',
            'high': 'alta - debe consultar a un médico pronto',
            'medium': 'moderada - conviene consultar a un médico',
            'low': 'baja - puede seguir recomendaciones generales',
            'very_low': 'muy baja - puede seguir recomendaciones generales'
        }
    
    def explain_prediction(self, 
                          disease: str,
                          confidence: float,
                          urgency_level: str,
                          symptoms: List[str],
                          shap_factors: Optional[List[Dict]] = None,
                          top_predictions: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Genera explicación amigable de la predicción
        
        Args:
            disease: Nombre de la enfermedad predicha
            confidence: Nivel de confianza (0-1)
            urgency_level: Nivel de urgencia
            symptoms: Lista de síntomas del paciente
            shap_factors: Factores SHAP técnicos (opcional)
            top_predictions: Top predicciones alternativas (opcional)
        
        Returns:
            Diccionario con explicación amigable
        """
        # Explicación principal simple
        confidence_percent = int(confidence * 100)
        disease_name = self.disease_explanations.get(disease.lower(), disease)
        urgency_explanation = self.urgency_explanations.get(urgency_level.lower(), urgency_level)
        
        # Construir explicación principal
        main_explanation = self._build_main_explanation(
            disease_name, 
            confidence_percent, 
            urgency_explanation,
            symptoms
        )
        
        # Factores clave en lenguaje simple
        key_factors = self._build_key_factors(symptoms, shap_factors)
        
        # Explicación de por qué se llegó a esta conclusión
        reasoning = self._build_reasoning(disease, symptoms, confidence_percent)
        
        # Recomendaciones simples
        recommendations = self._build_simple_recommendations(disease, urgency_level)
        
        # Explicación de alternativas
        alternatives = self._build_alternatives_explanation(top_predictions)
        
        return {
            'main_explanation': main_explanation,
            'key_factors': key_factors,
            'reasoning': reasoning,
            'recommendations': recommendations,
            'alternatives': alternatives,
            'confidence_level': self._get_confidence_level(confidence_percent),
            'urgency_explanation': urgency_explanation,
            'summary': self._build_summary(disease_name, confidence_percent, urgency_explanation)
        }
    
    def _build_main_explanation(self, 
                               disease: str, 
                               confidence: int, 
                               urgency: str,
                               symptoms: List[str]) -> str:
        """Construye la explicación principal"""
        symptom_list = ", ".join(symptoms[:3])
        if len(symptoms) > 3:
            symptom_list += f" y {len(symptoms) - 3} más"
        
        if confidence >= 80:
            confidence_text = "muy probable"
        elif confidence >= 60:
            confidence_text = "probable"
        else:
            confidence_text = "posible"
        
        return (
            f"Basándome en sus síntomas ({symptom_list}), "
            f"es {confidence_text} ({confidence}% de certeza) que usted tenga {disease}. "
            f"El nivel de urgencia es {urgency}."
        )
    
    def _build_key_factors(self, 
                          symptoms: List[str],
                          shap_factors: Optional[List[Dict]] = None) -> List[str]:
        """Construye lista de factores clave en lenguaje simple"""
        factors = []
        
        if shap_factors:
            # Usar factores SHAP si están disponibles
            for factor in shap_factors[:5]:
                shap_value = factor.get('shap_value', 0)
                feature_name = factor.get('feature_name', '')
                
                # Convertir nombre técnico a lenguaje simple
                simple_name = self._simplify_feature_name(feature_name)
                
                if abs(shap_value) > 0.1:  # Solo factores significativos
                    if shap_value > 0:
                        factors.append(
                            f"El síntoma '{simple_name}' aumenta la probabilidad de este diagnóstico"
                        )
                    else:
                        factors.append(
                            f"El síntoma '{simple_name}' disminuye la probabilidad de este diagnóstico"
                        )
        else:
            # Si no hay SHAP, usar síntomas directamente
            for symptom in symptoms[:5]:
                simple_symptom = self.symptom_explanations.get(symptom.lower(), symptom)
                factors.append(
                    f"La presencia de '{simple_symptom}' sugiere esta condición"
                )
        
        return factors if factors else [
            "Los síntomas que mencionó son característicos de esta condición"
        ]
    
    def _build_reasoning(self, 
                        disease: str, 
                        symptoms: List[str], 
                        confidence: int) -> str:
        """Construye explicación del razonamiento"""
        symptom_count = len(symptoms)
        
        if confidence >= 80:
            confidence_desc = "alta confianza"
            reason = "porque los síntomas que mencionó son muy característicos de esta condición"
        elif confidence >= 60:
            confidence_desc = "confianza moderada"
            reason = "porque varios síntomas coinciden con esta condición"
        else:
            confidence_desc = "confianza baja"
            reason = "porque algunos síntomas pueden indicar esta condición, pero se recomienda evaluación médica"
        
        return (
            f"El diagnóstico tiene {confidence_desc} ({confidence}%) "
            f"{reason}. "
            f"Se identificaron {symptom_count} síntoma{'s' if symptom_count != 1 else ''} relevante{'s' if symptom_count != 1 else ''}."
        )
    
    def _build_simple_recommendations(self, 
                                     disease: str, 
                                     urgency_level: str) -> List[str]:
        """Construye recomendaciones simples"""
        recommendations = []
        
        if urgency_level in ['critical', 'high']:
            recommendations.append("🚨 Debe consultar a un médico lo antes posible")
            recommendations.append("Si tiene dificultad severa para respirar, acuda a emergencias")
        elif urgency_level == 'medium':
            recommendations.append("⚡ Se recomienda consultar a un médico en las próximas 24-48 horas")
        else:
            recommendations.append("💚 Puede seguir las recomendaciones generales y monitorear sus síntomas")
        
        # Recomendaciones específicas por enfermedad
        disease_lower = disease.lower()
        if 'asma' in disease_lower:
            recommendations.append("Evite factores desencadenantes (polvo, polen, humo)")
            recommendations.append("Use el inhalador si se lo ha prescrito un médico")
        elif 'neumonia' in disease_lower or 'neumonía' in disease_lower:
            recommendations.append("Descanse y manténgase hidratado")
            recommendations.append("Evite fumar y la exposición al humo")
        elif 'bronquitis' in disease_lower:
            recommendations.append("Beba líquidos calientes para aliviar la tos")
            recommendations.append("Descanse y evite el esfuerzo físico")
        elif 'gripe' in disease_lower or 'resfriado' in disease_lower:
            recommendations.append("Descanse y manténgase hidratado")
            recommendations.append("Lávese las manos frecuentemente para evitar contagiar")
        
        return recommendations
    
    def _build_alternatives_explanation(self, 
                                       top_predictions: Optional[List[Dict]]) -> Optional[str]:
        """Construye explicación de diagnósticos alternativos"""
        if not top_predictions or len(top_predictions) <= 1:
            return None
        
        alternatives = []
        for i, pred in enumerate(top_predictions[1:4], 1):  # Skip first (main prediction)
            disease = pred.get('disease', '')
            confidence = pred.get('confidence', 0)
            if isinstance(confidence, str):
                try:
                    confidence = float(confidence)
                except:
                    confidence = 0
            
            disease_name = self.disease_explanations.get(disease.lower(), disease)
            conf_percent = int(confidence * 100)
            
            if conf_percent > 20:  # Solo mencionar si tiene al menos 20% de probabilidad
                alternatives.append(f"{disease_name} ({conf_percent}% de probabilidad)")
        
        if alternatives:
            return (
                f"Otras posibilidades a considerar: {', '.join(alternatives)}. "
                f"Un médico puede ayudar a diferenciar entre estas opciones."
            )
        
        return None
    
    def _simplify_feature_name(self, feature_name: str) -> str:
        """Simplifica nombres técnicos de características"""
        # Si es un índice de síntoma, intentar extraer el nombre
        feature_lower = feature_name.lower()
        
        # Buscar en el mapeo de síntomas
        for symptom, explanation in self.symptom_explanations.items():
            if symptom in feature_lower:
                return explanation
        
        # Si no se encuentra, limpiar el nombre
        cleaned = re.sub(r'[^a-záéíóúñ\s]', '', feature_lower)
        return cleaned.strip() or feature_name
    
    def _get_confidence_level(self, confidence_percent: int) -> str:
        """Obtiene nivel de confianza en texto"""
        if confidence_percent >= 80:
            return "Muy Alta"
        elif confidence_percent >= 60:
            return "Alta"
        elif confidence_percent >= 40:
            return "Moderada"
        else:
            return "Baja"
    
    def _build_summary(self, disease: str, confidence: int, urgency: str) -> str:
        """Construye resumen corto"""
        return (
            f"Diagnóstico más probable: {disease} "
            f"({confidence}% de certeza). "
            f"Urgencia: {urgency}."
        )


# Instancia global
_patient_explainer = None


def get_patient_explainer() -> PatientFriendlyExplainer:
    """Obtiene instancia global del explicador amigable"""
    global _patient_explainer
    if _patient_explainer is None:
        _patient_explainer = PatientFriendlyExplainer()
    return _patient_explainer

