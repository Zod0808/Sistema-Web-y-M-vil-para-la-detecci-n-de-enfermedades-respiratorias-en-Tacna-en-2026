import {
  validateFhirResource,
  validateFhirResources,
} from '../../../src/services/fhirValidator';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('fhirValidator', () => {
  describe('validateFhirResource', () => {
    it('retorna error cuando falta resourceType', () => {
      const result = validateFhirResource({} as any);
      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBe('resourceType');
      expect(result.errors[0].code).toBe('required');
    });

    it('retorna valid=true con warning para tipo sin validador específico', () => {
      const result = validateFhirResource({ resourceType: 'Bundle' } as any);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('no-validator');
    });

    describe('Patient', () => {
      it('válido con name y datos correctos', () => {
        const result = validateFhirResource({
          resourceType: 'Patient',
          name: [{ given: ['Juan'], family: 'Pérez' }],
          gender: 'male',
          birthDate: '1985-06-15',
        } as any);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('error cuando falta name', () => {
        const result = validateFhirResource({ resourceType: 'Patient' } as any);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.path === 'name')).toBe(true);
      });

      it('error cuando name es array vacío', () => {
        const result = validateFhirResource({ resourceType: 'Patient', name: [] } as any);
        expect(result.valid).toBe(false);
      });

      it('error con birthDate en formato inválido', () => {
        const result = validateFhirResource({
          resourceType: 'Patient',
          name: [{ given: ['Ana'] }],
          birthDate: '15/06/1985',
        } as any);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.path === 'birthDate')).toBe(true);
      });

      it('acepta birthDate en formato YYYY-MM-DD', () => {
        const result = validateFhirResource({
          resourceType: 'Patient',
          name: [{ given: ['Ana'] }],
          birthDate: '1985-06-15',
        } as any);
        expect(result.valid).toBe(true);
      });

      it('error con gender inválido', () => {
        const result = validateFhirResource({
          resourceType: 'Patient',
          name: [{ given: ['Ana'] }],
          gender: 'invalid',
        } as any);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.path === 'gender')).toBe(true);
      });

      it('acepta todos los géneros válidos', () => {
        for (const gender of ['male', 'female', 'other', 'unknown']) {
          const result = validateFhirResource({
            resourceType: 'Patient',
            name: [{ given: ['Test'] }],
            gender,
          } as any);
          expect(result.errors.some(e => e.path === 'gender')).toBe(false);
        }
      });
    });

    describe('Observation', () => {
      const buildObservation = (overrides: any = {}) => ({
        resourceType: 'Observation',
        status: 'final',
        code: { text: 'Glucosa' },
        subject: { reference: 'Patient/patient-1' },
        ...overrides,
      });

      it('válido con campos requeridos', () => {
        const result = validateFhirResource(buildObservation() as any);
        expect(result.valid).toBe(true);
      });

      it('error cuando falta status', () => {
        const result = validateFhirResource(buildObservation({ status: undefined }) as any);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.path === 'status')).toBe(true);
      });

      it('error cuando status es inválido', () => {
        const result = validateFhirResource(buildObservation({ status: 'invalid-status' }) as any);
        expect(result.valid).toBe(false);
      });

      it('acepta todos los status válidos de Observation', () => {
        for (const status of ['registered', 'preliminary', 'final', 'amended', 'cancelled', 'unknown']) {
          const result = validateFhirResource(buildObservation({ status }) as any);
          expect(result.errors.some(e => e.path === 'status')).toBe(false);
        }
      });

      it('error cuando falta code', () => {
        const result = validateFhirResource(buildObservation({ code: undefined }) as any);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.path === 'code')).toBe(true);
      });

      it('error cuando falta subject', () => {
        const result = validateFhirResource(buildObservation({ subject: undefined }) as any);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.path === 'subject')).toBe(true);
      });

      it('warning cuando faltan effectiveDateTime y effectivePeriod', () => {
        const result = validateFhirResource(buildObservation() as any);
        expect(result.warnings.some(w => w.path === 'effectiveDateTime')).toBe(true);
      });

      it('sin warning cuando effectiveDateTime está presente', () => {
        const result = validateFhirResource(buildObservation({ effectiveDateTime: '2026-01-01T00:00:00Z' }) as any);
        expect(result.warnings.some(w => w.path === 'effectiveDateTime')).toBe(false);
      });
    });

    describe('Condition', () => {
      it('error cuando falta clinicalStatus', () => {
        const result = validateFhirResource({
          resourceType: 'Condition',
          code: { text: 'Hipertensión' },
        } as any);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.path === 'clinicalStatus')).toBe(true);
      });

      it('error cuando falta code', () => {
        const result = validateFhirResource({
          resourceType: 'Condition',
          clinicalStatus: { coding: [{ code: 'active' }] },
        } as any);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.path === 'code')).toBe(true);
      });
    });
  });

  describe('validateFhirResources (batch)', () => {
    it('retorna valid=true para array de recursos válidos', () => {
      const resources = [
        {
          resourceType: 'Patient',
          name: [{ given: ['Ana'] }],
        },
        {
          resourceType: 'Observation',
          status: 'final',
          code: { text: 'Glucosa' },
          subject: { reference: 'Patient/p1' },
        },
      ];

      const result = validateFhirResources(resources as any);
      expect(result.valid).toBe(true);
    });

    it('retorna valid=false cuando algún recurso es inválido', () => {
      const resources = [
        { resourceType: 'Patient', name: [{ given: ['Ana'] }] },
        { resourceType: 'Patient' }, // sin name → inválido
      ];

      const result = validateFhirResources(resources as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.startsWith('[1]'))).toBe(true);
    });

    it('prefixa errores con índice de recurso', () => {
      const resources = [
        { resourceType: 'Patient' }, // error en index 0
      ];

      const result = validateFhirResources(resources as any);
      expect(result.errors[0].path).toMatch(/^\[0\]/);
    });

    it('acumula warnings de múltiples recursos', () => {
      const resources = [
        // Observation sin effectiveDateTime → warning
        { resourceType: 'Observation', status: 'final', code: { text: 'A' }, subject: { reference: 'p1' } },
        { resourceType: 'Observation', status: 'final', code: { text: 'B' }, subject: { reference: 'p2' } },
      ];

      const result = validateFhirResources(resources as any);
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });

    it('retorna valid=true para array vacío', () => {
      const result = validateFhirResources([]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validadores de recursos adicionales', () => {
    const code = { coding: [{ system: 'http://loinc.org', code: '1234-5' }] };
    const subject = { reference: 'Patient/1' };

    it('Medication válido e inválido', () => {
      expect(validateFhirResource({ resourceType: 'Medication', code } as any).valid).toBe(true);
      const bad = validateFhirResource({ resourceType: 'Medication' } as any);
      expect(bad.valid).toBe(false);
      expect(bad.errors.some((e) => e.path === 'code')).toBe(true);
    });

    it('MedicationStatement válido, sin campos e inválido por status', () => {
      expect(
        validateFhirResource({
          resourceType: 'MedicationStatement',
          status: 'active',
          medicationCodeableConcept: code,
          subject,
        } as any).valid
      ).toBe(true);

      const missing = validateFhirResource({ resourceType: 'MedicationStatement' } as any);
      expect(missing.valid).toBe(false);
      expect(missing.errors.length).toBeGreaterThanOrEqual(3);

      const badStatus = validateFhirResource({
        resourceType: 'MedicationStatement',
        status: 'no-existe',
        medicationReference: subject,
        subject,
      } as any);
      expect(badStatus.errors.some((e) => e.code === 'invalid-value')).toBe(true);
    });

    it('Procedure válido e inválido', () => {
      expect(
        validateFhirResource({ resourceType: 'Procedure', status: 'completed', code, subject } as any).valid
      ).toBe(true);
      expect(validateFhirResource({ resourceType: 'Procedure', status: 'x' } as any).valid).toBe(false);
    });

    it('DiagnosticReport válido e inválido', () => {
      expect(
        validateFhirResource({ resourceType: 'DiagnosticReport', status: 'final', code, subject } as any).valid
      ).toBe(true);
      expect(validateFhirResource({ resourceType: 'DiagnosticReport' } as any).valid).toBe(false);
    });

    it('Encounter válido e inválido', () => {
      expect(
        validateFhirResource({
          resourceType: 'Encounter',
          status: 'finished',
          class: { code: 'AMB' },
          subject,
        } as any).valid
      ).toBe(true);
      const bad = validateFhirResource({ resourceType: 'Encounter', status: 'bad' } as any);
      expect(bad.errors.some((e) => e.path === 'class')).toBe(true);
    });

    it('AllergyIntolerance válido e inválido', () => {
      expect(
        validateFhirResource({
          resourceType: 'AllergyIntolerance',
          clinicalStatus: { coding: [{ code: 'active' }] },
          verificationStatus: { coding: [{ code: 'confirmed' }] },
          code,
          patient: subject,
        } as any).valid
      ).toBe(true);
      const bad = validateFhirResource({ resourceType: 'AllergyIntolerance' } as any);
      expect(bad.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('Immunization válido e inválido por status', () => {
      expect(
        validateFhirResource({
          resourceType: 'Immunization',
          status: 'completed',
          vaccineCode: code,
          patient: subject,
        } as any).valid
      ).toBe(true);
      const badStatus = validateFhirResource({
        resourceType: 'Immunization',
        status: 'invalido',
        vaccineCode: code,
        patient: subject,
      } as any);
      expect(badStatus.errors.some((e) => e.code === 'invalid-value')).toBe(true);
    });
  });
});