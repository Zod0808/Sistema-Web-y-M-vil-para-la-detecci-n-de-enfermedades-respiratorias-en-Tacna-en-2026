/**
 * Prescription Service
 * Gestiona prescripciones médicas, validación, recordatorios y dosificación inteligente
 */

import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import PrescriptionModel, { PrescriptionDocument } from '../models/Prescription';
import { PrescriptionMedication, DrugInteraction, PrescriptionStatus } from '../types';
import drugInteractionService from './drugInteractionService';
import { alertService } from './alertService';

type PatientContext = {
  age?: number;
  weightKg?: number;
  allergies?: string[];
  renalImpairment?: boolean;
  hepaticImpairment?: boolean;
};

type CreatePrescriptionPayload = {
  patientId: string;
  doctorId: string;
  createdBy: string;
  diagnosis?: string;
  observations?: string;
  medications: Array<
    PrescriptionMedication & {
      reminderTimes?: string[];
    }
  >;
  patientContext?: PatientContext;
  metadata?: Record<string, any>;
};

type ValidateResult = {
  isValid: boolean;
  warnings: string[];
  interactions: DrugInteraction[];
};

const parseReminderDate = (baseDate: Date, time: string): Date | null => {
  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const reminder = new Date(baseDate);
  reminder.setHours(hours, minutes, 0, 0);

  if (reminder.getTime() <= Date.now()) {
    reminder.setDate(reminder.getDate() + 1);
  }
  return reminder;
};

class PrescriptionService {
  private async applySmartDosage(
    medication: PrescriptionMedication,
    context?: PatientContext
  ): Promise<PrescriptionMedication> {
    const dosageInfo = await drugInteractionService.evaluateDosage(
      { name: medication.name, dosage: medication.dosage },
      context
    );

    return {
      ...medication,
      smartDosage: {
        recommended: dosageInfo.recommended,
        rationale: dosageInfo.rationale,
      },
    };
  }

  private async scheduleMedicationReminders(
    prescription: PrescriptionDocument,
    medication: PrescriptionMedication & { reminderTimes?: string[] }
  ) {
    if (!medication.reminderTimes?.length) {
      return;
    }

    const baseDate = medication.startDate ? new Date(medication.startDate) : new Date();
    for (const reminderTime of medication.reminderTimes) {
      const scheduleTime = parseReminderDate(baseDate, reminderTime);
      if (!scheduleTime) {
        continue;
      }

      try {
        await alertService.scheduleMedicationReminder({
          userId: prescription.patientId,
          doctorId: prescription.doctorId,
          patientId: prescription.patientId,
          medicationName: medication.name,
          dosage: medication.smartDosage?.recommended ?? medication.dosage,
          scheduleTime,
          instructions: medication.instructions,
        });
      } catch (error) {
        logger.warn('No se pudo programar recordatorio de medicamento', {
          prescriptionId: prescription._id?.toString(),
          medication: medication.name,
          error,
        });
      }
    }
  }

  async validatePrescriptionInput(
    payload: CreatePrescriptionPayload
  ): Promise<ValidateResult> {
    const warnings: string[] = [];

    if (!payload.medications || payload.medications.length === 0) {
      throw new AppError('Debe incluir al menos un medicamento en la prescripción', 400);
    }

    const duplicatedNames = payload.medications
      .map((med) => med.name.toLowerCase())
      .filter((name, index, arr) => arr.indexOf(name) !== index);

    if (duplicatedNames.length) {
      warnings.push('Se detectaron medicamentos duplicados: ' + Array.from(new Set(duplicatedNames)).join(', '));
    }

    const interactions = await drugInteractionService.checkInteractions({
      medications: payload.medications.map((med) => ({ name: med.name, dosage: med.dosage })),
      patientContext: payload.patientContext,
    });

    const severeInteraction = interactions.find(
      (interaction) => interaction.severity === 'major' || interaction.severity === 'contraindicated'
    );

    if (severeInteraction) {
      throw new AppError(
        `Interacción ${severeInteraction.severity} detectada entre ${severeInteraction.medicationA} y ${severeInteraction.medicationB}`,
        422
      );
    }

    if (payload.patientContext?.allergies?.length) {
      const allergyMatches = payload.medications.filter((med) =>
        payload.patientContext?.allergies?.some((allergy) =>
          med.name.toLowerCase().includes(allergy.toLowerCase())
        )
      );
      if (allergyMatches.length) {
        warnings.push(
          `Advertencia: el paciente presenta alergias asociadas a los medicamentos ${allergyMatches
            .map((med) => med.name)
            .join(', ')}`
        );
      }
    }

    return {
      isValid: warnings.length === 0,
      warnings,
      interactions,
    };
  }

  async createPrescription(payload: CreatePrescriptionPayload): Promise<PrescriptionDocument> {
    const { interactions, warnings } = await this.validatePrescriptionInput(payload);

    const smartMedications: PrescriptionMedication[] = [];
    for (const medication of payload.medications) {
      const adjustedMedication = await this.applySmartDosage(medication, payload.patientContext);
      smartMedications.push(adjustedMedication);
    }

    const prescription = await PrescriptionModel.create({
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      createdBy: payload.createdBy,
      diagnosis: payload.diagnosis,
      observations: payload.observations,
      medications: smartMedications,
      interactions,
      status: 'pending_validation',
      metadata: {
        ...payload.metadata,
        warnings,
        patientContext: payload.patientContext,
      },
    });

    for (const medication of payload.medications) {
      await this.scheduleMedicationReminders(prescription, medication);
    }

    return prescription;
  }

  async getPrescriptionById(prescriptionId: string): Promise<PrescriptionDocument | null> {
    return PrescriptionModel.findById(prescriptionId).exec();
  }

  async getPatientHistory(patientId: string): Promise<PrescriptionDocument[]> {
    return PrescriptionModel.findByPatient(patientId);
  }

  async getDoctorPrescriptions(doctorId: string): Promise<PrescriptionDocument[]> {
    return PrescriptionModel.findByDoctor(doctorId);
  }

  async updateStatus(
    prescriptionId: string,
    status: PrescriptionStatus,
    options?: { validatedBy?: string; notes?: string }
  ): Promise<PrescriptionDocument> {
    const prescription = await PrescriptionModel.findById(prescriptionId);
    if (!prescription) {
      throw new AppError('La prescripción no existe', 404);
    }

    switch (status) {
      case 'completed':
        await prescription.markCompleted(options?.notes);
        break;
      case 'cancelled':
        await prescription.cancel(options?.notes);
        break;
      case 'active':
        if (!options?.validatedBy) {
          throw new AppError('Se requiere el médico validador para activar la prescripción', 400);
        }
        await prescription.addValidation(options.validatedBy, options.notes);
        break;
      default:
        prescription.status = status;
        if (options?.notes) {
          prescription.validationNotes = options.notes;
        }
        await prescription.save();
    }

    return prescription;
  }

  async appendMedication(
    prescriptionId: string,
    medication: PrescriptionMedication,
    patientContext?: PatientContext
  ): Promise<PrescriptionDocument> {
    const prescription = await PrescriptionModel.findById(prescriptionId);
    if (!prescription) {
      throw new AppError('La prescripción no existe', 404);
    }

    const adjustedMedication = await this.applySmartDosage(medication, patientContext);
    prescription.medications.push(adjustedMedication);
    await prescription.save();

    await this.scheduleMedicationReminders(
      prescription,
      medication
    );

    return prescription;
  }
}

export const prescriptionService = new PrescriptionService();

export default prescriptionService;

