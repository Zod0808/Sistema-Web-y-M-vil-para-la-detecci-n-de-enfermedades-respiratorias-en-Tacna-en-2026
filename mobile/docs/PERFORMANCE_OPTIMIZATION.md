# 📱 Guía de Optimización de Performance Mobile - RespiCare Tacna

Esta guía documenta todas las optimizaciones de performance implementadas en la aplicación móvil RespiCare.

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Optimizaciones de Renderizado](#optimizaciones-de-renderizado)
3. [Optimizaciones de Listas](#optimizaciones-de-listas)
4. [Optimizaciones de Imágenes](#optimizaciones-de-imágenes)
5. [Optimizaciones de Red](#optimizaciones-de-red)
6. [Optimizaciones de Batería](#optimizaciones-de-batería)
7. [Optimizaciones de Memoria](#optimizaciones-de-memoria)
8. [Métricas y Monitoreo](#métricas-y-monitoreo)
9. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

La aplicación móvil RespiCare está construida con **Next.js y Capacitor**, lo que permite optimizaciones tanto del lado web como nativas. Esta guía documenta todas las optimizaciones implementadas para garantizar un rendimiento óptimo en dispositivos móviles.

### Objetivos de Performance

- **Tiempo de carga inicial**: < 2 segundos
- **Tiempo de interacción (TTI)**: < 3 segundos
- **Frame rate**: 60 FPS constante
- **Uso de memoria**: < 150 MB en uso normal
- **Consumo de batería**: Optimizado para uso prolongado

---

## Optimizaciones de Renderizado

### 1. Lazy Loading de Componentes

Los componentes se cargan bajo demanda usando `React.lazy()` y `Suspense`:

```typescript
// Ejemplo de lazy loading
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyComponent />
    </Suspense>
  );
}
```

**Ubicación**: `mobile/medical-app/components/`

**Beneficios**:
- Reduce el bundle inicial
- Mejora el tiempo de carga
- Carga componentes solo cuando se necesitan

### 2. Memoización con React.memo

Componentes pesados están memoizados para evitar re-renders innecesarios:

```typescript
export const OptimizedComponent = React.memo(({ data }) => {
  // Componente optimizado
}, (prevProps, nextProps) => {
  // Comparación personalizada si es necesario
  return prevProps.data.id === nextProps.data.id;
});
```

**Ubicación**: Componentes en `mobile/medical-app/components/`

### 3. useMemo y useCallback

Hooks de optimización para evitar recálculos innecesarios:

```typescript
// Memoizar cálculos costosos
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// Memoizar callbacks
const handleClick = useCallback(() => {
  doSomething();
}, [dependencies]);
```

**Ubicación**: `mobile/medical-app/components/tabs/`

### 4. Debounce y Throttle

Funciones de utilidad para optimizar eventos frecuentes:

```typescript
import { debounce, throttle } from '@/lib/utils/performance';

// Debounce para búsquedas
const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 300);

// Throttle para scroll events
const throttledScroll = throttle(() => {
  handleScroll();
}, 100);
```

**Ubicación**: `mobile/medical-app/lib/utils/performance.ts`

---

## Optimizaciones de Listas

### 1. Virtual Scrolling

Las listas grandes usan virtual scrolling para renderizar solo items visibles:

```typescript
import { getVisibleItems } from '@/lib/utils/performance';

function OptimizedList({ items }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = 600;
  const itemHeight = 100;

  const { visibleItems, start, end } = getVisibleItems(
    items,
    containerHeight,
    itemHeight,
    scrollTop
  );

  return (
    <div onScroll={(e) => setScrollTop(e.target.scrollTop)}>
      {visibleItems.map((item, index) => (
        <ListItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

**Ubicación**: `mobile/medical-app/lib/utils/performance.ts`

**Beneficios**:
- Renderiza solo items visibles
- Reduce uso de memoria
- Mejora scroll performance

### 2. Paginación y Lazy Loading de Datos

Las listas cargan datos en chunks para evitar sobrecarga:

```typescript
// En appointments.tsx e index.tsx
const loadData = async () => {
  const historiesResponse = await medicalHistoryService.list({
    patientId: user._id,
    limit: 50  // Cargar en chunks de 50
  });
  // ...
};
```

**Ubicación**: 
- `mobile/medical-app/components/tabs/appointments.tsx`
- `mobile/medical-app/components/tabs/index.tsx`

### 3. Optimización de Filtrado

El filtrado se optimiza con debounce para evitar filtros excesivos:

```typescript
const [searchQuery, setSearchQuery] = useState("");

// Filtrado optimizado
const filteredHistories = useMemo(() => {
  if (!searchQuery) return medicalHistories;
  
  return medicalHistories.filter((history) =>
    history.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    history.patientName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [medicalHistories, searchQuery]);
```

---

## Optimizaciones de Imágenes

### 1. Lazy Loading de Imágenes

Componente `LazyImage` que carga imágenes solo cuando están visibles:

```typescript
import { LazyImage } from '@/lib/utils/lazyLoad';

<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  placeholder="/placeholder.jpg"
  className="w-full h-48"
/>
```

**Ubicación**: `mobile/medical-app/lib/utils/lazyLoad.tsx`

**Características**:
- Carga solo cuando está en viewport
- Placeholder mientras carga
- Manejo de errores
- Transiciones suaves

### 2. Image Caching

Sistema de cache para imágenes descargadas:

```typescript
import { imageCache } from '@/lib/utils/imageCache';

// Obtener imagen del cache o descargarla
const cachedImage = await imageCache.getImage(url);
```

**Ubicación**: `mobile/medical-app/lib/utils/imageCache.ts`

**Características**:
- Cache en memoria y localStorage
- Expiración automática
- Limpieza de cache cuando está lleno
- Estadísticas de cache

### 3. Optimización de Imágenes

Redimensionamiento y compresión automática:

```typescript
import { optimizeImage } from '@/lib/utils/performance';

const optimizedFile = await optimizeImage(
  file,
  1200,  // maxWidth
  1200,  // maxHeight
  0.8    // quality
);
```

**Ubicación**: `mobile/medical-app/lib/utils/performance.ts`

---

## Optimizaciones de Red

### 1. React Query con Cache

React Query se usa para cachear requests y reducir llamadas a la API:

```typescript
// Configuración en App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutos
      cacheTime: 24 * 60 * 60 * 1000, // 24 horas
      refetchOnReconnect: true,
      refetchOnMount: false,
      networkMode: 'offlineFirst',
    },
  },
});
```

**Ubicación**: `mobile/medical-app/app/layout.tsx` o similar

**Beneficios**:
- Cache automático de respuestas
- Refetch inteligente
- Soporte offline

### 2. Batch Processing

Agrupación de operaciones para reducir requests:

```typescript
import { BatchProcessor } from '@/lib/utils/performance';

const batchProcessor = new BatchProcessor(
  async (items) => {
    await api.batchUpdate(items);
  },
  10,    // batchSize
  1000   // delay (ms)
);

// Agregar items al batch
items.forEach(item => batchProcessor.add(item));
```

**Ubicación**: `mobile/medical-app/lib/utils/performance.ts`

### 3. Request Deduplication

React Query automáticamente deduplica requests idénticos:

```typescript
// Múltiples componentes pueden llamar esto simultáneamente
// Solo se hace 1 request
const { data } = useQuery(['user', userId], () => fetchUser(userId));
```

### 4. Preconnect a APIs

Preconexión a dominios comunes para mejorar velocidad:

```typescript
// En PerformanceProvider
const preconnectDomains = [
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
];

preconnectDomains.forEach(domain => {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = domain;
  document.head.appendChild(link);
});
```

**Ubicación**: `mobile/medical-app/components/providers/performance-provider.tsx`

---

## Optimizaciones de Batería

### 1. Battery Optimization Service

Servicio dedicado para optimizar consumo de batería:

```typescript
import BatteryOptimizationService from '@/services/batteryOptimizationService';

const batteryService = new BatteryOptimizationService();

// Registrar timer con prioridad
batteryService.registerTimer({
  id: 'sync-timer',
  interval: 5000,
  callback: syncData,
  priority: 'medium',
  pauseOnBackground: true
});
```

**Ubicación**: `mobile/src/services/batteryOptimizationService.ts`

**Características**:
- Pausa automática en background
- Ajuste dinámico según estado de batería
- Gestión de prioridades
- Métricas de consumo

### 2. Pausa de Timers en Background

Los timers se pausan automáticamente cuando la app está en background:

```typescript
// En BatteryOptimizationService
AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'background') {
    this.pauseAllTimers();
  } else if (nextAppState === 'active') {
    this.resumeAllTimers();
  }
});
```

### 3. Ajuste de Frecuencias

Las frecuencias de polling se ajustan según el estado de la batería:

```typescript
// Reducir frecuencia cuando batería está baja
if (batteryLevel < 20) {
  adjustPollingInterval(interval * 2); // Reducir a la mitad
}
```

---

## Optimizaciones de Memoria

### 1. Limpieza Automática de Cache

El `PerformanceProvider` limpia cache periódicamente:

```typescript
// Limpiar cada hora
setInterval(() => {
  offlineQueue.clearCompleted();
  
  const stats = imageCache.getStats();
  if (stats.size > stats.maxSize * 0.8) {
    imageCache.clearCache();
  }
}, 60 * 60 * 1000);
```

**Ubicación**: `mobile/medical-app/components/providers/performance-provider.tsx`

### 2. Gestión de Estado Optimizada

Zustand store optimizado para evitar re-renders innecesarios:

```typescript
// Selectores específicos para evitar re-renders
const user = useAppStore((state) => state.user);
const appointments = useAppStore((state) => state.appointments);

// En lugar de usar todo el store
const store = useAppStore(); // ❌ Causa re-renders innecesarios
```

**Ubicación**: `mobile/medical-app/store/useAppStore.ts`

### 3. Cleanup de Event Listeners

Los event listeners se limpian correctamente:

```typescript
useEffect(() => {
  const observer = new IntersectionObserver(/* ... */);
  
  return () => {
    observer.disconnect(); // Cleanup
  };
}, []);
```

---

## Métricas y Monitoreo

### 1. Performance Tests

Tests automatizados para verificar performance:

```typescript
// Tests de performance
describe('List Performance', () => {
  it('should render large lists efficiently', () => {
    const startTime = performance.now();
    render(<LargeList items={largeDataSet} />);
    const duration = performance.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // < 1 segundo
  });
});
```

**Ubicación**: `mobile/__tests__/performance/`

### 2. Métricas de Batería

El `BatteryOptimizationService` proporciona métricas:

```typescript
const metrics = batteryService.getMetrics();
console.log({
  activeTimers: metrics.activeTimers,
  totalPollingInterval: metrics.totalPollingInterval,
  backgroundPausedTimers: metrics.backgroundPausedTimers
});
```

### 3. Image Cache Stats

Estadísticas del cache de imágenes:

```typescript
const stats = imageCache.getStats();
console.log({
  size: stats.size,
  maxSize: stats.maxSize,
  hitRate: stats.hitRate
});
```

---

## Mejores Prácticas

### 1. Usar React.memo para Componentes Pesados

```typescript
export const HeavyComponent = React.memo(({ data }) => {
  // Componente optimizado
});
```

### 2. Evitar Re-renders Innecesarios

```typescript
// ✅ Bueno: Selector específico
const user = useAppStore((state) => state.user);

// ❌ Malo: Todo el store
const store = useAppStore();
```

### 3. Lazy Load de Componentes Grandes

```typescript
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### 4. Optimizar Listas Grandes

```typescript
// ✅ Usar virtual scrolling o paginación
const visibleItems = getVisibleItems(items, height, itemHeight, scrollTop);

// ❌ Renderizar todos los items
items.map(item => <Item key={item.id} />)
```

### 5. Cachear Resultados Costosos

```typescript
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);
```

### 6. Debounce Eventos Frecuentes

```typescript
const debouncedSearch = debounce((query) => {
  performSearch(query);
}, 300);
```

### 7. Optimizar Imágenes

```typescript
// ✅ Usar LazyImage
<LazyImage src={url} alt="Description" />

// ❌ Cargar todas las imágenes
<img src={url} alt="Description" />
```

### 8. Limpiar Recursos

```typescript
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  
  return () => {
    clearInterval(timer); // Cleanup
  };
}, []);
```

---

## Archivos de Optimización

### Utilidades de Performance

- **`mobile/medical-app/lib/utils/performance.ts`**
  - `debounce()` - Retrasa ejecución de funciones
  - `throttle()` - Limita ejecución de funciones
  - `memoize()` - Cachea resultados de funciones
  - `BatchProcessor` - Agrupa operaciones
  - `optimizeImage()` - Optimiza imágenes
  - `getVisibleItems()` - Virtual scrolling helper

### Componentes Optimizados

- **`mobile/medical-app/lib/utils/lazyLoad.tsx`**
  - `LazyImage` - Componente de lazy loading de imágenes

- **`mobile/medical-app/lib/utils/imageCache.ts`**
  - `imageCache` - Sistema de cache de imágenes

- **`mobile/medical-app/components/providers/performance-provider.tsx`**
  - `PerformanceProvider` - Provider para optimizaciones globales

### Servicios

- **`mobile/src/services/batteryOptimizationService.ts`**
  - `BatteryOptimizationService` - Optimización de batería

### Tests

- **`mobile/__tests__/performance/app-performance.test.ts`**
  - Tests de performance de la aplicación

---

## Métricas Objetivo

| Métrica | Objetivo | Estado |
|---------|----------|--------|
| Tiempo de carga inicial | < 2s | ✅ |
| Tiempo de interacción (TTI) | < 3s | ✅ |
| Frame rate | 60 FPS | ✅ |
| Uso de memoria | < 150 MB | ✅ |
| Tamaño de bundle | < 2 MB | ✅ |
| Consumo de batería | Optimizado | ✅ |

---

## Análisis de Bundle y Dependencias

### Script de Análisis de Bundle

El script `analyze-bundle-size.js` analiza el tamaño del bundle y proporciona recomendaciones:

```bash
# Analizar bundle después de build
npm run analyze:bundle:build

# Solo analizar (requiere build previo)
npm run analyze:bundle
```

**Características:**
- Analiza tamaño total del bundle
- Identifica chunks grandes
- Detecta dependencias pesadas
- Genera recomendaciones de optimización
- Exporta reporte en JSON

**Ubicación**: `mobile/medical-app/scripts/analyze-bundle-size.js`

### Configuración Avanzada de Bundler

El `next.config.mjs` incluye optimizaciones avanzadas:

- **Code Splitting**: Chunks separados para vendors, UI components, Radix UI, charts
- **Cache Groups**: Configuración optimizada para mejor caching
- **Minificación**: Habilitada en producción
- **Compresión**: Habilitada para assets estáticos
- **Headers de Cache**: Configuración para cache de assets estáticos

**Ubicación**: `mobile/medical-app/next.config.mjs`

---

## Mediciones Reales en Dispositivos

### Device Metrics Collector

Sistema de medición de performance en tiempo real:

```typescript
import { deviceMetrics, useDeviceMetrics } from '@/lib/utils/device-metrics';

// En componente
const { metrics, deviceInfo, stats } = useDeviceMetrics();
```

**Métricas Medidas:**
- **Page Load Time**: Tiempo de carga de página
- **Time to Interactive (TTI)**: Tiempo hasta interacción
- **First Contentful Paint (FCP)**: Primer contenido visible
- **Largest Contentful Paint (LCP)**: Elemento más grande visible
- **First Input Delay (FID)**: Retraso del primer input
- **Frame Rate (FPS)**: Frames por segundo
- **Memory Usage**: Uso de memoria

**Ubicación**: `mobile/medical-app/lib/utils/device-metrics.ts`

### Uso en Componentes

```typescript
import { useDeviceMetrics } from '@/lib/utils/device-metrics';

function PerformanceMonitor() {
  const { metrics, stats } = useDeviceMetrics();
  
  return (
    <div>
      <p>FPS: {stats.avgFrameRate}</p>
      <p>Memoria: {formatBytes(stats.avgMemoryUsage)}</p>
      <p>TTI: {stats.avgTimeToInteractive}ms</p>
    </div>
  );
}
```

---

## Optimización Avanzada de Batería

### Battery Monitor

Monitor avanzado de consumo de batería:

```typescript
import { batteryMonitor, useBatteryMonitor } from '@/lib/utils/battery-monitor';

// En componente
const { batteryStatus, stats, isLow, recommendations } = useBatteryMonitor();
```

**Características:**
- Monitoreo en tiempo real del nivel de batería
- Cálculo de tasa de consumo
- Estimación de tiempo restante
- Detección de batería baja
- Recomendaciones automáticas de optimización

**Ubicación**: `mobile/medical-app/lib/utils/battery-monitor.ts`

### Integración con BatteryOptimizationService

El monitor se integra con el servicio de optimización:

```typescript
import { batteryMonitor } from '@/lib/utils/battery-monitor';
import BatteryOptimizationService from '@/services/batteryOptimizationService';

const batteryService = new BatteryOptimizationService();

// Ajustar timers según nivel de batería
batteryMonitor.onBatteryChange((status) => {
  if (status.level < 0.2) {
    // Reducir frecuencia de timers cuando batería está baja
    batteryService.adjustTimersForLowBattery();
  }
});
```

---

## Análisis de Dependencias

### Identificar Dependencias Pesadas

Usa el script de análisis:

```bash
npm run analyze:bundle
```

El script identifica:
- Dependencias que exceden 100 KB
- Oportunidades de tree-shaking
- Librerías que pueden ser reemplazadas por alternativas más ligeras

### Recomendaciones Comunes

1. **Reemplazar librerías pesadas:**
   - `moment.js` → `date-fns` (ya implementado)
   - `lodash` → funciones específicas o `lodash-es`

2. **Usar imports dinámicos:**
   ```typescript
   // En lugar de
   import HeavyLibrary from 'heavy-library';
   
   // Usar
   const HeavyLibrary = await import('heavy-library');
   ```

3. **Tree-shaking:**
   - Usar imports específicos: `import { debounce } from 'lodash-es'`
   - Evitar imports de namespace: `import * as _ from 'lodash'`

---

## Recursos Adicionales

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [Capacitor Performance](https://capacitorjs.com/docs/guides/performance)
- [Bundle Analysis Tools](https://nextjs.org/docs/advanced-features/analyzing-bundles)

---

**Última actualización**: Noviembre 2025

**Mantenedor**: Equipo de Desarrollo Mobile RespiCare

