# 🚀 Performance Playbook - RespiCare Tacna

Guía de mejores prácticas de performance por capa (Web, Mobile, Backend, AI Services, MongoDB).

---

## 📋 Índice

1. [Web Frontend](#web-frontend)
2. [Mobile (React Native)](#mobile-react-native)
3. [Backend (Node.js/Express)](#backend-nodejsexpress)
4. [AI Services (Python/FastAPI)](#ai-services-pythonfastapi)
5. [MongoDB](#mongodb)
6. [Métricas y Monitoreo](#métricas-y-monitoreo)

---

## Web Frontend

### Code Splitting y Lazy Loading

#### ✅ Implementado
- **Lazy loading de rutas**: Todas las rutas principales usan `React.lazy()` y `Suspense`
- **Componentes lazy**: Navbar, Home, Dashboard, Analytics, HeatMapPage se cargan bajo demanda

#### 📝 Mejores Prácticas

```javascript
// ✅ BUENO: Lazy loading de rutas
const Dashboard = lazy(() => import('./pages/Dashboard'));

// ✅ BUENO: Lazy loading de componentes pesados
const HeavyChart = lazy(() => import('./components/HeavyChart'));

// ❌ EVITAR: Import estático de componentes grandes
import HeavyChart from './components/HeavyChart'; // Carga todo al inicio
```

#### 🎯 Rutas de Baja Frecuencia

Para rutas que se usan raramente (ej: reportes avanzados, configuración), usar lazy loading con preloading opcional:

```javascript
// Preload solo cuando el usuario está cerca de la ruta
const AdvancedReports = lazy(() => 
  import('./pages/AdvancedReports').then(module => {
    // Preload cuando sea necesario
    return module;
  })
);
```

### Optimización de Imágenes

- ✅ Usar formato WebP cuando sea posible
- ✅ Lazy loading de imágenes con `loading="lazy"`
- ✅ Tamaños responsivos con `srcset`
- ✅ Compresión de assets estáticos

### Virtualización de Listas

- ✅ Usar `react-window` o `react-virtualized` para listas largas
- ✅ Implementado en `VirtualizedList.js`

### Service Workers y PWA

- ✅ Service Worker registrado para cacheo offline
- ✅ Cacheo estratégico de assets estáticos

---

## Mobile (React Native)

### Optimización de FlatList

#### ✅ Configuración Recomendada

```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  // Optimizaciones críticas
  initialNumToRender={8}           // Renderizar solo 8 items iniciales
  maxToRenderPerBatch={8}          // Máximo 8 items por batch
  windowSize={5}                   // Mantener 5 "ventanas" de altura
  removeClippedSubviews            // Remover vistas fuera de pantalla
  getItemLayout={(_, index) => ({  // Layout precalculado (si altura es fija)
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  // Otros ajustes
  updateCellsBatchingPeriod={50}   // Batch updates cada 50ms
  onEndReachedThreshold={0.5}     // Cargar más cuando quede 50% visible
/>
```

#### 📝 Aplicado en

- ✅ `MedicalHistoryScreen.tsx` (altura fija: 140px)
- ✅ `AppointmentsScreen.tsx` (altura fija: 130px)
- ✅ `SymptomAnalysesScreen.tsx` (altura fija: 200px)

### Optimización de Batería

#### ✅ Servicio de Optimización

`batteryOptimizationService.ts` gestiona:
- **Timers con prioridad**: High/Medium/Low
- **Pausa automática en background**: Timers de baja prioridad se pausan
- **Ajuste dinámico de intervalos**: Según prioridad y estado de la app

#### 📝 Uso

```typescript
import { batteryOptimizationService } from '../services/batteryOptimizationService';

// Registrar timer con prioridad
batteryOptimizationService.registerTimer({
  id: 'sync-data',
  interval: 30000, // 30 segundos
  callback: async () => {
    await syncData();
  },
  priority: 'medium', // high | medium | low
  pauseOnBackground: true, // Pausar cuando app está en background
});

// Limpiar al desmontar
useEffect(() => {
  return () => {
    batteryOptimizationService.unregisterTimer('sync-data');
  };
}, []);
```

#### 🎯 Mejores Prácticas

- **Polling inteligente**: Usar intervalos más largos cuando la app está en background
- **Evitar timers innecesarios**: Cancelar timers cuando no se necesitan
- **Priorizar operaciones**: Marcar timers críticos como `high` priority

### Optimización de Imágenes

- ✅ Lazy loading con `LazyImage` component
- ✅ Compresión de imágenes capturadas (límite de tamaño)
- ✅ Cacheo local de imágenes

### Memoria

- ✅ Limpiar listeners y timers en `useEffect` cleanup
- ✅ Usar `useMemo` y `useCallback` para evitar re-renders innecesarios
- ✅ Evitar crear objetos/funciones nuevas en cada render

---

## Backend (Node.js/Express)

### Caching

#### ✅ Implementado

- **Redis caching**: Para queries frecuentes y resultados de ML
- **In-memory cache**: Fallback cuando Redis no está disponible
- **TTL estratégico**: Cache expira según tipo de dato

#### 📝 Mejores Prácticas

```typescript
// Cachear resultados de queries costosas
const cachedResult = await cacheService.get(`user:${userId}:analytics`);
if (cachedResult) return cachedResult;

const result = await expensiveQuery();
await cacheService.set(`user:${userId}:analytics`, result, 3600); // 1 hora
return result;
```

### Query Optimization

- ✅ Índices MongoDB en campos frecuentemente consultados
- ✅ Usar `select()` para limitar campos retornados
- ✅ Paginación en listas grandes
- ✅ Agregaciones optimizadas con `$match` temprano

### Connection Pooling

- ✅ Pool de conexiones MongoDB configurado
- ✅ Pool de conexiones Redis configurado

### Rate Limiting

- ✅ Rate limiting inteligente (Redis + fallback in-memory)
- ✅ Límites diferentes por ruta y método HTTP

### Compresión

- ✅ Brotli + Gzip compression
- ✅ Threshold de 2KB para activar compresión

---

## AI Services (Python/FastAPI)

### Caching de Modelos

- ✅ Cacheo de predicciones frecuentes
- ✅ Cacheo de resultados de SHAP

### Batch Processing

- ✅ Procesamiento en batch cuando sea posible
- ✅ Agregación de requests similares

### Model Optimization

- ✅ Quantization opcional de modelos
- ✅ GPU opcional (cuando esté disponible)

### Async/Await

- ✅ Uso de `async/await` para operaciones I/O
- ✅ Evitar bloqueo del event loop

---

## MongoDB

### Índices

#### ✅ Índices Creados

**MedicalHistory**:
- `{ patientId: 1 }`
- `{ doctorId: 1 }`
- `{ date: -1 }`
- `{ date: -1, diagnosis: 1 }` (analytics)
- `{ date: -1, 'symptoms.severity': 1 }` (analytics)
- `{ date: -1, age: 1 }` (analytics)
- Text index en `diagnosis` y `location.address`

**AIAnalysis**:
- `{ medicalHistoryId: 1 }`
- `{ timestamp: -1, urgency: 1 }` (analytics)
- `{ timestamp: -1, confidence: -1 }` (analytics)
- `{ createdAt: -1, urgency: 1, confidence: -1 }` (analytics)

#### 📝 Mejores Prácticas

- **Índices compuestos**: Para queries que filtran por múltiples campos
- **Índices de texto**: Para búsquedas de texto libre
- **Índices geográficos**: Para queries de ubicación (2dsphere)

### Monitoreo de Slow Queries

#### ✅ Implementado

- **Profiling automático**: Detecta queries > 1000ms
- **Alertas**: Logs de slow queries con detalles
- **Métricas Prometheus**: `mongo_slow_queries_total`, `mongo_query_duration_ms`

#### 📝 Uso

```typescript
import { getSlowQueries, analyzeIndexUsage } from './monitoring/mongodbMonitoring';

// Obtener últimas slow queries
const slowQueries = getSlowQueries(10);

// Analizar uso de índices
const indexUsage = await analyzeIndexUsage('medicalhistories');
console.log('Índices usados:', indexUsage.used);
console.log('Índices no usados:', indexUsage.unused);
```

### Query Optimization

- ✅ Usar `explain()` para analizar queries lentas
- ✅ Evitar `$regex` sin índices de texto
- ✅ Usar `$match` temprano en agregaciones
- ✅ Limitar resultados con `limit()`

---

## Métricas y Monitoreo

### Backend - Percentiles (p95/p99)

#### ✅ Implementado

- **Histograma de latencia**: `http_request_percentiles`
- **Cálculo automático**: p50, p95, p99 por ruta y método
- **Endpoint de métricas**: `/metrics` (Prometheus)

#### 📝 Uso

```typescript
import { getPercentileMetrics } from './metrics/percentileMetrics';

// Obtener percentiles para todas las rutas
const metrics = getPercentileMetrics();

// Obtener percentiles para una ruta específica
const routeMetrics = getPercentileMetrics('/api/v1/medical-histories', 'GET');
console.log('p95:', routeMetrics['GET:/api/v1/medical-histories'].p95);
```

### Dashboards de Performance

#### Objetivos

- **p95 < 200ms**: Para la mayoría de endpoints
- **p99 < 500ms**: Para endpoints críticos
- **p99 < 50ms**: Para predicciones ML

#### Métricas Disponibles

- `http_request_duration_ms`: Histograma de latencia
- `http_request_percentiles`: Percentiles calculados
- `mongo_query_duration_ms`: Latencia de queries MongoDB
- `mongo_slow_queries_total`: Contador de queries lentas

### Alertas

- ✅ Slow queries MongoDB (> 1000ms)
- ✅ Queries sin uso de índices
- ✅ Latencia p95 > umbral configurado

---

## Checklist de Performance

### Web
- [x] Lazy loading de rutas
- [x] Code splitting
- [x] Optimización de imágenes (WebP, lazy loading)
- [x] Virtualización de listas
- [x] Service Worker y PWA
- [ ] Preload de rutas críticas
- [ ] Bundle analysis y optimización

### Mobile
- [x] FlatList optimizado (getItemLayout, windowSize, removeClippedSubviews)
- [x] Optimización de batería (timers con prioridad)
- [x] Lazy loading de imágenes
- [x] Limpieza de listeners/timers
- [ ] Profiling de memoria
- [ ] Reducción de bundle size

### Backend
- [x] Caching (Redis + in-memory)
- [x] Connection pooling
- [x] Rate limiting
- [x] Compresión (Brotli + Gzip)
- [x] Métricas de percentiles (p95/p99)
- [x] Monitoreo de MongoDB
- [ ] Query optimization automático

### MongoDB
- [x] Índices en campos frecuentes
- [x] Índices compuestos para analytics
- [x] Monitoreo de slow queries
- [x] Análisis de uso de índices
- [ ] Auto-indexing recommendations

---

## Herramientas Recomendadas

### Web
- **Lighthouse**: Auditoría de performance
- **Webpack Bundle Analyzer**: Análisis de bundle size
- **React DevTools Profiler**: Profiling de componentes

### Mobile
- **React Native Performance Monitor**: Métricas de performance
- **Flipper**: Debugging y profiling
- **Hermes**: Motor JavaScript optimizado (opcional)

### Backend
- **Prometheus**: Métricas y alertas
- **Grafana**: Dashboards de performance
- **New Relic / Datadog**: APM (opcional)

### MongoDB
- **MongoDB Compass**: Análisis de queries
- **mongostat**: Estadísticas en tiempo real
- **explain()**: Análisis de execution plans

---

**Última actualización**: 2024-11-03  
**Versión**: 1.0.0

