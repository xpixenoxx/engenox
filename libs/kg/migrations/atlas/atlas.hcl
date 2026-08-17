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