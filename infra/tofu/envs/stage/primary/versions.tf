# envs/stage/primary/versions.tf — the OpenTofu + provider version pins for the stage/primary cell (M7 T01).
#
# Mirrors the module's pins + adds Cloudflare provider. Stage uses a REMOTE GCS backend (CMEK-encrypted,
# versioned) separate from dev's local backend. The backend is declared in backend.tf.
# Cites: ADR-0003; 16 §2; 29 §6; T05 (remote state pattern).

terraform {
  required_version = ">= 1.9.0, < 2.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}