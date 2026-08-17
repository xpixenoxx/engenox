# modules/r2/variables.tf — R2 module inputs (M7 T01).

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (the engenox account)."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for engenox.dev (Worker routes)."
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token for R2/Workers operations."
  type        = string
  sensitive   = true
}

variable "bucket_name" {
  description = "R2 bucket name for corpus WORM mirror."
  type        = string
  default     = "engenox-corpus"
}

variable "r2_location" {
  description = "R2 bucket location: WNAM (US West), EEUR (EU), APAC (Asia), OC (Oceania)."
  type        = string
  default     = "WNAM"
  validation {
    condition     = contains(["WNAM", "EEUR", "APAC", "OC"], var.r2_location)
    error_message = "r2_location must be one of: WNAM, EEUR, APAC, OC"
  }
}

variable "environment" {
  description = "Environment name (dev/stage/prod) for resource naming."
  type        = string
  default     = "dev"
}