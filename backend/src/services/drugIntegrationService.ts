import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

/**
 * Servicio de integración con APIs de medicamentos
 * Soporta FDA, RxNorm, DrugBank para interacciones y dosificación
 */

export interface DrugInfo {
  name: string;
  rxcui?: string; // RxNorm Concept Unique Identifier
  ndc?: string; // National Drug Code
  fdaId?: string;
  drugBankId?: string;
  activeIngredients: string[];
  dosageForms: string[];
  indications: string[];
  contraindications: string[];
  sideEffects: string[];
  interactions: DrugInteraction[];
  dosage?: {
    min: number;
    max: number;
    unit: string;
    frequency: string;
  };
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'mild' | 'moderate' | 'severe' | 'contraindicated';
  description: string;
  clinicalSignificance: string;
  source: 'fda' | 'rxnorm' | 'drugbank' | 'local';
}

export interface DrugIntegrationConfig {
  fdaApiKey?: string;
  rxNormBaseUrl?: string;
  drugBankApiKey?: string;
  enableCaching?: boolean;
  cacheTTL?: number;
}

export class DrugIntegrationService {
  private fdaClient: AxiosInstance | null = null;
  private rxNormClient: AxiosInstance | null = null;
  private drugBankClient: AxiosInstance | null = null;
  private config: DrugIntegrationConfig;
  private cache: Map<string, { data: any; expires: number }> = new Map();

  constructor(config: DrugIntegrationConfig = {}) {
    this.config = {
      fdaApiKey: config.fdaApiKey || process.env.FDA_API_KEY,
      rxNormBaseUrl: config.rxNormBaseUrl || 'https://rxnav.nlm.nih.gov/REST',
      drugBankApiKey: config.drugBankApiKey || process.env.DRUGBANK_API_KEY,
      enableCaching: config.enableCaching ?? true,
      cacheTTL: config.cacheTTL || 3600000, // 1 hora por defecto
    };

    // Inicializar cliente FDA
    if (this.config.fdaApiKey) {
      this.fdaClient = axios.create({
        baseURL: 'https://api.fda.gov',
        params: {
          api_key: this.config.fdaApiKey,
        },
        timeout: 30000,
      });
    }

    // Inicializar cliente RxNorm
    if (this.config.rxNormBaseUrl) {
      this.rxNormClient = axios.create({
        baseURL: this.config.rxNormBaseUrl,
        timeout: 30000,
      });
    }

    // Inicializar cliente DrugBank (requiere autenticación)
    if (this.config.drugBankApiKey) {
      this.drugBankClient = axios.create({
        baseURL: 'https://api.drugbankplus.com/v1',
        headers: {
          'Authorization': `Bearer ${this.config.drugBankApiKey}`,
        },
        timeout: 30000,
      });
    }
  }

  /**
   * Buscar información de medicamento por nombre
   */
  async searchDrug(drugName: string): Promise<DrugInfo | null> {
    const cacheKey = `drug:${drugName.toLowerCase()}`;
    
    // Verificar caché
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }
    }

    try {
      let drugInfo: DrugInfo | null = null;

      // Intentar buscar en RxNorm primero (más confiable)
      if (this.rxNormClient) {
        drugInfo = await this.searchRxNorm(drugName);
      }

      // Si no se encuentra, buscar en FDA
      if (!drugInfo && this.fdaClient) {
        drugInfo = await this.searchFDA(drugName);
      }

      // Enriquecer con información de DrugBank si está disponible
      if (drugInfo && this.drugBankClient) {
        drugInfo = await this.enrichWithDrugBank(drugInfo);
      }

      // Guardar en caché
      if (drugInfo && this.config.enableCaching) {
        this.cache.set(cacheKey, {
          data: drugInfo,
          expires: Date.now() + (this.config.cacheTTL || 3600000),
        });
      }

      return drugInfo;
    } catch (error: any) {
      logger.error(`Error al buscar medicamento: ${error.message}`, {
        drugName,
        error: error.message,
      });
      throw new AppError(`Error al buscar medicamento: ${error.message}`, 500);
    }
  }

  /**
   * Buscar en RxNorm
   */
  private async searchRxNorm(drugName: string): Promise<DrugInfo | null> {
    if (!this.rxNormClient) {
      return null;
    }

    try {
      // Buscar por nombre aproximado
      const searchResponse = await this.rxNormClient.get('/drugs.json', {
        params: {
          name: drugName,
        },
      });

      if (!searchResponse.data || !searchResponse.data.drugGroup?.conceptGroup) {
        return null;
      }

      const concepts = searchResponse.data.drugGroup.conceptGroup[0]?.conceptProperties;
      if (!concepts || concepts.length === 0) {
        return null;
      }

      const firstConcept = concepts[0];
      const rxcui = firstConcept.rxcui;

      // Obtener información detallada
      const drugInfoResponse = await this.rxNormClient.get(`/rxcui/${rxcui}/properties.json`);

      if (!drugInfoResponse.data || !drugInfoResponse.data.properties) {
        return null;
      }

      const props = drugInfoResponse.data.properties;

      // Obtener ingredientes activos (ingredientes)
      let activeIngredients: string[] = [];
      try {
        const ingredientsResponse = await this.rxNormClient.get(`/rxcui/${rxcui}/related.json`, {
          params: {
            tty: 'IN', // Ingredient
          },
        });
        if (ingredientsResponse.data?.relatedGroup?.conceptGroup) {
          activeIngredients = ingredientsResponse.data.relatedGroup.conceptGroup
            .flatMap((group: any) => group.conceptProperties || [])
            .map((concept: any) => concept.name);
        }
      } catch (error: any) {
        logger.warn(`Error al obtener ingredientes activos: ${error.message}`);
      }

      return {
        name: props.name || drugName,
        rxcui,
        activeIngredients: activeIngredients.length > 0 ? activeIngredients : (props.synonym?.split(';') || []),
        dosageForms: [],
        indications: [],
        contraindications: [],
        sideEffects: [],
        interactions: [],
      };
    } catch (error: any) {
      logger.warn(`Error al buscar en RxNorm: ${error.message}`, {
        drugName,
      });
      return null;
    }
  }

  /**
   * Buscar medicamentos genéricos por nombre de marca
   */
  async searchGenericDrugs(brandName: string): Promise<DrugInfo[]> {
    const cacheKey = `generic:${brandName.toLowerCase()}`;
    
    // Verificar caché
    if (this.config.enableCaching) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.data;
      }
    }

    try {
      const genericDrugs: DrugInfo[] = [];

      // Buscar en RxNorm (mejor fuente para genéricos)
      if (this.rxNormClient) {
        const generics = await this.searchGenericInRxNorm(brandName);
        genericDrugs.push(...generics);
      }

      // Buscar en FDA si RxNorm no encuentra resultados
      if (genericDrugs.length === 0 && this.fdaClient) {
        const fdaGenerics = await this.searchGenericInFDA(brandName);
        genericDrugs.push(...fdaGenerics);
      }

      // Guardar en caché
      if (genericDrugs.length > 0 && this.config.enableCaching) {
        this.cache.set(cacheKey, {
          data: genericDrugs,
          expires: Date.now() + (this.config.cacheTTL || 3600000),
        });
      }

      return genericDrugs;
    } catch (error: any) {
      logger.error(`Error al buscar medicamentos genéricos: ${error.message}`, {
        brandName,
        error: error.message,
      });
      throw new AppError(`Error al buscar medicamentos genéricos: ${error.message}`, 500);
    }
  }

  /**
   * Buscar genéricos en RxNorm
   */
  private async searchGenericInRxNorm(brandName: string): Promise<DrugInfo[]> {
    if (!this.rxNormClient) {
      return [];
    }

    try {
      // Buscar el medicamento de marca
      const searchResponse = await this.rxNormClient.get('/drugs.json', {
        params: {
          name: brandName,
        },
      });

      if (!searchResponse.data || !searchResponse.data.drugGroup?.conceptGroup) {
        return [];
      }

      const concepts = searchResponse.data.drugGroup.conceptGroup[0]?.conceptProperties;
      if (!concepts || concepts.length === 0) {
        return [];
      }

      const rxcui = concepts[0].rxcui;

      // Buscar ingredientes activos (genéricos)
      const ingredientsResponse = await this.rxNormClient.get(`/rxcui/${rxcui}/related.json`, {
        params: {
          tty: 'IN', // Ingredient
        },
      });

      if (!ingredientsResponse.data?.relatedGroup?.conceptGroup) {
        return [];
      }

      const genericDrugs: DrugInfo[] = [];

      for (const group of ingredientsResponse.data.relatedGroup.conceptGroup) {
        if (group.conceptProperties) {
          for (const concept of group.conceptProperties) {
            // Obtener información del genérico
            const genericInfo = await this.searchRxNorm(concept.name);
            if (genericInfo) {
              genericDrugs.push(genericInfo);
            }
          }
        }
      }

      return genericDrugs;
    } catch (error: any) {
      logger.warn(`Error al buscar genéricos en RxNorm: ${error.message}`, {
        brandName,
      });
      return [];
    }
  }

  /**
   * Buscar genéricos en FDA
   */
  private async searchGenericInFDA(brandName: string): Promise<DrugInfo[]> {
    if (!this.fdaClient) {
      return [];
    }

    try {
      const response = await this.fdaClient.get('/drug/label.json', {
        params: {
          search: `openfda.brand_name:"${brandName}"`,
          limit: 10,
        },
      });

      if (!response.data || !response.data.results) {
        return [];
      }

      const genericDrugs: DrugInfo[] = [];
      const seenGenerics = new Set<string>();

      for (const label of response.data.results) {
        const openfda = label.openfda || {};
        const genericNames = openfda.generic_name || [];

        for (const genericName of genericNames) {
          if (!seenGenerics.has(genericName.toLowerCase())) {
            seenGenerics.add(genericName.toLowerCase());
            
            const genericInfo = await this.searchDrug(genericName);
            if (genericInfo) {
              genericDrugs.push(genericInfo);
            }
          }
        }
      }

      return genericDrugs;
    } catch (error: any) {
      logger.warn(`Error al buscar genéricos en FDA: ${error.message}`, {
        brandName,
      });
      return [];
    }
  }

  /**
   * Buscar en FDA
   */
  private async searchFDA(drugName: string): Promise<DrugInfo | null> {
    if (!this.fdaClient) {
      return null;
    }

    try {
      const response = await this.fdaClient.get('/drug/label.json', {
        params: {
          search: `openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`,
          limit: 1,
        },
      });

      if (!response.data || !response.data.results || response.data.results.length === 0) {
        return null;
      }

      const label = response.data.results[0];
      const openfda = label.openfda || {};

      return {
        name: openfda.brand_name?.[0] || openfda.generic_name?.[0] || drugName,
        ndc: openfda.product_ndc?.[0],
        activeIngredients: openfda.substance_name || [],
        dosageForms: openfda.dosage_form || [],
        indications: label.indications_and_usage || [],
        contraindications: label.contraindications || [],
        sideEffects: label.warnings || [],
        interactions: [],
      };
    } catch (error: any) {
      logger.warn(`Error al buscar en FDA: ${error.message}`, {
        drugName,
      });
      return null;
    }
  }

  /**
   * Enriquecer información con DrugBank
   */
  private async enrichWithDrugBank(drugInfo: DrugInfo): Promise<DrugInfo> {
    if (!this.drugBankClient) {
      return drugInfo;
    }

    try {
      // Buscar por nombre
      const searchResponse = await this.drugBankClient.get('/drugs', {
        params: {
          query: drugInfo.name,
          limit: 1,
        },
      });

      if (!searchResponse.data || !searchResponse.data.drugs || searchResponse.data.drugs.length === 0) {
        return drugInfo;
      }

      const drug = searchResponse.data.drugs[0];

      return {
        ...drugInfo,
        drugBankId: drug.id,
        interactions: [
          ...drugInfo.interactions,
          ...(drug.drugInteractions || []).map((interaction: any) => ({
            drug1: drugInfo.name,
            drug2: interaction.drugName,
            severity: this.mapSeverity(interaction.severity),
            description: interaction.description,
            clinicalSignificance: interaction.clinicalSignificance,
            source: 'drugbank' as const,
          })),
        ],
      };
    } catch (error: any) {
      logger.warn(`Error al enriquecer con DrugBank: ${error.message}`, {
        drugName: drugInfo.name,
      });
      return drugInfo;
    }
  }

  /**
   * Verificar interacciones entre múltiples medicamentos
   */
  async checkInteractions(drugNames: string[]): Promise<DrugInteraction[]> {
    if (drugNames.length < 2) {
      return [];
    }

    try {
      const interactions: DrugInteraction[] = [];

      // Verificar todas las combinaciones de pares
      for (let i = 0; i < drugNames.length; i++) {
        for (let j = i + 1; j < drugNames.length; j++) {
          const drug1 = drugNames[i];
          const drug2 = drugNames[j];

          const interaction = await this.checkPairInteraction(drug1, drug2);
          if (interaction) {
            interactions.push(interaction);
          }
        }
      }

      return interactions;
    } catch (error: any) {
      logger.error(`Error al verificar interacciones: ${error.message}`, {
        drugNames,
        error: error.message,
      });
      throw new AppError(`Error al verificar interacciones: ${error.message}`, 500);
    }
  }

  /**
   * Verificar interacción entre dos medicamentos
   */
  private async checkPairInteraction(drug1: string, drug2: string): Promise<DrugInteraction | null> {
    // Buscar en DrugBank si está disponible
    if (this.drugBankClient) {
      try {
        const response = await this.drugBankClient.get('/interactions', {
          params: {
            drug1,
            drug2,
          },
        });

        if (response.data && response.data.interactions && response.data.interactions.length > 0) {
          const interaction = response.data.interactions[0];
          return {
            drug1,
            drug2,
            severity: this.mapSeverity(interaction.severity),
            description: interaction.description,
            clinicalSignificance: interaction.clinicalSignificance,
            source: 'drugbank',
          };
        }
      } catch (error: any) {
        logger.warn(`Error al verificar interacción en DrugBank: ${error.message}`);
      }
    }

    // Fallback: usar base de datos local o reglas simples
    return this.checkLocalInteractions(drug1, drug2);
  }

  /**
   * Verificar interacciones en base de datos local (simplificado)
   */
  private checkLocalInteractions(drug1: string, drug2: string): DrugInteraction | null {
    // Lista simplificada de interacciones conocidas
    // En producción, esto debería venir de una base de datos
    const knownInteractions: Record<string, { severity: string; description: string }> = {
      'warfarin-aspirin': {
        severity: 'severe',
        description: 'Aumenta el riesgo de sangrado',
      },
      'warfarin-ibuprofen': {
        severity: 'moderate',
        description: 'Puede aumentar el riesgo de sangrado',
      },
    };

    const key1 = `${drug1.toLowerCase()}-${drug2.toLowerCase()}`;
    const key2 = `${drug2.toLowerCase()}-${drug1.toLowerCase()}`;

    const interaction = knownInteractions[key1] || knownInteractions[key2];
    if (interaction) {
      return {
        drug1,
        drug2,
        severity: interaction.severity as 'mild' | 'moderate' | 'severe' | 'contraindicated',
        description: interaction.description,
        clinicalSignificance: 'Conocida',
        source: 'local',
      };
    }

    return null;
  }

  /**
   * Obtener dosificación recomendada
   */
  async getDosage(drugName: string, condition?: string, age?: number, weight?: number): Promise<DrugInfo['dosage'] | null> {
    try {
      const drugInfo = await this.searchDrug(drugName);
      if (!drugInfo || !drugInfo.dosage) {
        return null;
      }

      // Ajustar dosificación según edad y peso si se proporcionan
      if (age && weight && drugInfo.dosage) {
        // Lógica simplificada - en producción usar algoritmos médicos reales
        return {
          ...drugInfo.dosage,
          min: drugInfo.dosage.min * (age < 12 ? 0.5 : 1),
          max: drugInfo.dosage.max * (age < 12 ? 0.5 : 1),
        };
      }

      return drugInfo.dosage;
    } catch (error: any) {
      logger.error(`Error al obtener dosificación: ${error.message}`, {
        drugName,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Verificar contraindicaciones para un paciente
   */
  async checkContraindications(
    drugName: string,
    patientContext: {
      age?: number;
      weight?: number;
      conditions?: string[];
      allergies?: string[];
      currentMedications?: string[];
    },
  ): Promise<{
    contraindicated: boolean;
    alerts: Array<{
      severity: 'warning' | 'error';
      message: string;
      reason: string;
    }>;
  }> {
    try {
      const drugInfo = await this.searchDrug(drugName);
      if (!drugInfo) {
        return {
          contraindicated: false,
          alerts: [],
        };
      }

      const alerts: Array<{ severity: 'warning' | 'error'; message: string; reason: string }> = [];

      // Verificar contraindicaciones por condiciones médicas
      if (patientContext.conditions && drugInfo.contraindications.length > 0) {
        for (const condition of patientContext.conditions) {
          const conditionLower = condition.toLowerCase();
          for (const contraindication of drugInfo.contraindications) {
            if (contraindication.toLowerCase().includes(conditionLower) || 
                conditionLower.includes(contraindication.toLowerCase())) {
              alerts.push({
                severity: 'error',
                message: `Contraindicación: ${drugName} no debe usarse en pacientes con ${condition}`,
                reason: `El medicamento está contraindicado para: ${contraindication}`,
              });
            }
          }
        }
      }

      // Verificar alergias
      if (patientContext.allergies && drugInfo.activeIngredients.length > 0) {
        for (const allergy of patientContext.allergies) {
          const allergyLower = allergy.toLowerCase();
          for (const ingredient of drugInfo.activeIngredients) {
            if (ingredient.toLowerCase().includes(allergyLower) || 
                allergyLower.includes(ingredient.toLowerCase())) {
              alerts.push({
                severity: 'error',
                message: `Alergia detectada: ${drugName} contiene ${ingredient} al cual el paciente es alérgico`,
                reason: `Alergia conocida a: ${allergy}`,
              });
            }
          }
        }
      }

      // Verificar interacciones con medicamentos actuales
      if (patientContext.currentMedications && patientContext.currentMedications.length > 0) {
        const allDrugs = [drugName, ...patientContext.currentMedications];
        const interactions = await this.checkInteractions(allDrugs);
        
        for (const interaction of interactions) {
          if (interaction.severity === 'contraindicated') {
            alerts.push({
              severity: 'error',
              message: `Interacción contraindicada: ${interaction.drug1} y ${interaction.drug2} no deben usarse juntos`,
              reason: interaction.description,
            });
          } else if (interaction.severity === 'severe') {
            alerts.push({
              severity: 'error',
              message: `Interacción grave: ${interaction.drug1} y ${interaction.drug2}`,
              reason: interaction.description,
            });
          } else if (interaction.severity === 'moderate') {
            alerts.push({
              severity: 'warning',
              message: `Interacción moderada: ${interaction.drug1} y ${interaction.drug2}`,
              reason: interaction.description,
            });
          }
        }
      }

      // Verificar edad y peso para dosificación
      if (patientContext.age !== undefined && patientContext.weight !== undefined) {
        const dosage = await this.getDosage(drugName, undefined, patientContext.age, patientContext.weight);
        if (!dosage) {
          alerts.push({
            severity: 'warning',
            message: `Dosificación no disponible para pacientes de ${patientContext.age} años y ${patientContext.weight} kg`,
            reason: 'No se encontró información de dosificación específica para este perfil de paciente',
          });
        }
      }

      return {
        contraindicated: alerts.some((alert) => alert.severity === 'error'),
        alerts,
      };
    } catch (error: any) {
      logger.error(`Error al verificar contraindicaciones: ${error.message}`, {
        drugName,
        error: error.message,
      });
      throw new AppError(`Error al verificar contraindicaciones: ${error.message}`, 500);
    }
  }

  /**
   * Mapear severidad de diferentes fuentes
   */
  private mapSeverity(severity: string): 'mild' | 'moderate' | 'severe' | 'contraindicated' {
    const lower = severity.toLowerCase();
    if (lower.includes('contraindicated') || lower.includes('contraindicado')) {
      return 'contraindicated';
    }
    if (lower.includes('severe') || lower.includes('grave')) {
      return 'severe';
    }
    if (lower.includes('moderate') || lower.includes('moderado')) {
      return 'moderate';
    }
    return 'mild';
  }
}

export const drugIntegrationService = new DrugIntegrationService();

