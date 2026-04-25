# 🔥 Guía de Chaos Engineering - RespiCare Tacna

Esta guía documenta la implementación de Chaos Engineering en RespiCare usando Chaos Mesh para probar y mejorar la resiliencia del sistema.

---

## 📋 Índice

1. [Introducción](#introducción)
2. [¿Qué es Chaos Engineering?](#qué-es-chaos-engineering)
3. [Instalación de Chaos Mesh](#instalación-de-chaos-mesh)
4. [Experimentos Disponibles](#experimentos-disponibles)
5. [Ejecutar Experimentos](#ejecutar-experimentos)
6. [Monitoreo y Observación](#monitoreo-y-observación)
7. [Mejores Prácticas](#mejores-prácticas)
8. [Troubleshooting](#troubleshooting)
9. [Escenarios de Prueba](#escenarios-de-prueba)

---

## Introducción

Chaos Engineering es la disciplina de experimentar en un sistema distribuido para construir confianza en la capacidad del sistema para resistir condiciones turbulentas en producción.

### Objetivos

- **Identificar debilidades**: Encontrar puntos de fallo antes de que ocurran en producción
- **Validar resiliencia**: Verificar que los mecanismos de recuperación funcionan
- **Mejorar confiabilidad**: Aumentar la confianza en el sistema
- **Reducir MTTR**: Disminuir el tiempo medio de recuperación

### Principios

1. **Empezar pequeño**: Comenzar con experimentos de bajo impacto
2. **Aumentar gradualmente**: Escalar la complejidad de los experimentos
3. **Monitorear siempre**: Observar el impacto en tiempo real
4. **Documentar resultados**: Aprender de cada experimento
5. **Automatizar**: Ejecutar experimentos de forma programada

---

## ¿Qué es Chaos Engineering?

Chaos Engineering es la práctica de inyectar fallos controlados en un sistema para:
- Probar la resiliencia del sistema
- Validar que los mecanismos de recuperación funcionan
- Identificar puntos de fallo antes de que ocurran en producción
- Mejorar la confiabilidad general del sistema

### Beneficios

- **Detección temprana de problemas**: Encontrar debilidades antes de que afecten a usuarios
- **Validación de arquitectura**: Verificar que el diseño es resiliente
- **Mejora continua**: Aprender y mejorar con cada experimento
- **Reducción de incidentes**: Menos sorpresas en producción

---

## Instalación de Chaos Mesh

### Requisitos Previos

- Kubernetes 1.16+
- kubectl configurado
- Acceso al cluster con permisos de administrador

### Instalación

```bash
# Instalar Chaos Mesh usando el script oficial
curl -sSL https://mirrors.chaos-mesh.org/latest/install.sh | bash

# Verificar instalación
kubectl get pods -n chaos-mesh

# Acceder al Dashboard (opcional)
kubectl port-forward -n chaos-mesh svc/chaos-dashboard 2333:2333
# Abrir http://localhost:2333
```

### Verificar Instalación

```bash
# Verificar que todos los pods están corriendo
kubectl get pods -n chaos-mesh

# Verificar CRDs instalados
kubectl get crds | grep chaos

# Verificar versión
kubectl get deployment chaos-controller-manager -n chaos-mesh -o jsonpath='{.spec.template.spec.containers[0].image}'
```

---

## Experimentos Disponibles

### 1. Pod Chaos

Simula fallos de pods (kill, failure, restart).

**Tipos:**
- `pod-kill`: Mata un pod inmediatamente
- `pod-failure`: Simula fallo de pod
- `container-kill`: Mata un contenedor específico

**Ejemplo:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: backend-pod-kill
  namespace: respicare-prod
spec:
  action: pod-kill
  mode: one
  selector:
    labelSelectors:
      app: backend
  duration: "30s"
```

### 2. Network Chaos

Simula problemas de red (latencia, pérdida de paquetes, partición).

**Tipos:**
- `delay`: Agrega latencia a las conexiones
- `loss`: Simula pérdida de paquetes
- `partition`: Particiona la red entre servicios
- `duplicate`: Duplica paquetes
- `corrupt`: Corrompe paquetes

**Ejemplo:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: backend-network-latency
  namespace: respicare-prod
spec:
  action: delay
  mode: one
  selector:
    labelSelectors:
      app: backend
  delay:
    latency: "500ms"
    jitter: "100ms"
  duration: "2m"
```

### 3. Stress Chaos

Simula sobrecarga de recursos (CPU, memoria, I/O).

**Tipos:**
- `cpu`: Consume CPU
- `memory`: Consume memoria
- `io`: Genera carga de I/O

**Ejemplo:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: backend-cpu-stress
  namespace: respicare-prod
spec:
  mode: one
  selector:
    labelSelectors:
      app: backend
  stressors:
    cpu:
      workers: 2
      load: 80
  duration: "2m"
```

### 4. DNS Chaos

Simula problemas de resolución DNS.

**Tipos:**
- `error`: Falla la resolución DNS
- `random`: Resuelve a IPs aleatorias

**Ejemplo:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: DNSChaos
metadata:
  name: mongodb-dns-failure
  namespace: respicare-prod
spec:
  action: error
  mode: one
  selector:
    labelSelectors:
      app: backend
  patterns:
    - "mongodb.respicare-prod.svc.cluster.local"
  duration: "1m"
```

### 5. Time Chaos

Simula problemas de reloj (time skew).

**Ejemplo:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: TimeChaos
metadata:
  name: backend-time-skew
  namespace: respicare-prod
spec:
  mode: one
  selector:
    labelSelectors:
      app: backend
  timeOffset: "5s"
  duration: "30s"
```

### 6. IO Chaos

Simula problemas de I/O (latencia, errores).

**Ejemplo:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: mongodb-io-latency
  namespace: respicare-prod
spec:
  action: latency
  mode: one
  selector:
    labelSelectors:
      app: mongodb
  volumePath: "/data/db"
  delay: "100ms"
  percent: 50
  duration: "2m"
```

### 7. HTTP Chaos

Simula problemas en endpoints HTTP (errores, latencia).

**Ejemplo:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: HTTPChaos
metadata:
  name: backend-api-errors
  namespace: respicare-prod
spec:
  mode: fixed-percent
  value: "10"
  selector:
    labelSelectors:
      app: backend
  rules:
    - port: 3001
      path: "/api/v1/**"
      method: "GET"
      abort: true
      statusCode: 500
  duration: "1m"
```

### 8. Kernel Chaos

Simula problemas a nivel de kernel (avanzado, usar con precaución).

**Ejemplo:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: KernelChaos
metadata:
  name: backend-kernel-panic
  namespace: respicare-prod
spec:
  mode: one
  selector:
    labelSelectors:
      app: backend
  failKernRequest:
    callchain:
      - funcname: "__x64_sys_kill"
    failtype: 1
  duration: "10s"
```

---

## Ejecutar Experimentos

### Aplicar un Experimento

```bash
# Aplicar un experimento específico
kubectl apply -f infrastructure/chaos/chaos-experiments.yaml

# Aplicar solo un tipo de experimento
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: test-pod-kill
  namespace: respicare-prod
spec:
  action: pod-kill
  mode: one
  selector:
    labelSelectors:
      app: backend
  duration: "30s"
EOF
```

### Ver Estado de Experimentos

```bash
# Ver todos los experimentos
kubectl get chaos -n respicare-prod

# Ver detalles de un experimento
kubectl describe podchaos backend-pod-failure -n respicare-prod

# Ver eventos relacionados
kubectl get events -n respicare-prod --field-selector involvedObject.name=backend-pod-failure
```

### Pausar/Reanudar Experimentos

```bash
# Pausar un experimento
kubectl patch podchaos backend-pod-failure -n respicare-prod --type merge -p '{"spec":{"duration":"0s"}}'

# Eliminar un experimento
kubectl delete podchaos backend-pod-failure -n respicare-prod
```

### Experimentos Programados

Los experimentos con `scheduler` se ejecutan automáticamente según el cron especificado:

```yaml
scheduler:
  cron: "@every 1h"  # Cada hora
  cron: "@every 2h"  # Cada 2 horas
  cron: "0 2 * * *"  # A las 2 AM todos los días
```

---

## Monitoreo y Observación

### Métricas Clave a Monitorear

Durante los experimentos, monitorear:

1. **Disponibilidad del Servicio**
   - Tasa de éxito de requests
   - Tiempo de respuesta (p50, p95, p99)
   - Errores HTTP (4xx, 5xx)

2. **Recuperación**
   - Tiempo de recuperación después del caos
   - Comportamiento de circuit breakers
   - Reintentos y fallbacks

3. **Recursos**
   - Uso de CPU/memoria
   - Latencia de red
   - I/O de disco

4. **Base de Datos**
   - Conexiones activas
   - Queries lentas
   - Timeouts

### Herramientas de Monitoreo

- **Prometheus**: Métricas de sistema y aplicación
- **Grafana**: Dashboards visuales
- **Jaeger**: Traces distribuidos
- **Kibana**: Logs estructurados

### Alertas

Configurar alertas para:
- Caída de disponibilidad > 5%
- Aumento de latencia > 2x
- Errores > 1%
- Tiempo de recuperación > 5 minutos

---

## Mejores Prácticas

### 1. Empezar en Staging

- Ejecutar experimentos primero en staging
- Validar que no hay efectos secundarios
- Documentar resultados antes de producción

### 2. Horarios Apropiados

- Ejecutar experimentos en horarios de bajo tráfico
- Evitar horas pico
- Coordinar con el equipo

### 3. Blast Radius Controlado

- Comenzar con `mode: one` (un pod)
- Aumentar gradualmente a `fixed-percent`
- Nunca usar `all` en producción sin validación

### 4. Duración Limitada

- Experimentos cortos (30s - 5min)
- Aumentar duración gradualmente
- Tener plan de aborto rápido

### 5. Monitoreo Continuo

- Observar métricas antes, durante y después
- Documentar comportamiento esperado vs real
- Ajustar experimentos basado en resultados

### 6. Documentación

- Documentar cada experimento
- Registrar resultados y aprendizajes
- Compartir con el equipo

### 7. Automatización

- Usar schedulers para experimentos recurrentes
- Integrar en CI/CD para pruebas automatizadas
- Crear workflows para escenarios complejos

---

## Troubleshooting

### Experimento no se ejecuta

**Síntoma:** El experimento se crea pero no tiene efecto

**Solución:**
1. Verificar que Chaos Mesh está instalado: `kubectl get pods -n chaos-mesh`
2. Verificar que el selector coincide con pods existentes
3. Revisar logs: `kubectl logs -n chaos-mesh -l app.kubernetes.io/component=controller-manager`
4. Verificar permisos RBAC

### Experimento no se detiene

**Síntoma:** El experimento continúa después de la duración especificada

**Solución:**
1. Eliminar manualmente: `kubectl delete <chaos-type> <name> -n <namespace>`
2. Verificar que no hay schedulers activos
3. Reiniciar el controlador de Chaos Mesh si es necesario

### Efectos secundarios inesperados

**Síntoma:** El experimento afecta servicios no objetivo

**Solución:**
1. Revisar selectors y asegurar que son específicos
2. Usar namespaces para aislar experimentos
3. Verificar network policies
4. Abortar experimento inmediatamente

### Alto impacto en producción

**Síntoma:** El experimento causa degradación significativa

**Solución:**
1. Abortar experimento: `kubectl delete <chaos-type> <name> -n <namespace>`
2. Verificar que los mecanismos de recuperación funcionan
3. Revisar y ajustar experimento antes de reintentar
4. Documentar lecciones aprendidas

---

## Escenarios de Prueba

### Escenario 1: Fallo de Pod Backend

**Objetivo:** Verificar que el sistema se recupera cuando un pod del backend falla

**Experimento:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: backend-pod-failure-test
spec:
  action: pod-kill
  mode: one
  selector:
    labelSelectors:
      app: backend
  duration: "30s"
```

**Métricas a Observar:**
- Tiempo de recuperación
- Pérdida de requests durante el fallo
- Comportamiento del load balancer

### Escenario 2: Latencia de Red a MongoDB

**Objetivo:** Verificar que el backend maneja correctamente la latencia de red a la base de datos

**Experimento:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: mongodb-latency-test
spec:
  action: delay
  mode: all
  selector:
    labelSelectors:
      app: backend
  target:
    labelSelectors:
      app: mongodb
  delay:
    latency: "500ms"
  duration: "2m"
```

**Métricas a Observar:**
- Timeouts de queries
- Uso de connection pooling
- Comportamiento de retries

### Escenario 3: Partición de Red entre Backend y AI Services

**Objetivo:** Verificar que el backend maneja correctamente la falta de comunicación con AI Services

**Experimento:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: backend-ai-partition-test
spec:
  action: partition
  mode: all
  selector:
    labelSelectors:
      app: backend
  target:
    labelSelectors:
      app: ai-services
  direction: both
  duration: "1m"
```

**Métricas a Observar:**
- Activación de circuit breakers
- Fallbacks a servicios alternativos
- Errores en endpoints que usan AI Services

### Escenario 4: Sobre carga de CPU

**Objetivo:** Verificar que el sistema maneja correctamente la sobrecarga de recursos

**Experimento:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: backend-cpu-stress-test
spec:
  mode: fixed-percent
  value: "50"
  selector:
    labelSelectors:
      app: backend
  stressors:
    cpu:
      workers: 2
      load: 80
  duration: "3m"
```

**Métricas a Observar:**
- Degradación de performance
- Activación de autoscaling
- Comportamiento de rate limiting

### Escenario 5: Fallo de DNS

**Objetivo:** Verificar que el sistema maneja correctamente fallos de resolución DNS

**Experimento:**
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: DNSChaos
metadata:
  name: mongodb-dns-failure-test
spec:
  action: error
  mode: one
  selector:
    labelSelectors:
      app: backend
  patterns:
    - "mongodb.respicare-prod.svc.cluster.local"
  duration: "1m"
```

**Métricas a Observar:**
- Errores de conexión
- Uso de DNS caching
- Tiempo de recuperación

---

## Recursos Adicionales

- [Chaos Mesh Documentation](https://chaos-mesh.org/docs/)
- [Chaos Engineering Principles](https://principlesofchaos.org/)
- [Netflix Chaos Monkey](https://github.com/Netflix/chaosmonkey)
- [Gremlin Chaos Engineering](https://www.gremlin.com/chaos-engineering/)

---

**Última actualización**: Noviembre 2025

**Mantenedor**: Equipo de DevOps RespiCare

