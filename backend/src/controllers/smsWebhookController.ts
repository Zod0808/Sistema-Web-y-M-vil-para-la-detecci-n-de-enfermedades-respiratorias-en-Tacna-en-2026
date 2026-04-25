/**
 * SMS Webhook Controller
 * Maneja webhooks de proveedores SMS (Twilio, AWS SNS, MessageBird)
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { smsMetricsService } from '../services/smsMetricsService';
import { AppError } from '../utils/AppError';

/**
 * Webhook de Twilio para actualizar estado de mensajes
 * POST /api/v1/sms/webhooks/twilio
 */
export const handleTwilioWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      MessageSid,
      MessageStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage,
      Price,
      PriceUnit,
    } = req.body;

    if (!MessageSid) {
      res.status(400).json({
        success: false,
        message: 'MessageSid es requerido',
      });
      return;
    }

    // Mapear estados de Twilio a estados internos
    let status: 'delivered' | 'failed' | 'undelivered' = 'delivered';
    if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
      status = MessageStatus === 'failed' ? 'failed' : 'undelivered';
    } else if (MessageStatus === 'delivered') {
      status = 'delivered';
    }

    // Calcular costo si está disponible
    let cost: number | undefined;
    if (Price && PriceUnit) {
      cost = parseFloat(Price);
      // Convertir a USD si es necesario
      if (PriceUnit !== 'USD') {
        // Aquí se podría agregar conversión de moneda
        logger.warn(`Costo en moneda no USD: ${PriceUnit}`);
      }
    }

    // Actualizar métricas
    await smsMetricsService.updateMessageStatus(MessageSid, status, cost);

    logger.info('Webhook de Twilio procesado', {
      messageId: MessageSid,
      status: MessageStatus,
      to: To,
      from: From,
      cost,
    });

    // Twilio espera una respuesta TwiML o 200 OK
    res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error: any) {
    logger.error(`Error al procesar webhook de Twilio: ${error.message}`, {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      message: 'Error al procesar webhook',
    });
  }
};

/**
 * Webhook de AWS SNS para actualizar estado de mensajes
 * POST /api/v1/sms/webhooks/aws-sns
 */
export const handleAWSSNSWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // AWS SNS puede enviar diferentes tipos de notificaciones
    const messageType = req.headers['x-amz-sns-message-type'] as string;

    if (messageType === 'SubscriptionConfirmation') {
      // Confirmar suscripción
      const subscribeUrl = req.body.SubscribeURL;
      logger.info('Confirmando suscripción a AWS SNS', { subscribeUrl });

      // En producción, deberías hacer una petición HTTP GET a subscribeUrl
      // Por ahora, solo logueamos
      res.status(200).json({ success: true, message: 'Subscription confirmed' });
      return;
    }

    if (messageType === 'Notification') {
      // Procesar notificación de estado
      const notification = JSON.parse(req.body.Message);
      const { messageId, status, errorMessage, price } = notification;

      if (!messageId) {
        res.status(400).json({
          success: false,
          message: 'messageId es requerido',
        });
        return;
      }

      let smsStatus: 'delivered' | 'failed' | 'undelivered' = 'delivered';
      if (status === 'FAILURE' || errorMessage) {
        smsStatus = 'failed';
      } else if (status === 'SUCCESS') {
        smsStatus = 'delivered';
      }

      const cost = price ? parseFloat(price) : undefined;

      await smsMetricsService.updateMessageStatus(messageId, smsStatus, cost);

      logger.info('Webhook de AWS SNS procesado', {
        messageId,
        status,
        cost,
      });

      res.status(200).json({ success: true });
      return;
    }

    res.status(400).json({
      success: false,
      message: 'Tipo de mensaje no soportado',
    });
  } catch (error: any) {
    logger.error(`Error al procesar webhook de AWS SNS: ${error.message}`, {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      message: 'Error al procesar webhook',
    });
  }
};

/**
 * Webhook de MessageBird para actualizar estado de mensajes
 * POST /api/v1/sms/webhooks/messagebird
 */
export const handleMessageBirdWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id,
      status,
      recipient,
      originator,
      error,
      price,
    } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'id es requerido',
      });
      return;
    }

    // Mapear estados de MessageBird
    let smsStatus: 'delivered' | 'failed' | 'undelivered' = 'delivered';
    if (status === 'delivered') {
      smsStatus = 'delivered';
    } else if (status === 'failed' || status === 'rejected' || error) {
      smsStatus = 'failed';
    } else if (status === 'sent' || status === 'buffered') {
      // Mantener como 'sent' en métricas, se actualizará cuando llegue el webhook de entrega
      smsStatus = 'delivered'; // Asumir entregado si no hay error
    }

    const cost = price ? parseFloat(price.amount) : undefined;

    await smsMetricsService.updateMessageStatus(id, smsStatus, cost);

    logger.info('Webhook de MessageBird procesado', {
      messageId: id,
      status,
      recipient,
      originator,
      cost,
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error(`Error al procesar webhook de MessageBird: ${error.message}`, {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      message: 'Error al procesar webhook',
    });
  }
};

/**
 * Verificar autenticidad del webhook de Twilio
 */
export const verifyTwilioWebhook = (req: Request, authToken?: string): boolean => {
  // Twilio envía una firma en el header X-Twilio-Signature
  // En producción, deberías verificar esta firma
  const signature = req.headers['x-twilio-signature'] as string;
  const url = req.protocol + '://' + req.get('host') + req.originalUrl;

  if (!authToken || !signature) {
    logger.warn('Webhook de Twilio sin autenticación');
    return false;
  }

  try {
    const twilio = require('twilio');
    return twilio.validateRequest(authToken, signature, url, req.body);
  } catch (error: any) {
    logger.error(`Error al verificar webhook de Twilio: ${error.message}`);
    return false;
  }
};

