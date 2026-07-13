# atlas.hcl — the Atlas schema-as-code config (17 §4 expand/contract-native).
#
# The migration directory's `atlas.sum` checksum + the lint config that forbids a
# destructive op in the same migration as an expand (watchdog cat-3 augmentation).
# The dev-side connection targets the M0 cell's Postgres (or a CI testcontainer
# pinned to the same PG17+AGE1.6+pgvector0.8 image per T04).
#
# Cites: 17 §4 (Atlas HCL, reversible migrations); 23 §3 (RLS-introspection gate);
#        ADR-0003 (PG17+AGE1.6.0+pgvector0.8.2); CLAUDE.md §8 (watchdog cat-3).

env "dev" {
  # The db URL is provided at apply-time via `atlas migrate apply --env dev -u "$DATABASE_URL"`.
  # In CI/testcontainer: postgresql://postgres:postgres@localhost:5432/engenox?sslmode=disable
  # In dev cell: the CNPG `<cell>-app` Secret injects the URL + cert.
  url = getenv("DATABASE_URL")
}

# The migration directory — versioned, checksummed (atlas.sum).
migration "migrations" {
  dir = "file://migrations"
  # The HCL-described desired schema is the source of truth; the migration is the diff.
  # The lint config below enforces expand-then-contract (no DROP in same file as CREATE).
  lint {
    # Destructive changes in an expand migration → lint error (requires separate contract mig).
    # This is the Atlas-native expand/contract discipline (17 §4).
    destructive = "error"
    # Declarative schema drift detection — the desired state is the HCL schema.
    # We don't use declarative here (the SQL migrations ARE the source); drift = warn.
    # The watchdog (E16) separately checks for unapproved destructive ops in PRs.
  }
}

# The desired schema is the sum of the applied migrations. For M1-thin we ship the
# single expand-only migration `0001_initial_schema.sql`. Future thicken migrations
# (AGE edges, pgvector columns, extra RLS policies on new tables) are ADDITIVE —
# they follow the same expand/contract cadence (expand = new column; contract = drop later).

# T15's `rls_regression.sql` + `rls_introspection.py` are the CI gates that run
# *after* this migration applies — they are NOT in this Atlas config (they are
# the product's DB layer tests, not schema migrations).