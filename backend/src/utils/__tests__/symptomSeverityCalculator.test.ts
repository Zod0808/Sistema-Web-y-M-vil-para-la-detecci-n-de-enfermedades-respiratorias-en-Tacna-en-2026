/**
 * Tests para Symptom Severity Calculator
 * 
 * Este archivo contiene las pruebas TDD siguiendo el ciclo:
 * RED -> GREEN -> REFACTOR
 */

import { calculateSeverityScore, Symptom } from '../symptomSeverityCalculator';

describe('SymptomSeverityCalculator', () => {
  
  describe('calculateSeverityScore', () => {
    
    // Test 1: Debe retornar 0 cuando no hay síntomas
    it('debe retornar 0 cuando la lista de síntomas está vacía', () => {
      const symptoms: Symptom[] = [];
      const result = calculateSeverityScore(symptoms);
      expect(result).toBe(0);
    });

    // Test 2: Debe calcular correctamente el score para un síntoma leve
    it('debe retornar 1 para un síntoma leve (mild)', () => {
      const symptoms: Symptom[] = [
        { name: 'tos', severity: 'mild', duration: '2 días' }
      ];
      const result = calculateSeverityScore(symptoms);
      expect(result).toBe(1);
    });

    // Test 3: Debe calcular correctamente el score para un síntoma moderado
    it('debe retornar 2 para un síntoma moderado (moderate)', () => {
      const symptoms: Symptom[] = [
        { name: 'fiebre', severity: 'moderate', duration: '3 días' }
      ];
      const result = calculateSeverityScore(symptoms);
      expect(result).toBe(2);
    });

    // Test 4: Debe calcular correctamente el score para un síntoma severo
    it('debe retornar 3 para un síntoma severo (severe)', () => {
      const symptoms: Symptom[] = [
        { name: 'dificultad respiratoria', severity: 'severe', duration: '1 día' }
      ];
      const result = calculateSeverityScore(symptoms);
      expect(result).toBe(3);
    });

    // Test 5: Debe sumar correctamente múltiples síntomas
    it('debe sumar correctamente el score de múltiples síntomas', () => {
      const symptoms: Symptom[] = [
        { name: 'tos', severity: 'mild', duration: '2 días' },
        { name: 'fiebre', severity: 'moderate', duration: '3 días' },
        { name: 'dificultad respiratoria', severity: 'severe', duration: '1 día' }
      ];
      const result = calculateSeverityScore(symptoms);
      // 1 (mild) + 2 (moderate) + 3 (severe) = 6
      expect(result).toBe(6);
    });

    // Test 6: Debe manejar múltiples síntomas del mismo tipo
    it('debe sumar correctamente múltiples síntomas del mismo tipo de severidad', () => {
      const symptoms: Symptom[] = [
        { name: 'tos', severity: 'mild', duration: '2 días' },
        { name: 'congestión', severity: 'mild', duration: '1 día' },
        { name: 'fatiga', severity: 'mild', duration: '3 días' }
      ];
      const result = calculateSeverityScore(symptoms);
      // 1 + 1 + 1 = 3
      expect(result).toBe(3);
    });

    // Test 7: Debe manejar casos edge con síntomas sin duración
    it('debe calcular correctamente aunque no tenga duración especificada', () => {
      const symptoms: Symptom[] = [
        { name: 'tos', severity: 'moderate' }
      ];
      const result = calculateSeverityScore(symptoms);
      expect(result).toBe(2);
    });

    // Test 8: Debe retornar 0 para una lista null o undefined (validación)
    it('debe lanzar error si la lista de síntomas es null o undefined', () => {
      expect(() => calculateSeverityScore(null as any)).toThrow('La lista de síntomas es requerida');
      expect(() => calculateSeverityScore(undefined as any)).toThrow('La lista de síntomas es requerida');
    });

    // Test 9: Debe manejar un caso realista con muchos síntomas
    it('debe calcular correctamente un caso realista con múltiples síntomas variados', () => {
      const symptoms: Symptom[] = [
        { name: 'tos', severity: 'mild', duration: '2 días' },
        { name: 'fiebre', severity: 'moderate', duration: '1 día' },
        { name: 'congestión', severity: 'mild', duration: '3 días' },
        { name: 'dificultad respiratoria', severity: 'severe', duration: '6 horas' },
        { name: 'fatiga', severity: 'moderate', duration: '2 días' }
      ];
      const result = calculateSeverityScore(symptoms);
      // 1 (mild) + 2 (moderate) + 1 (mild) + 3 (severe) + 2 (moderate) = 9
      expect(result).toBe(9);
    });
  });
});
