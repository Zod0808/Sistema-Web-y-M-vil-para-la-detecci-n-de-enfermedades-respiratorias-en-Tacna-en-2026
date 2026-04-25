# Guía de Feature Flags y Progressive Delivery

Esta guía explica cómo usar Feature Flags y Progressive Delivery (Canary Deployments) en RespiCare.

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Feature Flags](#feature-flags)
- [Proveedores Soportados](#proveedores-soportados)
- [Configuración](#configuración)
- [Uso en el Código](#uso-en-el-código)
- [Canary Deployments](#canary-deployments)
- [Estrategias de Rollout](#estrategias-de-rollout)
- [Monitoreo y Métricas](#monitoreo-y-métricas)
- [Troubleshooting](#troubleshooting)
- [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

### ¿Qué son los Feature Flags?

Los Feature Flags (también conocidos como Feature Toggles) permiten habilitar o deshabilitar funcionalidades sin necesidad de hacer deploy de código nuevo. Esto permite:

- ✅ **Lanzamientos controlados**: Activar funcionalidades gradualmente
- ✅ **Rollback rápido**: Desactivar funcionalidades problemáticas sin deploy
- ✅ **Testing en producción**: Probar nuevas funcionalidades con usuarios específicos
- ✅ **A/B Testing**: Comparar diferentes versiones de funcionalidades
- ✅ **Reducción de riesgo**: Lanzar cambios de forma incremental

### ¿Qué es Progressive Delivery?

Progressive Delivery es una estrategia de despliegue que incluye:

- **Canary Deployments**: Desplegar nueva versión a un pequeño porcentaje de usuarios
- **Blue-Green Deployments**: Mantener dos versiones completas y cambiar entre ellas
- **Rollout Gradual**: Incrementar gradualmente el tráfico a la nueva versión
- **Análisis Automático**: Monitorear métricas y revertir automáticamente si hay problemas

---

## Feature Flags

### Tipos de Feature Flags

1. **Release Flags**: Controlan el lanzamiento de nuevas funcionalidades
2. **Experiment Flags**: Para A/B testing y experimentos
3. **Ops Flags**: Controlan comportamiento operacional (ej: rate limiting)
4. **Permission Flags**: Controlan acceso a funcionalidades por rol

### Arquitectura

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Feature Flag     │
│   Service        │
└──────┬───────────┘
       │
       ├──► LaunchDarkly
       ├──► Redis
       └──► Memory (local)
```

---

## Proveedores Soportados

### 1. Memory (Por Defecto)

**Ventajas:**
- ✅ No requiere dependencias externas
- ✅ Rápido y simple
- ✅ Ideal para desarrollo y testing

**Desventajas:**
- ⚠️ No persiste entre reinicios
- ⚠️ No compartido entre instancias
- ⚠️ No soporta targeting avanzado

**Uso:**
```typescript
const service = getFeatureFlagService({
  provider: 'memory',
  defaultFlags: {
    'new-dashboard': true,
    'advanced-analytics': false,
  },
});
```

### 2. Redis

**Ventajas:**
- ✅ Persistencia entre reinicios
- ✅ Compartido entre instancias
- ✅ Rápido y escalable
- ✅ Soporta TTL automático

**Desventajas:**
- ⚠️ Requiere Redis
- ⚠️ Targeting limitado

**Uso:**
```typescript
const service = getFeatureFlagService({
  provider: 'redis',
  enableCaching: true,
  cacheTTL: 60000, // 1 minuto
});
```

### 3. LaunchDarkly

**Ventajas:**
- ✅ Targeting avanzado
- ✅ A/B testing integrado
- ✅ UI para gestión
- ✅ Analytics y métricas
- ✅ Rollout gradual automático

**Desventajas:**
- ⚠️ Requiere cuenta y SDK key
- ⚠️ Costo (plan gratuito limitado)

**Uso:**
```typescript
const service = getFeatureFlagService({
  provider: 'launchdarkly',
  launchDarklySdkKey: process.env.LAUNCHDARKLY_SDK_KEY,
});
```

---

## Configuración

### Variables de Entorno

```bash
# Proveedor de feature flags
FEATURE_FLAG_PROVIDER=memory  # memory | redis | launchdarkly

# LaunchDarkly
LAUNCHDARKLY_SDK_KEY=your-sdk-key
LAUNCHDARKLY_BASE_URL=https://app.launchdarkly.com

# Redis (ya configurado)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Inicialización en el Backend

```typescript
// En src/index.ts o src/config/config.ts
import { getFeatureFlagService } from './services/featureFlagService';

// Inicializar servicio
const featureFlagService = getFeatureFlagService({
  provider: process.env.FEATURE_FLAG_PROVIDER || 'memory',
  launchDarklySdkKey: process.env.LAUNCHDARKLY_SDK_KEY,
  defaultFlags: {
    'new-dashboard': false,
    'advanced-analytics': false,
    'ml-predictions': true,
  },
});
```

---

## Uso en el Código

### Verificar si un Flag está Habilitado

```typescript
import { isFeatureEnabled } from '../services/featureFlagService';

// En un controlador o servicio
async function getDashboard(req: Request, res: Response) {
  const user = req.user;
  
  const useNewDashboard = await isFeatureEnabled(
    'new-dashboard',
    {
      key: user.id,
      email: user.email,
      role: user.role,
    },
    false // valor por defecto
  );

  if (useNewDashboard) {
    // Usar nuevo dashboard
    return res.json(await getNewDashboardData(user.id));
  } else {
    // Usar dashboard antiguo
    return res.json(await getOldDashboardData(user.id));
  }
}
```

### Obtener Valor de un Flag

```typescript
import { getFeatureValue } from '../services/featureFlagService';

async function getAnalyticsConfig(user: User) {
  const analyticsLevel = await getFeatureValue<string>(
    'analytics-level',
    {
      key: user.id,
      role: user.role,
    },
    'basic' // valor por defecto
  );

  // analyticsLevel puede ser: 'basic' | 'advanced' | 'premium'
  return getAnalyticsForLevel(analyticsLevel);
}
```

### Targeting por Usuario

```typescript
import { getFeatureFlagService } from '../services/featureFlagService';

const service = getFeatureFlagService();

// Configurar flag con targeting
await service.setFlag('beta-feature', {
  key: 'beta-feature',
  enabled: true,
  defaultValue: false,
  targetingRules: [
    {
      attribute: 'role',
      operator: 'equals',
      value: 'admin',
    },
    {
      attribute: 'email',
      operator: 'contains',
      value: '@respicare.com',
    },
  ],
  rolloutPercentage: 25, // Solo 25% de usuarios que cumplan targeting
});
```

### A/B Testing

```typescript
await service.setFlag('new-checkout-flow', {
  key: 'new-checkout-flow',
  enabled: true,
  defaultValue: false,
  variations: [
    'control',  // Flujo antiguo
    'variant-a', // Nueva versión A
    'variant-b', // Nueva versión B
  ],
  rolloutPercentage: 50, // 50% de usuarios
});

// En el código
const variant = await getFeatureValue<string>(
  'new-checkout-flow',
  userContext,
  'control'
);

switch (variant) {
  case 'variant-a':
    return renderCheckoutVariantA();
  case 'variant-b':
    return renderCheckoutVariantB();
  default:
    return renderCheckoutControl();
}
```

### Gestión de Flags

```typescript
import { getFeatureFlagService } from '../services/featureFlagService';

const service = getFeatureFlagService();

// Habilitar flag
await service.enableFlag('new-feature');

// Deshabilitar flag
await service.disableFlag('new-feature');

// Obtener todos los flags
const allFlags = await service.getAllFlags(userContext);

// Actualizar flag
await service.setFlag('my-feature', {
  key: 'my-feature',
  enabled: true,
  defaultValue: true,
  description: 'Nueva funcionalidad de reportes',
  rolloutPercentage: 100,
});
```

---

## Canary Deployments

### ¿Qué es un Canary Deployment?

Un Canary Deployment despliega una nueva versión de la aplicación a un pequeño porcentaje de usuarios (ej: 10%) mientras el resto sigue usando la versión estable. Si la nueva versión funciona bien, se incrementa gradualmente el tráfico.

### Estrategia de Rollout

```
Fase 1: 10% tráfico → Canary
Fase 2: 25% tráfico → Canary
Fase 3: 50% tráfico → Canary
Fase 4: 100% tráfico → Canary (promoción completa)
```

### Implementación con Nginx Ingress

```yaml
# Canary con 10% de tráfico
annotations:
  nginx.ingress.kubernetes.io/canary: "true"
  nginx.ingress.kubernetes.io/canary-weight: "10"
```

### Implementación con Istio

```yaml
# VirtualService con distribución 90/10
http:
  - route:
      - destination:
          host: backend
          subset: stable
        weight: 90
      - destination:
          host: backend
          subset: canary
        weight: 10
```

### Implementación con Flagger

Flagger automatiza los canary deployments:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: backend
spec:
  analysis:
    interval: 1m
    threshold: 5
    stepWeight: 10
    metrics:
      - name: request-success-rate
        threshold: 99
```

---

## Estrategias de Rollout

### 1. Rollout por Porcentaje

```yaml
# Incrementar tráfico gradualmente
steps:
  - weight: 10
    duration: 5m
  - weight: 25
    duration: 10m
  - weight: 50
    duration: 15m
  - weight: 100
    duration: 20m
```

### 2. Rollout por Header

```yaml
# Solo usuarios con header específico
annotations:
  nginx.ingress.kubernetes.io/canary-by-header: "X-Canary"
  nginx.ingress.kubernetes.io/canary-by-header-value: "true"
```

### 3. Rollout por Cookie

```yaml
# Solo usuarios con cookie específica
annotations:
  nginx.ingress.kubernetes.io/canary-by-cookie: "canary"
```

### 4. Rollout por IP

```yaml
# Solo IPs específicas (usando Istio)
match:
  - sourceLabels:
      app: canary-tester
```

---

## Monitoreo y Métricas

### Métricas Clave

1. **Request Success Rate**: Tasa de éxito de requests
2. **Request Duration**: Latencia de requests
3. **Error Rate**: Tasa de errores
4. **CPU/Memory Usage**: Uso de recursos
5. **Custom Metrics**: Métricas de negocio específicas

### Configuración de Alertas

```yaml
# Alertas para canary
metrics:
  - name: request-success-rate
    thresholdRange:
      min: 99  # Mínimo 99% de éxito
  - name: request-duration
    thresholdRange:
      max: 500  # Máximo 500ms
  - name: error-rate
    thresholdRange:
      max: 1  # Máximo 1% de errores
```

### Dashboard de Grafana

Crear dashboard para monitorear:
- Comparación de métricas entre stable y canary
- Distribución de tráfico
- Tasa de errores por versión
- Latencia por versión

---

## Troubleshooting

### Problema: Feature Flag no se aplica

**Diagnóstico:**
```typescript
// Verificar estado del flag
const flag = await service.getFlag('my-feature', userContext);
console.log(flag);
```

**Soluciones:**
1. Verificar que el flag esté habilitado
2. Verificar targeting rules
3. Verificar rollout percentage
4. Limpiar cache si es necesario

### Problema: Canary no recibe tráfico

**Diagnóstico:**
```bash
# Verificar pods canary
kubectl get pods -l version=canary -n respicare-prod

# Verificar servicio
kubectl get svc backend-canary -n respicare-prod

# Verificar ingress
kubectl describe ingress backend-canary -n respicare-prod
```

**Soluciones:**
1. Verificar que los pods canary estén running
2. Verificar configuración de ingress
3. Verificar que el servicio esté correctamente configurado
4. Verificar logs del ingress controller

### Problema: Canary tiene alta tasa de errores

**Solución:**
```bash
# Revertir canary automáticamente (Flagger)
kubectl delete canary backend -n respicare-prod

# O manualmente
kubectl scale deployment backend-canary --replicas=0 -n respicare-prod
```

---

## Mejores Prácticas

### Feature Flags

1. **Nombres descriptivos**: Usar nombres claros y consistentes
   ```typescript
   // ✅ Bueno
   'new-dashboard-v2'
   'advanced-analytics'
   
   // ❌ Malo
   'flag1'
   'test'
   ```

2. **Valores por defecto seguros**: Siempre usar valores conservadores
   ```typescript
   // ✅ Valor por defecto seguro
   await isFeatureEnabled('new-feature', userContext, false);
   ```

3. **Limpiar flags obsoletos**: Eliminar flags que ya no se usan
   ```typescript
   // Documentar fecha de eliminación
   // TODO: Eliminar flag 'old-feature' después del 2025-01-01
   ```

4. **Testing**: Probar flags en desarrollo antes de producción
   ```typescript
   // En tests
   await service.setFlag('test-feature', {
     key: 'test-feature',
     enabled: true,
     defaultValue: true,
   });
   ```

5. **Documentación**: Documentar propósito de cada flag
   ```typescript
   await service.setFlag('feature', {
     key: 'feature',
     enabled: true,
     defaultValue: false,
     description: 'Nueva funcionalidad X para mejorar Y',
   });
   ```

### Canary Deployments

1. **Empezar pequeño**: Comenzar con 5-10% de tráfico
2. **Monitorear de cerca**: Revisar métricas constantemente
3. **Tiempos adecuados**: Dar tiempo suficiente entre fases (mínimo 5 minutos)
4. **Rollback automático**: Configurar rollback automático en caso de problemas
5. **Comunicación**: Notificar al equipo sobre canary deployments
6. **Testing previo**: Probar en staging antes de producción

### Seguridad

1. **Validar targeting**: Verificar que targeting rules sean correctas
2. **Audit logs**: Registrar cambios en feature flags
3. **Permisos**: Restringir quién puede modificar flags
4. **Secrets**: No exponer SDK keys en código

---

## Ejemplos de Uso

### Ejemplo 1: Lanzamiento Gradual de Nueva Funcionalidad

```typescript
// 1. Crear flag deshabilitado
await service.setFlag('new-reporting', {
  key: 'new-reporting',
  enabled: false,
  defaultValue: false,
});

// 2. Habilitar para admins primero
await service.setFlag('new-reporting', {
  key: 'new-reporting',
  enabled: true,
  defaultValue: false,
  targetingRules: [
    { attribute: 'role', operator: 'equals', value: 'admin' },
  ],
});

// 3. Expandir a 25% de usuarios
await service.setFlag('new-reporting', {
  key: 'new-reporting',
  enabled: true,
  defaultValue: false,
  rolloutPercentage: 25,
});

// 4. Expandir a 100%
await service.setFlag('new-reporting', {
  key: 'new-reporting',
  enabled: true,
  defaultValue: true,
  rolloutPercentage: 100,
});
```

### Ejemplo 2: A/B Testing de UI

```typescript
// Configurar variaciones
await service.setFlag('dashboard-layout', {
  key: 'dashboard-layout',
  enabled: true,
  defaultValue: 'classic',
  variations: ['classic', 'modern', 'compact'],
  rolloutPercentage: 50,
});

// En el código
const layout = await getFeatureValue<string>(
  'dashboard-layout',
  userContext,
  'classic'
);

return renderDashboard(layout);
```

### Ejemplo 3: Canary Deployment Automático

```bash
# 1. Desplegar nueva versión como canary
kubectl apply -f infrastructure/k8s/canary-deployment.yaml

# 2. Flagger automáticamente:
#    - Inicia con 10% de tráfico
#    - Monitorea métricas
#    - Incrementa gradualmente
#    - Promociona si todo está bien
#    - Revierte si hay problemas

# 3. Ver estado
kubectl get canary backend -n respicare-prod
```

---

## Referencias

- [LaunchDarkly Documentation](https://docs.launchdarkly.com/)
- [Flagger Documentation](https://flagger.app/)
- [Istio Traffic Management](https://istio.io/latest/docs/concepts/traffic-management/)
- [Nginx Ingress Canary](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary)

---

**Última actualización**: Diciembre 2024

