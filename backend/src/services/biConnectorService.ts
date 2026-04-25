/**
 * BI Connector Service
 * 
 * Servicio para conectar con herramientas BI externas (Power BI, Tableau, etc.)
 * Proporciona endpoints y formatos de datos compatibles con estas herramientas.
 */

import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

export interface BIConnectorConfig {
  type: 'powerbi' | 'tableau' | 'generic';
  endpoint?: string;
  apiKey?: string;
  dataset?: string;
}

export interface BIDataExport {
  format: 'json' | 'csv' | 'odata';
  data: any[];
  metadata?: {
    columns: Array<{ name: string; type: string }>;
    lastUpdated: Date;
    recordCount: number;
  };
}

class BIConnectorService {
  /**
   * Exporta datos en formato compatible con Power BI
   */
  async exportForPowerBI(
    data: any[],
    options?: { format?: 'json' | 'odata'; includeMetadata?: boolean }
  ): Promise<BIDataExport> {
    try {
      const format = options?.format || 'json';
      const includeMetadata = options?.includeMetadata !== false;

      // Power BI puede consumir JSON directamente o OData
      const exportData: BIDataExport = {
        format,
        data: this.sanitizeDataForBI(data),
        ...(includeMetadata && {
          metadata: {
            columns: this.inferColumns(data),
            lastUpdated: new Date(),
            recordCount: data.length,
          },
        }),
      };

      logger.info(`Datos exportados para Power BI (${data.length} registros, formato: ${format})`);
      return exportData;
    } catch (error: any) {
      logger.error('Error exportando datos para Power BI', { error: error.message });
      throw new AppError('Error al exportar datos para Power BI', 500);
    }
  }

  /**
   * Exporta datos en formato compatible con Tableau
   */
  async exportForTableau(
    data: any[],
    options?: { format?: 'json' | 'csv'; includeMetadata?: boolean }
  ): Promise<BIDataExport> {
    try {
      const format = options?.format || 'json';
      const includeMetadata = options?.includeMetadata !== false;

      // Tableau puede consumir JSON o CSV
      const exportData: BIDataExport = {
        format,
        data: this.sanitizeDataForBI(data),
        ...(includeMetadata && {
          metadata: {
            columns: this.inferColumns(data),
            lastUpdated: new Date(),
            recordCount: data.length,
          },
        }),
      };

      logger.info(`Datos exportados para Tableau (${data.length} registros, formato: ${format})`);
      return exportData;
    } catch (error: any) {
      logger.error('Error exportando datos para Tableau', { error: error.message });
      throw new AppError('Error al exportar datos para Tableau', 500);
    }
  }

  /**
   * Exporta datos en formato genérico (JSON/CSV)
   */
  async exportGeneric(
    data: any[],
    format: 'json' | 'csv' = 'json',
    includeMetadata: boolean = true
  ): Promise<BIDataExport> {
    try {
      const exportData: BIDataExport = {
        format,
        data: this.sanitizeDataForBI(data),
        ...(includeMetadata && {
          metadata: {
            columns: this.inferColumns(data),
            lastUpdated: new Date(),
            recordCount: data.length,
          },
        }),
      };

      logger.info(`Datos exportados en formato genérico (${data.length} registros, formato: ${format})`);
      return exportData;
    } catch (error: any) {
      logger.error('Error exportando datos genéricos', { error: error.message });
      throw new AppError('Error al exportar datos', 500);
    }
  }

  /**
   * Sanitiza datos para consumo BI (elimina campos sensibles, normaliza formatos)
   */
  private sanitizeDataForBI(data: any[]): any[] {
    return data.map((item) => {
      const sanitized: any = { ...item };
      
      // Eliminar campos sensibles si existen
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      
      // Normalizar fechas a ISO string
      Object.keys(sanitized).forEach((key) => {
        if (sanitized[key] instanceof Date) {
          sanitized[key] = sanitized[key].toISOString();
        }
      });
      
      return sanitized;
    });
  }

  /**
   * Infiere tipos de columnas desde los datos
   */
  private inferColumns(data: any[]): Array<{ name: string; type: string }> {
    if (data.length === 0) return [];

    const sample = data[0];
    return Object.keys(sample).map((key) => {
      const value = sample[key];
      let type = 'string';

      if (typeof value === 'number') {
        type = Number.isInteger(value) ? 'integer' : 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
        type = 'date';
      }

      return { name: key, type };
    });
  }

  /**
   * Convierte datos a formato CSV
   */
  convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const columns = Object.keys(data[0]);
    const header = columns.join(',');
    const rows = data.map((item) =>
      columns
        .map((col) => {
          const value = item[col];
          // Escapar comillas y envolver en comillas si contiene comas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(',')
    );

    return [header, ...rows].join('\n');
  }

  /**
   * Genera URL de OData para Power BI
   */
  generateODataUrl(baseUrl: string, dataset: string, filters?: Record<string, any>): string {
    let url = `${baseUrl}/api/v1/bi/odata/${dataset}`;
    
    if (filters && Object.keys(filters).length > 0) {
      const queryParams = Object.entries(filters)
        .map(([key, value]) => `$filter=${key} eq '${value}'`)
        .join('&');
      url += `?${queryParams}`;
    }
    
    return url;
  }
}

// Exportar singleton
export const biConnectorService = new BIConnectorService();

