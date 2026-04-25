import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import MLAdvancedResults from './MLAdvancedResults';
import './AnalyticsDashboard.css';
import { LEGACY_API_BASE, API_BASE } from '../utils/apiBase';

function AnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [mlMetrics, setMlMetrics] = useState(null);
  const [mlError, setMlError] = useState(null);
  const [mlExperiments, setMlExperiments] = useState([]);
  const [mlExperimentsLoading, setMlExperimentsLoading] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${LEGACY_API_BASE}/analytics/dashboard`);
      
      // El endpoint devuelve los datos directamente o en response.data.data
      if (response.data && (response.data.overview || response.data.data)) {
        // Si viene en response.data.data, usar eso; si no, usar response.data directamente
        setDashboardData(response.data.data || response.data);
        setLastUpdated(new Date());
      } else {
        setError('No se encontraron datos en la base de datos');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`No se pudieron cargar los datos del dashboard: ${err.message}. Verifica que el backend esté funcionando y que haya datos en la base de datos.`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMlMetrics = useCallback(async () => {
    try {
      console.log('Fetching ML metrics from:', `${API_BASE}/analytics/ml/monitoring`);
      const response = await axios.get(`${API_BASE}/analytics/ml/monitoring`, {
        params: { days: 7 },
      });

      console.log('ML Metrics Response:', response.data);

      if (response.data.success) {
        setMlMetrics(response.data.data);
        setMlError(null);
      } else {
        console.warn('ML Metrics response not successful:', response.data);
        setMlError(response.data.message || 'Error al cargar métricas ML');
      }
    } catch (err) {
      console.error('Error fetching ML monitoring metrics:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setMlError(`No se pudieron cargar las métricas ML: ${err.message || 'Error de conexión'}`);
    }
  }, []);

  const fetchMlExperiments = useCallback(async () => {
    setMlExperimentsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE}/ml/experiments`;
      console.log('Fetching ML experiments from:', url);
      console.log('Token available:', !!token);
      
      const response = await axios.get(url, {
        params: { limit: 5 },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      console.log('ML Experiments Response:', response.data);

      if (response.data.success) {
        setMlExperiments(response.data.data || []);
      } else {
        console.warn('ML Experiments response not successful:', response.data);
        setMlExperiments([]);
      }
    } catch (err) {
      console.error('Error fetching ML experiments:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      // Si es un error 401, significa que necesita autenticación
      if (err.response?.status === 401) {
        console.warn('ML Experiments requiere autenticación');
      }
      setMlExperiments([]);
    } finally {
      setMlExperimentsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchMlMetrics();
    fetchMlExperiments();
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchMlMetrics();
      fetchMlExperiments();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchMlMetrics, fetchMlExperiments]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#ef5350';
      case 'medium': return '#ffca28';
      case 'low': return '#66bb6a';
      default: return '#bdbdbd';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'respiratory': '#667eea',
      'fever': '#ff6b6b',
      'pain': '#4ecdc4',
      'digestive': '#45b7d1',
      'fatigue': '#96ceb4',
      'neurological': '#feca57',
      'other': '#a4b0be'
    };
    return colors[category] || '#a4b0be';
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Cargando dashboard de análisis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-dashboard">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="analytics-dashboard">
        <div className="no-data">
          <span className="no-data-icon">📊</span>
          <p>No hay datos disponibles para mostrar</p>
        </div>
      </div>
    );
  }

  const severityData = dashboardData.distributions?.severity?.map(item => ({
    name: item._id,
    value: item.count,
    color: getSeverityColor(item._id)
  })) || [];

  const categoryData = dashboardData.distributions?.category?.map(item => ({
    name: item._id,
    value: item.count,
    color: getCategoryColor(item._id)
  })) || [];

  // Procesar datos de top distritos con validación
  const topDistrictsData = (dashboardData.topDistricts || [])
    .filter(district => district && district._id && district.count > 0) // Filtrar distritos válidos
    .map(district => ({
      name: String(district._id || district.name || 'Distrito desconocido').trim(),
      count: Number(district.count || 0),
      avgSeverity: district.avgSeverity ? Math.round(district.avgSeverity * 100) / 100 : 0
    }))
    .sort((a, b) => b.count - a.count) // Ordenar por count descendente
    .slice(0, 8); // Limitar a 8 distritos
  
  console.log('Top Districts Data:', topDistrictsData);
  console.log('Dashboard Data topDistricts:', dashboardData.topDistricts);

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>📊 Dashboard de Análisis Avanzado</h2>
          <p>Sistema de monitoreo en tiempo real para enfermedades respiratorias</p>
        </div>
        <div className="header-actions">
          <button onClick={fetchDashboardData} className="refresh-button" disabled={loading}>
            {loading ? '⏳' : '🔄'} Actualizar
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Última actualización: {formatDate(lastUpdated)}
            </span>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="overview-cards">
        <div className="overview-card primary">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <h3>{dashboardData.overview?.totalReports || 0}</h3>
            <p>Total Reportes</p>
          </div>
        </div>
        
        <div className="overview-card success">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <h3>{dashboardData.overview?.recentReports || 0}</h3>
            <p>Últimos 7 días</p>
          </div>
        </div>
        
        <div className="overview-card warning">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <h3>{dashboardData.overview?.urgentReports || 0}</h3>
            <p>Casos Urgentes</p>
          </div>
        </div>
        
        <div className="overview-card info">
          <div className="card-icon">💬</div>
          <div className="card-content">
            <h3>{dashboardData.overview?.totalConversations || 0}</h3>
            <p>Consultas Chat</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Severity Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>📊 Distribución por Severidad</h4>
            <p>Reportes clasificados por nivel de riesgo</p>
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [value, 'Reportes']} />
                <Bar dataKey="value" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>🏷️ Distribución por Categoría</h4>
            <p>Clasificación de síntomas por tipo</p>
          </div>
          <div className="chart-content">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Reportes']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="chart-card">
          <div className="chart-header">
            <h4>🕒 Actividad Reciente</h4>
            <p>Últimos reportes registrados en el sistema</p>
          </div>
          <div className="chart-content">
            <div className="activity-list">
              {dashboardData.recentActivity?.slice(0, 5).map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {activity.severityLevel === 'high' ? '🔴' : 
                     activity.severityLevel === 'medium' ? '🟡' : '🟢'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-district">{activity.location?.district}</div>
                    <div className="activity-symptoms">
                      {activity.symptoms?.slice(0, 2).map(s => s.name).join(', ')}
                      {activity.symptoms?.length > 2 && '...'}
                    </div>
                    <div className="activity-time">
                      {formatDate(activity.reportedAt)}
                    </div>
                  </div>
                  <div className="activity-category">
                    {activity.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Districts - Full Width Section */}
      <div className="top-districts-section">
        <div className="chart-card chart-card-full">
          <div className="chart-header">
            <h4>🏘️ Top Distritos</h4>
            <p>Distritos con mayor número de reportes</p>
          </div>
          <div className="chart-content chart-content-full">
            {topDistrictsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={topDistrictsData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: '#666', fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis 
                    type="number"
                    domain={[0, 'dataMax + 1']}
                    tick={{ fill: '#666', fontSize: 12 }}
                    allowDecimals={false}
                    label={{ value: 'Número de Reportes', angle: -90, position: 'insideLeft', style: { fill: '#666', fontSize: 14 } }}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'count') {
                        return [`${value} reportes`, 'Reportes'];
                      }
                      return [value, 'Severidad Promedio'];
                    }}
                    labelFormatter={(label) => `Distrito: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      padding: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#2196f3" 
                    name="Reportes"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={true}
                    stroke="#1976d2"
                    strokeWidth={2}
                  >
                    {topDistrictsData.map((entry, index) => {
                      // Colores alternados para mejor visibilidad
                      const colors = ['#2196f3', '#1976d2', '#1565c0', '#0d47a1'];
                      const color = colors[index % colors.length];
                      return <Cell key={`cell-${index}`} fill={color} stroke={color} strokeWidth={2} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-chart-data">
                <p>No hay datos de distritos disponibles</p>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  Verifica que haya reportes con información de distrito en la base de datos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="summary-section">
        <h3>📈 Estadísticas Generales</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Promedio Diario</span>
            <span className="stat-value">
              {Math.round((dashboardData.overview?.totalReports || 0) / 30)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tasa de Urgencia</span>
            <span className="stat-value">
              {Math.round(((dashboardData.overview?.urgentReports || 0) / (dashboardData.overview?.totalReports || 1)) * 100)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Distritos Activos</span>
            <span className="stat-value">
              {dashboardData.topDistricts?.length || 0}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Consultas Recientes</span>
            <span className="stat-value">
              {dashboardData.overview?.recentConversations || 0}
            </span>
          </div>
        </div>
      </div>

      {/* ML Metrics Summary */}
      <div className="summary-section">
        <h3>🤖 Métricas del Modelo ML</h3>
        {mlError && (
          <p className="ml-error-text">{mlError}</p>
        )}
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Predicciones (últimos 7 días)</span>
            <span className="stat-value">
              {mlMetrics?.summary?.total_predictions ?? '—'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Confianza promedio</span>
            <span className="stat-value">
              {mlMetrics?.summary
                ? `${Math.round((mlMetrics.summary.avg_confidence || 0) * 100)}%`
                : '—'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Predicciones baja confianza</span>
            <span className="stat-value">
              {mlMetrics?.summary?.low_confidence_predictions ?? 0}
              {' '}
              ({mlMetrics?.summary
                ? `${Math.round(mlMetrics.summary.low_confidence_percentage || 0)}%`
                : '0%'})
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Calidad (alta / media / baja)</span>
            <span className="stat-value">
              {mlMetrics?.quality_metrics
                ? `${Math.round(mlMetrics.quality_metrics.high_confidence_rate || 0)}% / ${Math.round(mlMetrics.quality_metrics.medium_confidence_rate || 0)}% / ${Math.round(mlMetrics.quality_metrics.low_confidence_rate || 0)}%`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ML Experiments Section */}
      <div className="summary-section">
        <h3>🧪 Experimentos ML Recientes</h3>
        {mlExperimentsLoading ? (
          <p>Cargando experimentos...</p>
        ) : mlExperiments.length === 0 ? (
          <p>No hay experimentos ML recientes</p>
        ) : (
          <div className="experiments-list" style={{ marginTop: '16px' }}>
            {mlExperiments.map((exp) => (
              <div
                key={exp.experimentId || exp._id}
                className="experiment-item"
                style={{
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                onClick={() => setSelectedExperiment(exp)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{exp.experimentType === 'rl_session' ? '🔄 RL Session' : exp.experimentType === 'fl_round' ? '🌐 FL Round' : '🤖 ML Experiment'}</strong>
                    <p style={{ margin: '4px 0', color: '#666', fontSize: '14px' }}>
                      {exp.modelName || 'Unknown Model'} • {exp.status || 'unknown'}
                    </p>
                    <p style={{ margin: 0, color: '#999', fontSize: '12px' }}>
                      {exp.createdAt ? new Date(exp.createdAt).toLocaleString('es-ES') : 'Fecha desconocida'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedExperiment(exp);
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ML Advanced Results Modal */}
      {selectedExperiment && (
        <div className="advanced-results-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="advanced-results-container" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedExperiment(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <MLAdvancedResults
              experimentId={selectedExperiment.experimentId || selectedExperiment._id}
              sessionId={selectedExperiment.metadata?.sessionId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
