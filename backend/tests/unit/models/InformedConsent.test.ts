import mongoose from 'mongoose';
import InformedConsentModel from '../../../src/models/InformedConsent';
import { ElectronicSignature } from '../../../src/models/InformedConsent';

jest.mock('../../../src/utils/encryption', () => ({
  applyFieldEncryption: (_schema: any) => {},
}));

const buildConsentData = (overrides: Partial<Record<string, any>> = {}) => ({
  patientId: new mongoose.Types.ObjectId().toString(),
  patientName: 'Juan Pérez López',
  doctorId: new mongoose.Types.ObjectId().toString(),
  doctorName: 'Dra. Ana García',
  consentType: 'procedure',
  title: 'Consentimiento para Procedimiento',
  description: 'Descripción del procedimiento médico que se realizará',
  status: 'draft',
  ...overrides,
});

const buildSignature = (overrides: Partial<Omit<ElectronicSignature, 'signedAt'>> = {}) => ({
  signerId: 'patient-1',
  signerName: 'Juan Pérez',
  signerRole: 'patient' as const,
  signatureData: 'data:image/png;base64,abc123==',
  signatureMethod: 'digital' as const,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  ...overrides,
});

describe('InformedConsent model', () => {
  afterEach(async () => {
    await InformedConsentModel.deleteMany({});
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('Validaciones', () => {
    it('crea un consentimiento válido con campos requeridos', async () => {
      const data = buildConsentData();
      const consent = await InformedConsentModel.create(data);

      expect(consent._id).toBeDefined();
      expect(consent.patientId).toBe(data.patientId);
      expect(consent.status).toBe('draft');
      expect(consent.version).toBe('1.0');
      expect(consent.language).toBe('es');
    });

    it('falla sin patientId', async () => {
      const data = buildConsentData({ patientId: undefined });
      await expect(InformedConsentModel.create(data)).rejects.toThrow();
    });

    it('falla sin patientName', async () => {
      const data = buildConsentData({ patientName: undefined });
      await expect(InformedConsentModel.create(data)).rejects.toThrow();
    });

    it('falla sin doctorId', async () => {
      const data = buildConsentData({ doctorId: undefined });
      await expect(InformedConsentModel.create(data)).rejects.toThrow();
    });

    it('falla sin title', async () => {
      const data = buildConsentData({ title: undefined });
      await expect(InformedConsentModel.create(data)).rejects.toThrow();
    });

    it('falla sin description', async () => {
      const data = buildConsentData({ description: undefined });
      await expect(InformedConsentModel.create(data)).rejects.toThrow();
    });

    it('falla con consentType inválido', async () => {
      const data = buildConsentData({ consentType: 'invalid_type' });
      await expect(InformedConsentModel.create(data)).rejects.toThrow();
    });

    it('falla con status inválido', async () => {
      const data = buildConsentData({ status: 'invalid_status' });
      await expect(InformedConsentModel.create(data)).rejects.toThrow();
    });

    it('falla cuando title excede 200 caracteres', async () => {
      const data = buildConsentData({ title: 'a'.repeat(201) });
      await expect(InformedConsentModel.create(data)).rejects.toThrow();
    });

    it('acepta todos los tipos de consentimiento válidos', async () => {
      const types = ['procedure', 'treatment', 'surgery', 'research', 'data_sharing', 'photography', 'video_recording', 'other'];
      for (const consentType of types) {
        const consent = await InformedConsentModel.create(buildConsentData({ consentType }));
        expect(consent.consentType).toBe(consentType);
      }
    });

    it('inicializa arrays vacíos por defecto', async () => {
      const consent = await InformedConsentModel.create(buildConsentData());
      expect(consent.risks).toEqual([]);
      expect(consent.benefits).toEqual([]);
      expect(consent.alternatives).toEqual([]);
      expect(consent.signatures).toEqual([]);
      expect(consent.attachments).toEqual([]);
    });
  });

  describe('Instance methods', () => {
    it('addSignature para paciente cambia estado a signed', async () => {
      const consent = await InformedConsentModel.create(
        buildConsentData({ status: 'pending_signature' })
      );
      await consent.addSignature(buildSignature({ signerRole: 'patient' }));

      const updated = await InformedConsentModel.findById(consent._id);
      expect(updated!.status).toBe('signed');
      expect(updated!.patientSignature).toBeDefined();
      expect(updated!.signedAt).toBeDefined();
      expect(updated!.signatures).toHaveLength(1);
    });

    it('addSignature para doctor no cambia estado', async () => {
      const consent = await InformedConsentModel.create(buildConsentData());
      await consent.addSignature(buildSignature({ signerRole: 'doctor', signerId: 'doctor-1', signerName: 'Dr. García' }));

      const updated = await InformedConsentModel.findById(consent._id);
      expect(updated!.doctorSignature).toBeDefined();
      expect(updated!.status).toBe('draft');
    });

    it('addSignature para testigo registra witnessSignature', async () => {
      const consent = await InformedConsentModel.create(buildConsentData());
      await consent.addSignature(buildSignature({ signerRole: 'witness', signerId: 'witness-1', signerName: 'Testigo 1' }));

      const updated = await InformedConsentModel.findById(consent._id);
      expect(updated!.witnessSignature).toBeDefined();
    });

    it('revoke cambia estado a revoked', async () => {
      const consent = await InformedConsentModel.create(
        buildConsentData({ status: 'signed' })
      );
      await consent.revoke('Decisión del paciente', 'patient-1');

      const updated = await InformedConsentModel.findById(consent._id);
      expect(updated!.status).toBe('revoked');
      expect(updated!.revokedAt).toBeDefined();
      expect(updated!.revokedReason).toBe('Decisión del paciente');
    });

    it('revoke lanza error cuando ya está revocado', async () => {
      const consent = await InformedConsentModel.create(
        buildConsentData({ status: 'revoked' })
      );
      await expect(consent.revoke('Razón', 'patient-1')).rejects.toThrow('ya está revocado');
    });

    it('isSigned retorna true cuando está firmado con firma de paciente', async () => {
      const consent = await InformedConsentModel.create(
        buildConsentData({ status: 'pending_signature' })
      );
      await consent.addSignature(buildSignature());
      expect(consent.isSigned()).toBe(true);
    });

    it('isSigned retorna false cuando no hay firma', async () => {
      const consent = await InformedConsentModel.create(buildConsentData());
      expect(consent.isSigned()).toBe(false);
    });

    it('isExpired retorna false cuando no hay fecha de expiración', async () => {
      const consent = await InformedConsentModel.create(buildConsentData());
      expect(consent.isExpired()).toBe(false);
    });

    it('isExpired retorna true cuando la fecha ha pasado', async () => {
      const consent = await InformedConsentModel.create(
        buildConsentData({ expiresAt: new Date(Date.now() - 86400000) }) // yesterday
      );
      expect(consent.isExpired()).toBe(true);
    });

    it('canBeSigned retorna true cuando puede ser firmado', async () => {
      const consent = await InformedConsentModel.create(
        buildConsentData({
          status: 'pending_signature',
          expiresAt: new Date(Date.now() + 86400000), // tomorrow
        })
      );
      expect(consent.canBeSigned()).toBe(true);
    });

    it('canBeSigned retorna false cuando no está en pending_signature', async () => {
      const consent = await InformedConsentModel.create(
        buildConsentData({ status: 'draft' })
      );
      expect(consent.canBeSigned()).toBe(false);
    });
  });

  describe('Static methods', () => {
    it('findByPatient retorna consentimientos del paciente', async () => {
      const patientId = 'patient-static-test-1';
      await InformedConsentModel.create(buildConsentData({ patientId }));
      await InformedConsentModel.create(buildConsentData({ patientId }));
      await InformedConsentModel.create(buildConsentData({ patientId: 'other-patient' }));

      const results = await InformedConsentModel.findByPatient(patientId);
      expect(results).toHaveLength(2);
    });

    it('findByPatient filtra por status', async () => {
      const patientId = 'patient-status-filter';
      await InformedConsentModel.create(buildConsentData({ patientId, status: 'draft' }));
      await InformedConsentModel.create(buildConsentData({ patientId, status: 'signed' }));

      const drafts = await InformedConsentModel.findByPatient(patientId, 'draft');
      expect(drafts).toHaveLength(1);
      expect(drafts[0].status).toBe('draft');
    });

    it('findByDoctor retorna consentimientos del doctor', async () => {
      const doctorId = 'doctor-static-test-1';
      await InformedConsentModel.create(buildConsentData({ doctorId }));
      await InformedConsentModel.create(buildConsentData({ doctorId: 'other-doctor' }));

      const results = await InformedConsentModel.findByDoctor(doctorId);
      expect(results).toHaveLength(1);
    });

    it('findPendingSignatures retorna consentimientos pendientes de firma', async () => {
      await InformedConsentModel.create(buildConsentData({ status: 'pending_signature' }));
      await InformedConsentModel.create(buildConsentData({ status: 'pending_signature' }));
      await InformedConsentModel.create(buildConsentData({ status: 'draft' }));

      const results = await InformedConsentModel.findPendingSignatures();
      expect(results.length).toBeGreaterThanOrEqual(2);
      results.forEach((r) => expect(r.status).toBe('pending_signature'));
    });

    it('findSignedByPatient retorna consentimientos firmados del paciente', async () => {
      const patientId = 'patient-signed-test';
      await InformedConsentModel.create(buildConsentData({ patientId, status: 'signed' }));
      await InformedConsentModel.create(buildConsentData({ patientId, status: 'draft' }));

      const results = await InformedConsentModel.findSignedByPatient(patientId);
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('signed');
    });
  });
});