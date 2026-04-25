import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { initAccessibility } from './utils/accessibility';
import './App.css';

const Navbar = lazy(() => import('./components/Navbar'));
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const HeatMapPage = lazy(() => import('./pages/HeatMapPage'));
const FhirPage = lazy(() => import('./pages/FhirPage'));
const Hl7Page = lazy(() => import('./pages/Hl7Page'));

const AppFallback = () => (
  <div className="app-loading">
    <div className="app-loading__spinner" />
    <p>Cargando interfaz…</p>
  </div>
);

function App() {
  useEffect(() => {
    // Inicializar mejoras de accesibilidad
    initAccessibility();
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<AppFallback />}>
          <div className="App">
            <Navbar />
            <main role="main" id="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/heatmap" element={<HeatMapPage />} />
                <Route path="/fhir" element={<FhirPage />} />
                <Route path="/hl7" element={<Hl7Page />} />
              </Routes>
            </main>
          </div>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;
