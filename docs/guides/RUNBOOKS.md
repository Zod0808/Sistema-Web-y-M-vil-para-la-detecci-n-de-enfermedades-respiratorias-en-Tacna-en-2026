# 📘 Runbooks de Operaciones - RespiCare Tacna

Guía operativa para el equipo de DevOps y SRE sobre cómo gestionar, desplegar y mantener el sistema RespiCare.

---

## 📋 Índice

1. [Despliegue](#despliegue)
2. [Rollback](#rollback)
3. [Rotación de Secretos](#rotación-de-secretos)
4. [Recuperación de Desastres](#recuperación-de-desastres)
5. [Escalado Manual](#escalado-manual)
6. [Monitoreo y Alertas](#monitoreo-y-alertas)
7. [Troubleshooting](#troubleshooting)

---

## Despliegue

### Despliegue a Staging

#### Automático (CI/CD)
1. Push a la rama `develop` o `staging` activa el workflow automático
2. El workflow:
   - Construye imágenes Docker
   - Las sube al registry (GHCR)
   - Despliega en el namespace `respicare-staging`
   - Ejecuta smoke tests
   - Hace rollback automático si falla

#### Manual
```bash
# 1. Construir y subir imágenes
docker build -t ghcr.io/your-org/respicare-backend:staging-latest ./backend
docker push ghcr.io/your-org/respicare-backend:staging-latest

# 2. Actualizar deployment
kubectl set image deployment/backend \
  backend=ghcr.io/your-org/respicare-backend:staging-latest \
  -n respicare-staging

# 3. Verificar rollout
kubectl rollout status deployment/backend -n respicare-staging

# 4. Ejecutar smoke tests
curl -f https://staging-api.respicare.dev/health
```

### Despliegue a Producción

#### Requisitos Previos
- ✅ Todos los tests pasando
- ✅ Code review aprobado
- ✅ Tag de versión semántica creado (vX.Y.Z)
- ✅ Changelog actualizado

#### Proceso Automático (Recomendado)
1. Crear tag de versión:
```bash
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3
```

2. El workflow automático:
   - Construye imágenes con el tag de versión
   - Despliega usando estrategia blue-green
   - Ejecuta smoke tests
   - Hace rollback automático si falla

#### Proceso Manual
```bash
# 1. Verificar estado actual
kubectl get pods -n respicare-production
kubectl get deployments -n respicare-production

# 2. Construir y subir imágenes
VERSION="v1.2.3"
docker build -t ghcr.io/your-org/respicare-backend:$VERSION ./backend
docker push ghcr.io/your-org/respicare-backend:$VERSION

# 3. Blue-Green Deployment
# Crear green deployment
kubectl apply -f infrastructure/k8s/backend-deployment.yaml \
  -n respicare-production \
  --dry-run=client -o yaml | \
  sed "s/name: backend/name: backend-green/g" | \
  sed "s/app: backend/app: backend-green/g" | \
  kubectl apply -f -

# Esperar a que green esté listo
kubectl rollout status deployment/backend-green -n respicare-production

# Cambiar tráfico a green
kubectl patch service backend -n respicare-production \
  -p '{"spec":{"selector":{"app":"backend-green"}}}'

# Verificar tráfico
sleep 30
curl -f https://api.respicare.dev/health

# Si todo está bien, eliminar blue y renombrar green
kubectl delete deployment backend -n respicare-production
kubectl get deployment backend-green -n respicare-production -o yaml | \
  sed "s/name: backend-green/name: backend/g" | \
  sed "s/app: backend-green/app: backend/g" | \
  kubectl apply -f -
kubectl delete deployment backend-green -n respicare-production
```

---

## Rollback

### Rollback Automático
El workflow de deployment hace rollback automático si:
- El deployment falla (pods no inician)
- Los smoke tests fallan
- Los health checks fallan

### Rollback Manual

#### Rollback Rápido (Última Versión)
```bash
# Backend
kubectl rollout undo deployment/backend -n respicare-production
kubectl rollout status deployment/backend -n respicare-production

# AI Services
kubectl rollout undo deployment/ai-services -n respicare-production
kubectl rollout status deployment/ai-services -n respicare-production
```

#### Rollback a Versión Específica
```bash
# 1. Ver historial de revisions
kubectl rollout history deployment/backend -n respicare-production

# 2. Ver detalles de una revisión específica
kubectl rollout history deployment/backend -n respicare-production --revision=3

# 3. Rollback a revisión específica
kubectl rollout undo deployment/backend -n respicare-production --to-revision=3
```

#### Verificar Rollback
```bash
# Verificar pods
kubectl get pods -n respicare-production -l app=backend

# Verificar logs
kubectl logs -f deployment/backend -n respicare-production

# Health check
curl -f https://api.respicare.dev/health

# Verificar métricas
kubectl top pods -n respicare-production
```

---

## Rotación de Secretos

### Rotar JWT Secrets

#### 1. Generar Nuevos Secrets
```bash
# Generar nuevos secrets
NEW_JWT_SECRET=$(openssl rand -base64 32)
NEW_JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Guardar temporalmente (no en producción)
echo $NEW_JWT_SECRET > /tmp/new_jwt_secret.txt
echo $NEW_JWT_REFRESH_SECRET > /tmp/new_jwt_refresh_secret.txt
```

#### 2. Actualizar Secret en Kubernetes
```bash
# Actualizar secret
kubectl create secret generic backend-secrets \
  --from-literal=jwt_secret="$NEW_JWT_SECRET" \
  --from-literal=jwt_refresh_secret="$NEW_JWT_REFRESH_SECRET" \
  --dry-run=client -o yaml | \
  kubectl apply -f - -n respicare-production

# O actualizar solo las claves específicas
kubectl patch secret backend-secrets -n respicare-production \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/jwt_secret", "value": "'$(echo -n $NEW_JWT_SECRET | base64)'"}]'
```

#### 3. Reiniciar Pods para Aplicar Cambios
```bash
# Reiniciar deployment (rolling restart)
kubectl rollout restart deployment/backend -n respicare-production
kubectl rollout status deployment/backend -n respicare-production
```

#### 4. Verificar
```bash
# Verificar que los pods están corriendo
kubectl get pods -n respicare-production -l app=backend

# Verificar logs
kubectl logs -f deployment/backend -n respicare-production | grep -i "jwt\|auth"

# Test de autenticación
curl -X POST https://api.respicare.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Rotar MongoDB URI

#### 1. Actualizar Secret
```bash
NEW_MONGODB_URI="mongodb://new-connection-string"

kubectl create secret generic backend-secrets \
  --from-literal=mongodb_uri="$NEW_MONGODB_URI" \
  --dry-run=client -o yaml | \
  kubectl apply -f - -n respicare-production
```

#### 2. Reiniciar Deployment
```bash
kubectl rollout restart deployment/backend -n respicare-production
```

#### 3. Verificar Conexión
```bash
# Verificar logs de conexión
kubectl logs -f deployment/backend -n respicare-production | grep -i "mongodb\|connected"

# Verificar health endpoint
curl -f https://api.respicare.dev/health
```

### Rotar Encryption Keys

⚠️ **ADVERTENCIA**: Rotar encryption keys requiere re-encriptar datos existentes.

#### Proceso Completo
1. **Backup de datos** antes de rotar
2. **Actualizar secret** con nueva clave
3. **Ejecutar script de migración** para re-encriptar datos
4. **Reiniciar servicios**

```bash
# 1. Backup
kubectl exec -it deployment/backend -n respicare-production -- \
  mongodump --uri="$MONGODB_URI" --out=/tmp/backup-$(date +%Y%m%d)

# 2. Generar nueva clave
NEW_ENCRYPTION_KEY=$(openssl rand -base64 32)

# 3. Actualizar secret
kubectl patch secret backend-secrets -n respicare-production \
  --type='json' \
  -p='[{"op": "replace", "path": "/data/field_encryption_key", "value": "'$(echo -n $NEW_ENCRYPTION_KEY | base64)'"}]'

# 4. Ejecutar migración (si existe script)
kubectl exec -it deployment/backend -n respicare-production -- \
  npm run migrate:reencrypt

# 5. Reiniciar
kubectl rollout restart deployment/backend -n respicare-production
```

---

## Recuperación de Desastres

### Escenario 1: Cluster Kubernetes Caído

#### Pasos de Recuperación
1. **Verificar estado del cluster**
```bash
kubectl cluster-info
kubectl get nodes
```

2. **Si el cluster está inaccesible**
   - Contactar al proveedor de cloud (AWS/GCP/Azure)
   - Verificar estado de la infraestructura base
   - Revisar logs de eventos del cluster

3. **Restaurar desde backup**
```bash
# Restaurar deployments
kubectl apply -f infrastructure/k8s/ -n respicare-production

# Restaurar secrets (desde backup seguro)
kubectl apply -f infrastructure/k8s/backend-secrets.yaml -n respicare-production

# Verificar que los pods inician
kubectl get pods -n respicare-production
```

### Escenario 2: Base de Datos Caída

#### Pasos de Recuperación
1. **Verificar estado de MongoDB**
```bash
# Si MongoDB está en Kubernetes
kubectl get pods -n mongodb
kubectl logs -f statefulset/mongodb -n mongodb

# Si MongoDB está en Atlas
# Verificar en el dashboard de MongoDB Atlas
```

2. **Restaurar desde backup**
```bash
# Restaurar desde backup más reciente
mongorestore --uri="$MONGODB_URI" /path/to/backup/latest

# Verificar integridad
mongosh "$MONGODB_URI" --eval "db.stats()"
```

3. **Reconectar servicios**
```bash
# Reiniciar deployments para reconectar
kubectl rollout restart deployment/backend -n respicare-production
kubectl rollout restart deployment/ai-services -n respicare-production
```

### Escenario 3: Pérdida de Datos

#### Pasos de Recuperación
1. **Detener escrituras** (si es posible)
```bash
# Escalar a 0 para detener tráfico
kubectl scale deployment/backend --replicas=0 -n respicare-production
```

2. **Restaurar desde backup**
```bash
# Identificar backup más reciente antes del incidente
ls -la /backups/mongodb/

# Restaurar
mongorestore --uri="$MONGODB_URI" /backups/mongodb/backup-YYYYMMDD-HHMMSS

# Verificar datos
mongosh "$MONGODB_URI" --eval "db.collections.find().count()"
```

3. **Reiniciar servicios**
```bash
kubectl scale deployment/backend --replicas=2 -n respicare-production
```

---

## Escalado Manual

### Escalar Deployment

#### Escalar Backend
```bash
# Escalar a N réplicas
kubectl scale deployment/backend --replicas=5 -n respicare-production

# Verificar escalado
kubectl get pods -n respicare-production -l app=backend
kubectl rollout status deployment/backend -n respicare-production
```

#### Escalar AI Services
```bash
kubectl scale deployment/ai-services --replicas=8 -n respicare-production
kubectl get pods -n respicare-production -l app=ai-services
```

### Ajustar HPA

#### Modificar Límites de HPA
```bash
# Editar HPA
kubectl edit hpa backend-hpa -n respicare-production

# O aplicar cambios
kubectl apply -f infrastructure/k8s/backend-hpa-enhanced.yaml -n respicare-production
```

#### Ver Estado de HPA
```bash
# Ver HPA
kubectl get hpa -n respicare-production

# Ver detalles
kubectl describe hpa backend-hpa -n respicare-production
```

---

## Monitoreo y Alertas

### Verificar Estado de Servicios

#### Health Checks
```bash
# Backend
curl -f https://api.respicare.dev/health
curl -f https://api.respicare.dev/api/v1/health

# AI Services
curl -f https://ai.respicare.dev/api/v1/health

# Verificar desde dentro del cluster
kubectl exec -it deployment/backend -n respicare-production -- \
  curl -f http://localhost:3001/health
```

#### Métricas de Pods
```bash
# Uso de recursos
kubectl top pods -n respicare-production
kubectl top nodes

# Métricas detalladas
kubectl describe pod <pod-name> -n respicare-production
```

### Logs

#### Ver Logs en Tiempo Real
```bash
# Logs de deployment
kubectl logs -f deployment/backend -n respicare-production

# Logs de pod específico
kubectl logs -f <pod-name> -n respicare-production

# Logs de todos los pods con label
kubectl logs -f -l app=backend -n respicare-production
```

#### Buscar en Logs
```bash
# Buscar errores
kubectl logs deployment/backend -n respicare-production | grep -i error

# Buscar por timestamp
kubectl logs deployment/backend -n respicare-production --since=1h | grep "2024-11-03"
```

### Alertas

#### Verificar Alertas de Prometheus
```bash
# Acceder a Prometheus (si está desplegado)
# http://prometheus.respicare.dev/alerts

# Ver alertas activas
kubectl get prometheusrules -n monitoring
```

#### Configurar Alertas Críticas
- **Pods en CrashLoopBackOff**: Notificación inmediata
- **CPU > 90% por 5 minutos**: Escalar automáticamente
- **Memoria > 85% por 5 minutos**: Escalar automáticamente
- **Error rate > 1%**: Notificar al equipo
- **Latencia p95 > 500ms**: Notificar al equipo

---

## Escalado y Recuperación de Fallos

### Escalado de Emergencia

#### Escalar Todos los Servicios
```bash
# Escalar backend
kubectl scale deployment/backend --replicas=10 -n respicare-production

# Escalar AI Services
kubectl scale deployment/ai-services --replicas=5 -n respicare-production

# Escalar ML Advanced Service (si tiene GPU disponible)
kubectl scale deployment/ml-advanced-service --replicas=3 -n respicare-production
```

#### Escalado Vertical de Emergencia
```bash
# Aumentar recursos de backend temporalmente
kubectl set resources deployment/backend \
  --limits=cpu=8000m,memory=8Gi \
  --requests=cpu=4000m,memory=4Gi \
  -n respicare-production

# Reiniciar para aplicar cambios
kubectl rollout restart deployment/backend -n respicare-production
```

### Recuperación Rápida de Servicios

#### Reinicio Completo de Servicio
```bash
# 1. Escalar a 0
kubectl scale deployment/backend --replicas=0 -n respicare-production

# 2. Esperar 30 segundos
sleep 30

# 3. Escalar de vuelta
kubectl scale deployment/backend --replicas=3 -n respicare-production

# 4. Verificar
kubectl rollout status deployment/backend -n respicare-production
```

#### Recuperación de Base de Datos

##### MongoDB Replica Set
```bash
# Verificar estado del replica set
kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
  mongosh --eval "rs.status()"

# Si un nodo está caído, forzar re-elección
kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
  mongosh --eval "rs.stepDown()"

# Reiniciar nodo problemático
kubectl delete pod mongodb-1 -n respicare-prod
```

##### Restaurar desde Backup Rápido
```bash
# 1. Identificar backup más reciente
restic -r s3:s3.amazonaws.com/respicare-backups snapshots | tail -5

# 2. Restaurar solo colecciones críticas
restic -r s3:s3.amazonaws.com/respicare-backups restore latest \
  --target /tmp/restore \
  --include "medicalhistories.bson"

# 3. Restaurar en MongoDB
kubectl cp /tmp/restore mongodb-0:/tmp/restore -n respicare-prod
kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
  mongorestore --drop /tmp/restore
```

### Recuperación de Cache

#### Limpiar Cache Redis
```bash
# Limpiar todo el cache (usar con precaución)
kubectl exec -it statefulset/redis-0 -n respicare-prod -- \
  redis-cli FLUSHALL

# Limpiar cache específico
kubectl exec -it statefulset/redis-0 -n respicare-prod -- \
  redis-cli --scan --pattern "user:*" | xargs redis-cli DEL
```

#### Reconstruir Cache
```bash
# Forzar recarga de cache desde base de datos
kubectl exec -it deployment/backend -n respicare-prod -- \
  npm run cache:warmup
```

## Troubleshooting

### Pods No Inician

#### Diagnóstico
```bash
# Ver estado de pods
kubectl get pods -n respicare-production

# Ver eventos
kubectl describe pod <pod-name> -n respicare-production

# Ver logs de init containers
kubectl logs <pod-name> -c <init-container-name> -n respicare-production
```

#### Soluciones Comunes
- **ImagePullBackOff**: Verificar que la imagen existe y las credenciales son correctas
- **CrashLoopBackOff**: Revisar logs, verificar configuración, health checks
- **Pending**: Verificar recursos disponibles, node selectors, taints/tolerations

### Servicios No Responden

#### Diagnóstico
```bash
# Verificar servicio
kubectl get svc -n respicare-production
kubectl describe svc backend -n respicare-production

# Verificar endpoints
kubectl get endpoints backend -n respicare-production

# Test de conectividad
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://backend.respicare-production.svc.cluster.local/health
```

#### Soluciones
- Verificar que los pods tienen los labels correctos
- Verificar que el selector del servicio coincide con los labels de los pods
- Verificar NetworkPolicies que puedan estar bloqueando tráfico

### Alto Uso de Recursos

#### Diagnóstico
```bash
# Ver uso actual
kubectl top pods -n respicare-production
kubectl top nodes

# Ver límites configurados
kubectl describe pod <pod-name> -n respicare-production | grep -A 5 "Limits"
```

#### Soluciones
- Ajustar resource requests/limits en el deployment
- Escalar horizontalmente (aumentar réplicas)
- Escalar verticalmente (aumentar recursos por pod)
- Optimizar código/aplicación

### Problemas de Red

#### Diagnóstico
```bash
# Ver NetworkPolicies
kubectl get networkpolicies -n respicare-production
kubectl describe networkpolicy <policy-name> -n respicare-production

# Test de conectividad entre pods
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://ai-services.respicare-production.svc.cluster.local/api/v1/health
```

#### Soluciones
- Revisar NetworkPolicies y ajustar reglas
- Verificar que los servicios están expuestos correctamente
- Verificar DNS interno del cluster

---

## Comandos Rápidos de Referencia

```bash
# Estado general
kubectl get all -n respicare-production

# Ver pods
kubectl get pods -n respicare-production

# Ver logs
kubectl logs -f deployment/backend -n respicare-production

# Desplegar
kubectl apply -f infrastructure/k8s/backend-deployment.yaml -n respicare-production

# Rollback
kubectl rollout undo deployment/backend -n respicare-production

# Escalar
kubectl scale deployment/backend --replicas=5 -n respicare-production

# Reiniciar
kubectl rollout restart deployment/backend -n respicare-production

# Ejecutar comando en pod
kubectl exec -it deployment/backend -n respicare-production -- /bin/sh

# Port forward para debugging
kubectl port-forward deployment/backend 3001:3001 -n respicare-production
```

---

## Contactos de Emergencia

- **DevOps Lead**: [contacto]
- **SRE Team**: [contacto]
- **On-Call Engineer**: [contacto]
- **Cloud Provider Support**: [contacto]

---

**Última actualización**: 2024-11-03  
**Versión**: 1.0.0

