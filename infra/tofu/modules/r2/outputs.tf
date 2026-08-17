# modules/r2/outputs.tf — R2 module outputs for downstream consumption (M7 T01).

output "bucket_name" {
  description = "R2 bucket name for corpus."
  value       = cloudflare_r2_bucket.corpus.name
}

output "bucket_location" {
  description = "R2 bucket location."
  value       = cloudflare_r2_bucket.corpus.location
}

output "r2_endpoint" {
  description = "S3-compatible endpoint for R2 (use with AWS SDK boto3/s3cmd)."
  value       = "https://${var.cloudflare_account_id}.r2.cloudflarestorage.com"
}

output "post_apply_instructions" {
  description = "Manual steps required after terraform apply."
  value       = <<-EOT
  CRITICAL: After terraform apply, you MUST enable Object-Lock Compliance mode via:
  1. Cloudflare Dashboard → R2 → ${cloudflare_r2_bucket.corpus.name} → Settings → Object Lock
  2. Enable "Compliance" mode with 7-year (2555 days) default retention
  3. This CANNOT be done via Terraform (API limitation)
  4. Verify: aws s3api put-object-lock-configuration --bucket ${cloudflare_r2_bucket.corpus.name} --object-lock-configuration 'ObjectLockEnabled=Enabled,Rule={DefaultRetention={Mode=COMPLIANCE,Days=2555}}' --endpoint-url https://${var.cloudflare_account_id}.r2.cloudflarestorage.com

  Lifecycle rule (7-year retention) - apply manually:
  aws s3api put-bucket-lifecycle-configuration --bucket ${cloudflare_r2_bucket.corpus.name} --lifecycle-configuration '{
    "Rules": [{
      "ID": "worm-retention-7-years",
      "Status": "Enabled",
      "Expiration": {"Days": 2555},
      "NoncurrentVersionExpiration": {"NoncurrentDays": 2555}
    }]
  }' --endpoint-url https://${var.cloudflare_account_id}.r2.cloudflarestorage.com

  Create R2 API token manually in Cloudflare Dashboard:
  Account → Tokens → Create Token → Custom Token → R2 Read/Write

  Services (measurement, action) need these env vars set in Secret Manager:
  - R2_ENDPOINT=https://${var.cloudflare_account_id}.r2.cloudflarestorage.com
  - R2_BUCKET=${cloudflare_r2_bucket.corpus.name}
  - R2_ACCESS_KEY_ID=<your-api-token-id>
  - R2_SECRET_ACCESS_KEY=<your-api-token-secret>
  EOT
}