# main.tf -- the cell provision (T04, the M0-critical ADR-0003 ticket).
#
# The provisions, in order: (1) GKE -- the cell's compute; (2) the GCS backup bucket -- the
# PITR archive, KMS-encrypted; (3) Cloud KMS -- the key-ring + the KEK (the envelope-encryption
# root); (4) Memorystore for Valkey -- the cache (NOT redis-OSS-only); (5) the CNPG `Cluster` CR
# -- the heart of the cell (NOT the audit's rejected managed-PG tier -- ADR-0003); (6) the CNPG `ScheduledBackup` -- the
# backup schedule; (7) the interim Redpanda bus -- ADR-0004 PROPOSED, graduation-target=automq.
#
# The AGE-in-transaction invariant (00 section 2) is preserved BY THE SINGLE-CLUSTER DESIGN:
# AGE + the relational tier + pgvector + RLS all run in one CNPG cluster inside one transaction
# boundary. T04 ships the SUBSTRATE; M1 DEMONSTRATES the invariant on it (a graph query joining
# relational rows in one tx -- STACK_VERIFICATION_CHECKLIST M1). Cites: ADR-0003; 16 section 2;
# 00 section 2; 29 section 3 Swap 2.

locals {
  cell_name = "${var.name_prefix}-${var.cohort}-${var.environment}"

  labels = merge(var.labels, {
    cohort      = var.cohort
    environment = var.environment
  })

  # The GCS bucket name for the backup archive. Formed from the prefix/cohort/env unless an explicit
  # name was passed (cohort isolation at the backup boundary).
  backup_bucket = length(var.backup_bucket_name) > 0 ? var.backup_bucket_name : "${local.cell_name}-pitr"
}

# -----------------------------------------------------------------------------
# 1. GKE -- the cell's compute (16 section 2). The CNPG operator + the cluster pods run here.
# -----------------------------------------------------------------------------

resource "google_container_cluster" "cell" {
  name               = "${local.cell_name}-gke"
  location           = var.region
  min_master_version = var.gke_master_version

  # A dedicated node pool for the DATA tier (CNPG + Redpanda) is provisioned separately below so
  # the data pods land on memory-shaped nodes + a `workload=database` taint that general pods
  # avoid. The default pool is removed (remove_default_node_pool = true) -- the data pool is the
  # only pool; the cell is single-purpose (24 section 3 -- a module owns its boundary).
  remove_default_node_pool = true
  initial_node_count       = 1

  # Workload Identity is REQUIRED -- the CNPG backup sidecar (barman) writes to the GCS bucket via
  # a pod-identity that impersonates a Service Account; no static key (16 section 6 / the Tier-1
  # security review).
  workload_identity_config {
    workload_pool = "${var.name_prefix}-${var.cohort}-${var.environment}.svc.id.goog"
  }

  # The CNPG operator + the barman sidecar need the pod-binding add-on on (for the GCS SA).
  addons_config {
    # keep the network + cloud-trace addons off by default -- observability is OTel (29 section 2),
    # not Cloud Trace as the spine. dns_cache is on (CNPG/Redpanda are headless-Services shaped).
    dns_cache_config {
      enabled = true
    }
  }

  # GCP resource labels on the CLUSTER (the schema field is `resource_labels`, NOT `labels` --
  # validate flagged `labels` at T04 completion; the node pool's `node_config.labels` IS valid + is
  # K8s node labels, a different field, unchanged here). Cite: 24 section 6 (pinned label values).
  resource_labels = local.labels
}

# The data node pool -- CNPG + (when enabled) Redpanda. Tolerates the `workload=database` taint.
resource "google_container_node_pool" "data" {
  name       = "data"
  cluster    = google_container_cluster.cell.name
  location   = var.region
  node_count = var.gke_data_node_min_count

  node_config {
    machine_type = var.gke_data_node_machine_type
    taint {
      key    = "workload"
      value  = "database"
      effect = "NO_SCHEDULE"
    }

    # Workload Identity: the nodes impersonate this SA for GCS/KMS. no static key on the node.
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = local.labels
  }

  autoscaling {
    min_node_count = var.gke_data_node_min_count
    max_node_count = var.gke_data_node_max_count
  }
}

# The GSA the data-tier pods impersonate (barman -> GCS; the CNPG sidecar -> KMS for the
# backup-encryption-at-rest via the bucket's CMEK). NOT a credential in state -- SA impersonation
# via Workload Identity is the path (16 section 6).
resource "google_service_account" "data_workload" {
  account_id   = "${local.cell_name}-data-wl"
  display_name = "Data-tier workload identity (CNPG barman + KMS) -- ${local.cell_name}"
}

# -----------------------------------------------------------------------------
# 2. The GCS backup bucket -- the PITR archive (CNPG barman object store). KMS-encrypted at rest
# (CMEK, the KEK). Object-Lock is NOT set here (the R2 Object-Lock WORM mirror is the corpus
# tier -- 26 section 4; this bucket is the PITR tier, not the WORM tier). Cites: ADR-0003 closure.
# -----------------------------------------------------------------------------

resource "google_storage_bucket" "pitr" {
  name                        = local.backup_bucket
  location                    = var.region
  force_destroy               = var.environment == "dev" # dev can be torn down; stage/prod hold the backups.
  uniform_bucket_level_access = true

  # CMEK -- encrypted at rest with the KEK below (the same KMS key-ring).
  encryption {
    default_kms_key_name = google_kms_crypto_key.kek.id
  }

  labels = local.labels
}

# The barman SA can read+write the bucket (objectAdmin); the KMSencrypt role grants encrypt/decrypt.
resource "google_storage_bucket_iam_member" "pitr_data_workload" {
  bucket = google_storage_bucket.pitr.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.data_workload.email}"
}

# -----------------------------------------------------------------------------
# 3. Cloud KMS -- the key-ring + the KEK (the envelope-encryption root, 16 section 6). The KEK
# encrypts per-tenant DEKs (quarterly rotation, ADR-0003 closure "KMS HSM + the KEK").
# -----------------------------------------------------------------------------

resource "google_kms_key_ring" "cell" {
  name     = var.kms_keyring_name
  location = var.region
}

resource "google_kms_crypto_key" "kek" {
  name     = var.kms_key_name
  key_ring = google_kms_key_ring.cell.id
  purpose  = "ENCRYPT_DECRYPT"

  # The quarterly rotation (16 section 6). `rotation_period` sets the cadence (7776000s = 90d).
  # `next_rotation_time` was a settable field in older google providers but is NOT in the pinned
  # `google ~> 6.0` schema (the validate oracle flagged it at T04 completion -- removed, NOT
  # silently dropped from the design). The provider auto-schedules the next rotation on create; if
  # the live API needs an explicit `next_rotation_time`, set it via a data source at the M0 drill.
  # TODO(ADR-0003, infra/sre): re-confirm the rotation shape at the M0 apply drill -- the quarterly
  #   cadence is the audit invariant (16 section 6); NEVER drop it (a silent drop is category-5 drift).
  rotation_period = var.kms_rotation_period

  # HSM-backed key -- the destruction-safety root (a DB clone w/o the KEK is unintelligible,
  # 16 section 6). ` protection_level = "HSM"` encrypted at rest on the HSM.
  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }

  labels = local.labels
}

# The barman SA can use the KEK to encrypt/decrypt the backup objects.
resource "google_kms_crypto_key_iam_member" "kek_data_workload" {
  crypto_key_id = google_kms_crypto_key.kek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.data_workload.email}"
}

# -----------------------------------------------------------------------------
# 4. Memorystore for Valkey -- the cache/KV (29 section 2). NOT redis-7-OSS-only (WATCHDOG
# category 1); GCP Memorystore-for-Valkey 9.0 is the GA managed tier the audit picked.
#
# `google_memorystore_instance` is the Memorystore cluster resource (google ~>6.0+, GA in the 6.x
# line). The `engine` is set to VALKEY per the audit choice; if the provider line in force does
# not accept `engine="VALKEY"` yet, the TODO below flags the migrate path (category-5 drift).
# TODO(WATCHDOG-cat1, infra/sre): re-confirm `google_memorystore_instance` engine="VALKEY" against
#   the pinned google provider at apply (29 section 2 -- Memorystore for Valkey 9.0 GA). If the
#   provider version lacks Valkey, this is an ADR -- never a silent Redis fallback.
# -----------------------------------------------------------------------------

resource "google_memorystore_instance" "valkey" {
  instance_id = "${local.cell_name}-valkey" # the required identifier (NOT `name` -- the Memorystore Cluster schema uses `instance_id`; validate flagged `instance_id` required + `shard_count` required at T04 completion).
  shard_count = 1                           # the required shard count (dev = 1 shard; the SRE scales per cohort at instantiation).
  location    = var.region
  # Valkey 9.0 GA -- the audit's choice, NOT redis-7-OSS-only (29 section 2; WATCHDOG category 1).
  # Memorystore for Valkey uses the Memorystore Cluster API: `engine_configs.engine` selects Valkey
  # (NOT the classic `tier` of `google_redis_instance` -- that field does not exist on this resource
  # and was the conflated defect fixed at T04 completion); `node_type` sizes the cluster. The enum
  # strings are provider-version-specific -- `tofu validate` confirms them against the pinned
  # `google ~> 6.0` schema (WATCHDOG category 5); the live apply re-confirms at the M0 drill.
  # TODO(ADR-0003, infra/sre): re-confirm `engine_configs.engine = "VALKEY"` + `node_type` against
  #   the pinned google provider at the M0 apply drill (STACK_VERIFICATION_CHECKLIST M0). If the
  #   provider line rejects VALKEY, the migrate-ADR fires -- NEVER a silent Redis-OSS fallback
  #   (WATCHDOG category 1; 29 section 2).
  engine_configs = {
    # `engine_configs` is an OBJECT ARGUMENT in the pinned schema, NOT a block (validate flagged the
    # block form at T04 completion -- the hint was `use the equals sign`). VALKEY is the audit's
    # choice (29 section 2); NOT redis-7-OSS-only (WATCHDOG category 1). Re-confirm at the M0 drill.
    engine = "VALKEY"
  }

  # Sized per cohort via valkey_tier. The Memorystore for Valkey Cluster sizes via `node_type`
  # (NOT a raw GiB -- `var.valkey_memory_size_gb` is held in reserve; the cluster API takes no raw
  # GiB). Valid `node_type` at this provider line: SHARED_CORE_NANO | HIGHMEM_MEDIUM | HIGHMEM_XLARGE
  # | STANDARD_SMALL. `tofu validate` checks the TYPE is `string`, NOT the enum value -- a bad enum
  # passes validate + fails at APPLY; the previous `REDIS_DEFAULT_*` values were exactly that (passed
  # validate, rejected by the live API -- found at T04 completion). The M0 apply drill is the enum
  # oracle (re-confirm per STACK_VERIFICATION_CHECKLIST M0). Dev/BASIC -> SHARED_CORE_NANO; HA -> HIGHMEM_MEDIUM.
  node_type = var.valkey_tier == "STANDARD_HA" ? "HIGHMEM_MEDIUM" : "SHARED_CORE_NANO"

  labels = local.labels

  # In-transit encryption is set NOW (`transit_encryption_mode` is IMMUTABLE post-create -- setting it
  # later forces a recreate, a silent loss the candor floor forbids; `SERVER_AUTHENTICATION` is the
  # secure forward default for the long-term codebase, NOT a throwaway-MVP per ADR-0007). IAM auth
  # (`authorization_mode = IAM_AUTH`) is deferred to the M3 bus-landline milestone -- the cache is
  # not load-bearing at M0-thin, and IAM_AUTH adds gateway-side client wiring deferred with the bus.
  # TODO(ADR-0003, infra/sre): graduate `authorization_mode` to IAM_AUTH at the M3 bus milestone
  #   (with the gateway-side Valkey client TLS+IAM wiring). The transit pin set here removes the
  #   recreate risk from that graduation. Cite: 29 section 2; ADR-0007 (long-term codebase).
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  # The Memorystore instance is encrypted at rest by default (GMEK); CMEK-via-the-KEK is an
  # audit-point + a TODO for CMEK-wiring once the provider exposes the field (16 section 6).
  # TODO(ADR-0003, infra/sre): CMEK-encrypt the Memorystore instance with the KEK once the
  #   `google_memorystore_instance` resource exposes the CMEK field (16 section 6).
}

# NOTE: `var.valkey_memory_size_gb` is held in reserve -- the Memorystore cluster API sizes via
# node_type/replica_count, not a raw GiB. Kept as a cohort lever + a clear README pointer.

# -----------------------------------------------------------------------------
# 5. The CNPG `Cluster` CR -- the heart of the cell (ADR-0003). This is the self-managed-Postgres
# path (CNPG + AGE), NOT the managed-PG alternative the audit rejected (ADR-0003). If the diff ever
# imports that rejected provider, it is WRONG -- it is not even imported here. The watchdog greps
# `infra/` for that provider's name; this comment does NOT name it (a clean grep signal, not a
# false positive on its own guard comment -- the prose naming lives in the module README).
#
# The CR is applied via the native `kubernetes_manifest` (server-side apply) so the CRD shape is
# owned by the CloudNativePG operator (`cnpg_operator_version`), not a forked Terraform provider.
# PREREQUISITE: the CNPG operator is INSTALLED on the GKE cluster (a cluster-bootstrap step,
# documented in the README -- like the Redpanda operator, an out-of-band bring-up). T04 provisions
# the CR; the operator reconciles it into a live cluster.
#
# The CR's `imageName` pins PG17 (against CNPG's PG18 default) + bundles the pinned AGE +
# pgvector. The `postInitApplicationSQL` bootstrap creates the extensions + the RLS-ready roles.
# The `backup.barmanObjectStore` + `retentionPolicy` are the PITR config (ADR-0003 closure).
# -----------------------------------------------------------------------------

resource "kubernetes_manifest" "cnpg_cluster" {
  # The CR is applied server-side; the operator validates the shape at reconcile (not at tofu
  # plan). `tofu validate` checks the manifest is well-formed YAML+JSON; it does NOT validate the
  # CRD schema (that is the operator's job at apply). This is honest: the M0 artifact is the
  # template; the CRD-schema proof is the M1 live install.
  #
  # `kubernetes_manifest` applies server-side BY DEFAULT (the resource's design -- it patches via SSA;
  # the operator owns status, tofu owns spec). An explicit `server_side_apply` flag is NOT in the
  # pinned `kubernetes ~> 2.35` schema (validate flagged it at T04 completion -- removed; the SSA
  # behavior is built in, not lost). Cite: ADR-0003 (the CR is applied server-side).

  manifest = {
    apiVersion = "postgresql.cnpg.io/v1" # CNPG 1.30 (the pinned operator line).
    kind       = "Cluster"
    metadata = {
      name      = local.cell_name
      namespace = "cnpg-system" # the operator namespace; the cluster CRs live alongside it.
      labels    = local.labels
    }
    spec = {
      # HA -- 1 primary + (cnpg_instances - 1) replicas (ADR-0003 closure "HA + failover").
      instances = var.cnpg_instances

      # The PG17 image that bundles AGE 1.6.0 + pgvector 0.8.2 (the variable cite explains the pin;
      # the default CNPG image bundles pgvector but NOT age -- a custom image is required).
      imageName = var.cnpg_postgres_image

      storage = {
        storageClass = var.cnpg_storage_class
        size         = "${var.cnpg_storage_gb}Gi"
      }

      postgresql = {
        parameters = {
          max_connections = "200"
          shared_buffers  = "512MB"
          # AGE prep for in-transaction graph reads (M1 demonstrates; the param is set now so the
          # substrate is ready). `age=on` would need age loaded per-session; set search_path here.
          default_statistics_target = "100"
        }
        pg_hba = [
          # Scram-sha-256 only -- no `trust`, no `md5` (the Tier-1 security lens).
          "host all all 10.0.0.0/8 scram-sha-256",
          "host all all 172.16.0.0/12 scram-sha-256",
        ]
      }

      # The bootstrap: create the database + the owner + the extensions + the RLS-ready roles.
      bootstrap = {
        initdb = {
          database = "engenox"
          owner    = "engenox"
          postInitApplicationSQL = [
            # pgvector (the dial's three-axis ledger embedding tier; loaded by the image).
            "CREATE EXTENSION IF NOT EXISTS vector;",
            # Apache AGE (the graph tier; the AGE-in-transaction invariant substrate). LOAD 'age'
            # + the ag_catalog search_path set up graph ops; the full graph schema lands at M1.
            "CREATE EXTENSION IF NOT EXISTS age;",
            "LOAD 'age';",
            "SET search_path = ag_catalog, \"$user\", public;",
            # The RLS-ready roles (M1 lands the policies; the roles are provisioned now so the
            # substrate is RLS-ready -- STACK_VERIFICATION_CHECKLIST M1). CREATE ROLE idempotent.
            "DO $$ BEGIN CREATE ROLE rls_tenant; EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
            "DO $$ BEGIN CREATE ROLE rls_auditor; EXCEPTION WHEN duplicate_object THEN NULL; END $$;",
          ]
        }
      }

      # The backup + PITR config (ADR-0003 closure -- "backup schedule + PITR policy"). barman
      # archives WALs + base backups to the GCS bucket (CMEK-encrypted via the KEK) for PITR.
      backup = {
        barmanObjectStore = {
          destinationPath = "gs://${google_storage_bucket.pitr.name}/cnpg/${local.cell_name}"
          # `gcpEnvironment: gcp` -- barman uses the pod's Workload Identity (the data_workload
          # SA above); NO static key in the CR (the Tier-1 security lens -- no credential in state).
          googleCredentials = {
            gcpEnvironment = "gcp"
          }
          data = {
            immediateCheckpoint = true
            compression         = "gzip"
          }
          wal = {
            archiveTimeout = "60s"
            maxParallel    = "2"
          }
        }
        # The recovery window (PITR) -- retain enough WAL + base backups to recover to any point
        # in the last `backup_retention_days`. The RESTORE DRILL is M1 (STACK_VERIFICATION_CHECKLIST
        # M1 -- the drill confirms the cost is paid); T04 ships the CONFIG, M1 proves it.
        retentionPolicy = "${var.backup_retention_days}d"
      }

      # Anti-affinity -- the 3 instances spread across data nodes (no two Postgres pods co-located).
      affinity = {
        podAntiAffinityType = "required"
        tolerations = [
          {
            key    = "workload"
            value  = "database"
            effect = "NoSchedule"
          },
        ]
      }

      # Superuser access is OFF by default (the reprovisioning path uses a rotated credential,
      # not a static `postgres` password in the CR -- 16 section 6). M1 lands the secret rotation.
      enableSuperuserAccess = false
      monitoring = {
        # The CNPG plugin manager exposes the metrics; OTel scrapes (29 section 2 -- Grafana/Mimir).
        enabledPluginManager = true
      }
    }
  }
}

# -----------------------------------------------------------------------------
# 6. The CNPG `ScheduledBackup` -- the backup schedule (ADR-0003 closure). The schedule runs a
# `Backup` daily; the WAL archive + the retention policy provide the PITR window between backups.
# -----------------------------------------------------------------------------

resource "kubernetes_manifest" "cnpg_scheduled_backup" {
  # server-side apply by default (see cnpg_cluster above; the explicit flag is not in the pinned
  # kubernetes schema -- removed at T04 completion; the SSA behavior is built in, not lost).

  manifest = {
    apiVersion = "postgresql.cnpg.io/v1"
    kind       = "ScheduledBackup"
    metadata = {
      name      = "${local.cell_name}-daily"
      namespace = "cnpg-system"
      labels    = local.labels
    }
    spec = {
      # Daily at 02:00 UTC (off the :00 mark per cohort ops conventions; cohort-local cron).
      schedule             = "17 2 * * *"
      backupOwnerReference = "self"
      cluster = {
        name = local.cell_name
      }
    }
  }
}

# -----------------------------------------------------------------------------
# 7. The interim Redpanda bus -- ADR-0004 PROPOSED: interim-bus, graduation-target=automq.
# Disabled by default at M0 (the closed loop is in-process at M0; the bus is not load-bearing
# until M3). Enabled for stage/prod once the bus landline is needed. No reference to the S3-bus
# alternative the audit rejected (forbidden per WATCHDOG category 1; now Confluent->IBM). Redpanda
# is interim; AutoMQ is the graduation target. The prose naming lives in ADR-0004 + the README; this
# comment does NOT name the rejected alternative (a clean watchdog grep signal, 24 section 4).
#
# When `redpanda_enabled` is true, the SRE installs the Redpanda operator (a cluster-bootstrap
# prerequisite, like the CNPG operator -- README) + this manifest reconciles an interim cluster.
# The AutoMQ swap lands at the Phase-2 graduation trigger (ADR-0004), NOT at M0 -- this is interim.
# -----------------------------------------------------------------------------

# ADR-0004 PROPOSED: interim-bus, graduation-target=automq. The comment + the resource name carry
# the pointer unconditionally (the watchdog grep finds it whether or not the resource is enabled).
resource "kubernetes_manifest" "redpanda_interim" {
  count = var.redpanda_enabled ? 1 : 0
  # server-side apply by default (see cnpg_cluster above; the explicit flag is not in the pinned
  # kubernetes schema -- removed at T04 completion). The operator reconciles when installed.

  manifest = {
    # The Redpanda operator's CR (redpanda.vectorized.io / cluster.redpanda.com). Applied when
    # the operator is installed; at validate the manifest is shape-checked as YAML only.
    apiVersion = "cluster.redpanda.com/v1alpha1"
    kind       = "Redpanda"
    metadata = {
      name      = "${local.cell_name}-redpanda"
      namespace = "redpanda-system"
      labels    = local.labels
      annotations = {
        # The ADR-0004 pointer -- the graduation target the watchdog asserts is named.
        "engenox.io/adr"               = "ADR-0004"
        "engenox.io/graduation-target" = "automq"
        "engenox.io/lifecycle"         = "interim"
      }
    }
    spec = {
      # Interim sizing -- 3 brokers for HA on the data node pool. The AutoMQ swap (ADR-0004)
      # replaces this whole resources at the graduation trigger; the spec is interim-shaped.
      chartRef = {
        chartName    = "redpanda"
        chartVersion = "5.7.0" # pinned interim chart (no `:latest` -- 24 section 6).
      }
      clusterSpec = {
        brokers = var.redpanda_broker_count
        resources = {
          requests = {
            cpu    = "1"
            memory = "2Gi"
          }
        }
      }
    }
  }
}
