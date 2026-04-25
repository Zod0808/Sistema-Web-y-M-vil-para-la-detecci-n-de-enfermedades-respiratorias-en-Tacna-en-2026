import { calculateSeverityScore, Symptom } from '../../../src/utils/symptomSeverityCalculator';

const mild = (name: string): Symptom => ({ name, severity: 'mild' });
const moderate = (name: string): Symptom => ({ name, severity: 'moderate' });
const severe = (name: string): Symptom => ({ name, severity: 'severe' });

describe('calculateSeverityScore', () => {
  describe('validación de entrada', () => {
    it('lanza error cuando symptoms es null', () => {
      expect(() => calculateSeverityScore(null as any)).toThrow();
    });

    it('retorna 0 para lista vacía', () => {
      expect(calculateSeverityScore([])).toBe(0);
    });
  });

  describe('puntuación individual', () => {
    it('asigna 1 punto a síntoma mild', () => {
      expect(calculateSeverityScore([mild('tos')])).toBe(1);
    });

    it('asigna 2 puntos a síntoma moderate', () => {
      expect(calculateSeverityScore([moderate('fiebre')])).toBe(2);
    });

    it('asigna 3 puntos a síntoma severe', () => {
      expect(calculateSeverityScore([severe('disnea')])).toBe(3);
    });
  });

  describe('suma múltiples síntomas', () => {
    it('suma correctamente varios síntomas leves', () => {
      const symptoms = [mild('tos'), mild('congestión'), mild('malestar')];
      expect(calculateSeverityScore(symptoms)).toBe(3);
    });

    it('suma correctamente síntomas mixtos', () => {
      // mild=1 + moderate=2 + severe=3 = 6
      const symptoms = [mild('tos'), moderate('fiebre'), severe('disnea')];
      expect(calculateSeverityScore(symptoms)).toBe(6);
    });

    it('suma correctamente solo síntomas graves', () => {
      const symptoms = [severe('paro respiratorio'), severe('cianosis')];
      expect(calculateSeverityScore(symptoms)).toBe(6);
    });

    it('maneja síntomas con campo duration opcional', () => {
      const symptoms: Symptom[] = [
        { name: 'tos', severity: 'mild', duration: '3 días' },
        { name: 'fiebre', severity: 'moderate', duration: '1 día' },
      ];
      expect(calculateSeverityScore(symptoms)).toBe(3);
    });

    it('ignora síntomas con severidad no reconocida (score 0)', () => {
      const symptoms = [
        { name: 'síntoma', severity: 'unknown' as any },
        mild('tos'),
      ];
      expect(calculateSeverityScore(symptoms)).toBe(1);
    });
  });

  describe('casos clínicos reales', () => {
    it('caso leve: síntomas respiratorios leves', () => {
      const symptoms = [mild('tos seca'), mild('congestión nasal'), mild('malestar general')];
      const score = calculateSeverityScore(symptoms);
      expect(score).toBe(3);
      expect(score).toBeLessThan(5);
    });

    it('caso moderado: síntomas respiratorios intermedios', () => {
      const symptoms = [moderate('tos con flema'), moderate('fiebre 38°C'), mild('fatiga')];
      const score = calculateSeverityScore(symptoms);
      expect(score).toBe(5);
    });

    it('caso severo: síntomas respiratorios graves', () => {
      const symptoms = [
        severe('disnea severa'),
        severe('saturación O2 < 90%'),
        moderate('fiebre alta'),
        mild('tos'),
      ];
      const score = calculateSeverityScore(symptoms);
      expect(score).toBe(9);
      expect(score).toBeGreaterThan(6);
    });
  });
});