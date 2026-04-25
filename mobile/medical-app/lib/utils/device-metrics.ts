/**
 * Utilidades para mediciones reales de performance en dispositivos
 * 
 * Mide:
 * - Tiempo de carga de páginas
 * - Frame rate (FPS)
 * - Uso de memoria
 * - Tiempo de interacción (TTI)
 * - Largest Contentful Paint (LCP)
 * - First Input Delay (FID)
 */

interface PerformanceMetrics {
  pageLoadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  frameRate: number;
  memoryUsage: number;
  timestamp: number;
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  connectionType?: string;
  effectiveType?: string;
}

class DeviceMetricsCollector {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fps = 60;

  /**
   * Inicializa la recolección de métricas
   */
  startCollection(): void {
    if (typeof window === 'undefined') return;

    // Medir tiempo de carga
    this.measurePageLoad();
    
    // Medir LCP
    this.measureLCP();
    
    // Medir FID
    this.measureFID();
    
    // Medir frame rate
    this.measureFrameRate();
    
    // Medir memoria (si está disponible)
    this.measureMemory();
  }

  /**
   * Mide el tiempo de carga de la página
   */
  private measurePageLoad(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        const timeToInteractive = navigation.domInteractive - navigation.fetchStart;
        const firstContentfulPaint = navigation.domContentLoadedEventEnd - navigation.fetchStart;

        this.recordMetric({
          pageLoadTime,
          timeToInteractive,
          firstContentfulPaint,
          largestContentfulPaint: 0,
          firstInputDelay: 0,
          frameRate: this.fps,
          memoryUsage: 0,
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Mide Largest Contentful Paint (LCP)
   */
  private measureLCP(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        
        this.updateMetric({ largestContentfulPaint: lcp });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('LCP measurement not supported:', error);
    }
  }

  /**
   * Mide First Input Delay (FID)
   */
  private measureFID(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          this.updateMetric({ firstInputDelay: fid });
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FID measurement not supported:', error);
    }
  }

  /**
   * Mide frame rate (FPS)
   */
  private measureFrameRate(): void {
    if (typeof window === 'undefined') return;

    let lastTime = performance.now();
    let frames = 0;

    const measure = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        this.fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
        
        this.updateMetric({ frameRate: this.fps });
      }
      
      requestAnimationFrame(measure);
    };

    requestAnimationFrame(measure);
  }

  /**
   * Mide uso de memoria (si está disponible)
   */
  private measureMemory(): void {
    if (typeof window === 'undefined') return;

    const measure = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize;
        this.updateMetric({ memoryUsage });
      }
    };

    // Medir cada 5 segundos
    setInterval(measure, 5000);
    measure(); // Medición inicial
  }

  /**
   * Registra una nueva métrica
   */
  private recordMetric(metric: Partial<PerformanceMetrics>): void {
    const fullMetric: PerformanceMetrics = {
      pageLoadTime: 0,
      timeToInteractive: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      frameRate: 60,
      memoryUsage: 0,
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.push(fullMetric);
    
    // Mantener solo las últimas 100 métricas
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  /**
   * Actualiza la última métrica
   */
  private updateMetric(updates: Partial<PerformanceMetrics>): void {
    if (this.metrics.length === 0) {
      this.recordMetric(updates);
      return;
    }

    const lastMetric = this.metrics[this.metrics.length - 1];
    Object.assign(lastMetric, updates);
  }

  /**
   * Obtiene información del dispositivo
   */
  getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'unknown',
        platform: 'unknown',
        screenWidth: 0,
        screenHeight: 0,
        devicePixelRatio: 1
      };
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      connectionType: connection?.type,
      effectiveType: connection?.effectiveType
    };
  }

  /**
   * Obtiene las métricas actuales
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Obtiene las métricas más recientes
   */
  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Obtiene estadísticas de las métricas
   */
  getStats(): {
    avgPageLoadTime: number;
    avgTimeToInteractive: number;
    avgFrameRate: number;
    avgMemoryUsage: number;
    minFrameRate: number;
    maxMemoryUsage: number;
  } {
    if (this.metrics.length === 0) {
      return {
        avgPageLoadTime: 0,
        avgTimeToInteractive: 0,
        avgFrameRate: 60,
        avgMemoryUsage: 0,
        minFrameRate: 60,
        maxMemoryUsage: 0
      };
    }

    const pageLoadTimes = this.metrics.map(m => m.pageLoadTime).filter(t => t > 0);
    const ttiTimes = this.metrics.map(m => m.timeToInteractive).filter(t => t > 0);
    const frameRates = this.metrics.map(m => m.frameRate);
    const memoryUsages = this.metrics.map(m => m.memoryUsage).filter(m => m > 0);

    return {
      avgPageLoadTime: pageLoadTimes.length > 0 
        ? pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length 
        : 0,
      avgTimeToInteractive: ttiTimes.length > 0
        ? ttiTimes.reduce((a, b) => a + b, 0) / ttiTimes.length
        : 0,
      avgFrameRate: frameRates.reduce((a, b) => a + b, 0) / frameRates.length,
      avgMemoryUsage: memoryUsages.length > 0
        ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
        : 0,
      minFrameRate: Math.min(...frameRates),
      maxMemoryUsage: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0
    };
  }

  /**
   * Exporta métricas a JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      deviceInfo: this.getDeviceInfo(),
      metrics: this.metrics,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Limpia observadores
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Instancia singleton
export const deviceMetrics = new DeviceMetricsCollector();

// Inicializar automáticamente en el cliente
if (typeof window !== 'undefined') {
  deviceMetrics.startCollection();
}

/**
 * Hook para usar métricas en componentes React
 */
export function useDeviceMetrics() {
  if (typeof window === 'undefined') {
    return {
      metrics: null,
      deviceInfo: null,
      stats: null
    };
  }

  return {
    metrics: deviceMetrics.getLatestMetrics(),
    deviceInfo: deviceMetrics.getDeviceInfo(),
    stats: deviceMetrics.getStats()
  };
}

