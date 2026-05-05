import React from 'react';
import AlertConsole from '../components/AlertConsole';
import './clinical.css';

const AlertsPage = () => (
  <div className="clinical-page">
    <div className="clinical-page-header">
      <h1>🔔 Consola de Alertas</h1>
    </div>
    <AlertConsole />
  </div>
);

export default AlertsPage;