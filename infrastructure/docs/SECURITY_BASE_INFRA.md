# Seguridad Base - Infraestructura

Este documento describe la configuración de infraestructura para la Fase 4: Seguridad Base del proyecto RespiCare.

## 📋 Componentes de Seguridad Base

### 1. TLS/SSL y Certificados

**Archivos:**
- `infrastructure/k8s/security-tls-config.yaml` - Configuración de TLS y cert-manager
- `infrastructure/k8s/security-ingress-tls.yaml` - Ingress con TLS habilitado

**Características:**
- ✅ Cert-manager para gestión automática de certificados
- ✅ Let's Encrypt para certificados TLS gratuitos
- ✅ TLS 1.2+ (mínimo) y TLS 1.3 (preferido)
- ✅ Cipher suites seguros (ECDHE con AES-GCM)
- ✅ HSTS (HTTP Strict Transport Security) habilitado
- ✅ Renovación automática de certificados

**Uso:**
```bash
# Aplicar configuración de TLS
kubectl apply -f infrastructure/k8s/security-tls-config.yaml

# Aplicar Ingress con TLS
kubectl apply -f infrastructure/k8s/security-ingress-tls.yaml

# Verificar certificados
kubectl get certificates -n respicare-prod
kubectl describe certificate backend-api-tls -n respicare-prod
```

### 2. RBAC (Role-Based Access Control)

**Archivo:**
- `infrastructure/k8s/security-base-rbac.yaml` - Roles y ServiceAccounts

**Características:**
- ✅ ServiceAccounts específicos para cada servicio
- ✅ Roles con permisos mínimos necesarios
- ✅ RoleBindings para asociar ServiceAccounts con Roles
- ✅ ClusterRoles para permisos a nivel de cluster (monitoring)

**Estructura:**
- `backend-service-account` - ServiceAccount para Backend
- `ai-services-service-account` - ServiceAccount para AI Services
- `core-domains-service-account` - ServiceAccount para Core Domains
- `prometheus-service-account` - ServiceAccount para Prometheus

**Uso:**
```bash
# Aplicar RBAC
kubectl apply -f infrastructure/k8s/security-base-rbac.yaml

# Verificar ServiceAccounts
kubectl get serviceaccounts -n respicare-prod

# Verificar Roles
kubectl get roles -n respicare-prod
```

### 3. Pod Security Standards

**Archivo:**
- `infrastructure/k8s/security-pod-security-standards.yaml` - Security Contexts

**Características:**
- ✅ Pod Security Standards en modo "restricted"
- ✅ Security Contexts con configuración restrictiva:
  - `runAsNonRoot: true` - No ejecutar como root
  - `readOnlyRootFilesystem: true` - Root filesystem de solo lectura
  - `allowPrivilegeEscalation: false` - Sin escalación de privilegios
  - `capabilities.drop: ALL` - Eliminar todas las capabilities
  - `seccompProfile: RuntimeDefault` - Seccomp restrictivo

**Uso:**
```bash
# Aplicar Pod Security Standards
kubectl apply -f infrastructure/k8s/security-pod-security-standards.yaml

# Verificar labels en namespace
kubectl get namespace respicare-prod -o yaml | grep pod-security
```

### 4. Network Policies Mejoradas

**Archivo:**
- `infrastructure/k8s/security-network-policies-enhanced.yaml` - Políticas de red

**Características:**
- ✅ Network Policies restrictivas por servicio
- ✅ Control de tráfico ingress/egress granular
- ✅ Aislamiento entre servicios
- ✅ Solo permite conexiones necesarias

**Políticas implementadas:**
- `backend-network-policy-enhanced` - Solo permite tráfico desde Ingress y servicios internos
- `ai-services-network-policy-enhanced` - Solo permite tráfico desde Backend y Core Domains
- `mongodb-network-policy-enhanced` - Solo permite conexiones desde servicios autorizados
- `redis-network-policy-enhanced` - Solo permite conexiones desde servicios autorizados

**Uso:**
```bash
# Aplicar Network Policies
kubectl apply -f infrastructure/k8s/security-network-policies-enhanced.yaml

# Verificar Network Policies
kubectl get networkpolicies -n respicare-prod

# Probar conectividad
kubectl exec -it <pod-name> -n respicare-prod -- ping <target-service>
```

### 5. External Secrets Operator

**Archivo:**
- `infrastructure/k8s/security-external-secrets.yaml` - Gestión de secretos externos

**Características:**
- ✅ Integración con AWS Secrets Manager
- ✅ Sincronización automática de secretos
- ✅ Renovación periódica de secretos
- ✅ Secretos gestionados externamente (no en Git)

**Secretos gestionados:**
- MongoDB URI
- JWT Secrets (secret y refresh secret)
- Field Encryption Key

**Uso:**
```bash
# Instalar External Secrets Operator (si no está instalado)
kubectl apply -f https://raw.githubusercontent.com/external-secrets/external-secrets/main/deploy/charts/external-secrets/templates/crds/crds.yaml

# Aplicar configuración de External Secrets
kubectl apply -f infrastructure/k8s/security-external-secrets.yaml

# Verificar External Secrets
kubectl get externalsecrets -n respicare-prod
kubectl describe externalsecret mongodb-uri-secret -n respicare-prod
```

## 🔒 Configuración de Seguridad por Capa

### Capa 1: Red (Network Layer)
- ✅ Network Policies para aislar servicios
- ✅ TLS/SSL para encriptación en tránsito
- ✅ Ingress con WAF (Web Application Firewall)

### Capa 2: Aplicación (Application Layer)
- ✅ Security Contexts restrictivos
- ✅ Pod Security Standards
- ✅ Rate limiting en Ingress

### Capa 3: Autenticación y Autorización
- ✅ RBAC para control de acceso en Kubernetes
- ✅ ServiceAccounts con permisos mínimos
- ✅ JWT para autenticación de aplicaciones

### Capa 4: Secretos (Secrets Layer)
- ✅ External Secrets Operator
- ✅ Secretos gestionados externamente
- ✅ Rotación automática de secretos

## 📊 Verificación de Seguridad

### Checklist de Seguridad Base

- [ ] Certificados TLS configurados y renovándose automáticamente
- [ ] HSTS habilitado en todos los Ingress
- [ ] Network Policies aplicadas y funcionando
- [ ] Pod Security Standards en modo "restricted"
- [ ] ServiceAccounts con permisos mínimos
- [ ] External Secrets Operator sincronizando secretos
- [ ] WAF habilitado en Ingress
- [ ] Rate limiting configurado
- [ ] Headers de seguridad configurados (X-Frame-Options, CSP, etc.)

### Comandos de Verificación

```bash
# Verificar certificados TLS
kubectl get certificates -n respicare-prod
kubectl describe certificate backend-api-tls -n respicare-prod

# Verificar Network Policies
kubectl get networkpolicies -n respicare-prod
kubectl describe networkpolicy backend-network-policy-enhanced -n respicare-prod

# Verificar RBAC
kubectl get roles,rolebindings -n respicare-prod
kubectl describe role backend-role -n respicare-prod

# Verificar External Secrets
kubectl get externalsecrets -n respicare-prod
kubectl get secrets -n respicare-prod

# Verificar Security Contexts
kubectl get pods -n respicare-prod -o jsonpath='{.items[*].spec.securityContext}'

# Verificar Pod Security Standards
kubectl get namespace respicare-prod -o jsonpath='{.metadata.labels}' | grep pod-security
```

## 🚀 Despliegue

### Orden de Aplicación

1. **Primero: RBAC y ServiceAccounts**
```bash
kubectl apply -f infrastructure/k8s/security-base-rbac.yaml
```

2. **Segundo: Pod Security Standards**
```bash
kubectl apply -f infrastructure/k8s/security-pod-security-standards.yaml
```

3. **Tercero: TLS y Certificados**
```bash
kubectl apply -f infrastructure/k8s/security-tls-config.yaml
```

4. **Cuarto: External Secrets (si se usa)**
```bash
kubectl apply -f infrastructure/k8s/security-external-secrets.yaml
```

5. **Quinto: Network Policies**
```bash
kubectl apply -f infrastructure/k8s/security-network-policies-enhanced.yaml
```

6. **Sexto: Ingress con TLS**
```bash
kubectl apply -f infrastructure/k8s/security-ingress-tls.yaml
```

## 📝 Notas Importantes

1. **Cert-manager**: Debe estar instalado antes de aplicar las configuraciones de TLS
2. **External Secrets Operator**: Requiere configuración de AWS IAM roles si se usa AWS Secrets Manager
3. **Network Policies**: Aplicar después de que los servicios estén funcionando para evitar bloqueos
4. **Pod Security Standards**: Pueden requerir ajustes en los deployments existentes
5. **Email en cert-manager**: Cambiar `admin@respicare.dev` por un email real

## 🔗 Referencias

- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [External Secrets Operator](https://external-secrets.io/)
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

