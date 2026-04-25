/**
 * Symptom Severity Calculator
 * 
 * Calcula el score de severidad total basado en una lista de síntomas.
 * Esta función será desarrollada usando TDD.
 */

export interface Symptom {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration?: string;
}

/**
 * Calcula el score de severidad total de una lista de síntomas
 * @param symptoms Array de síntomas
 * @returns Score numérico que representa la severidad total
 */
export function calculateSeverityScore(symptoms: Symptom[]): number {
  // Validación de entrada
  if (!symptoms || symptoms === null || symptoms === undefined) {
    throw new Error('La lista de síntomas es requerida');
  }

  // Si la lista está vacía, retornar 0
  if (symptoms.length === 0) {
    return 0;
  }

  // Mapa de severidad a puntuación
  const severityMap: Record<string, number> = {
    'mild': 1,
    'moderate': 2,
    'severe': 3
  };

  // Calcular el score total sumando la puntuación de cada síntoma
  return symptoms.reduce((total, symptom) => {
    const score = severityMap[symptom.severity] || 0;
    return total + score;
  }, 0);
}

