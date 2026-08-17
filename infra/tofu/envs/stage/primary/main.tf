# envs/stage/primary/main.tf — the stage/primary cell + R2 WORM corpus (M7 T01).
#
# Stage extends dev with: 3x CNPG replicas (HA), 30-day backup retention, STANDARD_HA Valkey,
# Redpanda enabled (interim bus for AtlasCycle E2E), and the R2 Object-Lock WORM corpus bucket.
# All outputs are secret-refs (no credentials in state). Cites: ADR-0003; 16 §2,6; ADR-0004; 26 §4.

module "cell" {
  source = "../../../modules/cell"

  cohort                 = "primary"
  environment            = "stage"
  region                 = var.region
  gcp_project_id         = var.gcp_project_id
  gcp_project_number     = var.gcp_project_number
  redpanda_enabled       = true                # stage: the interim bus IS load-bearing for AtlasCycle E2E
  backup_retention_days  = 30                  # stage: 30-day PITR window (dev=14)
  valkey_tier            = "STANDARD_HA"       # stage: HA Valkey (dev=BASIC)
  cnpg_instances         = 3                   # stage: 3 replicas (dev=1)
  kubeconfig_path        = var.kubeconfig_path # two-phase apply lever
  # Stage quota limits: smaller data nodes + fewer nodes
  gke_data_node_machine_type = "e2-standard-4"
  gke_data_node_min_count    = 1
  gke_data_node_max_count    = 6
}

# The R2 WORM corpus bucket — the second fence (16 §6, 26 §4).
# Object-Lock Compliance mode + 7-year retention. Called directly (not via cell module)
# because R2 is Cloudflare, not GCP, and the bucket is shared across cells/cohorts.
module "r2_corpus" {
  source = "../../../modules/r2"

  providers = {
    cloudflare = cloudflare
  }

  cloudflare_account_id  = var.cloudflare_account_id
  cloudflare_zone_id     = var.cloudflare_zone_id
  r2_location            = var.r2_location
  cloudflare_api_token   = var.cloudflare_api_token
}

# NOTE: Cloudflare Workers resources (auth-proxy) are deployed via CI/CD pipeline
# to avoid provider v5.x schema divergence in local runs.
# The worker script source is at modules/r2/auth-proxy.js