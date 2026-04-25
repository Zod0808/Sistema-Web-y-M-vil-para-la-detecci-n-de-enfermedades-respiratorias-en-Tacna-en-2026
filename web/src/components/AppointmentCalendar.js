import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import './AppointmentCalendar.css';
import API_BASE from '../utils/apiBase';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const AppointmentCalendar = ({ token }) => {
  const [doctorId, setDoctorId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const headers = useMemo(() => {
    const h = {
      'Content-Type': 'application/json',
    };
    if (token) {
      h.Authorization = `Bearer ${token}`;
    }
    return h;
  }, [token]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      params.append('status', 'scheduled,rescheduled');
      if (doctorId.trim()) params.append('doctorId', doctorId.trim());
      if (patientId.trim()) params.append('patientId', patientId.trim());
      params.append('from', new Date().toISOString());

      const response = await axios.get(`${API_BASE}/appointments?${params.toString()}`, {
        headers,
      });
      setAppointments(response.data?.data ?? []);
      setMessage({ type: 'success', text: 'Citas cargadas correctamente.' });
    } catch (error) {
      console.error(error);
      const text =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'No fue posible cargar las citas.';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  }, [doctorId, headers, patientId]);

  const loadAvailability = useCallback(async () => {
    if (!doctorId.trim()) {
      setMessage({ type: 'error', text: 'Ingrese un ID de doctor para consultar disponibilidad.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const start = new Date(selectedDate);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
        slotMinutes: '30',
      });
      const response = await axios.get(
        `${API_BASE}/appointments/doctor/${doctorId.trim()}/availability?${params.toString()}`,
        {
          headers,
        }
      );
      setAvailability(response.data?.data ?? []);
      setMessage({ type: 'success', text: 'Disponibilidad cargada.' });
    } catch (error) {
      console.error(error);
      const text =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'No se pudo obtener la disponibilidad.';
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  }, [doctorId, headers, selectedDate]);

  useEffect(() => {
    loadAppointments().catch(() => undefined);
  }, [loadAppointments]);

  return (
    <section className="appointment-calendar">
      <header>
        <h3>🗓️ Agenda Médica</h3>
        <p>Consulta las citas programadas y la disponibilidad de los doctores.</p>
      </header>

      <div className="filters">
        <label>
          ID Doctor
          <input
            type="text"
            placeholder="doctor-123"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
          />
        </label>
        <label>
          ID Paciente
          <input
            type="text"
            placeholder="patient-456"
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
          />
        </label>
        <label>
          Fecha para disponibilidad
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>
        <div className="actions">
          <button onClick={loadAppointments} disabled={loading}>
            🔄 Refrescar citas
          </button>
          <button onClick={loadAvailability} disabled={loading}>
            📅 Consultar disponibilidad
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      <div className="calendar-grid">
        <div className="appointments-card">
          <h4>Citas programadas</h4>
          {appointments.length === 0 ? (
            <p className="empty">No hay citas para los filtros seleccionados.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Doctor</th>
                  <th>Estado</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => (
                  <tr key={appointment._id || appointment.id}>
                    <td>{formatDateTime(appointment.scheduledAt)}</td>
                    <td>{appointment.patientId}</td>
                    <td>{appointment.doctorId}</td>
                    <td className={`status status-${appointment.status}`}>{appointment.status}</td>
                    <td>{appointment.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="availability-card">
          <h4>Disponibilidad del doctor</h4>
          {availability.length === 0 ? (
            <p className="empty">Consulta disponibilidad seleccionando un doctor y fecha.</p>
          ) : (
            <ul>
              {availability.map((slot, index) => (
                <li key={index} className={slot.available ? 'available' : 'busy'}>
                  <span>{formatDateTime(slot.start)} - {formatDateTime(slot.end)}</span>
                  <strong>{slot.available ? 'Disponible' : 'Reservado'}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default AppointmentCalendar;

