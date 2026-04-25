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

const STATUS_COLORS = {
  pending: '#f59e0b',
  generating: '#3b82f6',
  completed: '#10b981',
  failed: '#ef4444',
  exported: '#8b5cf6',
};

const SEVERITY_COLORS = {
  low: '#fbbf24',
  medium: '#f97316',
  high: '#ef4444',
  critical: '#dc2626',
};

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
      
      // Manejar diferentes formatos de respuesta
      if (response.data.success !== false) {
        const reportsData = response.data.data?.reports || response.data.reports || [];
        setReports(Array.isArray(reportsData) ? reportsData : []);
        
        // Mostrar advertencia si existe
        if (response.data.warning) {
          console.warn('⚠️ Advertencia del servidor:', response.data.warning);
        }
      } else {
        // Si success es false, mostrar el mensaje pero no romper la UI
        setReports([]);
        setError(response.data.message || 'No se pudieron cargar los reportes automáticos.');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching reports:', err);
      
      // Si el error es de conexión, mostrar mensaje específico
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        setError('No se puede conectar al servidor. Verifica que el backend esté funcionando.');
      } else if (err.response?.status === 503) {
        setError('El servicio no está disponible temporalmente. Intenta más tarde.');
      } else {
        setError(err.response?.data?.message || 'Error cargando reportes automáticos. Verifica que el backend esté funcionando.');
      }
      
      // Establecer array vacío para no romper la UI
      setReports([]);
      setLoading(false);
    }
  }, [filterType]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/reports/automatic/stats`);
      
      // Manejar diferentes formatos de respuesta
      if (response.data.success !== false) {
        const statsData = response.data.data || response.data;
        setStats({
          total: statsData.total || 0,
          byType: statsData.byType || { daily: 0, weekly: 0, monthly: 0 },
          byStatus: statsData.byStatus || { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 }
        });
        
        // Mostrar advertencia si existe
        if (response.data.warning) {
          console.warn('⚠️ Advertencia del servidor (stats):', response.data.warning);
        }
      } else {
        // Si success es false, establecer estadísticas vacías
        setStats({
          total: 0,
          byType: { daily: 0, weekly: 0, monthly: 0 },
          byStatus: { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 }
        });
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      // Establecer estadísticas vacías en caso de error
      setStats({
        total: 0,
        byType: { daily: 0, weekly: 0, monthly: 0 },
        byStatus: { completed: 0, pending: 0, generating: 0, failed: 0, exported: 0 }
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
      alert(`Reporte ${REPORT_TYPES[reportType]} generado exitosamente`);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading && reports.length === 0) {
    return (
      <div className="automatic-reports-dashboard">
        <div className="loading">Cargando reportes...</div>
      </div>
    );
  }

  return (
    <div className="automatic-reports-dashboard">
      <div className="dashboard-header">
        <h1>Reportes Automáticos</h1>
        <div className="header-actions">
          <button
            className="btn-generate"
            onClick={() => generateReport('daily')}
            disabled={generating}
          >
            Generar Diario
          </button>
          <button
            className="btn-generate"
            onClick={() => generateReport('weekly')}
            disabled={generating}
          >
            Generar Semanal
          </button>
          <button
            className="btn-generate"
            onClick={() => generateReport('monthly')}
            disabled={generating}
          >
            Generar Mensual
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {!error && !loading && reports.length === 0 && (
        <div className="info-message" style={{ 
          padding: '20px', 
          textAlign: 'center', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px', 
          marginBottom: '20px',
          color: '#1976d2'
        }}>
          ℹ️ No hay reportes automáticos disponibles. Usa los botones de arriba para generar reportes diarios, semanales o mensuales.
        </div>
      )}

      {stats && (
        <div className="stats-overview">
          <div className="stat-card">
            <h3>Total Reportes</h3>
            <p className="stat-value">{stats.total || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Diarios</h3>
            <p className="stat-value">{stats.byType?.daily || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Semanales</h3>
            <p className="stat-value">{stats.byType?.weekly || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Mensuales</h3>
            <p className="stat-value">{stats.byType?.monthly || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Completados</h3>
            <p className="stat-value">{stats.byStatus?.completed || 0}</p>
          </div>
        </div>
      )}

      <div className="filters">
        <button
          className={filterType === 'all' ? 'active' : ''}
          onClick={() => setFilterType('all')}
        >
          Todos
        </button>
        <button
          className={filterType === 'daily' ? 'active' : ''}
          onClick={() => setFilterType('daily')}
        >
          Diarios
        </button>
        <button
          className={filterType === 'weekly' ? 'active' : ''}
          onClick={() => setFilterType('weekly')}
        >
          Semanales
        </button>
        <button
          className={filterType === 'monthly' ? 'active' : ''}
          onClick={() => setFilterType('monthly')}
        >
          Mensuales
        </button>
      </div>

      <div className="reports-grid">
        {reports.length === 0 && !loading && !error ? (
          <div className="empty-state" style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '40px',
            color: '#666'
          }}>
            <p>No hay reportes para mostrar. Genera un reporte usando los botones de arriba.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report._id}
              className="report-card"
              onClick={() => fetchReportDetails(report._id)}
            >
            <div className="report-header">
              <h3>{REPORT_TYPES[report.reportType]}</h3>
              <span
                className="status-badge"
                style={{ backgroundColor: STATUS_COLORS[report.status] }}
              >
                {report.status}
              </span>
            </div>
            <div className="report-period">
              {formatDate(report.period.startDate)} - {formatDate(report.period.endDate)}
            </div>
            <div className="report-metrics-preview">
              {report.metrics ? (
                <>
                  <div className="metric-item">
                    <span className="metric-label">Historias:</span>
                    <span className="metric-value">{report.metrics.totalMedicalHistories || 0}</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-label">Alertas:</span>
                    <span className="metric-value">{report.metrics.totalAlerts || 0}</span>
                  </div>
                  {report.anomalies && report.anomalies.length > 0 && (
                    <div className="anomalies-badge">
                      {report.anomalies.length} anomalía(s) detectada(s)
                    </div>
                  )}
                </>
              ) : (
                <div className="metric-item">
                  <span className="metric-label">Estado:</span>
                  <span className="metric-value">Generando...</span>
                </div>
              )}
            </div>
            <div className="report-actions">
              <button
                className="btn-export"
                onClick={(e) => {
                  e.stopPropagation();
                  exportReport(report._id, 'pdf');
                }}
              >
                Exportar PDF
              </button>
              <button
                className="btn-export"
                onClick={(e) => {
                  e.stopPropagation();
                  exportReport(report._id, 'csv');
                }}
              >
                Exportar CSV
              </button>
            </div>
          </div>
          ))
        )}
      </div>

      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Reporte {REPORT_TYPES[selectedReport.reportType]} -{' '}
                {formatDate(selectedReport.period.startDate)}
              </h2>
              <button className="btn-close" onClick={() => setSelectedReport(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="report-details">
                <section className="metrics-section">
                  <h3>Métricas Principales</h3>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <h4>Pacientes</h4>
                      <p>{selectedReport.metrics.totalPatients}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Doctores</h4>
                      <p>{selectedReport.metrics.totalDoctors}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Administradores</h4>
                      <p>{selectedReport.metrics.totalAdmins || 0}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Historias Médicas</h4>
                      <p>{selectedReport.metrics.totalMedicalHistories}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Alertas</h4>
                      <p>{selectedReport.metrics.totalAlerts}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Alertas Críticas</h4>
                      <p>{selectedReport.metrics.criticalAlerts}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Citas</h4>
                      <p>{selectedReport.metrics.totalAppointments}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Citas Completadas</h4>
                      <p>{selectedReport.metrics.completedAppointments}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Análisis IA</h4>
                      <p>{selectedReport.metrics.aiAnalyses}</p>
                    </div>
                    <div className="metric-card">
                      <h4>Confianza Promedio IA</h4>
                      <p>{(selectedReport.metrics.averageAIConfidence * 100).toFixed(2)}%</p>
                    </div>
                  </div>
                </section>

                <section className="growth-section">
                  <h3>Métricas de Crecimiento</h3>
                  <div className="growth-metrics">
                    <div className="growth-item">
                      <span>Crecimiento Pacientes:</span>
                      <span className={selectedReport.metrics.growthMetrics.patientsGrowth > 0 ? 'positive' : 'negative'}>
                        {formatPercentage(selectedReport.metrics.growthMetrics.patientsGrowth)}
                      </span>
                    </div>
                    <div className="growth-item">
                      <span>Crecimiento Historias:</span>
                      <span className={selectedReport.metrics.growthMetrics.historiesGrowth > 0 ? 'positive' : 'negative'}>
                        {formatPercentage(selectedReport.metrics.growthMetrics.historiesGrowth)}
                      </span>
                    </div>
                    <div className="growth-item">
                      <span>Crecimiento Alertas:</span>
                      <span className={selectedReport.metrics.growthMetrics.alertsGrowth > 0 ? 'positive' : 'negative'}>
                        {formatPercentage(selectedReport.metrics.growthMetrics.alertsGrowth)}
                      </span>
                    </div>
                  </div>
                </section>

                {selectedReport.anomalies && selectedReport.anomalies.length > 0 && (
                  <section className="anomalies-section">
                    <h3>Anomalías Detectadas</h3>
                    <div className="anomalies-list">
                      {selectedReport.anomalies.map((anomaly, index) => (
                        <div
                          key={index}
                          className="anomaly-card"
                          style={{
                            borderLeftColor: SEVERITY_COLORS[anomaly.severity],
                          }}
                        >
                          <div className="anomaly-header">
                            <h4>{anomaly.metric}</h4>
                            <span
                              className="severity-badge"
                              style={{ backgroundColor: SEVERITY_COLORS[anomaly.severity] }}
                            >
                              {anomaly.severity}
                            </span>
                          </div>
                          <p className="anomaly-value">Valor: {anomaly.value.toFixed(2)}</p>
                          <p className="anomaly-description">{anomaly.description}</p>
                          <p className="anomaly-range">
                            Rango esperado: {anomaly.expectedRange.min.toFixed(2)} -{' '}
                            {anomaly.expectedRange.max.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {selectedReport.metrics.topDiagnoses && selectedReport.metrics.topDiagnoses.length > 0 && (
                  <section className="diagnoses-section">
                    <h3>Top Diagnósticos</h3>
                    <ul className="diagnoses-list">
                      {selectedReport.metrics.topDiagnoses.map((item, index) => (
                        <li key={index}>
                          {item.diagnosis}: {item.count}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AutomaticReportsDashboard.propTypes = {
  refreshInterval: PropTypes.number,
  autoRefresh: PropTypes.bool,
};

export default AutomaticReportsDashboard;

