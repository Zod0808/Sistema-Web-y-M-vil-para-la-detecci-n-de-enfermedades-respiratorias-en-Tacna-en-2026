/**
 * Symptom Formatter Utility
 * Formatea y normaliza síntomas para el sistema.
 * Esta función será desarrollada usando TDD.
 */

/**
 * Formatea una lista de síntomas para su procesamiento
 * @param {string[]} symptoms - Array de síntomas
 * @returns {string[]} Array de síntomas formateados y normalizados
 */
export function formatSymptoms(symptoms) {
  // Validación de entrada
  if (!symptoms || symptoms === null || symptoms === undefined) {
    throw new Error('La lista de síntomas es requerida');
  }

  // Si la lista está vacía, retornar array vacío
  if (symptoms.length === 0) {
    return [];
  }

  // Normalizar cada síntoma y filtrar vacíos
  const normalized = symptoms
    .map(symptom => normalizeSymptom(symptom))
    .filter(symptom => symptom && symptom.trim().length > 0);

  // Eliminar duplicados
  const unique = [...new Set(normalized)];

  // Ordenar alfabéticamente
  return unique.sort();
}

/**
 * Normaliza un síntoma individual
 * @param {string} symptom - Síntoma a normalizar
 * @returns {string} Síntoma normalizado
 */
export function normalizeSymptom(symptom) {
  if (!symptom || typeof symptom !== 'string') {
    return '';
  }

  // Convertir a minúsculas y eliminar espacios al inicio y final
  return symptom.trim().toLowerCase();
}

