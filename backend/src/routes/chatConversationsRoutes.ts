/**
 * Chat Conversations Routes (TypeScript)
 * API endpoints for chatbot conversations
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import axios from 'axios';
import { authenticate, optionalAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// ---------------------------------------------------------------------------
// Model loader (lazy — the JS model file is used directly since it already
// exists and works; migrating the model schema is a separate concern)
// ---------------------------------------------------------------------------
let ChatConversation: any;
const getModel = () => {
  if (!ChatConversation) {
    ChatConversation = require('../models/ChatConversation');
  }
  return ChatConversation;
};

// Normalise urgency to the enum values the schema accepts
const normalizeUrgency = (u?: string): string => {
  const map: Record<string, string> = {
    critica: 'critical', critical: 'critical',
    alta: 'high',       high: 'high',
    media: 'medium',    medium: 'medium',
    baja: 'low',        low: 'low',
    muy_baja: 'very_low', very_low: 'very_low',
  };
  return map[(u ?? '').toLowerCase()] ?? 'low';
};

const normalizeStringArray = (items: unknown): string[] => {
  if (!items) return [];
  let parsed: unknown = items;
  if (typeof items === 'string') {
    try { parsed = JSON.parse(items); } catch { return [items]; }
  }
  if (!Array.isArray(parsed)) return [];
  return (parsed as any[]).map(i => {
    if (typeof i === 'string') return i;
    if (typeof i === 'object' && i)
      return i.symptom ?? i.name ?? i.disease ?? i.token ?? String(i);
    return String(i);
  }).filter(Boolean);
};

// ---------------------------------------------------------------------------
// POST /api/chat-conversations — create new session
// ---------------------------------------------------------------------------
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const Model = getModel();
    const { userId, userInfo, location, metadata } = req.body;
    const sessionId = uuidv4();

    const conversation = new Model({
      sessionId,
      userId: userId ?? req.user?._id,
      userInfo,
      location: { ...location, city: 'Tacna', country: 'Perú' },
      metadata: { ...metadata, ipAddress: req.ip, userAgent: req.get('user-agent') },
    });

    await conversation.save();

    res.status(201).json({
      success: true,
      message: 'Chat conversation created',
      data: { sessionId: conversation.sessionId, _id: conversation._id },
    });
  } catch (err: any) {
    logger.error('Error creating chat conversation', { error: err.message });
    res.status(500).json({ success: false, message: 'Error creating chat conversation', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/chat-conversations/:sessionId/messages — send message + get AI reply
// ---------------------------------------------------------------------------
router.post('/:sessionId/messages', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const Model = getModel();
    const { sessionId } = req.params;
    const { role, content, metadata } = req.body;

    if (!role || !content) {
      return res.status(400).json({ success: false, message: 'Role and content are required' });
    }

    const conversation = await Model.findOne({ sessionId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Guard summary fields
    if (!conversation.summary) {
      conversation.summary = {
        totalMessages: 0, userMessages: 0, botMessages: 0,
        detectedDiseases: [], detectedSymptoms: [], highestUrgency: 'low', averageConfidence: 0,
      };
    }
    if (!Array.isArray(conversation.summary.detectedDiseases)) conversation.summary.detectedDiseases = [];
    if (!Array.isArray(conversation.summary.detectedSymptoms)) conversation.summary.detectedSymptoms = [];
    const validUrgencies = ['very_low', 'low', 'medium', 'high', 'critical'];
    if (!validUrgencies.includes(conversation.summary.highestUrgency)) {
      conversation.summary.highestUrgency = 'low';
    }

    conversation.addMessage(role, content, metadata ?? {});
    await conversation.save();

    // Obtain AI response for user messages
    let assistantMessage: any = null;
    if (role === 'user') {
      try {
        const aiServiceURL = process.env['AI_SERVICE_URL'] ?? 'http://ai-services:8000';
        const chatAnalyzeURL = `${aiServiceURL}/api/v1/analyze`;

        const conversationHistory = conversation.messages
          .slice(-10)
          .map((m: any) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

        const aiResponse = await axios.post(
          chatAnalyzeURL,
          {
            message: content,
            conversation_history: conversationHistory,
            session_id: sessionId,
            context: { userId: conversation.userId, location: conversation.location, metadata: conversation.metadata },
          },
          { timeout: 30000, headers: { 'Content-Type': 'application/json' }, validateStatus: s => s < 500 },
        );

        if (aiResponse.status !== 200) {
          throw new Error(`AI service returned ${aiResponse.status}`);
        }

        const aiData = aiResponse.data;
        const responseText = aiData.message ?? aiData.response ?? 'Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo.';
        const analysis = aiData.analysis ?? {};
        const diseaseClassification = analysis.disease_classification ?? {};

        const normalizedUrgency = normalizeUrgency(aiData.urgency_level);
        const rawSymptoms = analysis.symptom_extraction?.symptoms ?? analysis.symptoms ?? analysis.detected_symptoms ?? [];
        const rawDiseases = diseaseClassification.diseases ?? diseaseClassification.top_3_diseases?.map((d: any) => d.name ?? d) ?? [];

        conversation.addMessage('bot', responseText, {
          urgencyLevel: normalizedUrgency,
          confidence: analysis.confidence_score ?? 0.5,
          detectedDiseases: normalizeStringArray(rawDiseases),
          detectedSymptoms: normalizeStringArray(rawSymptoms),
        });
        await conversation.save();
        assistantMessage = conversation.messages[conversation.messages.length - 1];

        logger.info('AI response saved', { sessionId });
      } catch (aiErr: any) {
        const aiErrDetail = aiErr.response
          ? `HTTP ${aiErr.response.status} – ${JSON.stringify(aiErr.response.data).slice(0, 200)}`
          : aiErr.message;
        logger.warn('AI service call failed, using fallback', {
          aiServiceURL: chatAnalyzeURL,
          error: aiErrDetail,
        });
        const fallback = 'Lo siento, el servicio de asistencia médica no está disponible en este momento. Contacta con un profesional de la salud.';
        conversation.addMessage('bot', fallback, { urgencyLevel: 'low', isError: true });
        await conversation.save();
        assistantMessage = conversation.messages[conversation.messages.length - 1];
      }
    }

    const userMsg = conversation.messages[conversation.messages.length - (assistantMessage ? 2 : 1)];
    res.json({
      success: true,
      message: 'Message added',
      data: {
        userMessage: { role: userMsg.role, content: userMsg.content, timestamp: userMsg.timestamp?.toISOString() ?? new Date().toISOString() },
        assistantMessage: assistantMessage
          ? { role: 'assistant', content: assistantMessage.content, timestamp: assistantMessage.timestamp?.toISOString() ?? new Date().toISOString() }
          : null,
        messageCount: conversation.messages.length,
      },
    });
  } catch (err: any) {
    logger.error('Error adding chat message', { error: err.message });
    res.status(500).json({
      success: false,
      message: err.name === 'ValidationError' ? `Validation error: ${Object.keys(err.errors ?? {}).join(', ')}` : err.message,
      error: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat-conversations/:sessionId
// ---------------------------------------------------------------------------
router.get('/:sessionId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const conversation = await getModel().findOne({ sessionId: req.params.sessionId });
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true, data: conversation });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error fetching conversation', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat-conversations — list with filters
// ---------------------------------------------------------------------------
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { userId, status, urgency, limit = '50', includeMessages = 'false' } = req.query as Record<string, string>;
    const query: Record<string, any> = {};
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (urgency) query['summary.highestUrgency'] = urgency;

    let q = getModel().find(query).sort({ lastActivityAt: -1 }).limit(parseInt(limit, 10));
    if (includeMessages === 'false') q = q.select('-messages');
    const conversations = await q;

    res.json({ success: true, count: conversations.length, data: conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error fetching conversations', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/chat-conversations/:sessionId/complete
// ---------------------------------------------------------------------------
router.put('/:sessionId/complete', authenticate, async (req: Request, res: Response) => {
  try {
    const conversation = await getModel().findOne({ sessionId: req.params.sessionId });
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });
    conversation.complete();
    await conversation.save();
    res.json({ success: true, message: 'Conversation marked as completed', data: { sessionId: conversation.sessionId, status: conversation.status, completedAt: conversation.completedAt } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error completing conversation', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat-conversations/statistics/summary
// ---------------------------------------------------------------------------
router.get('/statistics/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;
    const stats = await getModel().getStatistics({ startDate, endDate });
    res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error fetching statistics', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat-conversations/urgent/list
// ---------------------------------------------------------------------------
router.get('/urgent/list', authenticate, async (_req: Request, res: Response) => {
  try {
    const conversations = await getModel().getUrgent();
    res.json({ success: true, count: conversations.length, data: conversations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error fetching urgent conversations', error: err.message });
  }
});

export default router;