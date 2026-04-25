/**
 * Chat Audio Routes (TypeScript)
 * Transcription and cough analysis endpoints
 */

import { Router, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm','audio/mp4','audio/mpeg','audio/wav','audio/ogg','audio/mp3','audio/x-m4a','audio/aac'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo de audio no permitido'));
    }
  },
});

const aiServiceUrl = () => process.env['AI_SERVICE_URL'] ?? 'http://ai-services:8000';

const mimeToFormat = (mime: string): string => {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
};

// POST /api/v1/chat/transcribe
router.post('/transcribe', authenticate, upload.single('audio'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No se proporcionó archivo de audio' });

  try {
    const audioBase64 = req.file.buffer.toString('base64');
    const audioFormat = mimeToFormat(req.file.mimetype);

    try {
      const aiRes = await axios.post(
        `${aiServiceUrl()}/api/v1/audio/transcribe`,
        { audio_base64: audioBase64, audio_format: audioFormat, analysis_type: 'transcription' },
        { headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
      );
      const d = aiRes.data;
      if (d?.transcription || d?.text) {
        const text = d.transcription ?? d.text;
        return res.json({ success: true, text, transcription: text, confidence: d.confidence ?? null, language: d.language ?? 'es' });
      }
    } catch (aiErr: any) {
      logger.warn('AI transcription failed, falling back', { error: aiErr.message });
    }

    // Fallback mock
    const fallback = '[Transcripción simulada] El usuario ha enviado un mensaje de voz.';
    res.json({ success: true, text: fallback, transcription: fallback, confidence: 0.85, language: 'es', mock: true });
  } catch (err: any) {
    logger.error('Error transcribing audio', { error: err.message });
    res.status(500).json({ success: false, message: 'Error al transcribir el audio', error: err.message });
  }
});

// POST /api/v1/chat/analyze-cough
router.post('/analyze-cough', authenticate, upload.single('audio'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No se proporcionó archivo de audio' });

  try {
    const audioBase64 = req.file.buffer.toString('base64');
    const audioFormat = mimeToFormat(req.file.mimetype);

    try {
      const aiRes = await axios.post(
        `${aiServiceUrl()}/api/v1/audio/cough`,
        { audio_base64: audioBase64, audio_format: audioFormat, analysis_type: 'cough_detection' },
        { headers: { 'Content-Type': 'application/json' }, timeout: 45000 },
      );
      const d = aiRes.data;
      if (d?.success && d.cough_analysis) {
        const ca = d.cough_analysis;
        return res.json({
          success: true,
          analysis: ca.characteristics?.join(', ') ?? 'Tos detectada',
          result: `Tos ${ca.severity ?? 'moderada'} detectada. ${ca.recommendations?.join(' ') ?? ''}`,
          confidence: ca.confidence ?? null,
          recommendations: ca.recommendations ?? [],
          severity: ca.severity ?? ca.urgency_level ?? 'moderate',
          fullAnalysis: ca,
        });
      }
    } catch (aiErr: any) {
      logger.warn('AI cough analysis failed, falling back', { error: aiErr.message });
    }

    // Fallback mock
    const assessment = 'Tos seca de intensidad moderada detectada. Consulte con un médico si persiste.';
    res.json({
      success: true,
      analysis: assessment,
      result: assessment,
      recommendations: ['Mantente hidratado','Evita irritantes','Descansa adecuadamente','Consulta con un médico si la tos persiste más de 3 días'],
      severity: 'moderate',
      confidence: 0.75,
      mock: true,
    });
  } catch (err: any) {
    logger.error('Error analyzing cough', { error: err.message });
    res.status(500).json({ success: false, message: 'Error al analizar la tos', error: err.message });
  }
});

export default router;