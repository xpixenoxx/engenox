# envs/stage/primary/variables.tf — the env-root variables for the stage/primary cell (M7 T01).
#
# The reusable module has its OWN variables (infra/tofu/modules/cell/variables.tf); the env ROOT
# declares the variables it sets + passes through (kubeconfig_path -- the two-phase apply lever).
# Stage-specific overrides vs dev: 3 CNPG instances, STANDARD_HA Valkey, 30-day backup retention.
# Region: asia-south1 per founder GCP project. Cites: ADR-0003; 16 §2; M7 T01.

variable "region" {
  description = "The GCP region for the stage cell (asia-south1 per founder project)."
  type        = string
  default     = "asia-south1"
}

variable "gcp_project_id" {
  description = "The GCP project ID for the stage environment (engenox-stage)."
  type        = string
  default     = "engenox-stage"
}

variable "gcp_project_number" {
  description = "The GCP project number for the stage environment (used for GCS service agent IAM)."
  type        = string
  default     = "106347015643"
}

variable "kubeconfig_path" {
  description = "Path to a kubeconfig for the GKE cluster (resolved AFTER GKE exists -- the two-phase apply in the module README). Empty string = phase-1 (the kubernetes_manifest resources are not planned until phase-2). Passed through to the cell module."
  type        = string
  default     = ""
}

# --- Cloudflare (R2 + Workers) --------------------------------------------------

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (engenox account)."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for engenox.dev (Worker routes)."
  type        = string
}

variable "r2_location" {
  description = "R2 bucket location: WNAM (US West), EEUR (EU), APAC (Asia), OC (Oceania). asia-south1 -> APAC."
  type        = string
  default     = "APAC"
  validation {
    condition     = contains(["WNAM", "EEUR", "APAC", "OC"], var.r2_location)
    error_message = "r2_location must be one of: WNAM, EEUR, APAC, OC"
  }
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token for R2/Workers (injected via env TF_VAR_cloudflare_api_token)."
  type        = string
  sensitive   = true
}