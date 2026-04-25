import React, { useState } from 'react';
import axios from 'axios';
import './SymptomReportForm.css';
import { LEGACY_API_BASE } from '../utils/apiBase';

const DISTRICTS = [
  'Centro de Tacna',
  'Gregorio Albarracín',
  'Ciudad Nueva',
  'Pocollay',
  'Alto de la Alianza',
  'Calana',
  'Pachia',
  'Boca del Río'
];

const DISTRICT_COORDINATES = {
  'Centro de Tacna': { latitude: -18.0056, longitude: -70.2444 },
  'Gregorio Albarracín': { latitude: -18.0300, longitude: -70.2500 },
  'Ciudad Nueva': { latitude: -18.0120, longitude: -70.2300 },
  'Pocollay': { latitude: -17.9950, longitude: -70.2100 },
  'Alto de la Alianza': { latitude: -17.9700, longitude: -70.2400 },
  'Calana': { latitude: -17.9600, longitude: -70.1950 },
  'Pachia': { latitude: -17.9200, longitude: -70.1850 },
  'Boca del Río': { latitude: -18.0400, longitude: -70.2800 }
};

const COMMON_SYMPTOMS = [
  { name: 'Tos seca', category: 'respiratory' },
  { name: 'Tos con flema', category: 'respiratory' },
  { name: 'Dificultad para respirar', category: 'respiratory' },
  { name: 'Falta de aire', category: 'respiratory' },
  { name: 'Sibilancias', category: 'respiratory' },
  { name: 'Dolor de pecho', category: 'pain' },
  { name: 'Fiebre', category: 'fever' },
  { name: 'Escalofríos', category: 'fever' },
  { name: 'Dolor de garganta', category: 'pain' },
  { name: 'Dolor de cabeza', category: 'pain' },
  { name: 'Fatiga', category: 'fatigue' },
  { name: 'Dolor muscular', category: 'pain' },
  { name: 'Congestión nasal', category: 'respiratory' },
  { name: 'Pérdida de olfato', category: 'neurological' },
  { name: 'Pérdida de gusto', category: 'neurological' }
];

function SymptomReportForm({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    district: '',
    address: '',
    selectedSymptoms: [],
    customSymptom: '',
    temperature: '',
    oxygenSaturation: '',
    phone: '',
    email: '',
    notes: ''
  });

  const [symptomSeverities, setSymptomSeverities] = useState({});
  const [symptomDurations, setSymptomDurations] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSymptomToggle = (symptomName) => {
    const isSelected = formData.selectedSymptoms.includes(symptomName);
    
    if (isSelected) {
      setFormData({
        ...formData,
        selectedSymptoms: formData.selectedSymptoms.filter(s => s !== symptomName)
      });
      // Remove severity and duration for this symptom
      const newSeverities = { ...symptomSeverities };
      const newDurations = { ...symptomDurations };
      delete newSeverities[symptomName];
      delete newDurations[symptomName];
      setSymptomSeverities(newSeverities);
      setSymptomDurations(newDurations);
    } else {
      setFormData({
        ...formData,
        selectedSymptoms: [...formData.selectedSymptoms, symptomName]
      });
      // Set default severity and duration
      setSymptomSeverities({ ...symptomSeverities, [symptomName]: 'mild' });
      setSymptomDurations({ ...symptomDurations, [symptomName]: { value: 1, unit: 'days' } });
    }
  };

  const handleSeverityChange = (symptomName, severity) => {
    setSymptomSeverities({
      ...symptomSeverities,
      [symptomName]: severity
    });
  };

  const handleDurationChange = (symptomName, value, unit) => {
    setSymptomDurations({
      ...symptomDurations,
      [symptomName]: { value: parseInt(value) || 1, unit }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!formData.district) {
      setError('Por favor selecciona un distrito');
      return;
    }
    
    if (formData.selectedSymptoms.length === 0) {
      setError('Por favor selecciona al menos un síntoma');
      return;
    }

    setLoading(true);

    try {
      // Prepare symptoms array
      const symptoms = formData.selectedSymptoms.map(symptomName => ({
        name: symptomName,
        severity: symptomSeverities[symptomName] || 'mild',
        duration: symptomDurations[symptomName] || { value: 1, unit: 'days' }
      }));

      // Determine primary category (most common category among selected symptoms)
      const categoryCounts = {};
      formData.selectedSymptoms.forEach(symptomName => {
        const symptom = COMMON_SYMPTOMS.find(s => s.name === symptomName);
        if (symptom) {
          categoryCounts[symptom.category] = (categoryCounts[symptom.category] || 0) + 1;
        }
      });
      const primaryCategory = Object.keys(categoryCounts).reduce((a, b) => 
        categoryCounts[a] > categoryCounts[b] ? a : b, 'respiratory'
      );

      // Prepare report data
      const reportData = {
        location: {
          district: formData.district,
          coordinates: DISTRICT_COORDINATES[formData.district],
          address: formData.address || undefined
        },
        symptoms,
        category: primaryCategory,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        oxygenSaturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation) : undefined,
        contactInfo: {
          phone: formData.phone || undefined,
          email: formData.email || undefined
        },
        notes: formData.notes || undefined,
        reportedBy: 'patient',
        source: 'web',
        isAnonymous: !formData.phone && !formData.email
      };

      // Submit report
      const response = await axios.post(
        `${LEGACY_API_BASE}/symptom-reports`,
        reportData
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Error submitting report:', err);
      setError('Error al enviar el reporte. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="symptom-report-modal">
      <div className="symptom-report-content">
        <div className="symptom-report-header">
          <h2 id="symptom-report-title">📋 Reportar Síntomas</h2>
          <button
            className="close-btn"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h3>¡Reporte Enviado!</h3>
            <p>Tu reporte ha sido registrado exitosamente.</p>
            <p className="success-note">Gracias por contribuir a la salud de nuestra comunidad.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="symptom-report-form">
            {error && (
              <div className="error-banner">
                ⚠️ {error}
              </div>
            )}

            {/* Ubicación */}
            <div className="form-section">
              <h3>📍 Ubicación</h3>
              
              <div className="form-group">
                <label htmlFor="symptom-district">Distrito *</label>
                <select
                  id="symptom-district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  required
                >
                  <option value="">Selecciona un distrito</option>
                  {DISTRICTS.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="symptom-address">Dirección (opcional)</label>
                <input
                  id="symptom-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ej: Av. Bolognesi 123"
                />
              </div>
            </div>

            {/* Síntomas */}
            <div className="form-section">
              <h3>🤒 Síntomas *</h3>
              <p className="section-subtitle">Selecciona todos los síntomas que presentas</p>
              
              <div className="symptoms-grid">
                {COMMON_SYMPTOMS.map(symptom => (
                  <div key={symptom.name} className="symptom-item">
                    <label className="symptom-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.selectedSymptoms.includes(symptom.name)}
                        onChange={() => handleSymptomToggle(symptom.name)}
                      />
                      <span>{symptom.name}</span>
                    </label>
                    
                    {formData.selectedSymptoms.includes(symptom.name) && (
                      <div className="symptom-details">
                        <select
                          value={symptomSeverities[symptom.name] || 'mild'}
                          onChange={(e) => handleSeverityChange(symptom.name, e.target.value)}
                          className="severity-select"
                        >
                          <option value="mild">Leve</option>
                          <option value="moderate">Moderado</option>
                          <option value="severe">Severo</option>
                        </select>
                        
                        <div className="duration-input">
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={symptomDurations[symptom.name]?.value || 1}
                            onChange={(e) => handleDurationChange(
                              symptom.name,
                              e.target.value,
                              symptomDurations[symptom.name]?.unit || 'days'
                            )}
                            className="duration-value"
                          />
                          <select
                            value={symptomDurations[symptom.name]?.unit || 'days'}
                            onChange={(e) => handleDurationChange(
                              symptom.name,
                              symptomDurations[symptom.name]?.value || 1,
                              e.target.value
                            )}
                            className="duration-unit"
                          >
                            <option value="hours">horas</option>
                            <option value="days">días</option>
                            <option value="weeks">semanas</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Datos Adicionales */}
            <div className="form-section">
              <h3>🌡️ Datos Adicionales (opcional)</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Temperatura (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="35"
                    max="42"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    placeholder="Ej: 38.5"
                  />
                </div>

                <div className="form-group">
                  <label>Saturación de Oxígeno (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.oxygenSaturation}
                    onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
                    placeholder="Ej: 95"
                  />
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div className="form-section">
              <h3>📞 Información de Contacto (opcional)</h3>
              <p className="section-subtitle">Si deseas que nos pongamos en contacto contigo</p>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+51987654321"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tucorreo@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="form-section">
              <h3>📝 Notas Adicionales (opcional)</h3>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Describe cualquier información adicional relevante..."
                rows="3"
              />
            </div>

            {/* Botones */}
            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel" disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? '⏳ Enviando...' : '📤 Enviar Reporte'}
              </button>
            </div>

            <p className="privacy-note">
              🔒 Tu información será tratada de forma confidencial y se utilizará únicamente para 
              fines estadísticos y de salud pública.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default SymptomReportForm;

