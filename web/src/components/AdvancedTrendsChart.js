/**
 * Advanced Trends Chart Component
 * 
 * Gráficos interactivos de tendencias con múltiples visualizaciones:
 * - Series temporales avanzadas
 * - Comparación de múltiples métricas
 * - Zoom y pan interactivo
 * - Filtros dinámicos
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
import './AdvancedTrendsChart.css';
import { LEGACY_API_BASE, API_BASE } from '../utils/apiBase';

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: '1y', label: 'Último año' },
];

const CHART_TYPES = [
  { value: 'line', label: 'Línea' },
  { value: 'area', label: 'Área' },
  { value: 'bar', label: 'Barras' },
  { value: 'composed', label: 'Combinado' },
];

const METRIC_OPTIONS = [
  { value: 'cases', label: 'Casos Totales' },
  { value: 'severity', label: 'Severidad Promedio' },
  { value: 'urgency', label: 'Urgencia' },
  { value: 'confidence', label: 'Confianza ML' },
];

function AdvancedTrendsChart() {
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [chartType, setChartType] = useState('line');
  const [selectedMetrics, setSelectedMetrics] = useState(['cases', 'severity']);
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [showBrush, setShowBrush] = useState(true);
  const [showTrendLine, setShowTrendLine] = useState(true);

  const districts = [
    'all',
    'Centro de Tacna',
    'Gregorio Albarracín',
    'Ciudad Nueva',
    'Pocollay',
    'Alto de la Alianza',
    'Calana',
    'Pachia',
    'Boca del Río',
  ];

  const fetchTrendsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${LEGACY_API_BASE}/analytics/temporal-trends`, {
        params: {
          period: selectedPeriod,
          district: selectedDistrict !== 'all' ? selectedDistrict : undefined,
        },
      });

      if (response.data.success) {
        setTrendsData(response.data.data);
      } else {
        setError(response.data.message || 'Error al cargar datos de tendencias');
      }
    } catch (err) {
      console.error('Error fetching trends data:', err);
      setError('No se pudieron cargar los datos de tendencias. Verifica que el backend esté funcionando.');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedDistrict]);

  useEffect(() => {
    fetchTrendsData();
  }, [fetchTrendsData]);

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    if (!trendsData?.dailyTrends) return [];

    const dataMap = {};
    trendsData.dailyTrends.forEach((day) => {
      const date = day._id;
      if (!dataMap[date]) {
        dataMap[date] = {
          date: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
          fullDate: date,
          cases: 0,
          severity: 0,
          urgency: 0,
          confidence: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0,
        };
      }

      dataMap[date].cases = day.total || 0;

      // Calcular severidad promedio
      if (day.data && day.data.length > 0) {
        const totalSeverity = day.data.reduce((sum, item) => {
          const severityValue = item.severity === 'high' ? 3 : item.severity === 'medium' ? 2 : 1;
          return sum + severityValue * item.count;
        }, 0);
        dataMap[date].severity = totalSeverity / day.total;

        // Contar por severidad
        day.data.forEach((item) => {
          if (item.severity === 'high') dataMap[date].highSeverity = item.count;
          if (item.severity === 'medium') dataMap[date].mediumSeverity = item.count;
          if (item.severity === 'low') dataMap[date].lowSeverity = item.count;
        });
      }
    });

    return Object.values(dataMap).sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
  }, [trendsData]);

  // Calcular línea de tendencia (regresión lineal simple)
  const trendLineData = useMemo(() => {
    if (!showTrendLine || chartData.length === 0) return null;

    const n = chartData.length;
    const xValues = chartData.map((_, i) => i);
    const yValues = chartData.map((d) => d.cases);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return chartData.map((d, i) => ({
      date: d.date,
      trend: slope * i + intercept,
    }));
  }, [chartData, showTrendLine]);

  const handleMetricToggle = (metric) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const getMetricColor = (metric) => {
    const colors = {
      cases: '#2563eb',
      severity: '#16a34a',
      urgency: '#f97316',
      confidence: '#dc2626',
      highSeverity: '#ef4444',
      mediumSeverity: '#f97316',
      lowSeverity: '#22c55e',
    };
    return colors[metric] || '#6b7280';
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const commonElements = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
          }}
          formatter={(value, name) => {
            const labels = {
              cases: 'Casos',
              severity: 'Severidad',
              urgency: 'Urgencia',
              confidence: 'Confianza',
              highSeverity: 'Alta Severidad',
              mediumSeverity: 'Media Severidad',
              lowSeverity: 'Baja Severidad',
              trend: 'Tendencia',
            };
            return [typeof value === 'number' ? value.toFixed(2) : value, labels[name] || name];
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => {
            const labels = {
              cases: 'Casos Totales',
              severity: 'Severidad Promedio',
              urgency: 'Urgencia',
              confidence: 'Confianza ML',
              highSeverity: 'Alta Severidad',
              mediumSeverity: 'Media Severidad',
              lowSeverity: 'Baja Severidad',
              trend: 'Línea de Tendencia',
            };
            return labels[value] || value;
          }}
        />
        {showBrush && <Brush dataKey="date" height={30} stroke="#2563eb" />}
        {showTrendLine && trendLineData && (
          <ReferenceLine
            y={trendLineData[0]?.trend}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label="Tendencia"
          />
        )}
      </>
    );

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {commonElements}
            {selectedMetrics.includes('cases') && (
              <Line
                type="monotone"
                dataKey="cases"
                stroke={getMetricColor('cases')}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {selectedMetrics.includes('severity') && (
              <Line
                type="monotone"
                dataKey="severity"
                stroke={getMetricColor('severity')}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            )}
            {selectedMetrics.includes('urgency') && (
              <Line
                type="monotone"
                dataKey="urgency"
                stroke={getMetricColor('urgency')}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            )}
            {selectedMetrics.includes('confidence') && (
              <Line
                type="monotone"
                dataKey="confidence"
                stroke={getMetricColor('confidence')}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            )}
            {showTrendLine && trendLineData && (
              <Line
                type="linear"
                dataKey="trend"
                data={trendLineData}
                stroke="#9ca3af"
                strokeDasharray="5 5"
                strokeWidth={1}
                dot={false}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {commonElements}
            {selectedMetrics.includes('cases') && (
              <Area
                type="monotone"
                dataKey="cases"
                stroke={getMetricColor('cases')}
                fill={getMetricColor('cases')}
                fillOpacity={0.6}
              />
            )}
            {selectedMetrics.includes('severity') && (
              <Area
                type="monotone"
                dataKey="severity"
                stroke={getMetricColor('severity')}
                fill={getMetricColor('severity')}
                fillOpacity={0.6}
              />
            )}
            {selectedMetrics.includes('urgency') && (
              <Area
                type="monotone"
                dataKey="urgency"
                stroke={getMetricColor('urgency')}
                fill={getMetricColor('urgency')}
                fillOpacity={0.6}
              />
            )}
            {selectedMetrics.includes('confidence') && (
              <Area
                type="monotone"
                dataKey="confidence"
                stroke={getMetricColor('confidence')}
                fill={getMetricColor('confidence')}
                fillOpacity={0.6}
              />
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {commonElements}
            {selectedMetrics.includes('cases') && (
              <Bar dataKey="cases" fill={getMetricColor('cases')} />
            )}
            {selectedMetrics.includes('severity') && (
              <Bar dataKey="severity" fill={getMetricColor('severity')} />
            )}
            {selectedMetrics.includes('urgency') && (
              <Bar dataKey="urgency" fill={getMetricColor('urgency')} />
            )}
            {selectedMetrics.includes('confidence') && (
              <Bar dataKey="confidence" fill={getMetricColor('confidence')} />
            )}
          </BarChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            {commonElements}
            {selectedMetrics.includes('cases') && (
              <Bar dataKey="cases" fill={getMetricColor('cases')} fillOpacity={0.7} />
            )}
            {selectedMetrics.includes('severity') && (
              <Line
                type="monotone"
                dataKey="severity"
                stroke={getMetricColor('severity')}
                strokeWidth={2}
              />
            )}
            {selectedMetrics.includes('urgency') && (
              <Line
                type="monotone"
                dataKey="urgency"
                stroke={getMetricColor('urgency')}
                strokeWidth={2}
              />
            )}
            {selectedMetrics.includes('confidence') && (
              <Line
                type="monotone"
                dataKey="confidence"
                stroke={getMetricColor('confidence')}
                strokeWidth={2}
              />
            )}
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="advanced-trends-chart">
        <div className="chart-loading">
          <div className="spinner" />
          <p>Cargando datos de tendencias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="advanced-trends-chart">
        <div className="chart-error">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchTrendsData}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="advanced-trends-chart">
      <div className="chart-header">
        <div>
          <h3>📈 Gráficos Avanzados de Tendencias</h3>
          <p className="chart-subtitle">Análisis interactivo de series temporales</p>
        </div>
        <div className="chart-actions">
          <button
            type="button"
            onClick={fetchTrendsData}
            className="btn-refresh"
            title="Actualizar datos"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="chart-controls">
        <div className="control-group">
          <label>Período:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="control-select"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Distrito:</label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="control-select"
          >
            {districts.map((dist) => (
              <option key={dist} value={dist}>
                {dist === 'all' ? 'Todos' : dist}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Tipo de Gráfico:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="control-select"
          >
            {CHART_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Métricas:</label>
          <div className="metric-checkboxes">
            {METRIC_OPTIONS.map((metric) => (
              <label key={metric.value} className="metric-checkbox">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric.value)}
                  onChange={() => handleMetricToggle(metric.value)}
                />
                <span>{metric.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showBrush}
              onChange={(e) => setShowBrush(e.target.checked)}
            />
            <span>Mostrar zoom</span>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showTrendLine}
              onChange={(e) => setShowTrendLine(e.target.checked)}
            />
            <span>Línea de tendencia</span>
          </label>
        </div>
      </div>

      <div className="chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={500}>
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            <p>No hay datos disponibles para el período seleccionado.</p>
          </div>
        )}
      </div>

      {trendsData && (
        <div className="chart-stats">
          <div className="stat-card">
            <span className="stat-value">{trendsData.totalReports || 0}</span>
            <span className="stat-label">Total Reportes</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {chartData.length > 0
                ? (chartData.reduce((sum, d) => sum + d.cases, 0) / chartData.length).toFixed(1)
                : 0}
            </span>
            <span className="stat-label">Promedio Diario</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">
              {chartData.length > 0 ? Math.max(...chartData.map((d) => d.cases)) : 0}
            </span>
            <span className="stat-label">Pico Máximo</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedTrendsChart;

