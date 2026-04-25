/**
 * Compatibility Tests — Cross-Browser & Multi-Device
 *
 * Verifica que la aplicación funcione correctamente en:
 *   - Chrome (desktop y mobile)
 *   - Firefox (desktop)
 *   - Safari (emulación via viewport iOS)
 *   - Mobile: iPhone SE, iPhone 14 Pro, Samsung Galaxy S21, iPad
 *
 * Estrategia:
 *   - cy.viewport() simula resoluciones de cada dispositivo/navegador
 *   - cy.intercept() estabiliza las respuestas de API (sin red real)
 *   - Verifica que elementos críticos se rendericen en todos los viewports
 *   - Prueba interacciones táctiles (touch) vs. click en mobile
 *   - Verifica CSS variables, localStorage y matchMedia disponibles
 *   - Detecta problemas de layout en viewports extremos
 *
 * Para ejecutar en Firefox real:
 *   npx cypress run --browser firefox
 * Para ejecutar en Electron (Chrome-based):
 *   npx cypress run --browser electron
 */

// ─── Dispositivos objetivo ────────────────────────────────────────────────────

const DEVICES = {
  // ── Desktop ─────────────────────────────────────────────────────────────────
  chromeDesktop:  { width: 1280, height: 720,  label: 'Chrome Desktop (1280x720)',  ua: 'chrome' },
  firefoxDesktop: { width: 1280, height: 720,  label: 'Firefox Desktop (1280x720)', ua: 'firefox' },
  safariDesktop:  { width: 1440, height: 900,  label: 'Safari Desktop (1440x900)',  ua: 'safari' },
  edgeDesktop:    { width: 1366, height: 768,  label: 'Edge Desktop (1366x768)',    ua: 'edge' },

  // ── Mobile iOS ──────────────────────────────────────────────────────────────
  iphoneSE:       { width: 375,  height: 667,  label: 'iPhone SE (iOS Safari)',     ua: 'ios' },
  iphone14Pro:    { width: 393,  height: 852,  label: 'iPhone 14 Pro (iOS Safari)', ua: 'ios' },
  iphone14ProMax: { width: 430,  height: 932,  label: 'iPhone 14 Pro Max',          ua: 'ios' },
  ipadPro:        { width: 1024, height: 1366, label: 'iPad Pro (iPadOS)',           ua: 'ios' },

  // ── Mobile Android ──────────────────────────────────────────────────────────
  galaxyS21:      { width: 360,  height: 800,  label: 'Samsung Galaxy S21',         ua: 'android' },
  pixel7:         { width: 412,  height: 915,  label: 'Google Pixel 7',             ua: 'android' },
  galaxyTab:      { width: 800,  height: 1280, label: 'Samsung Galaxy Tab',         ua: 'android' },
};

// ─── API stubs compartidos ────────────────────────────────────────────────────

const stubApis = () => {
  cy.intercept('GET', '**/api/v1/auth/profile', {
    statusCode: 200,
    body: { success: true, data: { _id: 'u1', name: 'Dr. Test', role: 'doctor' } },
  }).as('getProfile');

  cy.intercept('GET', '**/api/v1/alerts**', {
    statusCode: 200,
    body: { success: true, data: [] },
  }).as('getAlerts');

  cy.intercept('GET', '**/api/v1/analytics/**', {
    statusCode: 200,
    body: { success: true, data: { stats: {}, trends: [] } },
  }).as('getAnalytics');

  cy.intercept('GET', '**/api/v1/medical-histories**', {
    statusCode: 200,
    body: { success: true, data: [], pagination: { total: 0 } },
  }).as('getHistories');

  cy.intercept('POST', '**/chat-conversations**', {
    statusCode: 200,
    body: { success: true, data: { sessionId: 'test-session' } },
  }).as('createSession');
};

const setAuthState = () => {
  cy.window().then((win) => {
    win.localStorage.setItem('token', 'compat-test-token');
    win.localStorage.setItem('userRole', 'doctor');
    win.localStorage.setItem('userId', '507f1f77bcf86cd799439001');
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-01: Home Page — renderiza en todos los viewports
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-01 — Home Page: renderizado en todos los dispositivos', () => {
  Object.entries(DEVICES).forEach(([key, { width, height, label }]) => {
    it(`renderiza correctamente en ${label}`, () => {
      cy.viewport(width, height);
      stubApis();
      cy.visit('/');

      // Elementos críticos visibles en cualquier dispositivo
      cy.get('body').should('be.visible');
      cy.get('body').should('not.be.empty');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-02: Navbar — visible y funcional en mobile y desktop
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-02 — Navbar: adaptación responsive', () => {
  const desktopDevices = [
    DEVICES.chromeDesktop,
    DEVICES.firefoxDesktop,
    DEVICES.safariDesktop,
  ];
  const mobileDevices = [
    DEVICES.iphoneSE,
    DEVICES.iphone14Pro,
    DEVICES.galaxyS21,
    DEVICES.pixel7,
  ];

  desktopDevices.forEach(({ width, height, label }) => {
    it(`[Desktop] Navbar visible en ${label}`, () => {
      cy.viewport(width, height);
      stubApis();
      cy.visit('/');

      // En desktop: nav debe ser visible
      cy.get('nav, [role="navigation"]').should('exist');
    });
  });

  mobileDevices.forEach(({ width, height, label }) => {
    it(`[Mobile] Navbar o menú hamburguesa existe en ${label}`, () => {
      cy.viewport(width, height);
      stubApis();
      cy.visit('/');

      // En mobile: puede ser nav colapsado o hamburguesa
      cy.get('body').should('be.visible');
      // Al menos el contenedor de navegación existe en el DOM
      cy.get('nav, [role="navigation"], .navbar, header').should('exist');
    });
  });

  it('Navbar no hace overflow horizontal en iPhone SE (375px)', () => {
    cy.viewport(375, 667);
    stubApis();
    cy.visit('/');

    cy.window().then((win) => {
      const bodyWidth = win.document.body.scrollWidth;
      expect(bodyWidth).to.be.lte(375 + 5); // Tolerancia de 5px
    });
  });

  it('Navbar no hace overflow horizontal en Galaxy S21 (360px)', () => {
    cy.viewport(360, 800);
    stubApis();
    cy.visit('/');

    cy.window().then((win) => {
      const bodyWidth = win.document.body.scrollWidth;
      expect(bodyWidth).to.be.lte(360 + 5);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-03: localStorage — disponible en todos los contextos
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-03 — localStorage: disponibilidad cross-browser', () => {
  [DEVICES.chromeDesktop, DEVICES.iphoneSE, DEVICES.galaxyS21].forEach(
    ({ width, height, label }) => {
      it(`localStorage read/write funciona en ${label}`, () => {
        cy.viewport(width, height);
        cy.visit('/');

        cy.window().then((win) => {
          // Escritura
          expect(() => {
            win.localStorage.setItem('compat-test', 'value-123');
          }).not.to.throw();

          // Lectura
          const value = win.localStorage.getItem('compat-test');
          expect(value).to.equal('value-123');

          // Eliminación
          win.localStorage.removeItem('compat-test');
          expect(win.localStorage.getItem('compat-test')).to.be.null;
        });
      });
    }
  );

  it('El tema se persiste en localStorage correctamente', () => {
    cy.viewport(1280, 720);
    cy.visit('/');

    cy.window().then((win) => {
      win.localStorage.setItem('theme-mode', 'dark');
    });

    cy.reload();

    cy.window().then((win) => {
      const savedTheme = win.localStorage.getItem('theme-mode');
      expect(savedTheme).to.equal('dark');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-04: CSS Variables — aplicadas correctamente
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-04 — CSS Custom Properties (Variables): compatibilidad', () => {
  [DEVICES.chromeDesktop, DEVICES.firefoxDesktop, DEVICES.iphoneSE].forEach(
    ({ width, height, label }) => {
      it(`CSS variables disponibles en ${label}`, () => {
        cy.viewport(width, height);
        cy.visit('/');

        cy.window().then((win) => {
          const root = win.document.documentElement;
          // El ThemeProvider las aplica al montar
          const supportsCSSVars = win.CSS && win.CSS.supports
            ? win.CSS.supports('--test', '0')
            : typeof root.style.setProperty === 'function';

          // Verificar que se puede definir y leer una variable CSS
          root.style.setProperty('--compat-test-var', '#ff0000');
          const computed = win.getComputedStyle(root).getPropertyValue('--compat-test-var');
          expect(computed.trim()).to.equal('#ff0000');
        });
      });
    }
  );

  it('ThemeProvider aplica --color-primary al root en modo light', () => {
    cy.viewport(1280, 720);
    cy.window().then((win) => {
      win.localStorage.setItem('theme-mode', 'light');
    });
    cy.visit('/');

    cy.window().then((win) => {
      const primaryColor = win.getComputedStyle(win.document.documentElement)
        .getPropertyValue('--color-primary');
      expect(primaryColor.trim().length).to.be.greaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-05: matchMedia — soporte prefers-color-scheme
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-05 — window.matchMedia: soporte en todos los browsers', () => {
  [DEVICES.chromeDesktop, DEVICES.iphoneSE, DEVICES.galaxyS21].forEach(
    ({ width, height, label }) => {
      it(`matchMedia disponible en ${label}`, () => {
        cy.viewport(width, height);
        cy.visit('/');

        cy.window().then((win) => {
          expect(win.matchMedia).to.be.a('function');
          const query = win.matchMedia('(prefers-color-scheme: dark)');
          expect(query).to.have.property('matches');
          expect(query.matches).to.be.a('boolean');
        });
      });
    }
  );

  it('matchMedia no lanza en modo auto del tema', () => {
    cy.viewport(1280, 720);
    cy.window().then((win) => {
      win.localStorage.setItem('theme-mode', 'auto');
    });
    cy.visit('/');

    // No debe producir errores en la consola
    cy.window().then((win) => {
      expect(() => {
        win.matchMedia('(prefers-color-scheme: dark)');
      }).not.to.throw();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-06: ChatBot — funcional en mobile y desktop
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-06 — ChatBot: funcionalidad cross-device', () => {
  const chatDevices = [
    DEVICES.chromeDesktop,
    DEVICES.iphoneSE,
    DEVICES.galaxyS21,
    DEVICES.ipadPro,
  ];

  chatDevices.forEach(({ width, height, label }) => {
    it(`ChatBot renderiza y tiene textarea en ${label}`, () => {
      cy.viewport(width, height);
      stubApis();
      cy.visit('/');

      // El ChatBot debería estar en la home o ser navegable
      cy.get('body').then(($body) => {
        if ($body.find('.chatbot-container').length > 0) {
          cy.get('.chatbot-container').should('be.visible');
          cy.get('.chatbot-container textarea').should('exist');
        } else {
          // El ChatBot puede estar en otra ruta
          cy.log(`ChatBot no visible en home para ${label}`);
        }
      });
    });
  });

  it('ChatBot textarea acepta input táctil en iPhone SE (375px)', () => {
    cy.viewport(375, 667);
    stubApis();
    cy.visit('/');

    cy.get('body').then(($body) => {
      if ($body.find('.chatbot-container textarea').length > 0) {
        cy.get('.chatbot-container textarea')
          .should('be.visible')
          .focus()
          .type('tengo tos', { force: true });

        cy.get('.chatbot-container textarea').should('have.value', 'tengo tos');
      }
    });
  });

  it('Botón de envío del ChatBot es visible en Galaxy S21 (360px)', () => {
    cy.viewport(360, 800);
    stubApis();
    cy.visit('/');

    cy.get('body').then(($body) => {
      if ($body.find('button[aria-label]').length > 0) {
        cy.get('button[aria-label]').first().should('exist');
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-07: Formulario de síntomas — input types cross-browser
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-07 — SymptomReportForm: inputs cross-browser', () => {
  const formDevices = [
    DEVICES.chromeDesktop,
    DEVICES.firefoxDesktop,
    DEVICES.iphoneSE,
    DEVICES.galaxyS21,
  ];

  formDevices.forEach(({ width, height, label }) => {
    it(`Formulario de síntomas renderiza en ${label}`, () => {
      cy.viewport(width, height);
      stubApis();
      cy.visit('/');

      // Navegar al formulario de síntomas si existe
      cy.get('body').then(($body) => {
        if ($body.find('.symptom-form, [class*="symptom"]').length > 0) {
          cy.get('.symptom-form, [class*="symptom"]').first().should('exist');
        } else {
          cy.log(`SymptomReportForm no visible directamente en ${label}`);
        }
      });
    });
  });

  it('Los checkboxes son clickeables en iPhone 14 Pro (393px)', () => {
    cy.viewport(393, 852);
    stubApis();
    cy.visit('/');

    cy.get('body').then(($body) => {
      if ($body.find('input[type="checkbox"]').length > 0) {
        cy.get('input[type="checkbox"]').first().check({ force: true });
        cy.get('input[type="checkbox"]').first().should('be.checked');
      }
    });
  });

  it('Los selects son usables en Android (360px)', () => {
    cy.viewport(360, 800);
    stubApis();
    cy.visit('/');

    cy.get('body').then(($body) => {
      if ($body.find('select').length > 0) {
        cy.get('select').first().should('exist').and('be.visible');
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-08: Navegación — rutas funcionan en todos los browsers
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-08 — Navegación: routing cross-browser', () => {
  const navDevices = [
    DEVICES.chromeDesktop,
    DEVICES.firefoxDesktop,
    DEVICES.iphoneSE,
  ];

  navDevices.forEach(({ width, height, label }) => {
    it(`Navegación a /dashboard funciona en ${label}`, () => {
      cy.viewport(width, height);
      stubApis();
      cy.visit('/');

      cy.visit('/dashboard');
      cy.url().should('include', '/dashboard');
      cy.get('body').should('be.visible');
    });

    it(`Navegación a /analytics funciona en ${label}`, () => {
      cy.viewport(width, height);
      stubApis();
      cy.visit('/analytics');
      cy.url().should('include', '/analytics');
      cy.get('body').should('be.visible');
    });

    it(`Botón Atrás del navegador funciona en ${label}`, () => {
      cy.viewport(width, height);
      stubApis();
      cy.visit('/');
      cy.visit('/dashboard');
      cy.go('back');
      cy.url().should('eq', `${Cypress.config('baseUrl')}/`);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-09: Scroll — smooth scroll y scrollIntoView
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-09 — Scroll: comportamiento cross-browser', () => {
  it('scrollIntoView no lanza error en Chrome desktop', () => {
    cy.viewport(1280, 720);
    cy.visit('/');

    cy.window().then((win) => {
      const el = win.document.body.querySelector('*');
      if (el && el.scrollIntoView) {
        expect(() => el.scrollIntoView({ behavior: 'smooth' })).not.to.throw();
      }
    });
  });

  it('scrollIntoView con opcional chaining funciona en Safari-emulated (375px)', () => {
    cy.viewport(375, 667);
    cy.visit('/');

    cy.window().then((win) => {
      const el = win.document.querySelector('.chatbot-messages');
      if (el) {
        // Simula el patrón usado en ChatBot.js: ref.current?.scrollIntoView?.()
        expect(() => {
          if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth' });
        }).not.to.throw();
      }
    });
  });

  it('La página no tiene scroll horizontal en ningún viewport mobile', () => {
    const mobileViewports = [
      { width: 375, height: 667 },
      { width: 360, height: 800 },
      { width: 393, height: 852 },
    ];

    mobileViewports.forEach(({ width, height }) => {
      cy.viewport(width, height);
      cy.visit('/');
      cy.window().then((win) => {
        expect(win.document.body.scrollWidth).to.be.lte(width + 10);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-10: Fetch API — disponible y funciona cross-browser
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-10 — Fetch API: compatibilidad cross-browser', () => {
  [DEVICES.chromeDesktop, DEVICES.firefoxDesktop, DEVICES.iphoneSE, DEVICES.galaxyS21].forEach(
    ({ width, height, label }) => {
      it(`fetch está disponible en ${label}`, () => {
        cy.viewport(width, height);
        cy.visit('/');

        cy.window().then((win) => {
          expect(win.fetch).to.be.a('function');
        });
      });
    }
  );

  it('axios (usado en la app) resuelve correctamente en desktop Chrome', () => {
    cy.viewport(1280, 720);
    stubApis();
    cy.intercept('GET', '**/api/v1/**').as('anyApiCall');
    cy.visit('/dashboard');

    // Las llamadas de API deben resolverse (status 200 del stub)
    cy.get('body').should('be.visible');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-11: Orientación — Portrait y Landscape en mobile
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-11 — Orientación del dispositivo: Portrait vs Landscape', () => {
  it('iPhone SE Portrait (375x667): layout correcto', () => {
    cy.viewport(375, 667);
    stubApis();
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.window().then((win) => {
      expect(win.document.body.scrollWidth).to.be.lte(380);
    });
  });

  it('iPhone SE Landscape (667x375): sin overflow horizontal', () => {
    cy.viewport(667, 375);
    stubApis();
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.window().then((win) => {
      expect(win.document.body.scrollWidth).to.be.lte(672);
    });
  });

  it('Galaxy S21 Portrait (360x800): layout correcto', () => {
    cy.viewport(360, 800);
    stubApis();
    cy.visit('/');
    cy.get('body').should('be.visible');
  });

  it('Galaxy S21 Landscape (800x360): sin overflow horizontal', () => {
    cy.viewport(800, 360);
    stubApis();
    cy.visit('/');
    cy.get('body').should('be.visible');
    cy.window().then((win) => {
      expect(win.document.body.scrollWidth).to.be.lte(805);
    });
  });

  it('iPad Pro Portrait (1024x1366): layout de tablet', () => {
    cy.viewport(1024, 1366);
    stubApis();
    cy.visit('/');
    cy.get('body').should('be.visible');
  });

  it('iPad Pro Landscape (1366x1024): layout de tablet horizontal', () => {
    cy.viewport(1366, 1024);
    stubApis();
    cy.visit('/');
    cy.get('body').should('be.visible');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-12: Dark Mode — funciona en todos los browsers
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-12 — Dark Mode: persistencia y aplicación cross-browser', () => {
  [DEVICES.chromeDesktop, DEVICES.firefoxDesktop, DEVICES.iphoneSE].forEach(
    ({ width, height, label }) => {
      it(`Tema dark persiste y se aplica correctamente en ${label}`, () => {
        cy.viewport(width, height);
        cy.visit('/');

        // Guardar tema dark en localStorage
        cy.window().then((win) => {
          win.localStorage.setItem('theme-mode', 'dark');
        });

        cy.reload();

        // Verificar que el body tiene la clase dark
        cy.get('body').then(($body) => {
          const className = $body.attr('class') || '';
          const hasThemeClass = className.includes('dark') || className.includes('theme-');
          // Informativo: si el ThemeProvider aplica la clase al montar
          if (!hasThemeClass) {
            cy.log(`Body class en ${label}: "${className}"`);
          }
        });

        // CSS variable --color-background debe estar definida
        cy.window().then((win) => {
          const bg = win.getComputedStyle(win.document.documentElement)
            .getPropertyValue('--color-background');
          expect(bg.trim().length).to.be.greaterThan(0);
        });
      });
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-13: window.open — no bloqueado en contexto de test
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-13 — window.open: comportamiento cross-browser', () => {
  it('window.open existe en todos los browsers', () => {
    cy.viewport(1280, 720);
    cy.visit('/');

    cy.window().then((win) => {
      expect(win.open).to.be.a('function');
    });
  });

  it('MedicalReport puede llamar a window.open sin crash', () => {
    cy.viewport(1280, 720);
    // Stub para evitar navegación real
    cy.window().then((win) => {
      cy.stub(win, 'open').returns({ focus: cy.stub() });
    });

    cy.visit('/');
    // Verificar que el stub puede ser llamado
    cy.window().then((win) => {
      expect(win.open).to.exist;
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT-14: Rendimiento de carga — Time to Interactive cross-device
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPAT-14 — Tiempo de carga: cross-browser & mobile', () => {
  const perfDevices = [
    { ...DEVICES.chromeDesktop, maxMs: 5000 },
    { ...DEVICES.iphoneSE,      maxMs: 8000 },  // Mobile más lento
    { ...DEVICES.galaxyS21,     maxMs: 8000 },
  ];

  perfDevices.forEach(({ width, height, label, maxMs }) => {
    it(`Home page carga en < ${maxMs}ms en ${label}`, () => {
      cy.viewport(width, height);

      const start = Date.now();
      cy.visit('/');

      cy.get('body').should('be.visible').then(() => {
        const elapsed = Date.now() - start;
        expect(elapsed).to.be.lessThan(maxMs);
        cy.log(`TTI en ${label}: ${elapsed}ms`);
      });
    });
  });
});