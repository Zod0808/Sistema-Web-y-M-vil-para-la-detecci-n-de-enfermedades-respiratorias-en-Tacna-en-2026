/**
 * SHAP Visualization Component
 * 
 * Visualiza explicaciones SHAP de manera interactiva y comprensible
 */

import React, { useState, useMemo } from 'react';
import './SHAPVisualization.css';

const SHAPVisualization = ({ shapData, explanation, disease, confidence }) => {
  const [selectedView, setSelectedView] = useState('waterfall'); // waterfall, bar, summary
  
  // Procesar datos SHAP
  const processedData = useMemo(() => {
    if (!shapData && !explanation) return null;
    
    // Si viene explanation con formato friendly
    if (explanation?.friendly) {
      const factors = explanation.friendly.key_factors || [];
      return factors.map((factor, idx) => ({
        feature: typeof factor === 'string' ? factor : factor.feature || `Factor ${idx + 1}`,
        value: typeof factor === 'object' && factor.importance ? factor.importance : 0.5 - (idx * 0.1),
        description: typeof factor === 'object' && factor.description ? factor.description : factor,
      }));
    }
    
    // Si viene explanation con decision_factors
    if (explanation?.decision_factors) {
      return explanation.decision_factors.map((factor, idx) => ({
        feature: typeof factor === 'string' ? factor : factor.feature_name || `Factor ${idx + 1}`,
        value: typeof factor === 'object' && factor.shap_value !== undefined 
          ? Math.abs(factor.shap_value) 
          : 0.5 - (idx * 0.1),
        description: typeof factor === 'object' && factor.description ? factor.description : factor,
      }));
    }
    
    // Si viene shapData directo
    if (shapData) {
      if (Array.isArray(shapData)) {
        return shapData.map((item, idx) => ({
          feature: item.feature || item.name || `Factor ${idx + 1}`,
          value: Math.abs(item.value || item.shap_value || 0),
          description: item.description || '',
        }));
      }
    }
    
    return null;
  }, [shapData, explanation]);

  if (!processedData || processedData.length === 0) {
    return (
      <div className="shap-visualization-empty">
        <p>No hay datos de explicación disponibles para visualizar.</p>
      </div>
    );
  }

  // Ordenar por valor absoluto
  const sortedData = [...processedData].sort((a, b) => b.value - a.value);
  const maxValue = Math.max(...sortedData.map(d => d.value));

  // Renderizar Waterfall
  const renderWaterfall = () => {
    let cumulative = 0;
    return (
      <div className="shap-waterfall">
        <div className="waterfall-start">
          <div className="waterfall-label">Predicción base</div>
          <div className="waterfall-bar base" />
        </div>
        {sortedData.map((item, idx) => {
          cumulative += item.value;
          const isPositive = item.value >= 0;
          return (
            <div key={idx} className="waterfall-step">
              <div className="waterfall-label">{item.feature}</div>
              <div className="waterfall-bar-container">
                <div 
                  className={`waterfall-bar ${isPositive ? 'positive' : 'negative'}`}
                  style={{ 
                    width: `${(Math.abs(item.value) / maxValue) * 100}%`,
                    marginLeft: isPositive ? '0' : 'auto',
                    marginRight: isPositive ? 'auto' : '0',
                  }}
                >
                  <span className="bar-value">{item.value.toFixed(3)}</span>
                </div>
              </div>
              <div className="waterfall-cumulative">
                {cumulative.toFixed(3)}
              </div>
            </div>
          );
        })}
        <div className="waterfall-end">
          <div className="waterfall-label">Predicción final</div>
          <div className="waterfall-bar final" />
        </div>
      </div>
    );
  };

  // Renderizar Bar Chart
  const renderBarChart = () => {
    return (
      <div className="shap-bar-chart">
        {sortedData.slice(0, 10).map((item, idx) => (
          <div key={idx} className="bar-item">
            <div className="bar-label">{item.feature}</div>
            <div className="bar-container">
              <div 
                className="bar-fill"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              >
                <span className="bar-value">{item.value.toFixed(3)}</span>
              </div>
            </div>
            {item.description && (
              <div className="bar-description">{item.description}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Renderizar Summary
  const renderSummary = () => {
    const topPositive = sortedData.filter(d => d.value >= 0).slice(0, 5);
    const topNegative = sortedData.filter(d => d.value < 0).slice(0, 5);
    
    return (
      <div className="shap-summary">
        <div className="summary-section">
          <h4>Factores que aumentan la probabilidad</h4>
          <ul>
            {topPositive.map((item, idx) => (
              <li key={idx}>
                <strong>{item.feature}</strong>
                {item.description && <span>: {item.description}</span>}
                <span className="value-badge positive">+{item.value.toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="summary-section">
          <h4>Factores que disminuyen la probabilidad</h4>
          <ul>
            {topNegative.map((item, idx) => (
              <li key={idx}>
                <strong>{item.feature}</strong>
                {item.description && <span>: {item.description}</span>}
                <span className="value-badge negative">{item.value.toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="shap-visualization">
      <div className="shap-header">
        <div className="shap-title">
          <h3>Explicación del Diagnóstico</h3>
          {disease && (
            <div className="diagnosis-info">
              <span className="disease-name">{disease}</span>
              {confidence && (
                <span className="confidence-badge">
                  {(confidence * 100).toFixed(1)}% confianza
                </span>
              )}
            </div>
          )}
        </div>
        <div className="view-selector">
          <button
            className={selectedView === 'waterfall' ? 'active' : ''}
            onClick={() => setSelectedView('waterfall')}
          >
            Waterfall
          </button>
          <button
            className={selectedView === 'bar' ? 'active' : ''}
            onClick={() => setSelectedView('bar')}
          >
            Barras
          </button>
          <button
            className={selectedView === 'summary' ? 'active' : ''}
            onClick={() => setSelectedView('summary')}
          >
            Resumen
          </button>
        </div>
      </div>

      <div className="shap-content">
        {selectedView === 'waterfall' && renderWaterfall()}
        {selectedView === 'bar' && renderBarChart()}
        {selectedView === 'summary' && renderSummary()}
      </div>

      <div className="shap-footer">
        <p className="shap-disclaimer">
          ℹ️ Esta visualización muestra cómo cada síntoma o factor contribuye al diagnóstico.
          Los valores SHAP indican el impacto de cada característica en la predicción.
        </p>
      </div>
    </div>
  );
};

export default SHAPVisualization;

