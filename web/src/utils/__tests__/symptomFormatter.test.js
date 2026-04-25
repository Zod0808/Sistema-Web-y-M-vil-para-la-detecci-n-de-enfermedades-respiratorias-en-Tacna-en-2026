/**
 * Tests TDD para Symptom Formatter
 * Aplicando el ciclo RED -> GREEN -> REFACTOR
 */

import { formatSymptoms, normalizeSymptom } from '../symptomFormatter';

describe('SymptomFormatter', () => {
  
  describe('formatSymptoms', () => {
    
    // Test 1: Debe retornar array vacío si la lista está vacía
    it('debe retornar array vacío cuando la lista está vacía', () => {
      const result = formatSymptoms([]);
      expect(result).toEqual([]);
    });

    // Test 2: Debe normalizar síntomas a minúsculas
    it('debe convertir todos los síntomas a minúsculas', () => {
      const symptoms = ['TOS', 'Fiebre', 'Dificultad Respiratoria'];
      const result = formatSymptoms(symptoms);
      expect(result).toEqual(
        ['tos', 'fiebre', 'dificultad respiratoria'].sort((a, b) => a.localeCompare(b, 'es'))
      );
    });

    // Test 3: Debe eliminar espacios en blanco al inicio y final
    it('debe eliminar espacios en blanco al inicio y final', () => {
      const symptoms = ['  tos  ', ' fiebre ', 'dificultad respiratoria'];
      const result = formatSymptoms(symptoms);
      expect(result).toEqual(
        ['tos', 'fiebre', 'dificultad respiratoria'].sort((a, b) => a.localeCompare(b, 'es'))
      );
    });

    // Test 4: Debe eliminar síntomas vacíos o solo con espacios
    it('debe filtrar síntomas vacíos o solo con espacios', () => {
      const symptoms = ['tos', '   ', '', 'fiebre', '  '];
      const result = formatSymptoms(symptoms);
      expect(result).toEqual(['tos', 'fiebre'].sort((a, b) => a.localeCompare(b, 'es')));
    });

    // Test 5: Debe eliminar duplicados
    it('debe eliminar síntomas duplicados', () => {
      const symptoms = ['tos', 'fiebre', 'tos', 'congestión', 'fiebre'];
      const result = formatSymptoms(symptoms);
      expect(result).toEqual(
        ['tos', 'fiebre', 'congestión'].sort((a, b) => a.localeCompare(b, 'es'))
      );
    });

    // Test 6: Debe manejar combinación de problemas
    it('debe manejar múltiples problemas (mayúsculas, espacios, duplicados)', () => {
      const symptoms = ['  TOS  ', 'fiebre', ' TOS ', 'FIEBRE', 'congestión'];
      const result = formatSymptoms(symptoms);
      expect(result).toEqual(
        ['tos', 'fiebre', 'congestión'].sort((a, b) => a.localeCompare(b, 'es'))
      );
    });

    // Test 7: Debe ordenar alfabéticamente
    it('debe ordenar los síntomas alfabéticamente', () => {
      const symptoms = ['fiebre', 'tos', 'congestión', 'dificultad respiratoria'];
      const result = formatSymptoms(symptoms);
      expect(result).toEqual(['congestión', 'dificultad respiratoria', 'fiebre', 'tos']);
    });

    // Test 8: Debe manejar null o undefined
    it('debe lanzar error si la entrada es null o undefined', () => {
      expect(() => formatSymptoms(null)).toThrow();
      expect(() => formatSymptoms(undefined)).toThrow();
    });

    // Test 9: Debe manejar síntomas con caracteres especiales
    it('debe preservar caracteres especiales válidos', () => {
      const symptoms = ['tos seca', 'fiebre-alta', 'dificultad respiratoria'];
      const result = formatSymptoms(symptoms);
      expect(result).toContain('tos seca');
      expect(result).toContain('fiebre-alta');
      expect(result).toContain('dificultad respiratoria');
    });
  });

  describe('normalizeSymptom', () => {
    
    // Test 1: Debe convertir a minúsculas
    it('debe convertir a minúsculas', () => {
      expect(normalizeSymptom('TOS')).toBe('tos');
      expect(normalizeSymptom('Fiebre')).toBe('fiebre');
    });

    // Test 2: Debe eliminar espacios al inicio y final
    it('debe eliminar espacios al inicio y final', () => {
      expect(normalizeSymptom('  tos  ')).toBe('tos');
      expect(normalizeSymptom(' fiebre ')).toBe('fiebre');
    });

    // Test 3: Debe manejar strings vacíos
    it('debe retornar string vacío para entrada vacía', () => {
      expect(normalizeSymptom('')).toBe('');
      expect(normalizeSymptom('   ')).toBe('');
    });
  });
});

