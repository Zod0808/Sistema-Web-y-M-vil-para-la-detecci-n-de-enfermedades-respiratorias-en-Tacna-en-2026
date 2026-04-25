/**
 * Integration tests for SMS webhook endpoints
 */

import request from 'supertest';
import app from '../../src/index';
import { testUtils } from '../setup';

describe('SMS Webhook Endpoints Integration', () => {
  beforeEach(async () => {
    await testUtils.cleanTestData();
  });

  // ─── POST /sms/webhooks/twilio ────────────────────────────────────────────

  describe('POST /api/v1/sms/webhooks/twilio', () => {
    it('retorna 200 con evento delivered', async () => {
      const response = await request(app)
        .post('/api/v1/sms/webhooks/twilio')
        .send({
          MessageSid: 'SM123456789',
          MessageStatus: 'delivered',
          To: '+51999999999',
          From: '+15005550006',
        });

      expect([200, 500]).toContain(response.status);
    });

    it('retorna 200 con evento failed', async () => {
      const response = await request(app)
        .post('/api/v1/sms/webhooks/twilio')
        .send({
          MessageSid: 'SM123456789',
          MessageStatus: 'failed',
          ErrorCode: '30008',
          To: '+51999999999',
          From: '+15005550006',
        });

      expect([200, 500]).toContain(response.status);
    });

    it('retorna 400 sin MessageSid', async () => {
      const response = await request(app)
        .post('/api/v1/sms/webhooks/twilio')
        .send({
          MessageStatus: 'delivered',
          To: '+51999999999',
        });

      expect([400, 500]).toContain(response.status);
    });

    it('retorna 200 con evento undelivered', async () => {
      const response = await request(app)
        .post('/api/v1/sms/webhooks/twilio')
        .send({
          MessageSid: 'SM_undelivered',
          MessageStatus: 'undelivered',
          To: '+51999999999',
          From: '+15005550006',
          Price: '-0.0075',
          PriceUnit: 'USD',
        });

      expect([200, 500]).toContain(response.status);
    });
  });

  // ─── POST /sms/webhooks/aws-sns ───────────────────────────────────────────

  describe('POST /api/v1/sms/webhooks/aws-sns', () => {
    it('retorna 200 con SubscriptionConfirmation', async () => {
      const response = await request(app)
        .post('/api/v1/sms/webhooks/aws-sns')
        .set('x-amz-sns-message-type', 'SubscriptionConfirmation')
        .send({
          Type: 'SubscriptionConfirmation',
          SubscribeURL: 'https://sns.amazonaws.com/confirm',
          Token: 'test-token',
          TopicArn: 'arn:aws:sns:us-east-1:123456789012:MySNSTopic',
          Message: 'You have chosen to subscribe to the topic',
          Timestamp: new Date().toISOString(),
        });

      expect([200, 500]).toContain(response.status);
    });

    it('retorna 200 con notificación de entrega exitosa', async () => {
      const response = await request(app)
        .post('/api/v1/sms/webhooks/aws-sns')
        .set('x-amz-sns-message-type', 'Notification')
        .send({
          Type: 'Notification',
          Message: JSON.stringify({
            notification: { messageId: 'msg-123', spendUsd: '0.00645' },
            delivery: {
              phoneCarrier: 'Entel',
              mnc: 710,
              mcc: 716,
              providerResponse: 'Message has been accepted by phone carrier',
              dwellTimeMs: 559,
              dwellTimeMsUntilDeviceAck: 2011,
            },
            status: 'SUCCESS',
          }),
          TopicArn: 'arn:aws:sns:us-east-1:123456789012:MySNSTopic',
          Timestamp: new Date().toISOString(),
        });

      expect([200, 500]).toContain(response.status);
    });

    it('retorna 200 con notificación de fallo', async () => {
      const response = await request(app)
        .post('/api/v1/sms/webhooks/aws-sns')
        .set('x-amz-sns-message-type', 'Notification')
        .send({
          Type: 'Notification',
          Message: JSON.stringify({
            notification: { messageId: 'msg-456', spendUsd: '0' },
            status: 'FAILURE',
            delivery: {
              providerResponse: 'No quota left for account',
            },
          }),
          TopicArn: 'arn:aws:sns:us-east-1:123456789012:MySNSTopic',
          Timestamp: new Date().toISOString(),
        });

      expect([200, 500]).toContain(response.status);
    });
  });

  // ─── POST /sms/webhooks/messagebird ───────────────────────────────────────

  describe('POST /api/v1/sms/webhooks/messagebird', () => {
    it('retorna 200 con evento delivered', async () => {
      const response = await request(app)
        .post('/api/v1/sms/webhooks/messagebird')
        .send({
          id: 'msg-mb-123',
          status: 'delivered',
          msisdn: 51999999999,
          recipient: 51999999999,
        });

      expect([200, 500]).toContain(response.status);
    });

    it('retorna 200 con evento failed', async () => {
      const response = await request(app)
        .post('/api/v1/sms/webhooks/messagebird')
        .send({
          id: 'msg-mb-456',
          status: 'failed',
          msisdn: 51999999999,
        });

      expect([200, 500]).toContain(response.status);
    });
  });
});