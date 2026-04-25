import {
  handleTwilioWebhook,
  handleAWSSNSWebhook,
  handleMessageBirdWebhook,
  verifyTwilioWebhook,
} from '../../../src/controllers/smsWebhookController';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/services/smsMetricsService', () => ({
  smsMetricsService: {
    updateMessageStatus: jest.fn().mockResolvedValue(undefined),
  },
}));

const { smsMetricsService } = require('../../../src/services/smsMetricsService');

const buildRes = () => {
  const json = jest.fn().mockReturnThis();
  const send = jest.fn().mockReturnThis();
  const type = jest.fn().mockReturnThis();
  const status = jest.fn().mockReturnValue({ json, send, type });
  return { status, json, send, type, headersSent: false } as any;
};

describe('smsWebhookController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('handleTwilioWebhook', () => {
    it('procesa webhook de Twilio con estado delivered', async () => {
      const req: any = {
        body: {
          MessageSid: 'SM123',
          MessageStatus: 'delivered',
          To: '+51999000001',
          From: '+15005550006',
        },
        headers: {},
        get: jest.fn(),
        protocol: 'https',
        originalUrl: '/api/v1/sms/webhooks/twilio',
      };
      const res = buildRes();

      await handleTwilioWebhook(req, res);

      expect(smsMetricsService.updateMessageStatus).toHaveBeenCalledWith('SM123', 'delivered', undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('mapea estado failed correctamente', async () => {
      const req: any = {
        body: { MessageSid: 'SM456', MessageStatus: 'failed' },
        headers: {},
        get: jest.fn(),
        protocol: 'https',
        originalUrl: '/webhooks/twilio',
      };

      await handleTwilioWebhook(req, buildRes());

      expect(smsMetricsService.updateMessageStatus).toHaveBeenCalledWith('SM456', 'failed', undefined);
    });

    it('mapea estado undelivered correctamente', async () => {
      const req: any = {
        body: { MessageSid: 'SM789', MessageStatus: 'undelivered' },
        headers: {},
        get: jest.fn(),
        protocol: 'https',
        originalUrl: '/webhooks/twilio',
      };

      await handleTwilioWebhook(req, buildRes());

      expect(smsMetricsService.updateMessageStatus).toHaveBeenCalledWith('SM789', 'undelivered', undefined);
    });

    it('incluye costo cuando está disponible', async () => {
      const req: any = {
        body: {
          MessageSid: 'SM999',
          MessageStatus: 'delivered',
          Price: '-0.0075',
          PriceUnit: 'USD',
        },
        headers: {},
        get: jest.fn(),
        protocol: 'https',
        originalUrl: '/webhooks/twilio',
      };

      await handleTwilioWebhook(req, buildRes());

      expect(smsMetricsService.updateMessageStatus).toHaveBeenCalledWith(
        'SM999',
        'delivered',
        expect.any(Number)
      );
    });

    it('retorna 400 cuando falta MessageSid', async () => {
      const req: any = { body: { MessageStatus: 'delivered' } };
      const res = buildRes();

      await handleTwilioWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(smsMetricsService.updateMessageStatus).not.toHaveBeenCalled();
    });

    it('retorna 500 cuando el servicio falla', async () => {
      smsMetricsService.updateMessageStatus.mockRejectedValue(new Error('DB error'));

      const req: any = {
        body: { MessageSid: 'SM-fail', MessageStatus: 'delivered' },
        headers: {},
        get: jest.fn(),
        protocol: 'https',
        originalUrl: '/webhooks/twilio',
      };
      const res = buildRes();

      await handleTwilioWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('handleAWSSNSWebhook', () => {
    it('confirma suscripción de SNS', async () => {
      const req: any = {
        headers: { 'x-amz-sns-message-type': 'SubscriptionConfirmation' },
        body: { SubscribeURL: 'https://sns.amazonaws.com/confirm' },
      };
      const res = buildRes();

      await handleAWSSNSWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(smsMetricsService.updateMessageStatus).not.toHaveBeenCalled();
    });

    it('procesa notificación de SNS con estado SUCCESS', async () => {
      const notification = JSON.stringify({ messageId: 'sns-msg-1', status: 'SUCCESS' });
      const req: any = {
        headers: { 'x-amz-sns-message-type': 'Notification' },
        body: { Message: notification },
      };

      await handleAWSSNSWebhook(req, buildRes());

      expect(smsMetricsService.updateMessageStatus).toHaveBeenCalledWith('sns-msg-1', 'delivered', undefined);
    });

    it('procesa notificación de SNS con estado FAILURE', async () => {
      const notification = JSON.stringify({ messageId: 'sns-msg-2', status: 'FAILURE', errorMessage: 'err' });
      const req: any = {
        headers: { 'x-amz-sns-message-type': 'Notification' },
        body: { Message: notification },
      };

      await handleAWSSNSWebhook(req, buildRes());

      expect(smsMetricsService.updateMessageStatus).toHaveBeenCalledWith('sns-msg-2', 'failed', undefined);
    });

    it('retorna 400 cuando falta messageId en notificación', async () => {
      const notification = JSON.stringify({ status: 'SUCCESS' });
      const req: any = {
        headers: { 'x-amz-sns-message-type': 'Notification' },
        body: { Message: notification },
      };
      const res = buildRes();

      await handleAWSSNSWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 400 para tipo de mensaje no soportado', async () => {
      const req: any = {
        headers: { 'x-amz-sns-message-type': 'UnknownType' },
        body: {},
      };
      const res = buildRes();

      await handleAWSSNSWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('handleMessageBirdWebhook', () => {
    it('procesa webhook de MessageBird con estado delivered', async () => {
      const req: any = {
        body: { id: 'mb-msg-1', status: 'delivered', recipient: '+51999000001' },
      };

      await handleMessageBirdWebhook(req, buildRes());

      expect(smsMetricsService.updateMessageStatus).toHaveBeenCalledWith('mb-msg-1', 'delivered', undefined);
    });

    it('procesa webhook de MessageBird con estado failed', async () => {
      const req: any = {
        body: { id: 'mb-msg-2', status: 'failed' },
      };

      await handleMessageBirdWebhook(req, buildRes());

      expect(smsMetricsService.updateMessageStatus).toHaveBeenCalledWith('mb-msg-2', 'failed', undefined);
    });

    it('incluye costo cuando está disponible', async () => {
      const req: any = {
        body: { id: 'mb-msg-3', status: 'delivered', price: { amount: '0.005', currency: 'USD' } },
      };

      await handleMessageBirdWebhook(req, buildRes());

      expect(smsMetricsService.updateMessageStatus).toHaveBeenCalledWith('mb-msg-3', 'delivered', 0.005);
    });

    it('retorna 400 cuando falta id', async () => {
      const req: any = { body: { status: 'delivered' } };
      const res = buildRes();

      await handleMessageBirdWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 500 cuando el servicio falla', async () => {
      smsMetricsService.updateMessageStatus.mockRejectedValue(new Error('Update error'));
      const req: any = { body: { id: 'mb-fail', status: 'delivered' } };
      const res = buildRes();

      await handleMessageBirdWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('verifyTwilioWebhook', () => {
    it('retorna false cuando no hay authToken', () => {
      const req: any = { headers: { 'x-twilio-signature': 'sig123' }, get: jest.fn() };
      expect(verifyTwilioWebhook(req, undefined)).toBe(false);
    });

    it('retorna false cuando no hay signature', () => {
      const req: any = { headers: {}, get: jest.fn() };
      expect(verifyTwilioWebhook(req, 'token123')).toBe(false);
    });
  });
});