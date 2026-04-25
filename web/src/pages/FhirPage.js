import React, { useState, useEffect, useCallback } from 'react';
import FhirResourceViewer from '../components/FhirResourceViewer';
import './FhirPage.css';

/**
 * Página para consultar y visualizar recursos FHIR
 * Permite buscar pacientes, observaciones, reportes de diagnóstico, etc.
 */
const FhirPage = () => {
  const [resourceType, setResourceType] = useState('Patient');
  const [searchParams, setSearchParams] = useState({});
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resourceTypes = [
    'Patient',
    'Observation',
    'Condition',
    'Medication',
    'MedicationStatement',
    'DiagnosticReport',
    'Encounter',
    'AllergyIntolerance',
  ];

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      // Agregar parámetros de búsqueda
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await fetch(
        `/api/v1/fhir/${resourceType}?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al buscar recursos FHIR');
      }

      const data = await response.json();
      
      if (data.data.resourceType === 'Bundle' && data.data.entry) {
        setResources(data.data.entry.map((entry) => entry.resource));
      } else {
        setResources([data.data]);
      }
    } catch (err) {
      setError(err.message);
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [resourceType, searchParams]);

  useEffect(() => {
    // Cargar recursos al cambiar tipo
    if (resourceType) {
      handleSearch();
    }
  }, [resourceType, handleSearch]);

  const handleResourceClick = (resource) => {
    setSelectedResource(resource);
  };

  const getSearchFields = () => {
    switch (resourceType) {
      case 'Patient':
        return [
          { key: 'name', label: 'Nombre', placeholder: 'Juan Pérez' },
          { key: 'identifier', label: 'ID', placeholder: '12345678' },
          { key: 'birthdate', label: 'Fecha de Nacimiento', placeholder: '1990-01-01' },
        ];
      case 'Observation':
        return [
          { key: 'subject', label: 'Paciente', placeholder: 'Patient/123' },
          { key: 'code', label: 'Código', placeholder: 'LOINC code' },
          { key: 'date', label: 'Fecha', placeholder: '2024-01-01' },
        ];
      case 'DiagnosticReport':
        return [
          { key: 'subject', label: 'Paciente', placeholder: 'Patient/123' },
          { key: 'code', label: 'Código', placeholder: 'LOINC code' },
          { key: 'date', label: 'Fecha', placeholder: '2024-01-01' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="fhir-page">
      <div className="fhir-page-header">
        <h1>Consulta FHIR</h1>
        <p>Buscar y visualizar recursos FHIR del sistema</p>
      </div>

      <div className="fhir-page-content">
        <div className="fhir-search-panel">
          <div className="fhir-resource-type-selector">
            <label>Tipo de Recurso:</label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
            >
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="fhir-search-fields">
            {getSearchFields().map((field) => (
              <div key={field.key} className="fhir-search-field">
                <label>{field.label}:</label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={searchParams[field.key] || ''}
                  onChange={(e) =>
                    setSearchParams({
                      ...searchParams,
                      [field.key]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
          </div>

          <button className="fhir-search-btn" onClick={handleSearch} disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {error && (
          <div className="fhir-error">
            <p>Error: {error}</p>
          </div>
        )}

        <div className="fhir-results">
          {resources.length > 0 ? (
            <>
              <h3>Resultados ({resources.length})</h3>
              <div className="fhir-results-list">
                {resources.map((resource, index) => (
                  <div
                    key={resource.id || index}
                    className="fhir-resource-card"
                    onClick={() => handleResourceClick(resource)}
                  >
                    <div className="fhir-resource-card-header">
                      <strong>{resourceType}</strong>
                      <span>ID: {resource.id || 'N/A'}</span>
                    </div>
                    <div className="fhir-resource-card-content">
                      {resourceType === 'Patient' && (
                        <p>
                          {resource.name?.[0]?.given?.join(' ') || ''}{' '}
                          {resource.name?.[0]?.family || ''}
                        </p>
                      )}
                      {resourceType === 'Observation' && (
                        <p>{resource.code?.text || resource.code?.coding?.[0]?.display}</p>
                      )}
                      {resourceType === 'DiagnosticReport' && (
                        <p>{resource.code?.text || 'Reporte de Diagnóstico'}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            !loading && <p>No se encontraron recursos</p>
          )}
        </div>

        {selectedResource && (
          <div className="fhir-resource-modal">
            <div className="fhir-resource-modal-content">
              <FhirResourceViewer
                resource={selectedResource}
                resourceType={resourceType}
                onClose={() => setSelectedResource(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FhirPage;

