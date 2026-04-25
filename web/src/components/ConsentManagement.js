/**
 * Consent Management Component
 * UI para gestión de consentimientos informados médicos
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ConsentManagement = () => {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureCanvas, setSignatureCanvas] = useState(null);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    consentType: '',
  });

  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    consentType: 'procedure',
    title: '',
    description: '',
    procedureDetails: '',
    risks: [],
    benefits: [],
    alternatives: [],
    expiresAt: '',
  });

  const [newRisk, setNewRisk] = useState('');
  const [newBenefit, setNewBenefit] = useState('');
  const [newAlternative, setNewAlternative] = useState('');

  useEffect(() => {
    loadConsents();
    loadStats();
  }, [filters]);

  const getAuthToken = () => {
    return localStorage.getItem('auth_token');
  };

  const apiClient = axios.create({
    baseURL: `${API_URL}/api/v1`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  apiClient.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const loadConsents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.consentType) params.append('consentType', filters.consentType);

      const response = await apiClient.get(`/informed-consents?${params.toString()}`);
      setConsents(response.data.data || []);
    } catch (error) {
      console.error('Error loading consents:', error);
      alert('Error al cargar consentimientos');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/informed-consents/stats/summary');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateConsent = async (e) => {
    e.preventDefault();
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await apiClient.post('/informed-consents', {
        ...formData,
        doctorId: user._id || user.id,
        doctorName: user.name,
        risks: formData.risks.filter(r => r.trim()),
        benefits: formData.benefits.filter(b => b.trim()),
        alternatives: formData.alternatives.filter(a => a.trim()),
      });
      alert('Consentimiento creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      loadConsents();
      loadStats();
    } catch (error) {
      console.error('Error creating consent:', error);
      alert(error.response?.data?.message || 'Error al crear consentimiento');
    }
  };

  const handlePresentConsent = async (consentId) => {
    try {
      await apiClient.post(`/informed-consents/${consentId}/present`);
      alert('Consentimiento presentado al paciente');
      loadConsents();
      loadStats();
    } catch (error) {
      console.error('Error presenting consent:', error);
      alert(error.response?.data?.message || 'Error al presentar consentimiento');
    }
  };

  const handleSignConsent = async (consentId, signerRole = 'patient') => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const canvas = document.getElementById('signatureCanvas');
      if (!canvas) {
        alert('Por favor, dibuje su firma');
        return;
      }

      const signatureData = canvas.toDataURL('image/png');

      await apiClient.post(`/informed-consents/${consentId}/sign`, {
        signerId: user._id || user.id,
        signerName: user.name,
        signerRole: signerRole,
        signatureData: signatureData,
        signatureMethod: 'click_to_sign',
      });

      alert('Firma agregada exitosamente');
      setShowSignatureModal(false);
      clearSignature();
      loadConsents();
      loadStats();
    } catch (error) {
      console.error('Error signing consent:', error);
      alert(error.response?.data?.message || 'Error al firmar consentimiento');
    }
  };

  const handleRevokeConsent = async (consentId) => {
    const reason = prompt('Razón de revocación:');
    if (!reason) return;

    try {
      await apiClient.post(`/informed-consents/${consentId}/revoke`, { reason });
      alert('Consentimiento revocado');
      loadConsents();
      loadStats();
    } catch (error) {
      console.error('Error revoking consent:', error);
      alert(error.response?.data?.message || 'Error al revocar consentimiento');
    }
  };

  const handleDownloadPDF = async (consentId) => {
    try {
      const response = await apiClient.get(`/informed-consents/${consentId}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `consentimiento-${consentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar PDF');
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      patientName: '',
      consentType: 'procedure',
      title: '',
      description: '',
      procedureDetails: '',
      risks: [],
      benefits: [],
      alternatives: [],
      expiresAt: '',
    });
    setNewRisk('');
    setNewBenefit('');
    setNewAlternative('');
  };

  const addRisk = () => {
    if (newRisk.trim()) {
      setFormData({ ...formData, risks: [...formData.risks, newRisk.trim()] });
      setNewRisk('');
    }
  };

  const removeRisk = (index) => {
    setFormData({
      ...formData,
      risks: formData.risks.filter((_, i) => i !== index),
    });
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({ ...formData, benefits: [...formData.benefits, newBenefit.trim()] });
      setNewBenefit('');
    }
  };

  const removeBenefit = (index) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    });
  };

  const addAlternative = () => {
    if (newAlternative.trim()) {
      setFormData({
        ...formData,
        alternatives: [...formData.alternatives, newAlternative.trim()],
      });
      setNewAlternative('');
    }
  };

  const removeAlternative = (index) => {
    setFormData({
      ...formData,
      alternatives: formData.alternatives.filter((_, i) => i !== index),
    });
  };

  const initSignatureCanvas = () => {
    const canvas = document.getElementById('signatureCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    canvas.addEventListener('mousedown', (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      lastX = x;
      lastY = y;
    });

    canvas.addEventListener('mouseup', () => {
      isDrawing = false;
    });

    canvas.addEventListener('mouseout', () => {
      isDrawing = false;
    });
  };

  const clearSignature = () => {
    const canvas = document.getElementById('signatureCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    if (showSignatureModal) {
      setTimeout(initSignatureCanvas, 100);
    }
  }, [showSignatureModal]);

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending_signature: 'bg-yellow-100 text-yellow-800',
      signed: 'bg-green-100 text-green-800',
      revoked: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeLabel = (type) => {
    const labels = {
      procedure: 'Procedimiento',
      treatment: 'Tratamiento',
      surgery: 'Cirugía',
      research: 'Investigación',
      data_sharing: 'Compartir Datos',
      photography: 'Fotografía',
      video_recording: 'Grabación de Video',
      other: 'Otro',
    };
    return labels[type] || type;
  };

  if (loading && consents.length === 0) {
    return <div className="p-4">Cargando consentimientos...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Consentimientos Informados</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Nuevo Consentimiento
        </button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Borrador</div>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Pendiente Firma</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingSignature}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Firmados</div>
            <div className="text-2xl font-bold text-green-600">{stats.signed}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Revocados</div>
            <div className="text-2xl font-bold text-red-600">{stats.revoked}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todos</option>
              <option value="draft">Borrador</option>
              <option value="pending_signature">Pendiente Firma</option>
              <option value="signed">Firmado</option>
              <option value="revoked">Revocado</option>
              <option value="expired">Expirado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={filters.consentType}
              onChange={(e) => setFilters({ ...filters, consentType: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Todos</option>
              <option value="procedure">Procedimiento</option>
              <option value="treatment">Tratamiento</option>
              <option value="surgery">Cirugía</option>
              <option value="research">Investigación</option>
              <option value="data_sharing">Compartir Datos</option>
              <option value="photography">Fotografía</option>
              <option value="video_recording">Grabación de Video</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Consentimientos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {consents.map((consent) => (
              <tr key={consent._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium">{consent.patientName}</div>
                  <div className="text-sm text-gray-500">{consent.doctorName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium">{consent.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">{getTypeLabel(consent.consentType)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(consent.status)}`}>
                    {consent.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(consent.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    {consent.status === 'draft' && (
                      <button
                        onClick={() => handlePresentConsent(consent._id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Presentar
                      </button>
                    )}
                    {consent.status === 'pending_signature' && (
                      <button
                        onClick={() => {
                          setSelectedConsent(consent);
                          setShowSignatureModal(true);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Firmar
                      </button>
                    )}
                    {consent.status === 'signed' && (
                      <button
                        onClick={() => handleDownloadPDF(consent._id)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        PDF
                      </button>
                    )}
                    {(consent.status === 'signed' || consent.status === 'pending_signature') && (
                      <button
                        onClick={() => handleRevokeConsent(consent._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Revocar
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedConsent(consent)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Ver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Creación */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nuevo Consentimiento Informado</h2>
            <form onSubmit={handleCreateConsent}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ID del Paciente *</label>
                  <input
                    type="text"
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre del Paciente *</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tipo de Consentimiento *</label>
                  <select
                    value={formData.consentType}
                    onChange={(e) => setFormData({ ...formData, consentType: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="procedure">Procedimiento</option>
                    <option value="treatment">Tratamiento</option>
                    <option value="surgery">Cirugía</option>
                    <option value="research">Investigación</option>
                    <option value="data_sharing">Compartir Datos</option>
                    <option value="photography">Fotografía</option>
                    <option value="video_recording">Grabación de Video</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de Expiración</label>
                  <input
                    type="date"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Descripción *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="4"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Detalles del Procedimiento</label>
                <textarea
                  value={formData.procedureDetails}
                  onChange={(e) => setFormData({ ...formData, procedureDetails: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="4"
                />
              </div>

              {/* Riesgos */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Riesgos</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newRisk}
                    onChange={(e) => setNewRisk(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRisk())}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Agregar riesgo"
                  />
                  <button
                    type="button"
                    onClick={addRisk}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Agregar
                  </button>
                </div>
                <div className="space-y-1">
                  {formData.risks.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">- {risk}</span>
                      <button
                        type="button"
                        onClick={() => removeRisk(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Beneficios */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Beneficios</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Agregar beneficio"
                  />
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Agregar
                  </button>
                </div>
                <div className="space-y-1">
                  {formData.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">- {benefit}</span>
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternativas */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Alternativas</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newAlternative}
                    onChange={(e) => setNewAlternative(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAlternative())}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Agregar alternativa"
                  />
                  <button
                    type="button"
                    onClick={addAlternative}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Agregar
                  </button>
                </div>
                <div className="space-y-1">
                  {formData.alternatives.map((alternative, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm">- {alternative}</span>
                      <button
                        type="button"
                        onClick={() => removeAlternative(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Crear Consentimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Firma */}
      {showSignatureModal && selectedConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-bold mb-4">Firmar Consentimiento</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Dibuje su firma en el área de abajo:
              </p>
              <canvas
                id="signatureCanvas"
                width="600"
                height="200"
                className="border-2 border-gray-300 rounded cursor-crosshair"
                style={{ touchAction: 'none' }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={clearSignature}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Limpiar
              </button>
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  clearSignature();
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSignConsent(selectedConsent._id)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Firmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {selectedConsent && !showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Detalle del Consentimiento</h2>
            <div className="space-y-4">
              <div>
                <strong>Paciente:</strong> {selectedConsent.patientName}
              </div>
              <div>
                <strong>Doctor:</strong> {selectedConsent.doctorName}
              </div>
              <div>
                <strong>Tipo:</strong> {getTypeLabel(selectedConsent.consentType)}
              </div>
              <div>
                <strong>Estado:</strong> {selectedConsent.status}
              </div>
              <div>
                <strong>Título:</strong> {selectedConsent.title}
              </div>
              <div>
                <strong>Descripción:</strong>
                <p className="mt-1 whitespace-pre-wrap">{selectedConsent.description}</p>
              </div>
              {selectedConsent.procedureDetails && (
                <div>
                  <strong>Detalles del Procedimiento:</strong>
                  <p className="mt-1 whitespace-pre-wrap">{selectedConsent.procedureDetails}</p>
                </div>
              )}
              {selectedConsent.risks && selectedConsent.risks.length > 0 && (
                <div>
                  <strong>Riesgos:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {selectedConsent.risks.map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedConsent.benefits && selectedConsent.benefits.length > 0 && (
                <div>
                  <strong>Beneficios:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {selectedConsent.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedConsent.alternatives && selectedConsent.alternatives.length > 0 && (
                <div>
                  <strong>Alternativas:</strong>
                  <ul className="list-disc list-inside mt-1">
                    {selectedConsent.alternatives.map((alternative, index) => (
                      <li key={index}>{alternative}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedConsent.patientSignature && (
                <div>
                  <strong>Firma del Paciente:</strong>
                  <p className="mt-1">
                    {selectedConsent.patientSignature.signerName} -{' '}
                    {new Date(selectedConsent.patientSignature.signedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {selectedConsent.doctorSignature && (
                <div>
                  <strong>Firma del Doctor:</strong>
                  <p className="mt-1">
                    {selectedConsent.doctorSignature.signerName} -{' '}
                    {new Date(selectedConsent.doctorSignature.signedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedConsent(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentManagement;

