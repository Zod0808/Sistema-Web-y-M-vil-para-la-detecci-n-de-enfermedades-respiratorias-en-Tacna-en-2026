import consentService from '../../../src/services/consentService';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/models/InformedConsent', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn(), find: jest.fn() },
}));

jest.mock('../../../src/services/alertService', () => ({
  alertService: { createAlert: jest.fn() },
}));

jest.mock('../../../src/utils/pdfGenerator', () => ({
  generateMedicalPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));

const InformedConsentModel = require('../../../src/models/InformedConsent').default;
const UserModel = require('../../../src/models/User').default;
const { alertService } = require('../../../src/services/alertService');

const buildConsent = (overrides: Partial<any> = {}) => ({
  _id: 'consent-1',
  patientId: 'patient-1',
  patientName: 'Juan Pérez',
  doctorId: 'doctor-1',
  doctorName: 'Dra. García',
  consentType: 'surgical',
  title: 'Consentimiento para Procedimiento',
  description: 'Descripción del procedimiento médico',
  status: 'pending',
  version: '1.0',
  patientSignature: null,
  doctorSignature: null,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const buildCreatePayload = (overrides: Partial<any> = {}) => ({
  patientId: 'patient-1',
  patientName: 'Juan Pérez',
  doctorId: 'doctor-1',
  doctorName: 'Dra. García',
  consentType: 'surgical' as const,
  title: 'Consentimiento para Cirugía',
  description: 'Descripción completa del procedimiento quirúrgico',
  risks: ['Infección', 'Hemorragia'],
  benefits: ['Mejoría clínica', 'Alivio de síntomas'],
  ...overrides,
});

const buildSignaturePayload = () => ({
  signerId: 'patient-1',
  signerName: 'Juan Pérez',
  signerRole: 'patient' as const,
  signatureData: 'data:image/png;base64,abc123==',
  signatureMethod: 'digital' as const,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
});

describe('consentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createConsent', () => {
    it('crea un consentimiento informado', async () => {
      const consent = buildConsent();
      InformedConsentModel.create.mockResolvedValue(consent);
      alertService.createAlert.mockResolvedValue(undefined);

      const result = await consentService.createConsent(buildCreatePayload());

      expect(InformedConsentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-1',
          status: 'draft',
        })
      );
      expect(result).toEqual(consent);
    });

    it('propaga error si falla la creación', async () => {
      InformedConsentModel.create.mockRejectedValue(new Error('DB error'));

      await expect(consentService.createConsent(buildCreatePayload())).rejects.toThrow('DB error');
    });
  });

  describe('presentConsent', () => {
    it('presenta el consentimiento al paciente y crea alerta', async () => {
      const consent = buildConsent({ status: 'draft' });
      InformedConsentModel.findById.mockResolvedValue(consent);
      alertService.createAlert.mockResolvedValue(undefined);

      await consentService.presentConsent('consent-1', 'doctor-1');

      expect(consent.save).toHaveBeenCalled();
      expect(consent.status).toBe('pending');
      expect(alertService.createAlert).toHaveBeenCalled();
    });

    it('lanza error cuando el consentimiento no existe', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);

      await expect(consentService.presentConsent('nonexistent', 'doctor-1')).rejects.toThrow(
        'Consentimiento no encontrado'
      );
    });
  });

  describe('signConsent', () => {
    it('permite al paciente firmar el consentimiento', async () => {
      const consent = buildConsent({ status: 'pending' });
      InformedConsentModel.findById.mockResolvedValue(consent);
      alertService.createAlert.mockResolvedValue(undefined);

      await consentService.signConsent('consent-1', buildSignaturePayload());

      expect(consent.save).toHaveBeenCalled();
      expect(consent.patientSignature).toBeDefined();
    });

    it('lanza error cuando el consentimiento no existe al firmar', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);

      await expect(
        consentService.signConsent('nonexistent', buildSignaturePayload())
      ).rejects.toThrow('Consentimiento no encontrado');
    });

    it('lanza error cuando el estado del consentimiento no permite firma', async () => {
      const consent = buildConsent({ status: 'completed' });
      InformedConsentModel.findById.mockResolvedValue(consent);

      await expect(
        consentService.signConsent('consent-1', buildSignaturePayload())
      ).rejects.toThrow();
    });
  });

  describe('revokeConsent', () => {
    it('revoca un consentimiento activo', async () => {
      const consent = buildConsent({ status: 'completed' });
      InformedConsentModel.findById.mockResolvedValue(consent);
      alertService.createAlert.mockResolvedValue(undefined);

      await consentService.revokeConsent('consent-1', 'patient-1', 'Revocación por voluntad');

      expect(consent.save).toHaveBeenCalled();
      expect(consent.status).toBe('revoked');
    });

    it('lanza error cuando el consentimiento no existe', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);

      await expect(
        consentService.revokeConsent('nonexistent', 'patient-1', 'Motivo')
      ).rejects.toThrow('Consentimiento no encontrado');
    });
  });

  describe('listConsents', () => {
    it('retorna lista paginada de consentimientos', async () => {
      const consents = [buildConsent(), buildConsent({ _id: 'consent-2' })];
      InformedConsentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(consents),
          }),
        }),
      });
      InformedConsentModel.countDocuments.mockResolvedValue(2);

      const result = await consentService.listConsents({ page: 1, limit: 10 });

      expect(result.consents).toEqual(consents);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });

  describe('generateConsentPDF', () => {
    it('genera PDF del consentimiento', async () => {
      const consent = buildConsent({
        status: 'completed',
        patientSignature: { signerName: 'Juan Pérez', signedAt: new Date() },
        doctorSignature: { signerName: 'Dra. García', signedAt: new Date() },
      });
      InformedConsentModel.findById.mockResolvedValue(consent);

      const pdf = await consentService.generateConsentPDF('consent-1');

      expect(pdf).toBeInstanceOf(Buffer);
    });

    it('lanza error cuando el consentimiento no existe', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);

      await expect(consentService.generateConsentPDF('nonexistent')).rejects.toThrow(
        'Consentimiento no encontrado'
      );
    });
  });
});