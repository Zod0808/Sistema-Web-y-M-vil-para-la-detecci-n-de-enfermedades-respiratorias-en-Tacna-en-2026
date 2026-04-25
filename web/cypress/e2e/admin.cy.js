/**
 * E2E Tests for Admin Management Panel UI
 * Covers: user management, system health, analytics, reports, alerts
 */

describe('Admin Management Panel E2E Tests', () => {
  const mockToken = 'mock-admin-token';
  const mockAdminId = '507f1f77bcf86cd799439001';

  const mockUsers = [
    {
      _id: '507f1f77bcf86cd799439011',
      name: 'Dr. María González',
      email: 'dr.maria@respicare.com',
      role: 'doctor',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Juan Pérez',
      email: 'juan@respicare.com',
      role: 'patient',
      isActive: true,
      createdAt: '2025-02-01T00:00:00.000Z',
    },
    {
      _id: '507f1f77bcf86cd799439013',
      name: 'Carlos López',
      email: 'carlos@respicare.com',
      role: 'patient',
      isActive: false,
      createdAt: '2025-03-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('token', mockToken);
      win.localStorage.setItem('userRole', 'admin');
      win.localStorage.setItem('userId', mockAdminId);
    });

    cy.intercept('GET', '**/api/v1/auth/profile', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          _id: mockAdminId,
          name: 'Admin Sistema',
          email: 'admin@respicare.com',
          role: 'admin',
        },
      },
    }).as('getAdminProfile');
  });

  // ─── Dashboard del Administrador ────────────────────────────────────────────

  describe('Dashboard Administrativo', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/v1/dashboard/admin*', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            overview: {
              totalUsers: 150,
              totalDoctors: 25,
              totalPatients: 125,
              totalHistories: 480,
              activeEmergencies: 2,
              pendingAlerts: 5,
            },
            recentActivity: [
              { type: 'emergency', description: 'Nueva emergencia reportada', time: '5 min ago' },
              { type: 'user', description: 'Nuevo médico registrado', time: '1 hora ago' },
            ],
          },
        },
      }).as('getAdminDashboard');

      cy.visit('http://localhost:3000/admin/dashboard');
    });

    it('should display admin dashboard overview', () => {
      cy.wait('@getAdminDashboard');
      cy.contains(/panel de administración|admin/i).should('be.visible');
    });

    it('should display total user count', () => {
      cy.wait('@getAdminDashboard');
      cy.contains(/150|usuarios totales/i).should('be.visible');
    });

    it('should display active emergencies count', () => {
      cy.wait('@getAdminDashboard');
      cy.contains(/emergencias|2/i).should('be.visible');
    });

    it('should display pending alerts', () => {
      cy.wait('@getAdminDashboard');
      cy.contains(/alertas|5/i).should('be.visible');
    });

    it('should show recent system activity', () => {
      cy.wait('@getAdminDashboard');
      cy.contains(/actividad reciente/i).should('be.visible');
    });
  });

  // ─── Gestión de Usuarios ────────────────────────────────────────────────────

  describe('Gestión de Usuarios', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/v1/auth/users*', {
        statusCode: 200,
        body: {
          success: true,
          data: mockUsers,
          pagination: { page: 1, limit: 10, total: 3, pages: 1 },
        },
      }).as('getUsers');

      cy.visit('http://localhost:3000/admin/users');
    });

    it('should display list of users', () => {
      cy.wait('@getUsers');
      cy.contains('Dr. María González').should('be.visible');
      cy.contains('Juan Pérez').should('be.visible');
    });

    it('should display user roles', () => {
      cy.wait('@getUsers');
      cy.contains(/doctor/i).should('be.visible');
      cy.contains(/paciente|patient/i).should('be.visible');
    });

    it('should display active/inactive status badges', () => {
      cy.wait('@getUsers');
      cy.contains(/activo|inactivo/i).should('be.visible');
    });

    it('should filter users by role', () => {
      cy.intercept('GET', '**/api/v1/auth/users*role=doctor*', {
        statusCode: 200,
        body: {
          success: true,
          data: [mockUsers[0]],
          pagination: { total: 1 },
        },
      }).as('filterByRole');

      cy.wait('@getUsers');
      cy.get('select[name="role"], [data-testid="role-filter"]').select('doctor');
      cy.wait('@filterByRole');
      cy.contains('Dr. María González').should('be.visible');
      cy.contains('Juan Pérez').should('not.exist');
    });

    it('should search users by name', () => {
      cy.intercept('GET', '**/api/v1/auth/users*search=María*', {
        statusCode: 200,
        body: {
          success: true,
          data: [mockUsers[0]],
          pagination: { total: 1 },
        },
      }).as('searchUsers');

      cy.wait('@getUsers');
      cy.get('input[placeholder*="buscar"], input[name="search"]').type('María');
      cy.wait('@searchUsers');
      cy.contains('Dr. María González').should('be.visible');
    });

    it('should activate/deactivate a user', () => {
      cy.intercept('PUT', `**/api/v1/auth/users/${mockUsers[2]._id}`, {
        statusCode: 200,
        body: {
          success: true,
          data: { ...mockUsers[2], isActive: true },
        },
      }).as('activateUser');

      cy.wait('@getUsers');
      cy.contains('Carlos López')
        .closest('[data-testid="user-row"], tr')
        .contains(/activar|reactivar/i)
        .click();

      cy.wait('@activateUser');
      cy.contains(/activado|actualizado/i).should('be.visible');
    });

    it('should navigate to user detail page', () => {
      cy.wait('@getUsers');
      cy.contains('Dr. María González').click();
      cy.url().should('include', mockUsers[0]._id);
    });
  });

  // ─── Salud del Sistema ──────────────────────────────────────────────────────

  describe('Monitoreo de Salud del Sistema', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/v1/dashboard/health*', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            database: { status: 'healthy', latency: 12 },
            redis: { status: 'healthy', latency: 3 },
            aiServices: { status: 'degraded', latency: 2500 },
            api: { status: 'healthy', uptime: '99.8%' },
          },
        },
      }).as('getSystemHealth');

      cy.visit('http://localhost:3000/admin/health');
    });

    it('should display system health status', () => {
      cy.wait('@getSystemHealth');
      cy.contains(/salud del sistema|system health/i).should('be.visible');
    });

    it('should display database status', () => {
      cy.wait('@getSystemHealth');
      cy.contains(/base de datos|database/i).should('be.visible');
      cy.contains(/saludable|healthy/i).should('be.visible');
    });

    it('should display Redis status', () => {
      cy.wait('@getSystemHealth');
      cy.contains(/redis/i).should('be.visible');
    });

    it('should highlight degraded services', () => {
      cy.wait('@getSystemHealth');
      cy.contains(/degraded|degradado/i).should('be.visible');
      cy.get('[data-testid="status-degraded"], .status-degraded, .text-warning').should('exist');
    });
  });

  // ─── Reportes Automáticos ───────────────────────────────────────────────────

  describe('Gestión de Reportes Automáticos', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/v1/reports/automatic*', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              _id: 'report-001',
              type: 'daily',
              generatedAt: new Date().toISOString(),
              status: 'completed',
              summary: { totalPatients: 150, newCases: 12 },
            },
          ],
        },
      }).as('getReports');

      cy.visit('http://localhost:3000/admin/reports');
    });

    it('should display reports list', () => {
      cy.wait('@getReports');
      cy.contains(/reportes|reports/i).should('be.visible');
    });

    it('should generate a new daily report', () => {
      cy.intercept('POST', '**/api/v1/reports/automatic/generate', {
        statusCode: 200,
        body: {
          success: true,
          data: { _id: 'report-002', type: 'daily', status: 'generating' },
        },
      }).as('generateReport');

      cy.wait('@getReports');
      cy.contains(/generar reporte/i).click();
      cy.get('select[name="type"]').select('daily');
      cy.contains(/generar/i).click();

      cy.wait('@generateReport');
      cy.contains(/generando|reporte creado/i).should('be.visible');
    });

    it('should download a completed report', () => {
      cy.intercept('GET', '**/api/v1/reports/automatic/report-001/download*', {
        statusCode: 200,
        headers: { 'Content-Type': 'application/pdf' },
        body: '%PDF mock',
      }).as('downloadReport');

      cy.wait('@getReports');
      cy.contains(/descargar|download/i).click();
      cy.wait('@downloadReport');
    });
  });

  // ─── Analytics Epidemiológicos ──────────────────────────────────────────────

  describe('Panel de Analytics Epidemiológicos', () => {
    it('should display epidemiological dashboard', () => {
      cy.intercept('GET', '**/api/v1/analytics/executive-dashboard*', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            totalCases: 1250,
            activeCases: 45,
            recoveredCases: 1180,
            mortalityRate: 2.0,
            diseaseDistribution: [
              { disease: 'Bronquitis', count: 400, percentage: 32 },
              { disease: 'Asma', count: 300, percentage: 24 },
              { disease: 'Gripe', count: 250, percentage: 20 },
            ],
          },
        },
      }).as('getExecutiveDashboard');

      cy.visit('http://localhost:3000/admin/analytics');
      cy.wait('@getExecutiveDashboard');

      cy.contains(/analytics|análisis epidemiológico/i).should('be.visible');
      cy.contains(/1250|casos totales/i).should('be.visible');
    });

    it('should display district disease trends', () => {
      cy.intercept('GET', '**/api/v1/analytics/epidemiology/district-trends*', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            { district: 'Tacna', cases: 350, trend: 'increasing' },
            { district: 'Alto de la Alianza', cases: 120, trend: 'stable' },
          ],
        },
      }).as('getDistrictTrends');

      cy.visit('http://localhost:3000/admin/analytics/districts');
      cy.wait('@getDistrictTrends');

      cy.contains(/Tacna/i).should('be.visible');
      cy.contains(/350/i).should('be.visible');
    });
  });

  // ─── Gestión de Alertas del Sistema ─────────────────────────────────────────

  describe('Gestión de Alertas del Sistema', () => {
    it('should display all active system alerts', () => {
      cy.intercept('GET', '**/api/v1/alerts*', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              _id: 'alert-001',
              type: 'clinical',
              severity: 'critical',
              title: 'Saturación crítica',
              status: 'active',
              createdAt: new Date().toISOString(),
            },
            {
              _id: 'alert-002',
              type: 'outbreak',
              severity: 'high',
              title: 'Brote influenza',
              status: 'active',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }).as('getAlerts');

      cy.visit('http://localhost:3000/admin/alerts');
      cy.wait('@getAlerts');

      cy.contains('Saturación crítica').should('be.visible');
      cy.contains('Brote influenza').should('be.visible');
    });

    it('should bulk acknowledge alerts', () => {
      cy.intercept('GET', '**/api/v1/alerts*', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            { _id: 'alert-001', type: 'clinical', severity: 'high', title: 'Alerta 1', status: 'active' },
          ],
        },
      }).as('getAlerts');

      cy.intercept('PUT', '**/api/v1/alerts/alert-001/acknowledge', {
        statusCode: 200,
        body: { success: true, data: { status: 'acknowledged' } },
      }).as('acknowledgeAlert');

      cy.visit('http://localhost:3000/admin/alerts');
      cy.wait('@getAlerts');

      cy.contains(/reconocer|acknowledge/i).click();
      cy.wait('@acknowledgeAlert');
      cy.contains(/reconocida|acknowledged/i).should('be.visible');
    });
  });
});