# 🔧 Guía de Troubleshooting - RespiCare Tacna

Guía completa para diagnóstico y resolución de problemas comunes en el sistema RespiCare.

---

## 📋 Índice

1. [Problemas de Backend](#problemas-de-backend)
2. [Problemas de AI Services](#problemas-de-ai-services)
3. [Problemas de Base de Datos](#problemas-de-base-de-datos)
4. [Problemas de Red y Conectividad](#problemas-de-red-y-conectividad)
5. [Problemas de Performance](#problemas-de-performance)
6. [Problemas de Seguridad](#problemas-de-seguridad)
7. [Problemas de Integraciones](#problemas-de-integraciones)
8. [Procedimientos de Recuperación](#procedimientos-de-recuperación)

---

## Problemas de Backend

### El Backend no Inicia

#### Síntomas
- Pods en estado `CrashLoopBackOff`
- Logs muestran errores de inicio
- Health check falla

#### Diagnóstico

```bash
# Ver logs del pod
kubectl logs -n respicare-prod deployment/backend --tail=100

# Ver eventos
kubectl get events -n respicare-prod --sort-by='.lastTimestamp'

# Verificar configuración
kubectl describe deployment backend -n respicare-prod
```

#### Causas Comunes

1. **Variables de Entorno Faltantes**
   ```bash
   # Verificar secrets
   kubectl get secrets -n respicare-prod
   kubectl describe secret backend-secrets -n respicare-prod
   ```

2. **Conexión a MongoDB Fallida**
   ```bash
   # Verificar conectividad
   kubectl exec -it deployment/backend -n respicare-prod -- \
     nc -zv mongodb.respicare-prod.svc.cluster.local 27017
   ```

3. **Conexión a Redis Fallida**
   ```bash
   # Verificar Redis
   kubectl exec -it deployment/backend -n respicare-prod -- \
     redis-cli -h redis.respicare-prod.svc.cluster.local ping
   ```

#### Soluciones

1. **Verificar Secrets**:
   ```bash
   # Recrear secret si falta
   kubectl create secret generic backend-secrets \
     --from-literal=JWT_SECRET='...' \
     --from-literal=MONGODB_URI='...' \
     -n respicare-prod
   ```

2. **Verificar Conectividad**:
   ```bash
   # Probar conexión MongoDB
   kubectl run -it --rm debug --image=mongo:7.0 --restart=Never -- \
     mongosh "mongodb://mongodb.respicare-prod.svc.cluster.local:27017/respicare"
   ```

3. **Reiniciar Deployment**:
   ```bash
   kubectl rollout restart deployment/backend -n respicare-prod
   ```

### Errores 500 en API

#### Síntomas
- Requests retornan 500 Internal Server Error
- Logs muestran excepciones no manejadas

#### Diagnóstico

```bash
# Ver logs de errores
kubectl logs -n respicare-prod deployment/backend | grep ERROR

# Verificar métricas de errores
curl http://backend.respicare-prod.svc.cluster.local:3000/metrics | grep http_requests_errors
```

#### Causas Comunes

1. **Base de Datos No Disponible**
   ```bash
   # Verificar estado MongoDB
   kubectl get pods -n respicare-prod | grep mongodb
   kubectl logs -n respicare-prod statefulset/mongodb
   ```

2. **Redis No Disponible**
   ```bash
   # Verificar Redis
   kubectl get pods -n respicare-prod | grep redis
   ```

3. **Memoria Insuficiente**
   ```bash
   # Verificar uso de memoria
   kubectl top pods -n respicare-prod | grep backend
   ```

#### Soluciones

1. **Reiniciar Servicios Dependientes**:
   ```bash
   kubectl rollout restart statefulset/mongodb -n respicare-prod
   kubectl rollout restart statefulset/redis -n respicare-prod
   ```

2. **Escalar Backend**:
   ```bash
   kubectl scale deployment backend --replicas=3 -n respicare-prod
   ```

3. **Aumentar Recursos**:
   ```bash
   kubectl set resources deployment backend \
     --limits=memory=2Gi,cpu=2000m \
     -n respicare-prod
   ```

### Latencia Alta

#### Síntomas
- Requests tardan >1 segundo
- Timeouts frecuentes
- Usuarios reportan lentitud

#### Diagnóstico

```bash
# Ver métricas de latencia
curl http://backend.respicare-prod.svc.cluster.local:3000/metrics | \
  grep http_request_duration

# Ver percentiles
curl http://backend.respicare-prod.svc.cluster.local:3000/api/v1/metrics/percentiles
```

#### Causas Comunes

1. **Queries MongoDB Lentas**
   ```bash
   # Verificar slow queries
   kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
     mongosh --eval "db.setProfilingLevel(2, { slowms: 1000 })"
   ```

2. **Cache No Funcionando**
   ```bash
   # Verificar Redis
   kubectl exec -it statefulset/redis-0 -n respicare-prod -- \
     redis-cli INFO stats
   ```

3. **Carga Alta**
   ```bash
   # Verificar carga de CPU
   kubectl top pods -n respicare-prod
   ```

#### Soluciones

1. **Optimizar Queries**:
   - Revisar índices MongoDB
   - Agregar índices faltantes
   - Optimizar agregaciones

2. **Aumentar Cache**:
   ```bash
   # Verificar configuración de cache
   kubectl get configmap backend-config -n respicare-prod -o yaml
   ```

3. **Escalar Horizontalmente**:
   ```bash
   kubectl scale deployment backend --replicas=5 -n respicare-prod
   ```

---

## Problemas de AI Services

### Modelos No Cargan

#### Síntomas
- Errores al hacer predicciones
- Logs muestran "Model not found"
- Timeouts en endpoints ML

#### Diagnóstico

```bash
# Ver logs de AI Services
kubectl logs -n respicare-prod deployment/ai-services --tail=100

# Verificar storage de modelos
kubectl exec -it deployment/ai-services -n respicare-prod -- \
  ls -la /models
```

#### Soluciones

1. **Verificar PVC de Modelos**:
   ```bash
   kubectl get pvc -n respicare-prod | grep ml-models
   kubectl describe pvc ml-models-pvc -n respicare-prod
   ```

2. **Re-descargar Modelos**:
   ```bash
   kubectl exec -it deployment/ai-services -n respicare-prod -- \
     python scripts/download_models.py
   ```

3. **Verificar Permisos**:
   ```bash
   kubectl exec -it deployment/ai-services -n respicare-prod -- \
     ls -la /models
   ```

### Predicciones Lentas

#### Síntomas
- Predicciones tardan >5 segundos
- Timeouts en requests ML

#### Diagnóstico

```bash
# Verificar uso de GPU
kubectl exec -it deployment/ml-advanced-service -n respicare-prod -- \
  nvidia-smi

# Verificar métricas de performance
curl http://ai-services.respicare-prod.svc.cluster.local:8000/metrics | \
  grep ml_prediction_duration
```

#### Soluciones

1. **Verificar GPU**:
   ```bash
   # Ver estado de GPU
   kubectl describe node | grep nvidia.com/gpu
   ```

2. **Optimizar Modelos**:
   - Usar modelos cuantizados
   - Reducir batch size
   - Habilitar caching

3. **Escalar Servicio ML**:
   ```bash
   kubectl scale deployment ml-advanced-service --replicas=2 -n respicare-prod
   ```

### Errores de Memoria en ML

#### Síntomas
- OOMKilled en pods ML
- Errores de memoria insuficiente

#### Soluciones

1. **Aumentar Límites de Memoria**:
   ```bash
   kubectl set resources deployment/ml-advanced-service \
     --limits=memory=16Gi \
     -n respicare-prod
   ```

2. **Reducir Caché de Modelos**:
   ```bash
   # Configurar variable de entorno
   kubectl set env deployment/ml-advanced-service \
     MODEL_CACHE_SIZE=2 \
     -n respicare-prod
   ```

3. **Usar Modelos Más Pequeños**:
   - Cambiar a modelos cuantizados
   - Usar modelos más ligeros cuando sea posible

---

## Problemas de Base de Datos

### MongoDB No Responde

#### Síntomas
- Timeouts en queries
- Errores de conexión
- Pods en estado no saludable

#### Diagnóstico

```bash
# Verificar estado de pods
kubectl get pods -n respicare-prod | grep mongodb

# Ver logs
kubectl logs -n respicare-prod statefulset/mongodb-0 --tail=100

# Verificar conectividad
kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
  mongosh --eval "db.adminCommand('ping')"
```

#### Soluciones

1. **Verificar Replica Set**:
   ```bash
   kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
     mongosh --eval "rs.status()"
   ```

2. **Reiniciar Pods**:
   ```bash
   kubectl delete pod mongodb-0 -n respicare-prod
   # Esperar a que se reinicie automáticamente
   ```

3. **Verificar Storage**:
   ```bash
   kubectl get pvc -n respicare-prod | grep mongodb
   kubectl describe pvc mongodb-data-mongodb-0 -n respicare-prod
   ```

### Replicación Lag Alta

#### Síntomas
- Datos no se sincronizan entre nodos
- Lecturas inconsistentes

#### Diagnóstico

```bash
# Verificar lag de replicación
kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
  mongosh --eval "rs.printSlaveReplicationInfo()"
```

#### Soluciones

1. **Verificar Red**:
   ```bash
   # Probar conectividad entre nodos
   kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
     ping mongodb-1.mongodb.respicare-prod.svc.cluster.local
   ```

2. **Aumentar Oplog Size**:
   ```bash
   kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
     mongosh --eval "db.getSiblingDB('local').oplog.rs.stats()"
   ```

3. **Reiniciar Secondary**:
   ```bash
   kubectl delete pod mongodb-1 -n respicare-prod
   ```

### Disk Space Lleno

#### Síntomas
- Errores de escritura
- Pods en estado `Pending`
- Warnings de espacio

#### Diagnóstico

```bash
# Verificar uso de disco
kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
  df -h

# Ver tamaño de base de datos
kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
  mongosh --eval "db.stats()"
```

#### Soluciones

1. **Limpiar Datos Antiguos**:
   ```bash
   # Eliminar logs antiguos
   kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
     mongosh --eval "db.auditlogs.deleteMany({ createdAt: { $lt: new Date('2024-01-01') } })"
   ```

2. **Aumentar Storage**:
   ```bash
   # Expandir PVC
   kubectl patch pvc mongodb-data-mongodb-0 -n respicare-prod \
     -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'
   ```

3. **Comprimir Base de Datos**:
   ```bash
   kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
     mongosh --eval "db.runCommand({ compact: 'medicalhistories' })"
   ```

---

## Problemas de Red y Conectividad

### Servicios No Se Comunican

#### Síntomas
- Timeouts entre servicios
- Errores de conexión
- Network policies bloqueando tráfico

#### Diagnóstico

```bash
# Verificar network policies
kubectl get networkpolicies -n respicare-prod

# Probar conectividad
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  wget -O- http://backend.respicare-prod.svc.cluster.local:3000/health
```

#### Soluciones

1. **Verificar Network Policies**:
   ```bash
   kubectl describe networkpolicy backend-network-policy -n respicare-prod
   ```

2. **Permitir Tráfico**:
   ```bash
   # Actualizar network policy si es necesario
   kubectl apply -f infrastructure/k8s/backend-networkpolicies.yaml -n respicare-prod
   ```

3. **Verificar DNS**:
   ```bash
   kubectl run -it --rm debug --image=busybox --restart=Never -- \
     nslookup backend.respicare-prod.svc.cluster.local
   ```

### Ingress No Funciona

#### Síntomas
- No se puede acceder desde internet
- Errores 502/503
- Certificados SSL expirados

#### Diagnóstico

```bash
# Verificar ingress
kubectl get ingress -n respicare-prod
kubectl describe ingress backend-ingress -n respicare-prod

# Verificar certificados
kubectl get certificates -n respicare-prod
kubectl describe certificate backend-tls -n respicare-prod
```

#### Soluciones

1. **Renovar Certificado**:
   ```bash
   kubectl delete certificate backend-tls -n respicare-prod
   # Cert-manager lo recreará automáticamente
   ```

2. **Verificar Annotations**:
   ```bash
   kubectl get ingress backend-ingress -n respicare-prod -o yaml | grep annotations
   ```

3. **Verificar Backend Service**:
   ```bash
   kubectl get svc backend -n respicare-prod
   kubectl describe svc backend -n respicare-prod
   ```

---

## Problemas de Performance

### CPU Alta

#### Diagnóstico

```bash
# Ver uso de CPU
kubectl top pods -n respicare-prod

# Ver procesos que consumen CPU
kubectl exec -it deployment/backend -n respicare-prod -- \
  top -n 1
```

#### Soluciones

1. **Escalar Horizontalmente**:
   ```bash
   kubectl scale deployment backend --replicas=5 -n respicare-prod
   ```

2. **Aumentar Límites de CPU**:
   ```bash
   kubectl set resources deployment backend \
     --limits=cpu=4000m \
     -n respicare-prod
   ```

3. **Optimizar Código**:
   - Revisar loops pesados
   - Optimizar queries
   - Aumentar caching

### Memoria Alta

#### Diagnóstico

```bash
# Ver uso de memoria
kubectl top pods -n respicare-prod

# Ver procesos que consumen memoria
kubectl exec -it deployment/backend -n respicare-prod -- \
  ps aux --sort=-%mem | head -10
```

#### Soluciones

1. **Aumentar Límites de Memoria**:
   ```bash
   kubectl set resources deployment backend \
     --limits=memory=4Gi \
     -n respicare-prod
   ```

2. **Revisar Memory Leaks**:
   - Revisar logs para OOMKilled
   - Analizar heap dumps
   - Revisar código para leaks

3. **Reducir Caché**:
   ```bash
   # Reducir tamaño de caché Redis
   kubectl set env deployment/backend \
     REDIS_MAX_MEMORY=1gb \
     -n respicare-prod
   ```

---

## Problemas de Seguridad

### Certificados SSL Expirados

#### Diagnóstico

```bash
# Verificar certificados
kubectl get certificates -n respicare-prod
kubectl describe certificate backend-tls -n respicare-prod

# Verificar en el navegador
openssl s_client -connect api.respicare.dev:443 -servername api.respicare.dev
```

#### Soluciones

1. **Renovar Automáticamente**:
   ```bash
   # Cert-manager debería renovar automáticamente
   # Forzar renovación
   kubectl delete certificate backend-tls -n respicare-prod
   ```

2. **Verificar ClusterIssuer**:
   ```bash
   kubectl get clusterissuer
   kubectl describe clusterissuer letsencrypt-prod
   ```

### Tokens JWT Invalidos

#### Diagnóstico

```bash
# Verificar configuración JWT
kubectl get secret backend-secrets -n respicare-prod -o yaml | \
  grep JWT_SECRET

# Ver logs de autenticación
kubectl logs -n respicare-prod deployment/backend | grep "Token inválido"
```

#### Soluciones

1. **Verificar Secret**:
   ```bash
   kubectl get secret backend-secrets -n respicare-prod
   ```

2. **Rotar Secret**:
   ```bash
   # Generar nuevo secret
   NEW_SECRET=$(openssl rand -base64 32)
   
   # Actualizar secret
   kubectl create secret generic backend-secrets \
     --from-literal=JWT_SECRET=$NEW_SECRET \
     --dry-run=client -o yaml | \
     kubectl apply -f - -n respicare-prod
   
   # Reiniciar pods
   kubectl rollout restart deployment/backend -n respicare-prod
   ```

---

## Problemas de Integraciones

### FHIR Endpoints No Funcionan

#### Diagnóstico

```bash
# Verificar servicio FHIR
kubectl get svc -n respicare-prod | grep fhir

# Probar endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://api.respicare.dev/api/v1/fhir/capabilities
```

#### Soluciones

1. **Verificar Configuración**:
   ```bash
   kubectl get configmap integration-config -n respicare-prod -o yaml
   ```

2. **Verificar Secrets**:
   ```bash
   kubectl get secret oauth2-credentials -n respicare-prod
   ```

### Integraciones con Laboratorios Fallan

#### Diagnóstico

```bash
# Ver logs de integración
kubectl logs -n respicare-prod deployment/backend | grep laboratory

# Verificar conectividad
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v https://lab-api.example.com/health
```

#### Soluciones

1. **Verificar Credenciales**:
   ```bash
   kubectl get secret laboratory-credentials -n respicare-prod
   ```

2. **Verificar Certificados mTLS**:
   ```bash
   kubectl get secret mtls-certificates -n respicare-prod
   ```

---

## Procedimientos de Recuperación

### Recuperación de Base de Datos

#### Restaurar desde Backup

```bash
# 1. Listar backups disponibles
restic -r s3:s3.amazonaws.com/respicare-backups snapshots

# 2. Restaurar backup más reciente
restic -r s3:s3.amazonaws.com/respicare-backups restore latest \
  --target /tmp/restore

# 3. Restaurar en MongoDB
kubectl cp /tmp/restore mongodb-0:/tmp/restore -n respicare-prod
kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
  mongorestore /tmp/restore
```

### Recuperación de Servicios

#### Restaurar Deployment

```bash
# 1. Ver historial de deployments
kubectl rollout history deployment/backend -n respicare-prod

# 2. Rollback a versión anterior
kubectl rollout undo deployment/backend -n respicare-prod

# 3. Rollback a versión específica
kubectl rollout undo deployment/backend --to-revision=3 -n respicare-prod
```

### Recuperación de Datos Perdidos

#### Point-in-Time Recovery

```bash
# 1. Identificar punto en el tiempo
TIMESTAMP="2024-11-21T10:30:00Z"

# 2. Restaurar backup completo
restic -r s3:s3.amazonaws.com/respicare-backups restore \
  --target /tmp/restore \
  --time $TIMESTAMP

# 3. Aplicar oplog hasta punto específico
kubectl exec -it statefulset/mongodb-0 -n respicare-prod -- \
  mongorestore --oplogReplay --oplogLimit=$(date -d $TIMESTAMP +%s) \
  /tmp/restore
```

---

## Checklist de Troubleshooting

### Antes de Contactar Soporte

- [ ] Revisar logs recientes
- [ ] Verificar estado de pods
- [ ] Verificar conectividad de red
- [ ] Verificar recursos (CPU, memoria, disco)
- [ ] Verificar configuración (secrets, configmaps)
- [ ] Intentar reiniciar servicios afectados
- [ ] Revisar documentación relevante
- [ ] Verificar si es un problema conocido

### Información para Reportar

- Descripción del problema
- Pasos para reproducir
- Logs relevantes
- Estado de recursos
- Configuración actual
- Intentos de solución realizados

---

## Referencias

- [Runbooks de Operaciones](RUNBOOKS.md)
- [Guía de Deployment](DEPLOYMENT.md)
- [Performance Playbook](PERFORMANCE_PLAYBOOK.md)
- [Security Developer Guide](SECURITY_DEVELOPER_GUIDE.md)

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0

