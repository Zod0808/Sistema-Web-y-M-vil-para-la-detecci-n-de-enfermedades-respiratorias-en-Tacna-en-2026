/**
 * E2E Tests for Wearables Dashboard UI
 * Covers: data sync, metrics display, health trends, alerts
 */

describe('Wearables Dashboard E2E Tests', () => {
  const mockToken = 'mock-jwt-token';
  const mockPatientId = '507f1f77bcf86cd799439011';

  const mockWearableData = {
    _id: 'wear-001',
    patientId: mockPatientId,
    heartRate: 72,
    oxygenSaturation: 97,
    steps: 5000,
    sleepHours: 7.5,
    bloodPressure: { systolic: 120, diastolic: 80 },
    timestamp: new Date().toISOString(),
    source: 'apple_health',
  };

  const mockMetrics = {
    averageHeartRate: 75,
    averageOxygenSaturation: 96.5,
    totalSteps: 35000,
    averageSleepHours: 7.2,
    alertsCount: 2,
    lastSync: new Date().toISOString(),
  };

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
          name: 'Paciente Wearable',
          email: 'patient@respicare.com',
          role: 'patient',
        },
      },
    }).as('getProfile');
  });

  // ─── Dashboard de Wearables ─────────────────────────────────────────────────

  describe('Vista del Dashboard de Wearables', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/v1/wearables*', {
        statusCode: 200,
        body: {
          success: true,
          data: [mockWearableData],
          pagination: { total: 1 },
        },
      }).as('getWearableData');

      cy.intercept('GET', '**/api/v1/wearables/metrics*', {
        statusCode: 200,
        body: { success: true, data: mockMetrics },
      }).as('getMetrics');

      cy.visit('http://localhost:3000/wearables');
    });

    it('should display wearable metrics dashboard', () => {
      cy.wait('@getMetrics');
      cy.contains(/wearables|dispositivos/i).should('be.visible');
    });

    it('should display heart rate metric', () => {
      cy.wait('@getMetrics');
      cy.contains(/frecuencia cardíaca|heart rate|75/i).should('be.visible');
    });

    it('should display oxygen saturation metric', () => {
      cy.wait('@getMetrics');
      cy.contains(/saturación|oxygen|96/i).should('be.visible');
    });

    it('should display step count', () => {
      cy.wait('@getMetrics');
      cy.contains(/pasos|steps|35000/i).should('be.visible');
    });

    it('should display sleep hours metric', () => {
      cy.wait('@getMetrics');
      cy.contains(/sueño|sleep|7/i).should('be.visible');
    });

    it('should show last sync time', () => {
      cy.wait('@getMetrics');
      cy.contains(/última sincronización|last sync/i).should('be.visible');
    });
  });

  // ─── Sincronización Manual de Datos ────────────────────────────────────────

  describe('Sincronización de Datos Wearable', () => {
    it('should sync data from Apple Health', () => {
      cy.intercept('POST', '**/api/v1/wearables/sync', {
        statusCode: 200,
        body: {
          success: true,
          data: mockWearableData,
          message: 'Datos sincronizados correctamente',
        },
      }).as('syncData');

      cy.visit('http://localhost:3000/wearables');
      cy.contains(/sincronizar|sync/i).click();

      // Select source
      cy.get('select[name="source"], [data-testid="source-select"]')
        .select('apple_health');

      cy.contains(/sincronizar ahora|confirmar/i).click();
      cy.wait('@syncData');
      cy.contains(/sincronizados correctamente/i).should('be.visible');
    });

    it('should handle sync failure gracefully', () => {
      cy.intercept('POST', '**/api/v1/wearables/sync', {
        statusCode: 503,
        body: {
          success: false,
          message: 'Servicio no disponible temporalmente',
        },
      }).as('syncFailed');

      cy.visit('http://localhost:3000/wearables');
      cy.contains(/sincronizar|sync/i).click();
      cy.contains(/sincronizar ahora|confirmar/i).click();
      cy.wait('@syncFailed');
      cy.contains(/error|no disponible/i).should('be.visible');
    });
  });

  // ─── Gráficas de Tendencias ─────────────────────────────────────────────────

  describe('Visualización de Tendencias de Salud', () => {
    it('should display health trend charts', () => {
      cy.intercept('GET', '**/api/v1/wearables*', {
        statusCode: 200,
        body: {
          success: true,
          data: Array.from({ length: 7 }, (_, i) => ({
            ...mockWearableData,
            _id: `wear-${i}`,
            heartRate: 70 + i,
            timestamp: new Date(Date.now() - i * 86400000).toISOString(),
          })),
        },
      }).as('getTrends');

      cy.visit('http://localhost:3000/wearables/trends');
      cy.wait('@getTrends');
      cy.get('[data-testid="health-chart"], canvas, .recharts-wrapper').should('exist');
    });

    it('should filter trends by time period (7 days)', () => {
      cy.intercept('GET', '**/api/v1/wearables*hours=168*', {
        statusCode: 200,
        body: { success: true, data: [mockWearableData] },
      }).as('get7DayTrends');

      cy.visit('http://localhost:3000/wearables/trends');
      cy.contains(/7 días|last 7 days/i).click();
      cy.wait('@get7DayTrends');
    });

    it('should filter trends by time period (30 days)', () => {
      cy.intercept('GET', '**/api/v1/wearables*hours=720*', {
        statusCode: 200,
        body: { success: true, data: [mockWearableData] },
      }).as('get30DayTrends');

      cy.visit('http://localhost:3000/wearables/trends');
      cy.contains(/30 días|last 30 days/i).click();
      cy.wait('@get30DayTrends');
    });
  });

  // ─── Alertas de Wearables ──────────────────────────────────────────────────

  describe('Alertas de Salud de Wearable', () => {
    it('should display alert when oxygen saturation is critical', () => {
      cy.intercept('GET', '**/api/v1/wearables/metrics*', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            ...mockMetrics,
            averageOxygenSaturation: 88,
            alertsCount: 3,
          },
        },
      }).as('getCriticalMetrics');

      cy.visit('http://localhost:3000/wearables');
      cy.wait('@getCriticalMetrics');
      cy.contains(/alerta|atención|88%/i).should('be.visible');
    });

    it('should show warning when heart rate is abnormal', () => {
      cy.intercept('GET', '**/api/v1/wearables/metrics*', {
        statusCode: 200,
        body: {
          success: true,
          data: { ...mockMetrics, averageHeartRate: 140 },
        },
      }).as('getHighHR');

      cy.visit('http://localhost:3000/wearables');
      cy.wait('@getHighHR');
      cy.contains(/140|taquicardia|alerta/i).should('be.visible');
    });
  });

  // ─── Historial de Datos Wearable ────────────────────────────────────────────

  describe('Historial de Datos de Dispositivos', () => {
    it('should display paginated wearable history', () => {
      cy.intercept('GET', '**/api/v1/wearables*page=1*limit=20*', {
        statusCode: 200,
        body: {
          success: true,
          data: Array.from({ length: 10 }, (_, i) => ({
            ...mockWearableData,
            _id: `wear-hist-${i}`,
          })),
          pagination: { page: 1, limit: 20, total: 10, pages: 1 },
        },
      }).as('getHistory');

      cy.visit('http://localhost:3000/wearables/history');
      cy.wait('@getHistory');
      cy.contains(/historial|history/i).should('be.visible');
    });

    it('should filter history by date', () => {
      cy.intercept('GET', '**/api/v1/wearables*startDate*', {
        statusCode: 200,
        body: {
          success: true,
          data: [mockWearableData],
          pagination: { total: 1 },
        },
      }).as('getFilteredHistory');

      cy.visit('http://localhost:3000/wearables/history');
      cy.get('input[type="date"]').first().type('2026-04-01');
      cy.get('input[type="date"]').last().type('2026-04-13');
      cy.contains(/filtrar|aplicar/i).click();
      cy.wait('@getFilteredHistory');
    });
  });
});