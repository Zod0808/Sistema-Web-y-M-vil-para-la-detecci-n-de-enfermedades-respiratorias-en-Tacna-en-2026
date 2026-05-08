/**
 * WebSocket handler for the doctor real-time monitoring dashboard.
 * Mounts at /ws/doctor on the same httpServer.
 *
 * Protocol (JSON):
 *   Client → Server:
 *     { type: 'auth',            payload: { token: string } }
 *     { type: 'subscribe',       payload: { patientIds: string[] } }
 *     { type: 'ping' }
 *
 *   Server → Client:
 *     { type: 'auth:ok',         payload: { userId: string } }
 *     { type: 'auth:error',      payload: { message: string } }
 *     { type: 'subscribed',      payload: { patientIds: string[] } }
 *     { type: 'vitals',          payload: VitalsReading }
 *     { type: 'pong' }
 *     { type: 'error',           payload: { message: string } }
 */

import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { vitalsEmitter, VitalsReading } from './vitalsEmitter';

type DoctorSocket = WebSocket & {
  userId?: string;
  subscribedPatients: Set<string>;
};

function send(ws: WebSocket, msg: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function attachDoctorWebSocket(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/doctor' });

  // Single vitals listener shared across all doctor connections
  const onVitals = (reading: VitalsReading) => {
    wss.clients.forEach((rawWs) => {
      const ws = rawWs as DoctorSocket;
      if (
        ws.readyState === WebSocket.OPEN &&
        ws.subscribedPatients &&
        (ws.subscribedPatients.has(reading.patientId) || ws.subscribedPatients.has('*'))
      ) {
        send(ws, { type: 'vitals', payload: reading });
      }
    });
  };

  vitalsEmitter.on('vitals', onVitals);

  wss.on('connection', (rawWs: WebSocket, req) => {
    const ws = rawWs as DoctorSocket;
    ws.subscribedPatients = new Set();
    logger.info('WebSocket doctor: nueva conexión', { ip: req.socket.remoteAddress });

    let authenticated = false;

    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        send(ws, { type: 'auth:error', payload: { message: 'Timeout de autenticación' } });
        ws.terminate();
      }
    }, 10_000);

    ws.on('message', (raw) => {
      let msg: { type: string; payload?: any };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: 'error', payload: { message: 'Mensaje JSON inválido' } });
        return;
      }

      if (msg.type === 'ping') {
        send(ws, { type: 'pong' });
        return;
      }

      if (msg.type === 'auth') {
        const token = msg.payload?.token;
        if (!token) {
          send(ws, { type: 'auth:error', payload: { message: 'Token requerido' } });
          return;
        }
        try {
          const secret = process.env.JWT_SECRET;
          if (!secret) throw new Error('JWT_SECRET no configurado');
          const decoded = jwt.verify(token, secret) as any;
          const role = decoded.role;
          if (role !== 'doctor' && role !== 'admin') {
            send(ws, { type: 'auth:error', payload: { message: 'Solo médicos pueden acceder' } });
            ws.terminate();
            return;
          }
          ws.userId = decoded.id || decoded._id || decoded.userId;
          authenticated = true;
          clearTimeout(authTimeout);
          send(ws, { type: 'auth:ok', payload: { userId: ws.userId } });
          logger.info('WebSocket doctor: autenticado', { userId: ws.userId });
        } catch {
          send(ws, { type: 'auth:error', payload: { message: 'Token inválido o expirado' } });
          ws.terminate();
        }
        return;
      }

      if (!authenticated) {
        send(ws, { type: 'auth:error', payload: { message: 'No autenticado' } });
        return;
      }

      if (msg.type === 'subscribe') {
        const ids: string[] = Array.isArray(msg.payload?.patientIds)
          ? msg.payload.patientIds
          : ['*']; // '*' = all patients
        ws.subscribedPatients = new Set(ids);
        send(ws, { type: 'subscribed', payload: { patientIds: ids } });
        logger.info('WebSocket doctor: suscrito a pacientes', { doctorId: ws.userId, patientIds: ids });
        return;
      }

      send(ws, { type: 'error', payload: { message: `Tipo desconocido: ${msg.type}` } });
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      logger.info('WebSocket doctor: conexión cerrada', { userId: ws.userId });
    });

    ws.on('error', (err) => {
      logger.error('WebSocket doctor: error en socket', { err: err.message });
    });
  });

  wss.on('close', () => {
    vitalsEmitter.off('vitals', onVitals);
  });

  logger.info('🩺 WebSocket doctor inicializado en /ws/doctor');
  return wss;
}
