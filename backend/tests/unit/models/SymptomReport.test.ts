/**
 * Unit tests for SymptomReport model (JavaScript)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SymptomReport = require('../../../src/models/SymptomReport');
import mongoose from 'mongoose';

const buildReport = (overrides: Record<string, any> = {}) => ({
  location: {
    district: 'Centro de Tacna',
    coordinates: { latitude: -18.0, longitude: -70.25 },
  },
  symptoms: [
    { name: 'tos', severity: 'mild' },
  ],
  category: 'respiratory',
  overallSeverity: 'low',
  ...overrides,
});

describe('SymptomReport model', () => {
  afterEach(async () => {
    await SymptomReport.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  // ─── Required fields ───────────────────────────────────────────────────────

  describe('required fields', () => {
    it('persiste con campos mínimos requeridos', async () => {
      const doc = new SymptomReport(buildReport());
      await expect(doc.save()).resolves.toBeDefined();
    });

    it('falla sin location.district', async () => {
      const data = buildReport();
      delete data.location.district;
      const doc = new SymptomReport(data);
      await expect(doc.save()).rejects.toThrow();
    });

    it('falla sin location.coordinates.latitude', async () => {
      const data = buildReport();
      delete data.location.coordinates.latitude;
      const doc = new SymptomReport(data);
      await expect(doc.save()).rejects.toThrow();
    });

    it('falla sin location.coordinates.longitude', async () => {
      const data = buildReport();
      delete data.location.coordinates.longitude;
      const doc = new SymptomReport(data);
      await expect(doc.save()).rejects.toThrow();
    });

    it('falla sin category', async () => {
      const data = buildReport();
      delete data.category;
      const doc = new SymptomReport(data);
      await expect(doc.save()).rejects.toThrow();
    });

    it('patientId es opcional (reporte anónimo)', async () => {
      const doc = new SymptomReport(buildReport());
      const saved = await doc.save();
      expect(saved.patientId).toBeUndefined();
    });
  });

  // ─── Enum validation ───────────────────────────────────────────────────────

  describe('enum validation', () => {
    it('district acepta todos los distritos de Tacna', async () => {
      const validDistricts = [
        'Centro de Tacna', 'Gregorio Albarracín', 'Ciudad Nueva',
        'Pocollay', 'Alto de la Alianza', 'Calana', 'Pachia', 'Boca del Río',
      ];

      for (const district of validDistricts) {
        const doc = new SymptomReport(buildReport({ location: { district, coordinates: { latitude: -18.0, longitude: -70.25 } } }));
        await expect(doc.save()).resolves.toBeDefined();
        await SymptomReport.deleteMany({});
      }
    });

    it('district rechaza valor no listado', async () => {
      const doc = new SymptomReport(buildReport({
        location: { district: 'Otra Ciudad', coordinates: { latitude: -18.0, longitude: -70.25 } },
      }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('category acepta: respiratory, fever, pain, digestive, fatigue, neurological', async () => {
      for (const category of ['respiratory', 'fever', 'pain', 'digestive', 'fatigue', 'neurological']) {
        const doc = new SymptomReport(buildReport({ category }));
        await expect(doc.save()).resolves.toBeDefined();
        await SymptomReport.deleteMany({});
      }
    });

    it('category rechaza valor inválido', async () => {
      const doc = new SymptomReport(buildReport({ category: 'unknown_cat' }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('overallSeverity acepta low, medium, high', async () => {
      for (const severity of ['low', 'medium', 'high']) {
        const doc = new SymptomReport(buildReport({ overallSeverity: severity }));
        await expect(doc.save()).resolves.toBeDefined();
        await SymptomReport.deleteMany({});
      }
    });

    it('overallSeverity rechaza severe', async () => {
      const doc = new SymptomReport(buildReport({ overallSeverity: 'severe' }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('suspectedDisease acepta valores válidos', async () => {
      for (const disease of ['asma', 'neumonia', 'bronquitis', 'covid19', 'gripe', 'epoc', 'resfriado', 'unknown']) {
        const doc = new SymptomReport(buildReport({ suspectedDisease: disease }));
        await expect(doc.save()).resolves.toBeDefined();
        await SymptomReport.deleteMany({});
      }
    });

    it('status acepta pending, reviewed, urgent, resolved', async () => {
      for (const status of ['pending', 'reviewed', 'urgent', 'resolved']) {
        const doc = new SymptomReport(buildReport({ status }));
        await expect(doc.save()).resolves.toBeDefined();
        await SymptomReport.deleteMany({});
      }
    });

    it('reportedBy acepta patient, family, healthcare_worker, anonymous', async () => {
      for (const reportedBy of ['patient', 'family', 'healthcare_worker', 'anonymous']) {
        const doc = new SymptomReport(buildReport({ reportedBy }));
        await expect(doc.save()).resolves.toBeDefined();
        await SymptomReport.deleteMany({});
      }
    });

    it('source acepta web, mobile, phone, hospital', async () => {
      for (const source of ['web', 'mobile', 'phone', 'hospital']) {
        const doc = new SymptomReport(buildReport({ source }));
        await expect(doc.save()).resolves.toBeDefined();
        await SymptomReport.deleteMany({});
      }
    });
  });

  // ─── Range / numeric validation ────────────────────────────────────────────

  describe('numeric range validation', () => {
    it('rechaza latitude < -18.1', async () => {
      const doc = new SymptomReport(buildReport({
        location: { district: 'Centro de Tacna', coordinates: { latitude: -18.5, longitude: -70.25 } },
      }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('rechaza latitude > -17.8', async () => {
      const doc = new SymptomReport(buildReport({
        location: { district: 'Centro de Tacna', coordinates: { latitude: -17.5, longitude: -70.25 } },
      }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('rechaza longitude < -70.3', async () => {
      const doc = new SymptomReport(buildReport({
        location: { district: 'Centro de Tacna', coordinates: { latitude: -18.0, longitude: -70.5 } },
      }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('rechaza longitude > -70.1', async () => {
      const doc = new SymptomReport(buildReport({
        location: { district: 'Centro de Tacna', coordinates: { latitude: -18.0, longitude: -69.9 } },
      }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('rechaza temperature > 42', async () => {
      const doc = new SymptomReport(buildReport({ temperature: 43 }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('rechaza temperature < 35', async () => {
      const doc = new SymptomReport(buildReport({ temperature: 34 }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('acepta temperature en rango 35-42', async () => {
      const doc = new SymptomReport(buildReport({ temperature: 38.5 }));
      await expect(doc.save()).resolves.toBeDefined();
    });

    it('rechaza oxygenSaturation > 100', async () => {
      const doc = new SymptomReport(buildReport({ oxygenSaturation: 101 }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('acepta oxygenSaturation = 98', async () => {
      const doc = new SymptomReport(buildReport({ oxygenSaturation: 98 }));
      await expect(doc.save()).resolves.toBeDefined();
    });
  });

  // ─── Defaults ──────────────────────────────────────────────────────────────

  describe('default values', () => {
    it('overallSeverity por defecto es low', async () => {
      const data = buildReport();
      delete data.overallSeverity;
      const doc = await new SymptomReport(data).save();
      expect(doc.overallSeverity).toBe('low');
    });

    it('suspectedDisease por defecto es unknown', async () => {
      const doc = await new SymptomReport(buildReport()).save();
      expect(doc.suspectedDisease).toBe('unknown');
    });

    it('status por defecto es pending', async () => {
      const doc = await new SymptomReport(buildReport()).save();
      expect(doc.status).toBe('pending');
    });

    it('isAnonymous por defecto es true', async () => {
      const doc = await new SymptomReport(buildReport()).save();
      expect(doc.isAnonymous).toBe(true);
    });

    it('reportedBy por defecto es anonymous', async () => {
      const doc = await new SymptomReport(buildReport()).save();
      expect(doc.reportedBy).toBe('anonymous');
    });

    it('medicalAttentionRequired por defecto es false', async () => {
      const doc = await new SymptomReport(buildReport()).save();
      expect(doc.medicalAttentionRequired).toBe(false);
    });

    it('source por defecto es web', async () => {
      const doc = await new SymptomReport(buildReport()).save();
      expect(doc.source).toBe('web');
    });

    it('reportedAt tiene valor por defecto', async () => {
      const doc = await new SymptomReport(buildReport()).save();
      expect(doc.reportedAt).toBeInstanceOf(Date);
    });
  });

  // ─── Embedded symptoms ─────────────────────────────────────────────────────

  describe('embedded symptoms', () => {
    it('guarda síntomas con name y severity', async () => {
      const doc = await new SymptomReport(buildReport({
        symptoms: [
          { name: 'tos', severity: 'mild' },
          { name: 'fiebre', severity: 'severe' },
        ],
      })).save();
      expect(doc.symptoms).toHaveLength(2);
    });

    it('síntoma falla sin name', async () => {
      const doc = new SymptomReport(buildReport({
        symptoms: [{ severity: 'mild' }],
      }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('síntoma falla con severity inválida', async () => {
      const doc = new SymptomReport(buildReport({
        symptoms: [{ name: 'tos', severity: 'extreme' }],
      }));
      await expect(doc.save()).rejects.toThrow();
    });

    it('síntoma acepta duration con unit days', async () => {
      const doc = await new SymptomReport(buildReport({
        symptoms: [{ name: 'tos', severity: 'mild', duration: { value: 3, unit: 'days' } }],
      })).save();
      expect(doc.symptoms[0].duration.unit).toBe('days');
    });

    it('síntoma rechaza unit inválido en duration', async () => {
      const doc = new SymptomReport(buildReport({
        symptoms: [{ name: 'tos', severity: 'mild', duration: { value: 3, unit: 'months' } }],
      }));
      await expect(doc.save()).rejects.toThrow();
    });
  });

  // ─── Instance method: calculateSeverity() ─────────────────────────────────

  describe('calculateSeverity()', () => {
    it('retorna high con 2 síntomas severe', () => {
      const doc = new SymptomReport(buildReport({
        symptoms: [
          { name: 'tos', severity: 'severe' },
          { name: 'fiebre', severity: 'severe' },
        ],
      }));
      const result = doc.calculateSeverity();
      expect(result).toBe('high');
      expect(doc.overallSeverity).toBe('high');
      expect(doc.medicalAttentionRequired).toBe(true);
    });

    it('retorna high con 1 severe y 2 moderate', () => {
      const doc = new SymptomReport(buildReport({
        symptoms: [
          { name: 's1', severity: 'severe' },
          { name: 's2', severity: 'moderate' },
          { name: 's3', severity: 'moderate' },
        ],
      }));
      const result = doc.calculateSeverity();
      expect(result).toBe('high');
    });

    it('retorna medium con 1 severe', () => {
      const doc = new SymptomReport(buildReport({
        symptoms: [
          { name: 's1', severity: 'severe' },
        ],
      }));
      const result = doc.calculateSeverity();
      expect(result).toBe('medium');
    });

    it('retorna medium con 2 moderate', () => {
      const doc = new SymptomReport(buildReport({
        symptoms: [
          { name: 's1', severity: 'moderate' },
          { name: 's2', severity: 'moderate' },
        ],
      }));
      const result = doc.calculateSeverity();
      expect(result).toBe('medium');
    });

    it('retorna low con síntomas mild', () => {
      const doc = new SymptomReport(buildReport({
        symptoms: [
          { name: 's1', severity: 'mild' },
          { name: 's2', severity: 'mild' },
        ],
      }));
      const result = doc.calculateSeverity();
      expect(result).toBe('low');
    });
  });

  // ─── Virtuals ──────────────────────────────────────────────────────────────

  describe('virtuals', () => {
    it('riskLevel es high cuando overallSeverity es high', async () => {
      const doc = await new SymptomReport(buildReport({ overallSeverity: 'high' })).save();
      expect(doc.riskLevel).toBe('high');
    });

    it('riskLevel es high cuando medicalAttentionRequired es true', async () => {
      const doc = await new SymptomReport(buildReport({ medicalAttentionRequired: true })).save();
      expect(doc.riskLevel).toBe('high');
    });

    it('riskLevel es medium cuando overallSeverity es medium', async () => {
      const doc = await new SymptomReport(buildReport({ overallSeverity: 'medium' })).save();
      expect(doc.riskLevel).toBe('medium');
    });

    it('riskLevel es low cuando overallSeverity es low', async () => {
      const doc = await new SymptomReport(buildReport({ overallSeverity: 'low' })).save();
      expect(doc.riskLevel).toBe('low');
    });

    it('daysSinceReport retorna número >= 0', async () => {
      const doc = await new SymptomReport(buildReport()).save();
      expect(doc.daysSinceReport).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Static methods ────────────────────────────────────────────────────────

  describe('statics', () => {
    describe('getByDistrict()', () => {
      it('retorna reportes del distrito indicado', async () => {
        await new SymptomReport(buildReport({ location: { district: 'Pocollay', coordinates: { latitude: -18.0, longitude: -70.25 } } })).save();
        await new SymptomReport(buildReport({ location: { district: 'Pocollay', coordinates: { latitude: -18.0, longitude: -70.25 } } })).save();
        await new SymptomReport(buildReport({ location: { district: 'Ciudad Nueva', coordinates: { latitude: -18.0, longitude: -70.25 } } })).save();

        const results = await SymptomReport.getByDistrict('Pocollay');
        expect(results.length).toBe(2);
        results.forEach((r: any) => {
          expect(r.location.district).toBe('Pocollay');
        });
      });

      it('retorna array vacío para distrito sin reportes', async () => {
        const results = await SymptomReport.getByDistrict('Calana');
        expect(results).toHaveLength(0);
      });

      it('acepta filtro de severity', async () => {
        await new SymptomReport(buildReport({
          location: { district: 'Pocollay', coordinates: { latitude: -18.0, longitude: -70.25 } },
          overallSeverity: 'high',
        })).save();
        await new SymptomReport(buildReport({
          location: { district: 'Pocollay', coordinates: { latitude: -18.0, longitude: -70.25 } },
          overallSeverity: 'low',
        })).save();

        const results = await SymptomReport.getByDistrict('Pocollay', { severity: 'high' });
        expect(results.every((r: any) => r.overallSeverity === 'high')).toBe(true);
      });

      it('acepta filtros de fecha', async () => {
        const results = await SymptomReport.getByDistrict('Centro de Tacna', {
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
        });
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('getAggregatedByDistrict()', () => {
      it('retorna array vacío cuando no hay reportes', async () => {
        const results = await SymptomReport.getAggregatedByDistrict();
        expect(results).toHaveLength(0);
      });

      it('agrega correctamente por distrito', async () => {
        await new SymptomReport(buildReport({
          location: { district: 'Pocollay', coordinates: { latitude: -18.0, longitude: -70.25 } },
          overallSeverity: 'low',
        })).save();
        await new SymptomReport(buildReport({
          location: { district: 'Pocollay', coordinates: { latitude: -18.0, longitude: -70.25 } },
          overallSeverity: 'high',
        })).save();

        const results = await SymptomReport.getAggregatedByDistrict();
        const pocollay = results.find((r: any) => r.district === 'Pocollay');
        expect(pocollay).toBeDefined();
        expect(pocollay.totalCases).toBe(2);
        expect(pocollay.highSeverity).toBe(1);
        expect(pocollay.lowSeverity).toBe(1);
      });

      it('acepta filtros de fecha', async () => {
        const results = await SymptomReport.getAggregatedByDistrict({
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
        });
        expect(Array.isArray(results)).toBe(true);
      });

      it('incluye coordenadas promedio', async () => {
        await new SymptomReport(buildReport({
          location: { district: 'Centro de Tacna', coordinates: { latitude: -18.0, longitude: -70.25 } },
        })).save();

        const results = await SymptomReport.getAggregatedByDistrict();
        const centro = results.find((r: any) => r.district === 'Centro de Tacna');
        expect(centro.coordinates).toBeDefined();
        expect(centro.coordinates.latitude).toBeCloseTo(-18.0, 1);
      });
    });
  });

  // ─── Optional fields ───────────────────────────────────────────────────────

  describe('optional fields', () => {
    it('guarda preexistingConditions como array de strings', async () => {
      const doc = await new SymptomReport(buildReport({
        hasPreexistingConditions: true,
        preexistingConditions: ['diabetes', 'hipertensión'],
      })).save();
      expect(doc.preexistingConditions).toContain('diabetes');
    });

    it('guarda contactInfo con phone y email', async () => {
      const doc = await new SymptomReport(buildReport({
        contactInfo: { phone: '+51999999999', email: 'paciente@test.com' },
      })).save();
      expect(doc.contactInfo.phone).toBe('+51999999999');
    });

    it('guarda notes sin problemas', async () => {
      const doc = await new SymptomReport(buildReport({
        notes: 'El paciente presenta mejoría después de 2 días',
      })).save();
      expect(doc.notes).toContain('mejoría');
    });

    it('guarda patientId cuando se proporciona', async () => {
      const patientId = 'patient-001';
      const doc = await new SymptomReport(buildReport({ patientId })).save();
      expect(doc.patientId).toBe(patientId);
    });
  });

  // ─── Queries ───────────────────────────────────────────────────────────────

  describe('queries', () => {
    it('permite buscar por patientId', async () => {
      const patientId = 'query-patient-1';
      await new SymptomReport(buildReport({ patientId })).save();
      await new SymptomReport(buildReport({ patientId })).save();
      await new SymptomReport(buildReport({ patientId: 'other-patient' })).save();

      const results = await SymptomReport.find({ patientId });
      expect(results).toHaveLength(2);
    });

    it('permite buscar por status', async () => {
      await new SymptomReport(buildReport({ status: 'urgent' })).save();
      await new SymptomReport(buildReport({ status: 'pending' })).save();

      const urgent = await SymptomReport.find({ status: 'urgent' });
      expect(urgent).toHaveLength(1);
    });

    it('permite buscar por category', async () => {
      await new SymptomReport(buildReport({ category: 'fever' })).save();
      await new SymptomReport(buildReport({ category: 'respiratory' })).save();

      const fever = await SymptomReport.find({ category: 'fever' });
      expect(fever).toHaveLength(1);
    });
  });
});