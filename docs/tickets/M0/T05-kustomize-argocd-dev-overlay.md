# T05 — Kustomize base + dev/primary overlay + Argo CD app-of-apps + probes

> **Tier:** 2 (deployment manifests — cell operability, not the moat) | **Status:** pending | **Milestone:** M0
> **Cites:** `24` §2 (`infra/kustomize/` + `infra/argocd/`) · `16` §3 (GitOps + Argo CD) + §4 (the cell deployments) · `17` §3 (the generated digest-pinned manifests) · `25` §3 M0 (the kustomize base + envs/dev + the app-of-apps + the empty probes)

## Objective

Stand up the Kubernetes deployment surface for the cell: `infra/kustomize/base/` (the per-service manifests that don't exist yet but will reference the contract spine), the `dev/primary` overlay, the Argo CD app-of-apps root (GitOps), and the empty wellness + readiness probes. M0 ships the *skeleton* — the manifests reference the cell T04 provisioned + the services that don't exist yet, with the empty-probe scaffolds so `kubectl get` shows the cell healthy. The app-of-apps root is the single Argo CD entry point per cell.

## Dependencies

- **Tickets:** T04 (the cell template — the kustomize overlays reference the CNPG cluster, the Valkey, the Redpanda the cell provisions).
- **External:** Argo CD (pinned in T01's mise), `kubectl` (for the dry-run + the M0 cell-up check), a GKE cluster (the `dev/primary` from T04 applied).

## Files

- `infra/kustomize/base/kustomization.yaml` — the base; references the per-service manifests that will land at M1+ (currently the base is the *scaffold* — a `kustomization.yaml` that pulls in nothing real yet, with a documented placeholder for the services T10–T13 produce).
- `infra/kustomize/base/namespace.yaml` + a `network-policy-base.yaml` — the per-cell namespace + the default-deny-egress base (the privacy tier's no-egress lands per `15` §8, but the base default-deny is M0).
- `infra/kustomize/overlays/dev/primary/kustomization.yaml` — the `dev/primary` overlay: pulls in the base + the cell-specific patches (the CNPG cluster ref from T04, the dev-tier resource limits, the `Co-pilot` dial level for dev).
- `infra/kustomize/overlays/dev/primary/patches/` — the per-cell patches (the cell name, the region, the secret refs from T04's outputs).
- `infra/argocd/app-of-apps.yaml` — the Argo CD `Application` (root) that points at the `infra/kustomize/overlays/dev/primary/` directory + auto-syncs. One root per cell (the `primary`/`privacy`/`whale` × `dev`/`stage`/`prod` matrix), but only the `dev/primary` root lands at M0.
- `infra/argocd/project.yaml` — the Argo CD `AppProject` scoping the app-of-apps to the engenox repos + the permitted destination namespaces.
- `infra/kustomize/base/probes.yaml` — the **empty** wellness + readiness probes scaffold (`25` §3 M0): a `ConfigMap` or a trivial `Deployment` with `readinessProbe` + `livenessProbe` placeholders that return healthy, so `kubectl get` shows the cell green. (These are not the real probes — those land with the services at M1+; M0 ships the *probe scaffolds* so the cell is observable green.)
- `infra/policies/no-latest-tag.yaml` + `infra/policies/sigstore-verify.yaml` — the OPA Gatekeeper admission policies (`24` §2 — `infra/policies/`): the no-`:latest`-tag policy + the sigstore-verify policy (the digest-pinned manifests per `24` §6). These are M0's *admission* enforcement.

## Acceptance criteria

- [ ] `kubectl apply --dry-run=client -k infra/kustomize/overlays/dev/primary/` succeeds (the overlay is valid YAML + the base + patches resolve).
- [ ] The Argo CD `app-of-apps.yaml` + `project.yaml` are valid `Application` + `AppProject` CRs (`argocd app validate` if the CLI is available, else a YAML-schema validate).
- [ ] The empty probes scaffold: a `kubectl get` against the applied `dev/primary` cell returns the probe objects Healthy (this is the M0 closure condition `25` §3 — "the dev cell is up" + "the founder can `kubectl get` and see healthy").
- [ ] The Gatekeeper policies (`no-latest-tag.yaml`, `sigstore-verify.yaml`) are valid OPA Constraint templates; `kubectl apply --dry-run` on `infra/policies/` succeeds.
- [ ] The base default-deny network policy is present (the privacy-tier no-egress is M1+, but the base default-deny is M0 — `15` §8).
- [ ] The overlay references the CNPG cluster + the Valkey + the Redpanda from T04's outputs (the secret refs are present, even if the consuming services don't exist yet at M0).
- [ ] No `:latest` image tag anywhere in the kustomize base + overlay (the Gatekeeper policy + `24` §6 — `:latest` is impossible by construction).
- [ ] No frozen doc edited; the change confined to `infra/kustomize/` + `infra/argocd/` + `infra/policies/`.

## Tests

- **Dry-run test:** `kubectl apply --dry-run=client -k infra/kustomize/overlays/dev/primary/` exits 0 against the overlay.
- **App-of-apps validate:** the `app-of-apps.yaml` validates as an Argo CD `Application` (the schema + the `destination` namespace + the `source.path`).
- **Probe-healthy test:** once the `dev/primary` cell is applied (the M0 deployment event), `kubectl get deployment -n engenox-dev-primary` returns the probe deployment Ready. (This is the M0 *closure* demonstration — `25` §3.)
- **No-latest-tag test:** a fixture pod manifest with `image: foo:latest` is rejected by the Gatekeeper `no-latest-tag` policy (a negative test asserting the policy fires).
- **Sigstore-verify test:** a fixture pod with an unsigned image is rejected by the sigstore-verify policy (the digests are pinned + signed; `24` §6).

## Definition of Done

- [ ] Every acceptance criterion closed; the dry-run + the app-of-apps validate + the Gatekeeper-policy-fire tests green.
- [ ] Coding standard met: the YAML is valid + `kubectl`-schema-checked; the patches are typed; the comments cite the doc-pointers.
- [ ] Review passed at Tier 2 (single adversarial reviewer + the watchdog): Correctness (the overlay resolves; the patches apply), Architecture-alignment (the kustomize base matches `24` §2 + `16` §3), Stack-drift (no `:latest`; the policies match `29` §6), Security (the AppProject scoping is tight; the default-deny is present).
- [ ] Stack-drift watchdog green: no `:latest` tag; no unratified swap; the policies are the audited ones.
- [ ] Docs updated: the cell template README (T04) cross-references the kustomize overlay; the `infra/argocd/` root cites the GitOps flow.
- [ ] Checkpoint written; commit-ready (`feat(infra): T05 — kustomize dev/primary overlay + Argo CD app-of-apps + probe scaffolds + admission policies` with `Refs: 24 §2, 16 §3, ADR-0001`).

## Estimated complexity

**M — ~1 day.** The risk is the Argo CD `app-of-apps` CR shape + the Gatekeeper policy templates. The mitigation: the `no-latest-tag` + the sigstore-verify are well-trodden Gatekeeper patterns; the probes scaffold is trivial.

## Notes for the implementer

- **M0 ships the deployment *skeleton*, not the real services.** The base references services T10–T13 will produce; at M0 the base references the *probe scaffold* + the *CNPG cluster* (so the cell is observably up). The real service manifests land at M1+ when the services do. Do not author the service manifests here.
- **The empty probes are deliberate.** `25` §3 M0 names "the empty wellness + readiness probes" — they return healthy so `kubectl get` shows the cell green, but they don't probe a real service (none exists yet). The real probes replace them at M1+.
- **The `dev/primary` overlay is the only M0 overlay.** The `privacy`/`whale` × `stage`/`prod` overlays land at M8 (the cell-pair DR rehearsal) per `25` §3. The scaffold dirs exist (E13); the overlays don't.
- **The AppProject scoping is a security surface** — it scopes the app-of-apps to the engenox repos + the permitted destination namespaces; a loose AppProject is a Tier-2 security defect. Review the scoping at the Security lens even though the ticket is Tier 2.
- **The Gatekeeper policies are the admission-tier enforcement** (`24` §2 — `infra/policies/`). The `no-latest-tag` + `sigstore-verify` are M0's contribution to the `:latest`-is-impossible invariant (`24` §6); the `no-egress-for-privacy` policy lands at M1+ with the privacy tier.
