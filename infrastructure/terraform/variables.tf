/**
 * Terraform Variables
 * 
 * Variables para configuración de infraestructura
 */

variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Kubernetes context to use"
  type        = string
  default     = ""
}

variable "mongodb_uri" {
  description = "MongoDB connection URI"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret key"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh secret key"
  type        = string
  sensitive   = true
}

variable "field_encryption_key" {
  description = "Field encryption key for sensitive data"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_project_id" {
  description = "MongoDB Atlas project ID (if using Atlas)"
  type        = string
  default     = ""
}

variable "mongodb_atlas_api_key" {
  description = "MongoDB Atlas API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "mongodb_atlas_api_secret" {
  description = "MongoDB Atlas API secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "respicare.dev"
}

variable "staging_domain" {
  description = "Staging domain name"
  type        = string
  default     = "staging.respicare.dev"
}

variable "production_domain" {
  description = "Production domain name"
  type        = string
  default     = "respicare.dev"
}

variable "cert_manager_email" {
  description = "Email for Let's Encrypt certificates"
  type        = string
  default     = "admin@respicare.dev"
}

variable "enable_monitoring" {
  description = "Enable monitoring stack (Prometheus/Grafana)"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable logging stack (ELK/Loki)"
  type        = bool
  default     = true
}

variable "enable_tracing" {
  description = "Enable distributed tracing (Jaeger)"
  type        = bool
  default     = true
}

