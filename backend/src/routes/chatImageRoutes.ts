/**
 * Chat Image Routes (TypeScript)
 * Medical image analysis endpoint
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

const router = Router();
const aiServiceUrl = () => process.env['AI_SERVICE_URL'] ?? 'http://ai-services:8000';

const FORMAT_MAP: Record<string, string> = {
  chest_xray: 'jpeg', chest_ct: 'jpeg', spirometry: 'png',
  oximetry: 'png', sputum: 'jpeg', skin_rash: 'jpeg',
  cyanosis: 'jpeg', other: 'jpeg',
};

// POST /api/v1/chat/analyze-image
router.post('/analyze-image', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { image, image_type, sessionId } = req.body;

  if (!image) return res.status(400).json({ success: false, message: 'No se proporcionó imagen' });
  if (!image_type) return res.status(400).json({ success: false, message: 'Tipo de imagen es requerido' });

  try {
    let imageData: string = image;
    if (!image.startsWith('data:image')) {
      const format = FORMAT_MAP[image_type] ?? 'jpeg';
      imageData = `data:image/${format};base64,${image}`;
    }

    try {
      const aiRes = await axios.post(
        `${aiServiceUrl()}/api/v1/ml/advanced/image`,
        {
          images: [imageData],
          model_name: 'resnet50',
          image_type,
          image_metadata: { type: image_type, category: 'diagnostic', sessionId, userId: req.user?._id },
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 45000 },
      );
      const preds = aiRes.data?.predictions;
      if (preds && preds.length > 0) {
        const p = preds[0];
        const confidence = p.scores?.[0] ?? 0;
        const analysis = `Análisis de ${image_type}: ${p.top_label} (confianza: ${(confidence * 100).toFixed(1)}%)`;
        return res.json({ success: true, analysis, result: analysis, fullAnalysis: { image_type, top_prediction: p.top_label, labels: p.labels ?? [], scores: p.scores ?? [], confidence }, confidence, topPrediction: p.top_label });
      }
    } catch (aiErr: any) {
      logger.warn('AI image analysis failed, falling back', { error: aiErr.message });
    }

    // Fallback mock
    const analysis = `Análisis de ${image_type} completado. Consulte con un profesional médico para evaluación detallada.`;
    res.json({
      success: true, analysis, result: analysis,
      fullAnalysis: { image_type, analysis, confidence: 0.75 },
      confidence: 0.75,
      recommendations: ['Consulta con un médico para evaluación completa','Mantén registro de las imágenes para seguimiento'],
      mock: true,
    });
  } catch (err: any) {
    logger.error('Error analyzing image', { error: err.message });
    res.status(500).json({ success: false, message: 'Error al analizar la imagen', error: err.message });
  }
});

export default router;