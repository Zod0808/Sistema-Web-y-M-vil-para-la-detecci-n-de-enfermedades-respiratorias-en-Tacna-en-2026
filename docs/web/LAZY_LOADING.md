# 📦 Lazy Loading y Code Splitting - Web Frontend

Documentación sobre la implementación de lazy loading y code splitting en el frontend web de RespiCare Tacna.

---

## 📋 Estado Actual

### ✅ Implementado

- **Lazy loading de rutas principales**: Todas las rutas usan `React.lazy()` y `Suspense`
- **Componentes lazy**: Navbar, Home, Dashboard, Analytics, HeatMapPage

### 📝 Archivos

- `web/src/App.js`: Configuración principal de lazy loading

---

## 🎯 Configuración Actual

### Rutas con Lazy Loading

```javascript
// web/src/App.js
import { lazy, Suspense } from 'react';

const Navbar = lazy(() => import('./components/Navbar'));
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const HeatMapPage = lazy(() => import('./pages/HeatMapPage'));
```

### Suspense Fallback

```javascript
const AppFallback = () => (
  <div className="app-loading">
    <div className="app-loading__spinner" />
    <p>Cargando interfaz…</p>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<AppFallback />}>
        {/* Rutas lazy */}
      </Suspense>
    </Router>
  );
}
```

---

## 🚀 Mejoras Recomendadas

### 1. Lazy Loading de Componentes Pesados

Para componentes que se usan raramente o son pesados (ej: gráficos complejos, editores):

```javascript
// ✅ BUENO: Lazy loading de componente pesado
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>Mostrar gráfico</button>
      {showChart && (
        <Suspense fallback={<div>Cargando gráfico...</div>}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
}
```

### 2. Preloading de Rutas Críticas

Precargar rutas cuando el usuario está cerca de navegar a ellas:

```javascript
// Preload cuando el usuario hace hover sobre el link
<Link
  to="/dashboard"
  onMouseEnter={() => {
    import('./pages/Dashboard');
  }}
>
  Dashboard
</Link>
```

### 3. Code Splitting por Feature

Dividir código por funcionalidad (ej: reportes, configuración):

```javascript
// Rutas de reportes (carga solo cuando se accede)
const ReportsRoutes = lazy(() => import('./routes/ReportsRoutes'));

// Rutas de configuración (carga solo cuando se accede)
const SettingsRoutes = lazy(() => import('./routes/SettingsRoutes'));
```

### 4. Dynamic Imports con Nombres

Usar nombres descriptivos para chunks generados:

```javascript
const Dashboard = lazy(() => 
  import(/* webpackChunkName: "dashboard" */ './pages/Dashboard')
);

const Analytics = lazy(() => 
  import(/* webpackChunkName: "analytics" */ './pages/Analytics')
);
```

---

## 📊 Análisis de Bundle

### Verificar Tamaño de Chunks

```bash
# Build de producción
npm run build

# Analizar bundle (requiere webpack-bundle-analyzer)
npx webpack-bundle-analyzer build/static/js/*.js
```

### Objetivos

- **Chunk inicial**: < 200KB (gzipped)
- **Chunks lazy**: < 100KB cada uno (gzipped)
- **Total bundle**: < 1MB (gzipped)

---

## 🔧 Configuración de Webpack (si se ejecta)

Si se necesita configuración avanzada, se puede ejectar React Scripts:

```bash
npm run eject
```

Luego, en `webpack.config.js`:

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

---

## 📝 Mejores Prácticas

### ✅ Hacer

- Lazy load rutas que no son críticas para el primer render
- Lazy load componentes pesados (gráficos, editores, visualizadores)
- Usar Suspense con fallbacks informativos
- Preload rutas cuando el usuario está cerca de navegar

### ❌ Evitar

- Lazy load componentes pequeños (< 10KB)
- Lazy load componentes usados en el primer render
- Lazy load sin fallback (causa errores)
- Over-splitting (demasiados chunks pequeños)

---

## 🎯 Rutas de Baja Frecuencia

Estas rutas son candidatas para lazy loading avanzado:

- **Reportes avanzados**: `/reports/advanced`
- **Configuración**: `/settings`
- **Administración**: `/admin/*`
- **Exportación masiva**: `/export/bulk`

### Implementación Futura

```javascript
// Preload solo cuando el usuario hace click en "Reportes"
const AdvancedReports = lazy(() => 
  import('./pages/AdvancedReports').then(module => {
    // Opcional: preload dependencias
    return module;
  })
);
```

---

## 📈 Métricas

### Monitorear

- **Tiempo de carga inicial**: < 2s
- **Tiempo de carga de rutas lazy**: < 500ms
- **Tamaño de bundle inicial**: < 200KB (gzipped)

### Herramientas

- **Lighthouse**: Auditoría de performance
- **Webpack Bundle Analyzer**: Análisis de bundle
- **React DevTools Profiler**: Profiling de componentes

---

**Última actualización**: 2024-11-03  
**Versión**: 1.0.0

