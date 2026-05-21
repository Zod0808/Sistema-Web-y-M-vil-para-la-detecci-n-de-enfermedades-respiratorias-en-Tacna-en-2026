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
const WEARABLE_POLL_MS = 60_000;
const ALERT_POLL_MS = 30_000;

// Clinical thresholds aligned with backend wearableAlertService
const THRESHOLDS = {
  hrCriticalHigh: 130,
  hrHigh: 100,
  hrCriticalLow: 40,
  hrHighLow: 50,
  spo2Critical: 90,
  spo2High: 94,
  rrCriticalHigh: 30,
  rrHigh: 25,
  rrCriticalLow: 10,
  rrHighLow: 12,
};

function statusFor(reading) {
  if (!reading) return 'waiting';
  const { heartRate: hr, oxygenSaturation: spo2, respiratoryRate: rr } = reading;

  if (
    (hr !== undefined && (hr >= THRESHOLDS.hrCriticalHigh || hr <= THRESHOLDS.hrCriticalLow)) ||
    (spo2 !== undefined && spo2 < THRESHOLDS.spo2Critical) ||
    (rr !== undefined && (rr >= THRESHOLDS.rrCriticalHigh || rr <= THRESHOLDS.rrCriticalLow))
  ) return 'critical';

  if (
    (hr !== undefined && (hr > THRESHOLDS.hrHigh || hr < THRESHOLDS.hrHighLow)) ||
    (spo2 !== undefined && spo2 < THRESHOLDS.spo2High) ||
    (rr !== undefined && (rr >= THRESHOLDS.rrHigh || rr <= THRESHOLDS.rrHighLow))
  ) return 'high';

  return 'ok';
}

function metricSeverity(value, criticalHigh, high, criticalLow, highLow) {
  if (value == null) return 'normal';
  if (criticalHigh !== undefined && value >= criticalHigh) return 'critical';
  if (criticalLow !== undefined && value <= criticalLow) return 'critical';
  if (high !== undefined && value > high) return 'high';
  if (highLow !== undefined && value < highLow) return 'high';
  return 'normal';
}

function playBeep(critical = false) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const times = critical ? [0, 0.45] : [0];
    times.forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = critical ? 880 : 620;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.35);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.35);
    });
  } catch {
    // AudioContext may be blocked without prior user gesture
  }
}

function MetricCell({ icon, value, unit, label, criticalHigh, high, criticalLow, highLow }) {
  const sev = metricSeverity(value, criticalHigh, high, criticalLow, highLow);
  return (
    <div className={`vitals-metric vitals-metric--${sev}`}>
      <span className="vitals-metric__icon">{icon}</span>
      <span className="vitals-metric__value">{value != null ? `${value} ${unit}` : '—'}</span>
      <span className="vitals-metric__label">{label}</span>
    </div>
  );
}

function VitalsCard({ patientId, reading, lastSeen, pendingAlerts, onAcknowledge }) {
  const status = statusFor(reading);
  const age = lastSeen ? Math.round((Date.now() - lastSeen) / 1000) : null;
  const LABEL = { critical: '🆘 CRÍTICO', high: '⚠️ ALERTA', ok: '✅ OK', waiting: 'Esperando...' };

  return (
    <div className={`vitals-card vitals-card--${status}`}>
      <div className="vitals-card__header">
        <span className="vitals-card__id" title={patientId}>Paciente {patientId.slice(-6)}</span>
        <span className={`vitals-card__badge vitals-card__badge--${status}`}>{LABEL[status]}</span>
      </div>

      <div className="vitals-card__metrics">
        <MetricCell
          icon="❤️" value={reading?.heartRate} unit="bpm" label="Frec. Cardíaca"
          criticalHigh={THRESHOLDS.hrCriticalHigh} high={THRESHOLDS.hrHigh}
          criticalLow={THRESHOLDS.hrCriticalLow} highLow={THRESHOLDS.hrHighLow}
        />
        <MetricCell
          icon="🩸" value={reading?.oxygenSaturation} unit="%" label="SpO₂"
          criticalLow={THRESHOLDS.spo2Critical} highLow={THRESHOLDS.spo2High}
        />
        {reading?.respiratoryRate != null && (
          <MetricCell
            icon="🫁" value={reading.respiratoryRate} unit="rpm" label="Frec. Resp."
            criticalHigh={THRESHOLDS.rrCriticalHigh} high={THRESHOLDS.rrHigh}
            criticalLow={THRESHOLDS.rrCriticalLow} highLow={THRESHOLDS.rrHighLow}
          />
        )}
      </div>

      {age !== null && (
        <p className="vitals-card__age">
          Actualizado hace {age < 60 ? `${age}s` : `${Math.round(age / 60)}min`}
        </p>
      )}

      {pendingAlerts?.length > 0 && (
        <div className="vitals-card__db-alerts">
          {pendingAlerts.map((a) => (
            <div key={a._id} className={`db-alert db-alert--${a.priority}`}>
              <div className="db-alert__body">
                <span className="db-alert__title">{a.title}</span>
                <span className="db-alert__msg">{a.message}</span>
              </div>
              <button
                className="db-alert__ack"
                onClick={() => onAcknowledge(a._id)}
                title="Marcar como revisado"
              >
                ✓
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientMonitoringPage() {
  const { token } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const pollTimer = useRef(null);
  const alertPollTimer = useRef(null);
  const authFailedRef = useRef(false);
  const soundEnabledRef = useRef(false);
  const prevStatusRef = useRef({});
  const patientsRef = useRef({});

  const [connected, setConnected] = useState(false);
  const [patients, setPatients] = useState({});
  const [alertLog, setAlertLog] = useState([]);
  const [dbAlertsByPatient, setDbAlertsByPatient] = useState({});
  const [errors, setErrors] = useState([]);
  const [lastPolled, setLastPolled] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const addError = useCallback((msg) => {
    const id = Date.now();
    setErrors((prev) => [...prev, { id, msg }]);
    setTimeout(() => setErrors((prev) => prev.filter((e) => e.id !== id)), 8000);
  }, []);

  const dismissError = (id) => setErrors((prev) => prev.filter((e) => e.id !== id));

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      soundEnabledRef.current = !prev;
      return !prev;
    });
  }, []);

  /* ── DB alerts per patient ── */
  const fetchPatientAlerts = useCallback(async (patientId) => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_BASE}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { patientId, status: 'pending', category: 'critical_symptom' },
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      setDbAlertsByPatient((prev) => ({ ...prev, [patientId]: list }));
    } catch {
      // DB alerts are supplementary; ignore fetch errors silently
    }
  }, [token]);

  const acknowledgeAlert = useCallback(async (alertId) => {
    if (!token) return;
    try {
      await axios.post(`${API_BASE}/alerts/${alertId}/acknowledge`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDbAlertsByPatient((prev) => {
        const next = { ...prev };
        for (const pid of Object.keys(next)) {
          next[pid] = next[pid].filter((a) => a._id !== alertId);
        }
        return next;
      });
    } catch (err) {
      addError(`Error al reconocer la alerta: ${err.response?.data?.message || err.message}`);
    }
  }, [token, addError]);

  /* ── Vitals processing with sound and alert log ── */
  const processVitals = useCallback((patientId, reading) => {
    setPatients((prev) => ({
      ...prev,
      [patientId]: { reading, lastSeen: Date.now() },
    }));

    const newStatus = statusFor(reading);
    const prevStatus = prevStatusRef.current[patientId];

    if (newStatus !== prevStatus && (newStatus === 'critical' || newStatus === 'high')) {
      if (soundEnabledRef.current) playBeep(newStatus === 'critical');

      setAlertLog((prev) => [
        { patientId, reading, status: newStatus, time: new Date().toLocaleTimeString('es-PE') },
        ...prev.slice(0, 49),
      ]);
    }

    prevStatusRef.current[patientId] = newStatus;
  }, []);

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
        processVitals(patientId, reading);
      }
    };

    ws.onclose = (ev) => {
      setConnected(false);
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
  }, [token, addError, processVitals]);

  /* ── Polling wearables from DB ── */
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
          const ts = r.timestamp ? new Date(r.timestamp).getTime() : Date.now();
          if (!next[pid] || ts > (next[pid].lastSeen ?? 0)) {
            next[pid] = { reading, lastSeen: ts };
          }
        });
        return next;
      });
    } catch (err) {
      addError(`[BD] ${err.response?.data?.message || err.message}`);
    }
  }, [token, addError]);

  useEffect(() => {
    connect();
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000);

    pollWearables();
    pollTimer.current = setInterval(pollWearables, WEARABLE_POLL_MS);

    return () => {
      clearInterval(ping);
      clearInterval(pollTimer.current);
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close(1000, 'component unmount');
    };
  }, [connect, pollWearables]);

  // Keep patientsRef current
  useEffect(() => { patientsRef.current = patients; }, [patients]);

  // Fetch DB alerts when a new patient appears
  useEffect(() => {
    const prevPids = new Set(Object.keys(patientsRef.current));
    const newPids = Object.keys(patients).filter((pid) => !prevPids.has(pid));
    newPids.forEach((pid) => fetchPatientAlerts(pid));
  }, [patients, fetchPatientAlerts]);

  // Periodic DB alert refresh
  useEffect(() => {
    alertPollTimer.current = setInterval(() => {
      Object.keys(patientsRef.current).forEach((pid) => fetchPatientAlerts(pid));
    }, ALERT_POLL_MS);
    return () => clearInterval(alertPollTimer.current);
  }, [fetchPatientAlerts]);

  const patientEntries = Object.entries(patients);
  const criticalCount = patientEntries.filter(([, v]) => statusFor(v.reading) === 'critical').length;
  const highCount = patientEntries.filter(([, v]) => statusFor(v.reading) === 'high').length;

  return (
    <div className="monitoring-page">
      <header className="monitoring-header">
        <h1 className="monitoring-title">Monitoreo de Pacientes en Tiempo Real</h1>
        <div className="monitoring-status">
          <span className={`monitoring-dot monitoring-dot--${connected ? 'on' : 'off'}`} />
          {connected ? 'Conectado' : 'Reconectando...'}
          {criticalCount > 0 && (
            <span className="monitoring-badge monitoring-badge--critical">
              🆘 {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          {highCount > 0 && (
            <span className="monitoring-badge monitoring-badge--high">
              ⚠️ {highCount} alerta{highCount > 1 ? 's' : ''}
            </span>
          )}
          {lastPolled && (
            <span className="monitoring-poll-info">BD: {lastPolled.toLocaleTimeString('es-PE')}</span>
          )}
          <button
            className={`monitoring-sound-btn ${soundEnabled ? 'monitoring-sound-btn--on' : ''}`}
            onClick={toggleSound}
            title={soundEnabled ? 'Silenciar alertas sonoras' : 'Activar sonido de alertas'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>
        </div>
      </header>

      {errors.map(({ id, msg }) => (
        <div key={id} className="monitoring-error" role="alert">
          ⚠️ {msg}
          <button className="monitoring-error__dismiss" onClick={() => dismissError(id)} aria-label="Cerrar">✕</button>
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
              const rank = { critical: 0, high: 1, ok: 2, waiting: 3 };
              const ra = rank[statusFor(a.reading)] ?? 3;
              const rb = rank[statusFor(b.reading)] ?? 3;
              return ra - rb || b.lastSeen - a.lastSeen;
            })
            .map(([pid, { reading, lastSeen }]) => (
              <VitalsCard
                key={pid}
                patientId={pid}
                reading={reading}
                lastSeen={lastSeen}
                pendingAlerts={dbAlertsByPatient[pid]}
                onAcknowledge={acknowledgeAlert}
              />
            ))}
        </div>
      )}

      {alertLog.length > 0 && (
        <section className="monitoring-log">
          <h2 className="monitoring-log__title">Registro de Alertas</h2>
          <div className="monitoring-log__list">
            {alertLog.map((entry, i) => (
              <div key={i} className={`monitoring-log__item monitoring-log__item--${entry.status}`}>
                <span className={`monitoring-log__sev monitoring-log__sev--${entry.status}`}>
                  {entry.status === 'critical' ? '🆘' : '⚠️'}
                </span>
                <span className="monitoring-log__time">{entry.time}</span>
                <span>Pac. {entry.patientId.slice(-6)}</span>
                {entry.reading.heartRate != null && <span>FC: {entry.reading.heartRate} bpm</span>}
                {entry.reading.oxygenSaturation != null && <span>SpO₂: {entry.reading.oxygenSaturation}%</span>}
                {entry.reading.respiratoryRate != null && <span>FR: {entry.reading.respiratoryRate} rpm</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
