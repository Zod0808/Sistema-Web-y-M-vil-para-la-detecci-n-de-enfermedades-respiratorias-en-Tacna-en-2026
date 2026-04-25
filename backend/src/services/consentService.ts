/**
 * Consent Service
 * Gestiona consentimientos informados digitales y firmas electrónicas
 */

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import InformedConsentModel, {
  InformedConsentDocument,
  ConsentStatus,
  ConsentType,
  ElectronicSignature,
} from '../models/InformedConsent';
import { alertService } from './alertService';
import UserModel from '../models/User';
import crypto from 'crypto';

type CreateConsentPayload = {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  consentType: ConsentType;
  title: string;
  description: string;
  procedureDetails?: string;
  risks?: string[];
  benefits?: string[];
  alternatives?: string[];
  version?: string;
  language?: string;
  expiresAt?: Date;
  appointmentId?: string;
  medicalHistoryId?: string;
  procedureId?: string;
  attachments?: string[];
  metadata?: Record<string, any>;
};

type UpdateConsentPayload = Partial<
  Pick<
    CreateConsentPayload,
    'title' | 'description' | 'procedureDetails' | 'risks' | 'benefits' | 'alternatives' | 'expiresAt' | 'metadata'
  >
>;

type ConsentFilters = {
  patientId?: string;
  doctorId?: string;
  status?: ConsentStatus;
  consentType?: ConsentType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
};

type SignaturePayload = {
  signerId: string;
  signerName: string;
  signerRole: 'patient' | 'doctor' | 'witness' | 'guardian';
  signatureData: string;
  signatureMethod: 'digital' | 'biometric' | 'click_to_sign' | 'typed';
  ipAddress?: string;
  userAgent?: string;
  certificateHash?: string;
};

class ConsentService {
  /**
   * Generar hash de firma para verificación
   */
  private generateSignatureHash(signatureData: string, signerId: string, timestamp: Date): string {
    const data = `${signatureData}-${signerId}-${timestamp.toISOString()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Crear un nuevo consentimiento informado
   */
  async createConsent(payload: CreateConsentPayload): Promise<InformedConsentDocument> {
    // Validar que el doctor existe
    const doctor = await UserModel.findById(payload.doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      throw new AppError('El doctor no existe o no es válido', 400);
    }

    // Validar que el paciente existe
    const patient = await UserModel.findById(payload.patientId);
    if (!patient) {
      throw new AppError('El paciente no existe', 400);
    }

    const consent = await InformedConsentModel.create({
      ...payload,
      status: 'draft',
      version: payload.version || '1.0',
      language: payload.language || 'es',
      presentedAt: new Date(),
    });

    logger.info('Consentimiento informado creado', {
      consentId: consent._id.toString(),
      patientId: payload.patientId,
      doctorId: payload.doctorId,
    });

    return consent;
  }

  /**
   * Presentar consentimiento al paciente (cambiar a pending_signature)
   */
  async presentConsent(consentId: string, presentedBy: string): Promise<InformedConsentDocument> {
    const consent = await InformedConsentModel.findById(consentId);
    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    if (consent.status !== 'draft') {
      throw new AppError('Solo se pueden presentar consentimientos en borrador', 400);
    }

    consent.status = 'pending_signature';
    consent.presentedAt = new Date();
    await consent.save();

    // Crear alerta para el paciente
    await alertService.createAlert({
      userId: consent.patientId,
      patientId: consent.patientId,
      doctorId: consent.doctorId,
      title: 'Consentimiento Informado Pendiente de Firma',
      message: `Tienes un consentimiento informado pendiente de firma: ${consent.title}`,
      category: 'consent',
      priority: 'high',
      channels: ['push', 'in_app'],
      trigger: {
        source: 'informed_consent',
        referenceId: consent._id.toString(),
      },
    });

    logger.info('Consentimiento presentado al paciente', {
      consentId: consent._id.toString(),
      presentedBy,
    });

    return consent;
  }

  /**
   * Agregar firma electrónica
   */
  async addSignature(
    consentId: string,
    signature: SignaturePayload,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<InformedConsentDocument> {
    const consent = await InformedConsentModel.findById(consentId);
    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    if (!consent.canBeSigned() && signature.signerRole === 'patient') {
      throw new AppError('El consentimiento no puede ser firmado', 400);
    }

    // Validar que el firmante existe
    const signer = await UserModel.findById(signature.signerId);
    if (!signer) {
      throw new AppError('El firmante no existe', 400);
    }

    // Generar hash de verificación
    const signatureHash = this.generateSignatureHash(
      signature.signatureData,
      signature.signerId,
      new Date()
    );

    const electronicSignature: ElectronicSignature = {
      signerId: signature.signerId,
      signerName: signature.signerName || signer.name,
      signerRole: signature.signerRole,
      signatureData: signature.signatureData,
      signatureMethod: signature.signatureMethod,
      signedAt: new Date(),
      ipAddress: requestInfo?.ipAddress || signature.ipAddress,
      userAgent: requestInfo?.userAgent || signature.userAgent,
      certificateHash: signature.certificateHash || signatureHash,
    };

    await consent.addSignature(electronicSignature);

    // Si es la firma del paciente, crear alerta para el doctor
    if (signature.signerRole === 'patient') {
      await alertService.createAlert({
        userId: consent.doctorId,
        patientId: consent.patientId,
        doctorId: consent.doctorId,
        title: 'Consentimiento Informado Firmado',
        message: `El paciente ${consent.patientName} ha firmado el consentimiento: ${consent.title}`,
        category: 'consent',
        priority: 'medium',
        channels: ['push', 'in_app'],
        trigger: {
          source: 'informed_consent',
          referenceId: consent._id.toString(),
        },
      });
    }

    logger.info('Firma agregada al consentimiento', {
      consentId: consent._id.toString(),
      signerId: signature.signerId,
      signerRole: signature.signerRole,
    });

    return consent;
  }

  /**
   * Obtener consentimiento por ID
   */
  async getConsentById(consentId: string): Promise<InformedConsentDocument | null> {
    return InformedConsentModel.findById(consentId);
  }

  /**
   * Listar consentimientos con filtros
   */
  async listConsents(filters: ConsentFilters = {}): Promise<{
    consents: InformedConsentDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (filters.patientId) {
      query.patientId = filters.patientId;
    }
    if (filters.doctorId) {
      query.doctorId = filters.doctorId;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.consentType) {
      query.consentType = filters.consentType;
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.createdAt.$lte = filters.endDate;
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [consents, total] = await Promise.all([
      InformedConsentModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      InformedConsentModel.countDocuments(query),
    ]);

    return {
      consents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Actualizar consentimiento
   */
  async updateConsent(
    consentId: string,
    payload: UpdateConsentPayload,
    updatedBy: string
  ): Promise<InformedConsentDocument> {
    const consent = await InformedConsentModel.findById(consentId);
    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    // Solo se pueden actualizar consentimientos en borrador o pendientes
    if (consent.status === 'signed' || consent.status === 'revoked') {
      throw new AppError('No se puede actualizar un consentimiento firmado o revocado', 400);
    }

    Object.assign(consent, payload);
    consent.metadata = {
      ...consent.metadata,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: new Date(),
    };

    await consent.save();

    logger.info('Consentimiento actualizado', {
      consentId: consent._id.toString(),
      updatedBy,
    });

    return consent;
  }

  /**
   * Revocar consentimiento
   */
  async revokeConsent(
    consentId: string,
    reason: string,
    revokedBy: string
  ): Promise<InformedConsentDocument> {
    const consent = await InformedConsentModel.findById(consentId);
    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    await consent.revoke(reason, revokedBy);
    await consent.save();

    // Crear alerta para el doctor
    await alertService.createAlert({
      userId: consent.doctorId,
      patientId: consent.patientId,
      doctorId: consent.doctorId,
      title: 'Consentimiento Informado Revocado',
      message: `El consentimiento "${consent.title}" ha sido revocado por el paciente`,
      category: 'consent',
      priority: 'high',
      channels: ['push', 'in_app'],
      trigger: {
        source: 'informed_consent',
        referenceId: consent._id.toString(),
      },
    });

    logger.info('Consentimiento revocado', {
      consentId: consent._id.toString(),
      revokedBy,
    });

    return consent;
  }

  /**
   * Obtener estadísticas de consentimientos
   */
  async getConsentStats(doctorId?: string): Promise<{
    total: number;
    draft: number;
    pendingSignature: number;
    signed: number;
    revoked: number;
    expired: number;
    byType: Record<ConsentType, number>;
  }> {
    const query: any = {};
    if (doctorId) {
      query.doctorId = doctorId;
    }

    const [total, draft, pendingSignature, signed, revoked, expired] = await Promise.all([
      InformedConsentModel.countDocuments(query),
      InformedConsentModel.countDocuments({ ...query, status: 'draft' }),
      InformedConsentModel.countDocuments({ ...query, status: 'pending_signature' }),
      InformedConsentModel.countDocuments({ ...query, status: 'signed' }),
      InformedConsentModel.countDocuments({ ...query, status: 'revoked' }),
      InformedConsentModel.countDocuments({
        ...query,
        status: { $in: ['pending_signature', 'signed'] },
        expiresAt: { $lt: new Date() },
      }),
    ]);

    const consents = await InformedConsentModel.find(query);
    const byType: Record<ConsentType, number> = {
      procedure: 0,
      treatment: 0,
      surgery: 0,
      research: 0,
      data_sharing: 0,
      photography: 0,
      video_recording: 0,
      other: 0,
    };

    consents.forEach(consent => {
      byType[consent.consentType] = (byType[consent.consentType] || 0) + 1;
    });

    return {
      total,
      draft,
      pendingSignature,
      signed,
      revoked,
      expired,
      byType,
    };
  }

  /**
   * Obtener consentimientos pendientes de firma
   */
  async getPendingSignatures(patientId?: string): Promise<InformedConsentDocument[]> {
    return InformedConsentModel.findPendingSignatures(patientId);
  }

  /**
   * Obtener consentimientos expirados
   */
  async getExpiredConsents(): Promise<InformedConsentDocument[]> {
    return InformedConsentModel.findExpired();
  }

  /**
   * Verificar firma electrónica
   */
  async verifySignature(
    consentId: string,
    signatureHash: string
  ): Promise<{ valid: boolean; signature?: ElectronicSignature }> {
    const consent = await InformedConsentModel.findById(consentId);
    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    const signature = consent.signatures.find(
      sig => sig.certificateHash === signatureHash
    );

    if (!signature) {
      return { valid: false };
    }

    // Verificar que el hash coincide
    const expectedHash = this.generateSignatureHash(
      signature.signatureData,
      signature.signerId,
      signature.signedAt
    );

    return {
      valid: signature.certificateHash === expectedHash || signature.certificateHash === signatureHash,
      signature,
    };
  }

  /**
   * Generar PDF del consentimiento firmado
   */
  async generateConsentPDF(consentId: string): Promise<Buffer> {
    const consent = await InformedConsentModel.findById(consentId);
    if (!consent) {
      throw new AppError('Consentimiento no encontrado', 404);
    }

    if (!consent.isSigned()) {
      throw new AppError('El consentimiento debe estar firmado para generar el PDF', 400);
    }

    // Usar el generador de PDF existente
    const { generateMedicalPdf } = await import('../utils/pdfGenerator');

    return generateMedicalPdf({
      patient: { name: consent.patientName || '', id: consent.patientId },
      doctor: { name: consent.doctorName || '', id: consent.doctorId },
      report: {
        title: consent.title,
        generatedAt: new Date(),
        sections: [
          { title: 'Descripción', content: consent.description || '' },
          { title: 'Detalles del Procedimiento', content: consent.procedureDetails || '' },
          { title: 'Riesgos', content: consent.risks?.join('\n') || 'No especificados' },
          { title: 'Beneficios', content: consent.benefits?.join('\n') || 'No especificados' },
          { title: 'Alternativas', content: consent.alternatives?.join('\n') || 'No especificadas' },
          {
            title: 'Firmas',
            content: [
              `Paciente: ${consent.patientSignature?.signerName || 'No firmado'} - ${consent.patientSignature?.signedAt ? new Date(consent.patientSignature.signedAt).toLocaleString() : 'N/A'}`,
              `Doctor: ${consent.doctorSignature?.signerName || 'No firmado'} - ${consent.doctorSignature?.signedAt ? new Date(consent.doctorSignature.signedAt).toLocaleString() : 'N/A'}`,
            ],
          },
        ],
        signature: {
          name: consent.patientSignature?.signerName || '',
          title: 'Paciente',
        },
      },
      outputPath: undefined,
    });
  }
}

export default new ConsentService();

