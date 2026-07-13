# providers.tf -- (T04 fix) providers are configured at the ENV layer, NOT in a reusable module.
#
# A reusable module DECLARES REQUIREMENTS (versions.tf) only; the env/root declares the provider
# INSTANCES -- ADC for `google` + a kubeconfig for `kubernetes`, in
# `infra/tofu/envs/<env>/<cohort>/providers.tf`. `tofu init` in this module dir downloads the
# provider PLUGINS (schema-only; no credentials) so `tofu validate` runs standalone on the
# template -- the template's self-check (T04 acceptance 1). Credentials enter at `tofu plan` in the
# env; NEVER in the module; NEVER in TF state (the Tier-1 security lens, ADR-0003 DoD).
#
# (This file previously held `provider "google"` + `provider "kubernetes"` blocks INSIDE the module
# -- a reusable-module anti-pattern, fixed at T04 completion, not a silent edit. The module had
# garbled+conflated provider config; the cell template is now idiomatic: requirements here, instances
# at the env.) Cites: 16 section 6; ADR-0003 DoD; T04 acceptance 1.
