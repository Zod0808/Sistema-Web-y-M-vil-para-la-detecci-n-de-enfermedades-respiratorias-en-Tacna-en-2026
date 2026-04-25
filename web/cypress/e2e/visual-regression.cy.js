/**
 * Visual Regression Tests — Cypress Viewport & Screenshot Suite
 *
 * Strategy:
 * - Prueba la misma página en múltiples viewports (mobile, tablet, desktop)
 * - Captura screenshots con cy.screenshot() como línea base visual
 * - Verifica elementos clave presentes en cada viewport
 * - Detecta regresiones en layout responsive
 *
 * Para activar comparación pixel-a-pixel instalar:
 *   npm install --save-dev cypress-image-diff-js
 * y reemplazar cy.screenshot() por cy.compareSnapshot()
 */

// Viewports a probar
const VIEWPORTS = {
  mobile: { width: 375, height: 667, label: 'mobile-375' },
  mobileLarge: { width: 414, height: 896, label: 'mobile-414' },
  tablet: { width: 768, height: 1024, label: 'tablet-768' },
  laptop: { width: 1024, height: 768, label: 'laptop-1024' },
  desktop: { width: 1280, height: 720, label: 'desktop-1280' },
  desktopXL: { width: 1440, height: 900, label: 'desktop-1440' },
};

// Mock base de auth para todas las pruebas visuales
const mockAuthDoctor = () => {
  cy.window().then((win) => {
    win.localStorage.setItem('token', 'visual-test-token');
    win.localStorage.setItem('userRole', 'doctor');
    win.localStorage.setItem('userId', '507f1f77bcf86cd799439001');
  });

  cy.intercept('GET', '**/api/v1/auth/profile', {
    statusCode: 200,
    body: {
      success: true,
      data: { _id: 'doctor-1', name: 'Dr. Visual Test', email: 'visual@respicare.com', role: 'doctor' },
    },
  }).as('getProfile');
};

// ─── Home Page — multi-viewport visual regression ─────────────────────────────

describe('Visual Regression — Home Page', () => {
  Object.values(VIEWPORTS).forEach(({ width, height, label }) => {
    it(`Home page renders correctly at ${label} (${width}x${height})`, () => {
      cy.viewport(width, height);
      cy.visit('http://localhost:3000');

      // Esperar a que el contenido esté listo
      cy.get('body').should('be.visible');

      // Verificar elementos clave presentes en todos los viewports
      cy.contains('RespiCare').should('be.visible');

      // Capturar screenshot como línea base visual
      cy.screenshot(`home-${label}`, { capture: 'viewport' });
    });
  });
});

// ─── Navbar — multi-viewport visual regression ────────────────────────────────

describe('Visual Regression — Navbar Component', () => {
  const navViewports = [
    VIEWPORTS.mobile,
    VIEWPORTS.tablet,
    VIEWPORTS.desktop,
  ];

  navViewports.forEach(({ width, height, label }) => {
    it(`Navbar renders correctly at ${label}`, () => {
      cy.viewport(width, height);
      cy.visit('http://localhost:3000');

      // Navbar debe ser visible en todos los viewports
      cy.get('nav[role="navigation"]').should('be.visible');
      cy.contains('RespiCare').should('be.visible');

      // Screenshot del componente navbar
      cy.get('nav').screenshot(`navbar-${label}`);
    });
  });

  it('Navbar active link changes visually on route change', () => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000');

    // Home activo
    cy.get('.nav-link.active').should('exist');
    cy.screenshot('navbar-active-home');

    // Navegar a analytics
    cy.contains('Análisis').click();
    cy.url().should('include', '/analytics');
    cy.get('.nav-link.active').should('have.attr', 'href', '/analytics');
    cy.screenshot('navbar-active-analytics');
  });
});

// ─── Dashboard — multi-viewport visual regression ─────────────────────────────

describe('Visual Regression — Dashboard Page', () => {
  beforeEach(() => {
    mockAuthDoctor();

    cy.intercept('GET', '**/health*', {
      statusCode: 200,
      body: { status: 'ok', version: '1.0.0' },
    }).as('healthCheck');
  });

  it('Dashboard renders at desktop (1280px)', () => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000/dashboard');
    cy.contains(/estado del sistema/i).should('be.visible');
    cy.screenshot('dashboard-desktop');
  });

  it('Dashboard renders at tablet (768px)', () => {
    cy.viewport(VIEWPORTS.tablet.width, VIEWPORTS.tablet.height);
    cy.visit('http://localhost:3000/dashboard');
    cy.contains(/estado del sistema/i).should('be.visible');
    cy.screenshot('dashboard-tablet');
  });

  it('Dashboard renders at mobile (375px)', () => {
    cy.viewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
    cy.visit('http://localhost:3000/dashboard');
    cy.contains(/estado del sistema/i).should('be.visible');
    cy.screenshot('dashboard-mobile');
  });

  it('Dashboard shows loading state initially', () => {
    cy.intercept('GET', '**/health*', {
      statusCode: 200,
      body: { status: 'ok' },
      delay: 500,
    }).as('slowHealth');

    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000/dashboard');

    // Loading indicator should be visible before data loads
    cy.get('.spinner, .loading, [class*="loading"]').should('exist');
    cy.screenshot('dashboard-loading-state');
  });
});

// ─── Analytics — multi-viewport visual regression ────────────────────────────

describe('Visual Regression — Analytics Page', () => {
  beforeEach(() => {
    mockAuthDoctor();

    cy.intercept('GET', '**/api/v1/analytics*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          overview: { totalPatients: 1250, totalDoctors: 45, totalHistories: 3420 },
          diseaseDistribution: [
            { name: 'Bronquitis', value: 420 },
            { name: 'Asma', value: 310 },
          ],
        },
      },
    }).as('getAnalytics');
  });

  it('Analytics page renders at desktop', () => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000/analytics');
    cy.get('body').should('be.visible');
    cy.screenshot('analytics-desktop');
  });

  it('Analytics page renders at tablet', () => {
    cy.viewport(VIEWPORTS.tablet.width, VIEWPORTS.tablet.height);
    cy.visit('http://localhost:3000/analytics');
    cy.get('body').should('be.visible');
    cy.screenshot('analytics-tablet');
  });

  it('Analytics page renders at mobile', () => {
    cy.viewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
    cy.visit('http://localhost:3000/analytics');
    cy.get('body').should('be.visible');
    cy.screenshot('analytics-mobile');
  });
});

// ─── Theme — visual regression dark vs light mode ────────────────────────────

describe('Visual Regression — Theme Dark/Light Mode', () => {
  it('should capture light mode screenshot', () => {
    cy.visit('http://localhost:3000');
    cy.window().then((win) => {
      win.localStorage.setItem('theme-mode', 'light');
    });
    cy.reload();
    cy.get('body').should('have.class', 'theme-light');
    cy.screenshot('theme-light-mode');
  });

  it('should capture dark mode screenshot after toggle', () => {
    cy.visit('http://localhost:3000');

    // Click theme toggle if present
    cy.get('.theme-toggle, button[aria-label*="tema"], button[aria-label*="dark"]').then(
      ($btn) => {
        if ($btn.length > 0) {
          cy.wrap($btn.first()).click();
          cy.get('body').should('have.class', 'theme-dark');
          cy.screenshot('theme-dark-mode');
        }
      }
    );
  });

  it('should capture screenshot with dark class on body', () => {
    cy.visit('http://localhost:3000');
    cy.window().then((win) => {
      win.localStorage.setItem('theme-mode', 'dark');
    });
    cy.reload();
    cy.screenshot('theme-dark-body-class');
  });
});

// ─── Chatbot — visual regression del estado inicial ──────────────────────────

describe('Visual Regression — ChatBot Visual States', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/chat-conversations*', {
      statusCode: 200,
      body: { success: true, data: { sessionId: 'visual-session-001' } },
    }).as('initSession');
  });

  it('should capture chatbot initial state at desktop', () => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000');
    cy.contains('RespiCare').should('be.visible');
    cy.screenshot('chatbot-initial-desktop');
  });

  it('should capture chatbot initial state at mobile', () => {
    cy.viewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
    cy.visit('http://localhost:3000');
    cy.screenshot('chatbot-initial-mobile');
  });

  it('should capture chatbot with user message', () => {
    cy.intercept('POST', '**/api/v1/analyze*', {
      statusCode: 200,
      body: { message: 'Entiendo que tienes tos. ¿Cuánto tiempo llevas con este síntoma?' },
    }).as('chatResponse');

    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000');

    cy.get('input[placeholder*="mensaje"]').type('Tengo tos y fiebre');
    cy.get('button').contains(/enviar/i).click();

    cy.contains('Tengo tos y fiebre').should('be.visible');
    cy.screenshot('chatbot-with-user-message');
  });
});

// ─── Symptom Report Form — visual regression ─────────────────────────────────

describe('Visual Regression — Symptom Report Form', () => {
  it('should capture empty form at desktop', () => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000');

    cy.contains(/reportar/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn.first()).click();
        cy.screenshot('symptom-form-empty-desktop');
      }
    });
  });

  it('should capture form with selected symptoms', () => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000');

    cy.contains(/reportar/i).then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn.first()).click();

        // Select first checkbox
        cy.get('input[type="checkbox"]').first().check();
        cy.screenshot('symptom-form-with-selection');
      }
    });
  });

  it('should capture form at mobile viewport', () => {
    cy.viewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
    cy.visit('http://localhost:3000');
    cy.screenshot('symptom-form-mobile');
  });
});

// ─── Heatmap — visual regression del mapa ────────────────────────────────────

describe('Visual Regression — Heatmap Page', () => {
  beforeEach(() => {
    // Mock leaflet map tiles
    cy.intercept('GET', '**/tile.openstreetmap.org/**', {
      statusCode: 200,
      fixture: 'map-tile.png',
    }).as('mapTile');
  });

  it('should capture heatmap page at desktop', () => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000/heatmap');
    cy.get('body').should('be.visible');
    cy.screenshot('heatmap-desktop');
  });

  it('should capture heatmap page at mobile', () => {
    cy.viewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);
    cy.visit('http://localhost:3000/heatmap');
    cy.screenshot('heatmap-mobile');
  });
});

// ─── Error states — visual regression de errores ─────────────────────────────

describe('Visual Regression — Error States', () => {
  it('should capture 404 not found page', () => {
    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000/non-existent-page-xyz', { failOnStatusCode: false });
    cy.screenshot('error-404-page');
  });

  it('should capture error state when API is down', () => {
    cy.intercept('GET', '**/health*', {
      statusCode: 503,
      body: { status: 'error', message: 'Service unavailable' },
    }).as('healthError');

    cy.viewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
    cy.visit('http://localhost:3000/dashboard');

    cy.screenshot('error-service-down');
  });
});