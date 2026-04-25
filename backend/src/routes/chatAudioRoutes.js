/**
 * Chat Audio Routes
 * API endpoints for audio transcription and cough analysis in chat
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// FormData is available natively in Node.js 18+, but we can also use form-data package
let FormData;
try {
  FormData = require('form-data');
} catch (e) {
  // If form-data package is not available, we'll use a simple approach with axios
  console.warn('form-data package not found, using alternative approach');
}

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow various audio formats
    const allowedMimes = [
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp3',
      'audio/x-m4a',
      'audio/aac'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo de audio no permitido'), false);
    }
  }
});

// Get AI Service URL
const getAiServiceUrl = () => {
  return process.env.AI_SERVICE_URL || 'http://ai-services:8000';
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido'
    });
  }
  
  try {
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación inválido'
    });
  }
};

/**
 * @route   POST /api/v1/chat/transcribe
 * @desc    Transcribe audio to text
 * @access  Private
 */
router.post('/transcribe', verifyToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo de audio'
      });
    }

    console.log('🎤 Transcribing audio:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      userId: req.user.userId
    });

    const aiServiceUrl = getAiServiceUrl();
    
    // Try to call AI service for transcription
    try {
      // Convert audio buffer to base64
      const audioBase64 = req.file.buffer.toString('base64');
      
      // Determine audio format from mimetype
      let audioFormat = 'webm';
      if (req.file.mimetype.includes('mp4')) audioFormat = 'mp4';
      else if (req.file.mimetype.includes('mp3')) audioFormat = 'mp3';
      else if (req.file.mimetype.includes('wav')) audioFormat = 'wav';
      else if (req.file.mimetype.includes('ogg')) audioFormat = 'ogg';

      const aiResponse = await axios.post(
        `${aiServiceUrl}/api/v1/audio/transcribe`,
        {
          audio_base64: audioBase64,
          audio_format: audioFormat,
          analysis_type: 'transcription'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      // Handle different response formats
      const aiData = aiResponse.data;
      if (aiData && (aiData.transcription || aiData.text)) {
        const transcription = aiData.transcription || aiData.text;
        return res.json({
          success: true,
          text: transcription,
          transcription: transcription,
          confidence: aiData.confidence || aiData.transcription?.confidence || null,
          language: aiData.language || aiData.transcription?.language || 'es'
        });
      }
    } catch (aiError) {
      console.warn('⚠️ AI service transcription failed, using mock:', aiError.message);
    }

    // Fallback: Mock transcription for development
    // In production, this should return an error or use a different service
    console.log('📝 Using mock transcription');
    
    res.json({
      success: true,
      text: '[Transcripción simulada] El usuario ha enviado un mensaje de voz que será procesado.',
      transcription: '[Transcripción simulada] El usuario ha enviado un mensaje de voz que será procesado.',
      confidence: 0.85,
      language: 'es',
      message: 'Transcripción simulada (servicio de AI no disponible)'
    });

  } catch (error) {
    console.error('❌ Error transcribing audio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al transcribir el audio',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/chat/analyze-cough
 * @desc    Analyze cough audio for medical assessment
 * @access  Private
 */
router.post('/analyze-cough', verifyToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo de audio'
      });
    }

    const { sessionId } = req.body;

    console.log('🫁 Analyzing cough:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      sessionId,
      userId: req.user.userId
    });

    const aiServiceUrl = getAiServiceUrl();
    
    // Try to call AI service for cough analysis
    try {
      // Convert audio buffer to base64
      const audioBase64 = req.file.buffer.toString('base64');
      
      // Determine audio format from mimetype
      let audioFormat = 'webm';
      if (req.file.mimetype.includes('mp4')) audioFormat = 'mp4';
      else if (req.file.mimetype.includes('mp3')) audioFormat = 'mp3';
      else if (req.file.mimetype.includes('wav')) audioFormat = 'wav';
      else if (req.file.mimetype.includes('ogg')) audioFormat = 'ogg';

      const aiResponse = await axios.post(
        `${aiServiceUrl}/api/v1/audio/cough`,
        {
          audio_base64: audioBase64,
          audio_format: audioFormat,
          analysis_type: 'cough_detection'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 45000 // 45 seconds timeout for analysis
        }
      );

      // Handle AI service response
      const aiData = aiResponse.data;
      if (aiData && aiData.success && aiData.cough_analysis) {
        const coughData = aiData.cough_analysis;
        return res.json({
          success: true,
          analysis: coughData.characteristics?.join(', ') || 'Tos detectada',
          result: `Tos ${coughData.severity || 'moderada'} detectada. ${coughData.recommendations?.join(' ') || ''}`,
          confidence: coughData.confidence || null,
          recommendations: coughData.recommendations || [],
          severity: coughData.severity || coughData.urgency_level || 'moderate',
          fullAnalysis: coughData
        });
      }
    } catch (aiError) {
      console.warn('⚠️ AI service cough analysis failed, using mock:', aiError.message);
    }

    // Fallback: Mock analysis for development
    console.log('🫁 Using mock cough analysis');
    
    const mockAnalysis = {
      type: 'cough',
      characteristics: {
        duration: 'short',
        frequency: 'moderate',
        intensity: 'moderate',
        sound: 'dry'
      },
      assessment: 'Tos seca de intensidad moderada detectada. Recomendamos consultar con un médico si los síntomas persisten o empeoran.',
      recommendations: [
        'Mantente hidratado',
        'Evita irritantes como el humo o el polvo',
        'Descansa adecuadamente',
        'Considera usar un humidificador si el ambiente está seco',
        'Consulta con un médico si la tos persiste por más de 3 días'
      ],
      urgency: 'moderate',
      confidence: 0.75
    };
    
    res.json({
      success: true,
      analysis: mockAnalysis.assessment,
      result: mockAnalysis.assessment,
      fullAnalysis: mockAnalysis,
      recommendations: mockAnalysis.recommendations,
      severity: mockAnalysis.urgency,
      confidence: mockAnalysis.confidence,
      message: 'Análisis simulado (servicio de AI no disponible)'
    });

  } catch (error) {
    console.error('❌ Error analyzing cough:', error);
    res.status(500).json({
      success: false,
      message: 'Error al analizar la tos',
      error: error.message
    });
  }
});

module.exports = router;

