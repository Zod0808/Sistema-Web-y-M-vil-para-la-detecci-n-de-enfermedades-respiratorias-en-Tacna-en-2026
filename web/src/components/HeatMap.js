import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './HeatMap.css';
import { LEGACY_API_BASE } from '../utils/apiBase';

function HeatMap() {
  const [reportData, setReportData] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch heatmap data from backend
  useEffect(() => {
    fetchHeatmapData();
  }, []);

  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${LEGACY_API_BASE}/symptom-reports/heatmap`);
      
      if (response.data.success && response.data.data) {
        // Transform backend data to frontend format
        const transformedData = response.data.data.map((item, index) => ({
          id: index + 1,
          location: item.district,
          lat: item.coordinates.latitude,
          lng: item.coordinates.longitude,
          cases: item.totalCases,
          severity: item.severity,
          highSeverity: item.highSeverity,
          mediumSeverity: item.mediumSeverity,
          lowSeverity: item.lowSeverity
        }));
        
        setReportData(transformedData);
      } else {
        setError('No se encontraron datos en la base de datos');
        setReportData([]);
      }
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      setError(`Error al cargar datos del mapa de calor: ${err.message}. Verifica que el backend esté funcionando y que haya datos en la base de datos.`);
      // No usar datos mockeados - solo mostrar error
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getSeveritySize = (cases) => {
    if (cases > 35) return 'large';
    if (cases > 20) return 'medium';
    return 'small';
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'high': return 'Alto';
      case 'medium': return 'Medio';
      case 'low': return 'Bajo';
      default: return 'Desconocido';
    }
  };

  const filteredData = filterSeverity === 'all' 
    ? reportData 
    : reportData.filter(item => item.severity === filterSeverity);

  const totalCases = reportData.reduce((sum, item) => sum + item.cases, 0);
  const highRiskZones = reportData.filter(item => item.severity === 'high').length;

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <div>
          <h3>🗺️ Mapa de Calor - Tacna, Perú</h3>
          <p className="heatmap-subtitle">Reportes de Síntomas Respiratorios por Zona</p>
          {error && <p className="error-text" style={{color: '#ff9800', fontSize: '0.85rem', marginTop: '5px'}}>{error}</p>}
        </div>
        <div className="heatmap-stats">
          <div className="stat-item">
            <span className="stat-value">{totalCases}</span>
            <span className="stat-label">Casos Totales</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{highRiskZones}</span>
            <span className="stat-label">Zonas de Alto Riesgo</span>
          </div>
          <button 
            className="refresh-btn" 
            onClick={fetchHeatmapData}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {loading ? '⏳' : '🔄'} Actualizar
          </button>
        </div>
      </div>

      <div className="heatmap-controls">
        <div className="filter-group">
          <label>Filtrar por severidad:</label>
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterSeverity === 'all' ? 'active' : ''}`}
              onClick={() => setFilterSeverity('all')}
            >
              Todos
            </button>
            <button 
              className={`filter-btn high ${filterSeverity === 'high' ? 'active' : ''}`}
              onClick={() => setFilterSeverity('high')}
            >
              Alto
            </button>
            <button 
              className={`filter-btn medium ${filterSeverity === 'medium' ? 'active' : ''}`}
              onClick={() => setFilterSeverity('medium')}
            >
              Medio
            </button>
            <button 
              className={`filter-btn low ${filterSeverity === 'low' ? 'active' : ''}`}
              onClick={() => setFilterSeverity('low')}
            >
              Bajo
            </button>
          </div>
        </div>

        <div className="legend">
          <span className="legend-title">Leyenda:</span>
          <div className="legend-item">
            <span className="legend-circle large" style={{ background: '#f44336' }}></span>
            <span>Alto (&gt;35 casos)</span>
          </div>
          <div className="legend-item">
            <span className="legend-circle medium" style={{ background: '#ff9800' }}></span>
            <span>Medio (20-35 casos)</span>
          </div>
          <div className="legend-item">
            <span className="legend-circle small" style={{ background: '#4caf50' }}></span>
            <span>Bajo (&lt;20 casos)</span>
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          backgroundColor: '#f5f7fa',
          borderRadius: '15px'
        }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{marginLeft: '15px', color: '#666'}}>Cargando datos...</p>
        </div>
      )}

      {!loading && (
        <div className="heatmap-visualization">
          <div className="map-container">
            <div className="map-title">TACNA - PERÚ</div>
            <svg className="map-svg" viewBox="0 0 400 400">
              {/* Mapa base simplificado de Tacna */}
              <rect x="0" y="0" width="400" height="400" fill="#e8f5e9" />
              
              {/* Carreteras principales */}
              <line x1="50" y1="200" x2="350" y2="200" stroke="#90a4ae" strokeWidth="2" />
              <line x1="200" y1="50" x2="200" y2="350" stroke="#90a4ae" strokeWidth="2" />
              
              {/* Zonas con círculos de calor */}
              {filteredData.map((item) => {
                // Convertir lat/lng a coordenadas SVG (simplificado)
                const x = ((item.lng + 70.30) / 0.15) * 400;
                const y = ((-item.lat + 17.90) / 0.15) * 400;
                
                return (
                  <g key={item.id} onClick={() => setSelectedZone(item)}>
                    {/* Círculo exterior (resplandor) */}
                    <circle
                      cx={x}
                      cy={y}
                      r={getSeveritySize(item.cases) === 'large' ? 40 : 
                         getSeveritySize(item.cases) === 'medium' ? 30 : 20}
                      fill={getSeverityColor(item.severity)}
                      opacity="0.2"
                      className="heat-circle-glow"
                    />
                    {/* Círculo principal */}
                    <circle
                      cx={x}
                      cy={y}
                      r={getSeveritySize(item.cases) === 'large' ? 25 : 
                         getSeveritySize(item.cases) === 'medium' ? 18 : 12}
                      fill={getSeverityColor(item.severity)}
                      opacity="0.7"
                      className="heat-circle"
                      style={{ cursor: 'pointer' }}
                    />
                    {/* Número de casos */}
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {item.cases}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="zones-list">
            <h4>Zonas Reportadas</h4>
            <div className="zones-scroll">
              {filteredData
                .sort((a, b) => b.cases - a.cases)
                .map((item) => (
                  <div
                    key={item.id}
                    className={`zone-card ${selectedZone?.id === item.id ? 'selected' : ''}`}
                    onClick={() => setSelectedZone(item)}
                  >
                    <div className="zone-header">
                      <span
                        className="zone-indicator"
                        style={{ background: getSeverityColor(item.severity) }}
                      ></span>
                      <h5>{item.location}</h5>
                    </div>
                    <div className="zone-details">
                      <div className="zone-stat">
                        <span className="zone-label">Casos:</span>
                        <span className="zone-value">{item.cases}</span>
                      </div>
                      <div className="zone-stat">
                        <span className="zone-label">Riesgo:</span>
                        <span 
                          className="zone-badge"
                          style={{ 
                            background: getSeverityColor(item.severity),
                            color: 'white'
                          }}
                        >
                          {getSeverityLabel(item.severity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {selectedZone && (
        <div className="zone-details-modal">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setSelectedZone(null)}>
              ✕
            </button>
            <h3>📍 {selectedZone.location}</h3>
            <div className="modal-stats">
              <div className="modal-stat">
                <span className="modal-stat-label">Casos Reportados</span>
                <span className="modal-stat-value">{selectedZone.cases}</span>
              </div>
              <div className="modal-stat">
                <span className="modal-stat-label">Nivel de Riesgo</span>
                <span 
                  className="modal-stat-badge"
                  style={{ background: getSeverityColor(selectedZone.severity) }}
                >
                  {getSeverityLabel(selectedZone.severity)}
                </span>
              </div>
              <div className="modal-stat">
                <span className="modal-stat-label">Coordenadas</span>
                <span className="modal-stat-value">
                  {selectedZone.lat.toFixed(4)}, {selectedZone.lng.toFixed(4)}
                </span>
              </div>
            </div>
            {selectedZone.highSeverity !== undefined && (
              <div className="modal-breakdown">
                <h4>Desglose por Severidad:</h4>
                <div className="severity-breakdown">
                  <div className="severity-item">
                    <span style={{color: '#f44336'}}>●</span> Alto: {selectedZone.highSeverity}
                  </div>
                  <div className="severity-item">
                    <span style={{color: '#ff9800'}}>●</span> Medio: {selectedZone.mediumSeverity}
                  </div>
                  <div className="severity-item">
                    <span style={{color: '#4caf50'}}>●</span> Bajo: {selectedZone.lowSeverity}
                  </div>
                </div>
              </div>
            )}
            <div className="modal-recommendations">
              <h4>Recomendaciones:</h4>
              <ul>
                {selectedZone.severity === 'high' && (
                  <>
                    <li>⚠️ Zona de alto riesgo - Evitar aglomeraciones</li>
                    <li>😷 Uso obligatorio de mascarilla</li>
                    <li>🏥 Acudir al centro de salud si presenta síntomas</li>
                  </>
                )}
                {selectedZone.severity === 'medium' && (
                  <>
                    <li>⚠️ Zona de riesgo moderado - Mantener precauciones</li>
                    <li>😷 Uso recomendado de mascarilla</li>
                    <li>🧼 Lavado frecuente de manos</li>
                  </>
                )}
                {selectedZone.severity === 'low' && (
                  <>
                    <li>✅ Zona de bajo riesgo</li>
                    <li>😷 Mascarilla en lugares cerrados</li>
                    <li>🧼 Mantener higiene básica</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeatMap;
