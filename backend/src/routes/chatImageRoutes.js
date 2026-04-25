/**
 * Chat Image Routes
 * API endpoints for image analysis in chat
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

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
 * @route   POST /api/v1/chat/analyze-image
 * @desc    Analyze medical image
 * @access  Private
 */
router.post('/analyze-image', verifyToken, async (req, res) => {
  try {
    const { image, image_type, sessionId } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó imagen'
      });
    }

    if (!image_type) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de imagen es requerido'
      });
    }

    console.log('🖼️ Analyzing image:', {
      imageType: image_type,
      imageSize: image.length,
      sessionId,
      userId: req.user.userId
    });

    const aiServiceUrl = getAiServiceUrl();
    
    // Try to call AI service for image analysis
    try {
      // Prepare image - if it's base64 without data:image prefix, add it
      let imageData = image;
      if (!image.startsWith('data:image')) {
        // Assume it's raw base64, determine format from image_type or default to jpeg
        const formatMap = {
          'chest_xray': 'jpeg',
          'chest_ct': 'jpeg',
          'spirometry': 'png',
          'oximetry': 'png',
          'sputum': 'jpeg',
          'skin_rash': 'jpeg',
          'cyanosis': 'jpeg',
          'other': 'jpeg'
        };
        const format = formatMap[image_type] || 'jpeg';
        imageData = `data:image/${format};base64,${image}`;
      }
      
      const aiResponse = await axios.post(
        `${aiServiceUrl}/api/v1/ml/advanced/image`,
        {
          images: [imageData], // Base64 image with data:image prefix
          model_name: 'resnet50',
          image_type: image_type,
          image_metadata: {
            type: image_type,
            category: 'diagnostic',
            sessionId: sessionId,
            userId: req.user.userId
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 45000 // 45 seconds timeout for image analysis
        }
      );

      // Handle AI service response
      if (aiResponse.data && aiResponse.data.predictions && aiResponse.data.predictions.length > 0) {
        const prediction = aiResponse.data.predictions[0];
        const analysisResult = {
          image_type: image_type,
          top_prediction: prediction.top_label || 'No clasificado',
          labels: prediction.labels || [],
          scores: prediction.scores || [],
          confidence: prediction.scores && prediction.scores.length > 0 ? prediction.scores[0] : 0,
          analysis: `Análisis de ${image_type}: ${prediction.top_label} (confianza: ${((prediction.scores && prediction.scores.length > 0 ? prediction.scores[0] : 0) * 100).toFixed(1)}%)`
        };
        
        return res.json({
          success: true,
          analysis: analysisResult.analysis,
          result: analysisResult.analysis,
          fullAnalysis: analysisResult,
          confidence: analysisResult.confidence,
          topPrediction: analysisResult.top_prediction
        });
      }
    } catch (aiError) {
      console.warn('⚠️ AI service image analysis failed, using mock:', aiError.message);
    }

    // Fallback: Mock analysis for development
    console.log('🖼️ Using mock image analysis');
    
    const mockAnalysis = {
      image_type: image_type,
      analysis: `Análisis de ${image_type} completado. La imagen ha sido procesada y analizada. Recomendamos consultar con un profesional médico para una evaluación más detallada.`,
      confidence: 0.75,
      recommendations: [
        'Consulta con un médico para una evaluación completa',
        'Mantén un registro de las imágenes para seguimiento',
        'Comparte los resultados con tu equipo médico'
      ]
    };
    
    res.json({
      success: true,
      analysis: mockAnalysis.analysis,
      result: mockAnalysis.analysis,
      fullAnalysis: mockAnalysis,
      confidence: mockAnalysis.confidence,
      recommendations: mockAnalysis.recommendations,
      message: 'Análisis simulado (servicio de AI no disponible)'
    });

  } catch (error) {
    console.error('❌ Error analyzing image:', error);
    res.status(500).json({
      success: false,
      message: 'Error al analizar la imagen',
      error: error.message
    });
  }
});

module.exports = router;

