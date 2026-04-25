import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import './Dashboard.css';
import AlertConsole from '../components/AlertConsole';
import AppointmentCalendar from '../components/AppointmentCalendar';
import { BACKEND_BASE_URL, AI_BASE_URL } from '../utils/apiBase';

const tryFetch = async (urls, config) => {
  let lastError;
  for (const url of urls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await axios.get(url, config);
      return { response, url };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

function Dashboard() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backendApiRoot = useMemo(() => `${BACKEND_BASE_URL}/api`, [BACKEND_BASE_URL]);
  const backendHealthCandidates = useMemo(
    () => [`${BACKEND_BASE_URL}/health`, `${BACKEND_BASE_URL}/api/health`],
    [BACKEND_BASE_URL]
  );
  const aiHealthUrl = useMemo(() => `${AI_BASE_URL}/health`, [AI_BASE_URL]);
  const aiDocsUrl = useMemo(
    () => `${AI_BASE_URL.replace(/\/api\/v\d+$/i, '')}/docs`,
    [AI_BASE_URL]
  );

  const checkServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check Backend
      const { response: backendResponse, url: resolvedBackendHealthUrl } = await tryFetch(
        backendHealthCandidates
      );
      setBackendStatus({ ...backendResponse.data, resolvedUrl: resolvedBackendHealthUrl });

      // Check AI Services
      const aiResponse = await axios.get(aiHealthUrl);
      setAiStatus(aiResponse.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [backendHealthCandidates, aiHealthUrl]);

  useEffect(() => {
    checkServices();
  }, [checkServices]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>📊 Estado del Sistema</h1>
          <p className="dashboard-subtitle">Monitoreo de servicios de RespiCare</p>
        </header>

        <div className="dashboard-content">
          <div className="services-section">
            <h3>Estado de Servicios</h3>
            
            {loading && (
              <div className="loading">
                <div className="spinner"></div>
                <p>Verificando servicios...</p>
              </div>
            )}

            {error && (
              <div className="error-message">
                <p>⚠️ Error al conectar con los servicios: {error}</p>
                <button onClick={checkServices} className="retry-button">
                  Reintentar
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="services-grid">
                <div className="service-card">
                  <div className={`status-indicator ${backendStatus?.status === 'healthy' ? 'healthy' : 'unhealthy'}`}></div>
                  <h4>🔧 Backend API</h4>
                  <p className="service-status">
                    {backendStatus?.status === 'healthy' ? '✅ Operativo' : '❌ No disponible'}
                  </p>
                  {backendStatus && (
                    <div className="service-details">
                      <p><strong>Versión:</strong> {backendStatus.version}</p>
                      <p><strong>Uptime:</strong> {Math.floor(backendStatus.uptime)}s</p>
                    </div>
                  )}
                  <a href={backendApiRoot} target="_blank" rel="noopener noreferrer" className="service-link">
                    Ver API →
                  </a>
                </div>

                <div className="service-card">
                  <div className={`status-indicator ${aiStatus?.status === 'healthy' ? 'healthy' : 'unhealthy'}`}></div>
                  <h4>🤖 AI Services</h4>
                  <p className="service-status">
                    {aiStatus?.status === 'healthy' ? '✅ Operativo' : '❌ No disponible'}
                  </p>
                  {aiStatus && (
                    <div className="service-details">
                      <p><strong>Versión:</strong> {aiStatus.version}</p>
                      <p><strong>Servicio:</strong> {aiStatus.service}</p>
                    </div>
                  )}
                  <a href={aiDocsUrl} target="_blank" rel="noopener noreferrer" className="service-link">
                    Ver Docs →
                  </a>
                </div>
              </div>
            )}

            <button onClick={checkServices} className="refresh-button">
              🔄 Actualizar Estado
            </button>
          </div>

          <div className="info-section">
            <h3>Endpoints Disponibles</h3>
            <div className="endpoints-list">
              <div className="endpoint">
                <span className="method method-get">GET</span>
                <a
                  href={backendStatus?.resolvedUrl || backendHealthCandidates[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  /api/health
                </a>
              </div>
              <div className="endpoint">
                <span className="method method-get">GET</span>
                <a href={backendApiRoot} target="_blank" rel="noopener noreferrer">
                  /api
                </a>
              </div>
              <div className="endpoint">
                <span className="method method-post">POST</span>
                <span>/api/auth/login</span>
              </div>
              <div className="endpoint">
                <span className="method method-post">POST</span>
                <span>/api/auth/register</span>
              </div>
              <div className="endpoint">
                <span className="method method-get">GET</span>
                <a href={aiHealthUrl} target="_blank" rel="noopener noreferrer">
                  /api/v1/health (AI)
                </a>
              </div>
            </div>
          </div>

          <div className="alert-console-section">
            <AlertConsole />
          </div>

          <div className="appointment-calendar-section">
            <AppointmentCalendar />
          </div>

          <div className="admin-tools">
            <h3>Herramientas de Administración</h3>
            <div className="tools-grid">
              <a href="http://localhost:8081" target="_blank" rel="noopener noreferrer" className="tool-card">
                <span className="tool-icon">🗄️</span>
                <h4>MongoDB Express</h4>
                <p>Administración de Base de Datos</p>
                <span className="tool-credentials">admin / admin123</span>
              </a>
              <a href="http://localhost:8082" target="_blank" rel="noopener noreferrer" className="tool-card">
                <span className="tool-icon">💾</span>
                <h4>Redis Commander</h4>
                <p>Gestión de Caché</p>
              </a>
            </div>
          </div>
        </div>

        <footer className="dashboard-footer">
          <p>RespiCare © 2025 - Sistema de Enfermedades Respiratorias</p>
          <p className="tech-stack">
            React • Node.js • Python • MongoDB • Redis • Docker
          </p>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;

