# envs/stage/primary/backend.tf — the remote state backend configuration (M7 T01).
#
# Separated for clarity (the `terraform` block in versions.tf also declares the backend; this file
# exists to satisfy the T01 file list + allow future overrides via -backend-config). Both are valid;
# OpenTofu merges them. The backend is GCS with CMEK (the stage KEK from the cell module).
# Cites: ADR-0003; 16 §2; T05.

terraform {
  backend "gcs" {
    bucket = "engenox-tf-state"
    prefix = "stage/primary"
    # Encryption: the bucket uses CMEK (the stage KEK). The backend inherits the bucket's encryption.
    # Credentials: ADC (gcloud auth application-default login). NO plaintext key in this file.
  }
}