# envs/stage/primary/providers.tf — the provider INSTANCES for the stage/primary cell (M7 T01).
#
# Extends the dev pattern with: Cloudflare provider (for R2 + Workers), separate KMS keyring.
# ADC for `google` (NO credential hardcoded; nothing lands in TF state — Tier-1 security lens).
# The kubernetes provider uses a kubeconfig resolved AFTER GKE exists (two-phase apply).
# Cites: ADR-0003; ADR-0004; 16 §6; T04.

provider "google" {
  project = var.gcp_project_id
  region  = var.region
  # credentials: ADC (gcloud auth application-default login). NO file() here.
}

provider "kubernetes" {
  config_path = var.kubeconfig_path
}

# Cloudflare provider for R2 + Workers. Credentials via API token.
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}