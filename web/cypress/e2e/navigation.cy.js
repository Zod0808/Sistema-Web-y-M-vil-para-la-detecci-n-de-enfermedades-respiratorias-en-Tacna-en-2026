/**
 * E2E Tests for Navigation
 */

describe('Navigation E2E Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('should navigate to dashboard', () => {
    cy.contains('Estado del Sistema').click();
    cy.url().should('include', '/dashboard');
  });

  it('should navigate to analytics', () => {
    cy.contains('Análisis').click();
    cy.url().should('include', '/analytics');
  });

  it('should navigate to heatmap', () => {
    cy.contains('Mapa').click();
    cy.url().should('include', '/heatmap');
  });

  it('should navigate back to home', () => {
    cy.contains('Inicio').click();
    cy.url().should('eq', 'http://localhost:3000/');
  });

  it('should highlight active route', () => {
    cy.contains('Análisis').click();
    cy.url().should('include', '/analytics');
    
    // Active link should have active class
    cy.contains('Análisis').parent().should('have.class', 'active');
  });
});

