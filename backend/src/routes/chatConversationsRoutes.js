/**
 * Chat Conversations Routes
 * API endpoints for chatbot conversations
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Controllers will be loaded dynamically
let ChatConversation;

// Initialize mongoose connection
const initializeModel = () => {
  if (!ChatConversation) {
    try {
      const mongoose = require('mongoose');
      // Only connect if not already connected
      if (mongoose.connection.readyState === 0) {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password123@mongodb:27017/respicare_dev?authSource=admin';
        mongoose.connect(mongoUri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000
        }).then(() => {
          console.log('✅ MongoDB connected for chat conversations');
        }).catch(err => {
          console.error('❌ MongoDB connection error:', err.message);
        });
      }
      ChatConversation = require('../models/ChatConversation');
    } catch (error) {
      console.error('Error loading ChatConversation model:', error);
    }
  }
  return ChatConversation;
};

/**
 * @route   POST /api/chat-conversations
 * @desc    Create a new chat conversation (start session)
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const { userId, userInfo, location, metadata } = req.body;
    
    // Generate session ID
    const sessionId = uuidv4();
    
    // Create new conversation
    const conversation = new Model({
      sessionId,
      userId,
      userInfo,
      location: {
        ...location,
        city: 'Tacna',
        country: 'Perú'
      },
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });
    
    await conversation.save();

    res.status(201).json({
      success: true,
      message: 'Chat conversation created',
      data: {
        sessionId: conversation.sessionId,
        _id: conversation._id
      }
    });
  } catch (error) {
    console.error('Error creating chat conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating chat conversation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/chat-conversations/:sessionId/messages
 * @desc    Add a message to a conversation and get AI response
 * @access  Public
 */
router.post('/:sessionId/messages', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const { sessionId } = req.params;
    const { role, content, metadata } = req.body;
    
    if (!role || !content) {
      return res.status(400).json({
        success: false,
        message: 'Role and content are required'
      });
    }
    
    const conversation = await Model.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Ensure summary is initialized before adding message
    if (!conversation.summary) {
      conversation.summary = {
        totalMessages: 0,
        userMessages: 0,
        botMessages: 0,
        detectedDiseases: [],
        detectedSymptoms: [],
        highestUrgency: 'low',
        averageConfidence: 0
      };
    }
    
    // Ensure summary arrays are initialized
    if (!Array.isArray(conversation.summary.detectedDiseases)) {
      conversation.summary.detectedDiseases = [];
    }
    if (!Array.isArray(conversation.summary.detectedSymptoms)) {
      conversation.summary.detectedSymptoms = [];
    }
    
    // Validate and normalize highestUrgency to ensure it's a valid enum value
    const validUrgencyLevels = ['very_low', 'low', 'medium', 'high', 'critical'];
    if (!validUrgencyLevels.includes(conversation.summary.highestUrgency)) {
      console.warn(`⚠️ Invalid urgency level "${conversation.summary.highestUrgency}", resetting to 'low'`);
      conversation.summary.highestUrgency = 'low';
    }
    
    // Add user message
    conversation.addMessage(role, content, metadata || {});
    
    // Validate before saving
    try {
      await conversation.save();
    } catch (saveError) {
      console.error('❌ Error saving user message:', saveError);
      console.error('Save error details:', {
        message: saveError.message,
        name: saveError.name,
        errors: saveError.errors,
        sessionId: conversation.sessionId,
        messagesCount: conversation.messages.length,
        summary: conversation.summary
      });
      throw saveError;
    }

    // Generate AI response if it's a user message
    let assistantMessage = null;
    if (role === 'user') {
      try {
        const axios = require('axios');
        const aiServiceURL = process.env.AI_SERVICE_URL || 'http://ai-services:8000';
        
        // Prepare conversation history for AI service
        const conversationHistory = conversation.messages
          .slice(-10) // Last 10 messages for context
          .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          }));
        
        // Call AI service to generate response
        // The chat analyzer router is registered with prefix="/api" and route="/v1/analyze"
        // So the full path is /api/v1/analyze
        const chatAnalyzeURL = `${aiServiceURL}/api/v1/analyze`;
        console.log(`🤖 Calling AI service: ${chatAnalyzeURL} for session ${sessionId}`);
        console.log(`📤 Request payload:`, {
          message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          conversation_history_length: conversationHistory.length,
          session_id: sessionId,
          has_context: !!conversation.userId
        });
        
        const requestPayload = {
          message: content,
          conversation_history: conversationHistory,
          session_id: sessionId,
          context: {
            userId: conversation.userId,
            location: conversation.location,
            metadata: conversation.metadata
          }
        };
        
        const aiResponse = await axios.post(
          chatAnalyzeURL,
          requestPayload,
          {
            timeout: 30000, // 30 seconds timeout
            headers: {
              'Content-Type': 'application/json'
            },
            validateStatus: (status) => status < 500 // Don't throw on 4xx errors
          }
        );
        
        console.log(`✅ AI service responded for session ${sessionId}`, {
          status: aiResponse.status,
          statusText: aiResponse.statusText,
          hasData: !!aiResponse.data
        });
        
        // Extract AI response
        const aiData = aiResponse.data;
        
        // Check if response is successful
        if (aiResponse.status !== 200) {
          throw new Error(`AI service returned status ${aiResponse.status}: ${JSON.stringify(aiData)}`);
        }
        
        console.log('📥 AI service response structure:', {
          hasMessage: !!aiData.message,
          hasSuccess: 'success' in aiData,
          urgencyLevel: aiData.urgency_level,
          symptomCount: aiData.symptom_count
        });
        
        // The response structure from chat_analyzer is ChatMessageOutput
        // which has: success, message, urgency_level, symptom_count, analysis, etc.
        const aiResponseText = aiData.message || aiData.response || 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.';
        
        // Extract metadata from analysis if available
        const analysis = aiData.analysis || {};
        const diseaseClassification = analysis.disease_classification || {};
        
        // Normalize urgency level to match enum values
        const normalizeUrgencyLevel = (urgency) => {
          if (!urgency) return 'low';
          const urgencyStr = String(urgency).toLowerCase();
          // Map Spanish/alternative values to enum values
          const urgencyMap = {
            'critica': 'critical',
            'critical': 'critical',
            'alta': 'high',
            'high': 'high',
            'media': 'medium',
            'medium': 'medium',
            'baja': 'low',
            'low': 'low',
            'muy_baja': 'very_low',
            'very_low': 'very_low'
          };
          return urgencyMap[urgencyStr] || 'low';
        };
        
        // Normalize symptoms: extract string names from objects if needed
        const normalizeSymptoms = (symptoms) => {
          if (!symptoms) return [];
          
          // If it's a string, try to parse it as JSON first
          if (typeof symptoms === 'string') {
            try {
              // Try to parse as JSON
              const parsed = JSON.parse(symptoms);
              if (Array.isArray(parsed)) {
                symptoms = parsed;
              } else {
                // If it's not a valid JSON array, return empty
                console.warn('⚠️ Symptoms is a string but not valid JSON:', symptoms.substring(0, 100));
                return [];
              }
            } catch (e) {
              // If parsing fails, it might be a single symptom string
              return [symptoms];
            }
          }
          
          if (!Array.isArray(symptoms)) {
            console.warn('⚠️ Symptoms is not an array:', typeof symptoms, symptoms);
            return [];
          }
          
          return symptoms.map(symptom => {
            // If it's already a string, return it
            if (typeof symptom === 'string') return symptom;
            // If it's an object, extract the symptom name
            if (typeof symptom === 'object' && symptom !== null) {
              return symptom.symptom || symptom.name || symptom.token || symptom.matched_token || String(symptom);
            }
            // Otherwise, convert to string
            return String(symptom);
          }).filter(Boolean); // Remove any empty values
        };
        
        // Normalize diseases: extract string names from objects if needed
        const normalizeDiseases = (diseases) => {
          if (!diseases) return [];
          
          // If it's a string, try to parse it as JSON first
          if (typeof diseases === 'string') {
            try {
              // Try to parse as JSON
              const parsed = JSON.parse(diseases);
              if (Array.isArray(parsed)) {
                diseases = parsed;
              } else {
                // If it's not a valid JSON array, return empty
                console.warn('⚠️ Diseases is a string but not valid JSON:', diseases.substring(0, 100));
                return [];
              }
            } catch (e) {
              // If parsing fails, it might be a single disease string
              return [diseases];
            }
          }
          
          if (!Array.isArray(diseases)) {
            console.warn('⚠️ Diseases is not an array:', typeof diseases, diseases);
            return [];
          }
          
          return diseases.map(disease => {
            // If it's already a string, return it
            if (typeof disease === 'string') return disease;
            // If it's an object, extract the disease name
            if (typeof disease === 'object' && disease !== null) {
              return disease.name || disease.disease || disease.title || String(disease);
            }
            // Otherwise, convert to string
            return String(disease);
          }).filter(Boolean); // Remove any empty values
        };
        
        const normalizedUrgency = normalizeUrgencyLevel(aiData.urgency_level);
        
        // Get symptoms and diseases from various possible locations in the response
        const rawSymptoms = analysis.symptom_extraction?.symptoms || 
                           analysis.symptoms || 
                           analysis.detected_symptoms || 
                           [];
        const rawDiseases = diseaseClassification.diseases || 
                           diseaseClassification.top_3_diseases?.map(d => d.name || d) || 
                           diseaseClassification.detected_diseases || 
                           [];
        
        // Log raw data for debugging
        console.log('🔍 Raw symptoms type:', typeof rawSymptoms, Array.isArray(rawSymptoms));
        if (rawSymptoms && typeof rawSymptoms === 'string') {
          console.log('🔍 Raw symptoms (first 200 chars):', rawSymptoms.substring(0, 200));
        } else if (Array.isArray(rawSymptoms) && rawSymptoms.length > 0) {
          console.log('🔍 Raw symptoms sample:', JSON.stringify(rawSymptoms[0]));
        }
        
        const normalizedSymptoms = normalizeSymptoms(rawSymptoms);
        const normalizedDiseases = normalizeDiseases(rawDiseases);
        
        console.log('🔍 Normalized symptoms and diseases:', {
          rawSymptomsType: typeof rawSymptoms,
          rawSymptomsIsArray: Array.isArray(rawSymptoms),
          rawSymptomsCount: Array.isArray(rawSymptoms) ? rawSymptoms.length : (rawSymptoms ? 1 : 0),
          normalizedSymptomsCount: normalizedSymptoms.length,
          normalizedSymptomsSample: normalizedSymptoms.slice(0, 3),
          rawDiseasesCount: Array.isArray(rawDiseases) ? rawDiseases.length : 0,
          normalizedDiseasesCount: normalizedDiseases.length
        });
        
        // Add assistant message (use 'bot' as role, not 'assistant')
        conversation.addMessage('bot', aiResponseText, {
          urgencyLevel: normalizedUrgency,
          confidence: analysis.confidence_score || 0.5,
          detectedDiseases: normalizedDiseases,
          detectedSymptoms: normalizedSymptoms
        });
        
        // Validate before saving
        try {
          await conversation.save();
        } catch (saveError) {
          console.error('❌ Error saving conversation:', saveError);
          console.error('Conversation state:', {
            sessionId: conversation.sessionId,
            messagesCount: conversation.messages.length,
            summary: conversation.summary,
            urgencyLevel: normalizedUrgency
          });
          throw saveError;
        }
        
        assistantMessage = conversation.messages[conversation.messages.length - 1];
        console.log(`✅ AI response generated and saved for session ${sessionId}`);
      } catch (aiError) {
        // Ensure aiServiceURL and chatAnalyzeURL are accessible in catch block
        const errorAiServiceURL = process.env.AI_SERVICE_URL || 'http://ai-services:8000';
        const errorChatAnalyzeURL = `${errorAiServiceURL}/api/v1/analyze`;
        
        console.error('❌ Error calling AI service:', aiError.message);
        console.error('Error details:', {
          message: aiError.message,
          code: aiError.code,
          response: aiError.response?.data,
          status: aiError.response?.status,
          statusText: aiError.response?.statusText,
          url: aiError.config?.url,
          baseURL: errorAiServiceURL,
          fullURL: errorChatAnalyzeURL,
          timeout: aiError.code === 'ECONNABORTED' ? 'Request timeout' : undefined,
          connection: aiError.code === 'ECONNREFUSED' ? 'Connection refused - AI service may not be running' : undefined
        });
        
        // If AI service fails, add a fallback message (use 'bot' as role)
        const fallbackMessage = 'Lo siento, el servicio de asistencia médica no está disponible en este momento. Por favor intenta más tarde o contacta con un profesional de la salud.';
        conversation.addMessage('bot', fallbackMessage, {
          urgencyLevel: 'low',
          isError: true
        });
        await conversation.save();
        assistantMessage = conversation.messages[conversation.messages.length - 1];
      }
    }

    // Prepare response with both messages in the correct format
    // Map 'bot' role to 'assistant' for frontend compatibility
    const userMsg = conversation.messages[conversation.messages.length - (assistantMessage ? 2 : 1)];
    const responseData = {
      success: true,
      message: 'Message added',
      data: {
        userMessage: {
          role: userMsg.role,
          content: userMsg.content,
          timestamp: userMsg.timestamp?.toISOString() || new Date().toISOString()
        },
        assistantMessage: assistantMessage ? {
          role: 'assistant', // Frontend expects 'assistant', backend uses 'bot'
          content: assistantMessage.content,
          timestamp: assistantMessage.timestamp?.toISOString() || new Date().toISOString()
        } : null,
        messageCount: conversation.messages.length
      }
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error adding message:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      errors: error.errors,
      sessionId: req.params.sessionId
    });
    
    // Provide more detailed error message
    let errorMessage = 'Error adding message';
    if (error.name === 'ValidationError') {
      errorMessage = `Validation error: ${Object.keys(error.errors || {}).join(', ')}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        errors: error.errors
      } : undefined
    });
  }
});

/**
 * @route   GET /api/chat-conversations/:sessionId
 * @desc    Get a conversation by session ID
 * @access  Public
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const { sessionId } = req.params;
    
    const conversation = await Model.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/chat-conversations
 * @desc    Get conversations with filters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available',
        data: []
      });
    }

    const {
      userId,
      status,
      urgency,
      limit = 50,
      includeMessages = 'false'
    } = req.query;

    // Build query
    const query = {};
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (urgency) query['summary.highestUrgency'] = urgency;

    let conversationsQuery = Model.find(query)
      .sort({ lastActivityAt: -1 })
      .limit(parseInt(limit));
    
    // Optionally exclude messages for performance
    if (includeMessages === 'false') {
      conversationsQuery = conversationsQuery.select('-messages');
    }

    const conversations = await conversationsQuery;

    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/chat-conversations/:sessionId/complete
 * @desc    Mark a conversation as completed
 * @access  Public
 */
router.put('/:sessionId/complete', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }

    const { sessionId } = req.params;
    
    const conversation = await Model.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    conversation.complete();
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation marked as completed',
      data: {
        sessionId: conversation.sessionId,
        status: conversation.status,
        completedAt: conversation.completedAt
      }
    });
  } catch (error) {
    console.error('Error completing conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing conversation',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/chat-conversations/statistics/summary
 * @desc    Get conversation statistics
 * @access  Public
 */
router.get('/statistics/summary', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available',
        data: getMockStatistics()
      });
    }

    const { startDate, endDate } = req.query;
    
    const stats = await Model.getStatistics({ startDate, endDate });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/chat-conversations/urgent/list
 * @desc    Get urgent conversations (high/critical urgency)
 * @access  Public
 */
router.get('/urgent/list', async (req, res) => {
  try {
    const Model = initializeModel();
    if (!Model) {
      return res.status(503).json({
        success: false,
        message: 'Database not available',
        data: []
      });
    }

    const conversations = await Model.getUrgent();

    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (error) {
    console.error('Error fetching urgent conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching urgent conversations',
      error: error.message
    });
  }
});

// Mock data functions
function getMockStatistics() {
  return {
    totalConversations: 0,
    activeConversations: 0,
    completedConversations: 0,
    urgentConversations: 0,
    totalMessages: 0,
    avgMessagesPerConversation: 0,
    avgConfidence: 0
  };
}

module.exports = router;

