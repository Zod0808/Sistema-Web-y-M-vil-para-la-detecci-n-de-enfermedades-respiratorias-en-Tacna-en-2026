import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../utils/apiBase';
import './PatientMonitoringPage.css';

function buildWsUrl() {
  if (process.env.REACT_APP_WS_URL) return process.env.REACT_APP_WS_URL;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3001`;
}
const WS_URL = buildWsUrl();
const RECONNECT_DELAY_MS = 3000;
const WEARABLE_POLL_MS = 60_000; // 1 minuto

const THRESHOLDS = {
  hrLow: 50,
  hrHigh: 120,
  spo2Low: 90,
};

function statusFor(reading) {
  if (!reading) return 'waiting';
  const { heartRate: hr, oxygenSaturation: spo2 } = reading;
  if (
    (hr !== undefined && (hr < THRESHOLDS.hrLow || hr > THRESHOLDS.hrHigh)) ||
    (spo2 !== undefined && spo2 < THRESHOLDS.spo2Low)
  ) {
    return 'alert';
  }
  return 'ok';
}

function VitalsCard({ patientId, reading, lastSeen }) {
  const status = statusFor(reading);
  const age = lastSeen ? Math.round((Date.now() - lastSeen) / 1000) : null;

  return (
    <div className={`vitals-card vitals-card--${status}`}>
      <div className="vitals-card__header">
        <span className="vitals-card__id" title={patientId}>
          Paciente {patientId.slice(-6)}
        </span>
        <span className={`vitals-card__badge vitals-card__badge--${status}`}>
          {status === 'alert' ? 'ALERTA' : status === 'ok' ? 'OK' : 'Esperando...'}
        </span>
      </div>

      <div className="vitals-card__metrics">
        <div className="vitals-metric">
          <span className="vitals-metric__icon">❤️</span>
          <span className="vitals-metric__value">
            {reading?.heartRate != null ? `${reading.heartRate} bpm` : '—'}
          </span>
          <span className="vitals-metric__label">Frec. Cardíaca</span>
        </div>
        <div className="vitals-metric">
          <span className="vitals-metric__icon">🩸</span>
          <span className="vitals-metric__value">
            {reading?.oxygenSaturation != null ? `${reading.oxygenSaturation}%` : '—'}
          </span>
          <span className="vitals-metric__label">SpO₂</span>
        </div>
        {reading?.respiratoryRate != null && (
          <div className="vitals-metric">
            <span className="vitals-metric__icon">🫁</span>
            <span className="vitals-metric__value">{reading.respiratoryRate} rpm</span>
            <span className="vitals-metric__label">Frec. Resp.</span>
          </div>
        )}
      </div>

      {age !== null && (
        <p className="vitals-card__age">
          Actualizado hace {age < 60 ? `${age}s` : `${Math.round(age / 60)}min`}
        </p>
      )}
    </div>
  );
}

export default function PatientMonitoringPage() {
  const { token } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const pollTimer = useRef(null);
  const authFailedRef = useRef(false); // evita reconexión en fallo permanente de auth

  const [connected, setConnected] = useState(false);
  const [patients, setPatients] = useState({}); // { patientId: { reading, lastSeen } }
  const [alertLog, setAlertLog] = useState([]);
  const [errors, setErrors] = useState([]); // lista de mensajes de error visibles
  const [lastPolled, setLastPolled] = useState(null);

  const addError = useCallback((msg) => {
    const id = Date.now();
    setErrors((prev) => [...prev, { id, msg }]);
    // Auto-dismiss después de 8 segundos
    setTimeout(() => setErrors((prev) => prev.filter((e) => e.id !== id)), 8000);
  }, []);

  const dismissError = (id) => setErrors((prev) => prev.filter((e) => e.id !== id));

  /* ── WebSocket ── */
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) return;
    authFailedRef.current = false;

    let ws;
    try {
      ws = new WebSocket(`${WS_URL}/ws/doctor`);
    } catch (err) {
      addError(`No se pudo crear la conexión WebSocket: ${err.message}`);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'auth', payload: { token } }));
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch {
        addError('Mensaje WebSocket malformado recibido.');
        return;
      }

      if (msg.type === 'auth:ok') {
        ws.send(JSON.stringify({ type: 'subscribe', payload: { patientIds: ['*'] } }));
      }

      if (msg.type === 'auth:error') {
        authFailedRef.current = true;
        addError(msg.payload?.message || 'Sin permiso para el monitoreo en tiempo real. Verifica tu sesión.');
        ws.close(1000, 'auth error');
        return;
      }

      if (msg.type === 'error') {
        addError(msg.payload?.message || 'Error recibido del servidor de monitoreo.');
        return;
      }

      if (msg.type === 'vitals') {
        const { patientId, ...reading } = msg.payload;
        setPatients((prev) => ({
          ...prev,
          [patientId]: { reading, lastSeen: Date.now() },
        }));

        if (statusFor(reading) === 'alert') {
          setAlertLog((prev) => [
            { patientId, reading, time: new Date().toLocaleTimeString('es-PE') },
            ...prev.slice(0, 49),
          ]);
        }
      }
    };

    ws.onclose = (ev) => {
      setConnected(false);
      // No reconectar si el auth falló permanentemente o fue cierre limpio
      if (ev.code !== 1000 && !authFailedRef.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      if (!authFailedRef.current) {
        addError('Error de conexión WebSocket. Intentando reconectar en 3 segundos…');
      }
      ws.close();
    };
  }, [token, addError]);

  /* ── Polling de wearables desde BD (cada 1 min) ── */
  const pollWearables = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_BASE}/wearables/data`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100 },
      });
      const readings = data?.data?.data ?? data?.data ?? [];
      if (!Array.isArray(readings) || readings.length === 0) return;

      setLastPolled(new Date());
      setPatients((prev) => {
        const next = { ...prev };
        readings.forEach((r) => {
          const pid = r.patientId ?? r.userId ?? r._id;
          if (!pid) return;
          const reading = {
            heartRate: r.heartRate,
            oxygenSaturation: r.oxygenSaturation,
            respiratoryRate: r.respiratoryRate,
          };
          // Solo actualizar si el dato de BD es más reciente que el WebSocket
          const ts = r.timestamp ? new Date(r.timestamp).getTime() : Date.now();
          if (!next[pid] || ts > (next[pid].lastSeen ?? 0)) {
            next[pid] = { reading, lastSeen: ts };
          }
          if (statusFor(reading) === 'alert') {
            setAlertLog((prev) => {
              const exists = prev.some(
                (e) => e.patientId === pid && e.time === new Date(ts).toLocaleTimeString('es-PE')
              );
              if (exists) return prev;
              return [
                { patientId: pid, reading, time: new Date(ts).toLocaleTimeString('es-PE') },
                ...prev.slice(0, 49),
              ];
            });
          }
        });
        return next;
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error al consultar wearables de la base de datos.';
      addError(`[Wearables BD] ${msg}`);
    }
  }, [token, addError]);

  useEffect(() => {
    connect();

    // Ping para mantener la conexión WebSocket viva
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000);

    // Primer poll inmediato, luego cada 1 minuto
    pollWearables();
    pollTimer.current = setInterval(pollWearables, WEARABLE_POLL_MS);

    return () => {
      clearInterval(ping);
      clearInterval(pollTimer.current);
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close(1000, 'component unmount');
    };
  }, [connect, pollWearables]);

  const patientEntries = Object.entries(patients);
  const alertCount = patientEntries.filter(([, v]) => statusFor(v.reading) === 'alert').length;

  return (
    <div className="monitoring-page">
      <header className="monitoring-header">
        <h1 className="monitoring-title">Monitoreo de Pacientes en Tiempo Real</h1>
        <div className="monitoring-status">
          <span className={`monitoring-dot monitoring-dot--${connected ? 'on' : 'off'}`} />
          {connected ? 'Conectado' : 'Reconectando...'}
          {alertCount > 0 && (
            <span className="monitoring-alert-badge">{alertCount} alerta{alertCount > 1 ? 's' : ''}</span>
          )}
          {lastPolled && (
            <span className="monitoring-poll-info">
              BD: {lastPolled.toLocaleTimeString('es-PE')}
            </span>
          )}
        </div>
      </header>

      {/* Error messages */}
      {errors.map(({ id, msg }) => (
        <div key={id} className="monitoring-error" role="alert">
          ⚠️ {msg}
          <button
            className="monitoring-error__dismiss"
            onClick={() => dismissError(id)}
            aria-label="Cerrar mensaje de error"
          >
            ✕
          </button>
        </div>
      ))}

      {patientEntries.length === 0 ? (
        <div className="monitoring-empty">
          <p>Esperando datos de pacientes...</p>
          <p className="monitoring-empty__sub">
            Los pacientes aparecerán aquí cuando envíen datos desde su wearable.
          </p>
        </div>
      ) : (
        <div className="monitoring-grid">
          {patientEntries
            .sort(([, a], [, b]) => {
              const aAlert = statusFor(a.reading) === 'alert' ? 0 : 1;
              const bAlert = statusFor(b.reading) === 'alert' ? 0 : 1;
              return aAlert - bAlert || b.lastSeen - a.lastSeen;
            })
            .map(([patientId, { reading, lastSeen }]) => (
              <VitalsCard
                key={patientId}
                patientId={patientId}
                reading={reading}
                lastSeen={lastSeen}
              />
            ))}
        </div>
      )}

      {alertLog.length > 0 && (
        <section className="monitoring-log">
          <h2 className="monitoring-log__title">Registro de Alertas</h2>
          <div className="monitoring-log__list">
            {alertLog.map((entry, i) => (
              <div key={i} className="monitoring-log__item">
                <span className="monitoring-log__time">{entry.time}</span>
                <span>Paciente {entry.patientId.slice(-6)}</span>
                {entry.reading.heartRate != null && (
                  <span>FC: {entry.reading.heartRate} bpm</span>
                )}
                {entry.reading.oxygenSaturation != null && (
                  <span>SpO₂: {entry.reading.oxygenSaturation}%</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
