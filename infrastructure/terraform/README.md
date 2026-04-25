# Terraform Infrastructure as Code

Este directorio contiene la configuración de Terraform para gestionar la infraestructura de RespiCare Tacna.

## Estructura

```
infrastructure/terraform/
├── main.tf              # Recursos principales (namespaces, configmaps, secrets, network policies)
├── variables.tf         # Variables de entrada
├── outputs.tf          # Outputs de la infraestructura
├── terraform.tfvars.example  # Ejemplo de variables
└── README.md           # Esta documentación
```

## Requisitos Previos

1. **Terraform** >= 1.5.0
2. **kubectl** configurado y conectado al cluster
3. **Acceso al cluster Kubernetes**
4. **Credenciales** para proveedores (MongoDB Atlas, etc.)

## Uso

### Inicialización

```bash
cd infrastructure/terraform

# Copiar ejemplo de variables
cp terraform.tfvars.example terraform.tfvars

# Editar terraform.tfvars con valores reales
# NOTA: terraform.tfvars debe estar en .gitignore

# Inicializar Terraform
terraform init
```

### Planificación

```bash
# Ver qué cambios se harán
terraform plan

# Plan específico para staging
terraform plan -var="environment=staging"

# Plan específico para producción
terraform plan -var="environment=production"
```

### Aplicación

```bash
# Aplicar cambios
terraform apply

# Aplicar con confirmación automática (solo para staging)
terraform apply -auto-approve -var="environment=staging"

# Aplicar para producción (requiere confirmación)
terraform apply -var="environment=production"
```

### Destrucción

⚠️ **ADVERTENCIA**: Solo usar en desarrollo/staging, nunca en producción sin backup.

```bash
# Destruir infraestructura
terraform destroy -var="environment=staging"
```

## Variables

### Variables Requeridas

- `mongodb_uri`: URI de conexión a MongoDB
- `jwt_secret`: Secret para JWT
- `jwt_refresh_secret`: Secret para refresh tokens
- `field_encryption_key`: Clave para encriptación de campos

### Variables Opcionales

- `environment`: Entorno (staging/production), default: staging
- `cluster_name`: Nombre del cluster, default: respicare-cluster
- `region`: Región del proveedor, default: us-east-1
- `domain_name`: Dominio principal, default: respicare.dev

## Secretos

⚠️ **IMPORTANTE**: Los secretos no deben estar en código. Usar:

1. **Variables de entorno**:
```bash
export TF_VAR_mongodb_uri="mongodb://..."
export TF_VAR_jwt_secret="..."
terraform apply
```

2. **Archivo de secretos** (no versionado):
```bash
# .secrets.tfvars (en .gitignore)
mongodb_uri = "mongodb://..."
jwt_secret = "..."
terraform apply -var-file=.secrets.tfvars
```

3. **Secret Management Tools**:
   - HashiCorp Vault
   - AWS Secrets Manager
   - External Secrets Operator (Kubernetes)

## Outputs

Después de aplicar, ver outputs:

```bash
terraform output
```

Outputs disponibles:
- `namespace`: Namespace creado
- `backend_config_map`: Nombre del ConfigMap del backend
- `ai_services_config_map`: Nombre del ConfigMap de AI Services
- `api_url`: URL de la API
- `ai_services_url`: URL de AI Services
- `web_url`: URL de la aplicación web

## Mejores Prácticas

1. **Estado Remoto**: Configurar backend remoto (S3, GCS, etc.) para estado compartido
2. **Workspaces**: Usar workspaces para diferentes entornos
3. **Modules**: Crear módulos reutilizables para componentes comunes
4. **Validación**: Ejecutar `terraform validate` antes de aplicar
5. **Formato**: Ejecutar `terraform fmt` para formatear código
6. **Plan antes de Apply**: Siempre revisar el plan antes de aplicar

## Troubleshooting

### Error: "No se puede conectar al cluster"
```bash
# Verificar kubeconfig
kubectl cluster-info

# Verificar contexto
kubectl config current-context

# Especificar contexto en variables
terraform apply -var="kube_context=my-cluster-context"
```

### Error: "Namespace ya existe"
```bash
# Importar recurso existente
terraform import kubernetes_namespace.staging[0] respicare-staging

# O eliminar y recrear (solo en staging)
kubectl delete namespace respicare-staging
terraform apply
```

## Próximos Pasos

- [ ] Agregar módulos para componentes reutilizables
- [ ] Integrar con proveedores de cloud (AWS EKS, GKE, AKS)
- [ ] Agregar recursos de monitoring (Prometheus, Grafana)
- [ ] Agregar recursos de logging (ELK, Loki)
- [ ] Configurar backend remoto para estado compartido

