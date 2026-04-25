import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { initCSPEnforcement } from './utils/cspEnforcer';

// Inicializar enforcement de CSP
initCSPEnforcement();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

serviceWorkerRegistration.register({
  onUpdate: registration => {
    if (window.confirm('Hay una nueva versión disponible. ¿Deseas actualizar ahora?')) {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }
});
