import cron from 'node-cron';
import { logger } from '../utils/logger';
import { laboratoryIntegrationService } from '../services/laboratoryIntegrationService';
import User from '../models/User';

/**
 * Jobs programados para importación automática de resultados de laboratorio
 */

let labImportJob: cron.ScheduledTask | null = null;

/**
 * Iniciar job de importación automática de resultados de laboratorio
 * Se ejecuta diariamente a las 2:00 AM
 */
export function startLabImportJobs(): void {
  if (labImportJob) {
    logger.warn('Job de importación de laboratorio ya está en ejecución');
    return;
  }

  // Ejecutar diariamente a las 2:00 AM
  labImportJob = cron.schedule('0 2 * * *', async () => {
    logger.info('Iniciando importación automática de resultados de laboratorio');

    try {
      // Obtener todos los pacientes activos
      const activePatients = await User.find({
        role: 'patient',
        isActive: true,
      }).select('_id');

      const patientIds = activePatients.map((p) => p._id.toString());

      if (patientIds.length === 0) {
        logger.info('No hay pacientes activos para importar resultados');
        return;
      }

      // Importar resultados para cada paciente
      const stats = await laboratoryIntegrationService.importResultsAutomatically(patientIds);

      logger.info('Importación automática de laboratorio completada', {
        total: stats.total,
        success: stats.success,
        errors: stats.errors,
      });
    } catch (error: any) {
      logger.error(`Error en importación automática de laboratorio: ${error.message}`, {
        error: error.message,
      });
    }
  });

  logger.info('Job de importación automática de laboratorio iniciado (diario a las 2:00 AM)');
}

/**
 * Detener job de importación automática
 */
export function stopLabImportJobs(): void {
  if (labImportJob) {
    labImportJob.stop();
    labImportJob = null;
    logger.info('Job de importación automática de laboratorio detenido');
  }
}

/**
 * Ejecutar importación manual (para testing o ejecución inmediata)
 */
export async function runLabImportManually(patientIds?: string[]): Promise<{
  total: number;
  success: number;
  errors: number;
}> {
  logger.info('Ejecutando importación manual de resultados de laboratorio');

  try {
    const stats = await laboratoryIntegrationService.importResultsAutomatically(patientIds);
    logger.info('Importación manual completada', stats);
    return stats;
  } catch (error: any) {
    logger.error(`Error en importación manual: ${error.message}`, {
      error: error.message,
    });
    throw error;
  }
}

