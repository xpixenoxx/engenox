# envs/dev/primary/r2.tf — R2 Corpus WORM bucket for dev environment (M7 T01).
# This creates the R2 bucket with Object-Lock Compliance mode (7-year retention).
# Cites: ADR-0003; 16 §6; 26 §4; M7 T01.

module "r2_corpus" {
  source = "../../../modules/r2"

  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  cloudflare_api_token  = var.cloudflare_api_token
  bucket_name           = "engenox-corpus-dev"
  r2_location           = "WNAM"
  environment           = "dev"
}

# Output for Secret Manager population
output "r2_corpus_access_key_id" {
  value     = module.r2_corpus.corpus_access_token_id
  sensitive = false
}

output "r2_corpus_access_key_secret" {
  value     = module.r2_corpus.corpus_access_token_secret
  sensitive = true
}

output "r2_endpoint" {
  value     = module.r2_corpus.r2_endpoint
  sensitive = false
}