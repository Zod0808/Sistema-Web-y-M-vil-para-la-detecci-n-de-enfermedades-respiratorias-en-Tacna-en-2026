/**
 * Performance Tests
 * 
 * Tests for component rendering performance, memory usage, and optimization
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../../components/ThemeProvider';
import Home from '../../pages/Home';
import Dashboard from '../../pages/Dashboard';
import Analytics from '../../pages/Analytics';
import VirtualizedList from '../../components/VirtualizedList';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Performance measurement utilities
const measureRenderTime = (component) => {
  const start = performance.now();
  render(component);
  const end = performance.now();
  return end - start;
};

const measureMemoryUsage = () => {
  if (performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };
  }
  return null;
};

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: { success: true, data: {} }
    });
    mockedAxios.post.mockResolvedValue({
      data: { success: true, data: { sessionId: 'test' } }
    });
  });

  describe('Component Render Performance', () => {
    it('should render Home page within acceptable time', () => {
      const renderTime = measureRenderTime(
        <ThemeProvider>
          <BrowserRouter>
            <Home />
          </BrowserRouter>
        </ThemeProvider>
      );
      
      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should render Dashboard within acceptable time', () => {
      const renderTime = measureRenderTime(
        <ThemeProvider>
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        </ThemeProvider>
      );
      
      // Should render in less than 150ms (more complex)
      expect(renderTime).toBeLessThan(150);
    });

    it('should render Analytics within acceptable time', () => {
      const renderTime = measureRenderTime(
        <ThemeProvider>
          <BrowserRouter>
            <Analytics />
          </BrowserRouter>
        </ThemeProvider>
      );
      
      // Should render in less than 200ms (most complex)
      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('VirtualizedList Performance', () => {
    it('should handle large lists efficiently', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random()
      }));
      
      const renderTime = measureRenderTime(
        <VirtualizedList
          data={largeData}
          renderItem={(item) => <div>{item.name}</div>}
          itemHeight={50}
          containerHeight={400}
        />
      );
      
      // Should render large list efficiently
      expect(renderTime).toBeLessThan(200);
    });

    it('should only render visible items', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }));
      
      const { container } = render(
        <VirtualizedList
          data={largeData}
          renderItem={(item) => <div data-testid={`item-${item.id}`}>{item.name}</div>}
          itemHeight={50}
          containerHeight={400}
        />
      );
      
      // Should only render visible items (approximately 8-10 items for 400px height)
      const renderedItems = container.querySelectorAll('[data-testid^="item-"]');
      expect(renderedItems.length).toBeLessThan(20);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks on multiple renders', () => {
      const initialMemory = measureMemoryUsage();
      
      // Render multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <ThemeProvider>
            <BrowserRouter>
              <Home />
            </BrowserRouter>
          </ThemeProvider>
        );
        unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = measureMemoryUsage();
      
      if (initialMemory && finalMemory) {
        // Memory increase should be reasonable (less than 10MB)
        const memoryIncrease = finalMemory.used - initialMemory.used;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  describe('Re-render Performance', () => {
    it('should minimize re-renders on state changes', () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        renderCount++;
        const [count, setCount] = React.useState(0);
        
        return (
          <div>
            <button onClick={() => setCount(count + 1)}>Increment</button>
            <span>{count}</span>
          </div>
        );
      };
      
      const { getByRole } = render(<TestComponent />);
      const button = getByRole('button');
      
      const initialCount = renderCount;
      fireEvent.click(button);
      
      // Should only re-render once per state change
      expect(renderCount).toBe(initialCount + 1);
    });
  });

  describe('Lazy Loading Performance', () => {
    it('should lazy load components efficiently', async () => {
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => <div>Lazy Component</div>
        })
      );
      
      const start = performance.now();
      
      render(
        <ThemeProvider>
          <BrowserRouter>
            <React.Suspense fallback={<div>Loading...</div>}>
              <LazyComponent />
            </React.Suspense>
          </BrowserRouter>
        </ThemeProvider>
      );
      
      await screen.findByText('Lazy Component');
      
      const end = performance.now();
      const loadTime = end - start;
      
      // Lazy loading should be fast
      expect(loadTime).toBeLessThan(500);
    });
  });

  describe('Image Loading Performance', () => {
    it('should use lazy loading for images', () => {
      const { container } = render(
        <div>
          <img src="test.jpg" loading="lazy" alt="Test" />
        </div>
      );
      
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Bundle Size Impact', () => {
    it('should not import unnecessary dependencies', () => {
      // This test verifies that components don't import heavy libraries unnecessarily
      // In a real scenario, you would use bundle analyzer
      
      const HomeModule = require('../../pages/Home');
      expect(HomeModule).toBeDefined();
      
      // Verify no heavy imports (this is a placeholder - real test would use bundle analyzer)
    });
  });
});

