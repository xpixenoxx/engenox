# envs/dev/primary/variables.tf -- the env-root variables for the dev/primary cell instantiation.
#
# The reusable module has its OWN variables (infra/tofu/modules/cell/variables.tf); the env ROOT
# declares the variables it sets + passes through (kubeconfig_path -- the two-phase apply lever).
# Cites: ADR-0003; 16 section 2; T04.

variable "kubeconfig_path" {
  description = "Path to a kubeconfig for the GKE cluster (resolved AFTER GKE exists -- the two-phase apply in the module README). Empty string = phase-1 (the kubernetes_manifest resources are not planned until phase-2). Passed through to the cell module."
  type        = string
  default     = ""
}
