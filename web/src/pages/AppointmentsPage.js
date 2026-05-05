import React from 'react';
import AppointmentCalendar from '../components/AppointmentCalendar';
import { useAuth } from '../contexts/AuthContext';
import './clinical.css';

const AppointmentsPage = () => {
  const { token } = useAuth();
  return (
    <div className="clinical-page">
      <div className="clinical-page-header">
        <h1>📅 Citas Médicas</h1>
      </div>
      <AppointmentCalendar token={token} />
    </div>
  );
};

export default AppointmentsPage;