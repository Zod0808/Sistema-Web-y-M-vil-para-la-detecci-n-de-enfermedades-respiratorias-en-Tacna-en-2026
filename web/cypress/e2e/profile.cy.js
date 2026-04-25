/**
 * E2E Tests for User Profile Management UI
 * Covers: view profile, update info, change password, account settings
 */

describe('User Profile Management E2E Tests', () => {
  const mockToken = 'mock-jwt-token';
  const mockUserId = '507f1f77bcf86cd799439011';

  const mockUser = {
    _id: mockUserId,
    name: 'Juan Pérez',
    email: 'juan.perez@example.com',
    phone: '+51987654321',
    role: 'patient',
    isActive: true,
    createdAt: '2025-01-15T10:00:00.000Z',
    avatar: null,
  };

  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('token', mockToken);
      win.localStorage.setItem('userRole', 'patient');
      win.localStorage.setItem('userId', mockUserId);
    });

    cy.intercept('GET', '**/api/v1/auth/profile', {
      statusCode: 200,
      body: { success: true, data: mockUser },
    }).as('getProfile');
  });

  // ─── Ver Perfil ─────────────────────────────────────────────────────────────

  describe('Ver Perfil de Usuario', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/profile');
    });

    it('should display user profile information', () => {
      cy.wait('@getProfile');
      cy.contains('Juan Pérez').should('be.visible');
      cy.contains('juan.perez@example.com').should('be.visible');
    });

    it('should display user role badge', () => {
      cy.wait('@getProfile');
      cy.contains(/paciente|patient/i).should('be.visible');
    });

    it('should display phone number', () => {
      cy.wait('@getProfile');
      cy.contains('+51987654321').should('be.visible');
    });

    it('should display account creation date', () => {
      cy.wait('@getProfile');
      cy.contains(/miembro desde|member since|2025/i).should('be.visible');
    });

    it('should display edit button', () => {
      cy.wait('@getProfile');
      cy.contains(/editar perfil|editar/i).should('be.visible');
    });
  });

  // ─── Editar Perfil ──────────────────────────────────────────────────────────

  describe('Editar Información del Perfil', () => {
    it('should update name successfully', () => {
      cy.intercept('PUT', '**/api/v1/auth/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: { ...mockUser, name: 'Juan Carlos Pérez' },
        },
      }).as('updateProfile');

      cy.visit('http://localhost:3000/profile');
      cy.wait('@getProfile');

      cy.contains(/editar perfil|editar/i).click();
      cy.get('input[name="name"]').clear().type('Juan Carlos Pérez');
      cy.contains(/guardar|actualizar/i).click();

      cy.wait('@updateProfile');
      cy.contains(/actualizado correctamente|perfil actualizado/i).should('be.visible');
      cy.contains('Juan Carlos Pérez').should('be.visible');
    });

    it('should update phone number', () => {
      cy.intercept('PUT', '**/api/v1/auth/profile', {
        statusCode: 200,
        body: {
          success: true,
          data: { ...mockUser, phone: '+51999888777' },
        },
      }).as('updatePhone');

      cy.visit('http://localhost:3000/profile');
      cy.wait('@getProfile');

      cy.contains(/editar perfil/i).click();
      cy.get('input[name="phone"]').clear().type('+51999888777');
      cy.contains(/guardar/i).click();

      cy.wait('@updatePhone');
      cy.contains(/actualizado/i).should('be.visible');
    });

    it('should validate name cannot be empty', () => {
      cy.visit('http://localhost:3000/profile');
      cy.wait('@getProfile');

      cy.contains(/editar/i).click();
      cy.get('input[name="name"]').clear();
      cy.contains(/guardar/i).click();

      cy.contains(/requerido|obligatorio/i).should('be.visible');
    });

    it('should cancel edit without saving', () => {
      cy.visit('http://localhost:3000/profile');
      cy.wait('@getProfile');

      cy.contains(/editar/i).click();
      cy.get('input[name="name"]').clear().type('Nombre temporal');
      cy.contains(/cancelar/i).click();

      cy.contains('Juan Pérez').should('be.visible');
      cy.contains('Nombre temporal').should('not.exist');
    });
  });

  // ─── Cambiar Contraseña ──────────────────────────────────────────────────────

  describe('Cambio de Contraseña', () => {
    it('should change password successfully', () => {
      cy.intercept('PUT', '**/api/v1/auth/change-password', {
        statusCode: 200,
        body: { success: true, message: 'Contraseña actualizada correctamente' },
      }).as('changePassword');

      cy.visit('http://localhost:3000/profile/security');
      cy.wait('@getProfile');

      cy.get('input[name="currentPassword"]').type('Password123!');
      cy.get('input[name="newPassword"]').type('NewPassword456!');
      cy.get('input[name="confirmPassword"]').type('NewPassword456!');
      cy.contains(/cambiar contraseña/i).click();

      cy.wait('@changePassword');
      cy.contains(/contraseña actualizada/i).should('be.visible');
    });

    it('should show error when current password is incorrect', () => {
      cy.intercept('PUT', '**/api/v1/auth/change-password', {
        statusCode: 401,
        body: { success: false, message: 'Contraseña actual incorrecta' },
      }).as('wrongPassword');

      cy.visit('http://localhost:3000/profile/security');
      cy.wait('@getProfile');

      cy.get('input[name="currentPassword"]').type('WrongPassword!');
      cy.get('input[name="newPassword"]').type('NewPassword456!');
      cy.get('input[name="confirmPassword"]').type('NewPassword456!');
      cy.contains(/cambiar contraseña/i).click();

      cy.wait('@wrongPassword');
      cy.contains(/contraseña actual incorrecta/i).should('be.visible');
    });

    it('should validate new passwords match', () => {
      cy.visit('http://localhost:3000/profile/security');
      cy.wait('@getProfile');

      cy.get('input[name="currentPassword"]').type('Password123!');
      cy.get('input[name="newPassword"]').type('NewPassword456!');
      cy.get('input[name="confirmPassword"]').type('DifferentPassword!');
      cy.contains(/cambiar contraseña/i).click();

      cy.contains(/las contraseñas no coinciden/i).should('be.visible');
    });

    it('should enforce password strength requirements', () => {
      cy.visit('http://localhost:3000/profile/security');
      cy.wait('@getProfile');

      cy.get('input[name="newPassword"]').type('weak');
      cy.contains(/cambiar contraseña/i).click();

      cy.contains(/contraseña debe tener|mínimo 8/i).should('be.visible');
    });
  });

  // ─── Configuración de Notificaciones ────────────────────────────────────────

  describe('Configuración de Notificaciones', () => {
    it('should display notification preferences', () => {
      cy.visit('http://localhost:3000/profile/notifications');
      cy.wait('@getProfile');

      cy.contains(/notificaciones/i).should('be.visible');
    });

    it('should toggle SMS notifications', () => {
      cy.intercept('PUT', '**/api/v1/auth/profile', {
        statusCode: 200,
        body: { success: true, data: mockUser },
      }).as('updateNotifSettings');

      cy.visit('http://localhost:3000/profile/notifications');
      cy.wait('@getProfile');

      cy.get('input[type="checkbox"][name*="sms"]').then(($checkbox) => {
        const wasChecked = $checkbox.is(':checked');
        cy.wrap($checkbox).click();
        cy.wait('@updateNotifSettings');
        cy.wrap($checkbox).should(wasChecked ? 'not.be.checked' : 'be.checked');
      });
    });
  });

  // ─── Eliminación de Cuenta (DSR) ────────────────────────────────────────────

  describe('Solicitud de Eliminación de Datos (GDPR/DSR)', () => {
    it('should display data deletion option in settings', () => {
      cy.visit('http://localhost:3000/profile/privacy');
      cy.wait('@getProfile');

      cy.contains(/privacidad|datos personales/i).should('be.visible');
      cy.contains(/eliminar mis datos|solicitar eliminación/i).should('exist');
    });

    it('should require confirmation before data deletion request', () => {
      cy.visit('http://localhost:3000/profile/privacy');
      cy.wait('@getProfile');

      cy.contains(/eliminar mis datos/i).click();
      cy.contains(/confirmar|está seguro/i).should('be.visible');
    });
  });
});