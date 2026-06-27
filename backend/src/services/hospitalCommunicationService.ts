
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { EmergencyRequest } from './emergencyService';
import { EmergencyMedicalInfo, emergencyMedicalInfoService } from './emergencyMedicalInfoService';
import { hospitalSyncService } from './hospitalSyncService';

/**
 * Servicio de comunicación con hospitales para emergencias
 * Gestiona la notificación y transferencia de información a hospitales
 */

export interface HospitalCommunicationConfig {
  enabled: boolean;
  notifyOnEmergency?: boolean;
  autoSelectHospital?: boolean;
  preferredHospitals?: string[];
}

export interface HospitalNotification {
  hospitalId: string;
  hospitalName: string;
  emergencyId: string;
  patientInfo: EmergencyMedicalInfo;
  emergencyDetails: {
    type: EmergencyRequest['emergencyType'];
    severity: EmergencyRequest['severity'];
    description: string;
    location: EmergencyRequest['location'];
    symptoms?: string[];
    vitalSigns?: EmergencyRequest['vitalSigns'];
  };
  estimatedArrival?: Date;
  status: 'notified' | 'accepted' | 'rejected' | 'in_transit';
  responseTime?: Date;
  metadata?: Record<string, any>;
}

export interface HospitalSelection {
  hospitalId: string;
  hospitalName: string;
  distance: number; // en kilómetros
  estimatedTravelTime: number; // en minutos
  capacity?: 'available' | 'limited' | 'full';
  specialties?: string[];
  reason: string;
}

export class HospitalCommunicationService {
  private config: HospitalCommunicationConfig;
  private activeNotifications: Map<string, { notification: HospitalNotification; addedAt: number }> = new Map();
  private static readonly NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

  private purgeExpiredNotifications(): void {
    const now = Date.now();
    for (const [key, entry] of this.activeNotifications) {
      if (now - entry.addedAt > HospitalCommunicationService.NOTIFICATION_TTL_MS) {
        this.activeNotifications.delete(key);
      }
    }
  }

  constructor(config: Partial<HospitalCommunicationConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? process.env.HOSPITAL_COMMUNICATION_ENABLED === 'true',
      notifyOnEmergency: config.notifyOnEmergency ?? true,
      autoSelectHospital: config.autoSelectHospital ?? true,
      preferredHospitals: config.preferredHospitals || process.env.PREFERRED_HOSPITALS?.split(',') || [],
    };
  }

  /**
   * Notificar a hospitales sobre una emergencia
   */
  async notifyHospitals(emergencyRequest: EmergencyRequest): Promise<HospitalNotification[]> {
    if (!this.config.enabled) {
      logger.warn('Comunicación con hospitales no está habilitada');
      return [];
    }

    if (!this.config.notifyOnEmergency) {
      logger.info('Notificación automática a hospitales deshabilitada');
      return [];
    }

    try {
      // Obtener información médica del paciente
      const patientInfo = await emergencyMedicalInfoService.getEmergencyMedicalInfo(
        emergencyRequest.patientId || ''
      );

      // Seleccionar hospitales a notificar
      const selectedHospitals = await this.selectHospitals(emergencyRequest);

      const notifications: HospitalNotification[] = [];

      for (const hospital of selectedHospitals) {
        try {
          const notification = await this.sendHospitalNotification(
            hospital.hospitalId,
            hospital.hospitalName,
            emergencyRequest,
            patientInfo
          );

          if (notification) {
            notifications.push(notification);
            this.purgeExpiredNotifications();
            this.activeNotifications.set(notification.hospitalId, { notification, addedAt: Date.now() });
          }
        } catch (error: any) {
          logger.error(`Error al notificar hospital ${hospital.hospitalName}: ${error.message}`, {
            hospitalId: hospital.hospitalId,
            error: error.message,
          });
        }
      }

      logger.info('Hospitales notificados sobre emergencia', {
        emergencyId: emergencyRequest.patientId,
        hospitalsNotified: notifications.length,
        hospitalNames: notifications.map((n) => n.hospitalName),
      });

      return notifications;
    } catch (error: any) {
      logger.error(`Error al notificar hospitales: ${error.message}`, {
        patientId: emergencyRequest.patientId,
        error: error.message,
      });
      throw new AppError(`Error al notificar hospitales: ${error.message}`, 500);
    }
  }

  /**
   * Seleccionar hospitales apropiados para la emergencia
   */
  private async selectHospitals(emergencyRequest: EmergencyRequest): Promise<HospitalSelection[]> {
    const registeredHospitals = hospitalSyncService.getRegisteredHospitals();

    if (registeredHospitals.length === 0) {
      logger.warn('No hay hospitales registrados para notificar');
      return [];
    }

    // Si hay hospitales preferidos, usarlos primero
    let hospitalsToNotify = registeredHospitals;
    if (this.config.preferredHospitals && this.config.preferredHospitals.length > 0) {
      hospitalsToNotify = registeredHospitals.filter((h) =>
        this.config.preferredHospitals!.includes(h.name)
      );

      // Si no hay coincidencias, usar todos
      if (hospitalsToNotify.length === 0) {
        hospitalsToNotify = registeredHospitals;
      }
    }

    // Seleccionar hasta 3 hospitales más cercanos o apropiados
    const selected: HospitalSelection[] = [];

    for (const hospital of hospitalsToNotify.slice(0, 3)) {
      const hospitalName = hospital.name;
      // Calcular distancia (simulado - en producción usar API de geocodificación)
      const distance = this.calculateDistance(emergencyRequest.location);
      const estimatedTravelTime = Math.ceil(distance / 60); // Asumiendo 60 km/h promedio

      selected.push({
        hospitalId: hospitalName,
        hospitalName,
        distance,
        estimatedTravelTime,
        capacity: 'available', // En producción, esto vendría de una API del hospital
        specialties: this.getSpecialtiesForEmergency(emergencyRequest.emergencyType),
        reason: this.getSelectionReason(emergencyRequest, distance),
      });
    }

    // Ordenar por distancia
    selected.sort((a, b) => a.distance - b.distance);

    return selected;
  }

  /**
   * Enviar notificación a un hospital específico
   */
  private async sendHospitalNotification(
    hospitalId: string,
    hospitalName: string,
    emergencyRequest: EmergencyRequest,
    patientInfo: EmergencyMedicalInfo
  ): Promise<HospitalNotification | null> {
    try {
      // En producción, esto enviaría una notificación real al hospital
      // Por ahora, simulamos la notificación

      const notification: HospitalNotification = {
        hospitalId,
        hospitalName,
        emergencyId: `EMG-${Date.now()}`,
        patientInfo,
        emergencyDetails: {
          type: emergencyRequest.emergencyType,
          severity: emergencyRequest.severity,
          description: emergencyRequest.description,
          location: emergencyRequest.location,
          symptoms: emergencyRequest.symptoms,
          vitalSigns: emergencyRequest.vitalSigns,
        },
        estimatedArrival: new Date(Date.now() + 20 * 60 * 1000), // 20 minutos estimado
        status: 'notified',
        responseTime: new Date(),
        metadata: {
          notifiedAt: new Date().toISOString(),
        },
      };

      // En producción, aquí se enviaría la notificación vía API del hospital
      // await this.sendToHospitalAPI(hospitalId, notification);

      logger.info('Notificación enviada a hospital', {
        hospitalId,
        hospitalName,
        emergencyType: emergencyRequest.emergencyType,
      });

      return notification;
    } catch (error: any) {
      logger.error(`Error al enviar notificación a hospital: ${error.message}`, {
        hospitalId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Transferir información del paciente a un hospital
   */
  async transferPatientInfo(
    hospitalId: string,
    patientId: string,
    emergencyId: string
  ): Promise<boolean> {
    try {
      const patientInfo = await emergencyMedicalInfoService.getEmergencyMedicalInfo(patientId);

      // Construir lista de recursos FHIR del paciente
      const fhirResources: Record<string, unknown>[] = [
        {
          resourceType: 'Patient',
          id: patientId,
          name: patientInfo.patientName ? [{ text: patientInfo.patientName }] : undefined,
          gender: patientInfo.gender,
          birthDate: patientInfo.age ? this.calculateBirthDate(patientInfo.age) : undefined,
        },
      ];

      // Agregar condiciones crónicas
      if (patientInfo.chronicConditions) {
        patientInfo.chronicConditions.forEach((condition) => {
          fhirResources.push({
            resourceType: 'Condition',
            code: { text: condition },
            subject: { reference: `Patient/${patientId}` },
          });
        });
      }

      // Agregar alergias
      if (patientInfo.allergies) {
        patientInfo.allergies.forEach((allergy) => {
          fhirResources.push({
            resourceType: 'AllergyIntolerance',
            code: { text: allergy },
            patient: { reference: `Patient/${patientId}` },
          });
        });
      }

      // Sincronizar con el hospital usando hospitalSyncService
      await hospitalSyncService.syncToExternal(hospitalId, patientId, fhirResources as any);

      logger.info('Información del paciente transferida al hospital', {
        hospitalId,
        patientId,
        emergencyId,
      });

      return true;
    } catch (error: any) {
      logger.error(`Error al transferir información al hospital: ${error.message}`, {
        hospitalId,
        patientId,
        error: error.message,
      });
      throw new AppError(`Error al transferir información: ${error.message}`, 500);
    }
  }

  /**
   * Obtener estado de notificaciones a hospitales
   */
  getHospitalNotifications(emergencyId: string): HospitalNotification[] {
    return Array.from(this.activeNotifications.values())
      .filter((entry) => entry.notification.emergencyId === emergencyId)
      .map((entry) => entry.notification);
  }

  /**
   * Calcular distancia (simulado - en producción usar API de geocodificación)
   */
  private calculateDistance(_location: EmergencyRequest['location']): number {
    // Simulación simple - en producción usar Haversine o API de Google Maps
    return Math.random() * 20 + 5; // Entre 5 y 25 km
  }

  /**
   * Obtener especialidades necesarias según tipo de emergencia
   */
  private getSpecialtiesForEmergency(
    emergencyType: EmergencyRequest['emergencyType']
  ): string[] {
    const specialtiesMap: Record<EmergencyRequest['emergencyType'], string[]> = {
      medical: ['emergency_medicine', 'internal_medicine'],
      respiratory_crisis: ['emergency_medicine', 'pulmonology', 'critical_care'],
      accident: ['emergency_medicine', 'trauma', 'surgery'],
      other: ['emergency_medicine'],
    };

    return specialtiesMap[emergencyType] || ['emergency_medicine'];
  }

  /**
   * Obtener razón de selección del hospital
   */
  private getSelectionReason(emergencyRequest: EmergencyRequest, distance: number): string {
    if (distance < 10) {
      return 'Hospital más cercano';
    }
    if (this.config.preferredHospitals?.includes(emergencyRequest.patientId || '')) {
      return 'Hospital preferido del paciente';
    }
    return 'Hospital disponible con especialidades apropiadas';
  }

  /**
   * Calcular fecha de nacimiento desde edad
   */
  private calculateBirthDate(age: number): string {
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    return `${birthYear}-01-01`; // Aproximación
  }
}

export const hospitalCommunicationService = new HospitalCommunicationService();

