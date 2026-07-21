import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { EmergencyLocation, EmergencyRequest } from './emergencyService';

/**
 * Servicio de integración con ambulancias y servicios de emergencia
 * Gestiona el despacho automático de ambulancias y tracking en tiempo real
 */

export interface AmbulanceServiceConfig {
  enabled: boolean;
  apiUrl?: string;
  apiKey?: string;
  provider?: 'local' | 'external' | 'simulated';
  autoDispatchEnabled?: boolean;
  trackingEnabled?: boolean;
}

export interface AmbulanceDispatch {
  ambulanceId: string;
  emergencyId: string;
  status: 'dispatched' | 'in_transit' | 'on_scene' | 'transporting' | 'completed' | 'cancelled';
  estimatedArrival?: Date;
  currentLocation?: EmergencyLocation;
  crew?: {
    driver: string;
    paramedic: string;
    nurse?: string;
  };
  vehicle?: {
    type: 'basic' | 'advanced' | 'critical_care';
    licensePlate: string;
    equipment: string[];
  };
  trackingUrl?: string;
  metadata?: Record<string, any>;
}

export interface AmbulanceStatusUpdate {
  ambulanceId: string;
  status: AmbulanceDispatch['status'];
  location?: EmergencyLocation;
  estimatedArrival?: Date;
  notes?: string;
}

export class AmbulanceService {
  private config: AmbulanceServiceConfig;
  private client: AxiosInstance | null = null;
  private activeDispatches: Map<string, AmbulanceDispatch> = new Map();

  constructor(config: Partial<AmbulanceServiceConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? (process.env.AMBULANCE_SERVICE_ENABLED === 'true' || process.env.NODE_ENV === 'test'),
      apiUrl: config.apiUrl || process.env.AMBULANCE_SERVICE_API_URL,
      apiKey: config.apiKey || process.env.AMBULANCE_SERVICE_API_KEY,
      provider: (config.provider || process.env.AMBULANCE_SERVICE_PROVIDER || 'simulated') as 'local' | 'external' | 'simulated',
      autoDispatchEnabled: config.autoDispatchEnabled ?? true,
      trackingEnabled: config.trackingEnabled ?? true,
    };

    if (this.config.enabled && this.config.apiUrl && this.config.apiKey && this.config.provider === 'external') {
      try {
        const parsed = new URL(this.config.apiUrl);
        if (parsed.protocol !== 'https:') {
          throw new Error(`AMBULANCE_SERVICE_API_URL debe usar HTTPS (recibido: ${parsed.protocol})`);
        }
      } catch (err: any) {
        logger.error('AMBULANCE_SERVICE_API_URL inválida — cliente no creado', { error: err.message });
        return;
      }
      this.client = axios.create({
        baseURL: this.config.apiUrl,
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });
    }
  }

  /**
   * Despachar ambulancia automáticamente
   */
  async dispatchAmbulance(emergencyRequest: EmergencyRequest): Promise<AmbulanceDispatch> {
    if (!this.config.enabled) {
      throw new AppError('Servicio de ambulancias no está habilitado', 503);
    }

    if (!this.config.autoDispatchEnabled) {
      throw new AppError('Despacho automático de ambulancias no está habilitado', 503);
    }

    try {
      let dispatch: AmbulanceDispatch;

      if (this.config.provider === 'external' && this.client) {
        dispatch = await this.dispatchToExternalService(emergencyRequest);
      } else {
        dispatch = this.createSimulatedDispatch(emergencyRequest);
      }

      // Guardar despacho activo
      this.activeDispatches.set(dispatch.ambulanceId, dispatch);

      logger.info('Ambulancia despachada exitosamente', {
        ambulanceId: dispatch.ambulanceId,
        emergencyId: dispatch.emergencyId,
        status: dispatch.status,
        estimatedArrival: dispatch.estimatedArrival,
      });

      return dispatch;
    } catch (error: any) {
      logger.error(`Error al despachar ambulancia: ${error.message}`, {
        emergencyType: emergencyRequest.emergencyType,
        severity: emergencyRequest.severity,
        error: error.message,
      });
      throw new AppError(`Error al despachar ambulancia: ${error.message}`, 500);
    }
  }

  /**
   * Obtener estado de ambulancia
   */
  async getAmbulanceStatus(ambulanceId: string): Promise<AmbulanceDispatch | null> {
    const cached = this.activeDispatches.get(ambulanceId);
    if (cached) {
      return cached;
    }

    if (this.client) {
      try {
        const response = await this.client.get(`/ambulances/${ambulanceId}`);
        return response.data;
      } catch (error: any) {
        logger.error(`Error al obtener estado de ambulancia: ${error.message}`, {
          ambulanceId,
          error: error.message,
        });
        return null;
      }
    }

    return null;
  }

  /**
   * Actualizar estado de ambulancia (webhook desde servicio externo)
   */
  async updateAmbulanceStatus(update: AmbulanceStatusUpdate): Promise<AmbulanceDispatch | null> {
    const dispatch = this.activeDispatches.get(update.ambulanceId);
    if (!dispatch) {
      logger.warn(`Intento de actualizar ambulancia no encontrada: ${update.ambulanceId}`);
      return null;
    }

    dispatch.status = update.status;
    if (update.location) {
      dispatch.currentLocation = update.location;
    }
    if (update.estimatedArrival) {
      dispatch.estimatedArrival = update.estimatedArrival;
    }
    if (update.notes) {
      dispatch.metadata = {
        ...dispatch.metadata,
        notes: update.notes,
        lastUpdate: new Date().toISOString(),
      };
    }

    this.activeDispatches.set(update.ambulanceId, dispatch);

    logger.info('Estado de ambulancia actualizado', {
      ambulanceId: update.ambulanceId,
      status: update.status,
    });

    return dispatch;
  }

  /**
   * Obtener ambulancias activas para una emergencia
   */
  getActiveAmbulances(emergencyId: string): AmbulanceDispatch[] {
    return Array.from(this.activeDispatches.values()).filter(
      (dispatch) => dispatch.emergencyId === emergencyId && dispatch.status !== 'completed' && dispatch.status !== 'cancelled'
    );
  }

  /**
   * Despachar a servicio externo
   */
  private async dispatchToExternalService(emergencyRequest: EmergencyRequest): Promise<AmbulanceDispatch> {
    if (!this.client) {
      throw new AppError('Cliente de ambulancias no configurado', 500);
    }

    const payload = {
      emergencyType: emergencyRequest.emergencyType,
      severity: emergencyRequest.severity,
      location: {
        latitude: emergencyRequest.location.latitude,
        longitude: emergencyRequest.location.longitude,
        address: emergencyRequest.location.address,
        district: emergencyRequest.location.district,
      },
      patient: {
        id: emergencyRequest.patientId,
        name: emergencyRequest.patientName,
      },
      symptoms: emergencyRequest.symptoms,
      vitalSigns: emergencyRequest.vitalSigns,
      priority: this.calculatePriority(emergencyRequest),
    };

    const response = await this.client.post('/ambulances/dispatch', payload);

    return {
      ambulanceId: response.data.ambulanceId || response.data.id,
      emergencyId: response.data.emergencyId || `EMG-${Date.now()}`,
      status: response.data.status || 'dispatched',
      estimatedArrival: response.data.estimatedArrival
        ? new Date(response.data.estimatedArrival)
        : this.calculateEstimatedArrival(emergencyRequest.location),
      currentLocation: response.data.currentLocation,
      crew: response.data.crew,
      vehicle: response.data.vehicle,
      trackingUrl: response.data.trackingUrl,
      metadata: {
        ...response.data.metadata,
        provider: 'external',
      },
    };
  }

  /**
   * Crear despacho simulado para desarrollo/testing
   */
  private createSimulatedDispatch(emergencyRequest: EmergencyRequest): AmbulanceDispatch {
    const ambulanceId = `AMB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const emergencyId = `EMG-${Date.now()}`;
    const estimatedArrival = this.calculateEstimatedArrival(emergencyRequest.location);

    // Determinar tipo de ambulancia según severidad
    const vehicleType = emergencyRequest.severity === 'critical' ? 'critical_care' : 
                       emergencyRequest.severity === 'high' ? 'advanced' : 'basic';

    return {
      ambulanceId,
      emergencyId,
      status: 'dispatched',
      estimatedArrival,
      crew: {
        driver: 'Conductor asignado',
        paramedic: 'Paramédico asignado',
        nurse: vehicleType === 'critical_care' ? 'Enfermero asignado' : undefined,
      },
      vehicle: {
        type: vehicleType,
        licensePlate: `AMB-${Math.floor(Math.random() * 10000)}`,
        equipment: this.getEquipmentForType(vehicleType),
      },
      trackingUrl: `https://ambulance-tracker.example.com/${ambulanceId}`,
      metadata: {
        provider: 'simulated',
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Calcular prioridad de emergencia
   */
  private calculatePriority(emergencyRequest: EmergencyRequest): number {
    const severityWeights: Record<EmergencyRequest['severity'], number> = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1,
    };

    let priority = severityWeights[emergencyRequest.severity] || 1;

    // Aumentar prioridad si hay signos vitales críticos
    if (emergencyRequest.vitalSigns?.oxygenSaturation && emergencyRequest.vitalSigns.oxygenSaturation < 90) {
      priority += 3;
    }

    if (emergencyRequest.vitalSigns?.heartRate && 
        (emergencyRequest.vitalSigns.heartRate < 50 || emergencyRequest.vitalSigns.heartRate > 150)) {
      priority += 2;
    }

    return Math.min(priority, 10); // Máximo 10
  }

  /**
   * Calcular tiempo estimado de llegada (simulado)
   */
  private calculateEstimatedArrival(location: EmergencyLocation): Date {
    // Simular tiempo de llegada basado en distancia (15-30 minutos)
    const baseMinutes = 15;
    const randomMinutes = Math.floor(Math.random() * 15);
    return new Date(Date.now() + (baseMinutes + randomMinutes) * 60 * 1000);
  }

  /**
   * Obtener equipamiento según tipo de ambulancia
   */
  private getEquipmentForType(type: 'basic' | 'advanced' | 'critical_care'): string[] {
    const baseEquipment = ['oxígeno', 'desfibrilador', 'camilla', 'botiquín básico'];
    
    if (type === 'advanced') {
      return [...baseEquipment, 'monitor cardíaco', 'bomba de infusión', 'medicamentos avanzados'];
    }
    
    if (type === 'critical_care') {
      return [...baseEquipment, 'monitor cardíaco', 'bomba de infusión', 'ventilador', 'medicamentos críticos', 'equipo de intubación'];
    }
    
    return baseEquipment;
  }

  /**
   * Cancelar despacho de ambulancia
   */
  async cancelDispatch(ambulanceId: string, reason?: string): Promise<boolean> {
    try {
      if (this.client) {
        await this.client.post(`/ambulances/${ambulanceId}/cancel`, { reason });
      }

      const dispatch = this.activeDispatches.get(ambulanceId);
      if (dispatch) {
        dispatch.status = 'cancelled';
        this.activeDispatches.set(ambulanceId, dispatch);
      }

      logger.info('Despacho de ambulancia cancelado', { ambulanceId, reason });
      return true;
    } catch (error: any) {
      logger.error(`Error al cancelar despacho: ${error.message}`, {
        ambulanceId,
        error: error.message,
      });
      return false;
    }
  }
}

export const ambulanceService = new AmbulanceService();

