import React, { Suspense, lazy } from 'react';
import './HeatMapPage.css';

const InteractiveHeatMap = lazy(() => import('../components/InteractiveHeatMap'));

function HeatMapPage() {
  return (
    <div className="heatmap-page">
      <Suspense fallback={<div className="heatmap-loading">Cargando mapa epidemiológico…</div>}>
        <InteractiveHeatMap />
      </Suspense>
    </div>
  );
}

export default HeatMapPage;
