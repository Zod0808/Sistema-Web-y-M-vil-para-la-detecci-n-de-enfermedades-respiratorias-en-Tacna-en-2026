import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { API_BASE } from '../utils/apiBase';
import './PatientMonitoringReport.css';

const STATUS_CONFIG = {
  normal: { color: '#10b981', bg: '#d1fae5', border: '#6ee7b7', label: 'Normal', icon: '✓' },
  precaucion: { color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d', label: 'Precaución', icon: '!' },
  atencion: { color: '#ef4444', bg: '#fee2e2', border: '#fca5a5', label: 'Atención', icon: '⚠' },
  'sin-datos': { color: '#9ca3af', bg: '#f3f4f6', border: '#e5e7eb', label: 'Sin datos', icon: '—' },
};

const VITAL_DESCRIPTIONS = {
  heartRate: {
    normal: 'Tu corazón está latiendo a un ritmo saludable. ¡Todo en orden!',
    precaucion: 'Tu ritmo cardíaco está un poco fuera del rango habitual. Tómate un momento de descanso.',
    atencion: 'Tu ritmo cardíaco requiere atención. Contacta a tu médico si el síntoma persiste.',
    'sin-datos': 'Sin lectura de ritmo cardíaco disponible.',
  },
  oxygenSaturation: {
    normal: 'Tus pulmones están captando bien el oxígeno. ¡Excelente!',
    precaucion: 'Tu nivel de oxígeno en sangre está algo bajo. Evita esfuerzos y descansa.',
    atencion: 'Tu nivel de oxígeno en sangre requiere atención médica urgente.',
    'sin-datos': 'Sin lectura de saturación de oxígeno disponible.',
  },
  respiratoryRate: {
    normal: 'Estás respirando a un ritmo tranquilo y normal.',
    precaucion: 'Tu frecuencia respiratoria está algo elevada. Respira profundo y descansa.',
    atencion: 'Tu frecuencia respiratoria requiere revisión médica urgente.',
    'sin-datos': 'Sin lectura de frecuencia respiratoria disponible.',
  },
};

function getVitalStatus(metric, value) {
  if (!value || value === 0) return 'sin-datos';
  switch (metric) {
    case 'heartRate':
      if (value >= 60 && value <= 100) return 'normal';
      if (value >= 40 && value <= 120) return 'precaucion';
      return 'atencion';
    case 'oxygenSaturation':
      if (value >= 95) return 'normal';
      if (value >= 90) return 'precaucion';
      return 'atencion';
    case 'respiratoryRate':
      if (value >= 12 && value <= 20) return 'normal';
      if (value >= 10 && value <= 25) return 'precaucion';
      return 'atencion';
    default:
      return 'normal';
  }
}

function getOverallStatus(metrics) {
  if (!metrics) return 'sin-datos';
  const statuses = [
    getVitalStatus('heartRate', metrics.heartRate?.current),
    getVitalStatus('oxygenSaturation', metrics.oxygenSaturation?.current),
    getVitalStatus('respiratoryRate', metrics.respiratoryRate?.current),
  ];
  if (statuses.includes('atencion')) return 'atencion';
  if (statuses.includes('precaucion')) return 'precaucion';
  if (statuses.every((s) => s === 'normal')) return 'normal';
  return 'sin-datos';
}

function getActivityMessage(steps) {
  if (!steps || steps === 0) return 'Sin datos de actividad detectados hoy.';
  if (steps >= 10000) return '¡Excelente! Alcanzaste tu meta de pasos del día.';
  if (steps >= 5000) return 'Buena actividad. Vas por buen camino para tu meta de 10,000 pasos.';
  if (steps >= 1000) return 'Actividad moderada. ¡Anímate a dar unos pasos más!';
  return 'Poca actividad detectada. Intenta moverte un poco hoy.';
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function VitalCard({ icon, title, value, unit, metric, referenceRange }) {
  const status = getVitalStatus(metric, value);
  const config = STATUS_CONFIG[status];
  const description = VITAL_DESCRIPTIONS[metric]?.[status] || '';

  return (
    <div
      className="vital-card"
      style={{ borderTopColor: config.color, borderTopWidth: 4, borderTopStyle: 'solid' }}
    >
      <div className="vital-card-top">
        <span className="vital-icon">{icon}</span>
        <span
          className="vital-status-badge"
          style={{ background: config.bg, color: config.color, borderColor: config.border }}
        >
          {config.icon} {config.label}
        </span>
      </div>
      <div className="vital-title">{title}</div>
      <div className="vital-value" style={{ color: config.color }}>
        {value ? Math.round(value) : '—'}
        {value ? <span className="vital-unit"> {unit}</span> : null}
      </div>
      <p className="vital-description">{description}</p>
      {referenceRange && (
        <div className="vital-reference">Rango normal: {referenceRange}</div>
      )}
    </div>
  );
}

function OverallStatusCard({ status, metrics }) {
  const config = STATUS_CONFIG[status];
  const emoji =
    status === 'normal' ? '😊' :
    status === 'precaucion' ? '😐' :
    status === 'atencion' ? '😟' : '📊';

  const message =
    status === 'normal'
      ? 'Todos tus signos vitales están dentro del rango normal. ¡Sigue así!'
      : status === 'precaucion'
      ? 'Algunos signos vitales requieren atención. Revisa los detalles abajo y consulta a tu médico.'
      : status === 'atencion'
      ? 'Uno o más signos vitales requieren atención médica urgente. Contacta a tu médico inmediatamente.'
      : 'No hay datos suficientes para determinar tu estado de salud. Sincroniza tu dispositivo.';

  return (
    <div
      className="overall-status-card"
      style={{ borderColor: config.color, background: config.bg }}
    >
      <div className="overall-emoji">{emoji}</div>
      <div className="overall-content">
        <h2 className="overall-title" style={{ color: config.color }}>
          Estado General: {config.label}
        </h2>
        <p className="overall-message">{message}</p>
      </div>
      {status === 'atencion' && (
        <div className="overall-emergency">
          <strong>Llama a emergencias si sientes malestar severo.</strong>
        </div>
      )}
    </div>
  );
}

const CHART_TOOLTIP_LABELS = {
  heartRate: ['lpm', 'Ritmo Cardíaco'],
  oxygenSaturation: ['%', 'Saturación O₂'],
  respiratoryRate: ['resp/min', 'Frec. Respiratoria'],
};

const CHART_LEGEND_LABELS = {
  heartRate: 'Ritmo Cardíaco',
  oxygenSaturation: 'Saturación O₂',
  respiratoryRate: 'Frec. Respiratoria',
};

function customTooltipFormatter(value, name) {
  const [unit, label] = CHART_TOOLTIP_LABELS[name] || [name, name];
  return [`${value} ${unit}`, label];
}

function customLegendFormatter(value) {
  return CHART_LEGEND_LABELS[value] || value;
}

function PatientMonitoringReport() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [metricsRes, historyRes] = await Promise.all([
        axios.get(`${API_BASE}/wearables/metrics`, { params: { hours: 24 } }),
        axios.get(`${API_BASE}/wearables/data`, { params: { limit: 24 } }),
      ]);

      const m =
        metricsRes.data?.data?.metrics ||
        metricsRes.data?.metrics ||
        null;
      setMetrics(m);

      const raw = historyRes.data?.data?.data || historyRes.data?.data || [];
      const chartData = [...(Array.isArray(raw) ? raw : [])]
        .reverse()
        .map((d) => ({
          time: formatTime(d.timestamp),
          heartRate: d.heartRate || null,
          oxygenSaturation: d.oxygenSaturation || null,
          respiratoryRate: d.respiratoryRate || null,
        }));
      setHistory(chartData);
      setLastUpdate(new Date());
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Debes iniciar sesión para ver tu monitoreo de salud.');
      } else if (err.response?.status === 404 || err.code === 'ECONNREFUSED') {
        setError('No se pudieron cargar los datos. Verifica que el servidor esté activo.');
      } else {
        setError('Error al cargar los datos de monitoreo. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="patient-monitoring">
        <div className="monitoring-loading">
          <div className="loading-spinner" />
          Cargando datos de monitoreo...
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatus(metrics);

  return (
    <div className="patient-monitoring">
      {/* Header */}
      <div className="monitoring-header">
        <div className="monitoring-header-text">
          <h1 className="monitoring-title">Monitor de Salud del Paciente</h1>
          <p className="monitoring-subtitle">
            Resumen de las últimas 24 horas
            {lastUpdate && (
              <> &middot; Actualizado: {lastUpdate.toLocaleTimeString('es-PE')}</>
            )}
          </p>
        </div>
        <button className="btn-refresh" onClick={fetchData}>
          ↻ Actualizar
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="monitoring-error">
          <span className="error-icon">⚠</span> {error}
        </div>
      )}

      {/* Overall status */}
      {metrics && <OverallStatusCard status={overallStatus} metrics={metrics} />}

      {/* Vital Signs */}
      <section className="vitals-section">
        <h2 className="section-title">Signos Vitales en Tiempo Real</h2>
        <div className="vitals-grid">
          <VitalCard
            icon="❤️"
            title="Ritmo Cardíaco"
            value={metrics?.heartRate?.current}
            unit="lpm"
            metric="heartRate"
            referenceRange="60 – 100 lpm"
          />
          <VitalCard
            icon="🫁"
            title="Saturación de Oxígeno"
            value={metrics?.oxygenSaturation?.current}
            unit="%"
            metric="oxygenSaturation"
            referenceRange="≥ 95%"
          />
          <VitalCard
            icon="🌬️"
            title="Frecuencia Respiratoria"
            value={metrics?.respiratoryRate?.current}
            unit="resp/min"
            metric="respiratoryRate"
            referenceRange="12 – 20 resp/min"
          />
          {/* Activity card */}
          <div
            className="vital-card vital-card--activity"
            style={{ borderTopColor: '#6366f1', borderTopWidth: 4, borderTopStyle: 'solid' }}
          >
            <div className="vital-card-top">
              <span className="vital-icon">🚶</span>
              <span
                className="vital-status-badge"
                style={{ background: '#ede9fe', color: '#6366f1', borderColor: '#c4b5fd' }}
              >
                Actividad
              </span>
            </div>
            <div className="vital-title">Actividad del Día</div>
            <div className="vital-value" style={{ color: '#6366f1' }}>
              {metrics?.activity?.steps
                ? metrics.activity.steps.toLocaleString('es-PE')
                : '—'}
              {metrics?.activity?.steps ? (
                <span className="vital-unit"> pasos</span>
              ) : null}
            </div>
            <p className="vital-description">
              {getActivityMessage(metrics?.activity?.steps)}
            </p>
            {metrics?.activity?.distance ? (
              <div className="vital-reference">
                Distancia: {(metrics.activity.distance / 1000).toFixed(2)} km
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Averages */}
      {metrics && (
        <section className="averages-section">
          <h2 className="section-title">Resumen de las Últimas 24 Horas</h2>
          <div className="averages-grid">
            {metrics.heartRate?.average > 0 && (
              <div className="average-item">
                <span className="avg-icon">❤️</span>
                <div className="avg-data">
                  <div className="avg-label">Ritmo cardíaco promedio</div>
                  <div className="avg-value">{Math.round(metrics.heartRate.average)} lpm</div>
                  <div className="avg-range">
                    Mín {Math.round(metrics.heartRate.min)} · Máx{' '}
                    {Math.round(metrics.heartRate.max)} lpm
                  </div>
                </div>
              </div>
            )}
            {metrics.oxygenSaturation?.average > 0 && (
              <div className="average-item">
                <span className="avg-icon">🫁</span>
                <div className="avg-data">
                  <div className="avg-label">Saturación de oxígeno promedio</div>
                  <div className="avg-value">
                    {metrics.oxygenSaturation.average.toFixed(1)}%
                  </div>
                  <div className="avg-range">
                    Mín {Math.round(metrics.oxygenSaturation.min)}%
                  </div>
                </div>
              </div>
            )}
            {metrics.respiratoryRate?.average > 0 && (
              <div className="average-item">
                <span className="avg-icon">🌬️</span>
                <div className="avg-data">
                  <div className="avg-label">Frecuencia respiratoria promedio</div>
                  <div className="avg-value">
                    {Math.round(metrics.respiratoryRate.average)} resp/min
                  </div>
                </div>
              </div>
            )}
            {metrics.period && (
              <div className="average-item">
                <span className="avg-icon">📊</span>
                <div className="avg-data">
                  <div className="avg-label">Lecturas registradas</div>
                  <div className="avg-value">{metrics.period.dataPoints}</div>
                  <div className="avg-range">
                    en las últimas {metrics.period.hours} horas
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trend Chart */}
      {history.length > 1 && (
        <section className="chart-section">
          <h2 className="section-title">Tendencia de Signos Vitales</h2>
          <p className="section-subtitle">
            Evolución reciente de tus mediciones registradas
          </p>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={history}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="hr" domain={[40, 160]} hide />
                <YAxis yAxisId="spo2" orientation="right" domain={[85, 100]} hide />
                <Tooltip formatter={customTooltipFormatter} />
                <Legend formatter={customLegendFormatter} />
                <Line
                  yAxisId="hr"
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="spo2"
                  type="monotone"
                  dataKey="oxygenSaturation"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="hr"
                  type="monotone"
                  dataKey="respiratoryRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend-help">
            <span style={{ color: '#ef4444' }}>— Ritmo cardíaco (lpm)</span>
            <span style={{ color: '#3b82f6' }}>— Saturación O₂ (%)</span>
            <span style={{ color: '#10b981' }}>— Frec. respiratoria (resp/min)</span>
          </div>
        </section>
      )}

      {/* No data state */}
      {!metrics && !error && (
        <div className="no-data-state">
          <div className="no-data-icon">📱</div>
          <h3>Sin datos de wearables</h3>
          <p>
            Conecta tu dispositivo de salud (Apple Health, Google Fit o Android) para
            ver tu monitoreo en tiempo real.
          </p>
        </div>
      )}

      {/* Reference guide */}
      <section className="reference-section">
        <h2 className="section-title">Guía de Referencia</h2>
        <div className="reference-grid">
          <div className="reference-card">
            <div className="ref-header">
              <span>❤️</span> Ritmo Cardíaco
            </div>
            <div className="ref-row ref-normal">
              <span className="ref-badge ref-badge--normal">Normal</span>
              <span>60 – 100 lpm</span>
            </div>
            <div className="ref-row ref-warning">
              <span className="ref-badge ref-badge--warning">Precaución</span>
              <span>40 – 59 o 101 – 120 lpm</span>
            </div>
            <div className="ref-row ref-danger">
              <span className="ref-badge ref-badge--danger">Atención</span>
              <span>&lt; 40 o &gt; 120 lpm</span>
            </div>
          </div>
          <div className="reference-card">
            <div className="ref-header">
              <span>🫁</span> Saturación de Oxígeno
            </div>
            <div className="ref-row ref-normal">
              <span className="ref-badge ref-badge--normal">Normal</span>
              <span>≥ 95%</span>
            </div>
            <div className="ref-row ref-warning">
              <span className="ref-badge ref-badge--warning">Precaución</span>
              <span>90% – 94%</span>
            </div>
            <div className="ref-row ref-danger">
              <span className="ref-badge ref-badge--danger">Atención</span>
              <span>&lt; 90%</span>
            </div>
          </div>
          <div className="reference-card">
            <div className="ref-header">
              <span>🌬️</span> Frecuencia Respiratoria
            </div>
            <div className="ref-row ref-normal">
              <span className="ref-badge ref-badge--normal">Normal</span>
              <span>12 – 20 resp/min</span>
            </div>
            <div className="ref-row ref-warning">
              <span className="ref-badge ref-badge--warning">Precaución</span>
              <span>10 – 11 o 21 – 25 resp/min</span>
            </div>
            <div className="ref-row ref-danger">
              <span className="ref-badge ref-badge--danger">Atención</span>
              <span>&lt; 10 o &gt; 25 resp/min</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PatientMonitoringReport;