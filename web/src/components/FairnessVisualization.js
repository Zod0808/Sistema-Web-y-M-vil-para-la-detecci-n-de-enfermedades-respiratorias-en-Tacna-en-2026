/**
 * Fairness Visualization Component
 * 
 * Visualizaciones de fairness por cohortes:
 * - Comparación de métricas entre grupos demográficos
 * - Análisis de sesgo en modelos ML
 * - Distribución de confianza por cohortes
 * - Métricas de equidad (demographic parity, equalized odds)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import './FairnessVisualization.css';
import API_BASE from '../utils/apiBase';

const GROUP_OPTIONS = [
  { value: 'gender', label: 'Género' },
  { value: 'age_band', label: 'Rango de Edad' },
  { value: 'risk_level', label: 'Nivel de Riesgo' },
  { value: 'district', label: 'Distrito' },
];

const DAYS_OPTIONS = [
  { value: 1, label: 'Últimas 24 horas' },
  { value: 7, label: 'Últimos 7 días' },
  { value: 14, label: 'Últimos 14 días' },
  { value: 30, label: 'Últimos 30 días' },
];

const FAIRNESS_METRICS = [
  { value: 'confidence', label: 'Confianza Promedio' },
  { value: 'high_confidence_rate', label: 'Tasa de Alta Confianza' },
  { value: 'count', label: 'Número de Casos' },
  { value: 'accuracy', label: 'Precisión' },
];

const COLORS = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#0ea5e9', '#8b5cf6', '#ec4899'];

function FairnessVisualization() {
  const [fairnessData, setFairnessData] = useState({});
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('gender');
  const [selectedDays, setSelectedDays] = useState(7);
  const [selectedMetric, setSelectedMetric] = useState('confidence');
  const [viewType, setViewType] = useState('bar'); // bar, radar, pie

  const fetchFairnessData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fairnessRes, metricsRes] = await Promise.all([
        axios.get(`${API_BASE}/analytics/ml/fairness`, {
          params: {
            groupField: selectedGroup,
            highConfidenceThreshold: 0.8,
          },
        }),
        axios.get(`${API_BASE}/analytics/ml/monitoring`, {
          params: { days: selectedDays },
        }),
      ]);

      if (fairnessRes.data.success) {
        setFairnessData(fairnessRes.data.data || {});
      } else {
        setError(fairnessRes.data.message || 'Error al cargar datos de fairness');
      }

      if (metricsRes.data.success) {
        setMetricsData(metricsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching fairness data:', err);
      setError('No se pudieron cargar los datos de fairness. Verifica que el backend esté funcionando.');
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, selectedDays]);

  useEffect(() => {
    fetchFairnessData();
  }, [fetchFairnessData]);

  // Preparar datos para gráficos
  const chartData = useMemo(() => {
    const data = Object.entries(fairnessData || {}).map(([group, values]) => {
      const avgConfidence = (values?.avg_confidence || 0) * 100;
      const highConfidenceRate = (values?.high_confidence_rate || 0) * 100;
      const count = values?.count || 0;

      return {
        group: group.charAt(0).toUpperCase() + group.slice(1),
        confidence: Number(avgConfidence.toFixed(2)),
        high_confidence_rate: Number(highConfidenceRate.toFixed(2)),
        count: count,
        accuracy: values?.accuracy ? Number((values.accuracy * 100).toFixed(2)) : 0,
        avg_confidence: avgConfidence,
      };
    });

    return data.sort((a, b) => b[selectedMetric] - a[selectedMetric]);
  }, [fairnessData, selectedMetric]);

  // Calcular métricas de equidad
  const fairnessMetrics = useMemo(() => {
    if (chartData.length === 0) return null;

    const values = chartData.map((d) => d[selectedMetric]);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;

    // Demographic Parity: diferencia entre el grupo con mayor y menor tasa
    const demographicParity = max - min;

    // Calcular si hay sesgo significativo (>10% diferencia)
    const hasBias = demographicParity > (mean * 0.1);

    return {
      demographicParity: Number(demographicParity.toFixed(2)),
      coefficientOfVariation: Number(coefficientOfVariation.toFixed(2)),
      hasBias,
      mean: Number(mean.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      max,
      min,
    };
  }, [chartData, selectedMetric]);

  const renderChart = () => {
    if (chartData.length === 0) return null;

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 },
    };

    switch (viewType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="group" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
              formatter={(value) => {
                if (selectedMetric === 'count') return [value, 'Casos'];
                return [`${value}%`, FAIRNESS_METRICS.find((m) => m.value === selectedMetric)?.label];
              }}
            />
            <Legend />
            <Bar
              dataKey={selectedMetric}
              fill={COLORS[0]}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        );

      case 'radar':
        return (
          <RadarChart {...commonProps}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="group" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 'auto']}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Radar
              name={FAIRNESS_METRICS.find((m) => m.value === selectedMetric)?.label}
              dataKey={selectedMetric}
              stroke={COLORS[0]}
              fill={COLORS[0]}
              fillOpacity={0.6}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
            />
            <Legend />
          </RadarChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ group, percent }) => `${group}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey={selectedMetric}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
            />
            <Legend />
          </PieChart>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="fairness-visualization">
        <div className="chart-loading">
          <div className="spinner" />
          <p>Calculando métricas de fairness...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fairness-visualization">
        <div className="chart-error">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchFairnessData}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fairness-visualization">
      <div className="chart-header">
        <div>
          <h3>⚖️ Visualización de Fairness por Cohortes</h3>
          <p className="chart-subtitle">Análisis de equidad en modelos ML por grupos demográficos</p>
        </div>
        <div className="chart-actions">
          <button
            type="button"
            onClick={fetchFairnessData}
            className="btn-refresh"
            title="Actualizar datos"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="chart-controls">
        <div className="control-group">
          <label>Grupo Demográfico:</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="control-select"
          >
            {GROUP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Período:</label>
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="control-select"
          >
            {DAYS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Métrica:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="control-select"
          >
            {FAIRNESS_METRICS.map((metric) => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Vista:</label>
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            className="control-select"
          >
            <option value="bar">Barras</option>
            <option value="radar">Radar</option>
            <option value="pie">Circular</option>
          </select>
        </div>
      </div>

      {fairnessMetrics && (
        <div className="fairness-metrics">
          <div className={`metric-card ${fairnessMetrics.hasBias ? 'warning' : 'success'}`}>
            <span className="metric-label">Paridad Demográfica</span>
            <span className="metric-value">{fairnessMetrics.demographicParity}%</span>
            <span className="metric-status">
              {fairnessMetrics.hasBias ? '⚠️ Sesgo detectado' : '✅ Equitativo'}
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Coeficiente de Variación</span>
            <span className="metric-value">{fairnessMetrics.coefficientOfVariation}%</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Promedio</span>
            <span className="metric-value">{fairnessMetrics.mean}%</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Desviación Estándar</span>
            <span className="metric-value">{fairnessMetrics.stdDev}%</span>
          </div>
        </div>
      )}

      <div className="chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={500}>
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            <p>No hay datos disponibles para el grupo seleccionado.</p>
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="cohort-details">
          <h4>Detalles por Cohorte</h4>
          <div className="cohort-table">
            <table>
              <thead>
                <tr>
                  <th>Cohorte</th>
                  <th>Casos</th>
                  <th>Confianza Promedio</th>
                  <th>Tasa Alta Confianza</th>
                  <th>Precisión</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((cohort, index) => (
                  <tr key={cohort.group}>
                    <td>
                      <span
                        className="cohort-color"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {cohort.group}
                    </td>
                    <td>{cohort.count}</td>
                    <td>{cohort.confidence}%</td>
                    <td>{cohort.high_confidence_rate}%</td>
                    <td>{cohort.accuracy}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default FairnessVisualization;

