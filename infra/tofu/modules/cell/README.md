# The cell template — `infra/tofu/modules/cell`

> The parameterized abstraction an SRE instantiates per **cohort** (`primary` / `privacy` / `whale`) × **environment** (`dev` / `stage` / `prod`). The substrate for the truth spine (`07`/`08`); the **AGE-in-transaction invariant** (`00` §2) is preserved by construction — AGE + the relational tier + pgvector + RLS run in **one CNPG cluster inside one transaction boundary**.
>
> **NOT AlloyDB** — ADR-0003 is the authority for this template. If a diff contains `alloydb`, it is wrong (the `alloydb` provider is not even imported here; the watchdog greps infra/ for it, `STACK_DRIFT_WATCHDOG.md` category 1).
>
> **Tier 1** (the truth-spine substrate); the most-consequential M0 ticket. Cites: `ADR-0003` · `16` §2 (the cell abstraction) · `24` §2 (the module boundary) · `00` §2 (the AGE-in-transaction invariant) · `29` §3 Swap 2 (the AlloyDB→CNPG reasoning) · `STACK_VERIFICATION_CHECKLIST.md` M0.

---

## What the cell provisions (the 7 provisions, in order)

1. **GKE** — the cell's compute (`16` §2). A single data-tier node pool (`workload=database` taint); the default pool is removed (the cell is single-purpose). Workload Identity is REQUIRED (the CNPG barman sidecar impersonates a GSA for GCS/KMS — no static key, `16` §6).
2. **The GCS backup bucket** — the PITR archive (the CNPG barman object store). CMEK-encrypted via the KEK; Object-Lock is **not** set here (the R2 Object-Lock WORM mirror is the corpus tier, `26` §4 — this bucket is the PITR tier).
3. **Cloud KMS** — the key-ring + the KEK (the envelope-encryption root, `16` §6). HSM-backed; quarterly rotation. The KEK encrypts per-tenant DEKs.
4. **Memorystore for Valkey** — the cache/KV (`29` §2). Valkey 9.0 GA (NOT Redis-7-OSS-only — WATCHDOG category 1). Sized per cohort via `node_type`; the `engine_configs.engine = "VALKEY"` field selects Valkey on the Memorystore Cluster API.
5. **The CNPG `Cluster` CR** — the heart of the cell (ADR-0003). Applied via the native `kubernetes_manifest` (server-side apply) so the CRD shape is owned by the CloudNativePG operator (`cnpg_operator_version`), not a forked TF provider. The CR pins **PG17** (against CNPG's PG18 default) + bundles the pinned **AGE 1.6.0 + pgvector 0.8.2** image; the `postInitApplicationSQL` bootstrap creates the extensions + the RLS-ready roles.
6. **The CNPG `ScheduledBackup`** — the daily backup schedule; the WAL archive + the retention policy provide the PITR window between backups.
7. **The interim Redpanda bus** — ADR-0004 PROPOSED: interim-bus, graduation-target=`automq`. **Disabled by default at M0** (`redpanda_enabled=false`; the closed loop is in-process at M0; the bus is not load-bearing until M3). NO `warpstream` reference (WATCHDOG category 1).

---

## The AGE-in-transaction invariant (preserved by the single-cluster design)

The invariant (`00` §2): a graph query that joins relational rows **in one transaction**. AGE + the relational tier + pgvector + RLS share **one CNPG cluster** so a single transaction boundary spans all four. T04 ships the **substrate** (the cluster w/ AGE + pgvector loaded + the RLS-ready roles provisioned); M1 **demonstrates** the invariant (a graph query joining relational rows in one tx — `STACK_VERIFICATION_CHECKLIST.md` M1). The single-cluster design is what *preserves* the invariant by construction; M1 proves it on the substrate.

The CNPG init SQL:
```sql
CREATE EXTENSION IF NOT EXISTS vector;          -- pgvector (the dial's embedding tier)
CREATE EXTENSION IF NOT EXISTS age;             -- Apache AGE (the graph tier)
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
DO $$ BEGIN CREATE ROLE rls_tenant;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE rls_auditor; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```
The RLS roles are provisioned now (the substrate is RLS-ready); the **RLS policies** land at M1 (`STACK_VERIFICATION_CHECKLIST.md` M1). `pg_hba` is scram-sha-256 only (no `trust`, no `md5` — the Tier-1 security lens). Superuser access is OFF; the reprovisioning path uses a rotated credential, not a static `postgres` password (`16` §6).

---

## How an SRE instantiates a cell

```sh
# in the env overlay dir (e.g. infra/tofu/envs/dev/primary/):
mise install                          # provision the pinned toolchain (opentofu 1.9, mise.toml)
tofu init                             # download the google + kubernetes provider plugins (schema-only, no creds)
tofu validate                         # the template's self-check (T04 acceptance 1)
tofu plan -out=phase1.tfplan          # phase-1 (see the two-phase apply below) -- needs ADC
tofu apply phase1.tfplan             # phase-1 apply -- the GKE + GCS + KMS + Valkey resources
# ...resolve the kubeconfig against the now-live GKE cluster...
tofu plan  -var=kubeconfig_path=~/.kube/config -out=phase2.tfplan   # phase-2 -- the CNPG + Redpanda manifests
tofu apply phase2.tfplan
```

`infra/tofu/envs/dev/primary/` is the minimal dev instantiation T04 ships (the full per-env overlay set is T05). The `google` provider uses ADC (`gcloud auth application-default login`); the `kubernetes` provider reads a kubeconfig resolved after GKE exists.

---

## The two-phase apply (the GKE chicken-and-egg)

The `kubernetes_manifest` resources (the CNPG `Cluster` CR + `ScheduledBackup` + the interim Redpanda) apply against a **live** GKE cluster — but the GKE cluster is itself provisioned in the same tofu run. The split:

- **Phase 1** — `tofu plan`/`apply` with `kubeconfig_path=""` (or `-target` on the `google_*` resources). Provisions GKE + the GCS bucket + KMS + the Memorystore-for-Valkey instance. No kubeconfig needed (no `kubernetes_manifest` resources are planned — the kubernetes provider does not connect on a phase-1 plan when its config is a placeholder).
- **Phase 2** — after GKE is live, fetch its kubeconfig (`gcloud container clusters get-credentials ...`), then `tofu plan -var=kubeconfig_path=<path>` / `tofu apply`. The CNPG CR + ScheduledBackup (+ Redpanda when `redpanda_enabled=true`) reconcile via the installed operators.

**Prerequisites (out-of-band bring-up, NOT tofu):** the CNPG operator (`STACK_VERIFICATION_CHECKLIST.md` M0 — `cnpg_operator_version` 1.30.0) + (when the bus is enabled) the Redpanda operator are installed on the GKE cluster before phase-2. These are cluster-bootstrap steps (documented here); tofu provisions the CRs; the operators reconcile them.

---

## The CNPG image (the AGE + pgvector bundle)

The default CNPG image bundles pgvector but **not** AGE — a custom image is required. The `cnpg_postgres_image` variable pins it:

```
ghcr.io/engenox/postgresql-age:17-pg17-age1.6.0-vector0.8.2
```

**Build path:** a Dockerfile `FROM` the CNPG PG17 image that builds AGE 1.6.0 + pgvector 0.8.2 against PG17, publishes to `ghcr.io/engenox/postgresql-age` **pinned by digest** (no `:latest`, `24` §6). The dev default above is a placeholder ref; the SRE replaces it with the built image's digest-pinned ref before the real apply. The image digest is the reproducibility root (`29` §6).

---

## The AGE↔Postgres compatibility matrix (a tracked invariant — WATCHDOG category 5)

From `github.com/apache/age/releases` (re-confirmed at the M0 drill — the evidence is a link, never a recollection):

| AGE | Postgres | note |
|---|---|---|
| 1.6.0 | 14, 15, 16, **17** | the most-exercised stable line for PG17 |
| 1.7.0 | **17**, 18 | the PG18-readiness candidate (`-rc0`) |
| 1.8.0 | 18, 19 | pre-release |

**PG17 is the overlap** of 1.6.0 (stable) + 1.7.0 (newer); pinning `age_version=1.6.0` + `postgres_major=17` is the most-exercised combo + avoids betting the AGE-in-transaction invariant on AGE's PG18 support (RC-only — PG18 is served only by AGE 1.7.0 / 1.8.0, both `-rc0`). The `-rc0` suffix is Apache AGE's release-tag convention even for shipped lines — the tags ARE the releases; the suffix is NOT a stability claim (verify at the drill). **Bumping `age_version` or `postgres_major` without re-running this matrix is a tracked drift (category 5); the two pins move TOGETHER.**

---

## Backup + PITR (the config; the *drill* is M1)

- `backup.barmanObjectStore` — barman archives WALs + base backups to the GCS bucket (CMEK via the KEK) using the data-tier pod's Workload Identity (the `data_workload` SA — no static key in the CR).
- `retentionPolicy = "${backup_retention_days}d"` — the recovery window (the PITR; 14d dev, 90d prod).
- `ScheduledBackup` — daily at 02:00 UTC (off the :00 mark per cohort ops conventions).

T04 ships the **config**; the **restore drill** (recover to a point in the retention window) is **M1** — `STACK_VERIFICATION_CHECKLIST.md` M1 ("backup/PITR drill"). The drill proves the cost is paid; T04 proves the config is in place.

---

## Cell outputs (secret-**refs**, not credentials)

No credential lands in TF state (the Tier-1 security lens, ADR-0003 DoD). The outputs are **names + endpoints + refs**:

| output | what it is |
|---|---|
| `cell_name` | the `<prefix>-<cohort>-<env>` stem |
| `gke_cluster_name` / `gke_cluster_endpoint` | the cell's compute (the endpoint is sensitive — a network coordinate) |
| `cnpg_connection_secret_ref` | the **name** of the CNPG `<cell>-app` Secret the operator materializes — the downstream consumer mounts THIS secret; the credential itself never lands in TF state |
| `cnpg_cluster_name` | the CNPG `Cluster` CR name (the M1 Atlas migration target) |
| `valkey_endpoint` | the Memorystore-for-Valkey endpoint (sensitive) |
| `redpanda_brokers` | the interim brokers (empty when `redpanda_enabled=false`; AutoMQ replaces these at the ADR-0004 graduation trigger) |
| `kms_key_ring_id` / `kms_kek_id` | the envelope-encryption root (the KEK) |
| `pitr_bucket` | the GCS bucket for the barman object store |
| `data_workload_sa_email` | the GSA the data-tier pods impersonate (barman → GCS/KMS via Workload Identity) |

---

## The infra/SRE first-hire touchstone (recorded, NOT executed)

> `TODO(ADR-0003, infra/sre): m1-hire-plan`

ADR-0003 makes the **infra/SRE hire non-deferrable at M1** (founder-funding-conditional per `28` §7). If the founder cannot fund that hire, the fallback is a **contract SRE for the first 3 months covering CNPG HA/backup/PITR** — flag this whenever M1 is discussed. T04 **records** the touchstone here; it does **not** write the hiring plan (that's an M1 pre-work item, not M0 work) — this README is the pointer. The one-page infra/SRE hiring plan lands ahead of M1; the hire lands before the M2 scale path.

---

## Verification (T04 acceptance)

| gate | command | where |
|---|---|---|
| fmt | `tofu fmt -check` | module + env dir |
| validate | `tofu init && tofu validate` | module dir (the template's self-check — no creds) |
| plan | `tofu plan` (phase-2, w/ a live kubeconfig) | `infra/tofu/envs/dev/primary/` (needs ADC — the founder's GCP) |
| no-AlloyDB | `grep -ri alloydb infra/` | zero hits outside `adr/0003-*`, `docs/29_*`, `docs/enforcement/STACK_DRIFT_WATCHDOG.md`, this README's ADR-0003 cite |
| AGE-compat cite | `tools/check-age-compat.{sh,ps1}` | the AGE release-notes link + the 1.6.0+PG17 overlap |
| the plan-test | `tools/check-cell-plan.{sh,ps1}` | asserts the expected resources + fails on `alloydb` |

`tofu plan` + `tofu apply` against the founder's GCP project are the **M0 deployment event** (coordinated w/ the founder — NOT a T04 code artifact; the apply is gated on the founder's ADC + a real GCP project).

---

## Open follow-ups (tracked inline, NOT silently closed)

- `TODO(ADR-0003, infra/sre)`: CMEK-encrypt the Memorystore-for-Valkey instance with the KEK once the `google_memorystore_instance` resource exposes the CMEK field (`16` §6).
- `TODO(ADR-0003, infra/sre)`: re-confirm `engine_configs.engine = "VALKEY"` + `node_type` against the pinned `google ~> 6.0` provider at the M0 apply drill (WATCHDOG category 5).
- `TODO(ADR-0003, infra/sre)`: `m1-hire-plan` — the infra/SRE first-hire touchstone above.
- The live apply drill + the PITR restore drill — M1 (`STACK_VERIFICATION_CHECKLIST.md` M1), NOT M0.
