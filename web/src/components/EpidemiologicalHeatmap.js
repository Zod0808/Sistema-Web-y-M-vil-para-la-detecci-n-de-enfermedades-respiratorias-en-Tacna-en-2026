/**
 * Epidemiological Heatmap Component
 * 
 * Heatmaps y clusters epidemiológicos:
 * - Distribución geográfica de casos
 * - Clusters temporales y espaciales
 * - Análisis de brotes
 * - Correlaciones entre variables epidemiológicas
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import './EpidemiologicalHeatmap.css';
import { LEGACY_API_BASE, API_BASE } from '../utils/apiBase';

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: '1y', label: 'Último año' },
];

const HEATMAP_TYPES = [
  { value: 'geographic', label: 'Geográfico' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'severity', label: 'Por Severidad' },
  { value: 'correlation', label: 'Correlación' },
];

function EpidemiologicalHeatmap() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [temporalData, setTemporalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [heatmapType, setHeatmapType] = useState('geographic');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

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

  const fetchHeatmapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [heatmapRes, trendsRes] = await Promise.all([
        axios.get(`${LEGACY_API_BASE}/symptom-reports/heatmap`),
        axios.get(`${LEGACY_API_BASE}/analytics/temporal-trends`, {
          params: {
            period: selectedPeriod,
            district: selectedDistrict !== 'all' ? selectedDistrict : undefined,
          },
        }),
      ]);

      if (heatmapRes.data.success && heatmapRes.data.data) {
        const transformedData = heatmapRes.data.data.map((item, index) => ({
          id: index + 1,
          location: item.district,
          lat: item.coordinates?.latitude || 0,
          lng: item.coordinates?.longitude || 0,
          cases: item.totalCases || 0,
          severity: item.severity || 'medium',
          highSeverity: item.highSeverity || 0,
          mediumSeverity: item.mediumSeverity || 0,
          lowSeverity: item.lowSeverity || 0,
        }));
        setHeatmapData(transformedData);
      } else {
        setError('No se encontraron datos en la base de datos');
        setHeatmapData([]);
      }

      if (trendsRes.data.success) {
        setTemporalData(trendsRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      setError('No se pudieron cargar los datos del heatmap. Verifica que el backend esté funcionando.');
      setHeatmapData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedDistrict]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  // Preparar datos para heatmap geográfico
  const geographicData = useMemo(() => {
    const filtered = selectedSeverity === 'all'
      ? heatmapData
      : heatmapData.filter((item) => item.severity === selectedSeverity);

    return filtered
      .map((item) => ({
        location: item.location,
        cases: item.cases,
        highSeverity: item.highSeverity,
        mediumSeverity: item.mediumSeverity,
        lowSeverity: item.lowSeverity,
        severity: item.severity,
      }))
      .sort((a, b) => b.cases - a.cases);
  }, [heatmapData, selectedSeverity]);

  // Preparar datos para heatmap temporal
  const temporalHeatmapData = useMemo(() => {
    if (!temporalData?.dailyTrends) return [];

    const dataMap = {};
    temporalData.dailyTrends.forEach((day) => {
      const date = new Date(day._id).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
      });

      day.data?.forEach((severityData) => {
        const key = `${date}_${severityData.severity}`;
        if (!dataMap[key]) {
          dataMap[key] = {
            date,
            severity: severityData.severity,
            count: 0,
          };
        }
        dataMap[key].count += severityData.count;
      });
    });

    return Object.values(dataMap).sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [temporalData]);

  // Preparar datos para heatmap de severidad
  const severityData = useMemo(() => {
    const severityMap = {
      high: { total: 0, districts: [] },
      medium: { total: 0, districts: [] },
      low: { total: 0, districts: [] },
    };

    heatmapData.forEach((item) => {
      if (item.severity === 'high') {
        severityMap.high.total += item.cases;
        severityMap.high.districts.push(item.location);
      } else if (item.severity === 'medium') {
        severityMap.medium.total += item.cases;
        severityMap.medium.districts.push(item.location);
      } else {
        severityMap.low.total += item.cases;
        severityMap.low.districts.push(item.location);
      }
    });

    return Object.entries(severityMap).map(([severity, data]) => ({
      severity: severity.charAt(0).toUpperCase() + severity.slice(1),
      total: data.total,
      districts: data.districts.length,
      avgCases: data.districts.length > 0 ? (data.total / data.districts.length).toFixed(1) : 0,
    }));
  }, [heatmapData]);

  // Preparar datos de correlación
  const correlationData = useMemo(() => {
    if (heatmapData.length === 0) return [];

    const correlations = [];
    const locations = [...new Set(heatmapData.map((item) => item.location))];

    locations.forEach((location) => {
      const locationData = heatmapData.filter((item) => item.location === location);
      if (locationData.length > 0) {
        const item = locationData[0];
        correlations.push({
          location,
          totalCases: item.cases,
          highSeverityRate: item.cases > 0 ? ((item.highSeverity / item.cases) * 100).toFixed(1) : 0,
          mediumSeverityRate: item.cases > 0 ? ((item.mediumSeverity / item.cases) * 100).toFixed(1) : 0,
          lowSeverityRate: item.cases > 0 ? ((item.lowSeverity / item.cases) * 100).toFixed(1) : 0,
        });
      }
    });

    return correlations.sort((a, b) => b.totalCases - a.totalCases);
  }, [heatmapData]);

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f97316';
      case 'low':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  };

  const getIntensityColor = (value, max) => {
    if (max === 0) return '#e5e7eb';
    const intensity = value / max;
    if (intensity > 0.7) return '#ef4444';
    if (intensity > 0.4) return '#f97316';
    if (intensity > 0.2) return '#fbbf24';
    return '#22c55e';
  };

  const renderHeatmap = () => {
    switch (heatmapType) {
      case 'geographic':
        return (
          <div className="geographic-heatmap">
            <div className="heatmap-grid">
              {geographicData.map((item, index) => {
                const maxCases = Math.max(...geographicData.map((d) => d.cases), 1);
                const color = getIntensityColor(item.cases, maxCases);
                return (
                  <div
                    key={index}
                    className="heatmap-cell"
                    style={{
                      backgroundColor: color,
                      opacity: 0.8,
                    }}
                    title={`${item.location}: ${item.cases} casos`}
                  >
                    <div className="cell-label">{item.location}</div>
                    <div className="cell-value">{item.cases}</div>
                    <div className="cell-details">
                      <span className="severity-badge high">{item.highSeverity} Alta</span>
                      <span className="severity-badge medium">{item.mediumSeverity} Media</span>
                      <span className="severity-badge low">{item.lowSeverity} Baja</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'temporal':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={temporalHeatmapData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]}>
                {temporalHeatmapData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSeverityColor(entry.severity)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'severity':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={severityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="severity" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              />
              <Legend />
              <Bar dataKey="total" fill="#2563eb" radius={[8, 8, 0, 0]}>
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getSeverityColor(entry.severity)} />
                ))}
              </Bar>
              <Bar dataKey="districts" fill="#6b7280" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'correlation':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={correlationData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="location"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              />
              <Legend />
              <Bar dataKey="highSeverityRate" stackId="a" fill="#ef4444" />
              <Bar dataKey="mediumSeverityRate" stackId="a" fill="#f97316" />
              <Bar dataKey="lowSeverityRate" stackId="a" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="epidemiological-heatmap">
        <div className="chart-loading">
          <div className="spinner" />
          <p>Cargando datos epidemiológicos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="epidemiological-heatmap">
        <div className="chart-error">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchHeatmapData}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const totalCases = heatmapData.reduce((sum, item) => sum + item.cases, 0);
  const highRiskZones = heatmapData.filter((item) => item.severity === 'high').length;

  return (
    <div className="epidemiological-heatmap">
      <div className="chart-header">
        <div>
          <h3>🗺️ Heatmaps y Clusters Epidemiológicos</h3>
          <p className="chart-subtitle">Análisis de distribución geográfica y temporal de casos</p>
        </div>
        <div className="chart-actions">
          <button
            type="button"
            onClick={fetchHeatmapData}
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
          <label>Tipo de Heatmap:</label>
          <select
            value={heatmapType}
            onChange={(e) => setHeatmapType(e.target.value)}
            className="control-select"
          >
            {HEATMAP_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {heatmapType === 'geographic' && (
          <div className="control-group">
            <label>Severidad:</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="control-select"
            >
              <option value="all">Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
        )}
      </div>

      <div className="heatmap-stats">
        <div className="stat-card">
          <span className="stat-value">{totalCases}</span>
          <span className="stat-label">Casos Totales</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-value">{highRiskZones}</span>
          <span className="stat-label">Zonas de Alto Riesgo</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{geographicData.length}</span>
          <span className="stat-label">Ubicaciones</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {totalCases > 0 ? (highRiskZones / geographicData.length * 100).toFixed(1) : 0}%
          </span>
          <span className="stat-label">% Zonas de Riesgo</span>
        </div>
      </div>

      <div className="chart-container">
        {heatmapData.length > 0 || temporalHeatmapData.length > 0 ? (
          renderHeatmap()
        ) : (
          <div className="chart-empty">
            <p>No hay datos disponibles para el período seleccionado.</p>
          </div>
        )}
      </div>

      {heatmapType === 'geographic' && geographicData.length > 0 && (
        <div className="heatmap-legend">
          <h4>Leyenda de Intensidad</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#ef4444' }} />
              <span>Alta Intensidad (&gt;70%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f97316' }} />
              <span>Media Intensidad (40-70%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fbbf24' }} />
              <span>Baja Intensidad (20-40%)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#22c55e' }} />
              <span>Muy Baja Intensidad (&lt;20%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EpidemiologicalHeatmap;

