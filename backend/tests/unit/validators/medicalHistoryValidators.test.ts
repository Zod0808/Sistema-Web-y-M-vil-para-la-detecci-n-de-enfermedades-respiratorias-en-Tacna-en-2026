/**
 * Unit tests for medicalHistoryValidators (Joi schemas)
 */

import {
  createMedicalHistorySchema,
  updateMedicalHistorySchema,
  syncOfflineHistoriesSchema,
} from '../../../src/validators/medicalHistoryValidators';

const validate = (schema: any, data: any) => schema.validate(data, { abortEarly: false });

const validSymptom = {
  name: 'Tos persistente',
  severity: 'moderate',
  duration: '3 días',
};

const validLocation = {
  latitude: -18.01,
  longitude: -70.25,
};

const validCreate = {
  patientId: 'patient-123',
  patientName: 'Juan Pérez',
  age: 35,
  diagnosis: 'Bronquitis aguda',
};

describe('medicalHistoryValidators', () => {

  // ─── createMedicalHistorySchema ───────────────────────────────────────────

  describe('createMedicalHistorySchema', () => {
    it('acepta datos mínimos válidos', () => {
      const { error } = validate(createMedicalHistorySchema, validCreate);
      expect(error).toBeUndefined();
    });

    it('acepta datos completos con síntomas y ubicación', () => {
      const { error } = validate(createMedicalHistorySchema, {
        ...validCreate,
        symptoms: [validSymptom],
        location: validLocation,
        description: 'Descripción detallada del caso',
        images: ['https://example.com/img.jpg'],
        isOffline: false,
        syncStatus: 'pending',
      });
      expect(error).toBeUndefined();
    });

    it('falla sin patientId', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, patientId: undefined });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('paciente'))).toBe(true);
    });

    it('falla sin patientName', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, patientName: undefined });
      expect(error).toBeDefined();
    });

    it('falla con patientName menor a 2 caracteres', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, patientName: 'A' });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('2 caracteres'))).toBe(true);
    });

    it('falla con patientName mayor a 100 caracteres', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, patientName: 'A'.repeat(101) });
      expect(error).toBeDefined();
    });

    it('falla sin age', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, age: undefined });
      expect(error).toBeDefined();
    });

    it('falla con age negativa', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, age: -1 });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('negativa'))).toBe(true);
    });

    it('falla con age mayor a 150', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, age: 151 });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('150'))).toBe(true);
    });

    it('falla con age decimal (no entero)', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, age: 25.5 });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('entero'))).toBe(true);
    });

    it('acepta age = 0', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, age: 0 });
      expect(error).toBeUndefined();
    });

    it('falla sin diagnosis', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, diagnosis: undefined });
      expect(error).toBeDefined();
    });

    it('falla con diagnosis menor a 2 caracteres', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, diagnosis: 'X' });
      expect(error).toBeDefined();
    });

    it('falla con diagnosis mayor a 200 caracteres', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, diagnosis: 'D'.repeat(201) });
      expect(error).toBeDefined();
    });

    // Symptom sub-schema
    describe('symptoms', () => {
      it('acepta síntoma válido', () => {
        const { error } = validate(createMedicalHistorySchema, { ...validCreate, symptoms: [validSymptom] });
        expect(error).toBeUndefined();
      });

      it('falla con más de 20 síntomas', () => {
        const symptoms = Array(21).fill(validSymptom);
        const { error } = validate(createMedicalHistorySchema, { ...validCreate, symptoms });
        expect(error).toBeDefined();
        expect(error!.details.some(d => d.message.includes('20 síntomas'))).toBe(true);
      });

      it('falla con síntoma sin name', () => {
        const { error } = validate(createMedicalHistorySchema, {
          ...validCreate,
          symptoms: [{ severity: 'mild', duration: '1 día' }],
        });
        expect(error).toBeDefined();
      });

      it('falla con síntoma sin severity', () => {
        const { error } = validate(createMedicalHistorySchema, {
          ...validCreate,
          symptoms: [{ name: 'tos', duration: '1 día' }],
        });
        expect(error).toBeDefined();
      });

      it('falla con severity inválida', () => {
        const { error } = validate(createMedicalHistorySchema, {
          ...validCreate,
          symptoms: [{ name: 'tos', severity: 'extreme', duration: '1 día' }],
        });
        expect(error).toBeDefined();
        expect(error!.details.some(d => d.message.includes('mild, moderate o severe'))).toBe(true);
      });

      it('falla con síntoma sin duration', () => {
        const { error } = validate(createMedicalHistorySchema, {
          ...validCreate,
          symptoms: [{ name: 'tos', severity: 'mild' }],
        });
        expect(error).toBeDefined();
      });

      it('acepta descripción vacía en síntoma', () => {
        const { error } = validate(createMedicalHistorySchema, {
          ...validCreate,
          symptoms: [{ ...validSymptom, description: '' }],
        });
        expect(error).toBeUndefined();
      });
    });

    // Location sub-schema
    describe('location', () => {
      it('acepta ubicación válida', () => {
        const { error } = validate(createMedicalHistorySchema, { ...validCreate, location: validLocation });
        expect(error).toBeUndefined();
      });

      it('falla con latitude fuera de rango (-90 a 90)', () => {
        const { error } = validate(createMedicalHistorySchema, {
          ...validCreate,
          location: { latitude: -91, longitude: -70.25 },
        });
        expect(error).toBeDefined();
        expect(error!.details.some(d => d.message.includes('-90 y 90'))).toBe(true);
      });

      it('falla con longitude fuera de rango (-180 a 180)', () => {
        const { error } = validate(createMedicalHistorySchema, {
          ...validCreate,
          location: { latitude: -18.0, longitude: 181 },
        });
        expect(error).toBeDefined();
        expect(error!.details.some(d => d.message.includes('-180 y 180'))).toBe(true);
      });

      it('falla sin latitude', () => {
        const { error } = validate(createMedicalHistorySchema, {
          ...validCreate,
          location: { longitude: -70.25 },
        });
        expect(error).toBeDefined();
      });

      it('acepta address como string vacío', () => {
        const { error } = validate(createMedicalHistorySchema, {
          ...validCreate,
          location: { ...validLocation, address: '' },
        });
        expect(error).toBeUndefined();
      });
    });

    it('falla con description mayor a 1000 caracteres', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, description: 'D'.repeat(1001) });
      expect(error).toBeDefined();
    });

    it('falla con más de 10 imágenes', () => {
      const images = Array(11).fill('https://example.com/img.jpg');
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, images });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('10 imágenes'))).toBe(true);
    });

    it('falla con imagen que no es URL', () => {
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, images: ['not-a-url'] });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('URLs válidas'))).toBe(true);
    });

    it('syncStatus acepta pending/synced/error', () => {
      for (const syncStatus of ['pending', 'synced', 'error']) {
        const { error } = validate(createMedicalHistorySchema, { ...validCreate, syncStatus });
        expect(error).toBeUndefined();
      }
    });

    it('falla con fecha futura', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const { error } = validate(createMedicalHistorySchema, { ...validCreate, date: futureDate });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('futura'))).toBe(true);
    });
  });

  // ─── updateMedicalHistorySchema ───────────────────────────────────────────

  describe('updateMedicalHistorySchema', () => {
    it('acepta objeto vacío (todos los campos son opcionales)', () => {
      const { error } = validate(updateMedicalHistorySchema, {});
      expect(error).toBeUndefined();
    });

    it('acepta actualización parcial de nombre', () => {
      const { error } = validate(updateMedicalHistorySchema, { patientName: 'Nuevo Nombre' });
      expect(error).toBeUndefined();
    });

    it('falla con patientName menor a 2 caracteres', () => {
      const { error } = validate(updateMedicalHistorySchema, { patientName: 'X' });
      expect(error).toBeDefined();
    });

    it('acepta actualización de age', () => {
      const { error } = validate(updateMedicalHistorySchema, { age: 40 });
      expect(error).toBeUndefined();
    });

    it('falla con age mayor a 150 en update', () => {
      const { error } = validate(updateMedicalHistorySchema, { age: 151 });
      expect(error).toBeDefined();
    });

    it('acepta actualización de diagnosis', () => {
      const { error } = validate(updateMedicalHistorySchema, { diagnosis: 'EPOC leve' });
      expect(error).toBeUndefined();
    });

    it('acepta actualización de síntomas', () => {
      const { error } = validate(updateMedicalHistorySchema, { symptoms: [validSymptom] });
      expect(error).toBeUndefined();
    });

    it('acepta syncStatus en update', () => {
      const { error } = validate(updateMedicalHistorySchema, { syncStatus: 'synced' });
      expect(error).toBeUndefined();
    });
  });

  // ─── syncOfflineHistoriesSchema ───────────────────────────────────────────

  describe('syncOfflineHistoriesSchema', () => {
    it('acepta array con una historia válida', () => {
      const { error } = validate(syncOfflineHistoriesSchema, {
        histories: [validCreate],
      });
      expect(error).toBeUndefined();
    });

    it('falla sin histories', () => {
      const { error } = validate(syncOfflineHistoriesSchema, {});
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('obligatorias'))).toBe(true);
    });

    it('falla con array vacío', () => {
      const { error } = validate(syncOfflineHistoriesSchema, { histories: [] });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('al menos una'))).toBe(true);
    });

    it('falla con más de 100 historias', () => {
      const histories = Array(101).fill(validCreate);
      const { error } = validate(syncOfflineHistoriesSchema, { histories });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('100 historias'))).toBe(true);
    });

    it('acepta hasta 100 historias', () => {
      const histories = Array(100).fill(validCreate);
      const { error } = validate(syncOfflineHistoriesSchema, { histories });
      expect(error).toBeUndefined();
    });
  });
});