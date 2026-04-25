# 🎮 Guía de Infraestructura GPU para Modelos Pesados

**Fecha**: 2024-11-03  
**Versión**: 2.0.0

---

## 📋 Resumen

Esta guía documenta el diseño y configuración de infraestructura para despliegue de modelos ML pesados que requieren GPU (BERT, Computer Vision, Transformers grandes), incluyendo optimización de costos, monitoreo y caching.

---

## 🎯 Objetivos

1. **Nodos GPU Dedicados**: Configurar nodos con GPU para entrenamiento e inferencia
2. **Colas de Trabajo**: Gestionar trabajos de entrenamiento con prioridades
3. **Auto-scaling**: Escalar basado en demanda de GPU
4. **Storage**: Almacenamiento para modelos grandes y datasets
5. **Costos**: Optimizar uso de GPU para minimizar costos

---

## 🏗️ Arquitectura

### Componentes

1. **Node Pool GPU**
   - Nodos con GPU (NVIDIA T4, V100, A100 según disponibilidad)
   - Taints/Tolerations para scheduling selectivo
   - Labels para identificación

2. **Namespace ML-GPU**
   - Namespace dedicado para trabajos GPU
   - Resource Quotas y Limit Ranges
   - Políticas de recursos

3. **Deployments GPU**
   - AI Services con soporte GPU
   - Health checks extendidos
   - Resource limits con GPU

4. **Jobs y CronJobs**
   - Jobs para entrenamiento puntual
   - CronJobs para retraining recurrente
   - Backoff limits y retries

5. **Storage**
   - PVCs para modelos grandes (100GB+)
   - PVCs para datasets (500GB+)
   - Storage classes de alto rendimiento

6. **HPA GPU**
   - Escalado basado en utilización de GPU
   - Límites por GPU disponible
   - Políticas conservadoras

---

## 📦 Configuración de Nodos GPU

### GKE (Google Kubernetes Engine)

```bash
# Crear node pool con GPU
gcloud container node-pools create gpu-pool \
  --cluster=respicare-cluster \
  --zone=us-central1-a \
  --machine-type=n1-standard-4 \
  --accelerator=type=nvidia-tesla-t4,count=1 \
  --num-nodes=2 \
  --min-nodes=1 \
  --max-nodes=4 \
  --enable-autoscaling \
  --node-taints=accelerator=nvidia-tesla-t4:NoSchedule
```

### EKS (Amazon Elastic Kubernetes Service)

```bash
# Usar node group con GPU instances (g4dn.xlarge, p3.2xlarge, etc.)
eksctl create nodegroup \
  --cluster=respicare-cluster \
  --name=gpu-nodes \
  --node-type=g4dn.xlarge \
  --nodes=2 \
  --nodes-min=1 \
  --nodes-max=4 \
  --managed
```

### AKS (Azure Kubernetes Service)

```bash
# Agregar node pool con GPU
az aks nodepool add \
  --resource-group=respicare-rg \
  --cluster-name=respicare-cluster \
  --name=gpunodepool \
  --node-count=2 \
  --node-vm-size=Standard_NC6s_v3 \
  --enable-cluster-autoscaler \
  --min-count=1 \
  --max-count=4
```

---

## 🔧 Configuración de Kubernetes

### Node Labels y Taints

```yaml
# Los nodos GPU deben tener:
labels:
  accelerator: nvidia-tesla-t4
  workload-type: ml-heavy

taints:
  - key: nvidia.com/gpu
    operator: Exists
    effect: NoSchedule
```

### Tolerations en Pods

```yaml
tolerations:
  - key: "nvidia.com/gpu"
    operator: "Exists"
    effect: "NoSchedule"
```

### Node Selectors

```yaml
nodeSelector:
  accelerator: nvidia-tesla-t4
```

---

## 💾 Storage para Modelos Pesados

### Requisitos

- **Modelos**: 100GB+ (BERT, Transformers, modelos CV)
- **Datasets**: 500GB+ (datos de entrenamiento)
- **Checkpoints**: 50GB+ (snapshots durante entrenamiento)
- **Performance**: Alto IOPS para carga rápida

### Storage Classes Recomendadas

- **GKE**: `premium-rwo` (SSD persistente)
- **EKS**: `gp3` (EBS gp3 con provisioned IOPS)
- **AKS**: `managed-premium` (SSD premium)

### PVCs

```yaml
# Modelos
storage: 100Gi
accessMode: ReadWriteMany  # Para compartir entre pods
storageClass: fast-ssd

# Datos
storage: 500Gi
accessMode: ReadWriteMany
storageClass: fast-ssd
```

---

## 🚀 Despliegue de Modelos Pesados

### Deployment con GPU

```yaml
resources:
  requests:
    nvidia.com/gpu: 1
    cpu: "4"
    memory: "16Gi"
  limits:
    nvidia.com/gpu: 1
    cpu: "8"
    memory: "32Gi"
```

### Variables de Entorno

```yaml
env:
  - name: CUDA_VISIBLE_DEVICES
    value: "0"
  - name: AI_USE_GPU
    value: "1"
  - name: GPU_MEMORY_FRACTION
    value: "0.9"
  - name: TF_FORCE_GPU_ALLOW_GROWTH
    value: "true"
```

---

## 📊 Colas de Trabajo (Job Queues)

### Opciones Recomendadas

1. **Kueue** (Kubernetes Native)
   - Colas nativas de Kubernetes
   - Integración con HPA
   - Prioridades y quotas

2. **Volcano** (Batch System)
   - Sistema de colas avanzado
   - Gang scheduling
   - Fair sharing

3. **Argo Workflows**
   - Workflows complejos
   - DAGs de entrenamiento
   - Retries y timeouts

### Ejemplo con Kueue

```yaml
apiVersion: kueue.x-k8s.io/v1beta1
kind: LocalQueue
metadata:
  name: ml-training-queue
spec:
  clusterQueue: ml-gpu-cluster-queue
---
apiVersion: kueue.x-k8s.io/v1beta1
kind: Workload
metadata:
  name: train-bert-model
spec:
  queueName: ml-training-queue
  podSets:
    - name: training
      replicas: 1
      template:
        spec:
          containers:
            - name: train
              image: ai-services:gpu
              resources:
                requests:
                  nvidia.com/gpu: 1
```

---

## 📈 Auto-scaling GPU

### HPA con GPU Metrics

```yaml
metrics:
  - type: Resource
    resource:
      name: nvidia.com/gpu
      target:
        type: Utilization
        averageUtilization: 80
```

### Consideraciones

- **Límite de GPUs**: `maxReplicas` limitado por GPUs disponibles
- **Scale Down Conservador**: 600s stabilization window
- **Scale Up Rápido**: 0s stabilization window
- **Métricas**: Requiere GPU metrics exporter

---

## 🔍 Monitoreo GPU

### Métricas Clave

- **GPU Utilization**: % de uso de GPU
- **GPU Memory**: Memoria GPU utilizada
- **GPU Temperature**: Temperatura (prevenir throttling)
- **Job Queue Length**: Longitud de cola de trabajos
- **Training Duration**: Duración de entrenamientos

### Herramientas

- **NVIDIA DCGM**: Data Center GPU Manager
- **Prometheus GPU Exporter**: Exportar métricas GPU
- **Grafana Dashboards**: Visualización de métricas

---

## 💰 Optimización de Costos

### Ahorro Estimado

Con las optimizaciones implementadas:
- **Spot Instances**: 60-90% de ahorro vs on-demand
- **Auto-scaling Agresivo**: 30-50% de reducción de costos
- **Caché de Modelos**: Reducción de tiempo de carga y uso de GPU

### Estrategias

1. **Spot/Preemptible Instances**
   - Usar para entrenamiento no crítico
   - Ahorro de hasta 80%
   - Requiere checkpointing frecuente
   - Configuración: `infrastructure/k8s/gpu-spot-instances.yaml`

2. **Auto-scaling Agresivo**
   - Scale down cuando no hay trabajos (1 minuto)
   - Scale up solo cuando es necesario (inmediato)
   - Usar predicción de demanda
   - Configuración: `infrastructure/k8s/gpu-aggressive-autoscaling.yaml`

3. **Scheduling Inteligente**
   - Agrupar trabajos pequeños
   - Usar gang scheduling
   - Priorizar trabajos críticos

4. **Model Optimization**
   - Quantization (INT8, FP16)
   - Pruning
   - Knowledge Distillation

### Checkpointing para Spot Instances

Sistema de checkpointing implementado en `ai-services/ml_models/train_with_checkpointing.py`:

- **Checkpoints automáticos**: Cada 5 minutos (configurable via `CHECKPOINT_INTERVAL`)
- **Guardado persistente**: En PVC para sobrevivir a terminaciones de spot instances
- **Recuperación automática**: Carga desde último checkpoint al reiniciar
- **Limpieza automática**: Mantiene solo los últimos 5 checkpoints

**Configuración**:
```bash
CHECKPOINT_DIR=/checkpoints  # Directorio para checkpoints
CHECKPOINT_INTERVAL=300  # Segundos entre checkpoints
SPOT_INSTANCE=true  # Habilitar manejo de interrupciones
```

**Uso**:
```python
from ml_models.train_with_checkpointing import CheckpointManager

checkpoint_manager = CheckpointManager(
    checkpoint_dir=Path("/checkpoints"),
    interval_seconds=300
)

# Durante entrenamiento
for epoch in range(max_epochs):
    # ... entrenamiento ...
    
    if checkpoint_manager.should_checkpoint():
        checkpoint_manager.save_checkpoint(
            epoch=epoch,
            model_state=model.state_dict(),
            optimizer_state=optimizer.state_dict(),
            metrics={'loss': loss, 'accuracy': acc}
        )
```

**Recuperación**:
```python
# Al iniciar entrenamiento
checkpoint_data = checkpoint_manager.load_latest_checkpoint()
if checkpoint_data:
    start_epoch = checkpoint_data['epoch'] + 1
    model.load_state_dict(checkpoint_data['model_state'])
    optimizer.load_state_dict(checkpoint_data['optimizer_state'])
```

---

## 🛠️ Comandos Útiles

### Verificar GPUs Disponibles

```bash
# Ver nodos con GPU
kubectl get nodes -l accelerator=nvidia-tesla-t4

# Ver GPUs en nodos
kubectl describe node <node-name> | grep nvidia.com/gpu

# Ver pods usando GPU
kubectl get pods -n ml-gpu -o json | jq '.items[] | select(.spec.containers[].resources.requests."nvidia.com/gpu")'
```

### Monitorear Uso de GPU

```bash
# En un pod con GPU
nvidia-smi

# Métricas desde Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Luego consultar: nvidia_gpu_utilization
```

### Ejecutar Job de Entrenamiento

```bash
# Crear job
kubectl apply -f infrastructure/k8s/gpu-nodes.yaml

# Ver logs
kubectl logs -n ml-gpu job/train-heavy-model -f

# Ver estado
kubectl get jobs -n ml-gpu
```

---

## 📝 Checklist de Despliegue

- [ ] Node pool GPU creado y configurado
- [ ] Namespace `ml-gpu` creado
- [ ] Resource Quotas y Limit Ranges configurados
- [ ] PVCs para modelos y datos creados
- [ ] Deployments GPU configurados con node selectors
- [ ] Tolerations configurados en pods
- [ ] HPA GPU configurado
- [ ] Jobs/CronJobs para entrenamiento configurados
- [ ] GPU metrics exporter desplegado
- [ ] Dashboards Grafana para GPU creados
- [ ] Alertas configuradas (GPU utilization, temperatura)
- [ ] Documentación de procedimientos operacionales

---

## 🔐 Seguridad

### Consideraciones

1. **Namespace Isolation**: Aislar recursos GPU en namespace dedicado
2. **RBAC**: Restringir acceso a recursos GPU
3. **Network Policies**: Limitar comunicación de pods GPU
4. **Secrets**: Gestionar credenciales para datasets externos

---

## 📚 Recursos Adicionales

- [NVIDIA GPU Operator](https://github.com/NVIDIA/gpu-operator)
- [Kueue Documentation](https://kueue.sigs.k8s.io/)
- [Volcano Documentation](https://volcano.sh/)
- [GKE GPU Setup](https://cloud.google.com/kubernetes-engine/docs/how-to/gpus)
- [EKS GPU Setup](https://docs.aws.amazon.com/eks/latest/userguide/gpu-ami.html)

---

**Última actualización**: 2024-11-03  
**Mantenido por**: Equipo DevOps/ML RespiCare

