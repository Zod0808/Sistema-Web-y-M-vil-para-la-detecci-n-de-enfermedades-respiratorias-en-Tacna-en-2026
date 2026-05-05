import React from 'react';
import ConsentManagement from '../components/ConsentManagement';
import './clinical.css';

const ConsentsPage = () => (
  <div className="clinical-page">
    <div className="clinical-page-header">
      <h1>📝 Consentimientos Informados</h1>
    </div>
    <ConsentManagement />
  </div>
);

export default ConsentsPage;