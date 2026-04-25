/**
 * E2E Tests for Authentication Flow
 */

describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('should display login form', () => {
    cy.contains(/iniciar sesión/i).should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button').contains(/iniciar/i).should('be.visible');
  });

  it('should login successfully with valid credentials', () => {
    cy.intercept('POST', '**/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: {
            _id: '123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'patient'
          }
        }
      }
    }).as('loginRequest');

    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button').contains(/iniciar/i).click();

    cy.wait('@loginRequest');
    cy.url().should('not.include', '/login');
  });

  it('should show error with invalid credentials', () => {
    cy.intercept('POST', '**/api/v1/auth/login', {
      statusCode: 401,
      body: {
        success: false,
        message: 'Credenciales inválidas'
      }
    }).as('loginError');

    cy.get('input[type="email"]').type('wrong@example.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button').contains(/iniciar/i).click();

    cy.wait('@loginError');
    cy.contains(/credenciales inválidas/i).should('be.visible');
  });

  it('should navigate to registration page', () => {
    cy.contains(/registrarse/i).click();
    cy.url().should('include', '/register');
    cy.contains(/crear cuenta/i).should('be.visible');
  });

  it('should register new user', () => {
    cy.intercept('POST', '**/api/v1/auth/register', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: {
            _id: '123',
            name: 'New User',
            email: 'newuser@example.com',
            role: 'patient'
          }
        }
      }
    }).as('registerRequest');

    cy.contains(/registrarse/i).click();
    cy.get('input[name="name"]').type('New User');
    cy.get('input[name="email"]').type('newuser@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button').contains(/registrar/i).click();

    cy.wait('@registerRequest');
    cy.url().should('not.include', '/register');
  });

  it('should logout successfully', () => {
    // First login
    cy.intercept('POST', '**/api/v1/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { _id: '123', name: 'Test User', email: 'test@example.com', role: 'patient' }
        }
      }
    }).as('loginRequest');

    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button').contains(/iniciar/i).click();
    cy.wait('@loginRequest');

    // Then logout
    cy.intercept('POST', '**/api/v1/auth/logout', {
      statusCode: 200,
      body: { success: true }
    }).as('logoutRequest');

    cy.contains(/cerrar sesión/i).click();
    cy.wait('@logoutRequest');
    cy.url().should('include', '/login');
  });
});

