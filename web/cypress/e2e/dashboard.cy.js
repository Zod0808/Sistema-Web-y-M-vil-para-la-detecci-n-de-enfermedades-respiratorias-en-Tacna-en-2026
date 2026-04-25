/**
 * E2E Tests for Dashboard
 */

describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    // Mock authentication
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'mock-jwt-token');
    });

    cy.intercept('GET', '**/api/v1/auth/profile', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          _id: '123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'patient'
        }
      }
    }).as('getProfile');

    cy.visit('http://localhost:3000/dashboard');
  });

  it('should display dashboard overview', () => {
    cy.intercept('GET', '**/api/v1/dashboard/patient', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          overview: {
            totalHistories: 5,
            recentAnalyses: 3,
            upcomingAppointments: 2
          }
        }
      }
    }).as('getDashboard');

    cy.wait('@getDashboard');
    cy.contains(/resumen/i).should('be.visible');
  });

  it('should display statistics cards', () => {
    cy.intercept('GET', '**/api/v1/dashboard/patient', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          overview: {
            totalHistories: 5,
            recentAnalyses: 3,
            upcomingAppointments: 2
          }
        }
      }
    }).as('getDashboard');

    cy.wait('@getDashboard');
    cy.contains(/historias médicas/i).should('be.visible');
    cy.contains(/análisis/i).should('be.visible');
    cy.contains(/citas/i).should('be.visible');
  });

  it('should navigate to medical histories', () => {
    cy.contains(/historias médicas/i).click();
    cy.url().should('include', '/medical-histories');
  });

  it('should navigate to analytics', () => {
    cy.contains(/análisis/i).click();
    cy.url().should('include', '/analytics');
  });

  it('should display recent activities', () => {
    cy.intercept('GET', '**/api/v1/dashboard/patient', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          recentActivities: [
            { type: 'analysis', date: '2024-01-01', description: 'Análisis de síntomas' },
            { type: 'appointment', date: '2024-01-02', description: 'Cita médica' }
          ]
        }
      }
    }).as('getDashboard');

    cy.wait('@getDashboard');
    cy.contains(/actividades recientes/i).should('be.visible');
  });
});

