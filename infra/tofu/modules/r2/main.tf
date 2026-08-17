# modules/r2/main.tf — the R2 Object-Lock Compliance bucket module (M7 T01).
#
# The corpus WORM mirror: Cloudflare R2 bucket with Object-Lock in COMPLIANCE mode (7-year retention).
# This is the SIGNED CIO CORPUS TIER (26 §4) — immutable even by root. The dual-canonical invariant:
# a DB clone w/o the KEK is unintelligible; an R2 clone w/o the signature is unverifiable.
# Cites: ADR-0003; 16 §6; 26 §4; M7 T01.
#
# NOTE: Cloudflare provider v5.x has limited R2 bucket config. Object-lock is applied via API/UI after creation.
# This module creates the bucket; Object-Lock configuration is a post-apply step.
# CRITICAL: Object-Lock Compliance mode means NO ONE (not even Cloudflare support) can delete or
# overwrite objects during the retention period. This is the candor floor for the corpus.
#
# Provider is inherited from parent module (envs/stage/primary) which configures the API token.

resource "cloudflare_r2_bucket" "corpus" {
  account_id = var.cloudflare_account_id
  name       = var.bucket_name
  location   = var.r2_location
}