/**
 * Drug Interaction Service
 * Integra con API externas para detectar interacciones medicamentosas
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { DrugInteraction } from '../types';

type InteractionRequest = {
  medications: Array<{
    name: string;
    dosage?: string;
  }>;
  patientContext?: {
    age?: number;
    weightKg?: number;
    allergies?: string[];
    renalImpairment?: boolean;
    hepaticImpairment?: boolean;
  };
};

class DrugInteractionService {
  private client: AxiosInstance | null = null;
  private readonly apiUrl = config.integrations.drugInteractions.url;
  private readonly apiKey = config.integrations.drugInteractions.apiKey;

  private getClient(): AxiosInstance | null {
    if (!this.apiUrl) {
      return null;
    }

    if (!this.client) {
      this.client = axios.create({
        baseURL: this.apiUrl,
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
      });
    }

    return this.client;
  }

  async checkInteractions(request: InteractionRequest): Promise<DrugInteraction[]> {
    const client = this.getClient();
    if (!client) {
      logger.debug('DRUG_INTERACTION_API_URL no configurado; omitiendo comprobación de interacciones');
      return [];
    }

    try {
      const response = await client.post('/interactions', request);
      if (Array.isArray(response.data?.interactions)) {
        return response.data.interactions.map((interaction: any) => ({
          medicationA: interaction.medicationA ?? 'desconocido',
          medicationB: interaction.medicationB ?? 'desconocido',
          severity: interaction.severity ?? 'moderate',
          description: interaction.description,
          source: interaction.source,
        }));
      }
      return [];
    } catch (error) {
      logger.warn('No se pudo consultar la API de interacciones medicamentosas', {
        error: error instanceof Error ? error.message : error,
      });
      return [];
    }
  }

  async evaluateDosage(
    medication: { name: string; dosage: string },
    patientContext?: InteractionRequest['patientContext']
  ): Promise<{ recommended: string; rationale: string }> {
    const client = this.getClient();
    if (!client) {
      return {
        recommended: medication.dosage,
        rationale: 'Sin API externa; se mantiene la dosificación original.',
      };
    }

    try {
      const response = await client.post('/dosage/recommendation', {
        medication,
        patientContext,
      });

      if (response.data?.recommended) {
        return {
          recommended: response.data.recommended,
          rationale: response.data.rationale ?? 'Recomendación de API externa',
        };
      }
    } catch (error) {
      logger.warn('No se pudo obtener dosificación recomendada', {
        medication: medication.name,
        error: error instanceof Error ? error.message : error,
      });
    }

    return {
      recommended: medication.dosage,
      rationale: 'Se mantiene la dosis original al fallar la recomendación externa.',
    };
  }
}

export const drugInteractionService = new DrugInteractionService();

export default drugInteractionService;

