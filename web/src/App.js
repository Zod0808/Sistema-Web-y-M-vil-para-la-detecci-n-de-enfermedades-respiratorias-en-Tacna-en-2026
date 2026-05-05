import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { initAccessibility } from './utils/accessibility';
import './App.css';

const Navbar = lazy(() => import('./components/Navbar'));
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const HeatMapPage = lazy(() => import('./pages/HeatMapPage'));
const FhirPage = lazy(() => import('./pages/FhirPage'));
const Hl7Page = lazy(() => import('./pages/Hl7Page'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ConsentsPage = lazy(() => import('./pages/ConsentsPage'));
const ReferralsPage = lazy(() => import('./pages/ReferralsPage'));
const MedicalHistoryPage = lazy(() => import('./pages/MedicalHistoryPage'));
const PrescriptionsPage = lazy(() => import('./pages/PrescriptionsPage'));
const EmergencyPage = lazy(() => import('./pages/EmergencyPage'));
const LabResultsPage = lazy(() => import('./pages/LabResultsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

const AppFallback = () => (
  <div className="app-loading">
    <div className="app-loading__spinner" />
    <p>Cargando interfaz…</p>
  </div>
);

function App() {
  useEffect(() => {
    initAccessibility();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<AppFallback />}>
            <div className="App">
              <Navbar />
              <main role="main" id="main-content">
                <Routes>
                  {/* Rutas públicas */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  {/* Rutas protegidas — requieren autenticación */}
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                  <Route path="/heatmap" element={<ProtectedRoute><HeatMapPage /></ProtectedRoute>} />
                  <Route path="/fhir" element={<ProtectedRoute><FhirPage /></ProtectedRoute>} />
                  <Route path="/hl7" element={<ProtectedRoute><Hl7Page /></ProtectedRoute>} />

                  {/* Gestión clínica */}
                  <Route path="/medical-history" element={<ProtectedRoute><MedicalHistoryPage /></ProtectedRoute>} />
                  <Route path="/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
                  <Route path="/prescriptions" element={<ProtectedRoute><PrescriptionsPage /></ProtectedRoute>} />
                  <Route path="/emergency" element={<ProtectedRoute><EmergencyPage /></ProtectedRoute>} />
                  <Route path="/lab-results" element={<ProtectedRoute><LabResultsPage /></ProtectedRoute>} />
                  <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
                  <Route path="/consents" element={<ProtectedRoute><ConsentsPage /></ProtectedRoute>} />
                  <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />

                  {/* Solo administradores */}
                  <Route
                    path="/admin"
                    element={<ProtectedRoute roles={['admin']}><AdminPage /></ProtectedRoute>}
                  />
                </Routes>
              </main>
            </div>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;