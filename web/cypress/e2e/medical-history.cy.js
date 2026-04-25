/**
 * E2E Tests for Medical History Management
 * Covers: create, view, update, search, and export medical histories
 */

describe('Medical History E2E Tests', () => {
  const mockToken = 'mock-jwt-token';
  const mockPatientId = '507f1f77bcf86cd799439011';
  const mockDoctorId = '507f1f77bcf86cd799439012';
  const mockHistoryId = '507f1f77bcf86cd799439013';

  const mockHistory = {
    _id: mockHistoryId,
    patientId: mockPatientId,
    patientName: 'Juan Pérez',
    age: 45,
    diagnosis: 'Bronquitis',
    symptoms: [
      { name: 'tos', severity: 'moderate', duration: '2 weeks' },
      { name: 'fiebre', severity: 'mild', duration: '3 days' },
    ],
    description: 'Paciente con síntomas respiratorios',
    date: new Date().toISOString(),
    doctorId: mockDoctorId,
    syncStatus: 'synced',
  };

  beforeEach(() => {
    // Mock authentication as doctor
    cy.window().then((win) => {
      win.localStorage.setItem('token', mockToken);
      win.localStorage.setItem('userRole', 'doctor');
      win.localStorage.setItem('userId', mockDoctorId);
    });

    cy.intercept('GET', '**/api/v1/auth/profile', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          _id: mockDoctorId,
          name: 'Dr. María González',
          email: 'doctor@respicare.com',
          role: 'doctor',
        },
      },
    }).as('getProfile');
  });

  // ─── Ver lista de historias médicas ───────────────────────────────────────

  describe('Lista de Historias Médicas', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/v1/medical-histories*', {
        statusCode: 200,
        body: {
          success: true,
          data: [mockHistory],
          pagination: { page: 1, limit: 10, total: 1, pages: 1 },
        },
      }).as('getMedicalHistories');

      cy.visit('http://localhost:3000/medical-histories');
    });

    it('should display list of medical histories', () => {
      cy.wait('@getMedicalHistories');
      cy.contains(/historias médicas/i).should('be.visible');
      cy.contains('Juan Pérez').should('be.visible');
      cy.contains('Bronquitis').should('be.visible');
    });

    it('should display patient information in each card', () => {
      cy.wait('@getMedicalHistories');
      cy.contains(/45/).should('be.visible');
    });

    it('should show loading state while fetching', () => {
      cy.intercept('GET', '**/api/v1/medical-histories*', {
        statusCode: 200,
        body: { success: true, data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
        delay: 500,
      }).as('slowFetch');

      cy.visit('http://localhost:3000/medical-histories');
      cy.get('[data-testid="loading"]').should('exist');
      cy.wait('@slowFetch');
    });

    it('should display empty state when no histories', () => {
      cy.intercept('GET', '**/api/v1/medical-histories*', {
        statusCode: 200,
        body: { success: true, data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
      }).as('emptyHistories');

      cy.visit('http://localhost:3000/medical-histories');
      cy.wait('@emptyHistories');
      cy.contains(/no hay historias/i).should('be.visible');
    });
  });

  // ─── Crear nueva historia médica ──────────────────────────────────────────

  describe('Crear Nueva Historia Médica', () => {
    beforeEach(() => {
      cy.visit('http://localhost:3000/medical-histories/new');
    });

    it('should display the create form', () => {
      cy.contains(/nueva historia médica/i).should('be.visible');
      cy.get('input[name="patientName"]').should('be.visible');
      cy.get('input[name="age"]').should('be.visible');
      cy.get('input[name="diagnosis"]').should('be.visible');
    });

    it('should create a new medical history successfully', () => {
      cy.intercept('POST', '**/api/v1/medical-histories', {
        statusCode: 201,
        body: { success: true, data: mockHistory },
      }).as('createHistory');

      cy.get('input[name="patientName"]').type('Juan Pérez');
      cy.get('input[name="age"]').type('45');
      cy.get('input[name="diagnosis"]').type('Bronquitis aguda');
      cy.get('textarea[name="description"]').type('Síntomas respiratorios persistentes');

      // Add symptom
      cy.contains(/agregar síntoma/i).click();
      cy.get('input[placeholder*="síntoma"]').type('tos');
      cy.get('select[name*="severity"]').select('moderate');

      cy.contains(/guardar/i).click();
      cy.wait('@createHistory');
      cy.url().should('include', '/medical-histories');
      cy.contains(/creada exitosamente/i).should('be.visible');
    });

    it('should validate required fields before submission', () => {
      cy.contains(/guardar/i).click();
      cy.contains(/requerido/i).should('be.visible');
    });

    it('should validate age range (0-150)', () => {
      cy.get('input[name="age"]').type('200');
      cy.contains(/guardar/i).click();
      cy.contains(/edad/i).should('be.visible');
    });
  });

  // ─── Ver detalle de historia médica ───────────────────────────────────────

  describe('Detalle de Historia Médica', () => {
    beforeEach(() => {
      cy.intercept('GET', `**/api/v1/medical-histories/${mockHistoryId}`, {
        statusCode: 200,
        body: { success: true, data: mockHistory },
      }).as('getHistory');

      cy.visit(`http://localhost:3000/medical-histories/${mockHistoryId}`);
    });

    it('should display history details', () => {
      cy.wait('@getHistory');
      cy.contains('Juan Pérez').should('be.visible');
      cy.contains('Bronquitis').should('be.visible');
    });

    it('should display symptoms list', () => {
      cy.wait('@getHistory');
      cy.contains('tos').should('be.visible');
      cy.contains('fiebre').should('be.visible');
    });

    it('should navigate back to list', () => {
      cy.wait('@getHistory');
      cy.contains(/volver/i).click();
      cy.url().should('include', '/medical-histories');
    });
  });

  // ─── Editar historia médica ────────────────────────────────────────────────

  describe('Editar Historia Médica', () => {
    it('should update diagnosis successfully', () => {
      cy.intercept('GET', `**/api/v1/medical-histories/${mockHistoryId}`, {
        statusCode: 200,
        body: { success: true, data: mockHistory },
      }).as('getHistory');

      cy.intercept('PUT', `**/api/v1/medical-histories/${mockHistoryId}`, {
        statusCode: 200,
        body: {
          success: true,
          data: { ...mockHistory, diagnosis: 'Neumonía' },
        },
      }).as('updateHistory');

      cy.visit(`http://localhost:3000/medical-histories/${mockHistoryId}/edit`);
      cy.wait('@getHistory');

      cy.get('input[name="diagnosis"]').clear().type('Neumonía');
      cy.contains(/guardar/i).click();

      cy.wait('@updateHistory');
      cy.contains(/actualizada/i).should('be.visible');
    });
  });

  // ─── Buscar historias médicas ──────────────────────────────────────────────

  describe('Búsqueda de Historias Médicas', () => {
    it('should search histories by diagnosis', () => {
      cy.intercept('GET', '**/api/v1/medical-histories*search=Bronquitis*', {
        statusCode: 200,
        body: { success: true, data: [mockHistory], pagination: { total: 1 } },
      }).as('searchHistories');

      cy.visit('http://localhost:3000/medical-histories');

      cy.get('input[placeholder*="buscar"]').type('Bronquitis');
      cy.wait('@searchHistories');
      cy.contains('Bronquitis').should('be.visible');
    });

    it('should filter by date range', () => {
      cy.intercept('GET', '**/api/v1/medical-histories*startDate*', {
        statusCode: 200,
        body: { success: true, data: [mockHistory], pagination: { total: 1 } },
      }).as('filterByDate');

      cy.visit('http://localhost:3000/medical-histories');

      cy.get('input[type="date"]').first().type('2026-01-01');
      cy.get('input[type="date"]').last().type('2026-12-31');
      cy.contains(/filtrar/i).click();
      cy.wait('@filterByDate');
    });
  });

  // ─── Exportar historias médicas ────────────────────────────────────────────

  describe('Exportar Historias Médicas', () => {
    it('should export histories as PDF', () => {
      cy.intercept('GET', '**/api/v1/medical-histories/export*format=pdf*', {
        statusCode: 200,
        headers: { 'Content-Type': 'application/pdf' },
        body: '%PDF-1.4 mock pdf content',
      }).as('exportPdf');

      cy.visit('http://localhost:3000/medical-histories');

      cy.contains(/exportar/i).click();
      cy.contains(/PDF/i).click();
      cy.wait('@exportPdf');
    });
  });
});