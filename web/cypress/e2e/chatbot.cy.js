/**
 * E2E Tests for ChatBot
 */

describe('ChatBot E2E Tests', () => {
  beforeEach(() => {
    // Visit the home page
    cy.visit('http://localhost:3000');
  });

  it('should display chatbot on home page', () => {
    cy.contains('RespiCare').should('be.visible');
    cy.contains(/Hola!/i).should('be.visible');
  });

  it('should allow user to send a message', () => {
    cy.get('input[placeholder*="mensaje"]').type('Tengo tos');
    cy.get('button').contains(/enviar/i).click();
    
    // Should display user message
    cy.contains('Tengo tos').should('be.visible');
  });

  it('should receive bot response', () => {
    // Mock API response
    cy.intercept('POST', '**/api/v1/analyze', {
      statusCode: 200,
      body: {
        message: 'Entiendo que tienes tos. ¿Cuánto tiempo llevas con este síntoma?'
      }
    }).as('chatResponse');

    cy.get('input[placeholder*="mensaje"]').type('Tengo tos');
    cy.get('button').contains(/enviar/i).click();
    
    cy.wait('@chatResponse');
    cy.contains(/entiendo/i).should('be.visible');
  });

  it('should handle multiple messages in conversation', () => {
    cy.intercept('POST', '**/api/v1/analyze', {
      statusCode: 200,
      body: { message: 'Respuesta del bot' }
    }).as('chatResponse');

    cy.get('input[placeholder*="mensaje"]').type('Primer mensaje');
    cy.get('button').contains(/enviar/i).click();
    cy.wait('@chatResponse');

    cy.get('input[placeholder*="mensaje"]').type('Segundo mensaje');
    cy.get('button').contains(/enviar/i).click();
    cy.wait('@chatResponse');

    cy.contains('Primer mensaje').should('be.visible');
    cy.contains('Segundo mensaje').should('be.visible');
  });
});

