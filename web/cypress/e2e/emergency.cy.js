/**
 * E2E Tests for Emergency Reporting UI
 * Covers: emergency form, alerts, hospital communication, ambulance request
 */

describe('Emergency Reporting E2E Tests', () => {
  const mockToken = 'mock-jwt-token';
  const mockPatientId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('token', mockToken);
      win.localStorage.setItem('userRole', 'patient');
      win.localStorage.setItem('userId', mockPatientId);
    });

    cy.intercept('GET', '**/api/v1/auth/profile', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          _id: mockPatientId,
          name: 'Paciente Crítico',
          email: 'patient@respicare.com',
          role: 'patient',
        },
      },
    }).as('getProfile');
  });

  // ─── Botón de Emergencia ────────────────────────────────────────────────────

  describe('Botón de Emergencia SOS', () => {
    it('should display emergency button prominently on homepage', () => {
      cy.visit('http://localhost:3000');
      cy.get('[data-testid="emergency-button"], button').contains(/emergencia|SOS/i).should('be.visible');
    });

    it('should open emergency form when SOS button clicked', () => {
      cy.visit('http://localhost:3000');
      cy.get('[data-testid="emergency-button"], button').contains(/emergencia|SOS/i).click();
      cy.contains(/reportar emergencia/i).should('be.visible');
    });

    it('should display confirmation dialog before sending emergency', () => {
      cy.intercept('POST', '**/api/v1/emergencies', {
        statusCode: 201,
        body: {
          success: true,
          data: { _id: 'emerg-001', status: 'active', patientId: mockPatientId },
        },
      }).as('createEmergency');

      cy.visit('http://localhost:3000');
      cy.get('[data-testid="emergency-button"], button').contains(/emergencia|SOS/i).click();

      // Confirm the emergency
      cy.contains(/confirmar/i).click();
      cy.wait('@createEmergency');
      cy.contains(/emergencia reportada|socorro enviado/i).should('be.visible');
    });
  });

  // ─── Formulario de Emergencia Completo ─────────────────────────────────────

  describe('Formulario de Reporte de Emergencia', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/emergency');
    });

    it('should display emergency form fields', () => {
      cy.contains(/emergencia/i).should('be.visible');
      cy.get('select[name="type"], input[name="type"]').should('exist');
      cy.get('textarea[name="description"], input[name="description"]').should('exist');
    });

    it('should submit emergency report with valid data', () => {
      cy.intercept('POST', '**/api/v1/emergencies', {
        statusCode: 201,
        body: {
          success: true,
          data: {
            _id: 'emerg-123',
            status: 'active',
            type: 'respiratory_distress',
          },
        },
      }).as('submitEmergency');

      cy.get('select[name="type"]').select('Dificultad respiratoria');
      cy.get('textarea[name="description"]').type(
        'No puedo respirar bien, tengo dolor en el pecho'
      );
      cy.get('input[name="contactPhone"]').type('+51987654321');
      cy.contains(/enviar emergencia|reportar/i).click();

      cy.wait('@submitEmergency');
      cy.contains(/emergencia reportada/i).should('be.visible');
    });

    it('should show error if required fields are missing', () => {
      cy.contains(/enviar emergencia|reportar/i).click();
      cy.contains(/obligatorio|requerido/i).should('be.visible');
    });

    it('should detect location automatically', () => {
      // Mock geolocation
      cy.window().then((win) => {
        cy.stub(win.navigator.geolocation, 'getCurrentPosition').callsFake((cb) => {
          cb({ coords: { latitude: -18.0146, longitude: -70.2536 } });
        });
      });

      cy.contains(/detectar ubicación|usar mi ubicación/i).click();
      cy.contains(/-18|Tacna/i).should('be.visible');
    });
  });

  // ─── Vista de Admin: Gestión de Emergencias ─────────────────────────────────

  describe('Panel de Administración de Emergencias', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('userRole', 'admin');
      });

      cy.intercept('GET', '**/api/v1/auth/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: { _id: 'admin-1', name: 'Admin', email: 'admin@rc.com', role: 'admin' },
        },
      }).as('getAdminProfile');

      cy.intercept('GET', '**/api/v1/emergencies*', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              _id: 'emerg-001',
              type: 'respiratory_distress',
              severity: 'critical',
              status: 'active',
              patientId: mockPatientId,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }).as('getEmergencies');

      cy.visit('http://localhost:3000/admin/emergencies');
    });

    it('should display active emergencies list', () => {
      cy.wait('@getEmergencies');
      cy.contains(/emergencias activas/i).should('be.visible');
      cy.contains(/respiratory_distress|Dificultad respiratoria/i).should('be.visible');
    });

    it('should display emergency severity badge', () => {
      cy.wait('@getEmergencies');
      cy.contains(/critical|crítica/i).should('be.visible');
    });

    it('should allow dispatching ambulance', () => {
      cy.intercept('POST', '**/api/v1/emergencies/ambulance/request', {
        statusCode: 200,
        body: {
          success: true,
          data: { ambulanceId: 'AMB-001', estimatedArrival: '15 minutos' },
        },
      }).as('requestAmbulance');

      cy.wait('@getEmergencies');
      cy.contains(/despachar ambulancia|ambulancia/i).click();
      cy.wait('@requestAmbulance');
      cy.contains(/ambulancia despachada|AMB-001/i).should('be.visible');
    });
  });

  // ─── Mapa de Emergencias ────────────────────────────────────────────────────

  describe('Mapa de Emergencias Activas', () => {
    it('should display emergency map with markers', () => {
      cy.intercept('GET', '**/api/v1/emergencies*', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              _id: 'emerg-map-1',
              location: { latitude: -18.0146, longitude: -70.2536 },
              severity: 'high',
              status: 'active',
            },
          ],
        },
      }).as('getMapEmergencies');

      cy.visit('http://localhost:3000/emergency/map');
      cy.wait('@getMapEmergencies');
      cy.get('[data-testid="emergency-map"], .leaflet-container, #map').should('exist');
    });
  });

  // ─── Historial de Emergencias del Paciente ──────────────────────────────────

  describe('Historial de Emergencias', () => {
    it('should display patient emergency history', () => {
      cy.intercept('GET', `**/api/v1/emergencies*patientId=${mockPatientId}*`, {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              _id: 'emerg-hist-1',
              type: 'respiratory_distress',
              status: 'resolved',
              createdAt: '2026-04-01T10:00:00.000Z',
              resolvedAt: '2026-04-01T11:30:00.000Z',
            },
          ],
        },
      }).as('getEmergencyHistory');

      cy.visit('http://localhost:3000/emergency/history');
      cy.wait('@getEmergencyHistory');
      cy.contains(/resuelta|resolved/i).should('be.visible');
    });
  });
});