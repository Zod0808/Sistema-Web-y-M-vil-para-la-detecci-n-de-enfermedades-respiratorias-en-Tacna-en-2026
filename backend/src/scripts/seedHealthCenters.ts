/**
 * Seed script for HealthCenter directory (RF-012)
 * Carga un directorio de referencia de centros de salud de Tacna para
 * habilitar la búsqueda geoespacial de establecimientos cercanos.
 *
 * NOTA: Las coordenadas incluidas son aproximadas (referencia pública de
 * ubicación del establecimiento en la ciudad de Tacna) y se documentan solo
 * con fines de demostración/desarrollo. Antes de un uso en producción real,
 * deben verificarse y reemplazarse por coordenadas geocodificadas oficiales.
 */

import mongoose from 'mongoose';
import HealthCenterModel from '../models/HealthCenter';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.database.mongodb, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('✅ Conectado a MongoDB para seeding de centros de salud');
  } catch (error) {
    logger.error('❌ No se pudo conectar a MongoDB', { error });
    process.exit(1);
  }
};

const sampleHealthCenters = [
  {
    name: 'Hospital Hipólito Unanue de Tacna',
    type: 'hospital' as const,
    address: 'Av. Bolognesi 1801',
    district: 'Tacna',
    phone: '(052) 411000',
    hasEmergencyServices: true,
    hasRespiratoryCare: true,
    isActive: true,
    location: { type: 'Point' as const, coordinates: [-70.2444, -18.0114] as [number, number] },
  },
  {
    name: 'Hospital III Daniel Alcides Carrión (EsSalud)',
    type: 'hospital' as const,
    address: 'Av. Cusco s/n',
    district: 'Tacna',
    phone: '(052) 505000',
    hasEmergencyServices: true,
    hasRespiratoryCare: true,
    isActive: true,
    location: { type: 'Point' as const, coordinates: [-70.2472, -18.0089] as [number, number] },
  },
  {
    name: 'Hospital Militar Regional de Tacna',
    type: 'hospital' as const,
    address: 'Av. Municipal s/n',
    district: 'Tacna',
    hasEmergencyServices: true,
    hasRespiratoryCare: false,
    isActive: true,
    location: { type: 'Point' as const, coordinates: [-70.2510, -18.0060] as [number, number] },
  },
  {
    name: 'Centro de Salud Metropolitano Tacna',
    type: 'centro_salud' as const,
    address: 'Calle Zela 300',
    district: 'Tacna',
    hasEmergencyServices: false,
    hasRespiratoryCare: true,
    isActive: true,
    location: { type: 'Point' as const, coordinates: [-70.2500, -18.0130] as [number, number] },
  },
  {
    name: 'Centro de Salud Ciudad Nueva',
    type: 'centro_salud' as const,
    address: 'Sector Ciudad Nueva s/n',
    district: 'Ciudad Nueva',
    hasEmergencyServices: false,
    hasRespiratoryCare: false,
    isActive: true,
    location: { type: 'Point' as const, coordinates: [-70.2650, -18.0000] as [number, number] },
  },
  {
    name: 'Posta Médica Alto de la Alianza',
    type: 'posta_medica' as const,
    address: 'Av. Cusco s/n, Alto de la Alianza',
    district: 'Alto de la Alianza',
    hasEmergencyServices: false,
    hasRespiratoryCare: false,
    isActive: true,
    location: { type: 'Point' as const, coordinates: [-70.2380, -17.9950] as [number, number] },
  },
  {
    name: 'Clínica Promedic Tacna',
    type: 'clinica' as const,
    address: 'Av. Bolognesi 1155',
    district: 'Tacna',
    hasEmergencyServices: true,
    hasRespiratoryCare: true,
    isActive: true,
    location: { type: 'Point' as const, coordinates: [-70.2460, -18.0100] as [number, number] },
  },
];

const seedHealthCenters = async () => {
  await connectDatabase();

  try {
    logger.info('🌱 Iniciando seeding de centros de salud...');

    await HealthCenterModel.deleteMany({});
    const inserted = await HealthCenterModel.insertMany(sampleHealthCenters);

    logger.info(`✅ ${inserted.length} centros de salud cargados`);
  } catch (error) {
    logger.error('❌ Error generando el directorio de centros de salud', { error });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('🔌 Conexión a MongoDB cerrada');
  }
};

if (require.main === module) {
  seedHealthCenters()
    .then(() => {
      logger.info('🎉 Seeding de centros de salud completado');
      process.exit(0);
    })
    .catch(() => {
      logger.error('💥 Falló el seeding de centros de salud');
      process.exit(1);
    });
}

export default seedHealthCenters;
