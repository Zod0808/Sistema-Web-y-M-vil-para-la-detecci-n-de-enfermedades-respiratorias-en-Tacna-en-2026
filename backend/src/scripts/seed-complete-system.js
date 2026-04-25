/**
 * RespiCare - Seed Completo del Sistema
 * Genera datos de prueba realistas para TODAS las colecciones
 *
 * Colecciones:
 *  1.  Users             (admin, doctores, pacientes)
 *  2.  MedicalHistories  (historias clínicas)
 *  3.  Appointments      (citas: pasadas, presentes, futuras)
 *  4.  Prescriptions     (prescripciones médicas)
 *  5.  LabResults        (resultados de laboratorio)
 *  6.  Alerts            (alertas del sistema)
 *  7.  AIAnalyses        (análisis de IA)
 *  8.  SymptomReports    (reportes de síntomas para dashboards)
 *  9.  WearableData      (datos de wearables)
 * 10.  ChatConversations (conversaciones con el chatbot)
 * 11.  AutomaticReports  (reportes automáticos)
 * 12.  MLExperiments     (experimentos de ML)
 * 13.  AuditLogs         (logs de auditoría)
 * 14.  ConsentLogs       (logs de consentimiento)
 * 15.  Referrals         (referidos entre doctores)
 *
 * Uso dentro del contenedor:
 *   docker-compose exec backend node src/scripts/seed-complete-system.js
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ─── Conexión ─────────────────────────────────────────────────────────────────
// Dentro del contenedor backend se inyecta MONGODB_URI via docker-compose.dev.yml
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';

// ─── Modelos JS (no dependen de TypeScript) ───────────────────────────────────
let SymptomReportModel, ChatConversationModel;
try { SymptomReportModel   = require('../models/SymptomReport');   } catch (_) { SymptomReportModel   = null; }
try { ChatConversationModel = require('../models/ChatConversation'); } catch (_) { ChatConversationModel = null; }

// Modelos TS se cargan via require (fallarán y usarán fallback de schema inline)
let UserModel, MedicalHistoryModel, WearableDataModel, AppointmentModel;
let AlertModel, AIAnalysisModel, PrescriptionModel, AutomaticReportModel;
let MLExperimentModel, AuditLogModel, ConsentLogModel, LabResultModel, ReferralModel;
try { UserModel            = require('../models/User').default;            } catch (_) {}
try { MedicalHistoryModel  = require('../models/MedicalHistory').default;  } catch (_) {}
try { WearableDataModel    = require('../models/WearableData').default;    } catch (_) {}
try { AppointmentModel     = require('../models/Appointment').default;     } catch (_) {}
try { AlertModel           = require('../models/Alert').default;           } catch (_) {}
try { AIAnalysisModel      = require('../models/AIAnalysis').default;      } catch (_) {}
try { PrescriptionModel    = require('../models/Prescription').default;    } catch (_) {}
try { AutomaticReportModel = require('../models/AutomaticReport').default; } catch (_) {}
try { MLExperimentModel    = require('../models/MLExperiment').default;    } catch (_) {}
try { AuditLogModel        = require('../models/AuditLog').default;        } catch (_) {}
try { ConsentLogModel      = require('../models/ConsentLog').default;      } catch (_) {}
try { LabResultModel       = require('../models/LabResult').default;       } catch (_) {}
try { ReferralModel        = require('../models/Referral').default;        } catch (_) {}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function rInt(min, max)                  { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rFloat(min, max, dec = 2)       { return +((Math.random() * (max - min) + min).toFixed(dec)); }
function pick(arr)                        { return arr[Math.floor(Math.random() * arr.length)]; }
function picks(arr, n)                    { return [...arr].sort(() => 0.5 - Math.random()).slice(0, n); }
const now      = new Date();
const daysAgo  = d => new Date(now - d * 86400000);
const daysAhead = d => new Date(+now + d * 86400000);

// ─── Catálogos ────────────────────────────────────────────────────────────────
const DISTRICTS = [
  { name: 'Centro de Tacna',      lat: -18.0056, lng: -70.2444 },
  { name: 'Gregorio Albarracín',  lat: -18.0303, lng: -70.2489 },
  { name: 'Ciudad Nueva',         lat: -18.0125, lng: -70.2467 },
  { name: 'Alto de la Alianza',   lat: -18.0156, lng: -70.2500 },
  { name: 'Pocollay',             lat: -18.0083, lng: -70.2522 },
  { name: 'Calana',               lat: -18.0100, lng: -70.2400 },
  { name: 'Pachia',               lat: -18.0300, lng: -70.2300 },
  { name: 'Boca del Río',         lat: -18.0200, lng: -70.2600 },
];

const DIAGNOSES = [
  'Asma bronquial', 'Bronquitis aguda', 'Neumonía', 'COVID-19',
  'Gripe estacional', 'Resfriado común', 'Alergia respiratoria',
  'EPOC', 'Faringitis', 'Laringitis', 'Sinusitis aguda',
  'Broncoespasmo', 'Rinitis alérgica', 'Traqueítis',
];

const SYMPTOMS = [
  'tos', 'fiebre', 'dificultad_respiratoria', 'sibilancias', 'fatiga',
  'dolor_pecho', 'congestion_nasal', 'dolor_garganta', 'escalofrios',
  'dolor_cabeza', 'nauseas', 'perdida_apetito', 'expectoracion', 'disnea',
];

const MEDICATIONS = [
  { name: 'Paracetamol',    dosage: '500mg',   form: 'Tableta',   frequency: 3 },
  { name: 'Ibuprofeno',     dosage: '400mg',   form: 'Tableta',   frequency: 2 },
  { name: 'Amoxicilina',    dosage: '500mg',   form: 'Cápsula',   frequency: 3 },
  { name: 'Azitromicina',   dosage: '500mg',   form: 'Tableta',   frequency: 1 },
  { name: 'Salbutamol',     dosage: '100mcg',  form: 'Inhalador', frequency: 4 },
  { name: 'Budesonida',     dosage: '200mcg',  form: 'Inhalador', frequency: 2 },
  { name: 'Prednisona',     dosage: '20mg',    form: 'Tableta',   frequency: 1 },
  { name: 'Loratadina',     dosage: '10mg',    form: 'Tableta',   frequency: 1 },
  { name: 'Dexametasona',   dosage: '4mg',     form: 'Tableta',   frequency: 2 },
  { name: 'Levofloxacino',  dosage: '500mg',   form: 'Tableta',   frequency: 1 },
  { name: 'Montelukast',    dosage: '10mg',    form: 'Tableta',   frequency: 1 },
  { name: 'Fluticasona',    dosage: '50mcg',   form: 'Inhalador', frequency: 2 },
];

// Exámenes de laboratorio comunes en enfermedades respiratorias
const LAB_TESTS = [
  { name: 'Hemograma completo',         code: '58410-2', unit: 'x10³/µL', low: 4.5, high: 11.0 },
  { name: 'PCR (Proteína C Reactiva)',  code: '1988-5',  unit: 'mg/L',    low: 0,   high: 10.0 },
  { name: 'Oximetría de pulso',         code: '59408-5', unit: '%',       low: 95,  high: 100  },
  { name: 'Cultivo de esputo',          code: '628-8',   unit: 'UFC/mL',  low: 0,   high: 0    },
  { name: 'Espirometría FEV1',          code: '20151-5', unit: '%',       low: 80,  high: 120  },
  { name: 'Gasometría arterial PaO2',   code: '2703-7',  unit: 'mmHg',    low: 80,  high: 100  },
  { name: 'Procalcitonina',             code: '33959-8', unit: 'ng/mL',   low: 0,   high: 0.5  },
  { name: 'Antígeno SARS-CoV-2',        code: '94558-4', unit: 'Positivo/Negativo', low: null, high: null },
  { name: 'IgE total',                  code: '19113-0', unit: 'UI/mL',   low: 0,   high: 100  },
  { name: 'Lactato deshidrogenasa',     code: '14804-9', unit: 'U/L',     low: 100, high: 190  },
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const ROUTES = [
  '/api/v1/auth/login', '/api/v1/medical-histories', '/api/v1/appointments',
  '/api/v1/prescriptions', '/api/v1/alerts', '/api/v1/dashboard',
  '/api/v1/analytics/dashboard', '/api/v1/symptom-analyzer/analyze',
  '/api/v1/users', '/api/v1/wearables', '/api/v1/lab-results',
];

// ─── 1. USUARIOS ──────────────────────────────────────────────────────────────
async function seedUsers() {
  const schema = new mongoose.Schema({
    name:      String,
    email:     { type: String, unique: true },
    password:  String,
    role:      { type: String, enum: ['patient', 'doctor', 'admin'] },
    avatar:    String,
    phone:     String,
    isActive:  { type: Boolean, default: true },
    lastLogin: Date,
  }, { timestamps: true });

  const User = UserModel || (mongoose.models['User'] || mongoose.model('User', schema));

  const hash = pwd => bcrypt.hash(pwd, 10);

  const users = [
    // ── Admin
    {
      name: 'Admin RespiCare',
      email: 'admin@demo.com',
      password: await hash('admin1234'),
      role: 'admin',
      phone: '+51999000000',
      isActive: true,
      lastLogin: daysAgo(1),
    },
    // ── Doctores
    {
      name: 'Dr. Juan Pérez Torres',
      email: 'doctor@demo.com',
      password: await hash('demo1234'),
      role: 'doctor',
      phone: '+51999000001',
      isActive: true,
      lastLogin: daysAgo(0),
    },
    {
      name: 'Dra. Laura Martínez Quispe',
      email: 'laura.martinez@demo.com',
      password: await hash('demo1234'),
      role: 'doctor',
      phone: '+51999000002',
      isActive: true,
      lastLogin: daysAgo(2),
    },
    {
      name: 'Dr. Roberto Condori Mamani',
      email: 'roberto.condori@demo.com',
      password: await hash('demo1234'),
      role: 'doctor',
      phone: '+51999000003',
      isActive: true,
      lastLogin: daysAgo(3),
    },
    // ── Pacientes
    {
      name: 'Juan Pérez García',
      email: 'juan.perez@demo.com',
      password: await hash('demo1234'),
      role: 'patient',
      phone: '+51987000001',
      isActive: true,
      lastLogin: daysAgo(1),
    },
    {
      name: 'María García Flores',
      email: 'maria.garcia@demo.com',
      password: await hash('demo1234'),
      role: 'patient',
      phone: '+51987000002',
      isActive: true,
      lastLogin: daysAgo(2),
    },
    {
      name: 'Carlos Mendoza Ríos',
      email: 'carlos.mendoza@demo.com',
      password: await hash('demo1234'),
      role: 'patient',
      phone: '+51987000003',
      isActive: true,
      lastLogin: daysAgo(4),
    },
    {
      name: 'Ana López Vargas',
      email: 'ana.lopez@demo.com',
      password: await hash('demo1234'),
      role: 'patient',
      phone: '+51987000004',
      isActive: true,
      lastLogin: daysAgo(0),
    },
    {
      name: 'Pedro Quispe Huanca',
      email: 'pedro.quispe@demo.com',
      password: await hash('demo1234'),
      role: 'patient',
      phone: '+51987000005',
      isActive: true,
      lastLogin: daysAgo(7),
    },
    {
      name: 'Sofía Mamani Apaza',
      email: 'sofia.mamani@demo.com',
      password: await hash('demo1234'),
      role: 'patient',
      phone: '+51987000006',
      isActive: true,
      lastLogin: daysAgo(5),
    },
    {
      name: 'Luis Cáceres Paredes',
      email: 'luis.caceres@demo.com',
      password: await hash('demo1234'),
      role: 'patient',
      phone: '+51987000007',
      isActive: true,
      lastLogin: daysAgo(10),
    },
    {
      name: 'Rosa Ticona Ccopa',
      email: 'rosa.ticona@demo.com',
      password: await hash('demo1234'),
      role: 'patient',
      phone: '+51987000008',
      isActive: false, // paciente inactivo para pruebas
      lastLogin: daysAgo(60),
    },
    {
      name: 'Paciente Demo',
      email: 'paciente@demo.com',
      password: await hash('demo1234'),
      role: 'patient',
      phone: '+51987000009',
      isActive: true,
      lastLogin: daysAgo(0),
    },
  ];

  await User.deleteMany({});
  const created = await User.insertMany(users);
  console.log(`✅ ${created.length} usuarios creados`);
  return created;
}

// ─── 2. HISTORIAS MÉDICAS ─────────────────────────────────────────────────────
async function seedMedicalHistories(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const MH = MedicalHistoryModel || (mongoose.models['MedicalHistory'] || mongoose.model('MedicalHistory', schema));

  const patients = users.filter(u => u.role === 'patient');
  const doctors  = users.filter(u => u.role === 'doctor');
  const docs = [];

  for (const patient of patients) {
    const count = rInt(3, 6);
    for (let i = 0; i < count; i++) {
      const doctor   = pick(doctors);
      const district = pick(DISTRICTS);
      const diagnosis = pick(DIAGNOSES);
      const symptoms  = picks(SYMPTOMS, rInt(2, 5)).map(name => ({
        name,
        severity:    pick(['mild', 'moderate', 'severe']),
        duration:    `${rInt(1, 10)} días`,
        description: `Paciente refiere ${name} de intensidad variable`,
      }));

      docs.push({
        patientId:   patient._id.toString(),
        doctorId:    doctor._id.toString(),
        patientName: patient.name,
        age:         rInt(18, 75),
        diagnosis,
        symptoms,
        description: `Consulta por ${diagnosis}. ${symptoms.map(s => s.name).join(', ')}.`,
        date:        rDate(daysAgo(365), now),
        location: {
          latitude:  district.lat + rFloat(-0.01, 0.01),
          longitude: district.lng + rFloat(-0.01, 0.01),
          address:   `${district.name}, Tacna, Perú`,
        },
        isOffline:  false,
        syncStatus: 'synced',
      });
    }
  }

  await MH.deleteMany({});
  const created = await MH.insertMany(docs, { ordered: false });
  console.log(`✅ ${created.length} historias médicas insertadas`);
  return created;
}

// ─── 3. CITAS MÉDICAS ─────────────────────────────────────────────────────────
async function seedAppointments(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const Appt = AppointmentModel || (mongoose.models['Appointment'] || mongoose.model('Appointment', schema));

  const patients = users.filter(u => u.role === 'patient');
  const doctors  = users.filter(u => u.role === 'doctor');
  const docs = [];

  // Pasadas (completadas / canceladas)
  for (let i = 0; i < 30; i++) {
    const patient    = pick(patients);
    const doctor     = pick(doctors);
    const scheduledAt = rDate(daysAgo(90), daysAgo(1));
    const status     = pick(['completed', 'cancelled', 'no_show']);
    docs.push({
      patientId:      patient._id.toString(),
      doctorId:       doctor._id.toString(),
      createdBy:      patient._id.toString(),
      scheduledAt,
      durationMinutes: pick([15, 20, 30, 45, 60]),
      status,
      reason:  `Consulta por ${pick(SYMPTOMS)}`,
      notes:   status === 'completed' ? 'Consulta completada exitosamente. Paciente evoluciona favorablemente.' : undefined,
      location: {
        type:    pick(['virtual', 'in_person']),
        address: `${pick(DISTRICTS).name}, Tacna`,
      },
      reminderSentAt: new Date(scheduledAt - 3600000),
    });
  }

  // Hoy / próximas
  for (let i = 0; i < 20; i++) {
    const patient     = pick(patients);
    const doctor      = pick(doctors);
    const scheduledAt = rDate(daysAhead(0), daysAhead(30));
    docs.push({
      patientId:       patient._id.toString(),
      doctorId:        doctor._id.toString(),
      createdBy:       patient._id.toString(),
      scheduledAt,
      durationMinutes: pick([15, 20, 30, 45, 60]),
      status: 'scheduled',
      reason: 'Consulta de seguimiento respiratorio',
      location: {
        type:    pick(['virtual', 'in_person']),
        address: `${pick(DISTRICTS).name}, Tacna`,
      },
    });
  }

  await Appt.deleteMany({});
  await Appt.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} citas insertadas`);
  return docs;
}

// ─── 4. PRESCRIPCIONES ────────────────────────────────────────────────────────
async function seedPrescriptions(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const Presc = PrescriptionModel || (mongoose.models['Prescription'] || mongoose.model('Prescription', schema));

  const patients = users.filter(u => u.role === 'patient');
  const doctors  = users.filter(u => u.role === 'doctor');
  const docs = [];

  for (let i = 0; i < 35; i++) {
    const patient    = pick(patients);
    const doctor     = pick(doctors);
    const medCount   = rInt(1, 3);
    const meds       = picks(MEDICATIONS, medCount).map(m => ({
      name:           m.name,
      dosage:         m.dosage,
      form:           m.form,
      frequencyPerDay: m.frequency,
      durationDays:   rInt(5, 14),
      startDate:      rDate(daysAgo(30), daysAhead(5)),
      instructions:   `Tomar ${m.dosage} cada ${Math.round(24 / m.frequency)} horas con alimentos`,
      reminderTimes:  Array.from({ length: m.frequency }, (_, k) =>
        `${String(8 + k * Math.round(24 / m.frequency)).padStart(2, '0')}:00`),
    }));

    const status = pick(['draft', 'pending_validation', 'active', 'active', 'active', 'completed', 'cancelled']);

    docs.push({
      patientId:       patient._id.toString(),
      doctorId:        doctor._id.toString(),
      createdBy:       doctor._id.toString(),
      diagnosis:       pick(DIAGNOSES),
      observations:    `Prescripción para tratamiento de ${pick(DIAGNOSES)}. Seguimiento en 7 días.`,
      medications:     meds,
      interactions:    meds.length > 1 && Math.random() > 0.7
        ? [{ medicationA: meds[0].name, medicationB: meds[1].name,
             severity: pick(['minor', 'moderate']),
             description: 'Monitorear posible interacción', source: 'DrugBank' }]
        : [],
      status,
      validatedBy:     ['active', 'completed'].includes(status) ? doctor._id.toString() : undefined,
      validatedAt:     ['active', 'completed'].includes(status) ? rDate(daysAgo(15), now) : undefined,
      validationNotes: ['active', 'completed'].includes(status) ? 'Prescripción revisada y validada' : undefined,
    });
  }

  await Presc.deleteMany({});
  await Presc.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} prescripciones insertadas`);
}

// ─── 5. RESULTADOS DE LABORATORIO ────────────────────────────────────────────
async function seedLabResults(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const Lab = LabResultModel || (mongoose.models['LabResult'] || mongoose.model('LabResult', schema));

  const patients = users.filter(u => u.role === 'patient');
  const doctors  = users.filter(u => u.role === 'doctor');
  const labs = ['Laboratorio San Martín', 'Clínica Tacna Lab', 'Hospital Unanue'];
  const docs = [];

  for (const patient of patients) {
    const testCount = rInt(3, 6);
    const testsToRun = picks(LAB_TESTS, testCount);

    for (const test of testsToRun) {
      const hasRange = test.low !== null;
      let value, status;

      if (test.name === 'Antígeno SARS-CoV-2') {
        value  = Math.random() > 0.8 ? 'Positivo' : 'Negativo';
        status = value === 'Positivo' ? 'abnormal' : 'normal';
      } else if (test.name === 'Cultivo de esputo') {
        value  = Math.random() > 0.7 ? rInt(1000, 50000) : 0;
        status = value > 0 ? 'abnormal' : 'normal';
      } else {
        const low = test.low, high = test.high;
        const roll = Math.random();
        if (roll < 0.7) {
          value  = rFloat(low, high);
          status = 'normal';
        } else if (roll < 0.9) {
          value  = roll < 0.8 ? rFloat(low * 0.5, low * 0.95) : rFloat(high * 1.05, high * 1.5);
          status = 'abnormal';
        } else {
          value  = roll < 0.95 ? rFloat(low * 0.2, low * 0.5) : rFloat(high * 1.5, high * 2);
          status = 'critical';
        }
      }

      const reviewedBy = pick(doctors);
      const date = rDate(daysAgo(180), now);

      docs.push({
        patientId:       patient._id.toString(),
        testName:        test.name,
        testCode:        test.code,
        value,
        unit:            test.unit,
        referenceRange:  hasRange
          ? { low: test.low, high: test.high, text: `${test.low} - ${test.high} ${test.unit}` }
          : { text: 'Ver informe' },
        status,
        date,
        laboratoryId:    uuidv4().slice(0, 8),
        laboratoryName:  pick(labs),
        orderId:         `ORD-${rInt(1000, 9999)}`,
        flagged:         status !== 'normal',
        reviewedBy:      reviewedBy._id.toString(),
        reviewedAt:      new Date(date.getTime() + rInt(2, 48) * 3600000),
        notes:           status !== 'normal'
          ? `Valor ${status === 'critical' ? 'CRÍTICO' : 'anormal'}. Requiere seguimiento médico.`
          : 'Valores dentro del rango normal.',
      });
    }
  }

  await Lab.deleteMany({});
  await Lab.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} resultados de laboratorio insertados`);
}

// ─── 6. ALERTAS ───────────────────────────────────────────────────────────────
async function seedAlerts(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const Alert = AlertModel || (mongoose.models['Alert'] || mongoose.model('Alert', schema));

  const categories = ['critical_symptom', 'medication_reminder', 'follow_up',
                      'doctor_notification', 'system', 'emergency'];
  const priorities  = ['low', 'medium', 'high', 'critical'];
  const statuses    = ['pending', 'scheduled', 'sent', 'delivered', 'acknowledged', 'failed'];
  const docs = [];

  for (let i = 0; i < 40; i++) {
    const user     = pick(users);
    const category = pick(categories);
    const priority = pick(priorities);
    const status   = pick(statuses);

    docs.push({
      userId:    user._id.toString(),
      patientId: user.role === 'patient' ? user._id.toString() : undefined,
      doctorId:  user.role === 'doctor'  ? user._id.toString() : undefined,
      title:     `${priority === 'critical' ? '🚨 CRÍTICO: ' : ''}${category.replace(/_/g, ' ')}`,
      message:   `Notificación de ${category.replace(/_/g, ' ')} para ${user.name}. Revisar estado del paciente.`,
      category,
      channels:  picks(['in_app', 'push', 'email', 'sms'], rInt(1, 3)),
      priority,
      status,
      trigger: {
        source:      pick(['symptom_analysis', 'medication_schedule', 'follow_up_rule', 'manual', 'system']),
        referenceId: uuidv4(),
      },
      scheduledAt:    status === 'scheduled'
        ? rDate(now, daysAhead(7))
        : rDate(daysAgo(7), now),
      dispatchedAt:   ['sent', 'delivered', 'acknowledged'].includes(status) ? rDate(daysAgo(3), now) : undefined,
      acknowledgedAt: status === 'acknowledged' ? rDate(daysAgo(2), now) : undefined,
      expiresAt:      daysAhead(7),
      priorityWeight: priorities.indexOf(priority) + 1,
    });
  }

  await Alert.deleteMany({});
  await Alert.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} alertas insertadas`);
}

// ─── 7. ANÁLISIS DE IA ────────────────────────────────────────────────────────
async function seedAIAnalyses(medicalHistories) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const AIA = AIAnalysisModel || (mongoose.models['AIAnalysis'] || mongoose.model('AIAnalysis', schema));

  const docs = [];
  for (const history of medicalHistories) {
    const id = (history._id || history.id || '').toString();
    if (!id) continue;

    const topDx    = pick(DIAGNOSES);
    const possible = picks(DIAGNOSES, rInt(2, 4)).map((dx, idx) => ({
      condition:       dx,
      probability:     Math.max(10, 95 - idx * 20 + rInt(-5, 5)),
      recommendations: [
        `Realizar seguimiento clínico para ${dx}`,
        `Considerar estudios complementarios`,
      ],
    }));

    docs.push({
      medicalHistoryId: id,
      symptoms:         history.symptoms || [],
      possibleDiagnoses: possible,
      urgency:          pick(['low', 'medium', 'high', 'critical']),
      confidence:       rFloat(78, 99, 1),
      modelVersion:     '2.1.0',
      processingTimeMs: rInt(120, 800),
      timestamp:        history.date || rDate(daysAgo(365), now),
    });
  }

  await AIA.deleteMany({});
  const created = await AIA.insertMany(docs, { ordered: false });
  console.log(`✅ ${created.length} análisis de IA insertados`);
}

// ─── 8. REPORTES DE SÍNTOMAS (para dashboards) ───────────────────────────────
async function seedSymptomReports(count = 1000) {
  if (!SymptomReportModel) {
    console.warn('⚠️  SymptomReport model no disponible, omitiendo');
    return;
  }

  const docs = [];
  const suspected = ['asma', 'neumonia', 'bronquitis', 'covid19', 'gripe', 'epoc', 'resfriado'];

  for (let i = 0; i < count; i++) {
    const district = pick(DISTRICTS);
    const category = pick(['respiratory', 'fever', 'pain', 'digestive', 'fatigue']);
    const severity = pick(['low', 'medium', 'high']);
    const date     = rDate(daysAgo(365), now);

    docs.push({
      patientId: null,
      location: {
        district:    district.name,
        coordinates: { latitude: district.lat + rFloat(-0.01, 0.01), longitude: district.lng + rFloat(-0.01, 0.01) },
        address:     `${district.name}, Tacna, Perú`,
      },
      symptoms: picks(SYMPTOMS, rInt(2, 5)).map(name => ({
        name,
        severity:  pick(['mild', 'moderate', 'severe']),
        duration:  { value: rInt(1, 7), unit: pick(['hours', 'days', 'weeks']) },
      })),
      category,
      overallSeverity:           severity,
      suspectedDisease:          pick(suspected),
      temperature:               category === 'fever' ? rFloat(36.5, 39.5) : undefined,
      oxygenSaturation:          category === 'respiratory' ? rFloat(85, 100, 1) : undefined,
      hasPreexistingConditions:  Math.random() > 0.7,
      preexistingConditions:     Math.random() > 0.7 ? picks(['diabetes', 'hipertensión', 'asma', 'epoc'], rInt(1, 2)) : [],
      status:                    pick(['pending', 'reviewed', 'urgent', 'resolved']),
      medicalAttentionRequired:  severity === 'high',
      medicalAttentionReceived:  severity === 'high' && Math.random() > 0.3,
      reportedBy:                pick(['patient', 'family', 'healthcare_worker', 'anonymous']),
      source:                    pick(['web', 'mobile', 'phone', 'hospital']),
      isAnonymous:               Math.random() > 0.5,
      reportedAt:                date,
      createdAt:                 date,
      updatedAt:                 date,
    });
  }

  await SymptomReportModel.deleteMany({});
  await SymptomReportModel.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} reportes de síntomas insertados`);
}

// ─── 9. DATOS DE WEARABLES ────────────────────────────────────────────────────
async function seedWearableData(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const WD = WearableDataModel || (mongoose.models['WearableData'] || mongoose.model('WearableData', schema));

  const patients = users.filter(u => u.role === 'patient');
  const docs = [];

  for (const patient of patients) {
    for (let day = 0; day < 14; day++) {
      const medsPerDay = rInt(2, 4);
      for (let m = 0; m < medsPerDay; m++) {
        const ts = new Date(daysAgo(14 - day));
        ts.setHours(rInt(6, 22), rInt(0, 59), 0, 0);
        docs.push({
          patientId:         patient._id,
          heartRate:         rInt(58, 105),
          oxygenSaturation:  rFloat(93, 100, 1),
          steps:             rInt(0, 12000),
          distance:          rFloat(0, 8, 2),
          respiratoryRate:   rInt(12, 22),
          sleepHours:        m === 0 ? rFloat(5, 9, 1) : undefined,
          timestamp:         ts,
          source:            pick(['apple_health', 'google_fit', 'manual']),
          syncedAt:          ts,
        });
      }
    }
  }

  await WD.deleteMany({});
  await WD.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} registros de wearables insertados`);
}

// ─── 10. CONVERSACIONES DE CHAT ───────────────────────────────────────────────
async function seedChatConversations(users, count = 60) {
  if (!ChatConversationModel) {
    console.warn('⚠️  ChatConversation model no disponible, omitiendo');
    return;
  }

  const patients = users.filter(u => u.role === 'patient');
  const docs = [];
  const suspected = ['asma', 'neumonia', 'bronquitis', 'covid19', 'gripe'];

  for (let i = 0; i < count; i++) {
    const patient  = pick(patients);
    const msgCount = rInt(3, 10);
    const messages = [];

    for (let j = 0; j < msgCount; j++) {
      messages.push({
        role:      j % 2 === 0 ? 'user' : 'bot',
        content:   j % 2 === 0
          ? `Tengo ${pick(SYMPTOMS)} desde hace ${rInt(1, 5)} días y ${pick(SYMPTOMS)}.`
          : `Entendido. Según tus síntomas, podrías tener ${pick(suspected)}. Te recomiendo ${pick(['descanso', 'hidratación', 'consultar a un médico', 'tomar medicación'])}.`,
        timestamp: new Date(+now - (count - i) * 3600000 + j * 60000),
        metadata: {
          urgencyLevel:      pick(['low', 'medium', 'high']),
          confidence:        rFloat(70, 97, 1),
          detectedDiseases:  picks(suspected, rInt(1, 3)),
          detectedSymptoms:  picks(SYMPTOMS, rInt(2, 4)),
        },
      });
    }

    const district    = pick(DISTRICTS);
    const highestUrg  = pick(['low', 'medium', 'high', 'critical']);
    const startedAt   = new Date(+now - (count - i) * 3600000);

    docs.push({
      sessionId: uuidv4(),
      userId:    patient._id.toString(),
      messages,
      userInfo:  { name: patient.name, email: patient.email, age: rInt(18, 75) },
      location:  { district: district.name, city: 'Tacna', country: 'Perú' },
      metadata:  { userAgent: 'Mozilla/5.0', ipAddress: `192.168.1.${rInt(1, 254)}`, language: 'es', source: pick(['web', 'mobile']) },
      summary: {
        totalMessages:    msgCount,
        userMessages:     Math.ceil(msgCount / 2),
        botMessages:      Math.floor(msgCount / 2),
        detectedDiseases: picks(suspected, rInt(1, 3)),
        detectedSymptoms: picks(SYMPTOMS, rInt(2, 5)),
        highestUrgency:   highestUrg,
        averageConfidence: rFloat(75, 93, 1),
      },
      status:         pick(['active', 'completed', 'completed', 'abandoned']),
      requiresFollowUp: ['high', 'critical'].includes(highestUrg),
      startedAt,
      lastActivityAt: new Date(+startedAt + msgCount * 60000),
      completedAt:    Math.random() > 0.3 ? new Date(+startedAt + msgCount * 60000) : undefined,
    });
  }

  await ChatConversationModel.deleteMany({});
  await ChatConversationModel.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} conversaciones de chat insertadas`);
}

// ─── 11. REPORTES AUTOMÁTICOS ────────────────────────────────────────────────
async function seedAutomaticReports(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const AR = AutomaticReportModel || (mongoose.models['AutomaticReport'] || mongoose.model('AutomaticReport', schema));

  const admin = users.find(u => u.role === 'admin');
  const docs  = [];

  for (let i = 0; i < 30; i++) {
    const reportType = i % 7 === 0 ? 'weekly' : (i === 0 ? 'monthly' : 'daily');
    const endDate    = daysAgo(i);
    const startDate  = new Date(endDate);
    if (reportType === 'weekly')  startDate.setDate(startDate.getDate() - 7);
    else if (reportType === 'monthly') startDate.setMonth(startDate.getMonth() - 1);
    else startDate.setHours(0, 0, 0, 0);

    docs.push({
      reportType,
      period:    { startDate, endDate },
      status:    i < 2 ? 'generating' : 'completed',
      metrics: {
        totalPatients:        rInt(8, 13),
        totalDoctors:         3,
        totalAdmins:          1,
        totalMedicalHistories: rInt(15, 40),
        totalAlerts:          rInt(20, 50),
        criticalAlerts:       rInt(2, 8),
        totalAppointments:    rInt(15, 35),
        completedAppointments: rInt(10, 28),
        aiAnalyses:           rInt(10, 25),
        averageAIConfidence:  rFloat(88, 96, 1),
        topDiagnoses:         picks(DIAGNOSES, 5).map(d => ({ diagnosis: d, count: rInt(5, 20) })),
        districtDistribution: DISTRICTS.map(d => ({ district: d.name, count: rInt(5, 40) })),
        growthMetrics: {
          patientsGrowth:  rFloat(-3, 12, 1),
          historiesGrowth: rFloat(-5, 18, 1),
          alertsGrowth:    rFloat(-10, 22, 1),
        },
      },
      anomalies:    Math.random() > 0.7 ? [{ metric: 'criticalAlerts', value: rInt(10, 20), expectedRange: { min: 0, max: 5 }, severity: pick(['medium', 'high']), description: 'Alertas críticas sobre el umbral', detectedAt: endDate }] : [],
      filePath:     i >= 2 ? `/reports/${reportType}-${endDate.toISOString().slice(0, 10)}.pdf` : undefined,
      exportedAt:   i >= 2 ? endDate : undefined,
      exportFormat: i >= 2 ? pick(['pdf', 'csv', 'json']) : undefined,
      generatedBy:  admin ? admin._id.toString() : undefined,
      generatedAt:  endDate,
    });
  }

  await AR.deleteMany({});
  await AR.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} reportes automáticos insertados`);
}

// ─── 12. EXPERIMENTOS ML ─────────────────────────────────────────────────────
async function seedMLExperiments() {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const MLExp = MLExperimentModel || (mongoose.models['MLExperiment'] || mongoose.model('MLExperiment', schema));

  const models   = ['RandomForest', 'XGBoost', 'LightGBM', 'Neural Network', 'SVM'];
  const types    = ['prediction', 'training', 'evaluation', 'rl_session', 'automl_pipeline'];
  const statuses = ['completed', 'completed', 'completed', 'failed', 'running'];
  const docs     = [];

  for (let i = 0; i < 20; i++) {
    const modelName = pick(models);
    const expType   = pick(types);
    const status    = pick(statuses);
    const startTime = rDate(daysAgo(30), daysAgo(1));
    const endTime   = status !== 'running' ? new Date(+startTime + rInt(30, 600) * 1000) : undefined;

    docs.push({
      experimentId:   uuidv4(),
      experimentType: expType,
      modelName,
      modelVersion:   `${rInt(1, 3)}.${rInt(0, 9)}.${rInt(0, 9)}`,
      status,
      hyperparameters: { nEstimators: rInt(50, 300), maxDepth: rInt(3, 10), learningRate: rFloat(0.01, 0.3, 3) },
      metrics: status === 'completed' ? {
        accuracy:     rFloat(88, 99, 2),
        precision:    rFloat(85, 99, 2),
        recall:       rFloat(84, 98, 2),
        f1Score:      rFloat(86, 99, 2),
        auc:          rFloat(0.90, 0.999, 3),
        lossHistory:  Array.from({ length: 10 }, (_, k) => rFloat(0.05, 0.5 - k * 0.04, 4)),
      } : undefined,
      performance: {
        startTime,
        endTime,
        durationMs:   endTime ? endTime - startTime : undefined,
        cpuUsage:     rFloat(20, 85, 1),
        memoryUsage:  rFloat(512, 3072, 0),
        gpuUsage:     modelName === 'Neural Network' ? rFloat(40, 95, 1) : undefined,
      },
      results: status === 'completed' ? {
        summary:         `Experimento completado con ${modelName}`,
        insights:        [`Precisión de ${rFloat(90, 99, 1)}%`, `Feature más importante: ${pick(SYMPTOMS)}`],
        recommendations: ['Desplegar en producción', 'Monitorear en producción'],
      } : undefined,
      createdAt: startTime,
      updatedAt: endTime || now,
    });
  }

  await MLExp.deleteMany({});
  await MLExp.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} experimentos ML insertados`);
}

// ─── 13. AUDIT LOGS ──────────────────────────────────────────────────────────
async function seedAuditLogs(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const AL = AuditLogModel || (mongoose.models['AuditLog'] || mongoose.model('AuditLog', schema));

  const statusCodes = [200, 200, 200, 201, 400, 401, 403, 404, 500];
  const docs = [];

  for (let i = 0; i < 250; i++) {
    const user      = Math.random() > 0.2 ? pick(users) : null;
    const method    = pick(HTTP_METHODS);
    const route     = pick(ROUTES);
    const sc        = pick(statusCodes);
    const timestamp = rDate(daysAgo(7), now);

    docs.push({
      userId:         user ? user._id.toString() : undefined,
      method,
      route,
      statusCode:     sc,
      ip:             `192.168.1.${rInt(1, 254)}`,
      userAgent:      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      payloadHash:    `sha256-${uuidv4().replace(/-/g, '')}`,
      redactedPayload: { method, route, timestamp: timestamp.toISOString(), responseStatus: sc },
      createdAt:      timestamp,
    });
  }

  await AL.deleteMany({});
  await AL.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} audit logs insertados`);
}

// ─── 14. CONSENT LOGS ────────────────────────────────────────────────────────
async function seedConsentLogs(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const CL = ConsentLogModel || (mongoose.models['ConsentLog'] || mongoose.model('ConsentLog', schema));

  const types = ['privacy_policy', 'terms_of_service', 'data_processing', 'marketing', 'analytics'];
  const docs  = [];

  for (const user of users) {
    const consents = picks(types, rInt(2, 4)).map(id => ({
      id,
      accepted:  Math.random() > 0.1,
      timestamp: rDate(daysAgo(180), now),
    }));

    const ts        = new Date(Math.min(...consents.map(c => +c.timestamp)));
    const revoked   = Math.random() > 0.85;

    docs.push({
      userId:       user._id.toString(),
      consents,
      version:      '1.2',
      ipAddress:    `192.168.1.${rInt(1, 254)}`,
      userAgent:    'Mozilla/5.0',
      timestamp:    ts,
      revokedAt:    revoked ? new Date(+ts + rInt(1, 60) * 86400000) : undefined,
      revokedReason: revoked ? 'Usuario solicitó eliminación de datos' : undefined,
    });
  }

  await CL.deleteMany({});
  await CL.insertMany(docs, { ordered: false });
  console.log(`✅ ${docs.length} consent logs insertados`);
}

// ─── 15. REFERIDOS ───────────────────────────────────────────────────────────
async function seedReferrals(users) {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const Ref = ReferralModel || (mongoose.models['Referral'] || mongoose.model('Referral', schema));

  const patients = users.filter(u => u.role === 'patient');
  const doctors  = users.filter(u => u.role === 'doctor');
  const specialties = [
    'Neumología', 'Alergología', 'Cardiología', 'Medicina Interna',
    'Pediatría', 'Otorrinolaringología', 'UCI',
  ];
  const docs = [];

  for (let i = 0; i < 20; i++) {
    const patient = pick(patients);
    const from    = pick(doctors);
    const to      = pick(doctors.filter(d => d._id.toString() !== from._id.toString()) || doctors);
    const status  = pick(['pending', 'accepted', 'accepted', 'completed', 'rejected', 'cancelled']);
    const date    = rDate(daysAgo(60), daysAhead(15));

    docs.push({
      patientId:       patient._id.toString(),
      referringDoctorId: from._id.toString(),
      referredDoctorId:  to._id.toString(),
      specialty:       pick(specialties),
      reason:          `Referido por ${pick(DIAGNOSES)}. Requiere evaluación especializada.`,
      urgency:         pick(['routine', 'urgent', 'emergency']),
      status,
      scheduledDate:   date,
      notes:           `Paciente ${patient.name}. Antecedentes de enfermedades respiratorias.`,
      acceptedAt:      ['accepted', 'completed'].includes(status) ? rDate(daysAgo(30), now) : undefined,
      completedAt:     status === 'completed' ? rDate(daysAgo(15), now) : undefined,
      rejectedReason:  status === 'rejected' ? 'Sin disponibilidad en la especialidad solicitada' : undefined,
    });
  }

  // Omitir si el modelo realmente no existe (sin tabla Referral en la BD)
  try {
    await Ref.deleteMany({});
    await Ref.insertMany(docs, { ordered: false });
    console.log(`✅ ${docs.length} referidos insertados`);
  } catch (e) {
    console.warn('⚠️  No se pudieron insertar referidos:', e.message);
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function seedCompleteSystem() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║      RespiCare - Seed Completo del Sistema           ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize:              10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS:          45000,
    });
    console.log(`✅ Conectado a: ${MONGODB_URI.replace(/:([^@]+)@/, ':****@')}\n`);

    // ── Ejecución secuencial (algunas dependen de usuarios) ────────────────
    console.log('👥 [1/15] Usuarios...');
    const users = await seedUsers();

    console.log('📋 [2/15] Historias médicas...');
    const histories = await seedMedicalHistories(users);

    console.log('📅 [3/15] Citas médicas...');
    await seedAppointments(users);

    console.log('💊 [4/15] Prescripciones...');
    await seedPrescriptions(users);

    console.log('🧪 [5/15] Resultados de laboratorio...');
    await seedLabResults(users);

    console.log('🔔 [6/15] Alertas...');
    await seedAlerts(users);

    console.log('🤖 [7/15] Análisis de IA...');
    await seedAIAnalyses(histories);

    console.log('📊 [8/15] Reportes de síntomas (dashboards)...');
    await seedSymptomReports(1000);

    console.log('⌚ [9/15] Datos de wearables...');
    await seedWearableData(users);

    console.log('💬 [10/15] Conversaciones de chat...');
    await seedChatConversations(users, 60);

    console.log('📈 [11/15] Reportes automáticos...');
    await seedAutomaticReports(users);

    console.log('🔬 [12/15] Experimentos ML...');
    await seedMLExperiments();

    console.log('📝 [13/15] Audit logs...');
    await seedAuditLogs(users);

    console.log('✅ [14/15] Consent logs...');
    await seedConsentLogs(users);

    console.log('🔗 [15/15] Referidos...');
    await seedReferrals(users);

    // ── Resumen ────────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════════════');
    console.log('📊 Documentos insertados por colección:');

    const colCounters = {
      users:              await (UserModel || mongoose.model('User')).countDocuments(),
      medicalHistories:   await (MedicalHistoryModel || mongoose.model('MedicalHistory')).countDocuments(),
      appointments:       await (AppointmentModel || mongoose.model('Appointment')).countDocuments(),
      prescriptions:      await (PrescriptionModel || mongoose.model('Prescription')).countDocuments(),
      labResults:         await (LabResultModel || mongoose.model('LabResult')).countDocuments(),
      alerts:             await (AlertModel || mongoose.model('Alert')).countDocuments(),
      aiAnalyses:         await (AIAnalysisModel || mongoose.model('AIAnalysis')).countDocuments(),
      symptomReports:     SymptomReportModel ? await SymptomReportModel.countDocuments() : 'N/A',
      wearableData:       await (WearableDataModel || mongoose.model('WearableData')).countDocuments(),
      chatConversations:  ChatConversationModel ? await ChatConversationModel.countDocuments() : 'N/A',
      automaticReports:   await (AutomaticReportModel || mongoose.model('AutomaticReport')).countDocuments(),
      mlExperiments:      await (MLExperimentModel || mongoose.model('MLExperiment')).countDocuments(),
      auditLogs:          await (AuditLogModel || mongoose.model('AuditLog')).countDocuments(),
      consentLogs:        await (ConsentLogModel || mongoose.model('ConsentLog')).countDocuments(),
      referrals:          await (ReferralModel || mongoose.model('Referral')).countDocuments(),
    };

    for (const [col, count] of Object.entries(colCounters)) {
      console.log(`   ${col.padEnd(22)}: ${String(count).padStart(6)}`);
    }

    console.log('\n══════════════════════════════════════════════════════');
    console.log('🔑 Credenciales de acceso:');
    console.log('');
    console.log('   ROL      │ EMAIL                        │ CONTRASEÑA');
    console.log('   ─────────┼──────────────────────────────┼───────────');
    console.log('   admin    │ admin@demo.com               │ admin1234');
    console.log('   doctor   │ doctor@demo.com              │ demo1234');
    console.log('   doctor   │ laura.martinez@demo.com      │ demo1234');
    console.log('   doctor   │ roberto.condori@demo.com     │ demo1234');
    console.log('   paciente │ paciente@demo.com            │ demo1234');
    console.log('   paciente │ juan.perez@demo.com          │ demo1234');
    console.log('   paciente │ maria.garcia@demo.com        │ demo1234');
    console.log('   paciente │ carlos.mendoza@demo.com      │ demo1234');
    console.log('   paciente │ ana.lopez@demo.com           │ demo1234');
    console.log('   paciente │ pedro.quispe@demo.com        │ demo1234');
    console.log('   paciente │ sofia.mamani@demo.com        │ demo1234');
    console.log('   paciente │ luis.caceres@demo.com        │ demo1234');
    console.log('');
    console.log('✅ Seed completado exitosamente.');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Error durante el seed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
  }
}

if (require.main === module) {
  seedCompleteSystem();
}

module.exports = { seedCompleteSystem };