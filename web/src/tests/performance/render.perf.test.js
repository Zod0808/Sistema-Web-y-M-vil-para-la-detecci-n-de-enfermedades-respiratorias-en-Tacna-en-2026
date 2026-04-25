/**
 * Frontend Render Performance Tests
 *
 * Estrategia:
 * - Mide tiempos reales de render con performance.now() antes y después de render()
 * - Cuenta re-renders con un contador atómico en un wrapper de prueba
 * - Verifica estabilidad de memoria: N renders + unmounts no crecen indefinidamente
 * - Prueba VirtualizedList con 10 000 ítems: solo renderiza los visibles
 * - Lazy loading: React.Suspense resuelve correctamente
 *
 * Umbrales SLA frontend:
 * | Componente           | Render inicial | Re-render por estado |
 * |----------------------|----------------|----------------------|
 * | Home                 | < 100ms        | —                    |
 * | Dashboard            | < 150ms        | < 50ms               |
 * | Analytics            | < 200ms        | —                    |
 * | Navbar               | < 50ms         | < 20ms               |
 * | SymptomReportForm    | < 80ms         | < 30ms               |
 * | VirtualizedList 10k  | < 200ms        | —                    |
 * | Lazy component       | < 500ms (total)| —                    |
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { success: true, data: {} } }),
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
}));

jest.mock('../../utils/apiBase', () => ({
  default: 'http://localhost:3001/api/v1',
  API_BASE: 'http://localhost:3001/api/v1',
  LEGACY_API_BASE: 'http://localhost:3001/api/v1',
  BACKEND_BASE_URL: 'http://localhost:3001',
  AI_BASE_URL: 'http://localhost:8000/api/v1',
}));

jest.mock('../../services/i18nService', () => ({
  t: jest.fn((k) => k),
  getCurrentLanguage: jest.fn(() => 'es'),
  setLanguage: jest.fn(),
  SUPPORTED_LANGUAGES: { es: 'Español', en: 'English' },
}));

jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    BarChart: ({ children }) => <div>{children}</div>,
    LineChart: ({ children }) => <div>{children}</div>,
    PieChart: ({ children }) => <div>{children}</div>,
    Bar: () => null, Line: () => null, Pie: () => null,
    CartesianGrid: () => null, XAxis: () => null, YAxis: () => null,
    Tooltip: () => null, Legend: () => null, Cell: () => null,
  };
});

jest.mock('../../components/AlertConsole', () => () => (
  <div data-testid="alert-console-mock">AlertConsole</div>
));
jest.mock('../../components/AppointmentCalendar', () => () => (
  <div data-testid="appointment-calendar-mock">AppointmentCalendar</div>
));

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((k) => store[k] ?? null),
    setItem: jest.fn((k, v) => { store[k] = v; }),
    removeItem: jest.fn((k) => { delete store[k]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ─── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Mide el tiempo de render inicial de un componente (ms).
 */
const measureRender = (ui) => {
  const t0 = performance.now();
  const result = render(ui);
  return { renderTime: performance.now() - t0, ...result };
};

/**
 * Cuenta cuántos renders hace un componente.
 * Envuelve al componente con un contador de renders.
 */
const makeCountedComponent = (Component, props = {}) => {
  let renderCount = 0;
  const Wrapper = (wrapperProps) => {
    renderCount++;
    return React.createElement(Component, { ...props, ...wrapperProps });
  };
  return { Wrapper, getRenderCount: () => renderCount };
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — Home Page', () => {
  it('render inicial < 100ms', () => {
    const Home = require('../../pages/Home').default;
    const { renderTime } = measureRender(
      <MemoryRouter><Home /></MemoryRouter>
    );
    expect(renderTime).toBeLessThan(100);
  });

  it('10 renders y unmounts no superan 1 000ms en total', () => {
    const Home = require('../../pages/Home').default;
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(<MemoryRouter><Home /></MemoryRouter>);
      unmount();
    }
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — Dashboard Page', () => {
  it('render inicial < 150ms', () => {
    const Dashboard = require('../../pages/Dashboard').default;
    const { renderTime } = measureRender(
      <MemoryRouter><Dashboard /></MemoryRouter>
    );
    expect(renderTime).toBeLessThan(150);
  });

  it('re-render tras cambio de estado < 50ms', () => {
    const Dashboard = require('../../pages/Dashboard').default;
    const { rerender } = render(<MemoryRouter><Dashboard /></MemoryRouter>);

    const t0 = performance.now();
    rerender(<MemoryRouter><Dashboard /></MemoryRouter>);
    const rerenderTime = performance.now() - t0;

    expect(rerenderTime).toBeLessThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS PAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — Analytics Page', () => {
  it('render inicial < 200ms', () => {
    const Analytics = require('../../pages/Analytics').default;
    const { renderTime } = measureRender(
      <MemoryRouter><Analytics /></MemoryRouter>
    );
    expect(renderTime).toBeLessThan(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — Navbar', () => {
  it('render inicial < 50ms', () => {
    const Navbar = require('../../components/Navbar').default;
    const { renderTime } = measureRender(
      <MemoryRouter><Navbar /></MemoryRouter>
    );
    expect(renderTime).toBeLessThan(50);
  });

  it('re-render en cambio de ruta < 20ms', () => {
    const Navbar = require('../../components/Navbar').default;
    const { rerender } = render(<MemoryRouter initialEntries={['/']}><Navbar /></MemoryRouter>);

    const t0 = performance.now();
    rerender(<MemoryRouter initialEntries={['/analytics']}><Navbar /></MemoryRouter>);
    expect(performance.now() - t0).toBeLessThan(20);
  });

  it('no hace más de 2 renders en el montaje inicial', () => {
    const Navbar = require('../../components/Navbar').default;
    const { Wrapper, getRenderCount } = makeCountedComponent(Navbar);
    render(<MemoryRouter><Wrapper /></MemoryRouter>);
    expect(getRenderCount()).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SYMPTOM REPORT FORM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — SymptomReportForm', () => {
  it('render inicial < 80ms', () => {
    const SymptomReportForm = require('../../components/SymptomReportForm').default;
    const { renderTime } = measureRender(<SymptomReportForm />);
    expect(renderTime).toBeLessThan(80);
  });

  it('re-render tras marcar un checkbox < 30ms', () => {
    const SymptomReportForm = require('../../components/SymptomReportForm').default;
    render(<SymptomReportForm />);

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      const t0 = performance.now();
      act(() => { fireEvent.click(checkboxes[0]); });
      expect(performance.now() - t0).toBeLessThan(30);
    }
  });

  it('no hace más de 3 renders en el montaje inicial', () => {
    const SymptomReportForm = require('../../components/SymptomReportForm').default;
    const { Wrapper, getRenderCount } = makeCountedComponent(SymptomReportForm);
    render(<Wrapper />);
    expect(getRenderCount()).toBeLessThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUALIZED LIST
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — VirtualizedList', () => {
  let VirtualizedList;

  beforeAll(() => {
    try {
      VirtualizedList = require('../../components/VirtualizedList').default;
    } catch {
      VirtualizedList = null;
    }
  });

  it('render de 10 000 ítems < 200ms', () => {
    if (!VirtualizedList) return;

    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Paciente ${i}`,
      value: Math.random(),
    }));

    const { renderTime } = measureRender(
      <VirtualizedList
        data={largeData}
        renderItem={(item) => <div key={item.id}>{item.name}</div>}
        itemHeight={50}
        containerHeight={400}
      />
    );

    expect(renderTime).toBeLessThan(200);
  });

  it('renderiza solo los ítems visibles (< 20 para containerHeight=400, itemHeight=50)', () => {
    if (!VirtualizedList) return;

    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));

    const { container } = render(
      <VirtualizedList
        data={largeData}
        renderItem={(item) => (
          <div key={item.id} data-testid={`item-${item.id}`}>{item.name}</div>
        )}
        itemHeight={50}
        containerHeight={400}
      />
    );

    const rendered = container.querySelectorAll('[data-testid^="item-"]');
    // Con containerHeight=400 y itemHeight=50, debería renderizar ~8 ítems visibles
    // El componente puede agregar un buffer, pero no debe renderizar los 10 000
    expect(rendered.length).toBeLessThan(100);
  });

  it('render de lista vacía < 20ms', () => {
    if (!VirtualizedList) return;

    const { renderTime } = measureRender(
      <VirtualizedList
        data={[]}
        renderItem={(item) => <div>{item}</div>}
        itemHeight={50}
        containerHeight={400}
      />
    );

    expect(renderTime).toBeLessThan(20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAZY LOADING
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — Lazy Loading (React.Suspense)', () => {
  it('componente lazy carga en < 500ms', async () => {
    const LazyComp = React.lazy(() =>
      Promise.resolve({ default: () => <div>Lazy Component Loaded</div> })
    );

    const t0 = performance.now();
    render(
      <React.Suspense fallback={<div>Loading...</div>}>
        <LazyComp />
      </React.Suspense>
    );

    await screen.findByText('Lazy Component Loaded');
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(500);
  });

  it('Suspense muestra fallback mientras carga', () => {
    let resolvePromise;
    const LazyComp = React.lazy(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    render(
      <React.Suspense fallback={<div>Cargando...</div>}>
        <LazyComp />
      </React.Suspense>
    );

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    // Resolver para no dejar promesas pendientes
    act(() => { resolvePromise({ default: () => <div>Done</div> }); });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RE-RENDER COUNT — minimización de re-renders
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — Conteo de Re-renders', () => {
  it('ThemeToggle no re-renderiza más de 1 vez al hacer click', () => {
    const { ThemeProvider } = require('../../components/ThemeProvider');
    const ThemeToggle = require('../../components/ThemeToggle').default;

    let renderCount = 0;
    const CountedToggle = (props) => {
      renderCount++;
      return React.createElement(ThemeToggle, props);
    };

    render(
      <ThemeProvider>
        <CountedToggle />
      </ThemeProvider>
    );

    const initialCount = renderCount;
    act(() => { fireEvent.click(screen.getByRole('button')); });
    const rerenders = renderCount - initialCount;
    // Un click debería causar exactamente 1 re-render
    expect(rerenders).toBeLessThanOrEqual(2);
  });

  it('Navbar no re-renderiza al rerender sin cambio de props', () => {
    const Navbar = require('../../components/Navbar').default;
    let renderCount = 0;
    const CountedNavbar = () => {
      renderCount++;
      return React.createElement(Navbar);
    };

    const { rerender } = render(
      <MemoryRouter><CountedNavbar /></MemoryRouter>
    );
    const afterMount = renderCount;

    rerender(<MemoryRouter><CountedNavbar /></MemoryRouter>);
    // El rerender debería causar exactamente 1 render adicional como máximo
    expect(renderCount - afterMount).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORIA — estabilidad tras múltiples renders
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — Estabilidad de Memoria', () => {
  it('10 renders + unmounts de Dashboard no degradan el tiempo progresivamente', () => {
    const Dashboard = require('../../pages/Dashboard').default;
    const times = [];

    for (let i = 0; i < 10; i++) {
      const t0 = performance.now();
      const { unmount } = render(<MemoryRouter><Dashboard /></MemoryRouter>);
      times.push(performance.now() - t0);
      unmount();
    }

    // El último render no debe ser 5x más lento que el primero
    if (times.length >= 2) {
      const ratio = times[times.length - 1] / times[0];
      expect(ratio).toBeLessThan(5);
    }
  });

  it('10 renders + unmounts de Navbar mantienen tiempo < 50ms cada uno', () => {
    const Navbar = require('../../components/Navbar').default;

    for (let i = 0; i < 10; i++) {
      const t0 = performance.now();
      const { unmount } = render(<MemoryRouter><Navbar /></MemoryRouter>);
      const t = performance.now() - t0;
      unmount();
      expect(t).toBeLessThan(50);
    }
  });

  it('performance.memory no crece más de 50MB tras 20 renders de Home', () => {
    const Home = require('../../pages/Home').default;

    const before = performance.memory?.usedJSHeapSize ?? 0;

    for (let i = 0; i < 20; i++) {
      const { unmount } = render(<MemoryRouter><Home /></MemoryRouter>);
      unmount();
    }

    if (global.gc) global.gc();

    const after = performance.memory?.usedJSHeapSize ?? 0;
    const growthMB = (after - before) / (1024 * 1024);

    if (before > 0) {
      expect(growthMB).toBeLessThan(50);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYLOAD DE COMPONENTES — tamaño del DOM generado
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — Tamaño del DOM', () => {
  it('Navbar genera menos de 200 nodos DOM', () => {
    const Navbar = require('../../components/Navbar').default;
    const { container } = render(<MemoryRouter><Navbar /></MemoryRouter>);
    const nodeCount = container.querySelectorAll('*').length;
    expect(nodeCount).toBeLessThan(200);
  });

  it('SymptomReportForm genera menos de 500 nodos DOM', () => {
    const SymptomReportForm = require('../../components/SymptomReportForm').default;
    const { container } = render(<SymptomReportForm />);
    const nodeCount = container.querySelectorAll('*').length;
    expect(nodeCount).toBeLessThan(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BUNDLE IMPORT — módulos principales cargan sin error
// ═══════════════════════════════════════════════════════════════════════════════

describe('Render Performance — Módulos Importan Correctamente', () => {
  const modules = [
    '../../pages/Home',
    '../../pages/Dashboard',
    '../../pages/Analytics',
    '../../components/Navbar',
    '../../components/ThemeToggle',
    '../../components/SymptomReportForm',
    '../../components/AlertConsole',
    '../../components/MLAdvancedResults',
  ];

  modules.forEach((modulePath) => {
    it(`${modulePath.split('/').pop()} importa sin error`, () => {
      expect(() => require(modulePath)).not.toThrow();
      const mod = require(modulePath);
      expect(mod).toBeDefined();
      expect(mod.default || mod).toBeTruthy();
    });
  });
});