/**
 * SMS Service
 * Gestiona el envío de mensajes SMS usando múltiples proveedores (Twilio, AWS SNS, MessageBird)
 */

import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { smsRateLimiter } from './smsRateLimiter';
import { smsMetricsService } from './smsMetricsService';

export interface SMSConfig {
  provider?: 'twilio' | 'aws_sns' | 'messagebird' | 'mock' | 'none';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  awsSnsRegion?: string;
  awsSnsAccessKeyId?: string;
  awsSnsSecretAccessKey?: string;
  messagebirdApiKey?: string;
  messagebirdOriginator?: string;
  enabled?: boolean;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
}

export interface SMSMessage {
  to: string; // Número de teléfono destino (formato E.164: +51987654321)
  message: string; // Contenido del mensaje (máx 1600 caracteres)
  from?: string; // Número de teléfono origen (opcional, usa el configurado por defecto)
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  cost?: number; // Costo del SMS en USD
}

export class SMSService {
  private config: SMSConfig;
  private twilioClient: any = null;
  private awsSnsClient: any = null;
  private messagebirdClient: any = null;

  constructor(config: SMSConfig = {}) {
    this.config = {
      provider: config.provider || (process.env.SMS_PROVIDER as any) || 'mock',
      twilioAccountSid: config.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID,
      twilioAuthToken: config.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: config.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER,
      awsSnsRegion: config.awsSnsRegion || process.env.AWS_SNS_REGION,
      awsSnsAccessKeyId: config.awsSnsAccessKeyId || process.env.AWS_SNS_ACCESS_KEY_ID,
      awsSnsSecretAccessKey: config.awsSnsSecretAccessKey || process.env.AWS_SNS_SECRET_ACCESS_KEY,
      messagebirdApiKey: config.messagebirdApiKey || process.env.MESSAGEBIRD_API_KEY,
      messagebirdOriginator: config.messagebirdOriginator || process.env.MESSAGEBIRD_ORIGINATOR,
      enabled: config.enabled ?? process.env.SMS_ENABLED === 'true',
      rateLimitPerMinute: config.rateLimitPerMinute || parseInt(process.env.SMS_RATE_LIMIT_PER_MINUTE || '60'),
      rateLimitPerHour: config.rateLimitPerHour || parseInt(process.env.SMS_RATE_LIMIT_PER_HOUR || '1000'),
      rateLimitPerDay: config.rateLimitPerDay || parseInt(process.env.SMS_RATE_LIMIT_PER_DAY || '10000'),
    };

    // Inicializar clientes según el proveedor
    if (this.config.enabled) {
      switch (this.config.provider) {
        case 'twilio':
          this.initializeTwilio();
          break;
        case 'aws_sns':
          this.initializeAWSSNS();
          break;
        case 'messagebird':
          this.initializeMessageBird();
          break;
      }
    }
  }

  /**
   * Inicializar cliente Twilio
   */
  private initializeTwilio(): void {
    try {
      const twilio = require('twilio');

      if (!this.config.twilioAccountSid || !this.config.twilioAuthToken) {
        logger.warn('Twilio configurado pero faltan credenciales, usando modo mock');
        this.config.provider = 'mock';
        return;
      }

      this.twilioClient = twilio(
        this.config.twilioAccountSid,
        this.config.twilioAuthToken
      );

      logger.info('Cliente Twilio inicializado correctamente');
    } catch (error: any) {
      logger.warn(`No se pudo inicializar Twilio: ${error.message}. Usando modo mock.`);
      this.config.provider = 'mock';
    }
  }

  /**
   * Inicializar cliente AWS SNS
   */
  private initializeAWSSNS(): void {
    try {
      const AWS = require('aws-sdk');

      if (!this.config.awsSnsRegion || !this.config.awsSnsAccessKeyId || !this.config.awsSnsSecretAccessKey) {
        logger.warn('AWS SNS configurado pero faltan credenciales, usando modo mock');
        this.config.provider = 'mock';
        return;
      }

      this.awsSnsClient = new AWS.SNS({
        region: this.config.awsSnsRegion,
        accessKeyId: this.config.awsSnsAccessKeyId,
        secretAccessKey: this.config.awsSnsSecretAccessKey,
      });

      logger.info('Cliente AWS SNS inicializado correctamente');
    } catch (error: any) {
      logger.warn(`No se pudo inicializar AWS SNS: ${error.message}. Usando modo mock.`);
      this.config.provider = 'mock';
    }
  }

  /**
   * Inicializar cliente MessageBird
   */
  private initializeMessageBird(): void {
    try {
      const messagebird = require('messagebird');

      if (!this.config.messagebirdApiKey) {
        logger.warn('MessageBird configurado pero faltan credenciales, usando modo mock');
        this.config.provider = 'mock';
        return;
      }

      this.messagebirdClient = messagebird(this.config.messagebirdApiKey);

      logger.info('Cliente MessageBird inicializado correctamente');
    } catch (error: any) {
      logger.warn(`No se pudo inicializar MessageBird: ${error.message}. Usando modo mock.`);
      this.config.provider = 'mock';
    }
  }

  /**
   * Enviar mensaje SMS
   */
  async sendSMS(message: SMSMessage): Promise<SMSResponse> {
    if (!this.config.enabled) {
      logger.debug('SMS deshabilitado, omitiendo envío', { to: message.to });
      return {
        success: false,
        error: 'SMS service is disabled',
      };
    }

    // Validar número de teléfono
    if (!this.isValidPhoneNumber(message.to)) {
      throw new AppError(
        `Número de teléfono inválido: ${message.to}. Debe estar en formato E.164 (ej: +51987654321)`,
        400
      );
    }

    // Validar longitud del mensaje
    if (message.message.length > 1600) {
      throw new AppError(
        'El mensaje SMS no puede exceder 1600 caracteres',
        400
      );
    }

    // Verificar rate limiting
    const rateLimitCheck = await smsRateLimiter.checkRateLimit(
      this.config.provider,
      {
        perMinute: this.config.rateLimitPerMinute,
        perHour: this.config.rateLimitPerHour,
        perDay: this.config.rateLimitPerDay,
      }
    );

    if (!rateLimitCheck.allowed) {
      throw new AppError(
        `Rate limit excedido. Intenta de nuevo en ${rateLimitCheck.retryAfter} segundos`,
        429
      );
    }

    // Verificar burst limit
    const burstAllowed = await smsRateLimiter.checkBurstLimit(this.config.provider);
    if (!burstAllowed) {
      throw new AppError('Burst limit excedido. Espera un momento antes de enviar más SMS', 429);
    }

    try {
      let response: SMSResponse;
      let cost: number | undefined;

      switch (this.config.provider) {
        case 'twilio':
          response = await this.sendViaTwilio(message);
          cost = 0.0075; // Costo estimado por SMS
          break;
        case 'aws_sns':
          response = await this.sendViaAWSSNS(message);
          cost = 0.00645; // Costo estimado por SMS
          break;
        case 'messagebird':
          response = await this.sendViaMessageBird(message);
          cost = 0.005; // Costo estimado por SMS
          break;
        case 'mock':
          response = await this.sendViaMock(message);
          cost = 0;
          break;
        case 'none':
          return {
            success: false,
            error: 'SMS provider not configured',
          };
        default:
          throw new AppError(`Proveedor SMS desconocido: ${this.config.provider}`, 500);
      }

      // Registrar métricas
      if (response.success && response.messageId) {
        await smsMetricsService.recordSMS(
          this.config.provider,
          response.messageId,
          'sent',
          cost
        );
      } else {
        await smsMetricsService.recordSMS(
          this.config.provider,
          response.messageId || 'unknown',
          'failed',
          cost
        );
      }

      return { ...response, cost };
    } catch (error: any) {
      logger.error(`Error al enviar SMS: ${error.message}`, {
        to: message.to,
        provider: this.config.provider,
        error: error.message,
      });

      // Registrar fallo en métricas
      await smsMetricsService.recordSMS(
        this.config.provider,
        'failed-' + Date.now(),
        'failed',
        0
      );

      throw new AppError(`Error al enviar SMS: ${error.message}`, 500);
    }
  }

  /**
   * Enviar SMS usando Twilio
   */
  private async sendViaTwilio(message: SMSMessage): Promise<SMSResponse> {
    if (!this.twilioClient) {
      throw new AppError('Cliente Twilio no inicializado', 500);
    }

    if (!this.config.twilioPhoneNumber) {
      throw new AppError('Número de teléfono Twilio no configurado', 500);
    }

    try {
      const twilioMessage = await this.twilioClient.messages.create({
        body: message.message,
        from: message.from || this.config.twilioPhoneNumber,
        to: message.to,
      });

      logger.info('SMS enviado exitosamente vía Twilio', {
        messageId: twilioMessage.sid,
        to: message.to,
        status: twilioMessage.status,
      });

      return {
        success: true,
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
      };
    } catch (error: any) {
      logger.error(`Error al enviar SMS vía Twilio: ${error.message}`, {
        to: message.to,
        error: error.message,
        code: error.code,
      });

      // Si es un error de rate limit, no hacer fallback
      if (error.code === 20429) {
        throw new AppError('Rate limit de Twilio excedido', 429);
      }

      // Si es un error de credenciales/número, intentar con modo mock como fallback
      if (error.code === 20003 || error.code === 21211) {
        logger.warn('Error de Twilio, usando modo mock como fallback');
        return await this.sendViaMock(message);
      }

      throw error;
    }
  }

  /**
   * Enviar SMS usando AWS SNS
   */
  private async sendViaAWSSNS(message: SMSMessage): Promise<SMSResponse> {
    if (!this.awsSnsClient) {
      throw new AppError('Cliente AWS SNS no inicializado', 500);
    }

    try {
      const params = {
        Message: message.message,
        PhoneNumber: message.to,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      };

      const result = await this.awsSnsClient.publish(params).promise();

      logger.info('SMS enviado exitosamente vía AWS SNS', {
        messageId: result.MessageId,
        to: message.to,
      });

      return {
        success: true,
        messageId: result.MessageId,
        status: 'sent',
      };
    } catch (error: any) {
      logger.error(`Error al enviar SMS vía AWS SNS: ${error.message}`, {
        to: message.to,
        error: error.message,
        code: error.code,
      });

      // Si es un error de rate limit, no hacer fallback
      if (error.code === 'Throttling') {
        throw new AppError('Rate limit de AWS SNS excedido', 429);
      }

      throw error;
    }
  }

  /**
   * Enviar SMS usando MessageBird
   */
  private async sendViaMessageBird(message: SMSMessage): Promise<SMSResponse> {
    if (!this.messagebirdClient) {
      throw new AppError('Cliente MessageBird no inicializado', 500);
    }

    try {
      const params = {
        originator: this.config.messagebirdOriginator || 'RespiCare',
        recipients: [message.to],
        body: message.message,
      };

      return new Promise((resolve, reject) => {
        this.messagebirdClient.messages.create(params, (err: any, response: any) => {
          if (err) {
            logger.error(`Error al enviar SMS vía MessageBird: ${err.message}`, {
              to: message.to,
              error: err.message,
            });
            reject(err);
            return;
          }

          logger.info('SMS enviado exitosamente vía MessageBird', {
            messageId: response.id,
            to: message.to,
          });

          resolve({
            success: true,
            messageId: response.id,
            status: 'sent',
          });
        });
      });
    } catch (error: any) {
      logger.error(`Error al enviar SMS vía MessageBird: ${error.message}`, {
        to: message.to,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Enviar SMS usando modo mock (para desarrollo/testing)
   */
  private async sendViaMock(message: SMSMessage): Promise<SMSResponse> {
    // Simular delay de red
    await new Promise((resolve) => setTimeout(resolve, 100));

    const mockMessageId = `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logger.info('SMS enviado (modo mock)', {
      messageId: mockMessageId,
      to: message.to,
      message: message.message.substring(0, 50) + (message.message.length > 50 ? '...' : ''),
    });

    return {
      success: true,
      messageId: mockMessageId,
      status: 'sent',
    };
  }

  /**
   * Validar formato de número de teléfono (E.164)
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Formato E.164: +[código país][número]
    // Ejemplos válidos: +51987654321, +12125551234, +34612345678
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Formatear número de teléfono a E.164
   * Convierte números locales a formato internacional
   */
  formatPhoneNumber(phoneNumber: string, countryCode: string = '+51'): string {
    // Remover espacios, guiones, paréntesis
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Si ya tiene código de país, retornar
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Si empieza con 0, removerlo
    const withoutLeadingZero = cleaned.startsWith('0') ? cleaned.substring(1) : cleaned;

    // Agregar código de país
    return `${countryCode}${withoutLeadingZero}`;
  }

  /**
   * Enviar SMS de emergencia
   * Versión optimizada para emergencias con formato específico
   */
  async sendEmergencySMS(
    phoneNumber: string,
    emergencyInfo: {
      type: string;
      location: string;
      patientName?: string;
      description?: string;
    }
  ): Promise<SMSResponse> {
    const message = `🚨 EMERGENCIA MÉDICA\n\n` +
      `Tipo: ${emergencyInfo.type}\n` +
      (emergencyInfo.patientName ? `Paciente: ${emergencyInfo.patientName}\n` : '') +
      `Ubicación: ${emergencyInfo.location}\n` +
      (emergencyInfo.description ? `Detalles: ${emergencyInfo.description}\n` : '') +
      `\nServicios de emergencia han sido notificados.`;

    return await this.sendSMS({
      to: this.formatPhoneNumber(phoneNumber),
      message,
    });
  }

  /**
   * Enviar SMS a múltiples destinatarios
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];

    // Enviar en paralelo (con límite para no sobrecargar)
    const batchSize = 10;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((msg) => this.sendSMS(msg))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Unknown error',
          });
        }
      });

      // Pequeño delay entre lotes para evitar rate limiting
      if (i + batchSize < messages.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Verificar estado de un mensaje SMS
   */
  async getMessageStatus(messageId: string): Promise<{ status: string; error?: string } | null> {
    if (this.config.provider === 'twilio' && this.twilioClient) {
      try {
        const message = await this.twilioClient.messages(messageId).fetch();
        return {
          status: message.status,
        };
      } catch (error: any) {
        logger.error(`Error al obtener estado de SMS: ${error.message}`, {
          messageId,
          error: error.message,
        });
        return {
          status: 'unknown',
          error: error.message,
        };
      }
    }

    // Para otros proveedores, obtener desde métricas
    const client = require('../config/redisClient').getRedisClient();
    if (client) {
      try {
        const messageData = await client.get(`sms:metrics:message:${messageId}`);
        if (messageData) {
          const message = JSON.parse(messageData);
          return { status: message.status };
        }
      } catch (error: any) {
        logger.error(`Error al obtener estado desde métricas: ${error.message}`);
      }
    }

    return null;
  }

  /**
   * Verificar si el servicio está configurado y disponible
   */
  isAvailable(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    switch (this.config.provider) {
      case 'twilio':
        return !!this.twilioClient;
      case 'aws_sns':
        return !!this.awsSnsClient;
      case 'messagebird':
        return !!this.messagebirdClient;
      case 'mock':
        return true;
      default:
        return false;
    }
  }

  /**
   * Obtener estadísticas de rate limiting
   */
  async getRateLimitStats(): Promise<any> {
    return await smsRateLimiter.getRateLimitStats(this.config.provider);
  }

  /**
   * Obtener proveedor actual
   */
  getProvider(): string {
    return this.config.provider;
  }
}

// Instancia singleton
export const smsService = new SMSService();
