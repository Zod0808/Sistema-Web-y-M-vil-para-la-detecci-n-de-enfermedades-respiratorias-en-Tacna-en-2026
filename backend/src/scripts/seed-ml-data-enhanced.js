/**
 * Enhanced ML Data Seed Script
 * Genera datos realistas de experimentos ML y métricas de monitoreo
 * 
 * Este script:
 * 1. Genera experimentos ML realistas para los 3 modelos principales
 * 2. Genera métricas de monitoreo basadas en predicciones simuladas
 * 3. Crea logs y resultados detallados para cada experimento
 */

const mongoose = require('mongoose');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27018/respicare_dev?authSource=admin';

// Modelos ML disponibles
const ML_MODELS = [
  { name: 'XGBoost', version: '1.2.0', type: 'gradient_boosting' },
  { name: 'Random Forest', version: '2.1.0', type: 'ensemble' },
  { name: 'Neural Network', version: '1.0.0', type: 'neural_network' }
];

// Tipos de experimentos
const EXPERIMENT_TYPES = ['prediction', 'training', 'evaluation', 'rl_session', 'fl_round'];
const STATUSES = ['completed', 'running', 'failed', 'pending'];
const DISEASES = ['asma', 'neumonia', 'bronquitis', 'covid19', 'gripe', 'epoc', 'resfriado'];

// Síntomas comunes
const SYMPTOMS = [
  'tos', 'fiebre', 'dificultad_respiratoria', 'dolor_pecho', 'fatiga',
  'congestion_nasal', 'dolor_garganta', 'dolor_cabeza', 'escalofrios', 'sudoracion'
];

/**
 * Genera un experimento ML realista
 */
function generateMLExperiment(index, model, experimentType) {
  const now = new Date();
  const startTime = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Últimos 30 días
  const duration = Math.floor(Math.random() * 3600000) + 60000; // 1 min a 1 hora
  const endTime = new Date(startTime.getTime() + duration);
  
  const status = index < 15 ? 'completed' : (index < 18 ? 'running' : 'failed');
  
  // Generar inputs realistas
  const numSamples = Math.floor(Math.random() * 1000) + 50;
  const selectedSymptoms = SYMPTOMS.slice(0, Math.floor(Math.random() * 5) + 3);
  
  const inputs = {
    symptoms: selectedSymptoms,
    patient_age: Math.floor(Math.random() * 60) + 10,
    num_samples: numSamples,
    features: selectedSymptoms.length,
    training_data: {
      samples: numSamples,
      features: selectedSymptoms.length,
      distribution: {
        asma: Math.random() * 0.3,
        neumonia: Math.random() * 0.2,
        bronquitis: Math.random() * 0.25,
        covid19: Math.random() * 0.15,
        gripe: Math.random() * 0.1
      }
    }
  };
  
  // Generar outputs realistas
  const predictedDisease = DISEASES[Math.floor(Math.random() * DISEASES.length)];
  const confidence = status === 'completed' ? (Math.random() * 0.3 + 0.7) : (Math.random() * 0.5);
  
  const outputs = {
    prediction: {
      disease: predictedDisease,
      confidence: confidence,
      urgency_level: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low'
    },
    metrics: status === 'completed' ? {
      accuracy: Math.random() * 0.15 + 0.85,
      precision: Math.random() * 0.15 + 0.82,
      recall: Math.random() * 0.15 + 0.80,
      f1: Math.random() * 0.15 + 0.81,
      loss: Math.random() * 0.1 + 0.15
    } : null,
    shap_values: status === 'completed' ? selectedSymptoms.map(s => ({
      feature: s,
      importance: Math.random()
    })).sort((a, b) => b.importance - a.importance) : null
  };
  
  // Generar logs
  const logs = [];
  const logLevels = ['info', 'debug', 'warning'];
  for (let i = 0; i < Math.floor(Math.random() * 10) + 5; i++) {
    logs.push({
      timestamp: new Date(startTime.getTime() + (duration / 10) * i),
      level: logLevels[Math.floor(Math.random() * logLevels.length)],
      message: `Step ${i + 1}: Processing ${numSamples} samples`,
      data: { step: i + 1, samples_processed: Math.floor((numSamples / 10) * (i + 1)) }
    });
  }
  
  // Generar errores si el status es failed
  const errors = status === 'failed' ? [{
    timestamp: new Date(endTime.getTime() - 1000),
    error: 'Model convergence failed',
    stack: 'Error: Model convergence failed\n    at TrainingStep.execute',
    context: { iteration: Math.floor(Math.random() * 100), loss: 0.5 }
  }] : [];
  
  // Generar resultados
  const results = status === 'completed' ? {
    summary: `Experiment completed successfully with ${numSamples} samples`,
    insights: [
      `Model ${model.name} achieved ${(outputs.metrics.accuracy * 100).toFixed(1)}% accuracy`,
      `Most important feature: ${outputs.shap_values?.[0]?.feature || 'N/A'}`,
      `Predicted disease: ${predictedDisease} with ${(confidence * 100).toFixed(1)}% confidence`
    ],
    recommendations: [
      'Model performance is within acceptable range',
      'Consider retraining with more diverse data',
      'Monitor predictions for edge cases'
    ],
    nextSteps: [
      'Deploy model to production',
      'Set up monitoring alerts',
      'Schedule next evaluation in 7 days'
    ]
  } : null;
  
  return {
    experimentId: `exp-${model.name.toLowerCase().replace(' ', '-')}-${Date.now()}-${index}`,
    experimentType: experimentType,
    modelName: model.name,
    modelVersion: model.version,
    status: status,
    metadata: {
      userId: `user-${Math.floor(Math.random() * 50) + 1}`,
      sessionId: `session-${uuidv4()}`,
      environment: 'development',
      modelType: model.type
    },
    inputs: inputs,
    outputs: outputs,
    logs: logs,
    errors: errors,
    performance: {
      startTime: startTime,
      endTime: status === 'completed' ? endTime : null,
      durationMs: status === 'completed' ? duration : null,
      cpuUsage: Math.random() * 30 + 20,
      memoryUsage: Math.random() * 2048 + 1024,
      gpuUsage: model.type === 'neural_network' ? Math.random() * 50 + 30 : null
    },
    results: results,
    createdAt: startTime,
    updatedAt: status === 'completed' ? endTime : new Date()
  };
}

/**
 * Genera métricas de monitoreo ML basadas en predicciones
 */
function generateMLMonitoringMetrics() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Simular predicciones de los últimos 7 días
  const totalPredictions = Math.floor(Math.random() * 500) + 200;
  const highConfidence = Math.floor(totalPredictions * 0.6);
  const mediumConfidence = Math.floor(totalPredictions * 0.3);
  const lowConfidence = totalPredictions - highConfidence - mediumConfidence;
  
  const avgConfidence = (highConfidence * 0.9 + mediumConfidence * 0.7 + lowConfidence * 0.4) / totalPredictions;
  
  return {
    summary: {
      total_predictions: totalPredictions,
      avg_confidence: avgConfidence,
      low_confidence_predictions: lowConfidence,
      low_confidence_percentage: (lowConfidence / totalPredictions) * 100
    },
    quality_metrics: {
      high_confidence_rate: (highConfidence / totalPredictions) * 100,
      medium_confidence_rate: (mediumConfidence / totalPredictions) * 100,
      low_confidence_rate: (lowConfidence / totalPredictions) * 100
    },
    daily_predictions: Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 100) + 20,
        avg_confidence: Math.random() * 0.2 + 0.7
      };
    }),
    model_performance: ML_MODELS.map(model => ({
      model_name: model.name,
      predictions: Math.floor(totalPredictions / ML_MODELS.length) + Math.floor(Math.random() * 50),
      avg_confidence: Math.random() * 0.15 + 0.75,
      accuracy: Math.random() * 0.1 + 0.85
    }))
  };
}

/**
 * Ejecuta consultas reales a los modelos ML para generar datos
 */
async function executeRealMLQueries() {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const queries = [];
  
  // Generar 10 consultas de ejemplo con diferentes síntomas
  const symptomCombinations = [
    ['tos', 'fiebre', 'dificultad_respiratoria'],
    ['congestion_nasal', 'dolor_garganta'],
    ['tos', 'fatiga', 'dolor_pecho'],
    ['fiebre', 'escalofrios', 'dolor_cabeza'],
    ['dificultad_respiratoria', 'dolor_pecho'],
    ['tos', 'congestion_nasal'],
    ['fiebre', 'fatiga', 'sudoracion'],
    ['dolor_garganta', 'dolor_cabeza'],
    ['tos', 'fiebre', 'fatiga'],
    ['dificultad_respiratoria', 'dolor_pecho', 'fatiga']
  ];
  
  for (let i = 0; i < symptomCombinations.length; i++) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/api/v1/symptom-analyzer/ml-analyze`, {
        symptoms: symptomCombinations[i],
        patient_age: Math.floor(Math.random() * 60) + 10,
        include_explanation: true
      }, {
        timeout: 5000
      });
      
      queries.push({
        symptoms: symptomCombinations[i],
        result: response.data,
        timestamp: new Date()
      });
      
      console.log(`✅ Query ${i + 1} completed: ${response.data.disease} (${(response.data.confidence * 100).toFixed(1)}%)`);
    } catch (error) {
      console.warn(`⚠️ Query ${i + 1} failed: ${error.message}`);
      // Continuar con datos simulados si falla
      queries.push({
        symptoms: symptomCombinations[i],
        result: {
          disease: DISEASES[Math.floor(Math.random() * DISEASES.length)],
          confidence: Math.random() * 0.3 + 0.7,
          urgency_level: Math.random() > 0.5 ? 'medium' : 'high'
        },
        timestamp: new Date(),
        simulated: true
      });
    }
    
    // Pequeña pausa entre consultas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return queries;
}

/**
 * Función principal
 */
async function seedMLData() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
    
    // Obtener o crear modelo MLExperiment
    let MLExperiment;
    try {
      MLExperiment = mongoose.model('MLExperiment');
    } catch (e) {
      const MLExperimentSchema = new mongoose.Schema({
        experimentId: { type: String, required: true, unique: true, index: true },
        experimentType: {
          type: String,
          enum: ['rl_session', 'fl_round', 'automl_pipeline', 'prediction', 'training', 'evaluation'],
          required: true,
          index: true
        },
        modelName: { type: String, required: true, index: true },
        modelVersion: String,
        status: {
          type: String,
          enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
          default: 'pending',
          index: true
        },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        inputs: { type: mongoose.Schema.Types.Mixed, default: {} },
        outputs: { type: mongoose.Schema.Types.Mixed, default: {} },
        logs: { type: [mongoose.Schema.Types.Mixed], default: [] },
        errors: { type: [mongoose.Schema.Types.Mixed], default: [] },
        performance: {
          startTime: { type: Date, default: Date.now },
          endTime: Date,
          durationMs: Number,
          cpuUsage: Number,
          memoryUsage: Number,
          gpuUsage: Number
        },
        results: { type: mongoose.Schema.Types.Mixed }
      }, {
        timestamps: true,
        collection: 'mlexperiments'
      });
      MLExperiment = mongoose.model('MLExperiment', MLExperimentSchema);
    }
    
    // Limpiar experimentos existentes
    console.log('🧹 Limpiando experimentos ML existentes...');
    await MLExperiment.deleteMany({});
    
    // Generar experimentos ML realistas
    console.log('🤖 Generando experimentos ML realistas...');
    const experiments = [];
    
    for (let i = 0; i < 20; i++) {
      const model = ML_MODELS[i % ML_MODELS.length];
      const experimentType = EXPERIMENT_TYPES[Math.floor(Math.random() * EXPERIMENT_TYPES.length)];
      const experiment = generateMLExperiment(i, model, experimentType);
      experiments.push(experiment);
    }
    
    // Insertar experimentos
    await MLExperiment.insertMany(experiments);
    console.log(`✅ Insertados ${experiments.length} experimentos ML`);
    
    // Ejecutar consultas reales a los modelos (opcional)
    console.log('🔬 Ejecutando consultas reales a los modelos ML...');
    const realQueries = await executeRealMLQueries();
    console.log(`✅ Completadas ${realQueries.length} consultas a los modelos`);
    
    // Generar métricas de monitoreo (se almacenarán en cache o se calcularán on-the-fly)
    console.log('📊 Métricas de monitoreo se calcularán dinámicamente desde los experimentos');
    
    console.log('\n✅ Seed de datos ML completado exitosamente!');
    console.log(`📈 Experimentos generados: ${experiments.length}`);
    console.log(`🔬 Consultas ejecutadas: ${realQueries.length}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed ML data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedMLData();
}

module.exports = { seedMLData, generateMLExperiment, generateMLMonitoringMetrics };

