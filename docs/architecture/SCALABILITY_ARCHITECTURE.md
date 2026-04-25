# 📈 Arquitectura de Escalabilidad - RespiCare Tacna

Guía completa de la arquitectura de escalabilidad, microservicios y estrategias de crecimiento del sistema.

---

## 📋 Índice

1. [Arquitectura de Microservicios](#arquitectura-de-microservicios)
2. [API Gateway](#api-gateway)
3. [Service Mesh](#service-mesh)
4. [Message Queue](#message-queue)
5. [Estrategia de Base de Datos](#estrategia-de-base-de-datos)
6. [Separación de Servicios ML](#separación-de-servicios-ml)
7. [Kubernetes y Orquestación](#kubernetes-y-orquestación)
8. [Estrategias de Caching](#estrategias-de-caching)

---

## Arquitectura de Microservicios

### Diseño Propuesto

El sistema se descompone en los siguientes microservicios:

#### 1. **Auth Service** (Autenticación y Autorización)
- **Responsabilidades**:
  - Autenticación (JWT, OAuth2)
  - Autorización (RBAC)
  - Gestión de usuarios
  - Refresh tokens
- **Escalabilidad**: Alta (muchas requests de autenticación)
- **Recursos**: 2-4 pods, CPU: 500m-1000m, Memoria: 512Mi-1Gi

#### 2. **Clinical Service** (Servicios Clínicos)
- **Responsabilidades**:
  - Historias médicas
  - Citas médicas
  - Prescripciones
  - Alertas
- **Escalabilidad**: Media-Alta
- **Recursos**: 3-6 pods, CPU: 1000m-2000m, Memoria: 1Gi-2Gi

#### 3. **ML Service** (Machine Learning)
- **Responsabilidades**:
  - Análisis de síntomas
  - Predicciones ML
  - SHAP explainability
  - Modelos base (RF, XGBoost, NN)
- **Escalabilidad**: Media (modelos en memoria)
- **Recursos**: 2-4 pods, CPU: 2000m-4000m, Memoria: 2Gi-4Gi

#### 4. **ML Advanced Service** (ML Avanzado)
- **Responsabilidades**:
  - BERT médico
  - Computer Vision (ResNet50)
  - Time Series
  - AutoML
- **Escalabilidad**: Baja (requiere GPU)
- **Recursos**: 1-2 pods con GPU, CPU: 4000m, Memoria: 8Gi-16Gi, GPU: 1

#### 5. **Analytics Service** (Analytics y BI)
- **Responsabilidades**:
  - Dashboards
  - Reportes automáticos
  - Métricas operativas
  - Exportación de datos
- **Escalabilidad**: Media
- **Recursos**: 2-4 pods, CPU: 1000m-2000m, Memoria: 2Gi-4Gi

#### 6. **Notification Service** (Notificaciones)
- **Responsabilidades**:
  - Notificaciones push
  - Emails
  - SMS (opcional)
  - Cola de notificaciones
- **Escalabilidad**: Alta (muchas notificaciones)
- **Recursos**: 2-4 pods, CPU: 500m-1000m, Memoria: 512Mi-1Gi

#### 7. **Integration Service** (Integraciones Externas)
- **Responsabilidades**:
  - FHIR/HL7
  - Laboratorios
  - APIs de medicamentos
  - OAuth2/mTLS
- **Escalabilidad**: Baja-Media
- **Recursos**: 1-2 pods, CPU: 1000m, Memoria: 1Gi-2Gi

### Comunicación entre Microservicios

```
┌─────────────┐
│ API Gateway │
└──────┬──────┘
       │
       ├──► Auth Service
       ├──► Clinical Service ──┐
       ├──► ML Service         │
       ├──► ML Advanced Service│──► Message Queue
       ├──► Analytics Service  │
       ├──► Notification Service
       └──► Integration Service
```

### Ventajas de la Descomposición

1. **Escalabilidad Independiente**: Cada servicio escala según demanda
2. **Despliegue Independiente**: Deploy sin afectar otros servicios
3. **Tecnología Flexible**: Cada servicio puede usar diferentes stacks
4. **Aislamiento de Fallos**: Fallo en un servicio no afecta otros
5. **Equipos Autónomos**: Equipos pueden trabajar en paralelo

---

## API Gateway

### Implementación: Kong

Kong se usa como API Gateway para:
- Enrutamiento de requests
- Rate limiting
- Autenticación centralizada
- Load balancing
- SSL termination
- Request/Response transformation

### Configuración Kong

```yaml
apiVersion: v1
kind: Service
metadata:
  name: kong-gateway
  namespace: respicare
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8000
    name: http
  - port: 443
    targetPort: 8443
    name: https
  selector:
    app: kong
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong
  namespace: respicare
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kong
  template:
    metadata:
      labels:
        app: kong
    spec:
      containers:
      - name: kong
        image: kong:3.4
        env:
        - name: KONG_DATABASE
          value: "off"
        - name: KONG_DECLARATIVE_CONFIG
          value: "/kong/declarative/kong.yml"
        - name: KONG_PROXY_ACCESS_LOG
          value: "/dev/stdout"
        - name: KONG_ADMIN_ACCESS_LOG
          value: "/dev/stdout"
        - name: KONG_PROXY_ERROR_LOG
          value: "/dev/stderr"
        - name: KONG_ADMIN_ERROR_LOG
          value: "/dev/stderr"
        - name: KONG_ADMIN_LISTEN
          value: "0.0.0.0:8001"
        ports:
        - containerPort: 8000
        - containerPort: 8443
        - containerPort: 8001
        volumeMounts:
        - name: kong-config
          mountPath: /kong/declarative
      volumes:
      - name: kong-config
        configMap:
          name: kong-config
```

### Rutas Configuradas

```yaml
# kong.yml
_format_version: "3.0"

services:
  - name: auth-service
    url: http://auth-service.respicare.svc.cluster.local:3000
    routes:
      - name: auth-routes
        paths:
          - /api/v1/auth
        strip_path: false

  - name: clinical-service
    url: http://clinical-service.respicare.svc.cluster.local:3000
    routes:
      - name: clinical-routes
        paths:
          - /api/v1/medical-histories
          - /api/v1/appointments
          - /api/v1/prescriptions
          - /api/v1/alerts
        strip_path: false
        plugins:
          - name: rate-limiting
            config:
              minute: 100
              hour: 1000

  - name: ml-service
    url: http://ml-service.respicare.svc.cluster.local:8000
    routes:
      - name: ml-routes
        paths:
          - /api/v1/ml
        strip_path: false
        plugins:
          - name: rate-limiting
            config:
              minute: 50
              hour: 500

  - name: ml-advanced-service
    url: http://ml-advanced-service.respicare.svc.cluster.local:8000
    routes:
      - name: ml-advanced-routes
        paths:
          - /api/v1/ml/advanced
        strip_path: false
        plugins:
          - name: rate-limiting
            config:
              minute: 20
              hour: 200
```

---

## Service Mesh

### Istio

Istio proporciona:
- **Service Discovery**: Descubrimiento automático de servicios
- **Load Balancing**: Balanceo de carga inteligente
- **Traffic Management**: Gestión de tráfico (canary, blue-green)
- **Security**: mTLS automático entre servicios
- **Observability**: Métricas, logs, traces

### Configuración Istio

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: respicare-istio
  namespace: istio-system
spec:
  profile: default
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
    telemetry:
      v2:
        prometheus:
          enabled: true
```

### Virtual Services

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: clinical-service
  namespace: respicare
spec:
  hosts:
  - clinical-service
  http:
  - match:
    - uri:
        prefix: /api/v1/medical-histories
    route:
    - destination:
        host: clinical-service
        subset: v1
      weight: 90
    - destination:
        host: clinical-service
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: clinical-service
  namespace: respicare
spec:
  host: clinical-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

---

## Message Queue

### RabbitMQ

RabbitMQ se usa para:
- Procesamiento asíncrono
- Colas de trabajos pesados
- Notificaciones en background
- Sincronización entre servicios

### Configuración RabbitMQ

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: respicare
spec:
  serviceName: rabbitmq
  replicas: 3
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3.12-management
        env:
        - name: RABBITMQ_ERLANG_COOKIE
          value: "SWQOKODSQALRPCLNMEQG"
        - name: RABBITMQ_DEFAULT_USER
          value: "respicare"
        - name: RABBITMQ_DEFAULT_PASS
          valueFrom:
            secretKeyRef:
              name: rabbitmq-secrets
              key: password
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        volumeMounts:
        - name: rabbitmq-data
          mountPath: /var/lib/rabbitmq
  volumeClaimTemplates:
  - metadata:
      name: rabbitmq-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

### Colas Definidas

- **ml-predictions**: Predicciones ML asíncronas
- **notifications**: Cola de notificaciones
- **reports**: Generación de reportes
- **sync-laboratory**: Sincronización con laboratorios
- **analytics-jobs**: Trabajos de analytics

---

## Estrategia de Base de Datos

### Replicación MongoDB

#### Replica Set (3 nodos)

```yaml
# Configuración de Replica Set
replication:
  replSetName: "respicare-rs"

# Nodos:
# - Primary: Escrituras y lecturas
# - Secondary 1: Solo lecturas
# - Secondary 2: Solo lecturas + backup
```

**Ventajas**:
- Alta disponibilidad (99.9%+)
- Lecturas distribuidas
- Failover automático

### Sharding (Para >10M documentos)

#### Estrategia de Sharding

```javascript
// Shard key: patientId (distribución por paciente)
sh.shardCollection("respicare.medicalhistories", { patientId: 1 })

// Shards:
// - Shard 1: patientId 0-33M
// - Shard 2: patientId 33M-66M
// - Shard 3: patientId 66M-100M
```

**Cuándo usar Sharding**:
- >10M documentos en una colección
- >100GB de datos
- Necesidad de distribución geográfica

### Read Replicas

```yaml
# Configuración de Read Replicas
readPreference: "secondaryPreferred"
readConcern: { level: "majority" }
```

**Uso**:
- Analytics y reportes (lecturas pesadas)
- Dashboards (consultas frecuentes)
- No afecta performance de escrituras

---

## Separación de Servicios ML

### Arquitectura de Servicios ML

```
┌─────────────────────┐
│   ML Service        │  (Modelos base: RF, XGBoost, NN)
│   - CPU: 2-4 cores  │
│   - Mem: 2-4 Gi     │
└─────────────────────┘
         │
         ├──► Message Queue
         │
┌─────────────────────┐
│ ML Advanced Service │  (BERT, CV, Time Series)
│   - GPU: 1          │
│   - CPU: 4 cores    │
│   - Mem: 8-16 Gi    │
└─────────────────────┘
```

### Deployment Separado

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-advanced-service
  namespace: respicare
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ml-advanced
  template:
    metadata:
      labels:
        app: ml-advanced
    spec:
      nodeSelector:
        accelerator: nvidia-tesla-t4
      containers:
      - name: ml-advanced
        image: respicare/ml-advanced:latest
        resources:
          requests:
            cpu: "4000m"
            memory: "8Gi"
            nvidia.com/gpu: 1
          limits:
            cpu: "8000m"
            memory: "16Gi"
            nvidia.com/gpu: 1
```

---

## Kubernetes y Orquestación

### Namespaces por Entorno

```yaml
# Namespaces
- respicare-dev
- respicare-staging
- respicare-prod
```

### Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: respicare-quota
  namespace: respicare-prod
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"
```

### Pod Disruption Budgets

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: clinical-service-pdb
  namespace: respicare-prod
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: clinical-service
```

---

## Estrategias de Caching

### Caching Multi-Nivel

1. **L1: In-Memory (Local)**
   - Caché en cada pod
   - TTL: 5-15 minutos
   - Para datos frecuentemente accedidos

2. **L2: Redis Cluster**
   - Caché distribuido
   - TTL: 1-24 horas
   - Para datos compartidos entre pods

3. **L3: CDN (CloudFront/Cloudflare)**
   - Assets estáticos
   - TTL: 1-7 días
   - Para imágenes, CSS, JS

### Redis Cluster

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: respicare
spec:
  serviceName: redis-cluster
  replicas: 6
  selector:
    matchLabels:
      app: redis-cluster
  template:
    metadata:
      labels:
        app: redis-cluster
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - /etc/redis/redis.conf
        - --cluster-enabled
        - yes
        - --cluster-config-file
        - /data/nodes.conf
        ports:
        - containerPort: 6379
        - containerPort: 16379
        volumeMounts:
        - name: redis-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

---

## Métricas de Escalabilidad

### Objetivos

- **Throughput**: 5,000 req/s (actual: ~1,000)
- **Latencia p95**: <150ms (actual: <180ms)
- **Disponibilidad**: 99.9% uptime
- **Usuarios concurrentes**: 10,000+ (actual: ~1,000)
- **Escalado automático**: <2 minutos

### Monitoreo

- **HPA (Horizontal Pod Autoscaler)**: Escalado automático basado en CPU/memoria
- **VPA (Vertical Pod Autoscaler)**: Ajuste automático de recursos
- **KEDA**: Escalado basado en métricas personalizadas (colas, eventos)

---

## Roadmap de Implementación

### Fase 1: Base (Semana 1-2)
- ✅ Namespaces por entorno
- ✅ Resource quotas
- ✅ HPA básico

### Fase 2: API Gateway (Semana 2-3)
- ✅ Kong deployment
- ✅ Configuración de rutas
- ✅ Rate limiting

### Fase 3: Message Queue (Semana 3-4)
- ✅ RabbitMQ deployment
- ✅ Integración con servicios
- ✅ Colas definidas

### Fase 4: Service Mesh (Semana 4-5)
- ✅ Istio installation
- ✅ Virtual services
- ✅ mTLS automático

### Fase 5: Microservicios (Semana 5-8)
- ✅ Separación de servicios
- ✅ Comunicación entre servicios
- ✅ Despliegue independiente

### Fase 6: Base de Datos (Semana 8-9)
- ✅ Replica set MongoDB
- ✅ Read replicas
- ✅ Sharding (si necesario)

---

## Referencias

- [Kong Documentation](https://docs.konghq.com/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [MongoDB Sharding](https://docs.mongodb.com/manual/sharding/)
- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0

