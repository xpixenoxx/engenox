# envs/dev/primary/versions.tf -- the OpenTofu + provider version pins for the dev/primary cell
# instantiation (T04). The required_providers mirror the module's pins (versions.tf) so `tofu init`
# fetches the same plugins the module declares; a divergence is a stack-drift hit (WATCHDOG cat-1).
# Dev uses a LOCAL backend (no remote state -- the dev cell is ephemeral + rebuildable); the stage/prod
# overlays (T05) pin a remote GCS backend. Cites: ADR-0003; 16 section 2; 29 section 6; T05.

terraform {
  required_version = ">= 1.9.0, < 2.0.0" # OpenTofu 1.9 (the mise pin, 29 section 6).

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0" # matches the module pin (versions.tf).
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35" # matches the module pin.
    }
  }

  # Dev = local backend (the founder's sandbox is self-contained; the dev cell is rebuildable).
  # Stage/prod (T05) pin a remote GCS backend w/ CMEK + object versioning (16 section 2).
  backend "local" {
    path = "terraform.tfstate"
  }
}
