import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './AutomaticReportsDashboard.css';
import { API_BASE } from '../utils/apiBase';

const REPORT_TYPES = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7', icon: '⏳' },
  generating: { label: 'Generando', color: '#3b82f6', bg: '#dbeafe', icon: '⚙️' },
  completed: { label: 'Completado', color: '#10b981', bg: '#d1fae5', icon: '✓' },
  failed: { label: 'Fallido', color: '#ef4444', bg: '#fee2e2', icon: '✗' },
  exported: { label: 'Exportado', color: '#8b5cf6', bg: '#ede9fe', icon: '↓' },
};

const SEVERITY_CONFIG = {
  low: { label: 'Leve', color: '#f59e0b', bg: '#fef3c7', icon: '●' },
  medium: { label: 'Moderado', color: '#f97316', bg: '#ffedd5', icon: '●●' },
  high: { label: 'Alto', color: '#ef4444', bg: '#fee2e2', icon: '●●●' },
  critical: { label: 'Crítico', color: '#dc2626', bg: '#fee2e2', icon: '⚠' },
};

const METRIC_LABELS = {
  totalPatients: 'Pacientes registrados',
  totalDoctors: 'Doctores',
  totalAdmins: 'Administradores',
  totalMedicalHistories: 'Historias clínicas',
  totalAlerts: 'Alertas generadas',
  criticalAlerts: 'Alertas críticas',
  totalAppointments: 'Citas programadas',
  completedAppointments: 'Citas completadas',
  aiAnalyses: 'Análisis con IA',
  averageAIConfidence: 'Confianza del diagnóstico IA',
};

const ANOMALY_DESCRIPTIONS = {
  totalAlerts: 'Se detectó un número inusual de alertas en este período.',
  criticalAlerts: 'Las alertas críticas superaron el rango esperado.',
  totalPatients: 'La cantidad de pacientes registrados cambió de forma inesperada.',
  completedAppointments: 'El porcentaje de citas completadas está fuera del rango habitual.',
  aiAnalyses: 'El volumen de análisis de IA fue inusual en este período.',
};

function getAnomalyExplanation(metric) {
  return (
    ANOMALY_DESCRIPTIONS[metric] ||
    `La métrica "${METRIC_LABELS[metric] || metric}" presentó un valor fuera del rango esperado.`
  );
}

function getGrowthMessage(value, label) {
  if (value > 10) return `${label} creció significativamente (+${value.toFixed(1)}%).`;
  if (value > 0) return `${label} tuvo un leve aumento (+${value.toFixed(1)}%).`;
  if (value < -10) return `${label} disminuyó considerablemente (${value.toFixed(1)}%).`;
  if (value < 0) return `${label} tuvo una leve baja (${value.toFixed(1)}%).`;
  return `${label} se mantuvo estable.`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPercentage(value) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function ReportSummaryBadge({ report }) {
  const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
  const typeCfg = REPORT_TYPES[report.reportType] || report.reportType;
  const anomalyCount = report.anomalies?.length || 0;

  return (
    <div className="report-card" onClick={() => report._onView(report._id)}>
      <div className="report-card-header">
        <div className="report-type-badge">
          {report.reportType === 'daily' ? '📅' : report.reportType === 'weekly' ? '📆' : '🗓️'}{' '}
          {typeCfg}
        </div>
        <span
          className="status-badge"
          style={{ background: statusCfg.bg, color: statusCfg.color }}
        >
          {statusCfg.icon} {statusCfg.label}
        </span>
      </div>
      <div className="report-period">
        {formatDate(report.period.startDate)} — {formatDate(report.period.endDate)}
      </div>
      {report.metrics && (
        <div className="report-metrics-preview">
          <div className="metric-row">
            <span className="metric-label-text">Historias clínicas</span>
            <span className="metric-value-text">
              {report.metrics.totalMedicalHistories || 0}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label-text">Alertas</span>
            <span className="metric-value-text">{report.metrics.totalAlerts || 0}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label-text">Citas</span>
            <span className="metric-value-text">
              {report.metrics.totalAppointments || 0}
            </span>
          </div>
          {report.metrics.aiAnalyses > 0 && (
            <div className="metric-row">
              <span className="metric-label-text">Análisis IA</span>
              <span className="metric-value-text">{report.metrics.aiAnalyses}</span>
            </div>
          )}
        </div>
      )}
      {anomalyCount > 0 && (
        <div className="anomaly-alert-bar">
          ⚠ {anomalyCount} anomalía{anomalyCount > 1 ? 's' : ''} detectada{anomalyCount > 1 ? 's' : ''}
        </div>
      )}
      <div className="report-card-actions">
        <button
          className="btn-export btn-pdf"
          onClick={(e) => {
            e.stopPropagation();
            report._onExport(report._id, 'pdf');
          }}
        >
          ↓ PDF
        </button>
        <button
          className="btn-export btn-csv"
          onClick={(e) => {
            e.stopPropagation();
            report._onExport(report._id, 'csv');
          }}
        >
          ↓ CSV
        </button>
      </div>
    </div>
  );
}

function ReportDetailModal({ report, onClose }) {
  if (!report) return null;
  const m = report.metrics || {};
  const grow = m.growthMetrics || {};

  const anomalyCount = report.anomalies?.length || 0;
  const criticalAnomalies = report.anomalies?.filter((a) => a.severity === 'critical') || [];
  const hasIssues = anomalyCount > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {report.reportType === 'daily' ? '📅' :
               report.reportType === 'weekly' ? '📆' : '🗓️'}{' '}
              Reporte {REPORT_TYPES[report.reportType]}
            </h2>
            <p className="modal-period">
              {formatDate(report.period.startDate)} — {formatDate(report.period.endDate)}
            </p>
          </div>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Quick summary */}
          <div className={`report-summary-banner ${hasIssues ? 'has-issues' : 'all-good'}`}>
            <span className="summary-icon">
              {criticalAnomalies.length > 0 ? '🔴' : hasIssues ? '🟡' : '🟢'}
            </span>
            <div>
              <strong>
                {criticalAnomalies.length > 0
                  ? 'Este período tuvo anomalías críticas que requieren atención.'
                  : hasIssues
                  ? `Se detectaron ${anomalyCount} anomalía(s) de severidad leve o moderada.`
                  : 'Todo en orden. No se detectaron anomalías en este período.'}
              </strong>
              {m.averageAIConfidence > 0 && (
                <span className="ai-confidence">
                  {' · '}Confianza diagnóstica IA: {(m.averageAIConfidence * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          {/* Main metrics */}
          <section className="detail-section">
            <h3 className="detail-section-title">Métricas del Período</h3>
            <div className="metrics-grid">
              {[
                { key: 'totalPatients', icon: '👥', label: 'Pacientes' },
                { key: 'totalDoctors', icon: '🩺', label: 'Doctores' },
                { key: 'totalMedicalHistories', icon: '📋', label: 'Historias clínicas' },
                { key: 'totalAlerts', icon: '🔔', label: 'Alertas' },
                { key: 'criticalAlerts', icon: '🚨', label: 'Alertas críticas' },
                { key: 'totalAppointments', icon: '📅', label: 'Citas' },
                { key: 'completedAppointments', icon: '✅', label: 'Citas completadas' },
                { key: 'aiAnalyses', icon: '🤖', label: 'Análisis IA' },
              ].map(({ key, icon, label }) =>
                m[key] !== undefined ? (
                  <div key={key} className="metric-card">
                    <span className="metric-card-icon">{icon}</span>
                    <div className="metric-card-value">{m[key]}</div>
                    <div className="metric-card-label">{label}</div>
                  </div>
                ) : null
              )}
            </div>
          </section>

          {/* Growth metrics */}
          {(grow.patientsGrowth !== undefined ||
            grow.historiesGrowth !== undefined ||
            grow.alertsGrowth !== undefined) && (
            <section className="detail-section">
              <h3 className="detail-section-title">¿Qué cambió respecto al período anterior?</h3>
              <div className="growth-list">
                {grow.patientsGrowth !== undefined && (
                  <div className={`growth-item ${grow.patientsGrowth >= 0 ? 'positive' : 'negative'}`}>
                    <span className="growth-arrow">
                      {grow.patientsGrowth >= 0 ? '↑' : '↓'}
                    </span>
                    <div>
                      <span className="growth-percent">{formatPercentage(grow.patientsGrowth)}</span>
                      {' '}{getGrowthMessage(grow.patientsGrowth, 'Pacientes')}
                    </div>
                  </div>
                )}
                {grow.historiesGrowth !== undefined && (
                  <div className={`growth-item ${grow.historiesGrowth >= 0 ? 'positive' : 'negative'}`}>
                    <span className="growth-arrow">
                      {grow.historiesGrowth >= 0 ? '↑' : '↓'}
                    </span>
                    <div>
                      <span className="growth-percent">{formatPercentage(grow.historiesGrowth)}</span>
                      {' '}{getGrowthMessage(grow.historiesGrowth, 'Historias clínicas')}
                    </div>
                  </div>
                )}
                {grow.alertsGrowth !== undefined && (
                  <div className={`growth-item ${grow.alertsGrowth >= 0 ? 'positive' : 'negative'}`}>
                    <span className="growth-arrow">
                      {grow.alertsGrowth >= 0 ? '↑' : '↓'}
                    </span>
                    <div>
                      <span className="growth-percent">{formatPercentage(grow.alertsGrowth)}</span>
                      {' '}{getGrowthMessage(grow.alertsGrowth, 'Alertas')}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Anomalies */}
          {report.anomalies && report.anomalies.length > 0 && (
            <section className="detail-section">
              <h3 className="detail-section-title">Anomalías Detectadas</h3>
              <p className="detail-section-hint">
                El sistema identificó valores fuera del rango habitual. Esto no implica
                necesariamente un problema — puede reflejar eventos específicos del período.
              </p>
              <div className="anomalies-list">
                {report.anomalies.map((anomaly, index) => {
                  const sev = SEVERITY_CONFIG[anomaly.severity] || SEVERITY_CONFIG.low;
                  return (
                    <div
                      key={index}
                      className="anomaly-card"
                      style={{ borderLeftColor: sev.color }}
                    >
                      <div className="anomaly-card-header">
                        <div className="anomaly-name">
                          {METRIC_LABELS[anomaly.metric] || anomaly.metric}
                        </div>
                        <span
                          className="severity-badge"
                          style={{ background: sev.bg, color: sev.color }}
                        >
                          {sev.icon} {sev.label}
                        </span>
                      </div>
                      <p className="anomaly-explanation">
                        {getAnomalyExplanation(anomaly.metric)}
                      </p>
                      <div className="anomaly-numbers">
                        <span>
                          Valor detectado:{' '}
                          <strong>{anomaly.value.toFixed(1)}</strong>
                        </span>
                        <span>
                          Rango esperado:{' '}
                          <strong>
                            {anomaly.expectedRange.min.toFixed(1)} –{' '}
                            {anomaly.expectedRange.max.toFixed(1)}
                          </strong>
                        </span>
                      </div>
                      {anomaly.description && (
                        <p className="anomaly-desc-raw">{anomaly.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Top diagnoses */}
          {m.topDiagnoses && m.topDiagnoses.length > 0 && (
            <section className="detail-section">
              <h3 className="detail-section-title">Diagnósticos más frecuentes</h3>
              <div className="diagnoses-list">
                {m.topDiagnoses.map((item, index) => (
                  <div key={index} className="diagnosis-item">
                    <span className="diagnosis-rank">#{index + 1}</span>
                    <span className="diagnosis-name">{item.diagnosis}</span>
                    <span className="diagnosis-count">{item.count} caso{item.count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function AutomaticReportsDashboard({ refreshInterval = 30000, autoRefresh = true }) {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState(null);
  const [generating, setGenerating] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const params = filterType !== 'all' ? { type: filterType } : {};
      const response = await axios.get(`${API_BASE}/reports/automatic`, { params });

      if (response.data.success !== false) {
        const reportsData =
          response.data.data?.reports || response.data.reports || [];
        setReports(Array.isArray(reportsData) ? reportsData : []);
      } else {
        setReports([]);
        setError(response.data.message || 'No se pudieron cargar los reportes automáticos.');
      }
      setLoading(false);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setError('No se puede conectar al servidor. Verifica que el backend esté activo.');
      } else if (err.response?.status === 503) {
        setError('El servicio no está disponible temporalmente. Intenta más tarde.');
      } else {
        setError(err.response?.data?.message || 'Error cargando reportes. Verifica que el backend esté activo.');
      }
      setReports([]);
      setLoading(false);
    }
  }, [filterType]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/reports/automatic/stats`);
      if (response.data.success !== false) {
        const d = response.data.data || response.data;
        setStats({
          total: d.total || 0,
          byType: d.byType || { daily: 0, weekly: 0, monthly: 0 },
          byStatus: d.byStatus || {
            completed: 0,
            pending: 0,
            generating: 0,
            failed: 0,
            exported: 0,
          },
        });
      } else {
        setStats({
          total: 0,
          byType: { daily: 0, weekly: 0, monthly: 0 },
          byStatus: { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 },
        });
      }
    } catch {
      setStats({
        total: 0,
        byType: { daily: 0, weekly: 0, monthly: 0 },
        byStatus: { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 },
      });
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchStats();
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchReports();
        fetchStats();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchReports, fetchStats]);

  const fetchReportDetails = async (reportId) => {
    try {
      const response = await axios.get(`${API_BASE}/reports/automatic/${reportId}`);
      setSelectedReport(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error cargando detalles del reporte');
    }
  };

  const generateReport = async (reportType) => {
    try {
      setGenerating(true);
      await axios.post(`${API_BASE}/reports/automatic/generate`, {
        reportType,
        includeAnomalies: true,
        autoExport: true,
        exportFormat: 'pdf',
      });
      await fetchReports();
      setGenerating(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Error generando reporte');
      setGenerating(false);
    }
  };

  const exportReport = async (reportId, format = 'pdf') => {
    try {
      const response = await axios.post(
        `${API_BASE}/reports/automatic/${reportId}/export`,
        { format },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_${reportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.response?.data?.message || 'Error exportando reporte');
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="automatic-reports-dashboard">
        <div className="loading">Cargando reportes...</div>
      </div>
    );
  }

  const reportsWithHandlers = reports.map((r) => ({
    ...r,
    _onView: fetchReportDetails,
    _onExport: exportReport,
  }));

  return (
    <div className="automatic-reports-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Reportes Automáticos</h1>
          <p className="dashboard-subtitle">
            Resúmenes periódicos del sistema de salud respiratoria
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn-generate btn-daily"
            onClick={() => generateReport('daily')}
            disabled={generating}
            title="Genera un reporte del día actual"
          >
            📅 Generar Diario
          </button>
          <button
            className="btn-generate btn-weekly"
            onClick={() => generateReport('weekly')}
            disabled={generating}
            title="Genera un reporte de los últimos 7 días"
          >
            📆 Generar Semanal
          </button>
          <button
            className="btn-generate btn-monthly"
            onClick={() => generateReport('monthly')}
            disabled={generating}
            title="Genera un reporte del último mes"
          >
            🗓️ Generar Mensual
          </button>
        </div>
      </div>

      {generating && (
        <div className="generating-banner">
          ⚙️ Generando reporte... esto puede tomar unos segundos.
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠</span> {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="stats-overview">
          <div className="stat-card stat-card--total">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total reportes</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-value">{stats.byType?.daily || 0}</div>
            <div className="stat-label">Diarios</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📆</div>
            <div className="stat-value">{stats.byType?.weekly || 0}</div>
            <div className="stat-label">Semanales</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🗓️</div>
            <div className="stat-value">{stats.byType?.monthly || 0}</div>
            <div className="stat-label">Mensuales</div>
          </div>
          <div className="stat-card stat-card--success">
            <div className="stat-icon">✓</div>
            <div className="stat-value">{stats.byStatus?.completed || 0}</div>
            <div className="stat-label">Completados</div>
          </div>
          {(stats.byStatus?.failed || 0) > 0 && (
            <div className="stat-card stat-card--failed">
              <div className="stat-icon">✗</div>
              <div className="stat-value">{stats.byStatus.failed}</div>
              <div className="stat-label">Fallidos</div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'daily', label: '📅 Diarios' },
          { id: 'weekly', label: '📆 Semanales' },
          { id: 'monthly', label: '🗓️ Mensuales' },
        ].map(({ id, label }) => (
          <button
            key={id}
            className={filterType === id ? 'active' : ''}
            onClick={() => setFilterType(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!error && !loading && reports.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>Sin reportes disponibles</h3>
          <p>
            Usa los botones de arriba para generar tu primer reporte diario, semanal o mensual.
          </p>
        </div>
      )}

      {/* Reports grid */}
      <div className="reports-grid">
        {reportsWithHandlers.map((report) => (
          <ReportSummaryBadge key={report._id} report={report} />
        ))}
      </div>

      {/* Detail modal */}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

AutomaticReportsDashboard.propTypes = {
  refreshInterval: PropTypes.number,
  autoRefresh: PropTypes.bool,
};

export default AutomaticReportsDashboard;