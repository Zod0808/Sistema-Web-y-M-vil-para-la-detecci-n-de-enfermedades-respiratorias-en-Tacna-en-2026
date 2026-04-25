/**
 * Terraform Outputs
 * 
 * Outputs de la infraestructura desplegada
 */

output "cluster_name" {
  description = "Name of the Kubernetes cluster"
  value       = var.cluster_name
}

output "namespace" {
  description = "Kubernetes namespace for the environment"
  value       = var.environment == "production" ? kubernetes_namespace.production[0].metadata[0].name : kubernetes_namespace.staging[0].metadata[0].name
}

output "backend_config_map" {
  description = "Name of the backend ConfigMap"
  value       = kubernetes_config_map.backend_config.metadata[0].name
}

output "ai_services_config_map" {
  description = "Name of the AI Services ConfigMap"
  value       = kubernetes_config_map.ai_services_config.metadata[0].name
}

output "backend_secrets" {
  description = "Name of the backend Secrets"
  value       = kubernetes_secret.backend_secrets.metadata[0].name
  sensitive   = true
}

output "domain" {
  description = "Domain name for the environment"
  value       = var.environment == "production" ? var.production_domain : var.staging_domain
}

output "api_url" {
  description = "API URL for the environment"
  value       = var.environment == "production" ? "https://api.${var.production_domain}" : "https://api.${var.staging_domain}"
}

output "ai_services_url" {
  description = "AI Services URL for the environment"
  value       = var.environment == "production" ? "https://ai.${var.production_domain}" : "https://ai.${var.staging_domain}"
}

output "web_url" {
  description = "Web application URL for the environment"
  value       = var.environment == "production" ? "https://${var.production_domain}" : "https://${var.staging_domain}"
}

