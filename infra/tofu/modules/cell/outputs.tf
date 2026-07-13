# outputs.tf -- the cell's exports for the downstream M1 migrations + the M2 gateway (T04).
#
# The connection secret is a SECRET-REF (the CNPG cluster's connection secret name), NOT a
# plaintext string -- no credential lands in TF state (the Tier-1 security review, ADR-0003 DoD).
# The downstream consumers (M1 Atlas migrations, the M2 gateway) resolve the secret via the
# Kubernetes secret (the workload mounts it), never via a tofu output value. Cites: 16 section 6.

output "cell_name" {
  description = "The cell's name (the GKE/CNPG/Valkey resources share this stem)."
  value       = local.cell_name
}

output "gke_cluster_name" {
  description = "The GKE cluster name (the cell's compute)."
  value       = google_container_cluster.cell.name
}

output "gke_cluster_endpoint" {
  description = "The GKE control-plane endpoint (the kubeconfig writer resolves this)."
  value       = google_container_cluster.cell.endpoint
  sensitive   = true # the endpoint is a network coordinate; treated as sensitive by convention.
}

# The CNPG cluster's connection secret. The secret is named `<cell_name>-app` by the CNPG
# operator (it materializes the secret in the cluster's namespace once the cluster is live). The
# downstream consumer retrieves the secret DIRECTLY from the cluster, never from this output --
# this output is the secret NAME (a ref), not the credential. Cite: ADR-0003 DoD (no credential in state).
output "cnpg_connection_secret_ref" {
  description = "The Kubernetes secret name the CNPG operator materializes for the app connection (the (clustername)-app Secret). The downstream consumer mounts THIS secret; the credential itself never lands in TF state."
  value       = "${local.cell_name}-app"
}

output "cnpg_cluster_name" {
  description = "The CNPG `Cluster` CR name (for the M1 Atlas migration target)."
  value       = local.cell_name
}

output "valkey_endpoint" {
  # The connect path is `endpoints[0].connections[0].psc_auto_connection[0]` (the NON-deprecated
  # path -- `discovery_endpoints` + `psc_auto_connections` are BOTH deprecated in the pinned google
  # schema, found at T04 completion; the `endpoints` attr is the live path). `try` returns "" if any
  # list in the chain is empty (no PSC auto-connection yet -- the BASIC/M0 cell's connect path is
  # re-confirmed at the M0 apply drill). The deeper `endpoints` chain is the schema-correct path
  # the provider migrated TO; the multi-shard case is an instantiation-time TODO. Cite: 29 section 2.
  description = "The Memorystore-for-Valkey connect endpoint (ip:port, from the non-deprecated `endpoints[0].connections[0].psc_auto_connection[0]` path). The cache tier for the cell; the M2 gateway bootstraps the Valkey client here. Sensitive by convention (a VPC network coordinate)."
  value = try(
    "${google_memorystore_instance.valkey.endpoints[0].connections[0].psc_auto_connection[0].ip_address}:${google_memorystore_instance.valkey.endpoints[0].connections[0].psc_auto_connection[0].port}",
    ""
  )
  sensitive = true
}

output "redpanda_brokers" {
  description = "The interim Redpanda brokers (empty when redpanda_enabled=false; AutoMQ replaces these at the ADR-0004 graduation trigger)."
  value       = var.redpanda_enabled ? ["${local.cell_name}-redpanda.redpanda-system:9092"] : []
}

output "kms_key_ring_id" {
  description = "The Cloud KMS key-ring id (the envelope-encryption root; the KEK crypto-key is `kms_key_name`)."
  value       = google_kms_key_ring.cell.id
}

output "kms_kek_id" {
  description = "The Cloud KMS crypto-key id -- the KEK (encrypts the per-tenant DEKs; quarterly rotation)."
  value       = google_kms_crypto_key.kek.id
}

output "pitr_bucket" {
  description = "The GCS bucket for the CNPG barman object store (the PITR archive; CMEK-encrypted via the KEK)."
  value       = google_storage_bucket.pitr.name
}

output "data_workload_sa_email" {
  description = "The GSA the data-tier pods impersonate (barman -> GCS/KMS via Workload Identity)."
  value       = google_service_account.data_workload.email
}
