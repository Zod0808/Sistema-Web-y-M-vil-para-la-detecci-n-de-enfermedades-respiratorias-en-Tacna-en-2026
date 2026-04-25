# Guía de GitOps con ArgoCD para RespiCare

Esta guía explica cómo configurar y usar GitOps con ArgoCD para gestionar el despliegue de RespiCare en Kubernetes.

## 📋 Tabla de Contenidos

- [Introducción](#introducción)
- [Conceptos de GitOps](#conceptos-de-gitops)
- [Instalación de ArgoCD](#instalación-de-argocd)
- [Configuración Inicial](#configuración-inicial)
- [Estructura de Aplicaciones](#estructura-de-aplicaciones)
- [Patrón App of Apps](#patrón-app-of-apps)
- [ApplicationSets](#applicationsets)
- [Sincronización Automática](#sincronización-automática)
- [Gestión de Ambientes](#gestión-de-ambientes)
- [Seguridad y Permisos](#seguridad-y-permisos)
- [Monitoreo y Observabilidad](#monitoreo-y-observabilidad)
- [Troubleshooting](#troubleshooting)
- [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

### ¿Qué es GitOps?

GitOps es una metodología de operaciones que utiliza Git como fuente única de verdad para la infraestructura y aplicaciones. Los cambios se realizan mediante commits a Git, y el sistema automáticamente sincroniza el estado deseado con el estado real del cluster.

### Ventajas de GitOps

- ✅ **Auditoría completa**: Todo cambio está versionado en Git
- ✅ **Rollback fácil**: Revertir cambios es tan simple como hacer git revert
- ✅ **Consistencia**: El estado deseado siempre está definido en Git
- ✅ **Colaboración**: Múltiples equipos pueden trabajar con pull requests
- ✅ **Automatización**: Sincronización automática sin intervención manual

### ArgoCD

ArgoCD es una herramienta de GitOps continua para Kubernetes que:

- Monitorea aplicaciones y las mantiene sincronizadas con el estado definido en Git
- Proporciona una UI web para visualizar el estado de las aplicaciones
- Soporta múltiples formatos: Kubernetes manifests, Helm, Kustomize
- Incluye control de acceso basado en roles (RBAC)

---

## Conceptos de GitOps

### Flujo de Trabajo

```
1. Desarrollador hace cambios en código
2. CI/CD pipeline construye imagen Docker
3. Desarrollador actualiza manifests en Git
4. ArgoCD detecta cambios en Git
5. ArgoCD sincroniza cambios al cluster
6. Aplicación se actualiza automáticamente
```

### Estados de Sincronización

- **Synced**: La aplicación está sincronizada con Git
- **OutOfSync**: Hay diferencias entre Git y el cluster
- **Unknown**: ArgoCD no puede determinar el estado
- **Degraded**: La aplicación está desplegada pero no saludable

---

## Instalación de ArgoCD

### 1. Instalar ArgoCD en el Cluster

```bash
# Crear namespace
kubectl create namespace argocd

# Instalar ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Esperar a que todos los pods estén listos
kubectl wait --for=condition=ready pod --all -n argocd --timeout=300s
```

### 2. Acceder a la UI de ArgoCD

```bash
# Obtener contraseña inicial del admin
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port-forward para acceder localmente
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Acceder a https://localhost:8080
# Usuario: admin
# Contraseña: (la obtenida anteriormente)
```

### 3. Instalar CLI de ArgoCD

```bash
# Linux
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd

# macOS
brew install argocd

# Windows
# Descargar desde: https://github.com/argoproj/argo-cd/releases
```

### 4. Login desde CLI

```bash
# Login
argocd login localhost:8080 --username admin --password <password>

# Cambiar contraseña (recomendado)
argocd account update-password
```

---

## Configuración Inicial

### 1. Configurar Repositorio Git

```bash
# Agregar repositorio
argocd repo add https://github.com/your-org/respicare.git \
  --name respicare \
  --username git-username \
  --password git-token

# Verificar repositorio
argocd repo list
```

### 2. Crear Proyecto ArgoCD

```bash
# Aplicar configuración del proyecto
kubectl apply -f infrastructure/argocd/app-of-apps.yaml

# Verificar proyecto
argocd proj get respicare
```

### 3. Configurar Aplicaciones

```bash
# Aplicar aplicaciones individuales
kubectl apply -f infrastructure/argocd/application.yaml

# O aplicar App of Apps (recomendado)
kubectl apply -f infrastructure/argocd/app-of-apps.yaml
```

---

## Estructura de Aplicaciones

### Aplicaciones Principales

Las aplicaciones de RespiCare están organizadas por componente:

1. **respicare-backend**: Backend API
2. **respicare-ai-services**: Servicios de IA/ML
3. **respicare-mongodb**: Base de datos MongoDB
4. **respicare-monitoring**: Prometheus, Grafana, Alertmanager
5. **respicare-logging**: Elasticsearch, Kibana, Logstash
6. **respicare-observability**: Jaeger, OpenTelemetry
7. **respicare-infrastructure**: Ingress, Load Balancer, Certificados
8. **respicare-security**: RBAC, Network Policies
9. **respicare-ml-advanced**: Servicios ML avanzados, GPU
10. **respicare-messaging**: RabbitMQ, Kong, Istio

### Estructura de Directorios

```
infrastructure/
├── argocd/
│   ├── application.yaml          # Aplicaciones individuales
│   └── app-of-apps.yaml          # Patrón App of Apps
└── k8s/
    ├── backend-*.yaml
    ├── ai-services-*.yaml
    ├── mongodb-*.yaml
    └── ...
```

---

## Patrón App of Apps

El patrón **App of Apps** permite gestionar múltiples aplicaciones de forma centralizada.

### Ventajas

- ✅ Gestión centralizada de todas las aplicaciones
- ✅ Sincronización automática de aplicaciones hijas
- ✅ Fácil escalabilidad para agregar nuevas aplicaciones

### Estructura

```
respicare-root (App of Apps)
├── respicare-backend
├── respicare-ai-services
├── respicare-mongodb
└── ...
```

### Aplicar App of Apps

```bash
# Aplicar aplicación raíz
kubectl apply -f infrastructure/argocd/app-of-apps.yaml

# Verificar estado
argocd app get respicare-root
```

---

## ApplicationSets

Los **ApplicationSets** permiten crear múltiples aplicaciones dinámicamente basadas en generadores.

### Generadores Disponibles

1. **List Generator**: Lista estática de elementos
2. **Cluster Generator**: Basado en clusters disponibles
3. **Git Generator**: Basado en directorios en Git
4. **Matrix Generator**: Combinación de múltiples generadores

### Ejemplo: Múltiples Ambientes

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: respicare-environments
spec:
  generators:
    - list:
        elements:
          - environment: development
            namespace: respicare-dev
            branch: develop
          - environment: production
            namespace: respicare-prod
            branch: main
  template:
    # Template para cada ambiente
```

### Aplicar ApplicationSet

```bash
kubectl apply -f infrastructure/argocd/app-of-apps.yaml

# Ver aplicaciones generadas
argocd app list
```

---

## Sincronización Automática

### Configurar Sincronización Automática

```yaml
spec:
  syncPolicy:
    automated:
      prune: true        # Eliminar recursos obsoletos
      selfHeal: true     # Auto-corregir desviaciones
      allowEmpty: false  # No permitir aplicaciones vacías
```

### Opciones de Sincronización

- **prune**: Elimina recursos que ya no están en Git
- **selfHeal**: Corrige automáticamente desviaciones del estado deseado
- **allowEmpty**: Permite aplicaciones sin recursos

### Sincronización Manual

```bash
# Sincronizar aplicación específica
argocd app sync respicare-backend

# Sincronizar todas las aplicaciones
argocd app sync --all

# Sincronizar con opciones
argocd app sync respicare-backend \
  --prune \
  --timeout 300 \
  --strategy hook
```

### Estrategias de Sincronización

- **hook**: Usa hooks de ArgoCD (recomendado)
- **apply**: Usa kubectl apply
- **replace**: Usa kubectl replace

---

## Gestión de Ambientes

### Estructura de Ambientes

```
develop (branch: develop)
├── respicare-dev namespace
└── Replicas: 1

staging (branch: staging)
├── respicare-staging namespace
└── Replicas: 2

production (branch: main)
├── respicare-prod namespace
└── Replicas: 3
```

### Configurar Ambientes

```bash
# Ver aplicaciones por ambiente
argocd app list --selector environment=production

# Sincronizar ambiente específico
argocd app sync respicare-backend-production

# Ver diferencias entre ambientes
argocd app diff respicare-backend-development respicare-backend-production
```

### Promoción entre Ambientes

1. **Desarrollo → Staging**:
   ```bash
   # Merge develop → staging
   git checkout staging
   git merge develop
   git push origin staging
   # ArgoCD sincroniza automáticamente
   ```

2. **Staging → Production**:
   ```bash
   # Crear PR de staging → main
   # Revisar y aprobar
   # Merge main
   # ArgoCD sincroniza automáticamente
   ```

---

## Seguridad y Permisos

### Configurar RBAC

```yaml
# En app-of-apps.yaml
roles:
  - name: developer
    policies:
      - p, proj:respicare:developer, applications, get, respicare/*, allow
    groups:
      - developers
```

### Políticas de Acceso

- **Developer**: Solo lectura y sincronización
- **DevOps**: Acceso completo a aplicaciones
- **Admin**: Acceso completo al proyecto

### Configurar Acceso

```bash
# Crear cuenta de usuario
argocd account create-user developer --password <password>

# Asignar rol
argocd proj role add-policy respicare developer \
  "p, proj:respicare:developer, applications, get, respicare/*, allow"

# Asignar usuario a grupo
argocd account update-password --account developer
```

### Integración con OIDC

```yaml
# ConfigMap argocd-cm
data:
  url: https://argocd.respicare.example.com
  oidc.config: |
    name: Keycloak
    issuer: https://keycloak.respicare.example.com
    clientId: argocd
    requestedScopes: ["openid", "profile", "email", "groups"]
```

---

## Monitoreo y Observabilidad

### Métricas de ArgoCD

ArgoCD expone métricas en Prometheus:

```yaml
# Scrape config para Prometheus
- job_name: 'argocd'
  kubernetes_sd_configs:
    - role: endpoints
      namespaces:
        names:
          - argocd
  relabel_configs:
    - source_labels: [__meta_kubernetes_service_name]
      action: keep
      regex: argocd-metrics
```

### Alertas Recomendadas

```yaml
# Alertas para ArgoCD
groups:
  - name: argocd
    rules:
      - alert: ArgoCDApplicationOutOfSync
        expr: argocd_app_info{sync_status!="Synced"} == 1
        annotations:
          summary: "Application {{ $labels.name }} is out of sync"
      
      - alert: ArgoCDApplicationDegraded
        expr: argocd_app_info{health_status=="Degraded"} == 1
        annotations:
          summary: "Application {{ $labels.name }} is degraded"
```

### Dashboards de Grafana

Importar dashboard oficial de ArgoCD:
- Dashboard ID: `14584`
- URL: https://grafana.com/grafana/dashboards/14584

---

## Troubleshooting

### Problema: Aplicación no sincroniza

**Diagnóstico:**
```bash
# Ver estado de la aplicación
argocd app get respicare-backend

# Ver logs de sincronización
argocd app logs respicare-backend

# Ver diferencias
argocd app diff respicare-backend
```

**Soluciones:**
1. Verificar que el repositorio Git sea accesible
2. Verificar permisos del repositorio
3. Verificar que los manifests sean válidos
4. Revisar logs del ArgoCD Application Controller

### Problema: Recursos no se crean

**Diagnóstico:**
```bash
# Ver eventos de la aplicación
argocd app get respicare-backend --show-params

# Ver recursos desplegados
kubectl get all -n respicare-prod
```

**Soluciones:**
1. Verificar que el namespace exista o esté habilitado CreateNamespace
2. Verificar permisos RBAC
3. Verificar quotas de recursos
4. Revisar logs del cluster

### Problema: Sincronización lenta

**Diagnóstico:**
```bash
# Ver tiempo de sincronización
argocd app get respicare-backend -o wide

# Ver métricas de ArgoCD
kubectl top pods -n argocd
```

**Soluciones:**
1. Aumentar recursos del ArgoCD Application Controller
2. Reducir frecuencia de reconciliación
3. Optimizar tamaño de los manifests
4. Usar sync windows para evitar sincronizaciones innecesarias

### Problema: Conflictos de merge

**Solución:**
```bash
# Forzar sincronización (cuidado: puede sobrescribir cambios manuales)
argocd app sync respicare-backend --force

# O usar replace strategy
argocd app sync respicare-backend --strategy replace
```

---

## Mejores Prácticas

### 1. Estructura de Repositorio

```
repo/
├── infrastructure/
│   ├── argocd/
│   │   ├── application.yaml
│   │   └── app-of-apps.yaml
│   └── k8s/
│       ├── backend/
│       ├── ai-services/
│       └── ...
└── applications/
    ├── backend/
    └── ai-services/
```

### 2. Versionado de Manifests

- Usar tags de Git para versiones estables
- Usar branches para ambientes (develop, staging, main)
- Nunca hacer cambios directos en el cluster

### 3. Sincronización

- Habilitar `selfHeal` para corrección automática
- Usar `prune` con precaución (revisar antes de habilitar)
- Configurar sync windows para evitar actualizaciones en horarios críticos

### 4. Seguridad

- Usar External Secrets Operator para credenciales
- Configurar RBAC apropiado
- Habilitar audit logging
- Usar Sealed Secrets o SOPS para secrets en Git

### 5. Monitoreo

- Configurar alertas para aplicaciones out-of-sync
- Monitorear métricas de ArgoCD
- Revisar logs regularmente
- Usar dashboards de Grafana

### 6. Rollback

```bash
# Rollback a versión anterior
argocd app rollback respicare-backend <revision>

# O revertir en Git
git revert <commit-hash>
git push origin main
# ArgoCD sincroniza automáticamente
```

### 7. Testing

- Probar cambios en desarrollo primero
- Usar sync windows para producción
- Validar manifests antes de commit
- Usar ArgoCD CLI para validación local

---

## Comandos Útiles

### Gestión de Aplicaciones

```bash
# Listar aplicaciones
argocd app list

# Obtener detalles de aplicación
argocd app get respicare-backend

# Sincronizar aplicación
argocd app sync respicare-backend

# Eliminar aplicación
argocd app delete respicare-backend

# Ver historial
argocd app history respicare-backend
```

### Gestión de Repositorios

```bash
# Listar repositorios
argocd repo list

# Agregar repositorio
argocd repo add https://github.com/your-org/respicare.git

# Eliminar repositorio
argocd repo rm https://github.com/your-org/respicare.git
```

### Gestión de Proyectos

```bash
# Listar proyectos
argocd proj list

# Obtener detalles de proyecto
argocd proj get respicare

# Crear proyecto
argocd proj create respicare
```

---

## Referencias

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://www.gitops.tech/)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [ApplicationSet Documentation](https://argocd-applicationset.readthedocs.io/)

---

**Última actualización**: Diciembre 2024

