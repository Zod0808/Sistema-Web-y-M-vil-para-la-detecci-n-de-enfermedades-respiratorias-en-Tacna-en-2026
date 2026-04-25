/**
 * Factor Chart Component
 * 
 * Gráficos interactivos para visualizar factores de riesgo y síntomas
 */

import React, { useState, useMemo } from 'react';
import './FactorChart.css';

const FactorChart = ({ 
  factors = [], 
  type = 'bar', // bar, pie, radar, heatmap
  title = 'Factores de Influencia',
  showLegend = true,
  interactive = true
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [selectedFactor, setSelectedFactor] = useState(null);

  // Procesar datos
  const processedFactors = useMemo(() => {
    if (!factors || factors.length === 0) return [];
    
    return factors.map((factor, idx) => {
      if (typeof factor === 'string') {
        return {
          name: factor,
          value: 1,
          color: getColorForIndex(idx),
          description: '',
        };
      }
      return {
        name: factor.name || factor.feature || factor.label || `Factor ${idx + 1}`,
        value: factor.value || factor.importance || factor.weight || 0.5,
        color: factor.color || getColorForIndex(idx),
        description: factor.description || '',
        category: factor.category || '',
      };
    });
  }, [factors]);

  const maxValue = useMemo(() => {
    if (processedFactors.length === 0) return 1;
    return Math.max(...processedFactors.map(f => Math.abs(f.value)));
  }, [processedFactors]);

  // Obtener color por índice
  function getColorForIndex(idx) {
    const colors = [
      '#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0',
      '#00bcd4', '#ffc107', '#795548', '#607d8b', '#e91e63'
    ];
    return colors[idx % colors.length];
  }

  // Renderizar Bar Chart
  const renderBarChart = () => {
    const sorted = [...processedFactors].sort((a, b) => b.value - a.value);
    
    return (
      <div className="factor-chart-bar">
        {sorted.map((factor, idx) => {
          const percentage = (Math.abs(factor.value) / maxValue) * 100;
          const isHovered = hoveredIndex === idx;
          
          return (
            <div
              key={idx}
              className={`bar-item ${isHovered ? 'hovered' : ''} ${selectedFactor === idx ? 'selected' : ''}`}
              onMouseEnter={() => interactive && setHoveredIndex(idx)}
              onMouseLeave={() => interactive && setHoveredIndex(null)}
              onClick={() => interactive && setSelectedFactor(selectedFactor === idx ? null : idx)}
            >
              <div className="bar-label-container">
                <span className="bar-label">{factor.name}</span>
                {factor.category && (
                  <span className="bar-category">{factor.category}</span>
                )}
              </div>
              <div className="bar-wrapper">
                <div
                  className="bar-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: factor.color,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <span className="bar-value">{factor.value.toFixed(2)}</span>
                </div>
              </div>
              {isHovered && factor.description && (
                <div className="bar-tooltip">{factor.description}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizar Pie Chart
  const renderPieChart = () => {
    const total = processedFactors.reduce((sum, f) => sum + Math.abs(f.value), 0);
    let currentAngle = 0;
    
    return (
      <div className="factor-chart-pie">
        <svg viewBox="0 0 200 200" className="pie-svg">
          {processedFactors.map((factor, idx) => {
            const value = Math.abs(factor.value);
            const percentage = (value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            const startX = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
            const startY = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
            const endX = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
            const endY = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
            const largeArc = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M 100 100`,
              `L ${startX} ${startY}`,
              `A 80 80 0 ${largeArc} 1 ${endX} ${endY}`,
              `Z`
            ].join(' ');
            
            currentAngle += angle;
            
            const isHovered = hoveredIndex === idx;
            
            return (
              <path
                key={idx}
                d={pathData}
                fill={factor.color}
                className={`pie-segment ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => interactive && setHoveredIndex(idx)}
                onMouseLeave={() => interactive && setHoveredIndex(null)}
                onClick={() => interactive && setSelectedFactor(selectedFactor === idx ? null : idx)}
                style={{ opacity: isHovered ? 0.8 : 1, cursor: interactive ? 'pointer' : 'default' }}
              />
            );
          })}
          <circle cx="100" cy="100" r="50" fill="white" />
          <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" className="pie-center-text">
            {title}
          </text>
        </svg>
        {showLegend && (
          <div className="pie-legend">
            {processedFactors.map((factor, idx) => (
              <div
                key={idx}
                className={`legend-item ${hoveredIndex === idx ? 'hovered' : ''} ${selectedFactor === idx ? 'selected' : ''}`}
                onMouseEnter={() => interactive && setHoveredIndex(idx)}
                onMouseLeave={() => interactive && setHoveredIndex(null)}
                onClick={() => interactive && setSelectedFactor(selectedFactor === idx ? null : idx)}
              >
                <span className="legend-color" style={{ backgroundColor: factor.color }} />
                <span className="legend-name">{factor.name}</span>
                <span className="legend-value">{(Math.abs(factor.value) / total * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Renderizar Radar Chart
  const renderRadarChart = () => {
    const max = Math.max(...processedFactors.map(f => Math.abs(f.value)));
    const numPoints = processedFactors.length;
    const angleStep = (2 * Math.PI) / numPoints;
    const centerX = 150;
    const centerY = 150;
    const radius = 100;
    
    const points = processedFactors.map((factor, idx) => {
      const angle = idx * angleStep - Math.PI / 2;
      const value = Math.abs(factor.value);
      const r = (value / max) * radius;
      return {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
        factor,
        angle,
      };
    });
    
    const pathData = points.map((p, idx) => 
      `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z';
    
    return (
      <div className="factor-chart-radar">
        <svg viewBox="0 0 300 300" className="radar-svg">
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((scale, idx) => (
            <circle
              key={idx}
              cx={centerX}
              cy={centerY}
              r={radius * scale}
              fill="none"
              stroke="#e0e0e0"
              strokeWidth="1"
            />
          ))}
          
          {/* Axis lines */}
          {points.map((point, idx) => (
            <line
              key={idx}
              x1={centerX}
              y1={centerY}
              x2={centerX + radius * Math.cos(point.angle)}
              y2={centerY + radius * Math.sin(point.angle)}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
          ))}
          
          {/* Data polygon */}
          <path
            d={pathData}
            fill="rgba(25, 118, 210, 0.2)"
            stroke="#1976d2"
            strokeWidth="2"
            className="radar-polygon"
          />
          
          {/* Points and labels */}
          {points.map((point, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g key={idx}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? 6 : 4}
                  fill={point.factor.color}
                  className="radar-point"
                  onMouseEnter={() => interactive && setHoveredIndex(idx)}
                  onMouseLeave={() => interactive && setHoveredIndex(null)}
                  style={{ cursor: interactive ? 'pointer' : 'default' }}
                />
                <text
                  x={centerX + (radius + 20) * Math.cos(point.angle)}
                  y={centerY + (radius + 20) * Math.sin(point.angle)}
                  textAnchor={point.angle > -Math.PI / 2 && point.angle < Math.PI / 2 ? 'start' : 'end'}
                  dominantBaseline="middle"
                  className="radar-label"
                >
                  {point.factor.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  if (processedFactors.length === 0) {
    return (
      <div className="factor-chart-empty">
        <p>No hay factores disponibles para visualizar.</p>
      </div>
    );
  }

  return (
    <div className="factor-chart">
      <div className="factor-chart-header">
        <h4>{title}</h4>
        {interactive && selectedFactor !== null && processedFactors[selectedFactor]?.description && (
          <div className="factor-detail">
            <strong>{processedFactors[selectedFactor].name}</strong>
            <p>{processedFactors[selectedFactor].description}</p>
          </div>
        )}
      </div>
      
      <div className="factor-chart-content">
        {type === 'bar' && renderBarChart()}
        {type === 'pie' && renderPieChart()}
        {type === 'radar' && renderRadarChart()}
      </div>
    </div>
  );
};

export default FactorChart;

