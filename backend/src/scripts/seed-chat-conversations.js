/**
 * Seed Chat Conversations Script - JavaScript version
 * Creates demo chat conversations for dashboard
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/respicare_dev';

// Load models
const ChatConversationModel = require('../models/ChatConversation');
let UserModel;
try {
  UserModel = require('../models/User');
} catch (error) {
  console.warn('Could not load User model:', error.message);
}

const DISTRICTS = [
  'Centro de Tacna',
  'Gregorio Albarracín',
  'Ciudad Nueva',
  'Alto de la Alianza',
  'Boca del Río',
  'Pocollay',
  'Calana',
  'Pachia'
];

const SYMPTOMS = [
  'tos', 'fiebre', 'dificultad respiratoria', 'sibilancias', 'fatiga',
  'dolor de pecho', 'congestión nasal', 'dolor de garganta', 'escalofríos'
];

const DISEASES = [
  'Asma bronquial',
  'Bronquitis aguda',
  'Neumonía',
  'COVID-19',
  'Gripe',
  'Resfriado común'
];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateChatConversations(count = 50, patients = []) {
  const conversations = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Last 30 days
  const endDate = new Date();

  for (let i = 0; i < count; i++) {
    const patient = patients.length > 0 ? patients[Math.floor(Math.random() * patients.length)] : null;
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const symptoms = [
      SYMPTOMS[Math.floor(Math.random() * SYMPTOMS.length)],
      SYMPTOMS[Math.floor(Math.random() * SYMPTOMS.length)]
    ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
    
    const disease = DISEASES[Math.floor(Math.random() * DISEASES.length)];
    const startedAt = randomDate(startDate, endDate);
    const urgency = Math.random() > 0.7 ? 'high' : (Math.random() > 0.4 ? 'medium' : 'low');
    const confidence = 0.75 + Math.random() * 0.2; // 0.75 - 0.95

    const messages = [];
    let messageTime = new Date(startedAt);

    // User initial message
    messages.push({
      role: 'user',
      content: `Hola, tengo ${symptoms[0]} desde hace ${Math.floor(Math.random() * 7) + 2} días. ¿Podrían orientarme?`,
      timestamp: new Date(messageTime),
      metadata: {
        detectedSymptoms: symptoms,
        questionType: 'symptom_report'
      }
    });
    messageTime = new Date(messageTime.getTime() + 2 * 60 * 1000); // 2 minutes later

    // Bot response
    messages.push({
      role: 'bot',
      content: `Hola${patient ? ` ${patient.name.split(' ')[0]}` : ''}, gracias por contactarnos. Con esos síntomas podríamos estar ante ${disease}. Te voy a dar algunas recomendaciones.`,
      timestamp: new Date(messageTime),
      metadata: {
        detectedDiseases: [disease],
        detectedSymptoms: symptoms,
        confidence: confidence,
        urgencyLevel: urgency
      }
    });
    messageTime = new Date(messageTime.getTime() + 3 * 60 * 1000); // 3 minutes later

    // User follow-up
    messages.push({
      role: 'user',
      content: '¿Qué debo hacer?',
      timestamp: new Date(messageTime),
      metadata: {
        questionType: 'follow_up'
      }
    });
    messageTime = new Date(messageTime.getTime() + 2 * 60 * 1000); // 2 minutes later

    // Bot final response
    messages.push({
      role: 'bot',
      content: `Te recomiendo descansar, mantenerte hidratado y monitorear tus síntomas. Si empeoran o tienes dificultad para respirar, busca atención médica inmediata.`,
      timestamp: new Date(messageTime),
      metadata: {
        detectedDiseases: [disease],
        confidence: confidence,
        urgencyLevel: urgency
      }
    });

    const lastActivityAt = new Date(messageTime);
    const sessionId = `demo-chat-${startedAt.getTime()}-${i}-${Math.floor(Math.random() * 10000)}`;

    conversations.push({
      sessionId,
      userId: patient ? patient._id.toString() : null,
      messages,
      userInfo: patient ? {
        name: patient.name,
        email: patient.email
      } : {
        name: 'Usuario Anónimo',
        email: null
      },
      location: {
        district,
        city: 'Tacna',
        country: 'Perú'
      },
      metadata: {
        userAgent: 'RespiCare-Demo/1.0',
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
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
      lastActivityAt,
      completedAt: lastActivityAt,
      createdAt: startedAt,
      updatedAt: lastActivityAt
    });
  }

  return conversations;
}

async function seedChatConversations() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB');

    // Get patients if available
    let patients = [];
    if (UserModel) {
      patients = await UserModel.find({ role: 'patient', isActive: true }).lean();
      console.log(`✅ Found ${patients.length} patients`);
    }

    // Clear existing demo conversations
    console.log('🗑️  Clearing existing demo chat conversations...');
    const deletedCount = await ChatConversationModel.deleteMany({
      sessionId: { $regex: '^demo-chat-' }
    });
    console.log(`✅ Cleared ${deletedCount.deletedCount} existing conversations`);

    // Generate conversations
    console.log('💬 Generating chat conversations...');
    const conversations = generateChatConversations(50, patients);

    console.log(`💬 Inserting ${conversations.length} chat conversations...`);
    
    // Insert in batches
    const batchSize = 20;
    let totalInserted = 0;
    for (let i = 0; i < conversations.length; i += batchSize) {
      const batch = conversations.slice(i, i + batchSize);
      await ChatConversationModel.insertMany(batch);
      totalInserted += batch.length;
      console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(conversations.length / batchSize)} (${totalInserted}/${conversations.length})`);
    }

    // Get statistics
    console.log('\n📊 Getting statistics...');
    const totalConversations = await ChatConversationModel.countDocuments();
    const recentConversations = await ChatConversationModel.countDocuments({
      startedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const urgentConversations = await ChatConversationModel.countDocuments({
      'summary.highestUrgency': 'high'
    });

    console.log(`\n✅ Total chat conversations in database: ${totalConversations}`);
    console.log(`✅ Recent conversations (last 7 days): ${recentConversations}`);
    console.log(`✅ Urgent conversations: ${urgentConversations}`);
    console.log('✅ Chat conversations seeding completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding chat conversations:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  seedChatConversations();
}

module.exports = { seedChatConversations };

