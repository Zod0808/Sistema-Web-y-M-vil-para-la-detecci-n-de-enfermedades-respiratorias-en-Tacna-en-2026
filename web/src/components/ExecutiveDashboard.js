import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './ExecutiveDashboard.css';

const INITIAL_STATE = {
  summary: {
    patients: 0,
    doctors: 0,
    admins: 0,
    activeUsers: 0,
    openAlerts: 0,
    criticalAlerts: 0,
    openAppointments: 0,
  },
  kpis: {
    averageAcknowledgementMinutes: 0,
    appointmentCompletionRate: 0,
    aiConfidenceAverage: 0,
    criticalAlertRatio: 0,
    satisfactionScore: 0,
  },
  usage: {
    loginsLastPeriod: 0,
    appointments: {
      completed: 0,
      cancelled: 0,
      noShow: 0,
    },
    alertsByStatus: {},
    alertsByPriority: {},
    urgencyMix: {},
  },
  trends: {
    topDiagnoses: [],
    symptomCategories: [],
    dailySymptomSeries: [],
  },
  outbreaks: [],
  epidemiology: {
    districtTrends: [],
  },
  predictiveInsights: {
    diseaseTrend: null,
    resourceDemand: null,
  },
  timeframe: {
    from: '',
    to: '',
    periodInDays: 30,
  },
  generatedAt: '',
};

const KPI_COLORS = {
  averageAcknowledgementMinutes: '#2563eb',
  appointmentCompletionRate: '#16a34a',
  aiConfidenceAverage: '#0ea5e9',
  criticalAlertRatio: '#f97316',
  satisfactionScore: '#22c55e',
};

function formatPercentage(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMinutes(value) {
  return `${value.toFixed(1)} min`;
}

function ExecutiveDashboard({ refreshInterval = 60000, autoRefresh = true }) {
  const [data, setData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetchData = async () => {
    try {
      setError(null);
    const response = await axios.get('/api/v1/analytics/executive-dashboard', {
      params: {
        includeOutbreak: true,
      },
    });
      setData((prev) => ({
        ...prev,
        ...response.data,
      }));
      setLoading(false);
    } catch (err) {
      setError(err.message ?? 'No fue posible obtener las métricas ejecutivas');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      timerRef.current = window.setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval]);

  const summaryCards = useMemo(
    () => [
      { label: 'Pacientes', value: data.summary.patients },
      { label: 'Doctores', value: data.summary.doctors },
      { label: 'Administradores', value: data.summary.admins },
      { label: 'Usuarios activos', value: data.summary.activeUsers },
      { label: 'Alertas abiertas', value: data.summary.openAlerts },
      { label: 'Alertas críticas', value: data.summary.criticalAlerts },
      { label: 'Citas abiertas', value: data.summary.openAppointments },
    ],
    [data.summary],
  );

  const kpiCards = useMemo(() => {
    const { kpis } = data;
    return [
      {
        key: 'averageAcknowledgementMinutes',
        label: 'Tiempo promedio de atención',
        value: formatMinutes(kpis.averageAcknowledgementMinutes),
      },
      {
        key: 'appointmentCompletionRate',
        label: 'Tasa de finalización de citas',
        value: formatPercentage(kpis.appointmentCompletionRate),
      },
      {
        key: 'aiConfidenceAverage',
        label: 'Confianza promedio IA',
        value: `${kpis.aiConfidenceAverage.toFixed(1)}%`,
      },
      {
        key: 'criticalAlertRatio',
        label: 'Ratio de alertas críticas',
        value: formatPercentage(kpis.criticalAlertRatio),
      },
      {
        key: 'satisfactionScore',
        label: 'Índice de satisfacción',
        value: `${kpis.satisfactionScore.toFixed(1)}%`,
      },
    ];
  }, [data]);

  const predictive = data.predictiveInsights || {};
  const districtTrends = data.epidemiology?.districtTrends || [];

  const maxDailyTotal = useMemo(() => {
    const series = data.trends?.dailySymptomSeries || [];
    if (!series.length) return 0;
    return Math.max(...series.map((item) => item.total ?? 0));
  }, [data.trends?.dailySymptomSeries]);

  if (loading) {
    return (
      <section className="executive-dashboard">
        <h2>Dashboard Ejecutivo</h2>
        <p>Cargando métricas...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="executive-dashboard">
        <h2>Dashboard Ejecutivo</h2>
        <div className="dashboard-error">
          <p>⚠️ {error}</p>
          <button type="button" onClick={fetchData}>
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="executive-dashboard">
      <header className="dashboard-header">
        <div>
          <h2>Dashboard Ejecutivo</h2>
          <p>
            Periodo analizado: {data.timeframe.from?.slice(0, 10)} →{' '}
            {data.timeframe.to?.slice(0, 10)} ({data.timeframe.periodInDays} días)
          </p>
        </div>
        <span className="dashboard-timestamp">
          Actualizado: {new Date(data.generatedAt || Date.now()).toLocaleString()}
        </span>
      </header>

      <section className="dashboard-grid summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className="dashboard-card">
            <h3>{card.label}</h3>
            <p className="dashboard-value">{card.value.toLocaleString()}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-grid kpi-grid">
        {kpiCards.map((card) => (
          <article
            key={card.key}
            className="dashboard-card dashboard-card--kpi"
            style={{ borderTopColor: KPI_COLORS[card.key] || '#4b5563' }}
          >
            <h3>{card.label}</h3>
            <p className="dashboard-value">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-flex">
        <article className="dashboard-card dashboard-card--wide">
          <h3>Diagnósticos principales</h3>
          <ul className="dashboard-list">
            {data.trends.topDiagnoses.map((item) => (
              <li key={item.diagnosis}>
                <strong>{item.diagnosis}</strong>
                <span>{item.count} casos</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <h3>Distribución por categoría</h3>
          <ul className="dashboard-list">
            {data.trends.symptomCategories.map((item) => (
              <li key={item.category}>
                <strong>{item.category}</strong>
                <span>{item.total} reportes</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="dashboard-card dashboard-card--wide">
        <h3>Tendencia diaria de reportes</h3>
        <div className="dashboard-timeline">
          {data.trends.dailySymptomSeries.map((item) => {
            const value = item.total ?? 0;
            const percent = maxDailyTotal ? Math.min((value / maxDailyTotal) * 100, 100) : 0;
            return (
              <div key={item.date} className="timeline-entry">
                <div className="timeline-bar">
                  <div
                    className="timeline-bar__fill"
                    style={{ height: `${percent}%` }}
                    aria-hidden="true"
                  />
                </div>
                <span className="timeline-date">{item.date}</span>
                <strong className="timeline-value">{value}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-card dashboard-card--wide">
        <h3>Predicción de brotes epidemiológicos</h3>
        {(!data.outbreaks || data.outbreaks.length === 0) && (
          <p>No se detectaron riesgos significativos en el periodo analizado.</p>
        )}
        {!!data.outbreaks?.length && (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Distrito</th>
                <th>Categoría</th>
                <th>Casos recientes</th>
                <th>Crecimiento</th>
                <th>Severidad</th>
                <th>Riesgo</th>
                <th>Confianza</th>
              </tr>
            </thead>
            <tbody>
              {data.outbreaks.map((outbreak, index) => (
                <tr key={`${outbreak.district}-${outbreak.category}-${index}`}>
                  <td>{outbreak.district}</td>
                  <td>{outbreak.category}</td>
                  <td>{outbreak.recentTotal}</td>
                  <td>{(outbreak.growthRate * 100).toFixed(1)}%</td>
                  <td>{(outbreak.severityRate * 100).toFixed(1)}%</td>
                  <td>
                    <span className={`risk-tag risk-tag--${outbreak.riskLevel}`}>
                      {outbreak.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td>{(outbreak.confidence * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="dashboard-flex">
        <article className="dashboard-card dashboard-card--wide">
          <h3>Tendencia proyectada</h3>
          {!predictive.diseaseTrend && <p>No hay suficientes datos para generar predicciones.</p>}
          {predictive.diseaseTrend && (
            <div className="predictive-summary">
              <p>
                <strong>Enfermedad líder:</strong> {predictive.diseaseTrend.disease}
              </p>
              <p>
                <strong>Cambio reciente:</strong> {predictive.diseaseTrend.changePct.toFixed(2)}%
                {' '}
                ({predictive.diseaseTrend.trend === 'increasing' ? '📈' : predictive.diseaseTrend.trend === 'decreasing' ? '📉' : '➡️'}
                {' '}
                {predictive.diseaseTrend.trend})
              </p>
              <h4>Pronóstico (próximos 3 días)</h4>
              <ul className="dashboard-list">
                {predictive.diseaseTrend.forecast.map((item) => (
                  <li key={item.date}>
                    <strong>{item.date}:</strong> {item.predicted}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <h3>Demanda proyectada de recursos</h3>
          {!predictive.resourceDemand && <p>Sin cambios significativos en demanda.</p>}
          {predictive.resourceDemand && (
            <div className="predictive-summary">
              <p>
                <strong>Recurso:</strong> {predictive.resourceDemand.resource}
              </p>
              <p>
                <strong>Carga proyectada:</strong> {(predictive.resourceDemand.projectedLoad * 100).toFixed(0)}%
              </p>
              <div className="resource-progress" role="presentation">
                <div
                  className="resource-progress__fill"
                  style={{ width: `${Math.min(predictive.resourceDemand.projectedLoad * 100, 100)}%` }}
                />
              </div>
              <small>{predictive.resourceDemand.notes}</small>
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-card dashboard-card--wide">
        <h3>Tendencias epidemiológicas por distrito</h3>
        {!districtTrends.length && <p>No se encontraron tendencias significativas en el periodo analizado.</p>}
        {!!districtTrends.length && (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Distrito</th>
                <th>Categoría</th>
                <th>Reportes</th>
                <th>% severidad alta</th>
                <th>Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {districtTrends.map((trend, index) => (
                <tr key={`${trend.district}-${trend.category}-${index}`}>
                  <td>{trend.district}</td>
                  <td>{trend.category}</td>
                  <td>{trend.totalReports}</td>
                  <td>{trend.highSeverityPercentage.toFixed(1)}%</td>
                  <td>
                    <span
                      className={`trend-indicator trend-indicator--${trend.trend}`}
                    >
                      {trend.trend === 'increase'
                        ? '📈 Alza'
                        : trend.trend === 'decrease'
                          ? '📉 Baja'
                          : '➡️ Estable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

ExecutiveDashboard.propTypes = {
  refreshInterval: PropTypes.number,
  autoRefresh: PropTypes.bool,
};

export default ExecutiveDashboard;

