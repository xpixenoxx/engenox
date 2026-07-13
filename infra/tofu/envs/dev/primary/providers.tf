# envs/dev/primary/providers.tf -- the provider INSTANCES for the dev/primary cell (T04).
#
# The reusable module declares REQUIREMENTS only (its versions.tf); the ENV declares the provider
# INSTANCES here (the T04 mid-flight fix -- provider config belongs at the root, not in a reusable
# module). ADC for `google` (NO credential hardcoded; nothing lands in TF state -- the Tier-1 security
# lens, ADR-0003 DoD). A kubeconfig for `kubernetes`, resolved AFTER the GKE cluster exists (the
# two-phase apply -- the module README). `tofu validate` does NOT connect; `tofu plan` does. Cites:
# ADR-0003; 16 section 6.

provider "google" {
  region = "us-central1" # the dev cell's region. NOT setting `credentials` -- ADC is the path.
  # credentials: ADC -- the founder runs `gcloud auth application-default login` against the GCP
  # project; the provider reads creds from the environment. `credentials = file(...)` would
  # plaintext a key + land it in state (the WATCHDOG forbids it; 16 section 6).
}

provider "kubernetes" {
  # The kubeconfig resolved after the GKE cluster exists (the two-phase apply). Empty default =
  # phase-1 (no kubernetes_manifest resources planned); the env's var.kubeconfig_path is set in
  # phase-2 against the live cluster's kubeconfig. `tofu validate` does NOT connect; a phase-2
  # `tofu plan` connects against the live cluster.
  config_path = var.kubeconfig_path
}
