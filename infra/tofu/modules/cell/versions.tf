# versions.tf -- the OpenTofu + provider version pins for the cell template (T04).
#
# The cell template (16 section 2) is the parameterized abstraction an SRE instantiates per
# cohort (primary/privacy/whale) x environment (dev/stage/prod). This file pins the IaC
# toolchain + the two providers the cell needs: `google` (GKE, Memorystore-for-Valkey, KMS, the
# GCS backup bucket) + `kubernetes` (the native `kubernetes_manifest` resource that applies the
# CNPG `Cluster` CR -- the heart of the cell, ADR-0003). OpenTofu 1.9 is the mise pin (29 s6).
# Cites: ADR-0003; 16 section 2; 29 section 6.

terraform {
  required_version = ">= 1.9.0, < 2.0.0" # OpenTofu (mise pin) -- a hard lower bound so the tofu 1.9
  # features the module uses (the `kubernetes_manifest` server-side apply, conditional blocks)
  # resolve; < 2.0 guards a future major. Cites: 29 section 6.

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0" # GCP primary (29 section 2). Memorystore-for-Valkey + KMS + GCS + GKE -- the
      # ~> 6.0 line ships all four; a 7.x bump is an ADR, not silent.
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35" # native `kubernetes_manifest` (server-side apply) -- the CNPG `Cluster` CR +
      # `ScheduledBackup` + the interim Redpanda resource are applied as raw manifests so the CRD
      # shape is owned by the CNPG operator (not a forked Terraform provider). Cites: ADR-0003.
    }
  }
}
