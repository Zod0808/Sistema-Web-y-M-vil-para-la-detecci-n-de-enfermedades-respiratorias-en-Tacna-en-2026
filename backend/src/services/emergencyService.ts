/**
 * Emergency Service
 * Gestiona la integración con servicios de emergencia, alertas automáticas y GPS
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
// Importación dinámica para evitar dependencias circulares
import { AlertPriority, AlertChannel } from '../types';
import { ambulanceService } from './ambulanceService';
import { hospitalCommunicationService } from './hospitalCommunicationService';

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
  address?: string;
  district?: string;
  accuracy?: number; // Precisión en metros
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship?: string;
}

export interface EmergencyRequest {
  userId: string;
  patientId?: string;
  patientName?: string;
  emergencyType: 'medical' | 'respiratory_crisis' | 'accident' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: EmergencyLocation;
  symptoms?: string[];
  vitalSigns?: {
    heartRate?: number;
    oxygenSaturation?: number;
    temperature?: number;
    bloodPressure?: {
      systolic: number;
      diastolic: number;
    };
  };
  contactInfo?: EmergencyContact;
  metadata?: Record<string, any>;
}

export interface EmergencyServiceConfig {
  enabled: boolean;
  apiUrl?: string;
  apiKey?: string;
  defaultEmergencyNumber?: string; // Número de emergencias local
  autoAlertEnabled?: boolean;
  gpsTrackingEnabled?: boolean;
  emergencyContacts?: EmergencyContact[];
}

export interface EmergencyResponse {
  emergencyId: string;
  status: 'dispatched' | 'in_transit' | 'on_scene' | 'completed' | 'cancelled';
  estimatedArrival?: Date;
  serviceProvider?: string;
  trackingUrl?: string;
  metadata?: Record<string, any>;
}

export class EmergencyService {
  private config: EmergencyServiceConfig;
  private client: AxiosInstance | null = null;
  private activeEmergencies: Map<string, EmergencyResponse> = new Map();

  constructor(config: Partial<EmergencyServiceConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? (process.env.EMERGENCY_SERVICE_ENABLED === 'true' || process.env.NODE_ENV === 'test'),
      apiUrl: config.apiUrl || process.env.EMERGENCY_SERVICE_API_URL,
      apiKey: config.apiKey || process.env.EMERGENCY_SERVICE_API_KEY,
      defaultEmergencyNumber: config.defaultEmergencyNumber || process.env.EMERGENCY_NUMBER || '911',
      autoAlertEnabled: config.autoAlertEnabled ?? true,
      gpsTrackingEnabled: config.gpsTrackingEnabled ?? true,
      emergencyContacts: config.emergencyContacts || [],
    };

    logger.warn('⚠️  activeEmergencies usa Map en memoria — el estado se perderá si el proceso reinicia. Para producción de alta disponibilidad, migrar a Redis.');

    // Inicializar cliente HTTP si hay configuración
    if (this.config.enabled && this.config.apiUrl && this.config.apiKey) {
      this.client = axios.create({
        baseURL: this.config.apiUrl,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 segundos timeout para emergencias
      });
    }
  }

  /**
   * Crear una solicitud de emergencia
   */
  async createEmergency(request: EmergencyRequest): Promise<EmergencyResponse> {
    if (!this.config.enabled) {
      throw new AppError('Servicio de emergencias no está habilitado', 503);
    }

    // Validar ubicación GPS
    this.validateLocation(request.location);

    try {
      // Declaración adelantada para que esté disponible en todo el bloque try
      let emergencyResponse: EmergencyResponse | null = null;

      // Crear alerta automática si está habilitado
      if (this.config.autoAlertEnabled) {
        await this.createEmergencyAlert(request);
      }

      // Despachar ambulancia automáticamente si está habilitado
      if (this.config.enabled) {
        try {
          const ambulanceDispatch = await ambulanceService.dispatchAmbulance(request);
          logger.info('Ambulancia despachada automáticamente', {
            ambulanceId: ambulanceDispatch.ambulanceId,
            emergencyId: (emergencyResponse as EmergencyResponse | null)?.emergencyId,
          });
        } catch (error: any) {
          logger.warn(`Error al despachar ambulancia: ${error.message}`, {
            error: error.message,
          });
          // No bloquear el flujo principal si falla el despacho de ambulancia
        }
      }

      // Notificar a hospitales sobre la emergencia
      try {
        await hospitalCommunicationService.notifyHospitals(request);
      } catch (error: any) {
        logger.warn(`Error al notificar hospitales: ${error.message}`, {
          error: error.message,
        });
        // No bloquear el flujo principal si falla la notificación a hospitales
      }

      // Enviar a servicio de emergencias externo si está configurado
      if (this.client) {
        emergencyResponse = await this.dispatchToEmergencyService(request);
      } else {
        // Modo simulado para desarrollo/testing
        emergencyResponse = this.createSimulatedResponse(request);
      }

      // Guardar emergencia activa
      if (emergencyResponse) {
        this.activeEmergencies.set(emergencyResponse.emergencyId, emergencyResponse);
      }

      logger.info('Emergencia creada exitosamente', {
        emergencyId: emergencyResponse?.emergencyId,
        userId: request.userId,
        type: request.emergencyType,
        severity: request.severity,
        location: {
          lat: request.location.latitude,
          lng: request.location.longitude,
        },
      });

      return emergencyResponse;
    } catch (error: any) {
      logger.error(`Error al crear emergencia: ${error.message}`, {
        userId: request.userId,
        error: error.message,
      });
      throw new AppError(`Error al crear emergencia: ${error.message}`, 500);
    }
  }

  /**
   * Obtener estado de una emergencia
   */
  async getEmergencyStatus(emergencyId: string): Promise<EmergencyResponse | null> {
    const cached = this.activeEmergencies.get(emergencyId);
    if (cached) {
      return cached;
    }

    if (this.client) {
      try {
        const response = await this.client.get(`/emergencies/${emergencyId}`);
        return response.data;
      } catch (error: any) {
        logger.error(`Error al obtener estado de emergencia: ${error.message}`, {
          emergencyId,
          error: error.message,
        });
        return null;
      }
    }

    return null;
  }

  /**
   * Cancelar una emergencia
   */
  async cancelEmergency(emergencyId: string, reason?: string): Promise<boolean> {
    try {
      if (this.client) {
        await this.client.post(`/emergencies/${emergencyId}/cancel`, { reason });
      }

      // Actualizar estado local
      const emergency = this.activeEmergencies.get(emergencyId);
      if (emergency) {
        emergency.status = 'cancelled';
        this.activeEmergencies.set(emergencyId, emergency);
      }

      logger.info('Emergencia cancelada', { emergencyId, reason });
      return true;
    } catch (error: any) {
      logger.error(`Error al cancelar emergencia: ${error.message}`, {
        emergencyId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Obtener emergencias activas de un usuario
   */
  getActiveEmergencies(userId: string): EmergencyResponse[] {
    return Array.from(this.activeEmergencies.values()).filter(
      (emergency) => emergency.metadata?.userId === userId
    );
  }

  /**
   * Crear alerta automática para emergencia
   */
  private async createEmergencyAlert(request: EmergencyRequest): Promise<void> {
    const priority: AlertPriority = request.severity === 'critical' ? 'critical' : 'high';
    const channels: AlertChannel[] = ['push', 'in_app', 'sms']; // SMS para emergencias

    const locationInfo = request.location.address
      ? `${request.location.address}`
      : `Coordenadas: ${request.location.latitude}, ${request.location.longitude}`;

    const message = `🚨 EMERGENCIA MÉDICA\n\n` +
      `Tipo: ${this.getEmergencyTypeLabel(request.emergencyType)}\n` +
      `Severidad: ${request.severity.toUpperCase()}\n` +
      `Descripción: ${request.description}\n` +
      `Ubicación: ${locationInfo}\n` +
      (request.symptoms?.length ? `Síntomas: ${request.symptoms.join(', ')}\n` : '') +
      `\nServicios de emergencia han sido notificados.`;

    // Crear alerta de emergencia usando importación dinámica
    const AlertModel = (await import('../models/Alert')).default;
    const { notificationService } = await import('./notificationService');
    const { invalidateCacheByPattern, CACHE_NAMESPACES } = await import('./cacheService');
    
    const alert = await AlertModel.create({
      userId: request.userId,
      patientId: request.patientId,
      title: `🚨 Emergencia Médica - ${this.getEmergencyTypeLabel(request.emergencyType)}`,
      message,
      category: 'emergency',
      channels,
      priority,
      status: 'pending',
      trigger: {
        source: 'emergency_service',
        referenceId: request.patientId,
        metadata: {
          emergencyType: request.emergencyType,
          severity: request.severity,
          location: request.location,
          symptoms: request.symptoms,
          vitalSigns: request.vitalSigns,
        },
      },
      metadata: {
        emergencyType: request.emergencyType,
        location: request.location,
        contactInfo: request.contactInfo,
      },
      retries: 0,
    });

    // Invalidar caché
    await invalidateCacheByPattern(`${CACHE_NAMESPACES.ALERTS}:*`);
    await invalidateCacheByPattern(`${CACHE_NAMESPACES.ALERT_SUMMARY}:*`);

    // Despachar inmediatamente para emergencias
    await notificationService.dispatchAlert(alert);

    // Notificar a contactos de emergencia si están configurados
    if (this.config.emergencyContacts?.length) {
      for (const contact of this.config.emergencyContacts) {
        await this.notifyEmergencyContact(contact, request);
      }
    }
  }

  /**
   * Enviar solicitud a servicio de emergencias externo
   */
  private async dispatchToEmergencyService(request: EmergencyRequest): Promise<EmergencyResponse> {
    if (!this.client) {
      throw new AppError('Cliente de emergencias no configurado', 500);
    }

    const payload = {
      type: request.emergencyType,
      severity: request.severity,
      description: request.description,
      location: {
        latitude: request.location.latitude,
        longitude: request.location.longitude,
        address: request.location.address,
        district: request.location.district,
      },
      patient: {
        id: request.patientId,
        name: request.patientName,
      },
      symptoms: request.symptoms,
      vitalSigns: request.vitalSigns,
      contactInfo: request.contactInfo,
      metadata: request.metadata,
    };

    const response = await this.client.post('/emergencies', payload);

    return {
      emergencyId: response.data.id || response.data.emergencyId,
      status: response.data.status || 'dispatched',
      estimatedArrival: response.data.estimatedArrival
        ? new Date(response.data.estimatedArrival)
        : undefined,
      serviceProvider: response.data.serviceProvider,
      trackingUrl: response.data.trackingUrl,
      metadata: {
        ...response.data.metadata,
        userId: request.userId,
        patientId: request.patientId,
      },
    };
  }

  /**
   * Crear respuesta simulada para desarrollo/testing
   */
  private createSimulatedResponse(request: EmergencyRequest): EmergencyResponse {
    const emergencyId = `EMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const estimatedArrival = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    return {
      emergencyId,
      status: 'dispatched',
      estimatedArrival,
      serviceProvider: 'Servicio de Emergencias Local',
      trackingUrl: `https://emergency-tracker.example.com/${emergencyId}`,
      emergencyType: request.emergencyType,
      severity: request.severity,
      metadata: {
        userId: request.userId,
        patientId: request.patientId,
        simulated: true,
      },
    } as EmergencyResponse;
  }

  /**
   * Validar ubicación GPS
   */
  private validateLocation(location: EmergencyLocation): void {
    if (!location.latitude || !location.longitude) {
      throw new AppError('Coordenadas GPS son requeridas para emergencias', 400);
    }

    if (
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      throw new AppError('Coordenadas GPS deben ser números válidos', 400);
    }

    // Validar rango de latitud (-90 a 90)
    if (location.latitude < -90 || location.latitude > 90) {
      throw new AppError('Latitud debe estar entre -90 y 90', 400);
    }

    // Validar rango de longitud (-180 a 180)
    if (location.longitude < -180 || location.longitude > 180) {
      throw new AppError('Longitud debe estar entre -180 y 180', 400);
    }
  }

  /**
   * Notificar contacto de emergencia
   */
  private async notifyEmergencyContact(
    contact: EmergencyContact,
    request: EmergencyRequest
  ): Promise<void> {
    try {
      const { smsService } = await import('./smsService');

      const locationInfo = request.location.address
        ? request.location.address
        : `Coordenadas: ${request.location.latitude}, ${request.location.longitude}`;

      const emergencyInfo = {
        type: this.getEmergencyTypeLabel(request.emergencyType),
        location: locationInfo,
        patientName: request.patientName,
        description: request.description,
      };

      await smsService.sendEmergencySMS(contact.phone, emergencyInfo);

      logger.info('Contacto de emergencia notificado vía SMS', {
        contactName: contact.name,
        contactPhone: contact.phone.substring(0, 4) + '****', // Ocultar en logs
        emergencyType: request.emergencyType,
        patientName: request.patientName,
      });
    } catch (error: any) {
      logger.error(`Error al notificar contacto de emergencia: ${error.message}`, {
        contactName: contact.name,
        contactPhone: contact.phone.substring(0, 4) + '****',
        error: error.message,
      });
      // No lanzar error para no bloquear el flujo principal
    }
  }

  /**
   * Obtener etiqueta de tipo de emergencia
   */
  private getEmergencyTypeLabel(type: EmergencyRequest['emergencyType']): string {
    const labels: Record<EmergencyRequest['emergencyType'], string> = {
      medical: 'Emergencia Médica',
      respiratory_crisis: 'Crisis Respiratoria',
      accident: 'Accidente',
      other: 'Otra Emergencia',
    };
    return labels[type] || type;
  }

  /**
   * Detectar emergencia automáticamente basada en síntomas críticos
   */
  async detectEmergencyFromSymptoms(
    userId: string,
    patientId: string,
    symptoms: string[],
    vitalSigns?: EmergencyRequest['vitalSigns'],
    location?: EmergencyLocation
  ): Promise<EmergencyResponse | null> {
    // Criterios para detección automática de emergencia
    const criticalSymptoms = [
      'dificultad_respiratoria_severa',
      'dolor_pecho_intenso',
      'perdida_conciencia',
      'cianosis',
      'convulsiones',
    ];

    const hasCriticalSymptom = symptoms.some((symptom) =>
      criticalSymptoms.some((critical) => symptom.toLowerCase().includes(critical))
    );

    const hasCriticalVitalSigns =
      vitalSigns?.oxygenSaturation !== undefined && vitalSigns.oxygenSaturation < 90;

    if (hasCriticalSymptom || hasCriticalVitalSigns) {
      if (!location) {
        logger.warn('Emergencia detectada pero no hay ubicación GPS disponible', {
          userId,
          patientId,
        });
        return null;
      }

      return await this.createEmergency({
        userId,
        patientId,
        emergencyType: 'respiratory_crisis',
        severity: 'critical',
        description: 'Emergencia detectada automáticamente por síntomas críticos',
        location,
        symptoms,
        vitalSigns,
      });
    }

    return null;
  }
}

// Instancia singleton
export const emergencyService = new EmergencyService();

