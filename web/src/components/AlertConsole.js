import React, { useState } from 'react';
import axios from 'axios';
import './AlertConsole.css';
import API_BASE from '../utils/apiBase';
const ALERTS_ENDPOINT = `${API_BASE}/alerts`;

const AlertConsole = () => {
  const [jwt, setJwt] = useState('');
  const [internalToken, setInternalToken] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [monitoring, setMonitoring] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const buildHeaders = () => {
    const headers = {};
    if (jwt.trim()) {
      headers.Authorization = `Bearer ${jwt.trim()}`;
    }
    if (internalToken.trim()) {
      headers['x-internal-service-token'] = internalToken.trim();
    }
    return headers;
  };

  const handleError = (error) => {
    console.error('AlertConsole error:', error);
    let message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Error desconocido al contactar el backend';
    
    // Agregar información adicional sobre la URL si es un error de red
    if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      message = `Error de conexión: No se pudo conectar al backend en ${ALERTS_ENDPOINT}. Asegúrate de que el backend esté corriendo en http://localhost:3001`;
    } else if (error.response?.status === 404) {
      message = `Ruta no encontrada: ${error.config?.url}. Verifica que el backend esté corriendo y que la ruta sea correcta.`;
    }
    
    setMessage({ type: 'error', text: message });
  };

  const loadAlerts = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.get(ALERTS_ENDPOINT, {
        headers: buildHeaders(),
        params: { limit: 50 },
      });
      setAlerts(response.data?.data || []);
      setMessage({ type: 'success', text: `Se cargaron ${response.data?.data?.length || 0} alertas.` });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoring = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await axios.get(`${ALERTS_ENDPOINT}/monitoring`, {
        headers: buildHeaders(),
      });
      setMonitoring(response.data?.data || null);
      setMessage({ type: 'success', text: 'Métricas de monitoreo actualizadas.' });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    setLoading(true);
    setMessage(null);
    try {
      await axios.post(`${ALERTS_ENDPOINT}/${alertId}/acknowledge`, null, {
        headers: buildHeaders(),
      });
      setMessage({ type: 'success', text: 'Alerta reconocida correctamente.' });
      await loadAlerts();
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="alert-console">
      <div className="alert-console-header">
        <h3>🛡️ Consola de Alertas</h3>
        <p>
          Prueba rápida de los endpoints <code>GET /api/v1/alerts</code> y{' '}
          <code>POST /api/v1/alerts/:id/acknowledge</code>. Introduce un token JWT válido (doctor/admin)
          o un token interno para consumir los servicios.
        </p>
      </div>

      <div className="alert-console-form">
        <label>
          JWT (Authorization Bearer)
          <input
            type="text"
            placeholder="Pega aquí un token JWT..."
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
          />
        </label>
        <label>
          Token interno (x-internal-service-token)
          <input
            type="text"
            placeholder="Opcional: token interno para servicios"
            value={internalToken}
            onChange={(e) => setInternalToken(e.target.value)}
          />
        </label>

        <div className="alert-console-actions">
          <button onClick={loadAlerts} disabled={loading}>
            🔄 Cargar Alertas
          </button>
          <button onClick={loadMonitoring} disabled={loading}>
            📈 Ver Monitoreo
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert-console-message ${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      {monitoring && (
        <div className="alert-monitoring-card">
          <h4>Estado de la Cola</h4>
          <div className="monitoring-grid">
            <div>
              <span>Total programadas</span>
              <strong>{monitoring.queue?.scheduledSize ?? 0}</strong>
            </div>
            <div>
              <span>Próxima ejecución</span>
              <strong>
                {monitoring.queue?.nextScheduledAt
                  ? new Date(monitoring.queue.nextScheduledAt).toLocaleString()
                  : 'N/A'}
              </strong>
            </div>
            <div>
              <span>En la próxima hora</span>
              <strong>{monitoring.queue?.scheduledWithinHour ?? 0}</strong>
            </div>
            <div>
              <span>Críticas abiertas</span>
              <strong>{monitoring.alerts?.criticalOpen ?? 0}</strong>
            </div>
            <div>
              <span>Fallidas 24h</span>
              <strong>{monitoring.alerts?.failedLast24h ?? 0}</strong>
            </div>
            <div>
              <span>Entregadas hoy</span>
              <strong>{monitoring.alerts?.deliveredToday ?? 0}</strong>
            </div>
          </div>

          {monitoring.recentFailures?.length > 0 && (
            <div className="recent-failures">
              <h5>Últimas alertas fallidas</h5>
              <ul>
                {monitoring.recentFailures.map((failure) => (
                  <li key={failure.id}>
                    <strong>{failure.title}</strong>
                    <span>{failure.lastError || 'Sin mensaje de error'}</span>
                    <time>{new Date(failure.updatedAt).toLocaleString()}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="alert-table-wrapper">
          <table className="alert-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Usuario</th>
                <th>Categoría</th>
                <th>Prioridad</th>
                <th>Estatus</th>
                <th>Programada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert._id || alert.id}>
                  <td>{alert.title}</td>
                  <td>{alert.userId}</td>
                  <td>{alert.category}</td>
                  <td className={`priority priority-${alert.priority}`}>{alert.priority}</td>
                  <td>{alert.status}</td>
                  <td>
                    {alert.scheduledAt
                      ? new Date(alert.scheduledAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    <button
                      className="ack-button"
                      onClick={() => acknowledgeAlert(alert._id || alert.id)}
                      disabled={loading || alert.status === 'acknowledged'}
                    >
                      ✅ Reconocer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {alerts.length === 0 && !loading && (
        <div className="empty-alerts">
          <p>No hay alertas cargadas. Usa el botón "Cargar Alertas" para obtener información.</p>
        </div>
      )}
    </div>
  );
};

export default AlertConsole;

