/**
 * Terraform Infrastructure as Code
 * 
 * Define la infraestructura base para RespiCare Tacna
 * Incluye: Kubernetes cluster, bases de datos, redes, load balancers
 */

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.13"
    }
  }
  
  # Backend configuration (ejemplo con S3, ajustar según necesidad)
  # backend "s3" {
  #   bucket = "respicare-terraform-state"
  #   key    = "infrastructure/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

# Variables
variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  default     = "staging"
}

variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
  default     = "respicare-cluster"
}

variable "region" {
  description = "Cloud provider region"
  type        = string
  default     = "us-east-1"
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

variable "node_instance_type" {
  description = "Instance type for worker nodes"
  type        = string
  default     = "t3.medium"
}

# Provider configuration
provider "kubernetes" {
  config_path    = var.kubeconfig_path
  config_context = var.kube_context
}

provider "helm" {
  kubernetes {
    config_path    = var.kubeconfig_path
    config_context = var.kube_context
  }
}

# Namespaces
resource "kubernetes_namespace" "staging" {
  count = var.environment == "staging" ? 1 : 0
  metadata {
    name = "respicare-staging"
    labels = {
      environment = "staging"
      managed-by   = "terraform"
    }
  }
}

resource "kubernetes_namespace" "production" {
  count = var.environment == "production" ? 1 : 0
  metadata {
    name = "respicare-production"
    labels = {
      environment = "production"
      managed-by   = "terraform"
    }
  }
}

# ConfigMaps for application configuration
resource "kubernetes_config_map" "backend_config" {
  metadata {
    name      = "backend-config"
    namespace = var.environment == "production" ? kubernetes_namespace.production[0].metadata[0].name : kubernetes_namespace.staging[0].metadata[0].name
  }
  
  data = {
    NODE_ENV           = var.environment == "production" ? "production" : "staging"
    PORT               = "3001"
    LOG_LEVEL          = var.environment == "production" ? "info" : "debug"
    RATE_LIMIT_ENABLED = "true"
    RATE_LIMIT_WINDOW  = "900000"
    RATE_LIMIT_MAX     = "100"
  }
}

resource "kubernetes_config_map" "ai_services_config" {
  metadata {
    name      = "ai-services-config"
    namespace = var.environment == "production" ? kubernetes_namespace.production[0].metadata[0].name : kubernetes_namespace.staging[0].metadata[0].name
  }
  
  data = {
    AI_RATE_LIMIT_ENABLED    = "1"
    AI_RATE_LIMIT_CAPACITY   = "100"
    AI_RATE_LIMIT_REFILL_PER_SEC = "5"
    AI_MAX_BODY_BYTES        = "2097152"
    AI_USE_REAL_MODELS       = var.environment == "production" ? "1" : "0"
    OTEL_ENABLED             = "1"
  }
}

# Secrets (usar variables de entorno o secretos externos)
# NOTA: Los secretos reales deben gestionarse con herramientas como Sealed Secrets, External Secrets Operator, o Vault
resource "kubernetes_secret" "backend_secrets" {
  metadata {
    name      = "backend-secrets"
    namespace = var.environment == "production" ? kubernetes_namespace.production[0].metadata[0].name : kubernetes_namespace.staging[0].metadata[0].name
  }
  
  type = "Opaque"
  
  # Estos valores deben venir de variables sensibles o secretos externos
  data = {
    mongodb_uri         = base64encode(var.mongodb_uri)
    jwt_secret          = base64encode(var.jwt_secret)
    jwt_refresh_secret  = base64encode(var.jwt_refresh_secret)
    field_encryption_key = base64encode(var.field_encryption_key)
  }
}

# MongoDB Atlas Cluster (opcional, si se usa MongoDB Atlas)
# resource "mongodbatlas_cluster" "main" {
#   project_id   = var.mongodb_atlas_project_id
#   name         = "respicare-${var.environment}"
#   provider_name = "AWS"
#   provider_instance_size_name = "M10"
#   provider_region_name = var.region
#   
#   backup_enabled = true
#   auto_scaling_disk_gb_enabled = true
# }

# Network Policies
resource "kubernetes_network_policy" "backend_network_policy" {
  metadata {
    name      = "backend-network-policy"
    namespace = var.environment == "production" ? kubernetes_namespace.production[0].metadata[0].name : kubernetes_namespace.staging[0].metadata[0].name
  }
  
  spec {
    pod_selector {
      match_labels = {
        app = "backend"
      }
    }
    
    policy_types = ["Ingress", "Egress"]
    
    ingress {
      from {
        namespace_selector {
          match_labels = {
            name = "ingress-nginx"
          }
        }
      }
      ports {
        port     = "3001"
        protocol = "TCP"
      }
    }
    
    egress {
      to {
        pod_selector {
          match_labels = {
            app = "mongodb"
          }
        }
      }
      ports {
        port     = "27017"
        protocol = "TCP"
      }
    }
    
    egress {
      to {
        pod_selector {
          match_labels = {
            app = "ai-services"
          }
        }
      }
      ports {
        port     = "8000"
        protocol = "TCP"
      }
    }
    
    egress {
      # Allow DNS
      to {}
      ports {
        port     = "53"
        protocol = "UDP"
      }
    }
  }
}

# Resource Quotas
resource "kubernetes_resource_quota" "namespace_quota" {
  metadata {
    name      = "namespace-quota"
    namespace = var.environment == "production" ? kubernetes_namespace.production[0].metadata[0].name : kubernetes_namespace.staging[0].metadata[0].name
  }
  
  spec {
    hard = {
      requests.cpu    = "10"
      requests.memory = "20Gi"
      limits.cpu      = "20"
      limits.memory   = "40Gi"
      pods            = "50"
      services        = "20"
    }
  }
}

# Limit Ranges
resource "kubernetes_limit_range" "namespace_limits" {
  metadata {
    name      = "namespace-limits"
    namespace = var.environment == "production" ? kubernetes_namespace.production[0].metadata[0].name : kubernetes_namespace.staging[0].metadata[0].name
  }
  
  spec {
    limit {
      type = "Container"
      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }
      default = {
        cpu    = "500m"
        memory = "512Mi"
      }
      max = {
        cpu    = "2"
        memory = "4Gi"
      }
    }
  }
}

# Outputs
output "namespace" {
  value = var.environment == "production" ? kubernetes_namespace.production[0].metadata[0].name : kubernetes_namespace.staging[0].metadata[0].name
}

output "config_map_backend" {
  value = kubernetes_config_map.backend_config.metadata[0].name
}

output "config_map_ai_services" {
  value = kubernetes_config_map.ai_services_config.metadata[0].name
}

