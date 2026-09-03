/**
 * Seed script para el módulo educativo (RF-011)
 * Genera artículos de ejemplo, cubriendo contenido general y por condición
 */

import mongoose from 'mongoose';
import EducationalContentModel from '../models/EducationalContent';
import { config } from '../config/config';
import { logger } from '../utils/logger';

const SEED_TAG = 'educational-content';

const connectDatabase = async () => {
  try {
    await mongoose.connect(config.database.mongodb, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('✅ Conectado a MongoDB para seeding de contenido educativo');
  } catch (error) {
    logger.error('❌ No se pudo conectar a MongoDB', { error });
    process.exit(1);
  }
};

const SAMPLE_CONTENT = [
  {
    title: '¿Qué es una enfermedad respiratoria y cómo prevenirla?',
    summary: 'Guía general sobre hábitos de prevención aplicables a cualquier persona.',
    content:
      'Las enfermedades respiratorias afectan las vías aéreas y los pulmones. Medidas generales de prevención: lavado frecuente de manos, ventilación de espacios cerrados, evitar el humo de tabaco y mantener el esquema de vacunación al día.',
    category: 'general' as const,
    targetConditions: [],
    tags: ['prevención', 'general'],
  },
  {
    title: 'Vivir con asma: control y señales de alarma',
    summary: 'Recomendaciones para pacientes diagnosticados con asma.',
    content:
      'El asma es una enfermedad crónica de las vías respiratorias. Es importante identificar los desencadenantes (polvo, humo, ejercicio), usar el inhalador de mantenimiento según indicación médica y acudir a urgencias si hay dificultad para hablar o labios morados.',
    category: 'asma' as const,
    targetConditions: ['asma', 'sibilancias', 'dificultad respiratoria'],
    tags: ['asma', 'crónico'],
  },
  {
    title: 'EPOC: cómo mantener una buena calidad de vida',
    summary: 'Consejos prácticos para pacientes con enfermedad pulmonar obstructiva crónica.',
    content:
      'La EPOC suele afectar a personas mayores de 40 años con antecedentes de tabaquismo. Se recomienda evitar el humo de tabaco, realizar ejercicios de rehabilitación pulmonar y vacunarse contra influenza y neumococo.',
    category: 'epoc' as const,
    targetConditions: ['epoc', 'tos crónica', 'disnea'],
    targetAgeRange: { min: 40 },
    tags: ['epoc', 'crónico'],
  },
  {
    title: 'COVID-19: prevención y cuándo buscar atención médica',
    summary: 'Información actualizada sobre síntomas y medidas preventivas del COVID-19.',
    content:
      'Los síntomas más comunes de COVID-19 incluyen fiebre, tos seca y fatiga. La vacunación, el uso de mascarilla en espacios concurridos y la ventilación reducen el riesgo de contagio. Buscar atención inmediata ante dificultad respiratoria o saturación baja.',
    category: 'covid19' as const,
    targetConditions: ['covid-19', 'fiebre', 'tos'],
    tags: ['covid19', 'prevención'],
  },
  {
    title: 'Influenza estacional: diferencias con el resfriado común',
    summary: 'Cómo identificar la gripe estacional y cuándo consultar a un médico.',
    content:
      'La influenza se presenta con fiebre alta de inicio súbito, dolores musculares y malestar general, a diferencia del resfriado común. El reposo, la hidratación y la vacunación anual son las principales medidas preventivas.',
    category: 'influenza' as const,
    targetConditions: ['influenza', 'gripe', 'fiebre'],
    tags: ['influenza', 'estacional'],
  },
  {
    title: 'Neumonía en niños y adultos mayores: signos de alarma',
    summary: 'Población de riesgo y señales que requieren atención médica urgente.',
    content:
      'La neumonía es una infección que inflama los sacos de aire de los pulmones. Los niños menores de 5 años y los adultos mayores de 65 son población de riesgo. Buscar atención urgente ante respiración acelerada, fiebre persistente o coloración azulada de labios.',
    category: 'neumonia' as const,
    targetConditions: ['neumonia', 'tos con flema', 'fiebre'],
    tags: ['neumonia', 'urgencia'],
  },
];

const seedEducationalContent = async () => {
  await connectDatabase();

  try {
    logger.info('🌱 Iniciando seeding de contenido educativo...');

    const removed = await EducationalContentModel.deleteMany({ 'tags': SEED_TAG });
    if (removed.deletedCount) {
      logger.info(`🧹 Eliminado contenido previo del seed (${removed.deletedCount})`);
    }

    const inserted = await EducationalContentModel.insertMany(
      SAMPLE_CONTENT.map((item) => ({
        ...item,
        tags: [...(item.tags ?? []), SEED_TAG],
      }))
    );

    logger.info(`✅ ${inserted.length} artículos educativos generados`);
  } catch (error) {
    logger.error('❌ Error generando contenido educativo', { error });
    throw error;
  } finally {
    await mongoose.connection.close();
    logger.info('🔌 Conexión a MongoDB cerrada');
  }
};

if (require.main === module) {
  seedEducationalContent()
    .then(() => {
      logger.info('🎉 Seeding de contenido educativo completado');
      process.exit(0);
    })
    .catch(() => {
      logger.error('💥 Falló el seeding de contenido educativo');
      process.exit(1);
    });
}

export default seedEducationalContent;
