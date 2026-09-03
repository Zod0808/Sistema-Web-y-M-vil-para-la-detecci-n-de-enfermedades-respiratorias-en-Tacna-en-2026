/**
 * Educational Content Management Component
 * Módulo educativo (RF-011, CU-007: Consultar información educativa)
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BACKEND_BASE_URL as API_URL } from '../utils/apiBase';
import { useAuth } from '../contexts/AuthContext';

const CATEGORY_LABELS = {
  asma: 'Asma',
  epoc: 'EPOC',
  covid19: 'COVID-19',
  influenza: 'Influenza',
  neumonia: 'Neumonía',
  prevencion: 'Prevención',
  general: 'General',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

const getAuthToken = () => localStorage.getItem('auth_token');

const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const EMPTY_FORM = {
  title: '',
  summary: '',
  content: '',
  category: 'general',
  targetConditions: '',
  tags: '',
};

const EducationalContentManagement = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'doctor' || user?.role === 'admin';

  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [manageMode, setManageMode] = useState(false);
  const [manageContent, setManageContent] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadPersonalizedContent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/educational-content');
      setContent(response.data.data || []);
    } catch (error) {
      console.error('Error loading educational content:', error);
      alert('Error al cargar el contenido educativo');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadManageContent = useCallback(async () => {
    try {
      const response = await apiClient.get('/educational-content/manage');
      setManageContent(response.data.data || []);
    } catch (error) {
      console.error('Error loading content management list:', error);
    }
  }, []);

  useEffect(() => {
    loadPersonalizedContent();
  }, [loadPersonalizedContent]);

  useEffect(() => {
    if (isStaff && manageMode) {
      loadManageContent();
    }
  }, [isStaff, manageMode, loadManageContent]);

  const handleViewDetail = async (item) => {
    try {
      const response = await apiClient.get(`/educational-content/${item._id}`);
      setSelected(response.data.data);
    } catch (error) {
      console.error('Error loading content detail:', error);
      alert('Error al cargar el contenido');
    }
  };

  const handleCreateContent = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.summary.trim() || !formData.content.trim()) {
      alert('Título, resumen y contenido son obligatorios');
      return;
    }

    try {
      await apiClient.post('/educational-content', {
        ...formData,
        targetConditions: formData.targetConditions
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        tags: formData.tags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      });
      alert('Contenido educativo creado exitosamente');
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
      loadManageContent();
      loadPersonalizedContent();
    } catch (error) {
      console.error('Error creating educational content:', error);
      alert(error.response?.data?.message || 'Error al crear el contenido');
    }
  };

  const handleDeleteContent = async (id) => {
    if (!window.confirm('¿Eliminar este contenido educativo?')) return;

    try {
      await apiClient.delete(`/educational-content/${id}`);
      loadManageContent();
      loadPersonalizedContent();
    } catch (error) {
      console.error('Error deleting educational content:', error);
      alert(error.response?.data?.message || 'Error al eliminar el contenido');
    }
  };

  if (loading && content.length === 0) {
    return <div className="p-4">Cargando contenido educativo...</div>;
  }

  const listToRender = manageMode ? manageContent : content;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contenido Educativo</h1>
        {isStaff && (
          <div className="flex gap-2">
            <button
              onClick={() => setManageMode((prev) => !prev)}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              {manageMode ? 'Ver contenido personalizado' : 'Administrar contenido'}
            </button>
            {manageMode && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                + Nuevo Artículo
              </button>
            )}
          </div>
        )}
      </div>

      {!manageMode && listToRender.length === 0 && (
        <div className="bg-white p-4 rounded-lg shadow text-gray-500">
          No hay contenido educativo disponible por el momento.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listToRender.map((item) => (
          <div key={item._id} className="bg-white p-4 rounded-lg shadow flex flex-col">
            <span className="text-xs uppercase text-blue-600 font-semibold mb-1">
              {CATEGORY_LABELS[item.category] || item.category}
            </span>
            <h3 className="font-bold mb-1">{item.title}</h3>
            <p className="text-sm text-gray-600 flex-1">{item.summary}</p>
            <div className="mt-3 flex justify-between items-center">
              <button
                onClick={() => handleViewDetail(item)}
                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                Leer más
              </button>
              {manageMode && (
                <button
                  onClick={() => handleDeleteContent(item._id)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Detalle */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <span className="text-xs uppercase text-blue-600 font-semibold">
              {CATEGORY_LABELS[selected.category] || selected.category}
            </span>
            <h2 className="text-xl font-bold mb-4">{selected.title}</h2>
            <p className="whitespace-pre-line">{selected.content}</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Creación (solo médico/admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nuevo Artículo Educativo</h2>
            <form onSubmit={handleCreateContent}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Categoría *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Condiciones objetivo (separadas por coma)
                  </label>
                  <input
                    type="text"
                    value={formData.targetConditions}
                    onChange={(e) => setFormData({ ...formData, targetConditions: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="asma, tos crónica"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Resumen *</label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Contenido *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows="6"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData(EMPTY_FORM);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Crear Artículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationalContentManagement;
