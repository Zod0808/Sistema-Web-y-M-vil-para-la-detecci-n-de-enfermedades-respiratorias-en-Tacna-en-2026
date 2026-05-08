import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './PatientMonitoringPage.css';

function buildWsUrl() {
  if (process.env.REACT_APP_WS_URL) return process.env.REACT_APP_WS_URL;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3001`;
}
const WS_URL = buildWsUrl();
const RECONNECT_DELAY_MS = 3000;

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

  const [connected, setConnected] = useState(false);
  const [patients, setPatients] = useState({}); // { patientId: { reading, lastSeen } }
  const [alertLog, setAlertLog] = useState([]);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState < 2) return;

    const ws = new WebSocket(`${WS_URL}/ws/doctor`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'auth', payload: { token } }));
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'auth:ok') {
        // Subscribe to all patients
        ws.send(JSON.stringify({ type: 'subscribe', payload: { patientIds: ['*'] } }));
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

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token]);

  useEffect(() => {
    connect();
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000);

    return () => {
      clearInterval(ping);
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

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
        </div>
      </header>

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
              // Alerts first
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
