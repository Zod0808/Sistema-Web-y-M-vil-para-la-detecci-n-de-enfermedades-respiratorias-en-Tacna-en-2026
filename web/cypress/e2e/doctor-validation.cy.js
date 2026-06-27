/**
 * CP-EPIC03-009 — Panel del doctor: visualización de predicciones IA pendientes
 * CP-EPIC03-010 — Validación de predicción por el doctor (aceptar/rechazar/ajustar)
 *
 * ISO/IEC/IEEE 29119-3 · EPIC-03 HU-03.3
 */

describe('Doctor — Validación de Predicciones IA (CP-EPIC03-009 / CP-EPIC03-010)', () => {
  const mockToken  = 'mock-doctor-token';
  const mockDoctorId = '507f1f77bcf86cd799439020';

  // ── Fixtures de predicciones ─────────────────────────────────────────────────

  const predHighConf = {
    _id:              '507f1f77bcf86cd799439031',
    patientId:        '507f1f77bcf86cd799439041',
    patientName:      'María López',
    disease:          'Pneumonia',
    confidence:       0.91,
    urgencyLevel:     'high',
    status:           'pending',
    symptoms:         [{ name: 'fiebre', severity: 'severe' }, { name: 'tos', severity: 'moderate' }, { name: 'disnea', severity: 'severe' }],
    recommendations:  ['Reposo absoluto', 'Antibióticos recetados', 'Control en 48h'],
    analysisDate:     '2026-06-26T08:00:00.000Z',
  };

  const predMedConf = {
    _id:              '507f1f77bcf86cd799439032',
    patientId:        '507f1f77bcf86cd799439042',
    patientName:      'Carlos Torres',
    disease:          'Bronchitis',
    confidence:       0.72,
    urgencyLevel:     'medium',
    status:           'pending',
    symptoms:         [{ name: 'tos seca', severity: 'moderate' }, { name: 'fiebre baja', severity: 'mild' }],
    recommendations:  ['Reposo', 'Hidratación'],
    analysisDate:     '2026-06-26T09:00:00.000Z',
  };

  const predLowConf = {
    _id:              '507f1f77bcf86cd799439033',
    patientId:        '507f1f77bcf86cd799439043',
    patientName:      'Ana Flores',
    disease:          'Asthma',
    confidence:       0.45,
    urgencyLevel:     'low',
    status:           'pending',
    symptoms:         [{ name: 'sibilancias', severity: 'mild' }, { name: 'disnea leve', severity: 'mild' }],
    recommendations:  ['Broncodilatador de rescate'],
    analysisDate:     '2026-06-26T10:00:00.000Z',
  };

  const allPredictions = [predHighConf, predMedConf, predLowConf];

  // ── Setup global ─────────────────────────────────────────────────────────────

  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('token',    mockToken);
      win.localStorage.setItem('userRole', 'doctor');
      win.localStorage.setItem('userId',   mockDoctorId);
    });

    cy.intercept('GET', '**/api/v1/auth/profile', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          _id:   mockDoctorId,
          name:  'Dr. Roberto Vargas',
          email: 'dr.vargas@respicare.com',
          role:  'doctor',
        },
      },
    }).as('getProfile');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // CP-EPIC03-009 — Visualización de predicciones pendientes
  // ══════════════════════════════════════════════════════════════════════════════

  describe('CP-EPIC03-009 — Predicciones IA pendientes de validación', () => {

    beforeEach(() => {
      cy.intercept('GET', '**/api/v1/symptoms/history*', {
        statusCode: 200,
        body: {
          success: true,
          data:    allPredictions,
          pagination: { page: 1, limit: 20, total: 3, pages: 1 },
        },
      }).as('getPredictions');

      cy.visit('http://localhost:3000/doctor/dashboard');
    });

    // CP-009 — Carga de la lista

    it('CP-009-01: carga el panel de predicciones en menos de 2 segundos', () => {
      const start = Date.now();
      cy.wait('@getPredictions').then(() => {
        const elapsed = Date.now() - start;
        expect(elapsed).to.be.lessThan(2000);
      });
      cy.contains(/predicciones/i).should('be.visible');
    });

    it('CP-009-02: muestra las 3 predicciones pendientes', () => {
      cy.wait('@getPredictions');
      cy.contains('María López').should('be.visible');
      cy.contains('Carlos Torres').should('be.visible');
      cy.contains('Ana Flores').should('be.visible');
    });

    it('CP-009-03: muestra la enfermedad predicha para cada paciente', () => {
      cy.wait('@getPredictions');
      cy.contains('Pneumonia').should('be.visible');
      cy.contains('Bronchitis').should('be.visible');
      cy.contains('Asthma').should('be.visible');
    });

    // CP-009 — Badges de confianza (verde ≥ 0.85 / amber 0.60–0.84 / rojo < 0.60)

    it('CP-009-04: badge VERDE para confidence >= 0.85 (91%)', () => {
      cy.wait('@getPredictions');
      cy.contains('91%')
        .closest('[class*="card"], [class*="row"], [class*="item"], li')
        .find('[class*="green"], [class*="success"], [class*="high"]')
        .should('exist');
    });

    it('CP-009-05: badge AMBER para confidence 0.60–0.84 (72%)', () => {
      cy.wait('@getPredictions');
      cy.contains('72%')
        .closest('[class*="card"], [class*="row"], [class*="item"], li')
        .find('[class*="amber"], [class*="warning"], [class*="medium"]')
        .should('exist');
    });

    it('CP-009-06: badge ROJO para confidence < 0.60 (45%)', () => {
      cy.wait('@getPredictions');
      cy.contains('45%')
        .closest('[class*="card"], [class*="row"], [class*="item"], li')
        .find('[class*="red"], [class*="danger"], [class*="low"], [class*="error"]')
        .should('exist');
    });

    // CP-009 — Vista de detalle

    it('CP-009-07: al seleccionar una predicción muestra síntomas originales', () => {
      cy.intercept('GET', `**/api/v1/symptoms/history/${predHighConf._id}`, {
        statusCode: 200,
        body: { success: true, data: predHighConf },
      }).as('getDetail');

      cy.wait('@getPredictions');
      cy.contains('María López').click();
      cy.wait('@getDetail');

      cy.contains('fiebre').should('be.visible');
      cy.contains('tos').should('be.visible');
      cy.contains('disnea').should('be.visible');
    });

    it('CP-009-08: el detalle incluye las recomendaciones de la IA', () => {
      cy.intercept('GET', `**/api/v1/symptoms/history/${predHighConf._id}`, {
        statusCode: 200,
        body: { success: true, data: predHighConf },
      }).as('getDetail');

      cy.wait('@getPredictions');
      cy.contains('María López').click();
      cy.wait('@getDetail');

      cy.contains('Reposo absoluto').should('be.visible');
      cy.contains('Antibióticos recetados').should('be.visible');
    });

    // CP-009 — Casos borde

    it('CP-009-09: muestra estado vacío si no hay predicciones pendientes', () => {
      cy.intercept('GET', '**/api/v1/symptoms/history*', {
        statusCode: 200,
        body: { success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } },
      }).as('emptyPredictions');

      cy.visit('http://localhost:3000/doctor/dashboard');
      cy.wait('@emptyPredictions');
      cy.contains(/no hay predicciones|sin predicciones/i).should('be.visible');
    });

    it('CP-009-10: muestra mensaje de error si falla la carga (500)', () => {
      cy.intercept('GET', '**/api/v1/symptoms/history*', {
        statusCode: 500,
        body: { success: false, message: 'Error interno del servidor' },
      }).as('failedLoad');

      cy.visit('http://localhost:3000/doctor/dashboard');
      cy.wait('@failedLoad');
      cy.contains(/error|no se pudo cargar/i).should('be.visible');
    });

    it('CP-009-11: muestra 401 si el token es inválido', () => {
      cy.intercept('GET', '**/api/v1/symptoms/history*', {
        statusCode: 401,
        body: { success: false, message: 'No autorizado' },
      }).as('unauthorized');

      cy.visit('http://localhost:3000/doctor/dashboard');
      cy.wait('@unauthorized');
      // Redirige a login o muestra mensaje de sesión expirada
      cy.url().then((url) => {
        if (url.includes('/login')) {
          cy.contains(/iniciar sesión/i).should('be.visible');
        } else {
          cy.contains(/sesión expirada|no autorizado/i).should('be.visible');
        }
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // CP-EPIC03-010 — Validación médica: aceptar / rechazar / ajustar
  // ══════════════════════════════════════════════════════════════════════════════

  describe('CP-EPIC03-010 — Flujo de validación médica', () => {

    beforeEach(() => {
      cy.intercept('GET', '**/api/v1/symptoms/history*', {
        statusCode: 200,
        body: { success: true, data: allPredictions, pagination: { page: 1, limit: 20, total: 3, pages: 1 } },
      }).as('getPredictions');

      cy.intercept('GET', `**/api/v1/symptoms/history/${predHighConf._id}`, {
        statusCode: 200,
        body: { success: true, data: predHighConf },
      }).as('getHighDetail');

      cy.intercept('GET', `**/api/v1/symptoms/history/${predLowConf._id}`, {
        statusCode: 200,
        body: { success: true, data: predLowConf },
      }).as('getLowDetail');

      cy.visit('http://localhost:3000/doctor/dashboard');
    });

    // ── Caso A: Aceptar diagnóstico ───────────────────────────────────────────

    it('CP-010-01: aceptar diagnóstico actualiza estado a "validated"', () => {
      cy.intercept('PATCH', `**/api/v1/symptoms/analysis/${predHighConf._id}`, {
        statusCode: 200,
        body: {
          success: true,
          data: { ...predHighConf, status: 'validated', doctorApproved: true },
        },
      }).as('acceptPrediction');

      cy.wait('@getPredictions');
      cy.contains('María López').click();
      cy.wait('@getHighDetail');

      cy.contains(/aceptar diagnóstico|validar/i).click();
      cy.wait('@acceptPrediction');

      cy.get('@acceptPrediction').its('request.body').should((body) => {
        expect(body).to.have.property('action', 'validate');
      });

      cy.contains(/validado|aceptado|success/i).should('be.visible');
    });

    it('CP-010-02: después de aceptar, la predicción desaparece de la lista de pendientes', () => {
      cy.intercept('PATCH', `**/api/v1/symptoms/analysis/${predHighConf._id}`, {
        statusCode: 200,
        body: { success: true, data: { ...predHighConf, status: 'validated', doctorApproved: true } },
      }).as('acceptPrediction');

      // Segunda carga de la lista: ya sin la predicción validada
      cy.intercept('GET', '**/api/v1/symptoms/history*', {
        statusCode: 200,
        body: { success: true, data: [predMedConf, predLowConf], pagination: { page: 1, limit: 20, total: 2, pages: 1 } },
      }).as('updatedList');

      cy.wait('@getPredictions');
      cy.contains('María López').click();
      cy.wait('@getHighDetail');
      cy.contains(/aceptar diagnóstico|validar/i).click();
      cy.wait('@acceptPrediction');
      cy.wait('@updatedList');

      cy.contains('María López').should('not.exist');
    });

    it('CP-010-03: aceptar genera audit log en el body de la petición', () => {
      cy.intercept('PATCH', `**/api/v1/symptoms/analysis/${predHighConf._id}`, {
        statusCode: 200,
        body: { success: true, data: { ...predHighConf, status: 'validated', doctorApproved: true } },
      }).as('acceptWithAudit');

      cy.wait('@getPredictions');
      cy.contains('María López').click();
      cy.wait('@getHighDetail');
      cy.contains(/aceptar diagnóstico|validar/i).click();
      cy.wait('@acceptWithAudit');

      cy.get('@acceptWithAudit').its('request.body').should((body) => {
        expect(body).to.include.keys(['action', 'doctorId']);
      });
    });

    // ── Caso B: Rechazar diagnóstico ──────────────────────────────────────────

    it('CP-010-04: rechazar diagnóstico requiere ingresar diagnóstico correcto', () => {
      cy.wait('@getPredictions');
      cy.contains('Ana Flores').click();
      cy.wait('@getLowDetail');

      cy.contains(/rechazar/i).click();

      // Debe aparecer un campo para el diagnóstico correcto
      cy.get('input[name*="overrideDiagnosis"], input[placeholder*="diagnóstico"], textarea[name*="reason"]')
        .should('be.visible');
    });

    it('CP-010-05: rechazo con diagnóstico alternativo actualiza status a "rejected"', () => {
      cy.intercept('PATCH', `**/api/v1/symptoms/analysis/${predLowConf._id}`, {
        statusCode: 200,
        body: {
          success: true,
          data: {
            ...predLowConf,
            status:           'rejected',
            overrideDiagnosis: 'Bronchitis',
            doctorApproved:   false,
          },
        },
      }).as('rejectPrediction');

      cy.wait('@getPredictions');
      cy.contains('Ana Flores').click();
      cy.wait('@getLowDetail');

      cy.contains(/rechazar/i).click();

      cy.get('input[name*="overrideDiagnosis"], input[placeholder*="diagnóstico"]')
        .first()
        .type('Bronchitis');

      cy.get('textarea[name*="reason"], input[name*="reason"]')
        .first()
        .type('Síntomas no coinciden con Asma — patrón más compatible con Bronquitis aguda');

      cy.contains(/confirmar rechazo|guardar/i).click();
      cy.wait('@rejectPrediction');

      cy.get('@rejectPrediction').its('request.body').should((body) => {
        expect(body).to.have.property('action', 'reject');
        expect(body.overrideDiagnosis).to.equal('Bronchitis');
        expect(body.reason).to.be.a('string').and.not.be.empty;
      });

      cy.contains(/rechazado|success/i).should('be.visible');
    });

    it('CP-010-06: rechazo sin diagnóstico alternativo no se procesa', () => {
      cy.wait('@getPredictions');
      cy.contains('Ana Flores').click();
      cy.wait('@getLowDetail');

      cy.contains(/rechazar/i).click();

      // No ingresa diagnóstico alternativo
      cy.contains(/confirmar rechazo|guardar/i).click();

      // Debe permanecer en el formulario sin enviar
      cy.get('input[name*="overrideDiagnosis"], input[placeholder*="diagnóstico"]')
        .first()
        .should('be.visible');
    });

    // ── Caso C: Ajustar diagnóstico ───────────────────────────────────────────

    it('CP-010-07: ajuste de diagnóstico con nota clínica actualiza status a "adjusted"', () => {
      cy.intercept('PATCH', `**/api/v1/symptoms/analysis/${predMedConf._id}`, {
        statusCode: 200,
        body: {
          success: true,
          data: {
            ...predMedConf,
            status:         'adjusted',
            adjustedDisease: 'Asthma',
            clinicalNote:   'Patrón asmático previo — historial familiar',
            doctorApproved:  true,
          },
        },
      }).as('adjustPrediction');

      cy.intercept('GET', `**/api/v1/symptoms/history/${predMedConf._id}`, {
        statusCode: 200,
        body: { success: true, data: predMedConf },
      }).as('getMedDetail');

      cy.wait('@getPredictions');
      cy.contains('Carlos Torres').click();
      cy.wait('@getMedDetail');

      cy.contains(/ajustar|modificar/i).click();

      cy.get('input[name*="adjustedDisease"], input[name*="disease"], select[name*="disease"]')
        .first()
        .clear()
        .type('Asthma');

      cy.get('textarea[name*="clinicalNote"], textarea[name*="note"]')
        .first()
        .type('Patrón asmático previo — historial familiar');

      cy.contains(/guardar ajuste|confirmar/i).click();
      cy.wait('@adjustPrediction');

      cy.get('@adjustPrediction').its('request.body').should((body) => {
        expect(body).to.have.property('action', 'adjust');
        expect(body.adjustedDisease).to.equal('Asthma');
        expect(body.clinicalNote).to.be.a('string').and.not.be.empty;
      });

      cy.contains(/ajustado|actualizado|success/i).should('be.visible');
    });

    it('CP-010-08: ajuste sin cambio de enfermedad registra solo la nota clínica', () => {
      cy.intercept('PATCH', `**/api/v1/symptoms/analysis/${predMedConf._id}`, {
        statusCode: 200,
        body: {
          success: true,
          data: { ...predMedConf, status: 'adjusted', clinicalNote: 'Observación adicional', doctorApproved: true },
        },
      }).as('adjustNoteOnly');

      cy.intercept('GET', `**/api/v1/symptoms/history/${predMedConf._id}`, {
        statusCode: 200,
        body: { success: true, data: predMedConf },
      }).as('getMedDetail2');

      cy.wait('@getPredictions');
      cy.contains('Carlos Torres').click();
      cy.wait('@getMedDetail2');

      cy.contains(/ajustar|modificar/i).click();

      cy.get('textarea[name*="clinicalNote"], textarea[name*="note"]')
        .first()
        .type('Observación adicional sin cambio de diagnóstico');

      cy.contains(/guardar ajuste|confirmar/i).click();
      cy.wait('@adjustNoteOnly');

      cy.contains(/ajustado|actualizado|success/i).should('be.visible');
    });

    // ── Notificaciones y trazabilidad ─────────────────────────────────────────

    it('CP-010-09: la acción de aceptar incluye doctorId en el payload', () => {
      cy.intercept('PATCH', `**/api/v1/symptoms/analysis/${predHighConf._id}`, {
        statusCode: 200,
        body: { success: true, data: { ...predHighConf, status: 'validated' } },
      }).as('auditCheck');

      cy.wait('@getPredictions');
      cy.contains('María López').click();
      cy.wait('@getHighDetail');
      cy.contains(/aceptar diagnóstico|validar/i).click();
      cy.wait('@auditCheck');

      cy.get('@auditCheck').its('request.body').should((body) => {
        expect(body.doctorId).to.equal(mockDoctorId);
      });
    });

    it('CP-010-10: error 500 al validar muestra mensaje de reintento', () => {
      cy.intercept('PATCH', `**/api/v1/symptoms/analysis/${predHighConf._id}`, {
        statusCode: 500,
        body: { success: false, message: 'Error al guardar la validación' },
      }).as('failValidation');

      cy.wait('@getPredictions');
      cy.contains('María López').click();
      cy.wait('@getHighDetail');
      cy.contains(/aceptar diagnóstico|validar/i).click();
      cy.wait('@failValidation');

      cy.contains(/error|reintentar|falló/i).should('be.visible');
    });
  });
});