# variables.tf -- the cell parameters (T04). An SRE sets these per cohort x environment to
# instantiate a cell. The version pins below (postgres_major, age_version, pgvector_version,
# cnpg_operator_version) are THE load-bearing stack-faithful pins -- the AGE-in-transaction
# invariant (00 section 2) depends on AGE-and-the-relational-tier running in one cluster, so the
# AGE<->Postgres major compatibility is a tracked invariant (STACK_DRIFT_WATCHDOG category 5).
# Cites: ADR-0003; 16 section 2; 00 section 2 (the AGE-in-transaction invariant).

# --- the cell identity ---------------------------------------------------------

variable "cohort" {
  description = "The data cohort this cell hosts -- primary (the signed CIO corpus) | privacy (the consented panel, isolated) | whale (the per-tenant-dedicated tier). 16 section 2."
  type        = string
  validation {
    condition     = contains(["primary", "privacy", "whale"], var.cohort)
    error_message = "cohort must be one of: primary, privacy, whale (16 section 2)."
  }
}

variable "environment" {
  description = "The environment tier -- dev | stage | prod. Dev is the M0 bring-up target (T04 ships dev/primary); prod is the M1+ closure."
  type        = string
  validation {
    condition     = contains(["dev", "stage", "prod"], var.environment)
    error_message = "environment must be one of: dev, stage, prod."
  }
}

variable "region" {
  description = "The GCP region for the cell. single-cloud+edge (00 section 2) -- one region per cell at MVP."
  type        = string
  default     = "us-central1"
}

variable "gcp_project_id" {
  description = "The GCP project ID for the cell's resources."
  type        = string
}

variable "gcp_project_number" {
  description = "The GCP project number for the cell's resources (used for GCS service agent IAM)."
  type        = string
}

variable "name_prefix" {
  description = "The resource-name prefix (project-derived). Resources are <prefix>-<cohort>-<env>-<role>."
  type        = string
  default     = "engenox"
}

# --- the PostgreSQL major + the extensions (the load-bearing pins) ------------

variable "postgres_major" {
  description = "The PostgreSQL major version the CNPG cluster runs. Pinned to 17 -- the sweet spot of the AGE<->PG compat matrix: supported by BOTH AGE 1.6.0 (the most-exercised stable line for PG17) AND AGE 1.7.0 (the PG18-readiness candidate). pgvector 0.8.2 supports PG17. CNPG 1.30 defaults to PG18 but lets the cluster pin an explicit major via `imageName` -- and pinning to 17 avoids betting the AGE-in-transaction invariant on AGE's PG18 support, which is RC-only (PG18 is served only by AGE 1.7.0 / 1.8.0, both -rc0). The AGE-compat cite is in `age_version` below; this pin MUST move WITH it (STACK_DRIFT_WATCHDOG category 5). Cites: ADR-0003; 00 section 2; STACK_VERIFICATION_CHECKLIST M0."
  type        = number
  default     = 17
  validation {
    condition     = contains([15, 16, 17, 18], var.postgres_major)
    error_message = "postgres_major must be 15/16/17/18 -- an AGE-supported major (see age_version)."
  }
}

variable "age_version" {
  # The AGE<->Postgres compatibility matrix (from github.com/apache/age/releases, re-confirmed
  # at the M0 drill per STACK_VERIFICATION_CHECKLIST -- evidence is a link, never a recollection):
  #   AGE 1.6.0 -> PG 14, 15, 16, 17   (release tag PG17/v1.6.0-rc0)
  #   AGE 1.7.0 -> PG 17, 18           (release tag PG17/v1.7.0-rc0, PG18/v1.7.0-rc0)
  #   AGE 1.8.0 -> PG 18, 19           (pre-release; PG18/v1.8.0-rc0)
  # PG17 is the overlap of 1.6.0 (stable) + 1.7.0 (newer); pinning 1.6.0 for PG17 is the most-
  # exercised combo. The `-rc0` suffix is Apache AGE's release-tag convention even for shipped
  # lines -- the tags ARE the releases; the suffix is NOT a stability claim (verify at the drill).
  # Bumping this pin without re-running the AGE<->PG matrix is a tracked drift (category 5).
  description = "Apache AGE version the cluster image bundles. Pinned 1.6.0 (PG17/v1.6.0) -- the stable AGE line for the pinned PG17 major. The AGE<->PG compat matrix is cited inline; this moves WITH postgres_major. Cites: https://github.com/apache/age/releases ; STACK_VERIFICATION_CHECKLIST M0 ; WATCHDOG category 5."
  type        = string
  default     = "1.6.0"
}

variable "pgvector_version" {
  description = "pgvector version the cluster image bundles. Pinned 0.8.2 (latest GA; supports PG16 + PG17 -- the install guide confirms the PG17 path). Cites: https://github.com/pgvector/pgvector/releases ; https://www.postgresql.org/about/news/pgvector-082-released-3245/ . Bumping is category-5 drift."
  type        = string
  default     = "0.8.2"
}

variable "cnpg_operator_version" {
  description = "CloudNativePG operator version the cluster CR targets. Pinned 1.30.0 (latest GA; supports PG12-18 + k8s 1.36). The operator install is a cluster-bootstrap prerequisite (see README); the CR is applied by THIS module against the installed operator. Cites: https://github.com/cloudnative-pg/cloudnative-pg/releases ."
  type        = string
  default     = "1.30.0"
}

variable "cnpg_postgres_image" {
  description = "The Postgres container image the CNPG cluster runs. MUST bundle the pinned `age_version` + `pgvector_version` on the `postgres_major` line -- the default CNPG image bundles pgvector but NOT AGE, so a custom image is required (the build path is in the cell README). Pinning `imageName` (not relying on the operator default) is what holds PG17 against CNPG's PG18 default. The image digest is the reproducibility root (29 section 6 -- no `:latest`)."
  type        = string
  # Dev default is a placeholder digest-pinned shape; the SRE replaces it with the built image ref
  # for the real apply. Empty-string is valid at `tofu plan` (the CR accepts an arbitrary string);
  # a concrete ref is required before apply (the README gate).
  default = "ghcr.io/engenox/postgresql-age:17-pg17-age1.6.0-vector0.8.2"
}

# --- GKE (the cell's compute) --------------------------------------------------

variable "gke_master_version" {
  description = "The GKE control-plane version. Pinned (< 1.x latest) per 24 section 6 / no-`:latest`. asia-south1 supports 1.30."
  type        = string
  default     = "1.30"
}

variable "gke_data_node_machine_type" {
  description = "The machine type for the data-tier node pool (CNPG + Redpanda pods). Postgres likes memory + local SSD; sized per cohort at instantiation."
  type        = string
  default     = "e2-small"
}

variable "gke_data_node_min_count" {
  description = "The minimum node count for the data-tier autoscaler."
  type        = number
  default     = 3
}

variable "gke_data_node_max_count" {
  description = "The maximum node count for the data-tier autoscaler."
  type        = number
  default     = 6
}

# --- the CNPG cluster shape ----------------------------------------------------

variable "cnpg_instances" {
  description = "The CNPG replica count. 3 (1 primary + 2 replicas) for HA -- ADR-0003 closure."
  type        = number
  default     = 3
  validation {
    condition     = var.cnpg_instances >= 1
    error_message = "cnpg_instances must be >= 1 (3 recommended for HA)."
  }
}

variable "cnpg_storage_gb" {
  description = "The CNPG PVC size per instance."
  type        = number
  default     = 100
}

variable "cnpg_storage_class" {
  description = "The storage class for the CNPG PVCs. Cohort/dev chooses performance+replication."
  type        = string
  default     = "standard-rwo"
}

# --- Memorystore for Valkey (the cache) ---------------------------------------

variable "valkey_tier" {
  description = "The Memorystore-for-Valkey service tier. `BASIC` (no HA) for dev, `STANDARD_HA` for stage/prod. Memorystore for Valkey 9.0 is GA (29 section 2) -- this is NOT redis-OSS-only (WATCHDOG forbids redis-7-OSS-only; GCP Memorystore Valkey is the chosen managed tier)."
  type        = string
  default     = "BASIC"
  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.valkey_tier)
    error_message = "valkey_tier must be BASIC or STANDARD_HA."
  }
}

variable "valkey_memory_size_gb" {
  description = "The Memorystore-for-Valkey memory allocation."
  type        = number
  default     = 1
}

# --- the interim bus (Redpanda, ADR-0004 PROPOSED graduation=AutoMQ) -----------

variable "redpanda_enabled" {
  description = "Whether this cell provisions the interim Redpanda bus. `true` for primary/stage/prod once the bus landline is needed; `false` for dev/M0 (the closed loop at M0 is exercised in-process; the bus is not yet load-bearing). ADR-0004 PROPOSED: interim-bus, graduation-target=automq -- the resource is commented + named so the watchdog finds the pointer; no reference to the rejected S3-bus alternative (WATCHDOG category 1; the canonical naming lives in ADR-0004)."
  type        = bool
  default     = false
}

variable "redpanda_broker_count" {
  description = "The Redpanda broker count (interim). 3 for HA; ignored when redpanda_enabled=false."
  type        = number
  default     = 3
}

# --- KMS (the KEK -- the envelope-encryption root) -----------------------------

variable "kms_keyring_name" {
  description = "The Cloud KMS key-ring name hosting the KEK. The KEK encrypts the per-tenant DEKs (envelope encryption, 16 section 6)."
  type        = string
  default     = "engenox-cell-kek"
}

variable "kms_key_name" {
  description = "The Cloud KMS crypto-key name -- the KEK itself."
  type        = string
  default     = "engenox-kek"
}

variable "kms_rotation_period" {
  description = "The KEK rotation period (RFC3339 duration). Quarterly rotation per 16 section 6."
  type        = string
  default     = "7776000s" # 90 days (the quarterly rotation).
}

# --- the backup target (the PITR archive) -------------------------------------

variable "backup_bucket_name" {
  description = "The GCS bucket for CNPG's barman object store (WAL archive + base backups). KMS-encrypted at rest (the KEK); Object-Lock is NOT set here (the R2 Object-Lock WORM mirror is a separate corpus-tier concern, 26 section 4)."
  type        = string
  # default-formed in main.tf from the prefix/cohort/env to keep the variable simple.
  default = ""
}

variable "backup_retention_days" {
  description = "The CNPG backup retention (the PITR recovery window). 90 days for prod; 14 for dev."
  type        = number
  default     = 14
}

# --- the kubernetes provider wiring (the GKE chicken-and-egg) ------------------

variable "kubeconfig_path" {
  description = "Path to a kubeconfig for the GKE cluster (so the `kubernetes` provider can apply the CNPG CR). Resolved by the env overlay AFTER the GKE cluster exists (the two-phase apply in the README); at `tofu validate` time a placeholder path is fine (the provider does not connect on validate)."
  type        = string
  default     = ""
}

# --- labels --------------------------------------------------------------------

variable "labels" {
  description = "Common resource labels (cohort, environment, managed-by). Applied to every GCP resource the cell provisions."
  type        = map(string)
  default = {
    managed_by = "opentofu"
    component  = "cell"
  }
}
