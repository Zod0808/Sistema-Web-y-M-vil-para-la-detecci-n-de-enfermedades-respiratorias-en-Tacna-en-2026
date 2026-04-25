/**
 * MLAdvancedResults Component
 * 
 * Componente para mostrar resultados avanzados de ML:
 * - Explicaciones SHAP mejoradas
 * - Comparación de modelos
 * - Recomendaciones optimizadas (RL)
 * - Historial de experimentos
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SHAPVisualization from './SHAPVisualization';
import FactorChart from './FactorChart';
import './MLAdvancedResults.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

function MLAdvancedResults({ analysisId, experimentId, sessionId }) {
  const [activeTab, setActiveTab] = useState('explanations');
  const [shapData, setShapData] = useState(null);
  const [modelComparison, setModelComparison] = useState(null);
  const [rlRecommendations, setRlRecommendations] = useState(null);
  const [experimentHistory, setExperimentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (analysisId) {
      loadAnalysisData();
    }
    if (experimentId) {
      loadExperimentData();
    }
    if (sessionId) {
      loadRLRecommendations();
    }
  }, [analysisId, experimentId, sessionId]);

  const loadAnalysisData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/symptom-analyzer/ml-analyze/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.data.explanation) {
        setShapData(response.data.data.explanation);
      }
    } catch (err) {
      setError('Error cargando datos de análisis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadExperimentData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/ml/experiments`, {
        params: { experimentId },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setExperimentHistory(response.data.data);
      }
    } catch (err) {
      console.error('Error cargando experimentos:', err);
    }
  };

  const loadRLRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/ml/rl/session/${sessionId}/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setRlRecommendations(response.data.data);
      }
    } catch (err) {
      console.error('Error cargando recomendaciones RL:', err);
    }
  };

  const loadModelComparison = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/ml/models/compare`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setModelComparison(response.data.data);
      }
    } catch (err) {
      setError('Error cargando comparación de modelos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'comparison') {
      loadModelComparison();
    }
  }, [activeTab]);

  return (
    <div className="ml-advanced-results">
      <div className="ml-advanced-results__tabs">
        <button
          className={`ml-advanced-results__tab ${activeTab === 'explanations' ? 'active' : ''}`}
          onClick={() => setActiveTab('explanations')}
        >
          📊 Explicaciones SHAP
        </button>
        <button
          className={`ml-advanced-results__tab ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          ⚖️ Comparación de Modelos
        </button>
        <button
          className={`ml-advanced-results__tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          🎯 Recomendaciones Optimizadas
        </button>
        <button
          className={`ml-advanced-results__tab ${activeTab === 'experiments' ? 'active' : ''}`}
          onClick={() => setActiveTab('experiments')}
        >
          🧪 Historial de Experimentos
        </button>
      </div>

      <div className="ml-advanced-results__content">
        {loading && (
          <div className="ml-advanced-results__loading">
            <div className="spinner" />
            <p>Cargando resultados avanzados...</p>
          </div>
        )}

        {error && (
          <div className="ml-advanced-results__error">
            <p>❌ {error}</p>
          </div>
        )}

        {activeTab === 'explanations' && shapData && (
          <div className="ml-advanced-results__explanations">
            <h3>Explicaciones SHAP Detalladas</h3>
            <SHAPVisualization shapData={shapData} />
            <FactorChart factors={shapData.factors || []} />
          </div>
        )}

        {activeTab === 'comparison' && modelComparison && (
          <div className="ml-advanced-results__comparison">
            <h3>Comparación de Modelos</h3>
            <ModelComparisonTable models={modelComparison.models} />
            <ModelPerformanceChart metrics={modelComparison.metrics} />
          </div>
        )}

        {activeTab === 'recommendations' && rlRecommendations && (
          <div className="ml-advanced-results__recommendations">
            <h3>Recomendaciones Optimizadas por RL</h3>
            <RLRecommendationsList recommendations={rlRecommendations} />
          </div>
        )}

        {activeTab === 'experiments' && (
          <div className="ml-advanced-results__experiments">
            <h3>Historial de Experimentos ML</h3>
            <ExperimentHistoryTable experiments={experimentHistory} />
          </div>
        )}
      </div>
    </div>
  );
}

function ModelComparisonTable({ models }) {
  return (
    <div className="model-comparison-table">
      <table>
        <thead>
          <tr>
            <th>Modelo</th>
            <th>Precisión</th>
            <th>Recall</th>
            <th>F1-Score</th>
            <th>ROC-AUC</th>
            <th>Tiempo (ms)</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model, idx) => (
            <tr key={idx}>
              <td><strong>{model.name}</strong></td>
              <td>{(model.precision * 100).toFixed(2)}%</td>
              <td>{(model.recall * 100).toFixed(2)}%</td>
              <td>{(model.f1 * 100).toFixed(2)}%</td>
              <td>{(model.rocAuc * 100).toFixed(2)}%</td>
              <td>{model.inferenceTime}</td>
              <td>
                <span className={`status-badge ${model.status}`}>
                  {model.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelPerformanceChart({ metrics }) {
  // Gráfico simple de barras para métricas
  return (
    <div className="model-performance-chart">
      <h4>Métricas de Performance</h4>
      <div className="metrics-bars">
        {Object.entries(metrics).map(([metric, value]) => (
          <div key={metric} className="metric-bar">
            <div className="metric-label">{metric}</div>
            <div className="metric-bar-container">
              <div 
                className="metric-bar-fill" 
                style={{ width: `${value * 100}%` }}
              />
              <span className="metric-value">{(value * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RLRecommendationsList({ recommendations }) {
  return (
    <div className="rl-recommendations-list">
      {recommendations.map((rec, idx) => (
        <div key={idx} className="rl-recommendation-card">
          <div className="rl-recommendation__header">
            <h4>{rec.action}</h4>
            <span className="confidence-badge">
              Confianza: {(rec.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <p className="rl-recommendation__description">{rec.recommendation}</p>
          <div className="rl-recommendation__state">
            <strong>Estado:</strong>
            <ul>
              <li>Adherencia: {(rec.state_summary.adherence_rate * 100).toFixed(1)}%</li>
              <li>Recordatorios recientes: {rec.state_summary.recent_reminders}</li>
              <li>Tiempo hasta próxima dosis: {rec.state_summary.time_to_next_dose}</li>
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExperimentHistoryTable({ experiments }) {
  return (
    <div className="experiment-history-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tipo</th>
            <th>Modelo</th>
            <th>Estado</th>
            <th>Duración</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {experiments.map((exp) => (
            <tr key={exp.experimentId}>
              <td>{exp.experimentId.substring(0, 8)}...</td>
              <td>{exp.experimentType}</td>
              <td>{exp.modelName}</td>
              <td>
                <span className={`status-badge ${exp.status}`}>
                  {exp.status}
                </span>
              </td>
              <td>{exp.performance?.durationMs ? `${(exp.performance.durationMs / 1000).toFixed(1)}s` : 'N/A'}</td>
              <td>{new Date(exp.createdAt).toLocaleDateString()}</td>
              <td>
                <button className="btn-view-details">Ver detalles</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MLAdvancedResults;

