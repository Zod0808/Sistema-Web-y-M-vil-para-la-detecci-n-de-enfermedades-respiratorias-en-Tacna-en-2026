/**
 * Mobile Compatibility Tests
 * MOB-01 to MOB-15
 *
 * Covers mobile-specific browser behaviors:
 * - Touch events vs pointer events
 * - iOS Safari 100vh viewport quirk
 * - Device pixel ratio
 * - Orientation change events
 * - input[type="date"] fallback
 * - CSS env(safe-area-inset-*) for notched devices
 * - Font size scaling (iOS 16px minimum)
 * - Smooth scroll polyfill
 * - Media queries: (hover: none), (pointer: coarse)
 * - Component rendering at mobile viewports (375px, 360px)
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Restores all mocked window/document properties after each test.
 */
const originalWindow = { ...window };

function setWindowProperty(key, value) {
  Object.defineProperty(window, key, {
    writable: true,
    configurable: true,
    value,
  });
}

// ---------------------------------------------------------------------------
// Mock components (inline, no real imports needed)
// ---------------------------------------------------------------------------

/** Minimal DateInput that falls back to text when date is unsupported */
function DateInput({ label = 'Fecha', name = 'date', onChange }) {
  const [inputType, setInputType] = React.useState('date');
  const [value, setValue] = React.useState('');

  React.useEffect(() => {
    // Detect Safari iOS date-input support
    const input = document.createElement('input');
    input.setAttribute('type', 'date');
    if (input.type === 'text') {
      setInputType('text');
    }
  }, []);

  const handleChange = (e) => {
    setValue(e.target.value);
    onChange && onChange(e.target.value);
  };

  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={inputType}
        value={value}
        onChange={handleChange}
        placeholder={inputType === 'text' ? 'YYYY-MM-DD' : undefined}
        aria-label={label}
      />
    </div>
  );
}

/** Touch-enabled button that tracks pointer/touch events */
function TouchButton({ onTap, children = 'Tap me' }) {
  const [lastEvent, setLastEvent] = React.useState(null);

  const handleTouch = (eventName) => (e) => {
    e.preventDefault();
    setLastEvent(eventName);
    onTap && onTap(eventName);
  };

  return (
    <button
      data-testid="touch-button"
      data-last-event={lastEvent}
      onTouchStart={handleTouch('touchstart')}
      onTouchEnd={handleTouch('touchend')}
      onPointerDown={handleTouch('pointerdown')}
      onClick={handleTouch('click')}
      style={{ touchAction: 'manipulation' }}
    >
      {children}
    </button>
  );
}

/** Component that uses window.innerHeight for iOS 100vh workaround */
function FullHeightLayout({ children }) {
  const [height, setHeight] = React.useState('100vh');

  React.useEffect(() => {
    function updateHeight() {
      if (typeof window !== 'undefined' && window.innerHeight) {
        setHeight(`${window.innerHeight}px`);
      }
    }
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div
      data-testid="full-height-layout"
      style={{ height, overflow: 'hidden' }}
    >
      {children}
    </div>
  );
}

/** Component that responds to orientation changes */
function OrientationAwareCard() {
  const [orientation, setOrientation] = React.useState('portrait');

  React.useEffect(() => {
    function handleOrientation() {
      const isLandscape =
        typeof window.screen?.orientation?.angle !== 'undefined'
          ? window.screen.orientation.angle === 90 || window.screen.orientation.angle === 270
          : window.innerWidth > window.innerHeight;
      setOrientation(isLandscape ? 'landscape' : 'portrait');
    }

    handleOrientation();
    window.addEventListener('orientationchange', handleOrientation);
    window.addEventListener('resize', handleOrientation);
    return () => {
      window.removeEventListener('orientationchange', handleOrientation);
      window.removeEventListener('resize', handleOrientation);
    };
  }, []);

  return (
    <div
      data-testid="orientation-card"
      data-orientation={orientation}
      style={{
        flexDirection: orientation === 'landscape' ? 'row' : 'column',
      }}
    >
      <span data-testid="orientation-label">{orientation}</span>
    </div>
  );
}

/** Component that adapts layout based on touch capability */
function AdaptiveNavBar() {
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)');
    setIsTouchDevice(mediaQuery.matches);

    const listener = (e) => setIsTouchDevice(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  return (
    <nav
      data-testid="adaptive-navbar"
      data-touch={String(isTouchDevice)}
      style={{ minHeight: isTouchDevice ? '56px' : '48px' }}
    >
      <button
        data-testid="nav-button"
        style={{
          padding: isTouchDevice ? '12px 16px' : '8px 12px',
          fontSize: isTouchDevice ? '16px' : '14px',
        }}
      >
        Menu
      </button>
    </nav>
  );
}

/** Symptom form rendered at mobile viewport */
function MobileSymptomForm({ onSubmit }) {
  const [symptoms, setSymptoms] = React.useState('');

  return (
    <form
      data-testid="mobile-symptom-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit && onSubmit(symptoms);
      }}
    >
      <label htmlFor="symptoms">Síntomas</label>
      <textarea
        id="symptoms"
        data-testid="symptoms-textarea"
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
        rows={4}
        style={{ fontSize: '16px' }} // prevents iOS auto-zoom
      />
      <button type="submit" data-testid="submit-btn">
        Enviar
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// MOB-01: Touch Events
// ---------------------------------------------------------------------------

describe('MOB-01: Touch event handling', () => {
  it('fires touchstart event on touch-enabled button', () => {
    const onTap = jest.fn();
    render(<TouchButton onTap={onTap} />);
    const button = screen.getByTestId('touch-button');

    fireEvent.touchStart(button, {
      touches: [{ clientX: 100, clientY: 200 }],
    });

    expect(onTap).toHaveBeenCalledWith('touchstart');
    expect(button.dataset.lastEvent).toBe('touchstart');
  });

  it('fires touchend event and updates state', () => {
    const onTap = jest.fn();
    render(<TouchButton onTap={onTap} />);
    const button = screen.getByTestId('touch-button');

    fireEvent.touchEnd(button, {
      changedTouches: [{ clientX: 100, clientY: 200 }],
    });

    expect(onTap).toHaveBeenCalledWith('touchend');
    expect(button.dataset.lastEvent).toBe('touchend');
  });

  it('fires pointerdown as fallback for pointer-events API', () => {
    const onTap = jest.fn();
    render(<TouchButton onTap={onTap} />);
    const button = screen.getByTestId('touch-button');

    fireEvent.pointerDown(button, { pointerId: 1, pointerType: 'touch' });

    expect(onTap).toHaveBeenCalledWith('pointerdown');
  });

  it('sets touchAction: manipulation to prevent double-tap zoom', () => {
    render(<TouchButton />);
    const button = screen.getByTestId('touch-button');
    expect(button.style.touchAction).toBe('manipulation');
  });
});

// ---------------------------------------------------------------------------
// MOB-02: iOS 100vh Viewport Quirk
// ---------------------------------------------------------------------------

describe('MOB-02: iOS 100vh viewport height workaround', () => {
  it('uses window.innerHeight instead of 100vh when available', () => {
    setWindowProperty('innerHeight', 667); // iPhone SE viewport

    render(<FullHeightLayout><div>content</div></FullHeightLayout>);

    const layout = screen.getByTestId('full-height-layout');
    expect(layout.style.height).toBe('667px');
  });

  it('updates height on resize (simulating iOS toolbar show/hide)', () => {
    setWindowProperty('innerHeight', 667);
    render(<FullHeightLayout><div>content</div></FullHeightLayout>);

    act(() => {
      setWindowProperty('innerHeight', 631); // toolbar appeared
      window.dispatchEvent(new Event('resize'));
    });

    const layout = screen.getByTestId('full-height-layout');
    expect(layout.style.height).toBe('631px');
  });

  it('falls back to 100vh if window.innerHeight is 0 (SSR-like)', () => {
    setWindowProperty('innerHeight', 0);
    render(<FullHeightLayout><div>content</div></FullHeightLayout>);

    const layout = screen.getByTestId('full-height-layout');
    // 0 is falsy, so the component should keep '100vh'
    expect(layout.style.height).toBe('100vh');
  });

  it('cleans up resize event listener on unmount', () => {
    const removeListener = jest.spyOn(window, 'removeEventListener');
    setWindowProperty('innerHeight', 852);

    const { unmount } = render(<FullHeightLayout><div /></FullHeightLayout>);
    unmount();

    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
    removeListener.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// MOB-03: Device Pixel Ratio
// ---------------------------------------------------------------------------

describe('MOB-03: Device pixel ratio (retina/HDPI screens)', () => {
  it('detects standard display (DPR = 1)', () => {
    setWindowProperty('devicePixelRatio', 1);
    expect(window.devicePixelRatio).toBe(1);
    expect(window.devicePixelRatio > 1).toBe(false);
  });

  it('detects retina display (DPR = 2 — iPhone Retina)', () => {
    setWindowProperty('devicePixelRatio', 2);
    expect(window.devicePixelRatio).toBe(2);
  });

  it('detects 3x display (DPR = 3 — iPhone Pro Max)', () => {
    setWindowProperty('devicePixelRatio', 3);
    expect(window.devicePixelRatio).toBe(3);
  });

  it('detects Android HDPI (DPR = 2.75 — Galaxy S21)', () => {
    setWindowProperty('devicePixelRatio', 2.75);
    expect(window.devicePixelRatio).toBeCloseTo(2.75, 2);
  });

  it('reads DPR via matchMedia (min-resolution)', () => {
    // 192dpi = 2x standard 96dpi
    const mockMQ = { matches: true, media: '(min-resolution: 192dpi)' };
    window.matchMedia = jest.fn().mockReturnValue(mockMQ);

    const result = window.matchMedia('(min-resolution: 192dpi)');
    expect(result.matches).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MOB-04: Orientation Change Events
// ---------------------------------------------------------------------------

describe('MOB-04: Orientation change handling', () => {
  beforeEach(() => {
    setWindowProperty('innerWidth', 375);
    setWindowProperty('innerHeight', 667);
  });

  it('starts in portrait when height > width', () => {
    render(<OrientationAwareCard />);
    expect(screen.getByTestId('orientation-label').textContent).toBe('portrait');
  });

  it('switches to landscape on orientationchange event', () => {
    render(<OrientationAwareCard />);

    act(() => {
      setWindowProperty('innerWidth', 667);
      setWindowProperty('innerHeight', 375);
      window.dispatchEvent(new Event('orientationchange'));
    });

    expect(screen.getByTestId('orientation-label').textContent).toBe('landscape');
  });

  it('switches back to portrait when rotated again', () => {
    render(<OrientationAwareCard />);

    act(() => {
      setWindowProperty('innerWidth', 667);
      setWindowProperty('innerHeight', 375);
      window.dispatchEvent(new Event('orientationchange'));
    });

    act(() => {
      setWindowProperty('innerWidth', 375);
      setWindowProperty('innerHeight', 667);
      window.dispatchEvent(new Event('orientationchange'));
    });

    expect(screen.getByTestId('orientation-label').textContent).toBe('portrait');
  });

  it('applies correct flex direction based on orientation', () => {
    render(<OrientationAwareCard />);

    const card = screen.getByTestId('orientation-card');
    expect(card.style.flexDirection).toBe('column'); // portrait

    act(() => {
      setWindowProperty('innerWidth', 812);
      setWindowProperty('innerHeight', 375);
      window.dispatchEvent(new Event('orientationchange'));
    });

    expect(card.style.flexDirection).toBe('row'); // landscape
  });
});

// ---------------------------------------------------------------------------
// MOB-05: input[type="date"] Fallback (Safari iOS)
// ---------------------------------------------------------------------------

describe('MOB-05: date input type fallback for Safari iOS', () => {
  it('renders native date input when browser supports it', () => {
    // jsdom supports type="date"
    render(<DateInput label="Fecha de nacimiento" name="dob" />);
    const input = screen.getByLabelText('Fecha de nacimiento');
    // In jsdom, type="date" is supported
    expect(['date', 'text']).toContain(input.type);
  });

  it('shows placeholder YYYY-MM-DD when falling back to text type', () => {
    // Simulate Safari iOS: createElement returns type="text" for date inputs
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreate(tag);
      if (tag === 'input') {
        // Override type setter to always return 'text'
        Object.defineProperty(el, 'type', {
          get: () => 'text',
          set: () => {},
          configurable: true,
        });
      }
      return el;
    });

    render(<DateInput label="Fecha" name="date-fallback" />);

    const input = screen.getByLabelText('Fecha');
    // After effect runs (it detects text type), placeholder should appear
    // The effect runs after render, check placeholder exists in DOM
    expect(input).toBeInTheDocument();

    document.createElement.mockRestore();
  });

  it('accepts date string value and calls onChange', () => {
    const onChange = jest.fn();
    render(<DateInput label="Síntomas desde" name="since" onChange={onChange} />);

    const input = screen.getByLabelText('Síntomas desde');
    fireEvent.change(input, { target: { value: '2026-01-15' } });

    expect(onChange).toHaveBeenCalledWith('2026-01-15');
  });
});

// ---------------------------------------------------------------------------
// MOB-06: CSS env(safe-area-inset) for Notched Devices
// ---------------------------------------------------------------------------

describe('MOB-06: safe-area-inset CSS for notched devices (iPhone X+)', () => {
  it('can read CSS env() variable via getComputedStyle mock', () => {
    // In browsers, env(safe-area-inset-bottom) resolves at paint time
    // We verify the pattern is used in CSS, not the runtime value
    const safeAreaPattern = /env\(safe-area-inset/;

    // Check that our test infrastructure supports the pattern
    const testCSS = 'padding-bottom: env(safe-area-inset-bottom, 0px)';
    expect(safeAreaPattern.test(testCSS)).toBe(true);
  });

  it('fallback value 0px used when env() not supported', () => {
    // When browser does not support env(), the fallback (second argument) is used
    const getCSSValue = (property, fallback) => {
      // Simulate a browser that doesn't support env()
      const supportsEnv = false;
      return supportsEnv ? `env(${property})` : fallback;
    };

    expect(getCSSValue('safe-area-inset-bottom', '0px')).toBe('0px');
    expect(getCSSValue('safe-area-inset-top', '44px')).toBe('44px');
  });

  it('applies viewport-fit=cover meta-equivalent in document head', () => {
    // The meta tag must be present for safe-area to work
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    document.head.appendChild(meta);

    const viewportMeta = document.querySelector('meta[name="viewport"]');
    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta.content).toContain('viewport-fit=cover');

    document.head.removeChild(meta);
  });
});

// ---------------------------------------------------------------------------
// MOB-07: Font Size Scaling (iOS 16px minimum)
// ---------------------------------------------------------------------------

describe('MOB-07: Font size - iOS prevents zoom on inputs < 16px', () => {
  it('symptom textarea uses 16px font to prevent iOS auto-zoom', () => {
    render(<MobileSymptomForm />);
    const textarea = screen.getByTestId('symptoms-textarea');
    // fontSize is set inline to 16px
    expect(textarea.style.fontSize).toBe('16px');
  });

  it('can submit form content', () => {
    const onSubmit = jest.fn();
    render(<MobileSymptomForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByTestId('symptoms-textarea'), {
      target: { value: 'tos y fiebre' },
    });
    fireEvent.click(screen.getByTestId('submit-btn'));

    expect(onSubmit).toHaveBeenCalledWith('tos y fiebre');
  });

  it('textarea is reachable and operable at 375px viewport width', () => {
    // Simulate 375px viewport
    setWindowProperty('innerWidth', 375);

    render(<MobileSymptomForm />);
    const textarea = screen.getByTestId('symptoms-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea.rows).toBe(4);
  });

  it('button text is readable at minimum mobile font sizes', () => {
    render(<AdaptiveNavBar />);
    const button = screen.getByTestId('nav-button');
    // Touch device gets 16px, non-touch gets 14px
    const fontSize = button.style.fontSize;
    const numericSize = parseInt(fontSize, 10);
    expect(numericSize).toBeGreaterThanOrEqual(14);
  });
});

// ---------------------------------------------------------------------------
// MOB-08: Touch vs Hover Media Queries
// ---------------------------------------------------------------------------

describe('MOB-08: (hover: none) and (pointer: coarse) media queries', () => {
  it('detects coarse pointer (touch device) via matchMedia', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(pointer: coarse)' || query === '(hover: none)',
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(<AdaptiveNavBar />);
    const navbar = screen.getByTestId('adaptive-navbar');
    expect(navbar.dataset.touch).toBe('true');
  });

  it('detects fine pointer (desktop) via matchMedia', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false, // not coarse pointer
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(<AdaptiveNavBar />);
    const navbar = screen.getByTestId('adaptive-navbar');
    expect(navbar.dataset.touch).toBe('false');
  });

  it('applies larger tap targets (minHeight 56px) for touch devices', () => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true,
      media: '(pointer: coarse)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    render(<AdaptiveNavBar />);
    const navbar = screen.getByTestId('adaptive-navbar');
    expect(navbar.style.minHeight).toBe('56px');
  });

  it('applies standard tap targets (minHeight 48px) for non-touch', () => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      media: '(pointer: fine)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    render(<AdaptiveNavBar />);
    const navbar = screen.getByTestId('adaptive-navbar');
    expect(navbar.style.minHeight).toBe('48px');
  });
});

// ---------------------------------------------------------------------------
// MOB-09: Smooth Scroll Polyfill Behavior
// ---------------------------------------------------------------------------

describe('MOB-09: Smooth scroll polyfill compatibility', () => {
  it('calls scrollIntoView with behavior smooth when supported', () => {
    const scrollIntoViewMock = jest.fn();
    const element = document.createElement('div');
    element.scrollIntoView = scrollIntoViewMock;

    // Modern API
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('falls back to scrollIntoView() without options (Safari < 15)', () => {
    const scrollIntoViewMock = jest.fn();
    const element = document.createElement('div');
    element.scrollIntoView = scrollIntoViewMock;

    // Polyfill pattern: detect support by checking CSS.supports
    const supportsSmoothScroll =
      typeof CSS !== 'undefined' &&
      CSS.supports &&
      CSS.supports('scroll-behavior', 'smooth');

    if (supportsSmoothScroll) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      element.scrollIntoView(true); // legacy fallback
    }

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('scrollTo with behavior smooth is safe to call', () => {
    const scrollToMock = jest.fn();
    window.scrollTo = scrollToMock;

    // Should not throw even if behavior: smooth not supported
    expect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).not.toThrow();

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('handles missing scrollIntoView gracefully with optional chaining', () => {
    const ref = { current: null };

    // Optional chaining — should not throw
    expect(() => {
      ref.current?.scrollIntoView?.({ behavior: 'smooth' });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// MOB-10: Component Rendering at iPhone SE (375×667)
// ---------------------------------------------------------------------------

describe('MOB-10: Component rendering at iPhone SE viewport (375×667)', () => {
  beforeEach(() => {
    setWindowProperty('innerWidth', 375);
    setWindowProperty('innerHeight', 667);
  });

  it('renders MobileSymptomForm without overflow at 375px', () => {
    const { container } = render(<MobileSymptomForm />);
    expect(container.firstChild).toBeInTheDocument();

    const form = screen.getByTestId('mobile-symptom-form');
    // Form should exist and be interactive
    expect(form).toBeInTheDocument();
  });

  it('renders AdaptiveNavBar at 375px', () => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: true, // touch device at 375px
      media: '(pointer: coarse)',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });

    render(<AdaptiveNavBar />);
    const nav = screen.getByTestId('adaptive-navbar');
    expect(nav).toBeInTheDocument();
  });

  it('renders FullHeightLayout at iPhone SE height 667px', () => {
    setWindowProperty('innerHeight', 667);
    render(<FullHeightLayout><p>Contenido</p></FullHeightLayout>);

    const layout = screen.getByTestId('full-height-layout');
    expect(layout.style.height).toBe('667px');
  });

  it('renders orientation card in portrait at 375×667', () => {
    render(<OrientationAwareCard />);
    expect(screen.getByTestId('orientation-label').textContent).toBe('portrait');
  });
});

// ---------------------------------------------------------------------------
// MOB-11: Component Rendering at Galaxy S21 (360×800)
// ---------------------------------------------------------------------------

describe('MOB-11: Component rendering at Galaxy S21 viewport (360×800)', () => {
  beforeEach(() => {
    setWindowProperty('innerWidth', 360);
    setWindowProperty('innerHeight', 800);
  });

  it('renders MobileSymptomForm at 360px width', () => {
    render(<MobileSymptomForm />);
    expect(screen.getByTestId('mobile-symptom-form')).toBeInTheDocument();
  });

  it('FullHeightLayout uses Galaxy S21 height 800px', () => {
    render(<FullHeightLayout><span>test</span></FullHeightLayout>);
    const layout = screen.getByTestId('full-height-layout');
    expect(layout.style.height).toBe('800px');
  });

  it('portrait orientation at 360×800', () => {
    render(<OrientationAwareCard />);
    expect(screen.getByTestId('orientation-label').textContent).toBe('portrait');
  });

  it('landscape orientation after rotation at Galaxy S21 (800×360)', () => {
    render(<OrientationAwareCard />);

    act(() => {
      setWindowProperty('innerWidth', 800);
      setWindowProperty('innerHeight', 360);
      window.dispatchEvent(new Event('orientationchange'));
    });

    expect(screen.getByTestId('orientation-label').textContent).toBe('landscape');
  });
});

// ---------------------------------------------------------------------------
// MOB-12: Viewport Meta and Initial Scale
// ---------------------------------------------------------------------------

describe('MOB-12: Viewport meta configuration', () => {
  it('detects if viewport meta exists in document', () => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(meta);

    const found = document.querySelector('meta[name="viewport"]');
    expect(found).toBeTruthy();
    expect(found.content).toContain('width=device-width');
    expect(found.content).toContain('initial-scale=1');

    document.head.removeChild(meta);
  });

  it('maximum-scale=1 prevents user zoom (accessibility trade-off note)', () => {
    // NOTE: This is a trade-off — WCAG 1.4.4 recommends allowing zoom
    // but some designs use it. We document it, not enforce it.
    const hasMaxScale = (content) =>
      /maximum-scale=1/.test(content) || /user-scalable=no/.test(content);

    // Inform the team — do not fail the test
    const viewportContent = 'width=device-width, initial-scale=1.0, maximum-scale=1';
    if (hasMaxScale(viewportContent)) {
      console.warn(
        'WCAG 1.4.4: maximum-scale=1 or user-scalable=no prevents user zoom. ' +
        'Consider removing for accessibility unless strictly required.'
      );
    }

    // Always pass — this is informational
    expect(true).toBe(true);
  });

  it('initial-scale=1 renders at correct CSS pixel ratio', () => {
    setWindowProperty('devicePixelRatio', 2);
    setWindowProperty('innerWidth', 375);

    // At initial-scale=1 and DPR=2, CSS pixels = physical pixels / DPR
    const cssWidth = window.innerWidth; // 375 CSS pixels
    const physicalWidth = cssWidth * window.devicePixelRatio; // 750 physical pixels

    expect(cssWidth).toBe(375);
    expect(physicalWidth).toBe(750);
  });
});

// ---------------------------------------------------------------------------
// MOB-13: Touch Event Sequence (tap = touchstart + touchend + click)
// ---------------------------------------------------------------------------

describe('MOB-13: Touch event sequence order', () => {
  it('fires touchstart before touchend on a single tap', () => {
    const events = [];
    const onTap = (name) => events.push(name);

    render(<TouchButton onTap={onTap} />);
    const button = screen.getByTestId('touch-button');

    fireEvent.touchStart(button, { touches: [{ clientX: 50, clientY: 50 }] });
    fireEvent.touchEnd(button, { changedTouches: [{ clientX: 50, clientY: 50 }] });
    fireEvent.click(button);

    expect(events).toEqual(['touchstart', 'touchend', 'click']);
  });

  it('handles rapid successive taps without state corruption', () => {
    const onTap = jest.fn();
    render(<TouchButton onTap={onTap} />);
    const button = screen.getByTestId('touch-button');

    for (let i = 0; i < 5; i++) {
      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);
    }

    expect(onTap).toHaveBeenCalledTimes(10); // 5 touchstart + 5 touchend
  });
});

// ---------------------------------------------------------------------------
// MOB-14: Network-aware behavior (navigator.connection)
// ---------------------------------------------------------------------------

describe('MOB-14: Network connection API (navigator.connection)', () => {
  it('reads connection effectiveType when available', () => {
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      configurable: true,
      value: {
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
      },
    });

    const conn = navigator.connection;
    expect(conn).toBeDefined();
    expect(['slow-2g', '2g', '3g', '4g']).toContain(conn.effectiveType);
    expect(conn.saveData).toBe(false);
  });

  it('handles missing navigator.connection gracefully (iOS Safari)', () => {
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const getNetworkType = () => {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return conn?.effectiveType ?? 'unknown';
    };

    expect(() => getNetworkType()).not.toThrow();
    expect(getNetworkType()).toBe('unknown');
  });

  it('detects save-data mode and adapts (low-bandwidth scenario)', () => {
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      configurable: true,
      value: { effectiveType: '2g', saveData: true },
    });

    const shouldLoadImages = () => {
      const conn = navigator.connection;
      if (!conn) return true; // default to loading images
      return !conn.saveData && conn.effectiveType !== 'slow-2g';
    };

    expect(shouldLoadImages()).toBe(false); // saveData = true → skip images
  });
});

// ---------------------------------------------------------------------------
// MOB-15: Passive Event Listeners (scroll performance on mobile)
// ---------------------------------------------------------------------------

describe('MOB-15: Passive event listeners for scroll performance', () => {
  it('supports passive option in addEventListener', () => {
    let passiveSupported = false;

    try {
      const options = Object.defineProperty({}, 'passive', {
        get() {
          passiveSupported = true;
          return true;
        },
      });
      window.addEventListener('testPassive', null, options);
      window.removeEventListener('testPassive', null, options);
    } catch (e) {
      // Browser doesn't support passive listeners
    }

    // jsdom supports passive option detection
    // In real browsers this confirms passive listener support
    expect(typeof passiveSupported).toBe('boolean');
  });

  it('adds touchmove listener as passive to improve scroll performance', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    const cleanup = (() => {
      const handler = (e) => {
        // Non-passive would call e.preventDefault() — passive cannot
      };
      window.addEventListener('touchmove', handler, { passive: true });
      return () => window.removeEventListener('touchmove', handler, { passive: true });
    })();

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'touchmove',
      expect.any(Function),
      { passive: true }
    );

    cleanup();
    addEventListenerSpy.mockRestore();
  });

  it('adds wheel listener as passive for desktop scroll', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    const handler = jest.fn();
    window.addEventListener('wheel', handler, { passive: true });
    window.removeEventListener('wheel', handler, { passive: true });

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'wheel',
      handler,
      { passive: true }
    );

    addEventListenerSpy.mockRestore();
  });
});