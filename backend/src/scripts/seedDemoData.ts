/**
 * Seed de datos demo para dashboards, tendencias y explicabilidad.
 * Genera usuarios básicos y ~100 casos distribuidos en reportes de síntomas,
 * historiales médicos, análisis IA, citas y alertas.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import UserModel, { UserDocument } from '../models/User';
import MedicalHistoryModel from '../models/MedicalHistory';
import AppointmentModel from '../models/Appointment';
import AlertModel from '../models/Alert';
import AIAnalysisModel from '../models/AIAnalysis';

// Modelo en JS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SymptomReportModel = require('../models/SymptomReport');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ChatConversationModel = require('../models/ChatConversation');

dotenv.config();

const ensureEnv = (key: string, fallback: string) => {
  if (!process.env[key]) {
    process.env[key] = fallback;
  }
};

ensureEnv('NODE_ENV', 'development');
ensureEnv('PORT', '3001');
ensureEnv('MONGO_USERNAME', 'admin');
ensureEnv('MONGO_PASSWORD', 'change_this_password');
ensureEnv('MONGODB_URI', `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@localhost:27017/?authSource=admin`);
ensureEnv('MONGO_DB', 'respicare_dev');
ensureEnv('JWT_SECRET', 'demo-secret');
ensureEnv('JWT_REFRESH_SECRET', 'demo-refresh-secret');
ensureEnv('REDIS_URL', 'redis://localhost:6379');
ensureEnv('SMTP_HOST', 'smtp.example.com');
ensureEnv('SMTP_PORT', '587');
ensureEnv('SMTP_USER', 'demo@example.com');
ensureEnv('SMTP_PASS', 'demo-password');
ensureEnv('PUSH_PROVIDER', 'none');

const SEED_MARKER = '[DEMO]';

const DISTRICTS = [
  {
    name: 'Centro de Tacna',
    lat: -18.0056,
    lng: -70.2444,
  },
  {
    name: 'Gregorio Albarracín',
    lat: -18.0303,
    lng: -70.2489,
  },
  {
    name: 'Ciudad Nueva',
    lat: -18.0123,
    lng: -70.2305,
  },
  {
    name: 'Pocollay',
    lat: -17.995,
    lng: -70.21,
  },
  {
    name: 'Alto de la Alianza',
    lat: -17.97,
    lng: -70.24,
  },
  {
    name: 'Calana',
    lat: -17.96,
    lng: -70.195,
  },
  {
    name: 'Pachia',
    lat: -17.92,
    lng: -70.185,
  },
  {
    name: 'Boca del Río',
    lat: -18.04,
    lng: -70.28,
  },
];

const SYMPTOMS = [
  'Tos seca',
  'Tos con flema',
  'Dificultad respiratoria',
  'Fiebre',
  'Dolor de cabeza',
  'Fatiga',
  'Dolor en el pecho',
  'Congestión nasal',
  'Dolor muscular',
  'Dolor de garganta',
  'Sibilancias',
  'Sudoración nocturna',
  'Escalofríos',
  'Pérdida de apetito',
  'Náuseas',
];

const PREEXISTING_CONDITIONS = [
  'Asma crónica',
  'Hipertensión',
  'Diabetes tipo II',
  'EPOC',
  'Alergias respiratorias',
  'Obesidad',
  'Cardiopatía',
];

const DIAGNOSES = [
  'Asma',
  'Bronquitis aguda',
  'Neumonía',
  'COVID-19',
  'Gripe estacional',
  'Resfriado común',
  'EPOC',
  'Sinusitis',
  'Faringitis',
  'Alérgia respiratoria',
];

const DISEASE_TO_CATEGORY: Record<string, string> = {
  asma: 'respiratory',
  bronquitis: 'respiratory',
  neumonia: 'respiratory',
  covid19: 'respiratory',
  gripe: 'fever',
  epoc: 'respiratory',
  resfriado: 'respiratory',
  unknown: 'respiratory',
};

const SYMPTOM_CATEGORY_OPTIONS = ['respiratory', 'fever', 'pain', 'digestive', 'fatigue', 'neurological'] as const;
const SEVERITIES = ['mild', 'moderate', 'severe'] as const;
const OVERALL_SEVERITIES = ['low', 'medium', 'high'] as const;
const ALERT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const ALERT_STATUSES = ['pending', 'scheduled', 'sent', 'delivered', 'acknowledged', 'failed'] as const;
const ALERT_CATEGORIES = ['critical_symptom', 'medication_reminder', 'follow_up', 'doctor_notification', 'system'] as const;
const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'] as const;

const SEED_CONFIG = {
  symptomReports: parseInt(process.env.SEED_SYMPTOM_REPORTS || '900', 10),
  medicalHistories: parseInt(process.env.SEED_MEDICAL_HISTORIES || '450', 10),
  aiAnalysesPerHistoryMin: parseInt(process.env.SEED_AI_ANALYSES_MIN || '2', 10),
  aiAnalysesPerHistoryMax: parseInt(process.env.SEED_AI_ANALYSES_MAX || '5', 10),
  appointments: parseInt(process.env.SEED_APPOINTMENTS || '320', 10),
  alerts: parseInt(process.env.SEED_ALERTS || '220', 10),
  chatConversations: parseInt(process.env.SEED_CHAT_CONVERSATIONS || '160', 10),
  symptomsPerReport: {
    min: parseInt(process.env.SEED_SYMPTOMS_PER_REPORT_MIN || '2', 10),
    max: parseInt(process.env.SEED_SYMPTOMS_PER_REPORT_MAX || '6', 10),
  },
  medicalHistorySymptoms: {
    min: parseInt(process.env.SEED_HISTORY_SYMPTOMS_MIN || '3', 10),
    max: parseInt(process.env.SEED_HISTORY_SYMPTOMS_MAX || '7', 10),
  },
  chronicConditionProbability: parseFloat(process.env.SEED_CHRONIC_PROBABILITY || '0.35'),
  aiConfidenceRange: {
    min: parseInt(process.env.SEED_AI_CONFIDENCE_MIN || '50', 10),
    max: parseInt(process.env.SEED_AI_CONFIDENCE_MAX || '98', 10),
  },
};

const SEED_DATE_END = new Date(process.env.SEED_END_DATE || '2025-11-11T23:59:59Z');
const SEED_DATE_START = new Date(process.env.SEED_START_DATE || '2024-11-11T00:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

type DateBucket = { minDays: number; maxDays: number; proportion: number };

const BASE_BUCKETS: DateBucket[] = [
  { minDays: 0, maxDays: 7, proportion: 0.2 },
  { minDays: 7, maxDays: 30, proportion: 0.3 },
  { minDays: 30, maxDays: 90, proportion: 0.2 },
  { minDays: 90, maxDays: 365, proportion: 0.3 },
];

const DATE_BUCKET_CONFIGS: Record<'symptom' | 'medical' | 'appointment' | 'alert' | 'chat', DateBucket[]> = {
  symptom: BASE_BUCKETS,
  medical: BASE_BUCKETS,
  appointment: BASE_BUCKETS,
  alert: BASE_BUCKETS,
  chat: BASE_BUCKETS,
};

const DISTRICT_WEIGHTS: Array<{ district: typeof DISTRICTS[number]; weight: number }> = [
  { district: DISTRICTS[0], weight: 0.23 }, // Centro de Tacna
  { district: DISTRICTS[1], weight: 0.17 },
  { district: DISTRICTS[2], weight: 0.16 },
  { district: DISTRICTS[3], weight: 0.1 },
  { district: DISTRICTS[4], weight: 0.12 },
  { district: DISTRICTS[5], weight: 0.07 },
  { district: DISTRICTS[6], weight: 0.05 },
  { district: DISTRICTS[7], weight: 0.1 },
];

const SEVERITY_WEIGHTS: Record<typeof SEVERITIES[number], number> = {
  mild: 0.42,
  moderate: 0.38,
  severe: 0.2,
};

const OVERALL_SEVERITY_WEIGHTS: Record<typeof OVERALL_SEVERITIES[number], number> = {
  low: 0.45,
  medium: 0.35,
  high: 0.2,
};

const URGENCY_WEIGHTS: Record<typeof URGENCY_LEVELS[number], number> = {
  low: 0.35,
  medium: 0.4,
  high: 0.2,
  critical: 0.05,
};

const URGENCY_RANK: Record<typeof URGENCY_LEVELS[number], number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const REPORT_STATUS_WEIGHTS = [
  { value: 'pending' as const, weight: 0.22 },
  { value: 'reviewed' as const, weight: 0.33 },
  { value: 'urgent' as const, weight: 0.18 },
  { value: 'resolved' as const, weight: 0.27 },
];

const REPORT_SOURCE_OPTIONS = [
  { value: 'web' as const, weight: 0.45 },
  { value: 'mobile' as const, weight: 0.35 },
  { value: 'hospital' as const, weight: 0.15 },
  { value: 'phone' as const, weight: 0.05 },
];

const REPORT_REPORTED_BY_OPTIONS = [
  { value: 'patient' as const, weight: 0.6 },
  { value: 'family' as const, weight: 0.15 },
  { value: 'healthcare_worker' as const, weight: 0.2 },
  { value: 'anonymous' as const, weight: 0.05 },
];

const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'scheduled' as const, weight: 0.32 },
  { value: 'completed' as const, weight: 0.36 },
  { value: 'cancelled' as const, weight: 0.08 },
  { value: 'rescheduled' as const, weight: 0.14 },
  { value: 'no_show' as const, weight: 0.1 },
];

const ALERT_STATUS_OPTIONS = [
  { value: 'pending' as const, weight: 0.28 },
  { value: 'scheduled' as const, weight: 0.18 },
  { value: 'sent' as const, weight: 0.12 },
  { value: 'delivered' as const, weight: 0.18 },
  { value: 'acknowledged' as const, weight: 0.14 },
  { value: 'failed' as const, weight: 0.1 },
];

const ALERT_PRIORITY_OPTIONS = [
  { value: 'low' as const, weight: 0.25 },
  { value: 'medium' as const, weight: 0.38 },
  { value: 'high' as const, weight: 0.25 },
  { value: 'critical' as const, weight: 0.12 },
];

const ALERT_CATEGORY_OPTIONS = [
  { value: 'critical_symptom' as const, weight: 0.32 },
  { value: 'medication_reminder' as const, weight: 0.22 },
  { value: 'follow_up' as const, weight: 0.2 },
  { value: 'doctor_notification' as const, weight: 0.16 },
  { value: 'system' as const, weight: 0.1 },
];

const randomItem = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number, decimals = 2): number => {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
};

const randomDateWithinDays = (days: number): Date => {
  const offset = randomInt(0, days * DAY_MS);
  return new Date(clampDate(SEED_DATE_END.getTime() - offset));
};

const randomDuration = (): string => {
  const units = ['horas', 'días', 'semanas'];
  return `${randomInt(1, 7)} ${randomItem(units)}`;
};

const pickRandomSubset = <T>(source: readonly T[], min: number, max: number): T[] => {
  if (source.length === 0) return [];
  const upperBound = Math.max(min, Math.min(max, source.length));
  const count = randomInt(min, upperBound);
  const pool = [...source];
  const result: T[] = [];
  while (result.length < count && pool.length > 0) {
    const index = randomInt(0, pool.length - 1);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
};

const clampDate = (value: number) =>
  Math.min(SEED_DATE_END.getTime(), Math.max(SEED_DATE_START.getTime(), value));

const generateDateInBucket = (bucket: DateBucket): Date => {
  const maxRange = Math.min(bucket.maxDays * DAY_MS, SEED_DATE_END.getTime() - SEED_DATE_START.getTime());
  const minRange = Math.min(bucket.minDays * DAY_MS, maxRange);
  const randomOffset = randomInt(minRange, maxRange);
  const timestamp = clampDate(SEED_DATE_END.getTime() - randomOffset);
  return new Date(timestamp);
};

const shuffleArray = <T>(array: T[]): void => {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

const buildDateSeries = (total: number, buckets: DateBucket[]): Date[] => {
  const series: Date[] = [];
  let remaining = total;

  buckets.forEach((bucket, index) => {
    if (remaining <= 0) return;
    let count =
      index === buckets.length - 1
        ? remaining
        : Math.max(1, Math.min(remaining, Math.round(total * bucket.proportion)));
    if (count > remaining) count = remaining;

    for (let i = 0; i < count; i += 1) {
      series.push(generateDateInBucket(bucket));
    }
    remaining -= count;
  });

  while (series.length < total) {
    series.push(generateDateInBucket(buckets[buckets.length - 1]));
  }

  if (series.length > total) {
    series.length = total;
  }

  shuffleArray(series);
  return series;
};

const weightedChoice = <T>(entries: Array<{ weight: number; value: T }>): T => {
  const total = entries.reduce((acc, entry) => acc + entry.weight, 0);
  const threshold = Math.random() * total;
  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (threshold <= cumulative) {
      return entry.value;
    }
  }
  return entries[entries.length - 1].value;
};

const getObjectId = (value: unknown): string => {
  if (!value) {
    throw new Error('Documento sin identificador');
  }
  if (typeof value === 'string') return value;
  if (typeof (value as any).toString === 'function') {
    return (value as any).toString();
  }
  return String(value);
};

const generateName = (): string => {
  const firstNames = ['Juan', 'María', 'Luis', 'Ana', 'Carlos', 'Rosa', 'Miguel', 'Lucía', 'Pedro', 'Elena', 'Sofía', 'Diego', 'Valeria', 'Jorge', 'Camila'];
  const lastNames = ['Pérez', 'García', 'Mamani', 'Flores', 'Gutiérrez', 'Loayza', 'Torres', 'Quispe', 'Ruiz', 'Sánchez', 'Vargas', 'Acosta', 'Castro', 'Fernández'];
  return `${randomItem(firstNames)} ${randomItem(lastNames)}`;
};

const mapDiseaseToKey = (diagnosis: string): string => {
  const lower = diagnosis.toLowerCase();
  if (lower.includes('asma')) return 'asma';
  if (lower.includes('bronqu')) return 'bronquitis';
  if (lower.includes('neum')) return 'neumonia';
  if (lower.includes('cov')) return 'covid19';
  if (lower.includes('gripe')) return 'gripe';
  if (lower.includes('epoc')) return 'epoc';
  if (lower.includes('resfri')) return 'resfriado';
  return 'unknown';
};

const calculateOverallSeverity = (symptomSeverities: string[]): typeof OVERALL_SEVERITIES[number] => {
  const severeCount = symptomSeverities.filter((severity) => severity === 'severe').length;
  const moderateCount = symptomSeverities.filter((severity) => severity === 'moderate').length;

  if (severeCount >= 2 || (severeCount === 1 && moderateCount >= 2)) {
    return 'high';
  }
  if (severeCount === 1 || moderateCount >= 2) {
    return 'medium';
  }
  return 'low';
};

const chooseDistrict = () =>
  weightedChoice(
    DISTRICT_WEIGHTS.map((entry) => ({
      weight: entry.weight,
      value: entry.district,
    })),
  );

const chooseSeverity = () =>
  weightedChoice(
    (Object.entries(SEVERITY_WEIGHTS) as Array<[typeof SEVERITIES[number], number]>).map(([value, weight]) => ({
      value,
      weight,
    })),
  );

const chooseOverallSeverity = () =>
  weightedChoice(
    (Object.entries(OVERALL_SEVERITY_WEIGHTS) as Array<[typeof OVERALL_SEVERITIES[number], number]>).map(
      ([value, weight]) => ({
        value,
        weight,
      }),
    ),
  );

const chooseUrgency = () =>
  weightedChoice(
    (Object.entries(URGENCY_WEIGHTS) as Array<[typeof URGENCY_LEVELS[number], number]>).map(([value, weight]) => ({
      value,
      weight,
    })),
  );

const DISEASE_WEIGHTS: Array<{ disease: string; weight: number }> = [
  { disease: 'asma', weight: 0.2 },
  { disease: 'bronquitis', weight: 0.18 },
  { disease: 'neumonia', weight: 0.14 },
  { disease: 'covid19', weight: 0.12 },
  { disease: 'gripe', weight: 0.15 },
  { disease: 'epoc', weight: 0.08 },
  { disease: 'resfriado', weight: 0.08 },
  { disease: 'unknown', weight: 0.05 },
];

const DISEASE_NAME_BY_KEY: Record<string, string> = {
  asma: 'Asma',
  bronquitis: 'Bronquitis aguda',
  neumonia: 'Neumonía',
  covid19: 'COVID-19',
  gripe: 'Gripe estacional',
  epoc: 'EPOC',
  resfriado: 'Resfriado común',
  unknown: 'Síndrome respiratorio inespecífico',
};

const CHAT_ACTIVITY_TRIGGERS = [
  'al hacer ejercicio',
  'cuando subo escaleras',
  'por las noches',
  'al hablar mucho',
  'cuando estoy en lugares fríos',
  'al salir a la calle',
  'durante el trabajo',
];

const CHAT_GENERAL_TIPS = [
  'Mantén una buena hidratación y descanso',
  'Evita los cambios bruscos de temperatura',
  'Controla la fiebre con medicación indicada por un profesional',
  'Realiza ejercicios de respiración diafragmática con calma',
  'Ventila los ambientes y evita el humo del tabaco',
];

const CHAT_FOLLOWUP_PROMPTS = [
  '¿Deseas que programe una cita de control?',
  'Si quieres puedo derivarte con un especialista de guardia.',
  'Puedo agendarte una teleconsulta para confirmar el diagnóstico.',
  'Te puedo enviar recomendaciones personalizadas por correo.',
];

const CHAT_ADVICE_BY_DISEASE: Record<string, string[]> = {
  asma: [
    'Usa tu inhalador de rescate si lo tienes disponible y mantén un registro de los episodios.',
    'Evita el polvo y alérgenos, y procura realizar respiraciones profundas controladas.',
  ],
  bronquitis: [
    'Descansa, bebe líquidos tibios y evita el humo del tabaco.',
    'Considera un humidificador y consulta si persiste la mucosidad espesa.',
  ],
  neumonia: [
    'Controla tu temperatura y acude a emergencia si notas dificultad respiratoria intensa.',
    'Mantén reposo absoluto y sigue las indicaciones médicas previas si las tienes.',
  ],
  covid19: [
    'Aísla tus contactos cercanos y monitorea la saturación de oxígeno si es posible.',
    'Si la fiebre no baja o la respiración se complica, acude a un centro médico.',
  ],
  gripe: [
    'Hidrátate, toma analgésicos recetados y mantén reposo.',
    'Evita asistir a lugares concurridos hasta mejorar.',
  ],
  epoc: [
    'Usa tus medicamentos de mantenimiento y evita ambientes con humo.',
    'Realiza ejercicios de respiración y consulta si aparece coloración azulada en labios.',
  ],
  resfriado: [
    'Descansa bien, mantén la nariz limpia con suero fisiológico y controla los síntomas.',
  ],
  unknown: [
    'Te recomendaré medidas generales mientras confirmamos con un profesional.',
  ],
};

const SYNC_STATUS_OPTIONS = [
  { value: 'synced' as const, weight: 0.7 },
  { value: 'pending' as const, weight: 0.2 },
  { value: 'error' as const, weight: 0.1 },
];

const chooseDiseaseKey = () =>
  weightedChoice(
    DISEASE_WEIGHTS.map((entry) => ({
      value: entry.disease,
      weight: entry.weight,
    })),
  );

async function connectDatabase(): Promise<void> {
  const dbName = process.env.MONGO_DB || 'respicare_dev';
  const candidates = [
    process.env.MONGODB_URI,
    `mongodb://${process.env.MONGO_USERNAME || 'admin'}:${process.env.MONGO_PASSWORD || 'change_this_password'}@localhost:27017/${dbName}?authSource=admin`,
    `mongodb://${process.env.MONGO_USERNAME || 'admin'}:${process.env.MONGO_PASSWORD || 'change_this_password'}@127.0.0.1:27017/${dbName}?authSource=admin`,
    `mongodb://localhost:27017/${dbName}`,
  ].filter((uri): uri is string => Boolean(uri));

  let lastError: unknown;

  for (const uri of candidates) {
    try {
      await mongoose.connect(uri, {
        maxPoolSize: 10,
        dbName,
      });
      logger.info('✅ Conectado a MongoDB', { uri: uri.replace(/\/\/[^@]+@/, '//***@') });
      return;
    } catch (error) {
      lastError = error;
      logger.warn('No se pudo conectar con la cadena proporcionada', {
        uri: uri.replace(/\/\/[^@]+@/, '//***@'),
        error,
      });
      await mongoose.disconnect().catch(() => undefined);
    }
  }

  throw lastError ?? new Error('No fue posible conectarse a MongoDB con las cadenas de conexión probadas');
}

async function cleanupPreviousDemoData(): Promise<void> {
  logger.info('🧹 Limpiando datos demo anteriores');

  const previousHistories = await MedicalHistoryModel.find({ description: { $regex: SEED_MARKER } }, '_id').lean();
  if (previousHistories.length > 0) {
    const historyIds = previousHistories.map((item) => item._id.toString());
    await AIAnalysisModel.deleteMany({ medicalHistoryId: { $in: historyIds } });
  }

  await Promise.all([
    MedicalHistoryModel.deleteMany({ description: { $regex: SEED_MARKER } }),
    SymptomReportModel.deleteMany({ notes: { $regex: SEED_MARKER } }),
    AppointmentModel.deleteMany({ 'metadata.seedTag': SEED_MARKER }),
    AlertModel.deleteMany({ 'metadata.seedTag': SEED_MARKER }),
    ChatConversationModel.deleteMany({ sessionId: { $regex: '^demo-seed-' } }),
  ]);
}

async function ensureUsers(): Promise<{
  doctors: UserDocument[];
  patients: UserDocument[];
  admin: UserDocument;
}> {
  const doctorEmails = [
    'doctor.demo1@respicare.com',
    'doctor.demo2@respicare.com',
    'doctor.demo3@respicare.com',
    'doctor.demo4@respicare.com',
  ];

  const patientEmails = Array.from({ length: 20 }).map((_, index) => `paciente.demo${index + 1}@respicare.com`);

  const adminEmail = 'admin.demo@respicare.com';

  const ensureUser = async (email: string, role: 'doctor' | 'patient' | 'admin'): Promise<UserDocument> => {
    let user = await UserModel.findOne({ email });
    if (!user) {
      const name = generateName();
      const password = await bcrypt.hash('demo1234', 10);
      user = new UserModel({
        name,
        email,
        password,
        role,
        isActive: true,
        lastLogin: randomDateWithinDays(10),
      });
      await user.save();
    }
    return user;
  };

  const doctors = await Promise.all(doctorEmails.map((email) => ensureUser(email, 'doctor')));
  const patients = await Promise.all(patientEmails.map((email) => ensureUser(email, 'patient')));
  const admin = await ensureUser(adminEmail, 'admin');

  return { doctors, patients, admin };
}

type DoctorPatientContext = {
  doctors: UserDocument[];
  patients: UserDocument[];
};

function buildSymptomList(minCount: number, maxCount: number): Array<{ name: string; severity: string; duration: string; description?: string }> {
  const symptomCount = randomInt(minCount, maxCount);
  const selected = new Set<string>();
  const symptoms = [];

  while (symptoms.length < symptomCount) {
    const symptomName = randomItem(SYMPTOMS);
    if (selected.has(symptomName)) continue;
    selected.add(symptomName);
    const severity = chooseSeverity();
    symptoms.push({
      name: symptomName,
      severity,
      duration: randomDuration(),
      description: `Síntoma ${severity} reportado por el paciente`,
    });
  }

  return symptoms;
}

async function seedSymptomReports(count: number, context: DoctorPatientContext): Promise<number> {
  const reports: any[] = [];
  const dateSeries = buildDateSeries(count, DATE_BUCKET_CONFIGS.symptom);

  for (let index = 0; index < count; index += 1) {
    const patient = randomItem(context.patients);
    const doctor = randomItem(context.doctors);
    const district = chooseDistrict();
    const createdAt = dateSeries[index];
    const symptomList = buildSymptomList(SEED_CONFIG.symptomsPerReport.min, SEED_CONFIG.symptomsPerReport.max);
    const symptomSeverities = symptomList.map((item) => item.severity);
    let overallSeverity = calculateOverallSeverity(symptomSeverities);
    if (Math.random() < 0.25) {
      overallSeverity = chooseOverallSeverity();
    }

    const diagnosisKey = chooseDiseaseKey();
    const category = DISEASE_TO_CATEGORY[diagnosisKey] ?? randomItem(SYMPTOM_CATEGORY_OPTIONS);
    const hasPreexistingConditions = Math.random() < SEED_CONFIG.chronicConditionProbability;
    const status = weightedChoice(REPORT_STATUS_WEIGHTS);
    const reportedBy = weightedChoice(REPORT_REPORTED_BY_OPTIONS);
    const source = weightedChoice(REPORT_SOURCE_OPTIONS);

    reports.push({
      patientId: getObjectId(patient._id),
      location: {
        district: district.name,
        coordinates: {
          latitude: district.lat + randomFloat(-0.01, 0.01, 4),
          longitude: district.lng + randomFloat(-0.01, 0.01, 4),
        },
        address: `${district.name}, Tacna`,
      },
      symptoms: symptomList,
      category,
      overallSeverity,
      suspectedDisease: diagnosisKey,
      temperature: randomFloat(36, 40, 1),
      oxygenSaturation: randomInt(88, 99),
      hasPreexistingConditions,
      preexistingConditions: hasPreexistingConditions ? pickRandomSubset(PREEXISTING_CONDITIONS, 1, 3) : [],
      contactInfo: {
        phone: `+5196${randomInt(1000000, 9999999)}`,
        email: patient.email,
      },
      status,
      medicalAttentionRequired:
        overallSeverity === 'high' || (overallSeverity === 'medium' && Math.random() < 0.25),
      medicalAttentionReceived: overallSeverity === 'high' ? Math.random() < 0.7 : Math.random() < 0.55,
      notes: `Caso generado automáticamente ${SEED_MARKER}`,
      reportedBy,
      source,
      isAnonymous: reportedBy === 'anonymous',
      doctorId: getObjectId(doctor._id),
      createdAt,
      updatedAt: createdAt,
      seedMarker: SEED_MARKER,
    });
  }

  if (reports.length === 0) return 0;
  await SymptomReportModel.insertMany(reports, { ordered: false });
  return reports.length;
}

async function seedMedicalHistories(count: number, context: DoctorPatientContext): Promise<string[]> {
  const histories: any[] = [];

  const dateSeries = buildDateSeries(count, DATE_BUCKET_CONFIGS.medical);

  for (let index = 0; index < count; index += 1) {
    const patient = randomItem(context.patients);
    const doctor = randomItem(context.doctors);
    const district = chooseDistrict();
    const createdAt = dateSeries[index];

    const symptoms = buildSymptomList(
      SEED_CONFIG.medicalHistorySymptoms.min,
      SEED_CONFIG.medicalHistorySymptoms.max,
    );
    const diagnosisKey = chooseDiseaseKey();
    const diagnosis = DISEASE_NAME_BY_KEY[diagnosisKey] ?? randomItem(DIAGNOSES);
    const syncStatus = weightedChoice(SYNC_STATUS_OPTIONS);

    histories.push({
      patientId: getObjectId(patient._id),
      doctorId: getObjectId(doctor._id),
      patientName: patient.name ?? generateName(),
      age: randomInt(5, 85),
      diagnosis,
      symptoms: symptoms.map((item) => ({
        name: item.name,
        severity: item.severity,
        duration: item.duration,
        description: item.description,
      })),
      description: `Registro clínico generado para demo ${SEED_MARKER}`,
      date: createdAt,
      location: {
        latitude: district.lat + randomFloat(-0.02, 0.02, 4),
        longitude: district.lng + randomFloat(-0.02, 0.02, 4),
        address: `${district.name}, Tacna`,
      },
      images: [],
      audioNotes: undefined,
      isOffline: Math.random() < 0.1,
      syncStatus,
      createdAt,
      updatedAt: createdAt,
      metadata: {
        category: DISEASE_TO_CATEGORY[diagnosisKey] ?? randomItem(SYMPTOM_CATEGORY_OPTIONS),
        district: district.name,
        seedTag: SEED_MARKER,
      },
    });
  }

  if (histories.length === 0) return [];
  const inserted = await MedicalHistoryModel.insertMany(histories, { ordered: false });
  return inserted.map((doc) => getObjectId(doc._id));
}

async function seedAIAnalyses(medicalHistoryIds: string[]): Promise<number> {
  if (!medicalHistoryIds.length) return 0;

  const histories = await MedicalHistoryModel.find({ _id: { $in: medicalHistoryIds } })
    .select(['_id', 'diagnosis', 'symptoms', 'date'])
    .lean();

  const analyses: any[] = [];

  histories.forEach((history) => {
    const analysisCount = randomInt(SEED_CONFIG.aiAnalysesPerHistoryMin, SEED_CONFIG.aiAnalysesPerHistoryMax);
    for (let index = 0; index < analysisCount; index += 1) {
      const timestamp = new Date((history.date as Date).getTime() + randomInt(0, 4) * 60 * 60 * 1000);
      const urgency = chooseUrgency();
      const confidence =
        urgency === 'critical'
          ? randomInt(85, SEED_CONFIG.aiConfidenceRange.max)
          : urgency === 'high'
            ? randomInt(70, SEED_CONFIG.aiConfidenceRange.max)
            : randomInt(SEED_CONFIG.aiConfidenceRange.min, SEED_CONFIG.aiConfidenceRange.max - 10);
      analyses.push({
        medicalHistoryId: history._id.toString(),
        symptoms: (history.symptoms || []).map((symptom: any) => ({
          name: symptom.name,
          severity: symptom.severity,
          duration: symptom.duration,
          description: symptom.description,
        })),
        possibleDiagnoses: [
          {
            condition: history.diagnosis,
            probability: randomInt(60, 95),
            recommendations: [
              'Seguimiento médico en las próximas 48h',
              'Mantener hidratación adecuada',
              'Registrar síntomas en la aplicación',
            ],
          },
          {
            condition: randomItem(DIAGNOSES),
            probability: randomInt(20, 55),
            recommendations: ['Monitoreo domiciliario', 'Consultar si empeoran síntomas'],
          },
        ],
        urgency,
        confidence,
        timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        seedTag: SEED_MARKER,
      });
    }
  });

  if (!analyses.length) return 0;
  await AIAnalysisModel.insertMany(analyses, { ordered: false });
  return analyses.length;
}

async function seedAppointments(count: number, context: DoctorPatientContext): Promise<number> {
  const appointments: any[] = [];
  const dateSeries = buildDateSeries(count, DATE_BUCKET_CONFIGS.appointment);

  for (let index = 0; index < count; index += 1) {
    const patient = randomItem(context.patients);
    const doctor = randomItem(context.doctors);
    const district = chooseDistrict();
    let scheduledAt = dateSeries[index];
    const status = weightedChoice(APPOINTMENT_STATUS_OPTIONS);

    if (status === 'scheduled' || status === 'rescheduled') {
      if (Math.random() < 0.4) {
        const futureOffsetDays = randomInt(1, 21);
        scheduledAt = new Date(Date.now() + futureOffsetDays * 24 * 60 * 60 * 1000);
      }
    }

    appointments.push({
      patientId: getObjectId(patient._id),
      doctorId: getObjectId(doctor._id),
      createdBy: getObjectId(doctor._id),
      scheduledAt,
      durationMinutes: randomItem([30, 45, 60]),
      status,
      reason: randomItem([
        'Control respiratorio',
        'Seguimiento post tratamiento',
        'Evaluación de síntomas persistentes',
        'Consulta preventiva',
      ]),
      notes: status === 'completed' ? `Cita completada sin complicaciones ${SEED_MARKER}` : undefined,
      location: {
        type: randomItem(['in_person', 'virtual'] as const),
        description: 'Consultorio Central',
        meetingLink: 'https://meet.respicare/demo',
        address: 'Av. San Martín 123, Tacna',
      },
      reminderMinutesBefore: randomItem([30, 60, 120]),
      tags: ['demo', 'seguimiento'],
      metadata: {
        seedTag: SEED_MARKER,
        generatedAt: new Date(),
        district: district.name,
      },
      createdAt: scheduledAt,
      updatedAt: scheduledAt,
    });
  }

  if (!appointments.length) return 0;
  await AppointmentModel.insertMany(appointments, { ordered: false });
  return appointments.length;
}

async function seedAlerts(count: number, context: DoctorPatientContext): Promise<number> {
  const alerts: any[] = [];

  const dateSeries = buildDateSeries(count, DATE_BUCKET_CONFIGS.alert);

  for (let index = 0; index < count; index += 1) {
    const patient = randomItem(context.patients);
    const doctor = randomItem(context.doctors);
    const district = chooseDistrict();
    const createdAt = dateSeries[index];
    const status = weightedChoice(ALERT_STATUS_OPTIONS);
    const priority = weightedChoice(ALERT_PRIORITY_OPTIONS);
    const category = weightedChoice(ALERT_CATEGORY_OPTIONS);

    alerts.push({
      userId: getObjectId(patient._id),
      patientId: getObjectId(patient._id),
      doctorId: getObjectId(doctor._id),
      title: `Alerta de seguimiento ${randomItem(['crítico', 'prioritario', 'programado'])}`,
      message: 'Revise los síntomas reportados y confirme atención médica si es necesario.',
      category,
      channels: ['push', 'in_app'],
      priority,
      status,
      trigger: {
        source: randomItem(['symptom_analysis', 'manual', 'doctor_portal'] as const),
        referenceId: `ref-${randomInt(1000, 9999)}`,
        metadata: { severity: priority, doctor: doctor.name },
      },
      metadata: {
        seedTag: SEED_MARKER,
        generatedAt: new Date(),
        district: district.name,
      },
      tags: ['demo', 'seguimiento'],
      scheduledAt: createdAt,
      dispatchedAt: status === 'delivered' ? new Date(createdAt.getTime() + 15 * 60 * 1000) : undefined,
      acknowledgedAt: status === 'acknowledged' ? new Date(createdAt.getTime() + 30 * 60 * 1000) : undefined,
      expiresAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      retries: status === 'failed' ? randomInt(1, 3) : 0,
      lastError: status === 'failed' ? 'Simulación de error de canal' : undefined,
      createdAt,
      updatedAt: createdAt,
    });
  }

  if (!alerts.length) return 0;
  await AlertModel.insertMany(alerts, { ordered: false });
  return alerts.length;
}

async function seedChatConversations(count: number, context: DoctorPatientContext): Promise<number> {
  if (!count) return 0;

  const conversations: any[] = [];
  const dateSeries = buildDateSeries(count, DATE_BUCKET_CONFIGS.chat);

  for (let index = 0; index < count; index += 1) {
    const patient = randomItem(context.patients);
    const patientName = patient.name ?? generateName();
    const patientFirstName = patientName.split(' ')[0];
    const district = chooseDistrict();
    const startedAt = dateSeries[index];
    const diseaseKey = chooseDiseaseKey();
    const diseaseName = DISEASE_NAME_BY_KEY[diseaseKey] ?? randomItem(DIAGNOSES);
    const urgency = chooseUrgency();
    const symptoms = pickRandomSubset(SYMPTOMS, 2, 4);
    if (symptoms.length === 0) {
      symptoms.push(randomItem(SYMPTOMS));
    }
    const durationDays = randomInt(2, 14);
    const activity = randomItem(CHAT_ACTIVITY_TRIGGERS);
    const primaryConfidence = randomFloat(0.72, 0.95, 2);
    const secondaryConfidence = Number(
      Math.max(0.6, primaryConfidence - randomFloat(0.02, 0.08, 2)).toFixed(2),
    );
    const diseaseAdvicePool = CHAT_ADVICE_BY_DISEASE[diseaseKey] ?? CHAT_ADVICE_BY_DISEASE.unknown;
    const advice = randomItem([...diseaseAdvicePool, randomItem(CHAT_GENERAL_TIPS)]);
    const followUpPrompt = randomItem(CHAT_FOLLOWUP_PROMPTS);

    const sessionId = `demo-seed-${startedAt.getTime()}-${index}-${randomInt(1000, 9999)}`;

    const messages: any[] = [];
    const confidences: number[] = [];
    const detectedDiseases = new Set<string>();
    const detectedSymptoms = new Set<string>();
    let highestUrgency = 'low' as typeof URGENCY_LEVELS[number];
    let highestUrgencyRank = URGENCY_RANK.low;
    let messageTime = new Date(startedAt);

    const pushMessage = (
      role: 'user' | 'bot',
      content: string,
      metadata?: Record<string, any>,
    ) => {
      const timestamp = new Date(messageTime);
      const meta = metadata ? { ...metadata } : undefined;

      if (meta?.confidence) {
        confidences.push(Number(meta.confidence));
      }
      if (meta?.detectedDiseases) {
        (meta.detectedDiseases as string[]).forEach((item) => detectedDiseases.add(item));
      }
      if (meta?.detectedSymptoms) {
        (meta.detectedSymptoms as string[]).forEach((item) => detectedSymptoms.add(item));
      }
      if (meta?.urgencyLevel && URGENCY_RANK[meta.urgencyLevel]) {
        const rank = URGENCY_RANK[meta.urgencyLevel as typeof URGENCY_LEVELS[number]];
        if (rank > highestUrgencyRank) {
          highestUrgencyRank = rank;
          highestUrgency = meta.urgencyLevel as typeof URGENCY_LEVELS[number];
        }
      }

      messages.push({
        role,
        content,
        timestamp,
        metadata: meta,
      });

      messageTime = new Date(messageTime.getTime() + randomInt(2, 6) * 60 * 1000);
    };

    pushMessage(
      'user',
      `Hola, tengo ${symptoms[0].toLowerCase()} y ${symptoms[1]?.toLowerCase() ?? symptoms[0].toLowerCase()} desde hace ${durationDays} días. ¿Podrían orientarme?`,
      {
        detectedSymptoms: symptoms,
        questionType: 'symptom_report',
      },
    );

    pushMessage(
      'bot',
      `Hola ${patientFirstName}, gracias por la información. Con esos síntomas podríamos estar ante ${diseaseName}. Voy a darte algunas recomendaciones.`,
      {
        detectedDiseases: [diseaseName],
        detectedSymptoms: symptoms.slice(0, 2),
        confidence: primaryConfidence,
        urgencyLevel: urgency,
      },
    );

    pushMessage(
      'user',
      `Además noto ${randomItem(symptoms).toLowerCase()} ${activity}.`,
      {
        detectedSymptoms: [randomItem(symptoms)],
        questionType: 'follow_up',
      },
    );

    pushMessage(
      'bot',
      `${advice} ${followUpPrompt}`,
      {
        detectedDiseases: [diseaseName],
        confidence: secondaryConfidence,
        urgencyLevel: urgency,
      },
    );

    pushMessage('user', 'Gracias, seguiré tus indicaciones.', { questionType: 'acknowledgement' });

    const lastActivityAt = messages[messages.length - 1]?.timestamp ?? startedAt;
    const averageConfidence =
      confidences.length > 0
        ? Number(
            (
              confidences.reduce((acc, value) => acc + value, 0) / Math.max(confidences.length, 1)
            ).toFixed(2),
          )
        : 0;

    conversations.push({
      sessionId,
      userId: getObjectId(patient._id),
      messages,
      userInfo: {
        name: patientName,
        email: patient.email,
      },
      location: {
        district: district.name,
        city: 'Tacna',
        country: 'Perú',
      },
      metadata: {
        userAgent: 'RespiCare-Demo/1.0',
        ipAddress: `192.168.${randomInt(0, 255)}.${randomInt(0, 255)}`,
        language: 'es',
        source: Math.random() < 0.35 ? 'mobile' : 'web',
      },
      summary: {
        totalMessages: messages.length,
        userMessages: messages.filter((msg) => msg.role === 'user').length,
        botMessages: messages.filter((msg) => msg.role === 'bot').length,
        detectedDiseases: Array.from(detectedDiseases),
        detectedSymptoms: Array.from(detectedSymptoms),
        highestUrgency,
        averageConfidence,
      },
      status: 'completed',
      requiresFollowUp: highestUrgencyRank >= URGENCY_RANK.high,
      followUpNotes:
        highestUrgencyRank >= URGENCY_RANK.high
          ? 'Marcado automáticamente para seguimiento por urgencia elevada.'
          : undefined,
      startedAt,
      lastActivityAt,
      completedAt: lastActivityAt,
      createdAt: startedAt,
      updatedAt: lastActivityAt,
    });
  }

  if (!conversations.length) return 0;
  await ChatConversationModel.insertMany(conversations, { ordered: false });
  return conversations.length;
}

async function seedDemoData(): Promise<void> {
  logger.info('🌱 Iniciando seed demo');
  await connectDatabase();
  await cleanupPreviousDemoData();

  const { doctors, patients } = await ensureUsers();
  logger.info(`👩‍⚕️ Doctores disponibles: ${doctors.length}`);
  logger.info(`🧑 Pacientes disponibles: ${patients.length}`);
  logger.info('⚙️ Configuración de seed', {
    symptomReports: SEED_CONFIG.symptomReports,
    medicalHistories: SEED_CONFIG.medicalHistories,
    aiAnalysesPerHistory: [SEED_CONFIG.aiAnalysesPerHistoryMin, SEED_CONFIG.aiAnalysesPerHistoryMax],
    appointments: SEED_CONFIG.appointments,
    alerts: SEED_CONFIG.alerts,
    chatConversations: SEED_CONFIG.chatConversations,
    dateRange: {
      start: SEED_DATE_START.toISOString(),
      end: SEED_DATE_END.toISOString(),
      buckets: BASE_BUCKETS,
    },
  });

  const context: DoctorPatientContext = { doctors, patients };

  const [reportsCreated, historyIds] = await Promise.all([
    seedSymptomReports(SEED_CONFIG.symptomReports, context),
    seedMedicalHistories(SEED_CONFIG.medicalHistories, context),
  ]);

  const [analysesCreated, appointmentsCreated, alertsCreated, conversationsCreated] = await Promise.all([
    seedAIAnalyses(historyIds),
    seedAppointments(SEED_CONFIG.appointments, context),
    seedAlerts(SEED_CONFIG.alerts, context),
    seedChatConversations(SEED_CONFIG.chatConversations, context),
  ]);

  logger.info('✅ Datos demo generados correctamente', {
    symptomReports: reportsCreated,
    medicalHistories: historyIds.length,
    aiAnalyses: analysesCreated,
    appointments: appointmentsCreated,
    alerts: alertsCreated,
    chatConversations: conversationsCreated,
  });
}

if (require.main === module) {
  seedDemoData()
    .then(() => {
      logger.info('🎉 Seed demo completado');
      return mongoose.connection.close();
    })
    .then(() => {
      logger.info('🔌 Conexión cerrada');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Error ejecutando seed demo', { error });
      mongoose.connection.close().finally(() => process.exit(1));
    });
}

export default seedDemoData;


