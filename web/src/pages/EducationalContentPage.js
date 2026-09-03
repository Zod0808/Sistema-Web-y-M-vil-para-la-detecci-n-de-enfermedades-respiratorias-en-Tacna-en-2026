import React from 'react';
import EducationalContentManagement from '../components/EducationalContentManagement';
import './clinical.css';

const EducationalContentPage = () => (
  <div className="clinical-page">
    <div className="clinical-page-header">
      <h1>📚 Contenido Educativo</h1>
    </div>
    <EducationalContentManagement />
  </div>
);

export default EducationalContentPage;
