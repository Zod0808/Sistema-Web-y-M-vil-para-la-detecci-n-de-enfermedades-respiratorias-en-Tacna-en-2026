import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import './Analytics.css';

const AnalyticsDashboard       = lazy(() => import('../components/AnalyticsDashboard'));
const TemporalTrends           = lazy(() => import('../components/TemporalTrends'));
const DiseaseReports           = lazy(() => import('../components/DiseaseReports'));
const EpidemiologicalHeatmap   = lazy(() => import('../components/EpidemiologicalHeatmap'));
const InteractiveHeatMap       = lazy(() => import('../components/InteractiveHeatMap'));
const AutomaticReportsDashboard = lazy(() => import('../components/AutomaticReportsDashboard'));
const ShapDashboard            = lazy(() => import('../components/ShapDashboard'));
const PatientMonitoringReport  = lazy(() => import('../components/PatientMonitoringReport'));

const ANALYTICS_TABS = [
  { id: 'dashboard',   label: '📊 Dashboard',             component: AnalyticsDashboard },
  { id: 'trends',      label: '📈 Tendencias Temporales',  component: TemporalTrends },
  { id: 'diseases',    label: '🦠 Enfermedades',           component: DiseaseReports },
  { id: 'epi-heatmap', label: '🗺️ Mapa Epidemiológico',   component: EpidemiologicalHeatmap },
  { id: 'heatmap',     label: '📍 Mapa Interactivo',       component: InteractiveHeatMap },
  { id: 'reports',     label: '📋 Reportes Automáticos',   component: AutomaticReportsDashboard },
  { id: 'monitoring',  label: '❤️ Monitoreo Wearables',    component: PatientMonitoringReport },
  { id: 'shap',        label: '🧠 Explicabilidad IA',       component: ShapDashboard },
];

function Analytics() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const tabs = useMemo(() => ANALYTICS_TABS, []);

  const ActiveComponent = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.component ?? null,
    [tabs, activeTab]
  );

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1>Centro de Análisis y Reportes</h1>
        <p>Estadísticas epidemiológicas, mapas de calor y análisis de datos médicos</p>
      </div>

      <div className="analytics-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="analytics-content">
        <Suspense fallback={<div className="tab-loading">Cargando módulo...</div>}>
          {ActiveComponent && <ActiveComponent />}
        </Suspense>
      </div>
    </div>
  );
}

export default Analytics;
