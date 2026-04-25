import { EmergencyMedicalInfoService } from '../../../src/services/emergencyMedicalInfoService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/fhirService', () => ({
  fhirService: {
    getResource: jest.fn(),
    search: jest.fn(),
  },
}));

jest.mock('../../../src/services/labService', () => ({
  labService: {
    getResults: jest.fn().mockResolvedValue([]),
  },
}));

const { fhirService } = require('../../../src/services/fhirService');
const { labService } = require('../../../src/services/labService');

const buildPatientFhir = (overrides: any = {}) => ({
  resourceType: 'Patient',
  id: 'patient-1',
  name: [{ given: ['Juan'], family: 'Pérez' }],
  gender: 'male',
  birthDate: '1980-04-15',
  contact: [],
  ...overrides,
});

const buildEmptyBundle = () => ({ entry: [] });

describe('EmergencyMedicalInfoService', () => {
  let service: EmergencyMedicalInfoService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmergencyMedicalInfoService();

    // Default mocks
    fhirService.getResource.mockResolvedValue(buildPatientFhir());
    fhirService.search.mockResolvedValue(buildEmptyBundle());
    labService.getResults.mockResolvedValue([]);
  });

  describe('getEmergencyMedicalInfo', () => {
    it('retorna información básica del paciente desde FHIR', async () => {
      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.patientId).toBe('patient-1');
      expect(info.patientName).toBe('Juan Pérez');
      expect(info.gender).toBe('male');
    });

    it('calcula edad correctamente desde birthDate', async () => {
      fhirService.getResource.mockResolvedValue(buildPatientFhir({ birthDate: '1980-01-01' }));

      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.age).toBeGreaterThanOrEqual(45);
    });

    it('retorna undefined para age cuando no hay birthDate', async () => {
      fhirService.getResource.mockResolvedValue(buildPatientFhir({ birthDate: undefined }));

      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.age).toBeUndefined();
    });

    it('incluye alergias desde FHIR AllergyIntolerance', async () => {
      fhirService.search.mockImplementation((resourceType: string) => {
        if (resourceType === 'AllergyIntolerance') {
          return Promise.resolve({
            entry: [
              { resource: { code: { text: 'Penicilina' } } },
              { resource: { code: { text: 'Aspirina' } } },
            ],
          });
        }
        return Promise.resolve(buildEmptyBundle());
      });

      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.allergies).toContain('Penicilina');
      expect(info.allergies).toContain('Aspirina');
    });

    it('incluye condiciones crónicas desde FHIR Condition', async () => {
      fhirService.search.mockImplementation((resourceType: string) => {
        if (resourceType === 'Condition') {
          return Promise.resolve({
            entry: [{ resource: { code: { text: 'Hipertensión arterial' } } }],
          });
        }
        return Promise.resolve(buildEmptyBundle());
      });

      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.chronicConditions).toContain('Hipertensión arterial');
    });

    it('incluye resultados de laboratorio recientes', async () => {
      labService.getResults.mockResolvedValue([
        { testName: 'Glucosa', value: 95, date: new Date(), status: 'normal' },
      ]);

      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.recentLabResults).toHaveLength(1);
      expect(info.recentLabResults![0].testName).toBe('Glucosa');
    });

    it('incluye signos vitales desde FHIR Observation', async () => {
      fhirService.search.mockImplementation((resourceType: string, params: any) => {
        if (resourceType === 'Observation' && params.category === 'vital-signs') {
          return Promise.resolve({
            entry: [
              {
                resource: {
                  code: { text: 'Presión arterial' },
                  valueQuantity: { value: 120, unit: 'mmHg' },
                  effectiveDateTime: '2026-04-10T10:00:00Z',
                },
              },
            ],
          });
        }
        return Promise.resolve(buildEmptyBundle());
      });

      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.vitalSignsHistory).toHaveLength(1);
      expect(info.vitalSignsHistory![0].type).toBe('Presión arterial');
    });

    it('incluye información de seguro desde Coverage', async () => {
      fhirService.search.mockImplementation((resourceType: string) => {
        if (resourceType === 'Coverage') {
          return Promise.resolve({
            entry: [
              {
                resource: {
                  payor: [{ display: 'Seguro EsSalud' }],
                  subscriberId: 'POL-12345',
                },
              },
            ],
          });
        }
        return Promise.resolve(buildEmptyBundle());
      });

      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.insuranceInfo?.provider).toBe('Seguro EsSalud');
      expect(info.insuranceInfo?.policyNumber).toBe('POL-12345');
    });

    it('incluye contactos de emergencia del paciente', async () => {
      const patient = buildPatientFhir({
        contact: [
          {
            relationship: [{ text: 'Emergency contact', coding: [{ code: 'C' }] }],
            name: { text: 'María Pérez' },
            telecom: [{ system: 'phone', value: '+51999123456' }],
          },
        ],
      });
      fhirService.getResource.mockResolvedValue(patient);

      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.emergencyContacts).toBeDefined();
      expect(info.emergencyContacts!.length).toBeGreaterThan(0);
    });

    it('lanza AppError 500 cuando getResource falla', async () => {
      fhirService.getResource.mockRejectedValue(new Error('FHIR unavailable'));

      await expect(service.getEmergencyMedicalInfo('patient-1')).rejects.toMatchObject({ statusCode: 500 });
    });

    it('retorna alergias vacías cuando el bundle no tiene entries', async () => {
      fhirService.search.mockResolvedValue({ entry: undefined });

      const info = await service.getEmergencyMedicalInfo('patient-1');

      expect(info.allergies).toEqual([]);
    });
  });

  describe('generateEmergencySummary', () => {
    const buildRequest = (): any => ({
      patientId: 'patient-1',
      emergencyType: 'medical',
      severity: 'high',
      description: 'Test',
      location: {},
    });

    it('genera resumen con información del paciente', async () => {
      fhirService.search.mockImplementation((resourceType: string) => {
        if (resourceType === 'AllergyIntolerance') {
          return Promise.resolve({
            entry: [{ resource: { code: { text: 'Penicilina' } } }],
          });
        }
        return Promise.resolve(buildEmptyBundle());
      });

      const summary = await service.generateEmergencySummary(buildRequest());

      expect(summary).toContain('=== INFORMACIÓN MÉDICA DE EMERGENCIA ===');
      expect(summary).toContain('Juan Pérez');
      expect(summary).toContain('ALERGIAS (CRÍTICO)');
      expect(summary).toContain('Penicilina');
    });

    it('retorna mensaje de error cuando falla getEmergencyMedicalInfo', async () => {
      fhirService.getResource.mockRejectedValue(new Error('FHIR error'));

      const summary = await service.generateEmergencySummary(buildRequest());

      expect(summary).toContain('Error al obtener información médica');
    });

    it('incluye DNR en resumen cuando está presente', async () => {
      fhirService.search.mockImplementation((resourceType: string) => {
        if (resourceType === 'Consent') {
          return Promise.resolve({
            entry: [
              {
                resource: {
                  category: [{ coding: [{ code: '59259-5' }] }],
                  provision: {
                    code: [{ coding: [{ code: '304251004' }] }],
                  },
                },
              },
            ],
          });
        }
        return Promise.resolve(buildEmptyBundle());
      });

      const summary = await service.generateEmergencySummary(buildRequest());

      expect(summary).toContain('DNR');
    });
  });
});