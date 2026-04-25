/**
 * Enhanced Tests for symptomFormatter
 * Additional edge cases and coverage improvements
 */

import { formatSymptoms, normalizeSymptom } from '../symptomFormatter';

describe('symptomFormatter Enhanced Tests', () => {
  describe('formatSymptoms Edge Cases', () => {
    it('should handle empty array', () => {
      expect(formatSymptoms([])).toBe('');
    });

    it('should handle null input', () => {
      expect(formatSymptoms(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(formatSymptoms(undefined)).toBe('');
    });

    it('should handle array with null values', () => {
      expect(formatSymptoms([null, undefined, 'tos'])).toBe('tos');
    });

    it('should handle array with empty strings', () => {
      expect(formatSymptoms(['', 'tos', ''])).toBe('tos');
    });

    it('should handle very long symptom names', () => {
      const longSymptom = 'A'.repeat(1000);
      expect(formatSymptoms([longSymptom])).toBe(longSymptom);
    });

    it('should handle special characters in symptoms', () => {
      const specialSymptoms = ['tos <script>', 'fiebre & dolor'];
      const result = formatSymptoms(specialSymptoms);
      expect(result).toContain('tos');
      expect(result).toContain('fiebre');
    });

    it('should handle symptoms with numbers', () => {
      expect(formatSymptoms(['tos', 'fiebre 38°C'])).toContain('tos');
      expect(formatSymptoms(['tos', 'fiebre 38°C'])).toContain('fiebre');
    });

    it('should handle unicode characters', () => {
      expect(formatSymptoms(['tos', 'fiebre', 'dificultad respiratoria'])).toContain('dificultad');
    });
  });

  describe('normalizeSymptom Edge Cases', () => {
    it('should handle null input', () => {
      expect(normalizeSymptom(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(normalizeSymptom(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(normalizeSymptom('')).toBe('');
    });

    it('should handle whitespace only', () => {
      expect(normalizeSymptom('   ')).toBe('');
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(10000);
      const result = normalizeSymptom(longString);
      expect(result).toBe(longString.trim().toLowerCase());
    });

    it('should handle strings with only special characters', () => {
      expect(normalizeSymptom('!!!@@@###')).toBe('!!!@@@###');
    });

    it('should handle mixed case with special characters', () => {
      expect(normalizeSymptom('  ToS  ')).toBe('tos');
      expect(normalizeSymptom('FIEBRE!!!')).toBe('fiebre!!!');
    });

    it('should handle unicode characters', () => {
      expect(normalizeSymptom('  Dificultad Respiratoria  ')).toBe('dificultad respiratoria');
    });

    it('should handle numbers', () => {
      expect(normalizeSymptom('Tos 2 semanas')).toBe('tos 2 semanas');
    });
  });

  describe('Integration Edge Cases', () => {
    it('should format and normalize consistently', () => {
      const symptoms = ['  ToS  ', '  FIEBRE  ', '  DOLOR  '];
      const formatted = formatSymptoms(symptoms);
      const normalized = symptoms.map(normalizeSymptom);
      
      expect(formatted).toBeDefined();
      expect(normalized).toEqual(['tos', 'fiebre', 'dolor']);
    });

    it('should handle real-world symptom variations', () => {
      const variations = [
        'TOS',
        'tos',
        '  TOS  ',
        'Tos persistente',
        'TOS CON FLEMA'
      ];
      
      variations.forEach(variation => {
        const normalized = normalizeSymptom(variation);
        expect(normalized).toBeDefined();
        expect(typeof normalized).toBe('string');
      });
    });
  });
});

