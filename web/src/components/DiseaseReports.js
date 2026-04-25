import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import VirtualizedList from './VirtualizedList';
import './DiseaseReports.css';
import { LEGACY_API_BASE } from '../utils/apiBase';

const DISTRICTS = [
  'all',
  'Centro de Tacna',
  'Gregorio Albarracín',
  'Ciudad Nueva',
  'Pocollay',
  'Alto de la Alianza',
  'Calana',
  'Pachia',
  'Boca del Río'
];

const PERIODS = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: '1y', label: 'Último año' }
];

const DISEASE_COLORS = {
  Asma: '#ff6b6b',
  Bronquitis: '#4ecdc4',
  'COVID-19': '#45b7d1',
  Gripe: '#96ceb4',
  Neumonía: '#feca57',
  EPOC: '#ff9ff3',
  Resfriado: '#54a0ff',
  'Síntoma General': '#a4b0be'
};

const SEVERITY_MAP = {
  1: 'Baja',
  2: 'Moderada',
  3: 'Alta',
  4: 'Severa'
};

const getDiseaseColor = (diseaseName) =>
  DISEASE_COLORS[diseaseName] || '#a4b0be';

const formatSeverity = (severity) => {
  if (!severity && severity !== 0) {
    return 'Desconocida';
  }
  const rounded = Math.round(Number(severity));
  return SEVERITY_MAP[rounded] || 'Desconocida';
};

const mapSymptomAnalysis = (diseaseData) => {
  if (!diseaseData?.symptomAnalysis) return [];

  return diseaseData.symptomAnalysis.slice(0, 50).map((symptom) => ({
    name: symptom._id,
    count: symptom.count,
    avgSeverity: Math.round(symptom.avgSeverity * 100) / 100,
    districts: symptom.districts.length,
    categories: symptom.categories || []
  }));
};

const mapChatDiseaseData = (diseaseData) => {
  if (!diseaseData?.chatDiseaseAnalysis) return [];

  return diseaseData.chatDiseaseAnalysis.map((disease) => ({
    name: disease._id,
    count: disease.count,
    avgConfidence: Math.round(disease.avgConfidence * 100) / 100,
    avgUrgency: Math.round(disease.avgUrgency * 100) / 100
  }));
};

const mapDistrictDistributionData = (diseaseData) => {
  if (!diseaseData?.districtDistribution) return [];

  return diseaseData.districtDistribution.map((district) => ({
    name: district._id,
    totalReports: district.totalReports,
    topSymptom: district.symptoms[0]?.name || 'N/A',
    topSymptomCount: district.symptoms[0]?.count || 0
  }));
};

const mapDiseasePieData = (chatDiseaseData) => {
  if (!chatDiseaseData?.length) return [];
  const total = chatDiseaseData.reduce((sum, item) => sum + item.count, 0);

  if (!total) {
    return [];
  }

  return chatDiseaseData.map((disease) => ({
    name: disease.name,
    value: disease.count,
    percentage: Math.round((disease.count / total) * 100)
  }));
};

function DiseaseReports() {
  const [diseaseData, setDiseaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const fetchDiseaseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${LEGACY_API_BASE}/analytics/disease-reports`,
        {
          params: {
            district: selectedDistrict !== 'all' ? selectedDistrict : undefined,
            period: selectedPeriod
          }
        }
      );

      if (response.data.success) {
        setDiseaseData(response.data.data);
      } else {
        setError(
          response.data.message ||
            'Error al cargar datos de enfermedades'
        );
      }
    } catch (err) {
      console.error('Error fetching disease data:', err);
      setError(
        'No se pudieron cargar los datos de enfermedades. Verifica que el backend esté funcionando.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDistrict, selectedPeriod]);

  useEffect(() => {
    fetchDiseaseData();
  }, [fetchDiseaseData]);

  const symptomData = useMemo(
    () => mapSymptomAnalysis(diseaseData),
    [diseaseData]
  );

  const chatDiseaseData = useMemo(
    () => mapChatDiseaseData(diseaseData),
    [diseaseData]
  );

  const districtData = useMemo(
    () => mapDistrictDistributionData(diseaseData),
    [diseaseData]
  );

  const pieData = useMemo(
    () => mapDiseasePieData(chatDiseaseData),
    [chatDiseaseData]
  );

  const renderPieItem = useCallback(
    (disease) => (
      <div className="disease-item">
        <div
          className="disease-color"
          style={{ backgroundColor: getDiseaseColor(disease.name) }}
        />
        <div className="disease-info">
          <div className="disease-name">{disease.name}</div>
          <div className="disease-percentage">{disease.percentage}%</div>
        </div>
        <div className="disease-count">{disease.value} consultas</div>
      </div>
    ),
    []
  );

  const renderSymptomItem = useCallback(
    (symptom) => (
      <div className="symptom-analysis-item">
        <div className="symptom-name">{symptom.name}</div>
        <div className="symptom-details">
          <div className="symptom-count">{symptom.count} reportes</div>
          <div className="symptom-severity">
            Severidad: {symptom.avgSeverity}
          </div>
          <div className="symptom-districts">
            {symptom.districts} distritos
          </div>
        </div>
      </div>
    ),
    []
  );

  const renderDistrictItem = useCallback(
    (district) => (
      <div className="district-item">
        <div className="district-name">{district.name}</div>
        <div className="district-count">{district.totalReports} reportes</div>
        <div className="district-symptom">
          Síntoma: {district.topSymptom}
        </div>
      </div>
    ),
    []
  );

  const renderConfidenceItem = useCallback(
    (disease) => (
      <div className="confidence-item">
        <div className="disease-name">{disease.name}</div>
        <div className="confidence-details">
          <div className="confidence-value">
            Confianza: {(disease.avgConfidence * 100).toFixed(1)}%
          </div>
          <div className="urgency-value">
            Urgencia: {formatSeverity(disease.avgUrgency)}
          </div>
          <div className="consultation-count">
            {disease.count} consultas
          </div>
        </div>
      </div>
    ),
    []
  );

  if (loading) {
    return (
      <div className="disease-reports-container">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Cargando datos de enfermedades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="disease-reports-container">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchDiseaseData} className="retry-button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="disease-reports-container">
      <div className="disease-header">
        <h3>🦠 Reportes por Tipo de Enfermedad</h3>
        <p>Análisis detallado de enfermedades respiratorias detectadas</p>
      </div>

      <div className="disease-controls">
        <div className="control-group">
          <label>Distrito:</label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="control-select"
          >
            <option value="all">Todos los distritos</option>
            {DISTRICTS.slice(1).map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Período:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="control-select"
          >
            {PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>

        <button onClick={fetchDiseaseData} className="refresh-button">
          🔄 Actualizar
        </button>
      </div>

      <div className="disease-charts">
        <div className="chart-container">
          <h4>🥧 Distribución de Enfermedades (Chat)</h4>
          {pieData.length ? (
            <VirtualizedList
              items={pieData}
              itemHeight={76}
              renderItem={renderPieItem}
            />
          ) : (
            <p className="empty-state">Sin datos disponibles para el período seleccionado.</p>
          )}
        </div>

        <div className="chart-container">
          <h4>📊 Análisis de Síntomas Principales</h4>
          {symptomData.length ? (
            <VirtualizedList
              items={symptomData}
              itemHeight={88}
              renderItem={renderSymptomItem}
            />
          ) : (
            <p className="empty-state">No se registraron síntomas en este período.</p>
          )}
        </div>

        <div className="chart-container">
          <h4>🏘️ Distribución por Distrito</h4>
          {districtData.length ? (
            <VirtualizedList
              items={districtData}
              itemHeight={80}
              renderItem={renderDistrictItem}
            />
          ) : (
            <p className="empty-state">No hay registros por distrito para mostrar.</p>
          )}
        </div>

        <div className="chart-container">
          <h4>🎯 Confianza vs Urgencia (Chat)</h4>
          {chatDiseaseData.length ? (
            <VirtualizedList
              items={chatDiseaseData}
              itemHeight={92}
              renderItem={renderConfidenceItem}
            />
          ) : (
            <p className="empty-state">No hay consultas registradas en el período seleccionado.</p>
          )}
        </div>
      </div>

      <div className="disease-summary">
        <h4>📋 Resumen de Enfermedades</h4>
        <div className="summary-cards">
          {chatDiseaseData.slice(0, 6).map((disease, index) => (
            <div key={disease.name ?? index} className="disease-card">
              <div
                className="disease-color"
                style={{ backgroundColor: getDiseaseColor(disease.name) }}
              />
              <div className="disease-info">
                <h5>{disease.name}</h5>
                <p className="disease-count">{disease.count} consultas</p>
                <p className="disease-confidence">
                  Confianza: {(disease.avgConfidence * 100).toFixed(1)}%
                </p>
                <p className="disease-urgency">
                  Urgencia: {formatSeverity(disease.avgUrgency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="symptoms-table">
        <h4>🔍 Detalles de Síntomas</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Síntoma</th>
                <th>Reportes</th>
                <th>Severidad Promedio</th>
                <th>Distritos</th>
                <th>Categorías</th>
              </tr>
            </thead>
            <tbody>
              {symptomData.map((symptom, index) => (
                <tr key={symptom.name ?? index}>
                  <td className="symptom-name">{symptom.name}</td>
                  <td className="symptom-count">{symptom.count}</td>
                  <td className="symptom-severity">
                    <span
                      className={`severity-badge severity-${Math.round(
                        symptom.avgSeverity
                      )}`}
                    >
                      {formatSeverity(symptom.avgSeverity)}
                    </span>
                  </td>
                  <td className="symptom-districts">{symptom.districts}</td>
                  <td className="symptom-categories">
                    {symptom.categories.length
                      ? symptom.categories.join(', ')
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DiseaseReports;
