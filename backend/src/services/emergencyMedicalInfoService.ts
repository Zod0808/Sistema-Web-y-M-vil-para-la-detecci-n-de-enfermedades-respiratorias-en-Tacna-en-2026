import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { fhirService } from './fhirService';
import { EmergencyRequest } from './emergencyService';

/**
 * Servicio de información médica de emergencia
 * Proporciona información crítica del paciente para servicios de emergencia
 */

export interface EmergencyMedicalInfo {
  patientId: string;
  patientName?: string;
  age?: number;
  gender?: string;
  bloodType?: string;
  allergies?: string[];
  currentMedications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  chronicConditions?: string[];
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
  };
  advanceDirectives?: {
    dnr?: boolean; // Do Not Resuscitate
    organDonor?: boolean;
    notes?: string;
  };
  recentLabResults?: Array<{
    testName: string;
    value: string;
    date: Date;
    status: 'normal' | 'abnormal' | 'critical';
  }>;
  vitalSignsHistory?: Array<{
    type: string;
    value: number;
    unit: string;
    date: Date;
  }>;
  lastHospitalVisit?: {
    hospital: string;
    date: Date;
    reason: string;
  };
}

export class EmergencyMedicalInfoService {
  /**
   * Obtener información médica de emergencia para un paciente
   */
  async getEmergencyMedicalInfo(patientId: string): Promise<EmergencyMedicalInfo> {
    try {
      // Obtener información del paciente desde FHIR
      const patient = await fhirService.getResource('Patient', patientId) as any;
      
      // Obtener información adicional
      const [allergies, medications, conditions, labResults, vitalSigns] = await Promise.all([
        this.getAllergies(patientId),
        this.getCurrentMedications(patientId),
        this.getChronicConditions(patientId),
        this.getRecentLabResults(patientId),
        this.getRecentVitalSigns(patientId),
      ]);

      const info: EmergencyMedicalInfo = {
        patientId,
        patientName: this.extractPatientName(patient),
        age: this.calculateAge(patient),
        gender: patient.gender,
        bloodType: patient.extension?.find((ext: any) => ext.url === 'http://hl7.org/fhir/StructureDefinition/patient-bloodType')?.valueString,
        allergies,
        currentMedications: medications,
        chronicConditions: conditions,
        recentLabResults: labResults,
        vitalSignsHistory: vitalSigns,
      };

      // Obtener contactos de emergencia
      const emergencyContacts = await this.getEmergencyContacts(patientId);
      if (emergencyContacts.length > 0) {
        info.emergencyContacts = emergencyContacts;
      }

      // Obtener información de seguro
      const insuranceInfo = await this.getInsuranceInfo(patientId);
      if (insuranceInfo) {
        info.insuranceInfo = insuranceInfo;
      }

      // Obtener directivas anticipadas
      const advanceDirectives = await this.getAdvanceDirectives(patientId);
      if (advanceDirectives) {
        info.advanceDirectives = advanceDirectives;
      }

      // Obtener última visita al hospital
      const lastVisit = await this.getLastHospitalVisit(patientId);
      if (lastVisit) {
        info.lastHospitalVisit = lastVisit;
      }

      logger.info('Información médica de emergencia obtenida', {
        patientId,
        hasAllergies: allergies.length > 0,
        hasMedications: medications.length > 0,
        hasConditions: conditions.length > 0,
      });

      return info;
    } catch (error: any) {
      logger.error(`Error al obtener información médica de emergencia: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw new AppError(`Error al obtener información médica: ${error.message}`, 500);
    }
  }

  /**
   * Generar resumen médico para servicios de emergencia
   */
  async generateEmergencySummary(emergencyRequest: EmergencyRequest): Promise<string> {
    try {
      const info = await this.getEmergencyMedicalInfo(emergencyRequest.patientId || '');

      let summary = `=== INFORMACIÓN MÉDICA DE EMERGENCIA ===\n\n`;
      summary += `Paciente: ${info.patientName || 'N/A'}\n`;
      summary += `Edad: ${info.age || 'N/A'}\n`;
      summary += `Género: ${info.gender || 'N/A'}\n`;
      summary += `Tipo de sangre: ${info.bloodType || 'N/A'}\n\n`;

      if (info.allergies && info.allergies.length > 0) {
        summary += `ALERGIAS (CRÍTICO):\n`;
        info.allergies.forEach((allergy) => {
          summary += `  - ${allergy}\n`;
        });
        summary += `\n`;
      }

      if (info.currentMedications && info.currentMedications.length > 0) {
        summary += `MEDICAMENTOS ACTUALES:\n`;
        info.currentMedications.forEach((med) => {
          summary += `  - ${med.name} (${med.dosage}, ${med.frequency})\n`;
        });
        summary += `\n`;
      }

      if (info.chronicConditions && info.chronicConditions.length > 0) {
        summary += `CONDICIONES CRÓNICAS:\n`;
        info.chronicConditions.forEach((condition) => {
          summary += `  - ${condition}\n`;
        });
        summary += `\n`;
      }

      if (info.recentLabResults && info.recentLabResults.length > 0) {
        summary += `RESULTADOS DE LABORATORIO RECIENTES:\n`;
        info.recentLabResults.slice(0, 5).forEach((result) => {
          summary += `  - ${result.testName}: ${result.value} (${result.status}) - ${result.date.toLocaleDateString()}\n`;
        });
        summary += `\n`;
      }

      if (info.emergencyContacts && info.emergencyContacts.length > 0) {
        summary += `CONTACTOS DE EMERGENCIA:\n`;
        info.emergencyContacts.forEach((contact) => {
          summary += `  - ${contact.name} (${contact.relationship}): ${contact.phone}\n`;
        });
        summary += `\n`;
      }

      if (info.advanceDirectives) {
        summary += `DIRECTIVAS ANTICIPADAS:\n`;
        if (info.advanceDirectives.dnr) {
          summary += `  - DNR (Do Not Resuscitate): SÍ\n`;
        }
        if (info.advanceDirectives.organDonor) {
          summary += `  - Donante de órganos: SÍ\n`;
        }
        if (info.advanceDirectives.notes) {
          summary += `  - Notas: ${info.advanceDirectives.notes}\n`;
        }
        summary += `\n`;
      }

      summary += `=== FIN DE INFORMACIÓN MÉDICA ===`;

      return summary;
    } catch (error: any) {
      logger.error(`Error al generar resumen de emergencia: ${error.message}`, {
        patientId: emergencyRequest.patientId,
        error: error.message,
      });
      return `Error al obtener información médica: ${error.message}`;
    }
  }

  /**
   * Obtener alergias del paciente
   */
  private async getAllergies(patientId: string): Promise<string[]> {
    try {
      const bundle = await fhirService.search('AllergyIntolerance', {
        patient: `Patient/${patientId}`,
        clinicalStatus: 'active',
      });

      if (!bundle.entry) return [];

      return bundle.entry
        .map((entry: any) => {
          const allergy = entry.resource;
          return allergy.code?.text || allergy.code?.coding?.[0]?.display || 'Alergia desconocida';
        })
        .filter((allergy: string) => allergy !== 'Alergia desconocida');
    } catch (error: any) {
      logger.warn(`Error al obtener alergias: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener medicamentos actuales
   */
  private async getCurrentMedications(patientId: string): Promise<Array<{ name: string; dosage: string; frequency: string }>> {
    try {
      const bundle = await fhirService.search('MedicationStatement', {
        patient: `Patient/${patientId}`,
        status: 'active',
      });

      if (!bundle.entry) return [];

      return bundle.entry.map((entry: any) => {
        const medication = entry.resource;
        return {
          name: medication.medicationCodeableConcept?.text || 'Medicamento desconocido',
          dosage: medication.dosage?.[0]?.doseAndRate?.[0]?.doseQuantity?.value + ' ' + medication.dosage?.[0]?.doseAndRate?.[0]?.doseQuantity?.unit || 'N/A',
          frequency: medication.dosage?.[0]?.timing?.code?.text || 'N/A',
        };
      });
    } catch (error: any) {
      logger.warn(`Error al obtener medicamentos: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener condiciones crónicas
   */
  private async getChronicConditions(patientId: string): Promise<string[]> {
    try {
      const bundle = await fhirService.search('Condition', {
        patient: `Patient/${patientId}`,
        clinicalStatus: 'active',
      });

      if (!bundle.entry) return [];

      return bundle.entry
        .map((entry: any) => {
          const condition = entry.resource;
          return condition.code?.text || condition.code?.coding?.[0]?.display || 'Condición desconocida';
        })
        .filter((condition: string) => condition !== 'Condición desconocida');
    } catch (error: any) {
      logger.warn(`Error al obtener condiciones: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener resultados de laboratorio recientes
   */
  private async getRecentLabResults(patientId: string): Promise<Array<{ testName: string; value: string; date: Date; status: 'normal' | 'abnormal' | 'critical' }>> {
    try {
      const { labService } = await import('./labService');
      const results = await labService.getResults({
        patientId,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
      });

      return results.slice(0, 10).map((result) => ({
        testName: result.testName,
        value: String(result.value),
        date: result.date,
        // LabResult now supports workflow states too; project them onto the
        // emergency-info clinical status subset.
        status: (['critical', 'abnormal'] as const).includes(result.status as any)
          ? (result.status as 'critical' | 'abnormal')
          : 'normal',
      }));
    } catch (error: any) {
      logger.warn(`Error al obtener resultados de laboratorio: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener signos vitales recientes
   */
  private async getRecentVitalSigns(patientId: string): Promise<Array<{ type: string; value: number; unit: string; date: Date }>> {
    try {
      const bundle = await fhirService.search('Observation', {
        patient: `Patient/${patientId}`,
        category: 'vital-signs',
        _sort: '-date',
        _count: '10',
      });

      if (!bundle.entry) return [];

      return bundle.entry.map((entry: any) => {
        const observation = entry.resource;
        return {
          type: observation.code?.text || 'Signo vital',
          value: observation.valueQuantity?.value || 0,
          unit: observation.valueQuantity?.unit || '',
          date: observation.effectiveDateTime ? new Date(observation.effectiveDateTime) : new Date(),
        };
      });
    } catch (error: any) {
      logger.warn(`Error al obtener signos vitales: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener contactos de emergencia
   */
  private async getEmergencyContacts(patientId: string): Promise<Array<{ name: string; phone: string; relationship: string }>> {
    try {
      const patient = await fhirService.getResource('Patient', patientId) as any;
      const contacts = patient.contact || [];

      return contacts
        .filter((contact: any) => contact.relationship?.[0]?.coding?.[0]?.code === 'C' || contact.relationship?.[0]?.text?.toLowerCase().includes('emergency'))
        .map((contact: any) => ({
          name: contact.name?.text || 'Contacto desconocido',
          phone: contact.telecom?.find((t: any) => t.system === 'phone')?.value || '',
          relationship: contact.relationship?.[0]?.text || 'Contacto',
        }))
        .filter((contact) => contact.phone !== '');
    } catch (error: any) {
      logger.warn(`Error al obtener contactos de emergencia: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener información de seguro
   */
  private async getInsuranceInfo(patientId: string): Promise<{ provider: string; policyNumber: string } | null> {
    try {
      const bundle = await fhirService.search('Coverage', {
        beneficiary: `Patient/${patientId}`,
        status: 'active',
      });

      if (!bundle.entry || bundle.entry.length === 0) return null;

      const coverage = bundle.entry[0].resource as any;
      return {
        provider: coverage.payor?.[0]?.display || 'N/A',
        policyNumber: coverage.subscriberId || 'N/A',
      };
    } catch (error: any) {
      logger.warn(`Error al obtener información de seguro: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtener directivas anticipadas
   */
  private async getAdvanceDirectives(patientId: string): Promise<{ dnr?: boolean; organDonor?: boolean; notes?: string } | null> {
    try {
      const bundle = await fhirService.search('Consent', {
        patient: `Patient/${patientId}`,
        status: 'active',
      });

      if (!bundle.entry || bundle.entry.length === 0) return null;

      // Buscar directivas anticipadas en los consents
      const consent = bundle.entry.find((entry: any) => 
        entry.resource.category?.some((cat: any) => cat.coding?.[0]?.code === '59259-5') // Advance Directive
      );

      if (!consent) return null;

      const consentResource = consent.resource as any;
      return {
        dnr: consentResource.provision?.code?.some((code: any) => code.coding?.[0]?.code === '304251004'), // Do Not Resuscitate
        organDonor: consentResource.provision?.code?.some((code: any) => code.coding?.[0]?.code === '304252005'), // Organ Donor
        notes: consentResource.provision?.provision?.[0]?.text,
      };
    } catch (error: any) {
      logger.warn(`Error al obtener directivas anticipadas: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtener última visita al hospital
   */
  private async getLastHospitalVisit(patientId: string): Promise<{ hospital: string; date: Date; reason: string } | null> {
    try {
      const bundle = await fhirService.search('Encounter', {
        patient: `Patient/${patientId}`,
        status: 'finished',
        _sort: '-date',
        _count: '1',
      });

      if (!bundle.entry || bundle.entry.length === 0) return null;

      const encounter = bundle.entry[0].resource as any;
      return {
        hospital: encounter.serviceProvider?.display || 'Hospital desconocido',
        date: encounter.period?.end ? new Date(encounter.period.end) : new Date(),
        reason: encounter.reasonCode?.[0]?.text || 'Visita médica',
      };
    } catch (error: any) {
      logger.warn(`Error al obtener última visita: ${error.message}`);
      return null;
    }
  }

  /**
   * Extraer nombre del paciente
   */
  private extractPatientName(patient: any): string {
    if (patient.name && patient.name.length > 0) {
      const name = patient.name[0];
      return `${name.given?.join(' ') || ''} ${name.family || ''}`.trim();
    }
    return 'Paciente desconocido';
  }

  /**
   * Calcular edad del paciente
   */
  private calculateAge(patient: any): number | undefined {
    if (!patient.birthDate) return undefined;
    const birthDate = new Date(patient.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}

export const emergencyMedicalInfoService = new EmergencyMedicalInfoService();

