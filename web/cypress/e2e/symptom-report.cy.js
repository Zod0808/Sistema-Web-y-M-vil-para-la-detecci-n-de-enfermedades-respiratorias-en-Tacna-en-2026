/**
 * E2E Tests for Symptom Report Form
 */

describe('Symptom Report Form E2E Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('should open symptom report form', () => {
    // Find and click the button to open the form
    cy.contains(/reportar/i).click();
    
    cy.contains(/reportar síntomas/i).should('be.visible');
  });

  it('should fill and submit symptom report', () => {
    cy.intercept('POST', '**/api/v1/symptom-reports', {
      statusCode: 201,
      body: {
        success: true,
        message: 'Reporte enviado exitosamente'
      }
    }).as('submitReport');

    // Open form
    cy.contains(/reportar/i).click();
    
    // Fill form
    cy.get('select').select('Centro de Tacna');
    cy.get('input[type="text"]').first().type('Av. Principal 123');
    cy.get('input[type="checkbox"]').first().check();
    
    // Submit
    cy.contains(/enviar reporte/i).click();
    
    cy.wait('@submitReport');
    cy.contains(/exitosamente/i).should('be.visible');
  });

  it('should validate required fields', () => {
    cy.contains(/reportar/i).click();
    
    // Try to submit without filling required fields
    cy.contains(/enviar reporte/i).click();
    
    // Should show validation error
    cy.contains(/por favor/i).should('be.visible');
  });
});

