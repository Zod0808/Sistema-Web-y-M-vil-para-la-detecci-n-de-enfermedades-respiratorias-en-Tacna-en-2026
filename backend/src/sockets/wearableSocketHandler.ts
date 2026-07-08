/**
 * WebSocket handler para datos de wearables en tiempo real.
 * Monta en /ws/wearables sobre el mismo httpServer que Express.
 *
 * Protocolo de mensajes (JSON):
 *   Cliente → Servidor:
 *     { type: 'auth',          payload: { token: string } }
 *     { type: 'wearable:data', payload: WearableReading }
 *     { type: 'ping' }
 *
 *   Servidor → Cliente:
 *     { type: 'auth:ok',       payload: { userId: string } }
 *     { type: 'auth:error',    payload: { message: string } }
 *     { type: 'wearable:ack',  payload: { saved: boolean, dataId?: string } }
 *     { type: 'wearable:alert',payload: WearableAlert }
 *     { type: 'pong' }
 *     { type: 'error',         payload: { message: string } }
 */

import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import WearableData from '../models/WearableData';
import { checkThresholdsAndAlert } from '../services/wearableAlertService';
import { logger } from '../utils/logger';
import { vitalsEmitter } from './vitalsEmitter';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type AuthenticatedSocket = WebSocket & {
  patientId?: string;
  userId?: string;
};

interface WsMessage {
  type: string;
  payload?: any;
}

function send(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function attachWearableWebSocket(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/wearables' });

  wss.on('connection', (rawWs: WebSocket, req) => {
    const ws = rawWs as AuthenticatedSocket;
    logger.info('WebSocket wearable: nueva conexión', { ip: req.socket.remoteAddress });
    let authenticated = false;

    // Timeout de autenticación: 10 segundos para enviar token
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        send(ws, { type: 'auth:error', payload: { message: 'Timeout de autenticación' } });
        ws.terminate();
      }
    }, 10_000);

    ws.on('message', async (raw) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send(ws, { type: 'error', payload: { message: 'Mensaje JSON inválido' } });
        return;
      }

      // ── ping/pong ─────────────────────────────────────────────────────────
      if (msg.type === 'ping') {
        send(ws, { type: 'pong' });
        return;
      }

      // ── autenticación ─────────────────────────────────────────────────────
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
          ws.userId = decoded.id || decoded._id || decoded.userId;
          ws.patientId = ws.userId;
          authenticated = true;
          clearTimeout(authTimeout);
          send(ws, { type: 'auth:ok', payload: { userId: ws.userId } });
          logger.info('WebSocket wearable: autenticado', { userId: ws.userId });
        } catch (err) {
          send(ws, { type: 'auth:error', payload: { message: 'Token inválido o expirado' } });
          ws.terminate();
        }
        return;
      }

      // ── rechazar mensajes no autenticados ─────────────────────────────────
      if (!authenticated || !ws.patientId) {
        send(ws, { type: 'auth:error', payload: { message: 'No autenticado' } });
        return;
      }

      // ── datos de wearable ─────────────────────────────────────────────────
      if (msg.type === 'wearable:data') {
        const reading = msg.payload;
        if (!reading || typeof reading !== 'object') {
          send(ws, { type: 'error', payload: { message: 'Payload inválido' } });
          return;
        }

        try {
          // Guardar en MongoDB
          const saved = await WearableData.create({
            patientId: ws.patientId,
            heartRate: reading.heartRate,
            oxygenSaturation: reading.oxygenSaturation ?? reading.spO2,
            steps: reading.steps,
            timestamp: reading.timestamp ? new Date(reading.timestamp) : new Date(),
            source: reading.source || 'android_sensor',
          });

          send(ws, { type: 'wearable:ack', payload: { saved: true, dataId: saved._id } });

          // Broadcast vitals to subscribed doctors in real time
          vitalsEmitter.emit('vitals', {
            patientId: ws.patientId,
            heartRate: reading.heartRate,
            oxygenSaturation: reading.oxygenSaturation ?? reading.spO2,
            respiratoryRate: reading.respiratoryRate,
            steps: reading.steps,
            timestamp: reading.timestamp || new Date().toISOString(),
          });

          // Verificar umbrales y emitir alertas si corresponde
          const alerts = await checkThresholdsAndAlert(ws.patientId, {
            heartRate: reading.heartRate,
            oxygenSaturation: reading.oxygenSaturation ?? reading.spO2,
            steps: reading.steps,
            timestamp: reading.timestamp || new Date().toISOString(),
          });

          for (const alert of alerts) {
            send(ws, { type: 'wearable:alert', payload: alert });
            logger.warn('Alerta wearable emitida', { patientId: ws.patientId, alert });
          }
        } catch (err: any) {
          logger.error('Error procesando wearable:data via WS', { err: err.message });
          send(ws, { type: 'wearable:ack', payload: { saved: false, error: err.message } });
        }
        return;
      }

      send(ws, { type: 'error', payload: { message: `Tipo desconocido: ${msg.type}` } });
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      logger.info('WebSocket wearable: conexión cerrada', { userId: ws.userId });
    });

    ws.on('error', (err) => {
      logger.error('WebSocket wearable: error en socket', { err: err.message });
    });
  });

  logger.info('🔌 WebSocket wearables inicializado en /ws/wearables');
  return wss;
}
