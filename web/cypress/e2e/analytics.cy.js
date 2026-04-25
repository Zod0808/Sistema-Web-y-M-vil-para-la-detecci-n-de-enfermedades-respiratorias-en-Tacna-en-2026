/**
 * E2E Tests for Analytics Dashboard
 */

describe('Analytics E2E Tests', () => {
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
          role: 'admin'
        }
      }
    }).as('getProfile');

    cy.visit('http://localhost:3000/analytics');
  });

  it('should display analytics dashboard', () => {
    cy.intercept('GET', '**/api/v1/analytics/overview', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          totalReports: 100,
          totalPatients: 50,
          totalDoctors: 10
        }
      }
    }).as('getAnalytics');

    cy.wait('@getAnalytics');
    cy.contains(/análisis/i).should('be.visible');
  });

  it('should display charts and graphs', () => {
    cy.intercept('GET', '**/api/v1/analytics/trends', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          trends: [
            { date: '2024-01-01', value: 10 },
            { date: '2024-01-02', value: 15 },
            { date: '2024-01-03', value: 12 }
          ]
        }
      }
    }).as('getTrends');

    cy.wait('@getTrends');
    // Check for chart container (adjust selector based on your chart library)
    cy.get('[data-testid="chart-container"]').should('exist');
  });

  it('should filter data by date range', () => {
    cy.get('input[type="date"]').first().type('2024-01-01');
    cy.get('input[type="date"]').last().type('2024-01-31');
    cy.get('button').contains(/aplicar/i).click();

    cy.intercept('GET', '**/api/v1/analytics/trends?startDate=2024-01-01&endDate=2024-01-31', {
      statusCode: 200,
      body: {
        success: true,
        data: { trends: [] }
      }
    }).as('getFilteredTrends');

    cy.wait('@getFilteredTrends');
  });

  it('should export analytics data', () => {
    cy.intercept('GET', '**/api/v1/analytics/export?format=csv', {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv'
      },
      body: 'date,value\n2024-01-01,10\n2024-01-02,15'
    }).as('exportData');

    cy.contains(/exportar/i).click();
    cy.wait('@exportData');
  });

  it('should display disease distribution', () => {
    cy.intercept('GET', '**/api/v1/analytics/diseases', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          distribution: [
            { disease: 'Bronquitis', count: 30 },
            { disease: 'Asma', count: 20 },
            { disease: 'Gripe', count: 15 }
          ]
        }
      }
    }).as('getDiseases');

    cy.contains(/distribución/i).click();
    cy.wait('@getDiseases');
    cy.contains(/bronquitis/i).should('be.visible');
  });
});

