/**
 * Unit tests for wearableSocketHandler
 * Uses EventEmitter to simulate WebSocket behavior without a live network.
 */

import { EventEmitter } from 'events';
import { Server as HttpServer, createServer } from 'http';

jest.mock('../../../src/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../src/models/WearableData', () => ({
  __esModule: true,
  default: {
    create: jest.fn().mockResolvedValue({ _id: 'mock-id-123' }),
  },
}));

jest.mock('../../../src/services/wearableAlertService', () => ({
  checkThresholdsAndAlert: jest.fn().mockResolvedValue([]),
}));

import jwt from 'jsonwebtoken';
import WearableData from '../../../src/models/WearableData';
import { checkThresholdsAndAlert } from '../../../src/services/wearableAlertService';

// Lightweight WebSocket simulator — avoids network overhead in unit tests
class FakeWs extends EventEmitter {
  readyState = 1; // OPEN
  sentMessages: any[] = [];

  send(data: string) {
    this.sentMessages.push(JSON.parse(data));
  }

  terminate() {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }

  lastSent(): any {
    return this.sentMessages[this.sentMessages.length - 1];
  }
}

// Minimal FakeServer to pass to attachWearableWebSocket
class FakeHttpServer extends EventEmitter {
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
}

describe('attachWearableWebSocket', () => {
  let wss: any;
  let fakeServer: FakeHttpServer;
  const JWT_SECRET = 'test-jwt-secret';

  function makeToken(payload: object = { id: 'user-1', role: 'patient' }) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    const { attachWearableWebSocket } = await import('../../../src/sockets/wearableSocketHandler');
    // Use a real HTTP server on an ephemeral port so the WSS mounts
    fakeServer = createServer() as any;
    wss = attachWearableWebSocket(fakeServer as unknown as HttpServer);
  });

  afterAll(() => {
    wss.close();
  });

  function simulateConnection(ws: FakeWs) {
    const fakeReq = { socket: { remoteAddress: '127.0.0.1' } };
    wss.emit('connection', ws, fakeReq);
  }

  it('sends pong in response to ping', (done) => {
    const ws = new FakeWs();
    simulateConnection(ws);
    // Authenticate first
    ws.emit('message', JSON.stringify({ type: 'auth', payload: { token: makeToken() } }));
    setTimeout(() => {
      ws.sentMessages = [];
      ws.emit('message', JSON.stringify({ type: 'ping' }));
      expect(ws.lastSent()?.type).toBe('pong');
      done();
    }, 50);
  });

  it('terminates after auth timeout when no auth message sent', (done) => {
    jest.useFakeTimers();
    const ws = new FakeWs();
    simulateConnection(ws);
    jest.advanceTimersByTime(11_000);
    const authError = ws.sentMessages.find((m) => m.type === 'auth:error');
    expect(authError).toBeDefined();
    jest.useRealTimers();
    done();
  });

  it('authenticates with valid JWT', (done) => {
    const ws = new FakeWs();
    simulateConnection(ws);
    ws.emit('message', JSON.stringify({ type: 'auth', payload: { token: makeToken() } }));
    setTimeout(() => {
      const ok = ws.sentMessages.find((m) => m.type === 'auth:ok');
      expect(ok).toBeDefined();
      expect(ok.payload.userId).toBeDefined();
      done();
    }, 50);
  });

  it('rejects auth with invalid token', (done) => {
    const ws = new FakeWs();
    simulateConnection(ws);
    ws.emit('message', JSON.stringify({ type: 'auth', payload: { token: 'bad-token' } }));
    setTimeout(() => {
      const err = ws.sentMessages.find((m) => m.type === 'auth:error');
      expect(err).toBeDefined();
      done();
    }, 50);
  });

  it('rejects auth message without token field', (done) => {
    const ws = new FakeWs();
    simulateConnection(ws);
    ws.emit('message', JSON.stringify({ type: 'auth', payload: {} }));
    setTimeout(() => {
      const err = ws.sentMessages.find((m) => m.type === 'auth:error');
      expect(err).toBeDefined();
      done();
    }, 50);
  });

  it('rejects wearable:data before authentication', (done) => {
    const ws = new FakeWs();
    simulateConnection(ws);
    ws.emit('message', JSON.stringify({ type: 'wearable:data', payload: { heartRate: 80 } }));
    setTimeout(() => {
      const err = ws.sentMessages.find((m) => m.type === 'auth:error');
      expect(err).toBeDefined();
      done();
    }, 50);
  });

  it('saves wearable:data after authentication and sends ack', (done) => {
    const ws = new FakeWs();
    simulateConnection(ws);
    ws.emit('message', JSON.stringify({ type: 'auth', payload: { token: makeToken() } }));
    setTimeout(() => {
      ws.sentMessages = [];
      ws.emit('message', JSON.stringify({
        type: 'wearable:data',
        payload: { heartRate: 75, oxygenSaturation: 98, steps: 1000, timestamp: new Date().toISOString() },
      }));
      setTimeout(() => {
        const ack = ws.sentMessages.find((m) => m.type === 'wearable:ack');
        expect(ack).toBeDefined();
        expect(ack.payload.saved).toBe(true);
        expect(WearableData.create).toHaveBeenCalled();
        done();
      }, 100);
    }, 50);
  });

  it('sends alerts when thresholds exceeded', (done) => {
    (checkThresholdsAndAlert as jest.Mock).mockResolvedValueOnce([
      { level: 'critical', metric: 'heartRate', value: 145, threshold: 130, title: 'FC crítica', message: 'Taquicardia severa' },
    ]);
    const ws = new FakeWs();
    simulateConnection(ws);
    ws.emit('message', JSON.stringify({ type: 'auth', payload: { token: makeToken() } }));
    setTimeout(() => {
      ws.sentMessages = [];
      ws.emit('message', JSON.stringify({
        type: 'wearable:data',
        payload: { heartRate: 145, spO2: 95, steps: 0 },
      }));
      setTimeout(() => {
        const alert = ws.sentMessages.find((m) => m.type === 'wearable:alert');
        expect(alert).toBeDefined();
        expect(alert.payload.level).toBe('critical');
        done();
      }, 100);
    }, 50);
  });

  it('sends error for invalid JSON', (done) => {
    const ws = new FakeWs();
    simulateConnection(ws);
    ws.emit('message', 'not valid json');
    setTimeout(() => {
      const err = ws.lastSent();
      expect(err?.type).toBe('error');
      done();
    }, 30);
  });

  it('sends error for unknown message type after auth', (done) => {
    const ws = new FakeWs();
    simulateConnection(ws);
    ws.emit('message', JSON.stringify({ type: 'auth', payload: { token: makeToken() } }));
    setTimeout(() => {
      ws.sentMessages = [];
      ws.emit('message', JSON.stringify({ type: 'unknown:type' }));
      setTimeout(() => {
        const err = ws.lastSent();
        expect(err?.type).toBe('error');
        done();
      }, 30);
    }, 50);
  });

  it('handles wearable:data with invalid payload', (done) => {
    const ws = new FakeWs();
    simulateConnection(ws);
    ws.emit('message', JSON.stringify({ type: 'auth', payload: { token: makeToken() } }));
    setTimeout(() => {
      ws.sentMessages = [];
      ws.emit('message', JSON.stringify({ type: 'wearable:data', payload: null }));
      setTimeout(() => {
        const err = ws.lastSent();
        expect(err?.type).toBe('error');
        done();
      }, 30);
    }, 50);
  });
});
