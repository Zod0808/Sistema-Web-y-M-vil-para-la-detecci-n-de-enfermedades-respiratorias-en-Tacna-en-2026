import { fhirService, FhirResource, FhirBundle } from './fhirService';
import { OAuth2Service, OAuth2Config } from './oauth2Service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import axios, { AxiosInstance } from 'axios';

/**
 * Servicio de sincronización con sistemas hospitalarios externos
 * Implementa sincronización bidireccional de historiales clínicos usando FHIR
 */

export interface HospitalSystemConfig {
  name: string;
  fhirBaseUrl: string;
  oauth2Config?: OAuth2Config;
  syncInterval?: number; // en minutos
  enabled?: boolean;
}

export interface SyncResult {
  imported: number;
  exported: number;
  errors: Array<{ resource: string; error: string }>;
  timestamp: Date;
}

export interface ExternalHistorySync {
  patientId: string;
  resources: FhirResource[];
  lastSync?: Date;
}

export class HospitalSyncService {
  private hospitalConfigs: Map<string, HospitalSystemConfig> = new Map();
  private oauth2Services: Map<string, OAuth2Service> = new Map();
  private fhirClients: Map<string, AxiosInstance> = new Map();

  /**
   * Registrar un sistema hospitalario externo
   */
  registerHospitalSystem(config: HospitalSystemConfig): void {
    this.hospitalConfigs.set(config.name, config);

    // Configurar OAuth2 si está disponible
    if (config.oauth2Config) {
      const oauth2Service = new OAuth2Service(config.oauth2Config);
      this.oauth2Services.set(config.name, oauth2Service);

      // Crear cliente FHIR autenticado
      oauth2Service
        .createAuthenticatedClient(config.fhirBaseUrl)
        .then((client) => {
          this.fhirClients.set(config.name, client);
          logger.info(`Sistema hospitalario registrado: ${config.name}`, {
            fhirBaseUrl: config.fhirBaseUrl,
          });
        })
        .catch((error) => {
          logger.error(`Error al configurar cliente FHIR para ${config.name}: ${error.message}`);
        });
    } else {
      // Cliente FHIR sin autenticación OAuth2
      const client = axios.create({
        baseURL: config.fhirBaseUrl,
        headers: {
          'Content-Type': 'application/fhir+json',
        },
        timeout: 30000,
      });
      this.fhirClients.set(config.name, client);
      logger.info(`Sistema hospitalario registrado (sin OAuth2): ${config.name}`);
    }
  }

  /**
   * Sincronizar historial clínico desde sistema externo
   */
  async syncFromExternal(
    hospitalName: string,
    patientId: string,
    resourceTypes?: string[],
  ): Promise<SyncResult> {
    const config = this.hospitalConfigs.get(hospitalName);
    if (!config || !config.enabled) {
      throw new AppError(`Sistema hospitalario ${hospitalName} no está configurado o deshabilitado`, 400);
    }

    const client = this.fhirClients.get(hospitalName);
    if (!client) {
      throw new AppError(`Cliente FHIR no disponible para ${hospitalName}`, 500);
    }

    const result: SyncResult = {
      imported: 0,
      exported: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Buscar recursos del paciente en el sistema externo
      const resourceTypesToSync = resourceTypes || [
        'Patient',
        'Observation',
        'Condition',
        'MedicationStatement',
        'Procedure',
        'DiagnosticReport',
        'Encounter',
      ];

      for (const resourceType of resourceTypesToSync) {
        try {
          const response = await client.get<FhirBundle>(`/${resourceType}`, {
            params: {
              patient: patientId,
              _sort: '-date',
              _count: 100,
            },
          });

          if (response.data.entry && response.data.entry.length > 0) {
            // Importar recursos al sistema local
            for (const entry of response.data.entry) {
              try {
                await fhirService.createResource(entry.resource);
                result.imported++;
              } catch (error: any) {
                result.errors.push({
                  resource: `${resourceType}/${entry.resource.id}`,
                  error: error.message,
                });
              }
            }
          }
        } catch (error: any) {
          result.errors.push({
            resource: resourceType,
            error: error.message,
          });
        }
      }

      logger.info(`Sincronización desde ${hospitalName} completada`, {
        patientId,
        imported: result.imported,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error(`Error en sincronización desde ${hospitalName}: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw new AppError(`Error en sincronización: ${error.message}`, 500);
    }
  }

  /**
   * Sincronizar historial clínico hacia sistema externo
   */
  async syncToExternal(
    hospitalName: string,
    patientId: string,
    resources: FhirResource[],
  ): Promise<SyncResult> {
    const config = this.hospitalConfigs.get(hospitalName);
    if (!config || !config.enabled) {
      throw new AppError(`Sistema hospitalario ${hospitalName} no está configurado o deshabilitado`, 400);
    }

    const client = this.fhirClients.get(hospitalName);
    if (!client) {
      throw new AppError(`Cliente FHIR no disponible para ${hospitalName}`, 500);
    }

    const result: SyncResult = {
      imported: 0,
      exported: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Crear Bundle para transacción
      const bundle: FhirBundle = {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: resources.map((resource) => ({
          request: {
            method: 'POST',
            url: resource.resourceType,
          },
          resource,
        })),
      };

      // Enviar Bundle al sistema externo
      const response = await client.post<FhirBundle>('/', bundle);

      if (response.data.entry) {
        result.exported = response.data.entry.filter((entry) => entry.response?.status?.startsWith('2')).length;
        result.errors = response.data.entry
          .filter((entry) => !entry.response?.status?.startsWith('2'))
          .map((entry) => ({
            resource: entry.resource?.resourceType || 'unknown',
            error: entry.response?.status || 'unknown error',
          }));
      }

      logger.info(`Sincronización hacia ${hospitalName} completada`, {
        patientId,
        exported: result.exported,
        errors: result.errors.length,
      });

      return result;
    } catch (error: any) {
      logger.error(`Error en sincronización hacia ${hospitalName}: ${error.message}`, {
        patientId,
        error: error.message,
      });
      throw new AppError(`Error en sincronización: ${error.message}`, 500);
    }
  }

  /**
   * Sincronización bidireccional completa
   */
  async syncBidirectional(
    hospitalName: string,
    patientId: string,
    resourceTypes?: string[],
  ): Promise<{ from: SyncResult; to: SyncResult }> {
    // Primero sincronizar desde externo
    const fromResult = await this.syncFromExternal(hospitalName, patientId, resourceTypes);

    // Luego obtener recursos locales y sincronizar hacia externo
    const localResources: FhirResource[] = [];
    const resourceTypesToSync = resourceTypes || ['Observation', 'Condition', 'DiagnosticReport'];

    for (const resourceType of resourceTypesToSync) {
      try {
        const bundle = await fhirService.search<FhirBundle>(resourceType, {
          patient: patientId,
          _count: 100,
        });

        if (bundle.entry) {
          localResources.push(...bundle.entry.map((entry) => entry.resource));
        }
      } catch (error: any) {
        logger.warn(`Error al obtener recursos locales ${resourceType}: ${error.message}`);
      }
    }

    const toResult = await this.syncToExternal(hospitalName, patientId, localResources);

    return { from: fromResult, to: toResult };
  }

  /**
   * Obtener lista de sistemas hospitalarios registrados
   */
  getRegisteredHospitals(): Array<{ name: string; enabled: boolean; fhirBaseUrl: string }> {
    return Array.from(this.hospitalConfigs.values()).map((config) => ({
      name: config.name,
      enabled: config.enabled ?? true,
      fhirBaseUrl: config.fhirBaseUrl,
    }));
  }
}

export const hospitalSyncService = new HospitalSyncService();

// Inicializar sistemas hospitalarios desde variables de entorno
if (process.env.HOSPITAL_SYSTEMS) {
  try {
    const systems = JSON.parse(process.env.HOSPITAL_SYSTEMS) as HospitalSystemConfig[];
    systems.forEach((system) => {
      hospitalSyncService.registerHospitalSystem(system);
    });
  } catch (error: any) {
    logger.error(`Error al inicializar sistemas hospitalarios: ${error.message}`);
  }
}

