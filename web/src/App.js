import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import ProtectedRoute from './components/ProtectedRoute';
import { initAccessibility } from './utils/accessibility';
import './App.css';

const Navbar               = lazy(() => import('./components/Navbar'));
const Home                 = lazy(() => import('./pages/Home'));
const Dashboard            = lazy(() => import('./pages/Dashboard'));
const Analytics            = lazy(() => import('./pages/Analytics'));
const HeatMapPage          = lazy(() => import('./pages/HeatMapPage'));
const FhirPage             = lazy(() => import('./pages/FhirPage'));
const Hl7Page              = lazy(() => import('./pages/Hl7Page'));
const LoginPage            = lazy(() => import('./pages/LoginPage'));
const RegisterPage         = lazy(() => import('./pages/RegisterPage'));
const AppointmentsPage     = lazy(() => import('./pages/AppointmentsPage'));
const AlertsPage           = lazy(() => import('./pages/AlertsPage'));
const ConsentsPage         = lazy(() => import('./pages/ConsentsPage'));
const ReferralsPage        = lazy(() => import('./pages/ReferralsPage'));
const MedicalHistoryPage   = lazy(() => import('./pages/MedicalHistoryPage'));
const PrescriptionsPage    = lazy(() => import('./pages/PrescriptionsPage'));
const EmergencyPage        = lazy(() => import('./pages/EmergencyPage'));
const LabResultsPage       = lazy(() => import('./pages/LabResultsPage'));
const AdminPage            = lazy(() => import('./pages/AdminPage'));
const PatientMonitoringPage = lazy(() => import('./pages/PatientMonitoringPage'));

const STAFF = ['doctor', 'admin'];

const AppFallback = () => (
  <div className="app-loading">
    <div className="app-loading__spinner" />
    <p>Cargando RespiCare…</p>
  </div>
);

function App() {
  useEffect(() => { initAccessibility(); }, []);

  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Suspense fallback={<AppFallback />}>
              <div className="App">
                <Navbar />
                <main role="main" id="main-content">
                  <Routes>
                    {/* ── Públicas ─────────────────────────────────── */}
                    <Route path="/"         element={<Home />} />
                    <Route path="/login"    element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* ── Paciente + Staff ─────────────────────────── */}
                    <Route path="/medical-history" element={<ProtectedRoute><MedicalHistoryPage /></ProtectedRoute>} />
                    <Route path="/appointments"    element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
                    <Route path="/prescriptions"   element={<ProtectedRoute><PrescriptionsPage /></ProtectedRoute>} />
                    <Route path="/lab-results"     element={<ProtectedRoute><LabResultsPage /></ProtectedRoute>} />
                    <Route path="/consents"        element={<ProtectedRoute><ConsentsPage /></ProtectedRoute>} />

                    {/* ── Solo médico / admin ───────────────────────── */}
                    <Route path="/dashboard"  element={<ProtectedRoute roles={STAFF}><Dashboard /></ProtectedRoute>} />
                    <Route path="/analytics"  element={<ProtectedRoute roles={STAFF}><Analytics /></ProtectedRoute>} />
                    <Route path="/heatmap"    element={<ProtectedRoute roles={STAFF}><HeatMapPage /></ProtectedRoute>} />
                    <Route path="/fhir"       element={<ProtectedRoute roles={STAFF}><FhirPage /></ProtectedRoute>} />
                    <Route path="/hl7"        element={<ProtectedRoute roles={STAFF}><Hl7Page /></ProtectedRoute>} />
                    <Route path="/alerts"     element={<ProtectedRoute roles={STAFF}><AlertsPage /></ProtectedRoute>} />
                    <Route path="/referrals"  element={<ProtectedRoute roles={STAFF}><ReferralsPage /></ProtectedRoute>} />
                    <Route path="/emergency"  element={<ProtectedRoute roles={STAFF}><EmergencyPage /></ProtectedRoute>} />
                    <Route path="/monitoring" element={<ProtectedRoute roles={STAFF}><PatientMonitoringPage /></ProtectedRoute>} />

                    {/* ── Solo admin ────────────────────────────────── */}
                    <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>} />

                    {/* ── Fallback ──────────────────────────────────── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </Suspense>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
