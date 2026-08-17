# envs/dev/primary/main.tf -- the dev/primary cell instantiation (T04).
#
# A thin dev cell on the founder's GCP project -- NOT prod. Instantiates the cell module for the
# `primary` cohort in `dev`; the MINIMAL instantiation T04 ships (the full per-env overlay set is T05).
# `tofu plan` here is green on a real GCP project w/ ADC; `tofu apply` is the M0 deployment event
# (coordinated w/ the founder per the module README -- NOT a T04 code artifact).
#
# The two-phase apply (the GKE chicken-and-egg): phase-1 provisions GKE + GCS + KMS + the
# Memorystore-for-Valkey instance (the `google_*` resources -- these need NO kubeconfig); phase-2
# applies the CNPG `Cluster` + `ScheduledBackup` (+ interim Redpanda when enabled) `kubernetes_manifest`
# resources against the live cluster (the env's kubeconfig_path points at the GKE kubeconfig).
# redpanda_enabled=false at dev (the M0 closed loop is in-process; the bus is not load-bearing until
# M3 -- interim, AutoMQ-bound per ADR-0004). Cites: ADR-0003; 16 section 2; ADR-0004.

module "cell" {
  source = "../../../modules/cell"

  cohort                = "primary" # the signed CIO corpus cohort (16 section 2).
  environment           = "dev"
  region                = "us-central1"
  gcp_project_id        = var.gcp_project_id
  gcp_project_number    = var.gcp_project_number
  redpanda_enabled = false               # dev: enable for AtlasCycle E2E
  backup_retention_days = 14                  # dev -- short (the PITR restore drill is M1, not M0).
  valkey_tier           = "BASIC"             # dev -- no Valkey HA (cost); STANDARD_HA at stage/prod.
  kubeconfig_path       = var.kubeconfig_path # phase-1 (empty) -> phase-2 (live GKE kubeconfig).
}
