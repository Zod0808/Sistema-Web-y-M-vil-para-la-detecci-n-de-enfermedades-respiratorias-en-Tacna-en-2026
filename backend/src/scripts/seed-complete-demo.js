/**
 * Complete Demo Data Seed Script
 * Genera todos los datos necesarios para probar dashboards web y mobile
 * - Usuarios (pacientes, doctores, admin)
 * - Reportes de síntomas (para dashboards web)
 * - Historias médicas (1-3 por paciente, enlazadas)
 * - Datos de wearables (sincronizados con pacientes)
 * - Conversaciones de chat
 * - Citas médicas
 * - Alertas
 * - Análisis de IA (enlazados a historias médicas)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/respicare_dev';

// Load models
const SymptomReportModel = require('../models/SymptomReport');
const ChatConversationModel = require('../models/ChatConversation');
let UserModel, MedicalHistoryModel, WearableDataModel, AppointmentModel, AlertModel, AIAnalysisModel;

try {
  UserModel = require('../models/User');
} catch (error) {
  console.warn('User model not available, will create inline schema');
}

try {
  MedicalHistoryModel = require('../models/MedicalHistory');
} catch (error) {
  console.warn('MedicalHistory model not available');
}

try {
  WearableDataModel = require('../models/WearableData');
} catch (error) {
  console.warn('WearableData model not available');
}

try {
  AppointmentModel = require('../models/Appointment');
} catch (error) {
  console.warn('Appointment model not available');
}

try {
  AlertModel = require('../models/Alert');
} catch (error) {
  console.warn('Alert model not available');
}

try {
  AIAnalysisModel = require('../models/AIAnalysis');
} catch (error) {
  console.warn('AIAnalysis model not available');
}

// Constants
const DISTRICTS = [
  { name: 'Centro de Tacna', lat: -18.0056, lng: -70.2444 },
  { name: 'Gregorio Albarracín', lat: -18.0303, lng: -70.2489 },
  { name: 'Ciudad Nueva', lat: -18.0125, lng: -70.2467 },
  { name: 'Alto de la Alianza', lat: -18.0156, lng: -70.2500 },
  { name: 'Boca del Río', lat: -18.0200, lng: -70.2600 },
  { name: 'Pocollay', lat: -18.0083, lng: -70.2522 },
  { name: 'Calana', lat: -18.0100, lng: -70.2400 },
  { name: 'Pachia', lat: -18.0300, lng: -70.2300 },
];

const SYMPTOMS = [
  'tos', 'fiebre', 'dificultad_respiratoria', 'sibilancias', 'fatiga',
  'dolor_pecho', 'congestion_nasal', 'dolor_garganta', 'escalofrios',
  'dolor_cabeza', 'nauseas', 'vomitos', 'diarrea', 'perdida_apetito'
];

// Para suspectedDisease (enum del modelo)
const SUSPECTED_DISEASES = [
  'asma', 'neumonia', 'bronquitis', 'covid19', 'gripe', 'epoc', 'resfriado', 'unknown'
];

// Para diagnosis (texto libre en historias médicas)
const DIAGNOSES = [
  'Asma bronquial', 'Bronquitis aguda', 'Neumonía', 'COVID-19', 'Gripe',
  'Resfriado común', 'Alergia respiratoria', 'EPOC', 'Faringitis', 'Laringitis'
];

// Helper functions
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// User Schema (inline if model not available)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = UserModel || mongoose.model('User', UserSchema);

// Medical History Schema (inline)
const MedicalHistorySchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  doctorId: { type: String, required: true, index: true },
  patientName: { type: String, required: true },
  age: { type: Number, required: true, min: 0, max: 150 },
  diagnosis: { type: String, required: true },
  symptoms: [{
    name: { type: String, required: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], required: true },
    duration: { type: String, required: true },
    description: { type: String }
  }],
  description: { type: String },
  date: { type: Date, default: Date.now, index: true },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  images: [{ type: String }],
  audioNotes: { type: String },
  status: { type: String, enum: ['active', 'archived', 'deleted'], default: 'active' },
  isOffline: { type: Boolean, default: false },
  syncStatus: { type: String, default: 'synced' }
}, { timestamps: true });

const MedicalHistory = MedicalHistoryModel || mongoose.model('MedicalHistory', MedicalHistorySchema);

// Wearable Data Schema (inline)
const WearableDataSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  heartRate: { type: Number, min: 0, max: 300 },
  oxygenSaturation: { type: Number, min: 0, max: 100 },
  steps: { type: Number, min: 0 },
  distance: { type: Number, min: 0 },
  respiratoryRate: { type: Number, min: 0, max: 100 },
  sleepHours: { type: Number, min: 0, max: 24 },
  timestamp: { type: Date, required: true, index: true },
  source: { type: String, enum: ['apple_health', 'google_fit', 'manual'], required: true },
  syncedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const WearableData = WearableDataModel || mongoose.model('WearableData', WearableDataSchema);

// Appointment Schema (inline)
const AppointmentSchema = new mongoose.Schema({
  patientId: { type: String, required: true, index: true },
  doctorId: { type: String, required: true, index: true },
  createdBy: { type: String, required: true },
  scheduledAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, default: 30, min: 15, max: 240 },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'], default: 'scheduled' },
  notes: { type: String },
  location: {
    type: { type: String, enum: ['virtual', 'in_person'], default: 'in_person' },
    address: { type: String }
  }
}, { timestamps: true });

const Appointment = AppointmentModel || mongoose.model('Appointment', AppointmentSchema);

// Alert Schema (inline)
const AlertSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  category: { type: String, enum: ['critical_symptom', 'medication_reminder', 'follow_up', 'doctor_notification', 'system', 'emergency'], required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['pending', 'scheduled', 'sent', 'delivered', 'failed', 'acknowledged', 'expired'], default: 'pending' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  scheduledFor: { type: Date, index: true },
  channels: [{ type: String, enum: ['in_app', 'push', 'email', 'sms'] }],
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const Alert = AlertModel || mongoose.model('Alert', AlertSchema);

// AI Analysis Schema (inline)
const AIAnalysisSchema = new mongoose.Schema({
  medicalHistoryId: { type: String, required: true, index: true },
  symptoms: [{
    name: { type: String, required: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], required: true },
    duration: { type: String, required: true }
  }],
  possibleDiagnoses: [{
    condition: { type: String, required: true },
    probability: { type: Number, required: true, min: 0, max: 100 },
    recommendations: [{ type: String }]
  }],
  confidence: { type: Number, min: 0, max: 100, default: 85 },
  modelVersion: { type: String, default: '1.0' },
  processingTime: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

const AIAnalysis = AIAnalysisModel || mongoose.model('AIAnalysis', AIAnalysisSchema);

// Seed functions
async function seedUsers() {
  console.log('👤 Creando usuarios...');
  
  const demoUsers = [
    { name: 'Paciente Demo', email: 'paciente@demo.com', password: 'demo1234', role: 'patient' },
    { name: 'Juan Pérez', email: 'juan.perez@demo.com', password: 'demo1234', role: 'patient' },
    { name: 'María García', email: 'maria.garcia@demo.com', password: 'demo1234', role: 'patient' },
    { name: 'Carlos Mendoza', email: 'carlos.mendoza@demo.com', password: 'demo1234', role: 'patient' },
    { name: 'Ana López', email: 'ana.lopez@demo.com', password: 'demo1234', role: 'patient' },
    { name: 'Dr. Roberto Silva', email: 'doctor@demo.com', password: 'demo1234', role: 'doctor' },
    { name: 'Dr. Laura Martínez', email: 'laura.martinez@demo.com', password: 'demo1234', role: 'doctor' },
    { name: 'Admin RespiCare', email: 'admin@demo.com', password: 'admin1234', role: 'admin' }
  ];

  const createdUsers = [];
  for (const userData of demoUsers) {
    try {
      let user = await User.findOne({ email: userData.email.toLowerCase() });
      if (user) {
        user.password = userData.password;
        user.isActive = true;
        await user.save();
        createdUsers.push(user);
      } else {
        user = new User({ ...userData, isActive: true });
        await user.save();
        createdUsers.push(user);
      }
    } catch (error) {
      console.warn(`⚠️  Error creando usuario ${userData.email}:`, error.message);
    }
  }

  console.log(`✅ ${createdUsers.length} usuarios creados/actualizados`);
  return createdUsers;
}

async function seedSymptomReports(count = 900) {
  console.log(`📝 Generando ${count} reportes de síntomas...`);
  
  const reports = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365);
  const endDate = new Date();

  for (let i = 0; i < count; i++) {
    const district = randomItem(DISTRICTS);
    const symptomCount = randomInt(2, 5);
    const selectedSymptoms = [];
    const symptomSet = new Set();

    while (symptomSet.size < symptomCount) {
      const symptom = randomItem(SYMPTOMS);
      if (!symptomSet.has(symptom)) {
        symptomSet.add(symptom);
        selectedSymptoms.push({
          name: symptom,
          severity: randomItem(['mild', 'moderate', 'severe']),
          duration: { value: randomInt(1, 14), unit: 'days' }
        });
      }
    }

    const hasSevereSymptoms = selectedSymptoms.some(s => s.severity === 'severe');
    const hasFever = selectedSymptoms.some(s => s.name === 'fiebre');
    const overallSeverity = hasSevereSymptoms || hasFever ? 
      (Math.random() > 0.3 ? 'high' : 'medium') : 
      (Math.random() > 0.5 ? 'medium' : 'low');

    const reportedDate = randomDate(startDate, endDate);

    reports.push({
      location: {
        district: district.name,
        coordinates: {
          latitude: district.lat + (Math.random() - 0.5) * 0.015,
          longitude: district.lng + (Math.random() - 0.5) * 0.015
        }
      },
      symptoms: selectedSymptoms,
      category: randomItem(['respiratory', 'fever', 'pain', 'digestive', 'fatigue', 'neurological']),
      overallSeverity,
      suspectedDisease: randomItem(SUSPECTED_DISEASES),
      temperature: hasFever ? (37 + Math.random() * 2.5) : (36 + Math.random() * 1.5),
      status: overallSeverity === 'high' && Math.random() > 0.5 ? 'urgent' : 'pending',
      medicalAttentionRequired: overallSeverity === 'high' || Math.random() > 0.7,
      reportedAt: reportedDate,
      notes: `Reporte generado para demo - ${reportedDate.toISOString()}`,
      isAnonymous: Math.random() > 0.3,
      source: randomItem(['web', 'mobile', 'phone'])
    });
  }

  await SymptomReportModel.deleteMany({ notes: { $regex: 'generado para demo' } });
  const batchSize = 100;
  for (let i = 0; i < reports.length; i += batchSize) {
    const batch = reports.slice(i, i + batchSize);
    await SymptomReportModel.insertMany(batch);
  }

  console.log(`✅ ${reports.length} reportes de síntomas insertados`);
  return reports.length;
}

async function seedMedicalHistories(users) {
  console.log('🏥 Generando historias médicas...');
  
  const patients = users.filter(u => u.role === 'patient');
  const doctors = users.filter(u => u.role === 'doctor');
  
  if (patients.length === 0 || doctors.length === 0) {
    console.log('⚠️  No hay pacientes o doctores, saltando historias médicas');
    return [];
  }

  const histories = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 180);
  const endDate = new Date();

  for (const patient of patients) {
    const historyCount = randomInt(1, 3); // 1-3 historias por paciente
    const district = randomItem(DISTRICTS);
    const age = randomInt(25, 75);

    for (let i = 0; i < historyCount; i++) {
      const doctor = randomItem(doctors);
      const symptomCount = randomInt(2, 4);
      const selectedSymptoms = [];
      const symptomSet = new Set();

      while (symptomSet.size < symptomCount) {
        const symptom = randomItem(SYMPTOMS);
        if (!symptomSet.has(symptom)) {
          symptomSet.add(symptom);
          selectedSymptoms.push({
            name: symptom,
            severity: randomItem(['mild', 'moderate', 'severe']),
            duration: `${randomInt(1, 14)} días`,
            description: `Síntoma ${symptom} con severidad ${randomItem(['mild', 'moderate', 'severe'])}`
          });
        }
      }

      const diagnosis = randomItem(DIAGNOSES);
      const historyDate = randomDate(startDate, endDate);

      histories.push({
        patientId: patient._id.toString(),
        doctorId: doctor._id.toString(),
        patientName: patient.name,
        age: age + randomInt(-5, 5),
        diagnosis,
        symptoms: selectedSymptoms,
        description: `Consulta médica por ${selectedSymptoms.map(s => s.name).join(', ')}. Diagnóstico: ${diagnosis}.`,
        date: historyDate,
        location: {
          latitude: district.lat + (Math.random() - 0.5) * 0.015,
          longitude: district.lng + (Math.random() - 0.5) * 0.015,
          address: `${district.name}, Tacna`
        },
        images: [],
        audioNotes: null,
        status: 'active',
        isOffline: false,
        syncStatus: 'synced'
      });
    }
  }

  await MedicalHistory.deleteMany({});
  const insertedHistories = await MedicalHistory.insertMany(histories);
  
  console.log(`✅ ${insertedHistories.length} historias médicas insertadas`);
  return insertedHistories; // Retornar los documentos insertados con sus IDs
}

async function seedWearableData(users) {
  console.log('⌚ Generando datos de wearables...');
  
  const patients = users.filter(u => u.role === 'patient');
  if (patients.length === 0) {
    console.log('⚠️  No hay pacientes, saltando datos de wearables');
    return 0;
  }

  const wearableData = [];
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Últimos 30 días

  for (const patient of patients) {
    // Generar datos diarios para los últimos 30 días
    for (let day = 0; day < 30; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      // 3-5 mediciones por día
      const measurementsPerDay = randomInt(3, 5);
      
      for (let m = 0; m < measurementsPerDay; m++) {
        const timestamp = new Date(date);
        timestamp.setHours(randomInt(6, 22), randomInt(0, 59), 0, 0);
        
        // Datos realistas basados en hora del día
        const isNight = timestamp.getHours() < 7 || timestamp.getHours() > 22;
        const baseHeartRate = isNight ? 55 : 70;
        const baseRespiratoryRate = isNight ? 12 : 16;
        
        wearableData.push({
          patientId: patient._id,
          heartRate: randomInt(baseHeartRate - 10, baseHeartRate + 20),
          oxygenSaturation: randomFloat(95, 100, 1),
          steps: m === 0 ? randomInt(5000, 15000) : 0, // Pasos solo en primera medición del día
          distance: m === 0 ? randomFloat(3.5, 10.5, 2) : 0,
          respiratoryRate: randomInt(baseRespiratoryRate - 2, baseRespiratoryRate + 4),
          sleepHours: m === 0 && isNight ? randomFloat(6, 9, 1) : undefined,
          timestamp,
          source: randomItem(['apple_health', 'google_fit', 'manual']),
          syncedAt: timestamp
        });
      }
    }
  }

  await WearableData.deleteMany({});
  const batchSize = 200;
  for (let i = 0; i < wearableData.length; i += batchSize) {
    const batch = wearableData.slice(i, i + batchSize);
    await WearableData.insertMany(batch);
  }

  console.log(`✅ ${wearableData.length} registros de wearables insertados`);
  return wearableData.length;
}

async function seedChatConversations(users, count = 50) {
  console.log(`💬 Generando ${count} conversaciones de chat...`);
  
  const patients = users.filter(u => u.role === 'patient');
  if (patients.length === 0) {
    console.log('⚠️  No hay pacientes, saltando conversaciones');
    return 0;
  }

  const conversations = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();

  for (let i = 0; i < count; i++) {
    const patient = randomItem(patients);
    const district = randomItem(DISTRICTS);
    const symptoms = [randomItem(SYMPTOMS), randomItem(SYMPTOMS)].filter((v, i, a) => a.indexOf(v) === i);
    const disease = randomItem(DIAGNOSES);
    const startedAt = randomDate(startDate, endDate);
    const urgency = Math.random() > 0.7 ? 'high' : (Math.random() > 0.4 ? 'medium' : 'low');
    const confidence = randomFloat(0.75, 0.95, 2);

    const messages = [];
    let messageTime = new Date(startedAt);

    messages.push({
      role: 'user',
      content: `Hola, tengo ${symptoms[0]} desde hace ${randomInt(2, 7)} días. ¿Podrían orientarme?`,
      timestamp: new Date(messageTime),
      metadata: { detectedSymptoms: symptoms, questionType: 'symptom_report' }
    });
    messageTime = new Date(messageTime.getTime() + 2 * 60 * 1000);

    messages.push({
      role: 'bot',
      content: `Hola${patient.name.split(' ')[0] ? ` ${patient.name.split(' ')[0]}` : ''}, gracias por contactarnos. Con esos síntomas podríamos estar ante ${disease}. Te voy a dar algunas recomendaciones.`,
      timestamp: new Date(messageTime),
      metadata: { detectedDiseases: [disease], detectedSymptoms: symptoms, confidence, urgencyLevel: urgency }
    });
    messageTime = new Date(messageTime.getTime() + 3 * 60 * 1000);

    messages.push({
      role: 'user',
      content: '¿Qué debo hacer?',
      timestamp: new Date(messageTime),
      metadata: { questionType: 'follow_up' }
    });
    messageTime = new Date(messageTime.getTime() + 2 * 60 * 1000);

    messages.push({
      role: 'bot',
      content: `Te recomiendo descansar, mantenerte hidratado y monitorear tus síntomas. Si empeoran o tienes dificultad para respirar, busca atención médica inmediata.`,
      timestamp: new Date(messageTime),
      metadata: { detectedDiseases: [disease], confidence, urgencyLevel: urgency }
    });

    const sessionId = `demo-chat-${startedAt.getTime()}-${i}-${randomInt(1000, 9999)}`;

    conversations.push({
      sessionId,
      userId: patient._id.toString(),
      messages,
      userInfo: { name: patient.name, email: patient.email },
      location: { district: district.name, city: 'Tacna', country: 'Perú' },
      metadata: {
        userAgent: 'RespiCare-Demo/1.0',
        ipAddress: `192.168.${randomInt(0, 255)}.${randomInt(0, 255)}`,
        language: 'es',
        source: Math.random() > 0.5 ? 'web' : 'mobile'
      },
      summary: {
        totalMessages: messages.length,
        userMessages: messages.filter(m => m.role === 'user').length,
        botMessages: messages.filter(m => m.role === 'bot').length,
        detectedDiseases: [disease],
        detectedSymptoms: symptoms,
        highestUrgency: urgency,
        averageConfidence: confidence
      },
      status: 'completed',
      requiresFollowUp: urgency === 'high',
      followUpNotes: urgency === 'high' ? 'Marcado automáticamente para seguimiento por urgencia elevada.' : undefined,
      startedAt,
      lastActivityAt: new Date(messageTime),
      completedAt: new Date(messageTime),
      createdAt: startedAt,
      updatedAt: new Date(messageTime)
    });
  }

  await ChatConversationModel.deleteMany({ sessionId: { $regex: '^demo-chat-' } });
  const batchSize = 20;
  for (let i = 0; i < conversations.length; i += batchSize) {
    const batch = conversations.slice(i, i + batchSize);
    await ChatConversationModel.insertMany(batch);
  }

  console.log(`✅ ${conversations.length} conversaciones de chat insertadas`);
  return conversations.length;
}

async function seedAppointments(users) {
  console.log('📅 Generando citas médicas...');
  
  const patients = users.filter(u => u.role === 'patient');
  const doctors = users.filter(u => u.role === 'doctor');
  
  if (patients.length === 0 || doctors.length === 0) {
    console.log('⚠️  No hay pacientes o doctores, saltando citas');
    return 0;
  }

  const appointments = [];
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < 40; i++) {
    const patient = randomItem(patients);
    const doctor = randomItem(doctors);
    const scheduledAt = randomDate(startDate, endDate);
    const isPast = scheduledAt < now;
    const status = isPast ? 
      randomItem(['completed', 'completed', 'completed', 'cancelled', 'no_show']) : 
      randomItem(['scheduled', 'scheduled', 'scheduled', 'rescheduled']);

    appointments.push({
      patientId: patient._id.toString(),
      doctorId: doctor._id.toString(),
      createdBy: patient._id.toString(),
      scheduledAt,
      durationMinutes: randomItem([30, 45, 60]),
      status,
      notes: status === 'completed' ? 'Consulta completada exitosamente' : undefined,
      location: {
        type: Math.random() > 0.3 ? 'in_person' : 'virtual',
        address: Math.random() > 0.3 ? 'Centro Médico RespiCare, Tacna' : undefined
      }
    });
  }

  await Appointment.deleteMany({});
  await Appointment.insertMany(appointments);

  console.log(`✅ ${appointments.length} citas médicas insertadas`);
  return appointments.length;
}

async function seedAlerts(users) {
  console.log('🚨 Generando alertas...');
  
  const patients = users.filter(u => u.role === 'patient');
  if (patients.length === 0) {
    console.log('⚠️  No hay pacientes, saltando alertas');
    return 0;
  }

  const alerts = [];
  const now = new Date();
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < 30; i++) {
    const patient = randomItem(patients);
    const category = randomItem(['critical_symptom', 'medication_reminder', 'follow_up', 'doctor_notification']);
    const priority = category === 'critical_symptom' ? 
      randomItem(['high', 'critical']) : 
      randomItem(['low', 'medium', 'high']);
    const status = randomItem(['pending', 'sent', 'delivered', 'acknowledged']);
    const scheduledFor = randomDate(startDate, endDate);

    alerts.push({
      userId: patient._id.toString(),
      category,
      priority,
      status,
      title: `Alerta ${category.replace('_', ' ')}`,
      message: `Mensaje de alerta para ${patient.name} sobre ${category}`,
      scheduledFor,
      channels: [randomItem(['in_app', 'push', 'email'])],
      metadata: { source: 'demo', autoGenerated: true }
    });
  }

  await Alert.deleteMany({});
  await Alert.insertMany(alerts);

  console.log(`✅ ${alerts.length} alertas insertadas`);
  return alerts.length;
}

async function seedAIAnalyses(medicalHistories) {
  console.log('🤖 Generando análisis de IA...');
  
  if (!medicalHistories || medicalHistories.length === 0) {
    console.log('⚠️  No hay historias médicas, saltando análisis de IA');
    return 0;
  }

  const analyses = [];

  for (const history of medicalHistories) {
    const possibleDiagnoses = [];
    const primaryDiagnosis = history.diagnosis;
    const primaryProbability = randomFloat(75, 95, 1);
    
    possibleDiagnoses.push({
      condition: primaryDiagnosis,
      probability: primaryProbability,
      recommendations: [
        'Descanso adecuado',
        'Hidratación constante',
        'Monitoreo de síntomas',
        'Consulta médica si empeora'
      ]
    });

    // Agregar 1-2 diagnósticos secundarios
    const secondaryCount = randomInt(1, 2);
    for (let i = 0; i < secondaryCount; i++) {
      const secondaryDisease = randomItem(DIAGNOSES.filter(d => d !== primaryDiagnosis));
      possibleDiagnoses.push({
        condition: secondaryDisease,
        probability: randomFloat(20, primaryProbability - 10, 1),
        recommendations: [
          'Evaluación adicional recomendada',
          'Seguimiento médico necesario'
        ]
      });
    }

    // Asegurar que tenemos el ID correcto
    const historyId = history._id ? history._id.toString() : (history.id ? history.id.toString() : null);
    if (!historyId) {
      console.warn(`⚠️  Historia médica sin ID válido, saltando análisis de IA`);
      continue;
    }

    analyses.push({
      medicalHistoryId: historyId,
      symptoms: history.symptoms,
      possibleDiagnoses,
      confidence: randomFloat(80, 95, 1),
      modelVersion: '1.0',
      processingTime: randomFloat(0.5, 2.5, 2),
      metadata: {
        source: 'demo',
        patientAge: history.age,
        symptomsCount: history.symptoms.length
      }
    });
  }

  await AIAnalysis.deleteMany({});
  await AIAnalysis.insertMany(analyses);

  console.log(`✅ ${analyses.length} análisis de IA insertados`);
  return analyses.length;
}

// Main seed function
async function seedCompleteDemo() {
  try {
    console.log('🌱 Iniciando seed completo de datos demo...\n');
    
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Conectado a MongoDB\n');

    // 1. Seed Users
    const users = await seedUsers();
    console.log('');

    // 2. Seed Symptom Reports (para dashboards web)
    await seedSymptomReports(900);
    console.log('');

    // 3. Seed Medical Histories (1-3 por paciente, enlazadas)
    const medicalHistories = await seedMedicalHistories(users);
    console.log('');

    // 4. Seed Wearable Data (sincronizados con pacientes)
    await seedWearableData(users);
    console.log('');

    // 5. Seed Chat Conversations
    await seedChatConversations(users, 50);
    console.log('');

    // 6. Seed Appointments
    await seedAppointments(users);
    console.log('');

    // 7. Seed Alerts
    await seedAlerts(users);
    console.log('');

    // 8. Seed AI Analyses (enlazados a historias médicas)
    await seedAIAnalyses(medicalHistories);
    console.log('');

    // Statistics
    console.log('📊 Estadísticas finales:');
    const stats = {
      users: await User.countDocuments(),
      symptomReports: await SymptomReportModel.countDocuments(),
      medicalHistories: await MedicalHistory.countDocuments(),
      wearableData: await WearableData.countDocuments(),
      chatConversations: await ChatConversationModel.countDocuments(),
      appointments: await Appointment.countDocuments(),
      alerts: await Alert.countDocuments(),
      aiAnalyses: await AIAnalysis.countDocuments()
    };

    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log('\n✅ Seed completo finalizado exitosamente!');
    console.log('\n🔑 Credenciales de acceso:');
    console.log('   Pacientes: paciente@demo.com, juan.perez@demo.com, etc. / demo1234');
    console.log('   Doctores: doctor@demo.com, laura.martinez@demo.com / demo1234');
    console.log('   Admin: admin@demo.com / admin1234');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Run if executed directly
if (require.main === module) {
  seedCompleteDemo();
}

module.exports = { seedCompleteDemo };


