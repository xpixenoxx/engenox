# infra/tofu/modules/r2/README.md — the R2 Object-Lock module (M7 T01).

## Purpose

Provisions the **WORM corpus mirror** in Cloudflare R2 with **Object-Lock Compliance mode** (7-year retention).

This is the **second fence** in the dual-canonical architecture (16 §6):
1. **DB fence**: CNPG cluster encrypted with KEK — DB clone w/o KEK = unintelligible
2. **Corpus fence**: R2 bucket with Object-Lock Compliance — R2 clone w/o valid signature = unverifiable

## Inputs

| Variable | Description | Default |
|---|---|---|
| `cloudflare_account_id` | Cloudflare account ID | (required) |
| `bucket_name` | R2 bucket name | `engenox-corpus` |
| `location` | R2 location (WNAM/EEUR/APAC/OC) | `WNAM` |
| `retention_days` | Object-Lock default retention (days) | `2555` (7 years) |

## Outputs

| Output | Description |
|---|---|
| `bucket_name` | The R2 bucket name |
| `bucket_location` | The R2 bucket location |
| `object_lock_enabled` | `true` when Object-Lock is enabled |
| `default_retention_mode` | `COMPLIANCE` (WORM) |
| `default_retention_days` | `2555` |

## Verification

After apply, verify Object-Lock is active:

```bash
wrangler r2 bucket info engenox-corpus | grep -E "ObjectLockEnabled|DefaultRetentionMode"
# Expected:
# ObjectLockEnabled = true
# DefaultRetentionMode = COMPLIANCE
```

## Candor Flags

- [x] **Compliance mode** (not Governance) — immutable even by root
- [x] 7-year retention (2555 days) per 16 §6
- [x] No plaintext credentials in outputs (bucket name only)
- [x] Separate from GCS PITR bucket (cell module) — the two-fence architecture