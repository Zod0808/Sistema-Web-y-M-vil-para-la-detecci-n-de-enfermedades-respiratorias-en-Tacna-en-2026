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
  risks: [],
  benefits: [],
  alternatives: [],
  metadata: {},
  save: jest.fn().mockResolvedValue(undefined),
  revoke: jest.fn().mockResolvedValue(undefined),
  isSigned: jest.fn().mockReturnValue(true),
  canBeSigned: jest.fn().mockReturnValue(true),
  addSignature: jest.fn().mockResolvedValue(undefined),
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
    it('crea un consentimiento informado en estado draft', async () => {
      UserModel.findById
        .mockResolvedValueOnce({ _id: 'doctor-1', name: 'Dra. García', role: 'doctor' }) // doctor
        .mockResolvedValueOnce({ _id: 'patient-1', name: 'Juan Pérez', role: 'patient' }); // patient
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

    it('lanza error si el doctor no es válido', async () => {
      UserModel.findById.mockResolvedValueOnce(null); // doctor inexistente
      await expect(consentService.createConsent(buildCreatePayload())).rejects.toThrow(
        'El doctor no existe o no es válido'
      );
    });

    it('lanza error si el paciente no existe', async () => {
      UserModel.findById
        .mockResolvedValueOnce({ _id: 'doctor-1', role: 'doctor' })
        .mockResolvedValueOnce(null);
      await expect(consentService.createConsent(buildCreatePayload())).rejects.toThrow(
        'El paciente no existe'
      );
    });
  });

  describe('presentConsent', () => {
    it('presenta el consentimiento al paciente y crea alerta', async () => {
      const consent = buildConsent({ status: 'draft' });
      InformedConsentModel.findById.mockResolvedValue(consent);
      alertService.createAlert.mockResolvedValue(undefined);

      await consentService.presentConsent('consent-1', 'doctor-1');

      expect(consent.save).toHaveBeenCalled();
      expect(consent.status).toBe('pending_signature');
      expect(alertService.createAlert).toHaveBeenCalled();
    });

    it('lanza error cuando el consentimiento no existe', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);

      await expect(consentService.presentConsent('nonexistent', 'doctor-1')).rejects.toThrow(
        'Consentimiento no encontrado'
      );
    });

    it('rechaza presentar un consentimiento que no está en borrador', async () => {
      InformedConsentModel.findById.mockResolvedValue(buildConsent({ status: 'signed' }));
      await expect(consentService.presentConsent('consent-1', 'doctor-1')).rejects.toThrow(
        'Solo se pueden presentar consentimientos en borrador'
      );
    });
  });

  describe('addSignature', () => {
    const signableConsent = (overrides: Partial<any> = {}) =>
      buildConsent({
        status: 'pending_signature',
        canBeSigned: jest.fn().mockReturnValue(true),
        addSignature: jest.fn().mockResolvedValue(undefined),
        ...overrides,
      });

    it('agrega la firma del paciente y notifica al doctor', async () => {
      const consent = signableConsent();
      InformedConsentModel.findById.mockResolvedValue(consent);
      UserModel.findById.mockResolvedValue({ _id: 'patient-1', name: 'Juan Pérez' });
      alertService.createAlert.mockResolvedValue(undefined);

      await consentService.addSignature('consent-1', buildSignaturePayload());

      expect(consent.addSignature).toHaveBeenCalledWith(
        expect.objectContaining({ signerRole: 'patient', signerId: 'patient-1' })
      );
      expect(alertService.createAlert).toHaveBeenCalled();
    });

    it('lanza error cuando el consentimiento no existe al firmar', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);

      await expect(
        consentService.addSignature('nonexistent', buildSignaturePayload())
      ).rejects.toThrow('Consentimiento no encontrado');
    });

    it('lanza error cuando el consentimiento no puede firmarse', async () => {
      const consent = signableConsent({ canBeSigned: jest.fn().mockReturnValue(false) });
      InformedConsentModel.findById.mockResolvedValue(consent);

      await expect(
        consentService.addSignature('consent-1', buildSignaturePayload())
      ).rejects.toThrow('El consentimiento no puede ser firmado');
    });
  });

  describe('revokeConsent', () => {
    it('revoca un consentimiento activo', async () => {
      const consent = buildConsent({ status: 'completed' });
      consent.revoke = jest.fn(async () => {
        consent.status = 'revoked';
      });
      InformedConsentModel.findById.mockResolvedValue(consent);
      alertService.createAlert.mockResolvedValue(undefined);

      await consentService.revokeConsent('consent-1', 'Revocación por voluntad', 'patient-1');

      expect(consent.revoke).toHaveBeenCalledWith('Revocación por voluntad', 'patient-1');
      expect(consent.save).toHaveBeenCalled();
      expect(consent.status).toBe('revoked');
    });

    it('lanza error cuando el consentimiento no existe', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);

      await expect(
        consentService.revokeConsent('nonexistent', 'Motivo', 'patient-1')
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
      consent.isSigned = jest.fn().mockReturnValue(true);
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

    it('lanza 400 cuando el consentimiento aún no está firmado', async () => {
      const consent = buildConsent({ status: 'pending_signature' });
      consent.isSigned = jest.fn().mockReturnValue(false);
      InformedConsentModel.findById.mockResolvedValue(consent);

      await expect(consentService.generateConsentPDF('consent-1')).rejects.toThrow(
        'El consentimiento debe estar firmado',
      );
    });

    it('rellena firmas y campos opcionales con valores por defecto', async () => {
      const consent = buildConsent({
        patientName: undefined,
        doctorName: undefined,
        description: undefined,
        procedureDetails: undefined,
        risks: undefined,
        benefits: undefined,
        alternatives: undefined,
      });
      consent.isSigned = jest.fn().mockReturnValue(true);
      InformedConsentModel.findById.mockResolvedValue(consent);

      const pdf = await consentService.generateConsentPDF('consent-1');
      expect(pdf).toBeInstanceOf(Buffer);
    });
  });

  describe('getConsentById', () => {
    it('retorna el consentimiento cuando existe', async () => {
      const consent = buildConsent();
      InformedConsentModel.findById.mockResolvedValue(consent);
      const result = await consentService.getConsentById('consent-1');
      expect(result).toBe(consent);
    });

    it('retorna null cuando no existe', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);
      const result = await consentService.getConsentById('nope');
      expect(result).toBeNull();
    });
  });

  describe('listConsents con filtros', () => {
    const setupFind = (results: any[] = [], total = 0) => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(results),
      };
      InformedConsentModel.find.mockReturnValue(chain);
      InformedConsentModel.countDocuments.mockResolvedValue(total);
      return chain;
    };

    it('aplica filtro por patientId, doctorId, status, consentType', async () => {
      setupFind([buildConsent()], 1);
      await consentService.listConsents({
        patientId: 'p1',
        doctorId: 'd1',
        status: 'signed',
        consentType: 'surgical',
      });

      expect(InformedConsentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'p1',
          doctorId: 'd1',
          status: 'signed',
          consentType: 'surgical',
        }),
      );
    });

    it('aplica rango de fechas con $gte y $lte', async () => {
      setupFind([], 0);
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-04-01');
      await consentService.listConsents({ startDate, endDate });

      expect(InformedConsentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
      );
    });

    it('aplica solo startDate cuando no hay endDate', async () => {
      setupFind([], 0);
      const startDate = new Date('2026-01-01');
      await consentService.listConsents({ startDate });

      const call = InformedConsentModel.find.mock.calls[0][0];
      expect(call.createdAt).toEqual({ $gte: startDate });
    });

    it('calcula totalPages correctamente', async () => {
      setupFind([buildConsent()], 25);
      const result = await consentService.listConsents({ limit: 10 });
      expect(result.totalPages).toBe(3);
    });
  });

  describe('updateConsent', () => {
    it('actualiza y retorna el consentimiento', async () => {
      const consent = buildConsent({ status: 'draft' });
      InformedConsentModel.findById.mockResolvedValue(consent);

      const result = await consentService.updateConsent(
        'consent-1',
        { title: 'Nuevo título' } as any,
        'user-1',
      );

      expect(consent.save).toHaveBeenCalled();
      expect(result.title).toBe('Nuevo título');
      expect(consent.metadata.lastUpdatedBy).toBe('user-1');
    });

    it('404 cuando no existe', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);
      await expect(
        consentService.updateConsent('x', {} as any, 'u1'),
      ).rejects.toThrow('no encontrado');
    });

    it('400 cuando el consentimiento está firmado', async () => {
      InformedConsentModel.findById.mockResolvedValue(buildConsent({ status: 'signed' }));
      await expect(
        consentService.updateConsent('c1', {} as any, 'u1'),
      ).rejects.toThrow('firmado o revocado');
    });

    it('400 cuando el consentimiento está revocado', async () => {
      InformedConsentModel.findById.mockResolvedValue(buildConsent({ status: 'revoked' }));
      await expect(
        consentService.updateConsent('c1', {} as any, 'u1'),
      ).rejects.toThrow('firmado o revocado');
    });
  });

  describe('getConsentStats', () => {
    it('agrega conteos por status y tipo', async () => {
      InformedConsentModel.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // draft
        .mockResolvedValueOnce(2)  // pending_signature
        .mockResolvedValueOnce(4)  // signed
        .mockResolvedValueOnce(1)  // revoked
        .mockResolvedValueOnce(0); // expired
      InformedConsentModel.find.mockResolvedValue([
        buildConsent({ consentType: 'surgery' }),
        buildConsent({ consentType: 'surgery' }),
        buildConsent({ consentType: 'treatment' }),
      ]);

      const stats = await consentService.getConsentStats();

      expect(stats).toMatchObject({
        total: 10,
        draft: 3,
        pendingSignature: 2,
        signed: 4,
        revoked: 1,
        expired: 0,
      });
      expect(stats.byType.surgery).toBe(2);
      expect(stats.byType.treatment).toBe(1);
    });

    it('filtra por doctorId cuando se provee', async () => {
      InformedConsentModel.countDocuments.mockResolvedValue(0);
      InformedConsentModel.find.mockResolvedValue([]);
      await consentService.getConsentStats('doctor-1');
      expect(InformedConsentModel.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: 'doctor-1' }),
      );
    });
  });

  describe('getPendingSignatures / getExpiredConsents', () => {
    it('getPendingSignatures delega a findPendingSignatures', async () => {
      InformedConsentModel.findPendingSignatures = jest.fn().mockResolvedValue([buildConsent()]);
      const result = await consentService.getPendingSignatures('p1');
      expect(InformedConsentModel.findPendingSignatures).toHaveBeenCalledWith('p1');
      expect(result).toHaveLength(1);
    });

    it('getExpiredConsents delega a findExpired', async () => {
      InformedConsentModel.findExpired = jest.fn().mockResolvedValue([]);
      const result = await consentService.getExpiredConsents();
      expect(InformedConsentModel.findExpired).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('verifySignature', () => {
    it('retorna valid:true cuando el hash del certificado coincide', async () => {
      const signedAt = new Date();
      const consent = buildConsent({
        signatures: [
          {
            certificateHash: 'HASH-abc',
            signatureData: 'data:image/png;base64,xyz',
            signerId: 'patient-1',
            signedAt,
          },
        ],
      });
      InformedConsentModel.findById.mockResolvedValue(consent);

      const result = await consentService.verifySignature('consent-1', 'HASH-abc');
      expect(result.valid).toBe(true);
      expect(result.signature).toBeDefined();
    });

    it('retorna valid:false cuando no encuentra firma con ese hash', async () => {
      InformedConsentModel.findById.mockResolvedValue(
        buildConsent({ signatures: [] }),
      );
      const result = await consentService.verifySignature('consent-1', 'HASH-missing');
      expect(result).toEqual({ valid: false });
    });

    it('404 cuando el consentimiento no existe', async () => {
      InformedConsentModel.findById.mockResolvedValue(null);
      await expect(
        consentService.verifySignature('missing', 'HASH-x'),
      ).rejects.toThrow('no encontrado');
    });
  });
});