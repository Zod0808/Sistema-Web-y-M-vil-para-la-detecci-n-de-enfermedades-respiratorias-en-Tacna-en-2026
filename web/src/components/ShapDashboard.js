import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import './ShapDashboard.css';
import API_BASE from '../utils/apiBase';

const FAIRNESS_OPTIONS = [
  { value: 'gender', label: 'Género' },
  { value: 'age_band', label: 'Rango de edad' },
  { value: 'risk_level', label: 'Nivel de riesgo' },
];

const DAYS_OPTIONS = [
  { value: 1, label: 'Últimas 24 horas' },
  { value: 7, label: 'Últimos 7 días' },
  { value: 14, label: 'Últimos 14 días' },
  { value: 30, label: 'Últimos 30 días' },
];

const FEATURE_COLORS = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#0ea5e9'];
const PIE_COLORS = ['#22c55e', '#f97316', '#ef4444'];

const formatPercentage = (value) => `${Number(value ?? 0).toFixed(1)}%`;
const formatContribution = (value) => Number(value ?? 0).toFixed(3);

function ShapDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [featureInfluence, setFeatureInfluence] = useState(null);
  const [fairness, setFairness] = useState({});
  const [selectedDays, setSelectedDays] = useState(7);
  const [selectedGroup, setSelectedGroup] = useState('gender');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays, selectedGroup]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, featureRes, fairnessRes] = await Promise.all([
        axios.get(`${API_BASE}/analytics/ml/monitoring`, { params: { days: selectedDays } }),
        axios.get(`${API_BASE}/analytics/ml/features`, { params: { top: 12 } }),
        axios.get(`${API_BASE}/analytics/ml/fairness`, { params: { groupField: selectedGroup } }),
      ]);

      if (!metricsRes.data.success || !featureRes.data.success || !fairnessRes.data.success) {
        throw new Error('Respuesta inválida del servidor');
      }

      setMetrics(metricsRes.data.data);
      setFeatureInfluence(featureRes.data.data);
      setFairness(fairnessRes.data.data || {});
    } catch (err) {
      setError(err.message || 'No se pudieron obtener los datos de explicabilidad.');
    } finally {
      setLoading(false);
    }
  };

  const diseaseDistribution = useMemo(() => {
    const diseases = metrics?.distributions?.diseases || {};
    return Object.entries(diseases).map(([name, value]) => ({
      name,
      value,
    }));
  }, [metrics]);

  const urgencyDistribution = useMemo(() => {
    const urgency = metrics?.distributions?.urgency_levels || {};
    return Object.entries(urgency).map(([name, value]) => ({
      name,
      value,
    }));
  }, [metrics]);

  const confidenceSummary = useMemo(() => {
    const quality = metrics?.quality_metrics || {};
    return [
      { name: 'Alta confianza', value: Number((quality.high_confidence_rate || 0).toFixed(2)) },
      { name: 'Confianza media', value: Number((quality.medium_confidence_rate || 0).toFixed(2)) },
      { name: 'Confianza baja', value: Number((quality.low_confidence_rate || 0).toFixed(2)) },
    ];
  }, [metrics]);

  const featureBarData = useMemo(() => {
    const features = featureInfluence?.top_features || [];
    return features.map((feature) => ({
      name: feature.feature_name || `feature_${feature.feature_index ?? '?'}`,
      positive: Number((feature.positive || 0).toFixed(3)),
      negative: Number((feature.negative || 0).toFixed(3)),
      total: Number((feature.shap_abs || 0).toFixed(3)),
      count: feature.count ?? 0,
      avg: Number((feature.avg_contribution || 0).toFixed(3)),
    }));
  }, [featureInfluence]);

  const friendlyFactors = useMemo(() => featureInfluence?.friendly_factors || [], [featureInfluence]);

  const fairnessChartData = useMemo(() => {
    return Object.entries(fairness || {}).map(([group, values]) => ({
      group,
      avgConfidence: Number(((values?.avg_confidence || 0) * 100).toFixed(2)),
      highConfidence: Number(((values?.high_confidence_rate || 0) * 100).toFixed(2)),
      count: values?.count || 0,
    }));
  }, [fairness]);

  if (loading) {
    return (
      <div className="shap-dashboard">
        <div className="shap-loading">
          <div className="spinner" />
          <p>Calculando métricas de explicabilidad...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shap-dashboard">
        <div className="shap-error">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchData}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shap-dashboard">
      <header className="shap-header">
        <div>
          <h2>🧠 Explicabilidad de la IA</h2>
          <p>Visualiza cómo los modelos ML toman decisiones y analiza la equidad de las predicciones.</p>
        </div>

        <div className="shap-controls">
          <label className="control">
            <span>Periodo</span>
            <select value={selectedDays} onChange={(event) => setSelectedDays(Number(event.target.value))}>
              {DAYS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control">
            <span>Grupo de equidad</span>
            <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
              {FAIRNESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="shap-grid">
        <section className="shap-card shap-card--wide">
          <h3>Contribuciones SHAP principales</h3>
          {featureBarData.length === 0 ? (
            <p>No hay contribuciones suficientes para mostrar.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={featureBarData}>
                <XAxis dataKey="name" angle={-25} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'negative') {
                      return [`-${formatContribution(Math.abs(value))}`, 'Contribución negativa'];
                    }
                    if (name === 'positive') {
                      return [formatContribution(value), 'Contribución positiva'];
                    }
                    return [formatContribution(value), name];
                  }}
                />
                <Legend />
                <Bar dataKey="positive" stackId="a" name="Contribución positiva" fill="#16a34a" />
                <Bar dataKey="negative" stackId="a" name="Contribución negativa" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="shap-card">
          <h3>Resumen de confianza del modelo</h3>
          <ul className="shap-summary">
            <li>
              <span>Promedio de confianza</span>
              <strong>{formatPercentage((metrics?.summary?.avg_confidence ?? 0) * 100)}</strong>
            </li>
            <li>
              <span>Confianza mediana</span>
              <strong>{formatPercentage((metrics?.summary?.median_confidence ?? 0) * 100)}</strong>
            </li>
            <li>
              <span>Predicciones totales</span>
              <strong>{metrics?.summary?.total_predictions ?? 0}</strong>
            </li>
          </ul>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={confidenceSummary} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} label>
                {confidenceSummary.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatPercentage(value)} />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="shap-card">
          <h3>Distribución de enfermedades</h3>
          {diseaseDistribution.length === 0 ? (
            <p>No hay suficientes datos de enfermedades.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={diseaseDistribution}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Casos">
                  {diseaseDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={FEATURE_COLORS[index % FEATURE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="shap-tags">
            {diseaseDistribution.slice(0, 10).map((item) => (
              <span key={item.name} className="shap-tag">
                {item.name}: {item.value}
              </span>
            ))}
          </div>
        </section>

        <section className="shap-card">
          <h3>Nivel de urgencia en predicciones</h3>
          {urgencyDistribution.length === 0 ? (
            <p>No hay suficientes datos de urgencia.</p>
          ) : (
            <ul className="shap-summary shap-summary--column">
              {urgencyDistribution.map((item) => (
                <li key={item.name}>
                  <span>{item.name}</span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="shap-card shap-card--wide">
          <h3>Equidad por grupo ({FAIRNESS_OPTIONS.find((opt) => opt.value === selectedGroup)?.label})</h3>
          {fairnessChartData.length === 0 ? (
            <p>No hay suficientes datos para calcular métricas de equidad.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={fairnessChartData}>
                <XAxis dataKey="group" />
                <YAxis />
                <Tooltip formatter={(value, name) => {
                  if (name === 'count') return [value, 'Predicciones'];
                  return [formatPercentage(value), name === 'avgConfidence' ? 'Confianza promedio' : 'Alta confianza'];
                }}
                />
                <Legend />
                <Bar dataKey="avgConfidence" name="Confianza promedio" fill="#0ea5e9" />
                <Bar dataKey="highConfidence" name="Alta confianza" fill="#22c55e" />
                <Bar dataKey="count" name="Total de predicciones" fill="#64748b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="shap-card shap-card--wide">
          <h3>Factores explicativos frecuentes</h3>
          {friendlyFactors.length === 0 ? (
            <p>No hay factores suficientes para mostrar.</p>
          ) : (
            <ul className="shap-key-factors">
              {friendlyFactors.map((item) => (
                <li key={item.description}>
                  <span>{item.description}</span>
                  <strong>{item.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default ShapDashboard;

