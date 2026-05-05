import React from 'react';
import ReferralManagement from '../components/ReferralManagement';
import './clinical.css';

const ReferralsPage = () => (
  <div className="clinical-page">
    <div className="clinical-page-header">
      <h1>🔗 Gestión de Referidos</h1>
    </div>
    <ReferralManagement />
  </div>
);

export default ReferralsPage;